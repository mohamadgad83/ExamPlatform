-- ============================================
-- RLS Policies for Exam Platform
-- Run this in Supabase SQL Editor
-- ============================================

ALTER TABLE exam_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_questions_bank ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_exam_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_student_classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON exam_users FOR SELECT USING (auth.uid() = id OR role = 'admin');
CREATE POLICY "Admins can manage all users" ON exam_users FOR ALL USING (auth.uid() IN (SELECT id FROM exam_users WHERE role = 'admin'));

CREATE POLICY "Teachers can view own profile" ON exam_teachers FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Admins can manage teachers" ON exam_teachers FOR ALL USING (auth.uid() IN (SELECT id FROM exam_users WHERE role = 'admin'));

CREATE POLICY "Students can view own profile" ON exam_students FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Admins can manage students" ON exam_students FOR ALL USING (auth.uid() IN (SELECT id FROM exam_users WHERE role = 'admin'));

CREATE POLICY "Anyone can view published exams" ON exam_exams FOR SELECT USING (is_published = true);
CREATE POLICY "Teachers can manage own exams" ON exam_exams FOR ALL USING (auth.uid() IN (SELECT id FROM exam_teachers) OR auth.uid() IN (SELECT id FROM exam_users WHERE role = 'admin'));

CREATE POLICY "Teachers can manage questions" ON exam_questions_bank FOR ALL USING (auth.uid() IN (SELECT id FROM exam_teachers) OR auth.uid() IN (SELECT id FROM exam_users WHERE role = 'admin'));

CREATE POLICY "Students can view own attempts" ON exam_attempts FOR SELECT USING (student_id = auth.uid());
CREATE POLICY "Teachers can view attempts for their exams" ON exam_attempts FOR SELECT USING (exam_id IN (SELECT id FROM exam_exams WHERE created_by = auth.uid()));
CREATE POLICY "Students can insert own attempts" ON exam_attempts FOR INSERT WITH CHECK (student_id = auth.uid());

CREATE POLICY "Teachers can manage own groups" ON exam_groups FOR ALL USING (teacher_id = auth.uid());
CREATE POLICY "Users can view own notifications" ON exam_notifications FOR SELECT USING (user_id = auth.uid());
