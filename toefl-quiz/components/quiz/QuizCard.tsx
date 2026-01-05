'use client'

import { cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/Card'
import type { QuizQuestion } from '@/types'

interface QuizCardProps {
  question: QuizQuestion
  questionNumber: number
  totalQuestions: number
  selectedAnswer: string | null
  onSelectAnswer: (answer: string) => void
  showResult?: boolean
  mode: 'learning' | 'exam'
}

export function QuizCard({
  question,
  questionNumber,
  totalQuestions,
  selectedAnswer,
  onSelectAnswer,
  showResult = false,
  mode,
}: QuizCardProps) {
  // Показывать результат сразу в режиме обучения после выбора ответа
  const shouldShowResult = showResult || (mode === 'learning' && selectedAnswer)

  return (
    <Card className="w-full max-w-3xl mx-auto animate-fadeIn">
      <CardContent className="p-6">
        {/* Номер вопроса */}
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-medium text-gray-500">
            Question {questionNumber} of {totalQuestions}
          </span>
          <span className="text-xs px-2 py-1 bg-gray-100 rounded-full text-gray-600">
            {question.question_type.replace('_', ' ')}
          </span>
        </div>

        {/* Пассаж (если есть) */}
        {question.passage && (
          <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <p className="text-sm text-gray-500 mb-2 font-medium">Read the passage:</p>
            <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
              {question.passage}
            </p>
          </div>
        )}

        {/* Вопрос */}
        <h2 className="text-lg font-medium text-gray-900 mb-6">
          {question.question_text}
        </h2>

        {/* Варианты ответов */}
        <div className="space-y-3">
          {question.options.map((option, index) => {
            const letter = option.charAt(0) // A, B, C, D
            const isSelected = selectedAnswer === letter
            const isCorrect = letter === question.correct_answer
            const isWrong = shouldShowResult && isSelected && !isCorrect

            return (
              <button
                key={index}
                onClick={() => !shouldShowResult && onSelectAnswer(letter)}
                disabled={shouldShowResult}
                aria-label={`Answer option ${letter}: ${option.substring(3)}`}
                aria-pressed={isSelected}
                aria-disabled={shouldShowResult}
                className={cn(
                  'w-full p-4 text-left rounded-lg border-2 transition-all duration-200',
                  'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500',
                  {
                    // Обычное состояние
                    'border-gray-200 hover:border-gray-300 hover:bg-gray-50':
                      !isSelected && !shouldShowResult,
                    // Выбрано (без результата)
                    'border-primary-600 bg-primary-50':
                      isSelected && !shouldShowResult,
                    // Правильный ответ (показан результат)
                    'border-green-500 bg-green-50':
                      shouldShowResult && isCorrect,
                    // Неправильный выбранный ответ
                    'border-red-500 bg-red-50': isWrong,
                    // Отключённый стиль
                    'cursor-not-allowed opacity-75': shouldShowResult && !isCorrect && !isWrong,
                  }
                )}
              >
                <span className={cn(
                  'font-medium',
                  shouldShowResult && isCorrect && 'text-green-700',
                  isWrong && 'text-red-700'
                )}>
                  {option}
                </span>
              </button>
            )
          })}
        </div>

        {/* Объяснение (в режиме обучения или после завершения) */}
        {shouldShowResult && (
          <div className={cn(
            'mt-6 p-4 rounded-lg',
            selectedAnswer === question.correct_answer
              ? 'bg-green-50 border border-green-200'
              : 'bg-amber-50 border border-amber-200'
          )}>
            <p className={cn(
              'font-medium mb-2',
              selectedAnswer === question.correct_answer
                ? 'text-green-700'
                : 'text-amber-700'
            )}>
              {selectedAnswer === question.correct_answer ? 'Correct!' : 'Incorrect'}
            </p>
            <p className="text-gray-700 text-sm">{question.explanation}</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
