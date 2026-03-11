import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../integrations/supabase/client.ts";
import { useAuth } from "../contexts/AuthContext.tsx";
import { toast } from "sonner";

export interface Entity {
  id: string;
  user_id: string;
  agent_id: string | null;
  name: string;
  entity_type: string;
  description: string | null;
  source_document: string | null;
  source_content: string | null;
  embedding: number[] | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface EntityRelation {
  id: string;
  user_id: string;
  source_entity_id: string;
  target_entity_id: string;
  relation_type: string;
  strength: number;
  description: string | null;
  is_bidirectional: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface DocumentProcessing {
  id: string;
  user_id: string;
  agent_id: string | null;
  document_name: string;
  document_content: string | null;
  status: string;
  entities_count: number;
  relations_count: number;
  error_message: string | null;
  created_at: string;
  completed_at: string | null;
}

export interface RSSQueryResult {
  success: boolean;
  anchors: Array<{
    entity_id: string;
    entity_name: string;
    entity_type: string;
    similarity: number;
    description: string | null;
  }>;
  subgraph: Array<{
    entity_id: string;
    entity_name: string;
    entity_type: string;
    description: string | null;
    relation_path: string;
    depth: number;
  }>;
  entities: Entity[];
  relations: EntityRelation[];
  context: string;
  stats: {
    anchorCount: number;
    subgraphNodes: number;
    relationsCount: number;
    contextLength: number;
  };
}

// Fetch all entities for user
export function useEntities(agentId?: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["entities", user?.id, agentId],
    queryFn: async () => {
      let query = supabase
        .from("entities")
        .select("*")
        .order("created_at", { ascending: false });

      if (agentId) {
        query = query.eq("agent_id", agentId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as Entity[];
    },
    enabled: !!user,
  });
}

// Fetch all relations for user
export function useEntityRelations(entityIds?: string[]) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["entity-relations", user?.id, entityIds],
    queryFn: async () => {
      let query = supabase
        .from("entity_relations")
        .select("*")
        .order("created_at", { ascending: false });

      if (entityIds && entityIds.length > 0) {
        query = query.or(
          `source_entity_id.in.(${entityIds.join(",")}),target_entity_id.in.(${entityIds.join(",")})`
        );
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as EntityRelation[];
    },
    enabled: !!user,
  });
}

// Fetch document processing history
export function useDocumentProcessing(agentId?: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["document-processing", user?.id, agentId],
    queryFn: async () => {
      let query = supabase
        .from("document_processing")
        .select("*")
        .order("created_at", { ascending: false });

      if (agentId) {
        query = query.eq("agent_id", agentId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as DocumentProcessing[];
    },
    enabled: !!user,
  });
}

// Extract entities from document
export function useExtractEntities() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      documentContent,
      documentName,
      agentId,
    }: {
      documentContent: string;
      documentName: string;
      agentId?: string;
    }) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const response = await supabase.functions.invoke("entity-extraction", {
        body: { documentContent, documentName, agentId },
      });

      if (response.error) throw response.error;
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["entities"] });
      queryClient.invalidateQueries({ queryKey: ["entity-relations"] });
      queryClient.invalidateQueries({ queryKey: ["document-processing"] });
      toast.success(`成功提取 ${data.entitiesCount} 个实体和 ${data.relationsCount} 个关系`);
    },
    onError: (error) => {
      toast.error(`实体提取失败: ${error.message}`);
    },
  });
}

// RSS Query - Runtime State Slice
export function useRSSQuery() {
  return useMutation({
    mutationFn: async ({
      query,
      agentId,
      topK = 5,
      traverseDepth = 2,
      relationTypes,
    }: {
      query: string;
      agentId?: string;
      topK?: number;
      traverseDepth?: number;
      relationTypes?: string[];
    }): Promise<RSSQueryResult> => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const response = await supabase.functions.invoke("rss-query", {
        body: { query, agentId, topK, traverseDepth, relationTypes },
      });

      if (response.error) throw response.error;
      return response.data;
    },
  });
}

// Delete entity
export function useDeleteEntity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (entityId: string) => {
      const { error } = await supabase
        .from("entities")
        .delete()
        .eq("id", entityId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["entities"] });
      queryClient.invalidateQueries({ queryKey: ["entity-relations"] });
      toast.success("实体已删除");
    },
    onError: (error) => {
      toast.error(`删除失败: ${error.message}`);
    },
  });
}

// Update entity
export function useUpdateEntity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<Pick<Entity, "name" | "description" | "entity_type">>;
    }) => {
      const { error } = await supabase
        .from("entities")
        .update(updates)
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["entities"] });
      toast.success("实体已更新");
    },
    onError: (error) => {
      toast.error(`更新失败: ${error.message}`);
    },
  });
}

// Create manual relation
export function useCreateRelation() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      sourceEntityId,
      targetEntityId,
      relationType,
      description,
    }: {
      sourceEntityId: string;
      targetEntityId: string;
      relationType: string;
      description?: string;
    }) => {
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from("entity_relations").insert({
        user_id: user.id,
        source_entity_id: sourceEntityId,
        target_entity_id: targetEntityId,
        relation_type: relationType,
        description,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["entity-relations"] });
      toast.success("关系已创建");
    },
    onError: (error) => {
      toast.error(`创建关系失败: ${error.message}`);
    },
  });
}

// Delete relation
export function useDeleteRelation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (relationId: string) => {
      const { error } = await supabase
        .from("entity_relations")
        .delete()
        .eq("id", relationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["entity-relations"] });
      toast.success("关系已删除");
    },
    onError: (error) => {
      toast.error(`删除关系失败: ${error.message}`);
    },
  });
}

// Entity type colors
export const entityTypeColors: Record<string, string> = {
  person: "#4CAF50",
  organization: "#2196F3",
  document: "#FF9800",
  location: "#9C27B0",
  concept: "#00BCD4",
  process: "#E91E63",
  regulation: "#795548",
};

// Relation type labels
export const relationTypeLabels: Record<string, string> = {
  belongs_to: "隶属于",
  requires: "需要",
  provides: "提供",
  located_at: "位于",
  manages: "管理",
  regulates: "监管",
  processes: "处理",
};
