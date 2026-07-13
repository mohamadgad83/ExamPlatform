"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";
import { Save, Shield, Database } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const settingsSchema = z.object({
  platform_name: z.string().min(2),
  contact_email: z.string().email(),
  default_exam_duration: z.number().min(5).max(300),
  default_passing_score: z.number().min(0).max(100),
  enable_anti_cheat: z.boolean(),
  enable_auto_submit: z.boolean(),
  max_violations: z.number().min(1).max(10),
  maintenance_mode: z.boolean(),
});

type SettingsForm = z.infer<typeof settingsSchema>;

export default function AdminSettingsPage() {
  const queryClient = useQueryClient();
  const supabase = createClient();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [activeTab, setActiveTab] = useState("general");

  const { data: settings, isLoading } = useQuery({
    queryKey: ["admin-settings"],
    queryFn: async () => {
      const stored = typeof window !== "undefined" ? localStorage.getItem("exam_platform_settings") : null;
      if (stored) return JSON.parse(stored);
      return {
        platform_name: "منصة الاختبارات",
        contact_email: "admin@example.com",
        default_exam_duration: 60,
        default_passing_score: 50,
        enable_anti_cheat: true,
        enable_auto_submit: true,
        max_violations: 3,
        maintenance_mode: false,
      };
    },
  });

  const form = useForm<SettingsForm>({ resolver: zodResolver(settingsSchema), values: settings || {} });

  const updateMutation = useMutation({
    mutationFn: async (values: SettingsForm) => {
      if (typeof window !== "undefined") {
        localStorage.setItem("exam_platform_settings", JSON.stringify(values));
      }
      try { await supabase.from("exam_settings").upsert({ id: 1, ...values }); } catch {}
    },
    onSuccess: () => {
      setSuccess("تم حفظ الإعدادات بنجاح");
      setTimeout(() => setSuccess(""), 3000);
      queryClient.invalidateQueries({ queryKey: ["admin-settings"] });
    },
    onError: (err: any) => setError(err.message),
  });

  if (isLoading) return <div className="text-center py-12">جاري التحميل...</div>;

  return (
    <div className="space-y-6" dir="rtl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">إعدادات النظام</h1>
        <p className="text-muted-foreground">إدارة إعدادات المنصة والأمان</p>
      </div>

      {error && <Alert variant="destructive"><p>{error}</p></Alert>}
      {success && <Alert className="bg-green-50 text-green-800 border-green-200"><p>{success}</p></Alert>}

      <div className="flex gap-2 p-1 bg-muted rounded-lg w-fit">
        <button onClick={() => setActiveTab("general")} className={`px-4 py-2 rounded-md text-sm font-medium ${activeTab === "general" ? "bg-white shadow-sm" : "text-muted-foreground"}`}>عام</button>
        <button onClick={() => setActiveTab("security")} className={`px-4 py-2 rounded-md text-sm font-medium ${activeTab === "security" ? "bg-white shadow-sm" : "text-muted-foreground"}`}>أمان</button>
        <button onClick={() => setActiveTab("exams")} className={`px-4 py-2 rounded-md text-sm font-medium ${activeTab === "exams" ? "bg-white shadow-sm" : "text-muted-foreground"}`}>اختبارات</button>
      </div>

      {activeTab === "general" && (
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Database className="h-5 w-5" />الإعدادات العامة</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div><label className="text-sm font-medium">اسم المنصة</label><Input {...form.register("platform_name")} /></div>
            <div><label className="text-sm font-medium">بريد التواصل</label><Input type="email" {...form.register("contact_email")} /></div>
            <div className="flex items-center gap-2">
              <input type="checkbox" {...form.register("maintenance_mode")} id="maintenance" />
              <label htmlFor="maintenance" className="text-sm">وضع الصيانة</label>
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === "security" && (
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Shield className="h-5 w-5" />إعدادات الأمان</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <input type="checkbox" {...form.register("enable_anti_cheat")} id="anticheat" />
              <label htmlFor="anticheat" className="text-sm">تفعيل مكافحة الغش</label>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" {...form.register("enable_auto_submit")} id="autosubmit" />
              <label htmlFor="autosubmit" className="text-sm">تسليم تلقائي عند الانتهاكات</label>
            </div>
            <div><label className="text-sm font-medium">أقصى عدد انتهاكات مسموح</label><Input type="number" {...form.register("max_violations", { valueAsNumber: true })} /></div>
          </CardContent>
        </Card>
      )}

      {activeTab === "exams" && (
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Database className="h-5 w-5" />إعدادات الاختبارات الافتراضية</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div><label className="text-sm font-medium">المدة الافتراضية (دقيقة)</label><Input type="number" {...form.register("default_exam_duration", { valueAsNumber: true })} /></div>
            <div><label className="text-sm font-medium">درجة النجاح الافتراضية (%)</label><Input type="number" {...form.register("default_passing_score", { valueAsNumber: true })} /></div>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-end">
        <Button onClick={form.handleSubmit((v) => updateMutation.mutate(v))} disabled={updateMutation.isPending}>
          <Save className="ml-2 h-4 w-4" />
          {updateMutation.isPending ? "جاري الحفظ..." : "حفظ الإعدادات"}
        </Button>
      </div>
    </div>
  );
}
