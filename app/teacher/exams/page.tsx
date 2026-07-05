"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { Plus, Edit, Trash2, Eye, Users, Clock } from "lucide-react";

interface Exam {
  id: string;
  title: string;
  duration_minutes: number;
  passing_score: number;
  is_published: boolean;
  status: string;
  exam_type: string;
  exam_price: number;
  created_at: string;
  _count?: { attempts: number };
}

export default function TeacherExamsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const supabase = createClient();
  const [error, setError] = useState("");

  const { data: exams, isLoading } = useQuery({
    queryKey: ["teacher-exams"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("exam_exams")
        .select("*, exam_attempts(count)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []).map((e: any) => ({
        ...e,
        _count: { attempts: e.exam_attempts?.[0]?.count || 0 },
      })) as Exam[];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("exam_exams").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teacher-exams"] });
    },
    onError: (err: any) => setError(err.message),
  });

  const togglePublishMutation = useMutation({
    mutationFn: async ({ id, isPublished }: { id: string; isPublished: boolean }) => {
      const { error } = await supabase
        .from("exam_exams")
        .update({ is_published: !isPublished })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["teacher-exams"] }),
  });

  const getStatusBadge = (status: string, isPublished: boolean) => {
    if (!isPublished) return <Badge variant="secondary">مسودة</Badge>;
    if (status === "active") return <Badge className="bg-green-500">نشط</Badge>;
    if (status === "completed") return <Badge variant="outline">منتهي</Badge>;
    return <Badge variant="secondary">{status}</Badge>;
  };

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">اختباراتي</h1>
          <p className="text-muted-foreground">إدارة الاختبارات وبنك الأسئلة</p>
        </div>
        <Button onClick={() => router.push("/teacher/exams/create")}>
          <Plus className="ml-2 h-4 w-4" />
          إنشاء اختبار جديد
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <p>{error}</p>
        </Alert>
      )}

      {isLoading ? (
        <div className="text-center py-12">جاري التحميل...</div>
      ) : exams?.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">لا توجد اختبارات بعد. ابدأ بإنشاء اختبار جديد!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {exams?.map((exam) => (
            <Card key={exam.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg font-semibold line-clamp-1">{exam.title}</CardTitle>
                  {getStatusBadge(exam.status, exam.is_published)}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {exam.duration_minutes} دقيقة
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    {exam._count?.attempts || 0} محاولة
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span>درجة النجاح: {exam.passing_score}%</span>
                  <span>{exam.exam_price > 0 ? `${exam.exam_price} جنيه` : "مجاني"}</span>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => router.push(`/teacher/exams/edit/${exam.id}`)}
                  >
                    <Edit className="ml-1 h-3 w-3" />
                    تعديل
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => togglePublishMutation.mutate({ id: exam.id, isPublished: exam.is_published })}
                  >
                    <Eye className="ml-1 h-3 w-3" />
                    {exam.is_published ? "إخفاء" : "نشر"}
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => {
                      if (confirm("هل أنت متأكد من حذف هذا الاختبار؟")) {
                        deleteMutation.mutate(exam.id);
                      }
                    }}
                  >
                    <Trash2 className="h-3 w-3" />
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
