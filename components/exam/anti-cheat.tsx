"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { AlertTriangle, Fullscreen } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

interface AntiCheatProps {
  attemptId: string;
  studentId: string;
  examId: string;
  maxViolations?: number;
  onViolation?: (type: string, severity: string) => void;
  onTerminate?: () => void;
  children: React.ReactNode;
}

interface Violation { type: string; timestamp: number; severity: "low" | "medium" | "high" | "critical"; }

export function AntiCheat({ attemptId, studentId, examId, maxViolations = 3, onViolation, onTerminate, children }: AntiCheatProps) {
  const [violations, setViolations] = useState<Violation[]>([]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showWarning, setShowWarning] = useState(false);
  const [warningMessage, setWarningMessage] = useState("");
  const violationCount = useRef(0);
  const isTerminated = useRef(false);

  const logViolation = useCallback(async (type: string, severity: "low" | "medium" | "high" | "critical" = "medium") => {
    if (isTerminated.current) return;
    const newViolation: Violation = { type, timestamp: Date.now(), severity };
    setViolations((prev) => [...prev, newViolation]);
    violationCount.current += 1;
    onViolation?.(type, severity);
    try {
      await fetch("/api/security-log", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attemptId, studentId, examId, violationType: type, severity, details: `تم رصد ${type}` }),
      });
    } catch (e) { console.error("Failed to log violation:", e); }
    if (violationCount.current >= maxViolations) {
      isTerminated.current = true;
      setWarningMessage("تم إنهاء الاختبار بسبب تعدي عدد الانتهاكات المسموح بها.");
      setShowWarning(true); onTerminate?.();
    } else {
      setWarningMessage(`تنبيه: ${getViolationLabel(type)} (${violationCount.current}/${maxViolations})`);
      setShowWarning(true); setTimeout(() => setShowWarning(false), 5000);
    }
  }, [attemptId, studentId, examId, maxViolations, onViolation, onTerminate]);

  const enterFullscreen = useCallback(async () => {
    try { const elem = document.documentElement; if (elem.requestFullscreen) { await elem.requestFullscreen(); } setIsFullscreen(true); }
    catch { logViolation("fullscreen_exit", "high"); }
  }, [logViolation]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      const isFull = !!document.fullscreenElement; setIsFullscreen(isFull);
      if (!isFull && !isTerminated.current) logViolation("fullscreen_exit", "high");
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, [logViolation]);

  useEffect(() => {
    const handleVisibilityChange = () => { if (document.hidden && !isTerminated.current) logViolation("tab_switch", "high"); };
    const handleBlur = () => { if (!isTerminated.current) logViolation("tab_switch", "high"); };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleBlur);
    return () => { document.removeEventListener("visibilitychange", handleVisibilityChange); window.removeEventListener("blur", handleBlur); };
  }, [logViolation]);

  useEffect(() => {
    const handleCopy = (e: ClipboardEvent) => { e.preventDefault(); logViolation("copy_paste", "medium"); };
    const handlePaste = (e: ClipboardEvent) => { e.preventDefault(); logViolation("copy_paste", "medium"); };
    const handleContextMenu = (e: MouseEvent) => { e.preventDefault(); logViolation("right_click", "low"); };
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey && ["c","v","x","p"].includes(e.key.toLowerCase())) || e.key === "F12" || (e.ctrlKey && e.shiftKey && ["i","j","c"].includes(e.key.toLowerCase()))) {
        e.preventDefault();
        logViolation(e.key === "F12" || (e.ctrlKey && e.shiftKey) ? "suspicious_activity" : "copy_paste", "medium");
      }
    };
    document.addEventListener("copy", handleCopy); document.addEventListener("paste", handlePaste);
    document.addEventListener("contextmenu", handleContextMenu); document.addEventListener("keydown", handleKeyDown);
    return () => { document.removeEventListener("copy", handleCopy); document.removeEventListener("paste", handlePaste);
      document.removeEventListener("contextmenu", handleContextMenu); document.removeEventListener("keydown", handleKeyDown); };
  }, [logViolation]);

  useEffect(() => {
    const handlePrintScreen = (e: KeyboardEvent) => { if (e.key === "PrintScreen") { e.preventDefault(); logViolation("screenshot_detected", "high"); } };
    document.addEventListener("keyup", handlePrintScreen);
    return () => document.removeEventListener("keyup", handlePrintScreen);
  }, [logViolation]);

  useEffect(() => {
    const detectDevTools = () => {
      const threshold = 160;
      if (window.outerWidth - window.innerWidth > threshold || window.outerHeight - window.innerHeight > threshold) {
        logViolation("suspicious_activity", "critical");
      }
    };
    window.addEventListener("resize", detectDevTools);
    return () => window.removeEventListener("resize", detectDevTools);
  }, [logViolation]);

  const getViolationLabel = (type: string): string => {
    const labels: Record<string, string> = {
      tab_switch: "تبديل التبويب", copy_paste: "نسخ/لصق", right_click: "النقر باليمين",
      fullscreen_exit: "خروج من ملء الشاشة", screenshot_detected: "محاولة تصوير الشاشة",
      suspicious_activity: "نشاط مشبوه", auto_submit: "تسليم تلقائي",
    };
    return labels[type] || type;
  };

  return (
    <div className="relative">
      {!isFullscreen && !isTerminated.current && (
        <div className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center gap-6 text-white">
          <Fullscreen className="h-16 w-16" />
          <h2 className="text-2xl font-bold">وضع الامتحان</h2>
          <p className="text-center max-w-md">يجب الدخول في وضع ملء الشاشة لبدء الاختبار.</p>
          <Button onClick={enterFullscreen} size="lg"><Fullscreen className="ml-2 h-5 w-5" />دخول وضع الامتحان</Button>
        </div>
      )}
      {showWarning && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-lg">
          <Alert variant="destructive" className="border-red-500 bg-red-50">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <div className="mr-2"><p className="font-bold text-red-800">تنبيه أمان</p><p className="text-red-700">{warningMessage}</p></div>
          </Alert>
        </div>
      )}
      <div className={isTerminated.current ? "opacity-50 pointer-events-none" : ""}>{children}</div>
      {isTerminated.current && (
        <div className="fixed inset-0 z-50 bg-black/95 flex flex-col items-center justify-center gap-4 text-white">
          <AlertTriangle className="h-20 w-20 text-red-500" />
          <h1 className="text-3xl font-bold">تم إنهاء الاختبار</h1>
          <p className="text-center max-w-md text-gray-300">تم إنهاء الاختبار بسبب مخالفة قواعد الامتحان.</p>
        </div>
      )}
    </div>
  );
}
