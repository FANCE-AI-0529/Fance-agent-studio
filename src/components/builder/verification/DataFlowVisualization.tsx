// =====================================================
// 数据流可视化组件 - Data Flow Visualization
// =====================================================

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  GitBranch, 
  ArrowRight, 
  Database, 
  Zap, 
  Bot, 
  Split,
  Circle,
  Play,
  CheckCircle2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { DataFlowPath, NodeSpec } from '@/types/verificationTypes';

interface DataFlowVisualizationProps {
  paths: DataFlowPath[];
  nodes: NodeSpec[];
  highlightedPath?: string[];
  onPathSelect?: (path: DataFlowPath) => void;
  className?: string;
}

// 节点类型图标映射
const NODE_TYPE_ICONS: Record<string, React.ReactNode> = {
  trigger: <Play className="h-3 w-3" />,
  knowledge: <Database className="h-3 w-3" />,
  skill: <Zap className="h-3 w-3" />,
  router: <Split className="h-3 w-3" />,
  decision: <Split className="h-3 w-3" />,
  mcp_action: <Circle className="h-3 w-3" />,
  mcp: <Circle className="h-3 w-3" />,
  agent: <Bot className="h-3 w-3" />,
  llm: <Bot className="h-3 w-3" />,
};

// 节点类型颜色映射
const NODE_TYPE_COLORS: Record<string, string> = {
  trigger: 'border-green-500/50 bg-green-500/10 text-green-400',
  knowledge: 'border-blue-500/50 bg-blue-500/10 text-blue-400',
  skill: 'border-purple-500/50 bg-purple-500/10 text-purple-400',
  router: 'border-yellow-500/50 bg-yellow-500/10 text-yellow-400',
  decision: 'border-yellow-500/50 bg-yellow-500/10 text-yellow-400',
  mcp_action: 'border-orange-500/50 bg-orange-500/10 text-orange-400',
  mcp: 'border-orange-500/50 bg-orange-500/10 text-orange-400',
  agent: 'border-cyan-500/50 bg-cyan-500/10 text-cyan-400',
  llm: 'border-cyan-500/50 bg-cyan-500/10 text-cyan-400',
};

function getNodeIcon(type?: string): React.ReactNode {
  return NODE_TYPE_ICONS[type || ''] || <Circle className="h-3 w-3" />;
}

function getNodeColor(type?: string): string {
  return NODE_TYPE_COLORS[type || ''] || 'border-muted-foreground/50 bg-muted/10';
}

export function DataFlowVisualization({
  paths,
  nodes,
  highlightedPath,
  onPathSelect,
  className,
}: DataFlowVisualizationProps) {
  const [selectedPathIndex, setSelectedPathIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  const selectedPath = paths[selectedPathIndex];

  const handlePathSelect = (index: number) => {
    setSelectedPathIndex(index);
    if (paths[index] && onPathSelect) {
      onPathSelect(paths[index]);
    }
  };

  const handleAnimate = () => {
    setIsAnimating(true);
    setTimeout(() => setIsAnimating(false), 2000);
  };

  if (paths.length === 0) {
    return (
      <Card className={cn("", className)}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <GitBranch className="h-4 w-4 text-primary" />
            数据流路径
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-8">
            暂无数据流路径
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm">
            <GitBranch className="h-4 w-4 text-primary" />
            数据流路径
          </CardTitle>
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleAnimate}
            disabled={isAnimating}
          >
            <Play className="h-3 w-3 mr-1" />
            演示
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 路径选择器 */}
        <div className="flex flex-wrap gap-2">
          {paths.map((path, idx) => (
            <Button
              key={path.id}
              variant={selectedPathIndex === idx ? "default" : "outline"}
              size="sm"
              onClick={() => handlePathSelect(idx)}
              className="text-xs"
            >
              路径 {idx + 1}
              {path.isComplete ? (
                <CheckCircle2 className="h-3 w-3 ml-1 text-green-400" />
              ) : (
                <Circle className="h-3 w-3 ml-1 text-yellow-400" />
              )}
            </Button>
          ))}
        </div>

        {/* 路径描述 */}
        {selectedPath && (
          <div className="text-xs text-muted-foreground bg-muted/30 rounded-lg p-2">
            {selectedPath.description}
          </div>
        )}

        {/* 可视化流程图 */}
        <div className="relative overflow-x-auto">
          <div className="flex items-center gap-1 min-w-max py-2">
            <AnimatePresence mode="wait">
              {selectedPath?.nodes.map((nodeId, idx) => {
                const node = nodes.find(n => n.id === nodeId);
                const isLast = idx === selectedPath.nodes.length - 1;
                const isHighlighted = highlightedPath?.includes(nodeId);
                const animationDelay = isAnimating ? idx * 0.3 : 0;

                return (
                  <React.Fragment key={nodeId}>
                    <motion.div
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ 
                        scale: 1, 
                        opacity: 1,
                        boxShadow: isAnimating && idx <= Math.floor(Date.now() / 300) % selectedPath.nodes.length
                          ? '0 0 20px rgba(var(--primary), 0.5)'
                          : 'none'
                      }}
                      transition={{ 
                        delay: animationDelay,
                        duration: 0.3,
                        type: 'spring',
                        stiffness: 200,
                      }}
                      className={cn(
                        "px-3 py-2 rounded-lg border-2 text-xs font-medium transition-all",
                        getNodeColor(node?.type),
                        isHighlighted && "ring-2 ring-primary ring-offset-2 ring-offset-background"
                      )}
                    >
                      <div className="flex items-center gap-1.5">
                        {getNodeIcon(node?.type)}
                        <span className="max-w-[100px] truncate">
                          {node?.name || nodeId}
                        </span>
                      </div>
                      <div className="text-[10px] opacity-70 mt-0.5">
                        {node?.type}
                      </div>
                    </motion.div>

                    {!isLast && (
                      <motion.div
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: animationDelay + 0.15 }}
                        className="flex items-center"
                      >
                        <motion.div
                          animate={{
                            x: isAnimating ? [0, 5, 0] : 0,
                          }}
                          transition={{
                            duration: 0.5,
                            repeat: isAnimating ? Infinity : 0,
                            delay: animationDelay,
                          }}
                        >
                          <ArrowRight className="h-4 w-4 text-primary" />
                        </motion.div>
                      </motion.div>
                    )}
                  </React.Fragment>
                );
              })}
            </AnimatePresence>
          </div>
        </div>

        {/* 数据类型流 */}
        {selectedPath && (
          <div className="flex flex-wrap items-center gap-1 text-xs">
            <span className="text-muted-foreground font-medium">数据类型:</span>
            {selectedPath.dataTypes.map((type, idx) => (
              <React.Fragment key={idx}>
                <Badge variant="secondary" className="text-[10px]">
                  {type}
                </Badge>
                {idx < selectedPath.dataTypes.length - 1 && (
                  <ArrowRight className="h-3 w-3 text-muted-foreground" />
                )}
              </React.Fragment>
            ))}
          </div>
        )}

        {/* 路径状态 */}
        {selectedPath && (
          <div className="flex items-center gap-2 text-xs">
            <Badge variant={selectedPath.isComplete ? "default" : "secondary"}>
              {selectedPath.isComplete ? '完整路径' : '部分路径'}
            </Badge>
            <span className="text-muted-foreground">
              {selectedPath.nodes.length} 个节点
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default DataFlowVisualization;
