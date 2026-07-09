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

---

## Task 3 修復與漏洞防堵更新 (2026-07-09)

根據最新的 Fix Brief 要求，已成功實作並驗證以下修正：

### 1. 將 Parent 查詢移入交易內部，並增加 isLatest 欄位校驗 (Critical)
* **檔案**：`src/app/api/quotations/[id]/route.ts`
* **實作**：
  * 將原本在 `db.$transaction` 之前的 `db.quotation.findUnique` 移入交易區塊內部（改用交易提供的 `tx.quotation.findUnique`），確保在高併發場景下不會因 Race Condition 導致 `isLatest` 狀態判斷失準。
  * 查詢取得 `parent` 物件後，實作了防呆校驗：若 `!parent` 回傳 `404` 錯誤（提示「找不到報價單」）；若 `!parent.isLatest` 則回傳 `400` 錯誤（提示「無法更新非最新版本的報價單」），成功攔截並防止對歷史封存版本進行修改。

### 2. 增加 GET API 查詢參數防呆 (Important)
* **檔案**：`src/app/api/quotations/route.ts`
* **實作**：
  * 在 `GET` 處理器中加入強檢驗：若請求參數中包含 `allVersions=true` 但沒有提供 `quotationNumber`，API 將會回傳 `400` 錯誤，提示：「查詢歷史版本時，必須提供報價單號」。

### 3. 優化數值欄位 Fallback 防呆 (Minor)
* **檔案**：`src/app/api/quotations/[id]/route.ts`
* **實作**：
  * 提取了 `parseDays` 輔助解析函式，當 `rdDays`, `pmDays`, `qcDays`, `integrationDays` 傳入空字串 `""` 或 `NaN` 時，將會被妥善且自動回退（Fallback）為 `0`，避免了 `parseFloat` 直接解析成 `NaN` 的問題，同時也保證了大於等於 `0` 的驗證規則能正確運作。

### 4. 擴充整合測試與驗證結果
* **測試代碼擴充**：`scripts/test-version-apis.ts` 中新增了兩個關鍵驗證步驟：
  * **[步驟 3.5]**：測試對已封存/歷史版本 (v1Id, `isLatest === false`) 發送 `PUT` 請求，驗證 API 確實回傳 `400`（錯誤訊息為 "無法更新非最新版本的報價單"），而非因 Unique Constraint 產生的 `500` 資料庫衝突錯誤。
  * **[步驟 5.5]**：測試 GET 請求帶入 `allVersions=true` 但未帶報價單單號，驗證 API 正確回傳 `400`（錯誤訊息為 "查詢歷史版本時，必須提供報價單號"）。
* **測試與 Build 驗證狀態**：
  * 執行 `npx tsx scripts/test-version-apis.ts`：**SUCCESS**（包含新增的兩個 400 Bad Request 防呆測試均全部通過）
  * 執行 `npm run build`：**SUCCESS**（TypeScript 編譯及 Next.js 頁面生成皆無錯誤）
