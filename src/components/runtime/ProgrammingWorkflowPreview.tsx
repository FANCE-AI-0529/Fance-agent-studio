import { Badge } from "../ui/badge.tsx";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card.tsx";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../ui/tooltip.tsx";
import { 
  BookOpen, 
  Wrench, 
  CheckCircle, 
  Shield, 
  TestTube, 
  ArrowRight,
  AlertTriangle,
  Code2
} from "lucide-react";
import { cn } from "../../lib/utils.ts";
import { OpenCodeModeIndicator, type OpenCodeMode } from "./OpenCodeModeIndicator.tsx";

export type ProgrammingTaskType = 'generation' | 'modification' | 'bugfix' | 'development';

interface ProgrammingWorkflowPreviewProps {
  taskType: ProgrammingTaskType;
  confidence: number;
  matchReason: string;
  currentMode: OpenCodeMode;
  styleCheckEnabled?: boolean;
  testRunnerEnabled?: boolean;
  environmentHint?: string | null;
  className?: string;
}

const TASK_TYPE_CONFIG: Record<ProgrammingTaskType, {
  label: string;
  icon: typeof Code2;
  color: string;
  description: string;
}> = {
  generation: {
    label: '代码生成',
    icon: Code2,
    color: 'text-green-500',
    description: '创建新的代码、函数或模块',
  },
  modification: {
    label: '代码修改',
    icon: Wrench,
    color: 'text-blue-500',
    description: '修改或重构现有代码',
  },
  bugfix: {
    label: 'Bug 修复',
    icon: AlertTriangle,
    color: 'text-orange-500',
    description: '定位并修复代码问题',
  },
  development: {
    label: '应用开发',
    icon: Code2,
    color: 'text-purple-500',
    description: '构建完整的应用或功能',
  },
};

const WORKFLOW_STAGES = [
  { id: 'plan', name: 'PLAN', icon: BookOpen, description: '代码浏览与修改计划生成' },
  { id: 'confirm', name: 'CONFIRM', icon: Shield, description: 'MPLP 策略审批' },
  { id: 'build', name: 'BUILD', icon: Wrench, description: '执行代码变更' },
  { id: 'style', name: 'STYLE', icon: CheckCircle, description: '风格规范检查' },
  { id: 'test', name: 'TEST', icon: TestTube, description: '测试验证' },
];

export function ProgrammingWorkflowPreview({
  taskType,
  confidence,
  matchReason,
  currentMode,
  styleCheckEnabled = true,
  testRunnerEnabled = false,
  environmentHint,
  className,
}: ProgrammingWorkflowPreviewProps) {
  const taskConfig = TASK_TYPE_CONFIG[taskType];
  const TaskIcon = taskConfig.icon;
  
  const getStageStatus = (stageId: string) => {
    if (currentMode === 'plan') {
      return stageId === 'plan' ? 'active' : 'pending';
    }
    // In build mode, plan and confirm are done
    if (stageId === 'plan' || stageId === 'confirm') return 'completed';
    if (stageId === 'build') return 'active';
    return 'pending';
  };

  return (
    <Card className={cn("border-primary/20 bg-card/50", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TaskIcon className={cn("h-5 w-5", taskConfig.color)} />
            <CardTitle className="text-lg">OpenCode 编程工作流</CardTitle>
          </div>
          <Badge variant="outline" className={cn("text-xs", taskConfig.color)}>
            {taskConfig.label}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          {matchReason} (置信度: {Math.round(confidence * 100)}%)
        </p>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Current Mode Indicator */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">当前模式:</span>
          <OpenCodeModeIndicator mode={currentMode} />
        </div>
        
        {/* Workflow Stages */}
        <TooltipProvider>
          <div className="flex items-center justify-between gap-1 py-2">
            {WORKFLOW_STAGES.map((stage, index) => {
              const status = getStageStatus(stage.id);
              const StageIcon = stage.icon;
              const isActive = status === 'active';
              const isCompleted = status === 'completed';
              const isLast = index === WORKFLOW_STAGES.length - 1;
              
              // Hide test stage if not enabled
              if (stage.id === 'test' && !testRunnerEnabled) {
                return null;
              }
              
              return (
                <div key={stage.id} className="flex items-center">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div
                        className={cn(
                          "flex flex-col items-center gap-1 px-2 py-1 rounded-md transition-colors cursor-default",
                          isActive && "bg-primary/10",
                          isCompleted && "opacity-60"
                        )}
                      >
                        <div
                          className={cn(
                            "p-1.5 rounded-full",
                            isActive && "bg-primary text-primary-foreground",
                            isCompleted && "bg-success/20 text-success",
                            !isActive && !isCompleted && "bg-muted text-muted-foreground"
                          )}
                        >
                          <StageIcon className="h-3 w-3" />
                        </div>
                        <span
                          className={cn(
                            "text-[10px] font-medium",
                            isActive && "text-primary",
                            isCompleted && "text-success",
                            !isActive && !isCompleted && "text-muted-foreground"
                          )}
                        >
                          {stage.name}
                        </span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="text-xs">
                      <p className="font-medium">{stage.name}</p>
                      <p className="text-muted-foreground">{stage.description}</p>
                    </TooltipContent>
                  </Tooltip>
                  
                  {!isLast && stage.id !== 'test' && (
                    <ArrowRight className="h-3 w-3 text-muted-foreground mx-1" />
                  )}
                </div>
              );
            })}
          </div>
        </TooltipProvider>
        
        {/* Feature Flags */}
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary" className="text-xs">
            <Shield className="h-3 w-3 mr-1" />
            MPLP 审批
          </Badge>
          {styleCheckEnabled && (
            <Badge variant="secondary" className="text-xs">
              <CheckCircle className="h-3 w-3 mr-1" />
              风格检查
            </Badge>
          )}
          {testRunnerEnabled && (
            <Badge variant="secondary" className="text-xs">
              <TestTube className="h-3 w-3 mr-1" />
              测试运行
            </Badge>
          )}
        </div>
        
        {/* Environment Hint */}
        {environmentHint && (
          <div className="p-2 rounded-md bg-muted/50 text-xs text-muted-foreground">
            {environmentHint}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
