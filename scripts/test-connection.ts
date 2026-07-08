import "dotenv/config";
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
