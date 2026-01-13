// =====================================================
// 节点数据快照面板 - Node Data Snapshot Panel Component
// =====================================================

import { motion, AnimatePresence } from 'framer-motion';
import { 
  Database, 
  X, 
  ArrowDownToLine, 
  ArrowUpFromLine,
  ChevronLeft,
  ChevronRight,
  Layers
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useNodeDataSnapshot } from '@/hooks/useNodeDataSnapshot';
import { useCanvasHighlightStore } from '@/stores/canvasHighlightStore';
import { DataFieldPreview } from './DataFieldPreview';
import { DataTransformIndicator } from './DataTransformIndicator';
import { cn } from '@/lib/utils';

export function NodeDataSnapshotPanel() {
  const { 
    currentSnapshot, 
    previousSnapshot,
    currentStep,
    totalSteps,
  } = useNodeDataSnapshot();
  
  const { 
    showDataSnapshot,
    setShowDataSnapshot,
    isPaused, 
    isAnimating,
    stepForward,
    stepBackward,
  } = useCanvasHighlightStore();

  // 只在暂停或动画进行中且开启快照时显示
  const shouldShow = showDataSnapshot && isAnimating && currentSnapshot;

  if (!shouldShow) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -20, scale: 0.95 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        className="fixed top-20 right-4 z-50 w-[420px]"
      >
        <Card className="bg-background/98 backdrop-blur-md shadow-2xl border-2 border-primary/20">
          <CardHeader className="pb-2 pt-3 px-4">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Database className="h-4 w-4 text-primary" />
                <span className="truncate max-w-[180px]">
                  {currentSnapshot.nodeName}
                </span>
                <Badge variant="secondary" className="text-[10px]">
                  {currentSnapshot.nodeType}
                </Badge>
              </CardTitle>
              
              <div className="flex items-center gap-1">
                {/* 步进控制 */}
                <div className="flex items-center gap-0.5 mr-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={stepBackward}
                    disabled={currentStep === 0}
                  >
                    <ChevronLeft className="h-3 w-3" />
                  </Button>
                  <span className="text-xs text-muted-foreground min-w-[40px] text-center">
                    {currentStep + 1} / {totalSteps}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={stepForward}
                    disabled={currentStep >= totalSteps - 1}
                  >
                    <ChevronRight className="h-3 w-3" />
                  </Button>
                </div>
                
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-6 w-6"
                  onClick={() => setShowDataSnapshot(false)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-3 px-4 pb-4">
            <Tabs defaultValue="io" className="w-full">
              <TabsList className="grid w-full grid-cols-2 h-8">
                <TabsTrigger value="io" className="text-xs">
                  <Layers className="h-3 w-3 mr-1" />
                  输入/输出
                </TabsTrigger>
                <TabsTrigger value="transform" className="text-xs">
                  <Database className="h-3 w-3 mr-1" />
                  数据转换
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="io" className="mt-3">
                {/* 输入/输出对比 */}
                <div className="grid grid-cols-2 gap-3">
                  {/* 输入数据 */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
                      <ArrowDownToLine className="h-3 w-3 text-blue-500" />
                      输入数据
                      <Badge variant="outline" className="ml-auto text-[9px] px-1">
                        {currentSnapshot.inputs.length}
                      </Badge>
                    </div>
                    <ScrollArea className="h-[180px]">
                      <div className="space-y-1.5 pr-2">
                        {currentSnapshot.inputs.length > 0 ? (
                          currentSnapshot.inputs.map((field) => (
                            <DataFieldPreview 
                              key={field.path} 
                              field={field} 
                              compact 
                            />
                          ))
                        ) : (
                          <div className="text-xs text-muted-foreground/50 text-center py-4">
                            无输入数据
                          </div>
                        )}
                      </div>
                    </ScrollArea>
                  </div>
                  
                  {/* 输出数据 */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
                      <ArrowUpFromLine className="h-3 w-3 text-green-500" />
                      输出数据
                      <Badge variant="outline" className="ml-auto text-[9px] px-1">
                        {currentSnapshot.outputs.length}
                      </Badge>
                    </div>
                    <ScrollArea className="h-[180px]">
                      <div className="space-y-1.5 pr-2">
                        {currentSnapshot.outputs.length > 0 ? (
                          currentSnapshot.outputs.map((field) => (
                            <DataFieldPreview 
                              key={field.path} 
                              field={field} 
                              compact 
                            />
                          ))
                        ) : (
                          <div className="text-xs text-muted-foreground/50 text-center py-4">
                            无输出数据
                          </div>
                        )}
                      </div>
                    </ScrollArea>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="transform" className="mt-3">
                {/* 数据转换说明 */}
                {currentSnapshot.transformation && (
                  <DataTransformIndicator 
                    transformation={currentSnapshot.transformation}
                    inputCount={currentSnapshot.inputs.length}
                    outputCount={currentSnapshot.outputs.length}
                  />
                )}
                
                {/* 上游节点数据 */}
                {previousSnapshot && (
                  <div className="mt-3 space-y-2">
                    <div className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
                      <ChevronLeft className="h-3 w-3" />
                      来自上游: {previousSnapshot.nodeName}
                    </div>
                    <ScrollArea className="h-[120px]">
                      <div className="space-y-1.5 pr-2">
                        {previousSnapshot.outputs.slice(0, 3).map((field) => (
                          <DataFieldPreview 
                            key={field.path} 
                            field={field} 
                            compact 
                          />
                        ))}
                        {previousSnapshot.outputs.length > 3 && (
                          <div className="text-[10px] text-muted-foreground/50 text-center">
                            还有 {previousSnapshot.outputs.length - 3} 个字段...
                          </div>
                        )}
                      </div>
                    </ScrollArea>
                  </div>
                )}
              </TabsContent>
            </Tabs>
            
            {/* 暂停提示 */}
            {!isPaused && (
              <div className="text-[10px] text-muted-foreground/70 text-center pt-1">
                💡 暂停动画可查看完整数据详情
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
}
