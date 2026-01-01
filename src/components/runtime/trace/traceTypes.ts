/**
 * Unified types for the Decision Tracking (Trace) module
 * Single source of truth for all trace-related types
 */

export type TraceEventType =
  | "intent_detected"
  | "skill_selected"
  | "permission_check"
  | "confirm_requested"
  | "confirm_approved"
  | "confirm_rejected"
  | "execution_started"
  | "execution_completed"
  | "execution_failed"
  | "ai_response_complete"
  | "error";

export interface TraceEventData {
  skillName?: string;
  intent?: string;
  permissions?: string[];
  reason?: string;
  duration?: number;
  result?: string;
  tokenCount?: number;
  message?: string;
  code?: string;
}

export interface TraceEvent {
  id: string;
  type: TraceEventType;
  timestamp: Date;
  data: TraceEventData;
}

export type TraceSessionStatus = "running" | "completed" | "failed" | "cancelled";

export interface TraceSession {
  id: string;
  query: string;
  startTime: Date;
  endTime?: Date;
  status: TraceSessionStatus;
  events: TraceEvent[];
}
