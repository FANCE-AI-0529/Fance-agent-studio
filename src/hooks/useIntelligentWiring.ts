// =====================================================
// 智能连线 Hook - useIntelligentWiring
// 提供完整的智能胶水层功能
// =====================================================

import { useState, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  WiringConnection,
  AdapterNodeSpec,
  ManusLoggerNodeSpec,
  IntelligentWiringResult,
  IntelligentWiringOptions,
  WiringStatistics,
  IOPort,
} from '@/types/wiringTypes';
import { NodeSpec } from '@/types/workflowDSL';
import { inferAllNodeIOPorts } from '@/utils/ioTypeInference';
import { needsTypeAdapter, createAdapterNode } from '@/utils/typeAdapterInjector';
import {
  injectManusConnections,
  validateManusCompliance,
} from '@/utils/manusWiringIntegration';

// ========== 状态类型 ==========

interface WiringState {
  isProcessing: boolean;
  connections: WiringConnection[];
  adapterNodes: AdapterNodeSpec[];
  manusNodes: ManusLoggerNodeSpec[];
  warnings: string[];
  statistics: WiringStatistics | null;
  error: string | null;
}

const initialState: WiringState = {
  isProcessing: false,
  connections: [],
  adapterNodes: [],
  manusNodes: [],
  warnings: [],
  statistics: null,
  error: null,
};

// ========== 语义端口匹配关键词 ==========

const PORT_SEMANTIC_SYNONYMS: Record<string, string[]> = {
  content: ['text', 'body', 'message', 'data', 'output', 'result', 'response'],
  query: ['input', 'question', 'search', 'text', 'message', 'prompt'],
  body: ['content', 'text', 'message', 'data', 'payload'],
  result: ['output', 'response', 'data', 'content', 'answer'],
  to: ['recipient', 'email', 'target', 'destination', 'address'],
  subject: ['title', 'header', 'name', 'topic'],
  status: ['state', 'result', 'code', 'condition'],
  input: ['data', 'content', 'message', 'query', 'text'],
  output: ['result', 'response', 'data', 'content'],
};

// ========== 主 Hook ==========

export function useIntelligentWiring() {
  const [state, setState] = useState<WiringState>(initialState);

  // 重置状态
  const reset = useCallback(() => {
    setState(initialState);
  }, []);

  // 计算端口匹配分数
  const calculatePortMatchScore = useCallback(
    (sourcePort: IOPort, targetPort: IOPort): number => {
      let score = 0;

      // 1. 类型兼容性 (权重: 0.4)
      if (sourcePort.type === targetPort.type || targetPort.type === 'any') {
        score += 0.4;
      } else if (sourcePort.type === 'any') {
        score += 0.3;
      } else {
        const { needed } = needsTypeAdapter(sourcePort.type, targetPort.type);
        if (!needed) {
          score += 0.35;
        } else {
          score += 0.15; // 可转换但需要适配器
        }
      }

      // 2. 名称匹配 (权重: 0.35)
      const sourceName = sourcePort.id.toLowerCase();
      const targetName = targetPort.id.toLowerCase();

      if (sourceName === targetName) {
        score += 0.35;
      } else if (
        sourceName.includes(targetName) ||
        targetName.includes(sourceName)
      ) {
        score += 0.25;
      } else {
        // 语义匹配
        const semanticScore = checkSemanticMatch(sourceName, targetName);
        score += semanticScore * 0.2;
      }

      // 3. 描述相似度 (权重: 0.15)
      if (sourcePort.description && targetPort.description) {
        score +=
          calculateTextSimilarity(
            sourcePort.description,
            targetPort.description
          ) * 0.15;
      }

      // 4. 必填字段加权 (权重: 0.1)
      if (targetPort.required) {
        score += 0.1;
      }

      return Math.min(score, 1.0);
    },
    []
  );

  // 语义匹配检查
  const checkSemanticMatch = (source: string, target: string): number => {
    for (const [key, synonyms] of Object.entries(PORT_SEMANTIC_SYNONYMS)) {
      const allTerms = [key, ...synonyms];
      const sourceMatches = allTerms.some(
        t => source.includes(t) || t.includes(source)
      );
      const targetMatches = allTerms.some(
        t => target.includes(t) || t.includes(target)
      );

      if (sourceMatches && targetMatches) {
        return 1.0;
      }
    }
    return 0;
  };

  // 文本相似度计算
  const calculateTextSimilarity = (text1: string, text2: string): number => {
    const words1 = text1.toLowerCase().split(/\s+/);
    const words2 = text2.toLowerCase().split(/\s+/);

    const set1 = new Set(words1);
    const set2 = new Set(words2);

    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);

    return intersection.size / union.size;
  };

  // 寻找最佳端口匹配
  const findBestPortMatches = useCallback(
    (
      sourceOutputs: IOPort[],
      targetInputs: IOPort[],
      sourceNodeId: string,
      targetNodeId: string
    ): WiringConnection[] => {
      const matches: WiringConnection[] = [];

      for (const targetPort of targetInputs) {
        let bestMatch: WiringConnection | null = null;
        let bestScore = 0;

        for (const sourcePort of sourceOutputs) {
          const score = calculatePortMatchScore(sourcePort, targetPort);

          if (score > bestScore) {
            bestScore = score;

            const { needed, rule } = needsTypeAdapter(
              sourcePort.type,
              targetPort.type
            );

            bestMatch = {
              id: `wire-${sourceNodeId}-${sourcePort.id}-${targetNodeId}-${targetPort.id}`,
              source: {
                nodeId: sourceNodeId,
                portId: sourcePort.id,
                portName: sourcePort.name,
                dataType: sourcePort.type,
              },
              target: {
                nodeId: targetNodeId,
                portId: targetPort.id,
                portName: targetPort.name,
                dataType: targetPort.type,
              },
              mapping: `{{${sourceNodeId}.output.${sourcePort.id}}}`,
              confidence: score,
              status:
                score >= 0.7 ? 'confirmed' : needed ? 'needs_adapter' : 'draft',
              matchReason: getMatchReason(sourcePort, targetPort, score),
              adapterNode:
                needed && rule
                  ? createAdapterNode(rule, sourceNodeId, targetNodeId, {
                      sourcePortName: sourcePort.name,
                      targetPortName: targetPort.name,
                    })
                  : undefined,
            };
          }
        }

        if (bestMatch && (targetPort.required || bestScore >= 0.4)) {
          matches.push(bestMatch);
        }
      }

      return matches;
    },
    [calculatePortMatchScore]
  );

  // 获取匹配原因
  const getMatchReason = (
    source: IOPort,
    target: IOPort,
    score: number
  ): string => {
    const sourceName = source.id.toLowerCase();
    const targetName = target.id.toLowerCase();

    if (sourceName === targetName) {
      return '字段名完全匹配';
    }
    if (sourceName.includes(targetName) || targetName.includes(sourceName)) {
      return '字段名部分匹配';
    }
    if (source.type === target.type) {
      return '类型完全匹配';
    }
    if (score >= 0.7) {
      return '语义相似度高';
    }
    if (score >= 0.4) {
      return '类型兼容，需人工确认';
    }
    return '类型兼容匹配';
  };

  // 主处理函数：智能连线
  const processIntelligentWiring = useCallback(
    async (
      nodes: NodeSpec[],
      edges: { source: string; target: string }[],
      options: IntelligentWiringOptions = {}
    ): Promise<IntelligentWiringResult> => {
      setState(prev => ({ ...prev, isProcessing: true, error: null }));

      try {
        const {
          enableTypeAdapters = true,
          enableManusIntegration = true,
          confidenceThreshold = 0.4,
        } = options;

        const connections: WiringConnection[] = [];
        const adapterNodes: AdapterNodeSpec[] = [];
        const warnings: string[] = [];

        // 1. 推断所有节点的 IO 端口
        const nodeIOMap = inferAllNodeIOPorts(
          nodes.map(n => ({
            id: n.id,
            type: n.type,
            name: n.name,
            description: n.description,
            config: n.config,
          }))
        );

        // 2. 遍历边，为每条边创建最佳连线
        for (const edge of edges) {
          const sourceIO = nodeIOMap.get(edge.source);
          const targetIO = nodeIOMap.get(edge.target);

          if (!sourceIO || !targetIO) continue;

          const matches = findBestPortMatches(
            sourceIO.outputs,
            targetIO.inputs,
            edge.source,
            edge.target
          );

          for (const match of matches) {
            if (match.confidence >= confidenceThreshold) {
              connections.push(match);

              // 收集适配器节点
              if (enableTypeAdapters && match.adapterNode) {
                adapterNodes.push(match.adapterNode);
                warnings.push(
                  `类型转换: ${match.source.portName} (${match.source.dataType}) → ${match.target.portName} (${match.target.dataType})`
                );
              }

              if (match.status === 'draft') {
                warnings.push(
                  `⚠️ 低置信度连接: ${match.source.portName} → ${match.target.portName} (${Math.round(match.confidence * 100)}%)`
                );
              }
            }
          }
        }

        // 3. Manus 协议集成
        let manusNodes: ManusLoggerNodeSpec[] = [];
        if (enableManusIntegration) {
          const manusResult = injectManusConnections(nodes, connections);
          manusNodes = manusResult.manusNodes;
          warnings.push(...manusResult.warnings);

          // 添加新的 Manus 连接
          for (const conn of manusResult.modifiedConnections) {
            if (!connections.find(c => c.id === conn.id)) {
              connections.push(conn);
            }
          }
        }

        // 4. 计算统计信息
        const statistics: WiringStatistics = {
          totalConnections: connections.length,
          confirmedConnections: connections.filter(c => c.status === 'confirmed')
            .length,
          draftConnections: connections.filter(c => c.status === 'draft').length,
          adapterCount: adapterNodes.length,
          manusNodeCount: manusNodes.length,
          averageConfidence:
            connections.length > 0
              ? connections.reduce((sum, c) => sum + c.confidence, 0) /
                connections.length
              : 0,
        };

        const result: IntelligentWiringResult = {
          connections,
          adapterNodes,
          manusNodes,
          warnings,
          statistics,
        };

        setState({
          isProcessing: false,
          connections,
          adapterNodes,
          manusNodes,
          warnings,
          statistics,
          error: null,
        });

        return result;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : '智能连线处理失败';
        setState(prev => ({
          ...prev,
          isProcessing: false,
          error: errorMessage,
        }));
        throw error;
      }
    },
    [findBestPortMatches]
  );

  // 通过 Edge Function 处理（远程）
  const processViaEdgeFunction = useCallback(
    async (
      nodes: NodeSpec[],
      edges: { source: string; target: string }[],
      options: IntelligentWiringOptions = {}
    ): Promise<IntelligentWiringResult> => {
      setState(prev => ({ ...prev, isProcessing: true, error: null }));

      try {
        const { data, error } = await supabase.functions.invoke('auto-wire', {
          body: { nodes, edges, options },
        });

        if (error) throw error;

        const result = data as IntelligentWiringResult;

        setState({
          isProcessing: false,
          connections: result.connections,
          adapterNodes: result.adapterNodes,
          manusNodes: result.manusNodes,
          warnings: result.warnings,
          statistics: result.statistics,
          error: null,
        });

        return result;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : '边缘函数调用失败';
        setState(prev => ({
          ...prev,
          isProcessing: false,
          error: errorMessage,
        }));

        // 回退到本地处理
        console.warn('Edge function failed, falling back to local processing');
        return processIntelligentWiring(nodes, edges, options);
      }
    },
    [processIntelligentWiring]
  );

  // 验证 Manus 合规性
  const checkManusCompliance = useCallback(
    (nodes: NodeSpec[]): { compliant: boolean; violations: string[] } => {
      return validateManusCompliance(nodes, state.connections);
    },
    [state.connections]
  );

  // 确认连接
  const confirmConnection = useCallback((connectionId: string) => {
    setState(prev => ({
      ...prev,
      connections: prev.connections.map(c =>
        c.id === connectionId
          ? { ...c, status: 'confirmed', confidence: 1.0 }
          : c
      ),
    }));
  }, []);

  // 移除连接
  const removeConnection = useCallback((connectionId: string) => {
    setState(prev => ({
      ...prev,
      connections: prev.connections.filter(c => c.id !== connectionId),
    }));
  }, []);

  // 修改连接映射
  const updateConnectionMapping = useCallback(
    (connectionId: string, newMapping: string) => {
      setState(prev => ({
        ...prev,
        connections: prev.connections.map(c =>
          c.id === connectionId ? { ...c, mapping: newMapping } : c
        ),
      }));
    },
    []
  );

  // 计算覆盖率
  const calculateCoverage = useMemo(() => {
    if (state.statistics === null) return 0;
    const { totalConnections, confirmedConnections } = state.statistics;
    return totalConnections > 0
      ? (confirmedConnections / totalConnections) * 100
      : 0;
  }, [state.statistics]);

  return {
    // 状态
    isProcessing: state.isProcessing,
    connections: state.connections,
    adapterNodes: state.adapterNodes,
    manusNodes: state.manusNodes,
    warnings: state.warnings,
    statistics: state.statistics,
    error: state.error,
    coverage: calculateCoverage,

    // 操作
    processIntelligentWiring,
    processViaEdgeFunction,
    checkManusCompliance,
    confirmConnection,
    removeConnection,
    updateConnectionMapping,
    reset,
  };
}

export type UseIntelligentWiringReturn = ReturnType<typeof useIntelligentWiring>;
