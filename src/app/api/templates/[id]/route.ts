import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { jsonRoles, normalizeRolesPayload, PayloadError } from "@/lib/quotation";

// 更新範本（proxy 已限 ADMIN）
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const name = String(body.name ?? "").trim();
    if (!name) {
      return NextResponse.json({ error: "範本名稱為必填欄位" }, { status: 400 });
    }
    const roles = normalizeRolesPayload(body.roles);

    const template = await db.$transaction(async (tx) => {
      const existing = await tx.quoteTemplate.findUnique({ where: { id } });
      if (!existing) throw new PayloadError("NOT_FOUND");

      // 設為預設時取消其他範本的預設；不可取消唯一預設（保證永遠有一個預設範本）
      const isDefault = body.isDefault === true || existing.isDefault;
      if (body.isDefault === true && !existing.isDefault) {
        await tx.quoteTemplate.updateMany({ data: { isDefault: false } });
      }
      return tx.quoteTemplate.update({
        where: { id },
        data: {
          name,
          isDefault,
          roles: jsonRoles(roles),
          paymentTerms: String(body.paymentTerms ?? "").trim() || null,
          notes: String(body.notes ?? "").trim() || null,
        },
      });
    });

    return NextResponse.json(template);
  } catch (error: any) {
    if (error instanceof PayloadError) {
      if (error.message === "NOT_FOUND") {
        return NextResponse.json({ error: "找不到該範本" }, { status: 404 });
      }
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json(
      { error: `更新範本失敗：${error.message}` },
      { status: 500 }
    );
  }
}

// 刪除範本：不可刪除最後一個；刪除預設範本時自動遞補下一個為預設
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await db.$transaction(async (tx) => {
      const existing = await tx.quoteTemplate.findUnique({ where: { id } });
      if (!existing) throw new PayloadError("NOT_FOUND");
      const count = await tx.quoteTemplate.count();
      if (count <= 1) {
        throw new PayloadError("系統至少需要保留一個報價範本，無法刪除");
      }
      await tx.quoteTemplate.delete({ where: { id } });
      if (existing.isDefault) {
        const next = await tx.quoteTemplate.findFirst({ orderBy: { createdAt: "asc" } });
        if (next) {
          await tx.quoteTemplate.update({ where: { id: next.id }, data: { isDefault: true } });
        }
      }
    });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error instanceof PayloadError) {
      if (error.message === "NOT_FOUND") {
        return NextResponse.json({ error: "找不到該範本" }, { status: 404 });
      }
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json(
      { error: `刪除範本失敗：${error.message}` },
      { status: 500 }
    );
  }
}
