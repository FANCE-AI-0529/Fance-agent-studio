/**
 * CodingTerminalView - VS Code-style Terminal Panel
 * Displays command execution output in a terminal-like interface
 */

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Terminal, 
  ChevronDown, 
  ChevronUp, 
  X, 
  CheckCircle2, 
  XCircle, 
  Loader2,
  Trash2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import type { TerminalCommand } from '@/types/openCode';

interface CodingTerminalViewProps {
  commands: TerminalCommand[];
  isStreaming?: boolean;
  onClear?: () => void;
  onClose?: () => void;
  className?: string;
  defaultExpanded?: boolean;
}

export function CodingTerminalView({
  commands,
  isStreaming = false,
  onClear,
  onClose,
  className,
  defaultExpanded = true,
}: CodingTerminalViewProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  // Auto-scroll to bottom when new output arrives
  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [commands, autoScroll]);

  // Detect manual scroll to disable auto-scroll
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const isAtBottom = target.scrollHeight - target.scrollTop <= target.clientHeight + 50;
    setAutoScroll(isAtBottom);
  };

  const getStatusIcon = (status: TerminalCommand['status']) => {
    switch (status) {
      case 'running':
        return <Loader2 className="h-3 w-3 animate-spin text-primary" />;
      case 'success':
        return <CheckCircle2 className="h-3 w-3 text-emerald-500" />;
      case 'error':
        return <XCircle className="h-3 w-3 text-destructive" />;
    }
  };

  const formatTimestamp = (date: Date) => {
    return date.toLocaleTimeString('zh-CN', { 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit' 
    });
  };

  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ 
        height: isExpanded ? 'auto' : 40, 
        opacity: 1 
      }}
      exit={{ height: 0, opacity: 0 }}
      className={cn(
        "border-t border-border bg-card/95 backdrop-blur-sm",
        "font-mono text-sm",
        className
      )}
    >
      {/* Terminal Header */}
      <div className="h-10 flex items-center justify-between px-3 border-b border-border/50 bg-secondary/30">
        <div className="flex items-center gap-2">
          {/* Window controls */}
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-destructive/80 hover:bg-destructive cursor-pointer" onClick={onClose} />
            <span className="w-3 h-3 rounded-full bg-yellow-500/80" />
            <span className="w-3 h-3 rounded-full bg-emerald-500/80" onClick={() => setIsExpanded(!isExpanded)} />
          </div>
          
          <div className="flex items-center gap-1.5 ml-3 text-muted-foreground">
            <Terminal className="h-3.5 w-3.5" />
            <span className="text-xs font-medium">终端</span>
            {isStreaming && (
              <span className="flex items-center gap-1 text-xs text-primary">
                <Loader2 className="h-3 w-3 animate-spin" />
                执行中...
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1">
          {onClear && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={onClear}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronUp className="h-3 w-3" />
            )}
          </Button>
        </div>
      </div>

      {/* Terminal Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 200 }}
            exit={{ height: 0 }}
            className="overflow-hidden"
          >
            <ScrollArea 
              className="h-[200px]"
              ref={scrollRef}
              onScroll={handleScroll}
            >
              <div className="p-3 space-y-3">
                {commands.length === 0 ? (
                  <div className="text-muted-foreground text-xs italic">
                    等待命令执行...
                  </div>
                ) : (
                  commands.map((cmd) => (
                    <div key={cmd.id} className="space-y-1">
                      {/* Command line */}
                      <div className="flex items-start gap-2">
                        <span className="text-primary shrink-0">$</span>
                        <span className="text-foreground font-medium flex-1">
                          {cmd.command}
                        </span>
                        <div className="flex items-center gap-2 shrink-0">
                          {getStatusIcon(cmd.status)}
                          <span className="text-xs text-muted-foreground">
                            {formatTimestamp(cmd.timestamp)}
                          </span>
                        </div>
                      </div>
                      
                      {/* Command output */}
                      {cmd.output && (
                        <pre className={cn(
                          "text-xs whitespace-pre-wrap pl-4 border-l-2",
                          cmd.status === 'error' 
                            ? "border-destructive/50 text-destructive/90" 
                            : "border-muted text-muted-foreground"
                        )}>
                          {cmd.output}
                        </pre>
                      )}
                      
                      {/* Exit code for completed commands */}
                      {cmd.status !== 'running' && cmd.exitCode !== undefined && (
                        <div className={cn(
                          "text-xs pl-4",
                          cmd.exitCode === 0 
                            ? "text-emerald-500" 
                            : "text-destructive"
                        )}>
                          ✓ 退出码: {cmd.exitCode}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
