/**
 * useTrace hook - Clean API for trace management
 * Encapsulates reducer and provides stable callbacks
 */

import { useReducer, useCallback, useRef } from "react";
import {
  traceReducer,
  initialTraceState,
  createTraceEvent,
  generateSessionId,
} from "./traceReducer.ts";
import type { TraceEventType, TraceEventData, TraceSessionStatus } from "./traceTypes.ts";

export function useTrace() {
  const [state, dispatch] = useReducer(traceReducer, initialTraceState);
  
  // Ref to track the current session ID for async operations
  // This ensures that even in closures, we can access the latest session ID
  const activeSessionRef = useRef<string | null>(null);

  /**
   * Start a new trace session
   * @param query - The user query that initiated this session
   * @returns The new session ID
   */
  const startSession = useCallback((query: string): string => {
    const sessionId = generateSessionId();
    activeSessionRef.current = sessionId;
    dispatch({ type: "START_SESSION", payload: { sessionId, query } });
    return sessionId;
  }, []);

  /**
   * Add an event to a specific session
   * @param type - The event type
   * @param data - The event data
   * @param sessionId - Optional session ID (defaults to active session)
   */
  const addEvent = useCallback(
    (type: TraceEventType, data: TraceEventData, sessionId?: string): void => {
      const targetSessionId = sessionId ?? activeSessionRef.current;
      
      if (!targetSessionId) {
        console.warn(`[useTrace] addEvent: No active session, event dropped`, { type, data });
        return;
      }

      const event = createTraceEvent(type, data);
      dispatch({ type: "ADD_EVENT", payload: { sessionId: targetSessionId, event } });
    },
    []
  );

  /**
   * End a session with a final status
   * @param status - The final status of the session
   * @param sessionId - Optional session ID (defaults to active session)
   */
  const endSession = useCallback(
    (status: TraceSessionStatus, sessionId?: string): void => {
      const targetSessionId = sessionId ?? activeSessionRef.current;
      
      if (!targetSessionId) {
        console.warn(`[useTrace] endSession: No session to end`);
        return;
      }

      dispatch({ type: "END_SESSION", payload: { sessionId: targetSessionId, status } });
      
      // Clear the active session ref if we're ending the active session
      if (!sessionId || sessionId === activeSessionRef.current) {
        activeSessionRef.current = null;
      }
    },
    []
  );

  /**
   * Clear all sessions
   */
  const clearSessions = useCallback((): void => {
    activeSessionRef.current = null;
    dispatch({ type: "CLEAR_SESSIONS" });
  }, []);

  /**
   * Get the current active session ID
   */
  const getActiveSessionId = useCallback((): string | null => {
    return activeSessionRef.current;
  }, []);

  return {
    // State
    sessions: state.sessions,
    activeSessionId: state.activeSessionId,
    
    // Actions
    startSession,
    addEvent,
    endSession,
    clearSessions,
    getActiveSessionId,
  };
}

// Re-export types for convenience
export type { TraceEventType, TraceEventData, TraceSessionStatus } from "./traceTypes.ts";
export type { TraceSession, TraceEvent } from "./traceTypes.ts";
