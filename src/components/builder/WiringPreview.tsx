// =====================================================
// 连线预览组件 - Wiring Preview
// 可视化显示智能连线结果
// =====================================================

import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRight,
  Check,
  AlertTriangle,
  Zap,
  RefreshCw,
  Trash2,
  Edit2,
  ChevronDown,
  ChevronUp,
  Shield,
  FileText,
} from 'lucide-react';
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card.tsx';
import { Badge } from '../ui/badge.tsx';
import { Button } from '../ui/button.tsx';
import { Progress } from '../ui/progress.tsx';
import { ScrollArea } from '../ui/scroll-area.tsx';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '../ui/collapsible.tsx';
import { cn } from '../../lib/utils.ts';
import {
  WiringConnection,
  AdapterNodeSpec,
  ManusLoggerNodeSpec,
  WiringStatistics,
} from '../../types/wiringTypes.ts';

// ========== 类型定义 ==========

interface WiringPreviewProps {
  connections: WiringConnection[];
  adapterNodes?: AdapterNodeSpec[];
  manusNodes?: ManusLoggerNodeSpec[];
  statistics?: WiringStatistics | null;
  warnings?: string[];
  onConfirmConnection?: (connectionId: string) => void;
  onRemoveConnection?: (connectionId: string) => void;
  onModifyMapping?: (connectionId: string, newMapping: string) => void;
  isLoading?: boolean;
  className?: string;
}

// ========== 状态颜色映射 ==========

const STATUS_STYLES: Record<
  WiringConnection['status'],
  { border: string; badge: string; icon: typeof Check }
> = {
  confirmed: {
    border: 'border-green-500/50 bg-green-500/5',
    badge: 'bg-green-500/20 text-green-400 border-green-500/30',
    icon: Check,
  },
  draft: {
    border: 'border-yellow-500/50 bg-yellow-500/5',
    badge: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    icon: AlertTriangle,
  },
  needs_adapter: {
    border: 'border-blue-500/50 bg-blue-500/5',
    badge: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    icon: Zap,
  },
};

// ========== 单条连线卡片 ==========

function ConnectionCard({
  connection,
  onConfirm,
  onRemove,
  onModify,
}: {
  connection: WiringConnection;
  onConfirm?: () => void;
  onRemove?: () => void;
  onModify?: (newMapping: string) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const styles = STATUS_STYLES[connection.status];
  const StatusIcon = styles.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={cn(
        'rounded-lg border p-3 transition-all duration-200',
        styles.border
      )}
    >
      <div className="flex items-center gap-3">
        {/* 置信度徽章 */}
        <Badge
          variant="outline"
          className={cn('text-xs font-mono min-w-[50px] justify-center', styles.badge)}
        >
          {Math.round(connection.confidence * 100)}%
        </Badge>

        {/* 连线信息 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 text-sm">
            <span className="font-mono text-muted-foreground truncate">
              {connection.source.portName}
            </span>
            <span className="text-xs text-muted-foreground/60">
              ({connection.source.dataType})
            </span>
            <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="font-mono truncate">{connection.target.portName}</span>
            <span className="text-xs text-muted-foreground/60">
              ({connection.target.dataType})
            </span>
          </div>

          <p className="text-xs text-muted-foreground mt-1">
            {connection.matchReason}
          </p>
        </div>

        {/* 适配器标记 */}
        {connection.adapterNode && (
          <Badge variant="secondary" className="gap-1 text-xs">
            <Zap className="h-3 w-3" />
            {connection.adapterNode.type === 'llm_transform' ? 'LLM' : '转换'}
          </Badge>
        )}

        {/* 状态图标 */}
        <StatusIcon className="h-4 w-4 shrink-0" />

        {/* 操作按钮 */}
        <div className="flex items-center gap-1">
          {connection.status !== 'confirmed' && onConfirm && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={onConfirm}
            >
              <Check className="h-3.5 w-3.5" />
            </Button>
          )}
          {onRemove && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-destructive hover:text-destructive"
              onClick={onRemove}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? (
              <ChevronUp className="h-3.5 w-3.5" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>
      </div>

      {/* 展开详情 */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-3 pt-3 border-t border-border/50 space-y-2">
              <div className="flex items-center gap-2 text-xs">
                <span className="text-muted-foreground">映射表达式:</span>
                <code className="bg-muted/50 px-2 py-0.5 rounded font-mono text-xs">
                  {connection.mapping}
                </code>
                {onModify && (
                  <Button variant="ghost" size="icon" className="h-5 w-5">
                    <Edit2 className="h-3 w-3" />
                  </Button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-muted-foreground">源节点: </span>
                  <span className="font-mono">{connection.source.nodeId}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">目标节点: </span>
                  <span className="font-mono">{connection.target.nodeId}</span>
                </div>
              </div>

              {connection.adapterNode && (
                <div className="p-2 bg-muted/30 rounded text-xs">
                  <div className="flex items-center gap-1 text-blue-400 mb-1">
                    <Zap className="h-3 w-3" />
                    <span>类型转换节点</span>
                  </div>
                  <p className="text-muted-foreground">
                    {connection.adapterNode.name}: {connection.adapterNode.inputType}{' '}
                    → {connection.adapterNode.outputType}
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ========== 统计信息卡片 ==========

function StatisticsCard({ statistics }: { statistics: WiringStatistics }) {
  const coverage =
    statistics.totalConnections > 0
      ? (statistics.confirmedConnections / statistics.totalConnections) * 100
      : 0;

  return (
    <Card className="bg-card/50 border-border/50">
      <CardContent className="pt-4 pb-3">
        <div className="grid grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-foreground">
              {statistics.totalConnections}
            </div>
            <div className="text-xs text-muted-foreground">总连接</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-400">
              {statistics.confirmedConnections}
            </div>
            <div className="text-xs text-muted-foreground">已确认</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-400">
              {statistics.draftConnections}
            </div>
            <div className="text-xs text-muted-foreground">待确认</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-400">
              {statistics.adapterCount}
            </div>
            <div className="text-xs text-muted-foreground">适配器</div>
          </div>
        </div>

        <div className="mt-4">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-muted-foreground">连接覆盖率</span>
            <span className="font-mono">{Math.round(coverage)}%</span>
          </div>
          <Progress value={coverage} className="h-1.5" />
        </div>

        {statistics.manusNodeCount > 0 && (
          <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
            <Shield className="h-3.5 w-3.5 text-purple-400" />
            <span>
              Manus 协议: {statistics.manusNodeCount} 个操作已记录到 progress.md
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ========== Manus 节点列表 ==========

function ManusNodesList({ nodes }: { nodes: ManusLoggerNodeSpec[] }) {
  const [isOpen, setIsOpen] = useState(false);

  if (nodes.length === 0) return null;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <Button
          variant="ghost"
          className="w-full justify-between text-sm h-9 px-3"
        >
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-purple-400" />
            <span>Manus 进度记录节点 ({nodes.length})</span>
          </div>
          {isOpen ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="space-y-2 pt-2">
          {nodes.map(node => (
            <div
              key={node.id}
              className="p-2 rounded border border-purple-500/30 bg-purple-500/5 text-xs"
            >
              <div className="font-medium text-purple-400">{node.name}</div>
              <code className="text-muted-foreground mt-1 block">
                {node.config.template}
              </code>
            </div>
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

// ========== 警告列表 ==========

function WarningsList({ warnings }: { warnings: string[] }) {
  const [isOpen, setIsOpen] = useState(warnings.length > 0 && warnings.length <= 3);

  if (warnings.length === 0) return null;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <Button
          variant="ghost"
          className="w-full justify-between text-sm h-9 px-3"
        >
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-yellow-400" />
            <span>提示信息 ({warnings.length})</span>
          </div>
          {isOpen ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="space-y-1 pt-2">
          {warnings.map((warning, index) => (
            <div
              key={index}
              className="text-xs text-muted-foreground px-2 py-1 rounded bg-muted/30"
            >
              {warning}
            </div>
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

// ========== 主组件 ==========

export function WiringPreview({
  connections,
  adapterNodes = [],
  manusNodes = [],
  statistics,
  warnings = [],
  onConfirmConnection,
  onRemoveConnection,
  onModifyMapping,
  isLoading = false,
  className,
}: WiringPreviewProps) {
  // 按状态分组
  const confirmedConnections = connections.filter(c => c.status === 'confirmed');
  const draftConnections = connections.filter(c => c.status === 'draft');
  const adapterConnections = connections.filter(c => c.status === 'needs_adapter');

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <RefreshCw
            className={cn('h-5 w-5', isLoading && 'animate-spin')}
          />
          智能连线预览
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* 统计信息 */}
        {statistics && <StatisticsCard statistics={statistics} />}

        {/* 连接列表 */}
        <ScrollArea className="h-[400px] pr-3">
          <div className="space-y-4">
            {/* 已确认连接 */}
            {confirmedConnections.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-400" />
                  已确认 ({confirmedConnections.length})
                </h4>
                <div className="space-y-2">
                  <AnimatePresence mode="popLayout">
                    {confirmedConnections.map(conn => (
                      <ConnectionCard
                        key={conn.id}
                        connection={conn}
                        onRemove={
                          onRemoveConnection
                            ? () => onRemoveConnection(conn.id)
                            : undefined
                        }
                        onModify={
                          onModifyMapping
                            ? newMapping => onModifyMapping(conn.id, newMapping)
                            : undefined
                        }
                      />
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            )}

            {/* 需要适配器 */}
            {adapterConnections.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                  <Zap className="h-4 w-4 text-blue-400" />
                  需要类型转换 ({adapterConnections.length})
                </h4>
                <div className="space-y-2">
                  <AnimatePresence mode="popLayout">
                    {adapterConnections.map(conn => (
                      <ConnectionCard
                        key={conn.id}
                        connection={conn}
                        onConfirm={
                          onConfirmConnection
                            ? () => onConfirmConnection(conn.id)
                            : undefined
                        }
                        onRemove={
                          onRemoveConnection
                            ? () => onRemoveConnection(conn.id)
                            : undefined
                        }
                        onModify={
                          onModifyMapping
                            ? newMapping => onModifyMapping(conn.id, newMapping)
                            : undefined
                        }
                      />
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            )}

            {/* 待确认连接 */}
            {draftConnections.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-400" />
                  待确认 ({draftConnections.length})
                </h4>
                <div className="space-y-2">
                  <AnimatePresence mode="popLayout">
                    {draftConnections.map(conn => (
                      <ConnectionCard
                        key={conn.id}
                        connection={conn}
                        onConfirm={
                          onConfirmConnection
                            ? () => onConfirmConnection(conn.id)
                            : undefined
                        }
                        onRemove={
                          onRemoveConnection
                            ? () => onRemoveConnection(conn.id)
                            : undefined
                        }
                        onModify={
                          onModifyMapping
                            ? newMapping => onModifyMapping(conn.id, newMapping)
                            : undefined
                        }
                      />
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            )}

            {/* 空状态 */}
            {connections.length === 0 && !isLoading && (
              <div className="text-center py-8 text-muted-foreground">
                <RefreshCw className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">暂无连线数据</p>
                <p className="text-xs mt-1">添加节点并建立连接后将自动分析</p>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Manus 节点 */}
        <ManusNodesList nodes={manusNodes} />

        {/* 警告信息 */}
        <WarningsList warnings={warnings} />
      </CardContent>
    </Card>
  );
}

export default WiringPreview;
