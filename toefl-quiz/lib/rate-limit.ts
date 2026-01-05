// Simple in-memory rate limiter для гостевых пользователей
// В production рекомендуется использовать Redis (@upstash/ratelimit)

interface RateLimitEntry {
  count: number
  resetTime: number
}

// In-memory store (сбрасывается при перезапуске сервера)
const rateLimitStore = new Map<string, RateLimitEntry>()

// Очистка устаревших записей каждые 5 минут
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetTime < now) {
      rateLimitStore.delete(key)
    }
  }
}, 5 * 60 * 1000)

export interface RateLimitConfig {
  // Максимальное количество запросов
  limit: number
  // Окно в миллисекундах
  windowMs: number
}

export interface RateLimitResult {
  success: boolean
  remaining: number
  resetTime: number
}

/**
 * Проверяет rate limit для указанного идентификатора
 * @param identifier - IP адрес или другой уникальный идентификатор
 * @param config - конфигурация rate limit
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): RateLimitResult {
  const now = Date.now()
  const entry = rateLimitStore.get(identifier)

  // Новый пользователь или окно истекло
  if (!entry || entry.resetTime < now) {
    const resetTime = now + config.windowMs
    rateLimitStore.set(identifier, { count: 1, resetTime })
    return {
      success: true,
      remaining: config.limit - 1,
      resetTime,
    }
  }

  // Проверяем лимит
  if (entry.count >= config.limit) {
    return {
      success: false,
      remaining: 0,
      resetTime: entry.resetTime,
    }
  }

  // Увеличиваем счетчик
  entry.count++
  rateLimitStore.set(identifier, entry)

  return {
    success: true,
    remaining: config.limit - entry.count,
    resetTime: entry.resetTime,
  }
}

// Предустановленные конфигурации
export const RATE_LIMITS = {
  // Гостевые тесты: 1 тест в час
  GUEST_QUIZ: {
    limit: 1,
    windowMs: 60 * 60 * 1000, // 1 час
  },
  // API генерации: 10 запросов в минуту
  GENERATE_API: {
    limit: 10,
    windowMs: 60 * 1000, // 1 минута
  },
} as const

/**
 * Извлекает IP адрес из заголовков запроса
 */
export function getClientIP(headers: Headers): string {
  // Порядок приоритета заголовков
  const forwardedFor = headers.get('x-forwarded-for')
  if (forwardedFor) {
    // Берём первый IP (оригинальный клиент)
    return forwardedFor.split(',')[0].trim()
  }

  const realIP = headers.get('x-real-ip')
  if (realIP) {
    return realIP
  }

  // Fallback для локальной разработки
  return 'unknown'
}
