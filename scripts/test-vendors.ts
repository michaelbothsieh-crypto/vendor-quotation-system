import "dotenv/config";

const BASE_URL = "http://localhost:3000";

async function runTests() {
  console.log("🚀 開始執行 Vendor API 整合測試...");

  const timestamp = Date.now();
  const testVendorData = {
    name: `整合測試廠商_${timestamp}`,
    taxId: "12345678",
    contactName: `測試聯絡人_${timestamp}`,
    contactEmail: `test_${timestamp}@example.com`,
    contactPhone: "0900-123456",
    address: "測試地址市測試路 100 號",
  };

  let createdVendorId: string | null = null;

  try {
    // 0. 檢查本地開發伺服器是否啟動
    try {
      await fetch(`${BASE_URL}/api/vendors`);
    } catch (e) {
      throw new Error(`無法連線至 ${BASE_URL}，請確認開發伺服器已啟動（npm run dev）。`);
    }

    // 1. 測試 POST 新增廠商 - 成功案例
    console.log("📝 1. 測試新增廠商 (POST /api/vendors)...");
    const postRes = await fetch(`${BASE_URL}/api/vendors`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(testVendorData),
    });

    if (postRes.status !== 201) {
      throw new Error(`新增廠商失敗：預期狀態碼 201，實際為 ${postRes.status}`);
    }

    const createdVendor = await postRes.json();
    if (!createdVendor.id || createdVendor.name !== testVendorData.name) {
      throw new Error("新增廠商失敗：回傳資料不正確");
    }
    createdVendorId = createdVendor.id;
    console.log(`   ✅ 成功建立廠商，ID: ${createdVendorId}`);

    // 2. 測試 POST 新增廠商 - 失敗案例 (缺失必填欄位)
    console.log("📝 2. 測試必填欄位驗證 (POST /api/vendors 缺少 name)...");
    const badPostRes = await fetch(`${BASE_URL}/api/vendors`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        taxId: "11111111",
        contactName: "無名氏",
        contactEmail: "no-name@example.com",
      }),
    });

    if (badPostRes.status !== 400) {
      throw new Error(`欄位驗證失敗：預期狀態碼 400，實際為 ${badPostRes.status}`);
    }
    const badPostData = await badPostRes.json();
    console.log(`   ✅ 成功攔截錯誤：${badPostData.error}`);

    // 3. 測試 GET 取得所有廠商列表
    console.log("📝 3. 測試取得廠商清單 (GET /api/vendors)...");
    const getRes = await fetch(`${BASE_URL}/api/vendors`);
    if (getRes.status !== 200) {
      throw new Error(`取得清單失敗：預期狀態碼 200，實際為 ${getRes.status}`);
    }
    const vendors: any[] = await getRes.json();
    const found = vendors.find((v) => v.id === createdVendorId);
    if (!found) {
      throw new Error(`取得清單失敗：清單中找不到剛剛建立的廠商 ID: ${createdVendorId}`);
    }
    console.log("   ✅ 成功在廠商清單中找到新增的廠商");

    // 4. 測試 PUT 更新廠商資料 - 成功案例
    console.log(`📝 4. 測試更新廠商 (PUT /api/vendors/${createdVendorId})...`);
    const updateData = {
      ...testVendorData,
      contactName: `已更新聯絡人_${timestamp}`,
      address: "已更新的地址 200 號",
    };

    const putRes = await fetch(`${BASE_URL}/api/vendors/${createdVendorId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updateData),
    });

    if (putRes.status !== 200) {
      throw new Error(`更新廠商失敗：預期狀態碼 200，實際為 ${putRes.status}`);
    }
    const updatedVendor = await putRes.json();
    if (updatedVendor.contactName !== updateData.contactName || updatedVendor.address !== updateData.address) {
      throw new Error("更新廠商失敗：回傳資料不正確");
    }
    console.log("   ✅ 廠商資料更新成功");

    // 5. 測試 PUT 更新廠商資料 - 404 案例
    console.log("📝 5. 測試不存在廠商的更新 (PUT /api/vendors/non-exist-id)...");
    const badPutRes = await fetch(`${BASE_URL}/api/vendors/non-exist-id`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updateData),
    });

    if (badPutRes.status !== 404) {
      throw new Error(`預期狀態碼 404，實際為 ${badPutRes.status}`);
    }
    console.log("   ✅ 成功處理 404 更新錯誤");

    // 6. 測試 DELETE 刪除廠商
    console.log(`📝 6. 測試刪除廠商 (DELETE /api/vendors/${createdVendorId})...`);
    const deleteRes = await fetch(`${BASE_URL}/api/vendors/${createdVendorId}`, {
      method: "DELETE",
    });

    if (deleteRes.status !== 200) {
      throw new Error(`刪除廠商失敗：預期狀態碼 200，實際為 ${deleteRes.status}`);
    }
    console.log("   ✅ 廠商刪除成功");

    // 7. 驗證刪除後狀態
    console.log(`📝 7. 驗證刪除後是否為 404 (PUT /api/vendors/${createdVendorId})...`);
    const checkRes = await fetch(`${BASE_URL}/api/vendors/${createdVendorId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updateData),
    });

    if (checkRes.status !== 404) {
      throw new Error(`預期刪除後的操作應回傳 404，實際為 ${checkRes.status}`);
    }
    console.log("   ✅ 成功驗證廠商已被徹底刪除");

    console.log("\n🎉 🎉 🎉 恭喜！所有 Vendor API 測試皆已通過！🎉 🎉 🎉");
  } catch (err: any) {
    console.error("\n❌ 測試失敗：", err.message || err);
    process.exit(1);
  }
}

runTests();
