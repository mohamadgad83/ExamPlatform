import { format, formatDistanceToNow } from "date-fns";
import { ar } from "date-fns/locale";

export function formatDate(date: string | Date, options?: { 
  withTime?: boolean;
  relative?: boolean;
}) {
  const d = new Date(date);

  if (options?.relative) {
    return formatDistanceToNow(d, { addSuffix: true, locale: ar });
  }

  if (options?.withTime) {
    return format(d, "dd MMMM yyyy - HH:mm", { locale: ar });
  }

  return format(d, "dd MMMM yyyy", { locale: ar });
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} دقيقة`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (mins === 0) return `${hours} ساعة`;
  return `${hours} ساعة و ${mins} دقيقة`;
}

export function formatNumber(num: number): string {
  return new Intl.NumberFormat("ar-SA").format(num);
}

export function formatPercentage(num: number): string {
  return `${num.toFixed(1)}%`;
}

export function getScoreColor(percentage: number): string {
  if (percentage >= 90) return "text-emerald-600 bg-emerald-50";
  if (percentage >= 75) return "text-blue-600 bg-blue-50";
  if (percentage >= 60) return "text-amber-600 bg-amber-50";
  return "text-red-600 bg-red-50";
}

export function getScoreLabel(percentage: number): string {
  if (percentage >= 90) return "ممتاز";
  if (percentage >= 75) return "جيد جداً";
  if (percentage >= 60) return "جيد";
  if (percentage >= 50) return "مقبول";
  return "ضعيف";
}