import { useCallback } from 'react';
import { useManusMemoryStore } from '@/stores/manusMemoryStore';

export type ViolationType = 
  | 'missing_progress_update'
  | '2_action_rule'
  | '3_strike_protocol'
  | '5_question_reboot'
  | 'no_task_plan';

export interface ProtocolViolation {
  isViolation: boolean;
  violationType?: ViolationType;
  message?: string;
  severity?: 'warning' | 'error';
  ruleDetails?: {
    currentCount: number;
    threshold: number;
    ruleName: string;
  };
}

export interface MPLPInterceptAction {
  type: 'manus_violation';
  skillName: string;
  description: string;
  riskLevel: 'low' | 'medium' | 'high';
  requiresConfirm: boolean;
  details: string;
  violationType: ViolationType;
}

function getViolationDetails(violationType: ViolationType): string {
  switch (violationType) {
    case 'missing_progress_update':
      return '根据 Manus 协议，在执行任何操作后必须更新 progress.md 记录进度。请先更新进度文件再继续。';
    case '2_action_rule':
      return '2-Action Rule 已触发：连续执行了 2 个浏览/收集操作。请先在 findings.md 中记录发现再继续。';
    case '3_strike_protocol':
      return '3-Strike Protocol 已触发：连续 3 次操作失败。建议检查 task_plan.md 重新评估策略。';
    case '5_question_reboot':
      return '5-Question Reboot 已触发：已连续提问 5 次。建议重读 task_plan.md 明确任务目标。';
    case 'no_task_plan':
      return 'Manus 协议要求必须先初始化 task_plan.md 才能开始工作。';
    default:
      return '检测到协议违规，请遵循 Manus 工作协议。';
  }
}

export function useManusProtocolEnforcer(agentId: string | null) {
  const store = useManusMemoryStore();

  // Check if the current action complies with Manus protocol
  const checkProtocolCompliance = useCallback((
    action: 'respond' | 'tool_use' | 'browse' | 'question',
    context?: {
      hasUpdatedProgress?: boolean;
      hasUpdatedFindings?: boolean;
      toolName?: string;
    }
  ): ProtocolViolation => {
    // If Manus is not initialized, only violation for responses
    if (!store.isInitialized && action === 'respond') {
      return {
        isViolation: true,
        violationType: 'no_task_plan',
        message: 'Protocol Violation: Initialize task_plan.md first.',
        severity: 'error',
      };
    }

    // Check if trying to respond without updating progress
    if (action === 'respond' && context?.hasUpdatedProgress === false) {
      return {
        isViolation: true,
        violationType: 'missing_progress_update',
        message: 'Protocol Violation: Please update progress.md first.',
        severity: 'warning',
      };
    }

    // Check 2-Action Rule (after 2 browse actions without updating findings)
    if (store.needsFindingsUpdate && action !== 'question') {
      return {
        isViolation: true,
        violationType: '2_action_rule',
        message: '2-Action Rule: Please update findings.md before continuing.',
        severity: 'warning',
        ruleDetails: {
          currentCount: store.browseCount,
          threshold: 2,
          ruleName: '2-Action Rule',
        },
      };
    }

    // Check 3-Strike Protocol
    if (store.errorStrikes >= 3) {
      return {
        isViolation: true,
        violationType: '3_strike_protocol',
        message: '3-Strike Protocol: Too many consecutive failures.',
        severity: 'error',
        ruleDetails: {
          currentCount: store.errorStrikes,
          threshold: 3,
          ruleName: '3-Strike Protocol',
        },
      };
    }

    // Check 5-Question Reboot
    if (store.questionCount >= 5 && action !== 'question') {
      return {
        isViolation: true,
        violationType: '5_question_reboot',
        message: '5-Question Reboot: Re-read task_plan.md before continuing.',
        severity: 'warning',
        ruleDetails: {
          currentCount: store.questionCount,
          threshold: 5,
          ruleName: '5-Question Reboot',
        },
      };
    }

    return { isViolation: false };
  }, [store.isInitialized, store.needsFindingsUpdate, store.browseCount, store.errorStrikes, store.questionCount]);

  // Trigger MPLP intercept for protocol violation
  const triggerMPLPIntercept = useCallback((violationType: ViolationType): MPLPInterceptAction => {
    const severity = violationType === 'missing_progress_update' || violationType === '2_action_rule' 
      ? 'medium' 
      : 'high';

    return {
      type: 'manus_violation',
      skillName: 'Manus Protocol',
      description: `协议违规: ${violationType.replace(/_/g, ' ').toUpperCase()}`,
      riskLevel: severity,
      requiresConfirm: severity === 'high',
      details: getViolationDetails(violationType),
      violationType,
    };
  }, []);

  // Record action for rule tracking
  const recordAction = useCallback((actionType: 'browse' | 'question' | 'error' | 'success') => {
    switch (actionType) {
      case 'browse':
        store.incrementBrowseCount();
        break;
      case 'question':
        store.incrementQuestionCount();
        break;
      case 'error':
        store.addError({
          message: 'Action failed',
          context: 'execution',
        });
        break;
      case 'success':
        store.resetErrorStrikes();
        break;
    }
  }, [store]);

  // Check if agent is compliant (for visual feedback)
  const isCompliant = useCallback((): boolean => {
    return store.isInitialized && 
           !store.needsFindingsUpdate && 
           store.errorStrikes < 3 && 
           store.questionCount < 5;
  }, [store.isInitialized, store.needsFindingsUpdate, store.errorStrikes, store.questionCount]);

  // Get current Manus state for display
  const getManusState = useCallback(() => ({
    initialized: store.isInitialized,
    taskPlan: store.taskPlan,
    findings: store.findings,
    progress: store.progress,
    activePhase: store.currentPhase,
    phaseProgress: store.phaseProgress,
    actionCount: store.actionCount,
    browseCount: store.browseCount,
    errorStrikes: store.errorStrikes,
    questionCount: store.questionCount,
    needsFindingsUpdate: store.needsFindingsUpdate,
    needsTaskPlanUpdate: store.needsRebootCheck,
    isCompliant: isCompliant(),
  }), [store, isCompliant]);

  return {
    checkProtocolCompliance,
    triggerMPLPIntercept,
    recordAction,
    isCompliant,
    getManusState,
    // Direct store access for mutations
    store,
  };
}
