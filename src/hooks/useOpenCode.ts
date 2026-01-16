/**
 * OpenCode Programming Engine Hook
 * Provides React integration for the OpenCode dual-mode programming engine
 */

import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { checkOpenCodeStyle } from '@/utils/openCodeStyleChecker';
import type { 
  OpenCodeMode, 
  OpenCodeSession, 
  OpenCodeRequest, 
  OpenCodeResponse, 
  StyleViolation,
  OpenCodePlan 
} from '@/types/openCode';

interface UseOpenCodeOptions {
  agentId?: string;
  sessionId?: string;
  autoStyleCheck?: boolean;
}

interface UseOpenCodeReturn {
  mode: OpenCodeMode;
  session: OpenCodeSession | null;
  isLoading: boolean;
  error: string | null;
  
  // Plan mode operations
  listFiles: (path: string, options?: { recursive?: boolean; pattern?: string }) => Promise<unknown>;
  readFile: (path: string) => Promise<string>;
  searchCode: (query: string, options?: { path?: string; filePattern?: string }) => Promise<unknown>;
  generatePlan: (description: string, files: Array<{ path: string; action: string; changes?: string }>) => Promise<OpenCodePlan>;
  
  // Build mode operations
  writeFile: (path: string, content: string) => Promise<OpenCodeResponse>;
  editFile: (path: string, search: string, replace: string) => Promise<OpenCodeResponse>;
  runBash: (command: string, options?: { cwd?: string; timeout?: number }) => Promise<OpenCodeResponse>;
  
  // Mode control
  requestApproval: (plan: OpenCodePlan) => Promise<string>; // Returns approval token
  switchToBuild: (approvalToken: string) => Promise<boolean>;
  resetToPlanning: () => Promise<void>;
  
  // Style checking
  styleViolations: StyleViolation[];
  checkStyle: (code: string) => StyleViolation[];
  clearViolations: () => void;
}

export function useOpenCode(options: UseOpenCodeOptions = {}): UseOpenCodeReturn {
  const { agentId, sessionId, autoStyleCheck = true } = options;
  
  const [mode, setMode] = useState<OpenCodeMode>('plan');
  const [session, setSession] = useState<OpenCodeSession | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [styleViolations, setStyleViolations] = useState<StyleViolation[]>([]);

  // Initialize or load session
  useEffect(() => {
    const loadSession = async () => {
      if (!agentId || !sessionId) return;

      const { data, error: fetchError } = await supabase
        .from('opencode_sessions')
        .select('*')
        .eq('agent_id', agentId)
        .eq('session_id', sessionId)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        console.error('Failed to load OpenCode session:', fetchError);
        return;
      }

      if (data) {
        const violations = Array.isArray(data.style_violations) 
          ? (data.style_violations as unknown as StyleViolation[]) 
          : [];
        setSession({
          id: data.id,
          agentId: data.agent_id,
          sessionId: data.session_id,
          userId: data.user_id,
          currentMode: data.current_mode as OpenCodeMode,
          planContent: data.plan_content ?? undefined,
          approvalToken: data.approval_token ?? undefined,
          approvedAt: data.approved_at ?? undefined,
          styleViolations: violations,
          createdAt: data.created_at,
          updatedAt: data.updated_at,
        });
        setMode(data.current_mode as OpenCodeMode);
        setStyleViolations(violations);
      }
    };

    loadSession();
  }, [agentId, sessionId]);

  // Execute operation through edge function
  const executeOperation = useCallback(async (
    operation: OpenCodeRequest['operation'],
    params: Record<string, unknown>,
    requestMode?: OpenCodeMode,
    approvalToken?: string
  ): Promise<OpenCodeResponse> => {
    if (!agentId || !sessionId) {
      return { success: false, mode: 'plan', error: 'Missing agentId or sessionId' };
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data: { session: authSession } } = await supabase.auth.getSession();
      
      if (!authSession?.access_token) {
        throw new Error('Not authenticated');
      }

      const response = await supabase.functions.invoke('opencode-execute', {
        body: {
          agentId,
          sessionId,
          operation,
          params,
          requestMode,
          approvalToken,
        } as OpenCodeRequest,
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      const result = response.data as OpenCodeResponse;
      
      if (result.styleViolations) {
        setStyleViolations(result.styleViolations);
      }
      
      if (result.mode !== mode) {
        setMode(result.mode);
      }

      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Operation failed';
      setError(message);
      return { success: false, mode, error: message };
    } finally {
      setIsLoading(false);
    }
  }, [agentId, sessionId, mode]);

  // Plan mode operations
  const listFiles = useCallback(async (
    path: string, 
    options?: { recursive?: boolean; pattern?: string }
  ) => {
    const result = await executeOperation('list', { path, ...options });
    return result.result;
  }, [executeOperation]);

  const readFile = useCallback(async (path: string) => {
    const result = await executeOperation('read', { path });
    return result.result as string;
  }, [executeOperation]);

  const searchCode = useCallback(async (
    query: string,
    options?: { path?: string; filePattern?: string }
  ) => {
    const result = await executeOperation('search', { query, ...options });
    return result.result;
  }, [executeOperation]);

  const generatePlan = useCallback(async (
    description: string,
    files: Array<{ path: string; action: string; changes?: string }>
  ): Promise<OpenCodePlan> => {
    return {
      id: crypto.randomUUID(),
      description,
      files: files.map(f => ({
        path: f.path,
        action: f.action as 'create' | 'modify' | 'delete',
        description: '',
        changes: f.changes,
      })),
      riskAssessment: {
        breakingChanges: false,
        newDependencies: false,
        securityImplications: false,
      },
      approvalRequired: true,
    };
  }, []);

  // Build mode operations
  const writeFile = useCallback(async (path: string, content: string) => {
    if (autoStyleCheck) {
      const result = checkOpenCodeStyle(content);
      setStyleViolations(result.violations as StyleViolation[]);
    }
    return executeOperation('write', { path, content });
  }, [executeOperation, autoStyleCheck]);

  const editFile = useCallback(async (path: string, search: string, replace: string) => {
    return executeOperation('edit', { path, search, replace });
  }, [executeOperation]);

  const runBash = useCallback(async (
    command: string,
    options?: { cwd?: string; timeout?: number }
  ) => {
    return executeOperation('bash', { command, ...options });
  }, [executeOperation]);

  // Mode control
  const requestApproval = useCallback(async (plan: OpenCodePlan): Promise<string> => {
    // Store plan and generate approval token
    const token = crypto.randomUUID();
    
    if (agentId && sessionId) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('opencode_sessions')
          .upsert({
            agent_id: agentId,
            session_id: sessionId,
            user_id: user.id,
            plan_content: JSON.stringify(plan),
            approval_token: token,
          }, {
            onConflict: 'agent_id,session_id',
          });
      }
    }
    
    return token;
  }, [agentId, sessionId]);

  const switchToBuild = useCallback(async (approvalToken: string): Promise<boolean> => {
    const result = await executeOperation('write', {}, 'build', approvalToken);
    
    if (result.success || result.mode === 'build') {
      setMode('build');
      return true;
    }
    
    return false;
  }, [executeOperation]);

  const resetToPlanning = useCallback(async () => {
    if (agentId && sessionId) {
      await supabase
        .from('opencode_sessions')
        .update({
          current_mode: 'plan',
          approval_token: null,
          approved_at: null,
        })
        .eq('agent_id', agentId)
        .eq('session_id', sessionId);
    }
    
    setMode('plan');
    setStyleViolations([]);
  }, [agentId, sessionId]);

  // Style checking
  const checkStyle = useCallback((code: string): StyleViolation[] => {
    const result = checkOpenCodeStyle(code);
    setStyleViolations(result.violations as StyleViolation[]);
    return result.violations as StyleViolation[];
  }, []);

  const clearViolations = useCallback(() => {
    setStyleViolations([]);
  }, []);

  return {
    mode,
    session,
    isLoading,
    error,
    
    listFiles,
    readFile,
    searchCode,
    generatePlan,
    
    writeFile,
    editFile,
    runBash,
    
    requestApproval,
    switchToBuild,
    resetToPlanning,
    
    styleViolations,
    checkStyle,
    clearViolations,
  };
}
