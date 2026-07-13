import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Users, 
  FileText, 
  GraduationCap, 
  Shield,
  ArrowLeft
} from "lucide-react";
import Link from "next/link";
import { formatNumber } from "@/lib/utils/format";

export default async function AdminDashboardPage() {
  const supabase = createClient();

  // Stats
  const { data: profiles } = await supabase.from("exam_users").select("role");
  const { data: exams } = await supabase.from("exam_exams").select("id");
  const { data: attempts } = await supabase.from("exam_attempts").select("id");
  const { data: questions } = await supabase.from("exam_questions_bank").select("id");

  const students = profiles?.filter(p => p.role === "student").length || 0;
  const teachers = profiles?.filter(p => p.role === "teacher").length || 0;
  const admins = profiles?.filter(p => p.role === "admin").length || 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">لوحة تحكم المدير</h1>
        <p className="text-muted-foreground">نظرة عامة على النظام والمستخدمين</p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي المستخدمين</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(profiles?.length || 0)}</div>
            <div className="flex gap-2 mt-2">
              <Badge variant="secondary" className="text-xs">{students} طالب</Badge>
              <Badge variant="secondary" className="text-xs">{teachers} معلم</Badge>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">الاختبارات</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(exams?.length || 0)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">التسليمات</CardTitle>
            <GraduationCap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(attempts?.length || 0)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">الأسئلة</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(questions?.length || 0)}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>⚡ إجراءات سريعة</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-3">
            <Link href="/admin/users">
              <div className="flex items-center gap-3 p-4 rounded-lg border hover:bg-primary/5 hover:border-primary transition-all cursor-pointer">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Users className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">إدارة المستخدمين</p>
                  <p className="text-sm text-muted-foreground">عرض وتعديل صلاحيات المستخدمين</p>
                </div>
              </div>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}