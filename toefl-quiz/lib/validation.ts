// Валидация входных данных с Zod
import { z } from 'zod'

// Константы лимитов
export const QUIZ_LIMITS = {
  FREE_DAILY: 3,
  GUEST: 1,
  MIN_QUESTIONS: 5,
  MAX_QUESTIONS: 20,
} as const

// UUID regex для валидации
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

// Схема для генерации теста
export const generateQuizSchema = z.object({
  category: z.enum(['reading', 'grammar', 'vocabulary', 'listening', 'mixed'], {
    errorMap: () => ({ message: 'Invalid category' }),
  }),
  difficulty: z.enum(['easy', 'medium', 'hard'], {
    errorMap: () => ({ message: 'Invalid difficulty' }),
  }),
  questionsCount: z
    .number()
    .int('Questions count must be an integer')
    .min(QUIZ_LIMITS.MIN_QUESTIONS, `Minimum ${QUIZ_LIMITS.MIN_QUESTIONS} questions`)
    .max(QUIZ_LIMITS.MAX_QUESTIONS, `Maximum ${QUIZ_LIMITS.MAX_QUESTIONS} questions`),
  timerMode: z.enum(['none', 'soft', 'strict']).default('none'),
  quizMode: z.enum(['learning', 'exam']).default('exam'),
})

// Схема для отправки ответов
export const submitQuizSchema = z.object({
  quizId: z.string().regex(uuidRegex, 'Invalid quiz ID format'),
  answers: z.array(
    z.object({
      questionId: z.string().regex(uuidRegex, 'Invalid question ID format'),
      answer: z.string().min(1, 'Answer cannot be empty'),
    })
  ),
  timeSpent: z.number().int().min(0).max(86400), // Максимум 24 часа в секундах
})

// Валидатор структуры вопроса от AI
export const generatedQuestionSchema = z.object({
  question_type: z.enum(['multiple_choice', 'error_identification', 'sentence_completion', 'reading_comprehension']),
  passage: z.string().nullable().optional(),
  question_text: z.string().min(1),
  options: z.array(z.string()).min(4).max(4),
  correct_answer: z.enum(['A', 'B', 'C', 'D']),
  explanation: z.string().min(1),
})

export const generatedQuizResponseSchema = z.object({
  questions: z.array(generatedQuestionSchema).min(1),
})

// Типы, выведенные из схем
export type GenerateQuizInput = z.infer<typeof generateQuizSchema>
export type SubmitQuizInput = z.infer<typeof submitQuizSchema>
export type GeneratedQuestionValidated = z.infer<typeof generatedQuestionSchema>
