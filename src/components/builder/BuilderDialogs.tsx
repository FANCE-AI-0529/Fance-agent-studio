import { Node, Edge } from "@xyflow/react";
import { CheckCircle, Play } from "lucide-react";
import { Button } from "../ui/button.tsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog.tsx";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../ui/alert-dialog.tsx";
import { ScrollArea } from "../ui/scroll-area.tsx";
import { ApiStatsDashboard } from "./ApiStatsDashboard.tsx";
import { GenerationVerificationPanel } from "./verification/index.ts";
import { AgentMonitoringDashboard } from "./AgentMonitoringDashboard.tsx";
import { EvaluationCenter } from "./evaluation/EvaluationCenter.tsx";
import { WorkflowRunDialog } from "./WorkflowRunDialog.tsx";
import { SimpleAgentConfig } from "./SimplifiedConfigPanel.tsx";

interface BuilderDialogsProps {
  agentConfig: SimpleAgentConfig;
  currentAgentId: string | null;
  // Stats
  showStatsPanel: boolean;
  setShowStatsPanel: (v: boolean) => void;
  // Deploy success
  showDeploySuccessDialog: boolean;
  setShowDeploySuccessDialog: (v: boolean) => void;
  onGoToRuntime: () => void;
  onSetupApi: () => void;
  // Delete confirm
  showDeleteConfirm: boolean;
  setShowDeleteConfirm: (v: boolean) => void;
  onDeleteAgent: () => void;
  isDeleting: boolean;
  // Deploy confirm (inspiration)
  showDeployConfirmDialog: boolean;
  setShowDeployConfirmDialog: (v: boolean) => void;
  onDeploy: () => void;
  // Verification
  showVerificationPanel: boolean;
  setShowVerificationPanel: (v: boolean) => void;
  // Monitoring
  showMonitoringPanel: boolean;
  setShowMonitoringPanel: (v: boolean) => void;
  // Evaluation
  showEvaluationPanel: boolean;
  setShowEvaluationPanel: (v: boolean) => void;
  // Run dialog
  showRunDialog: boolean;
  setShowRunDialog: (v: boolean) => void;
  isWorkflowRunning: boolean;
  nodes: Node[];
  edges: Edge[];
  onRunWorkflow: (inputs: Record<string, unknown>) => void;
}

export function BuilderDialogs({
  agentConfig,
  currentAgentId,
  showStatsPanel,
  setShowStatsPanel,
  showDeploySuccessDialog,
  setShowDeploySuccessDialog,
  onGoToRuntime,
  onSetupApi,
  showDeleteConfirm,
  setShowDeleteConfirm,
  onDeleteAgent,
  isDeleting,
  showDeployConfirmDialog,
  setShowDeployConfirmDialog,
  onDeploy,
  showVerificationPanel,
  setShowVerificationPanel,
  showMonitoringPanel,
  setShowMonitoringPanel,
  showEvaluationPanel,
  setShowEvaluationPanel,
  showRunDialog,
  setShowRunDialog,
  isWorkflowRunning,
  nodes,
  edges,
  onRunWorkflow,
}: BuilderDialogsProps) {
  return (
    <>
      {/* Workflow Run Dialog */}
      <WorkflowRunDialog
        open={showRunDialog}
        onOpenChange={setShowRunDialog}
        isRunning={isWorkflowRunning}
        nodes={nodes}
        onRun={onRunWorkflow}
      />

      {/* API Stats Dialog */}
      {showStatsPanel && currentAgentId && (
        <Dialog open={showStatsPanel} onOpenChange={setShowStatsPanel}>
          <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>API 调用统计</DialogTitle>
            </DialogHeader>
            <ApiStatsDashboard agentId={currentAgentId} apiKeyIds={[]} />
          </DialogContent>
        </Dialog>
      )}

      {/* Deploy Success Dialog */}
      <Dialog open={showDeploySuccessDialog} onOpenChange={setShowDeploySuccessDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-full bg-status-success/10 flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-status-success" />
              </div>
              <div>
                <DialogTitle>智能体部署成功！</DialogTitle>
                <DialogDescription className="mt-1">
                  「{agentConfig.name}」已成功部署到云端
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground mb-4">
              部署成功后，您可以在运行终端中测试智能体，或设置 API 密钥以供外部调用。
            </p>
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle className="h-4 w-4 text-status-success" />
                <span>智能体配置已保存</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle className="h-4 w-4 text-status-success" />
                <span>云端部署完成</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle className="h-4 w-4 text-status-success" />
                <span>可在运行终端中开始对话</span>
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={onSetupApi}>设置 API 密钥</Button>
            <Button onClick={onGoToRuntime} className="gap-2">
              稍后设置，前往运行环境
              <Play className="h-4 w-4 ml-2" />
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确定删除此智能体？</AlertDialogTitle>
            <AlertDialogDescription>
              此操作将永久删除「{agentConfig.name}」及其所有配置和关联数据。此操作不可撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>取消</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={onDeleteAgent}
              disabled={isDeleting}
            >
              {isDeleting ? "删除中..." : "确认删除"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Deploy Confirm Dialog (after inspiration) */}
      <Dialog open={showDeployConfirmDialog} onOpenChange={setShowDeployConfirmDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-full bg-status-success/10 flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-status-success" />
              </div>
              <div>
                <DialogTitle>智能体生成完成！</DialogTitle>
                <DialogDescription className="mt-1">
                  「{agentConfig.name}」已成功创建并保存
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground mb-4">是否立即部署使其可以真实使用？</p>
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle className="h-4 w-4 text-status-success" />
                <span>画布已显示完整工作流</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle className="h-4 w-4 text-status-success" />
                <span>智能体配置已保存</span>
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowDeployConfirmDialog(false)}>稍后部署</Button>
            <Button onClick={onDeploy} className="gap-2">
              <Play className="h-4 w-4" />
              立即部署
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Verification Test Panel */}
      <Dialog open={showVerificationPanel} onOpenChange={setShowVerificationPanel}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>一键生成链路验证</DialogTitle>
            <DialogDescription>验证语义搜索、拓扑生成、自动布线和合规注入的完整流程</DialogDescription>
          </DialogHeader>
          <GenerationVerificationPanel />
        </DialogContent>
      </Dialog>

      {/* Monitoring Dashboard */}
      <Dialog open={showMonitoringPanel} onOpenChange={setShowMonitoringPanel}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Agent 监控仪表板</DialogTitle>
            <DialogDescription>实时监控 Agent 运行状态、调用统计和健康指标</DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[65vh]">
            <AgentMonitoringDashboard agentId={currentAgentId} />
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Evaluation Center */}
      <Dialog open={showEvaluationPanel} onOpenChange={setShowEvaluationPanel}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden p-0">
          <EvaluationCenter
            agentId={currentAgentId || ''}
            agentConfig={{
              name: agentConfig.name,
              systemPrompt: agentConfig.systemPrompt,
              department: agentConfig.department,
              model: agentConfig.model,
            }}
            onClose={() => setShowEvaluationPanel(false)}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
