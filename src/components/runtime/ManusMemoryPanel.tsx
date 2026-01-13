import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain,
  FileText,
  Lightbulb,
  Activity,
  ChevronDown,
  ChevronUp,
  Edit3,
  Save,
  X,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Clock,
  Database,
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { useManusMemoryStore } from '@/stores/manusMemoryStore';
import { MANUS_FILE_PATHS } from '@/data/manusKernel';
import { format } from 'date-fns';

interface ManusMemoryPanelProps {
  agentId: string | null;
  onUpdateFile?: (filePath: string, content: string) => Promise<boolean>;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function ManusMemoryPanel({
  agentId,
  onUpdateFile,
  isCollapsed = false,
  onToggleCollapse
}: ManusMemoryPanelProps) {
  const store = useManusMemoryStore();
  const [activeTab, setActiveTab] = useState('task_plan');
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const getCurrentContent = () => {
    switch (activeTab) {
      case 'task_plan':
        return store.taskPlan;
      case 'findings':
        return store.findings;
      case 'progress':
        return store.progress;
      default:
        return '';
    }
  };

  const getCurrentFilePath = () => {
    switch (activeTab) {
      case 'task_plan':
        return MANUS_FILE_PATHS.TASK_PLAN;
      case 'findings':
        return MANUS_FILE_PATHS.FINDINGS;
      case 'progress':
        return MANUS_FILE_PATHS.PROGRESS;
      default:
        return '';
    }
  };

  const handleStartEdit = () => {
    setEditContent(getCurrentContent());
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditContent('');
  };

  const handleSave = async () => {
    if (!onUpdateFile) return;
    
    setIsSaving(true);
    try {
      const success = await onUpdateFile(getCurrentFilePath(), editContent);
      if (success) {
        setIsEditing(false);
        setEditContent('');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const renderMarkdownPreview = (content: string) => {
    // 简单的 Markdown 渲染
    const lines = content.split('\n');
    return (
      <div className="text-sm space-y-1 font-mono">
        {lines.map((line, idx) => {
          // 标题
          if (line.startsWith('# ')) {
            return <h1 key={idx} className="text-lg font-bold text-foreground">{line.slice(2)}</h1>;
          }
          if (line.startsWith('## ')) {
            return <h2 key={idx} className="text-base font-semibold text-foreground mt-3">{line.slice(3)}</h2>;
          }
          if (line.startsWith('### ')) {
            return <h3 key={idx} className="text-sm font-medium text-foreground mt-2">{line.slice(4)}</h3>;
          }
          
          // 复选框
          if (line.match(/^- \[[ x]\]/)) {
            const checked = line.includes('[x]');
            const text = line.replace(/^- \[[ x]\] /, '');
            return (
              <div key={idx} className="flex items-center gap-2">
                <div className={cn(
                  "w-4 h-4 rounded border flex items-center justify-center",
                  checked ? "bg-primary border-primary" : "border-muted-foreground"
                )}>
                  {checked && <CheckCircle2 className="h-3 w-3 text-primary-foreground" />}
                </div>
                <span className={cn(checked && "line-through text-muted-foreground")}>{text}</span>
              </div>
            );
          }
          
          // 加粗
          if (line.includes('**')) {
            const parts = line.split(/\*\*(.+?)\*\*/g);
            return (
              <p key={idx}>
                {parts.map((part, i) => 
                  i % 2 === 1 ? <strong key={i}>{part}</strong> : part
                )}
              </p>
            );
          }
          
          // 表格头
          if (line.startsWith('|') && line.includes('|')) {
            const cells = line.split('|').filter(c => c.trim());
            const isHeader = idx < lines.length - 1 && lines[idx + 1]?.match(/^\|[-|]+\|$/);
            return (
              <div key={idx} className={cn(
                "grid gap-1 text-xs",
                `grid-cols-${Math.min(cells.length, 4)}`
              )} style={{ gridTemplateColumns: `repeat(${cells.length}, minmax(0, 1fr))` }}>
                {cells.map((cell, ci) => (
                  <span key={ci} className={cn(
                    "px-2 py-1 border-b border-border truncate",
                    isHeader && "font-semibold bg-secondary/30"
                  )}>
                    {cell.trim()}
                  </span>
                ))}
              </div>
            );
          }
          
          // 分隔线
          if (line.match(/^---+$/)) {
            return <hr key={idx} className="border-border my-2" />;
          }
          
          // 普通文本
          if (line.trim()) {
            return <p key={idx} className="text-muted-foreground">{line}</p>;
          }
          
          return <div key={idx} className="h-2" />;
        })}
      </div>
    );
  };

  if (!store.isInitialized) {
    return (
      <div className="p-4 text-center">
        <Brain className="h-8 w-8 mx-auto mb-2 text-muted-foreground opacity-50" />
        <p className="text-sm text-muted-foreground">等待 Manus 内核初始化...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* 头部 - 状态指示器 */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-secondary/20">
        <div className="flex items-center gap-2">
          <Brain className="h-4 w-4 text-cognitive" />
          <span className="text-xs font-medium">Manus Memory</span>
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">
            v2.1.2
          </Badge>
        </div>
        
        {onToggleCollapse && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={onToggleCollapse}
          >
            {isCollapsed ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />}
          </Button>
        )}
      </div>

      <AnimatePresence>
        {!isCollapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="flex-1 overflow-hidden"
          >
            {/* 进度条 */}
            <div className="px-3 py-2 bg-secondary/10 border-b border-border">
              <div className="flex items-center justify-between text-[10px] mb-1">
                <span className="text-muted-foreground">
                  阶段 {store.currentPhase}/{store.totalPhases}
                </span>
                <span className="font-medium">{store.phaseProgress}%</span>
              </div>
              <Progress value={store.phaseProgress} className="h-1.5" />
              
              {/* 规则状态指示器 */}
              <div className="flex gap-2 mt-2">
                {store.needsFindingsUpdate && (
                  <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 border-warning text-warning">
                    <AlertCircle className="h-2.5 w-2.5 mr-0.5" />
                    更新 Findings
                  </Badge>
                )}
                {store.errorStrikes > 0 && (
                  <Badge variant="outline" className={cn(
                    "text-[9px] px-1 py-0 h-4",
                    store.errorStrikes >= 3 ? "border-destructive text-destructive" : "border-muted-foreground"
                  )}>
                    错误: {store.errorStrikes}/3
                  </Badge>
                )}
              </div>
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
              <TabsList className="w-full justify-start px-2 pt-2 pb-0 h-auto bg-transparent border-b border-border rounded-none">
                <TabsTrigger
                  value="task_plan"
                  className="text-xs px-2 py-1.5 rounded-t data-[state=active]:bg-secondary/50 data-[state=active]:border-b-2 data-[state=active]:border-primary"
                >
                  <FileText className="h-3 w-3 mr-1" />
                  任务规划
                </TabsTrigger>
                <TabsTrigger
                  value="findings"
                  className="text-xs px-2 py-1.5 rounded-t data-[state=active]:bg-secondary/50 data-[state=active]:border-b-2 data-[state=active]:border-primary"
                >
                  <Lightbulb className="h-3 w-3 mr-1" />
                  发现
                  {store.findingsCount > 0 && (
                    <Badge variant="secondary" className="ml-1 text-[9px] px-1 py-0 h-4">
                      {store.findingsCount}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger
                  value="progress"
                  className="text-xs px-2 py-1.5 rounded-t data-[state=active]:bg-secondary/50 data-[state=active]:border-b-2 data-[state=active]:border-primary"
                >
                  <Activity className="h-3 w-3 mr-1" />
                  进度
                </TabsTrigger>
                <TabsTrigger
                  value="knowledge"
                  className="text-xs px-2 py-1.5 rounded-t data-[state=active]:bg-secondary/50 data-[state=active]:border-b-2 data-[state=active]:border-primary"
                >
                  <Database className="h-3 w-3 mr-1" />
                  知识库
                  {store.knowledgeMountLog.length > 0 && (
                    <Badge variant="secondary" className="ml-1 text-[9px] px-1 py-0 h-4">
                      {store.knowledgeMountLog.length}
                    </Badge>
                  )}
                </TabsTrigger>
              </TabsList>

              {/* 内容区域 */}
              <div className="flex-1 relative">
                {/* 编辑按钮 */}
                <div className="absolute top-2 right-2 z-10">
                  {isEditing ? (
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={handleCancelEdit}
                        disabled={isSaving}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-primary"
                        onClick={handleSave}
                        disabled={isSaving}
                      >
                        {isSaving ? (
                          <RefreshCw className="h-3 w-3 animate-spin" />
                        ) : (
                          <Save className="h-3 w-3" />
                        )}
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={handleStartEdit}
                    >
                      <Edit3 className="h-3 w-3" />
                    </Button>
                  )}
                </div>

                <TabsContent value="task_plan" className="m-0 h-full">
                  <ScrollArea className="h-[300px]">
                    <div className="p-3">
                      {isEditing && activeTab === 'task_plan' ? (
                        <Textarea
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                          className="min-h-[280px] font-mono text-xs"
                          placeholder="编辑任务规划..."
                        />
                      ) : (
                        renderMarkdownPreview(store.taskPlan || '# 任务规划\n\n暂无内容')
                      )}
                    </div>
                  </ScrollArea>
                </TabsContent>

                <TabsContent value="findings" className="m-0 h-full">
                  <ScrollArea className="h-[300px]">
                    <div className="p-3">
                      {isEditing && activeTab === 'findings' ? (
                        <Textarea
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                          className="min-h-[280px] font-mono text-xs"
                          placeholder="编辑发现记录..."
                        />
                      ) : (
                        renderMarkdownPreview(store.findings || '# 发现\n\n暂无发现')
                      )}
                    </div>
                  </ScrollArea>
                </TabsContent>

                <TabsContent value="progress" className="m-0 h-full">
                  <ScrollArea className="h-[300px]">
                    <div className="p-3">
                      {isEditing && activeTab === 'progress' ? (
                        <Textarea
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                          className="min-h-[280px] font-mono text-xs"
                          placeholder="编辑进度日志..."
                        />
                      ) : (
                        renderMarkdownPreview(store.progress || '# 进度日志\n\n暂无记录')
                      )}
                    </div>
                  </ScrollArea>
                </TabsContent>

                <TabsContent value="knowledge" className="m-0 h-full">
                  <ScrollArea className="h-[300px]">
                    <div className="p-3 space-y-2">
                      {store.knowledgeMountLog.length === 0 ? (
                        <div className="text-center py-8">
                          <Database className="h-8 w-8 mx-auto mb-2 text-muted-foreground opacity-50" />
                          <p className="text-xs text-muted-foreground">暂无知识库操作日志</p>
                        </div>
                      ) : (
                        store.knowledgeMountLog.map((log, idx) => (
                          <div key={idx} className="flex items-start gap-2 text-xs">
                            <span className="text-muted-foreground text-[10px] font-mono">
                              {format(new Date(log.timestamp), 'HH:mm:ss')}
                            </span>
                            <span className={cn(
                              log.type === 'mount' && 'text-green-500',
                              log.type === 'unmount' && 'text-orange-500',
                              log.type === 'query' && 'text-blue-500',
                              log.type === 'system' && 'text-muted-foreground',
                            )}>
                              {log.message}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </ScrollArea>
                </TabsContent>
              </div>
            </Tabs>

            {/* 底部状态 */}
            <div className="px-3 py-2 border-t border-border bg-secondary/10">
              <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  操作: {store.actionCount}
                </div>
                <div className="flex items-center gap-2">
                  <span>浏览: {store.browseCount}/2</span>
                  <span>问题: {store.questionCount}/5</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
