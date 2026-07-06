import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import bcrypt from 'bcryptjs'
import { validateRegistration, sanitize } from '@/lib/validation'

export async function POST(request: Request) {
  try {
    const body = await request.json()

    // Validate input
    const validation = validateRegistration(body)
    if (!validation.valid) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.errors },
        { status: 400 }
      )
    }

    const { name, email, password } = body

    // Force role to 'student' - users cannot self-assign admin role!
    const role = 'student'

    // Sanitize inputs
    const sanitizedName = sanitize(name)
    const sanitizedEmail = email.toLowerCase().trim()

    // Check if user exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', sanitizedEmail)
      .single()

    if (existingUser) {
      return NextResponse.json(
        { error: 'Email already registered' },
        { status: 409 }
      )
    }

    // Hash password with higher cost factor
    const hashedPassword = await bcrypt.hash(password, 12)

    // Create user
    const { data: user, error } = await supabase
      .from('users')
      .insert([{
        name: sanitizedName,
        email: sanitizedEmail,
        password: hashedPassword,
        role
      }])
      .select('id, name, email, role')
      .single()

    if (error) {
      console.error('Registration error:', error)
      return NextResponse.json(
        { error: 'Failed to create user' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { message: 'Registration successful' },
      { status: 201 }
    )
  } catch (error) {
    console.error('Registration server error:', error)
    return NextResponse.json(
      { error: 'Server error' },
      { status: 500 }
    )
  }
}
