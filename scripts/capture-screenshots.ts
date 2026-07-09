import { chromium } from "playwright";
import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";

const prisma = new PrismaClient();

async function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const outputDir = path.join(__dirname, "../public/screenshots");
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  console.log("正在啟動 Playwright Chromium 瀏覽器...");
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
  });
  const page = await context.newPage();

  console.log("正在等待 Next.js 開發伺服器啟動...");
  // 嘗試連線 localhost:3000，最多嘗試 10 次
  let connected = false;
  for (let i = 0; i < 15; i++) {
    try {
      await page.goto("http://localhost:3000");
      connected = true;
      break;
    } catch (e) {
      console.log(`伺服器尚未就緒，等待 2 秒... (${i + 1}/15)`);
      await delay(2000);
    }
  }

  if (!connected) {
    console.error("無法連線至 http://localhost:3000。請確認 npm run dev 正在背景執行。");
    await browser.close();
    process.exit(1);
  }

  console.log("連線成功！開始截圖流程...");

  // 0. 截圖登入頁，然後登入（後續頁面都需要登入才能存取）
  console.log("正在截圖登入頁...");
  await page.goto("http://localhost:3000/login");
  await delay(500);
  await page.screenshot({ path: path.join(outputDir, "login.png") });

  console.log("正在登入系統...");
  await page.fill('input[type="email"]', process.env.ADMIN_INITIAL_EMAIL || "admin@example.com");
  await page.fill('input[type="password"]', process.env.ADMIN_INITIAL_PASSWORD || "");
  await page.click('button[type="submit"]');
  await page.waitForURL("http://localhost:3000/", { timeout: 15000 });
  await delay(500);

  // 1. 截圖首頁 Dashboard
  console.log("正在截圖首頁...");
  await page.goto("http://localhost:3000");
  await delay(1000); // 等待資料載入與 React 渲染
  await page.screenshot({ path: path.join(outputDir, "dashboard.png") });

  // 2. 截圖廠商管理頁面
  console.log("正在截圖廠商管理頁面...");
  await page.goto("http://localhost:3000/vendors");
  await delay(1000);
  await page.screenshot({ path: path.join(outputDir, "vendors.png") });

  // 3. 截圖報價範本管理頁面
  console.log("正在截圖報價範本管理頁面...");
  await page.goto("http://localhost:3000/templates");
  await delay(1000);
  await page.screenshot({ path: path.join(outputDir, "templates.png") });

  // 4. 截圖建立報價單頁面
  console.log("正在截圖建立報價單頁面...");
  await page.goto("http://localhost:3000/quotations/new");
  await delay(1500);
  await page.screenshot({ path: path.join(outputDir, "new_quotation.png") });

  // 5. 確保資料庫有一筆報價單，用以截圖列印預覽頁面
  console.log("確認資料庫中是否存在報價單...");
  let quotation = await prisma.quotation.findFirst({
    orderBy: { createdAt: "desc" },
  });

  if (!quotation) {
    console.log("資料庫中無報價單，正在自動建立一筆測試報價單進行預覽...");
    const demoVendor = await prisma.vendor.findFirst();
    if (!demoVendor) {
      console.error("無任何廠商，無法建立報價單！");
      await browser.close();
      process.exit(1);
    }

    quotation = await prisma.quotation.create({
      data: {
        quotationNumber: "Q-20260709-TEST",
        title: "測試自動化截圖專案開發案",
        vendorId: demoVendor.id,
        vendorName: demoVendor.name,
        vendorTaxId: demoVendor.taxId,
        vendorContactName: demoVendor.contactName,
        vendorContactEmail: demoVendor.contactEmail,
        vendorContactPhone: demoVendor.contactPhone,
        vendorAddress: demoVendor.address,
        roles: [
          { key: "rd", label: "RD", rate: 8000 },
          { key: "pm", label: "PM", rate: 6000 },
          { key: "qc", label: "QC", rate: 5000 },
          { key: "integration", label: "整合", rate: 6500 },
        ],
        paymentTerms: "驗收完成後 30 日內電匯付款",
        notes: "本報價單有效期限內有效，逾期需重新報價。",
        categories: {
          create: [
            {
              name: "會員與權限系統",
              sortOrder: 0,
              items: {
                create: [
                  { description: "Facebook/LINE 登入與資料綁定", days: { rd: 1.5, pm: 0.5, qc: 0.5, integration: 0.5 }, note: "高優先" },
                  { description: "後台權限控制角色設定 (RBAC)", days: { rd: 2.0, pm: 0.5, qc: 1.0, integration: 0.5 }, note: "" },
                ],
              },
            },
          ],
        },
      },
    });
  }

  console.log(`正在截圖報價單列印頁面 (ID: ${quotation.id})...`);
  await page.goto(`http://localhost:3000/quotations/${quotation.id}/print`);
  await delay(2000);
  await page.screenshot({ path: path.join(outputDir, "print_preview.png") });

  console.log("所有頁面截圖完成，儲存於 public/screenshots/！");
  await browser.close();
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error("截圖過程中發生錯誤：", e);
  await prisma.$disconnect();
  process.exit(1);
});
