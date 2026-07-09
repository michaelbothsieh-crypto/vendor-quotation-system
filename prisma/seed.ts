import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// 預設範本的角色欄位（key 固定，供示範報價單引用）
const DEFAULT_ROLES = [
  { key: 'rd', label: 'RD', rate: 8000 },
  { key: 'pm', label: 'PM', rate: 6000 },
  { key: 'qc', label: 'QC', rate: 5000 },
  { key: 'integration', label: '整合', rate: 6500 },
];

async function main() {
  // 建立預設管理員帳號（僅在無使用者時建立）
  console.log('檢查是否需要建立預設管理員帳號...');
  const userCount = await prisma.user.count();
  if (userCount === 0) {
    const passwordHash = await bcrypt.hash('REDACTED', 10);
    const admin = await prisma.user.create({
      data: {
        email: 'admin@example.com',
        passwordHash,
        name: '系統管理員',
        role: 'ADMIN',
      },
    });
    console.log(`已建立預設管理員帳號: ${admin.email} / 密碼: REDACTED（請登入後立即修改）`);
  } else {
    console.log('已存在使用者帳號，略過預設管理員建立。');
  }

  // 建立預設報價範本（僅在無任何範本時建立，避免覆蓋管理員的客製化）
  console.log('檢查是否需要建立預設報價範本...');
  const templateCount = await prisma.quoteTemplate.count();
  if (templateCount === 0) {
    const template = await prisma.quoteTemplate.create({
      data: {
        name: '標準開發範本',
        isDefault: true,
        roles: DEFAULT_ROLES,
        paymentTerms: '驗收完成後 30 日內電匯付款',
        notes: '本報價單有效期限內有效，逾期需重新報價。',
      },
    });
    console.log(`已建立預設報價範本: ${template.name}`);
  } else {
    console.log('已存在報價範本，略過預設範本建立。');
  }

  // 建立一筆測試用的示範廠商資料
  console.log('開始植入示範廠商資料...');
  const vendorData = {
    name: '測試範例科技有限公司',
    taxId: '87654321',
    contactName: '張小明',
    contactEmail: 'xiaoming@example.com',
    contactPhone: '0912-345678',
    address: '台北市信義區信義路五段7號',
  };
  const vendor = await prisma.vendor.upsert({
    where: { id: 'demo-vendor-id' },
    update: vendorData,
    create: { id: 'demo-vendor-id', ...vendorData },
  });
  console.log(`已建立/更新示範廠商: ${vendor.name} (${vendor.id})`);

  // 建立一筆測試用的示範報價單資料 (Quotation)
  console.log('開始植入示範報價單資料...');
  const validUntil = new Date();
  validUntil.setDate(validUntil.getDate() + 30);
  const quotationData = {
    title: '示範報價專案',
    vendorId: vendor.id,
    vendorName: vendor.name,
    vendorTaxId: vendor.taxId,
    vendorContactName: vendor.contactName,
    vendorContactEmail: vendor.contactEmail,
    vendorContactPhone: vendor.contactPhone,
    vendorAddress: vendor.address,
    status: 'DRAFT',
    taxRate: 0.05,
    roles: DEFAULT_ROLES,
    validUntil,
    paymentTerms: '驗收完成後 30 日內電匯付款',
    notes: '本報價單有效期限內有效，逾期需重新報價。',
    version: 1,
    isLatest: true,
  };
  const quotation = await prisma.quotation.upsert({
    where: {
      quotationNumber_version: {
        quotationNumber: 'Q-DEMO-001',
        version: 1,
      },
    },
    update: quotationData,
    create: {
      quotationNumber: 'Q-DEMO-001',
      ...quotationData,
      categories: {
        create: [
          {
            name: '示範大項',
            sortOrder: 0,
            items: {
              create: [
                {
                  description: '示範細項 1.1',
                  days: { rd: 2.0, pm: 0.5, qc: 0.5, integration: 0.5 },
                  note: '無',
                  sortOrder: 0,
                },
              ],
            },
          },
        ],
      },
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
