// Клиент OpenAI
import OpenAI from 'openai'

// Ленивая инициализация OpenAI клиента
let openaiInstance: OpenAI | null = null

export function getOpenAI(): OpenAI {
  if (!openaiInstance) {
    const key = process.env.OPENAI_API_KEY
    if (!key) {
      throw new Error('OPENAI_API_KEY is not configured')
    }
    openaiInstance = new OpenAI({ apiKey: key })
  }
  return openaiInstance
}

// Для обратной совместимости
export const openai = {
  get chat() { return getOpenAI().chat },
}

// Функция для генерации теста с retry логикой
export async function generateWithRetry<T>(
  generateFn: () => Promise<T>,
  maxRetries: number = 3
): Promise<T> {
  let lastError: Error | null = null

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await generateFn()
    } catch (error) {
      lastError = error as Error
      console.error(`Attempt ${attempt} failed:`, error)

      if (attempt < maxRetries) {
        // Экспоненциальная задержка
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt))
      }
    }
  }

  throw lastError
}
