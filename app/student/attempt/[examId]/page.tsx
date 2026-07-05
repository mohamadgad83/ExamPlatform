"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Clock, 
  AlertTriangle, 
  ChevronRight, 
  ChevronLeft,
  Flag,
  Send,
  Loader2,
  Check,
  FileText,
  Play
} from "lucide-react";
import { formatDuration } from "@/lib/utils/format";

interface Question {
  id: number;
  text: string;
  type: string;
  options: string | null;
  points: number | null;
  question_image: string | null;
  is_multi_select: boolean | null;
}

interface ExamQuestion {
  id: number;
  question_id: number;
  points: number | null;
  order_num: number | null;
  question: Question;
}

interface Exam {
  id: number;
  title: string;
  duration_minutes: number;
  total_points: number | null;
}

export default function ExamAttemptPage() {
  const params = useParams();
  const router = useRouter();
  const supabase = createClient();
  const examId = Number(params.examId);

  const [exam, setExam] = useState<Exam | null>(null);
  const [questions, setQuestions] = useState<ExamQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [flagged, setFlagged] = useState<Set<number>>(new Set());
  const [timeLeft, setTimeLeft] = useState(0);
  const [attemptId, setAttemptId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [violations, setViolations] = useState(0);
  const [showConfirmSubmit, setShowConfirmSubmit] = useState(false);
  const [examMode, setExamMode] = useState(false);
  const [error, setError] = useState("");

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const autoSaveRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<Date | null>(null);

  // Load exam data
  useEffect(() => {
    loadExam();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (autoSaveRef.current) clearInterval(autoSaveRef.current);
    };
  }, []);

  // Timer
  useEffect(() => {
    if (timeLeft > 0 && examMode) {
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            handleAutoSubmit();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [timeLeft, examMode]);

  // Auto-save every 30 seconds
  useEffect(() => {
    if (examMode && attemptId) {
      autoSaveRef.current = setInterval(() => {
        saveAnswers();
      }, 30000);
    }
    return () => {
      if (autoSaveRef.current) clearInterval(autoSaveRef.current);
    };
  }, [examMode, attemptId, answers]);

  // Anti-cheating: visibility change
  useEffect(() => {
    if (!examMode) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        logViolation("tab_switch", "تم مغادرة نافذة الاختبار");
      }
    };

    const handleBlur = () => {
      logViolation("window_blur", "تم النقر خارج نافذة الاختبار");
    };

    const handleContextMenu = (e: Event) => {
      e.preventDefault();
      logViolation("right_click", "تم محاولة فتح قائمة السياق");
      return false;
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent F12
      if (e.key === "F12") {
        e.preventDefault();
        logViolation("devtools", "تم محاولة فتح أدوات المطور (F12)");
        return false;
      }
      // Prevent Ctrl+Shift+I/J/C/U
      if (e.ctrlKey && e.shiftKey && ["I", "J", "C", "U"].includes(e.key)) {
        e.preventDefault();
        logViolation("devtools", "تم محاولة فتح أدوات المطور");
        return false;
      }
      // Prevent Ctrl+U (view source)
      if (e.ctrlKey && e.key === "u") {
        e.preventDefault();
        logViolation("view_source", "تم محاولة عرض مصدر الصفحة");
        return false;
      }
      // Prevent Ctrl+P (print)
      if (e.ctrlKey && e.key === "p") {
        e.preventDefault();
        logViolation("print", "تم محاولة الطباعة");
        return false;
      }
      // Prevent Ctrl+S (save)
      if (e.ctrlKey && e.key === "s") {
        e.preventDefault();
        logViolation("save", "تم محاولة حفظ الصفحة");
        return false;
      }
      // Prevent Print Screen
      if (e.key === "PrintScreen") {
        e.preventDefault();
        logViolation("screenshot", "تم ضغط زر Print Screen");
        return false;
      }
    };

    const handleCopy = (e: ClipboardEvent) => {
      const active = document.activeElement;
      if (active?.tagName !== "INPUT" && active?.tagName !== "TEXTAREA") {
        e.preventDefault();
        logViolation("copy", "تم محاولة نسخ");
        return false;
      }
    };

    const handleSelectStart = (e: Event) => {
      const target = e.target as HTMLElement;
      if (target.tagName !== "INPUT" && target.tagName !== "TEXTAREA") {
        e.preventDefault();
        return false;
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleBlur);
    document.addEventListener("contextmenu", handleContextMenu);
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("copy", handleCopy);
    document.addEventListener("selectstart", handleSelectStart);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleBlur);
      document.removeEventListener("contextmenu", handleContextMenu);
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("copy", handleCopy);
      document.removeEventListener("selectstart", handleSelectStart);
    };
  }, [examMode]);

  async function loadExam() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      // Get exam details
      const { data: examData } = await supabase
        .from("exam_exams")
        .select("*")
        .eq("id", examId)
        .single();

      if (!examData) {
        setError("الاختبار غير موجود");
        setLoading(false);
        return;
      }

      setExam(examData);

      // Get exam questions with question details
      const { data: examQuestions } = await supabase
        .from("exam_exam_questions")
        .select(`
          id,
          question_id,
          points,
          order_num,
          question:exam_questions_bank(id, text, type, options, points, question_image, is_multi_select)
        `)
        .eq("exam_id", examId)
        .order("order_num", { ascending: true });

      // Filter out any questions that failed to join
      const validQuestions = (examQuestions || []).filter(
        (eq: any) => eq.question && eq.question.id
      ) as ExamQuestion[];

      setQuestions(validQuestions);

      // Get student record
      const { data: student } = await supabase
        .from("exam_students")
        .select("id")
        .eq("phone", user.email)
        .single();

      const studentId = student?.id;

      // Check for existing attempt
      const { data: existingAttempt } = await supabase
        .from("exam_attempts")
        .select("*")
        .eq("exam_id", examId)
        .eq("student_id", studentId)
        .eq("status", "in_progress")
        .single();

      if (existingAttempt) {
        setAttemptId(existingAttempt.id);
        // Restore answers
        if (existingAttempt.answers) {
          setAnswers(existingAttempt.answers as Record<number, string>);
        }
        // Calculate remaining time
        const startedAt = new Date(existingAttempt.created_at);
        const now = new Date();
        const elapsedSeconds = Math.floor((now.getTime() - startedAt.getTime()) / 1000);
        const totalSeconds = (examData.duration_minutes || 60) * 60;
        setTimeLeft(Math.max(0, totalSeconds - elapsedSeconds));
      } else {
        // Create new attempt
        const { data: newAttempt } = await supabase
          .from("exam_attempts")
          .insert({
            exam_id: examId,
            student_id: studentId,
            status: "in_progress",
            answers: {},
            created_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (newAttempt) {
          setAttemptId(newAttempt.id);
          setTimeLeft((examData.duration_minutes || 60) * 60);
        }
      }

      startTimeRef.current = new Date();
      setLoading(false);
    } catch (err) {
      setError("حدث خطأ أثناء تحميل الاختبار");
      setLoading(false);
    }
  }

  async function logViolation(type: string, message: string) {
    setViolations(prev => {
      const newCount = prev + 1;
      if (newCount >= 3) {
        handleAutoSubmit();
      }
      return newCount;
    });

    // Send to server
    try {
      await fetch("/api/security-log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          attempt_id: attemptId,
          type,
          message,
          data: { count: violations + 1 },
        }),
      });
    } catch (e) {
      // Silent fail
    }
  }

  async function saveAnswers() {
    if (!attemptId) return;

    await supabase
      .from("exam_attempts")
      .update({
        answers: answers,
        updated_at: new Date().toISOString(),
      })
      .eq("id", attemptId);
  }

  async function handleAutoSubmit() {
    await handleSubmit(true);
  }

  async function handleSubmit(auto: boolean = false) {
    if (!attemptId || !exam) return;

    setSubmitting(true);

    try {
      // Calculate score via Edge Function
      const response = await fetch("/api/calculate-score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          attempt_id: attemptId,
          answers: answers,
          exam_id: examId,
        }),
      });

      const result = await response.json();

      if (result.success) {
        router.push(`/student/results?exam=${examId}`);
      } else {
        setError(result.error || "حدث خطأ أثناء التسليم");
        setSubmitting(false);
      }
    } catch (err) {
      setError("حدث خطأ أثناء التسليم");
      setSubmitting(false);
    }
  }

  function handleAnswer(questionId: number, answer: string) {
    setAnswers(prev => ({ ...prev, [questionId]: answer }));
  }

  function toggleFlag(index: number) {
    setFlagged(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  }

  function formatTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  }

  function getQuestionOptions(optionsStr: string | null): string[] {
    if (!optionsStr) return [];
    try {
      return JSON.parse(optionsStr);
    } catch {
      return optionsStr.split("\n").filter(Boolean);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Alert variant="destructive" className="max-w-md">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!examMode) {
    return (
      <div className="max-w-2xl mx-auto py-12">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl text-center">{exam?.title}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <p className="text-muted-foreground">{exam?.description || "لا يوجد وصف"}</p>
              <div className="flex items-center gap-4 text-sm">
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {exam?.duration_minutes} دقيقة
                </span>
                <span className="flex items-center gap-1">
                  <FileText className="w-4 h-4" />
                  {questions.length} سؤال
                </span>
              </div>
            </div>

            <Alert>
              <AlertTriangle className="w-4 h-4" />
              <AlertDescription>
                عند بدء الاختبار، سيتم تفعيل وضع الامتحان الآمن. 
                لا يمكنك مغادرة الصفحة أو فتح تبويبات أخرى.
              </AlertDescription>
            </Alert>

            <Button 
              className="w-full" 
              size="lg"
              onClick={() => {
                setExamMode(true);
                // Request fullscreen
                const elem = document.documentElement;
                if (elem.requestFullscreen) {
                  elem.requestFullscreen().catch(() => {});
                }
              }}
            >
              <Play className="w-4 h-4 ml-2" />
              بدء الاختبار
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];
  const options = getQuestionOptions(currentQuestion?.question?.options || null);
  const answeredCount = Object.keys(answers).length;
  const progress = questions.length > 0 ? (answeredCount / questions.length) * 100 : 0;

  return (
    <div className="exam-mode min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
        <div className="container flex h-14 items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="font-bold text-lg truncate max-w-[200px]">{exam?.title}</h1>
            <Badge variant={timeLeft < 300 ? "destructive" : "outline"} className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {formatTime(timeLeft)}
            </Badge>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              سؤال {currentIndex + 1} من {questions.length}
            </span>
            {violations > 0 && (
              <Badge variant="destructive" className="flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                {violations} انتهاك
              </Badge>
            )}
          </div>
        </div>
        {/* Progress bar */}
        <div className="h-1 bg-muted">
          <div 
            className="h-full bg-primary transition-all duration-300" 
            style={{ width: `${progress}%` }}
          />
        </div>
      </header>

      <main className="container py-6 max-w-4xl mx-auto">
        <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
          {/* Question Area */}
          <div className="space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-start justify-between">
                <div>
                  <CardTitle className="text-lg">
                    سؤال {currentIndex + 1}
                    {currentQuestion?.question?.points && (
                      <span className="text-sm font-normal text-muted-foreground mr-2">
                        ({currentQuestion.question.points} نقطة)
                      </span>
                    )}
                  </CardTitle>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleFlag(currentIndex)}
                  className={flagged.has(currentIndex) ? "text-amber-500" : ""}
                >
                  <Flag className="w-4 h-4" />
                </Button>
              </CardHeader>
              <CardContent className="space-y-6">
                <p className="text-lg leading-relaxed">{currentQuestion?.question?.text}</p>

                {currentQuestion?.question?.question_image && (
                  <img 
                    src={currentQuestion.question.question_image} 
                    alt="صورة السؤال"
                    className="max-w-full rounded-lg border"
                  />
                )}

                {/* Answer Options */}
                <div className="space-y-3">
                  {options.map((option, idx) => {
                    const isSelected = answers[currentQuestion?.question?.id || 0] === option;
                    return (
                      <button
                        key={idx}
                        onClick={() => handleAnswer(currentQuestion?.question?.id || 0, option)}
                        className={`w-full text-right p-4 rounded-lg border-2 transition-all ${
                          isSelected
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/50"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                            isSelected ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground"
                          }`}>
                            {isSelected && <Check className="w-3 h-3" />}
                          </div>
                          <span>{option}</span>
                        </div>
                      </button>
                    );
                  })}

                  {/* True/False */}
                  {currentQuestion?.question?.type === "true_false" && (
                    <div className="flex gap-3">
                      {["صح", "خطأ"].map((option) => {
                        const isSelected = answers[currentQuestion?.question?.id || 0] === option;
                        return (
                          <button
                            key={option}
                            onClick={() => handleAnswer(currentQuestion?.question?.id || 0, option)}
                            className={`flex-1 p-4 rounded-lg border-2 transition-all ${
                              isSelected
                                ? "border-primary bg-primary/5"
                                : "border-border hover:border-primary/50"
                            }`}
                          >
                            {option}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Essay / Fill blank */}
                  {(currentQuestion?.question?.type === "essay" || currentQuestion?.question?.type === "fill_blank") && (
                    <textarea
                      className="w-full min-h-[150px] p-4 rounded-lg border-2 border-border focus:border-primary focus:outline-none resize-none"
                      placeholder="اكتب إجابتك هنا..."
                      value={answers[currentQuestion?.question?.id || 0] || ""}
                      onChange={(e) => handleAnswer(currentQuestion?.question?.id || 0, e.target.value)}
                    />
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Navigation */}
            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
                disabled={currentIndex === 0}
              >
                <ChevronRight className="w-4 h-4 ml-2" />
                السابق
              </Button>

              {currentIndex < questions.length - 1 ? (
                <Button onClick={() => setCurrentIndex(prev => Math.min(questions.length - 1, prev + 1))}>
                  التالي
                  <ChevronLeft className="w-4 h-4 mr-2" />
                </Button>
              ) : (
                <Button onClick={() => setShowConfirmSubmit(true)} variant="default">
                  <Send className="w-4 h-4 ml-2" />
                  تسليم الاختبار
                </Button>
              )}
            </div>
          </div>

          {/* Question Navigator */}
          <Card className="h-fit sticky top-20">
            <CardHeader>
              <CardTitle className="text-sm">مؤشر الأسئلة</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-5 gap-2">
                {questions.map((q, idx) => {
                  const isAnswered = answers[q.question?.id || 0];
                  const isFlagged = flagged.has(idx);
                  const isCurrent = idx === currentIndex;

                  return (
                    <button
                      key={idx}
                      onClick={() => setCurrentIndex(idx)}
                      className={`w-10 h-10 rounded-lg text-sm font-medium transition-all ${
                        isCurrent
                          ? "bg-primary text-primary-foreground"
                          : isAnswered
                          ? "bg-emerald-100 text-emerald-700 border border-emerald-300"
                          : isFlagged
                          ? "bg-amber-100 text-amber-700 border border-amber-300"
                          : "bg-muted text-muted-foreground border border-border"
                      }`}
                    >
                      {idx + 1}
                    </button>
                  );
                })}
              </div>
              <div className="mt-4 space-y-2 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-emerald-100 border border-emerald-300" />
                  <span>مجاب ({answeredCount})</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-amber-100 border border-amber-300" />
                  <span>معلم ({flagged.size})</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-muted border border-border" />
                  <span>غير مجاب ({questions.length - answeredCount})</span>
                </div>
              </div>

              <Button 
                className="w-full mt-4" 
                variant="outline"
                onClick={() => setShowConfirmSubmit(true)}
              >
                <Send className="w-4 h-4 ml-2" />
                تسليم الاختبار
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Confirm Submit Modal */}
      {showConfirmSubmit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="max-w-md w-full mx-4">
            <CardHeader>
              <CardTitle>تأكيد التسليم</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>هل أنت متأكد من تسليم الاختبار؟</p>
              <div className="bg-muted p-3 rounded-lg text-sm space-y-1">
                <p>إجمالي الأسئلة: {questions.length}</p>
                <p>الأسئلة المجابة: {answeredCount}</p>
                <p>الأسئلة غير المجابة: {questions.length - answeredCount}</p>
              </div>
              {questions.length - answeredCount > 0 && (
                <Alert variant="warning">
                  <AlertDescription>
                    لم تجب على {questions.length - answeredCount} سؤال/أسئلة!
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
            <div className="flex gap-3 p-6 pt-0">
              <Button variant="outline" className="flex-1" onClick={() => setShowConfirmSubmit(false)}>
                إلغاء
              </Button>
              <Button 
                className="flex-1" 
                onClick={() => handleSubmit()}
                disabled={submitting}
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "تأكيد التسليم"
                )}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
