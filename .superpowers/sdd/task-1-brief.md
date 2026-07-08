# Task 1: Scaffolding & Prisma Setup Brief

## Goal
初始化 Next.js 14+ 專案，設定 Prisma ORM，並建立本地 Docker PostgreSQL 資料庫環境。

## Files to touch
* Create: `package.json`
* Create: `prisma/schema.prisma`
* Create: `src/lib/db.ts`
* Create: `.env` / `.env.example`
* Create: `docker-compose.yml`

## Global Constraints
* 所有前端顯示介面、錯誤訊息與程式碼註解必須使用**繁體中文 (Traditional Chinese)**。
* 資料庫必須使用 Prisma ORM 搭配 PostgreSQL。

## Steps
1. 檢視 Next.js 初始化幫助資訊以符合規範：
   `npx create-next-app@latest --help`
2. 初始化 Next.js 專案於當前目錄 `./`：
   `npx -y create-next-app@latest ./ --ts --tailwind --eslint --app --src-dir --import-alias "@/*"`
3. 安裝 Prisma 依賴套件：
   `npm install @prisma/client`
   `npm install prisma --save-dev`
4. 建立 `docker-compose.yml` 運行本地 PostgreSQL：
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
5. 啟動本地 PostgreSQL 容器：
   `docker compose up -d`
6. 配置環境變數檔 `.env` 與 `.env.example`，加入連線字串：
   `DATABASE_URL="postgresql://postgres:mysecretpassword@localhost:5432/quotation_db?schema=public"`
7. 建立 `prisma/schema.prisma`，寫入在設計文件中定義的 Models (Vendor, Quotation, QuotationCategory, QuotationItem, SystemSetting)。
8. 執行資料庫 Migration：
   `npx prisma migrate dev --name init`
9. 建立資料庫連線實例 `src/lib/db.ts`：
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
10. 建立一個簡單的測試指令檔 `scripts/test-connection.ts` 驗證連線，並運行它：
    `npx tsx scripts/test-connection.ts`
11. 提交至 Git。
