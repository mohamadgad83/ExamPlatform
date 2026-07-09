"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);
  return (
    <div className="min-h-screen flex items-center justify-center p-4" dir="rtl">
      <div className="text-center space-y-4 max-w-md">
        <AlertTriangle className="h-16 w-16 text-red-500 mx-auto" />
        <h2 className="text-2xl font-bold">حدث خطأ ما</h2>
        <p className="text-muted-foreground">{error.message || "حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى."}</p>
        <Button onClick={reset}>إعادة المحاولة</Button>
      </div>
    </div>
  );
}
