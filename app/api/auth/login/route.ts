import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import bcrypt from 'bcryptjs'
import { generateToken } from '@/lib/auth'
import { validateLogin } from '@/lib/validation'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const validation = validateLogin(body)
    if (!validation.valid) return NextResponse.json({ error: 'Invalid format' }, { status: 400 })

    const { email, password } = body
    const sanitizedEmail = email.toLowerCase().trim()

    // التعديل هنا: استخدام exam_users
    const { data: user, error } = await supabase
      .from('exam_users')
      .select('id, email, password, role, name')
      .eq('email', sanitizedEmail)
      .single()

    if (error || !user) {
      await bcrypt.hash('dummy-password', 12)
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
    }

    const validPassword = await bcrypt.compare(password, user.password)
    if (!validPassword) return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })

    const token = generateToken(user.id, user.role)
    return NextResponse.json({ token, role: user.role, userId: user.id, name: user.name })
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}