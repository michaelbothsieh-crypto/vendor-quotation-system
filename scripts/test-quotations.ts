import { POST as createQuotation, GET as getQuotations } from "../src/app/api/quotations/route";
import {
  GET as getQuotationById,
  PUT as updateQuotation,
  DELETE as deleteQuotation,
} from "../src/app/api/quotations/[id]/route";
import { db } from "../src/lib/db";

async function runTest() {
  console.log("=== 開始執行報價單 API 整合測試 ===");

  let testVendor: any = null;
  let testQuotationId: string = "";

  try {
    // 1. 建立測試廠商以供關聯
    console.log("1. 建立測試廠商...");
    testVendor = await db.vendor.create({
      data: {
        name: "測試整合廠商",
        contactName: "測試聯絡人",
        contactEmail: "test-integration@example.com",
      },
    });
    console.log(`測試廠商建立成功，ID: ${testVendor.id}`);

    // 2. 測試建立報價單 (POST)
    console.log("\n2. 測試建立報價單 (POST)...");
    const postPayload = {
      title: "測試整合專案",
      vendorId: testVendor.id,
      taxRate: 0.05,
      rdRate: 8000,
      pmRate: 6000,
      qcRate: 5000,
      integrationRate: 6500,
      categories: [
        {
          name: "第一大項",
          items: [
            {
              description: "細項 1.1",
              rdDays: 2.5,
              pmDays: 0.5,
              qcDays: 1.0,
              integrationDays: 0.5,
              note: "這是備註",
            },
          ],
        },
      ],
    };

    const postReq = new Request("http://localhost/api/quotations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(postPayload),
    });

    const postRes = await createQuotation(postReq);
    if (postRes.status !== 201) {
      const err = await postRes.json();
      throw new Error(`建立報價單失敗，狀態碼 ${postRes.status}: ${JSON.stringify(err)}`);
    }

    const createdQuotation = await postRes.json();
    testQuotationId = createdQuotation.id;
    console.log(`報價單建立成功！ID: ${testQuotationId}`);
    console.log(`自動產生單號: ${createdQuotation.quotationNumber}`);

    // 斷言基本資料與巢狀資料
    if (createdQuotation.title !== postPayload.title) throw new Error("專案名稱不符");
    if (!createdQuotation.quotationNumber.startsWith("Q-")) throw new Error("單號格式錯誤");
    if (createdQuotation.categories.length !== 1) throw new Error("大項數量錯誤");
    if (createdQuotation.categories[0].items.length !== 1) throw new Error("細項數量錯誤");

    // 3. 測試取得所有報價單 (GET)
    console.log("\n3. 測試取得所有報價單 (GET)...");
    const getReq = new Request("http://localhost/api/quotations", { method: "GET" });
    const getRes = await getQuotations();
    if (getRes.status !== 200) {
      throw new Error(`取得列表失敗，狀態碼 ${getRes.status}`);
    }
    const list = await getRes.json();
    const foundInList = list.find((q: any) => q.id === testQuotationId);
    if (!foundInList) throw new Error("在列表中找不到剛建立的報價單");
    console.log(`成功在列表中找到該報價單，目前列表總數: ${list.length}`);

    // 4. 測試取得特定報價單詳情 (GET /[id])
    console.log("\n4. 測試取得特定報價單詳情 (GET /[id])...");
    // Next.js 15 App Router 的 params 在整合測試中可包裝成 Promise
    const getParams = Promise.resolve({ id: testQuotationId });
    const getByIdRes = await getQuotationById(
      new Request(`http://localhost/api/quotations/${testQuotationId}`),
      { params: getParams }
    );
    if (getByIdRes.status !== 200) {
      throw new Error(`取得詳情失敗，狀態碼 ${getByIdRes.status}`);
    }
    const detail = await getByIdRes.json();
    if (detail.title !== "測試整合專案") throw new Error("詳情資料錯誤");
    console.log("成功取得正確的報價單詳情");

    // 5. 測試更新報價單 (PUT /[id])
    console.log("\n5. 測試更新報價單 (PUT /[id])...");
    const putPayload = {
      title: "已更新的測試整合專案",
      vendorId: testVendor.id,
      taxRate: 0.05,
      rdRate: 9000, // 調高費率
      pmRate: 7000,
      qcRate: 5500,
      integrationRate: 6800,
      categories: [
        {
          name: "更新後的第一大項",
          items: [
            {
              description: "細項 1.1 更新",
              rdDays: 3.0,
              pmDays: 1.0,
              qcDays: 1.5,
              integrationDays: 1.0,
              note: "備註更新",
            },
          ],
        },
        {
          name: "新增的第二大項",
          items: [
            {
              description: "細項 2.1",
              rdDays: 1.0,
              pmDays: 0.0,
              qcDays: 0.0,
              integrationDays: 0.0,
            },
          ],
        },
      ],
    };

    const putParams = Promise.resolve({ id: testQuotationId });
    const putReq = new Request(`http://localhost/api/quotations/${testQuotationId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(putPayload),
    });

    const putRes = await updateQuotation(putReq, { params: putParams });
    if (putRes.status !== 200) {
      const err = await putRes.json();
      throw new Error(`更新失敗，狀態碼 ${putRes.status}: ${JSON.stringify(err)}`);
    }

    const updated = await putRes.json();
    console.log("報價單更新成功！");
    if (updated.title !== putPayload.title) throw new Error("更新後專案名稱不符");
    if (updated.rdRate !== 9000) throw new Error("更新後費率不符");
    if (updated.categories.length !== 2) throw new Error("更新後大項數量錯誤");

    // 6. 測試刪除報價單 (DELETE /[id])
    console.log("\n6. 測試刪除報價單 (DELETE /[id])...");
    const deleteParams = Promise.resolve({ id: testQuotationId });
    const deleteReq = new Request(`http://localhost/api/quotations/${testQuotationId}`, {
      method: "DELETE",
    });
    const deleteRes = await deleteQuotation(deleteReq, { params: deleteParams });
    if (deleteRes.status !== 200) {
      throw new Error(`刪除失敗，狀態碼 ${deleteRes.status}`);
    }
    console.log("報價單刪除成功！");

    // 7. 驗證資料庫中的級聯刪除 (Cascade Delete)
    console.log("\n7. 驗證級聯刪除結果...");
    const checkQuotation = await db.quotation.findUnique({ where: { id: testQuotationId } });
    if (checkQuotation) throw new Error("報價單主檔未被刪除");

    const checkCategories = await db.quotationCategory.findMany({
      where: { quotationId: testQuotationId },
    });
    if (checkCategories.length > 0) throw new Error("報價單大項未被級聯刪除");

    console.log("級聯刪除驗證成功！大項與細項皆已清除。");
    console.log("\n恭喜！所有報價單 API 測試通過！");

  } catch (error: any) {
    console.error(`\n❌ 測試失敗：${error.message}`);
    process.exit(1);
  } finally {
    // 清理測試資料
    console.log("\n8. 清理測試資料...");
    if (testQuotationId) {
      await db.quotation.deleteMany({ where: { id: testQuotationId } }).catch(() => {});
    }
    if (testVendor) {
      await db.vendor.delete({ where: { id: testVendor.id } }).catch(() => {});
      console.log("測試廠商已清理。");
    }
    console.log("=== 測試結束 ===");
  }
}

runTest();
