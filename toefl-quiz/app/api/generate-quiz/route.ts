// API для генерации теста через OpenAI
import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { openai, generateWithRetry } from '@/lib/openai'
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

    const supabase = createClient()
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

    // Генерация вопросов через OpenAI с retry
    const { system, user: userPrompt } = getPromptForCategory(
      category,
      difficulty,
      questionsCount
    )

    const generatedQuiz = await generateWithRetry(async () => {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
        response_format: { type: 'json_object' },
      })

      const content = completion.choices[0]?.message?.content
      if (!content) {
        throw new Error('No content in response')
      }

      const parsed = JSON.parse(content)

      // Валидация структуры ответа от OpenAI
      const validationResult = generatedQuizResponseSchema.safeParse(parsed)
      if (!validationResult.success) {
        logger.error('OpenAI response validation failed', validationResult.error, { category, difficulty })
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
      // Откат резервирования лимита при ошибке
      if (user) {
        await supabase.rpc('rollback_quiz_reservation', { user_uuid: user.id })
      }
      return NextResponse.json(
        { error: 'Failed to create quiz' },
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
    logger.error('Error generating quiz', error)
    return NextResponse.json(
      { error: 'Failed to generate quiz. Please try again.' },
      { status: 500 }
    )
  }
}
