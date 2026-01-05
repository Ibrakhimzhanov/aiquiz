// AI клиент (Gemini)
import { GoogleGenerativeAI } from '@google/generative-ai'

let genAI: GoogleGenerativeAI | null = null

export function getAI(): GoogleGenerativeAI {
  if (!genAI) {
    const key = process.env.GEMINI_API_KEY
    if (!key) {
      throw new Error('GEMINI_API_KEY is not configured')
    }
    genAI = new GoogleGenerativeAI(key)
  }
  return genAI
}

// Функция для генерации с retry
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
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt))
      }
    }
  }

  throw lastError
}

// Генерация текста через Gemini
export async function generateQuizQuestions(
  systemPrompt: string,
  userPrompt: string
): Promise<string> {
  const ai = getAI()
  const model = ai.getGenerativeModel({ model: 'gemini-2.0-flash' })

  const prompt = `${systemPrompt}\n\n${userPrompt}`

  const result = await model.generateContent({
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.7,
      responseMimeType: 'application/json',
    },
  })

  const response = result.response
  const text = response.text()

  if (!text) {
    throw new Error('No content in response')
  }

  return text
}
