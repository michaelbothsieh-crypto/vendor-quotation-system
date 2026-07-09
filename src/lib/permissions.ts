export type Role = "ADMIN" | "EDITOR" | "VIEWER";

export const ROLES: Role[] = ["ADMIN", "EDITOR", "VIEWER"];

const ROLE_LABELS: Record<Role, string> = {
  ADMIN: "管理員（可異動）",
  EDITOR: "編輯者（僅可新增）",
  VIEWER: "檢視者（僅可查看）",
};

export function roleLabel(role: Role): string {
  return ROLE_LABELS[role];
}

// 舊資料相容：seed 建立過的帳號可能還留著早期的 "USER" 角色值，
// 視為等同 EDITOR（沿用它原本擁有的新增/編輯權限，不因改版被降權）。
export function normalizeRole(role: string | null | undefined): Role {
  if (role === "ADMIN" || role === "EDITOR" || role === "VIEWER") return role;
  if (role === "USER") return "EDITOR";
  return "VIEWER";
}

export function isAdmin(role: string | null | undefined): boolean {
  return normalizeRole(role) === "ADMIN";
}

export function canCreate(role: string | null | undefined): boolean {
  const r = normalizeRole(role);
  return r === "ADMIN" || r === "EDITOR";
}

export function canEdit(role: string | null | undefined): boolean {
  return isAdmin(role);
}

/** 建立新資料需 EDITOR 以上，異動/刪除需 ADMIN。 */
const CREATABLE_API_PREFIXES = ["/api/vendors", "/api/quotations"];
/** 沒有「新增」概念、寫入即視為異動全域設定，一律限 ADMIN。 */
const ADMIN_ONLY_WRITE_API_PREFIXES = ["/api/settings"];

export function checkApiPermission(
  pathname: string,
  method: string,
  role: string | null | undefined
): { allowed: boolean; error?: string } {
  if (method === "GET" || method === "HEAD") return { allowed: true };

  if (ADMIN_ONLY_WRITE_API_PREFIXES.some((p) => pathname.startsWith(p))) {
    return canEdit(role) ? { allowed: true } : { allowed: false, error: "權限不足：僅管理員可異動系統設定" };
  }

  const isCreatable = CREATABLE_API_PREFIXES.some((p) => pathname.startsWith(p));
  if (!isCreatable) return { allowed: true };

  if (method === "POST") {
    return canCreate(role) ? { allowed: true } : { allowed: false, error: "權限不足：僅檢視者無法新增" };
  }
  // PUT / PATCH / DELETE 等異動操作
  return canEdit(role) ? { allowed: true } : { allowed: false, error: "權限不足：僅管理員可異動或刪除" };
}
