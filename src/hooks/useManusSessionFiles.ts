import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  MANUS_FILE_PATHS,
  generateDefaultContent,
} from "@/data/manusKernel";

export interface ManusSessionFile {
  id: string;
  sessionId: string;
  agentId: string | null;
  filePath: string;
  content: string;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

export function useManusSessionFiles() {
  const { user } = useAuth();

  // Initialize Manus files for a new session
  const initializeManusFiles = useCallback(async (
    sessionId: string,
    agentId?: string | null
  ): Promise<ManusSessionFile[]> => {
    if (!user) return [];

    const filePaths = Object.values(MANUS_FILE_PATHS);
    const createdFiles: ManusSessionFile[] = [];

    for (const filePath of filePaths) {
      const content = generateDefaultContent(filePath);

      const { data, error } = await supabase
        .from("agent_memory_files")
        .insert({
          session_id: sessionId,
          agent_id: agentId || null,
          file_path: filePath,
          file_type: "markdown",
          content,
          version: 1,
          last_modified_by: "system",
        })
        .select()
        .single();

      if (error) {
        console.error(`Error creating Manus file ${filePath}:`, error);
        continue;
      }

      if (data) {
        createdFiles.push({
          id: data.id,
          sessionId: data.session_id || "",
          agentId: data.agent_id,
          filePath: data.file_path,
          content: data.content,
          version: data.version,
          createdAt: new Date(data.created_at || Date.now()),
          updatedAt: new Date(data.updated_at || Date.now()),
        });
      }
    }

    return createdFiles;
  }, [user]);

  // Load Manus files for a session
  const loadManusFiles = useCallback(async (
    sessionId: string
  ): Promise<ManusSessionFile[]> => {
    if (!user) return [];

    const { data, error } = await supabase
      .from("agent_memory_files")
      .select("*")
      .eq("session_id", sessionId)
      .in("file_path", Object.values(MANUS_FILE_PATHS))
      .order("file_path");

    if (error) {
      console.error("Error loading Manus files:", error);
      return [];
    }

    return (data || []).map((file) => ({
      id: file.id,
      sessionId: file.session_id || "",
      agentId: file.agent_id,
      filePath: file.file_path,
      content: file.content,
      version: file.version,
      createdAt: new Date(file.created_at || Date.now()),
      updatedAt: new Date(file.updated_at || Date.now()),
    }));
  }, [user]);

  // Update a specific Manus file
  const updateManusFile = useCallback(async (
    sessionId: string,
    filePath: string,
    content: string,
    modifiedBy: "user" | "agent" | "system" = "system"
  ): Promise<boolean> => {
    if (!user) return false;

    const { error } = await supabase
      .from("agent_memory_files")
      .update({
        content,
        version: supabase.rpc ? undefined : 1, // Increment handled by trigger if exists
        last_modified_by: modifiedBy,
        updated_at: new Date().toISOString(),
      })
      .eq("session_id", sessionId)
      .eq("file_path", filePath);

    if (error) {
      console.error(`Error updating Manus file ${filePath}:`, error);
      return false;
    }

    return true;
  }, [user]);

  // Check if Manus files exist for a session
  const hasManusFiles = useCallback(async (sessionId: string): Promise<boolean> => {
    if (!user) return false;

    const { count, error } = await supabase
      .from("agent_memory_files")
      .select("id", { count: "exact", head: true })
      .eq("session_id", sessionId)
      .in("file_path", Object.values(MANUS_FILE_PATHS));

    if (error) {
      console.error("Error checking Manus files:", error);
      return false;
    }

    return (count || 0) >= Object.keys(MANUS_FILE_PATHS).length;
  }, [user]);

  // Ensure Manus files exist (initialize if not)
  const ensureManusFiles = useCallback(async (
    sessionId: string,
    agentId?: string | null
  ): Promise<ManusSessionFile[]> => {
    const exists = await hasManusFiles(sessionId);
    
    if (exists) {
      return loadManusFiles(sessionId);
    }

    return initializeManusFiles(sessionId, agentId);
  }, [hasManusFiles, loadManusFiles, initializeManusFiles]);

  return {
    initializeManusFiles,
    loadManusFiles,
    updateManusFile,
    hasManusFiles,
    ensureManusFiles,
  };
}
