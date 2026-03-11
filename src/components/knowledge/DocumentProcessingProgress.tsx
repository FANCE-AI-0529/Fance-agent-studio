import { CheckCircle2, Loader2, Circle, AlertCircle } from "lucide-react";
import { cn } from "../../lib/utils.ts";

interface DocumentProcessingProgressProps {
  status: string;
  chunksCount?: number;
}

const STAGES = [
  { id: "parse", label: "解析" },
  { id: "chunk", label: "切片" },
  { id: "embed", label: "向量化" },
  { id: "store", label: "入库" },
];

/**
 * 根据文档真实状态和切片数推断当前阶段
 */
function getStageFromStatus(status: string, chunksCount: number): number {
  if (status === "indexed") return STAGES.length;
  if (status === "failed") return -1;
  if (status === "pending") return 0;
  // processing: infer from chunks_count
  if (chunksCount > 0) return 3; // embedding/storing phase
  return 1; // parsing/chunking phase
}

export function DocumentProcessingProgress({ status, chunksCount = 0 }: DocumentProcessingProgressProps) {
  const currentStage = getStageFromStatus(status, chunksCount);

  const getStageStatus = (index: number) => {
    if (status === "indexed") return "complete";
    if (status === "failed") return index <= Math.max(currentStage, 0) ? "error" : "pending";
    if (index < currentStage) return "complete";
    if (index === currentStage) return "active";
    return "pending";
  };

  return (
    <div className="flex items-center gap-1">
      {STAGES.map((stage, index) => {
        const stageStatus = getStageStatus(index);
        
        return (
          <div key={stage.id} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  "w-6 h-6 rounded-full flex items-center justify-center transition-all",
                  stageStatus === "complete" && "bg-status-executing/20",
                  stageStatus === "active" && "bg-primary/20",
                  stageStatus === "error" && "bg-destructive/20",
                  stageStatus === "pending" && "bg-muted"
                )}
              >
                {stageStatus === "complete" ? (
                  <CheckCircle2 className="h-4 w-4 text-status-executing" />
                ) : stageStatus === "active" ? (
                  <Loader2 className="h-4 w-4 text-primary animate-spin" />
                ) : stageStatus === "error" ? (
                  <AlertCircle className="h-4 w-4 text-destructive" />
                ) : (
                  <Circle className="h-3 w-3 text-muted-foreground" />
                )}
              </div>
              <span
                className={cn(
                  "text-[10px] mt-1 transition-colors",
                  stageStatus === "complete" && "text-status-executing",
                  stageStatus === "active" && "text-primary font-medium",
                  stageStatus === "error" && "text-destructive",
                  stageStatus === "pending" && "text-muted-foreground"
                )}
              >
                {stage.label}
              </span>
            </div>
            
            {index < STAGES.length - 1 && (
              <div
                className={cn(
                  "w-8 h-0.5 mx-1 transition-colors",
                  getStageStatus(index) === "complete"
                    ? "bg-status-executing"
                    : getStageStatus(index) === "error"
                    ? "bg-destructive"
                    : "bg-muted"
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
