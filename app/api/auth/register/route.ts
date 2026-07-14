import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { isValidUsername, normalizeUsername, usernameToSyntheticEmail } from '@/lib/username';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, username, password } = body;

    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return NextResponse.json({ error: 'الاسم مطلوب' }, { status: 400 });
    }
    if (!username || !isValidUsername(username)) {
      return NextResponse.json(
        { error: 'اسم المستخدم لازم يكون 3-30 حرف/رقم بدون مسافات' },
        { status: 400 }
      );
    }
    if (!password || typeof password !== 'string' || password.length < 6) {
      return NextResponse.json({ error: 'كلمة المرور 6 أحرف على الأقل' }, { status: 400 });
    }

    const cleanUsername = normalizeUsername(username);
    const cleanName = name.trim();
    const role = 'student' as const;

    const { data: existing } = await supabaseAdmin
      .from('exam_users')
      .select('id')
      .ilike('username', cleanUsername)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ error: 'اسم المستخدم مستخدم بالفعل' }, { status: 409 });
    }

    const syntheticEmail = usernameToSyntheticEmail(cleanUsername);

    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: syntheticEmail,
      password,
      email_confirm: true,
      user_metadata: { username: cleanUsername, name: cleanName },
    });

    if (authError || !authUser?.user) {
      return NextResponse.json({ error: 'تعذر إنشاء الحساب' }, { status: 400 });
    }

    const { error: profileError } = await supabaseAdmin.from('exam_users').insert({
      id: authUser.user.id,
      username: cleanUsername,
      name: cleanName,
      role,
      status: 'active',
    });

    if (profileError) {
      await supabaseAdmin.auth.admin.deleteUser(authUser.user.id);
      return NextResponse.json({ error: 'فشل إنشاء الحساب' }, { status: 500 });
    }

    return NextResponse.json({ message: 'تم إنشاء الحساب بنجاح' }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'خطأ في السيرفر' }, { status: 500 });
  }
}