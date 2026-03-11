/**
 * Trace state reducer for predictable state management
 * Uses explicit sessionId for all operations to avoid race conditions
 */

import type { TraceSession, TraceEvent, TraceEventType, TraceEventData, TraceSessionStatus } from "./traceTypes.ts";

export interface TraceState {
  sessions: TraceSession[];
  activeSessionId: string | null;
}

export type TraceAction =
  | { type: "START_SESSION"; payload: { sessionId: string; query: string } }
  | { type: "ADD_EVENT"; payload: { sessionId: string; event: TraceEvent } }
  | { type: "END_SESSION"; payload: { sessionId: string; status: TraceSessionStatus } }
  | { type: "CLEAR_SESSIONS" }
  | { type: "SET_ACTIVE_SESSION"; payload: { sessionId: string | null } };

export const initialTraceState: TraceState = {
  sessions: [],
  activeSessionId: null,
};

export function traceReducer(state: TraceState, action: TraceAction): TraceState {
  switch (action.type) {
    case "START_SESSION": {
      const { sessionId, query } = action.payload;
      const newSession: TraceSession = {
        id: sessionId,
        query,
        startTime: new Date(),
        status: "running",
        events: [],
      };
      return {
        ...state,
        sessions: [newSession, ...state.sessions],
        activeSessionId: sessionId,
      };
    }

    case "ADD_EVENT": {
      const { sessionId, event } = action.payload;
      // Only add event if sessionId matches an existing session
      const sessionExists = state.sessions.some((s) => s.id === sessionId);
      if (!sessionExists) {
        console.warn(`[TraceReducer] ADD_EVENT: Session ${sessionId} not found, event dropped`);
        return state;
      }

      return {
        ...state,
        sessions: state.sessions.map((session) =>
          session.id === sessionId
            ? { ...session, events: [...session.events, event] }
            : session
        ),
      };
    }

    case "END_SESSION": {
      const { sessionId, status } = action.payload;
      return {
        ...state,
        sessions: state.sessions.map((session) =>
          session.id === sessionId
            ? { ...session, status, endTime: new Date() }
            : session
        ),
        // Clear active session if it was the one being ended
        activeSessionId: state.activeSessionId === sessionId ? null : state.activeSessionId,
      };
    }

    case "CLEAR_SESSIONS":
      return {
        sessions: [],
        activeSessionId: null,
      };

    case "SET_ACTIVE_SESSION":
      return {
        ...state,
        activeSessionId: action.payload.sessionId,
      };

    default:
      return state;
  }
}

// Helper to create a trace event with proper ID and timestamp
export function createTraceEvent(
  type: TraceEventType,
  data: TraceEventData
): TraceEvent {
  return {
    id: `event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    type,
    timestamp: new Date(),
    data,
  };
}

// Helper to generate a session ID
export function generateSessionId(): string {
  return `session-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
}
