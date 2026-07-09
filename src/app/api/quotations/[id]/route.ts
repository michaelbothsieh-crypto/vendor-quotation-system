import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import {
  jsonRoles,
  buildVendorSnapshot,
  normalizeCategoriesPayload,
  normalizeCommercialPayload,
  normalizeRolesPayload,
  PayloadError,
  QUOTATION_INCLUDE,
} from "@/lib/quotation";

// 取得特定 ID 的報價單詳細資料，包括廠商、大項與下屬細項，依 sortOrder 排序
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const quotation = await db.quotation.findUnique({
      where: { id },
      include: QUOTATION_INCLUDE,
    });

    if (!quotation) {
      return NextResponse.json(
        { error: "找不到該報價單資料" },
        { status: 404 }
      );
    }

    return NextResponse.json(quotation);
  } catch (error: any) {
    return NextResponse.json(
      { error: `無法取得報價單資料：${error.message}` },
      { status: 500 }
    );
  }
}

// 更新報價單：
// - DRAFT：原地更新（草稿反覆修改不產生版本噪音）
// - SENT / APPROVED / REJECTED：建立新版本（回到 DRAFT），舊版保留原狀態作為稽核紀錄
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const title = String(body.title ?? "").trim();
    const vendorId = String(body.vendorId ?? "");

    if (!title || !vendorId) {
      return NextResponse.json(
        { error: "專案名稱與合作廠商為必填欄位" },
        { status: 400 }
      );
    }

    const roles = normalizeRolesPayload(body.roles);
    const categories = normalizeCategoriesPayload(body.categories, roles);
    const commercial = normalizeCommercialPayload(body);

    const vendor = await db.vendor.findUnique({ where: { id: vendorId } });
    if (!vendor) {
      return NextResponse.json({ error: "找不到該合作廠商" }, { status: 400 });
    }

    const result = await db.$transaction(async (tx) => {
      const parent = await tx.quotation.findUnique({ where: { id } });
      if (!parent) throw new PayloadError("NOT_FOUND");
      if (!parent.isLatest) throw new PayloadError("NOT_LATEST");

      const sharedData = {
        title,
        vendorId,
        ...buildVendorSnapshot(vendor),
        roles: jsonRoles(roles),
        ...commercial,
      };

      if (parent.status === "DRAFT") {
        // 草稿原地更新：重建大項與細項
        await tx.quotationCategory.deleteMany({ where: { quotationId: id } });
        return tx.quotation.update({
          where: { id },
          data: { ...sharedData, categories: { create: categories } },
          include: QUOTATION_INCLUDE,
        });
      }

      // 非草稿：另存新版本，舊版保留原狀態（不再覆寫成 ARCHIVED）
      await tx.quotation.update({
        where: { id },
        data: { isLatest: false },
      });
      return tx.quotation.create({
        data: {
          ...sharedData,
          quotationNumber: parent.quotationNumber,
          status: "DRAFT",
          version: parent.version + 1,
          isLatest: true,
          parentQuotationId: parent.id,
          categories: { create: categories },
        },
        include: QUOTATION_INCLUDE,
      });
    });

    return NextResponse.json(result);
  } catch (error: any) {
    if (error instanceof PayloadError) {
      if (error.message === "NOT_FOUND") {
        return NextResponse.json({ error: "找不到報價單" }, { status: 404 });
      }
      if (error.message === "NOT_LATEST") {
        return NextResponse.json(
          { error: "無法更新非最新版本的報價單" },
          { status: 400 }
        );
      }
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json(
      { error: `更新報價單失敗：${error.message}` },
      { status: 500 }
    );
  }
}

// 刪除報價單：連同同單號的所有歷史版本一併刪除（避免最新版刪除後歷史版本變孤兒）
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const quotation = await db.quotation.findUnique({
      where: { id },
      select: { quotationNumber: true },
    });
    if (!quotation) {
      return NextResponse.json({ error: "找不到報價單" }, { status: 404 });
    }
    await db.quotation.deleteMany({
      where: { quotationNumber: quotation.quotationNumber },
    });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: `刪除報價單失敗：${error.message}` },
      { status: 500 }
    );
  }
}
