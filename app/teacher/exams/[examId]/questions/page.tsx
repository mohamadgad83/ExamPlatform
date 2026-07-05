"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Plus, Trash2, GripVertical } from "lucide-react";

export default function TeacherExamQuestionsPage() {
  const router = useRouter();
  const params = useParams();
  const examId = params.examId as string;
  const queryClient = useQueryClient();
  const supabase = createClient();
  const [selectedQuestionId, setSelectedQuestionId] = useState("");
  const [points, setPoints] = useState(1);

  const { data: examQuestions, isLoading: eqLoading } = useQuery({
    queryKey: ["exam-questions", examId],
    queryFn: async () => {
      const { data, error } = await supabase.from("exam_exam_questions").select("*, question:question_id(*)").eq("exam_id", examId).order("order_num");
      if (error) throw error;
      return data || [];
    },
  });

  const { data: bankQuestions } = useQuery({
    queryKey: ["questions-bank-all"],
    queryFn: async () => {
      const { data } = await supabase.from("exam_questions_bank").select("*");
      return data || [];
    },
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("exam_exam_questions").insert({
        exam_id: examId, question_id: selectedQuestionId, points, order_num: (examQuestions?.length || 0) + 1,
      });
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["exam-questions", examId] }); setSelectedQuestionId(""); },
  });

  const removeMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("exam_exam_questions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["exam-questions", examId] }),
  });

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">أسئلة الاختبار</h1>
          <p className="text-muted-foreground">إدارة أسئلة الاختبار</p>
        </div>
        <Button variant="outline" onClick={() => router.push(`/teacher/exams/${examId}`)}>
          <ArrowRight className="ml-2 h-4 w-4" />رجوع
        </Button>
      </div>

      <Card>
        <CardContent className="p-4 space-y-4">
          <h3 className="font-semibold">إضافة سؤال من البنك</h3>
          <div className="flex gap-2">
            <select value={selectedQuestionId} onChange={(e) => setSelectedQuestionId(e.target.value)} className="flex-1 p-2 border rounded-md">
              <option value="">اختر سؤالاً</option>
              {bankQuestions?.map((q: any) => (
                <option key={q.id} value={q.id}>{q.text?.slice(0, 60)}... ({q.subject})</option>
              ))}
            </select>
            <Input type="number" value={points} onChange={(e) => setPoints(Number(e.target.value))} className="w-24" placeholder="نقاط" />
            <Button onClick={() => addMutation.mutate()} disabled={!selectedQuestionId}>
              <Plus className="ml-1 h-4 w-4" />إضافة
            </Button>
          </div>
        </CardContent>
      </Card>

      {eqLoading ? (
        <div className="text-center py-12">جاري التحميل...</div>
      ) : (
        <div className="space-y-2">
          {examQuestions?.map((eq: any, index: number) => (
            <Card key={eq.id} className="hover:shadow-sm">
              <CardContent className="p-4 flex items-center gap-4">
                <GripVertical className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm font-medium w-8">{index + 1}</span>
                <div className="flex-1">
                  <p className="font-medium">{eq.question?.text?.slice(0, 100)}...</p>
                  <div className="flex gap-2 mt-1">
                    <Badge variant="outline">{eq.question?.subject}</Badge>
                    <Badge variant="secondary">{eq.points} نقطة</Badge>
                  </div>
                </div>
                <Button variant="ghost" size="sm" className="text-red-500" onClick={() => removeMutation.mutate(eq.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
          {examQuestions?.length === 0 && <p className="text-center text-muted-foreground py-8">لا توجد أسئلة مضافة بعد</p>}
        </div>
      )}
    </div>
  );
}
