"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

interface User {
  id: string;
  name: string;
  username: string;
  role: "admin" | "teacher" | "student";
  status: string;
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

type LoginResult = { success: true; user: User } | { success: false; error: string };

export function useAuth() {
  const supabase = createClient();
  const [state, setState] = useState<AuthState>({
    user: null,
    isLoading: true,
    isAuthenticated: false,
  });

  const loadProfile = useCallback(async (): Promise<User | null> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data } = await supabase
      .from("exam_users")
      .select("id, name, username, role, status")
      .eq("id", user.id)
      .single();

    return data as User | null;
  }, [supabase]);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const profile = await loadProfile();
          if (profile) {
            setState({
              user: profile,
              isLoading: false,
              isAuthenticated: true,
            });
            return;
          }
        }
        setState({ user: null, isLoading: false, isAuthenticated: false });
      } catch {
        setState({ user: null, isLoading: false, isAuthenticated: false });
      }
    };
    checkAuth();
  }, [supabase, loadProfile]);

  // ✅ تسجيل الدخول من جدول exam_users
  const login = useCallback(
    async (username: string, password: string, adminPortal: boolean): Promise<LoginResult> => {
      setState((prev) => ({ ...prev, isLoading: true }));

      try {
        console.log("🔍 البحث عن المستخدم:", username);

        // 1. جلب المستخدم من exam_users (من غير password)
        const { data: user, error } = await supabase
          .from("exam_users")
          .select("id, username, name, role, status")
          .eq("username", username)
          .single();

        if (error || !user) {
          console.error("❌ المستخدم غير موجود");
          setState({ user: null, isLoading: false, isAuthenticated: false });
          return { success: false, error: "اسم المستخدم أو كلمة المرور غير صحيحة" };
        }

        // 2. التحقق من الحالة
        if (user.status === "suspended") {
          setState({ user: null, isLoading: false, isAuthenticated: false });
          return { success: false, error: "الحساب موقوف" };
        }

        // 3. التحقق من الصلاحية للأدمن
        const isAdmin = user.role === "admin";
        if (isAdmin !== adminPortal) {
          setState({ user: null, isLoading: false, isAuthenticated: false });
          return { success: false, error: "اسم المستخدم أو كلمة المرور غير صحيحة" };
        }

        // 4. ✅ التحقق من كلمة المرور عن طريق API (آمن)
        const response = await fetch("/api/auth/verify-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, password }),
        });

        const verifyResult = await response.json();

        if (!response.ok || !verifyResult.success) {
          console.error("❌ كلمة المرور غير صحيحة");
          setState({ user: null, isLoading: false, isAuthenticated: false });
          return { success: false, error: "اسم المستخدم أو كلمة المرور غير صحيحة" };
        }

        // 5. حفظ المستخدم
        setState({
          user: user as User,
          isLoading: false,
          isAuthenticated: true,
        });

        console.log("✅ تسجيل الدخول ناجح:", user.username);
        return { success: true, user: user as User };

      } catch (error) {
        console.error("❌ خطأ:", error);
        setState({ user: null, isLoading: false, isAuthenticated: false });
        return { success: false, error: "حدث خطأ أثناء تسجيل الدخول" };
      }
    },
    [supabase]
  );

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setState({ user: null, isLoading: false, isAuthenticated: false });
  }, [supabase]);

  return { ...state, login, logout };
}
