// 沙箱安全配置面板 (Sandbox Security Panel)

import { useState } from 'react';
import { 
  Shield, 
  Lock, 
  Unlock, 
  Globe, 
  Cpu, 
  HardDrive, 
  Clock, 
  Network, 
  Plus,
  ArrowRight,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Trash2,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useSandboxStore } from '@/stores/sandboxStore';
import { SECURITY_PRESETS, SecurityPresetKey, MPLP_NETWORK_MAPPINGS } from '@/types/networkPolicy';
import type { DomainRule } from '@/types/sandbox';
import { cn } from '@/lib/utils';

interface SandboxSecurityPanelProps {
  agentId?: string;
  className?: string;
}

export function SandboxSecurityPanel({ agentId, className }: SandboxSecurityPanelProps) {
  const store = useSandboxStore();
  const [isAddRuleOpen, setIsAddRuleOpen] = useState(false);
  const [newRulePattern, setNewRulePattern] = useState('');
  const [newRuleDescription, setNewRuleDescription] = useState('');

  const handleAddRule = () => {
    if (!newRulePattern) return;
    
    const newRule: DomainRule = {
      pattern: newRulePattern,
      protocols: ['https'],
      description: newRuleDescription || undefined,
    };
    
    store.setNetworkPolicy({
      whitelist: [...store.config.networkPolicy.whitelist, newRule],
    });
    
    setNewRulePattern('');
    setNewRuleDescription('');
    setIsAddRuleOpen(false);
  };

  const handleRemoveRule = (pattern: string) => {
    store.setNetworkPolicy({
      whitelist: store.config.networkPolicy.whitelist.filter(r => r.pattern !== pattern),
    });
  };

  const getPresetIcon = (preset: SecurityPresetKey) => {
    switch (preset) {
      case 'strict': return <Lock className="h-4 w-4 text-red-500" />;
      case 'balanced': return <Shield className="h-4 w-4 text-yellow-500" />;
      case 'permissive': return <Unlock className="h-4 w-4 text-green-500" />;
    }
  };

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          沙箱安全配置
        </CardTitle>
        <CardDescription>
          配置技能执行的资源限制和网络访问策略
        </CardDescription>
      </CardHeader>

      <CardContent>
        <Tabs defaultValue="preset" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="preset">安全级别</TabsTrigger>
            <TabsTrigger value="resources">资源限制</TabsTrigger>
            <TabsTrigger value="network">网络策略</TabsTrigger>
            <TabsTrigger value="mplp">MPLP 映射</TabsTrigger>
          </TabsList>

          {/* 安全预设 */}
          <TabsContent value="preset" className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              {(Object.entries(SECURITY_PRESETS) as [SecurityPresetKey, typeof SECURITY_PRESETS.strict][]).map(([key, value]) => (
                <Card
                  key={key}
                  className={cn(
                    "cursor-pointer transition-all hover:shadow-md",
                    store.currentPreset === key && "ring-2 ring-primary"
                  )}
                  onClick={() => store.setPreset(key)}
                >
                  <CardContent className="pt-4 pb-3">
                    <div className="flex items-center gap-2 mb-2">
                      {getPresetIcon(key)}
                      <span className="font-medium">{value.name}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {value.description}
                    </p>
                    <div className="mt-3 space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">CPU:</span>
                        <span>{value.limits.maxCpuMs}ms</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">内存:</span>
                        <span>{value.limits.maxMemoryMb}MB</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">网络:</span>
                        <span>{value.limits.maxNetworkRequests} 请求</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* 当前配置摘要 */}
            <Card className="bg-muted/50">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span className="font-medium">当前配置</span>
                  <Badge variant="secondary">{SECURITY_PRESETS[store.currentPreset].name}</Badge>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">网络模式: </span>
                    <span className="font-medium">{store.config.networkPolicy.mode}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">审计日志: </span>
                    <span className="font-medium">{store.config.auditEnabled ? '已启用' : '已禁用'}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 资源限制 */}
          <TabsContent value="resources" className="space-y-6">
            {/* CPU 时间 */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Cpu className="h-4 w-4 text-muted-foreground" />
                  <Label>CPU 时间限制</Label>
                </div>
                <span className="text-sm font-medium">{store.config.limits.maxCpuMs}ms</span>
              </div>
              <Slider
                value={[store.config.limits.maxCpuMs]}
                onValueChange={([value]) => store.setLimits({ maxCpuMs: value })}
                min={10}
                max={500}
                step={10}
              />
              <p className="text-xs text-muted-foreground">
                单次执行允许的最大 CPU 时间
              </p>
            </div>

            {/* 内存限制 */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <HardDrive className="h-4 w-4 text-muted-foreground" />
                  <Label>内存限制</Label>
                </div>
                <span className="text-sm font-medium">{store.config.limits.maxMemoryMb}MB</span>
              </div>
              <Slider
                value={[store.config.limits.maxMemoryMb]}
                onValueChange={([value]) => store.setLimits({ maxMemoryMb: value })}
                min={16}
                max={256}
                step={8}
              />
              <p className="text-xs text-muted-foreground">
                执行过程中允许的最大内存使用
              </p>
            </div>

            {/* 执行时间 */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <Label>执行超时</Label>
                </div>
                <span className="text-sm font-medium">{store.config.limits.maxExecutionMs / 1000}s</span>
              </div>
              <Slider
                value={[store.config.limits.maxExecutionMs]}
                onValueChange={([value]) => store.setLimits({ maxExecutionMs: value })}
                min={1000}
                max={60000}
                step={1000}
              />
              <p className="text-xs text-muted-foreground">
                执行超过此时间将被强制终止
              </p>
            </div>

            {/* 网络请求数 */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Network className="h-4 w-4 text-muted-foreground" />
                  <Label>网络请求限制</Label>
                </div>
                <span className="text-sm font-medium">{store.config.limits.maxNetworkRequests} 请求</span>
              </div>
              <Slider
                value={[store.config.limits.maxNetworkRequests]}
                onValueChange={([value]) => store.setLimits({ maxNetworkRequests: value })}
                min={1}
                max={100}
                step={1}
              />
              <p className="text-xs text-muted-foreground">
                单次执行允许的最大网络请求数量
              </p>
            </div>

            {/* 审计开关 */}
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>审计日志</Label>
                <p className="text-xs text-muted-foreground">
                  记录所有执行过程和网络访问
                </p>
              </div>
              <Switch
                checked={store.config.auditEnabled}
                onCheckedChange={(checked) => store.setConfig({ auditEnabled: checked })}
              />
            </div>
          </TabsContent>

          {/* 网络策略 */}
          <TabsContent value="network" className="space-y-4">
            {/* 网络模式 */}
            <div className="space-y-2">
              <Label>网络访问模式</Label>
              <Select
                value={store.config.networkPolicy.mode}
                onValueChange={(value: 'deny_all' | 'allow_whitelist' | 'mplp_controlled') => 
                  store.setNetworkPolicy({ mode: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="deny_all">
                    <div className="flex items-center gap-2">
                      <XCircle className="h-4 w-4 text-red-500" />
                      <span>全部拒绝</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="allow_whitelist">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-yellow-500" />
                      <span>白名单模式</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="mplp_controlled">
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-green-500" />
                      <span>MPLP 控制</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {store.config.networkPolicy.mode === 'deny_all' && '拒绝所有网络请求'}
                {store.config.networkPolicy.mode === 'allow_whitelist' && '仅允许白名单中的域名'}
                {store.config.networkPolicy.mode === 'mplp_controlled' && '根据 MPLP 权限动态控制网络访问'}
              </p>
            </div>

            {/* 域名白名单 */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>域名白名单</Label>
                <Dialog open={isAddRuleOpen} onOpenChange={setIsAddRuleOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Plus className="h-4 w-4 mr-1" />
                      添加规则
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>添加域名规则</DialogTitle>
                      <DialogDescription>
                        添加允许访问的域名，支持通配符 (*.example.com)
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label>域名模式</Label>
                        <Input
                          placeholder="例如: *.example.com 或 api.example.com"
                          value={newRulePattern}
                          onChange={(e) => setNewRulePattern(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>描述 (可选)</Label>
                        <Input
                          placeholder="规则用途说明"
                          value={newRuleDescription}
                          onChange={(e) => setNewRuleDescription(e.target.value)}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsAddRuleOpen(false)}>
                        取消
                      </Button>
                      <Button onClick={handleAddRule} disabled={!newRulePattern}>
                        添加
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>

              <ScrollArea className="h-[200px]">
                <div className="space-y-2">
                  {/* 内置规则 */}
                  <div className="p-3 flex items-center justify-between bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4 text-green-500" />
                      <span className="text-sm">*.supabase.co</span>
                    </div>
                    <Badge variant="secondary">内置</Badge>
                  </div>

                  {/* 用户规则 */}
                  {store.config.networkPolicy.whitelist
                    .filter(r => r.pattern !== '*.supabase.co')
                    .map((rule) => (
                      <div 
                        key={rule.pattern} 
                        className="p-3 flex items-center justify-between border rounded-lg"
                      >
                        <div className="flex items-center gap-2">
                          <Globe className="h-4 w-4 text-blue-500" />
                          <div>
                            <span className="text-sm">{rule.pattern}</span>
                            {rule.description && (
                              <p className="text-xs text-muted-foreground">{rule.description}</p>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleRemoveRule(rule.pattern)}
                        >
                          <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                        </Button>
                      </div>
                    ))}

                  {store.config.networkPolicy.whitelist.length <= 1 && (
                    <div className="text-center text-sm text-muted-foreground py-4">
                      暂无自定义规则
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>
          </TabsContent>

          {/* MPLP 映射 */}
          <TabsContent value="mplp" className="space-y-4">
            <div className="space-y-2">
              <Label>MPLP 权限 → 网络域名映射</Label>
              <p className="text-xs text-muted-foreground">
                当技能获得某项 MPLP 权限时，自动允许访问对应的域名
              </p>
            </div>

            <ScrollArea className="h-[300px]">
              <div className="space-y-2">
                {Object.entries(MPLP_NETWORK_MAPPINGS).map(([permission, domains]) => (
                  <div key={permission} className="p-3 border rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline" className="font-mono text-xs">
                        {permission}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                      {domains.map((domain) => (
                        <Badge key={domain} variant="secondary" className="text-xs">
                          {domain}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            <Card className="bg-amber-500/10 border-amber-500/20">
              <CardContent className="pt-4">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                  <div className="text-sm">
                    <p className="font-medium text-amber-600 dark:text-amber-400">安全提示</p>
                    <p className="text-muted-foreground mt-1">
                      MPLP 权限映射确保只有用户明确授权的网络访问才会被允许。
                      未授权的域名请求将在网络层被拦截，而不仅仅依靠代码检查。
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* 统计信息 */}
        <Separator className="my-4" />
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold">{store.totalExecutions}</p>
            <p className="text-xs text-muted-foreground">总执行次数</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-green-500">{store.totalAllowedRequests}</p>
            <p className="text-xs text-muted-foreground">允许的请求</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-red-500">{store.totalBlockedRequests}</p>
            <p className="text-xs text-muted-foreground">拦截的请求</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
