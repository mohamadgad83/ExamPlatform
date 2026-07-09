"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";
import type { UserRole } from "@/types";
import {
  LayoutDashboard,
  FileText,
  ClipboardList,
  GraduationCap,
  Users,
  Settings,
  HelpCircle,
  BarChart3,
  BookOpen,
  Library,
  MessageSquare,
  Shield,
} from "lucide-react";

interface SidebarProps {
  role: UserRole;
}

const navigation: Record<UserRole, Array<{ name: string; href: string; icon: React.ElementType }>> = {
  student: [
    { name: "لوحة التحكم", href: "/student/dashboard", icon: LayoutDashboard },
    { name: "الاختبارات", href: "/student/exams", icon: FileText },
    { name: "النتائج", href: "/student/results", icon: BarChart3 },
    { name: "الملف الشخصي", href: "/student/profile", icon: Settings },
  ],
  teacher: [
    { name: "لوحة التحكم", href: "/teacher/dashboard", icon: LayoutDashboard },
    { name: "الاختبارات", href: "/teacher/exams", icon: FileText },
    { name: "بنك الأسئلة", href: "/teacher/questions", icon: Library },
    { name: "المجموعات", href: "/teacher/groups", icon: Users },
    { name: "الطلاب", href: "/teacher/students", icon: GraduationCap },
    { name: "التسليمات", href: "/teacher/submissions", icon: ClipboardList },
  ],
  admin: [
    { name: "لوحة التحكم", href: "/admin/dashboard", icon: LayoutDashboard },
    { name: "المستخدمين", href: "/admin/users", icon: Shield },
    { name: "الإعدادات", href: "/admin/settings", icon: Settings },
  ],
};

export default function Sidebar({ role }: SidebarProps) {
  const pathname = usePathname();
  const items = navigation[role] || [];

  return (
    <aside className="w-64 hidden lg:flex flex-col border-l bg-background h-[calc(100vh-3.5rem)] sticky top-14">
      <div className="flex-1 py-4 px-3 space-y-1">
        {items.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <item.icon className="w-4 h-4" />
              {item.name}
            </Link>
          );
        })}
      </div>
      <div className="p-4 border-t">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <HelpCircle className="w-3 h-3" />
          <span>هل تحتاج مساعدة؟</span>
        </div>
      </div>
    </aside>
  );
}