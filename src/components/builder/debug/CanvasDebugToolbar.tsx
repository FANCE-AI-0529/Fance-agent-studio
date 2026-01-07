import { memo } from "react";
import {
  Play,
  Pause,
  Square,
  SkipForward,
  Bug,
  Gauge,
  Circle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { SimulationSpeed } from "@/stores/canvasDebugStore";

interface CanvasDebugToolbarProps {
  isRunning: boolean;
  isPaused: boolean;
  simulationSpeed: SimulationSpeed;
  breakpointCount: number;
  currentNodeName?: string;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  onStepOver: () => void;
  onSpeedChange: (speed: SimulationSpeed) => void;
  onClearBreakpoints: () => void;
  onExitDebug: () => void;
}

const CanvasDebugToolbar = memo(
  ({
    isRunning,
    isPaused,
    simulationSpeed,
    breakpointCount,
    currentNodeName,
    onStart,
    onPause,
    onResume,
    onStop,
    onStepOver,
    onSpeedChange,
    onClearBreakpoints,
    onExitDebug,
  }: CanvasDebugToolbarProps) => {
    const getStatusText = () => {
      if (!isRunning && !isPaused) return "就绪";
      if (isPaused) return "已暂停";
      return "运行中";
    };

    const getStatusColor = () => {
      if (!isRunning && !isPaused) return "bg-muted-foreground";
      if (isPaused) return "bg-yellow-500";
      return "bg-green-500 animate-pulse";
    };

    return (
      <div className="h-10 px-3 flex items-center justify-between border-b border-border bg-muted/50">
        <div className="flex items-center gap-3">
          {/* Debug mode indicator */}
          <div className="flex items-center gap-2">
            <Bug className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">调试模式</span>
          </div>

          <div className="h-4 w-px bg-border" />

          {/* Play/Pause/Stop controls */}
          <div className="flex items-center gap-1">
            {!isRunning ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 gap-1.5"
                    onClick={onStart}
                  >
                    <Play className="h-3.5 w-3.5" />
                    运行
                  </Button>
                </TooltipTrigger>
                <TooltipContent>运行模拟 (F5)</TooltipContent>
              </Tooltip>
            ) : isPaused ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 gap-1.5"
                    onClick={onResume}
                  >
                    <Play className="h-3.5 w-3.5" />
                    继续
                  </Button>
                </TooltipTrigger>
                <TooltipContent>继续执行 (F5)</TooltipContent>
              </Tooltip>
            ) : (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 gap-1.5"
                    onClick={onPause}
                  >
                    <Pause className="h-3.5 w-3.5" />
                    暂停
                  </Button>
                </TooltipTrigger>
                <TooltipContent>暂停执行 (F6)</TooltipContent>
              </Tooltip>
            )}

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={onStop}
                  disabled={!isRunning && !isPaused}
                >
                  <Square className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>停止 (Shift+F5)</TooltipContent>
            </Tooltip>
          </div>

          <div className="h-4 w-px bg-border" />

          {/* Step controls */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 gap-1.5"
                onClick={onStepOver}
              >
                <SkipForward className="h-3.5 w-3.5" />
                单步
              </Button>
            </TooltipTrigger>
            <TooltipContent>单步执行 (F10)</TooltipContent>
          </Tooltip>

          <div className="h-4 w-px bg-border" />

          {/* Speed selector */}
          <div className="flex items-center gap-2">
            <Gauge className="h-3.5 w-3.5 text-muted-foreground" />
            <Select
              value={simulationSpeed}
              onValueChange={(v) => onSpeedChange(v as SimulationSpeed)}
            >
              <SelectTrigger className="h-7 w-20 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="slow">慢速</SelectItem>
                <SelectItem value="normal">正常</SelectItem>
                <SelectItem value="fast">快速</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Breakpoints */}
          {breakpointCount > 0 && (
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className="h-6 text-xs border-red-500/30 text-red-500"
              >
                <Circle className="h-2 w-2 fill-red-500 mr-1" />
                {breakpointCount} 断点
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-xs text-muted-foreground hover:text-foreground"
                onClick={onClearBreakpoints}
              >
                清除
              </Button>
            </div>
          )}

          <div className="h-4 w-px bg-border" />

          {/* Status */}
          <div className="flex items-center gap-2">
            <div
              className={cn("h-2 w-2 rounded-full", getStatusColor())}
            />
            <span className="text-xs text-muted-foreground">
              {getStatusText()}
            </span>
            {currentNodeName && isPaused && (
              <span className="text-xs text-primary">
                @ {currentNodeName}
              </span>
            )}
          </div>

          <div className="h-4 w-px bg-border" />

          {/* Exit debug mode */}
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={onExitDebug}
          >
            退出调试
          </Button>
        </div>
      </div>
    );
  }
);

CanvasDebugToolbar.displayName = "CanvasDebugToolbar";

export default CanvasDebugToolbar;
