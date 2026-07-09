/**
 * Input validation utilities for the ExamPlatform
 */

export interface ValidationError {
  field: string
  message: string
}

export interface ValidationResult {
  valid: boolean
  errors: ValidationError[]
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Validate registration input
 */
export function validateRegistration(data: {
  name?: string
  email?: string
  password?: string
}): ValidationResult {
  const errors: ValidationError[] = []

  // Name validation
  if (!data.name || data.name.trim().length < 2) {
    errors.push({ field: 'name', message: 'Name must be at least 2 characters' })
  }
  if (data.name && data.name.trim().length > 100) {
    errors.push({ field: 'name', message: 'Name must be less than 100 characters' })
  }

  // Email validation
  if (!data.email || !isValidEmail(data.email)) {
    errors.push({ field: 'email', message: 'Valid email is required' })
  }

  // Password validation
  if (!data.password || data.password.length < 8) {
    errors.push({ field: 'password', message: 'Password must be at least 8 characters' })
  }
  if (data.password && !/[A-Z]/.test(data.password)) {
    errors.push({ field: 'password', message: 'Password must contain at least one uppercase letter' })
  }
  if (data.password && !/[a-z]/.test(data.password)) {
    errors.push({ field: 'password', message: 'Password must contain at least one lowercase letter' })
  }
  if (data.password && !/[0-9]/.test(data.password)) {
    errors.push({ field: 'password', message: 'Password must contain at least one number' })
  }

  return { valid: errors.length === 0, errors }
}

/**
 * Validate login input
 */
export function validateLogin(data: {
  email?: string
  password?: string
}): ValidationResult {
  const errors: ValidationError[] = []

  if (!data.email || !isValidEmail(data.email)) {
    errors.push({ field: 'email', message: 'Valid email is required' })
  }
  if (!data.password || data.password.length === 0) {
    errors.push({ field: 'password', message: 'Password is required' })
  }

  return { valid: errors.length === 0, errors }
}

/**
 * Validate exam creation input
 */
export function validateExam(data: {
  title?: string
  duration_minutes?: number
  questions?: Array<{
    question_text?: string
    option_a?: string
    option_b?: string
    option_c?: string
    option_d?: string
    correct_answer?: string
  }>
}): ValidationResult {
  const errors: ValidationError[] = []

  // Title validation
  if (!data.title || data.title.trim().length < 3) {
    errors.push({ field: 'title', message: 'Exam title must be at least 3 characters' })
  }
  if (data.title && data.title.trim().length > 200) {
    errors.push({ field: 'title', message: 'Exam title must be less than 200 characters' })
  }

  // Duration validation
  if (!data.duration_minutes || data.duration_minutes < 1 || data.duration_minutes > 480) {
    errors.push({ field: 'duration_minutes', message: 'Duration must be between 1 and 480 minutes' })
  }

  // Questions validation
  if (!data.questions || !Array.isArray(data.questions) || data.questions.length === 0) {
    errors.push({ field: 'questions', message: 'At least one question is required' })
  } else if (data.questions.length > 100) {
    errors.push({ field: 'questions', message: 'Maximum 100 questions allowed' })
  } else {
    data.questions.forEach((q, index) => {
      if (!q.question_text || q.question_text.trim().length < 5) {
        errors.push({ field: `questions[${index}].question_text`, message: `Question ${index + 1} text is too short` })
      }
      if (!q.option_a || !q.option_b || !q.option_c || !q.option_d) {
        errors.push({ field: `questions[${index}].options`, message: `Question ${index + 1} must have all 4 options` })
      }
      if (!q.correct_answer || !['A', 'B', 'C', 'D'].includes(q.correct_answer)) {
        errors.push({ field: `questions[${index}].correct_answer`, message: `Question ${index + 1} must have a valid correct answer (A/B/C/D)` })
      }
    })
  }

  return { valid: errors.length === 0, errors }
}

/**
 * Validate submission input
 */
export function validateSubmission(data: {
  exam_id?: string
  answers?: Record<string, string>
}): ValidationResult {
  const errors: ValidationError[] = []

  if (!data.exam_id) {
    errors.push({ field: 'exam_id', message: 'Exam ID is required' })
  }

  if (!data.answers || typeof data.answers !== 'object') {
    errors.push({ field: 'answers', message: 'Answers object is required' })
  } else {
    Object.entries(data.answers).forEach(([questionId, answer]) => {
      if (!['A', 'B', 'C', 'D'].includes(answer)) {
        errors.push({ field: `answers.${questionId}`, message: `Invalid answer for question ${questionId}` })
      }
    })
  }

  return { valid: errors.length === 0, errors }
}

/**
 * Sanitize string input to prevent XSS
 */
export function sanitize(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .trim()
}
