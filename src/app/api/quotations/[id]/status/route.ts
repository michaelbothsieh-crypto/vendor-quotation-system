import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isAdmin } from "@/lib/permissions";

// 合法狀態轉換矩陣
const TRANSITIONS: Record<string, string[]> = {
  DRAFT: ["SENT"],
  SENT: ["APPROVED", "REJECTED", "DRAFT"], // DRAFT = 撤回
  APPROVED: [],
  REJECTED: [],
};

// 需要 ADMIN 權限的轉換（寄出開放 EDITOR，核准/拒絕/撤回限 ADMIN）
const ADMIN_ONLY_TARGETS = new Set(["APPROVED", "REJECTED", "DRAFT"]);

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const target = String(body.status ?? "");

    const quotation = await db.quotation.findUnique({ where: { id } });
    if (!quotation) {
      return NextResponse.json({ error: "找不到報價單" }, { status: 404 });
    }
    if (!quotation.isLatest) {
      return NextResponse.json(
        { error: "歷史版本不可變更狀態" },
        { status: 400 }
      );
    }

    const allowed = TRANSITIONS[quotation.status] ?? [];
    if (!allowed.includes(target)) {
      return NextResponse.json(
        { error: `不允許從「${quotation.status}」轉換為「${target}」` },
        { status: 400 }
      );
    }

    if (ADMIN_ONLY_TARGETS.has(target)) {
      const session = await auth();
      const role = (session?.user as any)?.role;
      if (!isAdmin(role)) {
        return NextResponse.json(
          { error: "權限不足：核准、拒絕與撤回僅限管理員操作" },
          { status: 403 }
        );
      }
    }

    const updated = await db.quotation.update({
      where: { id },
      data: { status: target },
    });
    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json(
      { error: `變更狀態失敗：${error.message}` },
      { status: 500 }
    );
  }
}
