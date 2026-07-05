export type UserRole = 'student' | 'teacher' | 'admin';

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  avatar_url?: string;
  created_at: string;
  last_login?: string;
}

export interface Student {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  grade?: string;
  group_id?: string;
  created_at: string;
}

export interface Teacher {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  subject?: string;
  created_at: string;
}

export interface Subject {
  id: string;
  name: string;
  code: string;
  created_at: string;
}

export type QuestionType = 'multiple_choice' | 'true_false' | 'essay' | 'fill_blank';

export interface Question {
  id: string;
  teacher_id: string;
  subject_id: string;
  type: QuestionType;
  question_text: string;
  options?: string[];
  correct_answer: string;
  points: number;
  explanation?: string;
  difficulty: 'easy' | 'medium' | 'hard';
  created_at: string;
}

export interface Exam {
  id: string;
  teacher_id: string;
  title: string;
  description?: string;
  subject_id: string;
  duration_minutes: number;
  total_points: number;
  passing_score: number;
  start_time?: string;
  end_time?: string;
  is_published: boolean;
  allow_multiple_attempts: boolean;
  shuffle_questions: boolean;
  show_results_immediately: boolean;
  created_at: string;
}

export interface ExamQuestion {
  id: string;
  exam_id: string;
  question_id: string;
  order_index: number;
  points: number;
}

export interface ExamAttempt {
  id: string;
  exam_id: string;
  student_id: string;
  started_at: string;
  submitted_at?: string;
  score?: number;
  total_points: number;
  percentage?: number;
  status: 'in_progress' | 'submitted' | 'graded';
  time_spent_seconds?: number;
  violation_count: number;
  created_at: string;
}

export interface StudentAnswer {
  id: string;
  attempt_id: string;
  question_id: string;
  answer_text: string;
  is_correct?: boolean;
  points_earned?: number;
  created_at: string;
}

export interface Group {
  id: string;
  teacher_id: string;
  name: string;
  description?: string;
  created_at: string;
}

export interface GroupMember {
  id: string;
  group_id: string;
  student_id: string;
  created_at: string;
}

export interface ExamGroup {
  id: string;
  exam_id: string;
  group_id: string;
  created_at: string;
}

export interface SecurityLog {
  id: string;
  user_id?: string;
  attempt_id?: string;
  type: string;
  message: string;
  data?: Record<string, unknown>;
  user_agent?: string;
  ip_address?: string;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  is_read: boolean;
  type: string;
  data?: Record<string, unknown>;
  created_at: string;
}

export interface ExamWithDetails extends Exam {
  subject: Subject;
  question_count: number;
  teacher?: Teacher;
}

export interface AttemptWithDetails extends ExamAttempt {
  exam: Exam;
  student: Student;
  answers?: StudentAnswer[];
}

export interface StudentDashboardStats {
  available_exams: number;
  completed_exams: number;
  average_score: number;
  best_score: number;
  upcoming_exams: ExamWithDetails[];
  recent_results: AttemptWithDetails[];
}

export interface TeacherDashboardStats {
  total_exams: number;
  total_students: number;
  total_submissions: number;
  average_class_score: number;
  recent_submissions: AttemptWithDetails[];
  top_students: Student[];
}
