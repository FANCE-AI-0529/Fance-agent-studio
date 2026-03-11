// 记忆编辑器 (Memory Editor)

import { useState, useCallback } from 'react';
import { Brain, Save, History, Tag, FileText, Eye, Edit3 } from 'lucide-react';
import { cn } from '../../lib/utils.ts';
import { Button } from '../ui/button.tsx';
import { Badge } from '../ui/badge.tsx';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs.tsx';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card.tsx';
import { Textarea } from '../ui/textarea.tsx';
import { ScrollArea } from '../ui/scroll-area.tsx';
import { useToast } from '../../hooks/use-toast.ts';
import { memorySyncService, type MemorySection, type MemoryFragment } from '../../services/memorySync.ts';

interface MemoryEditorProps {
  agentId: string;
  agentName: string;
  initialContent?: string;
  onSave?: (content: string) => void;
  className?: string;
}

const sectionLabels: Record<MemorySection, { label: string; icon: string }> = {
  identity: { label: '身份', icon: '🆔' },
  task_plan: { label: '任务计划', icon: '📋' },
  progress: { label: '进度', icon: '📊' },
  preferences: { label: '偏好', icon: '⚙️' },
  knowledge: { label: '知识', icon: '📚' },
  relationships: { label: '关系', icon: '🤝' },
  pending_tasks: { label: '待办', icon: '⏳' },
};

export function MemoryEditor({ agentId, agentName, initialContent, onSave, className }: MemoryEditorProps) {
  const { toast } = useToast();
  const [rawContent, setRawContent] = useState(initialContent || generateDefaultTemplate(agentName));
  const [viewMode, setViewMode] = useState<'raw' | 'structured'>('structured');
  const [isSaving, setIsSaving] = useState(false);

  const sections = memorySyncService.parseClaudeMd(rawContent);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      onSave?.(rawContent);
      toast({
        title: '记忆已保存',
        description: `${agentName} 的 CLAUDE.md 已更新`,
      });
    } catch {
      toast({
        title: '保存失败',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  }, [rawContent, agentName, onSave, toast]);

  return (
    <Card className={cn('border-border/50', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Brain className="h-4 w-4 text-cognitive" />
            {agentName} - 长期记忆
            <Badge variant="outline" className="font-mono text-[10px]">CLAUDE.md</Badge>
          </CardTitle>
          <div className="flex items-center gap-1.5">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setViewMode(viewMode === 'raw' ? 'structured' : 'raw')}
              title={viewMode === 'raw' ? '结构化视图' : 'Markdown 视图'}
            >
              {viewMode === 'raw' ? <Eye className="h-3.5 w-3.5" /> : <Edit3 className="h-3.5 w-3.5" />}
            </Button>
            <Button
              variant="default"
              size="sm"
              className="h-7 text-xs"
              onClick={handleSave}
              disabled={isSaving}
            >
              <Save className="h-3.5 w-3.5 mr-1" />
              {isSaving ? '保存中...' : '保存'}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {viewMode === 'raw' ? (
          <Textarea
            value={rawContent}
            onChange={(e) => setRawContent(e.target.value)}
            className="min-h-[300px] font-mono text-xs resize-y"
            placeholder="# Agent Name - CLAUDE.md..."
          />
        ) : (
          <ScrollArea className="h-[300px]">
            <div className="space-y-3">
              {Object.entries(sectionLabels).map(([key, config]) => {
                const sectionFragments = sections.get(key as MemorySection) || [];
                if (sectionFragments.length === 0) return null;

                return (
                  <div key={key} className="space-y-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm">{config.icon}</span>
                      <span className="text-xs font-medium text-foreground">{config.label}</span>
                      <Badge variant="secondary" className="text-[10px] h-4">
                        {sectionFragments.length}
                      </Badge>
                    </div>
                    <div className="pl-5 space-y-0.5">
                      {sectionFragments.map((fragment, idx) => (
                        <MemoryFragmentRow key={idx} fragment={fragment} />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}

function MemoryFragmentRow({ fragment }: { fragment: MemoryFragment }) {
  return (
    <div className="flex items-start gap-1.5 text-xs py-0.5">
      {fragment.readOnly && (
        <Badge variant="outline" className="text-[9px] h-3.5 px-1 shrink-0">只读</Badge>
      )}
      {fragment.key.startsWith('item_') ? (
        <span className="text-foreground/80">• {fragment.value}</span>
      ) : (
        <>
          <span className="font-medium text-foreground shrink-0">{fragment.key}:</span>
          <span className="text-muted-foreground">{fragment.value}</span>
        </>
      )}
    </div>
  );
}

function generateDefaultTemplate(agentName: string): string {
  return `# ${agentName} - CLAUDE.md

## 身份 (Identity)

- **名称**: ${agentName}
- **创建时间**: ${new Date().toISOString().split('T')[0]}

## 任务计划 (Task Plan)

## 进度 (Progress)

## 偏好 (Preferences)

## 知识 (Knowledge)

## 未完成任务 (Pending Tasks)
`;
}
