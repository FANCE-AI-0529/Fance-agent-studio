// =====================================================
// 资产缺口分析 Hook
// useAssetGapAnalysis - 分析需求与现有资产的能力缺口
// =====================================================

import { useState, useCallback } from 'react';
import { supabase } from '../integrations/supabase/client.ts';
import { useAuth } from '../contexts/AuthContext.tsx';
import { 
  AssetGapAnalysis, 
  SemanticAsset,
  SkillGenerationSuggestion,
  KnowledgeBaseSuggestion 
} from '../types/workflowDSL.ts';

interface UseAssetGapAnalysisReturn {
  analyzeGaps: (description: string, existingAssets?: SemanticAsset[]) => Promise<AssetGapAnalysis>;
  isAnalyzing: boolean;
  lastAnalysis: AssetGapAnalysis | null;
  error: string | null;
}

export function useAssetGapAnalysis(): UseAssetGapAnalysisReturn {
  const { user } = useAuth();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [lastAnalysis, setLastAnalysis] = useState<AssetGapAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);

  const analyzeGaps = useCallback(async (
    description: string,
    existingAssets: SemanticAsset[] = []
  ): Promise<AssetGapAnalysis> => {
    if (!user) {
      throw new Error('用户未认证');
    }

    setIsAnalyzing(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('gap-analysis', {
        body: {
          description,
          userId: user.id,
          existingAssets,
        },
      });

      if (fnError) {
        throw new Error(fnError.message);
      }

      const analysis: AssetGapAnalysis = {
        coverageScore: data.coverageScore ?? 0,
        matchedAssets: data.matchedAssets ?? [],
        missingCapabilities: data.missingCapabilities ?? [],
        suggestedSkills: data.suggestedSkills ?? [],
        suggestedKnowledgeBases: data.suggestedKnowledgeBases ?? [],
      };

      setLastAnalysis(analysis);
      return analysis;

    } catch (err) {
      const message = err instanceof Error ? err.message : '缺口分析失败';
      setError(message);
      throw err;
    } finally {
      setIsAnalyzing(false);
    }
  }, [user]);

  return {
    analyzeGaps,
    isAnalyzing,
    lastAnalysis,
    error,
  };
}

// ========== 本地缺口分析（不调用服务端） ==========

export function useLocalGapAnalysis() {
  const analyzeLocally = useCallback((
    description: string,
    existingAssets: SemanticAsset[]
  ): AssetGapAnalysis => {
    const descLower = description.toLowerCase();
    
    // 提取需求中的能力关键词
    const requiredCapabilities = extractRequiredCapabilities(descLower);
    
    // 计算现有资产覆盖的能力
    const coveredCapabilities = new Set<string>();
    existingAssets.forEach(asset => {
      asset.capabilities.forEach(cap => coveredCapabilities.add(cap.toLowerCase()));
    });
    
    // 找出缺失的能力
    const missingCapabilities = requiredCapabilities.filter(
      cap => !coveredCapabilities.has(cap.toLowerCase())
    );
    
    // 计算覆盖度
    const coverageScore = requiredCapabilities.length > 0
      ? (requiredCapabilities.length - missingCapabilities.length) / requiredCapabilities.length
      : 1;
    
    // 生成技能建议
    const suggestedSkills = generateSkillSuggestions(missingCapabilities, description);
    
    // 生成知识库建议
    const suggestedKnowledgeBases = generateKnowledgeBaseSuggestions(description);
    
    return {
      coverageScore,
      matchedAssets: existingAssets,
      missingCapabilities,
      suggestedSkills,
      suggestedKnowledgeBases,
    };
  }, []);

  return { analyzeLocally };
}

// ========== 辅助函数 ==========

const CAPABILITY_PATTERNS: Record<string, string[]> = {
  '数据分析': ['分析', '统计', '报告', '数据', 'analytics', 'analyze'],
  '邮件发送': ['邮件', 'email', '发送', '通知', 'send', 'notify'],
  '文件处理': ['文件', '文档', 'pdf', 'excel', 'csv', 'file'],
  '数据查询': ['查询', '搜索', 'query', 'search', 'find'],
  '支付处理': ['支付', '付款', 'payment', 'pay', '结账'],
  '退款处理': ['退款', 'refund', '退货', 'return'],
  '订单管理': ['订单', 'order', '交易', 'transaction'],
  '用户认证': ['登录', '认证', 'auth', 'login', '验证'],
  '图像处理': ['图像', '图片', 'image', '图形', '视觉'],
  '文本生成': ['生成', '创建', 'generate', 'create', '写作'],
  '翻译': ['翻译', 'translate', '多语言'],
  '摘要': ['摘要', 'summary', '总结', '概括'],
  'API调用': ['api', 'http', 'webhook', '接口'],
  '数据库操作': ['数据库', 'database', 'sql', '存储'],
  '知识检索': ['知识', 'rag', 'faq', '问答', '检索'],
  '股票分析': ['股票', 'stock', '行情', '金融', '投资'],
  '天气查询': ['天气', 'weather', '气温'],
  '日程管理': ['日程', '日历', 'calendar', '提醒'],
};

function extractRequiredCapabilities(description: string): string[] {
  const capabilities: string[] = [];
  
  for (const [capability, keywords] of Object.entries(CAPABILITY_PATTERNS)) {
    if (keywords.some(kw => description.includes(kw))) {
      capabilities.push(capability);
    }
  }
  
  return capabilities;
}

function generateSkillSuggestions(
  missingCapabilities: string[],
  description: string
): SkillGenerationSuggestion[] {
  return missingCapabilities.map(capability => ({
    name: `${capability}技能`,
    description: `处理${capability}相关任务的技能`,
    category: inferCategory(capability),
    capabilities: [capability],
    requiredInputs: [{ name: 'input', type: 'string', description: '输入数据' }],
    expectedOutputs: [{ name: 'result', type: 'object', description: '处理结果' }],
    reason: `需求描述中包含${capability}相关功能，但现有资产库中缺少此能力`,
    priority: determinePriority(capability, description),
  }));
}

function generateKnowledgeBaseSuggestions(description: string): KnowledgeBaseSuggestion[] {
  const suggestions: KnowledgeBaseSuggestion[] = [];
  const descLower = description.toLowerCase();
  
  // 检测是否需要知识库
  const knowledgePatterns = [
    { pattern: /公司|企业|内部/, name: '企业知识库', tags: ['company_policy', 'internal'] },
    { pattern: /产品|商品|服务/, name: '产品知识库', tags: ['product', 'service'] },
    { pattern: /客户|用户|客服/, name: '客户服务知识库', tags: ['customer', 'faq'] },
    { pattern: /财务|报销|预算/, name: '财务知识库', tags: ['finance', 'expense'] },
    { pattern: /法律|合规|政策/, name: '法规知识库', tags: ['legal', 'compliance'] },
    { pattern: /技术|开发|文档/, name: '技术文档库', tags: ['technical', 'documentation'] },
  ];
  
  for (const { pattern, name, tags } of knowledgePatterns) {
    if (pattern.test(descLower)) {
      suggestions.push({
        name,
        description: `${name} - 自动推荐`,
        retrievalMode: 'hybrid',
        intentTags: tags,
        contextHook: `当用户询问${tags[0]}相关问题时自动注入`,
        autoInject: true,
      });
    }
  }
  
  return suggestions;
}

function inferCategory(capability: string): string {
  const categoryMap: Record<string, string> = {
    '数据分析': 'analysis',
    '邮件发送': 'communication',
    '支付处理': 'finance',
    '退款处理': 'finance',
    '订单管理': 'commerce',
    '股票分析': 'finance',
    '图像处理': 'vision',
    '文本生成': 'generation',
    '翻译': 'language',
    '知识检索': 'knowledge',
  };
  return categoryMap[capability] || 'general';
}

function determinePriority(capability: string, description: string): 'high' | 'medium' | 'low' {
  // 高风险操作优先级高
  if (/支付|退款|删除|转账/.test(capability)) return 'high';
  // 核心功能优先级高
  if (description.includes(capability)) return 'high';
  return 'medium';
}
