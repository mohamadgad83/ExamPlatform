"use client";

import { useEffect, useState, useCallback } from "react";
import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface ExamTimerProps {
  durationMinutes: number;
  onTimeUp: () => void;
  onWarning?: (remainingSeconds: number) => void;
  warningThreshold?: number;
  className?: string;
}

export function ExamTimer({
  durationMinutes, onTimeUp, onWarning, warningThreshold = 300, className,
}: ExamTimerProps) {
  const totalSeconds = durationMinutes * 60;
  const [remainingSeconds, setRemainingSeconds] = useState(totalSeconds);
  const [isWarning, setIsWarning] = useState(false);

  useEffect(() => {
    if (remainingSeconds <= 0) { onTimeUp(); return; }
    const timer = setInterval(() => {
      setRemainingSeconds((prev) => {
        const next = prev - 1;
        if (next <= warningThreshold && !isWarning) { setIsWarning(true); onWarning?.(next); }
        if (next <= 0) { clearInterval(timer); onTimeUp(); return 0; }
        return next;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [remainingSeconds, onTimeUp, onWarning, warningThreshold, isWarning]);

  const formatTime = useCallback((seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hours > 0) return `${hours}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }, []);

  const progressPercent = (remainingSeconds / totalSeconds) * 100;

  return (
    <div className={cn("flex flex-col items-center gap-2", className)} dir="rtl">
      <div className={cn("flex items-center gap-2 px-4 py-2 rounded-lg font-mono text-lg font-bold tracking-wider transition-colors",
        isWarning ? "bg-red-50 text-red-700 border border-red-200 animate-pulse" : "bg-primary/5 text-primary border border-primary/10")}>
        {isWarning && <AlertTriangle className="h-5 w-5 text-red-500" />}
        <span>{formatTime(remainingSeconds)}</span>
      </div>
      <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className={cn("h-full transition-all duration-1000 ease-linear",
          progressPercent > 50 ? "bg-green-500" : progressPercent > 20 ? "bg-yellow-500" : "bg-red-500")}
          style={{ width: `${progressPercent}%` }} />
      </div>
      <p className="text-xs text-muted-foreground">{isWarning ? "الوقت ينفد!" : "الوقت المتبقي للاختبار"}</p>
    </div>
  );
}
