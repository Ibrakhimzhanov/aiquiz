// API для генерации теста через Gemini AI
import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { generateQuizQuestions, generateWithRetry } from '@/lib/ai'
import { getPromptForCategory } from '@/prompts/quiz-prompts'
import {
  generateQuizSchema,
  generatedQuizResponseSchema,
  QUIZ_LIMITS
} from '@/lib/validation'
import { checkRateLimit, getClientIP, RATE_LIMITS } from '@/lib/rate-limit'
import { logger } from '@/lib/logger'

// Генерация UUID для session token
function generateSessionToken(): string {
  return crypto.randomUUID()
}

export async function POST(request: NextRequest) {
  try {
    // Парсинг и валидация входных данных
    const body = await request.json()
    const parseResult = generateQuizSchema.safeParse(body)

    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Validation error', details: parseResult.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { category, difficulty, questionsCount, timerMode, quizMode } = parseResult.data

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    // Rate limiting для гостевых пользователей (по IP)
    if (!user) {
      const clientIP = getClientIP(request.headers)
      const rateLimitResult = checkRateLimit(
        `guest:quiz:${clientIP}`,
        RATE_LIMITS.GUEST_QUIZ
      )

      if (!rateLimitResult.success) {
        const resetIn = Math.ceil((rateLimitResult.resetTime - Date.now()) / 60000)
        return NextResponse.json(
          {
            error: `Guest quiz limit reached. Please sign up for more quizzes or try again in ${resetIn} minutes.`,
            resetIn,
          },
          {
            status: 429,
            headers: {
              'X-RateLimit-Remaining': '0',
              'X-RateLimit-Reset': rateLimitResult.resetTime.toString(),
            },
          }
        )
      }
    }

    // Атомарная проверка и резервирование лимита для зарегистрированных
    if (user) {
      const { data: canCreate, error: limitError } = await supabase.rpc(
        'check_and_reserve_quiz_limit',
        { user_uuid: user.id, daily_limit: QUIZ_LIMITS.FREE_DAILY }
      )

      if (limitError) {
        logger.error('Error checking quiz limit', limitError, { userId: user.id })
        return NextResponse.json(
          { error: 'Failed to check quiz limit' },
          { status: 500 }
        )
      }

      if (!canCreate) {
        return NextResponse.json(
          { error: 'Daily quiz limit reached. Upgrade to Pro for unlimited quizzes.' },
          { status: 429 }
        )
      }
    }

    // Генерация вопросов через Gemini AI с retry
    const { system, user: userPrompt } = getPromptForCategory(
      category,
      difficulty,
      questionsCount
    )

    const generatedQuiz = await generateWithRetry(async () => {
      const content = await generateQuizQuestions(system, userPrompt)

      // Убираем возможные markdown обертки
      let cleanContent = content.trim()
      if (cleanContent.startsWith('```json')) {
        cleanContent = cleanContent.slice(7)
      } else if (cleanContent.startsWith('```')) {
        cleanContent = cleanContent.slice(3)
      }
      if (cleanContent.endsWith('```')) {
        cleanContent = cleanContent.slice(0, -3)
      }
      cleanContent = cleanContent.trim()

      const parsed = JSON.parse(cleanContent)

      // Нормализуем correct_answer (убираем скобки типа "A)" -> "A")
      if (parsed.questions) {
        parsed.questions = parsed.questions.map((q: Record<string, unknown>) => ({
          ...q,
          correct_answer: String(q.correct_answer).replace(/[()]/g, '').trim().charAt(0).toUpperCase()
        }))
      }

      // Валидация структуры ответа от AI
      const validationResult = generatedQuizResponseSchema.safeParse(parsed)
      if (!validationResult.success) {
        console.error('AI response validation failed:', JSON.stringify(validationResult.error.flatten()))
        console.error('Received content:', cleanContent.slice(0, 500))
        throw new Error('Invalid response format from AI')
      }

      return validationResult.data
    })

    // Для гостевых тестов используем service client (обходит RLS)
    // Для зарегистрированных — обычный client с RLS
    const dbClient = user ? supabase : createServiceClient()

    // Генерируем session token для гостевых тестов
    const sessionToken = user ? null : generateSessionToken()
    // Гостевые тесты истекают через 24 часа
    const expiresAt = user ? null : new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()

    // Создаём запись теста в БД
    const { data: quiz, error: quizError } = await dbClient
      .from('quizzes')
      .insert({
        user_id: user?.id || null,
        session_token: sessionToken,
        expires_at: expiresAt,
        category,
        difficulty,
        questions_count: questionsCount,
        timer_mode: timerMode,
        quiz_mode: quizMode,
        score: 0,
        completed: false,
      })
      .select()
      .single()

    if (quizError) {
      logger.error('Error creating quiz', quizError, { category, difficulty, questionsCount })
      console.error('Quiz creation error:', JSON.stringify(quizError))
      // Откат резервирования лимита при ошибке
      if (user) {
        await supabase.rpc('rollback_quiz_reservation', { user_uuid: user.id })
      }
      return NextResponse.json(
        { error: 'Failed to create quiz', details: quizError.message || quizError.code },
        { status: 500 }
      )
    }

    // Сохраняем вопросы
    const questionsToInsert = generatedQuiz.questions.map((q, index) => ({
      quiz_id: quiz.id,
      question_type: q.question_type,
      passage: q.passage || null,
      question_text: q.question_text,
      options: q.options,
      correct_answer: q.correct_answer,
      explanation: q.explanation,
      order_index: index,
    }))

    const { error: questionsError } = await dbClient
      .from('quiz_questions')
      .insert(questionsToInsert)

    if (questionsError) {
      logger.error('Error creating questions', questionsError, { quizId: quiz.id })
      // Удаляем тест и откатываем лимит
      await dbClient.from('quizzes').delete().eq('id', quiz.id)
      if (user) {
        await supabase.rpc('rollback_quiz_reservation', { user_uuid: user.id })
      }
      return NextResponse.json(
        { error: 'Failed to create questions' },
        { status: 500 }
      )
    }

    // Обновляем streak для пользователя
    if (user) {
      await supabase.rpc('update_user_streak', { user_uuid: user.id })
    }

    // Для гостей возвращаем session token в ответе (клиент сохранит в cookie)
    const response = NextResponse.json({
      quizId: quiz.id,
      category,
      difficulty,
      questionsCount,
      timerMode,
      quizMode,
      ...(sessionToken && { sessionToken }),
    })

    // Устанавливаем session token в cookie для гостей
    if (sessionToken) {
      response.cookies.set('quiz_session', sessionToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 24 * 60 * 60, // 24 часа
        path: '/',
      })
    }

    return response
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const errorStack = error instanceof Error ? error.stack : ''
    logger.error('Error generating quiz', error)
    console.error('Generate quiz error:', errorMessage, errorStack)
    return NextResponse.json(
      { error: `Failed to generate quiz: ${errorMessage}` },
      { status: 500 }
    )
  }
}
