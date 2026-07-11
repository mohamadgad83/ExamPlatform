// src/config/tables.js

export const TABLES = {
  // ========== الجداول الأساسية (exam_*) ==========
  USERS: 'exam_users',
  EXAMS: 'exam_exams',
  QUESTIONS: 'exam_questions',
  SUBMISSIONS: 'exam_submissions',
  
  // ========== الأدوار ==========
  TEACHERS: 'exam_teachers',
  STUDENTS: 'exam_students',
  
  // ========== المناهج والمراحل ==========
  GRADES: 'exam_grades',
  STAGES: 'exam_stages',
  SUBJECTS: 'exam_subjects',
  CLASSES: 'exam_classes',
  
  // ========== المجموعات ==========
  GROUPS: 'exam_groups',
  GROUP_MEMBERS: 'exam_group_members',
  
  // ========== الامتحانات والمحاولات ==========
  ATTEMPTS: 'exam_attempts',
  EXAM_QUESTIONS: 'exam_exam_questions',
  
  // ========== التسجيل والدفع ==========
  ENROLLMENTS: 'exam_enrollments',
  PAYMENTS: 'exam_payments',
  COUPONS: 'exam_coupons',
  
  // ========== الإشعارات والسجلات ==========
  NOTIFICATIONS: 'exam_notifications',
  SECURITY_LOGS: 'exam_security_logs',
};

// أسماء الجداول كمصفوفة
export const TABLE_NAMES = Object.values(TABLES);
