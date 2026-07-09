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

  // 建立一筆測試用的示範報價單資料 (Quotation)
  console.log('開始植入示範報價單資料...');
  const quotation = await prisma.quotation.upsert({
    where: { quotationNumber: 'Q-DEMO-001' },
    update: {
      title: '示範報價專案',
      vendorId: vendor.id,
      status: 'DRAFT',
      taxRate: 0.05,
      rdRate: 8000,
      pmRate: 6000,
      qcRate: 5000,
      integrationRate: 6500,
      version: 1,
      isLatest: true,
    },
    create: {
      quotationNumber: 'Q-DEMO-001',
      title: '示範報價專案',
      vendorId: vendor.id,
      status: 'DRAFT',
      taxRate: 0.05,
      rdRate: 8000,
      pmRate: 6000,
      qcRate: 5000,
      integrationRate: 6500,
      version: 1,
      isLatest: true,
      categories: {
        create: [
          {
            name: '示範大項',
            sortOrder: 0,
            items: {
              create: [
                {
                  description: '示範細項 1.1',
                  rdDays: 2.0,
                  pmDays: 0.5,
                  qcDays: 0.5,
                  integrationDays: 0.5,
                  note: '無',
                  sortOrder: 0,
                }
              ]
            }
          }
        ]
      }
    },
  });
  console.log(`已建立/更新示範報價單: ${quotation.title} (${quotation.quotationNumber})`);
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
