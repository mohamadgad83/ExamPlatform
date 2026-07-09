'use client'

import { useState } from 'react'
import toast from 'react-hot-toast'

export default function RegisterForm() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [passwordErrors, setPasswordErrors] = useState<string[]>([])

  // Client-side password validation feedback
  const validatePassword = (pass: string) => {
    const errors: string[] = []
    if (pass.length < 8) errors.push('At least 8 characters')
    if (!/[A-Z]/.test(pass)) errors.push('At least one uppercase letter')
    if (!/[a-z]/.test(pass)) errors.push('At least one lowercase letter')
    if (!/[0-9]/.test(pass)) errors.push('At least one number')
    setPasswordErrors(errors)
    return errors.length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validatePassword(password)) {
      toast.error('Please fix password requirements')
      return
    }

    setLoading(true)

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // No role field sent - server forces 'student'
        body: JSON.stringify({ name, email, password })
      })

      const data = await res.json()

      if (res.ok) {
        toast.success('Registration successful! Please login.')
        setName('')
        setEmail('')
        setPassword('')
        setPasswordErrors([])
      } else if (data.details) {
        // Show validation errors from server
        data.details.forEach((err: { message: string }) => {
          toast.error(err.message)
        })
      } else {
        toast.error(data.error || 'Registration failed')
      }
    } catch (error) {
      toast.error('Registration failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          required
          minLength={2}
          maxLength={100}
          placeholder="Enter your full name"
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          required
          placeholder="Enter your email"
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value)
            validatePassword(e.target.value)
          }}
          className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          minLength={8}
          required
          placeholder="Create a strong password"
        />
        {/* Password strength indicator */}
        {password && passwordErrors.length > 0 && (
          <div className="mt-2 space-y-1">
            {passwordErrors.map((err, i) => (
              <p key={i} className="text-xs text-red-500 flex items-center gap-1">
                <span>✗</span> {err}
              </p>
            ))}
          </div>
        )}
        {password && passwordErrors.length === 0 && (
          <p className="mt-2 text-xs text-green-500 flex items-center gap-1">
            <span>✓</span> Password meets all requirements
          </p>
        )}
      </div>
      {/* Removed role selection - all users register as students */}
      <p className="text-xs text-gray-500">
        You will be registered as a student. Contact an administrator for admin access.
      </p>
      <button
        type="submit"
        disabled={loading || (password.length > 0 && passwordErrors.length > 0)}
        className="w-full bg-green-500 text-white py-2 rounded hover:bg-green-600 disabled:opacity-50 transition-colors"
      >
        {loading ? 'Registering...' : 'Register'}
      </button>
    </form>
  )
}
