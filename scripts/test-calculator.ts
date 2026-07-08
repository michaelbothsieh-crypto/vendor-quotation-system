import { roundToOneDecimal, calculateItem, calculateQuotation } from "../src/lib/calculator";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function runTests() {
  console.log("開始執行計算模組測試...");

  // 1. 測試四捨五入到小數點第一位
  assert(roundToOneDecimal(0.1 + 0.2) === 0.3, "0.1 + 0.2 應為 0.3");
  assert(roundToOneDecimal(1.005) === 1.0, "1.005 應為 1.0 (或依據精度需求調整)");
  assert(roundToOneDecimal(1.05) === 1.1, "1.05 應為 1.1");
  assert(roundToOneDecimal(1.04) === 1.0, "1.04 應為 1.0");

  // 2. 測試單一品項計算
  const rates = {
    rdRate: 8000,
    pmRate: 6000,
    qcRate: 5000,
    integrationRate: 6500,
  };

  const item1 = {
    rdDays: 1.5,
    pmDays: 0.5,
    qcDays: 0.2,
    integrationDays: 0.1,
  };
  // 金額 = 1.5 * 8000 + 0.5 * 6000 + 0.2 * 5000 + 0.1 * 6500 = 12000 + 3000 + 1000 + 650 = 16650
  // 天數 = 1.5 + 0.5 + 0.2 + 0.1 = 2.3
  const calc1 = calculateItem(item1, rates);
  assert(calc1.totalDays === 2.3, `item1 總天數應為 2.3，實際為 ${calc1.totalDays}`);
  assert(calc1.amount === 16650, `item1 金額應為 16650，實際為 ${calc1.amount}`);

  // 3. 測試整張報價單計算 (包含浮點數累計誤差防範)
  const items = [
    { rdDays: 1.1, pmDays: 0.1, qcDays: 0.1, integrationDays: 0.1 },
    { rdDays: 0.2, pmDays: 0.2, qcDays: 0.2, integrationDays: 0.2 },
    { rdDays: 0.7, pmDays: 0.2, qcDays: 0.2, integrationDays: 0.2 },
  ];
  // 總天數:
  // RD = 1.1 + 0.2 + 0.7 = 2.0
  // PM = 0.1 + 0.2 + 0.2 = 0.5
  // QC = 0.1 + 0.2 + 0.2 = 0.5
  // INT = 0.1 + 0.2 + 0.2 = 0.5
  // 總天數 = 3.5
  
  // 各自品項金額:
  // item1 = 1.1*8000 + 0.1*6000 + 0.1*5000 + 0.1*6500 = 8800 + 600 + 500 + 650 = 10550
  // item2 = 0.2*8000 + 0.2*6000 + 0.2*5000 + 0.2*6500 = 1600 + 1200 + 1000 + 1300 = 5100
  // item3 = 0.7*8000 + 0.2*6000 + 0.2*5000 + 0.2*6500 = 5600 + 1200 + 1000 + 1300 = 9100
  // 未稅總額 = 10550 + 5100 + 9100 = 24750
  // 稅金 (5%) = 24750 * 0.05 = 1237.5 -> 四捨五入 = 1238
  // 含稅總額 = 24750 + 1238 = 25988
  const quotationCalc = calculateQuotation(items, rates, 0.05);
  assert(quotationCalc.totalRdDays === 2.0, `RD 天數加總應為 2.0，實際為 ${quotationCalc.totalRdDays}`);
  assert(quotationCalc.totalPmDays === 0.5, `PM 天數加總應為 0.5，實際為 ${quotationCalc.totalPmDays}`);
  assert(quotationCalc.totalQcDays === 0.5, `QC 天數加總應為 0.5，實際為 ${quotationCalc.totalQcDays}`);
  assert(quotationCalc.totalIntegrationDays === 0.5, `Integration 天數加總應為 0.5，實際為 ${quotationCalc.totalIntegrationDays}`);
  assert(quotationCalc.totalDays === 3.5, `總天數加總應為 3.5，實際為 ${quotationCalc.totalDays}`);
  assert(quotationCalc.subtotal === 24750, `未稅金額應為 24750，實際為 ${quotationCalc.subtotal}`);
  assert(quotationCalc.tax === 1238, `稅金應為 1238，實際為 ${quotationCalc.tax}`);
  assert(quotationCalc.total === 25988, `含稅總額應為 25988，實際為 ${quotationCalc.total}`);

  console.log("✅ 所有計算模組測試通過！");
}

runTests().catch((err) => {
  console.error("❌ 測試失敗:", err);
  process.exit(1);
});
