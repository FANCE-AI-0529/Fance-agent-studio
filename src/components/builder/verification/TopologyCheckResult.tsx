// =====================================================
// 拓扑检查结果组件 - Topology Check Result
// =====================================================

import React from 'react';
import { motion } from 'framer-motion';
import { 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  Network,
  Box,
  GitBranch,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import type { TopologyCheckResult as TopologyCheckResultType } from '@/types/verificationTypes';

interface TopologyCheckResultProps {
  result: TopologyCheckResultType;
  className?: string;
}

export function TopologyCheckResult({ result, className }: TopologyCheckResultProps) {
  const successRate = result.foundNodes.length / 
    (result.foundNodes.length + result.missingNodes.length) * 100;

  return (
    <Card className={cn("", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Network className="h-4 w-4 text-primary" />
            拓扑检查
          </CardTitle>
          <Badge variant={result.passed ? "default" : "destructive"}>
            {result.passed ? '通过' : '未通过'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 进度条 */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">节点完整性</span>
            <span className={cn(
              "font-medium",
              successRate >= 80 ? "text-green-400" :
              successRate >= 50 ? "text-yellow-400" : "text-red-400"
            )}>
              {Math.round(successRate)}%
            </span>
          </div>
          <Progress 
            value={successRate} 
            className="h-2"
          />
        </div>

        {/* 节点统计 */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-muted/30 rounded-lg p-2 text-center">
            <div className="text-lg font-bold text-primary">
              {result.nodeCount}
            </div>
            <div className="text-[10px] text-muted-foreground">总节点</div>
          </div>
          <div className="bg-green-500/10 rounded-lg p-2 text-center">
            <div className="text-lg font-bold text-green-400">
              {result.foundNodes.length}
            </div>
            <div className="text-[10px] text-muted-foreground">已找到</div>
          </div>
          <div className="bg-red-500/10 rounded-lg p-2 text-center">
            <div className="text-lg font-bold text-red-400">
              {result.missingNodes.length}
            </div>
            <div className="text-[10px] text-muted-foreground">缺失</div>
          </div>
        </div>

        {/* 找到的节点 */}
        {result.foundNodes.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3 text-green-400" />
              已匹配节点
            </div>
            <div className="flex flex-wrap gap-1.5">
              {result.foundNodes.map((match, idx) => (
                <motion.div
                  key={idx}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: idx * 0.05 }}
                >
                  <Badge 
                    variant="outline" 
                    className="text-[10px] border-green-500/50 text-green-400"
                  >
                    <Box className="h-2.5 w-2.5 mr-1" />
                    {match.actual.name}
                    <span className="ml-1 opacity-50">
                      ({match.match})
                    </span>
                  </Badge>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* 缺失的节点 */}
        {result.missingNodes.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <XCircle className="h-3 w-3 text-red-400" />
              缺失节点
            </div>
            <div className="flex flex-wrap gap-1.5">
              {result.missingNodes.map((node, idx) => (
                <motion.div
                  key={idx}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: idx * 0.05 }}
                >
                  <Badge 
                    variant="outline" 
                    className="text-[10px] border-red-500/50 text-red-400"
                  >
                    <XCircle className="h-2.5 w-2.5 mr-1" />
                    {node}
                  </Badge>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* 分支检查 */}
        <div className="flex items-center gap-2 text-xs">
          <GitBranch className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-muted-foreground">分支结构:</span>
          {result.branchesCorrect ? (
            <Badge variant="outline" className="text-[10px] border-green-500/50 text-green-400">
              <CheckCircle2 className="h-2.5 w-2.5 mr-1" />
              正确
            </Badge>
          ) : (
            <Badge variant="outline" className="text-[10px] border-yellow-500/50 text-yellow-400">
              <AlertTriangle className="h-2.5 w-2.5 mr-1" />
              需要检查
            </Badge>
          )}
        </div>

        {/* 详细信息 */}
        {result.details.length > 0 && (
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {result.details.map((detail, idx) => (
              <div 
                key={idx}
                className={cn(
                  "text-[11px] py-1 px-2 rounded",
                  detail.startsWith('✅') && "bg-green-500/10 text-green-400",
                  detail.startsWith('❌') && "bg-red-500/10 text-red-400",
                  detail.startsWith('⚠️') && "bg-yellow-500/10 text-yellow-400"
                )}
              >
                {detail}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default TopologyCheckResult;
