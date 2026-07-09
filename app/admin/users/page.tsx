"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { Search, Shield, UserCog, Ban, CheckCircle, GraduationCap, UserPlus } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const userSchema = z.object({
  name: z.string().min(2, "الاسم مطلوب"),
  email: z.string().email("بريد غير صالح").optional(),
  phone: z.string().optional(),
  role: z.enum(["admin", "teacher", "student"]),
  password: z.string().min(6, "كلمة المرور قصيرة"),
  status: z.enum(["active", "suspended", "pending"]).default("active"),
});

type UserForm = z.infer<typeof userSchema>;

interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  status: string;
  created_at: string;
}

export default function AdminUsersPage() {
  const queryClient = useQueryClient();
  const supabase = createClient();
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState<string>("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [error, setError] = useState("");

  const { data: users, isLoading } = useQuery({
    queryKey: ["admin-users", search, filterRole],
    queryFn: async () => {
      let query = supabase.from("exam_users").select("*").order("created_at", { ascending: false });
      if (search) query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`);
      if (filterRole !== "all") query = query.eq("role", filterRole);
      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as User[];
    },
  });

  const form = useForm<UserForm>({ resolver: zodResolver(userSchema), defaultValues: { role: "student", status: "active" } });

  const createMutation = useMutation({
    mutationFn: async (values: UserForm) => {
      const { error: userError } = await supabase.from("exam_users").insert({
        name: values.name, email: values.email, phone: values.phone, role: values.role,
        password_hash: values.password, status: values.status,
      });
      if (userError) throw userError;
      if (values.role === "teacher") {
        await supabase.from("exam_teachers").insert({ username: values.name, password: values.password, specialization: "" });
      } else if (values.role === "student") {
        await supabase.from("exam_students").insert({ name: values.name, phone: values.phone || "", password: values.password, student_code: `STU${Date.now()}` });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      setIsDialogOpen(false);
      form.reset();
    },
    onError: (err: any) => setError(err.message),
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, currentStatus }: { id: string; currentStatus: string }) => {
      const newStatus = currentStatus === "active" ? "suspended" : "active";
      const { error } = await supabase.from("exam_users").update({ status: newStatus }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-users"] }),
  });

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "admin": return <Badge className="bg-purple-500"><Shield className="h-3 w-3 ml-1" />أدمن</Badge>;
      case "teacher": return <Badge className="bg-blue-500"><UserCog className="h-3 w-3 ml-1" />معلم</Badge>;
      case "student": return <Badge variant="secondary"><GraduationCap className="h-3 w-3 ml-1" />طالب</Badge>;
      default: return <Badge variant="outline">{role}</Badge>;
    }
  };

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">إدارة المستخدمين</h1>
          <p className="text-muted-foreground">إدارة حسابات المعلمين والطلاب والأدمن</p>
        </div>
        <Button onClick={() => { form.reset(); setIsDialogOpen(true); }}>
          <UserPlus className="ml-2 h-4 w-4" />مستخدم جديد
        </Button>
      </div>

      {isDialogOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-xl font-bold mb-4">إضافة مستخدم جديد</h2>
            <form onSubmit={form.handleSubmit((v) => createMutation.mutate(v))} className="space-y-4">
              {error && <Alert variant="destructive"><p>{error}</p></Alert>}
              <div><label className="text-sm font-medium">الاسم الكامل</label><Input {...form.register("name")} placeholder="الاسم" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-sm font-medium">البريد الإلكتروني</label><Input type="email" {...form.register("email")} placeholder="email@example.com" /></div>
                <div><label className="text-sm font-medium">رقم الهاتف</label><Input {...form.register("phone")} placeholder="01xxxxxxxxx" /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">الدور</label>
                  <select {...form.register("role")} className="w-full mt-1 p-2 border rounded-md">
                    <option value="student">طالب</option>
                    <option value="teacher">معلم</option>
                    <option value="admin">أدمن</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium">الحالة</label>
                  <select {...form.register("status")} className="w-full mt-1 p-2 border rounded-md">
                    <option value="active">نشط</option>
                    <option value="pending">معلق</option>
                    <option value="suspended">موقوف</option>
                  </select>
                </div>
              </div>
              <div><label className="text-sm font-medium">كلمة المرور</label><Input type="password" {...form.register("password")} placeholder="******" /></div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>إلغاء</Button>
                <Button type="submit" disabled={createMutation.isPending}>إضافة</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="البحث بالاسم أو البريد..." value={search} onChange={(e) => setSearch(e.target.value)} className="pr-10" />
        </div>
        <select value={filterRole} onChange={(e) => setFilterRole(e.target.value)} className="p-2 border rounded-md">
          <option value="all">كل الأدوار</option>
          <option value="admin">أدمن</option>
          <option value="teacher">معلم</option>
          <option value="student">طالب</option>
        </select>
      </div>

      {isLoading ? (
        <div className="text-center py-12">جاري التحميل...</div>
      ) : (
        <div className="grid gap-4">
          {users?.map((user) => (
            <Card key={user.id} className="hover:shadow-sm transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4 flex-1">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <UserCog className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium">{user.name}</p>
                        {getRoleBadge(user.role)}
                        <Badge variant={user.status === "active" ? "default" : "destructive"}>{user.status === "active" ? "نشط" : user.status === "pending" ? "معلق" : "موقوف"}</Badge>
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                        {user.email && <span>{user.email}</span>}
                        {user.phone && <span>{user.phone}</span>}
                        <span>{new Date(user.created_at).toLocaleDateString("ar-EG")}</span>
                      </div>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => toggleStatusMutation.mutate({ id: user.id, currentStatus: user.status })}>
                    {user.status === "active" ? <><Ban className="ml-1 h-3 w-3" />تعليق</> : <><CheckCircle className="ml-1 h-3 w-3" />تفعيل</>}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
