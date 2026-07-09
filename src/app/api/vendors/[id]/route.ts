import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { name, taxId, contactName, contactEmail, contactPhone, address } = body;

    if (!name || !contactName || !contactEmail) {
      return NextResponse.json(
        { error: "名稱、聯絡人與聯絡信箱為必填欄位" },
        { status: 400 }
      );
    }

    if (taxId && !/^\d{8}$/.test(taxId)) {
      return NextResponse.json(
        { error: "統一編號格式不正確，應為 8 位數純數字" },
        { status: 400 }
      );
    }

    // 檢查廠商是否存在
    const existingVendor = await db.vendor.findUnique({
      where: { id },
    });

    if (!existingVendor) {
      return NextResponse.json(
        { error: "找不到該廠商" },
        { status: 404 }
      );
    }

    const updatedVendor = await db.vendor.update({
      where: { id },
      data: {
        name,
        taxId: taxId || null,
        contactName,
        contactEmail,
        contactPhone: contactPhone || null,
        address: address || null,
      },
    });

    return NextResponse.json(updatedVendor);
  } catch (error) {
    console.error("PUT /api/vendors/[id] error:", error);
    return NextResponse.json(
      { error: "無法更新廠商資訊" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // 檢查廠商是否存在
    const existingVendor = await db.vendor.findUnique({
      where: { id },
    });

    if (!existingVendor) {
      return NextResponse.json(
        { error: "找不到該廠商" },
        { status: 404 }
      );
    }

    // 有報價單的廠商不可刪除（保護歷史報價紀錄，DB 層亦設 Restrict）
    const quotationCount = await db.quotation.count({ where: { vendorId: id } });
    if (quotationCount > 0) {
      return NextResponse.json(
        { error: `該廠商尚有 ${quotationCount} 張報價單，無法刪除。請先刪除相關報價單。` },
        { status: 400 }
      );
    }

    await db.vendor.delete({
      where: { id },
    });

    return NextResponse.json({ message: "成功刪除廠商" });
  } catch (error) {
    console.error("DELETE /api/vendors/[id] error:", error);
    return NextResponse.json(
      { error: "無法刪除廠商" },
      { status: 500 }
    );
  }
}
