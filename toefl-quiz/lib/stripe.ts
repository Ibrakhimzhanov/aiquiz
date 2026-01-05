// Клиент Stripe
import Stripe from 'stripe'

// Проверка конфигурации
if (!process.env.STRIPE_SECRET_KEY) {
  console.warn('Warning: STRIPE_SECRET_KEY is not configured')
}

// @ts-expect-error - Stripe types vary between versions, using default API version
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '')

// Цены подписки
export const PRICING_PLANS = {
  weekly: {
    id: 'weekly',
    name: 'Pro Weekly',
    price: 7.99,
    interval: 'week' as const,
    priceId: process.env.STRIPE_WEEKLY_PRICE_ID || 'price_weekly',
    features: [
      'Unlimited quizzes',
      'All categories',
      'Detailed analytics',
      'Progress tracking',
      'No ads',
    ],
  },
  yearly: {
    id: 'yearly',
    name: 'Pro Yearly',
    price: 29.99,
    interval: 'year' as const,
    priceId: process.env.STRIPE_YEARLY_PRICE_ID || 'price_yearly',
    features: [
      'Unlimited quizzes',
      'All categories',
      'Detailed analytics',
      'Progress tracking',
      'No ads',
      'Save 70%',
    ],
  },
}
