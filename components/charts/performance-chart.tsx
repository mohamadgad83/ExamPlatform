"use client";

import { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend, Cell } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Attempt {
  exam: { title: string; subject?: string };
  score: number;
  total_points: number;
  percentage: number;
  submitted_at: string;
}

interface PerformanceChartProps {
  attempts: Attempt[];
  type?: "bar" | "line" | "radar" | "progress";
  className?: string;
}

const COLORS = ["#10b981", "#f59e0b", "#ef4444", "#3b82f6", "#8b5cf6"];

export function PerformanceChart({ attempts, type = "bar", className }: PerformanceChartProps) {
  const chartData = useMemo(() => attempts.map((a) => ({
    name: a.exam?.title?.slice(0, 20) || "اختبار", score: a.percentage, rawScore: a.score,
    total: a.total_points, date: new Date(a.submitted_at).toLocaleDateString("ar-EG"), subject: a.exam?.subject || "عام",
  })), [attempts]);

  const subjectStats = useMemo(() => {
    const stats: Record<string, { total: number; count: number }> = {};
    attempts.forEach((a) => { const sub = a.exam?.subject || "عام"; if (!stats[sub]) stats[sub] = { total: 0, count: 0 }; stats[sub].total += a.percentage; stats[sub].count += 1; });
    return Object.entries(stats).map(([subject, data]) => ({ subject, average: Math.round(data.total / data.count), fullMark: 100 }));
  }, [attempts]);

  if (attempts.length === 0) {
    return (<Card className={className}><CardContent className="py-12 text-center text-muted-foreground">لا توجد بيانات كافية</CardContent></Card>);
  }

  const renderChart = () => {
    switch (type) {
      case "line": return (
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="date" /><YAxis domain={[0, 100]} />
            <Tooltip formatter={(value: number) => [`${value}%`, "النسبة"]} />
            <Line type="monotone" dataKey="score" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} />
          </LineChart>
        </ResponsiveContainer>);
      case "radar": return (
        <ResponsiveContainer width="100%" height={300}>
          <RadarChart data={subjectStats}>
            <PolarGrid /><PolarAngleAxis dataKey="subject" /><PolarRadiusAxis angle={30} domain={[0, 100]} />
            <Radar name="المتوسط" dataKey="average" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} /><Legend /><Tooltip formatter={(value: number) => [`${value}%`, "المتوسط"]} />
          </RadarChart>
        </ResponsiveContainer>);
      case "progress": return (
        <div className="space-y-4">
          {chartData.slice(0, 5).map((item, index) => (
            <div key={index} className="space-y-1">
              <div className="flex justify-between text-sm"><span className="font-medium">{item.name}</span><span className="text-muted-foreground">{item.score}%</span></div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all" style={{ width: `${item.score}%`, backgroundColor: item.score >= 80 ? "#10b981" : item.score >= 50 ? "#f59e0b" : "#ef4444" }} />
              </div>
            </div>
          ))}
        </div>);
      case "bar": default: return (
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" tick={{ fontSize: 12 }} interval={0} angle={-45} textAnchor="end" height={80} /><YAxis domain={[0, 100]} />
            <Tooltip formatter={(value: number, _name: string, props: any) => { const d = props.payload; return [`${value}% (${d.rawScore}/${d.total})`, "النسبة"]; }} />
            <Bar dataKey="score" radius={[4, 4, 0, 0]}>
              {chartData.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.score >= 80 ? COLORS[0] : entry.score >= 50 ? COLORS[1] : COLORS[2]} />))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>);
    }
  };

  const titles: Record<string, string> = { bar: "أداء الاختبارات", line: "تطور الأداء عبر الوقت", radar: "أداء المواد الدراسية", progress: "نسب النجاح" };

  return (
    <Card className={className}>
      <CardHeader><CardTitle className="text-lg">{titles[type]}</CardTitle></CardHeader>
      <CardContent>{renderChart()}</CardContent>
    </Card>
  );
}
