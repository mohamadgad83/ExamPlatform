import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getAuthFromRequest } from '@/lib/auth'

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const decoded = getAuthFromRequest(request)
    if (!decoded) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(params.id)) {
      return NextResponse.json({ error: 'Invalid exam ID' }, { status: 400 })
    }

    if (decoded.role === 'student') {
      // التعديل هنا: exam_submissions
      const { data: existingSubmission } = await supabase
        .from('exam_submissions')
        .select('id').eq('exam_id', params.id).eq('student_id', decoded.userId).single()
      if (existingSubmission) return NextResponse.json({ error: 'Already submitted' }, { status: 403 })
    }

    // التعديل هنا: exam_exams
    const { data: exam, error: examError } = await supabase.from('exam_exams').select('*').eq('id', params.id).single()
    if (examError || !exam) return NextResponse.json({ error: 'Exam not found' }, { status: 404 })

    let questionSelect = 'id, question_text, option_a, option_b, option_c, option_d'
    if (decoded.role === 'admin') questionSelect += ', correct_answer'

    // التعديل هنا: exam_questions
    const { data: questions } = await supabase.from('exam_questions').select(questionSelect).eq('exam_id', params.id)
    
    return NextResponse.json({ ...exam, questions })
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const decoded = getAuthFromRequest(request)
    if (!decoded || decoded.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    // التعديل هنا: exam_exams
    const { data: exam } = await supabase.from('exam_exams').select('id').eq('id', params.id).single()
    if (!exam) return NextResponse.json({ error: 'Exam not found' }, { status: 404 })

    const { error } = await supabase.from('exam_exams').delete().eq('id', params.id)
    if (error) return NextResponse.json({ error: 'Failed to delete' }, { status: 500 })

    return NextResponse.json({ message: 'Exam deleted successfully' })
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}