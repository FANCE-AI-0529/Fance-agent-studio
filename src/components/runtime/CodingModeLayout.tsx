/**
 * CodingModeLayout - Container Layout for OpenCode BUILD Mode
 * Orchestrates terminal, diff viewer, and chat panels with resizable layout
 */

import { useState, useCallback, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ResizableHandle, 
  ResizablePanel, 
  ResizablePanelGroup 
} from '@/components/ui/resizable';
import { OpenCodeStatusBar } from './OpenCodeStatusBar';
import { TerminalStreamView } from './TerminalStreamView';
import { CodeDiffViewer, InlineDiffPreview } from './CodeDiffViewer';
import { VibeLoopIndicator } from './VibeLoopIndicator';
import { cn } from '@/lib/utils';
import type { OpenCodeMode, TerminalCommand, FileDiff } from '@/types/openCode';
import type { TerminalStreamState } from '@/hooks/useTerminalStream';
import type { VibeLoopPhase, VibeLoopAttempt } from '@/services/vibeLoopEngine';

interface CodingModeLayoutProps {
  // Mode and state
  mode: OpenCodeMode;
  isActive: boolean;
  
  // Terminal
  terminalCommands: TerminalCommand[];
  streamState?: TerminalStreamState;
  onClearTerminal?: () => void;
  onSendCommand?: (command: string) => void;
  
  // Diffs
  pendingDiffs: FileDiff[];
  onAcceptDiff?: (id: string) => void;
  onRejectDiff?: (id: string) => void;
  
  // Current file
  currentFile?: string;
  
  // Style check
  styleCheckPassed?: boolean;
  styleViolationsCount?: number;
  
  // Vibe Loop
  vibeLoopPhase?: VibeLoopPhase;
  vibeLoopAttempt?: number;
  vibeLoopMaxRetries?: number;
  vibeLoopAttempts?: VibeLoopAttempt[];
  onApproveEscalation?: () => void;
  onDismissVibeLoop?: () => void;
  
  // Callbacks
  onViewPlan?: () => void;
  onClose?: () => void;
  
  // Content
  children: ReactNode;
  className?: string;
}

export function CodingModeLayout({
  mode,
  isActive,
  terminalCommands,
  streamState,
  onClearTerminal,
  onSendCommand,
  pendingDiffs,
  onAcceptDiff,
  onRejectDiff,
  currentFile,
  styleCheckPassed = true,
  styleViolationsCount = 0,
  vibeLoopPhase,
  vibeLoopAttempt = 0,
  vibeLoopMaxRetries = 3,
  vibeLoopAttempts = [],
  onApproveEscalation,
  onDismissVibeLoop,
  onViewPlan,
  onClose,
  children,
  className,
}: CodingModeLayoutProps) {
  const [showTerminal, setShowTerminal] = useState(true);
  const [selectedDiff, setSelectedDiff] = useState<FileDiff | null>(null);
  const [isDiffViewerOpen, setIsDiffViewerOpen] = useState(false);

  const handleViewDiff = useCallback((diff: FileDiff) => {
    setSelectedDiff(diff);
    setIsDiffViewerOpen(true);
  }, []);

  const handleCloseDiffViewer = useCallback(() => {
    setIsDiffViewerOpen(false);
    setSelectedDiff(null);
  }, []);

  const handleAcceptDiff = useCallback(() => {
    if (selectedDiff && onAcceptDiff) {
      onAcceptDiff(selectedDiff.id);
      handleCloseDiffViewer();
    }
  }, [selectedDiff, onAcceptDiff, handleCloseDiffViewer]);

  const handleRejectDiff = useCallback(() => {
    if (selectedDiff && onRejectDiff) {
      onRejectDiff(selectedDiff.id);
      handleCloseDiffViewer();
    }
  }, [selectedDiff, onRejectDiff, handleCloseDiffViewer]);

  // If not active, just render children normally
  if (!isActive) {
    return <>{children}</>;
  }

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Status Bar */}
      <OpenCodeStatusBar
        mode={mode}
        currentFile={currentFile}
        styleCheckPassed={styleCheckPassed}
        styleViolationsCount={styleViolationsCount}
        onViewPlan={onViewPlan}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <ResizablePanelGroup direction="vertical">
          {/* Chat/Content Panel */}
          <ResizablePanel defaultSize={70} minSize={30}>
            <div className="h-full overflow-hidden">
              {children}
              
              {/* Inline Diff Previews */}
              {pendingDiffs.length > 0 && (
                <div className="p-4 border-t border-border space-y-2">
                  <div className="text-xs text-muted-foreground font-medium mb-2">
                    待处理的文件变更 ({pendingDiffs.length})
                  </div>
                  {pendingDiffs.slice(0, 3).map((diff) => (
                    <InlineDiffPreview
                      key={diff.id}
                      diff={diff}
                      onViewFull={() => handleViewDiff(diff)}
                    />
                  ))}
                  {pendingDiffs.length > 3 && (
                    <div className="text-xs text-muted-foreground text-center py-2">
                      还有 {pendingDiffs.length - 3} 个文件变更...
                    </div>
                  )}
                </div>
              )}
            </div>
          </ResizablePanel>

          {/* Terminal Panel */}
          <AnimatePresence>
            {showTerminal && terminalCommands.length > 0 && (
              <>
                <ResizableHandle withHandle />
                <ResizablePanel defaultSize={30} minSize={15} maxSize={50}>
                  <div className="h-full flex flex-col">
                    <TerminalStreamView
                      commands={terminalCommands}
                      streamState={streamState || { isStreaming: false, currentPhase: null, progress: null, lastExitCode: null }}
                      onClear={onClearTerminal}
                      onClose={() => setShowTerminal(false)}
                      onSendCommand={onSendCommand}
                      className="flex-1"
                      defaultExpanded={true}
                    />
                    {/* Vibe Loop Indicator */}
                    {vibeLoopPhase && (
                      <VibeLoopIndicator
                        phase={vibeLoopPhase}
                        currentAttempt={vibeLoopAttempt}
                        maxRetries={vibeLoopMaxRetries}
                        attempts={vibeLoopAttempts}
                        onApproveEscalation={onApproveEscalation}
                        onDismiss={onDismissVibeLoop}
                        className="mx-2 mb-2"
                      />
                    )}
                  </div>
                </ResizablePanel>
              </>
            )}
          </AnimatePresence>
        </ResizablePanelGroup>
      </div>

      {/* Diff Viewer Dialog */}
      {selectedDiff && (
        <CodeDiffViewer
          diff={selectedDiff}
          isOpen={isDiffViewerOpen}
          onClose={handleCloseDiffViewer}
          onAccept={handleAcceptDiff}
          onReject={handleRejectDiff}
          theme="dark"
        />
      )}
    </div>
  );
}

/**
 * Simple wrapper for non-BUILD mode that shows a subtle indicator
 */
interface OpenCodeWrapperProps {
  isOpenCodeActive: boolean;
  mode: OpenCodeMode;
  children: ReactNode;
}

export function OpenCodeWrapper({
  isOpenCodeActive,
  mode,
  children,
}: OpenCodeWrapperProps) {
  if (!isOpenCodeActive) {
    return <>{children}</>;
  }

  return (
    <div className="relative h-full">
      {/* Subtle mode indicator overlay for PLAN mode */}
      {mode === 'plan' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute top-2 right-2 z-10"
        >
          <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-blue-500/10 border border-blue-500/20 text-xs font-mono text-blue-600 dark:text-blue-400">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
            PLAN MODE
          </div>
        </motion.div>
      )}
      {children}
    </div>
  );
}
