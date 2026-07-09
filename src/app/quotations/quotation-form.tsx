"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { calculateItem, calculateQuotation } from "@/lib/calculator";
import { useUnsavedChangesGuard } from "@/hooks/useUnsavedChangesGuard";

interface ItemState {
  id?: string;
  description: string;
  rdDays: string;
  pmDays: string;
  qcDays: string;
  integrationDays: string;
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

interface QuotationFormProps {
  id?: string; // 編輯模式時傳入
  readOnly?: boolean; // 唯讀模式（歷史封存版本使用）
  initialData?: {
    title: string;
    vendorId: string;
    taxRate: number;
    rdRate: number;
    pmRate: number;
    qcRate: number;
    integrationRate: number;
    version?: number;
    categories: any[];
  };
}

export default function QuotationForm({ id, initialData, readOnly = false }: QuotationFormProps) {
  const router = useRouter();
  const isEditMode = !!id;

  // 基礎欄位 State
  const [title, setTitle] = useState(initialData?.title ?? "");
  const [vendorId, setVendorId] = useState(initialData?.vendorId ?? "");
  const [taxRate, setTaxRate] = useState(initialData?.taxRate ?? 0.05);

  // 費率 State
  const [rdRate, setRdRate] = useState(initialData?.rdRate ?? 8000);
  const [pmRate, setPmRate] = useState(initialData?.pmRate ?? 6000);
  const [qcRate, setQcRate] = useState(initialData?.qcRate ?? 5000);
  const [integrationRate, setIntegrationRate] = useState(initialData?.integrationRate ?? 6500);

  // 大項與細項巢狀 State
  const [categories, setCategories] = useState<CategoryState[]>([]);

  // 廠商清單與預設費率載入
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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

        // 2. 如果是新增模式，載入系統設定的預設費率
        if (!isEditMode) {
          const settingsRes = await fetch("/api/settings");
          if (settingsRes.ok) {
            const settingsData = await settingsRes.json();
            setRdRate(settingsData.DEFAULT_RD_RATE ?? 8000);
            setPmRate(settingsData.DEFAULT_PM_RATE ?? 6000);
            setQcRate(settingsData.DEFAULT_QC_RATE ?? 5000);
            setIntegrationRate(settingsData.DEFAULT_INTEGRATION_RATE ?? 6500);
          }

          // 預設給一個空的大項
          setCategories([
            {
              name: "大項 1",
              items: [
                {
                  description: "",
                  rdDays: "0",
                  pmDays: "0",
                  qcDays: "0",
                  integrationDays: "0",
                  note: "",
                },
              ],
            },
          ]);
        } else if (initialData) {
          // 編輯模式：將傳入的 initialData 轉換成編輯 Form 的結構
          const mappedCats = initialData.categories.map((cat: any) => ({
            id: cat.id,
            name: cat.name,
            items: cat.items.map((item: any) => ({
              id: item.id,
              description: item.description,
              rdDays: String(item.rdDays ?? 0),
              pmDays: String(item.pmDays ?? 0),
              qcDays: String(item.qcDays ?? 0),
              integrationDays: String(item.integrationDays ?? 0),
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
  }, [isEditMode, initialData]);

  // 表單載入完成的那一刻拍一張「初始狀態」快照，之後任何欄位偏離快照都算有異動。
  const [baselineSnapshot, setBaselineSnapshot] = useState<string | null>(null);
  useEffect(() => {
    if (!isLoading && baselineSnapshot === null) {
      setBaselineSnapshot(JSON.stringify({ title, vendorId, taxRate, rdRate, pmRate, qcRate, integrationRate, categories }));
    }
  }, [isLoading, baselineSnapshot, title, vendorId, taxRate, rdRate, pmRate, qcRate, integrationRate, categories]);

  const isDirty =
    !readOnly &&
    baselineSnapshot !== null &&
    JSON.stringify({ title, vendorId, taxRate, rdRate, pmRate, qcRate, integrationRate, categories }) !== baselineSnapshot;
  useUnsavedChangesGuard(isDirty);

  // 即時計算費率與總工時
  const currentRates = { rdRate, pmRate, qcRate, integrationRate };
  const allItemsForCalc = categories.flatMap((cat) => cat.items);
  const totals = calculateQuotation(allItemsForCalc, currentRates, taxRate);

  // 大項操作
  const addCategory = () => {
    setCategories([
      ...categories,
      {
        name: `新大項 ${categories.length + 1}`,
        items: [
          {
            description: "",
            rdDays: "0",
            pmDays: "0",
            qcDays: "0",
            integrationDays: "0",
            note: "",
          },
        ],
      },
    ]);
  };

  const removeCategory = (catIndex: number) => {
    if (categories.length <= 1) {
      alert("報價單必須至少包含一個大項");
      return;
    }
    if (confirm("確定要刪除此大項及其底下所有的細項嗎？")) {
      const newCats = [...categories];
      newCats.splice(catIndex, 1);
      setCategories(newCats);
    }
  };

  const updateCategoryName = (catIndex: number, newName: string) => {
    const newCats = [...categories];
    newCats[catIndex].name = newName;
    setCategories(newCats);
  };

  // 細項操作
  const addItem = (catIndex: number) => {
    const newCats = [...categories];
    newCats[catIndex].items.push({
      description: "",
      rdDays: "0",
      pmDays: "0",
      qcDays: "0",
      integrationDays: "0",
      note: "",
    });
    setCategories(newCats);
  };

  const removeItem = (catIndex: number, itemIndex: number) => {
    const newCats = [...categories];
    if (newCats[catIndex].items.length <= 1) {
      alert("大項中必須至少包含一個細項");
      return;
    }
    newCats[catIndex].items.splice(itemIndex, 1);
    setCategories(newCats);
  };

  const updateItemField = (
    catIndex: number,
    itemIndex: number,
    field: keyof ItemState,
    value: string
  ) => {
    const newCats = [...categories];
    // 限制天數輸入框只能輸入數字、小數點
    if (["rdDays", "pmDays", "qcDays", "integrationDays"].includes(field)) {
      // 容許空值或符合數字格式
      if (value !== "" && !/^\d*\.?\d*$/.test(value)) {
        return;
      }
    }
    newCats[catIndex].items[itemIndex] = {
      ...newCats[catIndex].items[itemIndex],
      [field]: value,
    };
    setCategories(newCats);
  };

  // 提交報價單
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // 基本驗證
    if (!title.trim()) {
      setErrorMessage("專案名稱為必填欄位");
      return;
    }
    if (!vendorId) {
      setErrorMessage("請選擇合作廠商");
      return;
    }

    // 格式化 categories & items 轉為 API 能接收的格式
    const formattedCategories = categories.map((cat) => ({
      name: cat.name,
      items: cat.items.map((item) => ({
        description: item.description.trim() || "未命名細項",
        rdDays: parseFloat(item.rdDays || "0"),
        pmDays: parseFloat(item.pmDays || "0"),
        qcDays: parseFloat(item.qcDays || "0"),
        integrationDays: parseFloat(item.integrationDays || "0"),
        note: item.note.trim() || null,
      })),
    }));

    const payload = {
      title: title.trim(),
      vendorId,
      taxRate: parseFloat(String(taxRate)),
      rdRate: parseInt(String(rdRate), 10),
      pmRate: parseInt(String(pmRate), 10),
      qcRate: parseInt(String(qcRate), 10),
      integrationRate: parseInt(String(integrationRate), 10),
      categories: formattedCategories,
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

      router.push("/vendors"); // 儲存成功後跳轉回廠商列表頁面 (或首頁)
      router.refresh();
    } catch (err: any) {
      setErrorMessage(err.message || "通訊發生錯誤，請稍後再試。");
    } finally {
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
      {/* 唯讀模式歷史版本警告條 */}
      {readOnly && (
        <div className="p-4 bg-amber-50 border border-amber-300 text-amber-800 rounded-2xl text-sm font-medium flex items-start gap-3">
          <span className="mt-0.5 text-lg">⚠️</span>
          <div>
            <p className="font-bold">此為歷史封存版本（v{initialData?.version ?? "?"}），處於唯讀狀態</p>
            <p className="text-xs mt-1 text-amber-700">歷史版本不開放修改，如需調整請返回首頁找到最新版本進行編輯。</p>
          </div>
        </div>
      )}

      {errorMessage && !readOnly && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-sm font-medium flex items-center gap-3">
          <span className="h-2 w-2 rounded-full bg-rose-600"></span>
          {errorMessage}
        </div>
      )}

      {/* 區塊 1: 專案基本設定 */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 sm:p-8">
        <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-4 mb-6 flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-indigo-600"></span>
          專案基本資訊
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
              className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-800 placeholder-slate-400 text-sm transition-all focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10"
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
              className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-800 text-sm transition-all focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10"
            >
              <option value="">-- 請選擇合作廠商 --</option>
              {vendors.map((vendor) => (
                <option key={vendor.id} value={vendor.id}>
                  {vendor.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 區塊 2: 費率與稅率微調 */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 sm:p-8">
        <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-4 mb-6 flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-purple-600"></span>
          人天費率與稅率設定
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-2">
              RD 費率 (元/人天)
            </label>
            <input
              type="number"
              min="0"
              value={rdRate}
              onChange={(e) => setRdRate(Number(e.target.value))}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-800 text-sm transition-all focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-2">
              PM 費率 (元/人天)
            </label>
            <input
              type="number"
              min="0"
              value={pmRate}
              onChange={(e) => setPmRate(Number(e.target.value))}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-800 text-sm transition-all focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-2">
              QC 費率 (元/人天)
            </label>
            <input
              type="number"
              min="0"
              value={qcRate}
              onChange={(e) => setQcRate(Number(e.target.value))}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-800 text-sm transition-all focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-2">
              整合費率 (元/人天)
            </label>
            <input
              type="number"
              min="0"
              value={integrationRate}
              onChange={(e) => setIntegrationRate(Number(e.target.value))}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-800 text-sm transition-all focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10"
            />
          </div>
          <div className="col-span-2 sm:col-span-1">
            <label className="block text-xs font-semibold text-slate-500 mb-2">
              營業稅率 (%)
            </label>
            <select
              value={taxRate}
              onChange={(e) => setTaxRate(Number(e.target.value))}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-800 text-sm transition-all focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10"
            >
              <option value="0.05">5% (預設)</option>
              <option value="0">0% (免稅)</option>
              <option value="0.1">10%</option>
            </select>
          </div>
        </div>
      </div>

      {/* 區塊 3: 報價項目 (大項與細項) */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
            <span className="flex h-6 w-1 bg-indigo-600 rounded-full"></span>
            報價大項與細項明細
          </h3>
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
        </div>

        {categories.map((category, catIndex) => (
          <div
            key={catIndex}
            className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden group hover:border-slate-300 transition-all"
          >
            {/* 大項標題列 */}
            <div className="bg-slate-50/80 px-6 py-4 border-b border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <span className="flex items-center justify-center h-7 w-7 rounded-lg bg-indigo-100 text-indigo-700 font-bold text-xs">
                  {catIndex + 1}
                </span>
                <input
                  type="text"
                  required
                  placeholder="請輸入大項名稱 (如：系統建置、維護服務)"
                  value={category.name}
                  onChange={(e) => updateCategoryName(catIndex, e.target.value)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white font-bold text-slate-800 text-sm focus:border-indigo-500 focus:outline-none w-full sm:w-80"
                />
              </div>
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
            </div>

            {/* 細項表格區 */}
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-500/10 text-slate-500 font-semibold text-xs uppercase tracking-wider text-left">
                  <tr className="bg-slate-50/40">
                    <th scope="col" className="px-6 py-3 min-w-[200px]">功能細項描述</th>
                    <th scope="col" className="px-3 py-3 w-[90px] text-center">RD工時 (天)</th>
                    <th scope="col" className="px-3 py-3 w-[90px] text-center">PM工時 (天)</th>
                    <th scope="col" className="px-3 py-3 w-[90px] text-center">QC工時 (天)</th>
                    <th scope="col" className="px-3 py-3 w-[90px] text-center">整合工時 (天)</th>
                    <th scope="col" className="px-3 py-3 w-[90px] text-center">小計工時</th>
                    <th scope="col" className="px-3 py-3 w-[120px] text-right">小計金額 (元)</th>
                    <th scope="col" className="px-6 py-3 min-w-[150px]">備註</th>
                    <th scope="col" className="px-6 py-3 w-[60px] text-center">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {category.items.map((item, itemIndex) => {
                    // 計算此項目的天數與金額小計
                    const calc = calculateItem(item, currentRates);
                    return (
                      <tr key={itemIndex} className="hover:bg-slate-50/30 transition-colors">
                        <td className="px-6 py-3">
                          <input
                            type="text"
                            required
                            placeholder="如：使用者登入與 API 對接"
                            value={item.description}
                            onChange={(e) =>
                              updateItemField(catIndex, itemIndex, "description", e.target.value)
                            }
                            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs focus:border-indigo-500 focus:outline-none"
                          />
                        </td>
                        <td className="px-3 py-3">
                          <input
                            type="text"
                            value={item.rdDays}
                            onChange={(e) =>
                              updateItemField(catIndex, itemIndex, "rdDays", e.target.value)
                            }
                            className="w-full text-center px-1 py-1.5 rounded-lg border border-slate-200 text-xs focus:border-indigo-500 focus:outline-none"
                          />
                        </td>
                        <td className="px-3 py-3">
                          <input
                            type="text"
                            value={item.pmDays}
                            onChange={(e) =>
                              updateItemField(catIndex, itemIndex, "pmDays", e.target.value)
                            }
                            className="w-full text-center px-1 py-1.5 rounded-lg border border-slate-200 text-xs focus:border-indigo-500 focus:outline-none"
                          />
                        </td>
                        <td className="px-3 py-3">
                          <input
                            type="text"
                            value={item.qcDays}
                            onChange={(e) =>
                              updateItemField(catIndex, itemIndex, "qcDays", e.target.value)
                            }
                            className="w-full text-center px-1 py-1.5 rounded-lg border border-slate-200 text-xs focus:border-indigo-500 focus:outline-none"
                          />
                        </td>
                        <td className="px-3 py-3">
                          <input
                            type="text"
                            value={item.integrationDays}
                            onChange={(e) =>
                              updateItemField(catIndex, itemIndex, "integrationDays", e.target.value)
                            }
                            className="w-full text-center px-1 py-1.5 rounded-lg border border-slate-200 text-xs focus:border-indigo-500 focus:outline-none"
                          />
                        </td>
                        <td className="px-3 py-3 text-center text-slate-500 font-semibold text-xs">
                          {calc.totalDays}
                        </td>
                        <td className="px-3 py-3 text-right font-bold text-slate-700 text-xs">
                          ${calc.amount.toLocaleString()}
                        </td>
                        <td className="px-6 py-3">
                          <input
                            type="text"
                            placeholder="選填備註說明"
                            value={item.note}
                            onChange={(e) =>
                              updateItemField(catIndex, itemIndex, "note", e.target.value)
                            }
                            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs focus:border-indigo-500 focus:outline-none"
                          />
                        </td>
                        <td className="px-6 py-3 text-center">
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
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>

      {/* 區塊 4: 總計區與儲存按鈕 */}
      <div className="bg-slate-900 text-slate-100 rounded-3xl p-6 sm:p-8 shadow-xl flex flex-col md:flex-row justify-between items-start md:items-stretch gap-8">
        {/* 左側：工時明細 */}
        <div className="flex-1 space-y-4">
          <h3 className="text-md font-bold text-slate-400 border-b border-slate-800 pb-2 flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-indigo-400"></span>
            各角色總計工時明細
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <div className="bg-slate-800/50 p-3.5 rounded-2xl border border-slate-800">
              <span className="block text-xs text-slate-500 font-semibold mb-1">RD 總工時</span>
              <span className="text-base font-bold text-white">
                {totals.totalRdDays} 天 <span className="text-xs text-slate-400 font-normal">(NT$ {totals.totalRdAmount.toLocaleString()})</span>
              </span>
            </div>
            <div className="bg-slate-800/50 p-3.5 rounded-2xl border border-slate-800">
              <span className="block text-xs text-slate-500 font-semibold mb-1">PM 總工時</span>
              <span className="text-base font-bold text-white">
                {totals.totalPmDays} 天 <span className="text-xs text-slate-400 font-normal">(NT$ {totals.totalPmAmount.toLocaleString()})</span>
              </span>
            </div>
            <div className="bg-slate-800/50 p-3.5 rounded-2xl border border-slate-800">
              <span className="block text-xs text-slate-500 font-semibold mb-1">QC 總工時</span>
              <span className="text-base font-bold text-white">
                {totals.totalQcDays} 天 <span className="text-xs text-slate-400 font-normal">(NT$ {totals.totalQcAmount.toLocaleString()})</span>
              </span>
            </div>
            <div className="bg-slate-800/50 p-3.5 rounded-2xl border border-slate-800">
              <span className="block text-xs text-slate-500 font-semibold mb-1">整合總工時</span>
              <span className="text-base font-bold text-white">
                {totals.totalIntegrationDays} 天 <span className="text-xs text-slate-400 font-normal">(NT$ {totals.totalIntegrationAmount.toLocaleString()})</span>
              </span>
            </div>
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
            <div className="flex justify-between items-center text-slate-400">
              <span>營業稅額 ({taxRate * 100}%):</span>
              <span className="font-semibold text-white">${totals.tax.toLocaleString()}</span>
            </div>
            <div className="border-t border-slate-800 my-2"></div>
            <div className="flex justify-between items-center">
              <span className="font-bold text-slate-400">含稅總計金額:</span>
              <span className="text-2xl font-extrabold text-indigo-400">${totals.total.toLocaleString()}</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/vendors"
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
        </div>
      </div>
    </form>
  );
}
