# Task 2 實作報告: DB Seeding

## 1. 任務概述
編寫與配置資料庫的 Seeding 腳本，初始化預設的角色工時費率（RD, PM, QC, 整合）與一筆示範的合作廠商資料，以利後續開發與測試。

## 2. 修改與建立的檔案

### 2.1 建立 `prisma/seed.ts`
- **路徑**: [prisma/seed.ts](file:///C:/Users/Michael/.gemini/antigravity/scratch/vendor-quotation-system/prisma/seed.ts)
- **實作內容**:
  - 使用 Prisma Client 的 `upsert` 方法，寫入系統預設費率（使用 `SystemSetting` model）：
    - `DEFAULT_RD_RATE`: `8000`
    - `DEFAULT_PM_RATE`: `6000`
    - `DEFAULT_QC_RATE`: `5000`
    - `DEFAULT_INTEGRATION_RATE`: `6500`
  - 建立一筆測試用的示範廠商資料（使用 `Vendor` model）：
    - `id`: `demo-vendor-id`
    - `name`: `測試範例科技有限公司`
    - `taxId`: `87654321`
    - `contactName`: `張小明`
    - `contactEmail`: `xiaoming@example.com`
    - `contactPhone`: `0912-345678`
    - `address`: `台北市信義區信義路五段7號`

### 2.2 修改 `package.json`
- **路徑**: [package.json](file:///C:/Users/Michael/.gemini/antigravity/scratch/vendor-quotation-system/package.json)
- **變動**: 
  - 新增 `prisma` 欄位以支援 `npx prisma db seed` 執行 Seeding 指令：
    ```json
    "prisma": {
      "seed": "tsx prisma/seed.ts"
    }
    ```
  - 將 `tsx` 新增至 `devDependencies`（執行 `npm install -D tsx`）以確保 Node.js 環境可流暢執行 TypeScript 腳本。

### 2.3 建立驗證腳本 `scripts/test-seed.ts`
- **路徑**: [scripts/test-seed.ts](file:///C:/Users/Michael/.gemini/antigravity/scratch/vendor-quotation-system/scripts/test-seed.ts)
- **實作內容**:
  - 連線至資料庫，動態查詢並驗證 `SystemSetting` 以及 `Vendor` 是否存在且內容欄位數值完全正確。

---

## 3. 測試與驗證結果

### 3.1 執行資料庫 Seed 指令
執行以下命令：
```bash
npx prisma db seed
```
**輸出結果**:
```text
Running seed command `tsx prisma/seed.ts` ...
開始植入系統預設費率...
已設定 DEFAULT_RD_RATE = 8000
已設定 DEFAULT_PM_RATE = 6000
已設定 DEFAULT_QC_RATE = 5000
已設定 DEFAULT_INTEGRATION_RATE = 6500
開始植入示範廠商資料...
已建立/更新示範廠商: 測試範例科技有限公司 (demo-vendor-id)
The seed command has been executed.
```

### 3.2 執行驗證腳本
執行以下命令：
```bash
npx tsx scripts/test-seed.ts
```
**輸出結果**:
```text
開始驗證資料庫 Seed 資料...
✅ 驗證成功: DEFAULT_RD_RATE = 8000
✅ 驗證成功: DEFAULT_PM_RATE = 6000
✅ 驗證成功: DEFAULT_QC_RATE = 5000
✅ 驗證成功: DEFAULT_INTEGRATION_RATE = 6500
✅ 驗證成功: 示範廠商資料完全正確！

恭喜！所有 Seed 資料驗證成功！
```

---

## 4. 決策與結論
- 為確保多次重複執行 Seed 不會因為資料重複而報錯，我們全部採用 `upsert` 方法，如果資料已存在則更新，不存在則新增。
- 將 `tsx` 安裝為開發依賴項，避免開發者在無 `tsx` 全域安裝的環境中遭遇 `Command not found` 的問題。
- 經獨立驗證，所有種子資料均已成功且正確寫入 PostgreSQL 資料庫。
