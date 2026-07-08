import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // 寫入系統預設費率
  const settings = [
    { key: 'DEFAULT_RD_RATE', value: '8000' },
    { key: 'DEFAULT_PM_RATE', value: '6000' },
    { key: 'DEFAULT_QC_RATE', value: '5000' },
    { key: 'DEFAULT_INTEGRATION_RATE', value: '6500' },
  ];

  console.log('開始植入系統預設費率...');
  for (const setting of settings) {
    const result = await prisma.systemSetting.upsert({
      where: { key: setting.key },
      update: { value: setting.value },
      create: { key: setting.key, value: setting.value },
    });
    console.log(`已設定 ${result.key} = ${result.value}`);
  }

  // 建立一筆測試用的示範廠商資料
  console.log('開始植入示範廠商資料...');
  const vendor = await prisma.vendor.upsert({
    where: { id: 'demo-vendor-id' },
    update: {
      name: '測試範例科技有限公司',
      taxId: '87654321',
      contactName: '張小明',
      contactEmail: 'xiaoming@example.com',
      contactPhone: '0912-345678',
      address: '台北市信義區信義路五段7號',
    },
    create: {
      id: 'demo-vendor-id',
      name: '測試範例科技有限公司',
      taxId: '87654321',
      contactName: '張小明',
      contactEmail: 'xiaoming@example.com',
      contactPhone: '0912-345678',
      address: '台北市信義區信義路五段7號',
    },
  });
  console.log(`已建立/更新示範廠商: ${vendor.name} (${vendor.id})`);
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
