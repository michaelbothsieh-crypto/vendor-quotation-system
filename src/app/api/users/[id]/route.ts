import { auth } from "@/auth";
import { db } from "@/lib/db";
import { isAdmin, ROLES } from "@/lib/permissions";
import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!isAdmin((session?.user as any)?.role)) {
    return NextResponse.json({ error: "權限不足" }, { status: 403 });
  }
  const { id } = await params;
  try {
    const { name, role, password } = await req.json();
    const data: any = {};
    if (name) data.name = name;
    if (ROLES.includes(role)) data.role = role;
    if (password) {
      if (password.length < 6) {
        return NextResponse.json({ error: "密碼至少需 6 個字元" }, { status: 400 });
      }
      data.passwordHash = await bcrypt.hash(password, 10);
    }
    const user = await db.user.update({
      where: { id },
      data,
      select: { id: true, email: true, name: true, role: true, createdAt: true, updatedAt: true },
    });
    return NextResponse.json(user);
  } catch (error) {
    console.error("PATCH /api/users/[id] error:", error);
    return NextResponse.json({ error: "無法更新人員" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!isAdmin((session?.user as any)?.role)) {
    return NextResponse.json({ error: "權限不足" }, { status: 403 });
  }
  const { id } = await params;
  if ((session?.user as any)?.id === id) {
    return NextResponse.json({ error: "無法刪除自己的帳號" }, { status: 400 });
  }
  try {
    await db.user.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/users/[id] error:", error);
    return NextResponse.json({ error: "無法刪除人員" }, { status: 500 });
  }
}
