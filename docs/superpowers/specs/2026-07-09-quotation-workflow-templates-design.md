# 報價流程補完 + 動態表單範本 設計文件

日期：2026-07-09

## 目標

1. 補完一流報價流程骨架：狀態機、核准鎖定、商務要件欄位、廠商快照、複製報價單。
2. 全站 UI/UX 打磨：toast/確認對話框、排序、手機排版、列印頁強化。
3. 新功能：ADMIN 可自訂報價單的工時角色欄位（新增/修改/刪除/排序），存成「報價範本」，建單時套用。

## 資料模型（Prisma）

### 新增 `QuoteTemplate`
```prisma
model QuoteTemplate {
  id           String   @id @default(uuid())
  name         String
  isDefault    Boolean  @default(false)
  roles        Json     // [{ key, label, rate }]，順序即陣列順序
  paymentTerms String?  // 預設付款條件（建單時預填）
  notes        String?  // 預設條款備註（建單時預填）
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}
```

### `Quotation` 變更
- 移除寫死的 `rdRate / pmRate / qcRate / integrationRate` → 新增 `roles Json`（儲存當下的角色定義與費率**快照**）。
- 新增商務欄位：`issueDate DateTime @default(now())`、`validUntil DateTime?`、`paymentTerms String?`、`notes String?`、`discount Int @default(0)`（整單折扣額，稅前扣）。
- 新增廠商快照：`vendorName / vendorTaxId / vendorContactName / vendorContactEmail / vendorContactPhone / vendorAddress`（儲存當下複製；列印頁只讀快照）。
- `vendor` 關聯 `onDelete: Cascade → Restrict`。
- 狀態值：`DRAFT / SENT / APPROVED / REJECTED`（舊 `ARCHIVED` 廢除，`isLatest=false` 即代表封存）。

### `QuotationItem` 變更
- 移除 `rdDays / pmDays / qcDays / integrationDays` → `days Json`（`{ [roleKey]: number }`，一位小數）。

### 移除
- `SystemSetting` 的費率用途、`/settings` 頁與 API — 費率改由範本管理。

> 遷移方式：`prisma db push --accept-data-loss`（build script 既有行為）+ seed 重建示範資料。此為示範系統，可接受既有資料重置。

## 狀態機

```
DRAFT ──寄出──> SENT ──核准──> APPROVED
  ^              │└──拒絕──> REJECTED
  └──撤回────────┘
```
- `PATCH /api/quotations/[id]/status`：僅允許上述轉換，其他 400。權限：EDITOR 可寄出，ADMIN 可核准/拒絕/撤回。
- **鎖定**：非 DRAFT 一律唯讀。編輯唯讀單 → 「另存新版本」（沿用既有版本機制，新版回 DRAFT，舊版**保留原狀態**不再改成 ARCHIVED）。
- **PUT 修正**：DRAFT 原地更新（不爆版本）；非 DRAFT 才開新版。
- **DELETE 修正**：刪除同單號全部版本（修正歷史版本孤兒 bug）。
- 新增 `POST /api/quotations/[id]/duplicate`：複製為新單號 v1 DRAFT。

## 範本使用流程

1. ADMIN 進「報價範本」頁（新導覽項，取代「費率設定」）：建立/編輯範本 — 命名、增刪角色欄位（名稱+日費率）、上下排序、預設付款條件/條款、指定一個預設範本（不可刪最後一個範本）。
2. 建新報價單：頂部範本下拉（預設範本自動套用）→ 產生對應工時欄位、費率、預填商務條件。費率仍可單張微調。
3. 已填工時後切換範本：確認對話框；同 label 的角色欄位工時保留，其餘丟棄。
4. 儲存時將角色定義+費率完整快照進報價單 → 範本日後改動/刪除不影響歷史單。
5. 編輯/複製既有單：直接用該單快照的角色欄位，不依賴範本存在。

## UI/UX

- 自製 `Toast` + `ConfirmDialog`（無新依賴），取代全站 `alert/confirm`。
- 首頁：狀態操作按鈕（寄出/核准/拒絕/撤回，依角色）、「複製」按鈕、狀態徽章補 REJECTED。
- 表單：新「商務條件」區塊（報價日期、有效期限預設 +30 天、付款條件、條款備註、折扣）；大項/細項上下移排序；天數輸入限一位小數（對齊 DB Decimal(10,1)）；手機 <sm 細項卡片式。
- 儲存後導回首頁 + toast（取代跳 /vendors）。
- 列印頁：動態角色欄、廠商快照、有效期限/付款條件/條款/折扣列、修 `taxRate*100` 浮點顯示。
- 廠商刪除受 Restrict 阻擋時回明確錯誤「該廠商尚有 N 張報價單」。

## 驗證

`tsc --noEmit`、`npm run lint`、Docker DB + db push + seed，Playwright 全流程：建範本→套範本建單→寄出→核准→鎖定→另存新版→複製→列印欄位檢查。
