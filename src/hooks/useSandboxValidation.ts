// =====================================================
// 沙箱验证 Hook
// Sandbox Validation - Dry Run Testing for Generated Agents
// =====================================================

import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

// 验证结果类型
export interface TestRun {
  testId: string;
  input: string;
  output?: string;
  error?: string;
  duration: number;
  statusCode?: number;
}

export interface SandboxValidationResult {
  success: boolean;
  testRuns: TestRun[];
  needsRegeneration: boolean;
  failedComponents: string[];
  errorAnalysis?: {
    errorType: 'yaml_syntax' | 'tool_not_found' | 'prompt_error' | 'timeout' | 'unknown';
    component: string;
    suggestion: string;
  };
}

// Agent 配置类型
interface AgentConfig {
  name: string;
  systemPrompt?: string;
  model?: string;
  department?: string;
}

// 生成的技能类型
interface GeneratedSkillSpec {
  id: string;
  name: string;
  description: string;
  capabilities: string[];
  templateContent?: string;
}

export function useSandboxValidation() {
  const { user } = useAuth();
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<SandboxValidationResult | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  /**
   * 生成测试消息
   */
  const generateTestMessages = useCallback((agentConfig: AgentConfig): string[] => {
    const baseTests = [
      '你好，请介绍一下你的工作',
      '你能帮我做什么？',
    ];

    const name = agentConfig.name.toLowerCase();
    const department = (agentConfig.department || '').toLowerCase();

    // 根据 Persona 添加特定测试
    if (name.includes('审计') || department.includes('财务') || department.includes('审计')) {
      baseTests.push('请帮我分析最新的财务报表');
    }
    if (name.includes('客服') || department.includes('客服')) {
      baseTests.push('我想查询我的订单状态');
    }
    if (name.includes('销售') || department.includes('销售')) {
      baseTests.push('请给我推荐一些产品');
    }
    if (name.includes('技术') || department.includes('技术') || department.includes('开发')) {
      baseTests.push('请帮我排查这个错误');
    }

    return baseTests;
  }, []);

  /**
   * 执行沙箱试运行
   */
  const runDryRun = useCallback(async (
    agentConfig: AgentConfig,
    generatedSkills?: GeneratedSkillSpec[]
  ): Promise<SandboxValidationResult> => {
    if (!user) {
      return {
        success: false,
        testRuns: [],
        needsRegeneration: false,
        failedComponents: [],
        errorAnalysis: {
          errorType: 'unknown',
          component: 'auth',
          suggestion: '用户未登录',
        },
      };
    }

    setIsValidating(true);

    try {
      const testMessages = generateTestMessages(agentConfig);
      const testRuns: TestRun[] = [];
      const failedComponents: string[] = [];
      let hasError = false;

      // 执行每个测试
      for (let i = 0; i < testMessages.length; i++) {
        const testMessage = testMessages[i];
        const testId = `test-${i + 1}`;
        const startTime = Date.now();

        try {
          // 调用 sandbox-validate edge function
          const { data, error } = await supabase.functions.invoke('sandbox-validate', {
            body: {
              agentConfig: {
                name: agentConfig.name,
                systemPrompt: agentConfig.systemPrompt || '你是一个智能助手。',
                model: agentConfig.model || 'claude-3.5',
              },
              testMessage,
              generatedSkills,
              timeoutMs: 10000,
            },
          });

          const duration = Date.now() - startTime;

          if (error) {
            hasError = true;
            failedComponents.push('edge_function');
            testRuns.push({
              testId,
              input: testMessage,
              error: error.message,
              duration,
              statusCode: 500,
            });
          } else if (data?.error) {
            hasError = true;
            testRuns.push({
              testId,
              input: testMessage,
              error: data.error,
              duration,
              statusCode: data.statusCode || 500,
            });
            
            // 分析错误来源
            if (data.failedComponent) {
              failedComponents.push(data.failedComponent);
            }
          } else {
            testRuns.push({
              testId,
              input: testMessage,
              output: data?.response || '',
              duration,
              statusCode: 200,
            });
          }
        } catch (err) {
          const duration = Date.now() - startTime;
          hasError = true;
          failedComponents.push('network');
          testRuns.push({
            testId,
            input: testMessage,
            error: err instanceof Error ? err.message : 'Unknown error',
            duration,
            statusCode: 0,
          });
        }

        // 如果第一个测试就失败了，提前终止
        if (hasError && i === 0) {
          break;
        }
      }

      // 分析错误
      const errorAnalysis = hasError ? analyzeErrors(testRuns, failedComponents) : undefined;

      const result: SandboxValidationResult = {
        success: !hasError,
        testRuns,
        needsRegeneration: hasError && errorAnalysis?.errorType !== 'timeout',
        failedComponents: [...new Set(failedComponents)],
        errorAnalysis,
      };

      setValidationResult(result);
      return result;

    } catch (err) {
      console.error('Sandbox validation error:', err);
      const result: SandboxValidationResult = {
        success: false,
        testRuns: [],
        needsRegeneration: true,
        failedComponents: ['validation_system'],
        errorAnalysis: {
          errorType: 'unknown',
          component: 'validation_system',
          suggestion: err instanceof Error ? err.message : '验证系统错误',
        },
      };
      setValidationResult(result);
      return result;
    } finally {
      setIsValidating(false);
    }
  }, [user, generateTestMessages]);

  /**
   * 分析错误类型
   */
  const analyzeErrors = (
    testRuns: TestRun[],
    failedComponents: string[]
  ): SandboxValidationResult['errorAnalysis'] => {
    const firstError = testRuns.find(t => t.error)?.error || '';

    // YAML 语法错误
    if (/yaml|parse|syntax/i.test(firstError)) {
      return {
        errorType: 'yaml_syntax',
        component: failedComponents[0] || 'skill',
        suggestion: '技能配置文件格式错误，需要重新生成',
      };
    }

    // 工具未找到
    if (/tool|function|not found|undefined/i.test(firstError)) {
      return {
        errorType: 'tool_not_found',
        component: failedComponents[0] || 'mcp_tool',
        suggestion: '引用了不存在的工具，需要检查技能依赖',
      };
    }

    // 超时
    if (/timeout|timed out/i.test(firstError)) {
      return {
        errorType: 'timeout',
        component: 'network',
        suggestion: '请求超时，可能是网络问题或服务繁忙',
      };
    }

    // 提示词错误
    if (/prompt|context|token/i.test(firstError)) {
      return {
        errorType: 'prompt_error',
        component: 'agent',
        suggestion: '系统提示词可能存在问题，建议简化',
      };
    }

    return {
      errorType: 'unknown',
      component: failedComponents[0] || 'unknown',
      suggestion: firstError || '未知错误，建议检查日志',
    };
  };

  /**
   * 增加重试计数
   */
  const incrementRetryCount = useCallback(() => {
    setRetryCount((prev) => prev + 1);
  }, []);

  /**
   * 重置验证状态
   */
  const resetValidation = useCallback(() => {
    setIsValidating(false);
    setValidationResult(null);
    setRetryCount(0);
  }, []);

  return {
    runDryRun,
    isValidating,
    validationResult,
    retryCount,
    incrementRetryCount,
    resetValidation,
  };
}
