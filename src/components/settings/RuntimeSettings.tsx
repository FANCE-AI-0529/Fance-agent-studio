// 运行时设置页面 (Runtime Settings)

import { useState } from 'react';
import { Server, Cloud, Wifi, WifiOff, RefreshCw, Settings, CheckCircle, XCircle, Loader2, Clock } from 'lucide-react';
import { supabase } from '../../integrations/supabase/client.ts';
import { cn } from '../../lib/utils.ts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card.tsx';
import { Button } from '../ui/button.tsx';
import { Badge } from '../ui/badge.tsx';
import { Input } from '../ui/input.tsx';
import { Label } from '../ui/label.tsx';
import { Switch } from '../ui/switch.tsx';
import { Separator } from '../ui/separator.tsx';
import { useToast } from '../../hooks/use-toast.ts';
import { useRuntimeStore } from '../../stores/runtimeStore.ts';
import type { RuntimeMode } from '../../types/runtime.ts';

export function RuntimeSettings() {
  const { toast } = useToast();
  const store = useRuntimeStore();
  const [isTesting, setIsTesting] = useState(false);
  const [nanoclawConfig, setNanoclawConfig] = useState({
    endpoint: store.config.nanoclaw.endpoint,
    port: String(store.config.nanoclaw.port),
    authToken: store.config.nanoclaw.authToken,
  });

  const handleModeSwitch = (mode: RuntimeMode) => {
    store.setMode(mode);
    toast({
      title: `运行时已切换到 ${mode === 'cloud' ? '云端' : 'NanoClaw'} 模式`,
    });
  };

  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  const handleTestConnection = async () => {
    setIsTesting(true);
    setConnectionError(null);
    setLatencyMs(null);
    store.setConnectionStatus('connecting');

    const fullEndpoint = `${nanoclawConfig.endpoint}:${nanoclawConfig.port}`;
    const startTime = Date.now();

    try {
      const { data, error } = await supabase.functions.invoke('nanoclaw-gateway', {
        body: {
          action: 'health',
          nanoclawEndpoint: fullEndpoint,
          authToken: nanoclawConfig.authToken,
        },
      });

      const elapsed = Date.now() - startTime;
      setLatencyMs(elapsed);

      if (error) {
        throw new Error(error.message || '网关调用失败');
      }

      if (data?.status === 'ok' || data?.version) {
        store.setConnectionStatus('connected');
        store.setNanoclawVersion(data.version || 'unknown');
        toast({
          title: '连接成功',
          description: `NanoClaw v${data.version || '?'} 已就绪 (${elapsed}ms)`,
        });
      } else if (data?.error) {
        throw new Error(data.error);
      } else {
        throw new Error('健康检查返回异常数据');
      }
    } catch (err: any) {
      const elapsed = Date.now() - startTime;
      setLatencyMs(elapsed);
      store.setConnectionStatus('error');

      let errorMsg = err.message || '未知错误';
      if (errorMsg.includes('401') || errorMsg.includes('Unauthorized')) {
        errorMsg = '认证失败 — 请检查认证令牌';
      } else if (errorMsg.includes('fetch') || errorMsg.includes('network') || errorMsg.includes('ECONNREFUSED')) {
        errorMsg = '网络不通 — 请检查地址和端口是否正确';
      } else if (errorMsg.includes('timeout') || errorMsg.includes('Timeout')) {
        errorMsg = '连接超时 — 服务器无响应';
      } else if (errorMsg.includes('Blocked endpoint')) {
        errorMsg = '安全拦截 — 该端点地址不被允许';
      }

      setConnectionError(errorMsg);
      toast({
        title: '连接失败',
        description: errorMsg,
        variant: 'destructive',
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSaveConfig = () => {
    store.setConfig({
      nanoclaw: {
        ...store.config.nanoclaw,
        endpoint: nanoclawConfig.endpoint,
        port: parseInt(nanoclawConfig.port) || 3100,
        authToken: nanoclawConfig.authToken,
      },
    });
    toast({ title: '配置已保存' });
  };

  const statusIcon = {
    connected: <CheckCircle className="h-4 w-4 text-primary" />,
    disconnected: <WifiOff className="h-4 w-4 text-muted-foreground" />,
    connecting: <Loader2 className="h-4 w-4 text-status-planning animate-spin" />,
    reconnecting: <RefreshCw className="h-4 w-4 text-status-confirm animate-spin" />,
    error: <XCircle className="h-4 w-4 text-destructive" />,
  };

  return (
    <div className="space-y-6">
      {/* 运行时模式选择 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Settings className="h-4 w-4" />
            运行时模式
          </CardTitle>
          <CardDescription>选择智能体的执行环境</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <ModeCard
              icon={<Cloud className="h-5 w-5" />}
              title="Cloud Runtime"
              description="使用 Fance Cloud 的 Edge Functions 执行（默认）"
              active={store.mode === 'cloud'}
              onClick={() => handleModeSwitch('cloud')}
            />
            <ModeCard
              icon={<Server className="h-5 w-5" />}
              title="NanoClaw Runtime"
              description="连接自托管的 NanoClaw 实例，支持容器隔离和 Agent Swarms"
              active={store.mode === 'nanoclaw'}
              onClick={() => handleModeSwitch('nanoclaw')}
            />
          </div>
        </CardContent>
      </Card>

      {/* NanoClaw 连接配置 */}
      {store.mode === 'nanoclaw' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Server className="h-4 w-4" />
                  NanoClaw 实例配置
                </CardTitle>
                <CardDescription>配置自托管 NanoClaw 实例的连接信息</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                {statusIcon[store.connectionStatus]}
                <Badge variant={store.connectionStatus === 'connected' ? 'default' : 'secondary'}>
                  {store.connectionStatus}
                </Badge>
                {store.nanoclawVersion && (
                  <Badge variant="outline" className="font-mono text-[10px]">
                    v{store.nanoclawVersion}
                  </Badge>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="endpoint">服务地址</Label>
                <Input
                  id="endpoint"
                  value={nanoclawConfig.endpoint}
                  onChange={(e) => setNanoclawConfig(c => ({ ...c, endpoint: e.target.value }))}
                  placeholder="http://localhost"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="port">端口</Label>
                <Input
                  id="port"
                  value={nanoclawConfig.port}
                  onChange={(e) => setNanoclawConfig(c => ({ ...c, port: e.target.value }))}
                  placeholder="3100"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="authToken">认证令牌</Label>
              <Input
                id="authToken"
                type="password"
                value={nanoclawConfig.authToken}
                onChange={(e) => setNanoclawConfig(c => ({ ...c, authToken: e.target.value }))}
                placeholder="输入 NanoClaw 认证令牌"
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                {store.containers.length > 0 && (
                  <span>活跃容器: {store.containers.length}</span>
                )}
                {latencyMs !== null && (
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {latencyMs}ms
                  </span>
                )}
                {connectionError && (
                  <span className="text-destructive max-w-[200px] truncate" title={connectionError}>
                    {connectionError}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={handleSaveConfig}>
                  保存配置
                </Button>
                <Button size="sm" onClick={handleTestConnection} disabled={isTesting}>
                  {isTesting ? (
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  ) : (
                    <Wifi className="h-4 w-4 mr-1" />
                  )}
                  测试连接
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function ModeCard({
  icon,
  title,
  description,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      className={cn(
        'rounded-lg border-2 p-4 text-left transition-all hover:shadow-sm',
        active ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
      )}
      onClick={onClick}
    >
      <div className={cn('mb-2', active ? 'text-primary' : 'text-muted-foreground')}>
        {icon}
      </div>
      <h3 className="text-sm font-medium">{title}</h3>
      <p className="text-xs text-muted-foreground mt-1">{description}</p>
    </button>
  );
}
