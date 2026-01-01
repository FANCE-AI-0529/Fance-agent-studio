export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      agent_collaborations: {
        Row: {
          capabilities: Json | null
          created_at: string
          handshake_token: string | null
          id: string
          initiator_agent_id: string
          last_heartbeat: string | null
          protocol_version: string
          status: string
          target_agent_id: string
          trust_level: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          capabilities?: Json | null
          created_at?: string
          handshake_token?: string | null
          id?: string
          initiator_agent_id: string
          last_heartbeat?: string | null
          protocol_version?: string
          status?: string
          target_agent_id: string
          trust_level?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          capabilities?: Json | null
          created_at?: string
          handshake_token?: string | null
          id?: string
          initiator_agent_id?: string
          last_heartbeat?: string | null
          protocol_version?: string
          status?: string
          target_agent_id?: string
          trust_level?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_collaborations_initiator_agent_id_fkey"
            columns: ["initiator_agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_collaborations_target_agent_id_fkey"
            columns: ["target_agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_skills: {
        Row: {
          agent_id: string
          created_at: string
          id: string
          skill_id: string
        }
        Insert: {
          agent_id: string
          created_at?: string
          id?: string
          skill_id: string
        }
        Update: {
          agent_id?: string
          created_at?: string
          id?: string
          skill_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_skills_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_skills_skill_id_fkey"
            columns: ["skill_id"]
            isOneToOne: false
            referencedRelation: "skills"
            referencedColumns: ["id"]
          },
        ]
      }
      agents: {
        Row: {
          author_id: string | null
          created_at: string
          department: string | null
          id: string
          manifest: Json | null
          model: string
          mplp_policy: string
          name: string
          status: string
          updated_at: string
        }
        Insert: {
          author_id?: string | null
          created_at?: string
          department?: string | null
          id?: string
          manifest?: Json | null
          model?: string
          mplp_policy?: string
          name: string
          status?: string
          updated_at?: string
        }
        Update: {
          author_id?: string | null
          created_at?: string
          department?: string | null
          id?: string
          manifest?: Json | null
          model?: string
          mplp_policy?: string
          name?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      collaboration_messages: {
        Row: {
          collaboration_id: string
          created_at: string
          id: string
          message_type: string
          payload: Json
          receiver_agent_id: string
          sender_agent_id: string
          status: string
        }
        Insert: {
          collaboration_id: string
          created_at?: string
          id?: string
          message_type: string
          payload?: Json
          receiver_agent_id: string
          sender_agent_id: string
          status?: string
        }
        Update: {
          collaboration_id?: string
          created_at?: string
          id?: string
          message_type?: string
          payload?: Json
          receiver_agent_id?: string
          sender_agent_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "collaboration_messages_collaboration_id_fkey"
            columns: ["collaboration_id"]
            isOneToOne: false
            referencedRelation: "agent_collaborations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collaboration_messages_receiver_agent_id_fkey"
            columns: ["receiver_agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collaboration_messages_sender_agent_id_fkey"
            columns: ["sender_agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      delegated_tasks: {
        Row: {
          accepted_at: string | null
          actual_duration_ms: number | null
          collaboration_id: string | null
          completed_at: string | null
          created_at: string
          deadline: string | null
          description: string | null
          error_message: string | null
          estimated_duration_ms: number | null
          handoff_context: Json | null
          id: string
          priority: string
          result: Json | null
          source_agent_id: string
          started_at: string | null
          status: string
          target_agent_id: string
          task_type: string
          title: string
          tokens_used: number | null
          user_id: string
        }
        Insert: {
          accepted_at?: string | null
          actual_duration_ms?: number | null
          collaboration_id?: string | null
          completed_at?: string | null
          created_at?: string
          deadline?: string | null
          description?: string | null
          error_message?: string | null
          estimated_duration_ms?: number | null
          handoff_context?: Json | null
          id?: string
          priority?: string
          result?: Json | null
          source_agent_id: string
          started_at?: string | null
          status?: string
          target_agent_id: string
          task_type?: string
          title: string
          tokens_used?: number | null
          user_id: string
        }
        Update: {
          accepted_at?: string | null
          actual_duration_ms?: number | null
          collaboration_id?: string | null
          completed_at?: string | null
          created_at?: string
          deadline?: string | null
          description?: string | null
          error_message?: string | null
          estimated_duration_ms?: number | null
          handoff_context?: Json | null
          id?: string
          priority?: string
          result?: Json | null
          source_agent_id?: string
          started_at?: string | null
          status?: string
          target_agent_id?: string
          task_type?: string
          title?: string
          tokens_used?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "delegated_tasks_collaboration_id_fkey"
            columns: ["collaboration_id"]
            isOneToOne: false
            referencedRelation: "agent_collaborations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delegated_tasks_source_agent_id_fkey"
            columns: ["source_agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delegated_tasks_target_agent_id_fkey"
            columns: ["target_agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      document_processing: {
        Row: {
          agent_id: string | null
          completed_at: string | null
          created_at: string
          document_content: string | null
          document_name: string
          entities_count: number | null
          error_message: string | null
          id: string
          relations_count: number | null
          status: string
          user_id: string
        }
        Insert: {
          agent_id?: string | null
          completed_at?: string | null
          created_at?: string
          document_content?: string | null
          document_name: string
          entities_count?: number | null
          error_message?: string | null
          id?: string
          relations_count?: number | null
          status?: string
          user_id: string
        }
        Update: {
          agent_id?: string | null
          completed_at?: string | null
          created_at?: string
          document_content?: string | null
          document_name?: string
          entities_count?: number | null
          error_message?: string | null
          id?: string
          relations_count?: number | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_processing_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      drift_logs: {
        Row: {
          agent_id: string
          baseline_value: Json | null
          context: Json | null
          created_at: string
          current_value: Json | null
          deviation_score: number | null
          drift_type: string
          id: string
          resolved: boolean | null
          resolved_at: string | null
          severity: string
          user_id: string
        }
        Insert: {
          agent_id: string
          baseline_value?: Json | null
          context?: Json | null
          created_at?: string
          current_value?: Json | null
          deviation_score?: number | null
          drift_type: string
          id?: string
          resolved?: boolean | null
          resolved_at?: string | null
          severity?: string
          user_id: string
        }
        Update: {
          agent_id?: string
          baseline_value?: Json | null
          context?: Json | null
          created_at?: string
          current_value?: Json | null
          deviation_score?: number | null
          drift_type?: string
          id?: string
          resolved?: boolean | null
          resolved_at?: string | null
          severity?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "drift_logs_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      entities: {
        Row: {
          agent_id: string | null
          created_at: string
          description: string | null
          embedding: Json | null
          entity_type: string
          id: string
          metadata: Json | null
          name: string
          source_content: string | null
          source_document: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          agent_id?: string | null
          created_at?: string
          description?: string | null
          embedding?: Json | null
          entity_type: string
          id?: string
          metadata?: Json | null
          name: string
          source_content?: string | null
          source_document?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          agent_id?: string | null
          created_at?: string
          description?: string | null
          embedding?: Json | null
          entity_type?: string
          id?: string
          metadata?: Json | null
          name?: string
          source_content?: string | null
          source_document?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "entities_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      entity_relations: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_bidirectional: boolean | null
          metadata: Json | null
          relation_type: string
          source_entity_id: string
          strength: number | null
          target_entity_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_bidirectional?: boolean | null
          metadata?: Json | null
          relation_type: string
          source_entity_id: string
          strength?: number | null
          target_entity_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_bidirectional?: boolean | null
          metadata?: Json | null
          relation_type?: string
          source_entity_id?: string
          strength?: number | null
          target_entity_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "entity_relations_source_entity_id_fkey"
            columns: ["source_entity_id"]
            isOneToOne: false
            referencedRelation: "entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entity_relations_target_entity_id_fkey"
            columns: ["target_entity_id"]
            isOneToOne: false
            referencedRelation: "entities"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          created_at: string
          id: string
          metadata: Json | null
          mplp_status: string | null
          role: string
          session_id: string
          skill_used: string | null
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          metadata?: Json | null
          mplp_status?: string | null
          role: string
          session_id: string
          skill_used?: string | null
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          mplp_status?: string | null
          role?: string
          session_id?: string
          skill_used?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      model_routing_rules: {
        Row: {
          agent_id: string | null
          conditions: Json
          created_at: string
          description: string | null
          fallback_model: string | null
          id: string
          is_active: boolean
          max_tokens: number | null
          name: string
          priority: number
          target_model: string
          temperature: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          agent_id?: string | null
          conditions?: Json
          created_at?: string
          description?: string | null
          fallback_model?: string | null
          id?: string
          is_active?: boolean
          max_tokens?: number | null
          name: string
          priority?: number
          target_model: string
          temperature?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          agent_id?: string | null
          conditions?: Json
          created_at?: string
          description?: string | null
          fallback_model?: string | null
          id?: string
          is_active?: boolean
          max_tokens?: number | null
          name?: string
          priority?: number
          target_model?: string
          temperature?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "model_routing_rules_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          department: string | null
          display_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          department?: string | null
          display_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          department?: string | null
          display_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      scheduler_metrics: {
        Row: {
          avg_latency_ms: number | null
          completed_tasks: number
          created_at: string
          failed_tasks: number
          id: string
          model_used: string | null
          p95_latency_ms: number | null
          p99_latency_ms: number | null
          priority: string
          time_bucket: string
          timeout_tasks: number
          tokens_used: number | null
          total_tasks: number
        }
        Insert: {
          avg_latency_ms?: number | null
          completed_tasks?: number
          created_at?: string
          failed_tasks?: number
          id?: string
          model_used?: string | null
          p95_latency_ms?: number | null
          p99_latency_ms?: number | null
          priority: string
          time_bucket: string
          timeout_tasks?: number
          tokens_used?: number | null
          total_tasks?: number
        }
        Update: {
          avg_latency_ms?: number | null
          completed_tasks?: number
          created_at?: string
          failed_tasks?: number
          id?: string
          model_used?: string | null
          p95_latency_ms?: number | null
          p99_latency_ms?: number | null
          priority?: string
          time_bucket?: string
          timeout_tasks?: number
          tokens_used?: number | null
          total_tasks?: number
        }
        Relationships: []
      }
      sessions: {
        Row: {
          agent_id: string
          created_at: string
          id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          agent_id: string
          created_at?: string
          id?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          agent_id?: string
          created_at?: string
          id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sessions_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      skill_versions: {
        Row: {
          change_summary: string | null
          change_type: string
          config_yaml: string | null
          content: string
          created_at: string
          created_by: string
          handler_code: string | null
          id: string
          metadata: Json
          skill_id: string
          version: string
          version_number: number
        }
        Insert: {
          change_summary?: string | null
          change_type?: string
          config_yaml?: string | null
          content: string
          created_at?: string
          created_by: string
          handler_code?: string | null
          id?: string
          metadata?: Json
          skill_id: string
          version: string
          version_number: number
        }
        Update: {
          change_summary?: string | null
          change_type?: string
          config_yaml?: string | null
          content?: string
          created_at?: string
          created_by?: string
          handler_code?: string | null
          id?: string
          metadata?: Json
          skill_id?: string
          version?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "skill_versions_skill_id_fkey"
            columns: ["skill_id"]
            isOneToOne: false
            referencedRelation: "skills"
            referencedColumns: ["id"]
          },
        ]
      }
      skills: {
        Row: {
          author_id: string | null
          category: string
          content: string | null
          created_at: string
          description: string | null
          id: string
          inputs: Json | null
          is_published: boolean
          name: string
          outputs: Json | null
          permissions: string[]
          updated_at: string
          version: string
        }
        Insert: {
          author_id?: string | null
          category?: string
          content?: string | null
          created_at?: string
          description?: string | null
          id?: string
          inputs?: Json | null
          is_published?: boolean
          name: string
          outputs?: Json | null
          permissions?: string[]
          updated_at?: string
          version?: string
        }
        Update: {
          author_id?: string | null
          category?: string
          content?: string | null
          created_at?: string
          description?: string | null
          id?: string
          inputs?: Json | null
          is_published?: boolean
          name?: string
          outputs?: Json | null
          permissions?: string[]
          updated_at?: string
          version?: string
        }
        Relationships: []
      }
      task_queue: {
        Row: {
          completed_at: string | null
          created_at: string
          deadline: string | null
          error_message: string | null
          execution_time_ms: number | null
          id: string
          max_latency_ms: number | null
          payload: Json
          priority: string
          result: Json | null
          session_id: string | null
          started_at: string | null
          status: string
          task_type: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          deadline?: string | null
          error_message?: string | null
          execution_time_ms?: number | null
          id?: string
          max_latency_ms?: number | null
          payload?: Json
          priority?: string
          result?: Json | null
          session_id?: string | null
          started_at?: string | null
          status?: string
          task_type: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          deadline?: string | null
          error_message?: string | null
          execution_time_ms?: number | null
          id?: string
          max_latency_ms?: number | null
          payload?: Json
          priority?: string
          result?: Json | null
          session_id?: string | null
          started_at?: string | null
          status?: string
          task_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_queue_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      trace_logs: {
        Row: {
          created_at: string
          details: Json | null
          event_type: string
          id: string
          message_id: string | null
          session_id: string
        }
        Insert: {
          created_at?: string
          details?: Json | null
          event_type: string
          id?: string
          message_id?: string | null
          session_id: string
        }
        Update: {
          created_at?: string
          details?: Json | null
          event_type?: string
          id?: string
          message_id?: string | null
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trace_logs_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trace_logs_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      user_prompts: {
        Row: {
          agent_id: string | null
          created_at: string
          id: string
          is_default: boolean
          is_shared: boolean
          name: string
          prompt: string
          share_count: number
          share_token: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          agent_id?: string | null
          created_at?: string
          id?: string
          is_default?: boolean
          is_shared?: boolean
          name?: string
          prompt: string
          share_count?: number
          share_token?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          agent_id?: string | null
          created_at?: string
          id?: string
          is_default?: boolean
          is_shared?: boolean
          name?: string
          prompt?: string
          share_count?: number
          share_token?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_prompts_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      variable_presets: {
        Row: {
          agent_id: string | null
          created_at: string
          id: string
          name: string
          updated_at: string
          user_id: string
          values: Json
        }
        Insert: {
          agent_id?: string | null
          created_at?: string
          id?: string
          name: string
          updated_at?: string
          user_id: string
          values?: Json
        }
        Update: {
          agent_id?: string | null
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
          values?: Json
        }
        Relationships: [
          {
            foreignKeyName: "variable_presets_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      cosine_similarity: { Args: { a: Json; b: Json }; Returns: number }
      find_similar_entities: {
        Args: {
          p_agent_id?: string
          p_limit?: number
          p_query_embedding: Json
          p_user_id: string
        }
        Returns: {
          description: string
          entity_id: string
          entity_name: string
          entity_type: string
          similarity: number
        }[]
      }
      generate_share_token: { Args: never; Returns: string }
      get_next_skill_version_number: {
        Args: { p_skill_id: string }
        Returns: number
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      traverse_entity_graph: {
        Args: {
          p_depth?: number
          p_entity_ids: string[]
          p_relation_types?: string[]
        }
        Returns: {
          depth: number
          description: string
          entity_id: string
          entity_name: string
          entity_type: string
          relation_path: string
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "architect" | "engineer" | "operator"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "architect", "engineer", "operator"],
    },
  },
} as const
