import { useState, useEffect } from "react";
import { CheckCircle2, Loader2, Circle } from "lucide-react";
import { cn } from "@/lib/utils";

interface DocumentProcessingProgressProps {
  status: string;
}

const STAGES = [
  { id: "parse", label: "解析" },
  { id: "chunk", label: "切片" },
  { id: "embed", label: "向量化" },
  { id: "store", label: "入库" },
];

export function DocumentProcessingProgress({ status }: DocumentProcessingProgressProps) {
  const [currentStage, setCurrentStage] = useState(0);
  const [stageProgress, setStageProgress] = useState<number[]>([0, 0, 0, 0]);

  useEffect(() => {
    if (status === "processing" || status === "pending") {
      // Simulate progress through stages
      const interval = setInterval(() => {
        setCurrentStage((prev) => {
          if (prev < STAGES.length - 1) {
            return prev + 1;
          }
          clearInterval(interval);
          return prev;
        });
      }, 1500);

      // Simulate stage completion
      const progressInterval = setInterval(() => {
        setStageProgress((prev) => {
          const newProgress = [...prev];
          for (let i = 0; i <= currentStage && i < STAGES.length; i++) {
            if (newProgress[i] < 100) {
              newProgress[i] = Math.min(newProgress[i] + 25, 100);
            }
          }
          return newProgress;
        });
      }, 300);

      return () => {
        clearInterval(interval);
        clearInterval(progressInterval);
      };
    } else if (status === "indexed") {
      setStageProgress([100, 100, 100, 100]);
      setCurrentStage(STAGES.length);
    }
  }, [status, currentStage]);

  const getStageStatus = (index: number) => {
    if (status === "indexed") return "complete";
    if (status === "failed") return index <= currentStage ? "error" : "pending";
    if (stageProgress[index] === 100) return "complete";
    if (index === currentStage) return "active";
    if (index < currentStage) return "complete";
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
                ) : (
                  <Circle className="h-3 w-3 text-muted-foreground" />
                )}
              </div>
              <span
                className={cn(
                  "text-[10px] mt-1 transition-colors",
                  stageStatus === "complete" && "text-status-executing",
                  stageStatus === "active" && "text-primary font-medium",
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
                  stageProgress[index] === 100
                    ? "bg-status-executing"
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
