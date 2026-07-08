# Task 4: Settings & Estimator 實作報告

## 任務狀態：DONE

### 實作內容說明
1. **精密計算模組 (`src/lib/calculator.ts`)**：
   * 實作 `roundToOneDecimal(num: number): number`，使用 `Number.EPSILON` 防範 JavaScript 浮點數精度誤差。
   * 實作 `calculateItem`：接收功能細項與各角色費率，計算總工時（天數）與未稅金額。計算時將天數轉換成整數（天數 * 10）再行計算，最後除以 10，避免 `0.1 * rate` 產生 JS 浮點數乘法誤差，並對結果金額進行四捨五入。
   * 實作 `calculateQuotation`：接收功能細項列表、各角色費率與稅率，計算整張報價單的各角色總天數、總天數、未稅總額、營業稅（5%）與含稅總計金額，有效防止小數累積精度誤差。
2. **單元測試 (`scripts/test-calculator.ts`)**：
   * 驗證 `roundToOneDecimal` 的精度（例如 `0.1 + 0.2 === 0.3`）。
   * 驗證單細項工時與金額計算。
   * 驗證多細項累加、未稅額、稅金與含稅總額。
   * 所有測試皆能藉由 `npx tsx scripts/test-calculator.ts` 通過。
3. **系統費率設定 API 端點 (`src/app/api/settings/route.ts`)**：
   * `GET`：從 `SystemSetting` Table 查詢預設費率（`DEFAULT_RD_RATE`、`DEFAULT_PM_RATE`、`DEFAULT_QC_RATE`、`DEFAULT_INTEGRATION_RATE`）。若無對應記錄，則返回系統預設值（8000, 6000, 5000, 6500）。
   * `POST`：接收新的預設費率，驗證是否為零或正整數後，以 Prisma 交易 (Transaction) 及 `upsert` 安全更新/新增至資料庫。
4. **前端費率設定頁面 (`src/app/settings/page.tsx`)**：
   * 建立具備精緻設計、響應式表單的費率設定頁面，完美契合專案主色調。
   * 進入頁面時發送 GET 讀取預設值。
   * 送出表單時發送 POST 儲存，並顯示繁體中文的成功提示，且成功提示具有 3 秒自動淡出效果。
5. **主控台首頁改寫 (`src/app/page.tsx`)**：
   * 將預設的 Next.js starter 頁面重構為精美、專業的外包廠商報價管理系統入口網頁，提供「合作廠商管理」與「系統費率設定」兩大導覽入口，顯著提升系統的視覺美感與使用者體驗。

### 驗證與測試結果
1. **單元測試執行**：
   * 執行命令：`npx tsx scripts/test-calculator.ts`
   * 結果：`✅ 所有計算模組測試通過！`
2. **資料庫連線測試**：
   * 執行命令：`npx tsx scripts/test-settings-db.ts`
   * 結果：`✅ SystemSetting 資料庫操作測試通過！`
3. **Next.js 專案編譯**：
   * 執行命令：`npm run build`
   * 結果：`✓ Compiled successfully` 且完成 `Static HTML Export` 等優化。

### 提交紀錄
* `46bb174` - feat: 實作核心報價計算模組與單元測試
* `8c29428` - feat: 實作系統費率設定 API 端點
* `549dc55` - feat: 實作前端費率設定介面與系統首頁主控台
