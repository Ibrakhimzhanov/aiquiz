// Типы для базы данных и приложения

export type Category = 'reading' | 'grammar' | 'vocabulary' | 'listening' | 'mixed'
export type Difficulty = 'easy' | 'medium' | 'hard'
export type TimerMode = 'none' | 'soft' | 'strict'
export type QuizMode = 'learning' | 'exam'
export type SubscriptionStatus = 'free' | 'pro'
export type QuestionType = 'multiple_choice' | 'error_identification' | 'sentence_completion' | 'reading_comprehension'

// Пользователь
export interface User {
  id: string
  email: string
  created_at: string
  subscription_status: SubscriptionStatus
  subscription_end: string | null
  daily_quizzes_count: number
  last_quiz_date: string | null
  streak_days: number
  last_activity_date: string | null
}

// Тест
export interface Quiz {
  id: string
  user_id: string | null
  category: Category
  difficulty: Difficulty
  questions_count: number
  score: number
  timer_mode: TimerMode
  quiz_mode: QuizMode
  time_spent_seconds: number
  completed: boolean
  created_at: string
}

// Вопрос теста
export interface QuizQuestion {
  id: string
  quiz_id: string
  question_type: QuestionType
  passage: string | null
  question_text: string
  options: string[]
  correct_answer: string
  user_answer: string | null
  explanation: string
  is_correct: boolean | null
  order_index: number
}

// Для API генерации теста
export interface GenerateQuizRequest {
  category: Category
  difficulty: Difficulty
  questionsCount: number
  timerMode: TimerMode
  quizMode: QuizMode
}

// Ответ от OpenAI
export interface GeneratedQuestion {
  question_type: QuestionType
  passage?: string
  question_text: string
  options: string[]
  correct_answer: string
  explanation: string
}

export interface GeneratedQuiz {
  questions: GeneratedQuestion[]
}

// Для отправки ответов
export interface SubmitQuizRequest {
  quizId: string
  answers: { questionId: string; answer: string }[]
  timeSpent: number
}

// Статистика для Dashboard
export interface UserStats {
  totalQuizzes: number
  averageScore: number
  streakDays: number
  categoryStats: {
    category: Category
    count: number
    averageScore: number
  }[]
  recentQuizzes: Quiz[]
  progressData: {
    date: string
    score: number
  }[]
}

// Для Stripe
export interface PricingPlan {
  id: string
  name: string
  price: number
  interval: 'week' | 'year'
  priceId: string
  features: string[]
}
