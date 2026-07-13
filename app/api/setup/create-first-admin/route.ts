import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { usernameToSyntheticEmail } from '@/lib/username'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

/**
 * ✅ Endpoint مؤقت لإنشاء أول حساب أدمن على نظام فاضي.
 * بيقفل نفسه تلقائيًا: لو فيه أدمن واحد بس موجود، بيرفض أي طلب تاني.
 * بعد ما تستخدمه مرة، احذف الفولدر ده كامل من الكود (مش لازم يفضل موجود).
 */
export async function POST() {
  try {
    const { count } = await supabaseAdmin
      .from('exam_users')
      .select('id', { count: 'exact', head: true })
      .eq('role', 'admin')

    if (count && count > 0) {
      return NextResponse.json({ error: 'فيه أدمن موجود بالفعل، الـ endpoint ده مقفول' }, { status: 403 })
    }

    const username = 'admin'
    const password = '123'
    const syntheticEmail = usernameToSyntheticEmail(username)

    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: syntheticEmail,
      password,
      email_confirm: true,
      user_metadata: { username, name: 'المدير العام' },
    })

    if (authError || !authUser?.user) {
      return NextResponse.json({ error: authError?.message || 'فشل الإنشاء' }, { status: 400 })
    }

    const { error: profileError } = await supabaseAdmin.from('exam_users').insert({
      id: authUser.user.id,
      username,
      name: 'المدير العام',
      role: 'admin',
      status: 'active',
    })

    if (profileError) {
      await supabaseAdmin.auth.admin.deleteUser(authUser.user.id)
      return NextResponse.json({ error: 'فشل حفظ البروفايل' }, { status: 500 })
    }

    return NextResponse.json({
      message: 'تم إنشاء حساب الأدمن. اليوزرنيم: admin — الباسورد: 123 — غيّره فورًا من لوحة الأدمن.',
    })
  } catch {
    return NextResponse.json({ error: 'خطأ في السيرفر' }, { status: 500 })
  }
}
