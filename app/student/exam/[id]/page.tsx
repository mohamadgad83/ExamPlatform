'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import toast from 'react-hot-toast'

interface Question {
  id: string
  question_text: string
  option_a: string
  option_b: string
  option_c: string
  option_d: string
}

interface Exam {
  id: string
  title: string
  duration_minutes: number
  questions: Question[]
}

export default function TakeExam() {
  const router = useRouter()
  const params = useParams()
  const [exam, setExam] = useState<Exam | null>(null)
  const [answers, setAnswers] = useState<{ [key: string]: string }>({})
  const [timeLeft, setTimeLeft] = useState<number>(0)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem('token')
    const role = localStorage.getItem('role')
    if (!token || role !== 'student') {
      router.push('/')
      return
    }
    fetchExam()
  }, [])

  useEffect(() => {
    if (timeLeft <= 0 || submitted) return

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer)
          handleSubmit()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [timeLeft, submitted])

  // Warn before leaving the page during exam
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!submitted && exam) {
        e.preventDefault()
        e.returnValue = 'You have an ongoing exam. Are you sure you want to leave?'
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [submitted, exam])

  const fetchExam = async () => {
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`/api/exams/${params.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      
      if (res.ok) {
        setExam(data)
        setTimeLeft(data.duration_minutes * 60)
      } else {
        toast.error(data.error || 'Failed to load exam')
        router.push('/student')
      }
    } catch (error) {
      toast.error('Failed to load exam')
      router.push('/student')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = useCallback(async () => {
    if (submitting || submitted) return
    setSubmitting(true)

    try {
      const token = localStorage.getItem('token')
      
      // Don't send student_id from client - let server use token
      const res = await fetch('/api/submissions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          exam_id: params.id,
          answers
        })
      })

      const data = await res.json()
      
      if (res.ok) {
        setSubmitted(true)
        toast.success(
          `Exam submitted! Score: ${data.score}/${data.total} (${data.percentage}%)`,
          { duration: 5000 }
        )
        setTimeout(() => router.push('/student'), 3000)
      } else {
        toast.error(data.error || 'Failed to submit exam')
        setSubmitting(false)
      }
    } catch (error) {
      toast.error('Failed to submit exam. Please try again.')
      setSubmitting(false)
    }
  }, [submitting, submitted, answers, params.id])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  // Calculate progress
  const answeredCount = Object.keys(answers).length
  const totalQuestions = exam?.questions.length || 0
  const progress = totalQuestions > 0 ? Math.round((answeredCount / totalQuestions) * 100) : 0

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-500">Loading exam...</p>
        </div>
      </div>
    )
  }

  if (!exam) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <p className="text-xl text-gray-500 mb-4">Exam not found</p>
          <button
            onClick={() => router.push('/student')}
            className="bg-blue-500 text-white px-6 py-2 rounded hover:bg-blue-600"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow-md p-4 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold">{exam.title}</h1>
            {/* Progress indicator */}
            <p className="text-sm text-gray-500">
              {answeredCount}/{totalQuestions} questions answered ({progress}%)
            </p>
          </div>
          <div className="flex items-center gap-4">
            <span className={`text-lg font-mono px-3 py-1 rounded ${
              timeLeft < 60
                ? 'text-red-500 bg-red-50 animate-pulse'
                : timeLeft < 300
                ? 'text-orange-500 bg-orange-50'
                : 'text-gray-700 bg-gray-50'
            }`}>
              ⏱ {formatTime(timeLeft)}
            </span>
            <button
              onClick={handleSubmit}
              disabled={submitting || submitted}
              className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 disabled:opacity-50 transition-colors"
            >
              {submitting ? 'Submitting...' : submitted ? 'Submitted ✓' : 'Submit Exam'}
            </button>
          </div>
        </div>
        {/* Progress bar */}
        <div className="max-w-7xl mx-auto mt-2">
          <div className="w-full bg-gray-200 rounded-full h-1.5">
            <div
              className="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto mt-8 p-4 space-y-6 pb-20">
        {exam.questions.map((question, index) => (
          <div key={question.id} className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-lg font-semibold mb-4">
              {index + 1}. {question.question_text}
            </h3>
            <div className="space-y-2">
              {['A', 'B', 'C', 'D'].map(option => (
                <label
                  key={option}
                  className={`block p-3 rounded cursor-pointer border transition-colors ${
                    answers[question.id] === option
                      ? 'border-blue-500 bg-blue-50 shadow-sm'
                      : 'border-gray-200 hover:bg-gray-50 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name={question.id}
                    value={option}
                    checked={answers[question.id] === option}
                    onChange={() => setAnswers(prev => ({ ...prev, [question.id]: option }))}
                    className="mr-2"
                    disabled={submitted}
                  />
                  <span className="font-medium">{option})</span>{' '}
                  {question[`option_${option.toLowerCase()}` as keyof Question]}
                </label>
              ))}
            </div>
          </div>
        ))}

        {/* Bottom submit button for convenience */}
        <div className="text-center pt-4">
          <button
            onClick={handleSubmit}
            disabled={submitting || submitted}
            className="bg-green-500 text-white px-8 py-3 rounded-lg hover:bg-green-600 disabled:opacity-50 transition-colors text-lg"
          >
            {submitting ? 'Submitting...' : submitted ? 'Submitted ✓' : `Submit Exam (${answeredCount}/${totalQuestions} answered)`}
          </button>
          {answeredCount < totalQuestions && !submitted && (
            <p className="text-amber-500 text-sm mt-2">
              ⚠ You have {totalQuestions - answeredCount} unanswered question(s)
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
