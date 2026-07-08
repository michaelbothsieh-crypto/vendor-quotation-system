export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

const DEFAULT_RATES = {
  DEFAULT_RD_RATE: 8000,
  DEFAULT_PM_RATE: 6000,
  DEFAULT_QC_RATE: 5000,
  DEFAULT_INTEGRATION_RATE: 6500,
};

type RateKey = keyof typeof DEFAULT_RATES;

export async function GET() {
  try {
    const settings = await db.systemSetting.findMany({
      where: {
        key: {
          in: Object.keys(DEFAULT_RATES),
        },
      },
    });

    const rates = { ...DEFAULT_RATES };
    for (const setting of settings) {
      if (setting.key in rates) {
        const val = Number(setting.value);
        if (!isNaN(val)) {
          rates[setting.key as RateKey] = val;
        }
      }
    }

    return NextResponse.json(rates);
  } catch (error) {
    console.error("GET /api/settings error:", error);
    return NextResponse.json(
      { error: "無法取得系統費率設定" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // 驗證輸入格式與範圍
    const updatedRates: Partial<Record<RateKey, number>> = {};
    for (const key of Object.keys(DEFAULT_RATES) as RateKey[]) {
      if (body[key] !== undefined) {
        const val = Number(body[key]);
        if (isNaN(val) || val < 0 || !Number.isInteger(val)) {
          return NextResponse.json(
            { error: `費率 [${key}] 必須是零或正整數` },
            { status: 400 }
          );
        }
        updatedRates[key] = val;
      }
    }

    if (Object.keys(updatedRates).length === 0) {
      return NextResponse.json(
        { error: "未提供有效的費率更新資料" },
        { status: 400 }
      );
    }

    // 更新或寫入資料庫
    const keys = Object.keys(updatedRates) as RateKey[];
    await db.$transaction(
      keys.map((key) =>
        db.systemSetting.upsert({
          where: { key },
          update: { value: String(updatedRates[key]) },
          create: { key, value: String(updatedRates[key]) },
        })
      )
    );

    return NextResponse.json({ message: "系統費率設定已儲存成功", rates: updatedRates });
  } catch (error) {
    console.error("POST /api/settings error:", error);
    return NextResponse.json(
      { error: "無法儲存系統費率設定" },
      { status: 500 }
    );
  }
}
