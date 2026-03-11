import React, { useState, useMemo } from "react";
import type { Edge, Node } from "@xyflow/react";
import { 
  X, 
  Link2, 
  Plus, 
  Trash2, 
  ArrowRight,
  Code,
  Eye,
} from "lucide-react";
import { Button } from "../../ui/button.tsx";
import { Input } from "../../ui/input.tsx";
import { Label } from "../../ui/label.tsx";
import { Switch } from "../../ui/switch.tsx";
import { Badge } from "../../ui/badge.tsx";
import { ScrollArea } from "../../ui/scroll-area.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../ui/select.tsx";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "../../ui/collapsible.tsx";
import { ChevronDown } from "lucide-react";
import { cn } from "../../../lib/utils.ts";
import { useVariableStore } from "../../../stores/variableStore.ts";
import { 
  nodeOutputSchemas, 
  getSchemaPathsWithTypes,
  createVariableReference,
} from "./variableTypes.ts";
import { getMockDataForNodeType } from "./mockDataPresets.ts";
import type { VariableMapping, EdgeMapping } from "./variableTypes.ts";

interface EdgeMappingPanelProps {
  edge: Edge;
  nodes: Node[];
  onClose: () => void;
  className?: string;
}

export function EdgeMappingPanel({ 
  edge, 
  nodes, 
  onClose,
  className,
}: EdgeMappingPanelProps) {
  const [mappingsOpen, setMappingsOpen] = useState(true);
  const [previewOpen, setPreviewOpen] = useState(true);

  const { edgeMappings, setEdgeMapping } = useVariableStore();

  const sourceNode = nodes.find((n) => n.id === edge.source);
  const targetNode = nodes.find((n) => n.id === edge.target);

  const currentMapping = edgeMappings[edge.id] || {
    edgeId: edge.id,
    sourceNodeId: edge.source,
    targetNodeId: edge.target,
    mappings: [],
  };

  // Get available source fields
  const sourceFields = useMemo(() => {
    const nodeType = sourceNode?.type || "skill";
    const schema = nodeOutputSchemas[nodeType] || nodeOutputSchemas.skill;
    return getSchemaPathsWithTypes(schema);
  }, [sourceNode?.type]);

  // Get available target fields
  const targetFields = useMemo(() => {
    const nodeType = targetNode?.type || "agent";
    // For target, we typically use input schema which mirrors output structure
    const schema = {
      "input": "any",
      "context": "object",
      "query": "string",
      ...nodeOutputSchemas[nodeType],
    } as Record<string, string>;
    return getSchemaPathsWithTypes(schema as Record<string, never>);
  }, [targetNode?.type]);

  // Mock data for preview
  const mockData = useMemo(() => {
    const nodeType = sourceNode?.type || "skill";
    return getMockDataForNodeType(nodeType);
  }, [sourceNode?.type]);

  const handleAddMapping = () => {
    const newMapping: VariableMapping = {
      id: `mapping-${Date.now()}`,
      source: sourceFields[0]?.path || "",
      target: targetFields[0]?.path || "",
      enabled: true,
    };

    const updatedMappings: EdgeMapping = {
      ...currentMapping,
      mappings: [...currentMapping.mappings, newMapping],
    };

    setEdgeMapping(edge.id, updatedMappings);
  };

  const handleUpdateMapping = (
    mappingId: string, 
    updates: Partial<VariableMapping>
  ) => {
    const updatedMappings: EdgeMapping = {
      ...currentMapping,
      mappings: currentMapping.mappings.map((m) =>
        m.id === mappingId ? { ...m, ...updates } : m
      ),
    };
    setEdgeMapping(edge.id, updatedMappings);
  };

  const handleRemoveMapping = (mappingId: string) => {
    const updatedMappings: EdgeMapping = {
      ...currentMapping,
      mappings: currentMapping.mappings.filter((m) => m.id !== mappingId),
    };
    setEdgeMapping(edge.id, updatedMappings);
  };

  const getNodeLabel = (node: Node | undefined): string => {
    if (!node) return "Unknown";
    const data = node.data as Record<string, unknown>;
    return (data?.name as string) || (data?.label as string) || node.id;
  };

  return (
    <div className={cn("w-80 border-l bg-background flex flex-col", className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b">
        <div className="flex items-center gap-2">
          <Link2 className="h-4 w-4 text-primary" />
          <span className="font-medium text-sm">数据映射</span>
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Connection Info */}
      <div className="p-3 border-b bg-muted/30">
        <div className="flex items-center gap-2 text-sm">
          <Badge variant="outline" className="font-mono text-xs">
            {getNodeLabel(sourceNode)}
          </Badge>
          <ArrowRight className="h-3 w-3 text-muted-foreground" />
          <Badge variant="outline" className="font-mono text-xs">
            {getNodeLabel(targetNode)}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          端口: {edge.sourceHandle || "output"} → {edge.targetHandle || "input"}
        </p>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-3 space-y-3">
          {/* Field Mappings */}
          <Collapsible open={mappingsOpen} onOpenChange={setMappingsOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full justify-between p-2 h-auto">
                <span className="flex items-center gap-2 text-sm">
                  <ChevronDown className={cn(
                    "h-4 w-4 transition-transform",
                    !mappingsOpen && "-rotate-90"
                  )} />
                  字段映射
                </span>
                <Badge variant="secondary" className="text-xs">
                  {currentMapping.mappings.length}
                </Badge>
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-2 mt-2">
              {currentMapping.mappings.map((mapping) => (
                <div
                  key={mapping.id}
                  className="p-2 border rounded-md bg-card space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={mapping.enabled}
                        onCheckedChange={(checked) =>
                          handleUpdateMapping(mapping.id, { enabled: checked })
                        }
                        className="scale-75"
                      />
                      <span className="text-xs text-muted-foreground">
                        {mapping.enabled ? "启用" : "禁用"}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-destructive"
                      onClick={() => handleRemoveMapping(mapping.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                  
                  <div className="grid grid-cols-[1fr,auto,1fr] gap-1 items-center">
                    <Select
                      value={mapping.source}
                      onValueChange={(v) =>
                        handleUpdateMapping(mapping.id, { source: v })
                      }
                    >
                      <SelectTrigger className="h-8 text-xs font-mono">
                        <SelectValue placeholder="来源字段" />
                      </SelectTrigger>
                      <SelectContent>
                        {sourceFields.map((field) => (
                          <SelectItem 
                            key={field.path} 
                            value={field.path}
                            className="text-xs font-mono"
                          >
                            {field.path}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    
                    <ArrowRight className="h-3 w-3 text-muted-foreground" />
                    
                    <Select
                      value={mapping.target}
                      onValueChange={(v) =>
                        handleUpdateMapping(mapping.id, { target: v })
                      }
                    >
                      <SelectTrigger className="h-8 text-xs font-mono">
                        <SelectValue placeholder="目标字段" />
                      </SelectTrigger>
                      <SelectContent>
                        {targetFields.map((field) => (
                          <SelectItem 
                            key={field.path} 
                            value={field.path}
                            className="text-xs font-mono"
                          >
                            {field.path}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ))}

              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={handleAddMapping}
              >
                <Plus className="h-3 w-3 mr-1" />
                添加映射
              </Button>
            </CollapsibleContent>
          </Collapsible>

          {/* Variable Template */}
          <div className="p-2 border rounded-md bg-muted/30">
            <div className="flex items-center gap-2 mb-2">
              <Code className="h-3 w-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">变量模板</span>
            </div>
            <code className="text-xs font-mono block">
              {createVariableReference(edge.source, ["output"])} →{" "}
              {createVariableReference(edge.target, ["input"])}
            </code>
          </div>

          {/* Data Preview */}
          <Collapsible open={previewOpen} onOpenChange={setPreviewOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full justify-between p-2 h-auto">
                <span className="flex items-center gap-2 text-sm">
                  <ChevronDown className={cn(
                    "h-4 w-4 transition-transform",
                    !previewOpen && "-rotate-90"
                  )} />
                  <Eye className="h-4 w-4" />
                  数据预览 (Mock)
                </span>
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2">
              <pre className="p-2 rounded-md bg-muted text-xs font-mono overflow-auto max-h-48">
                {JSON.stringify(mockData, null, 2)}
              </pre>
            </CollapsibleContent>
          </Collapsible>
        </div>
      </ScrollArea>
    </div>
  );
}
