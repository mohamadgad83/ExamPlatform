"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, CheckCircle, Clock, Eye } from "lucide-react";

interface Attempt {
  id: string;
  student_id: string;
  exam_id: string;
  score: number;
  total_points: number;
  percentage: number;
  status: string;
  submitted_at: string;
  time_spent_seconds: number;
  student: { name: string; student_code: string };
  exam: { title: string };
  answers: Record<string, any>;
}

export default function TeacherSubmissionsPage() {
  const queryClient = useQueryClient();
  const supabase = createClient();
  const [search, setSearch] = useState("");
  const [selectedAttempt, setSelectedAttempt] = useState<Attempt | null>(null);

  const { data: attempts, isLoading } = useQuery({
    queryKey: ["teacher-submissions", search],
    queryFn: async () => {
      let query = supabase.from("exam_attempts").select("*, student:student_id(name, student_code), exam:exam_id(title)").order("submitted_at", { ascending: false });
      if (search) query = query.or(`student.name.ilike.%${search}%`);
      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as Attempt[];
    },
  });

  const gradeEssayMutation = useMutation({
    mutationFn: async ({ attemptId, questionId, points }: { attemptId: string; questionId: string; points: number }) => {
      const { data: attempt } = await supabase.from("exam_attempts").select("answers, score, total_points").eq("id", attemptId).single();
      if (!attempt) throw new Error("المحاولة غير موجودة");
      const answers = attempt.answers as Record<string, any>;
      const oldPoints = answers[questionId]?.points || 0;
      const newScore = (attempt.score || 0) - oldPoints + points;
      answers[questionId].points = points;
      answers[questionId].isCorrect = points > 0;
      const percentage = attempt.total_points > 0 ? Math.round((newScore / attempt.total_points) * 100) : 0;
      const { error } = await supabase.from("exam_attempts").update({ answers, score: newScore, percentage }).eq("id", attemptId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["teacher-submissions"] }),
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "passed": return <Badge className="bg-green-500">ناجح</Badge>;
      case "failed": return <Badge variant="destructive">راسب</Badge>;
      case "terminated": return <Badge variant="secondary">منتهي بالقوة</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="space-y-6" dir="rtl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">تسليمات الطلاب</h1>
        <p className="text-muted-foreground">مراجعة وتصحيح نتائج الاختبارات</p>
      </div>

      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="البحث بالطالب أو الاختبار..." value={search} onChange={(e) => setSearch(e.target.value)} className="pr-10" />
      </div>

      {isLoading ? (
        <div className="text-center py-12">جاري التحميل...</div>
      ) : (
        <div className="grid gap-4">
          {attempts?.map((attempt) => (
            <Card key={attempt.id} className="hover:shadow-sm transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{attempt.exam?.title}</p>
                      {getStatusBadge(attempt.status)}
                    </div>
                    <p className="text-sm text-muted-foreground">الطالب: {attempt.student?.name} ({attempt.student?.student_code})</p>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1"><CheckCircle className="h-3 w-3" />{attempt.score} / {attempt.total_points} ({attempt.percentage}%)</span>
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{formatTime(attempt.time_spent_seconds)}</span>
                      <span>{new Date(attempt.submitted_at).toLocaleDateString("ar-EG")}</span>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setSelectedAttempt(attempt)}>
                    <Eye className="ml-1 h-3 w-3" />مراجعة
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {selectedAttempt && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">مراجعة الإجابات</h2>
              <Button variant="ghost" size="sm" onClick={() => setSelectedAttempt(null)}>إغلاق</Button>
            </div>
            <div className="bg-muted p-3 rounded-lg text-sm mb-4">
              <p><strong>الطالب:</strong> {selectedAttempt.student?.name}</p>
              <p><strong>الاختبار:</strong> {selectedAttempt.exam?.title}</p>
              <p><strong>النتيجة:</strong> {selectedAttempt.score} / {selectedAttempt.total_points}</p>
            </div>
            <div className="space-y-4">
              {Object.entries(selectedAttempt.answers || {}).map(([qId, ans]: [string, any]) => (
                <Card key={qId} className={ans.isCorrect ? "border-green-200" : "border-red-200"}>
                  <CardContent className="p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <Badge variant={ans.isCorrect ? "default" : "destructive"}>{ans.isCorrect ? "صحيحة" : "خاطئة"}</Badge>
                      <span className="text-sm">{ans.points} / {ans.maxPoints} نقطة</span>
                    </div>
                    <p className="text-sm"><strong>إجابة الطالب:</strong> {JSON.stringify(ans.answer)}</p>
                    <p className="text-sm"><strong>الإجابة الصحيحة:</strong> {JSON.stringify(ans.correctAnswer)}</p>
                    {ans.maxPoints > ans.points && (
                      <div className="flex items-center gap-2 pt-2">
                        <span className="text-sm">تصحيح يدوي:</span>
                        <Input type="number" defaultValue={ans.points} className="w-20" onBlur={(e) => {
                          const points = parseInt(e.target.value);
                          if (points >= 0 && points <= ans.maxPoints) {
                            gradeEssayMutation.mutate({ attemptId: selectedAttempt.id, questionId: qId, points });
                          }
                        }} />
                        <span className="text-sm">من {ans.maxPoints}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
