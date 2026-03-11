import React, { useState, useRef, useCallback, useMemo } from "react";
import { Node } from "@xyflow/react";
import { cn } from "../../../lib/utils.ts";
import { Badge } from "../../ui/badge.tsx";
import { Popover, PopoverContent, PopoverTrigger } from "../../ui/popover.tsx";
import { Input } from "../../ui/input.tsx";
import { ScrollArea } from "../../ui/scroll-area.tsx";
import { nodeOutputSchemas } from "./variableTypes.ts";

interface VariableOption {
  nodeId: string;
  nodeName: string;
  nodeType: string;
  path: string;
  fullRef: string;
  type: string;
}

interface VariableSelectorProps {
  nodes: Node[];
  onSelect: (ref: string) => void;
  trigger: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const typeColors: Record<string, string> = {
  string: "text-green-500 border-green-500/30",
  number: "text-blue-500 border-blue-500/30",
  boolean: "text-yellow-500 border-yellow-500/30",
  object: "text-purple-500 border-purple-500/30",
  array: "text-cyan-500 border-cyan-500/30",
  any: "text-muted-foreground border-muted-foreground/30",
};

export default function VariableSelector({ nodes, onSelect, trigger, open, onOpenChange }: VariableSelectorProps) {
  const [search, setSearch] = useState("");

  const variables = useMemo(() => {
    const result: VariableOption[] = [];
    nodes.forEach((node) => {
      const nodeType = node.type || "";
      const nodeName = (node.data as any)?.name || (node.data as any)?.label || node.id;
      const schema = nodeOutputSchemas[nodeType];
      if (schema) {
        Object.entries(schema).forEach(([path, type]) => {
          result.push({
            nodeId: node.id,
            nodeName,
            nodeType,
            path,
            fullRef: `{{${node.id}.${path}}}`,
            type,
          });
        });
      }
      // Also add config-based outputs for code nodes
      const config = (node.data as any)?.config;
      if (config?.outputVariables) {
        config.outputVariables.forEach((v: { name: string; type: string }) => {
          result.push({
            nodeId: node.id,
            nodeName,
            nodeType,
            path: `output.${v.name}`,
            fullRef: `{{${node.id}.output.${v.name}}}`,
            type: v.type,
          });
        });
      }
    });
    return result;
  }, [nodes]);

  const filtered = useMemo(() => {
    if (!search) return variables;
    const q = search.toLowerCase();
    return variables.filter(
      (v) => v.nodeName.toLowerCase().includes(q) || v.path.toLowerCase().includes(q)
    );
  }, [variables, search]);

  // Group by node
  const grouped = useMemo(() => {
    const map = new Map<string, VariableOption[]>();
    filtered.forEach((v) => {
      const list = map.get(v.nodeId) || [];
      list.push(v);
      map.set(v.nodeId, list);
    });
    return map;
  }, [filtered]);

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start" sideOffset={4}>
        <div className="p-2 border-b border-border">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索变量..."
            className="h-7 text-xs"
            autoFocus
          />
        </div>
        <ScrollArea className="max-h-[300px]">
          <div className="p-1">
            {grouped.size === 0 ? (
              <p className="text-xs text-muted-foreground p-3 text-center">暂无可用变量</p>
            ) : (
              Array.from(grouped.entries()).map(([nodeId, vars]) => (
                <div key={nodeId} className="mb-2">
                  <div className="px-2 py-1 text-[10px] font-medium text-muted-foreground uppercase">
                    {vars[0].nodeName}
                  </div>
                  {vars.map((v) => (
                    <button
                      key={v.fullRef}
                      onClick={() => { onSelect(v.fullRef); onOpenChange?.(false); }}
                      className="w-full flex items-center gap-2 px-2 py-1.5 text-xs rounded hover:bg-accent/50 transition-colors"
                    >
                      <code className="font-mono text-[11px] flex-1 text-left truncate">{v.path}</code>
                      <Badge variant="outline" className={cn("text-[9px] px-1", typeColors[v.type])}>
                        {v.type}
                      </Badge>
                    </button>
                  ))}
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
