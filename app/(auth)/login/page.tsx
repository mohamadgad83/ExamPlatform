"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { useAuth } from "@/lib/hooks/use-auth";

const loginSchema = z.object({
  username: z.string().min(1, "اسم المستخدم مطلوب"),
  password: z.string().min(1, "كلمة المرور مطلوبة"),
});

type LoginForm = z.infer<typeof loginSchema>;

// غيّر المسار ده وخليه سر بينك وبين نفسك، ومتحطش لينك ليه في أي مكان بالموقع
const ADMIN_PORTAL_PATH = "/admin-k9x2v7";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [error, setError] = useState("");
  const keysRef = useRef<string[]>([]);

  const form = useForm<LoginForm>({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (values: LoginForm) => {
    setError("");
    const result = await login(values.username, values.password, false);
    if (result.success) {
      const routes: Record<string, string> = { student: "/student/dashboard", teacher: "/teacher/dashboard" };
      router.push(routes[result.user.role] ?? "/");
    } else {
      setError(result.error);
    }
  };

  // اختصار مخفي: اكتب الكلمة "admin" في أي مكان في الصفحة (من غير ما تدوس جوه حقل)
  // عشان تتحول لبوابة دخول الأدمن. مش ظاهر في الواجهة خالص.
  useEffect(() => {
    const secret = "admin";
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;
      keysRef.current = [...keysRef.current, e.key.toLowerCase()].slice(-secret.length);
      if (keysRef.current.join("") === secret) {
        router.push(ADMIN_PORTAL_PATH);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-secondary/5 p-4" dir="rtl">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">تسجيل الدخول</CardTitle>
          <p className="text-muted-foreground text-sm mt-1">أهلاً بك في منصة الاختبارات</p>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && <Alert variant="destructive"><p>{error}</p></Alert>}
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="text-sm font-medium">اسم المستخدم</label>
              <Input {...form.register("username")} placeholder="اسم المستخدم" className="mt-1" autoComplete="username" />
              {form.formState.errors.username && (
                <p className="text-xs text-destructive mt-1">{form.formState.errors.username.message}</p>
              )}
            </div>
            <div>
              <label className="text-sm font-medium">كلمة المرور</label>
              <Input type="password" {...form.register("password")} placeholder="******" className="mt-1" autoComplete="current-password" />
            </div>
            <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? "جاري الدخول..." : "تسجيل الدخول"}
            </Button>
          </form>
          <div className="text-center text-sm text-muted-foreground">
            <a href="/forgot-password" className="hover:text-primary underline">نسيت كلمة المرور؟</a>
            <span className="mx-2">|</span>
            <a href="/register" className="hover:text-primary underline">إنشاء حساب جديد</a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
