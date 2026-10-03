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
      app_settings: {
        Row: {
          key: string
          updated_at: string
          value: string | null
        }
        Insert: {
          key: string
          updated_at?: string
          value?: string | null
        }
        Update: {
          key?: string
          updated_at?: string
          value?: string | null
        }
        Relationships: []
      }
      book_earnings: {
        Row: {
          book_id: string
          created_at: string
          creator_id: string
          id: string
          paid_out_at: string | null
          payable_at: string
          payout_id: string | null
          purchase_id: string
          reversed_at: string | null
          share_paise: number
          status: string
        }
        Insert: {
          book_id: string
          created_at?: string
          creator_id: string
          id?: string
          paid_out_at?: string | null
          payable_at: string
          payout_id?: string | null
          purchase_id: string
          reversed_at?: string | null
          share_paise: number
          status?: string
        }
        Update: {
          book_id?: string
          created_at?: string
          creator_id?: string
          id?: string
          paid_out_at?: string | null
          payable_at?: string
          payout_id?: string | null
          purchase_id?: string
          reversed_at?: string | null
          share_paise?: number
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "book_earnings_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "book_earnings_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "book_earnings_payout_id_fkey"
            columns: ["payout_id"]
            isOneToOne: false
            referencedRelation: "payouts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "book_earnings_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: true
            referencedRelation: "purchases"
            referencedColumns: ["id"]
          },
        ]
      }
      book_recipes: {
        Row: {
          book_id: string
          created_at: string
          id: string
          is_free_sample: boolean
          position: number
          video_id: string
        }
        Insert: {
          book_id: string
          created_at?: string
          id?: string
          is_free_sample?: boolean
          position?: number
          video_id: string
        }
        Update: {
          book_id?: string
          created_at?: string
          id?: string
          is_free_sample?: boolean
          position?: number
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "book_recipes_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
        ]
      }
      books: {
        Row: {
          cover_url: string | null
          created_at: string
          creator_id: string
          id: string
          list_price_paise: number
          payment_link_url: string | null
          price_paise: number
          slug: string
          status: string
          title_en: string
          title_mr: string | null
          updated_at: string
        }
        Insert: {
          cover_url?: string | null
          created_at?: string
          creator_id: string
          id?: string
          list_price_paise?: number
          payment_link_url?: string | null
          price_paise?: number
          slug: string
          status?: string
          title_en: string
          title_mr?: string | null
          updated_at?: string
        }
        Update: {
          cover_url?: string | null
          created_at?: string
          creator_id?: string
          id?: string
          list_price_paise?: number
          payment_link_url?: string | null
          price_paise?: number
          slug?: string
          status?: string
          title_en?: string
          title_mr?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "books_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: true
            referencedRelation: "creators"
            referencedColumns: ["id"]
          },
        ]
      }
      cost_tracking: {
        Row: {
          actual_cost: number | null
          audio_minutes: number | null
          created_at: string | null
          estimated_cost: number | null
          id: string
          input_tokens: number | null
          operation_type: string
          output_tokens: number | null
          provider: string | null
          tokens_used: number | null
          video_id: string | null
        }
        Insert: {
          actual_cost?: number | null
          audio_minutes?: number | null
          created_at?: string | null
          estimated_cost?: number | null
          id?: string
          input_tokens?: number | null
          operation_type: string
          output_tokens?: number | null
          provider?: string | null
          tokens_used?: number | null
          video_id?: string | null
        }
        Update: {
          actual_cost?: number | null
          audio_minutes?: number | null
          created_at?: string | null
          estimated_cost?: number | null
          id?: string
          input_tokens?: number | null
          operation_type?: string
          output_tokens?: number | null
          provider?: string | null
          tokens_used?: number | null
          video_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cost_tracking_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "public_videos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cost_tracking_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      creator_earnings: {
        Row: {
          created_at: string
          creator_id: string
          creator_share: number
          id: string
          referral_id: string
          subscription_amount: number
          subscription_id: string
        }
        Insert: {
          created_at?: string
          creator_id: string
          creator_share: number
          id?: string
          referral_id: string
          subscription_amount: number
          subscription_id: string
        }
        Update: {
          created_at?: string
          creator_id?: string
          creator_share?: number
          id?: string
          referral_id?: string
          subscription_amount?: number
          subscription_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "creator_earnings_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creator_earnings_referral_id_fkey"
            columns: ["referral_id"]
            isOneToOne: false
            referencedRelation: "referrals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creator_earnings_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      creator_payout_details: {
        Row: {
          account_holder_name: string
          creator_id: string
          id: string
          updated_at: string
          upi_id: string
        }
        Insert: {
          account_holder_name: string
          creator_id: string
          id?: string
          updated_at?: string
          upi_id: string
        }
        Update: {
          account_holder_name?: string
          creator_id?: string
          id?: string
          updated_at?: string
          upi_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "creator_payout_details_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: true
            referencedRelation: "creators"
            referencedColumns: ["id"]
          },
        ]
      }
      creators: {
        Row: {
          channel_id: string
          created_at: string | null
          id: string
          name: string
          slug: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          channel_id: string
          created_at?: string | null
          id?: string
          name: string
          slug?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          channel_id?: string
          created_at?: string | null
          id?: string
          name?: string
          slug?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      daily_recipe_unlocks: {
        Row: {
          created_at: string
          id: string
          unlock_date: string
          updated_at: string
          user_id: string
          video_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          unlock_date?: string
          updated_at?: string
          user_id: string
          video_id: string
        }
        Update: {
          created_at?: string
          id?: string
          unlock_date?: string
          updated_at?: string
          user_id?: string
          video_id?: string
        }
        Relationships: []
      }
      link_visits: {
        Row: {
          book_id: string
          created_at: string
          creator_id: string
          day: string
          id: string
          visitor_hash: string
        }
        Insert: {
          book_id: string
          created_at?: string
          creator_id: string
          day?: string
          id?: string
          visitor_hash: string
        }
        Update: {
          book_id?: string
          created_at?: string
          creator_id?: string
          day?: string
          id?: string
          visitor_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: "link_visits_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "link_visits_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creators"
            referencedColumns: ["id"]
          },
        ]
      }
      pack_download_log: {
        Row: {
          book_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          book_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          book_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pack_download_log_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
        ]
      }
      payouts: {
        Row: {
          amount_paise: number
          created_at: string
          creator_id: string
          id: string
          override_reason: string | null
          paid_at: string
          paid_by: string
          reference: string
        }
        Insert: {
          amount_paise: number
          created_at?: string
          creator_id: string
          id?: string
          override_reason?: string | null
          paid_at?: string
          paid_by: string
          reference: string
        }
        Update: {
          amount_paise?: number
          created_at?: string
          creator_id?: string
          id?: string
          override_reason?: string | null
          paid_at?: string
          paid_by?: string
          reference?: string
        }
        Relationships: [
          {
            foreignKeyName: "payouts_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creators"
            referencedColumns: ["id"]
          },
        ]
      }
      processing_jobs: {
        Row: {
          batch_size: number
          completed_at: string | null
          created_at: string | null
          error_message: string | null
          failed_count: number | null
          id: string
          job_type: string
          processed_count: number | null
          started_at: string | null
          status: string
        }
        Insert: {
          batch_size: number
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          failed_count?: number | null
          id?: string
          job_type: string
          processed_count?: number | null
          started_at?: string | null
          status?: string
        }
        Update: {
          batch_size?: number
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          failed_count?: number | null
          id?: string
          job_type?: string
          processed_count?: number | null
          started_at?: string | null
          status?: string
        }
        Relationships: []
      }
      processing_queue: {
        Row: {
          attempts: number | null
          created_at: string | null
          id: string
          job_id: string | null
          last_error: string | null
          status: string
          updated_at: string | null
          video_id: string | null
        }
        Insert: {
          attempts?: number | null
          created_at?: string | null
          id?: string
          job_id?: string | null
          last_error?: string | null
          status?: string
          updated_at?: string | null
          video_id?: string | null
        }
        Update: {
          attempts?: number | null
          created_at?: string | null
          id?: string
          job_id?: string | null
          last_error?: string | null
          status?: string
          updated_at?: string | null
          video_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "processing_queue_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "processing_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "processing_queue_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "public_videos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "processing_queue_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          email: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      purchase_intents: {
        Row: {
          book_id: string
          created_at: string
          id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          book_id: string
          created_at?: string
          id?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          book_id?: string
          created_at?: string
          id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_intents_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
        ]
      }
      purchases: {
        Row: {
          amount_paise: number
          book_id: string
          created_at: string
          currency: string
          fulfilment: string
          gateway_fee_paise: number
          gateway_fee_percent: number
          granted_by: string | null
          id: string
          intent_id: string | null
          net_paise: number
          paid_at: string
          provider: string
          provider_ref: string | null
          refund_reason: string | null
          refunded_at: string | null
          status: string
          tax_paise: number
          updated_at: string
          user_id: string
        }
        Insert: {
          amount_paise: number
          book_id: string
          created_at?: string
          currency?: string
          fulfilment?: string
          gateway_fee_paise?: number
          gateway_fee_percent?: number
          granted_by?: string | null
          id?: string
          intent_id?: string | null
          net_paise?: number
          paid_at?: string
          provider?: string
          provider_ref?: string | null
          refund_reason?: string | null
          refunded_at?: string | null
          status?: string
          tax_paise?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          amount_paise?: number
          book_id?: string
          created_at?: string
          currency?: string
          fulfilment?: string
          gateway_fee_paise?: number
          gateway_fee_percent?: number
          granted_by?: string | null
          id?: string
          intent_id?: string | null
          net_paise?: number
          paid_at?: string
          provider?: string
          provider_ref?: string | null
          refund_reason?: string | null
          refunded_at?: string | null
          status?: string
          tax_paise?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchases_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchases_intent_id_fkey"
            columns: ["intent_id"]
            isOneToOne: false
            referencedRelation: "purchase_intents"
            referencedColumns: ["id"]
          },
        ]
      }
      recipe_comments: {
        Row: {
          comment: string
          created_at: string
          id: string
          recipe_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          comment: string
          created_at?: string
          id?: string
          recipe_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          comment?: string
          created_at?: string
          id?: string
          recipe_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      referrals: {
        Row: {
          created_at: string
          creator_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          creator_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          creator_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "referrals_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creators"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          amount: number
          created_at: string
          currency: string
          expires_at: string | null
          id: string
          razorpay_order_id: string | null
          razorpay_payment_id: string | null
          razorpay_signature: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          expires_at?: string | null
          id?: string
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          razorpay_signature?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          expires_at?: string | null
          id?: string
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          razorpay_signature?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_favorites: {
        Row: {
          created_at: string | null
          id: string
          recipe_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          recipe_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          recipe_id?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      videos: {
        Row: {
          confidence: number | null
          created_at: string | null
          creator_id: string | null
          description: string | null
          duration: string | null
          duration_seconds: number | null
          error_message: string | null
          extracted_recipe_json: Json | null
          id: string
          legacy_approved: boolean
          manual_reviewed: boolean | null
          published_at: string | null
          raw_transcript: string | null
          retry_count: number | null
          review_status: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          thumbnail_url: string | null
          title: string
          transcript_source: string | null
          updated_at: string | null
          video_id: string
        }
        Insert: {
          confidence?: number | null
          created_at?: string | null
          creator_id?: string | null
          description?: string | null
          duration?: string | null
          duration_seconds?: number | null
          error_message?: string | null
          extracted_recipe_json?: Json | null
          id?: string
          legacy_approved?: boolean
          manual_reviewed?: boolean | null
          published_at?: string | null
          raw_transcript?: string | null
          retry_count?: number | null
          review_status?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          thumbnail_url?: string | null
          title: string
          transcript_source?: string | null
          updated_at?: string | null
          video_id: string
        }
        Update: {
          confidence?: number | null
          created_at?: string | null
          creator_id?: string | null
          description?: string | null
          duration?: string | null
          duration_seconds?: number | null
          error_message?: string | null
          extracted_recipe_json?: Json | null
          id?: string
          legacy_approved?: boolean
          manual_reviewed?: boolean | null
          published_at?: string | null
          raw_transcript?: string | null
          retry_count?: number | null
          review_status?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          thumbnail_url?: string | null
          title?: string
          transcript_source?: string | null
          updated_at?: string | null
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "videos_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creators"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      public_videos: {
        Row: {
          created_at: string | null
          creator_id: string | null
          creator_name: string | null
          creator_slug: string | null
          description: string | null
          duration: string | null
          id: string | null
          published_at: string | null
          recipe_preview: Json | null
          thumbnail_url: string | null
          title: string | null
          updated_at: string | null
          video_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "videos_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creators"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      activate_subscription: {
        Args: { _order_id: string; _payment_id: string; _signature?: string }
        Returns: Json
      }
      admin_dismiss_intent: { Args: { _intent_id: string }; Returns: Json }
      admin_grant_book_to_email: {
        Args: {
          _amount_paise: number
          _book_id: string
          _email: string
          _provider_ref: string
        }
        Returns: Json
      }
      admin_grant_intent: {
        Args: {
          _amount_paise: number
          _intent_id: string
          _provider_ref: string
        }
        Returns: Json
      }
      admin_link_creator: {
        Args: { _creator_id: string; _email: string }
        Returns: Json
      }
      admin_list_payouts: {
        Args: never
        Returns: {
          amount_paise: number
          creator_name: string
          earnings_count: number
          id: string
          override_reason: string
          paid_at: string
          reference: string
        }[]
      }
      admin_list_purchase_intents: {
        Args: never
        Returns: {
          book_id: string
          book_title: string
          created_at: string
          email: string
          id: string
          status: string
          user_id: string
        }[]
      }
      admin_list_purchases: {
        Args: never
        Returns: {
          amount_paise: number
          book_title: string
          earning_status: string
          email: string
          fulfilment: string
          gateway_fee_paise: number
          id: string
          net_paise: number
          paid_at: string
          payable_at: string
          provider_ref: string
          refunded_at: string
          share_paise: number
          status: string
          tax_paise: number
        }[]
      }
      admin_mark_payout: {
        Args: {
          _amount_paise: number
          _creator_id: string
          _override_reason?: string
          _reference: string
        }
        Returns: Json
      }
      admin_payout_summary: {
        Args: never
        Returns: {
          account_holder_name: string
          creator_id: string
          creator_name: string
          hold_paise: number
          linked_email: string
          payable_count: number
          payable_paise: number
          upi_id: string
        }[]
      }
      admin_refund_purchase: {
        Args: { _purchase_id: string; _reason?: string }
        Returns: Json
      }
      admin_set_book_recipes: {
        Args: { _book_id: string; _items: Json }
        Returns: Json
      }
      admin_set_gateway_fee: { Args: { _percent: number }; Returns: Json }
      book_pack_status: { Args: { _slug: string }; Returns: Json }
      check_internal_key: {
        Args: { _name: string; _value: string }
        Returns: boolean
      }
      create_purchase_intent: { Args: { _book_id: string }; Returns: Json }
      creator_beta_active: { Args: never; Returns: boolean }
      gateway_fee_percent: { Args: never; Returns: number }
      get_book: { Args: { _slug: string }; Returns: Json }
      get_book_offline_pack: { Args: { _slug: string }; Returns: Json }
      get_book_recipe: {
        Args: { _slug: string; _video_id: string }
        Returns: Json
      }
      get_published_books: {
        Args: never
        Returns: {
          cover_url: string
          creator_name: string
          id: string
          list_price_paise: number
          price_paise: number
          recipe_count: number
          slug: string
          title_en: string
          title_mr: string
        }[]
      }
      get_recipe_content: { Args: { _video_id: string }; Returns: Json }
      has_book_access: {
        Args: { _book_id: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_premium: { Args: { _user_id: string }; Returns: boolean }
      log_book_visit: {
        Args: { _slug: string; _visitor: string }
        Returns: undefined
      }
      my_books: {
        Args: never
        Returns: {
          access_source: string
          cover_url: string
          creator_name: string
          id: string
          purchased_at: string
          recipe_count: number
          slug: string
          title_en: string
          title_mr: string
        }[]
      }
      my_creator_dashboard: { Args: never; Returns: Json }
      recipe_preview_json: { Args: { _j: Json }; Returns: Json }
      record_book_purchase: {
        Args: {
          _amount_paise: number
          _book_id: string
          _fulfilment?: string
          _granted_by?: string
          _intent_id?: string
          _provider_ref: string
          _user_id: string
        }
        Returns: Json
      }
      refund_book_purchase: {
        Args: { _purchase_id: string; _reason?: string }
        Returns: Json
      }
      unlock_daily_recipe: { Args: { _video_id: string }; Returns: Json }
    }
    Enums: {
      app_role: "admin" | "user" | "creator_beta"
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
      app_role: ["admin", "user", "creator_beta"],
    },
  },
} as const
