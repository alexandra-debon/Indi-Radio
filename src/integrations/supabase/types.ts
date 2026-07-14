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
      episode_ratings: {
        Row: {
          comment: string | null
          created_at: string
          episode_id: string
          id: string
          stars: number
          user_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          episode_id: string
          id?: string
          stars: number
          user_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          episode_id?: string
          id?: string
          stars?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "episode_ratings_episode_id_fkey"
            columns: ["episode_id"]
            isOneToOne: false
            referencedRelation: "episodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "episode_ratings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      episodes: {
        Row: {
          audio_url: string | null
          cover_url: string | null
          description: string | null
          duration_seconds: number | null
          external_url: string | null
          id: string
          podcast_id: string
          published_at: string
          title: string
        }
        Insert: {
          audio_url?: string | null
          cover_url?: string | null
          description?: string | null
          duration_seconds?: number | null
          external_url?: string | null
          id?: string
          podcast_id: string
          published_at?: string
          title: string
        }
        Update: {
          audio_url?: string | null
          cover_url?: string | null
          description?: string | null
          duration_seconds?: number | null
          external_url?: string | null
          id?: string
          podcast_id?: string
          published_at?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "episodes_podcast_id_fkey"
            columns: ["podcast_id"]
            isOneToOne: false
            referencedRelation: "podcasts"
            referencedColumns: ["id"]
          },
        ]
      }
      news_comments: {
        Row: {
          author_id: string
          content: string
          created_at: string
          id: string
          news_post_id: string
        }
        Insert: {
          author_id: string
          content: string
          created_at?: string
          id?: string
          news_post_id: string
        }
        Update: {
          author_id?: string
          content?: string
          created_at?: string
          id?: string
          news_post_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "news_comments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "news_comments_news_post_id_fkey"
            columns: ["news_post_id"]
            isOneToOne: false
            referencedRelation: "news_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      news_likes: {
        Row: {
          created_at: string
          id: string
          news_post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          news_post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          news_post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "news_likes_news_post_id_fkey"
            columns: ["news_post_id"]
            isOneToOne: false
            referencedRelation: "news_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "news_likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      news_posts: {
        Row: {
          author_id: string
          content: string
          created_at: string
          id: string
          image_url: string | null
          title: string
        }
        Insert: {
          author_id: string
          content: string
          created_at?: string
          id?: string
          image_url?: string | null
          title: string
        }
        Update: {
          author_id?: string
          content?: string
          created_at?: string
          id?: string
          image_url?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "news_posts_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      newsletter_subscribers: {
        Row: {
          email: string
          id: string
          subscribed_at: string
        }
        Insert: {
          email: string
          id?: string
          subscribed_at?: string
        }
        Update: {
          email?: string
          id?: string
          subscribed_at?: string
        }
        Relationships: []
      }
      podcasts: {
        Row: {
          cover_url: string | null
          created_at: string
          description: string | null
          external_url: string | null
          id: string
          title: string
        }
        Insert: {
          cover_url?: string | null
          created_at?: string
          description?: string | null
          external_url?: string | null
          id?: string
          title: string
        }
        Update: {
          cover_url?: string | null
          created_at?: string
          description?: string | null
          external_url?: string | null
          id?: string
          title?: string
        }
        Relationships: []
      }
      point_events: {
        Row: {
          action: string
          created_at: string
          id: string
          points_awarded: number
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          points_awarded: number
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          points_awarded?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "point_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          author_id: string
          content: string
          created_at: string
          id: string
          mentions: string[] | null
        }
        Insert: {
          author_id: string
          content: string
          created_at?: string
          id?: string
          mentions?: string[] | null
        }
        Update: {
          author_id?: string
          content?: string
          created_at?: string
          id?: string
          mentions?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "posts_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_contacts: {
        Row: {
          tel_auditeur: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          tel_auditeur?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          tel_auditeur?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          id: string
          is_certified: boolean
          level: number
          points: number
          pseudo: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          id: string
          is_certified?: boolean
          level?: number
          points?: number
          pseudo: string
          role?: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          id?: string
          is_certified?: boolean
          level?: number
          points?: number
          pseudo?: string
          role?: Database["public"]["Enums"]["app_role"]
        }
        Relationships: []
      }
      requests: {
        Row: {
          author_id: string
          created_at: string
          dedication_message: string | null
          id: string
          status: string
          track_requested: string | null
        }
        Insert: {
          author_id: string
          created_at?: string
          dedication_message?: string | null
          id?: string
          status?: string
          track_requested?: string | null
        }
        Update: {
          author_id?: string
          created_at?: string
          dedication_message?: string | null
          id?: string
          status?: string
          track_requested?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "requests_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      shows: {
        Row: {
          cover_url: string | null
          created_at: string
          description: string | null
          host: string | null
          id: string
          schedule: string | null
          title: string
          type: string
        }
        Insert: {
          cover_url?: string | null
          created_at?: string
          description?: string | null
          host?: string | null
          id?: string
          schedule?: string | null
          title: string
          type: string
        }
        Update: {
          cover_url?: string | null
          created_at?: string
          description?: string | null
          host?: string | null
          id?: string
          schedule?: string | null
          title?: string
          type?: string
        }
        Relationships: []
      }
      track_history: {
        Row: {
          artist: string
          id: string
          played_at: string
          title: string
        }
        Insert: {
          artist: string
          id?: string
          played_at?: string
          title: string
        }
        Update: {
          artist?: string
          id?: string
          played_at?: string
          title?: string
        }
        Relationships: []
      }
      track_likes: {
        Row: {
          created_at: string
          id: string
          track_history_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          track_history_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          track_history_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "track_likes_track_history_id_fkey"
            columns: ["track_history_id"]
            isOneToOne: false
            referencedRelation: "chart_all_time"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "track_likes_track_history_id_fkey"
            columns: ["track_history_id"]
            isOneToOne: false
            referencedRelation: "chart_week"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "track_likes_track_history_id_fkey"
            columns: ["track_history_id"]
            isOneToOne: false
            referencedRelation: "track_history"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "track_likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      chart_all_time: {
        Row: {
          artist: string | null
          id: string | null
          likes: number | null
          title: string | null
        }
        Relationships: []
      }
      chart_week: {
        Row: {
          artist: string | null
          id: string | null
          likes: number | null
          title: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      award_points: {
        Args: { p_action: string; p_points: number; p_user_id: string }
        Returns: undefined
      }
      award_presence_point: { Args: never; Returns: boolean }
      calculate_level: { Args: { pts: number }; Returns: number }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "auditeur" | "artiste" | "animateur" | "admin"
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
      app_role: ["auditeur", "artiste", "animateur", "admin"],
    },
  },
} as const
