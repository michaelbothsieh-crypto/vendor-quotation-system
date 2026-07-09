/**
 * 報價計算核心：角色欄位為動態定義（來自範本或報價單快照），
 * 工時以「乘 10 轉整數」計算，避免 JavaScript 浮點誤差（工時固定一位小數）。
 */

export interface RoleDef {
  key: string;
  label: string;
  rate: number;
}

export interface ItemInput {
  days?: Record<string, unknown> | null;
}

/** 將浮點數精確四捨五入到小數點第一位 */
export function roundToOneDecimal(num: number): number {
  return Math.round((num + Number.EPSILON) * 10) / 10;
}

/** 解析各種可能的 days 輸入（字串、數字、null） */
export function parseDays(val: unknown): number {
  if (val === null || val === undefined || val === "") return 0;
  const n = Number(val);
  return isNaN(n) || n < 0 ? 0 : n;
}

/** 工時轉為「十分之一天」整數，計算一律走整數運算 */
function daysToInt(val: unknown): number {
  return Math.round(parseDays(val) * 10);
}

/** 計算單一功能細項的總工時與未稅金額 */
export function calculateItem(item: ItemInput, roles: RoleDef[]) {
  let totalDaysInt = 0;
  let amountTenth = 0;
  for (const role of roles) {
    const dInt = daysToInt(item.days?.[role.key]);
    totalDaysInt += dInt;
    amountTenth += dInt * role.rate;
  }
  return {
    totalDays: totalDaysInt / 10,
    amount: Math.round(amountTenth / 10),
  };
}

export interface RoleSummary extends RoleDef {
  totalDays: number;
  amount: number;
}

/** 計算整張報價單：各角色總天數/金額、未稅小計、折扣、營業稅與含稅總額 */
export function calculateQuotation(
  items: ItemInput[],
  roles: RoleDef[],
  taxRate = 0.05,
  discount = 0
) {
  const roleDaysInt: Record<string, number> = {};
  let subtotal = 0;

  for (const item of items) {
    for (const role of roles) {
      roleDaysInt[role.key] = (roleDaysInt[role.key] ?? 0) + daysToInt(item.days?.[role.key]);
    }
    subtotal += calculateItem(item, roles).amount;
  }

  const perRole: RoleSummary[] = roles.map((role) => ({
    ...role,
    totalDays: (roleDaysInt[role.key] ?? 0) / 10,
    amount: Math.round(((roleDaysInt[role.key] ?? 0) * role.rate) / 10),
  }));

  const totalDays = Object.values(roleDaysInt).reduce((a, b) => a + b, 0) / 10;
  const safeDiscount = Math.min(Math.max(Math.round(discount || 0), 0), subtotal);
  const taxable = subtotal - safeDiscount;
  const tax = Math.round(taxable * taxRate);

  return {
    perRole,
    totalDays,
    subtotal,
    discount: safeDiscount,
    taxable,
    tax,
    total: taxable + tax,
  };
}

/** 從 API 回傳的 Json 欄位安全還原角色定義 */
export function parseRoles(raw: unknown): RoleDef[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((r): r is Record<string, unknown> => !!r && typeof r === "object")
    .map((r) => ({
      key: String(r.key ?? ""),
      label: String(r.label ?? ""),
      rate: Math.max(0, Math.round(Number(r.rate) || 0)),
    }))
    .filter((r) => r.key !== "");
}
