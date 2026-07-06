import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getAuthFromRequest } from '@/lib/auth'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const decoded = getAuthFromRequest(request)
    if (!decoded) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(params.id)) {
      return NextResponse.json({ error: 'Invalid exam ID' }, { status: 400 })
    }

    // Check if student already submitted this exam
    if (decoded.role === 'student') {
      const { data: existingSubmission } = await supabase
        .from('submissions')
        .select('id')
        .eq('exam_id', params.id)
        .eq('student_id', decoded.userId)
        .single()

      if (existingSubmission) {
        return NextResponse.json(
          { error: 'You have already submitted this exam' },
          { status: 403 }
        )
      }
    }

    const { data: exam, error: examError } = await supabase
      .from('exams')
      .select('*')
      .eq('id', params.id)
      .single()

    if (examError || !exam) {
      return NextResponse.json({ error: 'Exam not found' }, { status: 404 })
    }

    // Don't send correct answers to students!
    let questionSelect = 'id, question_text, option_a, option_b, option_c, option_d'
    if (decoded.role === 'admin') {
      questionSelect += ', correct_answer'
    }

    const { data: questions, error: questionsError } = await supabase
      .from('questions')
      .select(questionSelect)
      .eq('exam_id', params.id)

    if (questionsError) {
      console.error('Fetch questions error:', questionsError)
      return NextResponse.json({ error: 'Failed to fetch questions' }, { status: 500 })
    }

    return NextResponse.json({ ...exam, questions })
  } catch (error) {
    console.error('Exam GET server error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const decoded = getAuthFromRequest(request)
    if (!decoded || decoded.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 })
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(params.id)) {
      return NextResponse.json({ error: 'Invalid exam ID' }, { status: 400 })
    }

    // Check if exam exists first
    const { data: exam } = await supabase
      .from('exams')
      .select('id')
      .eq('id', params.id)
      .single()

    if (!exam) {
      return NextResponse.json({ error: 'Exam not found' }, { status: 404 })
    }

    const { error } = await supabase
      .from('exams')
      .delete()
      .eq('id', params.id)

    if (error) {
      console.error('Delete exam error:', error)
      return NextResponse.json({ error: 'Failed to delete exam' }, { status: 500 })
    }

    return NextResponse.json({ message: 'Exam deleted successfully' })
  } catch (error) {
    console.error('Exam DELETE server error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
