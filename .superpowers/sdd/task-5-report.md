# Task 5: Quotation Editor & API Report

## 任務基本資訊
* **狀態**: DONE (已完成)
* **日期**: 2026-07-08
* **負責模組**: 報價單核心 CRUD API 與前端動態巢狀報價單編輯器

---

## 實作內容與架構設計

### 1. 報價單 CRUD API 端點
* **`src/app/api/quotations/route.ts`**:
  - `GET`: 回傳所有報價單列表，包含廠商關聯資料與大項細項結構，依建立時間倒序排列。
  - `POST`: 接收新報價單結構，自動產生台北時區格式之 `Q-YYYYMMDD-XXX` 流水號，並於 Prisma 交易 (`$transaction`) 中進行原子級事務寫入（包含 Quotation, QuotationCategory 與 QuotationItem）。
* **`src/app/api/quotations/[id]/route.ts`**:
  - `GET`: 取得指定 ID 報價單詳細資料，包括廠商、大項與細項，並依 `sortOrder` 升序排序。
  - `PUT`: 接收更新結構，在 Prisma 交易中以「先刪除舊大項再重新建立」的策略確保結構同步與資料一致性。
  - `DELETE`: 刪除指定報價單，並藉由 schema.prisma 中設定的級聯刪除 (`onDelete: Cascade`) 自動清除大項與細項。

### 2. 前端動態巢狀報價編輯器
* **`src/app/quotations/quotation-form.tsx`**:
  - 封裝為 client-side 共用表單元件，支援新報價單與既有報價單編輯。
  - 設計高質感、流暢的 UI/UX。
  - 狀態管理：使用 nested state 儲存 categories 與 items。輸入天數以 `string` 格式儲存以提升 React 輸入體驗，防止小數點輸入異常。
  - 即時計算：整合 `src/lib/calculator.ts` 的 `calculateQuotation` 與 `calculateItem`，於 React render 階段即時重算細項小計、各角色總工時、未稅總金額、5% 營業稅與含稅總計，免去多餘的 State 同步邏輯。
  - 人性化關聯：支援在 URL query 中帶入 `vendorId` 預設選中合作廠商。
* **`src/app/quotations/new/page.tsx`** 與 **`src/app/quotations/[id]/edit/page.tsx`**:
  - 分別負責新報價單建立與舊報價單讀取，並直接調用 `QuotationForm` 進行編輯。

### 3. UI 整合優化
* 修改 `/api/vendors` API，於 GET 中預設 include 該廠商之 `quotations`。
* 修改 `src/app/vendors/page.tsx`，於廠商列表卡片上，直接顯示專案報價單列表與對應的單號、專案名稱、日期，並整合「+ 新增報價單」、「編輯報價單」與「刪除報價單」按鈕，使廠商與報價單操作無縫接軌。

---

## 測試與驗證結果

1. **API 整合測試**:
   - 撰寫 `scripts/test-quotations.ts`，以 Node 直接呼叫 API Route 導出函數（GET/POST/PUT/DELETE），模擬真實的 Request 與 Response 處理。
   - 測試結果：建立、查詢、更新、刪除、及級聯刪除驗證完全成功。
2. **編譯驗證**:
   - `npx tsc --noEmit` 通過，無任何類型與語法錯誤。
   - `npm run build` 編譯成功，Next.js 靜態與動態頁面產生完全正常。

---

## Commits 紀錄
* `cc94a6c` - feat(ui): 實作新建與編輯報價單頁面，並在廠商卡片中整合報價單列表
* `4ea7ac1` - feat(ui): 實作可複用的報價單巢狀編輯表單組件
* `299e7c0` - test: 建立報價單 API 整合測試腳本
* `1f213d9` - feat(api): 實作指定 ID 報價單之查詢、更新與刪除端點
* `ec6d943` - feat(api): 實作報價單列表與新增端點

---

## Code Review 修復報告與二次驗證 (Task 5 Fixes)

### 1. 修改內容
* **計算與顯示角色總金額**：
  - 在 `src/lib/calculator.ts` 的 `calculateQuotation` 中確認實作並回傳各角色的總工時金額小計 (`totalRdAmount`, `totalPmAmount`, `totalQcAmount`, `totalIntegrationAmount`)。
  - 在 `src/app/quotations/quotation-form.tsx` 底部「各角色總計工時明細」中，分別於各角色的天數後方，動態顯示對應的總金額，格式為：`{天數} 天 (NT$ {金額})`。
* **修正 CSS 類名筆誤**：
  - 將 `src/app/quotations/quotation-form.tsx` 第 487 行的 `bg-slate-550/10` 筆誤修正為合法的 Tailwind CSS 類名 `bg-slate-500/10`。

### 2. 測試與驗證結果
* **計算模組單元測試**：
  - 執行 `npx tsx scripts/test-calculator.ts` 通過。
* **報價單 API 整合測試**：
  - 執行 `npx tsx scripts/test-quotations.ts` 通過，API 運作完全正常。
* **編譯打包驗證**：
  - 執行 `npm run build` 成功完成編譯，無任何 TypeScript 類型或語法錯誤。
