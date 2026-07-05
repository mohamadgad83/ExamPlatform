import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  FileText, 
  Users, 
  ClipboardCheck, 
  TrendingUp,
  ArrowLeft,
  Clock
} from "lucide-react";
import Link from "next/link";
import { formatDate, formatPercentage, formatNumber } from "@/lib/utils/format";

export default async function TeacherDashboardPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  // Get teacher record
  const { data: teacher } = await supabase
    .from("teachers")
    .select("id")
    .eq("user_id", user.id)
    .single();

  const teacherId = teacher?.id;

  // Stats
  const { data: exams } = await supabase
    .from("exams")
    .select("*")
    .eq("teacher_id", teacherId);

  const { data: groups } = await supabase
    .from("groups")
    .select("id")
    .eq("teacher_id", teacherId);

  const groupIds = groups?.map(g => g.id) || [];

  const { data: groupMembers } = await supabase
    .from("group_members")
    .select("student_id")
    .in("group_id", groupIds.length > 0 ? groupIds : [""]);

  const uniqueStudents = new Set(groupMembers?.map(m => m.student_id) || []);

  const { data: submissions } = await supabase
    .from("attempts")
    .select("*, exam:exams(title), student:students(full_name)")
    .in("exam_id", exams?.map(e => e.id) || [""])
    .eq("status", "graded")
    .order("submitted_at", { ascending: false })
    .limit(10);

  const totalSubmissions = submissions?.length || 0;
  const averageScore = totalSubmissions > 0
    ? (submissions?.reduce((acc, s) => acc + (s.percentage || 0), 0) || 0) / totalSubmissions
    : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">لوحة تحكم المعلم</h1>
        <p className="text-muted-foreground">إدارة الاختبارات ومتابعة أداء الطلاب</p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي الاختبارات</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{exams?.length || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي الطلاب</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{uniqueStudents.size}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">التسليمات</CardTitle>
            <ClipboardCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalSubmissions}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">متوسط الأداء</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatPercentage(averageScore)}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Submissions */}
        <Card>
          <CardHeader>
            <CardTitle>📝 أحدث التسليمات</CardTitle>
            <CardDescription>آخر اختبارات تم تسليمها من الطلاب</CardDescription>
          </CardHeader>
          <CardContent>
            {submissions && submissions.length > 0 ? (
              <div className="space-y-3">
                {submissions.map((sub: any) => (
                  <div key={sub.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                    <div className="space-y-1">
                      <p className="font-medium">{sub.student?.full_name}</p>
                      <p className="text-sm text-muted-foreground">{sub.exam?.title}</p>
                    </div>
                    <div className="text-left">
                      <Badge variant={sub.percentage >= 60 ? "success" : "destructive"}>
                        {formatPercentage(sub.percentage || 0)}
                      </Badge>
                      <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDate(sub.submitted_at)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">لا توجد تسليمات بعد</p>
            )}
            <Link 
              href="/teacher/submissions" 
              className="flex items-center gap-1 text-sm text-primary mt-4 hover:underline"
            >
              عرض الكل
              <ArrowLeft className="w-3 h-3" />
            </Link>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>⚡ إجراءات سريعة</CardTitle>
            <CardDescription>أدوات سريعة للوصول المباشر</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3">
              <Link href="/teacher/exams/create">
                <div className="flex items-center gap-3 p-4 rounded-lg border hover:bg-primary/5 hover:border-primary transition-all cursor-pointer">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">إنشاء اختبار جديد</p>
                    <p className="text-sm text-muted-foreground">إعداد اختبار من بنك الأسئلة</p>
                  </div>
                </div>
              </Link>
              <Link href="/teacher/questions">
                <div className="flex items-center gap-3 p-4 rounded-lg border hover:bg-primary/5 hover:border-primary transition-all cursor-pointer">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <ClipboardCheck className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">إضافة سؤال جديد</p>
                    <p className="text-sm text-muted-foreground">إضافة سؤال إلى بنك الأسئلة</p>
                  </div>
                </div>
              </Link>
              <Link href="/teacher/groups">
                <div className="flex items-center gap-3 p-4 rounded-lg border hover:bg-primary/5 hover:border-primary transition-all cursor-pointer">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Users className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">إدارة المجموعات</p>
                    <p className="text-sm text-muted-foreground">تنظيم الطلاب في مجموعات</p>
                  </div>
                </div>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}