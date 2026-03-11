/**
 * @file CollaborationWorkspace.tsx
 * @description 多 Agent 协作工作区
 */

import { useState, useMemo } from 'react';
import { 
  Users, 
  ArrowRight, 
  MessageSquare, 
  CheckCircle,
  Clock,
  AlertTriangle,
  Play,
  Pause,
  RefreshCw,
  Settings,
  ChevronDown,
  ChevronRight,
  Zap,
  Link,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card.tsx';
import { Button } from '../ui/button.tsx';
import { Badge } from '../ui/badge.tsx';
import { Progress } from '../ui/progress.tsx';
import { ScrollArea } from '../ui/scroll-area.tsx';
import { Avatar, AvatarFallback } from '../ui/avatar.tsx';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '../ui/collapsible.tsx';
import { cn } from '../../lib/utils.ts';

interface Agent {
  id: string;
  name: string;
  status: 'idle' | 'working' | 'waiting' | 'error';
  avatar?: string;
  color: string;
}

interface DelegatedTask {
  id: string;
  title: string;
  sourceAgentId: string;
  targetAgentId: string;
  status: 'pending' | 'accepted' | 'in_progress' | 'completed' | 'failed';
  progress?: number;
  createdAt: string;
  completedAt?: string;
}

interface CollaborationMessage {
  id: string;
  fromAgentId: string;
  toAgentId: string;
  type: 'request' | 'response' | 'handoff' | 'status';
  content: string;
  timestamp: string;
}

interface CollaborationWorkspaceProps {
  agents: Agent[];
  tasks: DelegatedTask[];
  messages: CollaborationMessage[];
  onDelegateTask?: (sourceId: string, targetId: string, task: string) => void;
  onCancelTask?: (taskId: string) => void;
  className?: string;
}

export function CollaborationWorkspace({
  agents,
  tasks,
  messages,
  onDelegateTask,
  onCancelTask,
  className,
}: CollaborationWorkspaceProps) {
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState({
    agents: true,
    tasks: true,
    messages: true,
  });

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  // 计算统计数据
  const stats = useMemo(() => {
    const activeTasks = tasks.filter(t => t.status === 'in_progress').length;
    const completedTasks = tasks.filter(t => t.status === 'completed').length;
    const activeAgents = agents.filter(a => a.status === 'working').length;
    const totalMessages = messages.length;

    return { activeTasks, completedTasks, activeAgents, totalMessages };
  }, [tasks, messages, agents]);

  // 获取 Agent 的相关任务
  const getAgentTasks = (agentId: string) => {
    return tasks.filter(t => t.sourceAgentId === agentId || t.targetAgentId === agentId);
  };

  const statusConfig = {
    idle: { label: '空闲', color: 'text-muted-foreground', bg: 'bg-muted' },
    working: { label: '工作中', color: 'text-green-500', bg: 'bg-green-500/10' },
    waiting: { label: '等待中', color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
    error: { label: '错误', color: 'text-red-500', bg: 'bg-red-500/10' },
  };

  const taskStatusConfig = {
    pending: { label: '待处理', icon: Clock, color: 'text-muted-foreground' },
    accepted: { label: '已接受', icon: CheckCircle, color: 'text-blue-500' },
    in_progress: { label: '进行中', icon: Play, color: 'text-green-500' },
    completed: { label: '已完成', icon: CheckCircle, color: 'text-green-500' },
    failed: { label: '失败', icon: AlertTriangle, color: 'text-red-500' },
  };

  return (
    <div className={cn('space-y-4', className)}>
      {/* 协作概览 */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              协作概览
            </CardTitle>
            <Badge variant="outline">{agents.length} 个智能体</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-2 text-center">
            <div className="p-2 rounded-lg bg-green-500/10">
              <div className="text-lg font-bold text-green-500">{stats.activeAgents}</div>
              <div className="text-xs text-muted-foreground">活跃</div>
            </div>
            <div className="p-2 rounded-lg bg-blue-500/10">
              <div className="text-lg font-bold text-blue-500">{stats.activeTasks}</div>
              <div className="text-xs text-muted-foreground">任务</div>
            </div>
            <div className="p-2 rounded-lg bg-muted">
              <div className="text-lg font-bold">{stats.completedTasks}</div>
              <div className="text-xs text-muted-foreground">完成</div>
            </div>
            <div className="p-2 rounded-lg bg-muted">
              <div className="text-lg font-bold">{stats.totalMessages}</div>
              <div className="text-xs text-muted-foreground">消息</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Agent 列表 */}
      <Collapsible 
        open={expandedSections.agents} 
        onOpenChange={() => toggleSection('agents')}
      >
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="pb-2 cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Zap className="h-4 w-4" />
                  智能体状态
                </CardTitle>
                {expandedSections.agents ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0">
              <div className="space-y-2">
                {agents.map(agent => {
                  const status = statusConfig[agent.status];
                  const agentTasks = getAgentTasks(agent.id);
                  const isSelected = selectedAgent === agent.id;

                  return (
                    <div
                      key={agent.id}
                      className={cn(
                        'flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors',
                        isSelected ? 'bg-primary/10 ring-1 ring-primary' : 'hover:bg-muted/50'
                      )}
                      onClick={() => setSelectedAgent(isSelected ? null : agent.id)}
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarFallback style={{ backgroundColor: agent.color }}>
                          {agent.name.slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm truncate">{agent.name}</span>
                          <Badge variant="outline" className={cn('text-xs', status.color)}>
                            {status.label}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {agentTasks.length} 个任务
                        </p>
                      </div>
                      {agent.status === 'working' && (
                        <div className="w-16">
                          <Progress value={65} className="h-1" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* 任务委托 */}
      <Collapsible 
        open={expandedSections.tasks} 
        onOpenChange={() => toggleSection('tasks')}
      >
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="pb-2 cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Link className="h-4 w-4" />
                  任务委托
                </CardTitle>
                {expandedSections.tasks ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0">
              <ScrollArea className="h-48">
                <div className="space-y-2">
                  {tasks.map(task => {
                    const sourceAgent = agents.find(a => a.id === task.sourceAgentId);
                    const targetAgent = agents.find(a => a.id === task.targetAgentId);
                    const taskStatus = taskStatusConfig[task.status];
                    const Icon = taskStatus.icon;

                    return (
                      <div
                        key={task.id}
                        className="p-2 rounded-lg border bg-card"
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <Icon className={cn('h-4 w-4', taskStatus.color)} />
                          <span className="text-sm font-medium flex-1 truncate">
                            {task.title}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {taskStatus.label}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span className="truncate">{sourceAgent?.name}</span>
                          <ArrowRight className="h-3 w-3 flex-shrink-0" />
                          <span className="truncate">{targetAgent?.name}</span>
                        </div>
                        {task.progress !== undefined && task.status === 'in_progress' && (
                          <Progress value={task.progress} className="h-1 mt-2" />
                        )}
                      </div>
                    );
                  })}
                  {tasks.length === 0 && (
                    <div className="text-center py-6 text-muted-foreground text-sm">
                      暂无任务委托
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* 消息流 */}
      <Collapsible 
        open={expandedSections.messages} 
        onOpenChange={() => toggleSection('messages')}
      >
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="pb-2 cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  协作消息
                </CardTitle>
                {expandedSections.messages ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0">
              <ScrollArea className="h-32">
                <div className="space-y-2">
                  {messages.slice(-10).map(message => {
                    const fromAgent = agents.find(a => a.id === message.fromAgentId);
                    const toAgent = agents.find(a => a.id === message.toAgentId);

                    const typeConfig = {
                      request: { label: '请求', bg: 'bg-blue-500/10' },
                      response: { label: '响应', bg: 'bg-green-500/10' },
                      handoff: { label: '交接', bg: 'bg-yellow-500/10' },
                      status: { label: '状态', bg: 'bg-muted' },
                    };

                    const config = typeConfig[message.type];

                    return (
                      <div
                        key={message.id}
                        className={cn('p-2 rounded text-xs', config.bg)}
                      >
                        <div className="flex items-center gap-1 mb-1">
                          <span className="font-medium">{fromAgent?.name}</span>
                          <ArrowRight className="h-3 w-3" />
                          <span className="font-medium">{toAgent?.name}</span>
                          <Badge variant="secondary" className="text-[10px] ml-auto">
                            {config.label}
                          </Badge>
                        </div>
                        <p className="text-muted-foreground truncate">{message.content}</p>
                      </div>
                    );
                  })}
                  {messages.length === 0 && (
                    <div className="text-center py-4 text-muted-foreground text-sm">
                      暂无协作消息
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* 操作按钮 */}
      <div className="flex gap-2">
        <Button variant="outline" size="sm" className="flex-1">
          <RefreshCw className="h-3 w-3 mr-1" />
          刷新状态
        </Button>
        <Button variant="outline" size="sm" className="flex-1">
          <Settings className="h-3 w-3 mr-1" />
          协作设置
        </Button>
      </div>
    </div>
  );
}
