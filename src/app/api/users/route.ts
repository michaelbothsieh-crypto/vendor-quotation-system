export const dynamic = "force-dynamic";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";

async function requireAdmin() {
  const session = await auth();
  return (session?.user as any)?.role === "ADMIN";
}

export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "權限不足" }, { status: 403 });
  }
  const users = await db.user.findMany({
    select: { id: true, email: true, name: true, role: true, createdAt: true, updatedAt: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(users);
}

export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "權限不足" }, { status: 403 });
  }
  try {
    const { email, password, name, role } = await req.json();
    if (!email || !password || !name) {
      return NextResponse.json({ error: "帳號、密碼與姓名為必填欄位" }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json({ error: "密碼至少需 6 個字元" }, { status: 400 });
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await db.user.create({
      data: { email, passwordHash, name, role: role === "ADMIN" ? "ADMIN" : "USER" },
      select: { id: true, email: true, name: true, role: true, createdAt: true, updatedAt: true },
    });
    return NextResponse.json(user, { status: 201 });
  } catch (error: any) {
    if (error?.code === "P2002") {
      return NextResponse.json({ error: "此帳號 (Email) 已被使用" }, { status: 409 });
    }
    console.error("POST /api/users error:", error);
    return NextResponse.json({ error: "無法建立人員" }, { status: 500 });
  }
}
