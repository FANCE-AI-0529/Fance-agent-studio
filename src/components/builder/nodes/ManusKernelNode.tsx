import React, { memo } from "react";
import { Handle, Position, NodeProps } from "@xyflow/react";
import { Brain, Lock, FileText, Zap, CheckCircle2, Settings2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { MANUS_KERNEL } from "@/data/manusKernel";

export interface ManusKernelNodeData extends Record<string, unknown> {
  id: string;
  name: string;
  version: string;
  files: string[];
  rules: {
    twoActionRule: boolean;
    threeStrikeProtocol: boolean;
    fiveQuestionReboot: boolean;
  };
  status: 'active' | 'inactive';
}

const ManusKernelNode = memo(({ data, selected }: NodeProps) => {
  const nodeData = data as ManusKernelNodeData;
  const files = nodeData?.files || Object.keys(MANUS_KERNEL.fileTemplates);
  const rules = nodeData?.rules || MANUS_KERNEL.rules;

  return (
    <TooltipProvider>
      <div
        className={cn(
          "relative px-4 py-3 rounded-xl border-2 shadow-lg min-w-[200px] transition-all duration-300",
          "bg-gradient-to-br from-amber-500/20 via-yellow-500/15 to-orange-500/20",
          "border-amber-400/60 hover:border-amber-300",
          selected && "ring-2 ring-amber-400/50 ring-offset-2 ring-offset-background",
          "backdrop-blur-sm"
        )}
        style={{
          boxShadow: selected 
            ? "0 0 30px rgba(251, 191, 36, 0.4), 0 0 60px rgba(251, 191, 36, 0.2)" 
            : "0 0 20px rgba(251, 191, 36, 0.2)"
        }}
      >
        {/* Lock indicator - cannot be deleted */}
        <div className="absolute -top-2 -right-2 z-10">
          <Tooltip>
            <TooltipTrigger>
              <div className="w-6 h-6 rounded-full bg-amber-500 flex items-center justify-center shadow-lg">
                <Lock className="w-3 h-3 text-white" />
              </div>
            </TooltipTrigger>
            <TooltipContent side="top" className="bg-amber-950 border-amber-800">
              <p className="text-amber-200 text-xs">Manus 内核不可移除 - 这是智能体的大脑</p>
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Glowing brain icon */}
        <div className="flex items-center gap-3 mb-3">
          <div 
            className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg"
            style={{
              boxShadow: "0 0 15px rgba(251, 191, 36, 0.5)"
            }}
          >
            <Brain className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground text-sm truncate">
              {nodeData.name || "Manus Planning Core"}
            </h3>
            <div className="flex items-center gap-1.5 mt-0.5">
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 bg-amber-500/20 border-amber-500/40 text-amber-200">
                v{nodeData.version || MANUS_KERNEL.version}
              </Badge>
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 bg-green-500/20 border-green-500/40 text-green-200">
                <CheckCircle2 className="w-2.5 h-2.5 mr-0.5" />
                {nodeData.status === 'active' ? '运行中' : '未激活'}
              </Badge>
            </div>
          </div>
        </div>

        {/* Memory files section */}
        <div className="space-y-1.5 mb-3">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">记忆文件</p>
          <div className="flex flex-wrap gap-1">
            {files.map((file) => (
              <Tooltip key={file}>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-background/50 border border-amber-500/30 text-xs">
                    <FileText className="w-3 h-3 text-amber-400" />
                    <span className="text-foreground/80">{file}</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-[200px]">
                  <p className="text-xs">
                    {file === 'task_plan.md' && '任务规划板 - 追踪当前目标和阶段'}
                    {file === 'findings.md' && '知识发现库 - 记录所有学习和发现'}
                    {file === 'progress.md' && '进度追踪器 - 记录操作日志'}
                  </p>
                </TooltipContent>
              </Tooltip>
            ))}
          </div>
        </div>

        {/* Active rules section */}
        <div className="space-y-1.5">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">激活协议</p>
          <div className="flex flex-wrap gap-1">
            {rules.twoActionRule && (
              <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4 bg-blue-500/20 border-blue-500/30">
                <Zap className="w-2.5 h-2.5 mr-0.5" />
                2-Action Rule
              </Badge>
            )}
            {rules.threeStrikeProtocol && (
              <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4 bg-red-500/20 border-red-500/30">
                <Settings2 className="w-2.5 h-2.5 mr-0.5" />
                3-Strike
              </Badge>
            )}
            {rules.fiveQuestionReboot && (
              <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4 bg-purple-500/20 border-purple-500/30">
                5Q Reboot
              </Badge>
            )}
          </div>
        </div>

        {/* Lifecycle output handle - connects to Agent */}
        <Handle
          type="source"
          position={Position.Bottom}
          id="lifecycle"
          className="!w-3 !h-3 !bg-amber-400 !border-2 !border-amber-600"
          style={{ bottom: -6 }}
        />

        {/* Input handle for session events */}
        <Handle
          type="target"
          position={Position.Top}
          id="session"
          className="!w-3 !h-3 !bg-amber-400 !border-2 !border-amber-600"
          style={{ top: -6 }}
        />
      </div>
    </TooltipProvider>
  );
});

ManusKernelNode.displayName = "ManusKernelNode";

export default ManusKernelNode;
