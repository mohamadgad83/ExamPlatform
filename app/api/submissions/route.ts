import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getAuthFromRequest } from '@/lib/auth'
import { validateSubmission } from '@/lib/validation'

export async function POST(request: Request) {
  try {
    const decoded = getAuthFromRequest(request)
    if (!decoded) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only students can submit exams
    if (decoded.role !== 'student') {
      return NextResponse.json({ error: 'Only students can submit exams' }, { status: 403 })
    }

    const body = await request.json()

    // Validate submission data
    const validation = validateSubmission(body)
    if (!validation.valid) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.errors },
        { status: 400 }
      )
    }

    const { exam_id, answers } = body

    // Check if student already submitted this exam
    const { data: existingSubmission } = await supabase
      .from('submissions')
      .select('id')
      .eq('exam_id', exam_id)
      .eq('student_id', decoded.userId)
      .single()

    if (existingSubmission) {
      return NextResponse.json(
        { error: 'You have already submitted this exam' },
        { status: 409 }
      )
    }

    // Verify exam exists
    const { data: exam } = await supabase
      .from('exams')
      .select('id')
      .eq('id', exam_id)
      .single()

    if (!exam) {
      return NextResponse.json({ error: 'Exam not found' }, { status: 404 })
    }

    // Get correct answers
    const { data: questions, error: questionsError } = await supabase
      .from('questions')
      .select('id, correct_answer')
      .eq('exam_id', exam_id)

    if (questionsError || !questions) {
      console.error('Fetch questions error:', questionsError)
      return NextResponse.json({ error: 'Failed to fetch questions' }, { status: 500 })
    }

    // Calculate score
    let score = 0
    questions.forEach(q => {
      if (answers[q.id] === q.correct_answer) {
        score++
      }
    })

    // Always use decoded.userId from token, never trust client
    const { data: submission, error: submissionError } = await supabase
      .from('submissions')
      .insert([{
        exam_id,
        student_id: decoded.userId,
        answers,
        score,
        total: questions.length
      }])
      .select()
      .single()

    if (submissionError) {
      console.error('Save submission error:', submissionError)
      return NextResponse.json({ error: 'Failed to save submission' }, { status: 500 })
    }

    return NextResponse.json({
      score,
      total: questions.length,
      percentage: Math.round((score / questions.length) * 100)
    })
  } catch (error) {
    console.error('Submission POST server error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function GET(request: Request) {
  try {
    const decoded = getAuthFromRequest(request)
    if (!decoded) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const url = new URL(request.url)
    const examId = url.searchParams.get('exam_id')
    const page = parseInt(url.searchParams.get('page') || '1')
    const limit = parseInt(url.searchParams.get('limit') || '20')
    const offset = (page - 1) * limit

    let query = supabase
      .from('submissions')
      .select('*, users(name, email)', { count: 'exact' })

    if (examId) {
      query = query.eq('exam_id', examId)
    }

    // Students can only see their own submissions
    if (decoded.role !== 'admin') {
      query = query.eq('student_id', decoded.userId)
    }

    query = query
      .order('submitted_at', { ascending: false })
      .range(offset, offset + limit - 1)

    const { data: submissions, error, count } = await query

    if (error) {
      console.error('Fetch submissions error:', error)
      return NextResponse.json({ error: 'Failed to fetch submissions' }, { status: 500 })
    }

    return NextResponse.json({
      submissions: submissions || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    })
  } catch (error) {
    console.error('Submissions GET server error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
