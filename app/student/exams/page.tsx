"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  FileText, 
  Clock, 
  Calendar, 
  Search,
  ArrowLeft,
  Loader2,
  Play,
  CheckCircle
} from "lucide-react";
import Link from "next/link";
import { formatDate, formatDuration } from "@/lib/utils/format";

interface Exam {
  id: number;
  title: string;
  description: string | null;
  duration_minutes: number | null;
  start_time: string | null;
  end_time: string | null;
  is_published: boolean | null;
  exam_type: string | null;
  exam_price: number | null;
  status: string | null;
  subject_id: number | null;
}

interface Attempt {
  id: number;
  exam_id: number;
  status: string;
}

export default function StudentExamsPage() {
  const supabase = createClient();
  const [exams, setExams] = useState<Exam[]>([]);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "available" | "completed">("all");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Get student record
    const { data: student } = await supabase
      .from("exam_students")
      .select("id")
      .eq("id", user.id)
      .single();

    const studentId = student?.id;

    // Get published exams
    const { data: examsData } = await supabase
      .from("exam_exams")
      .select("*")
      .eq("is_published", true)
      .order("created_at", { ascending: false });

    // Get student attempts
    const { data: attemptsData } = await supabase
      .from("exam_attempts")
      .select("id, exam_id, status")
      .eq("student_id", studentId);

    setExams(examsData || []);
    setAttempts(attemptsData || []);
    setLoading(false);
  }

  function getExamStatus(examId: number) {
    const attempt = attempts.find(a => a.exam_id === examId);
    if (!attempt) return "available";
    if (attempt.status === "submitted" || attempt.status === "graded") return "completed";
    return "in_progress";
  }

  const filteredExams = exams.filter(exam => {
    const matchesSearch = exam.title.toLowerCase().includes(search.toLowerCase());
    const status = getExamStatus(exam.id);

    if (filter === "available") return matchesSearch && status === "available";
    if (filter === "completed") return matchesSearch && status === "completed";
    return matchesSearch;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">الاختبارات المتاحة</h1>
        <p className="text-muted-foreground">تصفح الاختبارات وابدأ الامتحان</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="البحث في الاختبارات..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pr-10"
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant={filter === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("all")}
          >
            الكل
          </Button>
          <Button
            variant={filter === "available" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("available")}
          >
            متاحة
          </Button>
          <Button
            variant={filter === "completed" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("completed")}
          >
            مكتملة
          </Button>
        </div>
      </div>

      {/* Exams Grid */}
      {filteredExams.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredExams.map((exam) => {
            const status = getExamStatus(exam.id);
            const isAvailable = status === "available";
            const isCompleted = status === "completed";

            return (
              <Card key={exam.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-lg">{exam.title}</CardTitle>
                      <CardDescription className="line-clamp-2">
                        {exam.description || "لا يوجد وصف"}
                      </CardDescription>
                    </div>
                    <Badge variant={isCompleted ? "success" : isAvailable ? "default" : "secondary"}>
                      {isCompleted ? "مكتمل" : isAvailable ? "متاح" : "قيد التنفيذ"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {exam.duration_minutes ? `${exam.duration_minutes} دقيقة` : "غير محدد"}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {exam.start_time ? formatDate(exam.start_time) : "غير محدد"}
                    </span>
                  </div>

                  {exam.exam_price && exam.exam_price > 0 && (
                    <div className="text-sm">
                      <span className="font-medium">السعر:</span>{" "}
                      <span className="text-primary">{exam.exam_price} ج.م</span>
                    </div>
                  )}

                  <div className="flex gap-2">
                    {isAvailable ? (
                      <Button asChild className="w-full">
                        <Link href={`/student/attempt/${exam.id}`}>
                          <Play className="w-4 h-4 ml-2" />
                          بدء الاختبار
                        </Link>
                      </Button>
                    ) : isCompleted ? (
                      <Button variant="outline" asChild className="w-full">
                        <Link href={`/student/results?exam=${exam.id}`}>
                          <CheckCircle className="w-4 h-4 ml-2" />
                          عرض النتيجة
                        </Link>
                      </Button>
                    ) : (
                      <Button asChild className="w-full">
                        <Link href={`/student/attempt/${exam.id}`}>
                          <Play className="w-4 h-4 ml-2" />
                          متابعة الاختبار
                        </Link>
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">لا توجد اختبارات متاحة حالياً</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
