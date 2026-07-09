"use client";

import { useRouter, useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Clock, Users, Edit, List } from "lucide-react";

export default function TeacherExamDetailPage() {
  const router = useRouter();
  const params = useParams();
  const examId = params.examId as string;
  const supabase = createClient();

  const { data: exam, isLoading } = useQuery({
    queryKey: ["exam-detail", examId],
    queryFn: async () => {
      const { data, error } = await supabase.from("exam_exams").select("*, exam_exam_questions(count), exam_attempts(count)").eq("id", examId).single();
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) return <div className="text-center py-12">جاري التحميل...</div>;

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{exam?.title}</h1>
          <p className="text-muted-foreground">تفاصيل الاختبار</p>
        </div>
        <Button variant="outline" onClick={() => router.push("/teacher/exams")}>
          <ArrowRight className="ml-2 h-4 w-4" />رجوع
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card><CardContent className="p-4 flex items-center gap-3">
          <Clock className="h-8 w-8 text-primary" />
          <div><p className="text-sm text-muted-foreground">المدة</p><p className="font-bold">{exam?.duration_minutes} دقيقة</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <List className="h-8 w-8 text-primary" />
          <div><p className="text-sm text-muted-foreground">عدد الأسئلة</p><p className="font-bold">{exam?.exam_exam_questions?.[0]?.count || 0}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <Users className="h-8 w-8 text-primary" />
          <div><p className="text-sm text-muted-foreground">المحاولات</p><p className="font-bold">{exam?.exam_attempts?.[0]?.count || 0}</p></div>
        </CardContent></Card>
      </div>

      <div className="flex gap-2">
        <Button onClick={() => router.push(`/teacher/exams/edit/${examId}`)}>
          <Edit className="ml-2 h-4 w-4" />تعديل الاختبار
        </Button>
        <Button variant="outline" onClick={() => router.push(`/teacher/exams/${examId}/questions`)}>
          <List className="ml-2 h-4 w-4" />إدارة الأسئلة
        </Button>
      </div>
    </div>
  );
}
