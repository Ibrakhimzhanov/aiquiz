/**
 * Простой logger с поддержкой уровней логирования
 * В production можно заменить на pino, winston или отправку в сервис (Sentry, LogRocket)
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogContext {
  [key: string]: unknown
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
}

// Уровень логирования из ENV (по умолчанию: info в production, debug в development)
const currentLevel: LogLevel =
  (process.env.LOG_LEVEL as LogLevel) ||
  (process.env.NODE_ENV === 'production' ? 'info' : 'debug')

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[currentLevel]
}

function formatMessage(level: LogLevel, message: string, context?: LogContext): string {
  const timestamp = new Date().toISOString()
  const contextStr = context ? ` ${JSON.stringify(context)}` : ''
  return `[${timestamp}] [${level.toUpperCase()}] ${message}${contextStr}`
}

export const logger = {
  debug(message: string, context?: LogContext): void {
    if (shouldLog('debug')) {
      console.debug(formatMessage('debug', message, context))
    }
  },

  info(message: string, context?: LogContext): void {
    if (shouldLog('info')) {
      console.info(formatMessage('info', message, context))
    }
  },

  warn(message: string, context?: LogContext): void {
    if (shouldLog('warn')) {
      console.warn(formatMessage('warn', message, context))
    }
  },

  error(message: string, error?: Error | unknown, context?: LogContext): void {
    if (shouldLog('error')) {
      const errorInfo = error instanceof Error
        ? { name: error.name, message: error.message, stack: error.stack }
        : { error }
      console.error(formatMessage('error', message, { ...context, ...errorInfo }))

      // В production здесь можно отправлять в Sentry:
      // if (process.env.NODE_ENV === 'production') {
      //   Sentry.captureException(error, { extra: context })
      // }
    }
  },

  // Специальный метод для API endpoints
  api(method: string, path: string, status: number, duration?: number, context?: LogContext): void {
    const level: LogLevel = status >= 500 ? 'error' : status >= 400 ? 'warn' : 'info'
    if (shouldLog(level)) {
      const message = `${method} ${path} ${status}${duration ? ` ${duration}ms` : ''}`
      this[level](message, context)
    }
  },
}

export default logger
