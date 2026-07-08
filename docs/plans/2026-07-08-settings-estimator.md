# Settings & Estimator 實作計畫

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 實作系統全域費率設定的後端 API 端點、前端費率設定介面，以及系統精密的核心工時金額計算邏輯（確保浮點數工時計算精度且防範 JS 浮點數累積誤差）。

**Architecture:** 
1. 費率設定 API 將使用 Next.js App Router API Route (`src/app/api/settings/route.ts`)，透過 Prisma 讀寫 `SystemSetting` Table。
2. 費率設定頁面將使用 `src/app/settings/page.tsx`，為使用者提供設定費率的繁體中文介面。
3. 核心計算邏輯實作於 `src/lib/calculator.ts`，支援單一細項計算與整張報價單加總（包含工時加總、未稅額、稅金、含稅總額計算）。

**Tech Stack:** Next.js (App Router), Prisma, TypeScript, PostgreSQL

---

### Task 1: 實作精密計算模組與測試

**Files:**
- Create: `src/lib/calculator.ts`
- Create: `scripts/test-calculator.ts`

**Step 1: 撰寫單元測試**
建立 `scripts/test-calculator.ts` 驗證計算精確度：
```typescript
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
  assert(quotationCalc.totalRdDays === 2.0, "RD 天數加總錯誤");
  assert(quotationCalc.totalPmDays === 0.5, "PM 天數加總錯誤");
  assert(quotationCalc.totalQcDays === 0.5, "QC 天數加總錯誤");
  assert(quotationCalc.totalIntegrationDays === 0.5, "Integration 天數加總錯誤");
  assert(quotationCalc.totalDays === 3.5, "總天數加總錯誤");
  assert(quotationCalc.subtotal === 24750, `未稅金額應為 24750，實際為 ${quotationCalc.subtotal}`);
  assert(quotationCalc.tax === 1238, `稅金應為 1238，實際為 ${quotationCalc.tax}`);
  assert(quotationCalc.total === 25988, `含稅總額應為 25988，實際為 ${quotationCalc.total}`);

  console.log("✅ 所有計算模組測試通過！");
}

runTests().catch((err) => {
  console.error("❌ 測試失敗:", err);
  process.exit(1);
});
```

**Step 2: 執行測試以驗證失敗**
執行：`npx tsx scripts/test-calculator.ts`
預期結果：失敗（無法載入 module 或找不到檔案）

**Step 3: 實作 `src/lib/calculator.ts`**
建立並實作計算功能。

**Step 4: 重新執行測試驗證通過**
執行：`npx tsx scripts/test-calculator.ts`
預期結果：成功輸出 "✅ 所有計算模組測試通過！"

**Step 5: Git Commit**
```bash
git add src/lib/calculator.ts scripts/test-calculator.ts
git commit -m "feat: 實作核心報價計算模組與單元測試"
```

---

### Task 2: 實作 Settings API 端點

**Files:**
- Create: `src/app/api/settings/route.ts`

**Step 1: 實作 API 路由**
在 `src/app/api/settings/route.ts` 中：
- `GET`：從 `SystemSetting` model 查詢四個設定：`DEFAULT_RD_RATE`, `DEFAULT_PM_RATE`, `DEFAULT_QC_RATE`, `DEFAULT_INTEGRATION_RATE`。若資料庫尚無此設定，應回傳預設值（8000, 6000, 5000, 6500）。
- `POST`：接收費率，更新或新增至 `SystemSetting` 中。

**Step 2: 驗證 API 端點**
可透過暫時腳本或直接由前端進行功能性測試。

**Step 3: Git Commit**
```bash
git add src/app/api/settings/route.ts
git commit -m "feat: 實作系統費率設定 API 端點"
```

---

### Task 3: 實作前端設定頁面 `src/app/settings/page.tsx`

**Files:**
- Create: `src/app/settings/page.tsx`

**Step 1: 實作繁體中文設定頁面**
提供 RD, PM, QC, 整合 四個費率的輸入與儲存按鈕，具備良好的防呆與提示訊息。

**Step 2: 驗證前端頁面**
開啟設定頁面，輸入新值，儲存，重整頁面，確認數值有被正確載入。

**Step 3: Git Commit**
```bash
git add src/app/settings/page.tsx
git commit -m "feat: 實作前端費率設定介面"
```

---

### Task 4: 整合驗證與產出報告

**Files:**
- Create: `.superpowers/sdd/task-4-report.md`

**Step 1: 最終確認與測試**
再次執行 `npx tsx scripts/test-calculator.ts`，確認無誤。
確認前後端整合正常。

**Step 2: 寫入報告**
將任務報告寫入 `.superpowers/sdd/task-4-report.md`。

**Step 3: Git Commit**
```bash
git add .superpowers/sdd/task-4-report.md
git commit -m "docs: 建立 Task 4 實作報告"
```
