import React, { useState } from "react";
import { 
  Globe, 
  Lock, 
  ChevronDown, 
  ChevronRight, 
  Plus, 
  Edit2, 
  Trash2,
  GripVertical,
  MessageSquare,
  Cpu,
  Database,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useVariableStore } from "@/stores/variableStore";
import { GlobalVariableDialog } from "./GlobalVariableDialog";
import type { GlobalVariable, VariableType } from "./variableTypes";

const typeColors: Record<VariableType, string> = {
  string: "text-green-500",
  number: "text-blue-500",
  boolean: "text-amber-500",
  object: "text-purple-500",
  array: "text-pink-500",
  any: "text-muted-foreground",
};

const nodeIcons: Record<string, React.ElementType> = {
  trigger: MessageSquare,
  agent: Cpu,
  skill: Zap,
  knowledge: Database,
};

interface VariablePoolPanelProps {
  className?: string;
}

export function VariablePoolPanel({ className }: VariablePoolPanelProps) {
  const [globalOpen, setGlobalOpen] = useState(true);
  const [nodeOpen, setNodeOpen] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingVariable, setEditingVariable] = useState<GlobalVariable | undefined>();

  const {
    globalVariables,
    nodeOutputs,
    addGlobalVariable,
    updateGlobalVariable,
    removeGlobalVariable,
  } = useVariableStore();

  const handleSaveVariable = (variable: GlobalVariable) => {
    if (editingVariable) {
      updateGlobalVariable(variable.id, variable);
    } else {
      addGlobalVariable(variable);
    }
    setEditingVariable(undefined);
  };

  const handleEdit = (variable: GlobalVariable) => {
    setEditingVariable(variable);
    setDialogOpen(true);
  };

  const handleAdd = () => {
    setEditingVariable(undefined);
    setDialogOpen(true);
  };

  const handleDragStart = (e: React.DragEvent, path: string) => {
    e.dataTransfer.setData("variable/path", path);
    e.dataTransfer.effectAllowed = "copy";
  };

  const formatValue = (value: unknown, isSecret?: boolean): string => {
    if (isSecret) return "••••••••";
    if (typeof value === "string") return `"${value}"`;
    if (typeof value === "object") return JSON.stringify(value);
    return String(value);
  };

  return (
    <div className={cn("flex flex-col h-full", className)}>
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-2">
          {/* Global Variables */}
          <Collapsible open={globalOpen} onOpenChange={setGlobalOpen}>
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                className="w-full justify-between p-2 h-auto"
              >
                <span className="flex items-center gap-2 text-sm font-medium">
                  {globalOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  <Globe className="h-4 w-4" />
                  全局变量
                </span>
                <Badge variant="secondary" className="text-xs">
                  {globalVariables.length}
                </Badge>
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-1 mt-1">
              {globalVariables.map((variable) => (
                <div
                  key={variable.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, `global.${variable.name}`)}
                  className="group flex items-start gap-2 p-2 rounded-md border bg-card hover:bg-accent/50 cursor-grab active:cursor-grabbing"
                >
                  <GripVertical className="h-4 w-4 mt-0.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {variable.isSecret ? (
                        <Lock className="h-3 w-3 text-amber-500" />
                      ) : (
                        <Globe className="h-3 w-3 text-primary" />
                      )}
                      <span className="font-mono text-sm truncate">
                        {variable.name}
                      </span>
                      <span className={cn("text-xs", typeColors[variable.type])}>
                        {variable.type}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground font-mono truncate mt-0.5">
                      = {formatValue(variable.value, variable.isSecret)}
                    </p>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => handleEdit(variable)}
                        >
                          <Edit2 className="h-3 w-3" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>编辑</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-destructive"
                          onClick={() => removeGlobalVariable(variable.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>删除</TooltipContent>
                    </Tooltip>
                  </div>
                </div>
              ))}
              
              <Button
                variant="outline"
                size="sm"
                className="w-full mt-2"
                onClick={handleAdd}
              >
                <Plus className="h-3 w-3 mr-1" />
                添加全局变量
              </Button>
            </CollapsibleContent>
          </Collapsible>

          {/* Node Outputs */}
          <Collapsible open={nodeOpen} onOpenChange={setNodeOpen}>
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                className="w-full justify-between p-2 h-auto"
              >
                <span className="flex items-center gap-2 text-sm font-medium">
                  {nodeOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  <Cpu className="h-4 w-4" />
                  节点输出
                </span>
                <Badge variant="secondary" className="text-xs">
                  {Object.keys(nodeOutputs).length}
                </Badge>
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-1 mt-1">
              {Object.entries(nodeOutputs).length === 0 ? (
                <p className="text-xs text-muted-foreground p-2 text-center">
                  添加节点后，其输出变量将显示在此处
                </p>
              ) : (
                Object.entries(nodeOutputs).map(([nodeId, outputs]) => {
                  const Icon = nodeIcons[outputs[0]?.sourceNodeId?.split("-")[0] || "skill"] || Zap;
                  return (
                    <div key={nodeId} className="border rounded-md bg-card">
                      <div className="flex items-center gap-2 p-2 border-b">
                        <Icon className="h-4 w-4 text-primary" />
                        <span className="text-sm font-medium truncate">
                          {nodeId}
                        </span>
                      </div>
                      <div className="p-1">
                        {outputs.map((output) => (
                          <div
                            key={output.id}
                            draggable
                            onDragStart={(e) => 
                              handleDragStart(e, `${nodeId}.${output.path || output.name}`)
                            }
                            className="flex items-center gap-2 p-1.5 rounded hover:bg-accent/50 cursor-grab active:cursor-grabbing"
                          >
                            <GripVertical className="h-3 w-3 text-muted-foreground" />
                            <span className="font-mono text-xs">
                              {output.path || output.name}
                            </span>
                            <span className={cn("text-xs ml-auto", typeColors[output.type])}>
                              {output.type}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })
              )}
            </CollapsibleContent>
          </Collapsible>
        </div>
      </ScrollArea>

      <div className="p-3 border-t bg-muted/30">
        <p className="text-xs text-muted-foreground text-center">
          💡 拖拽变量到连线上进行映射
        </p>
      </div>

      <GlobalVariableDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        variable={editingVariable}
        onSave={handleSaveVariable}
      />
    </div>
  );
}
