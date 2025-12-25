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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      audio_feedback: {
        Row: {
          audio_overview_id: string
          created_at: string | null
          id: string
          is_liked: boolean
          updated_at: string | null
          user_id: string
        }
        Insert: {
          audio_overview_id: string
          created_at?: string | null
          id?: string
          is_liked: boolean
          updated_at?: string | null
          user_id: string
        }
        Update: {
          audio_overview_id?: string
          created_at?: string | null
          id?: string
          is_liked?: boolean
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audio_feedback_audio_overview_id_fkey"
            columns: ["audio_overview_id"]
            isOneToOne: false
            referencedRelation: "audio_overviews"
            referencedColumns: ["id"]
          },
        ]
      }
      audio_overviews: {
        Row: {
          audio_url: string | null
          completed_at: string | null
          created_at: string | null
          duration: number
          error_message: string | null
          file_size_bytes: number | null
          generation_cost_cents: number | null
          id: string
          llm_tokens: number | null
          notebook_id: string
          script: string
          status: string | null
          storage_path: string
          title: string
          tts_audio_tokens: number | null
          user_id: string
          version: number | null
          voice_config: Json | null
        }
        Insert: {
          audio_url?: string | null
          completed_at?: string | null
          created_at?: string | null
          duration?: number
          error_message?: string | null
          file_size_bytes?: number | null
          generation_cost_cents?: number | null
          id?: string
          llm_tokens?: number | null
          notebook_id: string
          script: string
          status?: string | null
          storage_path: string
          title: string
          tts_audio_tokens?: number | null
          user_id: string
          version?: number | null
          voice_config?: Json | null
        }
        Update: {
          audio_url?: string | null
          completed_at?: string | null
          created_at?: string | null
          duration?: number
          error_message?: string | null
          file_size_bytes?: number | null
          generation_cost_cents?: number | null
          id?: string
          llm_tokens?: number | null
          notebook_id?: string
          script?: string
          status?: string | null
          storage_path?: string
          title?: string
          tts_audio_tokens?: number | null
          user_id?: string
          version?: number | null
          voice_config?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "audio_overviews_notebook_id_fkey"
            columns: ["notebook_id"]
            isOneToOne: false
            referencedRelation: "notebooks"
            referencedColumns: ["id"]
          },
        ]
      }
      flashcards: {
        Row: {
          answer: string
          created_at: string | null
          id: string
          notebook_id: string
          question: string
          user_id: string
        }
        Insert: {
          answer: string
          created_at?: string | null
          id?: string
          notebook_id: string
          question: string
          user_id: string
        }
        Update: {
          answer?: string
          created_at?: string | null
          id?: string
          notebook_id?: string
          question?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "flashcards_notebook_id_fkey"
            columns: ["notebook_id"]
            isOneToOne: false
            referencedRelation: "notebooks"
            referencedColumns: ["id"]
          },
        ]
      }
      flashcard_completions: {
        Row: {
          id: string
          user_id: string
          flashcard_id: string
          created_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          flashcard_id: string
          created_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          flashcard_id?: string
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "flashcard_completions_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flashcard_completions_flashcard_id_fkey"
            columns: ["flashcard_id"]
            referencedRelation: "studio_flashcards"
            referencedColumns: ["id"]
          }
        ]
      }
      materials: {
        Row: {
          content: string | null
          created_at: string | null
          external_url: string | null
          id: string
          kind: string
          meta: Json | null
          preview_text: string | null
          processed: boolean | null
          processed_at: string | null
          storage_path: string | null
          thumbnail: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          content?: string | null
          created_at?: string | null
          external_url?: string | null
          id?: string
          kind: string
          meta?: Json | null
          preview_text?: string | null
          processed?: boolean | null
          processed_at?: string | null
          storage_path?: string | null
          thumbnail?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          content?: string | null
          created_at?: string | null
          external_url?: string | null
          id?: string
          kind?: string
          meta?: Json | null
          preview_text?: string | null
          processed?: boolean | null
          processed_at?: string | null
          storage_path?: string | null
          thumbnail?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      notebooks: {
        Row: {
          color_name: string | null
          created_at: string | null
          deleted_at: string | null
          id: string
          meta: Json | null
          status: string | null
          summary: string | null
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          color_name?: string | null
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          meta?: Json | null
          status?: string | null
          summary?: string | null
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          color_name?: string | null
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          meta?: Json | null
          status?: string | null
          summary?: string | null
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      notebook_chat_messages: {
        Row: {
          id: string
          notebook_id: string
          user_id: string
          role: string
          content: string
          sources: Json | null
          created_at: string | null
        }
        Insert: {
          id?: string
          notebook_id: string
          user_id: string
          role: string
          content: string
          sources?: Json | null
          created_at?: string | null
        }
        Update: {
          id?: string
          notebook_id?: string
          user_id?: string
          role?: string
          content?: string
          sources?: Json | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notebook_chat_messages_notebook_id_fkey"
            columns: ["notebook_id"]
            isOneToOne: false
            referencedRelation: "notebooks"
            referencedColumns: ["id"]
          },
        ]
      }
      processing_queue: {
        Row: {
          attempts: number | null
          created_at: string | null
          error_message: string | null
          id: string
          last_attempt_at: string | null
          material_id: string | null
          notebook_id: string | null
          priority: number | null
          status: string | null
          user_id: string | null
        }
        Insert: {
          attempts?: number | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          last_attempt_at?: string | null
          material_id?: string | null
          notebook_id?: string | null
          priority?: number | null
          status?: string | null
          user_id?: string | null
        }
        Update: {
          attempts?: number | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          last_attempt_at?: string | null
          material_id?: string | null
          notebook_id?: string | null
          priority?: number | null
          status?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "processing_queue_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "processing_queue_notebook_id_fkey"
            columns: ["notebook_id"]
            isOneToOne: false
            referencedRelation: "notebooks"
            referencedColumns: ["id"]
          },
        ]
      }
      studio_flashcard_sets: {
        Row: {
          created_at: string | null
          id: string
          notebook_id: string
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          notebook_id: string
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          notebook_id?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "studio_flashcard_sets_notebook_id_fkey"
            columns: ["notebook_id"]
            isOneToOne: false
            referencedRelation: "notebooks"
            referencedColumns: ["id"]
          },
        ]
      }
      studio_flashcards: {
        Row: {
          answer: string
          created_at: string | null
          explanation: string | null
          id: string
          notebook_id: string
          question: string
          set_id: string | null
          tags: string[] | null
        }
        Insert: {
          answer: string
          created_at?: string | null
          explanation?: string | null
          id?: string
          notebook_id: string
          question: string
          set_id?: string | null
          tags?: string[] | null
        }
        Update: {
          answer?: string
          created_at?: string | null
          explanation?: string | null
          id?: string
          notebook_id?: string
          question?: string
          set_id?: string | null
          tags?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "studio_flashcards_notebook_id_fkey"
            columns: ["notebook_id"]
            isOneToOne: false
            referencedRelation: "notebooks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "studio_flashcards_set_id_fkey"
            columns: ["set_id"]
            isOneToOne: false
            referencedRelation: "studio_flashcard_sets"
            referencedColumns: ["id"]
          },
        ]
      }
      studio_quiz_questions: {
        Row: {
          correct_answer: string
          created_at: string | null
          display_order: number
          explanation: string | null
          id: string
          options: Json
          question: string
          quiz_id: string
        }
        Insert: {
          correct_answer: string
          created_at?: string | null
          display_order?: number
          explanation?: string | null
          id?: string
          options: Json
          question: string
          quiz_id: string
        }
        Update: {
          correct_answer?: string
          created_at?: string | null
          display_order?: number
          explanation?: string | null
          id?: string
          options?: Json
          question?: string
          quiz_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "studio_quiz_questions_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "studio_quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      studio_quizzes: {
        Row: {
          created_at: string | null
          id: string
          notebook_id: string
          title: string
          total_questions: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          notebook_id: string
          title: string
          total_questions?: number
        }
        Update: {
          created_at?: string | null
          id?: string
          notebook_id?: string
          title?: string
          total_questions?: number
        }
        Relationships: [
          {
            foreignKeyName: "studio_quizzes_notebook_id_fkey"
            columns: ["notebook_id"]
            isOneToOne: false
            referencedRelation: "notebooks"
            referencedColumns: ["id"]
          },
        ]
      }
      study_sessions: {
        Row: {
          id: string
          user_id: string
          notebook_id: string | null
          start_at: string
          end_at: string | null
          duration_seconds: number | null
          session_type: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          notebook_id?: string | null
          start_at: string
          end_at?: string | null
          duration_seconds?: number | null
          session_type?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          notebook_id?: string | null
          start_at?: string
          end_at?: string | null
          duration_seconds?: number | null
          session_type?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "study_sessions_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_sessions_notebook_id_fkey"
            columns: ["notebook_id"]
            referencedRelation: "notebooks"
            referencedColumns: ["id"]
          }
        ]
      }
      usage_logs: {
        Row: {
          created_at: string | null
          error_message: string | null
          estimated_cost_cents: number | null
          id: string
          input_tokens: number | null
          job_type: string
          latency_ms: number | null
          model_used: string | null
          notebook_id: string | null
          output_tokens: number | null
          status: string | null
          total_tokens: number | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          error_message?: string | null
          estimated_cost_cents?: number | null
          id?: string
          input_tokens?: number | null
          job_type: string
          latency_ms?: number | null
          model_used?: string | null
          notebook_id?: string | null
          output_tokens?: number | null
          status?: string | null
          total_tokens?: number | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          error_message?: string | null
          estimated_cost_cents?: number | null
          id?: string
          input_tokens?: number | null
          job_type?: string
          latency_ms?: number | null
          model_used?: string | null
          notebook_id?: string | null
          output_tokens?: number | null
          status?: string | null
          total_tokens?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "usage_logs_notebook_id_fkey"
            columns: ["notebook_id"]
            isOneToOne: false
            referencedRelation: "notebooks"
            referencedColumns: ["id"]
          },
        ]
      }
      user_flashcard_progress: {
        Row: {
          id: string
          last_flashcard_id: string | null
          last_index: number
          notebook_id: string
          set_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          id?: string
          last_flashcard_id?: string | null
          last_index?: number
          notebook_id: string
          set_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          id?: string
          last_flashcard_id?: string | null
          last_index?: number
          notebook_id?: string
          set_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_flashcard_progress_last_flashcard_id_fkey"
            columns: ["last_flashcard_id"]
            isOneToOne: false
            referencedRelation: "studio_flashcards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_flashcard_progress_notebook_id_fkey"
            columns: ["notebook_id"]
            isOneToOne: false
            referencedRelation: "notebooks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_flashcard_progress_set_id_fkey"
            columns: ["set_id"]
            isOneToOne: false
            referencedRelation: "studio_flashcard_sets"
            referencedColumns: ["id"]
          },
        ]
      }
      user_subscriptions: {
        Row: {
          created_at: string | null
          id: string
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          tier: string
          trial_audio_jobs_used: number | null
          trial_ends_at: string | null
          trial_studio_jobs_used: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          tier?: string
          trial_audio_jobs_used?: number | null
          trial_ends_at?: string | null
          trial_studio_jobs_used?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          tier?: string
          trial_audio_jobs_used?: number | null
          trial_ends_at?: string | null
          trial_studio_jobs_used?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          id: string
          name: string | null
          first_name: string | null
          last_name: string | null
          avatar_url: string | null
          streak: number | null
          streak_restores: number | null
          last_restore_reset: string | null
          last_streak_date: string | null
          timezone: string | null
          coins: number | null
          meta: Json | null
          expo_push_token: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id: string
          name?: string | null
          first_name?: string | null
          last_name?: string | null
          avatar_url?: string | null
          streak?: number | null
          streak_restores?: number | null
          last_restore_reset?: string | null
          last_streak_date?: string | null
          timezone?: string | null
          coins?: number | null
          meta?: Json | null
          expo_push_token?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          name?: string | null
          first_name?: string | null
          last_name?: string | null
          avatar_url?: string | null
          streak?: number | null
          streak_restores?: number | null
          last_restore_reset?: string | null
          last_streak_date?: string | null
          timezone?: string | null
          coins?: number | null
          meta?: Json | null
          expo_push_token?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      increment_streak: {
        Args: {
          p_user_id: string
          p_timezone?: string
        }
        Returns: Json
      }
      restore_streak: {
        Args: {
          p_user_id: string
        }
        Returns: Json
      }
    }
    Enums: {
      processing_job_status:
      | "pending"
      | "processing"
      | "completed"
      | "failed"
      | "cancelled"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database["public"]

export type Tables<
  PublicTableNameOrOptions extends
  | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
  | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
  ? keyof (Database[PublicTableNameOrOptions["schema"]] extends { Tables: any }
    ? Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : any) &
  (Database[PublicTableNameOrOptions["schema"]] extends { Views: any }
    ? Database[PublicTableNameOrOptions["schema"]]["Views"]
    : any)
  : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]] extends { Tables: any }
    ? Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : any) &
  (Database[PublicTableNameOrOptions["schema"]] extends { Views: any }
    ? Database[PublicTableNameOrOptions["schema"]]["Views"]
    : any)[TableName] extends {
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
  ? keyof (Database[PublicTableNameOrOptions["schema"]] extends { Tables: any }
    ? Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : any)
  : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]] extends { Tables: any }
    ? Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : any)[TableName] extends {
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
  ? keyof (Database[PublicTableNameOrOptions["schema"]] extends { Tables: any }
    ? Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : any)
  : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]] extends { Tables: any }
    ? Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : any)[TableName] extends {
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
  ? keyof (Database[PublicEnumNameOrOptions["schema"]] extends { Enums: any }
    ? Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : any)
  : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicEnumNameOrOptions["schema"]] extends { Enums: any }
    ? Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : any)[EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
  ? PublicSchema["Enums"][PublicEnumNameOrOptions]
  : never
