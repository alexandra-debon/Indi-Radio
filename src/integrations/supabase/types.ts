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
      admin_messages: {
        Row: {
          body: string | null
          created_at: string
          id: string
          image_url: string | null
          is_from_admin: boolean
          read_at: string | null
          sender_id: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          is_from_admin?: boolean
          read_at?: string | null
          sender_id: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          is_from_admin?: boolean
          read_at?: string | null
          sender_id?: string
          user_id?: string
        }
        Relationships: []
      }
      album_reports: {
        Row: {
          album_id: string
          created_at: string
          id: string
          reason: string
          reporter_id: string
          resolved_at: string | null
          resolved_by: string | null
          status: string
        }
        Insert: {
          album_id: string
          created_at?: string
          id?: string
          reason: string
          reporter_id: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
        }
        Update: {
          album_id?: string
          created_at?: string
          id?: string
          reason?: string
          reporter_id?: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "album_reports_album_id_fkey"
            columns: ["album_id"]
            isOneToOne: false
            referencedRelation: "photo_albums"
            referencedColumns: ["id"]
          },
        ]
      }
      album_reviews: {
        Row: {
          apple_music_url: string | null
          artist: string
          author_id: string
          bandcamp_url: string | null
          content: string
          cover_url: string | null
          created_at: string
          excerpt: string | null
          id: string
          label: string | null
          published: boolean
          rating: number | null
          release_date: string | null
          slug: string
          social_links: Json
          soundcloud_url: string | null
          spotify_url: string | null
          title: string
          updated_at: string
          youtube_url: string | null
        }
        Insert: {
          apple_music_url?: string | null
          artist: string
          author_id: string
          bandcamp_url?: string | null
          content: string
          cover_url?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          label?: string | null
          published?: boolean
          rating?: number | null
          release_date?: string | null
          slug: string
          social_links?: Json
          soundcloud_url?: string | null
          spotify_url?: string | null
          title: string
          updated_at?: string
          youtube_url?: string | null
        }
        Update: {
          apple_music_url?: string | null
          artist?: string
          author_id?: string
          bandcamp_url?: string | null
          content?: string
          cover_url?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          label?: string | null
          published?: boolean
          rating?: number | null
          release_date?: string | null
          slug?: string
          social_links?: Json
          soundcloud_url?: string | null
          spotify_url?: string | null
          title?: string
          updated_at?: string
          youtube_url?: string | null
        }
        Relationships: []
      }
      artwork_lookups: {
        Row: {
          artist: string
          attempts: Json | null
          created_at: string
          duration_ms: number
          error: string | null
          found: boolean
          id: string
          source: string | null
          title: string
        }
        Insert: {
          artist: string
          attempts?: Json | null
          created_at?: string
          duration_ms: number
          error?: string | null
          found: boolean
          id?: string
          source?: string | null
          title: string
        }
        Update: {
          artist?: string
          attempts?: Json | null
          created_at?: string
          duration_ms?: number
          error?: string | null
          found?: boolean
          id?: string
          source?: string | null
          title?: string
        }
        Relationships: []
      }
      clip_entries: {
        Row: {
          author_id: string | null
          body: string | null
          created_at: string
          id: string
          pinned_at: string | null
          playlist_url: string | null
          section: Database["public"]["Enums"]["clip_section"]
          title: string
          updated_at: string
          video_url: string | null
          video_urls: string[] | null
        }
        Insert: {
          author_id?: string | null
          body?: string | null
          created_at?: string
          id?: string
          pinned_at?: string | null
          playlist_url?: string | null
          section: Database["public"]["Enums"]["clip_section"]
          title: string
          updated_at?: string
          video_url?: string | null
          video_urls?: string[] | null
        }
        Update: {
          author_id?: string | null
          body?: string | null
          created_at?: string
          id?: string
          pinned_at?: string | null
          playlist_url?: string | null
          section?: Database["public"]["Enums"]["clip_section"]
          title?: string
          updated_at?: string
          video_url?: string | null
          video_urls?: string[] | null
        }
        Relationships: []
      }
      comment_reports: {
        Row: {
          comment_id: string
          comment_type: string
          created_at: string
          id: string
          reason: string
          reporter_id: string
          resolved_at: string | null
          resolved_by: string | null
          status: string
        }
        Insert: {
          comment_id: string
          comment_type: string
          created_at?: string
          id?: string
          reason: string
          reporter_id: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
        }
        Update: {
          comment_id?: string
          comment_type?: string
          created_at?: string
          id?: string
          reason?: string
          reporter_id?: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
        }
        Relationships: []
      }
      content_comments: {
        Row: {
          author_id: string
          body: string
          content_id: string
          content_type: string
          created_at: string
          id: string
          image_captions: string[]
          image_urls: string[]
          parent_id: string | null
          updated_at: string
        }
        Insert: {
          author_id: string
          body: string
          content_id: string
          content_type: string
          created_at?: string
          id?: string
          image_captions?: string[]
          image_urls?: string[]
          parent_id?: string | null
          updated_at?: string
        }
        Update: {
          author_id?: string
          body?: string
          content_id?: string
          content_type?: string
          created_at?: string
          id?: string
          image_captions?: string[]
          image_urls?: string[]
          parent_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "content_comments"
            referencedColumns: ["id"]
          },
        ]
      }
      content_likes: {
        Row: {
          content_id: string
          content_type: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          content_id: string
          content_type: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          content_id?: string
          content_type?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      content_ratings: {
        Row: {
          comment: string | null
          content_id: string
          content_type: string
          created_at: string
          id: string
          stars: number
          updated_at: string
          user_id: string
        }
        Insert: {
          comment?: string | null
          content_id: string
          content_type: string
          created_at?: string
          id?: string
          stars: number
          updated_at?: string
          user_id: string
        }
        Update: {
          comment?: string | null
          content_id?: string
          content_type?: string
          created_at?: string
          id?: string
          stars?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      content_translations: {
        Row: {
          created_at: string
          entity_key: string
          entity_type: string
          field: string
          id: string
          lang: string
          source_hash: string
          translated_text: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          entity_key: string
          entity_type: string
          field: string
          id?: string
          lang: string
          source_hash: string
          translated_text: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          entity_key?: string
          entity_type?: string
          field?: string
          id?: string
          lang?: string
          source_hash?: string
          translated_text?: string
          updated_at?: string
        }
        Relationships: []
      }
      coup_de_coeur_likes: {
        Row: {
          coup_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          coup_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          coup_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coup_de_coeur_likes_coup_id_fkey"
            columns: ["coup_id"]
            isOneToOne: false
            referencedRelation: "coups_de_coeur"
            referencedColumns: ["id"]
          },
        ]
      }
      coups_de_coeur: {
        Row: {
          artist: string
          author_id: string | null
          comment: string
          cover_url: string | null
          created_at: string
          discovery_story: string | null
          editorial_rating: number | null
          featured_date: string
          id: string
          kind: string
          published: boolean
          social_links: Json
          title: string
          updated_at: string
        }
        Insert: {
          artist: string
          author_id?: string | null
          comment: string
          cover_url?: string | null
          created_at?: string
          discovery_story?: string | null
          editorial_rating?: number | null
          featured_date?: string
          id?: string
          kind?: string
          published?: boolean
          social_links?: Json
          title: string
          updated_at?: string
        }
        Update: {
          artist?: string
          author_id?: string | null
          comment?: string
          cover_url?: string | null
          created_at?: string
          discovery_story?: string | null
          editorial_rating?: number | null
          featured_date?: string
          id?: string
          kind?: string
          published?: boolean
          social_links?: Json
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
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
          podcast_id: string | null
          published_at: string
          show_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          audio_url?: string | null
          cover_url?: string | null
          description?: string | null
          duration_seconds?: number | null
          external_url?: string | null
          id?: string
          podcast_id?: string | null
          published_at?: string
          show_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          audio_url?: string | null
          cover_url?: string | null
          description?: string | null
          duration_seconds?: number | null
          external_url?: string | null
          id?: string
          podcast_id?: string | null
          published_at?: string
          show_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "episodes_podcast_id_fkey"
            columns: ["podcast_id"]
            isOneToOne: false
            referencedRelation: "podcasts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "episodes_show_id_fkey"
            columns: ["show_id"]
            isOneToOne: false
            referencedRelation: "shows"
            referencedColumns: ["id"]
          },
        ]
      }
      image_reports: {
        Row: {
          created_at: string
          id: string
          image_url: string
          post_id: string
          reason: string
          reporter_id: string
          resolved_at: string | null
          resolved_by: string | null
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          image_url: string
          post_id: string
          reason: string
          reporter_id: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string
          post_id?: string
          reason?: string
          reporter_id?: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "image_reports_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      magazine_entries: {
        Row: {
          author_id: string | null
          body: string | null
          cover_url: string | null
          created_at: string
          id: string
          magazine_url: string
          pinned_at: string | null
          title: string
          updated_at: string
        }
        Insert: {
          author_id?: string | null
          body?: string | null
          cover_url?: string | null
          created_at?: string
          id?: string
          magazine_url: string
          pinned_at?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          author_id?: string | null
          body?: string | null
          cover_url?: string | null
          created_at?: string
          id?: string
          magazine_url?: string
          pinned_at?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      news_comment_likes: {
        Row: {
          comment_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          comment_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          comment_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "news_comment_likes_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "news_comments"
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
          image_captions: string[]
          image_urls: string[]
          news_post_id: string
        }
        Insert: {
          author_id: string
          content: string
          created_at?: string
          id?: string
          image_captions?: string[]
          image_urls?: string[]
          news_post_id: string
        }
        Update: {
          author_id?: string
          content?: string
          created_at?: string
          id?: string
          image_captions?: string[]
          image_urls?: string[]
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
          image_captions: string[]
          image_url: string | null
          image_urls: string[]
          social_links: Json
          title: string
          updated_at: string
        }
        Insert: {
          author_id: string
          content: string
          created_at?: string
          id?: string
          image_captions?: string[]
          image_url?: string | null
          image_urls?: string[]
          social_links?: Json
          title: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          content?: string
          created_at?: string
          id?: string
          image_captions?: string[]
          image_url?: string | null
          image_urls?: string[]
          social_links?: Json
          title?: string
          updated_at?: string
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
          gdpr_consent_at: string | null
          id: string
          source: string | null
          subscribed_at: string
        }
        Insert: {
          email: string
          gdpr_consent_at?: string | null
          id?: string
          source?: string | null
          subscribed_at?: string
        }
        Update: {
          email?: string
          gdpr_consent_at?: string | null
          id?: string
          source?: string | null
          subscribed_at?: string
        }
        Relationships: []
      }
      notification_preferences: {
        Row: {
          created_at: string
          likes: boolean
          mentions: boolean
          replies: boolean
          thread_replies: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          likes?: boolean
          mentions?: boolean
          replies?: boolean
          thread_replies?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          likes?: boolean
          mentions?: boolean
          replies?: boolean
          thread_replies?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          actor_id: string | null
          created_at: string
          id: string
          mention_email_sent_at: string | null
          message: string
          read_at: string | null
          recipient_id: string
          type: string
          url: string | null
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          id?: string
          mention_email_sent_at?: string | null
          message: string
          read_at?: string | null
          recipient_id: string
          type: string
          url?: string | null
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          id?: string
          mention_email_sent_at?: string | null
          message?: string
          read_at?: string | null
          recipient_id?: string
          type?: string
          url?: string | null
        }
        Relationships: []
      }
      onboarding_feedback: {
        Row: {
          created_at: string
          id: string
          lang: string | null
          message: string | null
          rating: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          lang?: string | null
          message?: string | null
          rating: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          lang?: string | null
          message?: string | null
          rating?: string
          user_id?: string | null
        }
        Relationships: []
      }
      photo_albums: {
        Row: {
          cover_url: string | null
          created_at: string
          description: string | null
          id: string
          owner_id: string
          photo_order: string[]
          title: string
          updated_at: string
        }
        Insert: {
          cover_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          owner_id: string
          photo_order?: string[]
          title: string
          updated_at?: string
        }
        Update: {
          cover_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          owner_id?: string
          photo_order?: string[]
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      podcasts: {
        Row: {
          cover_url: string | null
          created_at: string
          description: string | null
          duration_seconds: number | null
          external_url: string | null
          id: string
          title: string
        }
        Insert: {
          cover_url?: string | null
          created_at?: string
          description?: string | null
          duration_seconds?: number | null
          external_url?: string | null
          id?: string
          title: string
        }
        Update: {
          cover_url?: string | null
          created_at?: string
          description?: string | null
          duration_seconds?: number | null
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
      post_comment_likes: {
        Row: {
          comment_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          comment_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          comment_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_comment_likes_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "post_comments"
            referencedColumns: ["id"]
          },
        ]
      }
      post_comments: {
        Row: {
          author_id: string
          content: string
          created_at: string
          id: string
          image_captions: string[]
          image_urls: string[]
          post_id: string
        }
        Insert: {
          author_id: string
          content: string
          created_at?: string
          id?: string
          image_captions?: string[]
          image_urls?: string[]
          post_id: string
        }
        Update: {
          author_id?: string
          content?: string
          created_at?: string
          id?: string
          image_captions?: string[]
          image_urls?: string[]
          post_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_comments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_likes: {
        Row: {
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          album_id: string | null
          author_id: string
          content: string
          created_at: string
          id: string
          image_captions: string[]
          image_url: string | null
          image_urls: string[]
          mentions: string[] | null
          pin_label: string | null
          pinned_at: string | null
          social_links: Json
          title: string | null
          updated_at: string
        }
        Insert: {
          album_id?: string | null
          author_id: string
          content: string
          created_at?: string
          id?: string
          image_captions?: string[]
          image_url?: string | null
          image_urls?: string[]
          mentions?: string[] | null
          pin_label?: string | null
          pinned_at?: string | null
          social_links?: Json
          title?: string | null
          updated_at?: string
        }
        Update: {
          album_id?: string | null
          author_id?: string
          content?: string
          created_at?: string
          id?: string
          image_captions?: string[]
          image_url?: string | null
          image_urls?: string[]
          mentions?: string[] | null
          pin_label?: string | null
          pinned_at?: string | null
          social_links?: Json
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "posts_album_id_fkey"
            columns: ["album_id"]
            isOneToOne: false
            referencedRelation: "photo_albums"
            referencedColumns: ["id"]
          },
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
          badges: string[]
          bio: string | null
          created_at: string
          id: string
          is_certified: boolean
          is_team_indi: boolean
          lang: string | null
          level: number
          points: number
          pseudo: string
          quarantine_reason: string | null
          quarantined_at: string | null
          role: Database["public"]["Enums"]["app_role"]
          social_links: Json
          updated_at: string
          website: string | null
        }
        Insert: {
          avatar_url?: string | null
          badges?: string[]
          bio?: string | null
          created_at?: string
          id: string
          is_certified?: boolean
          is_team_indi?: boolean
          lang?: string | null
          level?: number
          points?: number
          pseudo: string
          quarantine_reason?: string | null
          quarantined_at?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          social_links?: Json
          updated_at?: string
          website?: string | null
        }
        Update: {
          avatar_url?: string | null
          badges?: string[]
          bio?: string | null
          created_at?: string
          id?: string
          is_certified?: boolean
          is_team_indi?: boolean
          lang?: string | null
          level?: number
          points?: number
          pseudo?: string
          quarantine_reason?: string | null
          quarantined_at?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          social_links?: Json
          updated_at?: string
          website?: string | null
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
          duration_seconds: number | null
          host: string | null
          id: string
          schedule: string | null
          title: string
          type: string
          updated_at: string
        }
        Insert: {
          cover_url?: string | null
          created_at?: string
          description?: string | null
          duration_seconds?: number | null
          host?: string | null
          id?: string
          schedule?: string | null
          title: string
          type: string
          updated_at?: string
        }
        Update: {
          cover_url?: string | null
          created_at?: string
          description?: string | null
          duration_seconds?: number | null
          host?: string | null
          id?: string
          schedule?: string | null
          title?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Update: {
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
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
      translation_logs: {
        Row: {
          attempt: number
          created_at: string
          duration_ms: number | null
          entity_key: string
          entity_type: string
          error: string | null
          field: string
          id: string
          source_hash: string | null
          status: string
          target_lang: string
          text_length: number | null
        }
        Insert: {
          attempt?: number
          created_at?: string
          duration_ms?: number | null
          entity_key: string
          entity_type: string
          error?: string | null
          field: string
          id?: string
          source_hash?: string | null
          status: string
          target_lang: string
          text_length?: number | null
        }
        Update: {
          attempt?: number
          created_at?: string
          duration_ms?: number | null
          entity_key?: string
          entity_type?: string
          error?: string | null
          field?: string
          id?: string
          source_hash?: string | null
          status?: string
          target_lang?: string
          text_length?: number | null
        }
        Relationships: []
      }
      translation_retry_queue: {
        Row: {
          attempts: number
          created_at: string
          entity_key: string
          entity_type: string
          field: string
          id: string
          last_error: string | null
          next_attempt_at: string
          source_hash: string
          source_text: string
          target_lang: string
          updated_at: string
        }
        Insert: {
          attempts?: number
          created_at?: string
          entity_key: string
          entity_type: string
          field: string
          id?: string
          last_error?: string | null
          next_attempt_at?: string
          source_hash: string
          source_text: string
          target_lang: string
          updated_at?: string
        }
        Update: {
          attempts?: number
          created_at?: string
          entity_key?: string
          entity_type?: string
          field?: string
          id?: string
          last_error?: string | null
          next_attempt_at?: string
          source_hash?: string
          source_text?: string
          target_lang?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      chart_all_time: {
        Row: {
          artist: string | null
          id: string | null
          likes: number | null
          plays: number | null
          title: string | null
        }
        Relationships: []
      }
      chart_week: {
        Row: {
          artist: string | null
          id: string | null
          likes: number | null
          plays: number | null
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
      is_quarantined: { Args: { _user_id: string }; Returns: boolean }
      notif_pref_enabled: {
        Args: { _kind: string; _user_id: string }
        Returns: boolean
      }
      notify_mentions_from_text: {
        Args: { _actor_id: string; _content: string; _url: string }
        Returns: undefined
      }
      notify_new_mentions_from_text: {
        Args: {
          _actor_id: string
          _new_text: string
          _old_text: string
          _url: string
        }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "auditeur" | "artiste" | "animateur" | "admin"
      clip_section: "clips_actu" | "playlists_clips"
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
      clip_section: ["clips_actu", "playlists_clips"],
    },
  },
} as const
