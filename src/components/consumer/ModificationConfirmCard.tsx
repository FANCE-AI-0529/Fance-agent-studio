import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Wrench, 
  Plus, 
  Minus, 
  Database, 
  Edit3, 
  Clock,
  Check,
  X,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import type { ModificationIntent, ModificationAction } from '@/hooks/useAgentModification';

interface ModificationConfirmCardProps {
  intent: ModificationIntent;
  onConfirm: () => void;
  onCancel: () => void;
  isProcessing?: boolean;
}

const ACTION_ICONS: Record<ModificationAction, React.ElementType> = {
  'add_skill': Plus,
  'remove_skill': Minus,
  'add_knowledge': Database,
  'remove_knowledge': Database,
  'change_name': Edit3,
  'change_config': Wrench,
  'add_trigger': Clock,
  'remove_trigger': Clock,
};

const ACTION_COLORS: Record<ModificationAction, string> = {
  'add_skill': 'text-green-500 bg-green-500/10',
  'remove_skill': 'text-red-500 bg-red-500/10',
  'add_knowledge': 'text-blue-500 bg-blue-500/10',
  'remove_knowledge': 'text-orange-500 bg-orange-500/10',
  'change_name': 'text-purple-500 bg-purple-500/10',
  'change_config': 'text-yellow-500 bg-yellow-500/10',
  'add_trigger': 'text-cyan-500 bg-cyan-500/10',
  'remove_trigger': 'text-gray-500 bg-gray-500/10',
};

const ACTION_LABELS: Record<ModificationAction, string> = {
  'add_skill': '添加技能',
  'remove_skill': '移除技能',
  'add_knowledge': '挂载知识库',
  'remove_knowledge': '卸载知识库',
  'change_name': '修改名称',
  'change_config': '修改配置',
  'add_trigger': '添加触发器',
  'remove_trigger': '移除触发器',
};

export function ModificationConfirmCard({
  intent,
  onConfirm,
  onCancel,
  isProcessing = false,
}: ModificationConfirmCardProps) {
  const Icon = ACTION_ICONS[intent.action] || Wrench;
  const colorClass = ACTION_COLORS[intent.action] || 'text-muted-foreground bg-muted';
  const actionLabel = ACTION_LABELS[intent.action] || intent.action;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -20, scale: 0.95 }}
        transition={{ duration: 0.2 }}
      >
        <Card className="p-4 border-primary/20 bg-card/95 backdrop-blur-sm shadow-lg">
          {/* Header */}
          <div className="flex items-center gap-2 mb-3">
            <div className={`p-1.5 rounded-md ${colorClass}`}>
              <Wrench className="h-4 w-4" />
            </div>
            <span className="text-sm font-medium text-foreground">检测到修改请求</span>
          </div>

          {/* Intent Details */}
          <div className="mb-4 p-3 rounded-lg bg-muted/50">
            <div className="flex items-start gap-3">
              <div className={`p-2 rounded-full ${colorClass}`}>
                <Icon className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-medium text-muted-foreground">
                    {actionLabel}
                  </span>
                  {intent.confidence >= 0.8 && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-500/10 text-green-600">
                      高可信度
                    </span>
                  )}
                </div>
                <p className="text-sm text-foreground">
                  {intent.description}
                </p>
                {intent.targetName && (
                  <p className="text-xs text-muted-foreground mt-1">
                    目标: <span className="font-medium">{intent.targetName}</span>
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Explanation */}
          <p className="text-xs text-muted-foreground mb-4">
            这将在智能体画布中{' '}
            {intent.action.startsWith('add') ? '添加' : 
             intent.action.startsWith('remove') ? '移除' : '修改'}
            相应的节点。Studio 页面将实时同步更新。
          </p>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={onConfirm}
              disabled={isProcessing}
              className="flex-1"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                  处理中...
                </>
              ) : (
                <>
                  <Check className="h-3.5 w-3.5 mr-1.5" />
                  确认执行
                </>
              )}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={onCancel}
              disabled={isProcessing}
              className="flex-1"
            >
              <X className="h-3.5 w-3.5 mr-1.5" />
              取消
            </Button>
          </div>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
}
