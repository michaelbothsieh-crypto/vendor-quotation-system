import { db } from "../src/lib/db";

async function testSettingsDb() {
  console.log("開始測試 SystemSetting 資料庫操作...");

  const testKey = "DEFAULT_RD_RATE";
  const testVal = "9999";

  // 1. 清理或讀取原始值
  const original = await db.systemSetting.findUnique({
    where: { key: testKey },
  });
  console.log("原始值:", original);

  // 2. 測試 upsert 寫入
  await db.systemSetting.upsert({
    where: { key: testKey },
    update: { value: testVal },
    create: { key: testKey, value: testVal },
  });

  // 3. 測試讀取
  const updated = await db.systemSetting.findUnique({
    where: { key: testKey },
  });
  console.log("更新後的值:", updated);
  if (!updated || updated.value !== testVal) {
    throw new Error("更新後數值不符預期！");
  }

  // 4. 還原或刪除測試資料
  if (original) {
    await db.systemSetting.update({
      where: { key: testKey },
      data: { value: original.value },
    });
  } else {
    await db.systemSetting.delete({
      where: { key: testKey },
    });
  }

  console.log("✅ SystemSetting 資料庫操作測試通過！");
}

testSettingsDb().catch((err) => {
  console.error("❌ 測試失敗:", err);
  process.exit(1);
});
