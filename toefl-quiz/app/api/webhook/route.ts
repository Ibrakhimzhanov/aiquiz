// Stripe Webhook для обработки событий подписки
import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createServiceClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'
import Stripe from 'stripe'

export async function POST(request: NextRequest) {
  // Проверка конфигурации webhook secret
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!webhookSecret) {
    logger.error('STRIPE_WEBHOOK_SECRET is not configured')
    return NextResponse.json(
      { error: 'Server configuration error' },
      { status: 500 }
    )
  }

  const body = await request.text()
  const signature = request.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json(
      { error: 'Missing signature' },
      { status: 400 }
    )
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (error) {
    logger.error('Webhook signature verification failed', error)
    return NextResponse.json(
      { error: 'Invalid signature' },
      { status: 400 }
    )
  }

  const supabase = createServiceClient()

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const userId = session.metadata?.userId

        if (userId) {
          // Получаем подписку для определения даты окончания
          const subscription = await stripe.subscriptions.retrieve(
            session.subscription as string
          ) as Stripe.Subscription

          await supabase
            .from('users')
            .update({
              subscription_status: 'pro',
              subscription_end: new Date(
                subscription.current_period_end * 1000
              ).toISOString(),
            })
            .eq('id', userId)
        }
        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        const userId = subscription.metadata?.userId

        if (userId) {
          const status = subscription.status === 'active' ? 'pro' : 'free'

          await supabase
            .from('users')
            .update({
              subscription_status: status,
              subscription_end: new Date(
                subscription.current_period_end * 1000
              ).toISOString(),
            })
            .eq('id', userId)
        }
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        const userId = subscription.metadata?.userId

        if (userId) {
          await supabase
            .from('users')
            .update({
              subscription_status: 'free',
              subscription_end: null,
            })
            .eq('id', userId)
        }
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        const subscriptionId = invoice.subscription as string

        if (subscriptionId) {
          const subscription = await stripe.subscriptions.retrieve(subscriptionId) as Stripe.Subscription
          const userId = subscription.metadata?.userId

          if (userId) {
            // Логируем неудачный платёж (можно добавить отправку email)
            logger.warn('Payment failed for user', { userId, subscriptionId })
          }
        }
        break
      }

      case 'invoice.payment_succeeded': {
        // Обработка успешного платежа по подписке (продление)
        const invoice = event.data.object as Stripe.Invoice
        const subscriptionId = invoice.subscription as string

        if (subscriptionId && invoice.billing_reason === 'subscription_cycle') {
          const subscription = await stripe.subscriptions.retrieve(subscriptionId) as Stripe.Subscription
          const userId = subscription.metadata?.userId

          if (userId) {
            // Обновляем дату окончания подписки при успешном продлении
            await supabase
              .from('users')
              .update({
                subscription_status: 'pro',
                subscription_end: new Date(
                  subscription.current_period_end * 1000
                ).toISOString(),
              })
              .eq('id', userId)

            logger.info('Subscription renewed', { userId })
          }
        }
        break
      }

      case 'payment_intent.succeeded': {
        // Обработка одноразовых платежей (если будут использоваться)
        const paymentIntent = event.data.object as Stripe.PaymentIntent
        const userId = paymentIntent.metadata?.userId

        if (userId) {
          logger.info('One-time payment succeeded', { userId })
          // Здесь можно добавить логику для одноразовых покупок
          // Например: разблокировка контента, бонусы и т.д.
        }
        break
      }

      default:
        // Неизвестные события логируем, но не возвращаем ошибку
        logger.debug('Unhandled event type', { eventType: event.type })
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    logger.error('Error processing webhook', error, { eventType: event.type })
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}
