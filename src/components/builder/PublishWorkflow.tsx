/**
 * @file PublishWorkflow.tsx
 * @description 完整的发布工作流组件
 */

import { useState } from 'react';
import { 
  Rocket, 
  CheckCircle, 
  AlertTriangle, 
  Clock,
  ArrowRight,
  ArrowLeft,
  Shield,
  Settings,
  FileText,
  BarChart,
  Eye,
  GitBranch,
} from 'lucide-react';
import { Button } from '../ui/button.tsx';
import { Badge } from '../ui/badge.tsx';
import { Progress } from '../ui/progress.tsx';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card.tsx';
import { Input } from '../ui/input.tsx';
import { Textarea } from '../ui/textarea.tsx';
import { Label } from '../ui/label.tsx';
import { Switch } from '../ui/switch.tsx';
import { ScrollArea } from '../ui/scroll-area.tsx';
import { PublishChecklist, type ChecklistItem } from './PublishChecklist.tsx';
import { cn } from '../../lib/utils.ts';

interface PublishWorkflowProps {
  agentId: string;
  agentName: string;
  currentVersion?: string;
  onPublish: (config: PublishConfig) => Promise<void>;
  onCancel: () => void;
}

export interface PublishConfig {
  version: string;
  changelog: string;
  enableABTest: boolean;
  abTestPercentage: number;
  autoRollbackThreshold: number;
  notifyUsers: boolean;
}

type PublishStep = 'checklist' | 'preview' | 'config' | 'confirm';

const steps: { id: PublishStep; label: string; icon: React.ElementType }[] = [
  { id: 'checklist', label: '预检查', icon: Shield },
  { id: 'preview', label: '发布预览', icon: Eye },
  { id: 'config', label: '发布配置', icon: Settings },
  { id: 'confirm', label: '确认发布', icon: Rocket },
];

export function PublishWorkflow({ 
  agentId, 
  agentName, 
  currentVersion = '1.0.0',
  onPublish, 
  onCancel 
}: PublishWorkflowProps) {
  const [currentStep, setCurrentStep] = useState<PublishStep>('checklist');
  const [isPublishing, setIsPublishing] = useState(false);
  const [checklistPassed, setChecklistPassed] = useState(false);
  const [config, setConfig] = useState<PublishConfig>({
    version: incrementVersion(currentVersion),
    changelog: '',
    enableABTest: false,
    abTestPercentage: 10,
    autoRollbackThreshold: 5,
    notifyUsers: true,
  });

  const currentStepIndex = steps.findIndex(s => s.id === currentStep);

  const handleNext = () => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < steps.length) {
      setCurrentStep(steps[nextIndex].id);
    }
  };

  const handlePrev = () => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setCurrentStep(steps[prevIndex].id);
    }
  };

  const handlePublish = async () => {
    setIsPublishing(true);
    try {
      await onPublish(config);
    } finally {
      setIsPublishing(false);
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 'checklist':
        return checklistPassed;
      case 'preview':
        return true;
      case 'config':
        return config.version.trim() !== '';
      case 'confirm':
        return true;
      default:
        return false;
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <Rocket className="h-5 w-5 text-primary" />
          <h2 className="font-semibold">发布 {agentName}</h2>
        </div>
        <Badge variant="outline">{currentVersion} → {config.version}</Badge>
      </div>

      {/* Step Indicator */}
      <div className="px-4 py-3 border-b bg-muted/30">
        <div className="flex items-center justify-between">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const isActive = step.id === currentStep;
            const isCompleted = index < currentStepIndex;

            return (
              <div key={step.id} className="flex items-center">
                <div className={cn(
                  'flex items-center gap-2 px-3 py-1.5 rounded-full transition-colors',
                  isActive && 'bg-primary text-primary-foreground',
                  isCompleted && 'bg-green-500/10 text-green-600',
                  !isActive && !isCompleted && 'text-muted-foreground'
                )}>
                  {isCompleted ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : (
                    <Icon className="h-4 w-4" />
                  )}
                  <span className="text-sm font-medium hidden sm:inline">{step.label}</span>
                </div>
                {index < steps.length - 1 && (
                  <ArrowRight className="h-4 w-4 mx-2 text-muted-foreground" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-4">
          {currentStep === 'checklist' && (
            <PublishChecklist 
              agentId={agentId}
              onCheckComplete={setChecklistPassed}
            />
          )}

          {currentStep === 'preview' && (
            <PreviewStep agentName={agentName} config={config} />
          )}

          {currentStep === 'config' && (
            <ConfigStep config={config} onChange={setConfig} />
          )}

          {currentStep === 'confirm' && (
            <ConfirmStep 
              agentName={agentName} 
              config={config}
              isPublishing={isPublishing}
            />
          )}
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="flex items-center justify-between p-4 border-t bg-card">
        <Button variant="outline" onClick={currentStepIndex === 0 ? onCancel : handlePrev}>
          {currentStepIndex === 0 ? '取消' : (
            <>
              <ArrowLeft className="h-4 w-4 mr-1" />
              上一步
            </>
          )}
        </Button>

        {currentStep === 'confirm' ? (
          <Button 
            onClick={handlePublish} 
            disabled={isPublishing || !canProceed()}
          >
            {isPublishing ? (
              <>
                <Clock className="h-4 w-4 mr-2 animate-spin" />
                发布中...
              </>
            ) : (
              <>
                <Rocket className="h-4 w-4 mr-2" />
                确认发布
              </>
            )}
          </Button>
        ) : (
          <Button onClick={handleNext} disabled={!canProceed()}>
            下一步
            <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        )}
      </div>
    </div>
  );
}

// 预览步骤
function PreviewStep({ agentName, config }: { agentName: string; config: PublishConfig }) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">发布预览</CardTitle>
          <CardDescription>预览即将发布的版本信息</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between py-2 border-b">
            <span className="text-sm text-muted-foreground">智能体名称</span>
            <span className="font-medium">{agentName}</span>
          </div>
          <div className="flex items-center justify-between py-2 border-b">
            <span className="text-sm text-muted-foreground">新版本号</span>
            <Badge>{config.version}</Badge>
          </div>
          <div className="flex items-center justify-between py-2 border-b">
            <span className="text-sm text-muted-foreground">A/B 测试</span>
            <span>{config.enableABTest ? `${config.abTestPercentage}%` : '禁用'}</span>
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-sm text-muted-foreground">自动回滚阈值</span>
            <span>错误率 &gt; {config.autoRollbackThreshold}%</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <BarChart className="h-4 w-4" />
            预计影响
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-center">
            <div className="p-3 rounded-lg bg-muted/50">
              <div className="text-2xl font-bold text-primary">~500</div>
              <div className="text-xs text-muted-foreground">受影响用户</div>
            </div>
            <div className="p-3 rounded-lg bg-muted/50">
              <div className="text-2xl font-bold text-green-500">0</div>
              <div className="text-xs text-muted-foreground">预计停机时间</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// 配置步骤
function ConfigStep({ 
  config, 
  onChange 
}: { 
  config: PublishConfig; 
  onChange: (config: PublishConfig) => void;
}) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <GitBranch className="h-4 w-4" />
            版本信息
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>版本号</Label>
            <Input 
              value={config.version}
              onChange={(e) => onChange({ ...config, version: e.target.value })}
              placeholder="1.0.0"
            />
          </div>
          <div className="space-y-2">
            <Label>变更日志</Label>
            <Textarea 
              value={config.changelog}
              onChange={(e) => onChange({ ...config, changelog: e.target.value })}
              placeholder="描述此版本的主要变更..."
              rows={4}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Settings className="h-4 w-4" />
            发布策略
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>启用 A/B 测试</Label>
              <p className="text-xs text-muted-foreground">逐步将流量切换到新版本</p>
            </div>
            <Switch 
              checked={config.enableABTest}
              onCheckedChange={(checked) => onChange({ ...config, enableABTest: checked })}
            />
          </div>

          {config.enableABTest && (
            <div className="space-y-2 pl-4 border-l-2 border-primary/20">
              <Label>新版本流量比例: {config.abTestPercentage}%</Label>
              <input 
                type="range"
                min={5}
                max={100}
                step={5}
                value={config.abTestPercentage}
                onChange={(e) => onChange({ ...config, abTestPercentage: parseInt(e.target.value) })}
                className="w-full"
              />
            </div>
          )}

          <div className="space-y-2">
            <Label>自动回滚阈值 (错误率 %)</Label>
            <Input 
              type="number"
              min={1}
              max={50}
              value={config.autoRollbackThreshold}
              onChange={(e) => onChange({ ...config, autoRollbackThreshold: parseInt(e.target.value) })}
            />
            <p className="text-xs text-muted-foreground">
              当错误率超过此阈值时自动回滚到上一版本
            </p>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>通知用户</Label>
              <p className="text-xs text-muted-foreground">发送更新通知给活跃用户</p>
            </div>
            <Switch 
              checked={config.notifyUsers}
              onCheckedChange={(checked) => onChange({ ...config, notifyUsers: checked })}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// 确认步骤
function ConfirmStep({ 
  agentName, 
  config,
  isPublishing,
}: { 
  agentName: string; 
  config: PublishConfig;
  isPublishing: boolean;
}) {
  return (
    <div className="space-y-4">
      <Card className="border-primary/50">
        <CardContent className="p-6 text-center">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Rocket className="h-8 w-8 text-primary" />
          </div>
          <h3 className="text-lg font-semibold mb-2">准备发布</h3>
          <p className="text-muted-foreground">
            即将发布 <strong>{agentName}</strong> 版本 <Badge>{config.version}</Badge>
          </p>
        </CardContent>
      </Card>

      {config.changelog && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <FileText className="h-4 w-4" />
              变更日志
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {config.changelog}
            </p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-4">
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              {config.enableABTest ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-yellow-500" />
              )}
              <span>
                {config.enableABTest 
                  ? `A/B 测试已启用 (${config.abTestPercentage}%)` 
                  : '直接全量发布'
                }
              </span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span>自动回滚阈值: {config.autoRollbackThreshold}%</span>
            </div>
            <div className="flex items-center gap-2">
              {config.notifyUsers ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-yellow-500" />
              )}
              <span>
                {config.notifyUsers ? '将通知用户' : '不通知用户'}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {isPublishing && (
        <Card className="border-primary">
          <CardContent className="p-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>正在发布...</span>
                <span>请勿关闭窗口</span>
              </div>
              <Progress value={45} className="h-2" />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// 版本号递增
function incrementVersion(version: string): string {
  const parts = version.split('.').map(Number);
  if (parts.length === 3) {
    parts[2]++;
    return parts.join('.');
  }
  return '1.0.1';
}
