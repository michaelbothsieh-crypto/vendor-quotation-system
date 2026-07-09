import { db } from "@/lib/db";
import { NextResponse } from "next/server";

// 取得特定 ID 的報價單詳細資料，包括廠商、大項與下屬細項，依 sortOrder 排序
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const quotation = await db.quotation.findUnique({
      where: { id },
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

// 更新指定報價單：改為「非原地更新」的版本控制機制，建立新版本並將舊版本設為封存
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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

    // 讀取原報價單與其版本號
    const parent = await db.quotation.findUnique({
      where: { id },
    });
    if (!parent) {
      return NextResponse.json(
        { error: "找不到該報價單資料" },
        { status: 404 }
      );
    }

    const newQuotation = await db.$transaction(async (tx) => {
      // 1. 將父報價單設為非最新版且已封存
      await tx.quotation.update({
        where: { id },
        data: { isLatest: false, status: "ARCHIVED" }
      });

      // 2. 建立新一版報價單
      return await tx.quotation.create({
        data: {
          quotationNumber: parent.quotationNumber,
          title,
          vendorId,
          status: "DRAFT",
          taxRate: parseFloat(taxRate ?? parent.taxRate),
          rdRate: parseInt(rdRate ?? parent.rdRate, 10),
          pmRate: parseInt(pmRate ?? parent.pmRate, 10),
          qcRate: parseInt(qcRate ?? parent.qcRate, 10),
          integrationRate: parseInt(integrationRate ?? parent.integrationRate, 10),
          version: parent.version + 1,
          isLatest: true,
          parentQuotationId: parent.id,
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

    return NextResponse.json(newQuotation);
  } catch (error: any) {
    return NextResponse.json(
      { error: `更新報價單失敗：${error.message}` },
      { status: 500 }
    );
  }
}

// 刪除指定報價單（Prisma 自動級聯刪除 categories 與 items）
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await db.quotation.delete({
      where: { id },
    });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: `刪除報價單失敗：${error.message}` },
      { status: 500 }
    );
  }
}
