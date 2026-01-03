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
      agent_api_keys: {
        Row: {
          agent_id: string
          api_key: string
          created_at: string
          expires_at: string | null
          id: string
          is_active: boolean
          last_used_at: string | null
          name: string
          rate_limit: number
          total_calls: number
          updated_at: string
          user_id: string
        }
        Insert: {
          agent_id: string
          api_key: string
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          last_used_at?: string | null
          name?: string
          rate_limit?: number
          total_calls?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          agent_id?: string
          api_key?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          last_used_at?: string | null
          name?: string
          rate_limit?: number
          total_calls?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_api_keys_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_api_keys_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "public_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_api_keys_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "trending_agents"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_api_logs: {
        Row: {
          agent_id: string
          api_key_id: string
          created_at: string
          error_message: string | null
          id: string
          ip_address: string | null
          latency_ms: number | null
          request_body: Json | null
          response_body: Json | null
          status_code: number
          tokens_used: number | null
          user_id: string
        }
        Insert: {
          agent_id: string
          api_key_id: string
          created_at?: string
          error_message?: string | null
          id?: string
          ip_address?: string | null
          latency_ms?: number | null
          request_body?: Json | null
          response_body?: Json | null
          status_code?: number
          tokens_used?: number | null
          user_id: string
        }
        Update: {
          agent_id?: string
          api_key_id?: string
          created_at?: string
          error_message?: string | null
          id?: string
          ip_address?: string | null
          latency_ms?: number | null
          request_body?: Json | null
          response_body?: Json | null
          status_code?: number
          tokens_used?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_api_logs_api_key_id_fkey"
            columns: ["api_key_id"]
            isOneToOne: false
            referencedRelation: "agent_api_keys"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_clones: {
        Row: {
          cloned_agent_id: string | null
          created_at: string | null
          id: string
          source_agent_id: string | null
          user_id: string
        }
        Insert: {
          cloned_agent_id?: string | null
          created_at?: string | null
          id?: string
          source_agent_id?: string | null
          user_id: string
        }
        Update: {
          cloned_agent_id?: string | null
          created_at?: string | null
          id?: string
          source_agent_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_clones_cloned_agent_id_fkey"
            columns: ["cloned_agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_clones_cloned_agent_id_fkey"
            columns: ["cloned_agent_id"]
            isOneToOne: false
            referencedRelation: "public_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_clones_cloned_agent_id_fkey"
            columns: ["cloned_agent_id"]
            isOneToOne: false
            referencedRelation: "trending_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_clones_source_agent_id_fkey"
            columns: ["source_agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_clones_source_agent_id_fkey"
            columns: ["source_agent_id"]
            isOneToOne: false
            referencedRelation: "public_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_clones_source_agent_id_fkey"
            columns: ["source_agent_id"]
            isOneToOne: false
            referencedRelation: "trending_agents"
            referencedColumns: ["id"]
          },
        ]
      }
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
            foreignKeyName: "agent_collaborations_initiator_agent_id_fkey"
            columns: ["initiator_agent_id"]
            isOneToOne: false
            referencedRelation: "public_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_collaborations_initiator_agent_id_fkey"
            columns: ["initiator_agent_id"]
            isOneToOne: false
            referencedRelation: "trending_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_collaborations_target_agent_id_fkey"
            columns: ["target_agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_collaborations_target_agent_id_fkey"
            columns: ["target_agent_id"]
            isOneToOne: false
            referencedRelation: "public_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_collaborations_target_agent_id_fkey"
            columns: ["target_agent_id"]
            isOneToOne: false
            referencedRelation: "trending_agents"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_likes: {
        Row: {
          agent_id: string
          created_at: string | null
          id: string
          user_id: string
        }
        Insert: {
          agent_id: string
          created_at?: string | null
          id?: string
          user_id: string
        }
        Update: {
          agent_id?: string
          created_at?: string | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_likes_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_likes_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "public_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_likes_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "trending_agents"
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
            foreignKeyName: "agent_skills_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "public_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_skills_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "trending_agents"
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
      agent_webhooks: {
        Row: {
          agent_id: string
          created_at: string
          events: string[]
          failed_triggers: number
          headers: Json | null
          id: string
          is_active: boolean
          last_triggered_at: string | null
          name: string
          retry_count: number
          secret: string | null
          successful_triggers: number
          timeout_ms: number
          total_triggers: number
          updated_at: string
          url: string
          user_id: string
        }
        Insert: {
          agent_id: string
          created_at?: string
          events?: string[]
          failed_triggers?: number
          headers?: Json | null
          id?: string
          is_active?: boolean
          last_triggered_at?: string | null
          name?: string
          retry_count?: number
          secret?: string | null
          successful_triggers?: number
          timeout_ms?: number
          total_triggers?: number
          updated_at?: string
          url: string
          user_id: string
        }
        Update: {
          agent_id?: string
          created_at?: string
          events?: string[]
          failed_triggers?: number
          headers?: Json | null
          id?: string
          is_active?: boolean
          last_triggered_at?: string | null
          name?: string
          retry_count?: number
          secret?: string | null
          successful_triggers?: number
          timeout_ms?: number
          total_triggers?: number
          updated_at?: string
          url?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_webhooks_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_webhooks_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "public_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_webhooks_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "trending_agents"
            referencedColumns: ["id"]
          },
        ]
      }
      agents: {
        Row: {
          author_id: string | null
          category: string | null
          clones_count: number | null
          created_at: string
          department: string | null
          id: string
          is_featured: boolean | null
          likes_count: number | null
          manifest: Json | null
          model: string
          mplp_policy: string
          name: string
          personality_config: Json | null
          rating: number | null
          status: string
          tags: string[] | null
          updated_at: string
          usage_count: number | null
        }
        Insert: {
          author_id?: string | null
          category?: string | null
          clones_count?: number | null
          created_at?: string
          department?: string | null
          id?: string
          is_featured?: boolean | null
          likes_count?: number | null
          manifest?: Json | null
          model?: string
          mplp_policy?: string
          name: string
          personality_config?: Json | null
          rating?: number | null
          status?: string
          tags?: string[] | null
          updated_at?: string
          usage_count?: number | null
        }
        Update: {
          author_id?: string | null
          category?: string | null
          clones_count?: number | null
          created_at?: string
          department?: string | null
          id?: string
          is_featured?: boolean | null
          likes_count?: number | null
          manifest?: Json | null
          model?: string
          mplp_policy?: string
          name?: string
          personality_config?: Json | null
          rating?: number | null
          status?: string
          tags?: string[] | null
          updated_at?: string
          usage_count?: number | null
        }
        Relationships: []
      }
      api_alert_logs: {
        Row: {
          actual_value: number
          agent_id: string
          alert_rule_id: string
          alert_type: string
          created_at: string
          id: string
          notification_error: string | null
          notification_sent: boolean | null
          sample_size: number | null
          threshold_value: number
          time_window_end: string
          time_window_start: string
          user_id: string
        }
        Insert: {
          actual_value: number
          agent_id: string
          alert_rule_id: string
          alert_type: string
          created_at?: string
          id?: string
          notification_error?: string | null
          notification_sent?: boolean | null
          sample_size?: number | null
          threshold_value: number
          time_window_end: string
          time_window_start: string
          user_id: string
        }
        Update: {
          actual_value?: number
          agent_id?: string
          alert_rule_id?: string
          alert_type?: string
          created_at?: string
          id?: string
          notification_error?: string | null
          notification_sent?: boolean | null
          sample_size?: number | null
          threshold_value?: number
          time_window_end?: string
          time_window_start?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "api_alert_logs_alert_rule_id_fkey"
            columns: ["alert_rule_id"]
            isOneToOne: false
            referencedRelation: "api_alert_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      api_alert_rules: {
        Row: {
          agent_id: string
          cooldown_minutes: number | null
          created_at: string
          error_count_threshold: number | null
          error_rate_threshold: number | null
          id: string
          is_active: boolean | null
          last_triggered_at: string | null
          latency_threshold_ms: number | null
          name: string
          notification_email: string
          notification_enabled: boolean | null
          time_window_minutes: number | null
          total_alerts_sent: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          agent_id: string
          cooldown_minutes?: number | null
          created_at?: string
          error_count_threshold?: number | null
          error_rate_threshold?: number | null
          id?: string
          is_active?: boolean | null
          last_triggered_at?: string | null
          latency_threshold_ms?: number | null
          name?: string
          notification_email: string
          notification_enabled?: boolean | null
          time_window_minutes?: number | null
          total_alerts_sent?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          agent_id?: string
          cooldown_minutes?: number | null
          created_at?: string
          error_count_threshold?: number | null
          error_rate_threshold?: number | null
          id?: string
          is_active?: boolean | null
          last_triggered_at?: string | null
          latency_threshold_ms?: number | null
          name?: string
          notification_email?: string
          notification_enabled?: boolean | null
          time_window_minutes?: number | null
          total_alerts_sent?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "api_alert_rules_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "api_alert_rules_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "public_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "api_alert_rules_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "trending_agents"
            referencedColumns: ["id"]
          },
        ]
      }
      challenge_entries: {
        Row: {
          agent_id: string | null
          challenge_id: string
          created_at: string | null
          description: string | null
          id: string
          is_winner: boolean | null
          rank: number | null
          title: string | null
          user_id: string
          votes_count: number | null
        }
        Insert: {
          agent_id?: string | null
          challenge_id: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_winner?: boolean | null
          rank?: number | null
          title?: string | null
          user_id: string
          votes_count?: number | null
        }
        Update: {
          agent_id?: string | null
          challenge_id?: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_winner?: boolean | null
          rank?: number | null
          title?: string | null
          user_id?: string
          votes_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "challenge_entries_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "challenge_entries_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "public_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "challenge_entries_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "trending_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "challenge_entries_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
        ]
      }
      challenge_votes: {
        Row: {
          created_at: string | null
          entry_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          entry_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          entry_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "challenge_votes_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "challenge_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      challenges: {
        Row: {
          banner_url: string | null
          category: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          end_at: string
          entries_count: number | null
          id: string
          prize_description: string | null
          rules: string | null
          start_at: string
          status: string | null
          title: string
        }
        Insert: {
          banner_url?: string | null
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          end_at: string
          entries_count?: number | null
          id?: string
          prize_description?: string | null
          rules?: string | null
          start_at: string
          status?: string | null
          title: string
        }
        Update: {
          banner_url?: string | null
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          end_at?: string
          entries_count?: number | null
          id?: string
          prize_description?: string | null
          rules?: string | null
          start_at?: string
          status?: string | null
          title?: string
        }
        Relationships: []
      }
      circuit_breaker_state: {
        Row: {
          agent_id: string
          created_at: string
          failure_count: number
          failure_threshold: number
          half_opened_at: string | null
          id: string
          last_failure_at: string | null
          opened_at: string | null
          state: string
          success_count: number
          success_threshold: number
          timeout_duration_ms: number
          updated_at: string
          user_id: string
        }
        Insert: {
          agent_id: string
          created_at?: string
          failure_count?: number
          failure_threshold?: number
          half_opened_at?: string | null
          id?: string
          last_failure_at?: string | null
          opened_at?: string | null
          state?: string
          success_count?: number
          success_threshold?: number
          timeout_duration_ms?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          agent_id?: string
          created_at?: string
          failure_count?: number
          failure_threshold?: number
          half_opened_at?: string | null
          id?: string
          last_failure_at?: string | null
          opened_at?: string | null
          state?: string
          success_count?: number
          success_threshold?: number
          timeout_duration_ms?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "circuit_breaker_state_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "circuit_breaker_state_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "public_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "circuit_breaker_state_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "trending_agents"
            referencedColumns: ["id"]
          },
        ]
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
            foreignKeyName: "collaboration_messages_receiver_agent_id_fkey"
            columns: ["receiver_agent_id"]
            isOneToOne: false
            referencedRelation: "public_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collaboration_messages_receiver_agent_id_fkey"
            columns: ["receiver_agent_id"]
            isOneToOne: false
            referencedRelation: "trending_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collaboration_messages_sender_agent_id_fkey"
            columns: ["sender_agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collaboration_messages_sender_agent_id_fkey"
            columns: ["sender_agent_id"]
            isOneToOne: false
            referencedRelation: "public_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collaboration_messages_sender_agent_id_fkey"
            columns: ["sender_agent_id"]
            isOneToOne: false
            referencedRelation: "trending_agents"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_scenarios: {
        Row: {
          agent_role: string | null
          author_id: string | null
          category: string | null
          created_at: string | null
          description: string | null
          downloads_count: number | null
          id: string
          is_multi_agent: boolean | null
          is_public: boolean | null
          name: string
          opening_lines: string[] | null
          scene_background: Json | null
          suggested_prompts: string[] | null
          updated_at: string | null
          user_role: string | null
        }
        Insert: {
          agent_role?: string | null
          author_id?: string | null
          category?: string | null
          created_at?: string | null
          description?: string | null
          downloads_count?: number | null
          id?: string
          is_multi_agent?: boolean | null
          is_public?: boolean | null
          name: string
          opening_lines?: string[] | null
          scene_background?: Json | null
          suggested_prompts?: string[] | null
          updated_at?: string | null
          user_role?: string | null
        }
        Update: {
          agent_role?: string | null
          author_id?: string | null
          category?: string | null
          created_at?: string | null
          description?: string | null
          downloads_count?: number | null
          id?: string
          is_multi_agent?: boolean | null
          is_public?: boolean | null
          name?: string
          opening_lines?: string[] | null
          scene_background?: Json | null
          suggested_prompts?: string[] | null
          updated_at?: string | null
          user_role?: string | null
        }
        Relationships: []
      }
      creator_earnings: {
        Row: {
          amount: number
          bundle_id: string | null
          created_at: string
          creator_id: string
          id: string
          skill_id: string | null
          transaction_type: string
        }
        Insert: {
          amount: number
          bundle_id?: string | null
          created_at?: string
          creator_id: string
          id?: string
          skill_id?: string | null
          transaction_type?: string
        }
        Update: {
          amount?: number
          bundle_id?: string | null
          created_at?: string
          creator_id?: string
          id?: string
          skill_id?: string | null
          transaction_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "creator_earnings_bundle_id_fkey"
            columns: ["bundle_id"]
            isOneToOne: false
            referencedRelation: "skill_bundles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creator_earnings_skill_id_fkey"
            columns: ["skill_id"]
            isOneToOne: false
            referencedRelation: "skills"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_inspiration: {
        Row: {
          agent_id: string | null
          author_id: string | null
          category: string | null
          created_at: string | null
          description: string | null
          featured_date: string | null
          id: string
          image_url: string | null
          story_content: string | null
          title: string
          updated_at: string | null
          view_count: number | null
        }
        Insert: {
          agent_id?: string | null
          author_id?: string | null
          category?: string | null
          created_at?: string | null
          description?: string | null
          featured_date?: string | null
          id?: string
          image_url?: string | null
          story_content?: string | null
          title: string
          updated_at?: string | null
          view_count?: number | null
        }
        Update: {
          agent_id?: string | null
          author_id?: string | null
          category?: string | null
          created_at?: string | null
          description?: string | null
          featured_date?: string | null
          id?: string
          image_url?: string | null
          story_content?: string | null
          title?: string
          updated_at?: string | null
          view_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_inspiration_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_inspiration_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "public_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_inspiration_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "trending_agents"
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
            foreignKeyName: "delegated_tasks_source_agent_id_fkey"
            columns: ["source_agent_id"]
            isOneToOne: false
            referencedRelation: "public_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delegated_tasks_source_agent_id_fkey"
            columns: ["source_agent_id"]
            isOneToOne: false
            referencedRelation: "trending_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delegated_tasks_target_agent_id_fkey"
            columns: ["target_agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delegated_tasks_target_agent_id_fkey"
            columns: ["target_agent_id"]
            isOneToOne: false
            referencedRelation: "public_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delegated_tasks_target_agent_id_fkey"
            columns: ["target_agent_id"]
            isOneToOne: false
            referencedRelation: "trending_agents"
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
          {
            foreignKeyName: "document_processing_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "public_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_processing_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "trending_agents"
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
          {
            foreignKeyName: "drift_logs_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "public_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drift_logs_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "trending_agents"
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
          {
            foreignKeyName: "entities_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "public_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entities_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "trending_agents"
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
      intent_history: {
        Row: {
          agent_id: string
          created_at: string
          current_intent: string
          delta_score: number
          drift_detected: boolean
          id: string
          intent_embedding: Json | null
          message_content: string | null
          original_intent: string
          response_content: string | null
          session_id: string | null
          turn_number: number
          user_id: string
        }
        Insert: {
          agent_id: string
          created_at?: string
          current_intent: string
          delta_score?: number
          drift_detected?: boolean
          id?: string
          intent_embedding?: Json | null
          message_content?: string | null
          original_intent: string
          response_content?: string | null
          session_id?: string | null
          turn_number?: number
          user_id: string
        }
        Update: {
          agent_id?: string
          created_at?: string
          current_intent?: string
          delta_score?: number
          drift_detected?: boolean
          id?: string
          intent_embedding?: Json | null
          message_content?: string | null
          original_intent?: string
          response_content?: string | null
          session_id?: string | null
          turn_number?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "intent_history_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intent_history_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "public_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intent_history_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "trending_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intent_history_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      invitations: {
        Row: {
          accepted_at: string | null
          created_at: string | null
          id: string
          invite_code: string
          invited_email: string | null
          invited_user_id: string | null
          inviter_id: string
          reward_points: number | null
          status: string | null
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string | null
          id?: string
          invite_code: string
          invited_email?: string | null
          invited_user_id?: string | null
          inviter_id: string
          reward_points?: number | null
          status?: string | null
        }
        Update: {
          accepted_at?: string | null
          created_at?: string | null
          id?: string
          invite_code?: string
          invited_email?: string | null
          invited_user_id?: string | null
          inviter_id?: string
          reward_points?: number | null
          status?: string | null
        }
        Relationships: []
      }
      llm_model_configs: {
        Row: {
          agent_id: string | null
          created_at: string
          frequency_penalty: number | null
          id: string
          is_active: boolean | null
          max_tokens: number | null
          model_name: string
          module_type: string
          presence_penalty: number | null
          priority: number | null
          provider_id: string
          settings: Json | null
          system_prompt_override: string | null
          temperature: number | null
          top_p: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          agent_id?: string | null
          created_at?: string
          frequency_penalty?: number | null
          id?: string
          is_active?: boolean | null
          max_tokens?: number | null
          model_name: string
          module_type: string
          presence_penalty?: number | null
          priority?: number | null
          provider_id: string
          settings?: Json | null
          system_prompt_override?: string | null
          temperature?: number | null
          top_p?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          agent_id?: string | null
          created_at?: string
          frequency_penalty?: number | null
          id?: string
          is_active?: boolean | null
          max_tokens?: number | null
          model_name?: string
          module_type?: string
          presence_penalty?: number | null
          priority?: number | null
          provider_id?: string
          settings?: Json | null
          system_prompt_override?: string | null
          temperature?: number | null
          top_p?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "llm_model_configs_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "llm_model_configs_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "public_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "llm_model_configs_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "trending_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "llm_model_configs_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "llm_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      llm_providers: {
        Row: {
          api_endpoint: string
          api_key_name: string
          available_models: Json | null
          created_at: string
          default_model: string | null
          display_name: string
          id: string
          is_active: boolean | null
          is_default: boolean | null
          name: string
          provider_type: string
          settings: Json | null
          updated_at: string
          user_id: string
        }
        Insert: {
          api_endpoint: string
          api_key_name: string
          available_models?: Json | null
          created_at?: string
          default_model?: string | null
          display_name: string
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          name: string
          provider_type: string
          settings?: Json | null
          updated_at?: string
          user_id: string
        }
        Update: {
          api_endpoint?: string
          api_key_name?: string
          available_models?: Json | null
          created_at?: string
          default_model?: string | null
          display_name?: string
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          name?: string
          provider_type?: string
          settings?: Json | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      llm_usage_logs: {
        Row: {
          agent_id: string | null
          completion_tokens: number | null
          created_at: string
          error_message: string | null
          estimated_cost: number | null
          id: string
          latency_ms: number | null
          model_name: string
          module_type: string
          prompt_tokens: number | null
          provider_id: string | null
          success: boolean | null
          total_tokens: number | null
          user_id: string
        }
        Insert: {
          agent_id?: string | null
          completion_tokens?: number | null
          created_at?: string
          error_message?: string | null
          estimated_cost?: number | null
          id?: string
          latency_ms?: number | null
          model_name: string
          module_type: string
          prompt_tokens?: number | null
          provider_id?: string | null
          success?: boolean | null
          total_tokens?: number | null
          user_id: string
        }
        Update: {
          agent_id?: string | null
          completion_tokens?: number | null
          created_at?: string
          error_message?: string | null
          estimated_cost?: number | null
          id?: string
          latency_ms?: number | null
          model_name?: string
          module_type?: string
          prompt_tokens?: number | null
          provider_id?: string | null
          success?: boolean | null
          total_tokens?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "llm_usage_logs_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "llm_usage_logs_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "public_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "llm_usage_logs_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "trending_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "llm_usage_logs_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "llm_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      message_feedback: {
        Row: {
          created_at: string
          feedback_type: string
          id: string
          message_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          feedback_type: string
          id?: string
          message_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          feedback_type?: string
          id?: string
          message_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_feedback_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
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
          {
            foreignKeyName: "model_routing_rules_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "public_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "model_routing_rules_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "trending_agents"
            referencedColumns: ["id"]
          },
        ]
      }
      point_transactions: {
        Row: {
          amount: number
          created_at: string | null
          description: string | null
          id: string
          reference_id: string | null
          transaction_type: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          description?: string | null
          id?: string
          reference_id?: string | null
          transaction_type: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          description?: string | null
          id?: string
          reference_id?: string | null
          transaction_type?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          badges: Json | null
          bio: string | null
          cover_image_url: string | null
          created_at: string
          creator_level: number | null
          department: string | null
          display_name: string | null
          followers_count: number | null
          following_count: number | null
          id: string
          is_verified: boolean | null
          social_links: Json | null
          total_agents: number | null
          total_likes_received: number | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          badges?: Json | null
          bio?: string | null
          cover_image_url?: string | null
          created_at?: string
          creator_level?: number | null
          department?: string | null
          display_name?: string | null
          followers_count?: number | null
          following_count?: number | null
          id: string
          is_verified?: boolean | null
          social_links?: Json | null
          total_agents?: number | null
          total_likes_received?: number | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          badges?: Json | null
          bio?: string | null
          cover_image_url?: string | null
          created_at?: string
          creator_level?: number | null
          department?: string | null
          display_name?: string | null
          followers_count?: number | null
          following_count?: number | null
          id?: string
          is_verified?: boolean | null
          social_links?: Json | null
          total_agents?: number | null
          total_likes_received?: number | null
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
          agent_id: string | null
          created_at: string
          id: string
          is_roleplay: boolean | null
          scenario_id: string | null
          scene_config: Json | null
          status: string
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          agent_id?: string | null
          created_at?: string
          id?: string
          is_roleplay?: boolean | null
          scenario_id?: string | null
          scene_config?: Json | null
          status?: string
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          agent_id?: string | null
          created_at?: string
          id?: string
          is_roleplay?: boolean | null
          scenario_id?: string | null
          scene_config?: Json | null
          status?: string
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sessions_scenario_id_fkey"
            columns: ["scenario_id"]
            isOneToOne: false
            referencedRelation: "conversation_scenarios"
            referencedColumns: ["id"]
          },
        ]
      }
      shared_conversations: {
        Row: {
          agent_avatar: Json | null
          agent_name: string | null
          created_at: string | null
          expires_at: string | null
          id: string
          include_user_messages: boolean | null
          is_public: boolean | null
          message_count: number | null
          preview: string | null
          session_id: string | null
          share_token: string
          title: string | null
          user_id: string
          view_count: number | null
        }
        Insert: {
          agent_avatar?: Json | null
          agent_name?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          include_user_messages?: boolean | null
          is_public?: boolean | null
          message_count?: number | null
          preview?: string | null
          session_id?: string | null
          share_token: string
          title?: string | null
          user_id: string
          view_count?: number | null
        }
        Update: {
          agent_avatar?: Json | null
          agent_name?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          include_user_messages?: boolean | null
          is_public?: boolean | null
          message_count?: number | null
          preview?: string | null
          session_id?: string | null
          share_token?: string
          title?: string | null
          user_id?: string
          view_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "shared_conversations_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      skill_bundles: {
        Row: {
          author_id: string | null
          cover_image: string | null
          created_at: string
          description: string | null
          downloads_count: number | null
          id: string
          is_featured: boolean | null
          is_free: boolean | null
          name: string
          price: number | null
          skill_ids: string[] | null
          updated_at: string
        }
        Insert: {
          author_id?: string | null
          cover_image?: string | null
          created_at?: string
          description?: string | null
          downloads_count?: number | null
          id?: string
          is_featured?: boolean | null
          is_free?: boolean | null
          name: string
          price?: number | null
          skill_ids?: string[] | null
          updated_at?: string
        }
        Update: {
          author_id?: string | null
          cover_image?: string | null
          created_at?: string
          description?: string | null
          downloads_count?: number | null
          id?: string
          is_featured?: boolean | null
          is_free?: boolean | null
          name?: string
          price?: number | null
          skill_ids?: string[] | null
          updated_at?: string
        }
        Relationships: []
      }
      skill_installs: {
        Row: {
          id: string
          installed_at: string
          skill_id: string
          user_id: string
        }
        Insert: {
          id?: string
          installed_at?: string
          skill_id: string
          user_id: string
        }
        Update: {
          id?: string
          installed_at?: string
          skill_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "skill_installs_skill_id_fkey"
            columns: ["skill_id"]
            isOneToOne: false
            referencedRelation: "skills"
            referencedColumns: ["id"]
          },
        ]
      }
      skill_ratings: {
        Row: {
          created_at: string
          id: string
          rating: number
          review: string | null
          skill_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          rating: number
          review?: string | null
          skill_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          rating?: number
          review?: string | null
          skill_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "skill_ratings_skill_id_fkey"
            columns: ["skill_id"]
            isOneToOne: false
            referencedRelation: "skills"
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
          changelog: string | null
          content: string | null
          created_at: string
          description: string | null
          downloads_count: number | null
          id: string
          inputs: Json | null
          is_featured: boolean | null
          is_free: boolean | null
          is_published: boolean
          is_verified: boolean | null
          name: string
          outputs: Json | null
          permissions: string[]
          preview_images: string[] | null
          price: number | null
          rating: number | null
          ratings_count: number | null
          tags: string[] | null
          updated_at: string
          version: string
        }
        Insert: {
          author_id?: string | null
          category?: string
          changelog?: string | null
          content?: string | null
          created_at?: string
          description?: string | null
          downloads_count?: number | null
          id?: string
          inputs?: Json | null
          is_featured?: boolean | null
          is_free?: boolean | null
          is_published?: boolean
          is_verified?: boolean | null
          name: string
          outputs?: Json | null
          permissions?: string[]
          preview_images?: string[] | null
          price?: number | null
          rating?: number | null
          ratings_count?: number | null
          tags?: string[] | null
          updated_at?: string
          version?: string
        }
        Update: {
          author_id?: string | null
          category?: string
          changelog?: string | null
          content?: string | null
          created_at?: string
          description?: string | null
          downloads_count?: number | null
          id?: string
          inputs?: Json | null
          is_featured?: boolean | null
          is_free?: boolean | null
          is_published?: boolean
          is_verified?: boolean | null
          name?: string
          outputs?: Json | null
          permissions?: string[]
          preview_images?: string[] | null
          price?: number | null
          rating?: number | null
          ratings_count?: number | null
          tags?: string[] | null
          updated_at?: string
          version?: string
        }
        Relationships: []
      }
      task_chain_executions: {
        Row: {
          chain_description: string | null
          chain_id: string
          chain_name: string
          completed_at: string | null
          completed_steps: number
          created_at: string
          duration_ms: number | null
          error_message: string | null
          execution_mode: string
          failed_steps: number
          final_result: Json | null
          id: string
          started_at: string
          status: string
          step_logs: Json
          total_steps: number
          user_id: string
          variables_used: Json | null
        }
        Insert: {
          chain_description?: string | null
          chain_id: string
          chain_name: string
          completed_at?: string | null
          completed_steps?: number
          created_at?: string
          duration_ms?: number | null
          error_message?: string | null
          execution_mode?: string
          failed_steps?: number
          final_result?: Json | null
          id?: string
          started_at?: string
          status?: string
          step_logs?: Json
          total_steps?: number
          user_id: string
          variables_used?: Json | null
        }
        Update: {
          chain_description?: string | null
          chain_id?: string
          chain_name?: string
          completed_at?: string | null
          completed_steps?: number
          created_at?: string
          duration_ms?: number | null
          error_message?: string | null
          execution_mode?: string
          failed_steps?: number
          final_result?: Json | null
          id?: string
          started_at?: string
          status?: string
          step_logs?: Json
          total_steps?: number
          user_id?: string
          variables_used?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "task_chain_executions_chain_id_fkey"
            columns: ["chain_id"]
            isOneToOne: false
            referencedRelation: "task_chains"
            referencedColumns: ["id"]
          },
        ]
      }
      task_chain_steps: {
        Row: {
          chain_id: string
          completed_at: string | null
          created_at: string
          description: string | null
          error_message: string | null
          id: string
          input_mapping: Json | null
          max_retries: number
          name: string
          output_key: string | null
          parallel_group: number | null
          result: Json | null
          retry_count: number
          started_at: string | null
          status: string
          step_order: number
          target_agent_id: string | null
          task_id: string | null
          task_type: string
          timeout_ms: number | null
        }
        Insert: {
          chain_id: string
          completed_at?: string | null
          created_at?: string
          description?: string | null
          error_message?: string | null
          id?: string
          input_mapping?: Json | null
          max_retries?: number
          name: string
          output_key?: string | null
          parallel_group?: number | null
          result?: Json | null
          retry_count?: number
          started_at?: string | null
          status?: string
          step_order: number
          target_agent_id?: string | null
          task_id?: string | null
          task_type?: string
          timeout_ms?: number | null
        }
        Update: {
          chain_id?: string
          completed_at?: string | null
          created_at?: string
          description?: string | null
          error_message?: string | null
          id?: string
          input_mapping?: Json | null
          max_retries?: number
          name?: string
          output_key?: string | null
          parallel_group?: number | null
          result?: Json | null
          retry_count?: number
          started_at?: string | null
          status?: string
          step_order?: number
          target_agent_id?: string | null
          task_id?: string | null
          task_type?: string
          timeout_ms?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "task_chain_steps_chain_id_fkey"
            columns: ["chain_id"]
            isOneToOne: false
            referencedRelation: "task_chains"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_chain_steps_target_agent_id_fkey"
            columns: ["target_agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_chain_steps_target_agent_id_fkey"
            columns: ["target_agent_id"]
            isOneToOne: false
            referencedRelation: "public_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_chain_steps_target_agent_id_fkey"
            columns: ["target_agent_id"]
            isOneToOne: false
            referencedRelation: "trending_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_chain_steps_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "delegated_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_chain_templates: {
        Row: {
          category: string
          created_at: string
          description: string | null
          icon: string
          id: string
          is_shared: boolean
          name: string
          steps: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string | null
          icon?: string
          id?: string
          is_shared?: boolean
          name: string
          steps?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          icon?: string
          id?: string
          is_shared?: boolean
          name?: string
          steps?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      task_chains: {
        Row: {
          collaboration_id: string | null
          completed_at: string | null
          completed_steps: number
          created_at: string
          description: string | null
          error_message: string | null
          execution_mode: string
          failed_steps: number
          final_result: Json | null
          id: string
          name: string
          source_agent_id: string | null
          started_at: string | null
          status: string
          total_steps: number
          updated_at: string
          user_id: string
        }
        Insert: {
          collaboration_id?: string | null
          completed_at?: string | null
          completed_steps?: number
          created_at?: string
          description?: string | null
          error_message?: string | null
          execution_mode?: string
          failed_steps?: number
          final_result?: Json | null
          id?: string
          name: string
          source_agent_id?: string | null
          started_at?: string | null
          status?: string
          total_steps?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          collaboration_id?: string | null
          completed_at?: string | null
          completed_steps?: number
          created_at?: string
          description?: string | null
          error_message?: string | null
          execution_mode?: string
          failed_steps?: number
          final_result?: Json | null
          id?: string
          name?: string
          source_agent_id?: string | null
          started_at?: string | null
          status?: string
          total_steps?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_chains_collaboration_id_fkey"
            columns: ["collaboration_id"]
            isOneToOne: false
            referencedRelation: "agent_collaborations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_chains_source_agent_id_fkey"
            columns: ["source_agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_chains_source_agent_id_fkey"
            columns: ["source_agent_id"]
            isOneToOne: false
            referencedRelation: "public_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_chains_source_agent_id_fkey"
            columns: ["source_agent_id"]
            isOneToOne: false
            referencedRelation: "trending_agents"
            referencedColumns: ["id"]
          },
        ]
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
      template_versions: {
        Row: {
          category: string
          change_summary: string | null
          created_at: string
          created_by: string | null
          description: string | null
          icon: string
          id: string
          name: string
          steps: Json
          template_id: string
          version_number: number
        }
        Insert: {
          category?: string
          change_summary?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          icon?: string
          id?: string
          name: string
          steps?: Json
          template_id: string
          version_number?: number
        }
        Update: {
          category?: string
          change_summary?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          icon?: string
          id?: string
          name?: string
          steps?: Json
          template_id?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "template_versions_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "task_chain_templates"
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
      user_achievements: {
        Row: {
          achievement_level: number | null
          achievement_type: string
          earned_at: string | null
          id: string
          metadata: Json | null
          user_id: string
        }
        Insert: {
          achievement_level?: number | null
          achievement_type: string
          earned_at?: string | null
          id?: string
          metadata?: Json | null
          user_id: string
        }
        Update: {
          achievement_level?: number | null
          achievement_type?: string
          earned_at?: string | null
          id?: string
          metadata?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      user_activities: {
        Row: {
          activity_type: string
          created_at: string | null
          id: string
          metadata: Json | null
          target_id: string | null
          target_type: string | null
          user_id: string
        }
        Insert: {
          activity_type: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          target_id?: string | null
          target_type?: string | null
          user_id: string
        }
        Update: {
          activity_type?: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          target_id?: string | null
          target_type?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_follows: {
        Row: {
          created_at: string | null
          follower_id: string
          following_id: string
          id: string
        }
        Insert: {
          created_at?: string | null
          follower_id: string
          following_id: string
          id?: string
        }
        Update: {
          created_at?: string | null
          follower_id?: string
          following_id?: string
          id?: string
        }
        Relationships: []
      }
      user_memories: {
        Row: {
          agent_id: string | null
          created_at: string | null
          id: string
          importance: number | null
          key: string
          last_accessed: string | null
          memory_type: string
          source: string | null
          updated_at: string | null
          user_id: string
          value: string
        }
        Insert: {
          agent_id?: string | null
          created_at?: string | null
          id?: string
          importance?: number | null
          key: string
          last_accessed?: string | null
          memory_type: string
          source?: string | null
          updated_at?: string | null
          user_id: string
          value: string
        }
        Update: {
          agent_id?: string | null
          created_at?: string | null
          id?: string
          importance?: number | null
          key?: string
          last_accessed?: string | null
          memory_type?: string
          source?: string | null
          updated_at?: string | null
          user_id?: string
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_memories_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_memories_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "public_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_memories_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "trending_agents"
            referencedColumns: ["id"]
          },
        ]
      }
      user_points: {
        Row: {
          id: string
          last_daily_bonus: string | null
          lifetime_points: number | null
          points: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          id?: string
          last_daily_bonus?: string | null
          lifetime_points?: number | null
          points?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          id?: string
          last_daily_bonus?: string | null
          lifetime_points?: number | null
          points?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
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
          {
            foreignKeyName: "user_prompts_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "public_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_prompts_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "trending_agents"
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
          {
            foreignKeyName: "variable_presets_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "public_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "variable_presets_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "trending_agents"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_logs: {
        Row: {
          agent_id: string
          attempt_number: number
          created_at: string
          error_message: string | null
          event_type: string
          id: string
          latency_ms: number | null
          payload: Json | null
          response_body: string | null
          response_status: number | null
          success: boolean
          user_id: string
          webhook_id: string
        }
        Insert: {
          agent_id: string
          attempt_number?: number
          created_at?: string
          error_message?: string | null
          event_type: string
          id?: string
          latency_ms?: number | null
          payload?: Json | null
          response_body?: string | null
          response_status?: number | null
          success?: boolean
          user_id: string
          webhook_id: string
        }
        Update: {
          agent_id?: string
          attempt_number?: number
          created_at?: string
          error_message?: string | null
          event_type?: string
          id?: string
          latency_ms?: number | null
          payload?: Json | null
          response_body?: string | null
          response_status?: number | null
          success?: boolean
          user_id?: string
          webhook_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhook_logs_webhook_id_fkey"
            columns: ["webhook_id"]
            isOneToOne: false
            referencedRelation: "agent_webhooks"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      community_stats: {
        Row: {
          daily_active_sessions: number | null
          total_agents: number | null
          total_conversations: number | null
          total_creators: number | null
        }
        Relationships: []
      }
      public_agents: {
        Row: {
          created_at: string | null
          department: string | null
          id: string | null
          manifest: Json | null
          model: string | null
          mplp_policy: string | null
          name: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          department?: string | null
          id?: string | null
          manifest?: Json | null
          model?: string | null
          mplp_policy?: string | null
          name?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          department?: string | null
          id?: string | null
          manifest?: Json | null
          model?: string | null
          mplp_policy?: string | null
          name?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      trending_agents: {
        Row: {
          author_avatar: string | null
          author_id: string | null
          author_name: string | null
          category: string | null
          clones_count: number | null
          created_at: string | null
          department: string | null
          id: string | null
          is_featured: boolean | null
          likes_count: number | null
          manifest: Json | null
          name: string | null
          rating: number | null
          tags: string[] | null
          usage_count: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      clone_agent: { Args: { source_id: string }; Returns: string }
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
      generate_agent_api_key: { Args: never; Returns: string }
      generate_conversation_share_token: { Args: never; Returns: string }
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
      increment_agent_usage: {
        Args: { target_agent_id: string }
        Returns: undefined
      }
      increment_share_view_count: {
        Args: { p_share_token: string }
        Returns: undefined
      }
      install_skill: { Args: { p_skill_id: string }; Returns: undefined }
      submit_skill_rating: {
        Args: { p_rating: number; p_review?: string; p_skill_id: string }
        Returns: undefined
      }
      toggle_agent_like: { Args: { target_agent_id: string }; Returns: boolean }
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
