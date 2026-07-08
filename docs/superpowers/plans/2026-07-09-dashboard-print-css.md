# 儀表板與列印樣式 (Dashboard & Print CSS) 實作計畫

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 實作報價管理系統的儀表板首頁（顯示歷史報價單列表與搜尋），以及精美的列印預覽頁面，搭配專屬的 Print CSS 讓使用者能直接透過 `window.print()` 將報價單匯出成完美、無雜質的 HTML/PDF。

**Architecture:** 
- **首頁 (`/`)**：改寫為 Client Component，利用 `useEffect` 呼叫 `/api/quotations` 獲取歷史報價單。前端使用即時搜尋，計算總工時與總金額並渲染表格。
- **列印預覽頁面 (`/quotations/[id]/print`)**：Client Component，利用動態路由取得 `id` 後 fetch 單筆報價單，依設計分組展示報價明細。
- **列印 CSS (`print.css`)**：在列印媒體中隱藏特定導覽、按鈕等控制元件，去除輸入框外觀，並確保換頁不截斷表格列。

**Tech Stack:** Next.js (App Router, React), Tailwind CSS, Vanilla CSS (`print.css`), Prisma

## Global Constraints
- 所有前端顯示介面、錯誤訊息與程式碼註解必須使用**繁體中文 (Traditional Chinese)**。
- 列印版型必須包含「客戶抬頭」、「我方抬頭」、「報價明細表 (含 RD/PM/QC/整合工時與小計金額)」、「加總總計額（含稅與未稅）」以及雙方簽章欄位。

---

### Task 1: 建立列印專用樣式檔 `src/app/print.css`

**Files:**
- Create: `src/app/print.css`
- Modify: `src/app/layout.tsx`

**Interfaces:**
- Produces: 全域的 `.no-print` 與 `@media print` 樣式規則

- [ ] **Step 1: 建立 `src/app/print.css` 內容**
  寫入以下內容：
  ```css
  @media print {
    /* 隱藏非列印元素 */
    .no-print {
      display: none !important;
    }

    /* 頁面邊距設定 */
    @page {
      size: A4;
      margin: 15mm 15mm 15mm 15mm;
    }

    body {
      background: white !important;
      color: black !important;
      font-size: 12pt;
      line-height: 1.5;
    }

    /* 防止表格列跨頁截斷 */
    tr {
      page-break-inside: avoid !important;
      break-inside: avoid !important;
    }

    /* 表格樣式優化 */
    table {
      width: 100% !important;
      border-collapse: collapse !important;
    }

    th, td {
      border: 1px solid #cbd5e1 !important;
      padding: 6px 8px !important;
      text-align: left;
    }

    /* 輸入框/表單控件純文字化 */
    input, select, textarea {
      border: none !important;
      background: transparent !important;
      padding: 0 !important;
      outline: none !important;
      box-shadow: none !important;
      appearance: none !important;
    }
  }
  ```

- [ ] **Step 2: 在 `src/app/layout.tsx` 載入 `print.css`**
  ```diff
  import "./globals.css";
  +import "./print.css";
  ```

- [ ] **Step 3: 驗證檔案建立**
  確認 `print.css` 存在且 `layout.tsx` 編譯無誤。

- [ ] **Step 4: Commit**
  ```bash
  git add src/app/print.css src/app/layout.tsx
  git commit -m "feat: add print.css and import in global layout"
  ```

---

### Task 2: 建立預覽與列印頁面 `src/app/quotations/[id]/print/page.tsx`

**Files:**
- Create: `src/app/quotations/[id]/print/page.tsx`

**Interfaces:**
- Consumes: `/api/quotations/[id]` 端點 (回傳詳細報價單資訊)
- Produces: 獨立的列印預覽 UI 網頁

- [ ] **Step 1: 實作列印預覽頁面**
  撰寫 `src/app/quotations/[id]/print/page.tsx`。拉取報價單詳細資料後，將 items 依 category 分組，依格式渲染報價明細表、角色工時總計、稅金、含稅額與雙方簽章欄位。
  提供點擊可觸發 `window.print()` 的按鈕，並掛載 `.no-print` 類別。

- [ ] **Step 2: 驗證列印預覽頁面**
  確認 Next.js 動態 parameters 支援並能編譯。

- [ ] **Step 3: Commit**
  ```bash
  git add src/app/quotations/[id]/print/page.tsx
  git commit -m "feat: implement print preview page with sign areas"
  ```

---

### Task 3: 修改首頁 `src/app/page.tsx` 為儀表板

**Files:**
- Modify: `src/app/page.tsx`

**Interfaces:**
- Consumes: `/api/quotations` 端點 (取得歷史報價單列表)
- Produces: 功能完整的首頁 Dashboard 介面

- [ ] **Step 1: 實作 Dashboard 介面與資料載入**
  改寫 `src/app/page.tsx`，使用 `useEffect` 在 client 載入 `/api/quotations`。使用 `calculateQuotation` 計算每張報價單的總天數與總金額，並顯示單號、專案名稱、廠商、總工時、含稅總額、狀態、建立時間的表格。提供搜尋過濾。

- [ ] **Step 2: 驗證 Dashboard 列表顯示與搜尋**
  檢查 Next.js 無編譯錯誤。

- [ ] **Step 3: Commit**
  ```bash
  git add src/app/page.tsx
  git commit -m "feat: rebuild home page as quotation dashboard"
  ```

---

### Task 4: 生產環境打包與驗證

- [ ] **Step 1: 執行 Next.js 生產打包**
  指令：`npm run build`
  預期：無 TypeScript 或 Lint 錯誤，建置順利成功。

- [ ] **Step 2: Commit 所有剩餘異動**
  ```bash
  git commit -am "chore: finalize task 6 verification"
  ```
