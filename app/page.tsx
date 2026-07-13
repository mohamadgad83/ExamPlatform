import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { BookOpen, ShieldCheck, Timer, BarChart3, GraduationCap, UserCog } from "lucide-react";

export default function HomePage() {
  const features = [
    {
      icon: Timer,
      title: "اختبارات بتوقيت دقيق",
      desc: "مؤقّت تلقائي لكل اختبار، وتسليم فوري لحظة انتهاء الوقت.",
    },
    {
      icon: ShieldCheck,
      title: "حماية أثناء الاختبار",
      desc: "رصد الخروج من الشاشة الكاملة والتبديل بين النوافذ أثناء الحل.",
    },
    {
      icon: BarChart3,
      title: "نتائج وتحليلات فورية",
      desc: "الدرجة تظهر فور التسليم، مع تقارير أداء لكل معلم عن طلابه.",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5" dir="rtl">
      <header className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-2 font-bold text-xl">
          <div className="w-9 h-9 bg-primary rounded-lg flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-primary-foreground" />
          </div>
          <span>منصة الاختبارات</span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" asChild>
            <Link href="/login">تسجيل الدخول</Link>
          </Button>
          <Button asChild>
            <Link href="/register">إنشاء حساب</Link>
          </Button>
        </div>
      </header>

      <main className="container">
        <section className="py-16 md:py-24 text-center max-w-2xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
            اختبارات إلكترونية، من غير تعقيد
          </h1>
          <p className="text-lg text-muted-foreground mb-8">
            المعلم بيجهّز الأسئلة، الطالب بيدخل يحل، والدرجة بتظهر فورًا —
            كل ده في مكان واحد.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button size="lg" asChild>
              <Link href="/register">ابدأ كطالب</Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/login">عندي حساب بالفعل</Link>
            </Button>
          </div>
        </section>

        <section className="grid gap-6 md:grid-cols-3 pb-20">
          {features.map((f) => (
            <Card key={f.title}>
              <CardContent className="pt-6 text-center space-y-3">
                <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <f.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-semibold">{f.title}</h3>
                <p className="text-sm text-muted-foreground">{f.desc}</p>
              </CardContent>
            </Card>
          ))}
        </section>

        <section className="pb-20 grid gap-4 md:grid-cols-2 max-w-3xl mx-auto">
          <Card>
            <CardContent className="pt-6 flex items-center gap-3">
              <GraduationCap className="w-6 h-6 text-primary shrink-0" />
              <p className="text-sm">
                <span className="font-medium">طالب؟</span> سجّل حساب جديد باسم
                مستخدم وباسورد، وابدأ حل الاختبارات المتاحة لك فورًا.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 flex items-center gap-3">
              <UserCog className="w-6 h-6 text-primary shrink-0" />
              <p className="text-sm">
                <span className="font-medium">معلم؟</span> حسابك بيتعمل من
                لوحة الأدمن، وبعدها تقدر تجهّز أسئلتك وامتحاناتك ومجموعاتك.
              </p>
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  );
}
