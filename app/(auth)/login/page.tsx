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
import { GraduationCap, UserCog, Shield } from "lucide-react";
import { useAuth } from "@/lib/hooks/use-auth";

const loginSchema = z.object({
  identifier: z.string().min(1, "اسم المستخدم/الهاتف/الكود مطلوب"),
  password: z.string().min(1, "كلمة المرور مطلوبة"),
  role: z.enum(["student", "teacher", "admin"]),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<"student" | "teacher" | "admin">("student");

  const form = useForm<LoginForm>({ resolver: zodResolver(loginSchema), defaultValues: { role: "student" } });

  const onSubmit = async (values: LoginForm) => {
    setError("");
    const result = await login(values.identifier, values.password, values.role);
    if (result.success) {
      const routes: Record<string, string> = { student: "/student/dashboard", teacher: "/teacher/dashboard", admin: "/admin/dashboard" };
      router.push(routes[values.role]);
    } else { setError(result.error || "فشل تسجيل الدخول"); }
  };

  const tabs = [
    { key: "student" as const, label: "طالب", icon: GraduationCap },
    { key: "teacher" as const, label: "معلم", icon: UserCog },
    { key: "admin" as const, label: "أدمن", icon: Shield },
  ];

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-secondary/5 p-4" dir="rtl">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">تسجيل الدخول</CardTitle>
          <p className="text-muted-foreground text-sm mt-1">أهلاً بك في منصة الاختبارات</p>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && <Alert variant="destructive"><p>{error}</p></Alert>}
          <div className="flex gap-2 p-1 bg-muted rounded-lg">
            {tabs.map((tab) => (
              <button key={tab.key} onClick={() => { setActiveTab(tab.key); form.setValue("role", tab.key); }}
                className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm font-medium transition-all ${activeTab === tab.key ? "bg-white text-primary shadow-sm" : "text-muted-foreground"}`}>
                <tab.icon className="h-4 w-4" />{tab.label}
              </button>
            ))}
          </div>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="text-sm font-medium">{activeTab === "student" ? "رقم الهاتف / كود الطالب" : "اسم المستخدم / البريد"}</label>
              <Input {...form.register("identifier")} placeholder={activeTab === "student" ? "01xxxxxxxxx أو كود الطالب" : "اسم المستخدم أو البريد"} className="mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium">كلمة المرور</label>
              <Input type="password" {...form.register("password")} placeholder="******" className="mt-1" />
            </div>
            <input type="hidden" {...form.register("role")} value={activeTab} />
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
