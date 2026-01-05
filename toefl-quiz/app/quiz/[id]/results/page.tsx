'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import { Trophy, Target, Clock, Home, RotateCcw, CheckCircle, XCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface Question {
  id: string
  question_text: string
  correct_answer: string
  user_answer: string | null
  is_correct: boolean | null
  explanation: string
}

interface Quiz {
  id: string
  category: string
  difficulty: string
  score: number
  questions_count: number
  time_spent_seconds: number
}

export default function ResultsPage() {
  const params = useParams()
  const router = useRouter()
  const quizId = params.id as string

  const [quiz, setQuiz] = useState<Quiz | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadResults()
  }, [quizId])

  const loadResults = async () => {
    try {
      const supabase = createClient()

      const { data: quizData } = await supabase
        .from('quizzes')
        .select('*')
        .eq('id', quizId)
        .single()

      const { data: questionsData } = await supabase
        .from('quiz_questions')
        .select('*')
        .eq('quiz_id', quizId)
        .order('order_index')

      setQuiz(quizData)
      setQuestions(questionsData || [])
    } catch (err) {
      console.error('Error loading results:', err)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
      </div>
    )
  }

  if (!quiz) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600">Results not found</p>
      </div>
    )
  }

  const percentage = Math.round((quiz.score / quiz.questions_count) * 100)
  const isPassing = percentage >= 70

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-3xl mx-auto">
        {/* Score Card */}
        <Card className="mb-8">
          <CardContent className="p-8 text-center">
            <div className={`w-24 h-24 mx-auto mb-6 rounded-full flex items-center justify-center ${
              isPassing ? 'bg-green-100' : 'bg-yellow-100'
            }`}>
              <Trophy className={`w-12 h-12 ${
                isPassing ? 'text-green-600' : 'text-yellow-600'
              }`} />
            </div>

            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {isPassing ? 'Great Job!' : 'Keep Practicing!'}
            </h1>

            <p className="text-gray-600 mb-6">
              You scored {quiz.score} out of {quiz.questions_count}
            </p>

            <div className="text-6xl font-bold mb-6" style={{
              color: isPassing ? '#16a34a' : '#ca8a04'
            }}>
              {percentage}%
            </div>

            <div className="flex justify-center gap-8 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4" />
                {quiz.category}
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                {quiz.difficulty}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Question Review */}
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Review Answers</h2>
        <div className="space-y-4 mb-8">
          {questions.map((q, idx) => (
            <Card key={q.id} className={q.is_correct ? 'border-green-200' : 'border-red-200'}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    q.is_correct ? 'bg-green-100' : 'bg-red-100'
                  }`}>
                    {q.is_correct ? (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-600" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 mb-2">
                      {idx + 1}. {q.question_text}
                    </p>
                    <p className="text-sm text-gray-600">
                      Your answer: <span className={q.is_correct ? 'text-green-600' : 'text-red-600'}>
                        {q.user_answer || 'Not answered'}
                      </span>
                      {!q.is_correct && (
                        <> • Correct: <span className="text-green-600">{q.correct_answer}</span></>
                      )}
                    </p>
                    <p className="text-sm text-gray-500 mt-2">{q.explanation}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Actions */}
        <div className="flex justify-center gap-4">
          <Button variant="outline" onClick={() => router.push('/')}>
            <Home className="w-4 h-4 mr-2" />
            Home
          </Button>
          <Button onClick={() => router.push('/')}>
            <RotateCcw className="w-4 h-4 mr-2" />
            New Quiz
          </Button>
        </div>
      </div>
    </div>
  )
}
