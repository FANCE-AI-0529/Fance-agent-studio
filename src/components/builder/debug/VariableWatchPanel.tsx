import React, { useState, useCallback, useMemo } from "react";
import { 
  Eye, 
  EyeOff, 
  ChevronDown, 
  ChevronRight,
  RefreshCw,
  Pin,
  PinOff,
  Search,
  Trash2,
  Copy,
  Check,
  Zap,
  Clock,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "../../ui/button.tsx";
import { Input } from "../../ui/input.tsx";
import { Badge } from "../../ui/badge.tsx";
import { ScrollArea } from "../../ui/scroll-area.tsx";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "../../ui/collapsible.tsx";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "../../ui/tooltip.tsx";
import { cn } from "../../../lib/utils.ts";

/**
 * Variable Watch Panel
 * 变量监视面板 - 画布调试模式实时变量追踪
 */

// ========== Types ==========

export interface WatchedVariable {
  id: string;
  name: string;
  path: string;
  value: unknown;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array' | 'null' | 'undefined';
  nodeId?: string;
  nodeName?: string;
  isPinned?: boolean;
  lastUpdated?: number;
  previousValue?: unknown;
  hasChanged?: boolean;
}

interface VariableWatchPanelProps {
  variables: WatchedVariable[];
  onPinVariable?: (id: string) => void;
  onUnpinVariable?: (id: string) => void;
  onRemoveWatch?: (id: string) => void;
  onRefresh?: () => void;
  isExecuting?: boolean;
  className?: string;
}

// ========== Helpers ==========

const typeColors: Record<WatchedVariable['type'], string> = {
  string: 'text-green-400',
  number: 'text-blue-400',
  boolean: 'text-amber-400',
  object: 'text-purple-400',
  array: 'text-pink-400',
  null: 'text-muted-foreground',
  undefined: 'text-muted-foreground',
};

const typeBadgeColors: Record<WatchedVariable['type'], string> = {
  string: 'bg-green-500/10 text-green-400 border-green-500/20',
  number: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  boolean: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  object: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  array: 'bg-pink-500/10 text-pink-400 border-pink-500/20',
  null: 'bg-muted/50 text-muted-foreground border-border',
  undefined: 'bg-muted/50 text-muted-foreground border-border',
};

function formatValue(value: unknown, type: WatchedVariable['type']): string {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  
  switch (type) {
    case 'string':
      return `"${String(value).slice(0, 50)}${String(value).length > 50 ? '...' : ''}"`;
    case 'object':
    case 'array':
      try {
        const str = JSON.stringify(value);
        return str.slice(0, 100) + (str.length > 100 ? '...' : '');
      } catch {
        return '[Complex Object]';
      }
    case 'boolean':
      return String(value);
    case 'number':
      return String(value);
    default:
      return String(value);
  }
}

function getValueType(value: unknown): WatchedVariable['type'] {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (Array.isArray(value)) return 'array';
  return typeof value as WatchedVariable['type'];
}

// ========== Components ==========

export function VariableWatchPanel({
  variables,
  onPinVariable,
  onUnpinVariable,
  onRemoveWatch,
  onRefresh,
  isExecuting = false,
  className,
}: VariableWatchPanelProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showPinnedOnly, setShowPinnedOnly] = useState(false);
  const [expandedVars, setExpandedVars] = useState<Set<string>>(new Set());

  // Filter variables
  const filteredVariables = useMemo(() => {
    let result = variables;
    
    if (showPinnedOnly) {
      result = result.filter(v => v.isPinned);
    }
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(v => 
        v.name.toLowerCase().includes(query) ||
        v.path.toLowerCase().includes(query) ||
        v.nodeName?.toLowerCase().includes(query)
      );
    }
    
    // Sort: pinned first, then by name
    return result.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return a.name.localeCompare(b.name);
    });
  }, [variables, searchQuery, showPinnedOnly]);

  const toggleExpand = useCallback((id: string) => {
    setExpandedVars(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const pinnedCount = variables.filter(v => v.isPinned).length;
  const changedCount = variables.filter(v => v.hasChanged).length;

  return (
    <div className={cn(
      "flex flex-col h-full bg-card/50 border-l border-border",
      className
    )}>
      {/* Header */}
      <div className="h-12 px-4 flex items-center justify-between border-b border-border bg-card/80">
        <div className="flex items-center gap-2">
          <Eye className="h-4 w-4 text-primary" />
          <span className="font-medium text-sm">变量监视</span>
          {isExecuting && (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            >
              <Zap className="h-3.5 w-3.5 text-amber-500" />
            </motion.div>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Badge variant="secondary" className="text-[10px] h-5">
            {filteredVariables.length}
          </Badge>
          {changedCount > 0 && (
            <Badge className="text-[10px] h-5 bg-amber-500/20 text-amber-400 border-amber-500/20">
              {changedCount} 变更
            </Badge>
          )}
        </div>
      </div>

      {/* Toolbar */}
      <div className="px-3 py-2 border-b border-border/50 space-y-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="搜索变量..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-8 pl-8 text-xs"
          />
        </div>
        <div className="flex items-center justify-between">
          <Button
            variant={showPinnedOnly ? "secondary" : "ghost"}
            size="sm"
            className="h-7 text-xs gap-1"
            onClick={() => setShowPinnedOnly(!showPinnedOnly)}
          >
            <Pin className="h-3 w-3" />
            固定 ({pinnedCount})
          </Button>
          {onRefresh && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={onRefresh}
              disabled={isExecuting}
            >
              <RefreshCw className={cn(
                "h-3.5 w-3.5",
                isExecuting && "animate-spin"
              )} />
            </Button>
          )}
        </div>
      </div>

      {/* Variable List */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          <AnimatePresence mode="popLayout">
            {filteredVariables.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <EyeOff className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p className="text-xs">暂无监视变量</p>
                <p className="text-[10px] mt-1">从变量池拖拽变量到此处</p>
              </div>
            ) : (
              filteredVariables.map((variable) => (
                <VariableWatchItem
                  key={variable.id}
                  variable={variable}
                  isExpanded={expandedVars.has(variable.id)}
                  onToggleExpand={() => toggleExpand(variable.id)}
                  onPin={onPinVariable}
                  onUnpin={onUnpinVariable}
                  onRemove={onRemoveWatch}
                />
              ))
            )}
          </AnimatePresence>
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="px-3 py-2 border-t border-border/50 bg-muted/20">
        <p className="text-[10px] text-muted-foreground text-center">
          💡 执行工作流时变量值将实时更新
        </p>
      </div>
    </div>
  );
}

// ========== Variable Item ==========

interface VariableWatchItemProps {
  variable: WatchedVariable;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onPin?: (id: string) => void;
  onUnpin?: (id: string) => void;
  onRemove?: (id: string) => void;
}

function VariableWatchItem({
  variable,
  isExpanded,
  onToggleExpand,
  onPin,
  onUnpin,
  onRemove,
}: VariableWatchItemProps) {
  const [copied, setCopied] = useState(false);
  const isExpandable = variable.type === 'object' || variable.type === 'array';

  const handleCopy = useCallback(async () => {
    const text = typeof variable.value === 'object' 
      ? JSON.stringify(variable.value, null, 2)
      : String(variable.value);
    
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [variable.value]);

  const handlePin = useCallback(() => {
    if (variable.isPinned) {
      onUnpin?.(variable.id);
    } else {
      onPin?.(variable.id);
    }
  }, [variable, onPin, onUnpin]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className={cn(
        "group rounded-lg border bg-card/50 overflow-hidden",
        variable.hasChanged && "border-amber-500/30 bg-amber-500/5",
        variable.isPinned && "border-primary/30"
      )}
    >
      {/* Main Row */}
      <div className="flex items-center gap-2 px-2.5 py-2">
        {/* Expand Toggle */}
        {isExpandable ? (
          <button
            onClick={onToggleExpand}
            className="p-0.5 rounded hover:bg-muted/50"
          >
            {isExpanded ? (
              <ChevronDown className="h-3.5 w-3.5" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5" />
            )}
          </button>
        ) : (
          <div className="w-4.5" />
        )}

        {/* Variable Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-medium truncate">
              {variable.name}
            </span>
            <Badge 
              variant="outline" 
              className={cn("text-[9px] h-4 px-1", typeBadgeColors[variable.type])}
            >
              {variable.type}
            </Badge>
            {variable.hasChanged && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="w-1.5 h-1.5 rounded-full bg-amber-500"
              />
            )}
          </div>
          {variable.nodeName && (
            <p className="text-[10px] text-muted-foreground truncate">
              @ {variable.nodeName}
            </p>
          )}
        </div>

        {/* Value Preview */}
        <code className={cn(
          "text-[10px] font-mono max-w-24 truncate",
          typeColors[variable.type]
        )}>
          {formatValue(variable.value, variable.type)}
        </code>

        {/* Actions */}
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={handleCopy}
              >
                {copied ? (
                  <Check className="h-3 w-3 text-green-500" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>复制值</TooltipContent>
          </Tooltip>
          
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={cn("h-6 w-6", variable.isPinned && "text-primary")}
                onClick={handlePin}
              >
                {variable.isPinned ? (
                  <PinOff className="h-3 w-3" />
                ) : (
                  <Pin className="h-3 w-3" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>{variable.isPinned ? '取消固定' : '固定'}</TooltipContent>
          </Tooltip>

          {onRemove && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-destructive"
                  onClick={() => onRemove(variable.id)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>移除监视</TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>

      {/* Expanded Content */}
      <Collapsible open={isExpanded}>
        <CollapsibleContent>
          <div className="px-3 pb-2 pt-1 border-t border-border/50">
            <pre className="text-[10px] font-mono text-muted-foreground overflow-auto max-h-32 bg-muted/30 rounded p-2">
              {JSON.stringify(variable.value, null, 2)}
            </pre>
            {variable.lastUpdated && (
              <div className="flex items-center gap-1 mt-1.5 text-[9px] text-muted-foreground">
                <Clock className="h-3 w-3" />
                更新于 {new Date(variable.lastUpdated).toLocaleTimeString()}
              </div>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </motion.div>
  );
}

export default VariableWatchPanel;
