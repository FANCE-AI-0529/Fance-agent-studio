/**
 * Vibe Loop Engine - Self-healing execution with automatic error recovery
 * Implements the Plan → Build → Error → Analyze → Fix → Success loop
 * with circuit breaker integration and MPLP escalation.
 */

import { supabase } from '../integrations/supabase/client.ts';

export interface VibeLoopConfig {
  maxRetries: number;
  nanoclawEndpoint: string;
  authToken: string;
  containerId: string;
}

export interface ReflectionResult {
  analysis: string;
  errorType: string;
  fixCode: string;
  retryCommand: string;
  confidence: number;
}

export type VibeLoopPhase = 'executing' | 'failed' | 'analyzing' | 'fixing' | 'retrying' | 'success' | 'escalated';

export interface VibeLoopAttempt {
  attemptNumber: number;
  command: string;
  exitCode: number;
  stderr: string;
  reflection?: ReflectionResult;
  fixApplied?: boolean;
}

export interface VibeLoopState {
  phase: VibeLoopPhase;
  currentAttempt: number;
  maxRetries: number;
  attempts: VibeLoopAttempt[];
  originalCommand: string;
  finalResult?: { success: boolean; output: string };
}

export interface VibeLoopCallbacks {
  onPhaseChange: (phase: VibeLoopPhase, attempt: number, maxRetries: number) => void;
  onAttempt: (attempt: VibeLoopAttempt) => void;
  onAnalysis: (reflection: ReflectionResult) => void;
  onFix: (fixCode: string) => void;
  onComplete: (success: boolean, totalAttempts: number) => void;
  onEscalate: (attempts: VibeLoopAttempt[]) => void;
  onOutput: (output: string, isStderr: boolean) => void;
}

/**
 * Execute a command in NanoClaw container
 */
async function executeInContainer(
  command: string,
  config: VibeLoopConfig,
): Promise<{ exitCode: number; stdout: string; stderr: string }> {
  const { data, error } = await supabase.functions.invoke('nanoclaw-gateway', {
    body: {
      action: 'execute',
      nanoclawEndpoint: config.nanoclawEndpoint,
      authToken: config.authToken,
      request: {
        containerId: config.containerId,
        command,
      },
    },
  });

  if (error) throw new Error(`Execution failed: ${error.message}`);
  return {
    exitCode: data?.exitCode ?? 1,
    stdout: data?.stdout || '',
    stderr: data?.stderr || '',
  };
}

/**
 * Call vibe-loop-reflect to analyze error and generate fix
 */
async function reflectOnError(
  command: string,
  exitCode: number,
  stderr: string,
  attempt: number,
  maxRetries: number,
  containerId: string,
  context?: string,
): Promise<ReflectionResult> {
  const { data, error } = await supabase.functions.invoke('vibe-loop-reflect', {
    body: {
      command,
      exitCode,
      stderr,
      attempt,
      maxRetries,
      containerId,
      context,
    },
  });

  if (error) throw new Error(`Reflection failed: ${error.message}`);
  if (!data?.success) throw new Error(data?.error || 'Reflection returned no result');
  return data.reflection;
}

/**
 * Apply fix code to container
 */
async function applyFix(fixCode: string, config: VibeLoopConfig): Promise<boolean> {
  try {
    const result = await executeInContainer(fixCode, config);
    return result.exitCode === 0;
  } catch {
    return false;
  }
}

/**
 * Main Vibe Loop: execute with automatic self-healing
 */
export async function executeWithHealing(
  command: string,
  config: VibeLoopConfig,
  callbacks: Partial<VibeLoopCallbacks> = {},
): Promise<{ success: boolean; attempts: VibeLoopAttempt[] }> {
  const { maxRetries } = config;
  const attempts: VibeLoopAttempt[] = [];
  let currentCommand = command;

  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    const isRetry = attempt > 1;
    
    // Phase: Executing
    callbacks.onPhaseChange?.(isRetry ? 'retrying' : 'executing', attempt, maxRetries + 1);

    const result = await executeInContainer(currentCommand, config);
    callbacks.onOutput?.(result.stdout, false);
    if (result.stderr) callbacks.onOutput?.(result.stderr, true);

    // Success!
    if (result.exitCode === 0) {
      callbacks.onPhaseChange?.('success', attempt, maxRetries + 1);
      callbacks.onComplete?.(true, attempt);
      return { success: true, attempts };
    }

    // Failed
    const attemptRecord: VibeLoopAttempt = {
      attemptNumber: attempt,
      command: currentCommand,
      exitCode: result.exitCode,
      stderr: result.stderr,
    };

    callbacks.onPhaseChange?.('failed', attempt, maxRetries + 1);
    callbacks.onAttempt?.(attemptRecord);

    // If we've exhausted retries, escalate
    if (attempt > maxRetries) {
      callbacks.onPhaseChange?.('escalated', attempt, maxRetries + 1);
      callbacks.onEscalate?.(attempts);
      callbacks.onComplete?.(false, attempt);
      attempts.push(attemptRecord);
      return { success: false, attempts };
    }

    // Phase: Analyzing
    callbacks.onPhaseChange?.('analyzing', attempt, maxRetries + 1);
    
    try {
      const reflection = await reflectOnError(
        currentCommand,
        result.exitCode,
        result.stderr,
        attempt,
        maxRetries,
        config.containerId,
      );
      
      attemptRecord.reflection = reflection;
      callbacks.onAnalysis?.(reflection);

      // Phase: Fixing
      callbacks.onPhaseChange?.('fixing', attempt, maxRetries + 1);
      
      if (reflection.fixCode) {
        callbacks.onFix?.(reflection.fixCode);
        const fixApplied = await applyFix(reflection.fixCode, config);
        attemptRecord.fixApplied = fixApplied;
      }

      // Update command for retry
      currentCommand = reflection.retryCommand || command;
      
    } catch (reflectError: any) {
      console.error('[VibeLoop] Reflection failed:', reflectError);
      // Continue with original command on reflection failure
    }

    attempts.push(attemptRecord);
  }

  return { success: false, attempts };
}
