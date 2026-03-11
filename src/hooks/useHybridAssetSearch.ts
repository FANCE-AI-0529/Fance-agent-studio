/**
 * @file useHybridAssetSearch.ts
 * @description 混合资产检索钩子，提供统一的技能、MCP工具、知识库检索能力，支持按槽位分组和IO兼容性检查
 * @module Hooks/Asset
 * @author Agent OS Studio Team
 * @copyright 2025 Agent OS Studio. All rights reserved.
 * @version 1.0.0
 */

import { useState, useCallback } from 'react';
import { supabase } from '../integrations/supabase/client.ts';
import { useAuth } from '../contexts/AuthContext.tsx';
import type {
  FunctionalAtom,
  SlotMatchResult,
  HybridRetrievalRequest,
  HybridRetrievalResult,
  CompatiblePair,
  IOSpec,
  SlotType,
} from '../types/functionalAtom.ts';

/**
 * 混合资产检索返回值接口
 * 
 * 定义了混合资产检索钩子的完整返回结构，包含搜索方法、兼容性检查及状态信息。
 */
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

/**
 * 检查两个输入输出规范是否兼容
 * 
 * 该函数对比源节点的输出端口与目标节点的输入端口，
 * 通过精确名称匹配和模糊名称匹配两种方式确定字段兼容性。
 * 
 * @param {IOSpec['output']} sourceOutput - 源节点的输出规范
 * @param {IOSpec['input']} targetInput - 目标节点的输入规范
 * @returns {{ compatible: boolean; matchedFields: string[] }} - 兼容性结果及匹配字段列表
 */
function checkIOCompatibilityFn(
  sourceOutput: IOSpec['output'],
  targetInput: IOSpec['input']
): { compatible: boolean; matchedFields: string[] } {
  const matchedFields: string[] = [];
  
  // [检查]：验证输出和输入规范是否有效
  if (!sourceOutput?.properties || !targetInput?.properties) {
    return { compatible: false, matchedFields: [] };
  }
  
  const outputProps = sourceOutput.properties;
  const inputProps = targetInput.properties;
  
  // [遍历]：检查每个输入字段是否能从输出中获取
  for (const [inputKey, inputSpec] of Object.entries(inputProps)) {
    // [策略一]：精确名称匹配
    if (outputProps[inputKey]) {
      if (outputProps[inputKey].type === inputSpec.type) {
        matchedFields.push(inputKey);
      }
    } else {
      // [策略二]：模糊名称匹配，检查输出中是否有相似名称的字段
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
  
  // [判定]：存在任何匹配字段即视为兼容
  const compatible = matchedFields.length > 0;
  
  return { compatible, matchedFields };
}

/**
 * 将数据库资产记录转换为功能原子对象
 * 
 * 该函数负责将从数据库检索到的原始资产数据转换为标准化的 FunctionalAtom 结构，
 * 包括类型推断、IO规范解析及元数据整理。
 * 
 * @param {Record<string, unknown>} asset - 数据库原始资产记录
 * @returns {FunctionalAtom} - 标准化的功能原子对象
 */
function assetToAtom(asset: Record<string, unknown>): FunctionalAtom {
  const assetType = asset.asset_type as string;
  
  // [类型映射]：根据资产类型确定原子类型
  let atomType: FunctionalAtom['type'] = 'NATIVE_SKILL';
  if (assetType === 'mcp_tool') atomType = 'MCP_TOOL';
  else if (assetType === 'knowledge_base') atomType = 'KNOWLEDGE_BASE';
  
  // [规范解析]：构建输入输出规范
  const ioSpec: IOSpec = (asset.io_spec as IOSpec) || {
    input: { type: 'object', properties: {} },
    output: { type: 'object', properties: {} },
  };
  
  // [回退处理]：若无 io_spec 则从 schema 字段构建
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

/**
 * 按槽位类型对原子进行分组
 * 
 * 将功能原子列表按照其槽位类型（感知层、决策层、行动层、混合层）进行分类。
 * 
 * @param {FunctionalAtom[]} atoms - 功能原子数组
 * @returns {SlotMatchResult} - 分组后的槽位匹配结果
 */
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

/**
 * 分析槽位缺口
 * 
 * 检查必需槽位的覆盖情况，识别缺失的槽位并生成补充建议。
 * 
 * @param {SlotType[] | undefined} requiredSlots - 必需的槽位列表
 * @param {SlotMatchResult} slotMatches - 当前槽位匹配结果
 * @returns {Object} - 包含缺失槽位、建议原子和覆盖率得分
 */
function analyzeGaps(
  requiredSlots: SlotType[] | undefined,
  slotMatches: SlotMatchResult
): { missingSlots: SlotType[]; suggestedAtoms: Array<{ name: string; type: FunctionalAtom['type']; slot_type: SlotType; reason: string; priority: 'high' | 'medium' | 'low' }>; coverageScore: number } {
  const missingSlots: SlotType[] = [];
  const suggestedAtoms: Array<{ name: string; type: FunctionalAtom['type']; slot_type: SlotType; reason: string; priority: 'high' | 'medium' | 'low' }> = [];
  
  // [配置]：确定需要检查的槽位
  const slotsToCheck = requiredSlots || ['perception', 'decision', 'action'];
  let filledCount = 0;
  
  // [遍历]：检查每个必需槽位的填充状态
  for (const slot of slotsToCheck) {
    if (slotMatches[slot].length === 0) {
      missingSlots.push(slot);
      
      // [建议]：为缺失槽位生成原子建议
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
  
  // [计算]：覆盖率得分
  const coverageScore = filledCount / slotsToCheck.length;
  
  return { missingSlots, suggestedAtoms, coverageScore };
}

/**
 * 混合资产检索钩子
 * 
 * 提供统一的资产检索能力，支持按自然语言描述搜索技能、MCP工具和知识库，
 * 并自动按感知-决策-行动槽位进行分类。支持IO端口兼容性检查和自动连线建议。
 * 
 * @returns {UseHybridAssetSearchResult} - 检索方法、状态及结果
 */
export function useHybridAssetSearch(): UseHybridAssetSearchResult {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<HybridRetrievalResult | null>(null);
  
  /**
   * 按描述搜索并分槽
   * 
   * 根据用户输入的自然语言描述，通过边缘函数调用语义检索服务，
   * 获取匹配的功能原子并按槽位分组，同时分析IO兼容性和缺口。
   * 
   * @param {string} description - 用户输入的自然语言描述
   * @param {Partial<HybridRetrievalRequest>} options - 检索选项配置
   * @returns {Promise<HybridRetrievalResult>} - 检索结果
   */
  const searchByDescription = useCallback(async (
    description: string,
    options: Partial<HybridRetrievalRequest> = {}
  ): Promise<HybridRetrievalResult> => {
    setIsLoading(true);
    setError(null);
    
    const startTime = Date.now();
    
    try {
      // [调用]：尝试调用混合检索边缘函数
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
      
      // [回退]：若边缘函数不存在则使用本地处理
      if (!data) {
        // [调用]：使用现有的语义资产搜索
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
        
        // [转换]：将搜索结果转换为功能原子
        const allAssets = [
          ...(searchData?.skills || []),
          ...(searchData?.mcpTools || []),
          ...(searchData?.knowledgeBases || []),
        ];
        
        const allAtoms = allAssets.map(assetToAtom);
        const slotMatches = groupBySlot(allAtoms);
        
        // [计算]：分析IO兼容性
        const compatiblePairs = getCompatiblePairsFn(allAtoms);
        
        // [分析]：检测槽位缺口
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
  
  /**
   * 获取可自动连接的原子对
   * 
   * 分析功能原子列表，找出所有IO端口兼容的原子配对。
   * 
   * @param {FunctionalAtom[]} atoms - 功能原子数组
   * @returns {CompatiblePair[]} - 兼容的原子配对列表
   */
  const getCompatiblePairs = useCallback((atoms: FunctionalAtom[]): CompatiblePair[] => {
    return getCompatiblePairsFn(atoms);
  }, []);
  
  /**
   * 按槽位筛选原子
   * 
   * 从功能原子列表中筛选出指定槽位类型的原子。
   * 
   * @param {FunctionalAtom[]} atoms - 功能原子数组
   * @param {SlotType} slotType - 目标槽位类型
   * @returns {FunctionalAtom[]} - 筛选后的原子列表
   */
  const filterBySlot = useCallback((atoms: FunctionalAtom[], slotType: SlotType): FunctionalAtom[] => {
    return atoms.filter(atom => atom.slot_type === slotType);
  }, []);
  
  /**
   * 检查IO兼容性
   * 
   * 检查两个IO规范之间的端口兼容性。
   * 
   * @param {IOSpec} source - 源IO规范
   * @param {IOSpec} target - 目标IO规范
   * @returns {{ compatible: boolean; matchedFields: string[] }} - 兼容性结果
   */
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

/**
 * 获取可自动连接的原子对（内部函数）
 * 
 * 遍历所有功能原子，根据槽位流向规则（感知→决策→行动）和IO兼容性，
 * 找出可以自动连接的原子配对。
 * 
 * @param {FunctionalAtom[]} atoms - 功能原子数组
 * @returns {CompatiblePair[]} - 按兼容性得分排序的配对列表
 */
function getCompatiblePairsFn(atoms: FunctionalAtom[]): CompatiblePair[] {
  const pairs: CompatiblePair[] = [];
  
  // [遍历]：检查每对原子的兼容性
  for (const source of atoms) {
    for (const target of atoms) {
      if (source.id === target.id) continue;
      
      // [规则]：验证槽位自然流向（感知层→决策层→行动层）
      const validFlow = 
        (source.slot_type === 'perception' && (target.slot_type === 'decision' || target.slot_type === 'action')) ||
        (source.slot_type === 'decision' && target.slot_type === 'action') ||
        (source.slot_type === 'hybrid');
      
      if (!validFlow) continue;
      
      // [检查]：验证IO端口兼容性
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
  
  // [排序]：按兼容性得分降序排列
  return pairs.sort((a, b) => b.compatibilityScore - a.compatibilityScore);
}
