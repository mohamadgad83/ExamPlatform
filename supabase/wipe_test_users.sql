-- ============================================================
-- تفريغ بيانات المستخدمين التجريبية بس (طلاب/معلمين/أدمن)
-- من غير ما يتمس أي حاجة تانية (امتحانات، أسئلة، مواد، صفوف، مراحل...)
-- شغّله في Supabase SQL Editor
-- ============================================================

-- 1) امسح كل حسابات Supabase Auth (بيمسح معاها أي جلسات مفتوحة تلقائيًا)
DELETE FROM auth.users;

-- 2) امسح صفوف البروفايل المرتبطة
TRUNCATE TABLE exam_students CASCADE;
TRUNCATE TABLE exam_teachers CASCADE;
TRUNCATE TABLE exam_users CASCADE;

-- ⚠️ ملحوظة: لو الأمر TRUNCATE اشتكى من foreign key من جداول زي
-- exam_attempts أو exam_enrollments أو exam_group_members (لأنها بترجع لـ
-- exam_users/exam_students)، استخدم بدل الترانكيت:
-- DELETE FROM exam_attempts;         -- سجلات محاولات الطلاب القديمة (تجريبية)
-- DELETE FROM exam_enrollments;
-- DELETE FROM exam_group_members;
-- DELETE FROM exam_students;
-- DELETE FROM exam_teachers;
-- DELETE FROM exam_users;
-- ده مش هيمسح exam_exams / exam_questions_bank / exam_subjects / exam_classes
-- / exam_groups خالص — دول هيفضلوا زي ما هما.

-- ============================================================
-- بعد التفريغ: اعمل ديبلوي للمشروع بالكود الجديد، وبعدها روح على
-- /api/setup/create-first-admin (تفاصيل في التقرير) عشان تنشئ حساب
-- الأدمن الأول (admin / 123)، وبعد كده أنشئ باقي المعلمين/الطلاب من
-- لوحة الأدمن عادي.
-- ============================================================
