import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4" dir="rtl">
      <div className="text-center space-y-4 max-w-md">
        <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
          <ShieldAlert className="w-8 h-8 text-destructive" />
        </div>
        <h1 className="text-2xl font-bold">غير مصرح لك بالدخول هنا</h1>
        <p className="text-muted-foreground">
          الحساب اللي داخل بيه معندوش صلاحية يشوف الصفحة دي.
        </p>
        <Button asChild>
          <Link href="/login">الرجوع لتسجيل الدخول</Link>
        </Button>
      </div>
    </div>
  );
}
