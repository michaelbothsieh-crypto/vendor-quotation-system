export const dynamic = "force-dynamic";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { isAdmin } from "@/lib/permissions";
import { calculateQuotation, parseRoles } from "@/lib/calculator";
import { NextResponse } from "next/server";

/**
 * 收益總覽資料來源：只取每張報價單的最新版本（isLatest），
 * 金額一律由 server 端以 calculateQuotation 計算，與列印頁數字一致；
 * 彙總（KPI / 月度 / 排行）由前端依篩選條件計算。
 */
export async function GET() {
  const session = await auth();
  if (!isAdmin((session?.user as any)?.role)) {
    return NextResponse.json({ error: "權限不足：僅管理員可檢視收益總覽" }, { status: 403 });
  }

  try {
    const quotations = await db.quotation.findMany({
      where: { isLatest: true },
      include: {
        vendor: { select: { name: true } },
        categories: { include: { items: true } },
      },
      orderBy: { issueDate: "desc" },
    });

    const rows = quotations.map((q) => {
      const roles = parseRoles(q.roles);
      const allItems = q.categories.flatMap((cat: any) => cat.items);
      const summary = calculateQuotation(allItems, roles, q.taxRate, q.discount);
      return {
        id: q.id,
        quotationNumber: q.quotationNumber,
        title: q.title,
        vendorName: q.vendorName || q.vendor?.name || "",
        status: q.status,
        issueDate: q.issueDate,
        subtotal: summary.subtotal,
        discount: summary.discount,
        total: summary.total,
      };
    });

    return NextResponse.json({ rows });
  } catch (error) {
    console.error("GET /api/revenue error:", error);
    return NextResponse.json({ error: "無法取得收益資料" }, { status: 500 });
  }
}
