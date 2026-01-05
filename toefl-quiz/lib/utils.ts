// Утилиты
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

// Объединение классов Tailwind
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Форматирование времени
export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

// Форматирование даты
export function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

// Проценты
export function calculatePercentage(score: number, total: number): number {
  if (total === 0) return 0
  return Math.round((score / total) * 100)
}

// Названия категорий на русском
export const categoryNames: Record<string, string> = {
  reading: 'Reading',
  grammar: 'Grammar',
  vocabulary: 'Vocabulary',
  listening: 'Listening',
  mixed: 'Mixed',
}

// Названия сложности
export const difficultyNames: Record<string, string> = {
  easy: 'Easy',
  medium: 'Medium',
  hard: 'Hard',
}

// Цвета для категорий
export const categoryColors: Record<string, string> = {
  reading: '#3b82f6',
  grammar: '#10b981',
  vocabulary: '#f59e0b',
  listening: '#8b5cf6',
  mixed: '#ec4899',
}

// Проверка гостевого лимита через localStorage
export function checkGuestLimit(): boolean {
  if (typeof window === 'undefined') return true

  const guestData = localStorage.getItem('guest_quiz')
  if (!guestData) return true

  try {
    const { date, count } = JSON.parse(guestData)
    const today = new Date().toDateString()

    if (date !== today) {
      // Новый день - сбрасываем
      localStorage.removeItem('guest_quiz')
      return true
    }

    return count < 1 // Лимит 1 тест для гостей
  } catch {
    return true
  }
}

// Увеличение счетчика гостевых тестов
export function incrementGuestCount(): void {
  if (typeof window === 'undefined') return

  const today = new Date().toDateString()
  const guestData = localStorage.getItem('guest_quiz')

  let count = 1
  if (guestData) {
    try {
      const data = JSON.parse(guestData)
      if (data.date === today) {
        count = data.count + 1
      }
    } catch {}
  }

  localStorage.setItem('guest_quiz', JSON.stringify({ date: today, count }))
}
