import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const calculateScoreSchema = z.object({
  examId: z.string().uuid(),
  studentId: z.string().uuid(),
  answers: z.record(z.union([z.string(), z.array(z.string())])),
  timeSpentSeconds: z.number().int().min(0),
});

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = calculateScoreSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "بيانات غير صالحة", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { examId, studentId, answers, timeSpentSeconds } = parsed.data;

    if (user.id !== studentId) {
      return NextResponse.json(
        { error: "لا يمكنك تقديم الاختبار نيابة عن طالب آخر" },
        { status: 403 }
      );
    }

    const { data: enrollment } = await supabase
      .from("exam_enrollments")
      .select("id")
      .eq("student_id", studentId)
      .eq("exam_id", examId)
      .single();

    if (!enrollment) {
      return NextResponse.json(
        { error: "أنت غير مسجل في هذا الاختبار" },
        { status: 403 }
      );
    }

    const { data: examData } = await supabase
      .from("exam_exams")
      .select("end_time, is_published")
      .eq("id", examId)
      .single();

    if (!examData?.is_published) {
      return NextResponse.json(
        { error: "الاختبار غير متاح" },
        { status: 403 }
      );
    }

    if (examData.end_time && new Date(examData.end_time) < new Date()) {
      return NextResponse.json(
        { error: "انتهى وقت الاختبار" },
        { status: 403 }
      );
    }

    const { data: existingAttempt } = await supabase
      .from("exam_attempts")
      .select("id")
      .eq("student_id", studentId)
      .eq("exam_id", examId)
      .single();

    if (existingAttempt) {
      return NextResponse.json(
        { error: "لقد قدمت هذا الاختبار مسبقاً" },
        { status: 409 }
      );
    }

    const { data: examQuestions, error: eqError } = await supabase
      .from("exam_exam_questions")
      .select(`
        points,
        order_num,
        question:question_id (
          id,
          correct_answer,
          type,
          is_multi_select
        )
      `)
      .eq("exam_id", examId);

    if (eqError || !examQuestions) {
      return NextResponse.json(
        { error: "فشل في جلب أسئلة الاختبار" },
        { status: 500 }
      );
    }

    let totalPoints = 0;
    let earnedPoints = 0;
    const processedAnswers: Record<string, any> = {};

    for (const eq of examQuestions) {
      const q = eq.question as any;
      const qPoints = eq.points || 0;
      totalPoints += qPoints;

      const studentAnswer = answers[q.id];
      let isCorrect = false;

      if (studentAnswer !== undefined && studentAnswer !== null) {
        if (q.type === "multiple_choice" || q.type === "true_false") {
          if (q.is_multi_select) {
            const correctArr = Array.isArray(q.correct_answer)
              ? q.correct_answer
              : JSON.parse(q.correct_answer || "[]");
            const studentArr = Array.isArray(studentAnswer)
              ? studentAnswer
              : [studentAnswer];
            isCorrect =
              correctArr.length === studentArr.length &&
              correctArr.every((a: string) => studentArr.includes(a));
          } else {
            isCorrect = String(studentAnswer).trim() === String(q.correct_answer).trim();
          }
        } else if (q.type === "essay") {
          isCorrect = false;
        }
      }

      if (isCorrect) earnedPoints += qPoints;

      processedAnswers[q.id] = {
        answer: studentAnswer,
        correctAnswer: q.correct_answer,
        isCorrect,
        points: isCorrect ? qPoints : 0,
        maxPoints: qPoints,
      };
    }

    const percentage = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0;

    const { data: examPassData } = await supabase
      .from("exam_exams")
      .select("passing_score")
      .eq("id", examId)
      .single();

    const passingScore = examPassData?.passing_score || 50;
    const status = percentage >= passingScore ? "passed" : "failed";

    const { data: attempt, error: attemptError } = await supabase
      .from("exam_attempts")
      .insert({
        student_id: studentId,
        exam_id: examId,
        answers: processedAnswers,
        score: earnedPoints,
        total_points: totalPoints,
        percentage,
        status,
        submitted_at: new Date().toISOString(),
        time_spent_seconds: timeSpentSeconds,
      })
      .select()
      .single();

    if (attemptError) {
      return NextResponse.json(
        { error: "فشل في حفظ نتيجة الاختبار", details: attemptError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      attempt,
      score: earnedPoints,
      totalPoints,
      percentage,
      status,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: "خطأ داخلي في الخادم", message: err.message },
      { status: 500 }
    );
  }
}