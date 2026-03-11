import React, { useCallback } from "react";
import { Node } from "@xyflow/react";
import { X } from "lucide-react";
import { Button } from "../../ui/button.tsx";
import { ScrollArea } from "../../ui/scroll-area.tsx";
import { cn } from "../../../lib/utils.ts";
import LLMConfigPanel from "./LLMConfigPanel.tsx";
import CodeConfigPanel from "./CodeConfigPanel.tsx";
import HTTPConfigPanel from "./HTTPConfigPanel.tsx";
import ConditionConfigPanel from "./ConditionConfigPanel.tsx";
import TemplateConfigPanel from "./TemplateConfigPanel.tsx";
import ExtractorConfigPanel from "./ExtractorConfigPanel.tsx";
import IteratorConfigPanel from "./IteratorConfigPanel.tsx";
import KnowledgeConfigPanel from "./KnowledgeConfigPanel.tsx";
import AggregatorConfigPanel from "./AggregatorConfigPanel.tsx";
import TriggerConfigPanel from "./TriggerConfigPanel.tsx";

interface NodeConfigDrawerProps {
  selectedNode: Node | null;
  onClose: () => void;
  onUpdateNodeData: (nodeId: string, data: Record<string, unknown>) => void;
  nodes: Node[];
}

const panelMap: Record<string, React.FC<{ node: Node; onUpdate: (data: Record<string, unknown>) => void; nodes: Node[] }>> = {
  llm: LLMConfigPanel,
  code: CodeConfigPanel,
  httpRequest: HTTPConfigPanel,
  condition: ConditionConfigPanel,
  template: TemplateConfigPanel,
  parameterExtractor: ExtractorConfigPanel,
  iterator: IteratorConfigPanel,
  knowledge: KnowledgeConfigPanel,
  variableAggregator: AggregatorConfigPanel,
  trigger: TriggerConfigPanel,
};

const panelTitles: Record<string, string> = {
  llm: "LLM 配置",
  code: "代码执行配置",
  httpRequest: "HTTP 请求配置",
  condition: "条件分支配置",
  template: "模板转换配置",
  parameterExtractor: "参数提取器配置",
  iterator: "迭代器配置",
  knowledge: "知识检索配置",
  variableAggregator: "变量聚合器配置",
  trigger: "触发器配置",
};

export default function NodeConfigDrawer({ selectedNode, onClose, onUpdateNodeData, nodes }: NodeConfigDrawerProps) {
  const handleUpdate = useCallback(
    (data: Record<string, unknown>) => {
      if (selectedNode) {
        onUpdateNodeData(selectedNode.id, data);
      }
    },
    [selectedNode?.id, onUpdateNodeData]
  );

  if (!selectedNode) return null;

  const nodeType = selectedNode.type || "";
  const Panel = panelMap[nodeType];

  if (!Panel) return null;

  return (
    <div
      className={cn(
        "fixed right-0 top-0 h-full w-[420px] z-50 bg-card border-l border-border shadow-2xl",
        "animate-in slide-in-from-right duration-300"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div>
          <h3 className="font-semibold text-sm">{panelTitles[nodeType] || "节点配置"}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {(selectedNode.data as any)?.name || selectedNode.id}
          </p>
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Content */}
      <ScrollArea className="h-[calc(100%-56px)]">
        <div className="p-4">
          <Panel node={selectedNode} onUpdate={handleUpdate} nodes={nodes} />
        </div>
      </ScrollArea>
    </div>
  );
}
