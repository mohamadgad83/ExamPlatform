import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getAuthFromRequest } from '@/lib/auth'
import { validateSubmission } from '@/lib/validation'

export async function POST(request: Request) {
  try {
    const decoded = getAuthFromRequest(request)
    if (!decoded) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (decoded.role !== 'student') return NextResponse.json({ error: 'Only students can submit' }, { status: 403 })

    const body = await request.json()
    const validation = validateSubmission(body)
    if (!validation.valid) return NextResponse.json({ error: 'Validation failed' }, { status: 400 })

    const { exam_id, answers } = body

    // التعديل هنا: exam_submissions
    const { data: existingSubmission } = await supabase
      .from('exam_submissions')
      .select('id').eq('exam_id', exam_id).eq('student_id', decoded.userId).single()
    if (existingSubmission) return NextResponse.json({ error: 'Already submitted' }, { status: 409 })

    // التعديل هنا: exam_exams
    const { data: exam } = await supabase.from('exam_exams').select('id').eq('id', exam_id).single()
    if (!exam) return NextResponse.json({ error: 'Exam not found' }, { status: 404 })

    // التعديل هنا: exam_questions
    const { data: questions } = await supabase.from('exam_questions').select('id, correct_answer').eq('exam_id', exam_id)
    if (!questions) return NextResponse.json({ error: 'Failed to fetch questions' }, { status: 500 })

    let score = 0
    questions.forEach(q => { if (answers[q.id] === q.correct_answer) score++ })

    // التعديل هنا: exam_submissions
    const { error: submissionError } = await supabase
      .from('exam_submissions')
      .insert([{ exam_id, student_id: decoded.userId, answers, score, total: questions.length }])

    if (submissionError) return NextResponse.json({ error: 'Failed to save submission' }, { status: 500 })

    return NextResponse.json({ score, total: questions.length, percentage: Math.round((score / questions.length) * 100) })
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function GET(request: Request) {
  try {
    const decoded = getAuthFromRequest(request)
    if (!decoded) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const url = new URL(request.url)
    const examId = url.searchParams.get('exam_id')
    const page = parseInt(url.searchParams.get('page') || '1')
    const limit = parseInt(url.searchParams.get('limit') || '20')
    const offset = (page - 1) * limit

    // التعديل هنا: exam_submissions و الربط بـ exam_users
    let query = supabase
      .from('exam_submissions')
      .select('*, exam_users(name, email)', { count: 'exact' })

    if (examId) query = query.eq('exam_id', examId)
    if (decoded.role !== 'admin') query = query.eq('student_id', decoded.userId)

    query = query.order('submitted_at', { ascending: false }).range(offset, offset + limit - 1)

    const { data: submissions, error, count } = await query
    if (error) return NextResponse.json({ error: 'Failed to fetch submissions' }, { status: 500 })

    return NextResponse.json({
      submissions: submissions || [],
      pagination: { page, limit, total: count || 0, totalPages: Math.ceil((count || 0) / limit) }
    })
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}