'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'

interface Exam {
  id: string
  title: string
  duration_minutes: number
  created_at: string
}

interface ExamListProps {
  isAdmin: boolean
}

export default function ExamList({ isAdmin }: ExamListProps) {
  const router = useRouter()
  const [exams, setExams] = useState<Exam[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [deleting, setDeleting] = useState<string | null>(null)

  useEffect(() => {
    fetchExams()
  }, [page])

  const fetchExams = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('token')
      const res = await fetch(`/api/exams?page=${page}&limit=10`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      if (res.ok) {
        setExams(data.exams || data) // Support both old and new API format
        if (data.pagination) {
          setTotalPages(data.pagination.totalPages)
        }
      } else if (res.status === 401) {
        toast.error('Session expired. Please login again.')
        router.push('/')
      }
    } catch (error) {
      toast.error('Failed to load exams')
    } finally {
      setLoading(false)
    }
  }

  const deleteExam = async (id: string) => {
    if (!confirm('Are you sure you want to delete this exam? This will also delete all submissions.')) return

    setDeleting(id)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`/api/exams/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      })

      if (res.ok) {
        toast.success('Exam deleted successfully')
        fetchExams()
      } else {
        const data = await res.json()
        toast.error(data.error || 'Failed to delete exam')
      }
    } catch (error) {
      toast.error('Failed to delete exam')
    } finally {
      setDeleting(null)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {/* Skeleton loading */}
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-white p-6 rounded-lg shadow-md animate-pulse">
            <div className="h-5 bg-gray-200 rounded w-1/3 mb-3"></div>
            <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-1/5"></div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {exams.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-400 text-lg">📋 No exams available</p>
          {isAdmin && (
            <p className="text-gray-400 text-sm mt-2">Create your first exam to get started</p>
          )}
        </div>
      ) : (
        <>
          {exams.map(exam => (
            <div
              key={exam.id}
              className="bg-white p-6 rounded-lg shadow-md flex justify-between items-center hover:shadow-lg transition-shadow"
            >
              <div>
                <h3 className="text-lg font-semibold">{exam.title}</h3>
                <p className="text-gray-500">⏱ Duration: {exam.duration_minutes} minutes</p>
                <p className="text-gray-400 text-sm">
                  📅 Created: {new Date(exam.created_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
              </div>
              <div className="flex gap-2">
                {isAdmin ? (
                  <button
                    onClick={() => deleteExam(exam.id)}
                    disabled={deleting === exam.id}
                    className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 disabled:opacity-50 transition-colors"
                  >
                    {deleting === exam.id ? 'Deleting...' : 'Delete'}
                  </button>
                ) : (
                  <button
                    onClick={() => router.push(`/student/exam/${exam.id}`)}
                    className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors"
                  >
                    Take Exam
                  </button>
                )}
              </div>
            </div>
          ))}

          {/* Pagination controls */}
          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-6">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 bg-gray-200 rounded disabled:opacity-50 hover:bg-gray-300 transition-colors"
              >
                Previous
              </button>
              <span className="px-4 py-2 text-gray-600">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-4 py-2 bg-gray-200 rounded disabled:opacity-50 hover:bg-gray-300 transition-colors"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
