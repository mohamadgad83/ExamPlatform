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

  // جلب المستخدم من الجلسة
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

  // التحقق من الجلسة
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

  // ✅ تسجيل الدخول من جدول exam_users مباشرة
  const login = useCallback(
    async (username: string, password: string, adminPortal: boolean): Promise<LoginResult> => {
      setState((prev) => ({ ...prev, isLoading: true }));

      try {
        console.log("🔍 البحث عن المستخدم:", username);

        // 1. البحث في جدول exam_users
        const { data: user, error } = await supabase
          .from("exam_users")
          .select("id, username, name, role, status, password")
          .eq("username", username)
          .single();

        if (error || !user) {
          console.error("❌ المستخدم غير موجود");
          setState({ user: null, isLoading: false, isAuthenticated: false });
          return { success: false, error: "اسم المستخدم أو كلمة المرور غير صحيحة" };
        }

        // 2. التحقق من كلمة المرور
        if (user.password !== password) {
          console.error("❌ كلمة المرور غلط");
          setState({ user: null, isLoading: false, isAuthenticated: false });
          return { success: false, error: "اسم المستخدم أو كلمة المرور غير صحيحة" };
        }

        // 3. التحقق من الحالة
        if (user.status === "suspended") {
          setState({ user: null, isLoading: false, isAuthenticated: false });
          return { success: false, error: "الحساب موقوف" };
        }

        // 4. التحقق من الصلاحية للأدمن
        const isAdmin = user.role === "admin";
        if (isAdmin !== adminPortal) {
          setState({ user: null, isLoading: false, isAuthenticated: false });
          return { success: false, error: "اسم المستخدم أو كلمة المرور غير صحيحة" };
        }

        // 5. حفظ المستخدم في الحالة (نحذف الباسورد)
        const { password: _, ...userWithoutPassword } = user;
        setState({
          user: userWithoutPassword as User,
          isLoading: false,
          isAuthenticated: true,
        });

        console.log("✅ تسجيل الدخول ناجح:", user.username);
        return { success: true, user: userWithoutPassword as User };

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