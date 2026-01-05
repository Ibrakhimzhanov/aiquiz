// Клиент Stripe
import Stripe from 'stripe'

// Ленивая инициализация Stripe клиента
let stripeInstance: Stripe | null = null

export function getStripe(): Stripe {
  if (!stripeInstance) {
    const key = process.env.STRIPE_SECRET_KEY
    if (!key) {
      throw new Error('STRIPE_SECRET_KEY is not configured')
    }
    stripeInstance = new Stripe(key)
  }
  return stripeInstance
}

// Для обратной совместимости - экспортируем как stripe
// Используется только в runtime, не при сборке
export const stripe = {
  get webhooks() { return getStripe().webhooks },
  get subscriptions() { return getStripe().subscriptions },
  get checkout() { return getStripe().checkout },
  get customers() { return getStripe().customers },
  get paymentIntents() { return getStripe().paymentIntents },
}

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
