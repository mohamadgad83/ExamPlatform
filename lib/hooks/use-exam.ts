"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useMutation } from "@tanstack/react-query";

interface ExamState {
  currentQuestionIndex: number;
  answers: Record<string, any>;
  flaggedQuestions: string[];
  timeSpentSeconds: number;
  isSubmitted: boolean;
  isSubmitting: boolean;
}

interface UseExamOptions {
  examId: string;
  studentId: string;
  totalQuestions: number;
  durationMinutes: number;
  onSubmitSuccess?: (data: any) => void;
  onSubmitError?: (error: any) => void;
}

export function useExam({ examId, studentId, totalQuestions, durationMinutes, onSubmitSuccess, onSubmitError }: UseExamOptions) {
  const [state, setState] = useState<ExamState>({
    currentQuestionIndex: 0, answers: {}, flaggedQuestions: [],
    timeSpentSeconds: 0, isSubmitted: false, isSubmitting: false,
  });
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(Date.now());

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setState((prev) => ({ ...prev, timeSpentSeconds: Math.floor((Date.now() - startTimeRef.current) / 1000) }));
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  const setAnswer = useCallback((questionId: string, answer: any) => {
    setState((prev) => ({ ...prev, answers: { ...prev.answers, [questionId]: answer } }));
  }, []);

  const toggleFlag = useCallback((questionId: string) => {
    setState((prev) => {
      const isFlagged = prev.flaggedQuestions.includes(questionId);
      return { ...prev, flaggedQuestions: isFlagged ? prev.flaggedQuestions.filter((id) => id !== questionId) : [...prev.flaggedQuestions, questionId] };
    });
  }, []);

  const goToQuestion = useCallback((index: number) => {
    setState((prev) => ({ ...prev, currentQuestionIndex: Math.max(0, Math.min(totalQuestions - 1, index)) }));
  }, [totalQuestions]);

  const goToNext = useCallback(() => goToQuestion(state.currentQuestionIndex + 1), [goToQuestion, state.currentQuestionIndex]);
  const goToPrevious = useCallback(() => goToQuestion(state.currentQuestionIndex - 1), [goToQuestion, state.currentQuestionIndex]);

  const answeredCount = Object.keys(state.answers).filter((k) => state.answers[k] !== undefined && state.answers[k] !== null && state.answers[k] !== "").length;
  const unansweredCount = totalQuestions - answeredCount;

  const submitMutation = useMutation({
    mutationFn: async () => {
      setState((prev) => ({ ...prev, isSubmitting: true }));
      const response = await fetch("/api/calculate-score", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ examId, studentId, answers: state.answers, timeSpentSeconds: state.timeSpentSeconds }),
      });
      if (!response.ok) { const errorData = await response.json(); throw new Error(errorData.error || "فشل في تسليم الاختبار"); }
      return response.json();
    },
    onSuccess: (data) => { setState((prev) => ({ ...prev, isSubmitted: true, isSubmitting: false })); onSubmitSuccess?.(data); },
    onError: (error) => { setState((prev) => ({ ...prev, isSubmitting: false })); onSubmitError?.(error); },
  });

  const submitExam = useCallback(() => {
    if (state.isSubmitting || state.isSubmitted) return;
    if (unansweredCount > 0) { const confirmed = window.confirm(`لم تجب على ${unansweredCount} سؤال. هل تريد التسليم؟`); if (!confirmed) return; }
    submitMutation.mutate();
  }, [state.isSubmitting, state.isSubmitted, unansweredCount, submitMutation]);

  const autoSubmit = useCallback(() => { if (!state.isSubmitted && !state.isSubmitting) submitMutation.mutate(); }, [state.isSubmitted, state.isSubmitting, submitMutation]);

  return { ...state, setAnswer, toggleFlag, goToQuestion, goToNext, goToPrevious, submitExam, autoSubmit, answeredCount, unansweredCount, isSubmitting: submitMutation.isPending, submitError: submitMutation.error };
}
