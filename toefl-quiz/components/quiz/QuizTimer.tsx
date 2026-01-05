'use client'

import { useEffect, useState } from 'react'
import { Clock, AlertTriangle } from 'lucide-react'
import { cn, formatTime } from '@/lib/utils'
import type { TimerMode } from '@/types'

interface QuizTimerProps {
  mode: TimerMode
  questionsCount: number
  onTimeUp?: () => void
  onTimeUpdate?: (seconds: number) => void
}

export function QuizTimer({ mode, questionsCount, onTimeUp, onTimeUpdate }: QuizTimerProps) {
  // Примерно 1 минута на вопрос
  const totalTime = questionsCount * 60
  const [timeLeft, setTimeLeft] = useState(totalTime)
  const [elapsedTime, setElapsedTime] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedTime(prev => {
        const newElapsed = prev + 1
        onTimeUpdate?.(newElapsed)
        return newElapsed
      })

      if (mode !== 'none') {
        setTimeLeft(prev => {
          if (prev <= 1) {
            if (mode === 'strict') {
              onTimeUp?.()
            }
            return 0
          }
          return prev - 1
        })
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [mode, onTimeUp, onTimeUpdate])

  // Без таймера - показываем только прошедшее время
  if (mode === 'none') {
    return (
      <div className="flex items-center gap-2 text-gray-600">
        <Clock className="h-5 w-5" />
        <span className="font-mono">{formatTime(elapsedTime)}</span>
      </div>
    )
  }

  // Определяем цвет в зависимости от оставшегося времени
  const percentage = (timeLeft / totalTime) * 100
  const isWarning = percentage < 25
  const isDanger = percentage < 10

  return (
    <div className={cn(
      'flex items-center gap-2 px-3 py-1.5 rounded-full',
      isDanger && 'bg-red-100 text-red-700',
      isWarning && !isDanger && 'bg-amber-100 text-amber-700',
      !isWarning && 'bg-gray-100 text-gray-700'
    )}>
      {isDanger ? (
        <AlertTriangle className="h-5 w-5 animate-pulse" />
      ) : (
        <Clock className="h-5 w-5" />
      )}
      <span className="font-mono font-medium">{formatTime(timeLeft)}</span>
      {mode === 'soft' && (
        <span className="text-xs opacity-75">(soft)</span>
      )}
    </div>
  )
}
