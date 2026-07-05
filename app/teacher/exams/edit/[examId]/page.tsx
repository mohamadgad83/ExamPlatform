"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";
import { Save, ArrowRight } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const examSchema = z.object({
  title: z.string().min(3, "عنوان الاختبار مطلوب"),
  duration_minutes: z.number().min(5).max(300),
  passing_score: z.number().min(0).max(100),
  exam_type: z.enum(["free", "paid"]),
  exam_price: z.number().min(0),
  is_published: z.boolean(),
});

type ExamForm = z.infer<typeof examSchema>;

export default function TeacherEditExamPage() {
  const router = useRouter();
  const params = useParams();
  const examId = params.examId as string;
  const queryClient = useQueryClient();
  const supabase = createClient();
  const [error, setError] = useState("");

  const { data: exam, isLoading } = useQuery({
    queryKey: ["exam", examId],
    queryFn: async () => {
      const { data, error } = await supabase.from("exam_exams").select("*").eq("id", examId).single();
      if (error) throw error;
      return data;
    },
  });

  const form = useForm<ExamForm>({
    resolver: zodResolver(examSchema),
    values: exam || {},
  });

  const updateMutation = useMutation({
    mutationFn: async (values: ExamForm) => {
      const { error } = await supabase.from("exam_exams").update(values).eq("id", examId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teacher-exams"] });
      router.push("/teacher/exams");
    },
    onError: (err: any) => setError(err.message),
  });

  if (isLoading) return <div className="text-center py-12">جاري التحميل...</div>;

  return (
    <div className="space-y-6 max-w-2xl mx-auto" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">تعديل الاختبار</h1>
          <p className="text-muted-foreground">تعديل بيانات الاختبار</p>
        </div>
        <Button variant="outline" onClick={() => router.push("/teacher/exams")}>
          <ArrowRight className="ml-2 h-4 w-4" />رجوع
        </Button>
      </div>

      {error && <Alert variant="destructive"><p>{error}</p></Alert>}

      <Card>
        <CardContent className="p-6 space-y-4">
          <form onSubmit={form.handleSubmit((v) => updateMutation.mutate(v))} className="space-y-4">
            <div><label className="text-sm font-medium">عنوان الاختبار</label><Input {...form.register("title")} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="text-sm font-medium">المدة (دقيقة)</label><Input type="number" {...form.register("duration_minutes", { valueAsNumber: true })} /></div>
              <div><label className="text-sm font-medium">درجة النجاح (%)</label><Input type="number" {...form.register("passing_score", { valueAsNumber: true })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">نوع الاختبار</label>
                <select {...form.register("exam_type")} className="w-full mt-1 p-2 border rounded-md">
                  <option value="free">مجاني</option>
                  <option value="paid">مدفوع</option>
                </select>
              </div>
              <div><label className="text-sm font-medium">السعر</label><Input type="number" {...form.register("exam_price", { valueAsNumber: true })} /></div>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" {...form.register("is_published")} id="published" />
              <label htmlFor="published" className="text-sm">نشر الاختبار</label>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => router.push("/teacher/exams")}>إلغاء</Button>
              <Button type="submit" disabled={updateMutation.isPending}>
                <Save className="ml-2 h-4 w-4" />{updateMutation.isPending ? "جاري الحفظ..." : "حفظ التعديلات"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
