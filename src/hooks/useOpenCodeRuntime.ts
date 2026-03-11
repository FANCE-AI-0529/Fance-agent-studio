/**
 * OpenCode Runtime State Hook
 * Manages terminal commands, file diffs, and TUI state for OpenCode BUILD mode
 */

import { useState, useCallback, useMemo } from 'react';
import type { 
  OpenCodeMode, 
  TerminalCommand, 
  FileDiff, 
  OpenCodeRuntimeState 
} from '../types/openCode.ts';

interface UseOpenCodeRuntimeOptions {
  initialMode?: OpenCodeMode;
}

interface UseOpenCodeRuntimeReturn {
  // State
  state: OpenCodeRuntimeState;
  isActive: boolean;
  mode: OpenCodeMode;
  
  // Terminal commands
  terminalCommands: TerminalCommand[];
  addTerminalCommand: (command: Omit<TerminalCommand, 'id' | 'timestamp'>) => string;
  updateCommandOutput: (id: string, output: string, status?: TerminalCommand['status'], exitCode?: number) => void;
  clearTerminal: () => void;
  
  // File diffs
  pendingDiffs: FileDiff[];
  addFileDiff: (diff: Omit<FileDiff, 'id' | 'timestamp'>) => string;
  acceptDiff: (id: string) => void;
  rejectDiff: (id: string) => void;
  clearDiffs: () => void;
  
  // Mode control
  setMode: (mode: OpenCodeMode) => void;
  setCurrentFile: (path: string | undefined) => void;
  activate: () => void;
  deactivate: () => void;
  
  // Style check
  setStyleCheckStatus: (passed: boolean, violationsCount?: number) => void;
}

export function useOpenCodeRuntime(
  options: UseOpenCodeRuntimeOptions = {}
): UseOpenCodeRuntimeReturn {
  const { initialMode = 'plan' } = options;
  
  const [isActive, setIsActive] = useState(false);
  const [mode, setMode] = useState<OpenCodeMode>(initialMode);
  const [terminalCommands, setTerminalCommands] = useState<TerminalCommand[]>([]);
  const [pendingDiffs, setPendingDiffs] = useState<FileDiff[]>([]);
  const [currentFile, setCurrentFile] = useState<string | undefined>();
  const [styleCheckPassed, setStyleCheckPassed] = useState(true);
  const [styleViolationsCount, setStyleViolationsCount] = useState(0);

  // Computed state
  const state = useMemo<OpenCodeRuntimeState>(() => ({
    isActive,
    currentMode: mode,
    terminalCommands,
    pendingDiffs,
    currentFile,
    styleCheckPassed,
    styleViolationsCount,
  }), [isActive, mode, terminalCommands, pendingDiffs, currentFile, styleCheckPassed, styleViolationsCount]);

  // Terminal commands
  const addTerminalCommand = useCallback((
    command: Omit<TerminalCommand, 'id' | 'timestamp'>
  ): string => {
    const id = crypto.randomUUID();
    const newCommand: TerminalCommand = {
      ...command,
      id,
      timestamp: new Date(),
    };
    setTerminalCommands(prev => [...prev, newCommand]);
    return id;
  }, []);

  const updateCommandOutput = useCallback((
    id: string, 
    output: string, 
    status?: TerminalCommand['status'],
    exitCode?: number
  ) => {
    setTerminalCommands(prev => prev.map(cmd => 
      cmd.id === id 
        ? { 
            ...cmd, 
            output: cmd.output + output,
            ...(status && { status }),
            ...(exitCode !== undefined && { exitCode }),
          }
        : cmd
    ));
  }, []);

  const clearTerminal = useCallback(() => {
    setTerminalCommands([]);
  }, []);

  // File diffs
  const addFileDiff = useCallback((
    diff: Omit<FileDiff, 'id' | 'timestamp'>
  ): string => {
    const id = crypto.randomUUID();
    const newDiff: FileDiff = {
      ...diff,
      id,
      timestamp: new Date(),
    };
    setPendingDiffs(prev => [...prev, newDiff]);
    return id;
  }, []);

  const acceptDiff = useCallback((id: string) => {
    setPendingDiffs(prev => prev.map(diff =>
      diff.id === id ? { ...diff, accepted: true } : diff
    ));
  }, []);

  const rejectDiff = useCallback((id: string) => {
    setPendingDiffs(prev => prev.filter(diff => diff.id !== id));
  }, []);

  const clearDiffs = useCallback(() => {
    setPendingDiffs([]);
  }, []);

  // Mode control
  const activate = useCallback(() => {
    setIsActive(true);
  }, []);

  const deactivate = useCallback(() => {
    setIsActive(false);
    setMode('plan');
    clearTerminal();
    clearDiffs();
    setCurrentFile(undefined);
  }, [clearTerminal, clearDiffs]);

  // Style check
  const setStyleCheckStatus = useCallback((passed: boolean, violationsCount = 0) => {
    setStyleCheckPassed(passed);
    setStyleViolationsCount(violationsCount);
  }, []);

  return {
    state,
    isActive,
    mode,
    
    terminalCommands,
    addTerminalCommand,
    updateCommandOutput,
    clearTerminal,
    
    pendingDiffs,
    addFileDiff,
    acceptDiff,
    rejectDiff,
    clearDiffs,
    
    setMode,
    setCurrentFile,
    activate,
    deactivate,
    
    setStyleCheckStatus,
  };
}
