# 報價單版本歷史與資料庫檢視面板實作計畫

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 實作報價單版本遞增鏈（v1 -> v2 -> v3）控制與生產環境資料庫唯讀檢視面板 (`/database`)。

**Architecture:** 對 `Quotation` Model 新增 `version`、`isLatest` 與自我參照關聯 `parentQuotationId`。修改 `PUT` API 使其在更新時以交易封存舊版並建立新版本。新增唯讀 API 與 `/database` 頁面顯示各張資料表的 Raw Data 表格。

**Tech Stack:** Next.js 14+ (App Router), Prisma ORM, PostgreSQL, Tailwind CSS.

## Global Constraints
*   所有前端顯示介面、錯誤訊息與程式碼註解必須使用繁體中文 (Traditional Chinese)。
*   工時計算必須使用 `src/lib/calculator.ts` 以防止 JavaScript 浮點數精度跑掉。
*   所有的後端 GET API 必須顯式配置 `export const dynamic = "force-dynamic";` 以排除 Next.js 靜態快取隱患。

---

### Task 1: 資料庫 Schema 升級 (Prisma Migrate)

**Files:**
*   Modify: `prisma/schema.prisma`
*   Create: `scripts/test-schema-version.ts`

**Interfaces:**
*   Consumes: 無
*   Produces: 更新後的 Prisma Client 型別（含 `version`, `isLatest`, `parentQuotationId`）。

- [ ] **Step 1: 撰寫資料庫結構修改**
  修改 `prisma/schema.prisma` 中的 `Quotation` Model，新增版本控制欄位：
  ```prisma
  model Quotation {
    id               String              @id @default(uuid())
    quotationNumber  String
    title            String
    vendorId         String
    vendor           Vendor              @relation(fields: [vendorId], references: [id], onDelete: Cascade)
    status           String              @default("PENDING")
    taxRate          Decimal             @default(0.05) @db.Decimal(10, 2)
    rdRate           Int
    pmRate           Int
    qcRate           Int
    integrationRate  Int
    createdAt        DateTime            @default(now())
    updatedAt        DateTime            @updatedAt

    // === 版本控制欄位 ===
    version            Int               @default(1)
    isLatest           Boolean           @default(true)
    parentQuotationId  String?           @unique
    parentQuotation    Quotation?        @relation("QuotationVersions", fields: [parentQuotationId], references: [id], onDelete: SetNull)
    childQuotation     Quotation?        @relation("QuotationVersions")

    categories       QuotationCategory[]
  }
  ```

- [ ] **Step 2: 撰寫 TDD 驗證腳本**
  新建 `scripts/test-schema-version.ts` 寫入測試邏輯：
  ```typescript
  import { PrismaClient } from "@prisma/client";
  const prisma = new PrismaClient();
  async function test() {
    console.log("開始驗證 Prisma Schema 版本控制欄位...");
    const demoVendor = await prisma.vendor.findFirst();
    if (!demoVendor) throw new Error("資料庫中無任何廠商，請先執行 seeding");

    // 建立 v1
    const q1 = await prisma.quotation.create({
      data: {
        quotationNumber: "Q-TEST-V",
        title: "測試 v1",
        vendorId: demoVendor.id,
        rdRate: 8000, pmRate: 6000, qcRate: 5000, integrationRate: 6500,
        version: 1,
        isLatest: false
      }
    });
    // 建立 v2 並連結 v1
    const q2 = await prisma.quotation.create({
      data: {
        quotationNumber: "Q-TEST-V",
        title: "測試 v2",
        vendorId: demoVendor.id,
        rdRate: 8000, pmRate: 6000, qcRate: 5000, integrationRate: 6500,
        version: 2,
        isLatest: true,
        parentQuotationId: q1.id
      }
    });

    console.log(`寫入成功！v1 ID: ${q1.id}, v2 ID: ${q2.id}, parentId: ${q2.parentQuotationId}`);
    if (q2.parentQuotationId !== q1.id) throw new Error("版本關聯設定錯誤！");
    
    // 清理測試資料
    await prisma.quotation.delete({ where: { id: q2.id } });
    await prisma.quotation.delete({ where: { id: q1.id } });
    console.log("✅ Schema 驗證成功！測試資料已清理。");
  }
  test().catch(console.error).finally(() => prisma.$disconnect());
  ```

- [ ] **Step 3: 執行資料庫遷移與驗證**
  執行：
  ```bash
  npx prisma migrate dev --name add_quotation_versioning
  ```
  Expected: 資料表變更成功，Prisma Client 自動重新產生。

- [ ] **Step 4: 執行 TDD 驗證腳本**
  執行：
  ```bash
  npx tsx scripts/test-schema-version.ts
  ```
  Expected: 輸出 "✅ Schema 驗證成功！測試資料已清理。"

- [ ] **Step 5: Git Commit**
  ```bash
  git add prisma/schema.prisma scripts/test-schema-version.ts
  git commit -m "feat: upgrade prisma schema to support quotation versioning"
  ```

---

### Task 2: 資料庫 Seeding 與既有測試修正

**Files:**
*   Modify: `prisma/seed.ts`
*   Modify: `scripts/test-quotations.ts`

**Interfaces:**
*   Consumes: 更新後的 Prisma Client。
*   Produces: 乾淨的 Seeding 資料庫狀態。

- [ ] **Step 1: 修改 Seed 腳本**
  在 `prisma/seed.ts` 的 `Quotation` 建立邏輯中補上 `version` 與 `isLatest` 欄位寫入。
  ```typescript
  // 尋找 Quotation 的 create 或 upsert，加上：
  version: 1,
  isLatest: true,
  ```

- [ ] **Step 2: 修改現存報價單 API 測試檔案**
  在 `scripts/test-quotations.ts` 中，若有直接操作 Prisma Quotation 的 create / update 動作，需配合補上 `isLatest: true` 的預設值。

- [ ] **Step 3: 重新執行 Seeding**
  執行：
  ```bash
  npx prisma db seed
  ```
  Expected: 輸出 "資料庫 seeding 完成！" 且無報錯。

- [ ] **Step 4: 執行既有測試**
  執行：
  ```bash
  npx tsx scripts/test-quotations.ts
  ```
  Expected: 輸出 "恭喜！所有報價單 API 測試通過！"

- [ ] **Step 5: Git Commit**
  ```bash
  git add prisma/seed.ts scripts/test-quotations.ts
  git commit -m "test: align seeding and existing tests with new schema"
  ```

---

### Task 3: 報價單 CRUD APIs 升級 (Version-control on PUT)

**Files:**
*   Modify: `src/app/api/quotations/route.ts`
*   Modify: `src/app/api/quotations/[id]/route.ts`
*   Create: `scripts/test-version-apis.ts`

**Interfaces:**
*   Consumes: Prisma Client。
*   Produces:
    *   `GET /api/quotations` 預設回傳 `isLatest: true` 列表。
    *   `PUT /api/quotations/[id]` 觸發版本遞增交易，回傳新建立的報價單資料。

- [ ] **Step 1: 修改 `GET /api/quotations`**
  修改 `src/app/api/quotations/route.ts` 的 `GET` 方法，預設加入 `isLatest: true` 過濾：
  ```typescript
  // 加上動態參數解析，若有 ?allVersions=true 則不過濾 isLatest
  const { searchParams } = new URL(request.url);
  const allVersions = searchParams.get("allVersions") === "true";
  const quotationNumber = searchParams.get("quotationNumber");

  const whereClause: any = {};
  if (!allVersions) {
    whereClause.isLatest = true;
  }
  if (quotationNumber) {
    whereClause.quotationNumber = quotationNumber;
  }
  // 執行 prisma.quotation.findMany({ where: whereClause, orderBy: { version: "desc" } })
  ```

- [ ] **Step 2: 修改 `PUT /api/quotations/[id]` 實作版本遞增交易**
  修改 `src/app/api/quotations/[id]/route.ts` 的 `PUT` 處理器：
  ```typescript
  // 讀取原報價單與其版本號
  const parent = await prisma.quotation.findUnique({
    where: { id },
    include: { categories: { include: { items: true } } }
  });
  if (!parent) return NextResponse.json({ error: "找不到報價單" }, { status: 404 });

  // 實作事務交易
  const newQuotation = await prisma.$transaction(async (tx) => {
    // 1. 將父報價單設為非最新版且已封存
    await tx.quotation.update({
      where: { id },
      data: { isLatest: false, status: "ARCHIVED" }
    });

    // 2. 建立新一版報價單
    return await tx.quotation.create({
      data: {
        quotationNumber: parent.quotationNumber,
        title: body.title,
        vendorId: body.vendorId,
        status: "PENDING",
        taxRate: parent.taxRate,
        rdRate: body.rdRate,
        pmRate: body.pmRate,
        qcRate: body.qcRate,
        integrationRate: body.integrationRate,
        version: parent.version + 1,
        isLatest: true,
        parentQuotationId: parent.id,
        categories: {
          create: body.categories.map((cat: any, catIdx: number) => ({
            name: cat.name,
            sortOrder: catIdx,
            items: {
              create: cat.items.map((item: any, itemIdx: number) => ({
                description: item.description,
                rdDays: new Prisma.Decimal(item.rdDays),
                pmDays: new Prisma.Decimal(item.pmDays),
                qcDays: new Prisma.Decimal(item.qcDays),
                integrationDays: new Prisma.Decimal(item.integrationDays),
                note: item.note || "",
                sortOrder: itemIdx
              }))
            }
          }))
        }
      }
    });
  });
  ```

- [ ] **Step 3: 撰寫 API 版本控制整合測試**
  建立 `scripts/test-version-apis.ts`，發起模擬的 `PUT` 請求以驗證版本遞增行為：
  ```typescript
  import { PrismaClient } from "@prisma/client";
  import { POST as createHandler } from "../src/app/api/quotations/route";
  import { PUT as updateHandler, GET as getDetailHandler } from "../src/app/api/quotations/[id]/route";
  import { NextRequest } from "next/server";

  const prisma = new PrismaClient();
  async function test() {
    console.log("開始測試版本控制 API...");
    const vendor = await prisma.vendor.findFirst();
    if (!vendor) throw new Error("無廠商");

    // 1. 模擬建立 v1 報價單
    const reqCreate = new NextRequest("http://localhost/api/quotations", {
      method: "POST",
      body: JSON.stringify({
        title: "版本測試專案", vendorId: vendor.id,
        rdRate: 8000, pmRate: 6000, qcRate: 5000, integrationRate: 6500,
        categories: [{ name: "大項一", items: [{ description: "細項一", rdDays: 1, pmDays: 0, qcDays: 0, integrationDays: 0 }] }]
      })
    });
    const resCreate = await createHandler(reqCreate);
    const dataCreate = await resCreate.json();
    const v1Id = dataCreate.id;
    console.log("建立 v1 成功，ID:", v1Id);

    // 2. 模擬更新該報價單 (觸發 PUT)
    const reqUpdate = new NextRequest(`http://localhost/api/quotations/${v1Id}`, {
      method: "PUT",
      body: JSON.stringify({
        title: "版本測試專案-修改後", vendorId: vendor.id,
        rdRate: 8000, pmRate: 6000, qcRate: 5000, integrationRate: 6500,
        categories: [{ name: "大項一", items: [{ description: "細項一修改", rdDays: 2, pmDays: 0, qcDays: 0, integrationDays: 0 }] }]
      })
    });
    const resUpdate = await updateHandler(reqUpdate, { params: Promise.resolve({ id: v1Id }) } as any);
    const dataUpdate = await resUpdate.json();
    const v2Id = dataUpdate.id;
    console.log("更新產生 v2 成功，ID:", v2Id);

    // 3. 驗證資料庫狀態
    const dbV1 = await prisma.quotation.findUnique({ where: { id: v1Id } });
    const dbV2 = await prisma.quotation.findUnique({ where: { id: v2Id } });

    if (dbV1?.isLatest !== false || dbV1.status !== "ARCHIVED") throw new Error("v1 狀態更新錯誤！");
    if (dbV2?.isLatest !== true || dbV2.version !== 2 || dbV2.parentQuotationId !== v1Id) throw new Error("v2 屬性設定錯誤！");

    // 清理
    await prisma.quotation.delete({ where: { id: v2Id } });
    await prisma.quotation.delete({ where: { id: v1Id } });
    console.log("✅ 版本控制 API 驗證成功！");
  }
  test().catch(console.error).finally(() => prisma.$disconnect());
  ```

- [ ] **Step 4: 執行整合測試**
  執行：
  ```bash
  npx tsx scripts/test-version-apis.ts
  ```
  Expected: 輸出 "✅ 版本控制 API 驗證成功！"

- [ ] **Step 5: Git Commit**
  ```bash
  git add src/app/api/quotations/route.ts src/app/api/quotations/[id]/route.ts scripts/test-version-apis.ts
  git commit -m "feat: implement version control transaction in update API"
  ```

---

### Task 4: 資料庫檢視面板 Web API

**Files:**
*   Create: `src/app/api/admin/database/route.ts`

**Interfaces:**
*   Consumes: Prisma Client。
*   Produces: `GET /api/admin/database` 回傳包含所有資料表內容的 JSON 物件。

- [ ] **Step 1: 建立資料庫檢視 API 端點**
  新建 `src/app/api/admin/database/route.ts`：
  ```typescript
  import { NextResponse } from "next/server";
  import { db } from "@/lib/db";

  export const dynamic = "force-dynamic";

  export async function GET() {
    try {
      const [vendors, settings, quotations, categories, items] = await Promise.all([
        db.vendor.findMany({ orderBy: { createdAt: "desc" } }),
        db.systemSetting.findMany({ orderBy: { key: "asc" } }),
        db.quotation.findMany({ orderBy: { createdAt: "desc" } }),
        db.quotationCategory.findMany({ orderBy: { sortOrder: "asc" } }),
        db.quotationItem.findMany({ orderBy: { sortOrder: "asc" } })
      ]);

      return NextResponse.json({
        vendors,
        settings,
        quotations,
        categories,
        items
      });
    } catch (error) {
      console.error("讀取資料庫失敗:", error);
      return NextResponse.json({ error: "讀取資料庫失敗" }, { status: 500 });
    }
  }
  ```

- [ ] **Step 2: 驗證 API 輸出**
  啟動背景服務並用 curl 測試 API 輸出：
  ```bash
  curl http://localhost:3000/api/admin/database
  ```
  Expected: 回傳 200 並包含各個 Table 的 JSON 陣列。

- [ ] **Step 3: Git Commit**
  ```bash
  git add src/app/api/admin/database/route.ts
  git commit -m "feat: create database raw data inspection API endpoint"
  ```

---

### Task 5: 首頁儀表板前端升級 (展開歷史版本歷程)

**Files:**
*   Modify: `src/app/page.tsx`

**Interfaces:**
*   Consumes: `GET /api/quotations` 及其版本子查詢。
*   Produces: 支援點擊展開 (▼) 檢視歷史版本子清單的 React UI。

- [ ] **Step 1: 擴充首頁報價單列表的狀態管理**
  在 `src/app/page.tsx` 中，為列表的每筆資料建立「是否展開歷史」的 State 對映表，並實作點選下拉時打 API 拉取該單號下的所有歷史版本。
  ```typescript
  // 新增狀態
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});
  const [historyMap, setHistoryMap] = useState<Record<string, any[]>>({});

  const toggleHistory = async (quotationId: string, qNumber: string) => {
    if (expandedIds[quotationId]) {
      setExpandedIds(prev => ({ ...prev, [quotationId]: false }));
      return;
    }

    // 打 API 撈取該單號的所有版本歷程
    try {
      const res = await fetch(`/api/quotations?allVersions=true&quotationNumber=${qNumber}`);
      if (res.ok) {
        const data = await res.json();
        // 排除掉當前最新版，只留歷史版本
        const historyOnly = data.filter((q: any) => q.id !== quotationId);
        setHistoryMap(prev => ({ ...prev, [quotationId]: historyOnly }));
      }
    } catch (e) {
      console.error(e);
    }
    setExpandedIds(prev => ({ ...prev, [quotationId]: true }));
  };
  ```

- [ ] **Step 2: 渲染歷史版本子表格**
  在表格的最新版報價單 Row 下方，如果展開則渲染一層子表格：
  ```tsx
  {expandedIds[q.id] && (
    <tr className="bg-slate-50/50 dark:bg-slate-800/20">
      <td colSpan={7} className="px-6 py-4">
        <div className="border-l-4 border-slate-300 pl-4 py-2">
          <h4 className="text-sm font-semibold mb-2">版本變更歷史紀錄</h4>
          {historyMap[q.id]?.length === 0 ? (
            <p className="text-xs text-slate-500">無更早的歷史版本</p>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="text-slate-500 text-left">
                  <th>版本</th>
                  <th>專案名稱</th>
                  <th>建立時間</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {historyMap[q.id]?.map((hq: any) => (
                  <tr key={hq.id} className="border-t border-slate-200/50">
                    <td>v{hq.version}</td>
                    <td>{hq.title}</td>
                    <td>{new Date(hq.createdAt).toLocaleString("zh-TW")}</td>
                    <td>
                      <a href={`/quotations/${hq.id}/print`} target="_blank" className="text-slate-600 hover:text-slate-900 mr-3">查看列印</a>
                      <a href={`/quotations/${hq.id}/edit`} className="text-slate-600 hover:text-slate-900">查看唯讀頁面</a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </td>
    </tr>
  )}
  ```

- [ ] **Step 3: 驗證前端列表渲染**
  執行 `npm run build` 確認 Next.js 頁面與型別建置成功。

- [ ] **Step 4: Git Commit**
  ```bash
  git add src/app/page.tsx
  git commit -m "feat: add version history dropdown toggle to Quotation Dashboard"
  ```

---

### Task 6: 編輯器唯讀警告與唯讀控制

**Files:**
*   Modify: `src/app/quotations/quotation-form.tsx`
*   Modify: `src/app/quotations/[id]/edit/page.tsx`

**Interfaces:**
*   Consumes: Quotation 物件中的 `isLatest` 屬性。
*   Produces: 具有唯讀視覺控制與警告條的 React Form 元件。

- [ ] **Step 1: 修改編輯器組件以接受 `readOnly` 參數**
  在 `src/app/quotations/quotation-form.tsx` 中，為 `QuotationForm` 屬性定義新增 `readOnly?: boolean` 欄位：
  *   所有 input、select 加上 `disabled={readOnly}`。
  *   隱藏「新增功能大項」、「新增細項」以及「儲存報價單」按鈕。
  *   在頁面最上方增加警告標示：
      ```tsx
      {readOnly && (
        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 mb-6 rounded text-amber-700 text-sm">
          ⚠️ 注意：此報價單為「歷史歸檔版本」，頁面為唯讀狀態。若需修改，請至首頁尋找並編輯最新版本。
        </div>
      )}
      ```

- [ ] **Step 2: 修改編輯路由頁面以載入 `isLatest` 屬性**
  修改 `src/app/quotations/[id]/edit/page.tsx`，在撈取報價單時，將 `isLatest` 欄位是否為 `false` 轉換成 `readOnly` 屬性傳給 Form：
  ```tsx
  // 渲染時：
  <QuotationForm
    initialData={quotation}
    vendors={vendors}
    defaultSettings={settings}
    readOnly={!quotation.isLatest}
  />
  ```

- [ ] **Step 3: 驗證建置**
  執行 `npm run build` 確保專案打包正常。

- [ ] **Step 4: Git Commit**
  ```bash
  git add src/app/quotations/quotation-form.tsx src/app/quotations/[id]/edit/page.tsx
  git commit -m "feat: implement ReadOnly view and alert bar for archived quotation versions"
  ```

---

### Task 7: 資料庫檢視前端頁面 `/database`

**Files:**
*   Create: `src/app/database/page.tsx`
*   Modify: `src/app/layout.tsx` (在導航欄加入快速入口)

**Interfaces:**
*   Consumes: `GET /api/admin/database`。
*   Produces: 具有 Tab 控制、能檢索所有 Raw Data 資料的前端頁面。

- [ ] **Step 1: 新建資料庫唯讀檢視面板**
  建立 `src/app/database/page.tsx`，以 Tab 的方式展示資料：
  ```tsx
  "use client";
  import { useState, useEffect } from "react";

  export default function DatabasePage() {
    const [data, setData] = useState<any>(null);
    const [activeTab, setActiveTab] = useState("vendors");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
      fetch("/api/admin/database")
        .then(res => res.json())
        .then(d => {
          setData(d);
          setLoading(false);
        });
    }, []);

    if (loading) return <div className="p-8 text-center">資料庫載入中...</div>;

    const renderTable = (items: any[]) => {
      if (!items || items.length === 0) return <p className="text-slate-500 text-sm">無資料</p>;
      const headers = Object.keys(items[0]);
      return (
        <div className="overflow-x-auto border border-slate-200 rounded">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-100">
              <tr>
                {headers.map(h => <th key={h} className="p-2 border-b">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => (
                <tr key={idx} className="hover:bg-slate-50 border-b">
                  {headers.map(h => (
                    <td key={h} className="p-2 truncate max-w-[200px]" title={String(item[h])}>
                      {typeof item[h] === "object" ? JSON.stringify(item[h]) : String(item[h])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    };

    return (
      <div className="max-w-7xl mx-auto p-6">
        <h1 className="text-2xl font-bold mb-4">資料庫 Raw Data 檢視面板</h1>
        <p className="text-xs text-slate-500 mb-6 bg-slate-50 p-3 border-l-4 border-slate-400">
          💡 本地開發提示：若需更完整的 CRUD 操作，請於終端機執行 <code>npm run db:studio</code> 啟動 Prisma Studio。
        </p>

        <div className="flex space-x-2 mb-4 border-b border-slate-200">
          {["vendors", "settings", "quotations", "categories", "items"].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-semibold -mb-px ${activeTab === tab ? "border-b-2 border-slate-900 text-slate-900" : "text-slate-500"}`}
            >
              {tab.toUpperCase()}
            </button>
          ))}
        </div>

        <div>
          {activeTab === "vendors" && renderTable(data.vendors)}
          {activeTab === "settings" && renderTable(data.settings)}
          {activeTab === "quotations" && renderTable(data.quotations)}
          {activeTab === "categories" && renderTable(data.categories)}
          {activeTab === "items" && renderTable(data.items)}
        </div>
      </div>
    );
  }
  ```

- [ ] **Step 2: 在全域 Navbar 補上資料庫連結**
  在導航列（如 `src/app/page.tsx` 等首頁頂部）適當處補上「檢視資料庫」按鈕以方便點選。

- [ ] **Step 3: 執行生產環境編譯驗證**
  執行：
  ```bash
  npm run build
  ```
  Expected: Next.js 生產環境打包 100% 成功。

- [ ] **Step 4: Git Commit**
  ```bash
  git add src/app/database/page.tsx
  git commit -m "feat: build database inspection view panel at /database"
  ```
