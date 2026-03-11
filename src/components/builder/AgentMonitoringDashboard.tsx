/**
 * @file AgentMonitoringDashboard.tsx
 * @description Agent 统一监控仪表板
 */

import { useMemo } from 'react';
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  TrendingUp,
  Zap,
  XCircle,
  RefreshCw,
  BarChart3,
  Coins,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card.tsx';
import { Badge } from '../ui/badge.tsx';
import { Button } from '../ui/button.tsx';
import { ScrollArea } from '../ui/scroll-area.tsx';
import { Progress } from '../ui/progress.tsx';
import { Skeleton } from '../ui/skeleton.tsx';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts';
import { useAgentMetrics, AgentHealthStatus } from '../../hooks/useAgentMetrics.ts';
import { cn } from '../../lib/utils.ts';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

interface AgentMonitoringDashboardProps {
  agentId: string | null;
  className?: string;
}

// 健康状态卡片
function HealthStatusCard({ status }: { status: AgentHealthStatus }) {
  const statusConfig = {
    healthy: { 
      icon: CheckCircle, 
      color: 'text-green-500', 
      bg: 'bg-green-500/10',
      label: '健康',
    },
    warning: { 
      icon: AlertTriangle, 
      color: 'text-yellow-500', 
      bg: 'bg-yellow-500/10',
      label: '警告',
    },
    critical: { 
      icon: XCircle, 
      color: 'text-red-500', 
      bg: 'bg-red-500/10',
      label: '异常',
    },
    unknown: { 
      icon: Activity, 
      color: 'text-muted-foreground', 
      bg: 'bg-muted',
      label: '未知',
    },
  };

  const config = statusConfig[status.status];
  const Icon = config.icon;

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className={cn('p-2 rounded-lg', config.bg)}>
            <Icon className={cn('h-5 w-5', config.color)} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium">系统状态</span>
              <Badge variant="outline" className={config.color}>
                {config.label}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground truncate">
              {status.message}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// KPI 卡片
interface KPICardProps {
  title: string;
  value: string | number;
  unit?: string;
  icon: React.ElementType;
  trend?: number;
  isLoading?: boolean;
}

function KPICard({ title, value, unit, icon: Icon, trend, isLoading }: KPICardProps) {
  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-4">
          <Skeleton className="h-4 w-20 mb-2" />
          <Skeleton className="h-8 w-24 mb-1" />
          <Skeleton className="h-3 w-16" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-muted-foreground">{title}</span>
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-bold">{value}</span>
          {unit && <span className="text-sm text-muted-foreground">{unit}</span>}
        </div>
        {trend !== undefined && (
          <div className={cn(
            'flex items-center gap-1 text-xs mt-1',
            trend >= 0 ? 'text-green-500' : 'text-red-500'
          )}>
            <TrendingUp className={cn('h-3 w-3', trend < 0 && 'rotate-180')} />
            <span>{Math.abs(trend)}% 较昨日</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// 实时调用图表
function RealtimeChart({ data, isLoading }: { 
  data: Array<{ timestamp: string; calls: number; errors: number; avgLatency: number }>;
  isLoading: boolean;
}) {
  const chartData = useMemo(() => {
    return data.map(d => ({
      ...d,
      time: format(new Date(d.timestamp), 'HH:mm'),
    }));
  }, [data]);

  if (isLoading) {
    return (
      <Card className="col-span-2">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">实时调用趋势</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-48 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="col-span-2">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">实时调用趋势 (24h)</CardTitle>
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-primary" />
              <span>调用数</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-destructive" />
              <span>错误数</span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
            暂无调用数据
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorCalls" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis 
                dataKey="time" 
                tick={{ fontSize: 10 }} 
                tickLine={false}
                axisLine={false}
              />
              <YAxis 
                tick={{ fontSize: 10 }} 
                tickLine={false}
                axisLine={false}
                width={30}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
              />
              <Area 
                type="monotone" 
                dataKey="calls" 
                stroke="hsl(var(--primary))" 
                fill="url(#colorCalls)"
                strokeWidth={2}
              />
              <Line 
                type="monotone" 
                dataKey="errors" 
                stroke="hsl(var(--destructive))" 
                strokeWidth={2}
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

// 最近告警列表
function RecentAlerts({ alerts, isLoading }: { 
  alerts: Array<{ id: string; type: string; message: string; timestamp: string }>;
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">最近告警</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">最近告警</CardTitle>
          <Badge variant="outline">{alerts.length}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        {alerts.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground text-sm">
            <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
            暂无告警
          </div>
        ) : (
          <ScrollArea className="h-32">
            <div className="space-y-2">
              {alerts.map(alert => (
                <div key={alert.id} className="flex items-start gap-2 p-2 rounded bg-muted/50">
                  <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs truncate">{alert.message}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(alert.timestamp), 'MM/dd HH:mm', { locale: zhCN })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}

// 主组件
export function AgentMonitoringDashboard({ agentId, className }: AgentMonitoringDashboardProps) {
  const metrics = useAgentMetrics(agentId);

  if (!agentId) {
    return (
      <div className={cn('p-4 text-center text-muted-foreground', className)}>
        请先选择或保存 Agent 以查看监控数据
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* 健康状态 */}
      <HealthStatusCard status={metrics.healthStatus} />

      {/* KPI 卡片 */}
      <div className="grid grid-cols-2 gap-3">
        <KPICard
          title="成功率"
          value={metrics.successRate}
          unit="%"
          icon={CheckCircle}
          isLoading={metrics.isLoading}
        />
        <KPICard
          title="平均响应时间"
          value={metrics.avgResponseTime}
          unit="ms"
          icon={Clock}
          isLoading={metrics.isLoading}
        />
        <KPICard
          title="总调用次数"
          value={metrics.totalCalls.toLocaleString()}
          icon={BarChart3}
          isLoading={metrics.isLoading}
        />
        <KPICard
          title="错误数"
          value={metrics.errorCount}
          icon={XCircle}
          isLoading={metrics.isLoading}
        />
      </div>

      {/* 实时图表 */}
      <RealtimeChart data={metrics.realtimeData} isLoading={metrics.isLoading} />

      {/* LLM 使用统计 */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Zap className="h-4 w-4" />
            LLM 使用统计 (7天)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Token 消耗</p>
              <p className="text-lg font-semibold">
                {metrics.totalTokens.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">预估费用</p>
              <p className="text-lg font-semibold flex items-center gap-1">
                <Coins className="h-4 w-4" />
                ${metrics.estimatedCost.toFixed(2)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 最近告警 */}
      <RecentAlerts alerts={metrics.recentAlerts} isLoading={metrics.isLoading} />

      {/* 快速操作 */}
      <Card>
        <CardContent className="p-3">
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="flex-1">
              <RefreshCw className="h-3 w-3 mr-1" />
              刷新
            </Button>
            <Button variant="outline" size="sm" className="flex-1">
              <BarChart3 className="h-3 w-3 mr-1" />
              详细报告
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
