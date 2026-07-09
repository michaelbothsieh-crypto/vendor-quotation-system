import { db } from "../src/lib/db";

async function runTest() {
  console.log("=== 開始執行 Prisma Schema 版本控制功能測試 ===");

  let testVendor: any = null;
  let quotationV1: any = null;
  let quotationV2: any = null;

  try {
    // 1. 建立測試廠商
    console.log("1. 建立測試廠商...");
    testVendor = await db.vendor.create({
      data: {
        name: "測試版本廠商",
        contactName: "版本測試員",
        contactEmail: "version-test@example.com",
      },
    });
    console.log(`測試廠商建立成功，ID: ${testVendor.id}`);

    // 2. 建立 v1 報價單
    console.log("\n2. 建立 v1 報價單...");
    quotationV1 = await db.quotation.create({
      data: {
        quotationNumber: `Q-TEST-V1-${Date.now()}`,
        title: "測試專案 v1",
        vendorId: testVendor.id,
        status: "DRAFT",
        version: 1,
        isLatest: false, // 模擬之後被 v2 取代
      },
    });
    console.log(`v1 報價單建立成功，ID: ${quotationV1.id}, 版本: ${quotationV1.version}, isLatest: ${quotationV1.isLatest}`);

    // 3. 建立 v2 報價單，並關聯到 v1 (自我關聯)
    console.log("\n3. 建立 v2 報價單並關聯到 v1...");
    quotationV2 = await db.quotation.create({
      data: {
        quotationNumber: `Q-TEST-V2-${Date.now()}`,
        title: "測試專案 v2",
        vendorId: testVendor.id,
        status: "DRAFT",
        version: 2,
        isLatest: true,
        parentQuotationId: quotationV1.id, // 指向 v1
      },
    });
    console.log(`v2 報價單建立成功，ID: ${quotationV2.id}, 版本: ${quotationV2.version}, parentQuotationId: ${quotationV2.parentQuotationId}`);

    // 4. 驗證自我關聯與版本欄位
    console.log("\n4. 驗證版本與關聯查詢...");
    
    // 查詢 v2 並包含其 parentQuotation
    const fetchedV2 = await db.quotation.findUnique({
      where: { id: quotationV2.id },
      include: { parentQuotation: true },
    });

    if (!fetchedV2) throw new Error("無法查詢到 v2 報價單");
    console.log(`成功查詢到 v2 報價單：${fetchedV2.title}`);
    console.log(`v2 的 parentQuotationId: ${fetchedV2.parentQuotationId}`);
    
    if (!fetchedV2.parentQuotation) throw new Error("v2 的 parentQuotation 關聯為空");
    console.log(`v2 的父版本標題: ${fetchedV2.parentQuotation.title}`);
    console.log(`v2 的父版本 Version: ${fetchedV2.parentQuotation.version}`);
    
    if (fetchedV2.parentQuotation.id !== quotationV1.id) throw new Error("v2 關聯的父版本 ID 與 v1 不符");
    if (fetchedV2.parentQuotation.version !== 1) throw new Error("父版本 Version 應為 1");
    if (fetchedV2.parentQuotation.isLatest !== false) throw new Error("父版本 isLatest 應為 false");

    // 查詢 v1 並包含其 childQuotation
    const fetchedV1 = await db.quotation.findUnique({
      where: { id: quotationV1.id },
      include: { childQuotation: true },
    });

    if (!fetchedV1) throw new Error("無法查詢到 v1 報價單");
    console.log(`成功查詢到 v1 報價單：${fetchedV1.title}`);
    
    if (!fetchedV1.childQuotation) throw new Error("v1 的 childQuotation 關聯為空");
    console.log(`v1 的子版本標題: ${fetchedV1.childQuotation.title}`);
    console.log(`v1 的子版本 Version: ${fetchedV1.childQuotation.version}`);
    
    if (fetchedV1.childQuotation.id !== quotationV2.id) throw new Error("v1 關聯的子版本 ID 與 v2 不符");
    if (fetchedV1.childQuotation.version !== 2) throw new Error("子版本 Version 應為 2");
    if (fetchedV1.childQuotation.isLatest !== true) throw new Error("子版本 isLatest 應為 true");

    console.log("\n✅ 恭喜！Prisma Schema 版本控制與自我關聯驗證成功！");

  } catch (error: any) {
    console.error(`\n❌ 測試失敗：${error.message}`);
    process.exit(1);
  } finally {
    // 5. 清理測試資料
    console.log("\n5. 清理測試資料...");
    if (quotationV2) {
      await db.quotation.delete({ where: { id: quotationV2.id } }).catch(() => {});
      console.log(`已清理 v2 報價單: ${quotationV2.id}`);
    }
    if (quotationV1) {
      await db.quotation.delete({ where: { id: quotationV1.id } }).catch(() => {});
      console.log(`已清理 v1 報價單: ${quotationV1.id}`);
    }
    if (testVendor) {
      await db.vendor.delete({ where: { id: testVendor.id } }).catch(() => {});
      console.log(`已清理測試廠商: ${testVendor.id}`);
    }
    console.log("=== 測試結束 ===");
  }
}

runTest();
