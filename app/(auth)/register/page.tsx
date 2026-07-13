"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";

const registerSchema = z.object({
  name: z.string().min(2, "الاسم مطلوب"),
  username: z.string()
    .min(3, "اسم المستخدم 3 أحرف على الأقل")
    .max(30, "اسم المستخدم طويل جدًا")
    .regex(/^[a-zA-Z0-9_]+$/, "حروف/أرقام/underscore بس، بدون مسافات"),
  password: z.string().min(6, "كلمة المرور 6 أحرف على الأقل"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "كلمات المرور غير متطابقة",
  path: ["confirmPassword"],
});

type RegisterForm = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const form = useForm<RegisterForm>({ resolver: zodResolver(registerSchema) });

  const onSubmit = async (values: RegisterForm) => {
    setError("");
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: values.name, username: values.username, password: values.password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "فشل إنشاء الحساب");
        return;
      }
      setSuccess("تم إنشاء الحساب بنجاح! جاري التحويل...");
      setTimeout(() => router.push("/login"), 1500);
    } catch {
      setError("خطأ في الاتصال بالسيرفر");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-secondary/5 p-4" dir="rtl">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">إنشاء حساب طالب</CardTitle>
          <p className="text-muted-foreground text-sm mt-1">انضم إلى منصة الاختبارات</p>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && <Alert variant="destructive"><p>{error}</p></Alert>}
          {success && <Alert className="bg-green-50 text-green-800 border-green-200"><p>{success}</p></Alert>}
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="text-sm font-medium">الاسم الكامل</label>
              <Input {...form.register("name")} placeholder="الاسم الثلاثي" className="mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium">اسم المستخدم</label>
              <Input {...form.register("username")} placeholder="username" className="mt-1" autoComplete="username" />
              {form.formState.errors.username && (
                <p className="text-xs text-destructive mt-1">{form.formState.errors.username.message}</p>
              )}
            </div>
            <div>
              <label className="text-sm font-medium">كلمة المرور</label>
              <Input type="password" {...form.register("password")} placeholder="******" className="mt-1" autoComplete="new-password" />
            </div>
            <div>
              <label className="text-sm font-medium">تأكيد كلمة المرور</label>
              <Input type="password" {...form.register("confirmPassword")} placeholder="******" className="mt-1" autoComplete="new-password" />
            </div>
            <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? "جاري الإنشاء..." : "إنشاء الحساب"}
            </Button>
          </form>
          <div className="text-center text-sm text-muted-foreground">
            لديك حساب بالفعل؟ <a href="/login" className="hover:text-primary underline">تسجيل الدخول</a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
