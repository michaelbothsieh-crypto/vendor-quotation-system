# 廠商管理 (Vendor CRUD) 實作計劃

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 實作廠商管理的後端 RESTful API 端點與前端 CRUD 管理介面，讓使用者可以查詢、新增、更新與刪除合作廠商的資料（統編、抬頭、聯絡資訊）。

**Architecture:** 本功能使用 Next.js App Router 的 Route Handlers 作為後端 API，透過 Prisma Client 與 PostgreSQL 進行資料讀寫。前端採用單頁 CRUD 設計，運用 Tailwind CSS v4 打造精美、支援響應式的後台管理介面。

**Tech Stack:** Next.js (App Router), Prisma, Tailwind CSS v4, React (useState, useEffect), TypeScript

---

### Task 1: 建立後端多廠商 API 端點

**Files:**
- Create: `src/app/api/vendors/route.ts`

**Step 1: 撰寫 GET 與 POST 端點程式碼**
實作 `GET` 以 `createdAt` 降序排列回傳所有廠商。
實作 `POST` 接收 `name`, `taxId`, `contactName`, `contactEmail`, `contactPhone`, `address`，並驗證 `name`, `contactName`, `contactEmail` 是否缺失。

**Step 2: 驗證 API 基本語法與編譯**
確保無 TypeScript 編譯錯誤。

**Step 3: Commit**
```bash
git add src/app/api/vendors/route.ts
git commit -m "feat(api): add GET and POST endpoints for vendors"
```

---

### Task 2: 建立後端單一廠商 API 端點

**Files:**
- Create: `src/app/api/vendors/[id]/route.ts`

**Step 1: 撰寫 PUT 與 DELETE 端點程式碼**
實作 `PUT` 更新指定 ID 廠商的資訊。
實作 `DELETE` 刪除指定 ID 的廠商。

**Step 2: 驗證 API 基本語法與編譯**
確保無 TypeScript 編譯錯誤。

**Step 3: Commit**
```bash
git add src/app/api/vendors/[id]/route.ts
git commit -m "feat(api): add PUT and DELETE endpoints for individual vendor"
```

---

### Task 3: 建立前端廠商管理頁面

**Files:**
- Create: `src/app/vendors/page.tsx`

**Step 1: 撰寫前端 CRUD 管理介面**
* 整合廠商列表展示（顯示名稱、聯絡窗口姓名、Email、統編等）。
* 新增/編輯廠商的表單（包含欄位驗證與錯誤提示）。
* 刪除前跳出 `window.confirm` 確認提示。
* 儲存後自動重新整理列表。
* 介面設計需美觀、使用繁體中文、具有層次感與平滑動畫。

**Step 2: 驗證前端編譯與展示**
確保 Next.js build 可以順利通過，沒有靜態類型與編譯錯誤。

**Step 3: Commit**
```bash
git add src/app/vendors/page.tsx
git commit -m "feat(ui): implement vendor CRUD management page"
```

---

### Task 4: 撰寫並執行 API 整合測試腳本

**Files:**
- Create: `scripts/test-vendors.ts`

**Step 1: 撰寫測試腳本**
使用 `fetch` 模擬前端向本地開發伺服器發送 `POST`、`GET`、`PUT`、`DELETE` 請求，確認 API 功能完全正常。

**Step 2: 執行整合測試並確認結果**
啟動本地伺服器後，執行 `npx tsx scripts/test-vendors.ts` 驗證結果。

**Step 3: Commit**
```bash
git add scripts/test-vendors.ts
git commit -m "test: add integration test script for vendor API"
```
