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
import { createClient } from "@/lib/supabase/client";

const studentSchema = z.object({
  name: z.string().min(2, "الاسم مطلوب"),
  phone: z.string().min(10, "رقم الهاتف مطلوب"),
  student_code: z.string().min(3, "كود الطالب مطلوب"),
  password: z.string().min(6, "كلمة المرور 6 أحرف على الأقل"),
  confirmPassword: z.string(),
  grade_id: z.string().optional(),
}).refine((data) => data.password === data.confirmPassword, { message: "كلمات المرور غير متطابقة", path: ["confirmPassword"] });

const teacherSchema = z.object({
  name: z.string().min(2, "الاسم مطلوب"),
  username: z.string().min(3, "اسم المستخدم مطلوب"),
  email: z.string().email("بريد غير صالح"),
  password: z.string().min(6, "كلمة المرور 6 أحرف على الأقل"),
  confirmPassword: z.string(),
  specialization: z.string().optional(),
}).refine((data) => data.password === data.confirmPassword, { message: "كلمات المرور غير متطابقة", path: ["confirmPassword"] });

type StudentForm = z.infer<typeof studentSchema>;
type TeacherForm = z.infer<typeof teacherSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const supabase = createClient();
  const [role, setRole] = useState<"student" | "teacher">("student");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const studentForm = useForm<StudentForm>({ resolver: zodResolver(studentSchema) });
  const teacherForm = useForm<TeacherForm>({ resolver: zodResolver(teacherSchema) });

  const onStudentSubmit = async (values: StudentForm) => {
    setError("");
    const { error: studentError } = await supabase.from("exam_students").insert({
      name: values.name, phone: values.phone, student_code: values.student_code,
      password: values.password, grade_id: values.grade_id || null, status: "active",
    });
    if (studentError) { setError(studentError.message); return; }
    await supabase.from("exam_users").insert({ name: values.name, phone: values.phone, role: "student", password_hash: values.password, status: "active" }).catch(() => {});
    setSuccess("تم إنشاء الحساب بنجاح! جاري التحويل...");
    setTimeout(() => router.push("/login"), 1500);
  };

  const onTeacherSubmit = async (values: TeacherForm) => {
    setError("");
    const { error: teacherError } = await supabase.from("exam_teachers").insert({
      username: values.username, password: values.password, specialization: values.specialization || "",
    });
    if (teacherError) { setError(teacherError.message); return; }
    await supabase.from("exam_users").insert({ name: values.name, email: values.email, role: "teacher", password_hash: values.password, status: "active" }).catch(() => {});
    setSuccess("تم إنشاء الحساب بنجاح! جاري التحويل...");
    setTimeout(() => router.push("/login"), 1500);
  };

  const activeForm = role === "student" ? studentForm : teacherForm;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-secondary/5 p-4" dir="rtl">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">إنشاء حساب جديد</CardTitle>
          <p className="text-muted-foreground text-sm mt-1">انضم إلى منصة الاختبارات</p>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && <Alert variant="destructive"><p>{error}</p></Alert>}
          {success && <Alert className="bg-green-50 text-green-800 border-green-200"><p>{success}</p></Alert>}
          <div className="flex gap-2 p-1 bg-muted rounded-lg">
            <button onClick={() => setRole("student")} className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all ${role === "student" ? "bg-white text-primary shadow-sm" : "text-muted-foreground"}`}>طالب</button>
            <button onClick={() => setRole("teacher")} className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all ${role === "teacher" ? "bg-white text-primary shadow-sm" : "text-muted-foreground"}`}>معلم</button>
          </div>
          <form onSubmit={activeForm.handleSubmit(role === "student" ? onStudentSubmit : onTeacherSubmit)} className="space-y-4">
            <div><label className="text-sm font-medium">الاسم الكامل</label><Input {...activeForm.register("name")} placeholder="الاسم الثلاثي" className="mt-1" /></div>
            {role === "student" ? (
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-sm font-medium">رقم الهاتف</label><Input {...studentForm.register("phone")} placeholder="01xxxxxxxxx" className="mt-1" /></div>
                <div><label className="text-sm font-medium">كود الطالب</label><Input {...studentForm.register("student_code")} placeholder="كود فريد" className="mt-1" /></div>
              </div>
            ) : (
              <>
                <div><label className="text-sm font-medium">اسم المستخدم</label><Input {...teacherForm.register("username")} placeholder="username" className="mt-1" /></div>
                <div><label className="text-sm font-medium">البريد الإلكتروني</label><Input type="email" {...teacherForm.register("email")} placeholder="email@example.com" className="mt-1" /></div>
                <div><label className="text-sm font-medium">التخصص</label><Input {...teacherForm.register("specialization")} placeholder="مثال: الرياضيات" className="mt-1" /></div>
              </>
            )}
            <div><label className="text-sm font-medium">كلمة المرور</label><Input type="password" {...activeForm.register("password")} placeholder="******" className="mt-1" /></div>
            <div><label className="text-sm font-medium">تأكيد كلمة المرور</label><Input type="password" {...activeForm.register("confirmPassword")} placeholder="******" className="mt-1" /></div>
            <Button type="submit" className="w-full" disabled={activeForm.formState.isSubmitting}>
              {activeForm.formState.isSubmitting ? "جاري الإنشاء..." : "إنشاء الحساب"}
            </Button>
          </form>
          <div className="text-center text-sm text-muted-foreground">لديك حساب بالفعل؟ <a href="/login" className="hover:text-primary underline">تسجيل الدخول</a></div>
        </CardContent>
      </Card>
    </div>
  );
}
