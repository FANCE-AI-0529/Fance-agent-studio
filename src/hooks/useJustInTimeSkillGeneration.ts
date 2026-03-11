// =====================================================
// 即时技能生成 Hook
// useJustInTimeSkillGeneration - 无中生有的技能创造引擎
// =====================================================

import { useState, useCallback } from 'react';
import { supabase } from '../integrations/supabase/client.ts';
import { useAuth } from '../contexts/AuthContext.tsx';
import { 
  GeneratedSkillSpec, 
  SkillGenerationSuggestion 
} from '../types/workflowDSL.ts';

interface UseJustInTimeSkillGenerationReturn {
  generateSkill: (suggestion: SkillGenerationSuggestion, context: string) => Promise<GeneratedSkillSpec>;
  generateMultipleSkills: (suggestions: SkillGenerationSuggestion[], context: string) => Promise<GeneratedSkillSpec[]>;
  persistSkill: (skill: GeneratedSkillSpec) => Promise<string>;
  isGenerating: boolean;
  generatedSkills: GeneratedSkillSpec[];
  error: string | null;
  clearGeneratedSkills: () => void;
}

export function useJustInTimeSkillGeneration(): UseJustInTimeSkillGenerationReturn {
  const { user } = useAuth();
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedSkills, setGeneratedSkills] = useState<GeneratedSkillSpec[]>([]);
  const [error, setError] = useState<string | null>(null);

  const generateSkill = useCallback(async (
    suggestion: SkillGenerationSuggestion,
    context: string
  ): Promise<GeneratedSkillSpec> => {
    if (!user) {
      throw new Error('用户未认证');
    }

    setIsGenerating(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('generate-skill-template', {
        body: {
          name: suggestion.name,
          description: suggestion.description,
          category: suggestion.category,
          capabilities: suggestion.capabilities,
          inputs: suggestion.requiredInputs,
          outputs: suggestion.expectedOutputs,
          context,
          userId: user.id,
        },
      });

      if (fnError) {
        throw new Error(fnError.message);
      }

      const generatedSkill: GeneratedSkillSpec = {
        id: `generated-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: data.name || suggestion.name,
        description: data.description || suggestion.description,
        category: data.category || suggestion.category,
        capabilities: data.capabilities || suggestion.capabilities,
        skillMd: data.skillMd || generateDefaultSkillMd(suggestion),
        handlerCode: data.handlerCode,
        configYaml: data.configYaml,
        inputSchema: data.inputSchema || {},
        outputSchema: data.outputSchema || {},
        riskLevel: data.riskLevel || 'low',
        isTemporary: true,
        generatedAt: new Date().toISOString(),
        generatedFor: context,
      };

      setGeneratedSkills(prev => [...prev, generatedSkill]);
      return generatedSkill;

    } catch (err) {
      const message = err instanceof Error ? err.message : '技能生成失败';
      setError(message);
      throw err;
    } finally {
      setIsGenerating(false);
    }
  }, [user]);

  const generateMultipleSkills = useCallback(async (
    suggestions: SkillGenerationSuggestion[],
    context: string
  ): Promise<GeneratedSkillSpec[]> => {
    const results: GeneratedSkillSpec[] = [];
    
    for (const suggestion of suggestions) {
      try {
        const skill = await generateSkill(suggestion, context);
        results.push(skill);
      } catch (err) {
        console.error(`Failed to generate skill ${suggestion.name}:`, err);
        // 继续生成其他技能，即使一个失败
      }
    }
    
    return results;
  }, [generateSkill]);

  const persistSkill = useCallback(async (skill: GeneratedSkillSpec): Promise<string> => {
    if (!user) {
      throw new Error('用户未认证');
    }

    try {
      // 保存到 skills 表
      const { data, error: dbError } = await supabase
        .from('skills')
        .insert({
          name: skill.name,
          description: skill.description,
          category: skill.category,
          permissions: skill.capabilities,
          definition: {
            skillMd: skill.skillMd,
            handlerCode: skill.handlerCode,
            configYaml: skill.configYaml,
            inputSchema: skill.inputSchema,
            outputSchema: skill.outputSchema,
          },
          author_id: user.id,
          is_published: false,
          is_ai_generated: true,
        })
        .select('id')
        .single();

      if (dbError) {
        throw new Error(dbError.message);
      }

      // 同步到语义索引
      await supabase.functions.invoke('sync-asset-index', {
        body: {
          userId: user.id,
          assetType: 'skill',
          assetId: data.id,
        },
      });

      // 更新本地状态，移除临时标记
      setGeneratedSkills(prev => 
        prev.map(s => s.id === skill.id 
          ? { ...s, id: data.id, isTemporary: false } 
          : s
        )
      );

      return data.id;

    } catch (err) {
      const message = err instanceof Error ? err.message : '保存技能失败';
      setError(message);
      throw err;
    }
  }, [user]);

  const clearGeneratedSkills = useCallback(() => {
    setGeneratedSkills([]);
  }, []);

  return {
    generateSkill,
    generateMultipleSkills,
    persistSkill,
    isGenerating,
    generatedSkills,
    error,
    clearGeneratedSkills,
  };
}

// ========== 默认 SKILL.md 生成 ==========

function generateDefaultSkillMd(suggestion: SkillGenerationSuggestion): string {
  const inputsSection = suggestion.requiredInputs
    .map(i => `- **${i.name}** (\`${i.type}\`): ${i.description}`)
    .join('\n');
    
  const outputsSection = suggestion.expectedOutputs
    .map(o => `- **${o.name}** (\`${o.type}\`): ${o.description}`)
    .join('\n');

  return `# ${suggestion.name}

## 描述
${suggestion.description}

## 类别
${suggestion.category}

## 能力
${suggestion.capabilities.map(c => `- ${c}`).join('\n')}

## 输入参数
${inputsSection || '- 无'}

## 输出
${outputsSection || '- 无'}

## 使用示例
\`\`\`
调用 ${suggestion.name}，传入相关参数
\`\`\`

## 风险等级
${suggestion.priority === 'high' ? '高' : suggestion.priority === 'medium' ? '中' : '低'}

---
*此技能由 AI 自动生成于 ${new Date().toLocaleString('zh-CN')}*
`;
}

// ========== 本地技能模板生成（不调用服务端） ==========

export function useLocalSkillGeneration() {
  const generateLocally = useCallback((
    suggestion: SkillGenerationSuggestion,
    context: string
  ): GeneratedSkillSpec => {
    return {
      id: `local-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: suggestion.name,
      description: suggestion.description,
      category: suggestion.category,
      capabilities: suggestion.capabilities,
      skillMd: generateDefaultSkillMd(suggestion),
      inputSchema: Object.fromEntries(
        suggestion.requiredInputs.map(i => [i.name, { type: i.type, description: i.description }])
      ),
      outputSchema: Object.fromEntries(
        suggestion.expectedOutputs.map(o => [o.name, { type: o.type, description: o.description }])
      ),
      riskLevel: suggestion.priority === 'high' ? 'high' : suggestion.priority === 'medium' ? 'medium' : 'low',
      isTemporary: true,
      generatedAt: new Date().toISOString(),
      generatedFor: context,
    };
  }, []);

  return { generateLocally };
}
