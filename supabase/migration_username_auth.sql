-- ============================================================
-- Migration: Username-based auth + security fixes
-- شغّل الملف ده في Supabase SQL Editor مرة واحدة
-- ============================================================

-- 1) عمود username: هو المعرّف الوحيد اللي المستخدم هيدخل بيه
ALTER TABLE exam_users
  ADD COLUMN IF NOT EXISTS username TEXT;

-- فورمات: حروف/أرقام/underscore بس، 3-30 حرف
ALTER TABLE exam_users
  DROP CONSTRAINT IF EXISTS exam_users_username_format;
ALTER TABLE exam_users
  ADD CONSTRAINT exam_users_username_format
  CHECK (username ~ '^[a-zA-Z0-9_]{3,30}$');

CREATE UNIQUE INDEX IF NOT EXISTS exam_users_username_unique
  ON exam_users (LOWER(username));

-- 2) بعد ما تعمل Backfill ليوزرنيمات كل المستخدمين الحاليين (يدويًا أو بسكريبت)،
--    فعّل السطر ده عشان تمنع أي صف من غير username مستقبلاً:
-- ALTER TABLE exam_users ALTER COLUMN username SET NOT NULL;

-- 3) امسح أي عمود باسورد نص صريح لو موجود فعليًا في exam_users
--    (الباسورد بقى متخزن جوه auth.users بتاع Supabase Auth، مشفّر بأمان من عندهم)
-- لو عندك عمود password أو password_hash فعلي وعايز تشيله بعد ما تتأكد إن كل
-- الحسابات اتنقلت للنظام الجديد، شغّل:
-- ALTER TABLE exam_users DROP COLUMN IF EXISTS password;
-- ALTER TABLE exam_users DROP COLUMN IF EXISTS password_hash;

-- 4) تصحيح RLS: امسح الشرط الخطير اللي كان بيسمح لأي حد (حتى مش مسجل دخول)
--    يقرأ صفوف الأدمن كلها
DROP POLICY IF EXISTS "Users can view own profile" ON exam_users;
CREATE POLICY "Users can view own profile" ON exam_users
  FOR SELECT USING (auth.uid() = id);

-- صلاحيات الأدمن الإدارية (تعديل/حذف مستخدمين تانيين) لازم تتعمل من سيرفر
-- API route بالـ service role مش من المتصفح مباشرة، فمنعنا الـ ALL policy القديمة
DROP POLICY IF EXISTS "Admins can manage all users" ON exam_users;

-- 5) امنع الـ INSERT المباشر من المتصفح على exam_users خالص
--    (التسجيل والإنشاء بقى بيمر بسيرفر API بيستخدم service role اللي بيتخطى RLS أصلاً)
DROP POLICY IF EXISTS "Allow public registration" ON exam_users;
