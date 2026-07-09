import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [vendors, systemSettings, quotations, quotationCategories, quotationItems] = await Promise.all([
      db.vendor.findMany(),
      db.systemSetting.findMany(),
      db.quotation.findMany(),
      db.quotationCategory.findMany(),
      db.quotationItem.findMany(),
    ]);

    return NextResponse.json({
      vendors,
      systemSettings,
      quotations,
      quotationCategories,
      quotationItems,
    });
  } catch (error) {
    console.error("GET /api/admin/database error:", error);
    return NextResponse.json(
      { error: "無法取得資料庫原始資料" },
      { status: 500 }
    );
  }
}
