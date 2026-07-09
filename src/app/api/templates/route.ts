import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { jsonRoles, normalizeRolesPayload, PayloadError } from "@/lib/quotation";

export const dynamic = "force-dynamic";

// 取得所有報價範本（預設範本排最前）
export async function GET() {
  try {
    const templates = await db.quoteTemplate.findMany({
      orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
    });
    return NextResponse.json(templates);
  } catch (error: any) {
    return NextResponse.json(
      { error: `無法取得報價範本：${error.message}` },
      { status: 500 }
    );
  }
}

// 建立新範本（proxy 已限 ADMIN）
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const name = String(body.name ?? "").trim();
    if (!name) {
      return NextResponse.json({ error: "範本名稱為必填欄位" }, { status: 400 });
    }
    const roles = normalizeRolesPayload(body.roles);

    const template = await db.$transaction(async (tx) => {
      const isFirst = (await tx.quoteTemplate.count()) === 0;
      const isDefault = isFirst || body.isDefault === true;
      if (isDefault) {
        await tx.quoteTemplate.updateMany({ data: { isDefault: false } });
      }
      return tx.quoteTemplate.create({
        data: {
          name,
          isDefault,
          roles: jsonRoles(roles),
          paymentTerms: String(body.paymentTerms ?? "").trim() || null,
          notes: String(body.notes ?? "").trim() || null,
        },
      });
    });

    return NextResponse.json(template, { status: 201 });
  } catch (error: any) {
    if (error instanceof PayloadError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json(
      { error: `建立範本失敗：${error.message}` },
      { status: 500 }
    );
  }
}
