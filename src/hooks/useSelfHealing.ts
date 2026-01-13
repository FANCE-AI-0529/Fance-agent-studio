// =====================================================
// 错误自愈 Hook
// Self-Healing - Automatic Skill Regeneration on Failure
// =====================================================

import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { SandboxValidationResult } from './useSandboxValidation';

// 技能规格类型 (支持简化版本用于验证)
interface SkillSpec {
  id: string;
  name: string;
  description?: string;
  category?: string;
  capabilities?: string[];
  inputSchema?: Record<string, unknown>;
  outputSchema?: Record<string, unknown>;
  templateContent?: string;
  generatedAt?: string;
  isGenerated?: boolean;
}

// 完整的生成技能规格 (用于返回)
interface GeneratedSkillSpec extends SkillSpec {
  description: string;
  category: string;
  capabilities: string[];
  inputSchema: Record<string, unknown>;
  outputSchema: Record<string, unknown>;
  generatedAt: string;
  isGenerated: true;
}

const MAX_RETRIES = 3;

export interface HealingResult {
  success: boolean;
  regeneratedSkills: SkillSpec[];
  patchedConfig?: Record<string, unknown>;
  attempts: number;
  healingLog: string[];
}

export interface ErrorAnalysis {
  errorType: 'yaml_syntax' | 'tool_not_found' | 'prompt_error' | 'timeout' | 'unknown';
  component: string;
  suggestion: string;
  fixStrategy: 'regenerate' | 'simplify' | 'remove' | 'retry';
}

export function useSelfHealing() {
  const { user } = useAuth();
  const [isHealing, setIsHealing] = useState(false);
  const [healingProgress, setHealingProgress] = useState(0);
  const [healingLog, setHealingLog] = useState<string[]>([]);

  /**
   * 分析错误并确定修复策略
   */
  const analyzeError = useCallback((
    validationResult: SandboxValidationResult
  ): ErrorAnalysis => {
    const { errorAnalysis, failedComponents } = validationResult;
    
    if (!errorAnalysis) {
      return {
        errorType: 'unknown',
        component: failedComponents[0] || 'unknown',
        suggestion: '未知错误',
        fixStrategy: 'retry',
      };
    }

    let fixStrategy: ErrorAnalysis['fixStrategy'] = 'regenerate';

    switch (errorAnalysis.errorType) {
      case 'yaml_syntax':
        fixStrategy = 'regenerate';
        break;
      case 'tool_not_found':
        fixStrategy = 'remove';
        break;
      case 'prompt_error':
        fixStrategy = 'simplify';
        break;
      case 'timeout':
        fixStrategy = 'retry';
        break;
      default:
        fixStrategy = 'regenerate';
    }

    return {
      ...errorAnalysis,
      fixStrategy,
    };
  }, []);

  /**
   * 执行自愈流程
   */
  const heal = useCallback(async (
    validationResult: SandboxValidationResult,
    originalDescription: string,
    failedSkills: SkillSpec[],
    currentAttempt: number
  ): Promise<HealingResult> => {
    if (!user) {
      return {
        success: false,
        regeneratedSkills: [],
        attempts: currentAttempt,
        healingLog: ['用户未登录，无法执行自愈'],
      };
    }

    if (currentAttempt >= MAX_RETRIES) {
      return {
        success: false,
        regeneratedSkills: [],
        attempts: currentAttempt,
        healingLog: [`已达到最大重试次数 (${MAX_RETRIES})，自愈失败`],
      };
    }

    setIsHealing(true);
    setHealingProgress(0);
    const log: string[] = [];

    try {
      // 1. 分析错误
      log.push(`[${new Date().toLocaleTimeString()}] 开始分析错误...`);
      setHealingLog([...log]);
      
      const analysis = analyzeError(validationResult);
      log.push(`[${new Date().toLocaleTimeString()}] 错误类型: ${analysis.errorType}`);
      log.push(`[${new Date().toLocaleTimeString()}] 修复策略: ${analysis.fixStrategy}`);
      setHealingLog([...log]);
      setHealingProgress(20);

      // 2. 根据策略执行修复
      const regeneratedSkills: SkillSpec[] = [];

      switch (analysis.fixStrategy) {
        case 'regenerate': {
          log.push(`[${new Date().toLocaleTimeString()}] 正在重新生成失败的技能...`);
          setHealingLog([...log]);
          setHealingProgress(40);

          // 为每个失败的技能重新生成
          for (const skill of failedSkills) {
            try {
              const { data, error } = await supabase.functions.invoke('generate-skill-template', {
                body: {
                  name: skill.name,
                  description: `${skill.description || skill.name} (修复版本 #${currentAttempt + 1})`,
                  category: skill.category || 'general',
                  capabilities: skill.capabilities || [],
                  errorContext: validationResult.testRuns[0]?.error,
                  simplify: true, // 请求生成更简单的版本
                },
              });

              if (error) {
                log.push(`[${new Date().toLocaleTimeString()}] ❌ 重新生成 ${skill.name} 失败: ${error.message}`);
              } else {
                const newSkill: SkillSpec = {
                  id: `healed-${skill.id}-${currentAttempt}`,
                  name: skill.name,
                  description: skill.description || skill.name,
                  category: skill.category || 'general',
                  capabilities: skill.capabilities || [],
                  inputSchema: data?.inputSchema || {},
                  outputSchema: data?.outputSchema || {},
                  templateContent: data?.templateContent,
                  generatedAt: new Date().toISOString(),
                  isGenerated: true,
                };
                regeneratedSkills.push(newSkill);
                log.push(`[${new Date().toLocaleTimeString()}] ✓ 成功重新生成 ${skill.name}`);
              }
            } catch (err) {
              log.push(`[${new Date().toLocaleTimeString()}] ❌ 重新生成 ${skill.name} 异常: ${err instanceof Error ? err.message : 'Unknown'}`);
            }
          }
          break;
        }

        case 'simplify': {
          log.push(`[${new Date().toLocaleTimeString()}] 正在简化配置...`);
          setHealingLog([...log]);
          setHealingProgress(40);

          // 返回简化版本的技能
          for (const skill of failedSkills) {
            regeneratedSkills.push({
              id: `simplified-${skill.id}`,
              name: skill.name,
              description: `${skill.description || skill.name} (简化版)`,
              category: skill.category,
              capabilities: (skill.capabilities || []).slice(0, 2),
              templateContent: undefined, // 移除复杂模板
              generatedAt: new Date().toISOString(),
              isGenerated: true,
            });
            log.push(`[${new Date().toLocaleTimeString()}] ✓ 已简化 ${skill.name}`);
          }
          break;
        }

        case 'remove': {
          log.push(`[${new Date().toLocaleTimeString()}] 正在移除问题组件...`);
          setHealingLog([...log]);
          setHealingProgress(40);

          // 不返回任何技能，表示移除
          log.push(`[${new Date().toLocaleTimeString()}] ✓ 已移除 ${failedSkills.length} 个问题组件`);
          break;
        }

        case 'retry': {
          log.push(`[${new Date().toLocaleTimeString()}] 将原样重试...`);
          setHealingLog([...log]);
          setHealingProgress(40);

          // 返回原始技能 (保持类型兼容)
          for (const skill of failedSkills) {
            regeneratedSkills.push({
              ...skill,
              generatedAt: skill.generatedAt || new Date().toISOString(),
            });
          }
          break;
        }
      }

      setHealingProgress(80);

      // 3. 验证修复结果
      log.push(`[${new Date().toLocaleTimeString()}] 自愈完成，生成 ${regeneratedSkills.length} 个修复后的技能`);
      setHealingLog([...log]);
      setHealingProgress(100);

      const result: HealingResult = {
        success: regeneratedSkills.length > 0 || analysis.fixStrategy === 'remove',
        regeneratedSkills,
        attempts: currentAttempt + 1,
        healingLog: log,
      };

      return result;

    } catch (err) {
      log.push(`[${new Date().toLocaleTimeString()}] ❌ 自愈过程异常: ${err instanceof Error ? err.message : 'Unknown'}`);
      setHealingLog([...log]);
      
      return {
        success: false,
        regeneratedSkills: [],
        attempts: currentAttempt + 1,
        healingLog: log,
      };
    } finally {
      setIsHealing(false);
    }
  }, [user, analyzeError]);

  /**
   * 重置自愈状态
   */
  const resetHealing = useCallback(() => {
    setIsHealing(false);
    setHealingProgress(0);
    setHealingLog([]);
  }, []);

  return {
    heal,
    analyzeError,
    isHealing,
    healingProgress,
    healingLog,
    resetHealing,
    MAX_RETRIES,
  };
}
