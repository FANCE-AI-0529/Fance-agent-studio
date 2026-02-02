/**
 * @file ContextualGuide.tsx
 * @description 情境化引导组件 - 根据用户当前操作提供相关提示
 */

import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Lightbulb, 
  X, 
  ChevronRight,
  Info,
  Sparkles,
  BookOpen,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

// 引导提示类型
interface GuideTip {
  id: string;
  trigger: string; // 触发条件
  title: string;
  content: string;
  type: 'info' | 'tip' | 'warning' | 'feature';
  action?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
  position?: 'top-right' | 'bottom-right' | 'bottom-left' | 'center';
  dismissible?: boolean;
  persistent?: boolean; // 是否持久显示直到手动关闭
}

// 预定义的情境提示
const contextualTips: GuideTip[] = [
  {
    id: 'first-node',
    trigger: 'canvas-empty',
    title: '开始构建你的第一个节点',
    content: '从左侧面板拖拽一个 LLM 节点到画布，开始构建你的智能体工作流。',
    type: 'tip',
    position: 'center',
  },
  {
    id: 'system-prompt-empty',
    trigger: 'prompt-empty',
    title: '别忘了设置系统提示词',
    content: '系统提示词是智能体行为的核心定义，好的提示词能显著提升智能体的表现。',
    type: 'warning',
    action: {
      label: '查看模板库',
      onClick: () => console.log('Open template library'),
    },
  },
  {
    id: 'skill-added',
    trigger: 'skill-added',
    title: '技能已添加！',
    content: '技能赋予智能体新的能力。记得在测试对话中验证技能是否正常工作。',
    type: 'info',
  },
  {
    id: 'deploy-ready',
    trigger: 'deploy-ready',
    title: '可以部署了',
    content: '你的智能体已经准备就绪！点击"保存并部署"让它上线。',
    type: 'feature',
    action: {
      label: '了解部署流程',
      href: '/help/deployment',
    },
  },
  {
    id: 'error-occurred',
    trigger: 'error',
    title: '遇到问题了？',
    content: '检查一下配置是否完整，或者尝试刷新页面。如果问题持续，可以查看帮助文档。',
    type: 'warning',
    action: {
      label: '获取帮助',
      href: '/help',
    },
  },
];

// Context
interface ContextualGuideContextType {
  showTip: (trigger: string) => void;
  hideTip: () => void;
  dismissTip: (tipId: string) => void;
  currentTip: GuideTip | null;
}

const ContextualGuideContext = createContext<ContextualGuideContextType | undefined>(undefined);

export function useContextualGuide() {
  const context = useContext(ContextualGuideContext);
  if (!context) {
    throw new Error('useContextualGuide must be used within ContextualGuideProvider');
  }
  return context;
}

// Provider
export function ContextualGuideProvider({ children }: { children: ReactNode }) {
  const [currentTip, setCurrentTip] = useState<GuideTip | null>(null);
  const [dismissedTips, setDismissedTips] = useState<Set<string>>(() => {
    const saved = localStorage.getItem('dismissed_tips');
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });

  const showTip = (trigger: string) => {
    const tip = contextualTips.find(t => t.trigger === trigger);
    if (tip && !dismissedTips.has(tip.id)) {
      setCurrentTip(tip);
    }
  };

  const hideTip = () => {
    if (currentTip && !currentTip.persistent) {
      setCurrentTip(null);
    }
  };

  const dismissTip = (tipId: string) => {
    setDismissedTips(prev => {
      const newSet = new Set([...prev, tipId]);
      localStorage.setItem('dismissed_tips', JSON.stringify([...newSet]));
      return newSet;
    });
    setCurrentTip(null);
  };

  return (
    <ContextualGuideContext.Provider value={{ showTip, hideTip, dismissTip, currentTip }}>
      {children}
      <ContextualGuideOverlay />
    </ContextualGuideContext.Provider>
  );
}

// 提示覆盖层
function ContextualGuideOverlay() {
  const { currentTip, hideTip, dismissTip } = useContextualGuide();

  if (!currentTip) return null;

  const positionClasses = {
    'top-right': 'top-4 right-4',
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'center': 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
  };

  const typeConfig = {
    info: { icon: Info, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    tip: { icon: Lightbulb, color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
    warning: { icon: Info, color: 'text-orange-500', bg: 'bg-orange-500/10' },
    feature: { icon: Sparkles, color: 'text-primary', bg: 'bg-primary/10' },
  };

  const config = typeConfig[currentTip.type];
  const Icon = config.icon;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 10 }}
        className={cn(
          'fixed z-50 w-80',
          positionClasses[currentTip.position || 'bottom-right']
        )}
      >
        <Card className="border-2 shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className={cn('p-2 rounded-lg', config.bg)}>
                <Icon className={cn('h-5 w-5', config.color)} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="font-medium text-sm">{currentTip.title}</h4>
                  {currentTip.dismissible !== false && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 -mr-1"
                      onClick={() => dismissTip(currentTip.id)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mb-3">
                  {currentTip.content}
                </p>
                {currentTip.action && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    onClick={() => {
                      currentTip.action?.onClick?.();
                      hideTip();
                    }}
                    asChild={!!currentTip.action.href}
                  >
                    {currentTip.action.href ? (
                      <a href={currentTip.action.href}>
                        {currentTip.action.label}
                        <ExternalLink className="h-3 w-3 ml-1" />
                      </a>
                    ) : (
                      <>
                        {currentTip.action.label}
                        <ChevronRight className="h-3 w-3 ml-1" />
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
}

// 成就解锁组件
export function AchievementUnlock({
  title,
  description,
  icon: Icon,
  onClose,
}: {
  title: string;
  description: string;
  icon?: React.ElementType;
  onClose: () => void;
}) {
  useEffect(() => {
    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const AchievementIcon = Icon || Sparkles;

  return (
    <motion.div
      initial={{ opacity: 0, y: 50, scale: 0.8 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.8 }}
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50"
    >
      <Card className="border-2 border-yellow-500/50 bg-gradient-to-r from-yellow-500/10 to-orange-500/10">
        <CardContent className="p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-yellow-500/20 flex items-center justify-center">
            <AchievementIcon className="h-6 w-6 text-yellow-500" />
          </div>
          <div>
            <Badge className="mb-1 bg-yellow-500 text-yellow-950">🏆 成就解锁</Badge>
            <h4 className="font-bold">{title}</h4>
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// 功能发现提示
export function FeatureDiscovery({
  feature,
  children,
  onDismiss,
}: {
  feature: string;
  children: ReactNode;
  onDismiss?: () => void;
}) {
  const [isDismissed, setIsDismissed] = useState(() => {
    return localStorage.getItem(`feature_discovered_${feature}`) === 'true';
  });

  if (isDismissed) return <>{children}</>;

  const handleDismiss = () => {
    localStorage.setItem(`feature_discovered_${feature}`, 'true');
    setIsDismissed(true);
    onDismiss?.();
  };

  return (
    <div className="relative">
      {children}
      <motion.div
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        className="absolute -top-1 -right-1"
      >
        <Badge 
          className="bg-primary text-primary-foreground text-[10px] px-1.5 py-0.5 cursor-pointer animate-pulse"
          onClick={handleDismiss}
        >
          新
        </Badge>
      </motion.div>
    </div>
  );
}
