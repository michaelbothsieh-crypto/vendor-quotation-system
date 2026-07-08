# Task 6: 儀表板與列印樣式 (Dashboard & Print CSS) 實作報告

## 1. 任務概要
本任務為「外包廠商報價管理系統」之最後一項實作 (Task 6)，重點在於改造首頁為儀表板、新增列印預覽頁面，以及套用 @media print 對應的 Print CSS 樣式以實現無縫的 PDF 列印體驗。

## 2. 實作內容說明

### 2.1 儀表板首頁 (`src/app/page.tsx`)
- 改寫首頁為 Client Component 儀表板。
- 透過 `useEffect` 載入 `/api/quotations` 列表資料，取得所有歷史報價單。
- 支援以「報價單單號」、「專案名稱」、「廠商名稱」進行即時過濾搜尋。
- 提供表格展示：單號 (Badge 樣式)、專案名稱、廠商、總工時、含稅總額、狀態 (已核准/已寄出/草稿徽章)、建立時間。
- 提供快速導覽按鈕 (建立新報價單、廠商管理、費率設定)。
- 提供操作按鈕 (編輯、預覽/列印，以及高水準的刪除報價單按鈕)。

### 2.2 列印專用樣式檔 (`src/app/print.css`)
- 於 `layout.tsx` 中引入，定義 `@media print`。
- 移除背景色、陰影，設定 A4 列印紙張尺寸與 15mm 四週邊距。
- 套用 `.no-print` 隱藏導覽、控制列、按鈕等列印時不需要出現的 UI 元素。
- 使用 `page-break-inside: avoid` 防止表格列、小計、簽認欄被跨頁強行截斷。
- 去除輸入框、下拉選單的邊框與 focus 陰影，以達列印時看起來是純文字的效果。

### 2.3 預覽與列印頁面 (`src/app/quotations/[id]/print/page.tsx`)
- 拉取單張報價單資料，利用 `calculateQuotation` 對所有大項細項與角色工時進行精密算術計算。
- 分組顯示明細：以 `QuotationCategory` 做為區分 header，顯示項次、功能項目、RD、PM、QC、整合工時、小計金額與備註。
- 工時與費率明細區：列出四個角色各自的總工時 (天)、人天費率與金額小計。
- 總金額計算區：列出總工時天數、未稅總計、營業稅 (5%) 與含稅總計。
- 雙方簽章區：提供「客戶簽認 (委託方)」與「我方簽認 (受託方)」區塊，預留公司簽章與核准日期欄位。
- 螢幕操作列：提供返回首頁、編輯此報價單與一鍵觸發 `window.print()` 的按鈕。

## 3. 驗證與測試
- **生產環境打包驗證**：
  在專案根目錄下執行 `npm run build`。
  結果：Next.js 編譯打包 100% 成功，無任何 TypeScript 與 Eslint 錯誤，靜態生成所有頁面無誤。

## 4. 提交之 Git Commits 紀錄
本次 Task 6 實作一共包含以下 4 個 Commits：
- `43576c0`: feat: add print.css and import in global layout
- `404b450`: feat: implement print preview page with sign areas
- `3bfa2f7`: feat: rebuild home page as quotation dashboard
- `9299e02`: docs: add design spec, implementation plan and update progress ledger for task 6
