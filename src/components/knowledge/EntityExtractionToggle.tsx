import { useState } from "react";
import { Network, Info } from "lucide-react";
import { Switch } from "../ui/switch.tsx";
import { Label } from "../ui/label.tsx";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip.tsx";
import { useUpdateKnowledgeBase, useKnowledgeBase } from "../../hooks/useKnowledgeBases.ts";

interface EntityExtractionToggleProps {
  knowledgeBaseId: string;
}

export function EntityExtractionToggle({ knowledgeBaseId }: EntityExtractionToggleProps) {
  const { data: knowledgeBase } = useKnowledgeBase(knowledgeBaseId);
  const updateKnowledgeBase = useUpdateKnowledgeBase();
  
  const isEnabled = (knowledgeBase?.metadata as Record<string, unknown>)?.enableEntityExtraction === true;

  const handleToggle = async (checked: boolean) => {
    await updateKnowledgeBase.mutateAsync({
      id: knowledgeBaseId,
      metadata: {
        ...(knowledgeBase?.metadata as Record<string, unknown>),
        enableEntityExtraction: checked,
      },
    });
  };

  return (
    <TooltipProvider>
      <div className="flex items-center gap-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/50 border border-border">
              <Network className="h-4 w-4 text-muted-foreground" />
              <Label className="text-xs cursor-pointer">实体提取</Label>
              <Switch
                checked={isEnabled}
                onCheckedChange={handleToggle}
                disabled={updateKnowledgeBase.isPending}
                className="scale-75"
              />
              <Tooltip>
                <TooltipTrigger>
                  <Info className="h-3 w-3 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-xs">
                  <p className="text-xs">
                    开启后，系统将自动识别文档中的人物、组织、概念等实体，
                    构建知识图谱以支持 GraphRAG 高级检索。
                  </p>
                </TooltipContent>
              </Tooltip>
            </div>
          </TooltipTrigger>
          <TooltipContent>GraphRAG 实体提取</TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}
