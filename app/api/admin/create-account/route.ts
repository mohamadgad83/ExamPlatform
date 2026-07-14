import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { isValidUsername, normalizeUsername, usernameToSyntheticEmail } from '@/lib/username';

// ✅ استخدام Service Role Key من Environment Variables
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    const callerToken = authHeader?.replace('Bearer ', '');
    
    if (!callerToken) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }

    const { data: callerAuth } = await supabaseAdmin.auth.getUser(callerToken);
    if (!callerAuth?.user) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }

    const { data: callerProfile } = await supabaseAdmin
      .from('exam_users')
      .select('role')
      .eq('id', callerAuth.user.id)
      .maybeSingle();

    const callerRole = callerProfile?.role;
    if (callerRole !== 'admin' && callerRole !== 'teacher') {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 403 });
    }

    const body = await request.json();
    const { name, username, password, phone } = body;
    let { role } = body;

    // المعلم يقدر ينشئ طلاب بس
    if (callerRole === 'teacher') {
      role = 'student';
    }

    // التحقق من البيانات
    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return NextResponse.json({ error: 'الاسم مطلوب' }, { status: 400 });
    }
    if (!username || !isValidUsername(username)) {
      return NextResponse.json({ error: 'اسم مستخدم غير صالح' }, { status: 400 });
    }
    if (!password || password.length < 6) {
      return NextResponse.json({ error: 'كلمة المرور 6 أحرف على الأقل' }, { status: 400 });
    }
    if (!['teacher', 'admin', 'student'].includes(role)) {
      return NextResponse.json({ error: 'دور غير صالح' }, { status: 400 });
    }

    const cleanUsername = normalizeUsername(username);
    const syntheticEmail = usernameToSyntheticEmail(cleanUsername);

    // التحقق من عدم تكرار اسم المستخدم
    const { data: existing } = await supabaseAdmin
      .from('exam_users')
      .select('id')
      .ilike('username', cleanUsername)
      .maybeSingle();
      
    if (existing) {
      return NextResponse.json({ error: 'اسم المستخدم مستخدم بالفعل' }, { status: 409 });
    }

    // إنشاء حساب في Supabase Auth
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: syntheticEmail,
      password,
      email_confirm: true,
      user_metadata: { username: cleanUsername, name: name.trim() },
    });
    
    if (authError || !authUser?.user) {
      return NextResponse.json({ error: 'تعذر إنشاء الحساب' }, { status: 400 });
    }

    // إضافة المستخدم في جدول exam_users
    const { error: profileError } = await supabaseAdmin.from('exam_users').insert({
      id: authUser.user.id,
      username: cleanUsername,
      name: name.trim(),
      role,
      status: 'active',
      ...(phone ? { phone } : {}),
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