import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { isValidUsername, normalizeUsername, usernameToSyntheticEmail } from '@/lib/username'

// عميل بصلاحية service role — بيتخطى RLS، مينفعش يتنادى غير من السيرفر
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { name, username, password } = body

    // ✅ التحقق من المدخلات
    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return NextResponse.json({ error: 'الاسم مطلوب' }, { status: 400 })
    }
    if (!username || !isValidUsername(username)) {
      return NextResponse.json(
        { error: 'اسم المستخدم لازم يكون 3-30 حرف/رقم بدون مسافات' },
        { status: 400 }
      )
    }
    if (!password || typeof password !== 'string' || password.length < 6) {
      return NextResponse.json({ error: 'كلمة المرور 6 أحرف على الأقل' }, { status: 400 })
    }

    const cleanUsername = normalizeUsername(username)
    const cleanName = name.trim()

    // ✅ role دايمًا 'student' هنا بالثابت — مش مقروء من الـ body خالص
    //    (التسجيل العام مسموح للطلاب بس؛ المعلم/الأدمن بيتعملوا من لوحة الأدمن)
    const role = 'student' as const

    // تأكد إن اليوزرنيم مش مستخدم قبل كده
    const { data: existing } = await supabaseAdmin
      .from('exam_users')
      .select('id')
      .ilike('username', cleanUsername)
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ error: 'اسم المستخدم ده مستخدم بالفعل' }, { status: 409 })
    }

    const syntheticEmail = usernameToSyntheticEmail(cleanUsername)

    // ✅ إنشاء حساب Supabase Auth — الباسورد بيتخزن مشفر جوه auth.users
    //    مش في أي جدول احنا نقدر نقراه
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: syntheticEmail,
      password,
      email_confirm: true,
      user_metadata: { username: cleanUsername, name: cleanName },
    })

    if (authError || !authUser?.user) {
      return NextResponse.json({ error: 'تعذر إنشاء الحساب، حاول باسم مستخدم مختلف' }, { status: 400 })
    }

    // صف البروفايل — بدون أي عمود باسورد
    const { error: profileError } = await supabaseAdmin.from('exam_users').insert({
      id: authUser.user.id,
      username: cleanUsername,
      name: cleanName,
      role,
      status: 'active',
    })

    if (profileError) {
      // نظّف حساب الـ Auth لو فشل إدخال البروفايل عشان منسيبش حساب يتيم
      await supabaseAdmin.auth.admin.deleteUser(authUser.user.id)
      return NextResponse.json({ error: 'فشل إنشاء الحساب' }, { status: 500 })
    }

    return NextResponse.json({ message: 'تم إنشاء الحساب بنجاح' }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'خطأ في السيرفر' }, { status: 500 })
  }
}
