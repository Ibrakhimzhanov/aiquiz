// Клиент OpenAI
import OpenAI from 'openai'

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

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
