"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { calculateItem, calculateQuotation, parseRoles, type RoleDef } from "@/lib/calculator";
import { useUnsavedChangesGuard } from "@/hooks/useUnsavedChangesGuard";
import { useUI } from "@/components/ui";

interface ItemState {
  id?: string;
  description: string;
  days: Record<string, string>; // roleKey -> 天數字串（一位小數）
  note: string;
}

interface CategoryState {
  id?: string;
  name: string;
  items: ItemState[];
}

interface Vendor {
  id: string;
  name: string;
}

interface Template {
  id: string;
  name: string;
  isDefault: boolean;
  roles: RoleDef[];
  paymentTerms: string | null;
  notes: string | null;
}

interface QuotationFormProps {
  id?: string; // 編輯模式時傳入
  readOnly?: boolean; // 唯讀模式（歷史版本 / 已寄出以上狀態）
  readOnlyReason?: string;
  initialData?: any;
}

const inputClass =
  "w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-800 placeholder-slate-400 text-sm transition-all focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10 disabled:opacity-60";
const smallInputClass =
  "w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs focus:border-indigo-500 focus:outline-none disabled:opacity-60";

/** 天數輸入限制：非負、最多一位小數（對齊 DB Decimal 與計算精度） */
const DAYS_PATTERN = /^\d*(\.\d?)?$/;

function toDateInput(value: string | Date | null | undefined): string {
  if (!value) return "";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

function emptyItem(roles: RoleDef[]): ItemState {
  return {
    description: "",
    days: Object.fromEntries(roles.map((r) => [r.key, "0"])),
    note: "",
  };
}

export default function QuotationForm({ id, initialData, readOnly = false, readOnlyReason }: QuotationFormProps) {
  const router = useRouter();
  const { toast, confirm } = useUI();
  const isEditMode = !!id;

  // 基礎欄位 State
  const [title, setTitle] = useState(initialData?.title ?? "");
  const [vendorId, setVendorId] = useState(initialData?.vendorId ?? "");
  const [taxRate, setTaxRate] = useState(initialData?.taxRate ?? 0.05);

  // 動態角色欄位（含費率快照）
  const [roles, setRoles] = useState<RoleDef[]>(parseRoles(initialData?.roles));

  // 商務條件
  const [issueDate, setIssueDate] = useState(toDateInput(initialData?.issueDate) || toDateInput(new Date()));
  const [validUntil, setValidUntil] = useState(toDateInput(initialData?.validUntil));
  const [paymentTerms, setPaymentTerms] = useState(initialData?.paymentTerms ?? "");
  const [notes, setNotes] = useState(initialData?.notes ?? "");
  const [discount, setDiscount] = useState(String(initialData?.discount ?? 0));

  // 範本（僅新增模式提供切換）
  const [templates, setTemplates] = useState<Template[]>([]);
  const [templateId, setTemplateId] = useState("");

  // 大項與細項巢狀 State
  const [categories, setCategories] = useState<CategoryState[]>([]);

  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // 套用範本：角色欄位、費率與預設商務條件
  const applyTemplate = (template: Template, existingCategories?: CategoryState[]) => {
    const nextRoles = parseRoles(template.roles);
    setRoles(nextRoles);
    setTemplateId(template.id);
    // 範本有定義預設商務條件時直接套用（切換範本 = 採用該範本的預設值）
    if (template.paymentTerms) setPaymentTerms(template.paymentTerms);
    if (template.notes) setNotes(template.notes);

    if (existingCategories && existingCategories.length > 0) {
      // 已填資料時切換範本：同名角色（label）的工時保留，其餘丟棄
      const prevRoles = roles;
      const labelToOldKey = Object.fromEntries(prevRoles.map((r) => [r.label, r.key]));
      setCategories(
        existingCategories.map((cat) => ({
          ...cat,
          items: cat.items.map((item) => ({
            ...item,
            days: Object.fromEntries(
              nextRoles.map((r) => {
                const oldKey = r.key in item.days ? r.key : labelToOldKey[r.label];
                return [r.key, (oldKey && item.days[oldKey]) || "0"];
              })
            ),
          })),
        }))
      );
    } else {
      setCategories([{ name: "大項 1", items: [emptyItem(nextRoles)] }]);
    }
  };

  const handleTemplateChange = async (nextId: string) => {
    const template = templates.find((t) => t.id === nextId);
    if (!template) return;
    const hasData = categories.some((cat) =>
      cat.items.some((item) => item.description.trim() || Object.values(item.days).some((d) => parseFloat(d || "0") > 0))
    );
    if (hasData) {
      const ok = await confirm({
        title: "切換報價範本？",
        message: "同名的角色欄位工時會保留，其餘角色的工時將被捨棄。",
        confirmLabel: "切換範本",
      });
      if (!ok) return;
      applyTemplate(template, categories);
    } else {
      applyTemplate(template);
    }
  };

  // 初始化資料載入
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const vendorsRes = await fetch("/api/vendors");
        if (vendorsRes.ok) {
          const vendorsData = await vendorsRes.json();
          setVendors(vendorsData);

          // 若為新增模式且 URL 中帶有 vendorId 參數，則預設選中該廠商
          if (!isEditMode) {
            const urlParams = new URLSearchParams(window.location.search);
            const queryVendorId = urlParams.get("vendorId");
            if (queryVendorId && vendorsData.some((v: any) => v.id === queryVendorId)) {
              setVendorId(queryVendorId);
            }
          }
        }

        if (!isEditMode) {
          // 新增模式：載入範本並套用預設範本
          const templatesRes = await fetch("/api/templates");
          if (!templatesRes.ok) throw new Error("無法載入報價範本");
          const templatesData: Template[] = await templatesRes.json();
          setTemplates(templatesData);
          const defaultTemplate = templatesData.find((t) => t.isDefault) ?? templatesData[0];
          if (!defaultTemplate) {
            setErrorMessage("系統尚未建立任何報價範本，請先請管理員至「報價範本」頁建立。");
            return;
          }
          const nextRoles = parseRoles(defaultTemplate.roles);
          setRoles(nextRoles);
          setTemplateId(defaultTemplate.id);
          setPaymentTerms(defaultTemplate.paymentTerms ?? "");
          setNotes(defaultTemplate.notes ?? "");
          setCategories([{ name: "大項 1", items: [emptyItem(nextRoles)] }]);

          // 有效期限預設 30 天後
          const d = new Date();
          d.setDate(d.getDate() + 30);
          setValidUntil(toDateInput(d));
        } else if (initialData) {
          // 編輯模式：使用報價單自身的角色快照
          const snapshotRoles = parseRoles(initialData.roles);
          const mappedCats = (initialData.categories ?? []).map((cat: any) => ({
            id: cat.id,
            name: cat.name,
            items: (cat.items ?? []).map((item: any) => ({
              id: item.id,
              description: item.description,
              days: Object.fromEntries(
                snapshotRoles.map((r) => [r.key, String(item.days?.[r.key] ?? 0)])
              ),
              note: item.note ?? "",
            })),
          }));
          setCategories(mappedCats);
        }
      } catch (err: any) {
        setErrorMessage("載入基礎設定時發生錯誤，請重新整理頁面。");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditMode, initialData]);

  // 表單載入完成的那一刻拍一張「初始狀態」快照，之後任何欄位偏離快照都算有異動。
  const snapshotOf = () =>
    JSON.stringify({ title, vendorId, taxRate, roles, categories, issueDate, validUntil, paymentTerms, notes, discount });
  const [baselineSnapshot, setBaselineSnapshot] = useState<string | null>(null);
  useEffect(() => {
    if (!isLoading && baselineSnapshot === null) {
      setBaselineSnapshot(snapshotOf());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, baselineSnapshot]);

  const isDirty = !readOnly && baselineSnapshot !== null && snapshotOf() !== baselineSnapshot;
  useUnsavedChangesGuard(isDirty);

  // 即時計算
  const allItemsForCalc = categories.flatMap((cat) => cat.items);
  const totals = calculateQuotation(allItemsForCalc, roles, taxRate, parseInt(discount || "0", 10));

  // 費率微調（僅影響本張報價單）
  const updateRoleRate = (roleKey: string, value: string) => {
    if (value !== "" && !/^\d*$/.test(value)) return;
    setRoles(roles.map((r) => (r.key === roleKey ? { ...r, rate: parseInt(value || "0", 10) } : r)));
  };

  // 大項操作
  const addCategory = () => {
    setCategories([...categories, { name: `新大項 ${categories.length + 1}`, items: [emptyItem(roles)] }]);
  };

  const removeCategory = async (catIndex: number) => {
    if (categories.length <= 1) {
      toast("報價單必須至少包含一個大項", "error");
      return;
    }
    const ok = await confirm({
      title: "刪除此大項？",
      message: "此大項底下所有細項會一併刪除。",
      confirmLabel: "刪除",
      danger: true,
    });
    if (!ok) return;
    setCategories(categories.filter((_, i) => i !== catIndex));
  };

  const moveCategory = (catIndex: number, dir: -1 | 1) => {
    const target = catIndex + dir;
    if (target < 0 || target >= categories.length) return;
    const newCats = [...categories];
    [newCats[catIndex], newCats[target]] = [newCats[target], newCats[catIndex]];
    setCategories(newCats);
  };

  const updateCategoryName = (catIndex: number, newName: string) => {
    const newCats = [...categories];
    newCats[catIndex] = { ...newCats[catIndex], name: newName };
    setCategories(newCats);
  };

  // 細項操作
  const addItem = (catIndex: number) => {
    const newCats = [...categories];
    newCats[catIndex] = { ...newCats[catIndex], items: [...newCats[catIndex].items, emptyItem(roles)] };
    setCategories(newCats);
  };

  const removeItem = (catIndex: number, itemIndex: number) => {
    if (categories[catIndex].items.length <= 1) {
      toast("大項中必須至少包含一個細項", "error");
      return;
    }
    const newCats = [...categories];
    newCats[catIndex] = {
      ...newCats[catIndex],
      items: newCats[catIndex].items.filter((_, i) => i !== itemIndex),
    };
    setCategories(newCats);
  };

  const moveItem = (catIndex: number, itemIndex: number, dir: -1 | 1) => {
    const target = itemIndex + dir;
    const items = [...categories[catIndex].items];
    if (target < 0 || target >= items.length) return;
    [items[itemIndex], items[target]] = [items[target], items[itemIndex]];
    const newCats = [...categories];
    newCats[catIndex] = { ...newCats[catIndex], items };
    setCategories(newCats);
  };

  const updateItemField = (catIndex: number, itemIndex: number, field: "description" | "note", value: string) => {
    const newCats = [...categories];
    const items = [...newCats[catIndex].items];
    items[itemIndex] = { ...items[itemIndex], [field]: value };
    newCats[catIndex] = { ...newCats[catIndex], items };
    setCategories(newCats);
  };

  const updateItemDays = (catIndex: number, itemIndex: number, roleKey: string, value: string) => {
    if (value !== "" && !DAYS_PATTERN.test(value)) return;
    const newCats = [...categories];
    const items = [...newCats[catIndex].items];
    items[itemIndex] = { ...items[itemIndex], days: { ...items[itemIndex].days, [roleKey]: value } };
    newCats[catIndex] = { ...newCats[catIndex], items };
    setCategories(newCats);
  };

  // 提交報價單
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!title.trim()) {
      setErrorMessage("專案名稱為必填欄位");
      return;
    }
    if (!vendorId) {
      setErrorMessage("請選擇合作廠商");
      return;
    }

    const payload = {
      title: title.trim(),
      vendorId,
      taxRate: Number(taxRate),
      roles,
      issueDate,
      validUntil: validUntil || null,
      paymentTerms,
      notes,
      discount: parseInt(discount || "0", 10),
      categories: categories.map((cat) => ({
        name: cat.name,
        items: cat.items.map((item) => ({
          description: item.description,
          days: Object.fromEntries(roles.map((r) => [r.key, parseFloat(item.days[r.key] || "0")])),
          note: item.note,
        })),
      })),
    };

    try {
      setIsSubmitting(true);
      const url = isEditMode ? `/api/quotations/${id}` : "/api/quotations";
      const method = isEditMode ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "儲存報價單失敗");
      }

      setBaselineSnapshot(snapshotOf()); // 解除未儲存變更守衛
      toast(isEditMode ? `報價單 ${data.quotationNumber} 已更新` : `報價單 ${data.quotationNumber} 已建立`);
      router.push("/");
      router.refresh();
    } catch (err: any) {
      setErrorMessage(err.message || "通訊發生錯誤，請稍後再試。");
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
        <svg className="animate-spin h-10 w-10 text-indigo-600" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <p className="text-slate-500 text-sm font-medium">載入設定與資料中，請稍候...</p>
      </div>
    );
  }

  return (
    <form onSubmit={readOnly ? (e) => e.preventDefault() : handleSubmit} className="space-y-8 max-w-7xl mx-auto pb-16">
      {/* 唯讀模式警告條 */}
      {readOnly && (
        <div className="p-4 bg-amber-50 border border-amber-300 text-amber-800 rounded-2xl text-sm font-medium flex items-start gap-3">
          <span className="mt-0.5 text-lg">⚠️</span>
          <div>
            <p className="font-bold">{readOnlyReason ?? "此報價單處於唯讀狀態"}</p>
            <p className="text-xs mt-1 text-amber-700">如需調整內容，請使用「另存新版本」建立新的草稿版本。</p>
          </div>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-sm font-medium flex items-center gap-3">
          <span className="h-2 w-2 rounded-full bg-rose-600"></span>
          {errorMessage}
        </div>
      )}

      <fieldset disabled={readOnly || isSubmitting} className="space-y-8 min-w-0">
        {/* 區塊 1: 專案基本設定 */}
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 sm:p-8">
          <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-4 mb-6 flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-indigo-600"></span>
            專案基本資訊
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-2">
                專案報價名稱 <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="例如：2026 年度官網改版與 APP 開發專案"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-2">
                選擇合作廠商 <span className="text-rose-500">*</span>
              </label>
              <select
                required
                value={vendorId}
                onChange={(e) => setVendorId(e.target.value)}
                className={inputClass}
              >
                <option value="">-- 請選擇合作廠商 --</option>
                {vendors.map((vendor) => (
                  <option key={vendor.id} value={vendor.id}>
                    {vendor.name}
                  </option>
                ))}
              </select>
            </div>
            {!isEditMode && (
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-2">套用報價範本</label>
                <select
                  value={templateId}
                  onChange={(e) => handleTemplateChange(e.target.value)}
                  className={inputClass}
                >
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                      {t.isDefault ? "（預設）" : ""}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* 區塊 2: 商務條件 */}
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 sm:p-8">
          <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-4 mb-6 flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-emerald-600"></span>
            商務條件
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-2">報價日期</label>
              <input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-2">報價有效期限</label>
              <input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-2">營業稅率</label>
              <select value={taxRate} onChange={(e) => setTaxRate(Number(e.target.value))} className={inputClass}>
                <option value="0.05">5% (預設)</option>
                <option value="0">0% (免稅)</option>
                <option value="0.1">10%</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-2">整單折扣額（未稅前扣除）</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-3 flex items-center text-sm text-slate-400 pointer-events-none">$</span>
                <input
                  type="text"
                  value={discount}
                  onChange={(e) => {
                    if (e.target.value === "" || /^\d*$/.test(e.target.value)) setDiscount(e.target.value);
                  }}
                  className={`${inputClass} pl-7 text-right font-mono`}
                />
              </div>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-500 mb-2">付款條件</label>
              <input
                type="text"
                placeholder="例如：驗收完成後 30 日內電匯付款"
                value={paymentTerms}
                onChange={(e) => setPaymentTerms(e.target.value)}
                className={inputClass}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-500 mb-2">條款備註（將列印於報價單）</label>
              <input
                type="text"
                placeholder="例如：本報價單有效期限內有效，逾期需重新報價。"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>
        </div>

        {/* 區塊 3: 角色費率微調 */}
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 sm:p-8">
          <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-4 mb-6 flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-purple-600"></span>
            人天費率（僅影響本張報價單）
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {roles.map((role) => (
              <div key={role.key}>
                <label className="block text-xs font-semibold text-slate-500 mb-2">{role.label} (元/人天)</label>
                <input
                  type="text"
                  value={String(role.rate)}
                  onChange={(e) => updateRoleRate(role.key, e.target.value)}
                  className={`${inputClass} text-right font-mono`}
                />
              </div>
            ))}
          </div>
        </div>

        {/* 區塊 4: 報價項目 (大項與細項) */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
              <span className="flex h-6 w-1 bg-indigo-600 rounded-full"></span>
              報價大項與細項明細
            </h3>
            {!readOnly && (
              <button
                type="button"
                onClick={addCategory}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold shadow-sm hover:bg-indigo-500 active:scale-[0.98] transition-all"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                </svg>
                新增大項
              </button>
            )}
          </div>

          {categories.map((category, catIndex) => (
            <div
              key={catIndex}
              className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden group hover:border-slate-300 transition-all"
            >
              {/* 大項標題列 */}
              <div className="bg-slate-50/80 px-4 sm:px-6 py-4 border-b border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  {!readOnly && (
                    <div className="flex flex-col shrink-0">
                      <button
                        type="button"
                        onClick={() => moveCategory(catIndex, -1)}
                        disabled={catIndex === 0}
                        className="text-slate-400 hover:text-indigo-600 disabled:opacity-20 leading-none px-1 text-xs"
                        title="大項上移"
                      >
                        ▲
                      </button>
                      <button
                        type="button"
                        onClick={() => moveCategory(catIndex, 1)}
                        disabled={catIndex === categories.length - 1}
                        className="text-slate-400 hover:text-indigo-600 disabled:opacity-20 leading-none px-1 text-xs"
                        title="大項下移"
                      >
                        ▼
                      </button>
                    </div>
                  )}
                  <span className="flex items-center justify-center h-7 w-7 shrink-0 rounded-lg bg-indigo-100 text-indigo-700 font-bold text-xs">
                    {catIndex + 1}
                  </span>
                  <input
                    type="text"
                    required
                    placeholder="請輸入大項名稱 (如：系統建置、維護服務)"
                    value={category.name}
                    onChange={(e) => updateCategoryName(catIndex, e.target.value)}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white font-bold text-slate-800 text-sm focus:border-indigo-500 focus:outline-none w-full sm:w-80 disabled:opacity-60"
                  />
                </div>
                {!readOnly && (
                  <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                    <button
                      type="button"
                      onClick={() => addItem(catIndex)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-indigo-600 hover:text-white bg-indigo-50 hover:bg-indigo-600 rounded-lg transition-all"
                    >
                      新增細項 +
                    </button>
                    <button
                      type="button"
                      onClick={() => removeCategory(catIndex)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:text-white bg-rose-50 hover:bg-rose-600 rounded-lg transition-all"
                    >
                      刪除大項 ×
                    </button>
                  </div>
                )}
              </div>

              {/* 細項表格區（桌面） */}
              <div className="overflow-x-auto hidden sm:block">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-500/10 text-slate-500 font-semibold text-xs uppercase tracking-wider text-left">
                    <tr className="bg-slate-50/40">
                      {!readOnly && <th scope="col" className="px-2 py-3 w-[52px] text-center">排序</th>}
                      <th scope="col" className="px-4 py-3 min-w-[200px]">功能細項描述</th>
                      {roles.map((role) => (
                        <th key={role.key} scope="col" className="px-3 py-3 w-[90px] text-center">
                          {role.label}工時 (天)
                        </th>
                      ))}
                      <th scope="col" className="px-3 py-3 w-[90px] text-center">小計工時</th>
                      <th scope="col" className="px-3 py-3 w-[120px] text-right">小計金額 (元)</th>
                      <th scope="col" className="px-4 py-3 min-w-[130px]">備註</th>
                      {!readOnly && <th scope="col" className="px-4 py-3 w-[60px] text-center">操作</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {category.items.map((item, itemIndex) => {
                      const calc = calculateItem({ days: item.days }, roles);
                      return (
                        <tr key={itemIndex} className="hover:bg-slate-50/30 transition-colors">
                          {!readOnly && (
                            <td className="px-2 py-3 text-center">
                              <div className="flex flex-col items-center">
                                <button
                                  type="button"
                                  onClick={() => moveItem(catIndex, itemIndex, -1)}
                                  disabled={itemIndex === 0}
                                  className="text-slate-400 hover:text-indigo-600 disabled:opacity-20 leading-none text-[10px] p-0.5"
                                  title="細項上移"
                                >
                                  ▲
                                </button>
                                <button
                                  type="button"
                                  onClick={() => moveItem(catIndex, itemIndex, 1)}
                                  disabled={itemIndex === category.items.length - 1}
                                  className="text-slate-400 hover:text-indigo-600 disabled:opacity-20 leading-none text-[10px] p-0.5"
                                  title="細項下移"
                                >
                                  ▼
                                </button>
                              </div>
                            </td>
                          )}
                          <td className="px-4 py-3">
                            <input
                              type="text"
                              required
                              placeholder="如：使用者登入與 API 對接"
                              value={item.description}
                              onChange={(e) => updateItemField(catIndex, itemIndex, "description", e.target.value)}
                              className={smallInputClass}
                            />
                          </td>
                          {roles.map((role) => (
                            <td key={role.key} className="px-3 py-3">
                              <input
                                type="text"
                                inputMode="decimal"
                                value={item.days[role.key] ?? "0"}
                                onChange={(e) => updateItemDays(catIndex, itemIndex, role.key, e.target.value)}
                                className={`${smallInputClass} text-center px-1`}
                              />
                            </td>
                          ))}
                          <td className="px-3 py-3 text-center text-slate-500 font-semibold text-xs">{calc.totalDays}</td>
                          <td className="px-3 py-3 text-right font-bold text-slate-700 text-xs">
                            ${calc.amount.toLocaleString()}
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="text"
                              placeholder="選填備註說明"
                              value={item.note}
                              onChange={(e) => updateItemField(catIndex, itemIndex, "note", e.target.value)}
                              className={smallInputClass}
                            />
                          </td>
                          {!readOnly && (
                            <td className="px-4 py-3 text-center">
                              <button
                                type="button"
                                onClick={() => removeItem(catIndex, itemIndex)}
                                className="text-rose-500 hover:text-rose-700 font-bold"
                                title="刪除此細項"
                              >
                                <svg className="h-4 w-4 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* 細項卡片區（手機） */}
              <div className="sm:hidden divide-y divide-slate-100">
                {category.items.map((item, itemIndex) => {
                  const calc = calculateItem({ days: item.days }, roles);
                  return (
                    <div key={itemIndex} className="p-4 space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-slate-400">細項 {itemIndex + 1}</span>
                        {!readOnly && (
                          <div className="flex items-center gap-2">
                            <button type="button" onClick={() => moveItem(catIndex, itemIndex, -1)} disabled={itemIndex === 0} className="text-slate-400 disabled:opacity-20 text-xs">▲</button>
                            <button type="button" onClick={() => moveItem(catIndex, itemIndex, 1)} disabled={itemIndex === category.items.length - 1} className="text-slate-400 disabled:opacity-20 text-xs">▼</button>
                            <button type="button" onClick={() => removeItem(catIndex, itemIndex)} className="text-rose-500 text-xs font-semibold">刪除</button>
                          </div>
                        )}
                      </div>
                      <input
                        type="text"
                        required
                        placeholder="功能細項描述"
                        value={item.description}
                        onChange={(e) => updateItemField(catIndex, itemIndex, "description", e.target.value)}
                        className={smallInputClass}
                      />
                      <div className="grid grid-cols-2 gap-2">
                        {roles.map((role) => (
                          <label key={role.key} className="flex items-center gap-2 text-xs text-slate-500">
                            <span className="w-14 shrink-0 truncate">{role.label}</span>
                            <input
                              type="text"
                              inputMode="decimal"
                              value={item.days[role.key] ?? "0"}
                              onChange={(e) => updateItemDays(catIndex, itemIndex, role.key, e.target.value)}
                              className={`${smallInputClass} text-center`}
                            />
                          </label>
                        ))}
                      </div>
                      <input
                        type="text"
                        placeholder="選填備註說明"
                        value={item.note}
                        onChange={(e) => updateItemField(catIndex, itemIndex, "note", e.target.value)}
                        className={smallInputClass}
                      />
                      <div className="flex justify-between text-xs font-semibold text-slate-500">
                        <span>小計工時 {calc.totalDays} 天</span>
                        <span className="text-slate-700">${calc.amount.toLocaleString()}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* 區塊 5: 總計區與儲存按鈕 */}
        <div className="bg-slate-900 text-slate-100 rounded-3xl p-6 sm:p-8 shadow-xl flex flex-col md:flex-row justify-between items-start md:items-stretch gap-8">
          {/* 左側：工時明細 */}
          <div className="flex-1 space-y-4">
            <h3 className="text-md font-bold text-slate-400 border-b border-slate-800 pb-2 flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-indigo-400"></span>
              各角色總計工時明細
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
              {totals.perRole.map((role) => (
                <div key={role.key} className="bg-slate-800/50 p-3.5 rounded-2xl border border-slate-800">
                  <span className="block text-xs text-slate-500 font-semibold mb-1">{role.label} 總工時</span>
                  <span className="text-base font-bold text-white">
                    {role.totalDays} 天{" "}
                    <span className="text-xs text-slate-400 font-normal">(NT$ {role.amount.toLocaleString()})</span>
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* 右側：金額總計與操作 */}
          <div className="w-full md:w-80 flex flex-col justify-between border-t md:border-t-0 md:border-l border-slate-800 pt-6 md:pt-0 md:pl-8 gap-6">
            <div className="space-y-3.5 text-sm">
              <div className="flex justify-between items-center text-slate-400">
                <span>總工時累計:</span>
                <span className="font-semibold text-white">{totals.totalDays} 天</span>
              </div>
              <div className="flex justify-between items-center text-slate-400">
                <span>專案未稅總金額:</span>
                <span className="font-semibold text-white">${totals.subtotal.toLocaleString()}</span>
              </div>
              {totals.discount > 0 && (
                <div className="flex justify-between items-center text-slate-400">
                  <span>整單折扣:</span>
                  <span className="font-semibold text-rose-300">-${totals.discount.toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between items-center text-slate-400">
                <span>營業稅額 ({Math.round(taxRate * 100)}%):</span>
                <span className="font-semibold text-white">${totals.tax.toLocaleString()}</span>
              </div>
              <div className="border-t border-slate-800 my-2"></div>
              <div className="flex justify-between items-center">
                <span className="font-bold text-slate-400">含稅總計金額:</span>
                <span className="text-2xl font-extrabold text-indigo-400">${totals.total.toLocaleString()}</span>
              </div>
            </div>

            {!readOnly && (
              <div className="flex items-center gap-3">
                <Link
                  href="/"
                  className="flex-1 py-3 px-4 border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800 rounded-2xl text-sm font-semibold transition-all text-center"
                >
                  取消
                </Link>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-3 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-sm font-bold shadow-lg hover:shadow-indigo-500/20 active:scale-[0.98] transition-all disabled:bg-slate-700 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
                >
                  {isSubmitting ? (
                    <>
                      <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      儲存中...
                    </>
                  ) : (
                    "確認儲存"
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </fieldset>
    </form>
  );
}
