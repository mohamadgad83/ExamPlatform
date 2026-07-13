"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { Plus, Users, UserPlus, X } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const groupSchema = z.object({
  name: z.string().min(2, "اسم المجموعة مطلوب"),
  description: z.string().optional(),
  class_id: z.string().uuid().optional(),
  subject_id: z.string().uuid().optional(),
});

type GroupForm = z.infer<typeof groupSchema>;

interface Group {
  id: string;
  name: string;
  description: string;
  class_id: string;
  subject_id: string;
  teacher_id: string;
  created_at: string;
  members?: any[];
}

export default function TeacherGroupsPage() {
  const queryClient = useQueryClient();
  const supabase = createClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [studentCode, setStudentCode] = useState("");
  const [error, setError] = useState("");

  const { data: groups, isLoading } = useQuery({
    queryKey: ["teacher-groups"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("exam_groups")
        .select("*, exam_group_members(*, student:student_id(id, name))")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as Group[];
    },
  });

  const { data: classes } = useQuery({
    queryKey: ["classes"],
    queryFn: async () => {
      const { data } = await supabase.from("exam_classes").select("*");
      return data || [];
    },
  });

  const { data: subjects } = useQuery({
    queryKey: ["subjects"],
    queryFn: async () => {
      const { data } = await supabase.from("exam_subjects").select("*");
      return data || [];
    },
  });

  const form = useForm<GroupForm>({ resolver: zodResolver(groupSchema) });

  const createMutation = useMutation({
    mutationFn: async (values: GroupForm) => {
      const { error } = await supabase.from("exam_groups").insert(values);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teacher-groups"] });
      setIsDialogOpen(false);
      form.reset();
    },
    onError: (err: any) => setError(err.message),
  });

  const addMemberMutation = useMutation({
    mutationFn: async ({ groupId, studentCode }: { groupId: string; studentCode: string }) => {
      const { data: student } = await supabase.from("exam_students").select("id").eq("student_code", studentCode).single();
      if (!student) throw new Error("الطالب غير موجود");
      const { error } = await supabase.from("exam_group_members").insert({ group_id: groupId, student_id: student.id, status: "active" });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teacher-groups"] });
      setStudentCode("");
    },
    onError: (err: any) => setError(err.message),
  });

  const removeMemberMutation = useMutation({
    mutationFn: async ({ groupId, studentId }: { groupId: string; studentId: string }) => {
      const { error } = await supabase.from("exam_group_members").delete().eq("group_id", groupId).eq("student_id", studentId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["teacher-groups"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("exam_groups").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["teacher-groups"] }),
  });

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">المجموعات</h1>
          <p className="text-muted-foreground">إدارة مجموعات الطلاب والفصول</p>
        </div>
        <Button onClick={() => { form.reset(); setIsDialogOpen(true); }}>
          <Plus className="ml-2 h-4 w-4" />
          مجموعة جديدة
        </Button>
      </div>

      {isDialogOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-xl font-bold mb-4">إنشاء مجموعة جديدة</h2>
            <form onSubmit={form.handleSubmit((v) => createMutation.mutate(v))} className="space-y-4">
              {error && <Alert variant="destructive"><p>{error}</p></Alert>}
              <div>
                <label className="text-sm font-medium">اسم المجموعة</label>
                <Input {...form.register("name")} placeholder="مثال: مجموعة الرياضيات" />
              </div>
              <div>
                <label className="text-sm font-medium">الوصف</label>
                <Input {...form.register("description")} placeholder="وصف مختصر..." />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">الفصل</label>
                  <select {...form.register("class_id")} className="w-full mt-1 p-2 border rounded-md">
                    <option value="">اختر الفصل</option>
                    {classes?.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium">المادة</label>
                  <select {...form.register("subject_id")} className="w-full mt-1 p-2 border rounded-md">
                    <option value="">اختر المادة</option>
                    {subjects?.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>إلغاء</Button>
                <Button type="submit" disabled={createMutation.isPending}>إنشاء</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="text-center py-12">جاري التحميل...</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {groups?.map((group) => (
            <Card key={group.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{group.name}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">{group.description}</p>
                  </div>
                  <Button variant="ghost" size="sm" className="text-red-500" onClick={() => { if (confirm("هل أنت متأكد؟")) deleteMutation.mutate(group.id); }}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Users className="h-4 w-4" />
                  <span>{group.members?.length || 0} طالب</span>
                </div>
                <div className="border rounded-lg p-3 space-y-3">
                  <p className="text-sm font-medium">إضافة طالب برقم الطالب:</p>
                  <div className="flex gap-2">
                    <Input placeholder="رقم الطالب" value={studentCode} onChange={(e) => setStudentCode(e.target.value)} className="flex-1" />
                    <Button size="sm" onClick={() => addMemberMutation.mutate({ groupId: group.id, studentCode })} disabled={!studentCode}>
                      <UserPlus className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {group.members?.map((m: any) => (
                      <Badge key={m.student_id} variant="secondary" className="flex items-center gap-1">
                        {m.student?.name || m.student_id}
                        <X className="h-3 w-3 cursor-pointer" onClick={() => removeMemberMutation.mutate({ groupId: group.id, studentId: m.student_id })} />
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
