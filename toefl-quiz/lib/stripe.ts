// Клиент Stripe (заглушка для тестирования)
import Stripe from 'stripe'

// Проверка настроен ли Stripe
export const isStripeConfigured = !!process.env.STRIPE_SECRET_KEY

// Ленивая инициализация Stripe клиента
let stripeInstance: Stripe | null = null

export function getStripe(): Stripe | null {
  if (!isStripeConfigured) {
    return null
  }
  if (!stripeInstance) {
    stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY!)
  }
  return stripeInstance
}

// Для обратной совместимости
export const stripe = {
  get webhooks() { return getStripe()?.webhooks },
  get subscriptions() { return getStripe()?.subscriptions },
  get checkout() { return getStripe()?.checkout },
  get customers() { return getStripe()?.customers },
  get paymentIntents() { return getStripe()?.paymentIntents },
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
