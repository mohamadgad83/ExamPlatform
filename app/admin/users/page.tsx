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

// ✅ تعريف الـ Schema مع جميع الحقول
const userSchema = z.object({
  name: z.string().min(2, "الاسم مطلوب"),
  username: z.string().min(3, "اسم المستخدم 3 أحرف على الأقل").regex(/^[a-zA-Z0-9_]+$/, "حروف/أرقام/underscore بس"),
  phone: z.string().optional(),
  role: z.enum(["admin", "teacher", "student"]),
  password: z.string().min(6, "كلمة المرور قصيرة"),
  status: z.enum(["active", "suspended", "pending"]).default("active"),
});

type UserForm = z.infer<typeof userSchema>;

interface User {
  id: string;
  name: string;
  username: string;
  phone: string | null;
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
  const [success, setSuccess] = useState("");

  // جلب المستخدمين
  const { data: users, isLoading } = useQuery({
    queryKey: ["admin-users", search, filterRole],
    queryFn: async () => {
      let query = supabase
        .from("exam_users")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (search) {
        query = query.or(`name.ilike.%${search}%,username.ilike.%${search}%`);
      }
      if (filterRole !== "all") {
        query = query.eq("role", filterRole);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as User[];
    },
  });

  const form = useForm<UserForm>({
    resolver: zodResolver(userSchema),
    defaultValues: { role: "student", status: "active" }
  });

  // إنشاء مستخدم جديد
  const createMutation = useMutation({
    mutationFn: async (values: UserForm) => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error("الرجاء تسجيل الدخول أولاً");
      }

      const res = await fetch("/api/admin/create-account", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          name: values.name,
          username: values.username,
          password: values.password,
          role: values.role,
          phone: values.phone || null,
        }),
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "فشل إنشاء الحساب");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      setIsDialogOpen(false);
      form.reset();
      setSuccess("تم إنشاء المستخدم بنجاح");
      setTimeout(() => setSuccess(""), 3000);
    },
    onError: (err: any) => setError(err.message),
  });

  // تغيير حالة المستخدم
  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, currentStatus }: { id: string; currentStatus: string }) => {
      const newStatus = currentStatus === "active" ? "suspended" : "active";
      const { error } = await supabase
        .from("exam_users")
        .update({ status: newStatus })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
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

      {/* نافذة إضافة مستخدم */}
      {isDialogOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-xl font-bold mb-4">إضافة مستخدم جديد</h2>
            <form onSubmit={form.handleSubmit((v) => createMutation.mutate(v))} className="space-y-4">
              {error && <Alert variant="destructive"><p>{error}</p></Alert>}
              {success && <Alert className="bg-green-50 text-green-800 border-green-200"><p>{success}</p></Alert>}
              
              <div>
                <label className="text-sm font-medium">الاسم الكامل</label>
                <Input {...form.register("name")} placeholder="الاسم" />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">اسم المستخدم</label>
                  <Input {...form.register("username")} placeholder="username" />
                </div>
                <div>
                  <label className="text-sm font-medium">رقم الهاتف</label>
                  <Input {...form.register("phone")} placeholder="01xxxxxxxxx" />
                </div>
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
              
              <div>
                <label className="text-sm font-medium">كلمة المرور</label>
                <Input type="password" {...form.register("password")} placeholder="******" />
              </div>
              
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>إلغاء</Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? "جاري..." : "إضافة"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* البحث والفلترة */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="البحث بالاسم أو اسم المستخدم..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pr-10"
          />
        </div>
        <select
          value={filterRole}
          onChange={(e) => setFilterRole(e.target.value)}
          className="p-2 border rounded-md"
        >
          <option value="all">كل الأدوار</option>
          <option value="admin">أدمن</option>
          <option value="teacher">معلم</option>
          <option value="student">طالب</option>
        </select>
      </div>

      {/* عرض المستخدمين */}
      {isLoading ? (
        <div className="text-center py-12">جاري التحميل...</div>
      ) : users?.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">لا يوجد مستخدمين</p>
          </CardContent>
        </Card>
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
                        <Badge variant={user.status === "active" ? "default" : "destructive"}>
                          {user.status === "active" ? "نشط" : user.status === "pending" ? "معلق" : "موقوف"}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                        {user.username && <span>@{user.username}</span>}
                        {user.phone && <span>{user.phone}</span>}
                        <span>{new Date(user.created_at).toLocaleDateString("ar-EG")}</span>
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleStatusMutation.mutate({ id: user.id, currentStatus: user.status })}
                    disabled={toggleStatusMutation.isPending}
                  >
                    {user.status === "active" ? (
                      <><Ban className="ml-1 h-3 w-3" />تعليق</>
                    ) : (
                      <><CheckCircle className="ml-1 h-3 w-3" />تفعيل</>
                    )}
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