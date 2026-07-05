"use client";

import { useRouter, useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, List, ArrowRight, Play } from "lucide-react";

export default function StudentExamDetailPage() {
  const router = useRouter();
  const params = useParams();
  const examId = params.examId as string;
  const supabase = createClient();

  const { data: exam, isLoading } = useQuery({
    queryKey: ["student-exam", examId],
    queryFn: async () => {
      const { data, error } = await supabase.from("exam_exams").select("*, exam_exam_questions(count)").eq("id", examId).eq("is_published", true).single();
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) return <div className="text-center py-12">جاري التحميل...</div>;

  return (
    <div className="space-y-6 max-w-2xl mx-auto" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{exam?.title}</h1>
          <p className="text-muted-foreground">تفاصيل الاختبار</p>
        </div>
        <Button variant="outline" onClick={() => router.push("/student/exams")}>
          <ArrowRight className="ml-2 h-4 w-4" />رجوع
        </Button>
      </div>

      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-3">
              <Clock className="h-6 w-6 text-primary" />
              <div><p className="text-sm text-muted-foreground">المدة</p><p className="font-bold">{exam?.duration_minutes} دقيقة</p></div>
            </div>
            <div className="flex items-center gap-3">
              <List className="h-6 w-6 text-primary" />
              <div><p className="text-sm text-muted-foreground">عدد الأسئلة</p><p className="font-bold">{exam?.exam_exam_questions?.[0]?.count || 0}</p></div>
            </div>
          </div>
          <div className="flex items-center justify-between pt-4 border-t">
            <span>درجة النجاح: {exam?.passing_score}%</span>
            <Badge>{exam?.exam_price > 0 ? `${exam?.exam_price} جنيه` : "مجاني"}</Badge>
          </div>
        </CardContent>
      </Card>

      <Button className="w-full" size="lg" onClick={() => router.push(`/student/attempt/${examId}`)}>
        <Play className="ml-2 h-5 w-5" />بدء الاختبار
      </Button>
    </div>
  );
}
