/**
 * Типы базы данных Supabase
 *
 * Для генерации актуальных типов выполните:
 * npx supabase gen types typescript --project-id YOUR_PROJECT_ID > types/database.ts
 *
 * Или используйте Supabase CLI:
 * supabase gen types typescript --linked > types/database.ts
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          created_at: string
          subscription_status: 'free' | 'pro'
          subscription_end: string | null
          daily_quizzes_count: number
          last_quiz_date: string | null
          streak_days: number
          last_activity_date: string | null
        }
        Insert: {
          id?: string
          email: string
          created_at?: string
          subscription_status?: 'free' | 'pro'
          subscription_end?: string | null
          daily_quizzes_count?: number
          last_quiz_date?: string | null
          streak_days?: number
          last_activity_date?: string | null
        }
        Update: {
          id?: string
          email?: string
          created_at?: string
          subscription_status?: 'free' | 'pro'
          subscription_end?: string | null
          daily_quizzes_count?: number
          last_quiz_date?: string | null
          streak_days?: number
          last_activity_date?: string | null
        }
      }
      quizzes: {
        Row: {
          id: string
          user_id: string | null
          session_token: string | null
          category: 'reading' | 'grammar' | 'vocabulary' | 'listening' | 'mixed'
          difficulty: 'easy' | 'medium' | 'hard'
          questions_count: number
          score: number
          timer_mode: 'none' | 'soft' | 'strict'
          quiz_mode: 'learning' | 'exam'
          time_spent_seconds: number
          completed: boolean
          created_at: string
          expires_at: string | null
        }
        Insert: {
          id?: string
          user_id?: string | null
          session_token?: string | null
          category: 'reading' | 'grammar' | 'vocabulary' | 'listening' | 'mixed'
          difficulty: 'easy' | 'medium' | 'hard'
          questions_count: number
          score?: number
          timer_mode?: 'none' | 'soft' | 'strict'
          quiz_mode?: 'learning' | 'exam'
          time_spent_seconds?: number
          completed?: boolean
          created_at?: string
          expires_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string | null
          session_token?: string | null
          category?: 'reading' | 'grammar' | 'vocabulary' | 'listening' | 'mixed'
          difficulty?: 'easy' | 'medium' | 'hard'
          questions_count?: number
          score?: number
          timer_mode?: 'none' | 'soft' | 'strict'
          quiz_mode?: 'learning' | 'exam'
          time_spent_seconds?: number
          completed?: boolean
          created_at?: string
          expires_at?: string | null
        }
      }
      quiz_questions: {
        Row: {
          id: string
          quiz_id: string
          question_type: string
          passage: string | null
          question_text: string
          options: Json
          correct_answer: string
          user_answer: string | null
          explanation: string
          is_correct: boolean | null
          order_index: number
        }
        Insert: {
          id?: string
          quiz_id: string
          question_type: string
          passage?: string | null
          question_text: string
          options: Json
          correct_answer: string
          user_answer?: string | null
          explanation: string
          is_correct?: boolean | null
          order_index: number
        }
        Update: {
          id?: string
          quiz_id?: string
          question_type?: string
          passage?: string | null
          question_text?: string
          options?: Json
          correct_answer?: string
          user_answer?: string | null
          explanation?: string
          is_correct?: boolean | null
          order_index?: number
        }
      }
    }
    Functions: {
      check_and_reserve_quiz_limit: {
        Args: { user_uuid: string; daily_limit?: number }
        Returns: boolean
      }
      rollback_quiz_reservation: {
        Args: { user_uuid: string }
        Returns: void
      }
      update_user_streak: {
        Args: { user_uuid: string }
        Returns: void
      }
      increment_quiz_count: {
        Args: { user_uuid: string }
        Returns: void
      }
      cleanup_expired_guest_quizzes: {
        Args: Record<string, never>
        Returns: number
      }
    }
  }
}

// Удобные алиасы
export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row']
export type InsertTables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert']
export type UpdateTables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update']

// Типы для таблиц
export type User = Tables<'users'>
export type Quiz = Tables<'quizzes'>
export type QuizQuestion = Tables<'quiz_questions'>
