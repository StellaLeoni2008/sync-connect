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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      band_devices: {
        Row: {
          battery_percent: number | null
          color: string | null
          created_at: string
          device_public_id: string
          firmware_version: string | null
          haptic_intensity: number
          id: string
          mirror_phone_alerts: boolean
          nickname: string
          status: string
          status_light: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          battery_percent?: number | null
          color?: string | null
          created_at?: string
          device_public_id: string
          firmware_version?: string | null
          haptic_intensity?: number
          id?: string
          mirror_phone_alerts?: boolean
          nickname?: string
          status?: string
          status_light?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          battery_percent?: number | null
          color?: string | null
          created_at?: string
          device_public_id?: string
          firmware_version?: string | null
          haptic_intensity?: number
          id?: string
          mirror_phone_alerts?: boolean
          nickname?: string
          status?: string
          status_light?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "band_devices_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      blocked_users: {
        Row: {
          blocked_id: string
          blocker_id: string
          created_at: string
        }
        Insert: {
          blocked_id: string
          blocker_id: string
          created_at?: string
        }
        Update: {
          blocked_id?: string
          blocker_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "blocked_users_blocked_id_fkey"
            columns: ["blocked_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blocked_users_blocker_id_fkey"
            columns: ["blocker_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      connection_location_shares: {
        Row: {
          accuracy: number | null
          connection_id: string
          expires_at: string | null
          id: string
          is_active: boolean
          latitude: number
          longitude: number
          owner_user_id: string
          recipient_user_id: string
          started_at: string
          updated_at: string
        }
        Insert: {
          accuracy?: number | null
          connection_id: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          latitude: number
          longitude: number
          owner_user_id: string
          recipient_user_id: string
          started_at?: string
          updated_at?: string
        }
        Update: {
          accuracy?: number | null
          connection_id?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          latitude?: number
          longitude?: number
          owner_user_id?: string
          recipient_user_id?: string
          started_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "connection_location_shares_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "connection_location_shares_owner_user_id_fkey"
            columns: ["owner_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "connection_location_shares_recipient_user_id_fkey"
            columns: ["recipient_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      connections: {
        Row: {
          connected_at: string
          context: string | null
          id: string
          match_id: string
          match_reason: string
          user_a_id: string
          user_b_id: string
        }
        Insert: {
          connected_at?: string
          context?: string | null
          id?: string
          match_id: string
          match_reason: string
          user_a_id: string
          user_b_id: string
        }
        Update: {
          connected_at?: string
          context?: string | null
          id?: string
          match_id?: string
          match_reason?: string
          user_a_id?: string
          user_b_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "connections_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: true
            referencedRelation: "match_candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "connections_user_a_id_fkey"
            columns: ["user_a_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "connections_user_b_id_fkey"
            columns: ["user_b_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_members: {
        Row: {
          conversation_id: string
          joined_at: string
          user_id: string
        }
        Insert: {
          conversation_id: string
          joined_at?: string
          user_id: string
        }
        Update: {
          conversation_id?: string
          joined_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_members_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          connection_id: string
          created_at: string
          id: string
          updated_at: string
        }
        Insert: {
          connection_id: string
          created_at?: string
          id?: string
          updated_at?: string
        }
        Update: {
          connection_id?: string
          created_at?: string
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: true
            referencedRelation: "connections"
            referencedColumns: ["id"]
          },
        ]
      }
      discovery_sessions: {
        Row: {
          ended_at: string | null
          id: string
          intent_id: string
          started_at: string
          state: string
          updated_at: string
          user_id: string
        }
        Insert: {
          ended_at?: string | null
          id?: string
          intent_id: string
          started_at?: string
          state?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          ended_at?: string | null
          id?: string
          intent_id?: string
          started_at?: string
          state?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "discovery_sessions_intent_id_fkey"
            columns: ["intent_id"]
            isOneToOne: false
            referencedRelation: "intents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discovery_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      event_participants: {
        Row: {
          event_id: string
          joined_at: string
          user_id: string
        }
        Insert: {
          event_id: string
          joined_at?: string
          user_id: string
        }
        Update: {
          event_id?: string
          joined_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_participants_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          cover_path: string | null
          created_at: string
          description: string
          discovery_radius_m: number
          ends_at: string
          event_type: string
          id: string
          is_public: boolean
          name: string
          organizer_id: string
          starts_at: string
          status: string
          updated_at: string
          venue: string
        }
        Insert: {
          cover_path?: string | null
          created_at?: string
          description?: string
          discovery_radius_m?: number
          ends_at: string
          event_type?: string
          id?: string
          is_public?: boolean
          name: string
          organizer_id: string
          starts_at: string
          status?: string
          updated_at?: string
          venue?: string
        }
        Update: {
          cover_path?: string | null
          created_at?: string
          description?: string
          discovery_radius_m?: number
          ends_at?: string
          event_type?: string
          id?: string
          is_public?: boolean
          name?: string
          organizer_id?: string
          starts_at?: string
          status?: string
          updated_at?: string
          venue?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_organizer_id_fkey"
            columns: ["organizer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      help_requests: {
        Row: {
          created_at: string
          description: string
          event_id: string | null
          id: string
          needed_skills: string[]
          requester_id: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description: string
          event_id?: string | null
          id?: string
          needed_skills?: string[]
          requester_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          event_id?: string | null
          id?: string
          needed_skills?: string[]
          requester_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "help_requests_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "help_requests_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      intents: {
        Row: {
          created_at: string
          desired_activities: string[]
          desired_roles: string[]
          desired_skills: string[]
          desired_topics: string[]
          event_id: string | null
          expires_at: string | null
          goal: string
          id: string
          intent_type: string
          interpretation_source: string
          keywords: string[]
          original_text: string
          status: string
          structured_needs: string[]
          structured_skills: string[]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          desired_activities?: string[]
          desired_roles?: string[]
          desired_skills?: string[]
          desired_topics?: string[]
          event_id?: string | null
          expires_at?: string | null
          goal: string
          id?: string
          intent_type?: string
          interpretation_source?: string
          keywords?: string[]
          original_text: string
          status?: string
          structured_needs?: string[]
          structured_skills?: string[]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          desired_activities?: string[]
          desired_roles?: string[]
          desired_skills?: string[]
          desired_topics?: string[]
          event_id?: string | null
          expires_at?: string | null
          goal?: string
          id?: string
          intent_type?: string
          interpretation_source?: string
          keywords?: string[]
          original_text?: string
          status?: string
          structured_needs?: string[]
          structured_skills?: string[]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "intents_event_fk"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intents_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      match_candidates: {
        Row: {
          compatibility_score: number
          created_at: string
          id: string
          intent_a_id: string
          intent_b_id: string
          match_reason: string
          proximity_state: string | null
          status: string
          updated_at: string
          user_a_id: string
          user_a_needs: string[]
          user_b_id: string
          user_b_needs: string[]
        }
        Insert: {
          compatibility_score: number
          created_at?: string
          id?: string
          intent_a_id: string
          intent_b_id: string
          match_reason: string
          proximity_state?: string | null
          status?: string
          updated_at?: string
          user_a_id: string
          user_a_needs?: string[]
          user_b_id: string
          user_b_needs?: string[]
        }
        Update: {
          compatibility_score?: number
          created_at?: string
          id?: string
          intent_a_id?: string
          intent_b_id?: string
          match_reason?: string
          proximity_state?: string | null
          status?: string
          updated_at?: string
          user_a_id?: string
          user_a_needs?: string[]
          user_b_id?: string
          user_b_needs?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "match_candidates_intent_a_id_fkey"
            columns: ["intent_a_id"]
            isOneToOne: false
            referencedRelation: "intents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_candidates_intent_b_id_fkey"
            columns: ["intent_b_id"]
            isOneToOne: false
            referencedRelation: "intents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_candidates_user_a_id_fkey"
            columns: ["user_a_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_candidates_user_b_id_fkey"
            columns: ["user_b_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      match_responses: {
        Row: {
          created_at: string
          match_id: string
          response: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          match_id: string
          response: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          match_id?: string
          response?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "match_responses_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "match_candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_responses_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_confirmations: {
        Row: {
          confirmed_at: string
          match_id: string
          user_id: string
        }
        Insert: {
          confirmed_at?: string
          match_id: string
          user_id: string
        }
        Update: {
          confirmed_at?: string
          match_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meeting_confirmations_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "match_candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_confirmations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          read_at: string | null
          sender_id: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          read_at?: string | null
          sender_id: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          read_at?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          haptics: boolean
          help_alert: boolean
          mutual_sync: boolean
          resync: boolean
          strong_sync: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          haptics?: boolean
          help_alert?: boolean
          mutual_sync?: boolean
          resync?: boolean
          strong_sync?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          haptics?: boolean
          help_alert?: boolean
          mutual_sync?: boolean
          resync?: boolean
          strong_sync?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string
          created_at: string
          id: string
          kind: string
          match_id: string | null
          read_at: string | null
          title: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          kind: string
          match_id?: string | null
          read_at?: string | null
          title: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          kind?: string
          match_id?: string | null
          read_at?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "match_candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          activities: string[]
          avatar_path: string | null
          bio: string
          can_help_with: string[]
          created_at: string
          discovery_enabled: boolean
          event_only_discovery: boolean
          help_requests_enabled: boolean
          hobbies: string[]
          id: string
          interests: string[]
          name: string
          onboarding_complete: boolean
          primary_context: string | null
          resync_enabled: boolean
          serendipity_enabled: boolean
          updated_at: string
          wants_to_learn: string[]
        }
        Insert: {
          activities?: string[]
          avatar_path?: string | null
          bio?: string
          can_help_with?: string[]
          created_at?: string
          discovery_enabled?: boolean
          event_only_discovery?: boolean
          help_requests_enabled?: boolean
          hobbies?: string[]
          id: string
          interests?: string[]
          name: string
          onboarding_complete?: boolean
          primary_context?: string | null
          resync_enabled?: boolean
          serendipity_enabled?: boolean
          updated_at?: string
          wants_to_learn?: string[]
        }
        Update: {
          activities?: string[]
          avatar_path?: string | null
          bio?: string
          can_help_with?: string[]
          created_at?: string
          discovery_enabled?: boolean
          event_only_discovery?: boolean
          help_requests_enabled?: boolean
          hobbies?: string[]
          id?: string
          interests?: string[]
          name?: string
          onboarding_complete?: boolean
          primary_context?: string | null
          resync_enabled?: boolean
          serendipity_enabled?: boolean
          updated_at?: string
          wants_to_learn?: string[]
        }
        Relationships: []
      }
      proximity_observations: {
        Row: {
          confidence: number | null
          ephemeral_token_hash: string
          expires_at: string
          id: string
          observed_at: string
          observer_id: string
          proximity_state: string | null
        }
        Insert: {
          confidence?: number | null
          ephemeral_token_hash: string
          expires_at: string
          id?: string
          observed_at?: string
          observer_id: string
          proximity_state?: string | null
        }
        Update: {
          confidence?: number | null
          ephemeral_token_hash?: string
          expires_at?: string
          id?: string
          observed_at?: string
          observer_id?: string
          proximity_state?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "proximity_observations_observer_id_fkey"
            columns: ["observer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          category: string
          created_at: string
          details: string
          id: string
          match_id: string | null
          reported_id: string
          reporter_id: string
        }
        Insert: {
          category: string
          created_at?: string
          details?: string
          id?: string
          match_id?: string | null
          reported_id: string
          reporter_id: string
        }
        Update: {
          category?: string
          created_at?: string
          details?: string
          id?: string
          match_id?: string | null
          reported_id?: string
          reporter_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "match_candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_reported_id_fkey"
            columns: ["reported_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      skills: {
        Row: {
          created_at: string
          id: string
          name: string
          normalized_name: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          normalized_name?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          normalized_name?: string | null
        }
        Relationships: []
      }
      team_needs: {
        Row: {
          created_at: string
          event_id: string
          id: string
          needed_skills: string[]
          owner_id: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          needed_skills?: string[]
          owner_id: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          needed_skills?: string[]
          owner_id?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_needs_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_needs_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_presence: {
        Row: {
          accuracy: number | null
          created_at: string
          discovery_active: boolean
          event_id: string | null
          geohash: string | null
          latitude: number
          longitude: number
          sync_radius_m: number
          updated_at: string
          user_id: string
        }
        Insert: {
          accuracy?: number | null
          created_at?: string
          discovery_active?: boolean
          event_id?: string | null
          geohash?: string | null
          latitude: number
          longitude: number
          sync_radius_m?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          accuracy?: number | null
          created_at?: string
          discovery_active?: boolean
          event_id?: string | null
          geohash?: string | null
          latitude?: number
          longitude?: number
          sync_radius_m?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_presence_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_presence_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_skills: {
        Row: {
          created_at: string
          skill_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          skill_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          skill_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_skills_skill_id_fkey"
            columns: ["skill_id"]
            isOneToOne: false
            referencedRelation: "skills"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_skills_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
