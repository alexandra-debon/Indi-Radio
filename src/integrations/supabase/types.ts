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
      artist_events: {
        Row: {
          artist_id: string
          created_at: string
          event_date: string
          id: string
          ticket_url: string | null
          title: string
          venue: string | null
        }
        Insert: {
          artist_id: string
          created_at?: string
          event_date: string
          id?: string
          ticket_url?: string | null
          title: string
          venue?: string | null
        }
        Update: {
          artist_id?: string
          created_at?: string
          event_date?: string
          id?: string
          ticket_url?: string | null
          title?: string
          venue?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "artist_events_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      artist_follows: {
        Row: {
          artist_id: string
          created_at: string
          follower_id: string
          id: string
        }
        Insert: {
          artist_id: string
          created_at?: string
          follower_id: string
          id?: string
        }
        Update: {
          artist_id?: string
          created_at?: string
          follower_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "artist_follows_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "artist_follows_follower_id_fkey"
            columns: ["follower_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      artist_shop_items: {
        Row: {
          artist_id: string
          created_at: string
          cta_kind: string
          external_url: string | null
          format: string
          id: string
          image_url: string | null
          in_public_shop: boolean
          is_visible: boolean
          position: number
          summary: string | null
          tags: string[] | null
          title: string
          updated_at: string
        }
        Insert: {
          artist_id: string
          created_at?: string
          cta_kind?: string
          external_url?: string | null
          format?: string
          id?: string
          image_url?: string | null
          in_public_shop?: boolean
          is_visible?: boolean
          position?: number
          summary?: string | null
          tags?: string[] | null
          title: string
          updated_at?: string
        }
        Update: {
          artist_id?: string
          created_at?: string
          cta_kind?: string
          external_url?: string | null
          format?: string
          id?: string
          image_url?: string | null
          in_public_shop?: boolean
          is_visible?: boolean
          position?: number
          summary?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "artist_shop_items_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
      badge_definitions: {
        Row: {
          color: string
          created_at: string
          description: string | null
          icon: string
          id: string
          key: string
          label_en: string | null
          label_fr: string
          position: number
          updated_at: string
        }
        Insert: {
          color?: string
          created_at?: string
          description?: string | null
          icon?: string
          id?: string
          key: string
          label_en?: string | null
          label_fr: string
          position?: number
          updated_at?: string
        }
        Update: {
          color?: string
          created_at?: string
          description?: string | null
          icon?: string
          id?: string
          key?: string
          label_en?: string | null
          label_fr?: string
          position?: number
          updated_at?: string
        }
        Relationships: []
      }
      blog_author_invites: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string | null
          status: string
          token: string
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          status?: string
          token: string
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          status?: string
          token?: string
          updated_at?: string
        }
        Relationships: []
      }
      blog_authors: {
        Row: {
          created_at: string
          granted_by: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          granted_by?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          granted_by?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      broadcast_partners: {
        Row: {
          alt_text: string | null
          created_at: string
          html_snippet: string | null
          id: string
          is_active: boolean
          kind: string
          link_url: string | null
          logo_url: string | null
          name: string
          position: number
          updated_at: string
          visible_on: string[]
        }
        Insert: {
          alt_text?: string | null
          created_at?: string
          html_snippet?: string | null
          id?: string
          is_active?: boolean
          kind: string
          link_url?: string | null
          logo_url?: string | null
          name: string
          position?: number
          updated_at?: string
          visible_on?: string[]
        }
        Update: {
          alt_text?: string | null
          created_at?: string
          html_snippet?: string | null
          id?: string
          is_active?: boolean
          kind?: string
          link_url?: string | null
          logo_url?: string | null
          name?: string
          position?: number
          updated_at?: string
          visible_on?: string[]
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
      editorial_challenges: {
        Row: {
          cover_url: string | null
          created_at: string
          created_by: string | null
          description: string | null
          ends_at: string | null
          id: string
          is_active: boolean
          starts_at: string | null
          title: string
          updated_at: string
        }
        Insert: {
          cover_url?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          ends_at?: string | null
          id?: string
          is_active?: boolean
          starts_at?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          cover_url?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          ends_at?: string | null
          id?: string
          is_active?: boolean
          starts_at?: string | null
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
          og_image_url: string | null
          pinned_at: string | null
          published: boolean
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
          og_image_url?: string | null
          pinned_at?: string | null
          published?: boolean
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
          og_image_url?: string | null
          pinned_at?: string | null
          published?: boolean
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
          moderated_at: string | null
          moderated_by: string | null
          moderation_note: string | null
          news_post_id: string
          status: string
        }
        Insert: {
          author_id: string
          content: string
          created_at?: string
          id?: string
          image_captions?: string[]
          image_urls?: string[]
          moderated_at?: string | null
          moderated_by?: string | null
          moderation_note?: string | null
          news_post_id: string
          status?: string
        }
        Update: {
          author_id?: string
          content?: string
          created_at?: string
          id?: string
          image_captions?: string[]
          image_urls?: string[]
          moderated_at?: string | null
          moderated_by?: string | null
          moderation_note?: string | null
          news_post_id?: string
          status?: string
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
      news_post_revisions: {
        Row: {
          content: string
          created_at: string
          edited_by: string | null
          embed_height: number | null
          embed_url: string | null
          id: string
          image_captions: string[]
          image_url: string | null
          image_urls: string[]
          news_post_id: string
          scheduled_at: string | null
          social_links: Json
          title: string
        }
        Insert: {
          content: string
          created_at?: string
          edited_by?: string | null
          embed_height?: number | null
          embed_url?: string | null
          id?: string
          image_captions?: string[]
          image_url?: string | null
          image_urls?: string[]
          news_post_id: string
          scheduled_at?: string | null
          social_links?: Json
          title: string
        }
        Update: {
          content?: string
          created_at?: string
          edited_by?: string | null
          embed_height?: number | null
          embed_url?: string | null
          id?: string
          image_captions?: string[]
          image_url?: string | null
          image_urls?: string[]
          news_post_id?: string
          scheduled_at?: string | null
          social_links?: Json
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "news_post_revisions_news_post_id_fkey"
            columns: ["news_post_id"]
            isOneToOne: false
            referencedRelation: "news_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      news_posts: {
        Row: {
          author_id: string
          content: string
          created_at: string
          embed_height: number | null
          embed_url: string | null
          id: string
          image_captions: string[]
          image_url: string | null
          image_urls: string[]
          scheduled_at: string | null
          social_links: Json
          title: string
          updated_at: string
        }
        Insert: {
          author_id: string
          content: string
          created_at?: string
          embed_height?: number | null
          embed_url?: string | null
          id?: string
          image_captions?: string[]
          image_url?: string | null
          image_urls?: string[]
          scheduled_at?: string | null
          social_links?: Json
          title: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          content?: string
          created_at?: string
          embed_height?: number | null
          embed_url?: string | null
          id?: string
          image_captions?: string[]
          image_url?: string | null
          image_urls?: string[]
          scheduled_at?: string | null
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
      playlist_entries: {
        Row: {
          apple_embed: string | null
          author_id: string | null
          category: string
          created_at: string
          description: string | null
          description_en: string | null
          id: string
          is_published: boolean
          position: number
          slug: string
          spotify_embed: string | null
          title: string
          title_en: string | null
          updated_at: string
          year: number | null
        }
        Insert: {
          apple_embed?: string | null
          author_id?: string | null
          category?: string
          created_at?: string
          description?: string | null
          description_en?: string | null
          id?: string
          is_published?: boolean
          position?: number
          slug?: string
          spotify_embed?: string | null
          title: string
          title_en?: string | null
          updated_at?: string
          year?: number | null
        }
        Update: {
          apple_embed?: string | null
          author_id?: string | null
          category?: string
          created_at?: string
          description?: string | null
          description_en?: string | null
          id?: string
          is_published?: boolean
          position?: number
          slug?: string
          spotify_embed?: string | null
          title?: string
          title_en?: string | null
          updated_at?: string
          year?: number | null
        }
        Relationships: []
      }
      playlist_slug_history: {
        Row: {
          created_at: string
          id: string
          old_slug: string
          playlist_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          old_slug: string
          playlist_id: string
        }
        Update: {
          created_at?: string
          id?: string
          old_slug?: string
          playlist_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "playlist_slug_history_playlist_id_fkey"
            columns: ["playlist_id"]
            isOneToOne: false
            referencedRelation: "playlist_entries"
            referencedColumns: ["id"]
          },
        ]
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
          category: string | null
          content: string
          created_at: string
          id: string
          image_captions: string[]
          image_url: string | null
          image_urls: string[]
          mentions: string[] | null
          og_image_url: string | null
          pin_label: string | null
          pinned_at: string | null
          social_links: Json
          title: string | null
          updated_at: string
          visibility: string
        }
        Insert: {
          album_id?: string | null
          author_id: string
          category?: string | null
          content: string
          created_at?: string
          id?: string
          image_captions?: string[]
          image_url?: string | null
          image_urls?: string[]
          mentions?: string[] | null
          og_image_url?: string | null
          pin_label?: string | null
          pinned_at?: string | null
          social_links?: Json
          title?: string | null
          updated_at?: string
          visibility?: string
        }
        Update: {
          album_id?: string | null
          author_id?: string
          category?: string | null
          content?: string
          created_at?: string
          id?: string
          image_captions?: string[]
          image_url?: string | null
          image_urls?: string[]
          mentions?: string[] | null
          og_image_url?: string | null
          pin_label?: string | null
          pinned_at?: string | null
          social_links?: Json
          title?: string | null
          updated_at?: string
          visibility?: string
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
          accent_color: string | null
          avatar_url: string | null
          badges: string[]
          banner_url: string | null
          bio: string | null
          created_at: string
          gallery_cover_url: string | null
          gallery_summary: string | null
          gallery_visible: boolean
          id: string
          is_certified: boolean
          is_team_indi: boolean
          lang: string | null
          level: number
          points: number
          pseudo: string
          punchline: string | null
          quarantine_reason: string | null
          quarantined_at: string | null
          role: Database["public"]["Enums"]["app_role"]
          role_request_note: string | null
          role_request_reviewed_at: string | null
          role_request_status: string | null
          role_request_submitted_at: string | null
          role_requested: Database["public"]["Enums"]["app_role"] | null
          show_events_section: boolean
          show_posts_section: boolean
          show_shop_section: boolean
          social_links: Json
          stage_name: string | null
          updated_at: string
          website: string | null
        }
        Insert: {
          accent_color?: string | null
          avatar_url?: string | null
          badges?: string[]
          banner_url?: string | null
          bio?: string | null
          created_at?: string
          gallery_cover_url?: string | null
          gallery_summary?: string | null
          gallery_visible?: boolean
          id: string
          is_certified?: boolean
          is_team_indi?: boolean
          lang?: string | null
          level?: number
          points?: number
          pseudo: string
          punchline?: string | null
          quarantine_reason?: string | null
          quarantined_at?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          role_request_note?: string | null
          role_request_reviewed_at?: string | null
          role_request_status?: string | null
          role_request_submitted_at?: string | null
          role_requested?: Database["public"]["Enums"]["app_role"] | null
          show_events_section?: boolean
          show_posts_section?: boolean
          show_shop_section?: boolean
          social_links?: Json
          stage_name?: string | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          accent_color?: string | null
          avatar_url?: string | null
          badges?: string[]
          banner_url?: string | null
          bio?: string | null
          created_at?: string
          gallery_cover_url?: string | null
          gallery_summary?: string | null
          gallery_visible?: boolean
          id?: string
          is_certified?: boolean
          is_team_indi?: boolean
          lang?: string | null
          level?: number
          points?: number
          pseudo?: string
          punchline?: string | null
          quarantine_reason?: string | null
          quarantined_at?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          role_request_note?: string | null
          role_request_reviewed_at?: string | null
          role_request_status?: string | null
          role_request_submitted_at?: string | null
          role_requested?: Database["public"]["Enums"]["app_role"] | null
          show_events_section?: boolean
          show_posts_section?: boolean
          show_shop_section?: boolean
          social_links?: Json
          stage_name?: string | null
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      pseudo_history: {
        Row: {
          changed_at: string
          id: string
          old_pseudo: string
          user_id: string
        }
        Insert: {
          changed_at?: string
          id?: string
          old_pseudo: string
          user_id: string
        }
        Update: {
          changed_at?: string
          id?: string
          old_pseudo?: string
          user_id?: string
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
      seo_overrides: {
        Row: {
          canonical_url: string | null
          created_at: string
          description: string | null
          id: string
          keywords: string | null
          lang: string
          noindex: boolean
          og_image_url: string | null
          path: string
          title: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          canonical_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          keywords?: string | null
          lang: string
          noindex?: boolean
          og_image_url?: string | null
          path: string
          title?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          canonical_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          keywords?: string | null
          lang?: string
          noindex?: boolean
          og_image_url?: string | null
          path?: string
          title?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      shop_click_events: {
        Row: {
          artist_id: string | null
          artist_pseudo: string | null
          created_at: string
          cta_kind: string
          external_url: string | null
          format: string | null
          id: string
          item_id: string | null
          item_title: string
          source: string
          user_id: string | null
        }
        Insert: {
          artist_id?: string | null
          artist_pseudo?: string | null
          created_at?: string
          cta_kind?: string
          external_url?: string | null
          format?: string | null
          id?: string
          item_id?: string | null
          item_title: string
          source?: string
          user_id?: string | null
        }
        Update: {
          artist_id?: string | null
          artist_pseudo?: string | null
          created_at?: string
          cta_kind?: string
          external_url?: string | null
          format?: string | null
          id?: string
          item_id?: string | null
          item_title?: string
          source?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shop_click_events_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shop_click_events_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "artist_shop_items"
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
      teevi_comments: {
        Row: {
          author_id: string
          content: string
          created_at: string
          id: string
          image_captions: string[]
          image_urls: string[]
          video_id: string
        }
        Insert: {
          author_id: string
          content: string
          created_at?: string
          id?: string
          image_captions?: string[]
          image_urls?: string[]
          video_id: string
        }
        Update: {
          author_id?: string
          content?: string
          created_at?: string
          id?: string
          image_captions?: string[]
          image_urls?: string[]
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "teevi_comments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teevi_comments_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "teevi_videos"
            referencedColumns: ["id"]
          },
        ]
      }
      teevi_likes: {
        Row: {
          created_at: string
          id: string
          user_id: string
          video_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          user_id: string
          video_id: string
        }
        Update: {
          created_at?: string
          id?: string
          user_id?: string
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "teevi_likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teevi_likes_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "teevi_videos"
            referencedColumns: ["id"]
          },
        ]
      }
      teevi_videos: {
        Row: {
          author_id: string | null
          created_at: string
          id: string
          og_image_url: string | null
          published: boolean
          summary: string | null
          tags: string[]
          title: string
          updated_at: string
          video_url: string
        }
        Insert: {
          author_id?: string | null
          created_at?: string
          id?: string
          og_image_url?: string | null
          published?: boolean
          summary?: string | null
          tags?: string[]
          title: string
          updated_at?: string
          video_url: string
        }
        Update: {
          author_id?: string | null
          created_at?: string
          id?: string
          og_image_url?: string | null
          published?: boolean
          summary?: string | null
          tags?: string[]
          title?: string
          updated_at?: string
          video_url?: string
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
      village_articles: {
        Row: {
          author_id: string
          category: string | null
          challenge_id: string | null
          content: string
          cover_url: string | null
          created_at: string
          excerpt: string | null
          free_tag: string | null
          id: string
          magazine_url: string | null
          published: boolean
          slug: string
          source_kind: string | null
          source_post_id: string | null
          title: string
          updated_at: string
          video_url: string | null
          visibility: string
        }
        Insert: {
          author_id: string
          category?: string | null
          challenge_id?: string | null
          content: string
          cover_url?: string | null
          created_at?: string
          excerpt?: string | null
          free_tag?: string | null
          id?: string
          magazine_url?: string | null
          published?: boolean
          slug: string
          source_kind?: string | null
          source_post_id?: string | null
          title: string
          updated_at?: string
          video_url?: string | null
          visibility?: string
        }
        Update: {
          author_id?: string
          category?: string | null
          challenge_id?: string | null
          content?: string
          cover_url?: string | null
          created_at?: string
          excerpt?: string | null
          free_tag?: string | null
          id?: string
          magazine_url?: string | null
          published?: boolean
          slug?: string
          source_kind?: string | null
          source_post_id?: string | null
          title?: string
          updated_at?: string
          video_url?: string | null
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "village_articles_author_id_profiles_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "village_articles_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "editorial_challenges"
            referencedColumns: ["id"]
          },
        ]
      }
      village_subscriptions: {
        Row: {
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          user_id?: string
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
      can_publish_news: { Args: { _user_id: string }; Returns: boolean }
      gallery_owner_public: { Args: { _user_id: string }; Returns: boolean }
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
      notify_search_engines: { Args: { _path: string }; Returns: undefined }
      notify_search_engines_paths: {
        Args: { _paths: string[] }
        Returns: undefined
      }
      record_current_track: {
        Args: { _artist: string; _title: string }
        Returns: Json
      }
      resolve_pseudo_alias: { Args: { _alias: string }; Returns: string }
      slugify_playlist_title: { Args: { _title: string }; Returns: string }
      unaccent_fallback: { Args: { _t: string }; Returns: string }
    }
    Enums: {
      app_role: "auditeur" | "artiste" | "animateur" | "admin" | "media"
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
    Enums: {
      app_role: ["auditeur", "artiste", "animateur", "admin", "media"],
      clip_section: ["clips_actu", "playlists_clips"],
    },
  },
} as const
