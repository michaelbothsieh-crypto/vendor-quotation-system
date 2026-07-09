import { PrismaClient } from "@prisma/client";
import { POST as createHandler, GET as getListHandler } from "../src/app/api/quotations/route";
import { PUT as updateHandler } from "../src/app/api/quotations/[id]/route";
import { NextRequest } from "next/server";

const prisma = new PrismaClient();

async function runTest() {
  console.log("=== 開始執行報價單 API 版本控制 (Task 3) 整合測試 ===");

  let testVendor: any = null;
  let v1Id: string = "";
  let v2Id: string = "";
  let v3Id: string = "";
  let quotationNum: string = "";

  try {
    // 1. 取得或建立一個廠商
    testVendor = await prisma.vendor.findFirst({
      where: { name: "測試版本控制廠商" },
    });
    if (!testVendor) {
      console.log("建立測試廠商...");
      testVendor = await prisma.vendor.create({
        data: {
          name: "測試版本控制廠商",
          contactName: "版本測試員",
          contactEmail: "version-test@example.com",
        },
      });
    }
    console.log(`測試廠商 ID: ${testVendor.id}`);

    // 2. 模擬建立 v1 報價單 (POST)
    console.log("\n[步驟 1] 建立 v1 報價單...");
    const reqCreate = new NextRequest("http://localhost/api/quotations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "版本測試專案",
        vendorId: testVendor.id,
        rdRate: 8000,
        pmRate: 6000,
        qcRate: 5000,
        integrationRate: 6500,
        categories: [
          {
            name: "開發階段一",
            items: [
              {
                description: "模組 A 設計",
                rdDays: 2.5,
                pmDays: 0.5,
                qcDays: 1.0,
                integrationDays: 0.5,
                note: "基礎架構",
              },
            ],
          },
        ],
      }),
    });

    const resCreate = await createHandler(reqCreate);
    if (resCreate.status !== 201) {
      const err = await resCreate.json();
      throw new Error(`建立 v1 失敗: ${JSON.stringify(err)}`);
    }

    const v1Data = await resCreate.json();
    v1Id = v1Data.id;
    quotationNum = v1Data.quotationNumber;
    console.log(`建立 v1 成功! ID: ${v1Id}, 單號: ${quotationNum}`);
    console.log(`v1 的屬性: version = ${v1Data.version}, isLatest = ${v1Data.isLatest}, status = ${v1Data.status}`);

    if (v1Data.version !== 1) throw new Error("v1 的版本號應為 1");
    if (v1Data.isLatest !== true) throw new Error("v1 初始化時 isLatest 應為 true");

    // 3. 模擬更新該報價單 (PUT) -> 觸發建立 v2
    console.log("\n[步驟 2] 更新報價單 (PUT)，產生 v2...");
    const reqUpdate = new NextRequest(`http://localhost/api/quotations/${v1Id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "版本測試專案-二版",
        vendorId: testVendor.id,
        rdRate: 8500,
        pmRate: 6200,
        qcRate: 5200,
        integrationRate: 6700,
        categories: [
          {
            name: "開發階段一 (修正)",
            items: [
              {
                description: "模組 A 設計與調整",
                rdDays: 3.5,
                pmDays: 1.0,
                qcDays: 1.5,
                integrationDays: 1.0,
                note: "追加規格",
              },
            ],
          },
        ],
      }),
    });

    const resUpdate = await updateHandler(reqUpdate, { params: Promise.resolve({ id: v1Id }) } as any);
    if (resUpdate.status !== 200) {
      const err = await resUpdate.json();
      throw new Error(`更新 v1 失敗: ${JSON.stringify(err)}`);
    }

    const v2Data = await resUpdate.json();
    v2Id = v2Data.id;
    console.log(`更新 v1 成功，產生 v2! ID: ${v2Id}`);
    console.log(`v2 的屬性: version = ${v2Data.version}, isLatest = ${v2Data.isLatest}, status = ${v2Data.status}`);

    if (v2Data.version !== 2) throw new Error("v2 的版本號應為 2");
    if (v2Data.isLatest !== true) throw new Error("v2 的 isLatest 應為 true");
    if (v2Data.parentQuotationId !== v1Id) throw new Error(`v2 的 parentQuotationId (${v2Data.parentQuotationId}) 應指向 v1Id (${v1Id})`);
    if (v2Data.quotationNumber !== quotationNum) throw new Error(`v2 的單號 (${v2Data.quotationNumber}) 應與 v1 的單號 (${quotationNum}) 一致`);

    // 驗證資料庫中 v1 的狀態已更新
    const dbV1 = await prisma.quotation.findUnique({ where: { id: v1Id } });
    if (!dbV1) throw new Error("資料庫中找不到 v1 記錄");
    console.log(`資料庫驗證 - v1 屬性: version = ${dbV1.version}, isLatest = ${dbV1.isLatest}, status = ${dbV1.status}`);
    if (dbV1.isLatest !== false) throw new Error("v1 被更新後，isLatest 應改為 false");
    if (dbV1.status !== "ARCHIVED") throw new Error("v1 被更新後，status 應改為 ARCHIVED");

    // 4. 模擬更新 v2 (PUT) -> 觸發建立 v3
    console.log("\n[步驟 3] 更新 v2 (PUT)，產生 v3...");
    const reqUpdate2 = new NextRequest(`http://localhost/api/quotations/${v2Id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "版本測試專案-三版",
        vendorId: testVendor.id,
        rdRate: 9000,
        pmRate: 6500,
        qcRate: 5500,
        integrationRate: 7000,
        categories: [
          {
            name: "開發階段一 (定案)",
            items: [
              {
                description: "模組 A 設計與調整-定案",
                rdDays: 3.5,
                pmDays: 1.0,
                qcDays: 1.5,
                integrationDays: 1.0,
                note: "定案規格",
              },
            ],
          },
        ],
      }),
    });

    const resUpdate2 = await updateHandler(reqUpdate2, { params: Promise.resolve({ id: v2Id }) } as any);
    if (resUpdate2.status !== 200) {
      const err = await resUpdate2.json();
      throw new Error(`更新 v2 失敗: ${JSON.stringify(err)}`);
    }

    const v3Data = await resUpdate2.json();
    v3Id = v3Data.id;
    console.log(`更新 v2 成功，產生 v3! ID: ${v3Id}`);
    console.log(`v3 的屬性: version = ${v3Data.version}, isLatest = ${v3Data.isLatest}, status = ${v3Data.status}`);

    if (v3Data.version !== 3) throw new Error("v3 的版本號應為 3");
    if (v3Data.isLatest !== true) throw new Error("v3 的 isLatest 應為 true");
    if (v3Data.parentQuotationId !== v2Id) throw new Error("v3 的 parentQuotationId 應指向 v2Id");
    if (v3Data.quotationNumber !== quotationNum) throw new Error("v3 的單號應與 v1/v2 的單號一致");

    // 驗證資料庫中 v2 的狀態已更新
    const dbV2 = await prisma.quotation.findUnique({ where: { id: v2Id } });
    if (!dbV2) throw new Error("資料庫中找不到 v2 記錄");
    console.log(`資料庫驗證 - v2 屬性: version = ${dbV2.version}, isLatest = ${dbV2.isLatest}, status = ${dbV2.status}`);
    if (dbV2.isLatest !== false) throw new Error("v2 被更新後，isLatest 應改為 false");
    if (dbV2.status !== "ARCHIVED") throw new Error("v2 被更新後，status 應改為 ARCHIVED");

    // 4.5 模擬對已封存/歷史版本 (v1Id) 發送 PUT 請求，應回傳 400 錯誤
    console.log("\n[步驟 3.5] 測試對已封存/歷史版本 (v1Id) 發送 PUT 請求...");
    const reqInvalidUpdate = new NextRequest(`http://localhost/api/quotations/${v1Id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "試圖更新歷史版本",
        vendorId: testVendor.id,
        rdRate: 8500,
        pmRate: 6200,
        qcRate: 5200,
        integrationRate: 6700,
      }),
    });
    const resInvalidUpdate = await updateHandler(reqInvalidUpdate, { params: Promise.resolve({ id: v1Id }) } as any);
    console.log(`更新歷史版本回應狀態碼: ${resInvalidUpdate.status}`);
    if (resInvalidUpdate.status !== 400) {
      throw new Error(`對歷史版本發送 PUT 應回傳 400 錯誤，但得到 ${resInvalidUpdate.status}`);
    }
    const invalidUpdateJson = await resInvalidUpdate.json();
    console.log(`歷史版本更新錯誤訊息: ${invalidUpdateJson.error}`);
    if (invalidUpdateJson.error !== "無法更新非最新版本的報價單") {
      throw new Error(`錯誤訊息不符合預期: ${invalidUpdateJson.error}`);
    }
    console.log("歷史版本更新限制驗證成功！");

    // 5. 驗證 GET 查詢 (單一號碼的所有版本)
    console.log("\n[步驟 4] 測試 GET api/quotations?allVersions=true&quotationNumber=xxx...");
    const reqGetHistory = new NextRequest(`http://localhost/api/quotations?allVersions=true&quotationNumber=${quotationNum}`, {
      method: "GET",
    });
    const resGetHistory = await getListHandler(reqGetHistory);
    if (resGetHistory.status !== 200) {
      const err = await resGetHistory.json();
      throw new Error(`GET 歷史版本失敗: ${JSON.stringify(err)}`);
    }

    const historyList = await resGetHistory.json();
    console.log(`獲取到的歷史版本列表長度: ${historyList.length}`);
    if (historyList.length !== 3) throw new Error(`歷史版本列表數量應為 3，但得到 ${historyList.length}`);

    // 驗證版本是否依 version 降序排列 (v3 -> v2 -> v1)
    console.log("驗證版本順序 (降序)...");
    if (historyList[0].version !== 3 || historyList[0].id !== v3Id) throw new Error("排序第 1 的應為 v3");
    if (historyList[1].version !== 2 || historyList[1].id !== v2Id) throw new Error("排序第 2 的應為 v2");
    if (historyList[2].version !== 1 || historyList[2].id !== v1Id) throw new Error("排序第 3 的應為 v1");
    console.log("版本排序驗證正確！");

    // 6. 驗證 GET 預設查詢 (僅回傳 isLatest = true)
    console.log("\n[步驟 5] 測試 GET api/quotations 預設查詢...");
    const reqGetDefault = new NextRequest("http://localhost/api/quotations", {
      method: "GET",
    });
    const resGetDefault = await getListHandler(reqGetDefault);
    const defaultList = await resGetDefault.json();
    
    // 檢查是否有包含 v1 或 v2
    const hasV1 = defaultList.some((q: any) => q.id === v1Id);
    const hasV2 = defaultList.some((q: any) => q.id === v2Id);
    const hasV3 = defaultList.some((q: any) => q.id === v3Id);

    console.log(`預設列表是否包含 v1: ${hasV1}, v2: ${hasV2}, v3: ${hasV3}`);
    if (hasV1 || hasV2) throw new Error("預設的 GET 列表中不應包含非最新版本 (isLatest = false) 的報價單");
    if (!hasV3) throw new Error("預設的 GET 列表中應包含最新版本 (isLatest = true) 的報價單");

    // 6.5 測試 GET 參數驗證：當 allVersions=true 卻沒有提供 quotationNumber 時，應回傳 400
    console.log("\n[步驟 5.5] 測試 GET 歷史版本但未帶單號，應回傳 400...");
    const reqInvalidGet = new NextRequest("http://localhost/api/quotations?allVersions=true", {
      method: "GET",
    });
    const resInvalidGet = await getListHandler(reqInvalidGet);
    console.log(`GET 未帶單號回應狀態碼: ${resInvalidGet.status}`);
    if (resInvalidGet.status !== 400) {
      throw new Error(`GET allVersions=true 且無單號應回傳 400，但得到 ${resInvalidGet.status}`);
    }
    const invalidGetJson = await resInvalidGet.json();
    console.log(`GET 未帶單號錯誤訊息: ${invalidGetJson.error}`);
    if (invalidGetJson.error !== "查詢歷史版本時，必須提供報價單號") {
      throw new Error(`錯誤訊息不符合預期: ${invalidGetJson.error}`);
    }
    console.log("GET 歷史版本參數防呆驗證成功！");

    console.log("\n✅ 恭喜！報價單 API 版本控制功能 (GET / PUT) 整合測試全部通過！");

  } catch (error: any) {
    console.error(`\n❌ 測試失敗：${error.message}`);
    process.exit(1);
  } finally {
    // 清理測試資料
    console.log("\n[清理] 開始清理測試資料...");
    
    // 依序刪除 (如果有建置的話)
    if (v3Id) {
      await prisma.quotation.delete({ where: { id: v3Id } }).catch(e => console.error(`清理 v3 失敗: ${e.message}`));
      console.log(`已清理 v3: ${v3Id}`);
    }
    if (v2Id) {
      await prisma.quotation.delete({ where: { id: v2Id } }).catch(e => console.error(`清理 v2 失敗: ${e.message}`));
      console.log(`已清理 v2: ${v2Id}`);
    }
    if (v1Id) {
      await prisma.quotation.delete({ where: { id: v1Id } }).catch(e => console.error(`清理 v1 失敗: ${e.message}`));
      console.log(`已清理 v1: ${v1Id}`);
    }
    if (testVendor) {
      await prisma.vendor.delete({ where: { id: testVendor.id } }).catch(e => console.error(`清理廠商失敗: ${e.message}`));
      console.log(`已清理廠商: ${testVendor.id}`);
    }
    console.log("=== 測試清理完成 ===");
    await prisma.$disconnect();
  }
}

runTest();
