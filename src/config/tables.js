// src/config/tables.js

export const TABLES = {
  // ========== الجداول الأساسية ==========
  USERS: 'exam_users',
  EXAMS: 'exam_exams',
  QUESTIONS: 'exam_questions',
  SUBMISSIONS: 'exam_submissions',
  
  // ========== جداول الأدوار ==========
  TEACHERS: 'exam_teachers',
  STUDENTS: 'exam_students',
  
  // ========== جداول المناهج والمراحل ==========
  GRADES: 'exam_grades',
  STAGES: 'exam_stages',
  SUBJECTS: 'exam_subjects',
  CLASSES: 'exam_classes',
  
  // ========== جداول المجموعات ==========
  GROUPS: 'exam_groups',
  GROUP_MEMBERS: 'exam_group_members',
  GROUP_ENROLLMENTS: 'exam_group_enrollments',
  
  // ========== جداول الامتحانات والمحاولات ==========
  ATTEMPTS: 'exam_attempts',
  EXAM_QUESTIONS: 'exam_exam_questions',
  QUESTIONS_BANK: 'exam_questions_bank',
  
  // ========== جداول التسجيل والدفع ==========
  ENROLLMENTS: 'exam_enrollments',
  REQUESTS: 'exam_requests',
  PAYMENTS: 'exam_payments',
  PAYMENT_METHODS: 'exam_payment_methods',
  PAYMENT_REQUESTS: 'exam_payment_requests',
  
  // ========== جداول الكوبونات ==========
  COUPONS: 'exam_coupons',
  COUPON_USAGES: 'exam_coupon_usages',
  
  // ========== جداول المعلمين والطلاب ==========
  TEACHER_CURRICULUM: 'exam_teacher_curriculum',
  STUDENT_SUBJECTS: 'exam_student_subjects',
  TEACHER_ASSIGNMENTS: 'exam_teacher_assignments',
  STUDENT_CLASSES: 'exam_student_classes',
  
  // ========== جداول المشاركة ==========
  QUESTION_SHARE_REQUESTS: 'exam_question_share_requests',
  
  // ========== جداول الإشعارات والسجلات ==========
  NOTIFICATIONS: 'exam_notifications',
  SECURITY_LOGS: 'exam_security_logs',
  
  // ========== جداول الحقول الإضافية ==========
  REGISTER_FIELDS: 'exam_register_fields',
  CURRICULUM: 'exam_curriculum',
};

// تصدير أسماء الجداول كـ Array للتسهيل
export const TABLE_NAMES = Object.values(TABLES);

// تصدير المجموعات للتسهيل
export const TABLE_GROUPS = {
  AUTH: ['exam_users', 'exam_teachers', 'exam_students'],
  EXAMS: ['exam_exams', 'exam_questions', 'exam_submissions', 'exam_attempts'],
  ACADEMIC: ['exam_grades', 'exam_stages', 'exam_subjects', 'exam_classes'],
  GROUPS: ['exam_groups', 'exam_group_members', 'exam_group_enrollments'],
  PAYMENTS: ['exam_payments', 'exam_payment_methods', 'exam_payment_requests', 'exam_coupons'],
};
