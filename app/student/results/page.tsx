"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Trophy, 
  Clock, 
  CheckCircle, 
  XCircle,
  ArrowLeft,
  Loader2,
  FileText
} from "lucide-react";
import Link from "next/link";
import { formatDate, formatPercentage, getScoreColor, getScoreLabel } from "@/lib/utils/format";

interface Attempt {
  id: number;
  exam_id: number;
  score: number | null;
  total_points: number | null;
  percentage: number | null;
  status: string;
  submitted_at: string | null;
  created_at: string;
  time_spent_seconds: number | null;
  exam: {
    title: string;
    duration_minutes: number | null;
  };
}

export default function StudentResultsPage() {
  const supabase = createClient();
  const searchParams = useSearchParams();
  const examFilter = searchParams.get("exam");

  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadResults();
  }, []);

  async function loadResults() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: student } = await supabase
      .from("exam_students")
      .select("id")
      .eq("id", user.id)
      .single();

    const studentId = student?.id;

    let query = supabase
      .from("exam_attempts")
      .select(`
        *,
        exam:exam_exams(title, duration_minutes)
      `)
      .eq("student_id", studentId)
      .in("status", ["submitted", "graded"])
      .order("submitted_at", { ascending: false });

    if (examFilter) {
      query = query.eq("exam_id", examFilter);
    }

    const { data } = await query;
    setAttempts(data || []);
    setLoading(false);
  }

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
        <h1 className="text-3xl font-bold tracking-tight">النتائج</h1>
        <p className="text-muted-foreground">نتائج اختباراتك السابقة</p>
      </div>

      {attempts.length > 0 ? (
        <div className="space-y-4">
          {attempts.map((attempt) => {
            const percentage = attempt.percentage || 0;
            const scoreColor = getScoreColor(percentage);
            const scoreLabel = getScoreLabel(percentage);

            return (
              <Card key={attempt.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <h3 className="text-xl font-bold">{attempt.exam?.title}</h3>
                        <Badge variant={percentage >= 60 ? "success" : "destructive"}>
                          {scoreLabel}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {attempt.submitted_at ? formatDate(attempt.submitted_at) : "غير محدد"}
                        </span>
                        {attempt.time_spent_seconds && (
                          <span>
                            وقت الإجابة: {Math.floor(attempt.time_spent_seconds / 60)} دقيقة
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                      <div className="text-center">
                        <div className={`text-3xl font-bold ${scoreColor.split(" ")[0]}`}>
                          {formatPercentage(percentage)}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {attempt.score} / {attempt.total_points} نقطة
                        </div>
                      </div>

                      <div className="w-16 h-16 relative">
                        <svg className="w-16 h-16 transform -rotate-90">
                          <circle
                            cx="32"
                            cy="32"
                            r="28"
                            fill="none"
                            stroke="hsl(var(--muted))"
                            strokeWidth="4"
                          />
                          <circle
                            cx="32"
                            cy="32"
                            r="28"
                            fill="none"
                            stroke={percentage >= 60 ? "hsl(142, 76%, 36%)" : "hsl(0, 84%, 60%)"}
                            strokeWidth="4"
                            strokeDasharray={`${(percentage / 100) * 175.9} 175.9`}
                            strokeLinecap="round"
                          />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          {percentage >= 60 ? (
                            <CheckCircle className="w-6 h-6 text-emerald-600" />
                          ) : (
                            <XCircle className="w-6 h-6 text-red-500" />
                          )}
                        </div>
                      </div>
                    </div>
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
            <p className="text-muted-foreground">لم تكمل أي اختبار بعد</p>
            <Button asChild className="mt-4">
              <Link href="/student/exams">
                <ArrowLeft className="w-4 h-4 ml-2" />
                تصفح الاختبارات
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
