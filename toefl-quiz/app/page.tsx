'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import { BookOpen, Brain, Clock, Trophy } from 'lucide-react'

const categories = [
  { id: 'reading', name: 'Reading', icon: BookOpen, description: 'Comprehension & Analysis' },
  { id: 'grammar', name: 'Grammar', icon: Brain, description: 'Structure & Written Expression' },
  { id: 'vocabulary', name: 'Vocabulary', icon: BookOpen, description: 'Word Knowledge' },
  { id: 'mixed', name: 'Mixed', icon: Trophy, description: 'All Categories Combined' },
]

const difficulties = [
  { id: 'easy', name: 'Easy', color: 'bg-green-100 text-green-700' },
  { id: 'medium', name: 'Medium', color: 'bg-yellow-100 text-yellow-700' },
  { id: 'hard', name: 'Hard', color: 'bg-red-100 text-red-700' },
]

export default function HomePage() {
  const router = useRouter()
  const [category, setCategory] = useState('reading')
  const [difficulty, setDifficulty] = useState('medium')
  const [questionsCount, setQuestionsCount] = useState(10)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleStartQuiz = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/generate-quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category,
          difficulty,
          questionsCount,
          timerMode: 'none',
          quizMode: 'exam',
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate quiz')
      }

      // Сохраняем session token для гостей
      if (data.sessionToken) {
        document.cookie = `quiz_session=${data.sessionToken}; path=/; max-age=86400; samesite=lax`
      }

      router.push(`/quiz/${data.quizId}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          TOEFL Quiz Generator
        </h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          Practice for your TOEFL exam with AI-generated questions tailored to your level
        </p>
      </div>

      <div className="max-w-4xl mx-auto">
        {/* Category Selection */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Select Category</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {categories.map((cat) => {
              const Icon = cat.icon
              return (
                <Card
                  key={cat.id}
                  className={`cursor-pointer transition-all ${
                    category === cat.id
                      ? 'ring-2 ring-blue-500 bg-blue-50'
                      : 'hover:bg-gray-50'
                  }`}
                  onClick={() => setCategory(cat.id)}
                >
                  <CardContent className="p-4 text-center">
                    <Icon className={`w-8 h-8 mx-auto mb-2 ${
                      category === cat.id ? 'text-blue-600' : 'text-gray-400'
                    }`} />
                    <h3 className="font-medium text-gray-900">{cat.name}</h3>
                    <p className="text-xs text-gray-500 mt-1">{cat.description}</p>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>

        {/* Difficulty Selection */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Select Difficulty</h2>
          <div className="flex gap-4">
            {difficulties.map((diff) => (
              <button
                key={diff.id}
                onClick={() => setDifficulty(diff.id)}
                className={`px-6 py-3 rounded-lg font-medium transition-all ${
                  difficulty === diff.id
                    ? `${diff.color} ring-2 ring-offset-2 ring-blue-500`
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {diff.name}
              </button>
            ))}
          </div>
        </div>

        {/* Questions Count */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Number of Questions: {questionsCount}
          </h2>
          <input
            type="range"
            min="5"
            max="20"
            value={questionsCount}
            onChange={(e) => setQuestionsCount(Number(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
          />
          <div className="flex justify-between text-sm text-gray-500 mt-2">
            <span>5</span>
            <span>20</span>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        {/* Start Button */}
        <div className="text-center">
          <Button
            size="lg"
            onClick={handleStartQuiz}
            disabled={isLoading}
            className="px-12 py-4 text-lg"
          >
            {isLoading ? (
              <>
                <Clock className="w-5 h-5 mr-2 animate-spin" />
                Generating Quiz...
              </>
            ) : (
              <>
                <Trophy className="w-5 h-5 mr-2" />
                Start Quiz
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
