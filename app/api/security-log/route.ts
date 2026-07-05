import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const securityLogSchema = z.object({
  attemptId: z.string().uuid(),
  studentId: z.string().uuid(),
  examId: z.string().uuid(),
  violationType: z.enum([
    "tab_switch",
    "copy_paste",
    "right_click",
    "fullscreen_exit",
    "screenshot_detected",
    "multiple_faces",
    "suspicious_activity",
    "auto_submit",
  ]),
  details: z.string().optional(),
  severity: z.enum(["low", "medium", "high", "critical"]).default("medium"),
});

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();
    const parsed = securityLogSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "بيانات غير صالحة", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { attemptId, studentId, examId, violationType, details, severity } = parsed.data;

    const { error: notifError } = await supabase.from("exam_notifications").insert({
      user_id: studentId,
      title: `تنبيه أمان: ${getViolationLabel(violationType)}`,
      message: details || `تم رصد نشاط مشبوه أثناء الاختبار: ${violationType}`,
      type: "security_alert",
      is_read: false,
      metadata: {
        attempt_id: attemptId,
        exam_id: examId,
        violation_type: violationType,
        severity,
      },
    });

    if (notifError) {
      return NextResponse.json(
        { error: "فشل في تسجيل التنبيه", details: notifError.message },
        { status: 500 }
      );
    }

    if (severity === "critical") {
      await supabase
        .from("exam_attempts")
        .update({ status: "terminated", terminated_reason: violationType })
        .eq("id", attemptId);
    }

    return NextResponse.json({
      success: true,
      message: "تم تسجيل الانتهاك بنجاح",
      violationType,
      severity,
      autoTerminated: severity === "critical",
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: "خطأ داخلي في الخادم", message: err.message },
      { status: 500 }
    );
  }
}

function getViolationLabel(type: string): string {
  const labels: Record<string, string> = {
    tab_switch: "تبديل التبويب",
    copy_paste: "نسخ/لصق",
    right_click: "النقر باليمين",
    fullscreen_exit: "خروج من ملء الشاشة",
    screenshot_detected: "محاولة تصوير الشاشة",
    multiple_faces: "اكتشاف أكثر من وجه",
    suspicious_activity: "نشاط مشبوه",
    auto_submit: "تسليم تلقائي",
  };
  return labels[type] || type;
}
