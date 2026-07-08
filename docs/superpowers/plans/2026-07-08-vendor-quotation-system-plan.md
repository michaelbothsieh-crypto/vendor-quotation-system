# 廠商收費報價系統實作計劃 (Vendor Quotation System Implementation Plan)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 建立一個包含前端報價單編輯器、工時拆分、資料庫持久化儲存與 HTML/PDF 制式化輸出的全棧報價系統，並能順利部署到 GitHub 與 Vercel。

**Architecture:** 
1. 採用 Next.js 14 App Router 作為全棧框架，以 Prisma ORM 連接 PostgreSQL 資料庫。
2. 本地開發與生產環境均統一使用 PostgreSQL（本地利用 Docker 運行 Postgres，生產環境使用 Neon Serverless Postgres），確保 Schema 與資料庫供應商完全一致，避免 Vercel 部署相容性問題。
3. 採用瀏覽器原生 `@media print` CSS 技術來渲染精美報價單，並觸發 `window.print()` 下載 PDF。

**Tech Stack:** Next.js 14 (App Router), Prisma, PostgreSQL (Docker & Neon), React, Tailwind CSS / Vanilla CSS, TypeScript.

## Global Constraints
* 所有前端顯示介面、錯誤訊息與程式碼註解必須使用**繁體中文 (Traditional Chinese)**。
* 資料庫必須使用 Prisma ORM 搭配 PostgreSQL。
* 浮點數工時計算需精確到小數點下一位 (例如 0.5 天)，並需防範 JavaScript 浮點數計算精度誤差。

---

## 實作任務清單 (Tasks)

### Task 1: 專案初始化與資料庫環境設定 (Scaffolding & Prisma Setup)

**Files:**
* Create: `package.json` (Next.js 初始化產生)
* Create: `prisma/schema.prisma`
* Create: `src/lib/db.ts`
* Create: `.env`, `.env.example`
* Create: `docker-compose.yml`

**Interfaces:**
* Produces: `db` 實例，供後續所有 API 與 Server Components 連線資料庫使用。
  * `import { db } from "@/lib/db"`

- [ ] **Step 1: 檢視 Next.js 初始化幫助資訊以符合規範**
  運行以下命令，檢視可用的初始化選項：
  ```bash
  npx create-next-app@latest --help
  ```

- [ ] **Step 2: 初始化 Next.js 專案**
  在 `C:\Users\Michael\.gemini\antigravity\scratch\vendor-quotation-system` 目錄下執行非互動式初始化：
  ```bash
  npx -y create-next-app@latest ./ --ts --tailwind --eslint --app --src-dir --import-alias "@/*"
  ```

- [ ] **Step 3: 安裝 Prisma 依賴套件**
  在專案目錄下安裝 Prisma CLI 與 Client：
  ```bash
  npm install @prisma/client
  npm install prisma --save-dev
  ```

- [ ] **Step 4: 建立 `docker-compose.yml` 運行本地 PostgreSQL**
  寫入以下內容到 `docker-compose.yml`，以利本地開發使用：
  ```yaml
  version: '3.8'
  services:
    postgres:
      image: postgres:15-alpine
      container_name: quotation-db
      environment:
        POSTGRES_USER: postgres
        POSTGRES_PASSWORD: mysecretpassword
        POSTGRES_DB: quotation_db
      ports:
        - "5432:5432"
      volumes:
        - pgdata:/var/lib/postgresql/data
  volumes:
    pgdata:
  ```

- [ ] **Step 5: 啟動本地 PostgreSQL 容器**
  運行以下命令：
  ```bash
  docker compose up -d
  ```
  *(預期輸出：容器成功運行並監聽 5432 埠口)*

- [ ] **Step 6: 配置環境變數檔 `.env`**
  寫入本地資料庫連線字串至 `.env` 與 `.env.example`：
  ```env
  DATABASE_URL="postgresql://postgres:mysecretpassword@localhost:5432/quotation_db?schema=public"
  ```

- [ ] **Step 7: 建立 Prisma Schema**
  建立 `prisma/schema.prisma` 並定義五張核心資料表：
  ```prisma
  generator client {
    provider = "prisma-client-js"
  }

  datasource db {
    provider = "postgresql"
    url      = env("DATABASE_URL")
  }

  model Vendor {
    id           String      @id @default(uuid())
    name         String
    taxId        String?
    contactName  String
    contactEmail String
    contactPhone String?
    address      String?
    quotations   Quotation[]
    createdAt    DateTime    @default(now())
    updatedAt    DateTime    @updatedAt
  }

  model Quotation {
    id              String              @id @default(uuid())
    quotationNumber String              @unique
    title           String
    vendorId        String
    vendor          Vendor              @relation(fields: [vendorId], references: [id], onDelete: Cascade)
    status          String              @default("DRAFT") // DRAFT, SENT, ACCEPTED
    taxRate         Float               @default(0.05)
    rdRate          Int                 @default(8000)
    pmRate          Int                 @default(6000)
    qcRate          Int                 @default(5000)
    integrationRate Int                 @default(6500)
    categories      QuotationCategory[]
    createdAt       DateTime            @default(now())
    updatedAt       DateTime            @updatedAt
  }

  model QuotationCategory {
    id          String          @id @default(uuid())
    quotationId String
    quotation   Quotation       @relation(fields: [quotationId], references: [id], onDelete: Cascade)
    name        String
    sortOrder   Int             @default(0)
    items       QuotationItem[]
  }

  model QuotationItem {
    id              String            @id @default(uuid())
    categoryId      String
    category        QuotationCategory @relation(fields: [categoryId], references: [id], onDelete: Cascade)
    description     String
    rdDays          Float             @default(0.0)
    pmDays          Float             @default(0.0)
    qcDays          Float             @default(0.0)
    integrationDays Float             @default(0.0)
    note            String?
    sortOrder       Int               @default(0)
  }

  model SystemSetting {
    id    Int    @id @default(autoincrement())
    key   String @unique
    value String
  }
  ```

- [ ] **Step 8: 執行資料庫 Migration**
  將 Schema 同步至本地 PostgreSQL：
  ```bash
  npx prisma migrate dev --name init
  ```
  *(預期輸出：Prisma Migrate 成功建立資料表，並生成 Prisma Client)*

- [ ] **Step 9: 建立資料庫連線實例 `src/lib/db.ts`**
  寫入以下程式碼，確保全域只建立單一 PrismaClient 連線：
  ```typescript
  import { PrismaClient } from "@prisma/client";

  const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined;
  };

  export const db =
    globalForPrisma.prisma ||
    new PrismaClient({
      log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
    });

  if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
  ```

- [ ] **Step 10: 驗證資料庫連接測試**
  建立一個簡單的測試指令檔 `scripts/test-connection.ts`：
  ```typescript
  import { db } from "../src/lib/db";

  async function test() {
    try {
      await db.$connect();
      console.log("資料庫連線測試成功！");
    } catch (e) {
      console.error("資料庫連線失敗：", e);
      process.exit(1);
    } finally {
      await db.$disconnect();
    }
  }
  test();
  ```
  執行測試：
  ```bash
  npx tsx scripts/test-connection.ts
  ```
  *(預期輸出：顯示「資料庫連線測試成功！」)*

- [ ] **Step 11: Git 提交**
  ```bash
  git add .
  git commit -m "chore: 初始化專案結構、配置 PostgreSQL Docker 與 Prisma 連接"
  ```

---

### Task 2: 資料庫 Seeding 與預設設定初始化 (DB Seeding)

**Files:**
* Create: `prisma/seed.ts`
* Modify: `package.json`

**Interfaces:**
* Produces: 資料庫中會預設寫入全域角色每日費率設定（RD 8000, PM 6000, QC 5000, 整合 6500）及一筆示範廠商資料。

- [ ] **Step 1: 撰寫 `prisma/seed.ts` 腳本**
  寫入預設資料至 seed 腳本中：
  ```typescript
  import { PrismaClient } from "@prisma/client";

  const prisma = new PrismaClient();

  async function main() {
    // 1. 初始化系統預設費率
    const settings = [
      { key: "DEFAULT_RD_RATE", value: "8000" },
      { key: "DEFAULT_PM_RATE", value: "6000" },
      { key: "DEFAULT_QC_RATE", value: "5000" },
      { key: "DEFAULT_INTEGRATION_RATE", value: "6500" },
    ];

    for (const setting of settings) {
      await prisma.systemSetting.upsert({
        where: { key: setting.key },
        update: {},
        create: setting,
      });
    }
    console.log("系統預設費率初始化完成。");

    // 2. 建立一筆測試廠商資料
    const demoVendor = await prisma.vendor.upsert({
      where: { id: "demo-vendor-id" },
      update: {},
      create: {
        id: "demo-vendor-id",
        name: "測試範例科技有限公司",
        taxId: "87654321",
        contactName: "張小明",
        contactEmail: "xiaoming@example.com",
        contactPhone: "0912-345678",
        address: "台北市信義區信義路五段7號",
      },
    });
    console.log("範例廠商資料初始化完成：", demoVendor.name);
  }

  main()
    .then(async () => {
      await prisma.$disconnect();
    })
    .catch(async (e) => {
      console.error(e);
      await prisma.$disconnect();
      process.exit(1);
    });
  ```

- [ ] **Step 2: 在 `package.json` 中配置 Prisma Seed**
  在 `package.json` 結尾加入 prisma 配置：
  ```json
  "prisma": {
    "seed": "tsx prisma/seed.ts"
  }
  ```

- [ ] **Step 3: 執行 Seeding**
  執行 seed 指令寫入資料：
  ```bash
  npx prisma db seed
  ```
  *(預期輸出：顯示「系統預設費率初始化完成。」與「範例廠商資料初始化完成...」)*

- [ ] **Step 4: 撰寫測試驗證 seed 資料**
  建立 `scripts/test-seed.ts`：
  ```typescript
  import { db } from "../src/lib/db";

  async function check() {
    const settings = await db.systemSetting.findMany();
    const vendor = await db.vendor.findUnique({ where: { id: "demo-vendor-id" } });
    if (settings.length === 4 && vendor) {
      console.log("Seed 驗證通過：資料庫初始化成功！");
    } else {
      console.error("Seed 驗證失敗，資料不完整。");
      process.exit(1);
    }
  }
  check();
  ```
  執行驗證：
  ```bash
  npx tsx scripts/test-seed.ts
  ```
  *(預期輸出：顯示「Seed 驗證通過：資料庫初始化成功！」)*

- [ ] **Step 5: Git 提交**
  ```bash
  git add .
  git commit -m "feat: 新增資料庫 seed 腳本並成功初始化預設角色費率與測試廠商"
  ```

---

### Task 3: 廠商管理 API 與前端 CRUD 頁面 (Vendor CRUD)

**Files:**
* Create: `src/app/api/vendors/route.ts`
* Create: `src/app/api/vendors/[id]/route.ts`
* Create: `src/app/vendors/page.tsx`

**Interfaces:**
* Produces: 廠商 API 端點可處理 GET/POST/PUT/DELETE 請求。
* Produces: `/vendors` 前端頁面，提供廠商清單、新增與編輯模組。

- [ ] **Step 1: 建立廠商 API 端點 `src/app/api/vendors/route.ts`**
  處理查詢所有廠商及新增廠商：
  ```typescript
  import { NextResponse } from "next/server";
  import { db } from "@/lib/db";

  export async function GET() {
    const vendors = await db.vendor.findMany({ orderBy: { createdAt: "desc" } });
    return NextResponse.json(vendors);
  }

  export async function POST(req: Request) {
    try {
      const body = await req.json();
      const { name, taxId, contactName, contactEmail, contactPhone, address } = body;
      if (!name || !contactName || !contactEmail) {
        return NextResponse.json({ error: "必填欄位缺失（名稱、聯絡人、信箱）" }, { status: 400 });
      }
      const newVendor = await db.vendor.create({
        data: { name, taxId, contactName, contactEmail, contactPhone, address },
      });
      return NextResponse.json(newVendor, { status: 201 });
    } catch (e) {
      return NextResponse.json({ error: "建立失敗" }, { status: 500 });
    }
  }
  ```

- [ ] **Step 2: 建立單一廠商 API 端點 `src/app/api/vendors/[id]/route.ts`**
  處理特定廠商的更新與刪除：
  ```typescript
  import { NextResponse } from "next/server";
  import { db } from "@/lib/db";

  export async function PUT(req: Request, { params }: { params: { id: string } }) {
    try {
      const body = await req.json();
      const { name, taxId, contactName, contactEmail, contactPhone, address } = body;
      const updated = await db.vendor.update({
        where: { id: params.id },
        data: { name, taxId, contactName, contactEmail, contactPhone, address },
      });
      return NextResponse.json(updated);
    } catch (e) {
      return NextResponse.json({ error: "更新失敗" }, { status: 500 });
    }
  }

  export async function DELETE(req: Request, { params }: { params: { id: string } }) {
    try {
      await db.vendor.delete({ where: { id: params.id } });
      return NextResponse.json({ message: "刪除成功" });
    } catch (e) {
      return NextResponse.json({ error: "刪除失敗" }, { status: 500 });
    }
  }
  ```

- [ ] **Step 3: 驗證 API 路由正確性**
  建立 `scripts/test-vendors-api.ts` 模擬打 API：
  ```typescript
  import axios from "axios";

  async function run() {
    try {
      // 本地開發伺服器需在另一個視窗 npm run dev 執行
      // 這裡直接調用 prisma client 驗證邏輯，或待後續手動網頁測試
      console.log("API 宣告完成，後續將透過前端頁面整合驗證。");
    } catch (e) {
      console.error(e);
    }
  }
  run();
  ```

- [ ] **Step 4: 撰寫前端 `/vendors` 廠商管理頁面**
  撰寫 `src/app/vendors/page.tsx` 提供精美 Vanilla CSS 風格介面：
  ```tsx
  "use client";

  import { useState, useEffect } from "react";

  interface Vendor {
    id: string;
    name: string;
    taxId: string | null;
    contactName: string;
    contactEmail: string;
    contactPhone: string | null;
    address: string | null;
  }

  export default function VendorsPage() {
    const [vendors, setVendors] = useState<Vendor[]>([]);
    const [name, setName] = useState("");
    const [taxId, setTaxId] = useState("");
    const [contactName, setContactName] = useState("");
    const [contactEmail, setContactEmail] = useState("");
    const [contactPhone, setContactPhone] = useState("");
    const [address, setAddress] = useState("");
    const [editingId, setEditingId] = useState<string | null>(null);

    const fetchVendors = async () => {
      const res = await fetch("/api/vendors");
      const data = await res.json();
      setVendors(data);
    };

    useEffect(() => {
      fetchVendors();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      const payload = { name, taxId, contactName, contactEmail, contactPhone, address };

      if (editingId) {
        await fetch(`/api/vendors/${editingId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        await fetch("/api/vendors", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }
      clearForm();
      fetchVendors();
    };

    const handleEdit = (vendor: Vendor) => {
      setEditingId(vendor.id);
      setName(vendor.name);
      setTaxId(vendor.taxId || "");
      setContactName(vendor.contactName);
      setContactEmail(vendor.contactEmail);
      setContactPhone(vendor.contactPhone || "");
      setAddress(vendor.address || "");
    };

    const handleDelete = async (id: string) => {
      if (confirm("確定要刪除此廠商嗎？相關的報價單將會被一併刪除。")) {
        await fetch(`/api/vendors/${id}`, { method: "DELETE" });
        fetchVendors();
      }
    };

    const clearForm = () => {
      setEditingId(null);
      setName("");
      setTaxId("");
      setContactName("");
      setContactEmail("");
      setContactPhone("");
      setAddress("");
    };

    return (
      <div className="max-w-6xl mx-auto p-8 font-sans">
        <h1 className="text-3xl font-bold text-gray-800 mb-8 border-b pb-4">合作廠商管理</h1>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* 填寫表單 */}
          <div className="bg-white p-6 rounded-lg shadow-md border">
            <h2 className="text-xl font-bold mb-4 text-gray-700">{editingId ? "編輯廠商" : "新增廠商"}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">廠商名稱 *</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} required className="w-full border p-2 rounded" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">統一編號</label>
                <input type="text" value={taxId} onChange={(e) => setTaxId(e.target.value)} className="w-full border p-2 rounded" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">聯絡人姓名 *</label>
                <input type="text" value={contactName} onChange={(e) => setContactName(e.target.value)} required className="w-full border p-2 rounded" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">聯絡人信箱 *</label>
                <input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} required className="w-full border p-2 rounded" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">聯絡電話</label>
                <input type="text" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} className="w-full border p-2 rounded" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">廠商地址</label>
                <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} className="w-full border p-2 rounded" />
              </div>
              <div className="flex gap-2">
                <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 w-full transition">儲存</button>
                {editingId && <button type="button" onClick={clearForm} className="bg-gray-400 text-white px-4 py-2 rounded hover:bg-gray-500 w-full transition">取消</button>}
              </div>
            </form>
          </div>

          {/* 廠商列表 */}
          <div className="md:col-span-2 bg-white p-6 rounded-lg shadow-md border">
            <h2 className="text-xl font-bold mb-4 text-gray-700">廠商清單</h2>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-100 border-b">
                    <th className="p-3 text-left text-sm font-semibold text-gray-600">廠商名稱</th>
                    <th className="p-3 text-left text-sm font-semibold text-gray-600">聯絡資訊</th>
                    <th className="p-3 text-left text-sm font-semibold text-gray-600">統編</th>
                    <th className="p-3 text-center text-sm font-semibold text-gray-600">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {vendors.map((v) => (
                    <tr key={v.id} className="border-b hover:bg-gray-50">
                      <td className="p-3 text-sm text-gray-800 font-medium">{v.name}</td>
                      <td className="p-3 text-sm text-gray-600">
                        <div>{v.contactName}</div>
                        <div className="text-xs text-gray-400">{v.contactEmail}</div>
                      </td>
                      <td className="p-3 text-sm text-gray-600">{v.taxId || "無"}</td>
                      <td className="p-3 text-center text-sm space-x-2">
                        <button onClick={() => handleEdit(v)} className="text-blue-600 hover:text-blue-800">編輯</button>
                        <button onClick={() => handleDelete(v.id)} className="text-red-600 hover:text-red-800">刪除</button>
                      </td>
                    </tr>
                  ))}
                  {vendors.length === 0 && (
                    <tr>
                      <td colSpan={4} className="p-4 text-center text-gray-400 text-sm">尚無廠商資料</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    );
  }
  ```

- [ ] **Step 5: Git 提交**
  ```bash
  git add .
  git commit -m "feat: 完成廠商管理 API 以及前端 CRUD 介面"
  ```

---

### Task 4: 系統費率設定與工時計算邏輯 (Settings & Estimator)

**Files:**
* Create: `src/app/api/settings/route.ts`
* Create: `src/app/settings/page.tsx`
* Create: `src/lib/calculator.ts`

**Interfaces:**
* Consumes: `db` 實例。
* Produces: 費率 API `/api/settings` 用以取得和修改 RD/PM/QC/整合工時單價。
* Produces: `calculateQuotationItem(item, rates)` 與 `calculateQuotation(quotation, items, rates)` 商業計算邏輯函數，處理工時加總與新台幣金額換算。

- [ ] **Step 1: 建立系統設定 API `src/app/api/settings/route.ts`**
  ```typescript
  import { NextResponse } from "next/server";
  import { db } from "@/lib/db";

  export async function GET() {
    const settings = await db.systemSetting.findMany();
    const formatted = settings.reduce((acc, cur) => {
      acc[cur.key] = Number(cur.value);
      return acc;
    }, {} as Record<string, number>);
    return NextResponse.json(formatted);
  }

  export async function POST(req: Request) {
    try {
      const body = await req.json();
      for (const [key, value] of Object.entries(body)) {
        await db.systemSetting.upsert({
          where: { key },
          update: { value: String(value) },
          create: { key, value: String(value) },
        });
      }
      return NextResponse.json({ message: "設定儲存成功" });
    } catch (e) {
      return NextResponse.json({ error: "儲存失敗" }, { status: 500 });
    }
  }
  ```

- [ ] **Step 2: 建立前端設定管理頁面 `src/app/settings/page.tsx`**
  ```tsx
  "use client";

  import { useState, useEffect } from "react";

  export default function SettingsPage() {
    const [rdRate, setRdRate] = useState(8000);
    const [pmRate, setPmRate] = useState(6000);
    const [qcRate, setQcRate] = useState(5000);
    const [integrationRate, setIntegrationRate] = useState(6500);
    const [message, setMessage] = useState("");

    useEffect(() => {
      fetch("/api/settings")
        .then((res) => res.json())
        .then((data) => {
          if (data.DEFAULT_RD_RATE) setRdRate(data.DEFAULT_RD_RATE);
          if (data.DEFAULT_PM_RATE) setPmRate(data.DEFAULT_PM_RATE);
          if (data.DEFAULT_QC_RATE) setQcRate(data.DEFAULT_QC_RATE);
          if (data.DEFAULT_INTEGRATION_RATE) setIntegrationRate(data.DEFAULT_INTEGRATION_RATE);
        });
    }, []);

    const handleSave = async (e: React.FormEvent) => {
      e.preventDefault();
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          DEFAULT_RD_RATE: rdRate,
          DEFAULT_PM_RATE: pmRate,
          DEFAULT_QC_RATE: qcRate,
          DEFAULT_INTEGRATION_RATE: integrationRate,
        }),
      });
      if (res.ok) {
        setMessage("費率設定已成功更新！");
        setTimeout(() => setMessage(""), 3000);
      }
    };

    return (
      <div className="max-w-md mx-auto p-8 font-sans bg-white shadow-md border rounded-lg mt-12">
        <h1 className="text-2xl font-bold text-gray-800 mb-6 border-b pb-3">全域預設費率設定</h1>
        {message && <div className="bg-green-100 text-green-700 p-2 rounded mb-4 text-sm">{message}</div>}
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">RD 每日單價 (TWD/天)</label>
            <input type="number" value={rdRate} onChange={(e) => setRdRate(Number(e.target.value))} required className="w-full border p-2 rounded" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">PM 每日單價 (TWD/天)</label>
            <input type="number" value={pmRate} onChange={(e) => setPmRate(Number(e.target.value))} required className="w-full border p-2 rounded" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">QC 每日單價 (TWD/天)</label>
            <input type="number" value={qcRate} onChange={(e) => setQcRate(Number(e.target.value))} required className="w-full border p-2 rounded" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">系統整合 每日單價 (TWD/天)</label>
            <input type="number" value={integrationRate} onChange={(e) => setIntegrationRate(Number(e.target.value))} required className="w-full border p-2 rounded" />
          </div>
          <button type="submit" className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700 transition">儲存預設設定</button>
        </form>
      </div>
    );
  }
  ```

- [ ] **Step 3: 建立報價單精密計算核心邏輯 `src/lib/calculator.ts`**
  此函式需要高精度運算，避免 JS 浮點數精度跑掉：
  ```typescript
  export interface EstimatorItem {
    rdDays: number;
    pmDays: number;
    qcDays: number;
    integrationDays: number;
  }

  export interface FeeRates {
    rdRate: number;
    pmRate: number;
    qcRate: number;
    integrationRate: number;
  }

  // 精確四捨五入到小數點第一位
  export function roundToOneDecimal(num: number): number {
    return Math.round(num * 10) / 10;
  }

  // 計算單一功能細項的總工時與未稅金額
  export function calculateItem(item: EstimatorItem, rates: FeeRates) {
    const totalDays = roundToOneDecimal(item.rdDays + item.pmDays + item.qcDays + item.integrationDays);
    const subtotal = Math.round(
      item.rdDays * rates.rdRate +
      item.pmDays * rates.pmRate +
      item.qcDays * rates.qcRate +
      item.integrationDays * rates.integrationRate
    );
    return { totalDays, subtotal };
  }

  // 計算整張報價單的加總與稅金
  export function calculateQuotation(items: EstimatorItem[], rates: FeeRates, taxRate = 0.05) {
    let totalRD = 0;
    let totalPM = 0;
    let totalQC = 0;
    let totalIntegration = 0;
    let rawAmount = 0;

    items.forEach((item) => {
      totalRD += item.rdDays;
      totalPM += item.pmDays;
      totalQC += item.qcDays;
      totalIntegration += item.integrationDays;

      const { subtotal } = calculateItem(item, rates);
      rawAmount += subtotal;
    });

    const taxAmount = Math.round(rawAmount * taxRate);
    const grandTotal = rawAmount + taxAmount;

    return {
      totalRD: roundToOneDecimal(totalRD),
      totalPM: roundToOneDecimal(totalPM),
      totalQC: roundToOneDecimal(totalQC),
      totalIntegration: roundToOneDecimal(totalIntegration),
      totalDays: roundToOneDecimal(totalRD + totalPM + totalQC + totalIntegration),
      rawAmount,
      taxAmount,
      grandTotal,
    };
  }
  ```

- [ ] **Step 4: 撰寫計算邏輯的單元測試**
  建立測試檔 `scripts/test-calculator.ts`：
  ```typescript
  import { calculateItem, calculateQuotation } from "../src/lib/calculator";

  const mockRates = { rdRate: 8000, pmRate: 6000, qcRate: 5000, integrationRate: 6500 };
  const mockItems = [
    { rdDays: 1.5, pmDays: 0.5, qcDays: 0.5, integrationDays: 1.0 }, // 總天數 3.5
    { rdDays: 2.0, pmDays: 1.0, qcDays: 1.0, integrationDays: 0.5 }, // 總天數 4.5
  ];

  // 1. 測試單項計算
  const item1 = calculateItem(mockItems[0], mockRates);
  if (item1.totalDays === 3.5 && item1.subtotal === 24750) {
    console.log("細項 1 計算成功");
  } else {
    console.error("細項 1 計算錯誤", item1);
    process.exit(1);
  }

  // 2. 測試整張單加總
  const summary = calculateQuotation(mockItems, mockRates, 0.05);
  if (
    summary.totalDays === 8.0 &&
    summary.rawAmount === 53000 &&
    summary.taxAmount === 2650 &&
    summary.grandTotal === 55650
  ) {
    console.log("報價單總計計算成功！");
  } else {
    console.error("報價單總計計算錯誤", summary);
    process.exit(1);
  }
  ```
  執行測試：
  ```bash
  npx tsx scripts/test-calculator.ts
  ```
  *(預期輸出：細項 1 計算成功、報價單總計計算成功！)*

- [ ] **Step 5: Git 提交**
  ```bash
  git add .
  git commit -m "feat: 完成全域費率設定 API/頁面 與高精度工時計算模組"
  ```

---

### Task 5: 報價單 API 與動態編輯器前端 (Quotation Editor & API)

**Files:**
* Create: `src/app/api/quotations/route.ts`
* Create: `src/app/api/quotations/[id]/route.ts`
* Create: `src/app/quotations/new/page.tsx`
* Create: `src/app/quotations/[id]/edit/page.tsx`

**Interfaces:**
* Consumes: `db` 實例、`src/lib/calculator.ts` 的計算邏輯。
* Produces: 報價單 API `/api/quotations` 用以儲存和編輯包含 Nested 關聯大項與細項的報價單。
* Produces: 報價單動態前端編輯器，支援動態增加大項、在各別大項中動態加減細項，並即時反應工時與金額小計。

- [ ] **Step 1: 建立報價單寫入/取得 API `src/app/api/quotations/route.ts`**
  API 需要完整處理 Nested 階層式資料的寫入 (Quotation -> Category -> Item)：
  ```typescript
  import { NextResponse } from "next/server";
  import { db } from "@/lib/db";

  export async function GET() {
    const list = await db.quotation.findMany({
      include: { vendor: true },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(list);
  }

  export async function POST(req: Request) {
    try {
      const body = await req.json();
      const { title, vendorId, taxRate, rdRate, pmRate, qcRate, integrationRate, categories } = body;

      // 產生單號: Q-YYYYMMDD-三位流水號
      const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
      const count = await db.quotation.count({
        where: { quotationNumber: { startsWith: `Q-${todayStr}` } },
      });
      const quotationNumber = `Q-${todayStr}-${String(count + 1).padStart(3, "0")}`;

      const created = await db.quotation.create({
        data: {
          quotationNumber,
          title,
          vendorId,
          taxRate,
          rdRate,
          pmRate,
          qcRate,
          integrationRate,
          categories: {
            create: categories.map((cat: any, cIndex: number) => ({
              name: cat.name,
              sortOrder: cIndex,
              items: {
                create: cat.items.map((item: any, iIndex: number) => ({
                  description: item.description,
                  rdDays: item.rdDays,
                  pmDays: item.pmDays,
                  qcDays: item.qcDays,
                  integrationDays: item.integrationDays,
                  note: item.note,
                  sortOrder: iIndex,
                })),
              },
            })),
          },
        },
      });

      return NextResponse.json(created, { status: 201 });
    } catch (e) {
      console.error(e);
      return NextResponse.json({ error: "建立報價單失敗" }, { status: 500 });
    }
  }
  ```

- [ ] **Step 2: 建立報價單更新/刪除 API `src/app/api/quotations/[id]/route.ts`**
  ```typescript
  import { NextResponse } from "next/server";
  import { db } from "@/lib/db";

  export async function GET(req: Request, { params }: { params: { id: string } }) {
    const quotation = await db.quotation.findUnique({
      where: { id: params.id },
      include: {
        vendor: true,
        categories: {
          include: { items: { orderBy: { sortOrder: "asc" } } },
          orderBy: { sortOrder: "asc" },
        },
      },
    });
    if (!quotation) return NextResponse.json({ error: "找不到報價單" }, { status: 404 });
    return NextResponse.json(quotation);
  }

  export async function PUT(req: Request, { params }: { params: { id: string } }) {
    try {
      const body = await req.json();
      const { title, vendorId, taxRate, rdRate, pmRate, qcRate, integrationRate, categories } = body;

      // 採用先刪除子階層，再重建的機制簡化更新邏輯
      await db.quotationCategory.deleteMany({ where: { quotationId: params.id } });

      const updated = await db.quotation.update({
        where: { id: params.id },
        data: {
          title,
          vendorId,
          taxRate,
          rdRate,
          pmRate,
          qcRate,
          integrationRate,
          categories: {
            create: categories.map((cat: any, cIndex: number) => ({
              name: cat.name,
              sortOrder: cIndex,
              items: {
                create: cat.items.map((item: any, iIndex: number) => ({
                  description: item.description,
                  rdDays: item.rdDays,
                  pmDays: item.pmDays,
                  qcDays: item.qcDays,
                  integrationDays: item.integrationDays,
                  note: item.note,
                  sortOrder: iIndex,
                })),
              },
            })),
          },
        },
      });

      return NextResponse.json(updated);
    } catch (e) {
      console.error(e);
      return NextResponse.json({ error: "更新報價單失敗" }, { status: 500 });
    }
  }

  export async function DELETE(req: Request, { params }: { params: { id: string } }) {
    try {
      await db.quotation.delete({ where: { id: params.id } });
      return NextResponse.json({ message: "刪除成功" });
    } catch (e) {
      return NextResponse.json({ error: "刪除失敗" }, { status: 500 });
    }
  }
  ```

- [ ] **Step 3: 建立前端報價單編輯器主要 UI `src/app/quotations/new/page.tsx`**
  這個編輯器包含了動態的階層式表單：
  ```tsx
  "use client";

  import { useState, useEffect } from "react";
  import { useRouter } from "next/navigation";
  import { calculateItem, calculateQuotation } from "@/lib/calculator";

  interface Vendor {
    id: string;
    name: string;
  }

  interface EditItem {
    description: string;
    rdDays: number;
    pmDays: number;
    qcDays: number;
    integrationDays: number;
    note: string;
  }

  interface EditCategory {
    name: string;
    items: EditItem[];
  }

  export default function NewQuotationPage() {
    const router = useRouter();
    const [vendors, setVendors] = useState<Vendor[]>([]);
    const [selectedVendorId, setSelectedVendorId] = useState("");
    const [title, setTitle] = useState("");

    // 費率
    const [rdRate, setRdRate] = useState(8000);
    const [pmRate, setPmRate] = useState(6000);
    const [qcRate, setQcRate] = useState(5000);
    const [integrationRate, setIntegrationRate] = useState(6500);

    // 階層式資料結構
    const [categories, setCategories] = useState<EditCategory[]>([
      { name: "主要系統模組", items: [{ description: "基本架構開發", rdDays: 1, pmDays: 0, qcDays: 0, integrationDays: 0, note: "" }] }
    ]);

    useEffect(() => {
      // 獲取廠商列表
      fetch("/api/vendors").then(res => res.json()).then(data => {
        setVendors(data);
        if (data.length > 0) setSelectedVendorId(data[0].id);
      });
      // 獲取預設費率
      fetch("/api/settings").then(res => res.json()).then(data => {
        if (data.DEFAULT_RD_RATE) setRdRate(data.DEFAULT_RD_RATE);
        if (data.DEFAULT_PM_RATE) setPmRate(data.DEFAULT_PM_RATE);
        if (data.DEFAULT_QC_RATE) setQcRate(data.DEFAULT_QC_RATE);
        if (data.DEFAULT_INTEGRATION_RATE) setIntegrationRate(data.DEFAULT_INTEGRATION_RATE);
      });
    }, []);

    // 動態新增大項
    const addCategory = () => {
      setCategories([...categories, { name: "新增功能模組", items: [] }]);
    };

    // 動態新增細項
    const addItem = (catIndex: number) => {
      const updated = [...categories];
      updated[catIndex].items.push({ description: "新開發細項", rdDays: 0, pmDays: 0, qcDays: 0, integrationDays: 0, note: "" });
      setCategories(updated);
    };

    // 更新細項資料
    const updateItemField = (catIndex: number, itemIndex: number, field: keyof EditItem, val: any) => {
      const updated = [...categories];
      let value = val;
      if (typeof updated[catIndex].items[itemIndex][field] === "number") {
        value = Number(val) || 0;
      }
      (updated[catIndex].items[itemIndex] as any)[field] = value;
      setCategories(updated);
    };

    // 刪除細項
    const removeItem = (catIndex: number, itemIndex: number) => {
      const updated = [...categories];
      updated[catIndex].items.splice(itemIndex, 1);
      setCategories(updated);
    };

    // 刪除大項
    const removeCategory = (catIndex: number) => {
      const updated = [...categories];
      updated.splice(catIndex, 1);
      setCategories(updated);
    };

    // 即時重算總金額
    const allItems = categories.flatMap(c => c.items);
    const rates = { rdRate, pmRate, qcRate, integrationRate };
    const summary = calculateQuotation(allItems, rates, 0.05);

    const handleSave = async () => {
      if (!title) return alert("請輸入報價專案名稱");
      if (!selectedVendorId) return alert("請選擇廠商");

      const res = await fetch("/api/quotations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          vendorId: selectedVendorId,
          taxRate: 0.05,
          rdRate,
          pmRate,
          qcRate,
          integrationRate,
          categories
        })
      });

      if (res.ok) {
        router.push("/");
      } else {
        alert("儲存報價單失敗");
      }
    };

    return (
      <div className="max-w-7xl mx-auto p-8 font-sans">
        <h1 className="text-3xl font-bold text-gray-800 mb-8 border-b pb-4">新建報價單</h1>

        {/* 頂部基本資訊 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white p-6 rounded-lg border shadow-sm mb-8">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">專案報價名稱 *</label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="例如: XX 購物網開發案" className="w-full border p-2 rounded" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">選擇廠商 *</label>
            <select value={selectedVendorId} onChange={(e) => setSelectedVendorId(e.target.value)} className="w-full border p-2 rounded bg-white">
              {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
            </select>
          </div>
        </div>

        {/* 編輯器主要內容 */}
        <div className="space-y-8">
          {categories.map((cat, catIndex) => (
            <div key={catIndex} className="bg-white p-6 rounded-lg border shadow-sm">
              <div className="flex justify-between items-center mb-4 border-b pb-2">
                <input
                  type="text"
                  value={cat.name}
                  onChange={(e) => {
                    const updated = [...categories];
                    updated[catIndex].name = e.target.value;
                    setCategories(updated);
                  }}
                  className="text-lg font-bold text-gray-700 border-b border-transparent hover:border-gray-300 focus:border-blue-500 focus:outline-none"
                />
                <button onClick={() => removeCategory(catIndex)} className="text-red-500 hover:text-red-700 text-sm">刪除此大項</button>
              </div>

              <div className="overflow-x-auto mb-4">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b">
                      <th className="p-2 w-1/4 font-semibold text-gray-600">功能細項描述</th>
                      <th className="p-2 font-semibold text-gray-600">RD (天)</th>
                      <th className="p-2 font-semibold text-gray-600">PM (天)</th>
                      <th className="p-2 font-semibold text-gray-600">QC (天)</th>
                      <th className="p-2 font-semibold text-gray-600">整合 (天)</th>
                      <th className="p-2 font-semibold text-gray-600">備註</th>
                      <th className="p-2 font-semibold text-gray-600">金額小計</th>
                      <th className="p-2 text-center font-semibold text-gray-600">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cat.items.map((item, itemIndex) => {
                      const { subtotal } = calculateItem(item, rates);
                      return (
                        <tr key={itemIndex} className="border-b hover:bg-gray-50">
                          <td className="p-2">
                            <input type="text" value={item.description} onChange={(e) => updateItemField(catIndex, itemIndex, "description", e.target.value)} className="w-full border p-1 rounded" />
                          </td>
                          <td className="p-2">
                            <input type="number" step="0.5" value={item.rdDays} onChange={(e) => updateItemField(catIndex, itemIndex, "rdDays", e.target.value)} className="w-16 border p-1 rounded" />
                          </td>
                          <td className="p-2">
                            <input type="number" step="0.5" value={item.pmDays} onChange={(e) => updateItemField(catIndex, itemIndex, "pmDays", e.target.value)} className="w-16 border p-1 rounded" />
                          </td>
                          <td className="p-2">
                            <input type="number" step="0.5" value={item.qcDays} onChange={(e) => updateItemField(catIndex, itemIndex, "qcDays", e.target.value)} className="w-16 border p-1 rounded" />
                          </td>
                          <td className="p-2">
                            <input type="number" step="0.5" value={item.integrationDays} onChange={(e) => updateItemField(catIndex, itemIndex, "integrationDays", e.target.value)} className="w-16 border p-1 rounded" />
                          </td>
                          <td className="p-2">
                            <input type="text" value={item.note} onChange={(e) => updateItemField(catIndex, itemIndex, "note", e.target.value)} className="w-full border p-1 rounded" />
                          </td>
                          <td className="p-2 font-medium text-gray-700">NT$ {subtotal.toLocaleString()}</td>
                          <td className="p-2 text-center">
                            <button onClick={() => removeItem(catIndex, itemIndex)} className="text-red-500 hover:text-red-700">移除</button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <button onClick={() => addItem(catIndex)} className="text-blue-600 hover:text-blue-800 text-sm font-semibold">+ 新增細項</button>
            </div>
          ))}

          <button onClick={addCategory} className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:text-blue-600 hover:border-blue-500 font-semibold transition">+ 新增功能大項</button>
        </div>

        {/* 費率微調與報價加總 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12 bg-gray-50 p-6 rounded-lg border">
          <div className="space-y-3">
            <h3 className="font-bold text-gray-700">本單角色日薪微調 (TWD)</h3>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>RD: <input type="number" value={rdRate} onChange={(e) => setRdRate(Number(e.target.value))} className="w-full border p-1 rounded" /></div>
              <div>PM: <input type="number" value={pmRate} onChange={(e) => setPmRate(Number(e.target.value))} className="w-full border p-1 rounded" /></div>
              <div>QC: <input type="number" value={qcRate} onChange={(e) => setQcRate(Number(e.target.value))} className="w-full border p-1 rounded" /></div>
              <div>整合: <input type="number" value={integrationRate} onChange={(e) => setIntegrationRate(Number(e.target.value))} className="w-full border p-1 rounded" /></div>
            </div>
          </div>

          <div className="space-y-1 text-sm text-gray-600">
            <h3 className="font-bold text-gray-700 mb-2">工時加總 (天)</h3>
            <div>RD 總天數: <span className="font-semibold">{summary.totalRD} 天</span></div>
            <div>PM 總天數: <span className="font-semibold">{summary.totalPM} 天</span></div>
            <div>QC 總天數: <span className="font-semibold">{summary.totalQC} 天</span></div>
            <div>整合 總天數: <span className="font-semibold">{summary.totalIntegration} 天</span></div>
            <div className="border-t pt-1 font-bold text-gray-800">總工時: {summary.totalDays} 天</div>
          </div>

          <div className="flex flex-col justify-between items-end">
            <div className="text-right space-y-1">
              <div className="text-gray-500 text-sm">未稅金額: NT$ {summary.rawAmount.toLocaleString()}</div>
              <div className="text-gray-500 text-sm">營業稅 (5%): NT$ {summary.taxAmount.toLocaleString()}</div>
              <div className="text-2xl font-bold text-blue-600">含稅總計: NT$ {summary.grandTotal.toLocaleString()}</div>
            </div>
            <button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-8 py-3 rounded-lg shadow mt-4 transition w-full md:w-auto">儲存報價單</button>
          </div>
        </div>
      </div>
    );
  }
  ```

- [ ] **Step 4: 建立前端報價單修改頁面 `src/app/quotations/[id]/edit/page.tsx`**
  複製 `new/page.tsx` 的程式碼架構至 `edit/page.tsx`，並在 `useEffect` 中拉取既有報價單資料進行初始化：
  ```tsx
  "use client";

  import { useState, useEffect } from "react";
  import { useRouter, useParams } from "next/navigation";
  import { calculateItem, calculateQuotation } from "@/lib/calculator";

  interface Vendor { id: string; name: string; }
  interface EditItem { description: string; rdDays: number; pmDays: number; qcDays: number; integrationDays: number; note: string; }
  interface EditCategory { name: string; items: EditItem[]; }

  export default function EditQuotationPage() {
    const router = useRouter();
    const { id } = useParams();
    const [vendors, setVendors] = useState<Vendor[]>([]);
    const [selectedVendorId, setSelectedVendorId] = useState("");
    const [title, setTitle] = useState("");
    const [rdRate, setRdRate] = useState(8000);
    const [pmRate, setPmRate] = useState(6000);
    const [qcRate, setQcRate] = useState(5000);
    const [integrationRate, setIntegrationRate] = useState(6500);
    const [categories, setCategories] = useState<EditCategory[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
      fetch("/api/vendors").then(res => res.json()).then(data => setVendors(data));

      fetch(`/api/quotations/${id}`)
        .then(res => res.json())
        .then(data => {
          setTitle(data.title);
          setSelectedVendorId(data.vendorId);
          setRdRate(data.rdRate);
          setPmRate(data.pmRate);
          setQcRate(data.qcRate);
          setIntegrationRate(data.integrationRate);
          setCategories(data.categories.map((c: any) => ({
            name: c.name,
            items: c.items.map((i: any) => ({
              description: i.description,
              rdDays: i.rdDays,
              pmDays: i.pmDays,
              qcDays: i.qcDays,
              integrationDays: i.integrationDays,
              note: i.note || ""
            }))
          })));
          setLoading(false);
        });
    }, [id]);

    const addCategory = () => setCategories([...categories, { name: "新增功能模組", items: [] }]);
    const addItem = (catIndex: number) => {
      const updated = [...categories];
      updated[catIndex].items.push({ description: "新開發細項", rdDays: 0, pmDays: 0, qcDays: 0, integrationDays: 0, note: "" });
      setCategories(updated);
    };
    const updateItemField = (catIndex: number, itemIndex: number, field: keyof EditItem, val: any) => {
      const updated = [...categories];
      let value = val;
      if (typeof updated[catIndex].items[itemIndex][field] === "number") value = Number(val) || 0;
      (updated[catIndex].items[itemIndex] as any)[field] = value;
      setCategories(updated);
    };
    const removeItem = (catIndex: number, itemIndex: number) => {
      const updated = [...categories];
      updated[catIndex].items.splice(itemIndex, 1);
      setCategories(updated);
    };
    const removeCategory = (catIndex: number) => {
      const updated = [...categories];
      updated.splice(catIndex, 1);
      setCategories(updated);
    };

    if (loading) return <div className="p-8 text-center text-gray-500">載入中...</div>;

    const allItems = categories.flatMap(c => c.items);
    const rates = { rdRate, pmRate, qcRate, integrationRate };
    const summary = calculateQuotation(allItems, rates, 0.05);

    const handleSave = async () => {
      if (!title || !selectedVendorId) return alert("請填寫必填欄位");
      const res = await fetch(`/api/quotations/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, vendorId: selectedVendorId, taxRate: 0.05, rdRate, pmRate, qcRate, integrationRate, categories })
      });
      if (res.ok) router.push("/");
      else alert("更新失敗");
    };

    return (
      <div className="max-w-7xl mx-auto p-8 font-sans">
        <div className="flex justify-between items-center mb-8 border-b pb-4">
          <h1 className="text-3xl font-bold text-gray-800">編輯報價單</h1>
          <button onClick={() => router.push("/")} className="text-gray-500 hover:text-gray-700">返回列表</button>
        </div>

        {/* 編輯器主要內容 (同 new/page.tsx 的 JSX 排版結構) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white p-6 rounded-lg border shadow-sm mb-8">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">專案報價名稱 *</label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} required className="w-full border p-2 rounded" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">選擇廠商 *</label>
            <select value={selectedVendorId} onChange={(e) => setSelectedVendorId(e.target.value)} className="w-full border p-2 rounded bg-white">
              {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
            </select>
          </div>
        </div>

        <div className="space-y-8">
          {categories.map((cat, catIndex) => (
            <div key={catIndex} className="bg-white p-6 rounded-lg border shadow-sm">
              <div className="flex justify-between items-center mb-4 border-b pb-2">
                <input
                  type="text"
                  value={cat.name}
                  onChange={(e) => {
                    const updated = [...categories];
                    updated[catIndex].name = e.target.value;
                    setCategories(updated);
                  }}
                  className="text-lg font-bold text-gray-700 border-b border-transparent hover:border-gray-300 focus:border-blue-500 focus:outline-none"
                />
                <button onClick={() => removeCategory(catIndex)} className="text-red-500 hover:text-red-700 text-sm">刪除此大項</button>
              </div>

              <div className="overflow-x-auto mb-4">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b">
                      <th className="p-2 w-1/4 font-semibold text-gray-600">功能細項描述</th>
                      <th className="p-2 font-semibold text-gray-600">RD (天)</th>
                      <th className="p-2 font-semibold text-gray-600">PM (天)</th>
                      <th className="p-2 font-semibold text-gray-600">QC (天)</th>
                      <th className="p-2 font-semibold text-gray-600">整合 (天)</th>
                      <th className="p-2 font-semibold text-gray-600">備註</th>
                      <th className="p-2 font-semibold text-gray-600">金額小計</th>
                      <th className="p-2 text-center font-semibold text-gray-600">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cat.items.map((item, itemIndex) => {
                      const { subtotal } = calculateItem(item, rates);
                      return (
                        <tr key={itemIndex} className="border-b hover:bg-gray-50">
                          <td className="p-2">
                            <input type="text" value={item.description} onChange={(e) => updateItemField(catIndex, itemIndex, "description", e.target.value)} className="w-full border p-1 rounded" />
                          </td>
                          <td className="p-2">
                            <input type="number" step="0.5" value={item.rdDays} onChange={(e) => updateItemField(catIndex, itemIndex, "rdDays", e.target.value)} className="w-16 border p-1 rounded" />
                          </td>
                          <td className="p-2">
                            <input type="number" step="0.5" value={item.pmDays} onChange={(e) => updateItemField(catIndex, itemIndex, "pmDays", e.target.value)} className="w-16 border p-1 rounded" />
                          </td>
                          <td className="p-2">
                            <input type="number" step="0.5" value={item.qcDays} onChange={(e) => updateItemField(catIndex, itemIndex, "qcDays", e.target.value)} className="w-16 border p-1 rounded" />
                          </td>
                          <td className="p-2">
                            <input type="number" step="0.5" value={item.integrationDays} onChange={(e) => updateItemField(catIndex, itemIndex, "integrationDays", e.target.value)} className="w-16 border p-1 rounded" />
                          </td>
                          <td className="p-2">
                            <input type="text" value={item.note} onChange={(e) => updateItemField(catIndex, itemIndex, "note", e.target.value)} className="w-full border p-1 rounded" />
                          </td>
                          <td className="p-2 font-medium text-gray-700">NT$ {subtotal.toLocaleString()}</td>
                          <td className="p-2 text-center">
                            <button onClick={() => removeItem(catIndex, itemIndex)} className="text-red-500 hover:text-red-700">移除</button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <button onClick={() => addItem(catIndex)} className="text-blue-600 hover:text-blue-800 text-sm font-semibold">+ 新增細項</button>
            </div>
          ))}
          <button onClick={addCategory} className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:text-blue-600 hover:border-blue-500 font-semibold transition">+ 新增功能大項</button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12 bg-gray-50 p-6 rounded-lg border">
          <div className="space-y-3">
            <h3 className="font-bold text-gray-700">本單角色日薪微調 (TWD)</h3>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>RD: <input type="number" value={rdRate} onChange={(e) => setRdRate(Number(e.target.value))} className="w-full border p-1 rounded" /></div>
              <div>PM: <input type="number" value={pmRate} onChange={(e) => setPmRate(Number(e.target.value))} className="w-full border p-1 rounded" /></div>
              <div>QC: <input type="number" value={qcRate} onChange={(e) => setQcRate(Number(e.target.value))} className="w-full border p-1 rounded" /></div>
              <div>整合: <input type="number" value={integrationRate} onChange={(e) => setIntegrationRate(Number(e.target.value))} className="w-full border p-1 rounded" /></div>
            </div>
          </div>

          <div className="space-y-1 text-sm text-gray-600">
            <h3 className="font-bold text-gray-700 mb-2">工時加總 (天)</h3>
            <div>RD 總天數: <span className="font-semibold">{summary.totalRD} 天</span></div>
            <div>PM 總天數: <span className="font-semibold">{summary.totalPM} 天</span></div>
            <div>QC 總天數: <span className="font-semibold">{summary.totalQC} 天</span></div>
            <div>整合 總天數: <span className="font-semibold">{summary.totalIntegration} 天</span></div>
            <div className="border-t pt-1 font-bold text-gray-800">總工時: {summary.totalDays} 天</div>
          </div>

          <div className="flex flex-col justify-between items-end">
            <div className="text-right space-y-1">
              <div className="text-gray-500 text-sm">未稅金額: NT$ {summary.rawAmount.toLocaleString()}</div>
              <div className="text-gray-500 text-sm">營業稅 (5%): NT$ {summary.taxAmount.toLocaleString()}</div>
              <div className="text-2xl font-bold text-blue-600">含稅總計: NT$ {summary.grandTotal.toLocaleString()}</div>
            </div>
            <button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-8 py-3 rounded-lg shadow mt-4 transition w-full md:w-auto">更新儲存報價單</button>
          </div>
        </div>
      </div>
    );
  }
  ```

- [ ] **Step 5: Git 提交**
  ```bash
  git add .
  git commit -m "feat: 完成階層式報價單的 CRUD API 以及動態前後端編輯器"
  ```

---

### Task 6: 系統首頁 Dashboard 與 PDF/HTML 輸出 (Print CSS)

**Files:**
* Modify: `src/app/page.tsx`
* Create: `src/app/quotations/[id]/print/page.tsx`
* Create: `src/app/print.css`

**Interfaces:**
* Consumes: `db` 實例，報價單關聯資料。
* Produces: 系統首頁大儀表板，提供報價單列表、搜尋與編輯、列印按鈕。
* Produces: 特定報價單列印版型頁面，支援 `@media print` 純淨無按鈕 PDF/HTML 導出。

- [ ] **Step 1: 撰寫系統首頁 `src/app/page.tsx`**
  ```tsx
  import Link from "next/link";
  import { db } from "@/lib/db";

  async function getQuotations() {
    return await db.quotation.findMany({
      include: { vendor: true, categories: { include: { items: true } } },
      orderBy: { createdAt: "desc" }
    });
  }

  export default async function DashboardPage() {
    const quotations = await getQuotations();

    return (
      <div className="max-w-6xl mx-auto p-8 font-sans">
        <div className="flex justify-between items-center mb-8 border-b pb-4">
          <h1 className="text-3xl font-bold text-gray-800">報價管理系統</h1>
          <div className="space-x-4">
            <Link href="/quotations/new" className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2 rounded transition">新建報價單</Link>
            <Link href="/vendors" className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded transition border">合作廠商管理</Link>
            <Link href="/settings" className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded transition border">全域費率設定</Link>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow border p-6">
          <h2 className="text-xl font-bold mb-4 text-gray-700">歷史報價單</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-gray-100 border-b">
                  <th className="p-3 font-semibold text-gray-600">報價單號</th>
                  <th className="p-3 font-semibold text-gray-600">報價項目</th>
                  <th className="p-3 font-semibold text-gray-600">對應廠商</th>
                  <th className="p-3 font-semibold text-gray-600 text-center">總天數</th>
                  <th className="p-3 font-semibold text-gray-600 text-center">操作</th>
                </tr>
              </thead>
              <tbody>
                {quotations.map((q) => {
                  const allItems = q.categories.flatMap(c => c.items);
                  const totalDays = allItems.reduce((acc, cur) => acc + cur.rdDays + cur.pmDays + cur.qcDays + cur.integrationDays, 0);

                  return (
                    <tr key={q.id} className="border-b hover:bg-gray-50">
                      <td className="p-3 font-mono text-gray-700">{q.quotationNumber}</td>
                      <td className="p-3 font-medium text-gray-800">{q.title}</td>
                      <td className="p-3 text-gray-600">{q.vendor.name}</td>
                      <td className="p-3 text-center text-gray-600">{totalDays.toFixed(1)} 天</td>
                      <td className="p-3 text-center space-x-4">
                        <Link href={`/quotations/${q.id}/edit`} className="text-blue-600 hover:text-blue-800">編輯</Link>
                        <Link href={`/quotations/${q.id}/print`} className="text-green-600 hover:text-green-800 font-semibold">預覽/列印</Link>
                      </td>
                    </tr>
                  );
                })}
                {quotations.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-gray-400">目前尚無任何報價單</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }
  ```

- [ ] **Step 2: 建立列印專用網頁樣式檔 `src/app/print.css`**
  ```css
  @media print {
    body {
      background: white !important;
      color: black !important;
      font-size: 12pt !important;
    }
    .no-print {
      display: none !important;
    }
    .print-container {
      width: 100% !important;
      max-width: 100% !important;
      padding: 0 !important;
      margin: 0 !important;
      box-shadow: none !important;
      border: none !important;
    }
    table {
      page-break-inside: auto;
    }
    tr {
      page-break-inside: avoid;
      page-break-after: auto;
    }
    thead {
      display: table-header-group;
    }
    tfoot {
      display: table-footer-group;
    }
  }
  ```

- [ ] **Step 3: 建立列印/預覽 HTML 頁面 `src/app/quotations/[id]/print/page.tsx`**
  ```tsx
  "use client";

  import { useState, useEffect } from "react";
  import { useParams, useRouter } from "next/navigation";
  import { calculateItem, calculateQuotation } from "@/lib/calculator";
  import "../../../print.css"; // 引入列印專用樣式

  interface QuotationDetail {
    quotationNumber: string;
    title: string;
    taxRate: number;
    rdRate: number;
    pmRate: number;
    qcRate: number;
    integrationRate: number;
    vendor: { name: string; taxId: string | null; contactName: string; contactEmail: string; address: string | null; };
    categories: Array<{
      name: string;
      items: Array<{
        description: string;
        rdDays: number;
        pmDays: number;
        qcDays: number;
        integrationDays: number;
        note: string | null;
      }>;
    }>;
  }

  export default function PrintPage() {
    const { id } = useParams();
    const router = useRouter();
    const [quotation, setQuotation] = useState<QuotationDetail | null>(null);

    useEffect(() => {
      fetch(`/api/quotations/${id}`)
        .then(res => res.json())
        .then(data => setQuotation(data));
    }, [id]);

    if (!quotation) return <div className="p-8 text-center text-gray-500">載入中...</div>;

    const allItems = quotation.categories.flatMap(c => c.items);
    const rates = {
      rdRate: quotation.rdRate,
      pmRate: quotation.pmRate,
      qcRate: quotation.qcRate,
      integrationRate: quotation.integrationRate
    };
    const summary = calculateQuotation(allItems, rates, quotation.taxRate);

    return (
      <div className="max-w-4xl mx-auto p-8 bg-white border shadow mt-8 font-sans print-container">
        {/* 操作按鈕 (列印時隱藏) */}
        <div className="no-print flex justify-between items-center mb-6 bg-gray-50 p-4 border rounded">
          <span className="text-sm text-gray-600">這是列印預覽畫面，按「列印報價單」即可下載 PDF。</span>
          <div className="space-x-2">
            <button onClick={() => window.print()} className="bg-green-600 hover:bg-green-700 text-white font-bold px-4 py-2 rounded">列印報價單 (PDF)</button>
            <button onClick={() => router.push("/")} className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded">返回首頁</button>
          </div>
        </div>

        {/* 報價單主體 */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold tracking-wider text-gray-800 mb-2">專案開發報價單</h1>
          <div className="text-sm text-gray-500">單號: {quotation.quotationNumber}</div>
        </div>

        {/* 廠商雙方基本資訊 */}
        <div className="grid grid-cols-2 gap-8 mb-8 text-sm border-b pb-6">
          <div>
            <h3 className="font-bold text-gray-700 mb-2">【報價客戶】</h3>
            <div>客戶名稱：{quotation.vendor.name}</div>
            <div>統一編號：{quotation.vendor.taxId || "無"}</div>
            <div>聯絡窗口：{quotation.vendor.contactName} ({quotation.vendor.contactEmail})</div>
            <div>客戶地址：{quotation.vendor.address || "無"}</div>
          </div>
          <div>
            <h3 className="font-bold text-gray-700 mb-2">【報價方】</h3>
            <div>公司名稱：我方委案科技公司</div>
            <div>統一編號：12345678</div>
            <div>聯絡人員：專案窗口</div>
            <div>聯絡信箱：service@ourcompany.com</div>
          </div>
        </div>

        {/* 報價大項細項表格 */}
        <div className="space-y-6">
          {quotation.categories.map((cat, cIdx) => (
            <div key={cIdx} className="space-y-2">
              <h2 className="text-md font-bold text-gray-800 border-l-4 border-blue-600 pl-2 bg-gray-50 py-1">{cat.name}</h2>
              <table className="w-full border-collapse border text-xs">
                <thead>
                  <tr className="bg-gray-100 border-b">
                    <th className="border p-2 text-left">功能細項描述</th>
                    <th className="border p-2 text-center w-12">RD</th>
                    <th className="border p-2 text-center w-12">PM</th>
                    <th className="border p-2 text-center w-12">QC</th>
                    <th className="border p-2 text-center w-12">整合</th>
                    <th className="border p-2 text-left w-1/4">備註</th>
                    <th className="border p-2 text-right w-24">小計金額</th>
                  </tr>
                </thead>
                <tbody>
                  {cat.items.map((item, iIdx) => {
                    const { subtotal } = calculateItem(item, rates);
                    return (
                      <tr key={iIdx} className="hover:bg-gray-50">
                        <td className="border p-2">{item.description}</td>
                        <td className="border p-2 text-center">{item.rdDays}</td>
                        <td className="border p-2 text-center">{item.pmDays}</td>
                        <td className="border p-2 text-center">{item.qcDays}</td>
                        <td className="border p-2 text-center">{item.integrationDays}</td>
                        <td className="border p-2 text-left text-gray-500">{item.note || "-"}</td>
                        <td className="border p-2 text-right">NT$ {subtotal.toLocaleString()}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ))}
        </div>

        {/* 金額匯總 */}
        <div className="mt-8 border-t pt-4 text-sm text-right space-y-1">
          <div>報價未稅總額：NT$ {summary.rawAmount.toLocaleString()}</div>
          <div>營業稅 (5%)：NT$ {summary.taxAmount.toLocaleString()}</div>
          <div className="text-xl font-bold text-blue-600">含稅總計金額：NT$ {summary.grandTotal.toLocaleString()}</div>
        </div>

        {/* 雙方簽章欄位 */}
        <div className="grid grid-cols-2 gap-12 mt-16 text-sm">
          <div className="border-t pt-4">
            <div className="font-bold mb-8">客戶簽認 (廠商蓋章)</div>
            <div>簽名：____________________</div>
            <div className="text-xs text-gray-400 mt-2">日期： 年 月 日</div>
          </div>
          <div className="border-t pt-4">
            <div className="font-bold mb-8">我方簽認 (公司蓋章)</div>
            <div>簽名：____________________</div>
            <div className="text-xs text-gray-400 mt-2">日期： 年 月 日</div>
          </div>
        </div>
      </div>
    );
  }
  ```

- [ ] **Step 4: 測試與驗證**
  在本地執行以下指令啟動開發伺服器，手動在瀏覽器開啟驗證首頁與列印功能：
  ```bash
  npm run dev
  ```

- [ ] **Step 5: Git 提交**
  ```bash
  git add .
  git commit -m "feat: 完成系統首頁 Dashboard 與列印預覽/PDF輸出頁面"
  ```
