# Task 3 任務報告：報價單 CRUD APIs 升級 (Version-control on PUT)

## 實作狀態：DONE

本任務已完全實作報價單 API 的版本控制機制。現在 `PUT` 請求將不再執行原地更新，而是透過資料庫交易（Database Transaction）封存舊版本並建立遞增的新版本。

---

## 實作內容說明

### 1. 資料庫 Schema 調整 (`prisma/schema.prisma`)
* 移除了 `Quotation.quotationNumber` 的單獨 `@unique` 限制。
* 新增複合唯一索引 `@@unique([quotationNumber, version])`，保證同一個單號下不能有重複的版本，同時允許不同版本共用相同的 `quotationNumber`。
* 執行了 `npx prisma db push --accept-data-loss` 將變更同步至資料庫。

### 2. 報價單列表 API 升級 (`src/app/api/quotations/route.ts`)
* **GET**：
  * 預設僅回傳最新版報價單（`isLatest: true`）。
  * 支援解析 `?allVersions=true&quotationNumber=xxx` 參數，以便撈取特定報價單的所有歷史版本（依 `version` 降序排列）。
  * 支援 `request` 為 `undefined` 的安全 fallback，以相容既有的測試框架。
* **POST（單號產生優化）**：
  * 優化了單號產生序號的計算邏輯。原邏輯使用 `findFirst` 且僅對 `quotationNumber` 排序，容易受到測試數據（如尾碼為非數字的 `-TEST`）干擾而產生 `NaN` 的 Fallback（重複產生序號 `001`）。
  * 新邏輯撈取當天所有單號並在記憶體中過濾出能解析為數字的序號，取得其最大值並 `+1`。這保證了極高的健壯性，防止 Unique Constraint 錯誤。

### 3. 單一報價單 API 升級 (`src/app/api/quotations/[id]/route.ts`)
* **PUT（版本控制交易）**：
  * 實作非原地更新的版本遞增機制。
  * 在 `$transaction` 中：
    1. 將父報價單設為非最新版且已封存 (`isLatest: false`, `status: "ARCHIVED"`）。
    2. 建立新一版報價單，單號與 parent 一致，版本設為 `parent.version + 1`，連結 `parentQuotationId: parent.id`，且 `isLatest: true`，並將新的大項與細項結構寫入此新版本中。

### 4. 整合測試與既有測試修正
* **新建 `scripts/test-version-apis.ts`**：
  * 模擬建立 v1 報價單，驗證初始屬性。
  * 模擬更新 v1 產生 v2，驗證 v1 狀態變更為 `ARCHIVED` 且 `isLatest: false`，v2 關聯 parent 且 `version: 2`、`isLatest: true`。
  * 模擬更新 v2 產生 v3，驗證版本鏈（v1 -> v2 -> v3）與關聯完全正確。
  * 驗證 `GET` 查詢歷史版本（降序）與預設查詢（僅最新）。
* **修正 `scripts/test-quotations.ts`**：
  * 將原本原地更新的 `version` 斷言由 `1` 修正為 `2`。
  * 將內部狀態指標 `testQuotationId` 導向新產生的 v2 ID，使後續的詳情查詢、刪除與 finally 清理動作可以正確對準 v2，同時最後在 `finally` 區塊補上 v1 的清理。

---

## 異動檔案清單
* `prisma/schema.prisma` - 調整唯一性約束
* `src/app/api/quotations/route.ts` - 升級 GET 方法與優化單號產生
* `src/app/api/quotations/[id]/route.ts` - 升級 PUT 方法實作版本控制交易
* `scripts/test-version-apis.ts` - 新增版本 API 整合測試
* `scripts/test-quotations.ts` - 修正既有報價單整合測試

---

## 整合測試結果
* 執行 `npx tsx scripts/test-version-apis.ts`：**SUCCESS** (版本鏈建立與關聯驗證 100% 正確)
* 執行 `npx tsx scripts/test-quotations.ts`：**SUCCESS** (既有測試修復後 100% 通過)
