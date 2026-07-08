export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";


export async function GET() {
  try {
    const vendors = await db.vendor.findMany({
      orderBy: {
        createdAt: "desc",
      },
    });
    return NextResponse.json(vendors);
  } catch (error) {
    console.error("GET /api/vendors error:", error);
    return NextResponse.json(
      { error: "無法取得廠商列表" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, taxId, contactName, contactEmail, contactPhone, address } = body;

    if (!name || !contactName || !contactEmail) {
      return NextResponse.json(
        { error: "名稱、聯絡人與聯絡信箱為必填欄位" },
        { status: 400 }
      );
    }

    if (taxId && !/^\d{8}$/.test(taxId)) {
      return NextResponse.json({ error: "統一編號格式不正確，應為 8 位數純數字" }, { status: 400 });
    }

    const newVendor = await db.vendor.create({
      data: {
        name,
        taxId: taxId || null,
        contactName,
        contactEmail,
        contactPhone: contactPhone || null,
        address: address || null,
      },
    });

    return NextResponse.json(newVendor, { status: 201 });
  } catch (error) {
    console.error("POST /api/vendors error:", error);
    return NextResponse.json(
      { error: "無法建立廠商" },
      { status: 500 }
    );
  }
}
