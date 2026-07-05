"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, 
  Trash2, 
  GripVertical,
  Save,
  Loader2,
  ArrowLeft,
  Clock,
  CheckCircle
} from "lucide-react";
import Link from "next/link";

interface Question {
  id: number;
  text: string;
  type: string;
  points: number | null;
  options: string | null;
  correct_answer: string | null;
}

interface Group {
  id: number;
  name: string;
}

export default function CreateExamPage() {
  const router = useRouter();
  const supabase = createClient();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [duration, setDuration] = useState(60);
  const [passingScore, setPassingScore] = useState(60);
  const [selectedQuestions, setSelectedQuestions] = useState<Question[]>([]);
  const [availableQuestions, setAvailableQuestions] = useState<Question[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroups, setSelectedGroups] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: teacher } = await supabase
      .from("exam_teachers")
      .select("id")
      .eq("username", user.email)
      .single();

    const teacherId = teacher?.id;

    const { data: questions } = await supabase
      .from("exam_questions_bank")
      .select("*")
      .eq("teacher_id", teacherId)
      .order("created_at", { ascending: false });

    setAvailableQuestions(questions || []);

    const { data: groupsData } = await supabase
      .from("exam_groups")
      .select("id, name")
      .eq("teacher_id", teacherId);

    setGroups(groupsData || []);
    setLoading(false);
  }

  function addQuestion(question: Question) {
    if (!selectedQuestions.find(q => q.id === question.id)) {
      setSelectedQuestions(prev => [...prev, { ...question, points: question.points || 1 }]);
    }
  }

  function removeQuestion(questionId: number) {
    setSelectedQuestions(prev => prev.filter(q => q.id !== questionId));
  }

  function updateQuestionPoints(questionId: number, points: number) {
    setSelectedQuestions(prev => 
      prev.map(q => q.id === questionId ? { ...q, points } : q)
    );
  }

  async function handleSave() {
    if (!title.trim()) {
      setError("عنوان الاختبار مطلوب");
      return;
    }
    if (selectedQuestions.length === 0) {
      setError("يجب اختيار سؤال واحد على الأقل");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: teacher } = await supabase
        .from("exam_teachers")
        .select("id")
        .eq("username", user?.email)
        .single();

      const totalPoints = selectedQuestions.reduce((sum, q) => sum + (q.points || 1), 0);

      const { data: exam, error: examError } = await supabase
        .from("exam_exams")
        .insert({
          title,
          description,
          duration_minutes: duration,
          passing_score: passingScore,
          total_points: totalPoints,
          teacher_id: teacher?.id,
          is_published: false,
          status: "draft",
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (examError) throw examError;

      const examQuestions = selectedQuestions.map((q, idx) => ({
        exam_id: exam.id,
        question_id: q.id,
        points: q.points || 1,
        order_num: idx + 1,
        created_at: new Date().toISOString(),
      }));

      await supabase.from("exam_exam_questions").insert(examQuestions);

      if (selectedGroups.length > 0) {
        const groupAssignments = selectedGroups.map(groupId => ({
          exam_id: exam.id,
          group_id: groupId,
          created_at: new Date().toISOString(),
        }));
        await supabase.from("exam_enrollments").insert(groupAssignments);
      }

      router.push("/teacher/exams");
    } catch (err: any) {
      setError(err.message || "حدث خطأ أثناء حفظ الاختبار");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const totalPoints = selectedQuestions.reduce((sum, q) => sum + (q.points || 1), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">إنشاء اختبار جديد</h1>
          <p className="text-muted-foreground">اختر الأسئلة وحدد الإعدادات</p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/teacher/exams">
            <ArrowLeft className="w-4 h-4 ml-2" />
            العودة
          </Link>
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>إعدادات الاختبار</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">عنوان الاختبار</label>
                <Input
                  placeholder="مثال: اختبار نصف العام - الرياضيات"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">الوصف</label>
                <textarea
                  className="w-full min-h-[80px] p-3 rounded-lg border border-input focus:border-primary focus:outline-none resize-none"
                  placeholder="وصف الاختبار..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    المدة (دقيقة)
                  </label>
                  <Input type="number" min={5} max={180} value={duration}
                    onChange={(e) => setDuration(Number(e.target.value))} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">درجة النجاح (%)</label>
                  <Input type="number" min={0} max={100} value={passingScore}
                    onChange={(e) => setPassingScore(Number(e.target.value))} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>الأسئلة المختارة ({selectedQuestions.length})</span>
                <span className="text-sm font-normal text-muted-foreground">
                  إجمالي النقاط: {totalPoints}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {selectedQuestions.length > 0 ? (
                <div className="space-y-3">
                  {selectedQuestions.map((q, idx) => (
                    <div key={q.id} className="flex items-center gap-3 p-3 rounded-lg border">
                      <GripVertical className="w-4 h-4 text-muted-foreground cursor-move" />
                      <span className="text-sm text-muted-foreground w-6">{idx + 1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate">{q.text}</p>
                        <p className="text-xs text-muted-foreground">{q.type}</p>
                      </div>
                      <Input type="number" min={1} max={100} value={q.points || 1}
                        onChange={(e) => updateQuestionPoints(q.id, Number(e.target.value))}
                        className="w-20 text-center" />
                      <Button variant="ghost" size="icon" onClick={() => removeQuestion(q.id)}
                        className="text-destructive hover:text-destructive">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">
                  اختر أسئلة من القائمة على اليمين
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>المجموعات المستهدفة</CardTitle>
              <CardDescription>اختر المجموعات التي ستأخذ الاختبار</CardDescription>
            </CardHeader>
            <CardContent>
              {groups.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {groups.map((group) => (
                    <button key={group.id} onClick={() => {
                      setSelectedGroups(prev => prev.includes(group.id)
                        ? prev.filter(id => id !== group.id)
                        : [...prev, group.id]);
                    }}
                    className={`px-4 py-2 rounded-lg border-2 transition-all ${
                      selectedGroups.includes(group.id)
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-border hover:border-primary/50"
                    }`}>
                      {group.name}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">لا توجد مجموعات</p>
              )}
            </CardContent>
          </Card>

          <Button className="w-full" size="lg" onClick={handleSave} disabled={saving}>
            {saving ? (
              <><Loader2 className="w-4 h-4 ml-2 animate-spin" />جاري الحفظ...</>
            ) : (
              <><Save className="w-4 h-4 ml-2" />حفظ الاختبار</>
            )}
          </Button>
        </div>

        <Card className="h-fit sticky top-20">
          <CardHeader>
            <CardTitle>بنك الأسئلة</CardTitle>
            <CardDescription>اختر الأسئلة لإضافتها للاختبار</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {availableQuestions.map((question) => {
                const isSelected = selectedQuestions.find(q => q.id === question.id);
                return (
                  <div key={question.id}
                    className={`p-3 rounded-lg border cursor-pointer transition-all ${
                      isSelected ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                    }`}
                    onClick={() => !isSelected && addQuestion(question)}>
                    <div className="flex items-start gap-2">
                      {isSelected ? (
                        <CheckCircle className="w-4 h-4 text-primary mt-0.5" />
                      ) : (
                        <Plus className="w-4 h-4 text-muted-foreground mt-0.5" />
                      )}
                      <div className="flex-1">
                        <p className="text-sm line-clamp-2">{question.text}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="secondary" className="text-xs">{question.type}</Badge>
                          <span className="text-xs text-muted-foreground">{question.points || 1} نقطة</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
