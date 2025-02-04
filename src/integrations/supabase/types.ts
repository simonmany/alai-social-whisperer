export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      activities: {
        Row: {
          category: string | null
          created_at: string
          id: string
          name: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          category?: string | null
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      calendar_events: {
        Row: {
          created_at: string | null
          description: string | null
          end_time: string
          google_event_id: string | null
          id: string
          start_time: string
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          end_time: string
          google_event_id?: string | null
          id?: string
          start_time: string
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          end_time?: string
          google_event_id?: string | null
          id?: string
          start_time?: string
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      chat_history: {
        Row: {
          created_at: string
          id: string
          is_ai: boolean
          message: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_ai?: boolean
          message: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_ai?: boolean
          message?: string
          user_id?: string
        }
        Relationships: []
      }
      contact_group_memberships: {
        Row: {
          contact_id: string
          group_id: string
        }
        Insert: {
          contact_id: string
          group_id: string
        }
        Update: {
          contact_id?: string
          group_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_group_memberships_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_group_memberships_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "contact_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_groups: {
        Row: {
          created_at: string
          emoji: string | null
          id: string
          name: string
          user_id: string
        }
        Insert: {
          created_at?: string
          emoji?: string | null
          id?: string
          name: string
          user_id: string
        }
        Update: {
          created_at?: string
          emoji?: string | null
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      contacts: {
        Row: {
          closeness: number | null
          created_at: string
          email: string | null
          id: string
          instagram: string | null
          linkedin: string | null
          meeting_story: string | null
          name: string
          phone: string | null
          relationship: string | null
          twitter: string | null
          user_id: string
        }
        Insert: {
          closeness?: number | null
          created_at?: string
          email?: string | null
          id?: string
          instagram?: string | null
          linkedin?: string | null
          meeting_story?: string | null
          name: string
          phone?: string | null
          relationship?: string | null
          twitter?: string | null
          user_id: string
        }
        Update: {
          closeness?: number | null
          created_at?: string
          email?: string | null
          id?: string
          instagram?: string | null
          linkedin?: string | null
          meeting_story?: string | null
          name?: string
          phone?: string | null
          relationship?: string | null
          twitter?: string | null
          user_id?: string
        }
        Relationships: []
      }
      event_feedback_status: {
        Row: {
          created_at: string | null
          event_id: string
          feedback_sent: boolean | null
        }
        Insert: {
          created_at?: string | null
          event_id: string
          feedback_sent?: boolean | null
        }
        Update: {
          created_at?: string | null
          event_id?: string
          feedback_sent?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "event_feedback_status_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: true
            referencedRelation: "calendar_events"
            referencedColumns: ["id"]
          },
        ]
      }
      food_items: {
        Row: {
          category: string | null
          created_at: string
          id: string
          name: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          category?: string | null
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      languages: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      music_genres: {
        Row: {
          category: string | null
          created_at: string
          id: string
          name: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          category?: string | null
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          age: number | null
          avatar_url: string | null
          city: string | null
          current_interests: Json | null
          desired_interests: Json | null
          display_name: string | null
          food_preferences: Json | null
          gender: string | null
          goals: Json | null
          google_access_token: string | null
          google_refresh_token: string | null
          google_token_expired: boolean
          google_token_expires_at: string | null
          has_completed_tutorial: boolean | null
          has_google_calendar: boolean
          id: string
          languages: Json | null
          music_preferences: Json | null
          occupation: string | null
          onboarding_completed: boolean | null
          onboarding_started_at: string | null
          onboarding_step: string | null
          personality_comments: string[] | null
          personality_traits: Json | null
          relationship_status: string | null
          updated_at: string | null
          username: string | null
        }
        Insert: {
          age?: number | null
          avatar_url?: string | null
          city?: string | null
          current_interests?: Json | null
          desired_interests?: Json | null
          display_name?: string | null
          food_preferences?: Json | null
          gender?: string | null
          goals?: Json | null
          google_access_token?: string | null
          google_refresh_token?: string | null
          google_token_expired?: boolean
          google_token_expires_at?: string | null
          has_completed_tutorial?: boolean | null
          has_google_calendar?: boolean
          id: string
          languages?: Json | null
          music_preferences?: Json | null
          occupation?: string | null
          onboarding_completed?: boolean | null
          onboarding_started_at?: string | null
          onboarding_step?: string | null
          personality_comments?: string[] | null
          personality_traits?: Json | null
          relationship_status?: string | null
          updated_at?: string | null
          username?: string | null
        }
        Update: {
          age?: number | null
          avatar_url?: string | null
          city?: string | null
          current_interests?: Json | null
          desired_interests?: Json | null
          display_name?: string | null
          food_preferences?: Json | null
          gender?: string | null
          goals?: Json | null
          google_access_token?: string | null
          google_refresh_token?: string | null
          google_token_expired?: boolean
          google_token_expires_at?: string | null
          has_completed_tutorial?: boolean | null
          has_google_calendar?: boolean
          id?: string
          languages?: Json | null
          music_preferences?: Json | null
          occupation?: string | null
          onboarding_completed?: boolean | null
          onboarding_started_at?: string | null
          onboarding_step?: string | null
          personality_comments?: string[] | null
          personality_traits?: Json | null
          relationship_status?: string | null
          updated_at?: string | null
          username?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_completed_events: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      schedule_evening_checkin: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      schedule_morning_checkin: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof PublicSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
    ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never
