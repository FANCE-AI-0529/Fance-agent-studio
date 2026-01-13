// =====================================================
// 草稿边确认组件 - Draft Edge Confirmation
// 用于确认/拒绝不确定的自动布线连接
// =====================================================

import React, { memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Check,
  X,
  Edit2,
  AlertTriangle,
  Zap,
  ArrowRight,
  Info,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { EdgeConfirmationData } from '@/stores/edgeConfirmationStore';

// ========== 类型定义 ==========

interface DraftEdgeConfirmationProps {
  edge: EdgeConfirmationData;
  onConfirm: (edgeId: string) => void;
  onReject: (edgeId: string) => void;
  onModify: (edgeId: string) => void;
  onMappingToggle: (edgeId: string, mappingId: string, enabled: boolean) => void;
  compact?: boolean;
}

// ========== 置信度颜色 ==========

function getConfidenceColor(confidence: number): string {
  if (confidence >= 0.8) return 'text-green-500';
  if (confidence >= 0.6) return 'text-yellow-500';
  return 'text-red-500';
}

function getConfidenceBgColor(confidence: number): string {
  if (confidence >= 0.8) return 'bg-green-500/10';
  if (confidence >= 0.6) return 'bg-yellow-500/10';
  return 'bg-red-500/10';
}

function getConfidenceLabel(confidence: number): string {
  if (confidence >= 0.8) return '高置信度';
  if (confidence >= 0.6) return '中置信度';
  return '低置信度';
}

// ========== 主组件 ==========

const DraftEdgeConfirmation = memo(({
  edge,
  onConfirm,
  onReject,
  onModify,
  onMappingToggle,
  compact = false,
}: DraftEdgeConfirmationProps) => {
  const confidencePercent = Math.round(edge.overallConfidence * 100);
  const enabledMappings = edge.mappings.filter((m) => m.enabled).length;
  
  if (compact) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-popover border border-border rounded-lg shadow-xl p-2 min-w-[180px]"
      >
        <div className="flex items-center gap-2 mb-2">
          <AlertTriangle className="h-3.5 w-3.5 text-yellow-500" />
          <span className="text-xs font-medium">待确认连接</span>
          <Badge
            variant="outline"
            className={cn('text-[10px] ml-auto', getConfidenceColor(edge.overallConfidence))}
          >
            {confidencePercent}%
          </Badge>
        </div>
        
        <div className="flex gap-1">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 flex-1 text-green-500 hover:text-green-600 hover:bg-green-500/10"
                  onClick={() => onConfirm(edge.edgeId)}
                >
                  <Check className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">确认连接</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 flex-1 text-red-500 hover:text-red-600 hover:bg-red-500/10"
                  onClick={() => onReject(edge.edgeId)}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">拒绝连接</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 flex-1"
                  onClick={() => onModify(edge.edgeId)}
                >
                  <Edit2 className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">编辑映射</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </motion.div>
    );
  }
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={cn(
        'bg-card border rounded-lg shadow-lg overflow-hidden',
        edge.status === 'draft' ? 'border-yellow-500/50' : 'border-border'
      )}
    >
      {/* 头部 */}
      <div className={cn(
        'px-4 py-3 border-b',
        getConfidenceBgColor(edge.overallConfidence)
      )}>
        <div className="flex items-center gap-2">
          <AlertTriangle className={cn('h-4 w-4', getConfidenceColor(edge.overallConfidence))} />
          <span className="text-sm font-medium">待确认连接</span>
          <Badge
            variant="outline"
            className={cn('ml-auto', getConfidenceColor(edge.overallConfidence))}
          >
            {getConfidenceLabel(edge.overallConfidence)} ({confidencePercent}%)
          </Badge>
        </div>
        
        {/* 连接路径 */}
        <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
          <span className="font-mono bg-muted px-1.5 py-0.5 rounded">
            {edge.sourceNodeName}
          </span>
          <ArrowRight className="h-3 w-3" />
          <span className="font-mono bg-muted px-1.5 py-0.5 rounded">
            {edge.targetNodeName}
          </span>
        </div>
      </div>
      
      {/* 映射列表 */}
      <ScrollArea className="max-h-[200px]">
        <div className="p-3 space-y-2">
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Zap className="h-3 w-3" />
            变量映射 ({enabledMappings}/{edge.mappings.length})
          </p>
          
          {edge.mappings.map((mapping) => (
            <div
              key={mapping.id}
              className={cn(
                'flex items-start gap-2 p-2 rounded border text-xs',
                mapping.enabled
                  ? 'bg-muted/30 border-border'
                  : 'bg-muted/10 border-dashed border-muted-foreground/30 opacity-60'
              )}
            >
              <Switch
                checked={mapping.enabled}
                onCheckedChange={(checked) => onMappingToggle(edge.edgeId, mapping.id, checked)}
                className="mt-0.5"
              />
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-[10px] bg-primary/10 text-primary px-1 rounded truncate max-w-[120px]">
                    {mapping.sourceField.replace(/\{\{|\}\}/g, '')}
                  </span>
                  <ArrowRight className="h-2.5 w-2.5 flex-shrink-0" />
                  <span className="font-mono text-[10px] bg-secondary/50 px-1 rounded truncate max-w-[120px]">
                    {mapping.targetField}
                  </span>
                </div>
                
                <div className="flex items-center gap-2 mt-1">
                  <Badge
                    variant="outline"
                    className={cn('text-[9px] py-0', getConfidenceColor(mapping.confidence))}
                  >
                    {Math.round(mapping.confidence * 100)}%
                  </Badge>
                  <span className="text-[10px] text-muted-foreground">
                    {mapping.matchReason}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
      
      {/* 操作按钮 */}
      <div className="flex items-center gap-2 p-3 border-t bg-muted/20">
        <Button
          size="sm"
          variant="outline"
          className="flex-1 gap-1.5 text-green-600 border-green-500/30 hover:bg-green-500/10"
          onClick={() => onConfirm(edge.edgeId)}
        >
          <Check className="h-3.5 w-3.5" />
          确认
        </Button>
        
        <Button
          size="sm"
          variant="outline"
          className="flex-1 gap-1.5 text-red-600 border-red-500/30 hover:bg-red-500/10"
          onClick={() => onReject(edge.edgeId)}
        >
          <X className="h-3.5 w-3.5" />
          拒绝
        </Button>
        
        <Button
          size="sm"
          variant="ghost"
          className="gap-1.5"
          onClick={() => onModify(edge.edgeId)}
        >
          <Edit2 className="h-3.5 w-3.5" />
          编辑
        </Button>
      </div>
    </motion.div>
  );
});

DraftEdgeConfirmation.displayName = 'DraftEdgeConfirmation';

export default DraftEdgeConfirmation;

// ========== 批量确认面板 ==========

interface DraftEdgeListProps {
  edges: EdgeConfirmationData[];
  onConfirm: (edgeId: string) => void;
  onReject: (edgeId: string) => void;
  onModify: (edgeId: string) => void;
  onMappingToggle: (edgeId: string, mappingId: string, enabled: boolean) => void;
  onConfirmAll: () => void;
  onRejectAll: () => void;
  onClose: () => void;
}

export function DraftEdgeList({
  edges,
  onConfirm,
  onReject,
  onModify,
  onMappingToggle,
  onConfirmAll,
  onRejectAll,
  onClose,
}: DraftEdgeListProps) {
  const pendingEdges = edges.filter((e) => e.status === 'draft' || e.status === 'pending');
  
  if (pendingEdges.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Check className="h-12 w-12 mx-auto mb-2 text-green-500" />
        <p className="text-sm">所有连接已确认</p>
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      {/* 头部统计 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-yellow-500" />
          <span className="text-sm font-medium">
            {pendingEdges.length} 个连接待确认
          </span>
        </div>
        
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5 text-green-600"
            onClick={onConfirmAll}
          >
            <Check className="h-3.5 w-3.5" />
            全部确认
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5 text-red-600"
            onClick={onRejectAll}
          >
            <X className="h-3.5 w-3.5" />
            全部拒绝
          </Button>
        </div>
      </div>
      
      {/* 边列表 */}
      <ScrollArea className="h-[400px] pr-4">
        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {pendingEdges.map((edge) => (
              <DraftEdgeConfirmation
                key={edge.edgeId}
                edge={edge}
                onConfirm={onConfirm}
                onReject={onReject}
                onModify={onModify}
                onMappingToggle={onMappingToggle}
              />
            ))}
          </AnimatePresence>
        </div>
      </ScrollArea>
      
      {/* 底部提示 */}
      <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/30 text-xs text-muted-foreground">
        <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
        <p>
          低置信度连接可能存在数据类型不匹配的风险。
          建议检查映射关系后再确认，或手动编辑映射配置。
        </p>
      </div>
    </div>
  );
}
