"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { usernameToSyntheticEmail } from "@/lib/username";

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
  const [state, setState] = useState<AuthState>({ user: null, isLoading: true, isAuthenticated: false });

  const loadProfile = useCallback(async (): Promise<User | null> => {
    const { data: userData } = await supabase
      .from("exam_users")
      .select("id, name, username, role, status")
      .single();
    return (userData as User) ?? null;
  }, [supabase]);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const profile = await loadProfile();
          if (profile) {
            setState({ user: profile, isLoading: false, isAuthenticated: true });
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

  /**
   * تسجيل دخول موحّد باليوزرنيم. لو adminPortal=false (الصفحة العادية) وكان
   * حساب المستخدم أدمن، بيترفض برسالة عامة — الأدمن لازم يدخل من البوابة السرية.
   * ولو adminPortal=true، لازم الحساب يكون أدمن فعلاً وإلا بيترفض برضه.
   */
  const login = useCallback(
    async (username: string, password: string, adminPortal: boolean): Promise<LoginResult> => {
      setState((prev) => ({ ...prev, isLoading: true }));
      const genericError = "اسم المستخدم أو كلمة المرور غير صحيحة";

      try {
        const email = usernameToSyntheticEmail(username);
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

        if (signInError) {
          setState({ user: null, isLoading: false, isAuthenticated: false });
          return { success: false, error: genericError };
        }

        const profile = await loadProfile();

        if (!profile || (profile.status && profile.status === "suspended")) {
          await supabase.auth.signOut();
          setState({ user: null, isLoading: false, isAuthenticated: false });
          return { success: false, error: profile ? "الحساب موقوف. يرجى التواصل مع الإدارة." : genericError };
        }

        const isAdmin = profile.role === "admin";
        if (isAdmin !== adminPortal) {
          // أدمن بيحاول يدخل من الصفحة العادية، أو حساب عادي بيحاول يدخل من بوابة الأدمن
          await supabase.auth.signOut();
          setState({ user: null, isLoading: false, isAuthenticated: false });
          return { success: false, error: genericError };
        }

        setState({ user: profile, isLoading: false, isAuthenticated: true });
        return { success: true, user: profile };
      } catch {
        setState({ user: null, isLoading: false, isAuthenticated: false });
        return { success: false, error: genericError };
      }
    },
    [supabase, loadProfile]
  );

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setState({ user: null, isLoading: false, isAuthenticated: false });
  }, [supabase]);

  return { ...state, login, logout };
}
