import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import {
  jsonRoles,
  buildVendorSnapshot,
  generateQuotationNumber,
  normalizeCategoriesPayload,
  normalizeCommercialPayload,
  normalizeRolesPayload,
  PayloadError,
  QUOTATION_INCLUDE,
} from "@/lib/quotation";

export const dynamic = "force-dynamic";

// 取得所有報價單列表，包含廠商關聯資料
export async function GET(request?: Request) {
  try {
    let allVersions = false;
    let quotationNumber: string | null = null;

    if (request) {
      const { searchParams } = new URL(request.url);
      allVersions = searchParams.get("allVersions") === "true";
      quotationNumber = searchParams.get("quotationNumber");
    }

    if (allVersions && !quotationNumber) {
      return NextResponse.json(
        { error: "查詢歷史版本時，必須提供報價單號" },
        { status: 400 }
      );
    }

    const whereClause: any = {};
    if (!allVersions) {
      whereClause.isLatest = true;
    }
    if (quotationNumber) {
      whereClause.quotationNumber = quotationNumber;
    }

    const quotations = await db.quotation.findMany({
      where: whereClause,
      include: QUOTATION_INCLUDE,
      orderBy: allVersions && quotationNumber
        ? { version: "desc" }
        : { createdAt: "desc" },
    });
    return NextResponse.json(quotations);
  } catch (error: any) {
    return NextResponse.json(
      { error: `無法取得報價單列表：${error.message}` },
      { status: 500 }
    );
  }
}

// 建立報價單：動態角色欄位 + 商務條件 + 廠商快照，在單一交易中建立
export async function POST(request: Request) {
  try {
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

    const newQuotation = await db.$transaction(async (tx) => {
      const quotationNumber = await generateQuotationNumber(tx);
      return tx.quotation.create({
        data: {
          quotationNumber,
          title,
          vendorId,
          ...buildVendorSnapshot(vendor),
          roles: jsonRoles(roles),
          ...commercial,
          categories: { create: categories },
        },
        include: QUOTATION_INCLUDE,
      });
    });

    return NextResponse.json(newQuotation, { status: 201 });
  } catch (error: any) {
    if (error instanceof PayloadError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json(
      { error: `建立報價單失敗：${error.message}` },
      { status: 500 }
    );
  }
}
