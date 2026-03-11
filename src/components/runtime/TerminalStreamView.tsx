/**
 * TerminalStreamView - Geek-style Real-time Streaming Terminal
 * Deep dark background, JetBrains Mono font, ANSI color support,
 * status badges, auto-collapse on success, command input
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import DOMPurify from 'dompurify';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Terminal,
  ChevronDown,
  ChevronUp,
  X,
  CheckCircle2,
  XCircle,
  Loader2,
  Trash2,
  Send,
  Zap,
} from 'lucide-react';
import { Button } from '../ui/button.tsx';
import { cn } from '../../lib/utils.ts';
import type { TerminalCommand } from '../../types/openCode.ts';
import type { TerminalStreamState } from '../../hooks/useTerminalStream.ts';

interface TerminalStreamViewProps {
  commands: TerminalCommand[];
  streamState: TerminalStreamState;
  onClear?: () => void;
  onClose?: () => void;
  onSendCommand?: (command: string) => void;
  className?: string;
  defaultExpanded?: boolean;
}

// Escape HTML entities to prevent XSS
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

// ANSI escape code to styled spans (basic subset)
// HTML entities are escaped FIRST, then ANSI codes are converted to safe spans.
// Final output is sanitized with DOMPurify to prevent any bypass.
function parseAnsiToHtml(text: string): string {
  const escaped = escapeHtml(text);
  const html = escaped
    .replace(/\x1b\[31m/g, '<span class="text-red-400">')
    .replace(/\x1b\[32m/g, '<span class="text-emerald-400">')
    .replace(/\x1b\[33m/g, '<span class="text-yellow-400">')
    .replace(/\x1b\[34m/g, '<span class="text-blue-400">')
    .replace(/\x1b\[35m/g, '<span class="text-purple-400">')
    .replace(/\x1b\[36m/g, '<span class="text-cyan-400">')
    .replace(/\x1b\[1m/g, '<span class="font-bold">')
    .replace(/\x1b\[0m/g, '</span>')
    .replace(/\x1b\[\d+m/g, ''); // Strip unhandled codes

  // DOMPurify sanitization — only allow safe span tags with class attributes
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['span'],
    ALLOWED_ATTR: ['class'],
  });
}

function StatusBadge({ streamState }: { streamState: TerminalStreamState }) {
  if (streamState.isStreaming) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-primary/20 border border-primary/30"
      >
        <Loader2 className="h-3 w-3 animate-spin text-primary" />
        <span className="text-xs font-mono text-primary">
          {streamState.currentPhase || 'Executing...'}
        </span>
        {streamState.progress !== null && (
          <span className="text-xs font-mono text-primary/70">
            {streamState.progress}%
          </span>
        )}
      </motion.div>
    );
  }

  if (streamState.lastExitCode !== null) {
    if (streamState.lastExitCode === 0) {
      return (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-500/20 border border-emerald-500/30"
        >
          <CheckCircle2 className="h-3 w-3 text-emerald-400" />
          <span className="text-xs font-mono text-emerald-400">Success</span>
        </motion.div>
      );
    }
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-destructive/20 border border-destructive/30"
      >
        <XCircle className="h-3 w-3 text-destructive" />
        <span className="text-xs font-mono text-destructive">
          Exit {streamState.lastExitCode}
        </span>
      </motion.div>
    );
  }

  return null;
}

export function TerminalStreamView({
  commands,
  streamState,
  onClear,
  onClose,
  onSendCommand,
  className,
  defaultExpanded = true,
}: TerminalStreamViewProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [commandInput, setCommandInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  // Auto-collapse on success, expand on error
  useEffect(() => {
    if (!streamState.isStreaming && streamState.lastExitCode !== null) {
      if (streamState.lastExitCode === 0 && commands.length > 0) {
        // Auto-collapse after 1s on success
        const timer = setTimeout(() => setIsExpanded(false), 1000);
        return () => clearTimeout(timer);
      } else if (streamState.lastExitCode > 0) {
        setIsExpanded(true);
      }
    }
  }, [streamState.isStreaming, streamState.lastExitCode, commands.length]);

  // Auto-scroll
  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [commands, autoScroll]);

  const handleScroll = useCallback(() => {
    if (scrollRef.current) {
      const { scrollHeight, scrollTop, clientHeight } = scrollRef.current;
      setAutoScroll(scrollHeight - scrollTop <= clientHeight + 50);
    }
  }, []);

  const handleSendCommand = useCallback(() => {
    if (commandInput.trim() && onSendCommand) {
      onSendCommand(commandInput.trim());
      setCommandInput('');
    }
  }, [commandInput, onSendCommand]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendCommand();
    }
  }, [handleSendCommand]);

  const getStatusIcon = (status: TerminalCommand['status']) => {
    switch (status) {
      case 'running':
        return <Loader2 className="h-3 w-3 animate-spin text-primary" />;
      case 'success':
        return <CheckCircle2 className="h-3 w-3 text-emerald-400" />;
      case 'error':
        return <XCircle className="h-3 w-3 text-red-400" />;
    }
  };

  return (
    <div
      className={cn(
        "flex flex-col border-t border-border/50",
        "bg-[hsl(var(--card)/0.98)] backdrop-blur-sm",
        "font-mono text-sm",
        className
      )}
    >
      {/* Terminal Header */}
      <div className="h-10 flex items-center justify-between px-3 border-b border-border/30 bg-secondary/20 shrink-0">
        <div className="flex items-center gap-2">
          {/* macOS-style window controls */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={onClose}
              className="w-3 h-3 rounded-full bg-destructive/80 hover:bg-destructive transition-colors"
            />
            <span className="w-3 h-3 rounded-full bg-yellow-500/80" />
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="w-3 h-3 rounded-full bg-emerald-500/80 hover:bg-emerald-500 transition-colors"
            />
          </div>

          <div className="flex items-center gap-1.5 ml-3 text-muted-foreground">
            <Terminal className="h-3.5 w-3.5" />
            <span className="text-xs font-medium">NanoClaw Terminal</span>
            {streamState.isStreaming && (
              <Zap className="h-3 w-3 text-primary animate-pulse" />
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <StatusBadge streamState={streamState} />
          
          {onClear && (
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClear}>
              <Trash2 className="h-3 w-3" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />}
          </Button>
        </div>
      </div>

      {/* Terminal Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            className="overflow-hidden flex flex-col"
            style={{ maxHeight: '300px' }}
          >
            {/* Output area */}
            <div
              ref={scrollRef}
              onScroll={handleScroll}
              className="flex-1 overflow-y-auto p-3 space-y-2 min-h-[120px] max-h-[240px]"
            >
              {commands.length === 0 ? (
                <div className="text-muted-foreground text-xs italic flex items-center gap-2">
                  <Terminal className="h-3.5 w-3.5" />
                  等待命令执行...
                </div>
              ) : (
                commands.map((cmd) => (
                  <div key={cmd.id} className="space-y-0.5">
                    {/* Command line */}
                    <div className="flex items-start gap-2">
                      <span className="text-emerald-400 shrink-0 select-none">❯</span>
                      <span className="text-foreground font-medium flex-1 break-all">
                        {cmd.command}
                      </span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {getStatusIcon(cmd.status)}
                      </div>
                    </div>

                    {/* Output */}
                    {cmd.output && (
                      <pre
                        className={cn(
                          "text-xs whitespace-pre-wrap pl-5 leading-relaxed",
                          cmd.status === 'error'
                            ? "text-red-400/90"
                            : "text-muted-foreground"
                        )}
                        dangerouslySetInnerHTML={{ __html: parseAnsiToHtml(cmd.output) }}
                      />
                    )}

                    {/* Exit code */}
                    {cmd.status !== 'running' && cmd.exitCode !== undefined && (
                      <div className={cn(
                        "text-xs pl-5 font-mono",
                        cmd.exitCode === 0 ? "text-emerald-400" : "text-red-400"
                      )}>
                        {cmd.exitCode === 0 ? '✓' : '✗'} exit {cmd.exitCode}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Command Input */}
            {onSendCommand && (
              <div className="flex items-center gap-2 px-3 py-2 border-t border-border/30 bg-secondary/10">
                <span className="text-emerald-400 text-xs shrink-0 select-none">❯</span>
                <input
                  type="text"
                  value={commandInput}
                  onChange={(e) => setCommandInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="输入命令..."
                  className="flex-1 bg-transparent text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none font-mono"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5"
                  onClick={handleSendCommand}
                  disabled={!commandInput.trim()}
                >
                  <Send className="h-3 w-3" />
                </Button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
