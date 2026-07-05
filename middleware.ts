import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request: { headers: request.headers } });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) { return request.cookies.get(name)?.value; },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options });
          response = NextResponse.next({ request: { headers: request.headers } });
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: "", ...options });
          response = NextResponse.next({ request: { headers: request.headers } });
          response.cookies.set({ name, value: "", ...options });
        },
      },
    }
  );

  // Check custom auth token (exam_auth)
  const authCookie = request.cookies.get("exam_auth")?.value;
  let userRole: string | null = null;
  let isAuthenticated = false;

  if (authCookie) {
    try {
      const parsed = JSON.parse(authCookie);
      if (parsed.expiresAt && parsed.expiresAt > Date.now()) {
        isAuthenticated = true;
        userRole = parsed.user?.role || null;
      }
    } catch { /* invalid cookie */ }
  }

  // Fallback to Supabase Auth
  if (!isAuthenticated) {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: userData } = await supabase.from("exam_users").select("role").eq("id", user.id).single();
      if (userData) { isAuthenticated = true; userRole = userData.role; }
    }
  }

  const pathname = request.nextUrl.pathname;

  // Public routes
  if (pathname === "/" || pathname.startsWith("/login") || pathname.startsWith("/register") || pathname.startsWith("/forgot-password")) {
    return response;
  }

  // Protected routes
  if (!isAuthenticated) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Role-based access
  const roleRoutes: Record<string, string[]> = {
    student: ["/student", "/dashboard"],
    teacher: ["/teacher", "/dashboard"],
    admin: ["/admin", "/teacher", "/student", "/dashboard"],
  };

  const allowedRoutes = userRole ? roleRoutes[userRole] || [] : [];
  const hasAccess = allowedRoutes.some((route) => pathname.startsWith(route));

  if (!hasAccess) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
