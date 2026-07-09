import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { generateQuotationNumber, QUOTATION_INCLUDE } from "@/lib/quotation";

// 複製報價單：以來源單內容建立「新單號、v1、DRAFT」的獨立報價單
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const source = await db.quotation.findUnique({
      where: { id },
      include: QUOTATION_INCLUDE,
    });
    if (!source) {
      return NextResponse.json({ error: "找不到報價單" }, { status: 404 });
    }

    const newQuotation = await db.$transaction(async (tx) => {
      const quotationNumber = await generateQuotationNumber(tx);
      return tx.quotation.create({
        data: {
          quotationNumber,
          title: `${source.title}（複本）`,
          vendorId: source.vendorId,
          vendorName: source.vendorName,
          vendorTaxId: source.vendorTaxId,
          vendorContactName: source.vendorContactName,
          vendorContactEmail: source.vendorContactEmail,
          vendorContactPhone: source.vendorContactPhone,
          vendorAddress: source.vendorAddress,
          status: "DRAFT",
          taxRate: source.taxRate,
          roles: source.roles as object,
          issueDate: new Date(),
          validUntil: source.validUntil,
          paymentTerms: source.paymentTerms,
          notes: source.notes,
          discount: source.discount,
          categories: {
            create: source.categories.map((cat) => ({
              name: cat.name,
              sortOrder: cat.sortOrder,
              items: {
                create: cat.items.map((item) => ({
                  description: item.description,
                  days: item.days as object,
                  note: item.note,
                  sortOrder: item.sortOrder,
                })),
              },
            })),
          },
        },
        include: QUOTATION_INCLUDE,
      });
    });

    return NextResponse.json(newQuotation, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: `複製報價單失敗：${error.message}` },
      { status: 500 }
    );
  }
}
