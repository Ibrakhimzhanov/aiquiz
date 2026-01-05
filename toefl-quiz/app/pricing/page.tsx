'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import { Check, Zap, Crown, ArrowLeft } from 'lucide-react'

const plans = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    interval: '',
    description: 'Perfect for getting started',
    features: [
      '3 quizzes per day',
      'Basic categories',
      'Score tracking',
    ],
    limitations: [
      'Limited questions',
      'No detailed analytics',
    ],
    buttonText: 'Current Plan',
    disabled: true,
  },
  {
    id: 'weekly',
    name: 'Pro Weekly',
    price: 7.99,
    interval: '/week',
    description: 'For serious learners',
    features: [
      'Unlimited quizzes',
      'All categories',
      'Detailed analytics',
      'Progress tracking',
      'No ads',
    ],
    limitations: [],
    buttonText: 'Subscribe Weekly',
    disabled: false,
    highlight: false,
  },
  {
    id: 'yearly',
    name: 'Pro Yearly',
    price: 29.99,
    interval: '/year',
    description: 'Best value - Save 70%',
    features: [
      'Unlimited quizzes',
      'All categories',
      'Detailed analytics',
      'Progress tracking',
      'No ads',
      'Priority support',
    ],
    limitations: [],
    buttonText: 'Subscribe Yearly',
    disabled: false,
    highlight: true,
  },
]

export default function PricingPage() {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleSubscribe = async (planId: string) => {
    if (planId === 'free') return

    setLoading(planId)
    setError(null)

    try {
      const response = await fetch('/api/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create checkout session')
      }

      if (data.url) {
        window.location.href = data.url
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <Button
        variant="outline"
        onClick={() => router.push('/')}
        className="mb-8"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Quiz
      </Button>

      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Choose Your Plan
        </h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          Unlock unlimited TOEFL practice with our Pro plans
        </p>
      </div>

      {error && (
        <div className="max-w-md mx-auto mb-8 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-center">
          {error}
        </div>
      )}

      <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
        {plans.map((plan) => (
          <Card
            key={plan.id}
            className={`relative ${
              plan.highlight
                ? 'ring-2 ring-blue-500 shadow-lg scale-105'
                : ''
            }`}
          >
            {plan.highlight && (
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-blue-500 text-white px-4 py-1 rounded-full text-sm font-medium">
                Best Value
              </div>
            )}
            <CardContent className="p-6">
              <div className="text-center mb-6">
                <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                  {plan.id === 'free' ? (
                    <Zap className="w-6 h-6 text-gray-600" />
                  ) : (
                    <Crown className={`w-6 h-6 ${plan.highlight ? 'text-blue-600' : 'text-yellow-500'}`} />
                  )}
                </div>
                <h2 className="text-xl font-bold text-gray-900">{plan.name}</h2>
                <p className="text-sm text-gray-500 mt-1">{plan.description}</p>
                <div className="mt-4">
                  <span className="text-4xl font-bold text-gray-900">
                    ${plan.price}
                  </span>
                  <span className="text-gray-500">{plan.interval}</span>
                </div>
              </div>

              <ul className="space-y-3 mb-6">
                {plan.features.map((feature, idx) => (
                  <li key={idx} className="flex items-center gap-2">
                    <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                    <span className="text-gray-700">{feature}</span>
                  </li>
                ))}
              </ul>

              <Button
                className="w-full"
                variant={plan.highlight ? 'default' : 'outline'}
                disabled={plan.disabled || loading === plan.id}
                onClick={() => handleSubscribe(plan.id)}
              >
                {loading === plan.id ? 'Loading...' : plan.buttonText}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="text-center mt-12 text-gray-500">
        <p>All plans include a 7-day money-back guarantee</p>
      </div>
    </div>
  )
}
