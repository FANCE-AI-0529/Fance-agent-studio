// =====================================================
// 混合资产检索 Hook - 统一 Skill/MCP/Knowledge 检索
// Hybrid Asset Search Hook - Unified FunctionalAtom Search
// =====================================================

import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type {
  FunctionalAtom,
  SlotMatchResult,
  HybridRetrievalRequest,
  HybridRetrievalResult,
  CompatiblePair,
  IOSpec,
  SlotType,
  DEFAULT_SLOT_KEYWORDS,
} from '@/types/functionalAtom';

interface UseHybridAssetSearchResult {
  /** 按描述搜索并分槽 */
  searchByDescription: (description: string, options?: Partial<HybridRetrievalRequest>) => Promise<HybridRetrievalResult>;
  
  /** 获取可自动连接的原子对 */
  getCompatiblePairs: (atoms: FunctionalAtom[]) => CompatiblePair[];
  
  /** 按槽位筛选原子 */
  filterBySlot: (atoms: FunctionalAtom[], slotType: SlotType) => FunctionalAtom[];
  
  /** 检查 IO 兼容性 */
  checkIOCompatibility: (source: IOSpec, target: IOSpec) => { compatible: boolean; matchedFields: string[] };
  
  /** 加载状态 */
  isLoading: boolean;
  
  /** 错误信息 */
  error: string | null;
  
  /** 最近的检索结果 */
  lastResult: HybridRetrievalResult | null;
}

/** 检查两个 IO 规范是否兼容 */
function checkIOCompatibilityFn(
  sourceOutput: IOSpec['output'],
  targetInput: IOSpec['input']
): { compatible: boolean; matchedFields: string[] } {
  const matchedFields: string[] = [];
  
  // 如果输出或输入未定义，视为不兼容
  if (!sourceOutput?.properties || !targetInput?.properties) {
    return { compatible: false, matchedFields: [] };
  }
  
  const outputProps = sourceOutput.properties;
  const inputProps = targetInput.properties;
  
  // 检查输入字段是否能从输出中获取
  for (const [inputKey, inputSpec] of Object.entries(inputProps)) {
    // 直接名称匹配
    if (outputProps[inputKey]) {
      if (outputProps[inputKey].type === inputSpec.type) {
        matchedFields.push(inputKey);
      }
    } else {
      // 模糊匹配：检查输出中是否有类似名称的字段
      for (const outputKey of Object.keys(outputProps)) {
        if (
          (outputKey.toLowerCase().includes(inputKey.toLowerCase()) ||
           inputKey.toLowerCase().includes(outputKey.toLowerCase())) &&
          outputProps[outputKey].type === inputSpec.type
        ) {
          matchedFields.push(`${outputKey} → ${inputKey}`);
          break;
        }
      }
    }
  }
  
  // 如果有任何匹配字段，视为兼容
  const compatible = matchedFields.length > 0;
  
  return { compatible, matchedFields };
}

/** 将数据库资产转换为 FunctionalAtom */
function assetToAtom(asset: Record<string, unknown>): FunctionalAtom {
  const assetType = asset.asset_type as string;
  
  let atomType: FunctionalAtom['type'] = 'NATIVE_SKILL';
  if (assetType === 'mcp_tool') atomType = 'MCP_TOOL';
  else if (assetType === 'knowledge_base') atomType = 'KNOWLEDGE_BASE';
  
  // 解析 IO 规范
  const ioSpec: IOSpec = (asset.io_spec as IOSpec) || {
    input: { type: 'object', properties: {} },
    output: { type: 'object', properties: {} },
  };
  
  // 如果没有 io_spec，尝试从 input_schema/output_schema 构建
  if (!asset.io_spec) {
    const inputSchema = asset.input_schema as Record<string, unknown> || {};
    const outputSchema = asset.output_schema as Record<string, unknown> || {};
    
    ioSpec.input = {
      type: 'object',
      properties: inputSchema as IOSpec['input']['properties'],
    };
    ioSpec.output = {
      type: 'object',
      properties: outputSchema as IOSpec['output']['properties'],
    };
  }
  
  return {
    id: asset.id as string,
    type: atomType,
    name: asset.name as string || '',
    description: asset.description as string || '',
    io_spec: ioSpec,
    slot_type: (asset.slot_type as SlotType) || 'hybrid',
    tags: (asset.tags as string[]) || [],
    asset_id: asset.asset_id as string,
    asset_type: assetType as 'skill' | 'mcp_tool' | 'knowledge_base',
    similarity: asset.similarity as number || 0,
    match_reason: asset.matchReason as string || asset.match_reason as string,
    risk_level: (asset.risk_level as 'low' | 'medium' | 'high') || 'low',
    category: asset.category as string,
    metadata: asset.metadata as Record<string, unknown>,
  };
}

/** 按槽位分组 */
function groupBySlot(atoms: FunctionalAtom[]): SlotMatchResult {
  const result: SlotMatchResult = {
    perception: [],
    decision: [],
    action: [],
    hybrid: [],
  };
  
  for (const atom of atoms) {
    const slot = atom.slot_type || 'hybrid';
    result[slot].push(atom);
  }
  
  return result;
}

/** 分析缺口 */
function analyzeGaps(
  requiredSlots: SlotType[] | undefined,
  slotMatches: SlotMatchResult
): { missingSlots: SlotType[]; suggestedAtoms: Array<{ name: string; type: FunctionalAtom['type']; slot_type: SlotType; reason: string; priority: 'high' | 'medium' | 'low' }>; coverageScore: number } {
  const missingSlots: SlotType[] = [];
  const suggestedAtoms: Array<{ name: string; type: FunctionalAtom['type']; slot_type: SlotType; reason: string; priority: 'high' | 'medium' | 'low' }> = [];
  
  const slotsToCheck = requiredSlots || ['perception', 'decision', 'action'];
  let filledCount = 0;
  
  for (const slot of slotsToCheck) {
    if (slotMatches[slot].length === 0) {
      missingSlots.push(slot);
      
      // 建议添加的原子
      suggestedAtoms.push({
        name: `${slot}_handler`,
        type: 'NATIVE_SKILL',
        slot_type: slot,
        reason: `缺少${slot === 'perception' ? '感知层' : slot === 'decision' ? '决策层' : '行动层'}能力`,
        priority: 'high',
      });
    } else {
      filledCount++;
    }
  }
  
  const coverageScore = filledCount / slotsToCheck.length;
  
  return { missingSlots, suggestedAtoms, coverageScore };
}

export function useHybridAssetSearch(): UseHybridAssetSearchResult {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<HybridRetrievalResult | null>(null);
  
  /** 按描述搜索并分槽 */
  const searchByDescription = useCallback(async (
    description: string,
    options: Partial<HybridRetrievalRequest> = {}
  ): Promise<HybridRetrievalResult> => {
    setIsLoading(true);
    setError(null);
    
    const startTime = Date.now();
    
    try {
      // 调用混合检索 Edge Function
      const { data, error: fnError } = await supabase.functions.invoke('hybrid-asset-retriever', {
        body: {
          query: description,
          userId: user?.id,
          requiredSlots: options.requiredSlots || ['perception', 'decision', 'action'],
          maxPerSlot: options.maxPerSlot || 5,
          minSimilarity: options.minSimilarity || 0.2,
          assetTypes: options.assetTypes || ['skill', 'mcp_tool', 'knowledge_base'],
          includeSuggestions: options.includeSuggestions ?? true,
        },
      });
      
      if (fnError) {
        throw new Error(fnError.message);
      }
      
      // 如果 Edge Function 不存在，回退到本地处理
      if (!data) {
        // 调用现有的 semantic-asset-search
        const { data: searchData, error: searchError } = await supabase.functions.invoke('semantic-asset-search', {
          body: {
            query: description,
            userId: user?.id,
            assetTypes: options.assetTypes || ['skill', 'mcp_tool', 'knowledge_base'],
            maxResults: (options.maxPerSlot || 5) * 4,
            minSimilarity: options.minSimilarity || 0.2,
          },
        });
        
        if (searchError) throw new Error(searchError.message);
        
        // 转换为 FunctionalAtom
        const allAssets = [
          ...(searchData?.skills || []),
          ...(searchData?.mcpTools || []),
          ...(searchData?.knowledgeBases || []),
        ];
        
        const allAtoms = allAssets.map(assetToAtom);
        const slotMatches = groupBySlot(allAtoms);
        
        // 计算 IO 兼容性
        const compatiblePairs = getCompatiblePairsFn(allAtoms);
        
        // 分析缺口
        const gaps = analyzeGaps(options.requiredSlots, slotMatches);
        
        const result: HybridRetrievalResult = {
          slotMatches,
          allAtoms,
          ioCompatibility: {
            compatiblePairs,
            autoWireSuggestions: compatiblePairs.map(pair => ({
              sourceId: pair.source.id,
              targetId: pair.target.id,
              reason: `${pair.source.name} → ${pair.target.name}: ${pair.matchedFields.join(', ')}`,
            })),
          },
          gaps,
          stats: {
            totalFound: allAtoms.length,
            perceptionCount: slotMatches.perception.length,
            decisionCount: slotMatches.decision.length,
            actionCount: slotMatches.action.length,
            hybridCount: slotMatches.hybrid.length,
            queryTimeMs: Date.now() - startTime,
          },
        };
        
        setLastResult(result);
        return result;
      }
      
      setLastResult(data);
      return data;
      
    } catch (err) {
      const message = err instanceof Error ? err.message : '检索失败';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);
  
  /** 获取可自动连接的原子对 */
  const getCompatiblePairs = useCallback((atoms: FunctionalAtom[]): CompatiblePair[] => {
    return getCompatiblePairsFn(atoms);
  }, []);
  
  /** 按槽位筛选原子 */
  const filterBySlot = useCallback((atoms: FunctionalAtom[], slotType: SlotType): FunctionalAtom[] => {
    return atoms.filter(atom => atom.slot_type === slotType);
  }, []);
  
  /** 检查 IO 兼容性 */
  const checkIOCompatibility = useCallback((source: IOSpec, target: IOSpec) => {
    return checkIOCompatibilityFn(source.output, target.input);
  }, []);
  
  return {
    searchByDescription,
    getCompatiblePairs,
    filterBySlot,
    checkIOCompatibility,
    isLoading,
    error,
    lastResult,
  };
}

/** 获取可自动连接的原子对（独立函数） */
function getCompatiblePairsFn(atoms: FunctionalAtom[]): CompatiblePair[] {
  const pairs: CompatiblePair[] = [];
  
  for (const source of atoms) {
    for (const target of atoms) {
      if (source.id === target.id) continue;
      
      // 感知层 → 决策层 → 行动层 的自然流向
      const validFlow = 
        (source.slot_type === 'perception' && (target.slot_type === 'decision' || target.slot_type === 'action')) ||
        (source.slot_type === 'decision' && target.slot_type === 'action') ||
        (source.slot_type === 'hybrid');
      
      if (!validFlow) continue;
      
      const { compatible, matchedFields } = checkIOCompatibilityFn(
        source.io_spec.output,
        target.io_spec.input
      );
      
      if (compatible) {
        pairs.push({
          source,
          target,
          matchedFields,
          compatibilityScore: matchedFields.length / Math.max(
            Object.keys(target.io_spec.input.properties || {}).length,
            1
          ),
        });
      }
    }
  }
  
  // 按兼容性得分排序
  return pairs.sort((a, b) => b.compatibilityScore - a.compatibilityScore);
}
