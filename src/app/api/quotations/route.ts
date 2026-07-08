import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// 取得所有報價單列表，包含廠商關聯資料，依建立時間倒序排列
export async function GET() {
  try {
    const quotations = await db.quotation.findMany({
      include: {
        vendor: true,
        categories: {
          orderBy: { sortOrder: "asc" },
          include: {
            items: {
              orderBy: { sortOrder: "asc" },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });
    return NextResponse.json(quotations);
  } catch (error: any) {
    return NextResponse.json(
      { error: `無法取得報價單列表：${error.message}` },
      { status: 500 }
    );
  }
}

// 接收報價單結構，在單一交易中建立報價單、大項與細項
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      title,
      vendorId,
      taxRate,
      rdRate,
      pmRate,
      qcRate,
      integrationRate,
      categories,
    } = body;

    if (!title || !vendorId) {
      return NextResponse.json(
        { error: "專案名稱與合作廠商為必填欄位" },
        { status: 400 }
      );
    }

    // 取得台北時區的當前日期字串 (格式: YYYYMMDD)
    const d = new Intl.DateTimeFormat("zh-TW", {
      timeZone: "Asia/Taipei",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    const parts = d.formatToParts(new Date());
    const year = parts.find(p => p.type === "year")?.value || "";
    const month = parts.find(p => p.type === "month")?.value || "";
    const day = parts.find(p => p.type === "day")?.value || "";
    const dateStr = `${year}${month}${day}`;
    const prefix = `Q-${dateStr}-`;

    // 透過交易確保單號產生與資料寫入的原子性
    const newQuotation = await db.$transaction(async (tx) => {
      // 搜尋當天最大單號
      const lastQuotation = await tx.quotation.findFirst({
        where: {
          quotationNumber: {
            startsWith: prefix,
          },
        },
        orderBy: {
          quotationNumber: "desc",
        },
      });

      let nextSeq = 1;
      if (lastQuotation) {
        const lastParts = lastQuotation.quotationNumber.split("-");
        const seqStr = lastParts[lastParts.length - 1];
        const seq = parseInt(seqStr, 10);
        if (!isNaN(seq)) {
          nextSeq = seq + 1;
        }
      }
      const nextSeqStr = String(nextSeq).padStart(3, "0");
      const quotationNumber = `${prefix}${nextSeqStr}`;

      return await tx.quotation.create({
        data: {
          quotationNumber,
          title,
          vendorId,
          taxRate: parseFloat(taxRate ?? 0.05),
          rdRate: parseInt(rdRate ?? 8000, 10),
          pmRate: parseInt(pmRate ?? 6000, 10),
          qcRate: parseInt(qcRate ?? 5000, 10),
          integrationRate: parseInt(integrationRate ?? 6500, 10),
          categories: {
            create: (categories ?? []).map((cat: any, catIndex: number) => ({
              name: cat.name,
              sortOrder: catIndex,
              items: {
                create: (cat.items ?? []).map((item: any, itemIndex: number) => ({
                  description: item.description || "",
                  rdDays: parseFloat(item.rdDays ?? 0),
                  pmDays: parseFloat(item.pmDays ?? 0),
                  qcDays: parseFloat(item.qcDays ?? 0),
                  integrationDays: parseFloat(item.integrationDays ?? 0),
                  note: item.note || "",
                  sortOrder: itemIndex,
                })),
              },
            })),
          },
        },
        include: {
          categories: {
            orderBy: { sortOrder: "asc" },
            include: {
              items: {
                orderBy: { sortOrder: "asc" },
              },
            },
          },
        },
      });
    });

    return NextResponse.json(newQuotation, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: `建立報價單失敗：${error.message}` },
      { status: 500 }
    );
  }
}
