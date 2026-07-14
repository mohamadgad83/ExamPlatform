import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function GET(request: Request) {
  try {
    // جلب التوكن من الهيدر
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({ user: null }, { status: 401 });
    }

    // التحقق من المستخدم
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    
    if (error || !user) {
      return NextResponse.json({ user: null }, { status: 401 });
    }

    // جلب البروفايل من exam_users
    const { data: profile } = await supabaseAdmin
      .from('exam_users')
      .select('id, username, name, role, status')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ user: null }, { status: 404 });
    }

    return NextResponse.json({ user: profile });

  } catch (error) {
    console.error('❌ خطأ في /api/auth/me:', error);
    return NextResponse.json({ user: null }, { status: 500 });
  }
}
