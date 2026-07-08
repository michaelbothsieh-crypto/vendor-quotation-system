# Task 3: Vendor CRUD 任務報告

## 實作狀態：DONE

本任務已完全實作合作廠商管理（Vendor CRUD）的後端 RESTful API 與前端管理介面，並撰寫了 API 整合測試進行全功能驗證。

---

## 實作內容說明

### 1. 後端多廠商 API 端點 (`src/app/api/vendors/route.ts`)
* **GET**：從資料庫查詢所有合作廠商，並依 `createdAt` 降序排列。
* **POST**：接收 JSON payload，並對必填欄位 `name`、`contactName` 與 `contactEmail` 進行驗證。若欄位缺失則回傳 400 錯誤；若驗證通過則建立新廠商並回傳 210 (201) 成功狀態碼。

### 2. 後端單一廠商 API 端點 (`src/app/api/vendors/[id]/route.ts`)
* **PUT**：更新指定 ID 廠商的資訊。若廠商不存在則回傳 404；更新成功則回傳 200。
* **DELETE**：刪除指定 ID 的廠商。由於 Prisma schema 的級聯設定（Cascade），此刪除會連同該廠商的所有報價單一併刪除。

### 3. 前端廠商管理頁面 (`src/app/vendors/page.tsx`)
* 使用 React 19 與 Tailwind CSS v4 打造。
* 包含廠商清單展示與搜尋過濾功能。
* 表單在「新增」與「編輯」模式間流暢切換，具備即時欄位驗證。
* 刪除前提示 `window.confirm`，確保使用者了解將連同報價單一併刪除的風險。
* 介面採用精美的響應式兩欄版面，Focus / Hover 微動畫與全繁體中文提示。

### 4. 整合測試腳本 (`scripts/test-vendors.ts`)
* 模擬前端呼叫 POST、GET、PUT、DELETE 流程，驗證正常操作與異常攔截（400, 404 等狀態碼）。
* 測試結果完全通過。

---

## 新增檔案清單
* `src/app/api/vendors/route.ts` - 多廠商 API 端點
* `src/app/api/vendors/[id]/route.ts` - 單一廠商 API 端點
* `src/app/vendors/page.tsx` - 前端廠商 CRUD 頁面
* `scripts/test-vendors.ts` - API 整合測試腳本

---

## 建立的 Git 提交 (Commits)
* `80b9a46` test: add integration test script for vendor API
* `1884608` feat(ui): implement vendor CRUD management page
* `8bc09ca` feat(api): add PUT and DELETE endpoints for individual vendor
* `2381bac` feat(api): add GET and POST endpoints for vendors

---

## Task 3 Code Review 修復報告

### 1. 修復實作內容
* **強制作為動態路由**：於 `src/app/api/vendors/route.ts` 頂部加入 `export const dynamic = "force-dynamic";`，解決 Next.js 生產環境打包時 GET 請求被靜態快取的問題。
* **後端統編格式驗證**：在 `POST /api/vendors` 端點中，加入台灣統一編號（taxId）的基本格式驗證（若有填寫，必須為 8 位純數字），否則回傳 400 錯誤。
* **前端統編格式驗證**：在 `src/app/vendors/page.tsx` 的 `handleSubmit` 表單提交中，加入 taxId 的前端阻擋與警告提示（若有填寫，必須是 8 位純數字）。
* **加強整合測試**：在 `scripts/test-vendors.ts` 整合測試腳本中加入 `2b. 測試統一編號格式驗證 (POST /api/vendors 統編格式錯誤)` 測試案例。

### 2. 測試與驗證結果
* **整合測試驗證**：執行 `npx tsx scripts/test-vendors.ts`，成功通過所有 8 項整合測試（包括新增的錯誤統編攔截測試）。
* **生產環境打包驗證**：執行 `npm run build` 打包編譯成功，且確認 `/api/vendors` 路由正確標記為 `ƒ (Dynamic)` 動態路由。
