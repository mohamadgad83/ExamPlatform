"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { BookOpen, LogOut, User } from "lucide-react";
import { useEffect, useState } from "react";

interface NavbarProfile {
  name: string;
  username: string;
  role: "admin" | "teacher" | "student";
}

export default function Navbar() {
  const router = useRouter();
  const supabase = createClient();
  const [profile, setProfile] = useState<NavbarProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadProfile() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from("exam_users")
          .select("name, username, role")
          .eq("id", user.id)
          .maybeSingle();
        if (data) setProfile(data as NavbarProfile);
      }
      setLoading(false);
    }
    loadProfile();
  }, [supabase]);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  if (loading) return null;

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-bold text-xl">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <BookOpen className="w-4 h-4 text-primary-foreground" />
          </div>
          <span>منصة الاختبارات</span>
        </Link>

        <div className="flex items-center gap-4">
          {profile ? (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-sm">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="w-4 h-4 text-primary" />
                </div>
                <div className="hidden md:block">
                  <p className="font-medium">{profile.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {profile.role === "student" ? "طالب" : profile.role === "teacher" ? "معلم" : "مدير"}
                  </p>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={handleSignOut} title="تسجيل الخروج">
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Button variant="ghost" asChild>
                <Link href="/login">تسجيل الدخول</Link>
              </Button>
              <Button asChild>
                <Link href="/register">إنشاء حساب</Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}