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

  // ✅ جلب المستخدم من الـ API بدل Supabase مباشرة
  const loadProfile = useCallback(async (): Promise<User | null> => {
    try {
      const response = await fetch('/api/auth/me');
      if (!response.ok) return null;
      const data = await response.json();
      return data.user || null;
    } catch {
      return null;
    }
  }, []);

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

  // ✅ تسجيل الدخول باستخدام الـ API
  const login = useCallback(
    async (username: string, password: string, adminPortal: boolean): Promise<LoginResult> => {
      setState((prev) => ({ ...prev, isLoading: true }));

      try {
        const response = await fetch('/api/auth/verify-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password }),
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
          setState({ user: null, isLoading: false, isAuthenticated: false });
          return { success: false, error: data.error || "اسم المستخدم أو كلمة المرور غير صحيحة" };
        }

        const user = data.user;

        // التحقق من الصلاحية للأدمن
        const isAdmin = user.role === "admin";
        if (isAdmin !== adminPortal) {
          setState({ user: null, isLoading: false, isAuthenticated: false });
          return { success: false, error: "اسم المستخدم أو كلمة المرور غير صحيحة" };
        }

        // محاولة إنشاء جلسة في Supabase Auth (اختياري)
        try {
          const email = `${username}@exam.com`;
          await supabase.auth.signInWithPassword({ email, password });
        } catch {
          // تجاهل - المهم إننا سجلنا دخول من exam_users
        }

        setState({
          user: user,
          isLoading: false,
          isAuthenticated: true,
        });

        return { success: true, user };

      } catch (error) {
        console.error("❌ خطأ في تسجيل الدخول:", error);
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
