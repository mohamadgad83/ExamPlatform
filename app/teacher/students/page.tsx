"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { Search, GraduationCap, Phone, UserPlus, Ban } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const studentSchema = z.object({
  name: z.string().min(2, "الاسم مطلوب"),
  phone: z.string().min(10, "رقم الهاتف مطلوب"),
  student_code: z.string().min(3, "كود الطالب مطلوب"),
  password: z.string().min(6, "كلمة المرور مطلوبة"),
  grade_id: z.string().uuid().optional(),
});

type StudentForm = z.infer<typeof studentSchema>;

interface Student {
  id: string;
  name: string;
  phone: string;
  student_code: string;
  grade_id: string;
  created_at: string;
  status: string;
}

export default function TeacherStudentsPage() {
  const queryClient = useQueryClient();
  const supabase = createClient();
  const [search, setSearch] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [error, setError] = useState("");

  const { data: students, isLoading } = useQuery({
    queryKey: ["teacher-students", search],
    queryFn: async () => {
      let query = supabase.from("exam_students").select("*").order("created_at", { ascending: false });
      if (search) query = query.or(`name.ilike.%${search}%,student_code.ilike.%${search}%`);
      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as Student[];
    },
  });

  const { data: grades } = useQuery({
    queryKey: ["grades"],
    queryFn: async () => {
      const { data } = await supabase.from("exam_classes").select("*");
      return data || [];
    },
  });

  const form = useForm<StudentForm>({ resolver: zodResolver(studentSchema) });

  const createMutation = useMutation({
    mutationFn: async (values: StudentForm) => {
      const { error } = await supabase.from("exam_students").insert({ ...values, status: "active" });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teacher-students"] });
      setIsDialogOpen(false);
      form.reset();
    },
    onError: (err: any) => setError(err.message),
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const newStatus = status === "active" ? "suspended" : "active";
      const { error } = await supabase.from("exam_students").update({ status: newStatus }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["teacher-students"] }),
  });

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">إدارة الطلاب</h1>
          <p className="text-muted-foreground">عرض وإدارة حسابات الطلاب</p>
        </div>
        <Button onClick={() => { form.reset(); setIsDialogOpen(true); }}>
          <UserPlus className="ml-2 h-4 w-4" />
          طالب جديد
        </Button>
      </div>

      {isDialogOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-xl font-bold mb-4">إضافة طالب جديد</h2>
            <form onSubmit={form.handleSubmit((v) => createMutation.mutate(v))} className="space-y-4">
              {error && <Alert variant="destructive"><p>{error}</p></Alert>}
              <div><label className="text-sm font-medium">الاسم الكامل</label><Input {...form.register("name")} placeholder="اسم الطالب" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-sm font-medium">رقم الهاتف</label><Input {...form.register("phone")} placeholder="01xxxxxxxxx" /></div>
                <div><label className="text-sm font-medium">كود الطالب</label><Input {...form.register("student_code")} placeholder="كود فريد" /></div>
              </div>
              <div><label className="text-sm font-medium">كلمة المرور</label><Input type="password" {...form.register("password")} placeholder="******" /></div>
              <div>
                <label className="text-sm font-medium">الصف/الفصل</label>
                <select {...form.register("grade_id")} className="w-full mt-1 p-2 border rounded-md">
                  <option value="">اختر الفصل</option>
                  {grades?.map((g: any) => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>إلغاء</Button>
                <Button type="submit" disabled={createMutation.isPending}>إضافة</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="البحث بالاسم أو كود الطالب..." value={search} onChange={(e) => setSearch(e.target.value)} className="pr-10" />
      </div>

      {isLoading ? (
        <div className="text-center py-12">جاري التحميل...</div>
      ) : (
        <div className="grid gap-4">
          {students?.map((student) => (
            <Card key={student.id} className="hover:shadow-sm transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4 flex-1">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <GraduationCap className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{student.name}</p>
                        <Badge variant={student.status === "active" ? "default" : "destructive"}>{student.status === "active" ? "نشط" : "موقوف"}</Badge>
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{student.phone}</span>
                        <span>كود: {student.student_code}</span>
                      </div>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => toggleStatusMutation.mutate({ id: student.id, status: student.status })}>
                    <Ban className="ml-1 h-3 w-3" />
                    {student.status === "active" ? "تعليق" : "تفعيل"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
