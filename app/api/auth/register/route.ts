import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import bcrypt from 'bcryptjs'
import { validateRegistration, sanitize } from '@/lib/validation'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const validation = validateRegistration(body)
    if (!validation.valid) return NextResponse.json({ error: 'Validation failed', details: validation.errors }, { status: 400 })

    const { name, email, password } = body
    const role = 'student'
    const sanitizedName = sanitize(name)
    const sanitizedEmail = email.toLowerCase().trim()

    // التعديل هنا: exam_users
    const { data: existingUser } = await supabase.from('exam_users').select('id').eq('email', sanitizedEmail).single()
    if (existingUser) return NextResponse.json({ error: 'Email already registered' }, { status: 409 })

    const hashedPassword = await bcrypt.hash(password, 12)

    // التعديل هنا: exam_users
    const { data: user, error } = await supabase
      .from('exam_users')
      .insert([{ name: sanitizedName, email: sanitizedEmail, password: hashedPassword, role }])
      .select('id, name, email, role')
      .single()

    if (error) return NextResponse.json({ error: 'Failed to create user' }, { status: 500 })
    return NextResponse.json({ message: 'Registration successful' }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}