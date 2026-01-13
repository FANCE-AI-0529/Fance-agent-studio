import { useState } from 'react';
import { Brain, Search, Moon, Loader2, Plus, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTieredMemory } from '@/hooks/useTieredMemory';
import { useDreaming } from '@/hooks/useDreaming';
import { cn } from '@/lib/utils';

interface TieredMemoryPanelProps {
  agentId: string;
  className?: string;
}

export function TieredMemoryPanel({ agentId, className }: TieredMemoryPanelProps) {
  const {
    coreMemories,
    coreTokenCount,
    recallMemoriesData,
    recallTokenCount,
    archivesSummary,
    config,
  } = useTieredMemory(agentId);
  
  const { dream, isProcessing, dreamingStatus, lastDreamingAt } = useDreaming(agentId);
  const [activeTab, setActiveTab] = useState('core');

  const categoryLabels = {
    persona: '人设',
    rules: '规则',
    core_facts: '核心事实',
  };

  return (
    <div className={cn("space-y-4", className)}>
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="core" className="flex items-center gap-1">
            <Brain className="h-3 w-3" />
            核心
          </TabsTrigger>
          <TabsTrigger value="recall" className="flex items-center gap-1">
            <Search className="h-3 w-3" />
            召回
          </TabsTrigger>
          <TabsTrigger value="dreaming" className="flex items-center gap-1">
            <Moon className="h-3 w-3" />
            整理
          </TabsTrigger>
        </TabsList>

        {/* 核心记忆 */}
        <TabsContent value="core">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">核心记忆</CardTitle>
                <Badge variant="outline">
                  {coreTokenCount}/{config.maxCoreTokens} tokens
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-48">
                {coreMemories.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    暂无核心记忆
                  </p>
                ) : (
                  <div className="space-y-2">
                    {(['persona', 'rules', 'core_facts'] as const).map(category => {
                      const items = coreMemories.filter(m => m.category === category);
                      if (items.length === 0) return null;
                      return (
                        <div key={category}>
                          <h4 className="text-xs font-medium text-muted-foreground mb-1">
                            {categoryLabels[category]}
                          </h4>
                          {items.map(memory => (
                            <div 
                              key={memory.id}
                              className="text-sm p-2 bg-muted/50 rounded mb-1"
                            >
                              <span className="font-medium">{memory.key}:</span> {memory.value}
                            </div>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 召回记忆 */}
        <TabsContent value="recall">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">召回记忆</CardTitle>
                <Badge variant="outline">
                  {recallTokenCount}/{config.maxRecallTokens} tokens
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-48">
                {recallMemoriesData.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    对话时自动召回相关记忆
                  </p>
                ) : (
                  <div className="space-y-2">
                    {recallMemoriesData.map(memory => (
                      <div 
                        key={memory.id}
                        className="text-sm p-2 bg-muted/50 rounded"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="secondary" className="text-xs">
                            {memory.source === 'rag' ? '知识库' : memory.source === 'graph' ? '关系' : '记忆'}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {(memory.relevanceScore * 100).toFixed(0)}% 相关
                          </span>
                        </div>
                        <p className="text-xs line-clamp-2">{memory.content}</p>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Dreaming */}
        <TabsContent value="dreaming">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                记忆整理
                {dreamingStatus === 'running' && (
                  <Loader2 className="h-3 w-3 animate-spin" />
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2 bg-muted/50 rounded">
                  <p className="text-muted-foreground">归档数</p>
                  <p className="font-medium">{archivesSummary.totalArchives}</p>
                </div>
                <div className="p-2 bg-muted/50 rounded">
                  <p className="text-muted-foreground">上次整理</p>
                  <p className="font-medium">
                    {lastDreamingAt 
                      ? new Date(lastDreamingAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
                      : '从未'
                    }
                  </p>
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="w-full"
                onClick={() => dream(true)}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                    整理中...
                  </>
                ) : (
                  <>
                    <Moon className="h-3 w-3 mr-1" />
                    手动整理
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
