import { db } from "@/lib/db";
import { NextResponse } from "next/server";

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

    // 驗證工時天數
    if (categories && Array.isArray(categories)) {
      for (const cat of categories) {
        if (cat.items && Array.isArray(cat.items)) {
          for (const item of cat.items) {
            const rd = item.rdDays;
            const pm = item.pmDays;
            const qc = item.qcDays;
            const integration = item.integrationDays;

            if (
              rd === undefined || rd === null || isNaN(parseFloat(rd)) || parseFloat(rd) < 0 ||
              pm === undefined || pm === null || isNaN(parseFloat(pm)) || parseFloat(pm) < 0 ||
              qc === undefined || qc === null || isNaN(parseFloat(qc)) || parseFloat(qc) < 0 ||
              integration === undefined || integration === null || isNaN(parseFloat(integration)) || parseFloat(integration) < 0
            ) {
              return NextResponse.json(
                { error: "工時天數必須為大於或等於 0 的有效數字" },
                { status: 400 }
              );
            }
          }
        }
      }
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
      // 搜尋當天所有報價單，並在記憶體中找出最大序號，以避免非數字單號或髒資料造成的 NaN 問題
      const dailyQuotations = await tx.quotation.findMany({
        where: {
          quotationNumber: {
            startsWith: prefix,
          },
        },
        select: {
          quotationNumber: true,
        },
      });

      let nextSeq = 1;
      if (dailyQuotations.length > 0) {
        const seqs = dailyQuotations
          .map((q) => {
            const parts = q.quotationNumber.split("-");
            const seqStr = parts[parts.length - 1];
            return parseInt(seqStr, 10);
          })
          .filter((seq) => !isNaN(seq));

        if (seqs.length > 0) {
          nextSeq = Math.max(...seqs) + 1;
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
