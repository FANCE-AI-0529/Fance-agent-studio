import { useCallback, useEffect } from 'react';
import { supabase } from '../integrations/supabase/client.ts';
import { useAuth } from '../contexts/AuthContext.tsx';
import { useManusMemoryStore } from '../stores/manusMemoryStore.ts';
import { 
  MANUS_KERNEL, 
  MANUS_FILE_PATHS, 
  generateDefaultContent,
  parseTaskPlanPhases,
  parseFindingsCount
} from '../data/manusKernel.ts';
import { toast } from './use-toast.ts';

export interface ManusMemoryFile {
  id: string;
  agent_id: string;
  session_id: string;
  file_path: string;
  file_type: string;
  content: string;
  version: number;
  last_modified_by: string;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export function useManusKernel(agentId: string | null) {
  const { user } = useAuth();
  const store = useManusMemoryStore();
  
  // 初始化 Manus 内存文件
  const initializeMemoryFiles = useCallback(async (sessionId: string) => {
    if (!agentId || !user) return false;
    
    try {
      const filePaths = Object.values(MANUS_FILE_PATHS);
      const existingFiles: ManusMemoryFile[] = [];
      
      // 检查是否已存在文件
      const { data: existing } = await supabase
        .from('agent_memory_files')
        .select('*')
        .eq('agent_id', agentId)
        .eq('session_id', sessionId)
        .in('file_path', filePaths);
      
      if (existing && existing.length > 0) {
        // 使用现有文件
        existingFiles.push(...(existing as ManusMemoryFile[]));
      } else {
        // 创建新文件
        const newFiles = filePaths.map(path => ({
          agent_id: agentId,
          session_id: sessionId,
          file_path: path,
          file_type: 'markdown',
          content: generateDefaultContent(path),
          last_modified_by: 'system',
          metadata: { kernel: MANUS_KERNEL.id }
        }));
        
        const { data: created, error } = await supabase
          .from('agent_memory_files')
          .insert(newFiles)
          .select();
        
        if (error) throw error;
        if (created) existingFiles.push(...(created as ManusMemoryFile[]));
      }
      
      // 更新 store
      store.initializeSession(sessionId);
      
      for (const file of existingFiles) {
        switch (file.file_path) {
          case MANUS_FILE_PATHS.TASK_PLAN:
            store.updateTaskPlan(file.content);
            const phases = parseTaskPlanPhases(file.content);
            store.setPhaseProgress(phases.activePhase, phases.phases.length, phases.progress);
            break;
          case MANUS_FILE_PATHS.FINDINGS:
            store.updateFindings(file.content);
            store.setFindingsCount(parseFindingsCount(file.content));
            break;
          case MANUS_FILE_PATHS.PROGRESS:
            store.updateProgress(file.content);
            break;
        }
      }
      
      return true;
    } catch (error) {
      console.error('Failed to initialize Manus memory files:', error);
      return false;
    }
  }, [agentId, user, store]);
  
  // 读取内存文件
  const readMemoryFile = useCallback(async (filePath: string): Promise<string | null> => {
    if (!agentId || !store.sessionId) return null;
    
    try {
      const { data, error } = await supabase
        .from('agent_memory_files')
        .select('content')
        .eq('agent_id', agentId)
        .eq('session_id', store.sessionId)
        .eq('file_path', filePath)
        .single();
      
      if (error) throw error;
      return (data as { content: string })?.content || null;
    } catch (error) {
      console.error(`Failed to read ${filePath}:`, error);
      return null;
    }
  }, [agentId, store.sessionId]);
  
  // 更新内存文件
  const updateMemoryFile = useCallback(async (
    filePath: string, 
    content: string,
    modifiedBy: 'user' | 'agent' | 'system' = 'agent'
  ): Promise<boolean> => {
    if (!agentId || !store.sessionId) return false;
    
    try {
      const { error } = await supabase
        .from('agent_memory_files')
        .update({ 
          content, 
          last_modified_by: modifiedBy,
          version: supabase.rpc ? undefined : 1 // 增加版本
        })
        .eq('agent_id', agentId)
        .eq('session_id', store.sessionId)
        .eq('file_path', filePath);
      
      if (error) throw error;
      
      // 更新 store
      switch (filePath) {
        case MANUS_FILE_PATHS.TASK_PLAN:
          store.updateTaskPlan(content);
          const phases = parseTaskPlanPhases(content);
          store.setPhaseProgress(phases.activePhase, phases.phases.length, phases.progress);
          break;
        case MANUS_FILE_PATHS.FINDINGS:
          store.updateFindings(content);
          store.setFindingsCount(parseFindingsCount(content));
          break;
        case MANUS_FILE_PATHS.PROGRESS:
          store.updateProgress(content);
          break;
      }
      
      return true;
    } catch (error) {
      console.error(`Failed to update ${filePath}:`, error);
      return false;
    }
  }, [agentId, store]);
  
  // 执行 PreToolUse Hook
  const executePreToolUse = useCallback(async (toolName: string): Promise<string | null> => {
    const hook = MANUS_KERNEL.hooks.PreToolUse;
    
    if (hook.matcher && new RegExp(hook.matcher).test(toolName)) {
      // 读取 task_plan.md
      const taskPlan = await readMemoryFile(MANUS_FILE_PATHS.TASK_PLAN);
      return taskPlan;
    }
    
    return null;
  }, [readMemoryFile]);
  
  // 执行 PostToolUse Hook
  const executePostToolUse = useCallback(async (toolName: string): Promise<{
    shouldUpdate: boolean;
    message?: string;
  }> => {
    const hook = MANUS_KERNEL.hooks.PostToolUse;
    
    // 增加操作计数
    store.incrementActionCount();
    
    // 检查是否需要提醒更新
    if (hook.matcher && new RegExp(hook.matcher).test(toolName)) {
      return {
        shouldUpdate: true,
        message: '如果已完成当前阶段，请更新 task_plan.md'
      };
    }
    
    return { shouldUpdate: false };
  }, [store]);
  
  // 检查 2-Action Rule
  const checkTwoActionRule = useCallback((): boolean => {
    store.incrementBrowseCount();
    
    if (store.checkTwoActionRule()) {
      toast({
        title: '2-Action Rule',
        description: '已执行 2 次浏览操作，请更新 findings.md',
        variant: 'default'
      });
      return true;
    }
    
    return false;
  }, [store]);
  
  // 检查 3-Strike Protocol
  const checkThreeStrikeProtocol = useCallback((): boolean => {
    if (store.checkThreeStrikeProtocol()) {
      toast({
        title: '3-Strike Protocol',
        description: '连续 3 次失败，建议重新审视策略',
        variant: 'destructive'
      });
      return true;
    }
    return false;
  }, [store]);
  
  // 检查 5-Question Reboot
  const checkFiveQuestionReboot = useCallback((): boolean => {
    store.incrementQuestionCount();
    
    if (store.checkFiveQuestionReboot()) {
      toast({
        title: '5-Question Reboot',
        description: '已回答 5 个问题，建议回顾 task_plan.md 确认方向',
        variant: 'default'
      });
      return true;
    }
    
    return false;
  }, [store]);
  
  // 执行 Stop Hook
  const executeStop = useCallback(async (): Promise<{
    canStop: boolean;
    incompletePhases?: string[];
  }> => {
    const taskPlan = await readMemoryFile(MANUS_FILE_PATHS.TASK_PLAN);
    if (!taskPlan) return { canStop: true };
    
    const { phases } = parseTaskPlanPhases(taskPlan);
    const incomplete = phases.filter(p => !p.completed).map(p => p.name);
    
    if (incomplete.length > 0) {
      return {
        canStop: false,
        incompletePhases: incomplete
      };
    }
    
    return { canStop: true };
  }, [readMemoryFile]);
  
  // 获取规划状态摘要
  const getPlanningState = useCallback(() => {
    return {
      sessionId: store.sessionId,
      currentPhase: store.currentPhase,
      totalPhases: store.totalPhases,
      progress: store.phaseProgress,
      findingsCount: store.findingsCount,
      actionCount: store.actionCount,
      errorStrikes: store.errorStrikes,
      needsFindingsUpdate: store.needsFindingsUpdate,
      needsRebootCheck: store.needsRebootCheck,
      isInitialized: store.isInitialized,
    };
  }, [store]);
  
  return {
    // 初始化
    initializeMemoryFiles,
    
    // 文件操作
    readMemoryFile,
    updateMemoryFile,
    
    // Hooks
    executePreToolUse,
    executePostToolUse,
    executeStop,
    
    // 规则检查
    checkTwoActionRule,
    checkThreeStrikeProtocol,
    checkFiveQuestionReboot,
    
    // 状态
    getPlanningState,
    
    // 直接访问 store 数据
    taskPlan: store.taskPlan,
    findings: store.findings,
    progress: store.progress,
    isInitialized: store.isInitialized,
    
    // Store actions
    addError: store.addError,
    addDecision: store.addDecision,
    resolveError: store.resolveError,
    resetSession: store.resetSession,
  };
}
