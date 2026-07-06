import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import bcrypt from 'bcryptjs'
import { generateToken } from '@/lib/auth'
import { validateLogin } from '@/lib/validation'

export async function POST(request: Request) {
  try {
    const body = await request.json()

    // Validate input
    const validation = validateLogin(body)
    if (!validation.valid) {
      return NextResponse.json(
        { error: 'Invalid email or password format' },
        { status: 400 }
      )
    }

    const { email, password } = body
    const sanitizedEmail = email.toLowerCase().trim()

    // Don't expose whether email exists
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, password, role, name')
      .eq('email', sanitizedEmail)
      .single()

    if (error || !user) {
      // Constant-time response to prevent timing attacks
      await bcrypt.hash('dummy-password', 12)
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    const validPassword = await bcrypt.compare(password, user.password)
    if (!validPassword) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    // Use centralized token generation
    const token = generateToken(user.id, user.role)

    return NextResponse.json({
      token,
      role: user.role,
      userId: user.id,
      name: user.name
    })
  } catch (error) {
    console.error('Login server error:', error)
    return NextResponse.json(
      { error: 'Server error' },
      { status: 500 }
    )
  }
}
