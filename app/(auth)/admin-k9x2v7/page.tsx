"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { Shield } from "lucide-react";
import { useAuth } from "@/lib/hooks/use-auth";

const loginSchema = z.object({
  username: z.string().min(1, "اسم المستخدم مطلوب"),
  password: z.string().min(1, "كلمة المرور مطلوبة"),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function AdminPortalPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [error, setError] = useState("");

  const form = useForm<LoginForm>({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (values: LoginForm) => {
    setError("");
    const result = await login(values.username, values.password, true);
    if (result.success) {
      router.push("/admin/dashboard");
    } else {
      setError(result.error);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 p-4" dir="rtl">
      <Card className="w-full max-w-md border-gray-800">
        <CardHeader className="text-center">
          <Shield className="mx-auto h-8 w-8 mb-2 text-gray-400" />
          <CardTitle className="text-xl font-bold">دخول الإدارة</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && <Alert variant="destructive"><p>{error}</p></Alert>}
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="text-sm font-medium">اسم المستخدم</label>
              <Input {...form.register("username")} className="mt-1" autoComplete="off" />
            </div>
            <div>
              <label className="text-sm font-medium">كلمة المرور</label>
              <Input type="password" {...form.register("password")} className="mt-1" autoComplete="off" />
            </div>
            <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? "..." : "دخول"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
