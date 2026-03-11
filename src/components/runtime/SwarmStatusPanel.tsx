// Swarm 状态面板 (Swarm Status Panel)

import { motion } from 'framer-motion';
import { Users, MessageSquare, Clock, Play, Pause, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils.ts';
import { Badge } from '../ui/badge.tsx';
import { Button } from '../ui/button.tsx';
import { Progress } from '../ui/progress.tsx';
import { ScrollArea } from '../ui/scroll-area.tsx';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card.tsx';
import type { SwarmRuntimeState, SwarmMemberState, SwarmMemberStatus, SwarmMessage } from '../../types/swarms.ts';

interface SwarmStatusPanelProps {
  state: SwarmRuntimeState;
  onPauseMember?: (memberId: string) => void;
  onResumeMember?: (memberId: string) => void;
  className?: string;
}

const memberStatusConfig: Record<SwarmMemberStatus, { icon: typeof Clock; color: string; label: string }> = {
  idle: { icon: Clock, color: 'text-muted-foreground', label: '空闲' },
  thinking: { icon: Loader2, color: 'text-status-planning', label: '思考中' },
  executing: { icon: Play, color: 'text-status-executing', label: '执行中' },
  waiting: { icon: Pause, color: 'text-status-confirm', label: '等待中' },
  done: { icon: CheckCircle, color: 'text-primary', label: '完成' },
  error: { icon: AlertCircle, color: 'text-destructive', label: '错误' },
};

export function SwarmStatusPanel({ state, onPauseMember, onResumeMember, className }: SwarmStatusPanelProps) {
  const totalProgress = state.memberStates.length > 0
    ? state.memberStates.reduce((sum, m) => sum + m.progress, 0) / state.memberStates.length
    : 0;

  return (
    <Card className={cn('border-border/50', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Users className="h-4 w-4 text-cognitive" />
            Swarm 状态
            <Badge variant="outline" className="font-mono text-[10px]">
              Round {state.currentRound}
            </Badge>
          </CardTitle>
          <Badge
            variant={state.state === 'running' ? 'default' : 'secondary'}
            className="text-[10px]"
          >
            {state.state}
          </Badge>
        </div>
        <Progress value={totalProgress} className="h-1.5 mt-2" />
      </CardHeader>

      <CardContent className="space-y-3">
        {/* 成员状态列表 */}
        <div className="space-y-2">
          {state.memberStates.map((member) => (
            <SwarmMemberRow
              key={member.memberId}
              member={member}
              onPause={onPauseMember}
              onResume={onResumeMember}
            />
          ))}
        </div>

        {/* 消息流 */}
        {state.messageLog.length > 0 && (
          <div className="border-t border-border/50 pt-3">
            <div className="flex items-center gap-1.5 mb-2">
              <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground font-medium">
                通信记录 ({state.messageLog.length})
              </span>
            </div>
            <ScrollArea className="h-32">
              <div className="space-y-1.5">
                {state.messageLog.slice(-10).map((msg) => (
                  <SwarmMessageRow key={msg.id} message={msg} members={state.memberStates} />
                ))}
              </div>
            </ScrollArea>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function SwarmMemberRow({
  member,
  onPause,
  onResume,
}: {
  member: SwarmMemberState;
  onPause?: (id: string) => void;
  onResume?: (id: string) => void;
}) {
  const config = memberStatusConfig[member.status];
  const Icon = config.icon;

  return (
    <motion.div
      className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-muted/30"
      animate={member.status === 'thinking' ? { opacity: [0.7, 1, 0.7] } : {}}
      transition={{ duration: 1.5, repeat: Infinity }}
    >
      <Icon className={cn('h-3.5 w-3.5 shrink-0', config.color, member.status === 'thinking' && 'animate-spin')} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-medium truncate">{member.name}</span>
          <span className={cn('text-[10px]', config.color)}>{config.label}</span>
        </div>
        {member.currentTask && (
          <p className="text-[10px] text-muted-foreground truncate">{member.currentTask}</p>
        )}
      </div>
      <div className="flex items-center gap-1">
        <span className="text-[10px] text-muted-foreground font-mono">{member.progress}%</span>
        {member.status === 'executing' && onPause && (
          <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => onPause(member.memberId)}>
            <Pause className="h-3 w-3" />
          </Button>
        )}
        {member.status === 'waiting' && onResume && (
          <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => onResume(member.memberId)}>
            <Play className="h-3 w-3" />
          </Button>
        )}
      </div>
    </motion.div>
  );
}

function SwarmMessageRow({
  message,
  members,
}: {
  message: SwarmMessage;
  members: SwarmMemberState[];
}) {
  const from = members.find(m => m.memberId === message.fromMemberId);
  const to = message.toMemberId === 'broadcast' ? null : members.find(m => m.memberId === message.toMemberId);

  return (
    <div className="flex items-start gap-1.5 text-[10px]">
      <span className="text-primary font-medium shrink-0">{from?.name || '?'}</span>
      <span className="text-muted-foreground">→</span>
      <span className="text-muted-foreground shrink-0">{to?.name || '全体'}</span>
      <span className="text-foreground/80 truncate">{message.content.substring(0, 80)}</span>
    </div>
  );
}
