/**
 * @file PublishChecklist.tsx
 * @description 发布前检查清单组件
 */

import { useState, useEffect } from 'react';
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Loader2,
  Shield,
  Settings,
  FileText,
  Zap,
  Key,
  Globe,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card.tsx';
import { Badge } from '../ui/badge.tsx';
import { Button } from '../ui/button.tsx';
import { Progress } from '../ui/progress.tsx';
import { cn } from '../../lib/utils.ts';

export interface ChecklistItem {
  id: string;
  category: 'config' | 'security' | 'performance' | 'integration';
  title: string;
  description: string;
  status: 'pending' | 'checking' | 'passed' | 'warning' | 'failed';
  message?: string;
  autoFix?: () => Promise<void>;
}

interface PublishChecklistProps {
  agentId: string;
  onCheckComplete: (passed: boolean) => void;
}

const categoryConfig = {
  config: { label: '配置检查', icon: Settings, color: 'text-blue-500' },
  security: { label: '安全检查', icon: Shield, color: 'text-red-500' },
  performance: { label: '性能检查', icon: Zap, color: 'text-yellow-500' },
  integration: { label: '集成检查', icon: Globe, color: 'text-green-500' },
};

export function PublishChecklist({ agentId, onCheckComplete }: PublishChecklistProps) {
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [isChecking, setIsChecking] = useState(false);
  const [progress, setProgress] = useState(0);

  // 初始化检查项
  useEffect(() => {
    const initialItems: ChecklistItem[] = [
      {
        id: 'name',
        category: 'config',
        title: '智能体名称',
        description: '检查名称是否已设置',
        status: 'pending',
      },
      {
        id: 'system-prompt',
        category: 'config',
        title: '系统提示词',
        description: '检查系统提示词是否已配置',
        status: 'pending',
      },
      {
        id: 'model',
        category: 'config',
        title: '模型配置',
        description: '检查 LLM 模型是否正确配置',
        status: 'pending',
      },
      {
        id: 'permissions',
        category: 'security',
        title: '权限配置',
        description: '检查技能权限是否合理',
        status: 'pending',
      },
      {
        id: 'api-keys',
        category: 'security',
        title: 'API 密钥',
        description: '检查敏感信息是否已保护',
        status: 'pending',
      },
      {
        id: 'prompt-injection',
        category: 'security',
        title: '提示词注入防护',
        description: '检查是否存在注入风险',
        status: 'pending',
      },
      {
        id: 'response-time',
        category: 'performance',
        title: '响应时间',
        description: '检查平均响应时间是否达标',
        status: 'pending',
      },
      {
        id: 'token-usage',
        category: 'performance',
        title: 'Token 使用',
        description: '检查 Token 消耗是否合理',
        status: 'pending',
      },
      {
        id: 'skills',
        category: 'integration',
        title: '技能集成',
        description: '检查已挂载技能是否可用',
        status: 'pending',
      },
      {
        id: 'webhooks',
        category: 'integration',
        title: 'Webhook 配置',
        description: '检查 Webhook 端点是否有效',
        status: 'pending',
      },
    ];
    setItems(initialItems);
  }, [agentId]);

  // 运行检查
  const runChecks = async () => {
    setIsChecking(true);
    setProgress(0);

    const totalItems = items.length;
    let passedCount = 0;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      
      // 更新状态为 checking
      setItems(prev => prev.map(it => 
        it.id === item.id ? { ...it, status: 'checking' as const } : it
      ));

      // 模拟检查过程
      await new Promise(resolve => setTimeout(resolve, 300 + Math.random() * 500));

      // 模拟检查结果
      const result = simulateCheck(item.id);
      
      setItems(prev => prev.map(it => 
        it.id === item.id ? { ...it, ...result } : it
      ));

      if (result.status === 'passed') {
        passedCount++;
      }

      setProgress(((i + 1) / totalItems) * 100);
    }

    setIsChecking(false);
    
    // 判断是否全部通过（允许警告）
    const allPassed = items.every(it => {
      const updated = simulateCheck(it.id);
      return updated.status === 'passed' || updated.status === 'warning';
    });
    onCheckComplete(allPassed);
  };

  // 模拟检查逻辑
  const simulateCheck = (id: string): Partial<ChecklistItem> => {
    const results: Record<string, Partial<ChecklistItem>> = {
      'name': { status: 'passed', message: '名称已设置' },
      'system-prompt': { status: 'passed', message: '系统提示词已配置' },
      'model': { status: 'passed', message: '使用 Claude 3.5 Sonnet' },
      'permissions': { status: 'warning', message: '建议限制文件访问权限' },
      'api-keys': { status: 'passed', message: '所有密钥已加密存储' },
      'prompt-injection': { status: 'passed', message: '已启用注入防护' },
      'response-time': { status: 'passed', message: '平均响应时间 850ms' },
      'token-usage': { status: 'warning', message: '单次对话平均消耗 2.5k tokens' },
      'skills': { status: 'passed', message: '已挂载 3 个技能' },
      'webhooks': { status: 'passed', message: '未配置 Webhook（可选）' },
    };
    return results[id] || { status: 'passed' };
  };

  // 按类别分组
  const groupedItems = items.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, ChecklistItem[]>);

  const passedCount = items.filter(it => it.status === 'passed').length;
  const warningCount = items.filter(it => it.status === 'warning').length;
  const failedCount = items.filter(it => it.status === 'failed').length;

  return (
    <div className="space-y-4">
      {/* 总体状态 */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              <span className="font-medium">发布前检查</span>
            </div>
            <Button 
              size="sm" 
              onClick={runChecks} 
              disabled={isChecking}
            >
              {isChecking ? (
                <>
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  检查中...
                </>
              ) : (
                '开始检查'
              )}
            </Button>
          </div>

          {isChecking && (
            <Progress value={progress} className="h-2 mb-3" />
          )}

          <div className="flex gap-4 text-sm">
            <div className="flex items-center gap-1">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span>{passedCount} 通过</span>
            </div>
            <div className="flex items-center gap-1">
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
              <span>{warningCount} 警告</span>
            </div>
            <div className="flex items-center gap-1">
              <XCircle className="h-4 w-4 text-red-500" />
              <span>{failedCount} 失败</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 分类检查项 */}
      {Object.entries(groupedItems).map(([category, categoryItems]) => {
        const config = categoryConfig[category as keyof typeof categoryConfig];
        const Icon = config.icon;

        return (
          <Card key={category}>
            <CardHeader className="py-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Icon className={cn('h-4 w-4', config.color)} />
                {config.label}
              </CardTitle>
            </CardHeader>
            <CardContent className="pb-3">
              <div className="space-y-2">
                {categoryItems.map(item => (
                  <ChecklistItemRow key={item.id} item={item} />
                ))}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

// 检查项行
function ChecklistItemRow({ item }: { item: ChecklistItem }) {
  const statusConfig = {
    pending: { icon: null, color: 'text-muted-foreground', bg: 'bg-muted' },
    checking: { icon: Loader2, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    passed: { icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-500/10' },
    warning: { icon: AlertTriangle, color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
    failed: { icon: XCircle, color: 'text-red-500', bg: 'bg-red-500/10' },
  };

  const config = statusConfig[item.status];
  const Icon = config.icon;

  return (
    <div className={cn(
      'flex items-center justify-between p-2 rounded-lg transition-colors',
      config.bg
    )}>
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <div className="w-5 h-5 flex items-center justify-center">
          {Icon ? (
            <Icon className={cn(
              'h-4 w-4',
              config.color,
              item.status === 'checking' && 'animate-spin'
            )} />
          ) : (
            <div className="w-2 h-2 rounded-full bg-muted-foreground/50" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{item.title}</p>
          <p className="text-xs text-muted-foreground truncate">
            {item.message || item.description}
          </p>
        </div>
      </div>

      {item.autoFix && item.status === 'failed' && (
        <Button size="sm" variant="outline" className="h-7 text-xs">
          自动修复
        </Button>
      )}
    </div>
  );
}
