# 報價單版本歷史與資料庫檢視面板設計規格書 (Design Spec)

本文件定義「報價單版本歷史紀錄 (方案 1)」與「生產環境資料庫檢視面板 (`/database`)」的架構與實作規格。

## 1. 系統架構變更 (Database Schema)

在 `prisma/schema.prisma` 中對 `Quotation` Model 進行欄位擴充，新增版本鏈自我參照：

```prisma
model Quotation {
  id               String              @id @default(uuid())
  quotationNumber  String              // 報價單號 (多個版本共用同一個單號)
  title            String              // 專案名稱
  vendorId         String
  vendor           Vendor              @relation(fields: [vendorId], references: [id], onDelete: Cascade)
  status           String              @default("PENDING") // PENDING, APPROVED, ARCHIVED
  taxRate          Decimal             @default(0.05) @db.Decimal(10, 2)
  rdRate           Int
  pmRate           Int
  qcRate           Int
  integrationRate  Int
  createdAt        DateTime            @default(now())
  updatedAt        DateTime            @updatedAt

  // === 版本控制欄位 ===
  version            Int               @default(1)
  isLatest           Boolean           @default(true) // 便於首頁與最新版編輯快速篩選
  parentQuotationId  String?           @unique
  parentQuotation    Quotation?        @relation("QuotationVersions", fields: [parentQuotationId], references: [id], onDelete: SetNull)
  childQuotation     Quotation?        @relation("QuotationVersions")

  categories       QuotationCategory[]
}
```

---

## 2. 後端 API 行為變更 (Backend APIs)

### A. 報價單列表 `GET /api/quotations`
*   預設查詢篩選：`isLatest: true`。首頁控制台預設僅拉取最新版的報價單。
*   新增查詢參數：`?allVersions=true&quotationNumber=xxx`，當使用者點選展開歷史時，可依據報價單號拉取該單號的所有版本鏈歷程（依 `version` 降序排列）。

### B. 報價更新 `PUT /api/quotations/[id]`
更新報價單時不再原地修改 (UPDATE) 舊記錄，而是執行以下 Prisma 資料庫交易：
1.  讀取當前報價單（設為 `parent`）。
2.  將 `parent` 的 `isLatest` 修改為 `false`，且將狀態更新為 `ARCHIVED` (已封存)。
3.  **新建 (CREATE)** 一筆全新的 `Quotation` 記錄：
    *   `quotationNumber` 繼承 `parent.quotationNumber`。
    *   `version` 設為 `parent.version + 1`。
    *   `parentQuotationId` 設為 `parent.id`。
    *   `isLatest` 設為 `true`。
    *   寫入前端傳入的最新 categories 與 items。

### C. 刪除報價單 `DELETE /api/quotations/[id]`
*   若刪除特定版本，僅級聯刪除該版本及其 categories/items。
*   若在首頁大項點選刪除，則連同該 `quotationNumber` 下的所有歷史版本一併清除。

---

## 3. 前端頁面設計 (Frontend UI)

### A. 首頁儀表板 `/`
*   主清單表格顯示最新版單號（如 `Q-20260709-001 (v2)`）。
*   若 `version > 1`，行尾提供展開按鈕（▼）。
*   點選展開後，於下方展開一子表格，顯示歷史版本清單（如 `v1`、建立時間、含稅總額、查看按鈕）。

### B. 報價單編輯器 `/quotations/[id]/edit`
*   進入頁面時，若 `isLatest === false`，編輯器自動轉為**唯讀 (ReadOnly) 模式**，禁止任何 input 輸入、增減大項細項與送出。
*   頂部顯示黃色醒目警告條：「此為歷史版本 (v1)，不開放修改。若需調整請前往最新版本 (v2) 進行編輯。」

### C. 生產環境資料庫檢視面板 `/database`
*   新增全域資料庫檢視路由，採 Tabs 切換介面：
    1.  **合作廠商表 (Vendor)**
    2.  **設定費率表 (SystemSetting)**
    3.  **報價單主表 (Quotation)**
    4.  **功能大項表 (QuotationCategory)**
    5.  **估工細項表 (QuotationItem)**
*   每個 Tab 直接以 Table 輸出資料庫內的 Raw Data JSON 或表格欄位，並支援本地與 Vercel 部署後的直接查閱。

---

## 4. 本地資料庫檢視配置
*   在 `package.json` 的 `scripts` 中加入：
    ```json
    "db:studio": "prisma studio"
    ```
*   在 README.md 中新增 Prisma Studio 的操作指南。
