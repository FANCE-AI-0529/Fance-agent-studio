// =====================================================
// 图谱指令执行器 Hook
// Graph Command Executor - Execute Multiple Commands with Animations
// =====================================================

import { useState, useCallback } from 'react';
import { useGlobalAgentStore } from '../stores/globalAgentStore.ts';
import { toast } from 'sonner';
import type { 
  GraphCommand, 
  BatchGraphCommand,
  GraphOperationResult,
} from '../types/graphCommandTypes.ts';

interface ExecutionState {
  isExecuting: boolean;
  currentIndex: number;
  totalCommands: number;
  results: GraphOperationResult[];
}

export function useGraphCommandExecutor() {
  const [executionState, setExecutionState] = useState<ExecutionState>({
    isExecuting: false,
    currentIndex: 0,
    totalCommands: 0,
    results: [],
  });

  const agentId = useGlobalAgentStore((s) => s.agentId);
  const nodes = useGlobalAgentStore((s) => s.nodes);
  const addNode = useGlobalAgentStore((s) => s.addNode);
  const addEdge = useGlobalAgentStore((s) => s.addEdge);
  const removeNode = useGlobalAgentStore((s) => s.removeNode);

  // Execute single command
  const executeSingle = useCallback(async (command: GraphCommand): Promise<GraphOperationResult> => {
    if (!agentId) {
      return {
        success: false,
        operation: command.action,
        error: 'No agent selected',
        timestamp: new Date(),
      };
    }

    try {
      switch (command.action) {
        case 'add_node': {
          const nodeId = `${command.nodeType || 'skill'}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
          const position = command.position || {
            x: 300 + Math.random() * 200,
            y: 200 + Math.random() * 200,
          };

          const newNode = await addNode({
            agent_id: agentId,
            node_id: nodeId,
            node_type: command.nodeType || 'skill',
            position_x: position.x,
            position_y: position.y,
            data: command.nodeData || {},
          });

          if (!newNode) throw new Error('Failed to add node');

          // Auto-connect
          if (command.autoConnect) {
            const manusCore = nodes.find(n => n.node_type === 'manus');
            if (manusCore) {
              await addEdge({
                agent_id: agentId,
                edge_id: `edge-${nodeId}-${Date.now()}`,
                source_node: nodeId,
                target_node: manusCore.node_id,
                edge_type: 'animated',
                data: {},
              });
            }
          }

          return {
            success: true,
            operation: 'add_node',
            nodeId,
            timestamp: new Date(),
          };
        }

        case 'remove_node': {
          const target = nodes.find(n =>
            (n.data as any)?.name?.includes(command.nodeData?.name) ||
            n.node_id === command.nodeId
          );

          if (!target) throw new Error('Node not found');

          await removeNode(target.node_id);

          return {
            success: true,
            operation: 'remove_node',
            nodeId: target.node_id,
            timestamp: new Date(),
          };
        }

        case 'add_edge': {
          if (!command.sourceNode || !command.targetNode) {
            throw new Error('Missing source or target node');
          }

          const edgeId = command.edgeId || `edge-${Date.now()}`;
          await addEdge({
            agent_id: agentId,
            edge_id: edgeId,
            source_node: command.sourceNode,
            target_node: command.targetNode,
            edge_type: 'animated',
            data: {},
          });

          return {
            success: true,
            operation: 'add_edge',
            edgeId,
            timestamp: new Date(),
          };
        }

        default:
          return {
            success: false,
            operation: command.action,
            error: `Unsupported action: ${command.action}`,
            timestamp: new Date(),
          };
      }
    } catch (error: Error) {
      return {
        success: false,
        operation: command.action,
        error: error.message,
        timestamp: new Date(),
      };
    }
  }, [agentId, nodes, addNode, addEdge, removeNode]);

  // Execute batch commands with delay between each
  const executeBatch = useCallback(async (
    batch: BatchGraphCommand,
    delayMs: number = 300
  ): Promise<GraphOperationResult[]> => {
    const results: GraphOperationResult[] = [];

    setExecutionState({
      isExecuting: true,
      currentIndex: 0,
      totalCommands: batch.commands.length,
      results: [],
    });

    for (let i = 0; i < batch.commands.length; i++) {
      setExecutionState(prev => ({
        ...prev,
        currentIndex: i,
      }));

      const result = await executeSingle(batch.commands[i]);
      results.push(result);

      setExecutionState(prev => ({
        ...prev,
        results: [...prev.results, result],
      }));

      // Delay between operations for visual effect
      if (i < batch.commands.length - 1) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }

    setExecutionState(prev => ({
      ...prev,
      isExecuting: false,
    }));

    const successCount = results.filter(r => r.success).length;
    const failCount = results.length - successCount;

    if (failCount === 0) {
      toast.success(`成功执行 ${successCount} 个操作`);
    } else {
      toast.warning(`完成 ${successCount}/${results.length} 个操作`);
    }

    return results;
  }, [executeSingle]);

  // Reset execution state
  const reset = useCallback(() => {
    setExecutionState({
      isExecuting: false,
      currentIndex: 0,
      totalCommands: 0,
      results: [],
    });
  }, []);

  return {
    executionState,
    executeSingle,
    executeBatch,
    reset,
  };
}
