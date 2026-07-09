"use client";

import { useRouter, useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, CheckCircle, XCircle, Clock } from "lucide-react";

export default function StudentExamResultPage() {
  const router = useRouter();
  const params = useParams();
  const examId = params.examId as string;
  const supabase = createClient();

  const { data: attempt, isLoading } = useQuery({
    queryKey: ["exam-result", examId],
    queryFn: async () => {
      const { data, error } = await supabase.from("exam_attempts").select("*, exam:exam_id(title, passing_score)").eq("exam_id", examId).order("submitted_at", { ascending: false }).limit(1).single();
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) return <div className="text-center py-12">جاري التحميل...</div>;

  const isPassed = attempt?.status === "passed";

  return (
    <div className="space-y-6 max-w-2xl mx-auto" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">نتيجة الاختبار</h1>
          <p className="text-muted-foreground">{attempt?.exam?.title}</p>
        </div>
        <Button variant="outline" onClick={() => router.push("/student/exams")}>
          <ArrowRight className="ml-2 h-4 w-4" />رجوع
        </Button>
      </div>

      <Card className={isPassed ? "border-green-200" : "border-red-200"}>
        <CardContent className="p-6 text-center space-y-4">
          {isPassed ? <CheckCircle className="h-16 w-16 text-green-500 mx-auto" /> : <XCircle className="h-16 w-16 text-red-500 mx-auto" />}
          <h2 className="text-2xl font-bold">{isPassed ? "مبروك! لقد نجحت" : "للأسف، لم تنجح"}</h2>
          <div className="flex justify-center gap-8">
            <div className="text-center">
              <p className="text-3xl font-bold">{attempt?.percentage}%</p>
              <p className="text-sm text-muted-foreground">النسبة</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold">{attempt?.score}/{attempt?.total_points}</p>
              <p className="text-sm text-muted-foreground">النقاط</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold flex items-center justify-center gap-1"><Clock className="h-5 w-5" />{Math.floor((attempt?.time_spent_seconds || 0) / 60)}</p>
              <p className="text-sm text-muted-foreground">الوقت (دقيقة)</p>
            </div>
          </div>
          <Badge className={isPassed ? "bg-green-500" : "bg-red-500"}>{isPassed ? "ناجح" : "راسب"}</Badge>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>مراجعة الإجابات</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {Object.entries(attempt?.answers || {}).map(([qId, ans]: [string, any]) => (
            <div key={qId} className={`p-3 rounded-lg border ${ans.isCorrect ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}`}>
              <div className="flex items-center justify-between">
                <Badge variant={ans.isCorrect ? "default" : "destructive"}>{ans.isCorrect ? "صحيحة" : "خاطئة"}</Badge>
                <span className="text-sm">{ans.points}/{ans.maxPoints} نقطة</span>
              </div>
              <p className="text-sm mt-2"><strong>إجابتك:</strong> {JSON.stringify(ans.answer)}</p>
              <p className="text-sm"><strong>الصحيحة:</strong> {JSON.stringify(ans.correctAnswer)}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
