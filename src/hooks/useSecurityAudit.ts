import { supabase } from "../integrations/supabase/client.ts";

export type SecurityEventType = 
  | 'login_success'
  | 'login_failed'
  | 'signup_success'
  | 'signup_failed'
  | 'logout'
  | 'password_change'
  | 'password_reset_request'
  | 'password_reset_complete'
  | 'profile_update'
  | 'permission_change'
  | 'api_key_created'
  | 'api_key_deleted'
  | 'agent_created'
  | 'agent_deleted'
  | 'agent_published'
  | 'sensitive_data_access';

export type SecurityEventCategory = 
  | 'authentication'
  | 'authorization'
  | 'data_access'
  | 'configuration'
  | 'general';

interface AuditLogParams {
  eventType: SecurityEventType;
  eventCategory?: SecurityEventCategory;
  userId?: string;
  metadata?: Record<string, unknown>;
  success?: boolean;
  errorMessage?: string;
}

export function useSecurityAudit() {
  const logSecurityEvent = async ({
    eventType,
    eventCategory = 'general',
    userId,
    metadata = {},
    success = true,
    errorMessage,
  }: AuditLogParams) => {
    try {
      // Get user agent and approximate IP info
      const userAgent = navigator.userAgent;
      
      const { error } = await supabase
        .from('security_audit_logs')
        .insert({
          user_id: userId || null,
          event_type: eventType,
          event_category: eventCategory,
          user_agent: userAgent,
          metadata: {
            ...metadata,
            timestamp: new Date().toISOString(),
            url: globalThis.location.href,
          },
          success,
          error_message: errorMessage,
        });

      if (error) {
        console.error('Failed to log security event:', error);
      }
    } catch (err) {
      console.error('Error logging security event:', err);
    }
  };

  const logLogin = async (userId: string, success: boolean, errorMessage?: string) => {
    await logSecurityEvent({
      eventType: success ? 'login_success' : 'login_failed',
      eventCategory: 'authentication',
      userId: success ? userId : undefined,
      success,
      errorMessage,
      metadata: {
        action: 'login',
      },
    });
  };

  const logSignup = async (userId: string, success: boolean, errorMessage?: string) => {
    await logSecurityEvent({
      eventType: success ? 'signup_success' : 'signup_failed',
      eventCategory: 'authentication',
      userId: success ? userId : undefined,
      success,
      errorMessage,
      metadata: {
        action: 'signup',
      },
    });
  };

  const logLogout = async (userId: string) => {
    await logSecurityEvent({
      eventType: 'logout',
      eventCategory: 'authentication',
      userId,
      metadata: {
        action: 'logout',
      },
    });
  };

  const logPasswordChange = async (userId: string, success: boolean, errorMessage?: string) => {
    await logSecurityEvent({
      eventType: 'password_change',
      eventCategory: 'authentication',
      userId,
      success,
      errorMessage,
    });
  };

  const logPermissionChange = async (
    userId: string, 
    targetUserId: string, 
    oldPermissions: string[], 
    newPermissions: string[]
  ) => {
    await logSecurityEvent({
      eventType: 'permission_change',
      eventCategory: 'authorization',
      userId,
      metadata: {
        target_user_id: targetUserId,
        old_permissions: oldPermissions,
        new_permissions: newPermissions,
      },
    });
  };

  const logApiKeyEvent = async (
    userId: string, 
    action: 'created' | 'deleted', 
    keyName: string
  ) => {
    await logSecurityEvent({
      eventType: action === 'created' ? 'api_key_created' : 'api_key_deleted',
      eventCategory: 'configuration',
      userId,
      metadata: {
        key_name: keyName,
        action,
      },
    });
  };

  const logAgentEvent = async (
    userId: string,
    action: 'created' | 'deleted' | 'published',
    agentId: string,
    agentName: string
  ) => {
    const eventTypeMap = {
      created: 'agent_created',
      deleted: 'agent_deleted',
      published: 'agent_published',
    } as const;

    await logSecurityEvent({
      eventType: eventTypeMap[action],
      eventCategory: 'configuration',
      userId,
      metadata: {
        agent_id: agentId,
        agent_name: agentName,
        action,
      },
    });
  };

  const logSensitiveDataAccess = async (
    userId: string,
    resourceType: string,
    resourceId: string,
    action: string
  ) => {
    await logSecurityEvent({
      eventType: 'sensitive_data_access',
      eventCategory: 'data_access',
      userId,
      metadata: {
        resource_type: resourceType,
        resource_id: resourceId,
        action,
      },
    });
  };

  return {
    logSecurityEvent,
    logLogin,
    logSignup,
    logLogout,
    logPasswordChange,
    logPermissionChange,
    logApiKeyEvent,
    logAgentEvent,
    logSensitiveDataAccess,
  };
}
