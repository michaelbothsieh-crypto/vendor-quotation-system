import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { checkApiPermission, isAdmin } from "@/lib/permissions";

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const { pathname } = req.nextUrl;
  const role = (req.auth?.user as any)?.role;

  if (pathname.startsWith("/login") || pathname.startsWith("/api/auth")) {
    return NextResponse.next();
  }

  if (!isLoggedIn) {
    if (pathname.startsWith("/api")) {
      return NextResponse.json({ error: "未登入" }, { status: 401 });
    }
    const loginUrl = new URL("/login", req.nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (pathname.startsWith("/users") && !isAdmin(role)) {
    if (pathname.startsWith("/api")) {
      return NextResponse.json({ error: "權限不足" }, { status: 403 });
    }
    return NextResponse.redirect(new URL("/", req.nextUrl.origin));
  }

  if (pathname.startsWith("/api")) {
    const permission = checkApiPermission(pathname, req.method, role);
    if (!permission.allowed) {
      return NextResponse.json({ error: permission.error }, { status: 403 });
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
