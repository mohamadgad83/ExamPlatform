import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getAuthFromRequest } from '@/lib/auth'
import { validateExam, sanitize } from '@/lib/validation'

export async function GET(request: Request) {
  try {
    // Use centralized auth helper
    const decoded = getAuthFromRequest(request)
    if (!decoded) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const url = new URL(request.url)
    const page = parseInt(url.searchParams.get('page') || '1')
    const limit = parseInt(url.searchParams.get('limit') || '10')
    const offset = (page - 1) * limit

    // Pagination support
    const { data: exams, error, count } = await supabase
      .from('exams')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('Fetch exams error:', error)
      return NextResponse.json({ error: 'Failed to fetch exams' }, { status: 500 })
    }

    return NextResponse.json({
      exams: exams || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    })
  } catch (error) {
    console.error('Exams GET server error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    // Use centralized auth helper with admin check
    const decoded = getAuthFromRequest(request)
    if (!decoded || decoded.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 })
    }

    const body = await request.json()

    // Validate exam data
    const validation = validateExam(body)
    if (!validation.valid) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.errors },
        { status: 400 }
      )
    }

    const { title, duration_minutes, questions } = body

    // Sanitize title
    const sanitizedTitle = sanitize(title)

    // Create exam
    const { data: exam, error: examError } = await supabase
      .from('exams')
      .insert([{
        title: sanitizedTitle,
        duration_minutes,
        created_by: decoded.userId
      }])
      .select()
      .single()

    if (examError) {
      console.error('Create exam error:', examError)
      return NextResponse.json({ error: 'Failed to create exam' }, { status: 500 })
    }

    // Sanitize question data
    const questionsWithExamId = questions.map((q: any) => ({
      exam_id: exam.id,
      question_text: sanitize(q.question_text),
      option_a: sanitize(q.option_a),
      option_b: sanitize(q.option_b),
      option_c: sanitize(q.option_c),
      option_d: sanitize(q.option_d),
      correct_answer: q.correct_answer
    }))

    const { error: questionsError } = await supabase
      .from('questions')
      .insert(questionsWithExamId)

    if (questionsError) {
      // Rollback: delete exam if questions failed
      await supabase.from('exams').delete().eq('id', exam.id)
      console.error('Create questions error:', questionsError)
      return NextResponse.json({ error: 'Failed to create questions' }, { status: 500 })
    }

    return NextResponse.json(exam, { status: 201 })
  } catch (error) {
    console.error('Exams POST server error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
