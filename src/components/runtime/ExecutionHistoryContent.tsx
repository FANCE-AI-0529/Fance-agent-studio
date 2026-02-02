import { useState } from "react";
import { History, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChainExecutionHistory } from "./ChainExecutionHistory";
import { ExecutionStepTimeline } from "./ExecutionStepTimeline";
import { type ChainExecution } from "@/hooks/useChainExecutions";

interface ExecutionHistoryContentProps {
  chainId?: string | null;
}

export function ExecutionHistoryContent({ chainId }: ExecutionHistoryContentProps) {
  const [selectedExecution, setSelectedExecution] = useState<ChainExecution | null>(null);
  const [expandedView, setExpandedView] = useState<"history" | "timeline">("history");

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <History className="h-4 w-4 text-primary" />
          <h4 className="font-medium text-sm">执行历史</h4>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant={expandedView === "history" ? "secondary" : "ghost"}
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() => setExpandedView("history")}
          >
            列表
          </Button>
          <Button
            variant={expandedView === "timeline" ? "secondary" : "ghost"}
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() => setExpandedView("timeline")}
            disabled={!selectedExecution}
          >
            时间线
          </Button>
        </div>
      </div>

      {expandedView === "history" ? (
        <ChainExecutionHistory
          chainId={chainId}
          onSelectExecution={(execution) => {
            setSelectedExecution(execution);
            setExpandedView("timeline");
          }}
        />
      ) : selectedExecution ? (
        <div className="space-y-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs gap-1"
            onClick={() => setExpandedView("history")}
          >
            <ChevronDown className="h-3 w-3 rotate-90" />
            返回列表
          </Button>
          <ExecutionStepTimeline execution={selectedExecution} />
        </div>
      ) : (
        <div className="text-center text-muted-foreground py-8">
          <History className="h-8 w-8 mx-auto opacity-30 mb-2" />
          <p className="text-sm">选择一个执行记录查看详情</p>
        </div>
      )}
    </div>
  );
}

export default ExecutionHistoryContent;
