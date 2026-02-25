// Swarm 画布节点 (Swarm Canvas Node)

import { memo, useState } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Users, ChevronDown, ChevronUp, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { SwarmCommunicationMode, SwarmMemberRole } from '@/types/swarms';

interface SwarmNodeData {
  label: string;
  description?: string;
  communicationMode: SwarmCommunicationMode;
  members: Array<{
    id: string;
    name: string;
    role: SwarmMemberRole;
    status?: string;
  }>;
  [key: string]: unknown;
}

const modeLabels: Record<SwarmCommunicationMode, string> = {
  sequential: '顺序',
  parallel: '并行',
  consensus: '共识',
  hierarchical: '层级',
};

const roleIcons: Record<SwarmMemberRole, string> = {
  leader: '👑',
  worker: '⚙️',
  reviewer: '🔍',
  specialist: '🎯',
};

function SwarmNodeComponent({ data, selected }: NodeProps) {
  const [expanded, setExpanded] = useState(false);
  const nodeData = data as SwarmNodeData;
  const members = nodeData.members || [];

  return (
    <div
      className={cn(
        'rounded-lg border-2 bg-card shadow-sm min-w-[200px] transition-all',
        selected ? 'border-cognitive shadow-[0_0_12px_hsl(var(--cognitive)/0.3)]' : 'border-border/60',
      )}
    >
      {/* Input handle */}
      <Handle type="target" position={Position.Top} className="!bg-cognitive !w-2.5 !h-2.5" />

      {/* Header */}
      <div className="px-3 py-2 flex items-center gap-2">
        <div className="p-1.5 rounded-md bg-cognitive/10">
          <Users className="h-4 w-4 text-cognitive" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium truncate">{nodeData.label || 'Agent Swarm'}</p>
          <div className="flex items-center gap-1 mt-0.5">
            <Badge variant="secondary" className="text-[9px] h-4 px-1">
              {modeLabels[nodeData.communicationMode || 'sequential']}
            </Badge>
            <span className="text-[10px] text-muted-foreground">
              {members.length} 成员
            </span>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 shrink-0"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </Button>
      </div>

      {/* Expanded member list */}
      {expanded && members.length > 0 && (
        <div className="border-t border-border/40 px-3 py-1.5 space-y-1">
          {members.map((member) => (
            <div key={member.id} className="flex items-center gap-1.5 text-[10px]">
              <span>{roleIcons[member.role]}</span>
              <span className="font-medium truncate flex-1">{member.name}</span>
              <span className="text-muted-foreground">{member.role}</span>
            </div>
          ))}
        </div>
      )}

      {/* Description */}
      {nodeData.description && (
        <div className="px-3 pb-2">
          <p className="text-[10px] text-muted-foreground line-clamp-2">{nodeData.description}</p>
        </div>
      )}

      {/* Output handle */}
      <Handle type="source" position={Position.Bottom} className="!bg-cognitive !w-2.5 !h-2.5" />
    </div>
  );
}

export const SwarmNode = memo(SwarmNodeComponent);
