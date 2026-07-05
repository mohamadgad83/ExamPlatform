"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import bcrypt from "bcryptjs";

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
  const [state, setState] = useState<AuthState>({
    user: null,
    isLoading: true,
    isAuthenticated: false,
  });

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const { data: userData } = await supabase
            .from("exam_users")
            .select("*")
            .eq("id", session.user.id)
            .single();

          if (userData) {
            const user: User = {
              id: userData.id,
              name: userData.name || userData.email,
              email: userData.email,
              role: userData.role,
              status: userData.status,
            };
            setState({ user, isLoading: false, isAuthenticated: true });
          } else {
            setState({ user: null, isLoading: false, isAuthenticated: false });
          }
        } else {
          setState({ user: null, isLoading: false, isAuthenticated: false });
        }
      } catch {
        setState({ user: null, isLoading: false, isAuthenticated: false });
      }
    };
    checkAuth();
  }, [supabase]);

  const login = useCallback(
    async (identifier: string, password: string, role: "teacher" | "student" | "admin") => {
      setState((prev) => ({ ...prev, isLoading: true }));
      try {
        const { data: userData } = await supabase
          .from("exam_users")
          .select("*")
          .eq("email", identifier)
          .eq("role", role)
          .single();

        if (userData && userData.password_hash) {
          const isValid = await bcrypt.compare(password, userData.password_hash);
          if (isValid) {
            if (userData.status === "suspended") {
              throw new Error("الحساب موقوف. يرجى التواصل مع الإدارة.");
            }
            const { error: signInError } = await supabase.auth.signInWithPassword({
              email: identifier,
              password: password,
            });
            if (signInError) throw new Error(signInError.message);

            const user: User = {
              id: userData.id,
              name: userData.name || userData.email,
              email: userData.email,
              role: userData.role,
              status: userData.status,
            };
            setState({ user, isLoading: false, isAuthenticated: true });
            return { success: true, user };
          }
        }

        if (role === "teacher") {
          const { data: teacher } = await supabase
            .from("exam_teachers")
            .select("*")
            .eq("username", identifier)
            .single();

          if (teacher && teacher.password) {
            const isValid = await bcrypt.compare(password, teacher.password) || password === teacher.password;
            if (isValid) {
              const user: User = {
                id: teacher.id,
                name: teacher.username,
                role: "teacher",
                status: "active",
              };
              setState({ user, isLoading: false, isAuthenticated: true });
              return { success: true, user };
            }
          }
        } else if (role === "student") {
          const { data: student } = await supabase
            .from("exam_students")
            .select("*")
            .or(`phone.eq.${identifier},student_code.eq.${identifier}`)
            .single();

          if (student && student.password) {
            const isValid = await bcrypt.compare(password, student.password) || password === student.password;
            if (isValid) {
              const user: User = {
                id: student.id,
                name: student.name || student.student_code,
                role: "student",
                status: student.status || "active",
              };
              setState({ user, isLoading: false, isAuthenticated: true });
              return { success: true, user };
            }
          }
        }

        throw new Error("بيانات الدخول غير صحيحة");
      } catch (err: any) {
        setState((prev) => ({ ...prev, isLoading: false, isAuthenticated: false }));
        return { success: false, error: err.message };
      }
    },
    [supabase]
  );

  const logout = useCallback(() => {
    supabase.auth.signOut().catch(() => {});
    setState({ user: null, isLoading: false, isAuthenticated: false });
    router.push("/login");
  }, [router, supabase]);

  const hasRole = useCallback(
    (roles: ("admin" | "teacher" | "student")[]) =>
      state.user ? roles.includes(state.user.role) : false,
    [state.user]
  );

  const requireAuth = useCallback(
    (allowedRoles?: ("admin" | "teacher" | "student")[]) => {
      if (state.isLoading) return "loading";
      if (!state.isAuthenticated) {
        router.push("/login");
        return "redirecting";
      }
      if (allowedRoles && !hasRole(allowedRoles)) {
        router.push("/");
        return "unauthorized";
      }
      return "authorized";
    },
    [state.isLoading, state.isAuthenticated, hasRole, router]
  );

  return { ...state, login, logout, hasRole, requireAuth };
}