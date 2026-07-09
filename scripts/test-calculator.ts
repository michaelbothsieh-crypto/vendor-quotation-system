/**
 * 計算核心自我檢查：npx tsx scripts/test-calculator.ts
 * 驗證動態角色的浮點精度、折扣與稅額計算。
 */
import { calculateItem, calculateQuotation, parseRoles } from "../src/lib/calculator";
import assert from "node:assert";

const roles = parseRoles([
  { key: "rd", label: "RD", rate: 8000 },
  { key: "pm", label: "PM", rate: 6000 },
  { key: "qc", label: "QC", rate: 5000 },
  { key: "integration", label: "整合", rate: 6500 },
]);

// 單一細項：0.1 + 0.2 系列的浮點陷阱
const item = { days: { rd: 1.5, pm: 0.5, qc: 0.3, integration: 0.1 } };
const calc = calculateItem(item, roles);
assert.strictEqual(calc.totalDays, 2.4, `totalDays 應為 2.4，實得 ${calc.totalDays}`);
// 1.5*8000 + 0.5*6000 + 0.3*5000 + 0.1*6500 = 12000+3000+1500+650 = 17150
assert.strictEqual(calc.amount, 17150, `amount 應為 17150，實得 ${calc.amount}`);

// 整張報價單：多筆 0.1/0.2 累加不得出現浮點誤差
const items = [
  { days: { rd: 1.1, pm: 0.1, qc: 0.1, integration: 0.1 } },
  { days: { rd: 0.2, pm: 0.2, qc: 0.2, integration: 0.2 } },
  { days: { rd: 0.7, pm: 0.2, qc: 0.2, integration: 0.2 } },
];
const summary = calculateQuotation(items, roles, 0.05, 1000);
assert.strictEqual(summary.perRole[0].totalDays, 2, `RD 總天數應為 2，實得 ${summary.perRole[0].totalDays}`);
assert.strictEqual(summary.totalDays, 3.5, `總天數應為 3.5，實得 ${summary.totalDays}`);
// subtotal = 2*8000 + 0.5*6000 + 0.5*5000 + 0.5*6500 = 16000+3000+2500+3250 = 24750
assert.strictEqual(summary.subtotal, 24750, `未稅小計應為 24750，實得 ${summary.subtotal}`);
assert.strictEqual(summary.discount, 1000);
assert.strictEqual(summary.taxable, 23750);
assert.strictEqual(summary.tax, 1188, `稅額應為 1188，實得 ${summary.tax}`);
assert.strictEqual(summary.total, 24938);

// 折扣不可超過小計
const overDiscount = calculateQuotation(items, roles, 0.05, 999999);
assert.strictEqual(overDiscount.taxable, 0);
assert.strictEqual(overDiscount.total, 0);

// 未知角色 key 的工時不列入計算
const strayItem = { days: { rd: 1, ghost: 99 } };
assert.strictEqual(calculateItem(strayItem, roles).amount, 8000);

console.log("✅ calculator 全部自我檢查通過");
