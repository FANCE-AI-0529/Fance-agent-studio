import { useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { MagicStep } from "@/components/consumer/MagicLoader";
import type { Json } from "@/integrations/supabase/types";

export interface InvisibleBuildResult {
  agentId: string;
  agentName: string;
  agentAvatar: { iconId: string; colorId: string };
  skills: string[];
  systemPrompt: string;
  capabilities: string[];
  description?: string;
}

interface UseInvisibleBuilderReturn {
  build: (description: string) => Promise<InvisibleBuildResult>;
  isBuilding: boolean;
  currentStepIndex: number;
  steps: MagicStep[];
  progress: number;
  error: string | null;
  reset: () => void;
}

const DEFAULT_STEPS: MagicStep[] = [
  { id: 'understand', text: '正在理解需求...', status: 'pending' },
  { id: 'analyze', text: '分析所需能力...', status: 'pending' },
  { id: 'skills', text: '正在挂载技能...', status: 'pending' },
  { id: 'assemble', text: '数字员工组装中...', status: 'pending' },
  { id: 'complete', text: '组装完成 ✨', status: 'pending' },
];

export function useInvisibleBuilder(): UseInvisibleBuilderReturn {
  const { user } = useAuth();
  const [isBuilding, setIsBuilding] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(-1);
  const [steps, setSteps] = useState<MagicStep[]>(DEFAULT_STEPS);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef(false);

  const updateStep = useCallback((index: number, updates: Partial<MagicStep>) => {
    setSteps(prev => prev.map((step, i) => 
      i === index ? { ...step, ...updates } : step
    ));
  }, []);

  const advanceToStep = useCallback(async (index: number, text?: string) => {
    // Mark all previous steps as complete
    setSteps(prev => prev.map((step, i) => ({
      ...step,
      status: i < index ? 'complete' : i === index ? 'active' : 'pending',
      text: i === index && text ? text : step.text,
    })));
    setCurrentStepIndex(index);
    
    // Small delay for animation
    await new Promise(resolve => setTimeout(resolve, 800));
  }, []);

  const build = useCallback(async (description: string): Promise<InvisibleBuildResult> => {
    if (!user) throw new Error("用户未登录");
    
    setIsBuilding(true);
    setError(null);
    setSteps(DEFAULT_STEPS.map(s => ({ ...s, status: 'pending' })));
    abortRef.current = false;

    try {
      // Step 1: Understanding requirements
      await advanceToStep(0);
      
      // Step 2: Analyze capabilities
      await advanceToStep(1);
      
      // Call AI to generate config
      const { data: configData, error: configError } = await supabase.functions.invoke(
        'agent-config-generator',
        {
          body: { 
            description,
            generateFullWorkflow: false
          }
        }
      );

      if (configError) throw new Error(configError.message || '生成配置失败');
      if (abortRef.current) throw new Error('已取消');

      const config = configData;
      const agentName = config?.agentName || extractAgentName(description);
      const skills = config?.suggestedMCPActions?.map((a: any) => a.name) || [];
      const capabilities = extractCapabilities(description, config);

      // Step 3: Mount skills (with dynamic text)
      const skillsText = skills.length > 0 
        ? `发现需要 ${skills.slice(0, 2).join('、')} 等技能，正在挂载...`
        : '正在配置基础能力...';
      await advanceToStep(2, skillsText);

      // Step 4: Assemble agent
      await advanceToStep(3);

      // Create manifest
      const manifest = {
        name: agentName,
        description: config?.systemPrompt?.substring(0, 100) || description,
        systemPrompt: config?.systemPrompt || `你是${agentName}，一个专业的AI助手。${description}`,
        model: config?.model || 'gpt-4',
        temperature: config?.temperature || 0.7,
        skills: skills,
        createdFrom: 'consumer-magic-builder',
        originalDescription: description,
      };

      // Save to database
      const { data: agentData, error: saveError } = await supabase
        .from('agents')
        .insert({
          name: agentName,
          author_id: user.id,
          manifest: manifest as unknown as Json,
          model: config?.model || 'gpt-4',
          status: 'draft',
          department: 'consumer',
        })
        .select()
        .single();

      if (saveError) throw new Error(saveError.message || '保存失败');
      if (abortRef.current) throw new Error('已取消');

      // Step 5: Complete
      await advanceToStep(4, `${agentName} 已就绪 ✨`);

      const result: InvisibleBuildResult = {
        agentId: agentData.id,
        agentName,
        agentAvatar: { iconId: 'bot', colorId: 'primary' },
        skills,
        systemPrompt: manifest.systemPrompt,
        capabilities,
        description: manifest.description,
      };

      return result;
    } catch (err: any) {
      setError(err.message || '构建失败');
      throw err;
    } finally {
      setIsBuilding(false);
    }
  }, [user, advanceToStep]);

  const reset = useCallback(() => {
    abortRef.current = true;
    setIsBuilding(false);
    setCurrentStepIndex(-1);
    setSteps(DEFAULT_STEPS.map(s => ({ ...s, status: 'pending' })));
    setError(null);
  }, []);

  const progress = currentStepIndex >= 0 
    ? Math.round(((currentStepIndex + 1) / steps.length) * 100)
    : 0;

  return {
    build,
    isBuilding,
    currentStepIndex,
    steps,
    progress,
    error,
    reset,
  };
}

// Helper: Extract agent name from description
function extractAgentName(description: string): string {
  // Try to find patterns like "做一个XXX" or "创建XXX" or "帮我做XXX"
  const patterns = [
    /做一个(.+?)(助手|分析师|专家|顾问|机器人|员工)/,
    /创建(.+?)(助手|分析师|专家|顾问|机器人|员工)/,
    /需要(.+?)(助手|分析师|专家|顾问|机器人|员工)/,
    /(.+?)(助手|分析师|专家|顾问)/,
  ];

  for (const pattern of patterns) {
    const match = description.match(pattern);
    if (match) {
      return match[1] + match[2];
    }
  }

  // Fallback: use first 10 chars
  const shortDesc = description.substring(0, 10).replace(/[，。！？]/g, '');
  return `${shortDesc}助手`;
}

// Helper: Extract capabilities from description and config
function extractCapabilities(description: string, config: any): string[] {
  const capabilities: string[] = [];
  
  // Keywords to capability mapping
  const keywordMap: Record<string, string> = {
    '分析': '数据分析与洞察',
    '搜索': '信息检索与搜索',
    '写作': '内容创作与写作',
    '翻译': '多语言翻译',
    '代码': '代码生成与调试',
    '总结': '文档总结与提炼',
    '对话': '智能对话与问答',
    '计算': '数据计算与处理',
    '设计': '创意设计建议',
    '规划': '任务规划与管理',
  };

  for (const [keyword, capability] of Object.entries(keywordMap)) {
    if (description.includes(keyword)) {
      capabilities.push(capability);
    }
  }

  // Add from config if available
  if (config?.suggestedMCPActions?.length > 0) {
    config.suggestedMCPActions.slice(0, 2).forEach((action: any) => {
      if (action.description && !capabilities.includes(action.description)) {
        capabilities.push(action.description);
      }
    });
  }

  // Ensure at least one capability
  if (capabilities.length === 0) {
    capabilities.push('智能对话与问答');
  }

  return capabilities.slice(0, 4);
}
