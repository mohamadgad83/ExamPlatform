import jwt from 'jsonwebtoken'
import { NextRequest } from 'next/server'

const JWT_SECRET = process.env.JWT_SECRET

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required!')
}

interface TokenPayload {
  userId: string
  role: 'admin' | 'student'
  iat?: number
  exp?: number
}

/**
 * Verify and decode a JWT token
 */
export function verifyToken(token: string): TokenPayload | null {
  try {
    if (!JWT_SECRET) return null
    return jwt.verify(token, JWT_SECRET) as TokenPayload
  } catch {
    return null
  }
}

/**
 * Generate a JWT token for a user
 */
export function generateToken(userId: string, role: string): string {
  if (!JWT_SECRET) throw new Error('JWT_SECRET not configured')
  return jwt.sign(
    { userId, role },
    JWT_SECRET,
    { expiresIn: '8h' }
  )
}

/**
 * Extract and verify token from request headers
 */
export function getAuthFromRequest(request: Request | NextRequest): TokenPayload | null {
  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) return null
  
  const token = authHeader.replace('Bearer ', '')
  return verifyToken(token)
}

/**
 * Check if the user has admin role
 */
export function requireAdmin(decoded: TokenPayload | null): boolean {
  return decoded?.role === 'admin'
}

/**
 * Check if the user has student role
 */
export function requireStudent(decoded: TokenPayload | null): boolean {
  return decoded?.role === 'student'
}
