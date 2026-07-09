import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getAuthFromRequest } from '@/lib/auth'
import { validateExam, sanitize } from '@/lib/validation'

export async function GET(request: Request) {
  try {
    const decoded = getAuthFromRequest(request)
    if (!decoded) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const url = new URL(request.url)
    const page = parseInt(url.searchParams.get('page') || '1')
    const limit = parseInt(url.searchParams.get('limit') || '10')
    const offset = (page - 1) * limit

    // التعديل هنا: exam_exams
    const { data: exams, error, count } = await supabase
      .from('exam_exams')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) return NextResponse.json({ error: 'Failed to fetch exams' }, { status: 500 })
    return NextResponse.json({ exams: exams || [], pagination: { page, limit, total: count || 0, totalPages: Math.ceil((count || 0) / limit) } })
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const decoded = getAuthFromRequest(request)
    if (!decoded || decoded.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await request.json()
    const validation = validateExam(body)
    if (!validation.valid) return NextResponse.json({ error: 'Validation failed' }, { status: 400 })

    const { title, duration_minutes, questions } = body
    const sanitizedTitle = sanitize(title)

    // التعديل هنا: exam_exams
    const { data: exam, error: examError } = await supabase
      .from('exam_exams')
      .insert([{ title: sanitizedTitle, duration_minutes, created_by: decoded.userId }])
      .select()
      .single()

    if (examError) return NextResponse.json({ error: 'Failed to create exam' }, { status: 500 })

    const questionsWithExamId = questions.map((q: any) => ({
      exam_id: exam.id,
      question_text: sanitize(q.question_text), option_a: sanitize(q.option_a),
      option_b: sanitize(q.option_b), option_c: sanitize(q.option_c), option_d: sanitize(q.option_d),
      correct_answer: q.correct_answer
    }))

    // التعديل هنا: exam_questions و rollback لـ exam_exams
    const { error: questionsError } = await supabase.from('exam_questions').insert(questionsWithExamId)
    if (questionsError) {
      await supabase.from('exam_exams').delete().eq('id', exam.id)
      return NextResponse.json({ error: 'Failed to create questions' }, { status: 500 })
    }

    return NextResponse.json(exam, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}