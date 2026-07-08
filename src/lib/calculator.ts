/**
 * 將浮點數精確四捨五入到小數點第一位
 */
export function roundToOneDecimal(num: number): number {
  return Math.round((num + Number.EPSILON) * 10) / 10;
}

// 支援 Prisma Decimal 轉換與各種可能 input 的 days 解析
function getDays(val: any): number {
  if (val === null || val === undefined) return 0;
  if (typeof val === "object" && typeof val.toNumber === "function") {
    return val.toNumber();
  }
  const n = Number(val);
  return isNaN(n) ? 0 : n;
}

export interface Rates {
  rdRate?: number;
  pmRate?: number;
  qcRate?: number;
  integrationRate?: number;
  DEFAULT_RD_RATE?: number;
  DEFAULT_PM_RATE?: number;
  DEFAULT_QC_RATE?: number;
  DEFAULT_INTEGRATION_RATE?: number;
}

export interface ItemInput {
  rdDays?: any;
  pmDays?: any;
  qcDays?: any;
  integrationDays?: any;
}

/**
 * 計算單一功能細項的總工時與未稅金額
 */
export function calculateItem(item: ItemInput, rates: Rates) {
  const rdRate = rates.rdRate ?? rates.DEFAULT_RD_RATE ?? 0;
  const pmRate = rates.pmRate ?? rates.DEFAULT_PM_RATE ?? 0;
  const qcRate = rates.qcRate ?? rates.DEFAULT_QC_RATE ?? 0;
  const integrationRate = rates.integrationRate ?? rates.DEFAULT_INTEGRATION_RATE ?? 0;

  const rdDays = getDays(item.rdDays);
  const pmDays = getDays(item.pmDays);
  const qcDays = getDays(item.qcDays);
  const integrationDays = getDays(item.integrationDays);

  // 防範 JavaScript 浮點數計算精度誤差
  // 做法：將 days 乘以 10 轉換成整數再計算，最後除以 10
  const rdDaysInt = Math.round(rdDays * 10);
  const pmDaysInt = Math.round(pmDays * 10);
  const qcDaysInt = Math.round(qcDays * 10);
  const integrationDaysInt = Math.round(integrationDays * 10);

  const totalDays = (rdDaysInt + pmDaysInt + qcDaysInt + integrationDaysInt) / 10;
  
  // 金額計算
  const amount = (rdDaysInt * rdRate + pmDaysInt * pmRate + qcDaysInt * qcRate + integrationDaysInt * integrationRate) / 10;

  return {
    totalDays: roundToOneDecimal(totalDays),
    amount: Math.round(amount),
  };
}

/**
 * 計算整張報價單各角色總天數、未稅總額、營業稅與含稅總額
 */
export function calculateQuotation(items: ItemInput[], rates: Rates, taxRate = 0.05) {
  let totalRdInt = 0;
  let totalPmInt = 0;
  let totalQcInt = 0;
  let totalIntegrationInt = 0;
  let subtotal = 0;

  for (const item of items) {
    const rdDays = getDays(item.rdDays);
    const pmDays = getDays(item.pmDays);
    const qcDays = getDays(item.qcDays);
    const integrationDays = getDays(item.integrationDays);

    totalRdInt += Math.round(rdDays * 10);
    totalPmInt += Math.round(pmDays * 10);
    totalQcInt += Math.round(qcDays * 10);
    totalIntegrationInt += Math.round(integrationDays * 10);

    const calculated = calculateItem(item, rates);
    subtotal += calculated.amount;
  }

  const totalRdDays = totalRdInt / 10;
  const totalPmDays = totalPmInt / 10;
  const totalQcDays = totalQcInt / 10;
  const totalIntegrationDays = totalIntegrationInt / 10;
  const totalDays = (totalRdInt + totalPmInt + totalQcInt + totalIntegrationInt) / 10;

  const tax = Math.round(subtotal * taxRate);
  const total = subtotal + tax;

  return {
    totalRdDays: roundToOneDecimal(totalRdDays),
    totalPmDays: roundToOneDecimal(totalPmDays),
    totalQcDays: roundToOneDecimal(totalQcDays),
    totalIntegrationDays: roundToOneDecimal(totalIntegrationDays),
    totalDays: roundToOneDecimal(totalDays),
    subtotal,
    tax,
    total,
  };
}
