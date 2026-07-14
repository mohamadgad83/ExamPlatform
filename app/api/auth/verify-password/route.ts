import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// استخدام Service Role Key
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { username, password } = body;

    console.log('📝 محاولة تسجيل دخول:', { username, passwordProvided: !!password });

    if (!username || !password) {
      return NextResponse.json(
        { success: false, error: 'اسم المستخدم وكلمة المرور مطلوبين' },
        { status: 400 }
      );
    }

    // جلب المستخدم من قاعدة البيانات
    const { data: user, error } = await supabaseAdmin
      .from('exam_users')
      .select('id, username, name, role, status, password')
      .eq('username', username)
      .single();

    if (error) {
      console.error('❌ خطأ في جلب المستخدم:', error);
      return NextResponse.json(
        { success: false, error: 'المستخدم غير موجود' },
        { status: 404 }
      );
    }

    if (!user) {
      console.error('❌ المستخدم غير موجود:', username);
      return NextResponse.json(
        { success: false, error: 'المستخدم غير موجود' },
        { status: 404 }
      );
    }

    console.log('✅ المستخدم موجود:', { 
      id: user.id, 
      username: user.username, 
      role: user.role,
      storedPassword: user.password,
      providedPassword: password,
      passwordsMatch: user.password === password
    });

    // التحقق من كلمة المرور
    if (user.password !== password) {
      return NextResponse.json(
        { success: false, error: 'كلمة المرور غير صحيحة' },
        { status: 401 }
      );
    }

    // التحقق من الحالة
    if (user.status === 'suspended') {
      return NextResponse.json(
        { success: false, error: 'الحساب موقوف' },
        { status: 403 }
      );
    }

    // حذف كلمة المرور من النتيجة
    const { password: _, ...userWithoutPassword } = user;

    return NextResponse.json({
      success: true,
      user: userWithoutPassword,
    });

  } catch (error) {
    console.error('❌ خطأ في السيرفر:', error);
    return NextResponse.json(
      { success: false, error: 'خطأ في السيرفر' },
      { status: 500 }
    );
  }
}
