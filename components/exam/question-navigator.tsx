"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Flag } from "lucide-react";

interface QuestionNavigatorProps {
  totalQuestions: number;
  currentIndex: number;
  answers: Record<number, any>;
  flaggedQuestions?: number[];
  onNavigate: (index: number) => void;
  onToggleFlag?: (index: number) => void;
  className?: string;
}

export function QuestionNavigator({
  totalQuestions, currentIndex, answers, flaggedQuestions = [], onNavigate, onToggleFlag, className,
}: QuestionNavigatorProps) {
  const getQuestionStatus = (index: number) => {
    const hasAnswer = answers[index] !== undefined && answers[index] !== null && answers[index] !== "";
    const isFlagged = flaggedQuestions.includes(index);
    const isCurrent = index === currentIndex;
    if (isCurrent) return "current";
    if (isFlagged) return "flagged";
    if (hasAnswer) return "answered";
    return "unanswered";
  };

  const statusStyles: Record<string, string> = {
    current: "bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2",
    answered: "bg-green-500 text-white hover:bg-green-600",
    flagged: "bg-yellow-400 text-yellow-900 hover:bg-yellow-500",
    unanswered: "bg-gray-100 text-gray-500 hover:bg-gray-200",
  };

  return (
    <div className={cn("space-y-4", className)} dir="rtl">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm">مؤشر الأسئلة</h3>
        <div className="flex items-center gap-3 text-xs">
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-green-500" />مجاب</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-yellow-400" />محدد</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-gray-100 border" />فارغ</span>
        </div>
      </div>
      <div className="grid grid-cols-5 gap-2">
        {Array.from({ length: totalQuestions }, (_, i) => (
          <button key={i} onClick={() => onNavigate(i)}
            className={cn("relative h-10 w-10 rounded-lg text-sm font-medium transition-all hover:scale-105", statusStyles[getQuestionStatus(i)])}>
            {i + 1}
            {flaggedQuestions.includes(i) && <Flag className="absolute -top-1 -right-1 h-3 w-3 text-red-500 fill-red-500" />}
          </button>
        ))}
      </div>
      <div className="flex items-center justify-between pt-2">
        <Button variant="outline" size="sm" onClick={() => onNavigate(Math.max(0, currentIndex - 1))} disabled={currentIndex === 0}>
          <ChevronRight className="ml-1 h-4 w-4" />السابق
        </Button>
        {onToggleFlag && (
          <Button variant="ghost" size="sm" onClick={() => onToggleFlag(currentIndex)} className={cn(flaggedQuestions.includes(currentIndex) && "text-yellow-600 bg-yellow-50")}>
            <Flag className={cn("ml-1 h-4 w-4", flaggedQuestions.includes(currentIndex) && "fill-yellow-500")} />
            {flaggedQuestions.includes(currentIndex) ? "إلغاء التحديد" : "تحديد للمراجعة"}
          </Button>
        )}
        <Button variant="outline" size="sm" onClick={() => onNavigate(Math.min(totalQuestions - 1, currentIndex + 1))} disabled={currentIndex === totalQuestions - 1}>
          التالي<ChevronLeft className="mr-1 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
