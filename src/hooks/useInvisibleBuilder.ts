import { useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MAGIC_STEPS, type MagicStep } from "@/components/consumer/MagicLoader";
import { useAuth } from "@/contexts/AuthContext";

export interface BuildResult {
  agentId: string;
  agentName: string;
  manifest: Record<string, unknown>;
  firstMessage: string;
}

interface UseInvisibleBuilderReturn {
  isBuilding: boolean;
  currentStepIndex: number;
  steps: MagicStep[];
  buildResult: BuildResult | null;
  error: string | null;
  buildFromPrompt: (prompt: string) => Promise<BuildResult>;
  cancelBuild: () => void;
  reset: () => void;
}

export function useInvisibleBuilder(): UseInvisibleBuilderReturn {
  const { user } = useAuth();
  const [isBuilding, setIsBuilding] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [buildResult, setBuildResult] = useState<BuildResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const cancelledRef = useRef(false);
  const timeoutsRef = useRef<NodeJS.Timeout[]>([]);

  const clearTimeouts = () => {
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
  };

  const delay = (ms: number): Promise<void> => {
    return new Promise((resolve) => {
      const timeout = setTimeout(resolve, ms);
      timeoutsRef.current.push(timeout);
    });
  };

  const advanceStep = async (stepIndex: number) => {
    if (cancelledRef.current) return;
    setCurrentStepIndex(stepIndex);
    const step = MAGIC_STEPS[stepIndex];
    if (step?.duration) {
      await delay(step.duration);
    }
  };

  const generateAgentName = (prompt: string): string => {
    // Extract key concepts from prompt to create a name
    const keywords = ['分析', '助手', '专家', '顾问', '管理', '处理'];
    const found = keywords.find(k => prompt.includes(k));
    
    if (prompt.includes('股票') || prompt.includes('金融')) {
      return '金融分析师';
    }
    if (prompt.includes('客服') || prompt.includes('服务')) {
      return '智能客服';
    }
    if (prompt.includes('写作') || prompt.includes('文案')) {
      return '文案创作助手';
    }
    if (prompt.includes('代码') || prompt.includes('编程')) {
      return '编程助手';
    }
    if (prompt.includes('翻译')) {
      return '翻译专家';
    }
    
    return found ? `智能${found}` : '智能助手';
  };

  const generateWelcomeMessage = (prompt: string, agentName: string): string => {
    return `你好！我是${agentName}，根据你的需求「${prompt.slice(0, 30)}${prompt.length > 30 ? '...' : ''}」已经为你配置好了相应的能力。\n\n现在你可以直接开始对话，我会尽力帮助你完成任务。有什么我可以帮你的吗？`;
  };

  const buildFromPrompt = useCallback(async (prompt: string): Promise<BuildResult> => {
    cancelledRef.current = false;
    setIsBuilding(true);
    setError(null);
    setCurrentStepIndex(0);
    setBuildResult(null);

    try {
      // Step 1: Understanding
      await advanceStep(0);
      if (cancelledRef.current) throw new Error('Build cancelled');

      // Step 2: Skills discovery (call workflow generator)
      await advanceStep(1);
      if (cancelledRef.current) throw new Error('Build cancelled');

      // Call the workflow generator in background
      let generatedConfig: Record<string, unknown> = {};
      try {
        const { data, error: genError } = await supabase.functions.invoke('workflow-generator', {
          body: { description: prompt },
        });
        if (!genError && data) {
          generatedConfig = data;
        }
      } catch (e) {
        console.log('Workflow generation failed, using default config:', e);
      }

      // Step 3: Knowledge connection
      await advanceStep(2);
      if (cancelledRef.current) throw new Error('Build cancelled');

      // Step 4: Assembling
      await advanceStep(3);
      if (cancelledRef.current) throw new Error('Build cancelled');

      const agentName = generateAgentName(prompt);
      
      // Create the agent manifest
      const manifest = {
        version: '1.0',
        name: agentName,
        description: prompt,
        systemPrompt: `你是${agentName}，一个专业的AI助手。用户的需求是：${prompt}。请根据这个定位来帮助用户完成任务。`,
        skills: generatedConfig.skills || [],
        knowledgeBases: generatedConfig.knowledgeBases || [],
        createdAt: new Date().toISOString(),
        createdFrom: 'consumer-home',
      };

      // Save to database
      const { data: agentData, error: saveError } = await supabase
        .from('agents')
        .insert([{
          name: agentName,
          manifest: JSON.parse(JSON.stringify(manifest)),
          status: 'active',
          model: 'gpt-4',
          mplp_policy: 'balanced',
          author_id: user?.id || null,
        }])
        .select()
        .single();

      if (saveError) {
        console.error('Failed to save agent:', saveError);
        // Continue anyway with a temporary ID
      }

      // Step 5: Complete
      await advanceStep(4);

      const result: BuildResult = {
        agentId: agentData?.id || `temp-${Date.now()}`,
        agentName,
        manifest,
        firstMessage: generateWelcomeMessage(prompt, agentName),
      };

      setBuildResult(result);
      return result;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Build failed';
      setError(errorMessage);
      throw err;
    } finally {
      if (!cancelledRef.current) {
        setIsBuilding(false);
      }
    }
  }, [user]);

  const cancelBuild = useCallback(() => {
    cancelledRef.current = true;
    clearTimeouts();
    setIsBuilding(false);
    setCurrentStepIndex(0);
    setError('Build cancelled');
  }, []);

  const reset = useCallback(() => {
    cancelledRef.current = false;
    clearTimeouts();
    setIsBuilding(false);
    setCurrentStepIndex(0);
    setBuildResult(null);
    setError(null);
  }, []);

  return {
    isBuilding,
    currentStepIndex,
    steps: MAGIC_STEPS,
    buildResult,
    error,
    buildFromPrompt,
    cancelBuild,
    reset,
  };
}
