// 网络策略编辑器 (Network Policy Editor)

import { useState } from 'react';
import {
  Globe,
  Plus,
  Trash2,
  Save,
  RotateCcw,
  Shield,
  Lock,
  Unlock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card.tsx';
import { Button } from '../ui/button.tsx';
import { Badge } from '../ui/badge.tsx';
import { Input } from '../ui/input.tsx';
import { Label } from '../ui/label.tsx';
import { Textarea } from '../ui/textarea.tsx';
import { ScrollArea } from '../ui/scroll-area.tsx';
import { Separator } from '../ui/separator.tsx';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select.tsx';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../ui/dialog.tsx';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '../ui/alert.tsx';
import { Checkbox } from '../ui/checkbox.tsx';
import { useNetworkPolicy } from '../../hooks/useNetworkPolicy.ts';
import { SECURITY_PRESETS, SecurityPresetKey, COMMON_DOMAIN_RULES } from '../../types/networkPolicy.ts';
import type { DomainRule, NetworkPolicy } from '../../types/sandbox.ts';
import { cn } from '../../lib/utils.ts';

interface NetworkPolicyEditorProps {
  onSave?: (policy: NetworkPolicy) => void;
  className?: string;
}

export function NetworkPolicyEditor({ onSave, className }: NetworkPolicyEditorProps) {
  const {
    currentPolicy,
    setCurrentPolicy,
    createPolicy,
    policies,
    applyPreset,
    checkDomain,
  } = useNetworkPolicy();

  const [policyName, setPolicyName] = useState('');
  const [policyDescription, setPolicyDescription] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [testDomain, setTestDomain] = useState('');
  const [testResult, setTestResult] = useState<{ allowed: boolean; reason?: string } | null>(null);
  const [testPermissions, setTestPermissions] = useState<string[]>([]);

  // 新规则表单
  const [newRule, setNewRule] = useState<Partial<DomainRule>>({
    pattern: '',
    protocols: ['https'],
    description: '',
  });

  const handleAddRule = () => {
    if (!newRule.pattern || !currentPolicy) return;
    
    const rule: DomainRule = {
      pattern: newRule.pattern,
      protocols: newRule.protocols as ('http' | 'https' | 'ws' | 'wss')[],
      description: newRule.description || undefined,
    };
    
    setCurrentPolicy({
      ...currentPolicy,
      whitelist: [...currentPolicy.whitelist, rule],
    });
    
    setNewRule({ pattern: '', protocols: ['https'], description: '' });
  };

  const handleRemoveRule = (pattern: string) => {
    if (!currentPolicy) return;
    
    setCurrentPolicy({
      ...currentPolicy,
      whitelist: currentPolicy.whitelist.filter(r => r.pattern !== pattern),
    });
  };

  const handleAddCommonRule = (rule: DomainRule) => {
    if (!currentPolicy) return;
    
    // 检查是否已存在
    if (currentPolicy.whitelist.some(r => r.pattern === rule.pattern)) {
      return;
    }
    
    setCurrentPolicy({
      ...currentPolicy,
      whitelist: [...currentPolicy.whitelist, rule],
    });
  };

  const handleSavePolicy = async () => {
    if (!currentPolicy || !policyName) return;
    
    await createPolicy(policyName, currentPolicy, policyDescription);
    onSave?.(currentPolicy);
    setIsCreateOpen(false);
    setPolicyName('');
    setPolicyDescription('');
  };

  const handleTestDomain = () => {
    if (!testDomain) return;
    const result = checkDomain(testDomain, testPermissions);
    setTestResult(result);
  };

  const handleReset = () => {
    applyPreset('balanced');
    setTestDomain('');
    setTestResult(null);
  };

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe className="h-5 w-5 text-primary" />
          网络策略编辑器
        </CardTitle>
        <CardDescription>
          配置允许访问的域名和网络规则
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* 快速预设 */}
        <div className="space-y-2">
          <Label>快速应用预设</Label>
          <div className="flex gap-2">
            {(Object.keys(SECURITY_PRESETS) as SecurityPresetKey[]).map((key) => (
              <Button
                key={key}
                variant="outline"
                size="sm"
                onClick={() => applyPreset(key)}
                className="flex items-center gap-1"
              >
                {key === 'strict' && <Lock className="h-3 w-3" />}
                {key === 'balanced' && <Shield className="h-3 w-3" />}
                {key === 'permissive' && <Unlock className="h-3 w-3" />}
                {SECURITY_PRESETS[key].name}
              </Button>
            ))}
          </div>
        </div>

        <Separator />

        {/* 网络模式选择 */}
        <div className="space-y-2">
          <Label>网络访问模式</Label>
          <Select
            value={currentPolicy?.mode || 'mplp_controlled'}
            onValueChange={(value: 'deny_all' | 'allow_whitelist' | 'mplp_controlled') => {
              if (currentPolicy) {
                setCurrentPolicy({ ...currentPolicy, mode: value });
              }
            }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="deny_all">
                <div className="flex items-center gap-2">
                  <XCircle className="h-4 w-4 text-red-500" />
                  <div>
                    <span className="font-medium">全部拒绝</span>
                    <span className="text-muted-foreground ml-2">- 最严格</span>
                  </div>
                </div>
              </SelectItem>
              <SelectItem value="allow_whitelist">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-yellow-500" />
                  <div>
                    <span className="font-medium">白名单模式</span>
                    <span className="text-muted-foreground ml-2">- 仅允许列表中的域名</span>
                  </div>
                </div>
              </SelectItem>
              <SelectItem value="mplp_controlled">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-green-500" />
                  <div>
                    <span className="font-medium">MPLP 控制</span>
                    <span className="text-muted-foreground ml-2">- 根据权限动态控制</span>
                  </div>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* 域名白名单 */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>域名白名单</Label>
            <span className="text-xs text-muted-foreground">
              {currentPolicy?.whitelist.length || 0} 条规则
            </span>
          </div>

          {/* 添加规则表单 */}
          <div className="flex gap-2">
            <Input
              placeholder="域名模式 (例如: *.example.com)"
              value={newRule.pattern}
              onChange={(e) => setNewRule({ ...newRule, pattern: e.target.value })}
              className="flex-1"
            />
            <Button onClick={handleAddRule} disabled={!newRule.pattern}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {/* 规则列表 */}
          <ScrollArea className="h-[200px] border rounded-lg">
            <div className="p-2 space-y-2">
              {currentPolicy?.whitelist.map((rule) => (
                <div 
                  key={rule.pattern} 
                  className="flex items-center justify-between p-2 bg-muted/50 rounded-md"
                >
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <span className="text-sm font-mono">{rule.pattern}</span>
                      {rule.description && (
                        <p className="text-xs text-muted-foreground">{rule.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      {rule.protocols?.map((p) => (
                        <Badge key={p} variant="outline" className="text-xs">
                          {p}
                        </Badge>
                      ))}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => handleRemoveRule(rule.pattern)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}

              {(!currentPolicy?.whitelist || currentPolicy.whitelist.length === 0) && (
                <div className="text-center text-sm text-muted-foreground py-8">
                  暂无规则，点击上方添加
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* 常用规则 */}
        <div className="space-y-2">
          <Label>常用域名规则</Label>
          <div className="flex flex-wrap gap-2">
            {COMMON_DOMAIN_RULES.map((rule) => {
              const isAdded = currentPolicy?.whitelist.some(r => r.pattern === rule.pattern);
              return (
                <Button
                  key={rule.pattern}
                  variant={isAdded ? "secondary" : "outline"}
                  size="sm"
                  onClick={() => handleAddCommonRule(rule)}
                  disabled={isAdded}
                  className="text-xs"
                >
                  {isAdded ? <CheckCircle2 className="h-3 w-3 mr-1" /> : <Plus className="h-3 w-3 mr-1" />}
                  {rule.description || rule.pattern}
                </Button>
              );
            })}
          </div>
        </div>

        <Separator />

        {/* 测试域名 */}
        <div className="space-y-3">
          <Label>测试域名访问</Label>
          <div className="flex gap-2">
            <Input
              placeholder="输入域名进行测试 (例如: api.openai.com)"
              value={testDomain}
              onChange={(e) => {
                setTestDomain(e.target.value);
                setTestResult(null);
              }}
              className="flex-1"
            />
            <Button onClick={handleTestDomain} variant="secondary">
              测试
            </Button>
          </div>

          {testResult && (
            <Alert variant={testResult.allowed ? "default" : "destructive"}>
              {testResult.allowed ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <XCircle className="h-4 w-4" />
              )}
              <AlertTitle>
                {testResult.allowed ? '允许访问' : '访问被拒绝'}
              </AlertTitle>
              <AlertDescription>
                {testResult.reason || `域名 ${testDomain} ${testResult.allowed ? '在白名单中' : '未被授权'}`}
              </AlertDescription>
            </Alert>
          )}
        </div>

        {/* 操作按钮 */}
        <div className="flex justify-between">
          <Button variant="outline" onClick={handleReset}>
            <RotateCcw className="h-4 w-4 mr-2" />
            重置
          </Button>

          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Save className="h-4 w-4 mr-2" />
                保存策略
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>保存网络策略</DialogTitle>
                <DialogDescription>
                  将当前配置保存为可复用的网络策略
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>策略名称</Label>
                  <Input
                    placeholder="例如: 生产环境策略"
                    value={policyName}
                    onChange={(e) => setPolicyName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>描述 (可选)</Label>
                  <Textarea
                    placeholder="描述此策略的用途..."
                    value={policyDescription}
                    onChange={(e) => setPolicyDescription(e.target.value)}
                  />
                </div>
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm font-medium mb-2">策略摘要</p>
                  <div className="text-xs text-muted-foreground space-y-1">
                    <p>模式: {currentPolicy?.mode}</p>
                    <p>白名单规则: {currentPolicy?.whitelist.length || 0} 条</p>
                    <p>MPLP 绑定: {currentPolicy?.mplpBindings.length || 0} 条</p>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                  取消
                </Button>
                <Button onClick={handleSavePolicy} disabled={!policyName}>
                  保存
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* 安全提示 */}
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>安全提示</AlertTitle>
          <AlertDescription>
            网络策略在边缘函数层面强制执行。即使代码中尝试访问未授权的域名，
            请求也会被底层拦截并记录到审计日志中。
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}
