import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  FileText, 
  CheckCircle, 
  TrendingUp, 
  Trophy,
  Clock,
  ArrowLeft
} from "lucide-react";
import Link from "next/link";
import { formatDate, formatPercentage, formatDuration, getScoreColor, getScoreLabel } from "@/lib/utils/format";

export default async function StudentDashboardPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  // Get student record
  const { data: student } = await supabase
    .from("students")
    .select("id")
    .eq("user_id", user.id)
    .single();

  const studentId = student?.id;

  // Stats
  const { data: availableExams } = await supabase
    .from("exams")
    .select("*")
    .eq("is_published", true)
    .gte("end_time", new Date().toISOString());

  const { data: completedAttempts } = await supabase
    .from("attempts")
    .select("*, exam:exams(*)")
    .eq("student_id", studentId)
    .eq("status", "graded")
    .order("created_at", { ascending: false });

  const { data: upcomingExams } = await supabase
    .from("exams")
    .select("*, subject:subjects(name)")
    .eq("is_published", true)
    .gte("start_time", new Date().toISOString())
    .order("start_time", { ascending: true })
    .limit(5);

  const totalCompleted = completedAttempts?.length || 0;
  const averageScore = totalCompleted > 0
    ? (completedAttempts?.reduce((acc, a) => acc + (a.percentage || 0), 0) || 0) / totalCompleted
    : 0;
  const bestScore = totalCompleted > 0
    ? Math.max(...(completedAttempts?.map(a => a.percentage || 0) || [0]))
    : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">لوحة تحكم الطالب</h1>
        <p className="text-muted-foreground">نظرة عامة على أدائك والاختبارات المتاحة</p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">الاختبارات المتاحة</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{availableExams?.length || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">اختبارات مكتملة</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCompleted}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">المتوسط العام</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatPercentage(averageScore)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">أفضل نتيجة</CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatPercentage(bestScore)}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Upcoming Exams */}
        <Card>
          <CardHeader>
            <CardTitle>⏰ اختبارات قادمة</CardTitle>
            <CardDescription>الاختبارات المقررة في الفترة القادمة</CardDescription>
          </CardHeader>
          <CardContent>
            {upcomingExams && upcomingExams.length > 0 ? (
              <div className="space-y-3">
                {upcomingExams.map((exam: any) => (
                  <div key={exam.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                    <div className="space-y-1">
                      <p className="font-medium">{exam.title}</p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>{exam.subject?.name}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDuration(exam.duration_minutes)}
                        </span>
                      </div>
                    </div>
                    <Badge variant="outline">{formatDate(exam.start_time)}</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">لا توجد اختبارات قادمة</p>
            )}
            <Link 
              href="/student/exams" 
              className="flex items-center gap-1 text-sm text-primary mt-4 hover:underline"
            >
              عرض الكل
              <ArrowLeft className="w-3 h-3" />
            </Link>
          </CardContent>
        </Card>

        {/* Recent Results */}
        <Card>
          <CardHeader>
            <CardTitle>📈 أحدث النتائج</CardTitle>
            <CardDescription>نتائج اختباراتك الأخيرة</CardDescription>
          </CardHeader>
          <CardContent>
            {completedAttempts && completedAttempts.length > 0 ? (
              <div className="space-y-3">
                {completedAttempts.slice(0, 5).map((attempt: any) => (
                  <div key={attempt.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                    <div className="space-y-1">
                      <p className="font-medium">{attempt.exam?.title}</p>
                      <p className="text-sm text-muted-foreground">{formatDate(attempt.submitted_at)}</p>
                    </div>
                    <div className="text-left">
                      <Badge variant={attempt.percentage >= 60 ? "success" : "destructive"}>
                        {formatPercentage(attempt.percentage || 0)}
                      </Badge>
                      <p className="text-xs text-muted-foreground mt-1">
                        {getScoreLabel(attempt.percentage || 0)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">لم تكمل أي اختبار بعد</p>
            )}
            <Link 
              href="/student/results" 
              className="flex items-center gap-1 text-sm text-primary mt-4 hover:underline"
            >
              عرض الكل
              <ArrowLeft className="w-3 h-3" />
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}