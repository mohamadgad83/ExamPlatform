"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { Plus, Search, Edit, Trash2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const questionSchema = z.object({
  text: z.string().min(5, "نص السؤال مطلوب"),
  type: z.enum(["multiple_choice", "true_false", "essay"]),
  subject: z.string().min(1, "المادة مطلوبة"),
  difficulty: z.enum(["easy", "medium", "hard"]),
  points: z.number().min(1).max(100),
  options: z.string().optional(),
  correct_answer: z.string().min(1, "الإجابة الصحيحة مطلوبة"),
  is_multi_select: z.boolean().default(false),
  model_answer: z.string().optional(),
});

type QuestionForm = z.infer<typeof questionSchema>;

interface Question {
  id: string;
  text: string;
  type: string;
  subject: string;
  difficulty: string;
  points: number;
  created_at: string;
}

export default function TeacherQuestionsPage() {
  const queryClient = useQueryClient();
  const supabase = createClient();
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterDifficulty, setFilterDifficulty] = useState<string>("all");
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [error, setError] = useState("");

  const { data: questions, isLoading } = useQuery({
    queryKey: ["questions-bank", search, filterType, filterDifficulty],
    queryFn: async () => {
      let query = supabase.from("exam_questions_bank").select("*").order("created_at", { ascending: false });
      if (search) query = query.ilike("text", `%${search}%`);
      if (filterType !== "all") query = query.eq("type", filterType);
      if (filterDifficulty !== "all") query = query.eq("difficulty", filterDifficulty);
      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as Question[];
    },
  });

  const form = useForm<QuestionForm>({
    resolver: zodResolver(questionSchema),
    defaultValues: {
      type: "multiple_choice",
      difficulty: "medium",
      points: 1,
      is_multi_select: false,
    },
  });

  const createMutation = useMutation({
    mutationFn: async (values: QuestionForm) => {
      const payload = {
        ...values,
        options: values.options ? JSON.parse(values.options) : null,
      };
      const { error } = await supabase.from("exam_questions_bank").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["questions-bank"] });
      setIsDialogOpen(false);
      form.reset();
    },
    onError: (err: any) => setError(err.message),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, values }: { id: string; values: QuestionForm }) => {
      const payload = {
        ...values,
        options: values.options ? JSON.parse(values.options) : null,
      };
      const { error } = await supabase.from("exam_questions_bank").update(payload).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["questions-bank"] });
      setIsDialogOpen(false);
      setEditingQuestion(null);
      form.reset();
    },
    onError: (err: any) => setError(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("exam_questions_bank").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["questions-bank"] }),
  });

  const onSubmit = (values: QuestionForm) => {
    setError("");
    if (editingQuestion) {
      updateMutation.mutate({ id: editingQuestion.id, values });
    } else {
      createMutation.mutate(values);
    }
  };

  const openEdit = (q: Question) => {
    setEditingQuestion(q);
    form.reset(q as any);
    setIsDialogOpen(true);
  };

  const getDifficultyBadge = (d: string) => {
    const colors: Record<string, string> = {
      easy: "bg-green-100 text-green-800",
      medium: "bg-yellow-100 text-yellow-800",
      hard: "bg-red-100 text-red-800",
    };
    return <Badge className={colors[d] || ""}>{d === "easy" ? "سهل" : d === "medium" ? "متوسط" : "صعب"}</Badge>;
  };

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">بنك الأسئلة</h1>
          <p className="text-muted-foreground">إدارة أسئلة الاختبارات وبنك الأسئلة العام</p>
        </div>
        <Button onClick={() => { setEditingQuestion(null); form.reset(); setIsDialogOpen(true); }}>
          <Plus className="ml-2 h-4 w-4" />
          سؤال جديد
        </Button>
      </div>

      {isDialogOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
            <h2 className="text-xl font-bold mb-4">{editingQuestion ? "تعديل سؤال" : "إضافة سؤال جديد"}</h2>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {error && <Alert variant="destructive"><p>{error}</p></Alert>}
              <div>
                <label className="text-sm font-medium">نص السؤال</label>
                <textarea
                  {...form.register("text")}
                  className="w-full mt-1 p-2 border rounded-md min-h-[80px]"
                  placeholder="اكتب نص السؤال هنا..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">نوع السؤال</label>
                  <select {...form.register("type")} className="w-full mt-1 p-2 border rounded-md">
                    <option value="multiple_choice">اختيار من متعدد</option>
                    <option value="true_false">صح/خطأ</option>
                    <option value="essay">مقالي</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium">الصعوبة</label>
                  <select {...form.register("difficulty")} className="w-full mt-1 p-2 border rounded-md">
                    <option value="easy">سهل</option>
                    <option value="medium">متوسط</option>
                    <option value="hard">صعب</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">المادة</label>
                  <Input {...form.register("subject")} placeholder="مثال: الرياضيات" />
                </div>
                <div>
                  <label className="text-sm font-medium">النقاط</label>
                  <Input type="number" {...form.register("points", { valueAsNumber: true })} />
                </div>
              </div>
              {form.watch("type") === "multiple_choice" && (
                <>
                  <div>
                    <label className="text-sm font-medium">الخيارات (JSON)</label>
                    <textarea
                      {...form.register("options")}
                      className="w-full mt-1 p-2 border rounded-md font-mono text-xs"
                      placeholder='["أ","ب","ج","د"]'
                      rows={3}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="checkbox" {...form.register("is_multi_select")} id="multi" />
                    <label htmlFor="multi" className="text-sm">إجابة متعددة</label>
                  </div>
                </>
              )}
              <div>
                <label className="text-sm font-medium">الإجابة الصحيحة</label>
                <Input {...form.register("correct_answer")} placeholder="الإجابة الصحيحة" />
              </div>
              <div>
                <label className="text-sm font-medium">الإجابة النموذجية (للأسئلة المقالية)</label>
                <textarea
                  {...form.register("model_answer")}
                  className="w-full mt-1 p-2 border rounded-md min-h-[60px]"
                  placeholder="نموذج الإجابة للتصحيح..."
                />
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>إلغاء</Button>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                  {editingQuestion ? "حفظ التعديلات" : "إضافة السؤال"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="البحث في الأسئلة..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pr-10"
          />
        </div>
        <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="p-2 border rounded-md">
          <option value="all">كل الأنواع</option>
          <option value="multiple_choice">اختيار من متعدد</option>
          <option value="true_false">صح/خطأ</option>
          <option value="essay">مقالي</option>
        </select>
        <select value={filterDifficulty} onChange={(e) => setFilterDifficulty(e.target.value)} className="p-2 border rounded-md">
          <option value="all">كل الصعوبات</option>
          <option value="easy">سهل</option>
          <option value="medium">متوسط</option>
          <option value="hard">صعب</option>
        </select>
      </div>

      {isLoading ? (
        <div className="text-center py-12">جاري التحميل...</div>
      ) : (
        <div className="grid gap-4">
          {questions?.map((q) => (
            <Card key={q.id} className="hover:shadow-sm transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    <p className="font-medium leading-relaxed">{q.text}</p>
                    <div className="flex flex-wrap gap-2 items-center">
                      {getDifficultyBadge(q.difficulty)}
                      <Badge variant="outline">{q.subject}</Badge>
                      <Badge variant="secondary">{q.type === "multiple_choice" ? "اختيار من متعدد" : q.type === "true_false" ? "صح/خطأ" : "مقالي"}</Badge>
                      <span className="text-sm text-muted-foreground">{q.points} نقطة</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(q)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" className="text-red-500" onClick={() => { if (confirm("هل أنت متأكد؟")) deleteMutation.mutate(q.id); }}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
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
