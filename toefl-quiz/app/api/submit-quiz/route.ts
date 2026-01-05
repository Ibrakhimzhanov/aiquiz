// API для сохранения результатов теста
import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { submitQuizSchema } from '@/lib/validation'
import { logger } from '@/lib/logger'

export async function POST(request: NextRequest) {
  try {
    // Парсинг и валидация входных данных
    const body = await request.json()
    const parseResult = submitQuizSchema.safeParse(body)

    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Validation error', details: parseResult.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { quizId, answers, timeSpent } = parseResult.data

    const supabase = await createClient()
    const serviceClient = createServiceClient()
    const { data: { user } } = await supabase.auth.getUser()

    // Получаем session token из cookie для гостевых тестов
    const sessionToken = request.cookies.get('quiz_session')?.value

    // Проверяем существование теста (используем service client для доступа к гостевым тестам)
    const { data: quiz, error: quizError } = await serviceClient
      .from('quizzes')
      .select('id, user_id, session_token, completed, expires_at')
      .eq('id', quizId)
      .single()

    if (quizError || !quiz) {
      return NextResponse.json(
        { error: 'Quiz not found' },
        { status: 404 }
      )
    }

    // Проверка авторизации
    if (quiz.user_id !== null) {
      // Тест принадлежит зарегистрированному пользователю
      if (!user || quiz.user_id !== user.id) {
        return NextResponse.json(
          { error: 'Unauthorized: you can only submit answers to your own quiz' },
          { status: 403 }
        )
      }
    } else {
      // Гостевой тест - проверяем session token
      if (!sessionToken || quiz.session_token !== sessionToken) {
        return NextResponse.json(
          { error: 'Unauthorized: invalid session token for guest quiz' },
          { status: 403 }
        )
      }

      // Проверяем не истёк ли гостевой тест
      if (quiz.expires_at && new Date(quiz.expires_at) < new Date()) {
        return NextResponse.json(
          { error: 'Guest quiz has expired' },
          { status: 410 }
        )
      }
    }

    // Проверка: тест уже завершён
    if (quiz.completed) {
      return NextResponse.json(
        { error: 'Quiz already completed' },
        { status: 400 }
      )
    }

    // Выбираем клиент для операций (service client для гостей)
    const dbClient = user ? supabase : serviceClient

    // Получаем вопросы теста
    const { data: questions, error: questionsError } = await dbClient
      .from('quiz_questions')
      .select('id, correct_answer')
      .eq('quiz_id', quizId)
      .order('order_index')

    if (questionsError || !questions || questions.length === 0) {
      return NextResponse.json(
        { error: 'Quiz questions not found' },
        { status: 404 }
      )
    }

    // Подсчитываем результаты и готовим batch update
    let correctCount = 0
    const updates = questions.map(question => {
      const userAnswer = answers.find(a => a.questionId === question.id)?.answer || null
      const isCorrect = userAnswer === question.correct_answer

      if (isCorrect) {
        correctCount++
      }

      return {
        id: question.id,
        user_answer: userAnswer,
        is_correct: isCorrect,
      }
    })

    // Batch update вопросов через upsert
    const { error: updateQuestionsError } = await dbClient
      .from('quiz_questions')
      .upsert(updates, { onConflict: 'id' })

    if (updateQuestionsError) {
      logger.error('Error updating questions', updateQuestionsError, { quizId })
      return NextResponse.json(
        { error: 'Failed to save answers' },
        { status: 500 }
      )
    }

    // Обновляем тест с результатом
    const { error: updateError } = await dbClient
      .from('quizzes')
      .update({
        score: correctCount,
        time_spent_seconds: timeSpent,
        completed: true,
      })
      .eq('id', quizId)

    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to save results' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      quizId,
      score: correctCount,
      total: questions.length,
      percentage: Math.round((correctCount / questions.length) * 100),
      timeSpent,
    })
  } catch (error) {
    logger.error('Error submitting quiz', error)
    return NextResponse.json(
      { error: 'Failed to submit quiz' },
      { status: 500 }
    )
  }
}
