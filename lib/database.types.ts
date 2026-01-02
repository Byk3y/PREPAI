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
      flashcard_completions: {
        Row: {
          completed_at: string | null
          created_at: string | null
          flashcard_id: string
          id: string
          is_correct: boolean
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          flashcard_id: string
          id?: string
          is_correct: boolean
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          flashcard_id?: string
          id?: string
          is_correct?: boolean
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "flashcard_completions_flashcard_id_fkey"
            columns: ["flashcard_id"]
            isOneToOne: false
            referencedRelation: "flashcards"
            referencedColumns: ["id"]
          },
        ]
      }
      flashcards: {
        Row: {
          answer: string
          created_at: string | null
          id: string
          material_id: string | null
          notebook_id: string
          question: string
        }
        Insert: {
          answer: string
          created_at?: string | null
          id?: string
          material_id?: string | null
          notebook_id: string
          question: string
        }
        Update: {
          answer?: string
          created_at?: string | null
          id?: string
          material_id?: string | null
          notebook_id?: string
          question?: string
        }
        Relationships: [
          {
            foreignKeyName: "flashcards_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flashcards_notebook_id_fkey"
            columns: ["notebook_id"]
            isOneToOne: false
            referencedRelation: "notebooks"
            referencedColumns: ["id"]
          },
        ]
      }
      materials: {
        Row: {
          content: string | null
          created_at: string | null
          external_url: string | null
          id: string
          kind: string
          metadata: Json | null
          notebook_id: string | null
          preview_text: string | null
          storage_path: string | null
          thumbnail: string | null
          title: string
          user_id: string
        }
        Insert: {
          content?: string | null
          created_at?: string | null
          external_url?: string | null
          id?: string
          kind: string
          metadata?: Json | null
          notebook_id?: string | null
          preview_text?: string | null
          storage_path?: string | null
          thumbnail?: string | null
          title: string
          user_id: string
        }
        Update: {
          content?: string | null
          created_at?: string | null
          external_url?: string | null
          id?: string
          kind?: string
          metadata?: Json | null
          notebook_id?: string | null
          preview_text?: string | null
          storage_path?: string | null
          thumbnail?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "materials_notebook_id_fkey"
            columns: ["notebook_id"]
            isOneToOne: false
            referencedRelation: "notebooks"
            referencedColumns: ["id"]
          },
        ]
      }
      notebook_chat_messages: {
        Row: {
          content: string
          created_at: string | null
          id: string
          notebook_id: string
          role: string
          sources: Json | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          notebook_id: string
          role: string
          sources?: Json | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          notebook_id?: string
          role?: string
          sources?: Json | null
          user_id?: string
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
      notebook_shares: {
        Row: {
          access_level: string
          created_at: string | null
          email: string
          id: string
          notebook_id: string
        }
        Insert: {
          access_level: string
          created_at?: string | null
          email: string
          id?: string
          notebook_id: string
        }
        Update: {
          access_level?: string
          created_at?: string | null
          email?: string
          id?: string
          notebook_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notebook_shares_notebook_id_fkey"
            columns: ["notebook_id"]
            isOneToOne: false
            referencedRelation: "notebooks"
            referencedColumns: ["id"]
          },
        ]
      }
      notebooks: {
        Row: {
          color: string | null
          created_at: string | null
          emoji: string | null
          flashcard_count: number | null
          id: string
          last_studied: string | null
          meta: Json | null
          progress: number | null
          status: string | null
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          emoji?: string | null
          flashcard_count?: number | null
          id?: string
          last_studied?: string | null
          meta?: Json | null
          progress?: number | null
          status?: string | null
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string | null
          emoji?: string | null
          flashcard_count?: number | null
          id?: string
          last_studied?: string | null
          meta?: Json | null
          progress?: number | null
          status?: string | null
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      pet_states: {
        Row: {
          created_at: string | null
          id: string
          last_interacted_at: string | null
          name: string
          status: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          last_interacted_at?: string | null
          name: string
          status?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          last_interacted_at?: string | null
          name?: string
          status?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      pet_task_completions: {
        Row: {
          completed_at: string | null
          created_at: string | null
          id: string
          task_id: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          id?: string
          task_id: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          id?: string
          task_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pet_task_completions_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "pet_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      pet_tasks: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          title: string
          type: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          title: string
          type: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          title?: string
          type?: string
        }
        Relationships: []
      }
      processing_jobs: {
        Row: {
          created_at: string | null
          error: string | null
          id: string
          material_id: string | null
          notebook_id: string | null
          payload: Json | null
          status: string
          type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          error?: string | null
          id?: string
          material_id?: string | null
          notebook_id?: string | null
          payload?: Json | null
          status?: string
          type: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          error?: string | null
          id?: string
          material_id?: string | null
          notebook_id?: string | null
          payload?: Json | null
          status?: string
          type?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "processing_jobs_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "processing_jobs_notebook_id_fkey"
            columns: ["notebook_id"]
            isOneToOne: false
            referencedRelation: "notebooks"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          coins: number | null
          created_at: string | null
          expo_push_token: string | null
          first_name: string | null
          id: string
          last_name: string | null
          last_streak_date: string | null
          meta: Json | null
          name: string | null
          streak: number | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          coins?: number | null
          created_at?: string | null
          expo_push_token?: string | null
          first_name?: string | null
          id: string
          last_name?: string | null
          last_streak_date?: string | null
          meta?: Json | null
          name?: string | null
          streak?: number | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          coins?: number | null
          created_at?: string | null
          expo_push_token?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          last_streak_date?: string | null
          meta?: Json | null
          name?: string | null
          streak?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      quiz_completions: {
        Row: {
          completed_at: string | null
          created_at: string | null
          id: string
          quiz_id: string
          score: number
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          id?: string
          quiz_id: string
          score: number
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          id?: string
          quiz_id?: string
          score?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_completions_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "studio_quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_question_answers: {
        Row: {
          completed_at: string | null
          created_at: string | null
          id: string
          question_id: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          id?: string
          question_id: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          id?: string
          question_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_question_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "studio_quiz_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      studio_flashcard_sets: {
        Row: {
          created_at: string | null
          id: string
          notebook_id: string
          status: string
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          notebook_id: string
          status?: string
          title: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          notebook_id?: string
          status?: string
          title?: string
          user_id?: string
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
          id: string
          question: string
          set_id: string
        }
        Insert: {
          answer: string
          created_at?: string | null
          id?: string
          question: string
          set_id: string
        }
        Update: {
          answer?: string
          created_at?: string | null
          id?: string
          question?: string
          set_id?: string
        }
        Relationships: [
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
          explanation: string | null
          id: string
          options: Json
          question: string
          quiz_id: string
        }
        Insert: {
          correct_answer: string
          created_at?: string | null
          explanation?: string | null
          id?: string
          options: Json
          question: string
          quiz_id: string
        }
        Update: {
          correct_answer?: string
          created_at?: string | null
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
          status: string
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          notebook_id: string
          status?: string
          title: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          notebook_id?: string
          status?: string
          title?: string
          user_id?: string
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
      user_subscriptions: {
        Row: {
          created_at: string | null
          id: string
          is_expired: boolean
          status: string
          tier: string
          trial_ends_at: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_expired?: boolean
          status: string
          tier: string
          trial_ends_at?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_expired?: boolean
          status?: string
          tier?: string
          trial_ends_at?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      processing_job_status: "pending" | "processing" | "completed" | "failed" | "cancelled"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
