import { Prisma } from "@prisma/client";
import { parseRoles, roundToOneDecimal, type RoleDef } from "@/lib/calculator";

/** 產生台北時區當日流水單號 Q-YYYYMMDD-NNN（需在交易內呼叫確保原子性） */
export async function generateQuotationNumber(tx: Prisma.TransactionClient): Promise<string> {
  const d = new Intl.DateTimeFormat("zh-TW", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = d.formatToParts(new Date());
  const get = (type: string) => parts.find((p) => p.type === type)?.value || "";
  const prefix = `Q-${get("year")}${get("month")}${get("day")}-`;

  const dailyQuotations = await tx.quotation.findMany({
    where: { quotationNumber: { startsWith: prefix } },
    select: { quotationNumber: true },
  });

  let nextSeq = 1;
  const seqs = dailyQuotations
    .map((q) => parseInt(q.quotationNumber.split("-").pop() ?? "", 10))
    .filter((seq) => !isNaN(seq));
  if (seqs.length > 0) {
    nextSeq = Math.max(...seqs) + 1;
  }
  return `${prefix}${String(nextSeq).padStart(3, "0")}`;
}

/** 從廠商資料建立報價單快照欄位 */
export function buildVendorSnapshot(vendor: {
  name: string;
  taxId: string | null;
  contactName: string;
  contactEmail: string;
  contactPhone: string | null;
  address: string | null;
}) {
  return {
    vendorName: vendor.name,
    vendorTaxId: vendor.taxId,
    vendorContactName: vendor.contactName,
    vendorContactEmail: vendor.contactEmail,
    vendorContactPhone: vendor.contactPhone,
    vendorAddress: vendor.address,
  };
}

export class PayloadError extends Error {}

/** RoleDef[] 轉為 Prisma Json 欄位可接受的型別 */
export function jsonRoles(roles: RoleDef[]): Prisma.InputJsonValue {
  return roles as unknown as Prisma.InputJsonValue;
}

/** 驗證並正規化角色定義（至少一個角色，費率為非負整數） */
export function normalizeRolesPayload(raw: unknown): RoleDef[] {
  const roles = parseRoles(raw);
  if (roles.length === 0) {
    throw new PayloadError("報價單至少需要一個工時角色欄位");
  }
  const keys = new Set(roles.map((r) => r.key));
  if (keys.size !== roles.length) {
    throw new PayloadError("角色欄位識別碼重複");
  }
  if (roles.some((r) => !r.label.trim())) {
    throw new PayloadError("角色欄位名稱不可為空白");
  }
  return roles;
}

interface CategoryCreateInput {
  name: string;
  sortOrder: number;
  items: {
    create: {
      description: string;
      days: Record<string, number>;
      note: string | null;
      sortOrder: number;
    }[];
  };
}

/** 驗證並正規化大項/細項 payload，工時裁切到一位小數（對齊前端顯示與計算） */
export function normalizeCategoriesPayload(raw: unknown, roles: RoleDef[]): CategoryCreateInput[] {
  if (!Array.isArray(raw) || raw.length === 0) {
    throw new PayloadError("報價單至少需要一個功能大項");
  }
  return raw.map((cat: any, catIndex: number) => {
    const items = Array.isArray(cat?.items) ? cat.items : [];
    if (items.length === 0) {
      throw new PayloadError(`大項「${cat?.name ?? catIndex + 1}」至少需要一個細項`);
    }
    return {
      name: String(cat?.name ?? "").trim() || `大項 ${catIndex + 1}`,
      sortOrder: catIndex,
      items: {
        create: items.map((item: any, itemIndex: number) => {
          const days: Record<string, number> = {};
          for (const role of roles) {
            const rawVal = item?.days?.[role.key];
            const n = rawVal === undefined || rawVal === null || rawVal === "" ? 0 : Number(rawVal);
            if (isNaN(n) || n < 0) {
              throw new PayloadError("工時天數必須為大於或等於 0 的有效數字");
            }
            days[role.key] = roundToOneDecimal(n);
          }
          return {
            description: String(item?.description ?? "").trim() || "未命名細項",
            days,
            note: String(item?.note ?? "").trim() || null,
            sortOrder: itemIndex,
          };
        }),
      },
    };
  });
}

/** 驗證並正規化商務條件欄位 */
export function normalizeCommercialPayload(body: any) {
  const issueDate = body.issueDate ? new Date(body.issueDate) : new Date();
  if (isNaN(issueDate.getTime())) throw new PayloadError("報價日期格式不正確");

  let validUntil: Date | null = null;
  if (body.validUntil) {
    validUntil = new Date(body.validUntil);
    if (isNaN(validUntil.getTime())) throw new PayloadError("有效期限格式不正確");
  }

  const discount = Math.round(Number(body.discount) || 0);
  if (discount < 0) throw new PayloadError("折扣金額不可為負數");

  const taxRate = Number(body.taxRate);
  if (isNaN(taxRate) || taxRate < 0 || taxRate > 1) throw new PayloadError("稅率格式不正確");

  return {
    issueDate,
    validUntil,
    discount,
    taxRate,
    paymentTerms: String(body.paymentTerms ?? "").trim() || null,
    notes: String(body.notes ?? "").trim() || null,
  };
}

export const QUOTATION_INCLUDE = {
  vendor: true,
  categories: {
    orderBy: { sortOrder: "asc" as const },
    include: {
      items: { orderBy: { sortOrder: "asc" as const } },
    },
  },
};
