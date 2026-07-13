import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/types";

interface RoleGuardProps {
  children: React.ReactNode;
  allowedRoles: UserRole[];
}

export default async function RoleGuard({ children, allowedRoles }: RoleGuardProps) {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // ✅ الجدول الصح exam_users مش profiles (كان بيرجع null دايمًا وكل حد
  // بيتعامل معاه كـ "student" بغض النظر عن دوره الحقيقي)
  const { data: profile } = await supabase
    .from("exam_users")
    .select("role, status")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || profile.status === "suspended") {
    redirect("/login");
  }

  const userRole = profile.role as UserRole;

  if (!allowedRoles.includes(userRole)) {
    redirect("/unauthorized");
  }

  return <>{children}</>;
}
