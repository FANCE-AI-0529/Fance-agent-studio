import React from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Brain, Wrench, BookOpen, Zap, Database, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MiniNodeData {
  label?: string;
  isActive?: boolean;
  nodeType?: string;
}

// Simplified Manus Core Node
export const MiniManusNode = React.memo(({ data }: NodeProps) => {
  const nodeData = data as MiniNodeData;
  const isActive = nodeData?.isActive || false;

  return (
    <div
      className={cn(
        "w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/40 border-2 border-primary/50",
        "flex items-center justify-center transition-all duration-300",
        "hover:scale-110 cursor-pointer",
        isActive && "animate-pulse shadow-[0_0_20px_rgba(var(--primary),0.5)]"
      )}
    >
      <Brain className="w-5 h-5 text-primary" />
      <Handle type="source" position={Position.Bottom} className="!w-2 !h-2 !bg-primary/50" />
      <Handle type="target" position={Position.Top} className="!w-2 !h-2 !bg-primary/50" />
    </div>
  );
});

MiniManusNode.displayName = 'MiniManusNode';

// Simplified Skill Node
export const MiniSkillNode = React.memo(({ data }: NodeProps) => {
  const nodeData = data as MiniNodeData;
  const isActive = nodeData?.isActive || false;

  return (
    <div
      className={cn(
        "w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500/20 to-blue-600/40 border border-blue-500/50",
        "flex items-center justify-center transition-all duration-300",
        "hover:scale-110 cursor-pointer",
        isActive && "animate-pulse shadow-[0_0_15px_rgba(59,130,246,0.5)]"
      )}
    >
      <Wrench className="w-4 h-4 text-blue-400" />
      <Handle type="target" position={Position.Top} className="!w-1.5 !h-1.5 !bg-blue-400/50" />
      <Handle type="source" position={Position.Bottom} className="!w-1.5 !h-1.5 !bg-blue-400/50" />
    </div>
  );
});

MiniSkillNode.displayName = 'MiniSkillNode';

// Simplified Knowledge Base Node
export const MiniKnowledgeNode = React.memo(({ data }: NodeProps) => {
  const nodeData = data as MiniNodeData;
  const isActive = nodeData?.isActive || false;

  return (
    <div
      className={cn(
        "w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500/20 to-emerald-600/40 border border-emerald-500/50",
        "flex items-center justify-center transition-all duration-300",
        "hover:scale-110 cursor-pointer",
        isActive && "animate-pulse shadow-[0_0_15px_rgba(16,185,129,0.5)]"
      )}
    >
      <BookOpen className="w-4 h-4 text-emerald-400" />
      <Handle type="target" position={Position.Top} className="!w-1.5 !h-1.5 !bg-emerald-400/50" />
      <Handle type="source" position={Position.Bottom} className="!w-1.5 !h-1.5 !bg-emerald-400/50" />
    </div>
  );
});

MiniKnowledgeNode.displayName = 'MiniKnowledgeNode';

// Simplified Trigger Node
export const MiniTriggerNode = React.memo(({ data }: NodeProps) => {
  const nodeData = data as MiniNodeData;
  const isActive = nodeData?.isActive || false;

  return (
    <div
      className={cn(
        "w-8 h-8 rounded-full bg-gradient-to-br from-amber-500/20 to-amber-600/40 border border-amber-500/50",
        "flex items-center justify-center transition-all duration-300",
        "hover:scale-110 cursor-pointer",
        isActive && "animate-pulse shadow-[0_0_15px_rgba(245,158,11,0.5)]"
      )}
    >
      <Zap className="w-4 h-4 text-amber-400" />
      <Handle type="source" position={Position.Bottom} className="!w-1.5 !h-1.5 !bg-amber-400/50" />
    </div>
  );
});

MiniTriggerNode.displayName = 'MiniTriggerNode';

// Simplified Output Node
export const MiniOutputNode = React.memo(({ data }: NodeProps) => {
  const nodeData = data as MiniNodeData;
  const isActive = nodeData?.isActive || false;

  return (
    <div
      className={cn(
        "w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500/20 to-purple-600/40 border border-purple-500/50",
        "flex items-center justify-center transition-all duration-300",
        "hover:scale-110 cursor-pointer",
        isActive && "animate-pulse shadow-[0_0_15px_rgba(168,85,247,0.5)]"
      )}
    >
      <MessageSquare className="w-4 h-4 text-purple-400" />
      <Handle type="target" position={Position.Top} className="!w-1.5 !h-1.5 !bg-purple-400/50" />
    </div>
  );
});

MiniOutputNode.displayName = 'MiniOutputNode';

// Simplified MCP/Action Node
export const MiniActionNode = React.memo(({ data }: NodeProps) => {
  const nodeData = data as MiniNodeData;
  const isActive = nodeData?.isActive || false;

  return (
    <div
      className={cn(
        "w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500/20 to-cyan-600/40 border border-cyan-500/50",
        "flex items-center justify-center transition-all duration-300",
        "hover:scale-110 cursor-pointer",
        isActive && "animate-pulse shadow-[0_0_15px_rgba(6,182,212,0.5)]"
      )}
    >
      <Database className="w-4 h-4 text-cyan-400" />
      <Handle type="target" position={Position.Top} className="!w-1.5 !h-1.5 !bg-cyan-400/50" />
      <Handle type="source" position={Position.Bottom} className="!w-1.5 !h-1.5 !bg-cyan-400/50" />
    </div>
  );
});

MiniActionNode.displayName = 'MiniActionNode';

// Node types mapping for ReactFlow
export const miniNodeTypes = {
  manus: MiniManusNode,
  manusKernel: MiniManusNode,
  skill: MiniSkillNode,
  knowledge: MiniKnowledgeNode,
  knowledgeBase: MiniKnowledgeNode,
  trigger: MiniTriggerNode,
  output: MiniOutputNode,
  action: MiniActionNode,
  mcpAction: MiniActionNode,
  // Fallback for unknown types
  default: MiniSkillNode,
};
