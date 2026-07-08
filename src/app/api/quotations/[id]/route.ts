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

// 更新指定報價單：在 Prisma 交易中先刪除舊的 categories，再根據傳入的新結構重新 create
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

    const updatedQuotation = await db.$transaction(async (tx) => {
      // 1. 先刪除該報價單舊的 categories（Prisma 會級聯 Cascade 刪除 items）
      await tx.quotationCategory.deleteMany({
        where: { quotationId: id },
      });

      // 2. 更新報價單主表欄位，並重建大項與細項
      return await tx.quotation.update({
        where: { id },
        data: {
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

    return NextResponse.json(updatedQuotation);
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
