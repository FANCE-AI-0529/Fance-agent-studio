/**
 * @file useAgentSync.ts
 * @description 智能体同步管理钩子模块，提供智能体数据与全局状态存储的双向同步及实时更新功能
 * @module Hooks/AgentSync
 * @author Agent OS Studio Team
 * @copyright 2025 Agent OS Studio. All rights reserved.
 * @version 1.0.0
 */

import { useEffect, useCallback, useMemo, useRef } from 'react';
import { useGlobalAgentStore, selectRemoteEvents } from '../stores/globalAgentStore.ts';
import type { SyncEvent } from '../stores/globalAgentStore.ts';
import type { Node, Edge } from '@xyflow/react';

/**
 * 重新导出同步事件类型
 * 供外部组件使用
 */
export type { SyncEvent };

/**
 * 智能体同步管理钩子
 * 
 * 该钩子函数负责将指定智能体的数据与全局状态存储进行同步，
 * 并将数据库格式的节点和边数据转换为 ReactFlow 兼容格式。
 * 适用于构建器（Studio）和消费者（Consumer）两种场景。
 * 
 * @param {string | null} agentId - 智能体唯一标识符
 * @returns 返回同步状态、图形数据及操作函数
 * 
 * @example
 * const { nodes, edges, isSubscribed, reload } = useAgentSync(agentId);
 */
export function useAgentSync(agentId: string | null) {
  // [选择器]：使用精确选择器避免无关状态变化导致的重渲染
  const storeAgentId = useGlobalAgentStore((s) => s.agentId);
  const setAgentId = useGlobalAgentStore((s) => s.setAgentId);
  const loadAgent = useGlobalAgentStore((s) => s.loadAgent);
  const clearAgent = useGlobalAgentStore((s) => s.clearAgent);
  const subscribe = useGlobalAgentStore((s) => s.subscribe);
  const unsubscribe = useGlobalAgentStore((s) => s.unsubscribe);
  const isSubscribed = useGlobalAgentStore((s) => s.isSubscribed);
  const isSyncing = useGlobalAgentStore((s) => s.isSyncing);
  const syncError = useGlobalAgentStore((s) => s.syncError);
  const lastSyncedAt = useGlobalAgentStore((s) => s.lastSyncedAt);
  const agentConfig = useGlobalAgentStore((s) => s.agentConfig);
  const rawNodes = useGlobalAgentStore((s) => s.nodes);
  const rawEdges = useGlobalAgentStore((s) => s.edges);

  // [初始化]：当智能体ID变化时设置存储中的当前智能体
  useEffect(() => {
    if (agentId) {
      // [检查]：仅在ID不同时设置，避免重复订阅
      if (storeAgentId !== agentId) {
        setAgentId(agentId);
      }
    }
    
    return () => {
      // [保持]：组件卸载时不清除存储，让状态持久化
    };
  }, [agentId, setAgentId, storeAgentId]);

  /**
   * 将数据库节点格式转换为 ReactFlow 节点格式
   * 
   * ReactFlow 要求特定的数据结构，此处进行格式转换：
   * - node_id -> id
   * - node_type -> type
   * - position_x/y -> position
   */
  const reactFlowNodes: Node[] = useMemo(() => {
    return rawNodes.map(node => ({
      id: node.node_id,
      type: node.node_type,
      position: { x: Number(node.position_x), y: Number(node.position_y) },
      data: node.data,
    }));
  }, [rawNodes]);

  /**
   * 将数据库边格式转换为 ReactFlow 边格式
   * 
   * 进行字段映射：
   * - edge_id -> id
   * - source_node -> source
   * - target_node -> target
   */
  const reactFlowEdges: Edge[] = useMemo(() => {
    return rawEdges.map(edge => ({
      id: edge.edge_id,
      source: edge.source_node,
      target: edge.target_node,
      type: edge.edge_type,
      data: edge.data,
    }));
  }, [rawEdges]);

  /**
   * 强制重新加载智能体数据
   * 从数据库重新获取最新的节点和边数据
   */
  const reload = useCallback(async () => {
    if (agentId) {
      return loadAgent(agentId);
    }
    return false;
  }, [agentId, loadAgent]);

  return {
    // [状态]：同步相关状态
    /** 是否已订阅实时更新 */
    isSubscribed,
    /** 是否正在同步中 */
    isSyncing,
    /** 同步错误信息 */
    syncError,
    /** 最后同步时间 */
    lastSyncedAt,
    
    // [数据]：ReactFlow 格式的图形数据
    /** 节点列表（ReactFlow 格式） */
    nodes: reactFlowNodes,
    /** 边列表（ReactFlow 格式） */
    edges: reactFlowEdges,
    /** 智能体配置信息 */
    agentConfig,
    
    // [原始数据]：数据库格式的原始数据
    /** 原始节点数据 */
    rawNodes,
    /** 原始边数据 */
    rawEdges,
    
    // [操作]：数据操作函数
    /** 重新加载数据 */
    reload,
    /** 订阅实时更新 */
    subscribe,
    /** 取消订阅 */
    unsubscribe,
    /** 清除智能体数据 */
    clearAgent,
    /** 加载智能体 */
    loadAgent,
  };
}

/**
 * 远程同步事件监听钩子
 * 
 * 该钩子函数用于监听来自其他客户端的同步事件，
 * 适用于触发动画效果或显示协作者的操作。
 * 
 * @param {Function} onEvent - 接收到新事件时的回调函数
 * @returns {SyncEvent[]} 返回最近的远程事件列表
 */
export function useRemoteSyncEvents(
  onEvent?: (event: SyncEvent) => void
) {
  // [选择器]：获取远程事件列表
  const remoteEvents = useGlobalAgentStore(selectRemoteEvents);
  // [引用]：记录上一次处理的事件
  const lastEventRef = useRef<SyncEvent | null>(null);
  // [引用]：保持回调函数引用稳定
  const onEventRef = useRef(onEvent);
  
  // [更新]：保持回调引用最新
  useEffect(() => {
    onEventRef.current = onEvent;
  }, [onEvent]);

  // [监听]：检测新事件并触发回调
  useEffect(() => {
    if (remoteEvents.length > 0) {
      const latestEvent = remoteEvents[remoteEvents.length - 1];
      
      // [去重]：仅对新事件触发回调
      if (
        lastEventRef.current?.timestamp.getTime() !== latestEvent.timestamp.getTime()
      ) {
        lastEventRef.current = latestEvent;
        onEventRef.current?.(latestEvent);
      }
    }
  }, [remoteEvents]);

  return remoteEvents;
}

/**
 * 图形节点操作钩子
 * 
 * 该钩子函数提供对图形节点的增删改操作接口，
 * 所有操作会自动同步到全局存储和数据库。
 * 
 * @returns 返回节点操作函数集合
 */
export function useGraphNodeOperations() {
  // [选择器]：使用精确选择器获取操作函数
  const addNode = useGlobalAgentStore((s) => s.addNode);
  const updateNode = useGlobalAgentStore((s) => s.updateNode);
  const updateNodePosition = useGlobalAgentStore((s) => s.updateNodePosition);
  const removeNode = useGlobalAgentStore((s) => s.removeNode);

  /**
   * 添加 ReactFlow 格式的节点
   * 
   * @param {string} nodeId - 节点唯一标识符
   * @param {string} nodeType - 节点类型
   * @param {Object} position - 节点位置坐标
   * @param {Object} data - 节点数据
   */
  const addReactFlowNode = useCallback(async (
    nodeId: string,
    nodeType: string,
    position: { x: number; y: number },
    data: Record<string, any> = {}
  ) => {
    // [获取]：从存储中获取当前智能体ID
    const agentId = useGlobalAgentStore.getState().agentId;
    if (!agentId) return null;
    
    // [添加]：调用存储的添加节点方法
    return addNode({
      agent_id: agentId,
      node_id: nodeId,
      node_type: nodeType,
      position_x: position.x,
      position_y: position.y,
      data,
    });
  }, [addNode]);

  /**
   * 更新节点位置
   * 
   * @param {string} nodeId - 节点ID
   * @param {Object} position - 新的位置坐标
   */
  const updateReactFlowNodePosition = useCallback(async (
    nodeId: string,
    position: { x: number; y: number }
  ) => {
    return updateNodePosition(nodeId, position.x, position.y);
  }, [updateNodePosition]);

  /**
   * 更新节点数据
   * 
   * @param {string} nodeId - 节点ID
   * @param {Object} data - 新的节点数据
   */
  const updateReactFlowNodeData = useCallback(async (
    nodeId: string,
    data: Record<string, any>
  ) => {
    return updateNode(nodeId, { data });
  }, [updateNode]);

  return {
    /** 添加节点 */
    addNode: addReactFlowNode,
    /** 更新节点位置 */
    updateNodePosition: updateReactFlowNodePosition,
    /** 更新节点数据 */
    updateNodeData: updateReactFlowNodeData,
    /** 删除节点 */
    removeNode,
  };
}

/**
 * 图形边操作钩子
 * 
 * 该钩子函数提供对图形边的增删改操作接口，
 * 所有操作会自动同步到全局存储和数据库。
 * 
 * @returns 返回边操作函数集合
 */
export function useGraphEdgeOperations() {
  // [选择器]：使用精确选择器获取操作函数
  const addEdge = useGlobalAgentStore((s) => s.addEdge);
  const updateEdge = useGlobalAgentStore((s) => s.updateEdge);
  const removeEdge = useGlobalAgentStore((s) => s.removeEdge);

  /**
   * 添加 ReactFlow 格式的边
   * 
   * @param {string} edgeId - 边唯一标识符
   * @param {string} source - 源节点ID
   * @param {string} target - 目标节点ID
   * @param {string} edgeType - 边类型
   * @param {Object} data - 边数据
   */
  const addReactFlowEdge = useCallback(async (
    edgeId: string,
    source: string,
    target: string,
    edgeType: string = 'default',
    data: Record<string, any> = {}
  ) => {
    // [获取]：从存储中获取当前智能体ID
    const agentId = useGlobalAgentStore.getState().agentId;
    if (!agentId) return null;
    
    // [添加]：调用存储的添加边方法
    return addEdge({
      agent_id: agentId,
      edge_id: edgeId,
      source_node: source,
      target_node: target,
      edge_type: edgeType,
      data,
    });
  }, [addEdge]);

  return {
    /** 添加边 */
    addEdge: addReactFlowEdge,
    /** 更新边 */
    updateEdge,
    /** 删除边 */
    removeEdge,
  };
}
