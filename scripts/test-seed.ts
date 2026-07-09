import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifySeed() {
  console.log('開始驗證資料庫 Seed 資料...');

  // 1. 驗證系統預設費率
  const expectedSettings = [
    { key: 'DEFAULT_RD_RATE', value: '8000' },
    { key: 'DEFAULT_PM_RATE', value: '6000' },
    { key: 'DEFAULT_QC_RATE', value: '5000' },
    { key: 'DEFAULT_INTEGRATION_RATE', value: '6500' },
  ];

  for (const expected of expectedSettings) {
    const setting = await prisma.systemSetting.findUnique({
      where: { key: expected.key },
    });

    if (!setting) {
      throw new Error(`驗證失敗: 找不到設定鍵值 ${expected.key}`);
    }

    if (setting.value !== expected.value) {
      throw new Error(
        `驗證失敗: 設定鍵值 ${expected.key} 的數值不正確。預期: ${expected.value}，實際: ${setting.value}`
      );
    }

    console.log(`✅ 驗證成功: ${expected.key} = ${setting.value}`);
  }

  // 2. 驗證示範廠商資料
  const demoVendor = await prisma.vendor.findUnique({
    where: { id: 'demo-vendor-id' },
  });

  if (!demoVendor) {
    throw new Error('驗證失敗: 找不到示範廠商 (demo-vendor-id)');
  }

  const expectedVendor = {
    id: 'demo-vendor-id',
    name: '測試範例科技有限公司',
    taxId: '87654321',
    contactName: '張小明',
    contactEmail: 'xiaoming@example.com',
    contactPhone: '0912-345678',
    address: '台北市信義區信義路五段7號',
  };

  if (demoVendor.name !== expectedVendor.name) {
    throw new Error(`驗證失敗: 廠商名稱不符。預期: ${expectedVendor.name}，實際: ${demoVendor.name}`);
  }
  if (demoVendor.taxId !== expectedVendor.taxId) {
    throw new Error(`驗證失敗: 廠商統編不符。預期: ${expectedVendor.taxId}，實際: ${demoVendor.taxId}`);
  }
  if (demoVendor.contactName !== expectedVendor.contactName) {
    throw new Error(`驗證失敗: 聯絡人姓名不符。預期: ${expectedVendor.contactName}，實際: ${demoVendor.contactName}`);
  }
  if (demoVendor.contactEmail !== expectedVendor.contactEmail) {
    throw new Error(`驗證失敗: 聯絡人信箱不符。預期: ${expectedVendor.contactEmail}，實際: ${demoVendor.contactEmail}`);
  }
  if (demoVendor.contactPhone !== expectedVendor.contactPhone) {
    throw new Error(`驗證失敗: 聯絡人電話不符。預期: ${expectedVendor.contactPhone}，實際: ${demoVendor.contactPhone}`);
  }
  if (demoVendor.address !== expectedVendor.address) {
    throw new Error(`驗證失敗: 廠商地址不符。預期: ${expectedVendor.address}，實際: ${demoVendor.address}`);
  }

  console.log('✅ 驗證成功: 示範廠商資料完全正確！');

  // 3. 驗證示範報價單資料
  const demoQuotation = await prisma.quotation.findUnique({
    where: { quotationNumber: 'Q-DEMO-001' },
    include: { categories: { include: { items: true } } },
  });

  if (!demoQuotation) {
    throw new Error('驗證失敗: 找不到示範報價單 (Q-DEMO-001)');
  }

  if (demoQuotation.title !== '示範報價專案') {
    throw new Error(`驗證失敗: 報價單標題不符。預期: 示範報價專案，實際: ${demoQuotation.title}`);
  }
  if (demoQuotation.version !== 1) {
    throw new Error(`驗證失敗: 報價單版本不符。預期: 1，實際: ${demoQuotation.version}`);
  }
  if (demoQuotation.isLatest !== true) {
    throw new Error(`驗證失敗: 報價單 isLatest 不符。預期: true，實際: ${demoQuotation.isLatest}`);
  }
  if (demoQuotation.categories.length !== 1 || demoQuotation.categories[0].items.length !== 1) {
    throw new Error('驗證失敗: 報價單大項或細項數量不符');
  }

  console.log('✅ 驗證成功: 示範報價單資料與版本屬性完全正確！');
  console.log('\n恭喜！所有 Seed 資料驗證成功！');
}

verifySeed()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('❌ 驗證過程中發生錯誤:', e.message || e);
    await prisma.$disconnect();
    process.exit(1);
  });
