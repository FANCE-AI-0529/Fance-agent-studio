import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Cloud, 
  CloudOff, 
  RefreshCw, 
  Check,
  AlertCircle,
} from 'lucide-react';
import { 
  Tooltip, 
  TooltipContent, 
  TooltipTrigger 
} from '../ui/tooltip.tsx';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { cn } from '../../lib/utils.ts';

interface SyncIndicatorProps {
  isSubscribed: boolean;
  isSyncing: boolean;
  lastSyncedAt: Date | null;
  syncError: string | null;
  className?: string;
}

export function SyncIndicator({
  isSubscribed,
  isSyncing,
  lastSyncedAt,
  syncError,
  className,
}: SyncIndicatorProps) {
  const getStatus = () => {
    if (syncError) {
      return {
        icon: AlertCircle,
        label: '同步错误',
        color: 'text-destructive',
        bgColor: 'bg-destructive/10',
        pulseColor: 'bg-destructive',
      };
    }
    if (isSyncing) {
      return {
        icon: RefreshCw,
        label: '同步中...',
        color: 'text-yellow-500',
        bgColor: 'bg-yellow-500/10',
        pulseColor: 'bg-yellow-500',
      };
    }
    if (!isSubscribed) {
      return {
        icon: CloudOff,
        label: '离线',
        color: 'text-muted-foreground',
        bgColor: 'bg-muted',
        pulseColor: 'bg-muted-foreground',
      };
    }
    return {
      icon: Check,
      label: '已同步',
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
      pulseColor: 'bg-green-500',
    };
  };

  const status = getStatus();
  const Icon = status.icon;

  const lastSyncText = lastSyncedAt
    ? `最后同步: ${formatDistanceToNow(lastSyncedAt, { locale: zhCN, addSuffix: true })}`
    : '尚未同步';

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className={cn(
            'flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium cursor-default transition-colors',
            status.bgColor,
            status.color,
            className
          )}
        >
          {/* Pulse indicator */}
          <span className="relative flex h-2 w-2">
            {isSubscribed && !syncError && (
              <span
                className={cn(
                  'animate-ping absolute inline-flex h-full w-full rounded-full opacity-75',
                  status.pulseColor
                )}
              />
            )}
            <span
              className={cn(
                'relative inline-flex rounded-full h-2 w-2',
                status.pulseColor
              )}
            />
          </span>

          {/* Icon */}
          <motion.div
            animate={isSyncing ? { rotate: 360 } : {}}
            transition={{ duration: 1, repeat: isSyncing ? Infinity : 0, ease: 'linear' }}
          >
            <Icon className="h-3 w-3" />
          </motion.div>

          {/* Label */}
          <span className="hidden sm:inline">{status.label}</span>
        </div>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="text-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-1.5">
            <Cloud className="h-3 w-3" />
            <span>实时同步: {isSubscribed ? '已连接' : '未连接'}</span>
          </div>
          <div className="text-muted-foreground">{lastSyncText}</div>
          {syncError && (
            <div className="text-destructive">{syncError}</div>
          )}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

/**
 * Compact version for smaller spaces
 */
export function SyncIndicatorCompact({
  isSubscribed,
  isSyncing,
  syncError,
}: {
  isSubscribed: boolean;
  isSyncing: boolean;
  syncError: string | null;
}) {
  const getColor = () => {
    if (syncError) return 'bg-destructive';
    if (isSyncing) return 'bg-yellow-500';
    if (!isSubscribed) return 'bg-muted-foreground';
    return 'bg-green-500';
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="relative flex h-2 w-2 cursor-default">
          {isSubscribed && !syncError && (
            <span
              className={cn(
                'animate-ping absolute inline-flex h-full w-full rounded-full opacity-75',
                getColor()
              )}
            />
          )}
          <span
            className={cn(
              'relative inline-flex rounded-full h-2 w-2',
              getColor()
            )}
          />
        </span>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="text-xs">
        {syncError ? '同步错误' : 
         isSyncing ? '同步中...' : 
         isSubscribed ? '已同步' : '离线'}
      </TooltipContent>
    </Tooltip>
  );
}
