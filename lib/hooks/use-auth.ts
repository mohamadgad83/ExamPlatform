"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface User {
  id: string;
  name: string;
  email?: string;
  role: "admin" | "teacher" | "student";
  status: string;
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

export function useAuth() {
  const router = useRouter();
  const supabase = createClient();
  const [state, setState] = useState<AuthState>({ user: null, isLoading: true, isAuthenticated: false });

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const stored = localStorage.getItem("exam_auth");
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed.expiresAt && parsed.expiresAt > Date.now()) { setState({ user: parsed.user, isLoading: false, isAuthenticated: true }); return; }
          else { localStorage.removeItem("exam_auth"); }
        }
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const { data: userData } = await supabase.from("exam_users").select("*").eq("id", session.user.id).single();
          if (userData) {
            const user: User = { id: userData.id, name: userData.name || userData.email, email: userData.email, role: userData.role, status: userData.status };
            setState({ user, isLoading: false, isAuthenticated: true });
            localStorage.setItem("exam_auth", JSON.stringify({ user, expiresAt: Date.now() + 24 * 60 * 60 * 1000 }));
          } else { setState({ user: null, isLoading: false, isAuthenticated: false }); }
        } else { setState({ user: null, isLoading: false, isAuthenticated: false }); }
      } catch { setState({ user: null, isLoading: false, isAuthenticated: false }); }
    };
    checkAuth();
  }, [supabase]);

  const login = useCallback(async (identifier: string, password: string, role: "teacher" | "student" | "admin") => {
    setState((prev) => ({ ...prev, isLoading: true }));
    try {
      const { data: userData } = await supabase.from("exam_users").select("*").eq("email", identifier).eq("role", role).single();
      if (userData && userData.password_hash === password) {
        const user: User = { id: userData.id, name: userData.name || userData.email, email: userData.email, role: userData.role, status: userData.status };
        if (user.status === "suspended") throw new Error("الحساب موقوف. يرجى التواصل مع الإدارة.");
        localStorage.setItem("exam_auth", JSON.stringify({ user, expiresAt: Date.now() + 24 * 60 * 60 * 1000 }));
        setState({ user, isLoading: false, isAuthenticated: true });
        return { success: true, user };
      }
      if (role === "teacher") {
        const { data: teacher } = await supabase.from("exam_teachers").select("*").eq("username", identifier).single();
        if (teacher && teacher.password === password) {
          const user: User = { id: teacher.id, name: teacher.username, role: "teacher", status: "active" };
          localStorage.setItem("exam_auth", JSON.stringify({ user, expiresAt: Date.now() + 24 * 60 * 60 * 1000 }));
          setState({ user, isLoading: false, isAuthenticated: true });
          return { success: true, user };
        }
      } else if (role === "student") {
        const { data: student } = await supabase.from("exam_students").select("*").or(`phone.eq.${identifier},student_code.eq.${identifier}`).single();
        if (student && student.password === password) {
          const user: User = { id: student.id, name: student.name || student.student_code, role: "student", status: student.status || "active" };
          localStorage.setItem("exam_auth", JSON.stringify({ user, expiresAt: Date.now() + 24 * 60 * 60 * 1000 }));
          setState({ user, isLoading: false, isAuthenticated: true });
          return { success: true, user };
        }
      }
      throw new Error("بيانات الدخول غير صحيحة");
    } catch (err: any) { setState((prev) => ({ ...prev, isLoading: false, isAuthenticated: false })); return { success: false, error: err.message }; }
  }, [supabase]);

  const logout = useCallback(() => {
    localStorage.removeItem("exam_auth"); supabase.auth.signOut().catch(() => {});
    setState({ user: null, isLoading: false, isAuthenticated: false }); router.push("/login");
  }, [router, supabase]);

  const hasRole = useCallback((roles: ("admin" | "teacher" | "student")[]) => state.user ? roles.includes(state.user.role) : false, [state.user]);

  const requireAuth = useCallback((allowedRoles?: ("admin" | "teacher" | "student")[]) => {
    if (state.isLoading) return "loading";
    if (!state.isAuthenticated) { router.push("/login"); return "redirecting"; }
    if (allowedRoles && !hasRole(allowedRoles)) { router.push("/"); return "unauthorized"; }
    return "authorized";
  }, [state.isLoading, state.isAuthenticated, hasRole, router]);

  return { ...state, login, logout, hasRole, requireAuth };
}
