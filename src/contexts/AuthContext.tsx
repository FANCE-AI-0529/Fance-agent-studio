/**
 * @file AuthContext.tsx
 * @description 用户认证上下文 - Authentication Context Provider
 * @author Fance Studio
 * @copyright Copyright (c) 2025 Fance Studio. MIT License.
 */
import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, displayName?: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

// Helper function to log security events
const logSecurityEvent = async (
  userId: string | null,
  eventType: string,
  eventCategory: string,
  success: boolean = true,
  errorMessage?: string
) => {
  try {
    await supabase.from('security_audit_logs').insert({
      user_id: userId,
      event_type: eventType,
      event_category: eventCategory,
      user_agent: navigator.userAgent,
      metadata: {
        timestamp: new Date().toISOString(),
        url: window.location.href,
      },
      success,
      error_message: errorMessage,
    });
  } catch (err) {
    console.error('Failed to log security event:', err);
  }
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, displayName?: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          display_name: displayName,
        },
      },
    });
    
    return { error: error as Error | null };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    return { error: error as Error | null };
  };

  const signOut = useCallback(async () => {
    const currentUserId = user?.id;
    await supabase.auth.signOut();
    
    // Log logout event
    if (currentUserId) {
      await logSecurityEvent(currentUserId, 'logout', 'authentication');
    }
  }, [user?.id]);

  return (
    <AuthContext.Provider value={{ user, session, loading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}