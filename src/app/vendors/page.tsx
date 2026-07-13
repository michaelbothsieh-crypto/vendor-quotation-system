"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { canCreate, canEdit } from "@/lib/permissions";
import { useUnsavedChangesGuard } from "@/hooks/useUnsavedChangesGuard";
import { useUI } from "@/components/ui";

const EMPTY_VENDOR_FORM = { name: "", taxId: "", contactName: "", contactEmail: "", contactPhone: "", address: "" };

interface Quotation {
  id: string;
  quotationNumber: string;
  title: string;
  status: string;
  createdAt: string;
}

interface Vendor {
  id: string;
  name: string;
  taxId: string | null;
  contactName: string;
  contactEmail: string;
  contactPhone: string | null;
  address: string | null;
  createdAt: string;
  updatedAt: string;
  quotations?: Quotation[];
}

export default function VendorsPage() {
  const { data: session } = useSession();
  const { toast, confirm } = useUI();
  const role = (session?.user as any)?.role;
  const allowEdit = canEdit(role);
  const allowCreate = canCreate(role);

  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 表單狀態
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [taxId, setTaxId] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [address, setAddress] = useState("");
  const [formBaseline, setFormBaseline] = useState(EMPTY_VENDOR_FORM);

  const isDirty =
    JSON.stringify({ name, taxId, contactName, contactEmail, contactPhone, address }) !==
    JSON.stringify(formBaseline);
  useUnsavedChangesGuard(isDirty);

  // 提交與操作狀態
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // 載入廠商列表
  const fetchVendors = async () => {
    try {
      const res = await fetch("/api/vendors");
      if (!res.ok) {
        throw new Error("無法取得廠商列表資料");
      }
      const data = await res.json();
      setVendors(data);
      setError(null);
    } catch (err: any) {
      setError(err.message || "發生未知錯誤");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchVendors();
  }, []);

  // 清除成功/失敗訊息的定時器
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  // 重設表單
  const resetForm = () => {
    setEditingId(null);
    setName("");
    setTaxId("");
    setContactName("");
    setContactEmail("");
    setContactPhone("");
    setAddress("");
    setSubmitError(null);
    setFormBaseline(EMPTY_VENDOR_FORM);
  };

  // 進入編輯模式
  const handleEditInit = (vendor: Vendor) => {
    setEditingId(vendor.id);
    setName(vendor.name);
    setTaxId(vendor.taxId || "");
    setContactName(vendor.contactName);
    setContactEmail(vendor.contactEmail);
    setContactPhone(vendor.contactPhone || "");
    setAddress(vendor.address || "");
    setSubmitError(null);
    setFormBaseline({
      name: vendor.name,
      taxId: vendor.taxId || "",
      contactName: vendor.contactName,
      contactEmail: vendor.contactEmail,
      contactPhone: vendor.contactPhone || "",
      address: vendor.address || "",
    });
    // 滾動到表單位置（手機版體驗佳）
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // 刪除廠商（後端會擋下仍有報價單的廠商，保護歷史報價紀錄）
  const handleDelete = async (id: string, vendorName: string) => {
    const ok = await confirm({
      title: `刪除廠商「${vendorName}」？`,
      message: "僅能刪除沒有任何報價單的廠商，此動作無法還原。",
      confirmLabel: "刪除",
      danger: true,
    });
    if (!ok) return;

    try {
      const res = await fetch(`/api/vendors/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "刪除廠商失敗");
      }

      setSuccessMessage(`已成功刪除廠商「${vendorName}」`);
      // 如果正在編輯該廠商，則重設表單
      if (editingId === id) {
        resetForm();
      }
      fetchVendors();
    } catch (err: any) {
      toast(err.message, "error");
    }
  };

  // 刪除報價單
  const handleDeleteQuotation = async (id: string, quotationNumber: string) => {
    const ok = await confirm({
      title: `刪除報價單「${quotationNumber}」？`,
      message: "此動作將同時刪除所有歷史版本，無法還原。",
      confirmLabel: "刪除",
      danger: true,
    });
    if (!ok) return;

    try {
      const res = await fetch(`/api/quotations/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "刪除報價單失敗");
      }

      setSuccessMessage(`已成功刪除報價單「${quotationNumber}」`);
      fetchVendors();
    } catch (err: any) {
      toast(err.message, "error");
    }
  };

  // 提交表單（新增或修改）
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError(null);

    // 基本驗證
    if (!name.trim() || !contactName.trim() || !contactEmail.trim()) {
      setSubmitError("廠商名稱、聯絡人與聯絡信箱為必填欄位");
      setIsSubmitting(false);
      return;
    }

    if (taxId.trim() && !/^\d{8}$/.test(taxId.trim())) {
      setSubmitError("統一編號格式不正確，應為 8 位數純數字");
      setIsSubmitting(false);
      return;
    }

    const payload = {
      name: name.trim(),
      taxId: taxId.trim() || null,
      contactName: contactName.trim(),
      contactEmail: contactEmail.trim(),
      contactPhone: contactPhone.trim() || null,
      address: address.trim() || null,
    };

    try {
      const url = editingId ? `/api/vendors/${editingId}` : "/api/vendors";
      const method = editingId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "提交表單失敗");
      }

      setSuccessMessage(
        editingId
          ? `廠商「${payload.name}」資料已更新`
          : `成功新增廠商「${payload.name}」`
      );

      resetForm();
      fetchVendors();
    } catch (err: any) {
      setSubmitError(err.message || "伺服器通訊錯誤");
    } finally {
      setIsSubmitting(false);
    }
  };

  // 過濾搜尋
  const filteredVendors = vendors.filter((v) => {
    const query = searchQuery.toLowerCase();
    return (
      v.name.toLowerCase().includes(query) ||
      v.contactName.toLowerCase().includes(query) ||
      (v.taxId && v.taxId.includes(query))
    );
  });

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800">
      {/* 頂部裝飾條與導覽 */}
      <div className="h-1.5 w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600"></div>

      <header className="bg-white border-b border-slate-200 py-5 px-6 sm:px-12">
        <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 dark:from-slate-50 dark:via-indigo-200 dark:to-slate-50 bg-clip-text text-transparent">
          合作廠商資料庫
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          建立與管理報價單系統的外部供應商基本資料
        </p>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 全域成功通知浮窗 */}
        {successMessage && (
          <div className="fixed bottom-5 right-5 z-50 transform translate-y-0 opacity-100 transition-all duration-300">
            <div className="bg-slate-900 text-white px-5 py-3 rounded-xl shadow-xl flex items-center gap-3 border border-slate-800">
              <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <p className="text-sm font-medium">{successMessage}</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* 左欄：列表顯示 */}
          <div className="lg:col-span-7 xl:col-span-8 flex flex-col gap-6">
            {/* 搜尋與控制區 */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row gap-4 items-center">
              <div className="relative w-full">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
                  <svg
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                </span>
                <input
                  type="text"
                  placeholder="搜尋廠商名稱、聯絡人或統一編號..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-800 placeholder-slate-400 text-sm transition-all focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10"
                />
              </div>
              <div className="flex-shrink-0 text-xs text-slate-400 font-medium whitespace-nowrap">
                共 {filteredVendors.length} 家廠商
              </div>
            </div>

            {/* 列表內容 */}
            {isLoading ? (
              // 載入骨架屏
              <div className="space-y-4">
                {[1, 2, 3].map((n) => (
                  <div
                    key={n}
                    className="bg-white p-6 rounded-2xl border border-slate-200/85 animate-pulse flex flex-col gap-3"
                  >
                    <div className="h-6 w-1/3 bg-slate-200 rounded"></div>
                    <div className="h-4 w-2/3 bg-slate-100 rounded"></div>
                    <div className="h-4 w-1/2 bg-slate-100 rounded"></div>
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="bg-red-50 border border-red-200/80 rounded-2xl p-6 text-center text-red-600">
                <p className="text-sm font-semibold">{error}</p>
                <button
                  onClick={fetchVendors}
                  className="mt-3 px-4 py-1.5 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg text-xs font-semibold transition-colors"
                >
                  重新整理
                </button>
              </div>
            ) : filteredVendors.length === 0 ? (
              <div className="bg-white border border-slate-200/80 rounded-2xl p-12 text-center text-slate-400 shadow-sm">
                <svg
                  className="mx-auto h-12 w-12 text-slate-300"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                  />
                </svg>
                <h3 className="mt-4 text-sm font-semibold text-slate-700">
                  沒有找到任何廠商
                </h3>
                <p className="mt-2 text-xs text-slate-500">
                  請嘗試修改搜尋關鍵字，或在右側新增一家合作廠商。
                </p>
              </div>
            ) : (
              // 廠商卡片列表
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredVendors.map((vendor) => (
                  <div
                    key={vendor.id}
                    className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 flex flex-col justify-between hover:shadow-md hover:border-slate-300/80 transition-all duration-300 group"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-1">
                          {vendor.name}
                        </h3>
                        {vendor.taxId && (
                          <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-xxs font-medium text-slate-600 whitespace-nowrap">
                            統編 {vendor.taxId}
                          </span>
                        )}
                      </div>

                      <div className="mt-4 space-y-2 text-xs text-slate-600">
                        {/* 聯絡窗口 */}
                        <div className="flex items-start gap-2">
                          <span className="font-semibold text-slate-400 w-12 flex-shrink-0">
                            窗口:
                          </span>
                          <span className="font-medium text-slate-700">
                            {vendor.contactName}
                          </span>
                        </div>
                        {/* 信箱 */}
                        <div className="flex items-start gap-2">
                          <span className="font-semibold text-slate-400 w-12 flex-shrink-0">
                            信箱:
                          </span>
                          <a
                            href={`mailto:${vendor.contactEmail}`}
                            className="hover:underline hover:text-indigo-600 truncate break-all"
                          >
                            {vendor.contactEmail}
                          </a>
                        </div>
                        {/* 電話 */}
                        {vendor.contactPhone && (
                          <div className="flex items-start gap-2">
                            <span className="font-semibold text-slate-400 w-12 flex-shrink-0">
                              電話:
                            </span>
                            <span>{vendor.contactPhone}</span>
                          </div>
                        )}
                        {/* 地址 */}
                        {vendor.address && (
                          <div className="flex items-start gap-2">
                            <span className="font-semibold text-slate-400 w-12 flex-shrink-0">
                              地址:
                            </span>
                            <span className="line-clamp-2">{vendor.address}</span>
                          </div>
                        )}
                      </div>

                      {/* 報價單列表 */}
                      <div className="mt-4 pt-4 border-t border-slate-100">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-bold text-slate-800 flex items-center gap-1">
                            <svg className="h-4 w-4 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            專案報價單 ({vendor.quotations?.length || 0})
                          </span>
                          <Link
                            href={`/quotations/new?vendorId=${vendor.id}`}
                            className="text-xxs font-bold text-indigo-600 hover:text-indigo-850 flex items-center gap-0.5"
                          >
                            + 新增報價單
                          </Link>
                        </div>
                        {vendor.quotations && vendor.quotations.length > 0 ? (
                          <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                            {vendor.quotations.map((q) => (
                              <div
                                key={q.id}
                                className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-100 hover:border-slate-200 transition-colors gap-2"
                              >
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-1.5 mb-0.5">
                                    <span className="inline-block px-1.5 py-0.5 text-xxs font-semibold bg-indigo-50 text-indigo-700 rounded border border-indigo-100/50">
                                      {q.quotationNumber}
                                    </span>
                                    <span className="text-xxs text-slate-400">
                                      {new Date(q.createdAt).toLocaleDateString("zh-TW")}
                                    </span>
                                  </div>
                                  <p className="text-xs font-semibold text-slate-700 truncate">
                                    {q.title}
                                  </p>
                                </div>
                                {allowEdit && (
                                  <div className="flex items-center gap-1.5">
                                    <Link
                                      href={`/quotations/${q.id}/edit`}
                                      className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-white rounded border border-transparent hover:border-slate-100 transition-all"
                                      title="編輯報價單"
                                    >
                                      <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                                        <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                                      </svg>
                                    </Link>
                                    <button
                                      onClick={() => handleDeleteQuotation(q.id, q.quotationNumber)}
                                      className="p-1 text-slate-400 hover:text-rose-600 hover:bg-white rounded border border-transparent hover:border-slate-100 transition-all"
                                      title="刪除報價單"
                                    >
                                      <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                      </svg>
                                    </button>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xxs text-slate-400 text-center py-2 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                            目前無此廠商的報價單
                          </p>
                        )}
                      </div>
                    </div>

                    {allowEdit && (
                    <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleEditInit(vendor)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
                      >
                        <svg
                          className="h-3.5 w-3.5"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                        </svg>
                        編輯
                      </button>
                      <button
                        onClick={() => handleDelete(vendor.id, vendor.name)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors"
                      >
                        <svg
                          className="h-3.5 w-3.5"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path
                            fillRule="evenodd"
                            d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                            clipRule="evenodd"
                          />
                        </svg>
                        刪除
                      </button>
                    </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 右欄：表單（僅檢視者無此欄，因無新增/編輯權限） */}
          <div className="lg:col-span-5 xl:col-span-4 sticky top-6">
            {!(editingId ? allowEdit : allowCreate) ? (
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-md p-6 text-center text-sm text-slate-500">
                目前角色僅可查看廠商資料，無新增/編輯權限。
              </div>
            ) : (
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-md p-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-5">
                <h2 className="font-bold text-slate-900 flex items-center gap-2">
                  <span className="flex h-2.5 w-2.5 rounded-full bg-indigo-600"></span>
                  {editingId ? "編輯廠商資料" : "新增合作廠商"}
                </h2>
                {editingId && (
                  <button
                    onClick={resetForm}
                    className="text-xs font-semibold text-slate-500 hover:text-slate-700 transition-colors"
                  >
                    取消編輯
                  </button>
                )}
              </div>

              {submitError && (
                <div className="mb-4 p-3 bg-rose-50 border border-rose-100 text-rose-600 rounded-xl text-xs font-medium">
                  {submitError}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* 廠商名稱 */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                    廠商名稱 <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="請輸入廠商官方全名"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-800 placeholder-slate-400 text-sm transition-all focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10"
                  />
                </div>

                {/* 統一編號 */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                    統一編號 (統編)
                  </label>
                  <input
                    type="text"
                    maxLength={8}
                    placeholder="請輸入 8 位數統一編號 (選填)"
                    value={taxId}
                    onChange={(e) => setTaxId(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-800 placeholder-slate-400 text-sm transition-all focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10"
                  />
                </div>

                {/* 聯絡人姓名 */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                    聯絡人姓名 <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="例如：林專員、張經理"
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-800 placeholder-slate-400 text-sm transition-all focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10"
                  />
                </div>

                {/* 聯絡信箱 */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                    聯絡信箱 (Email) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="請輸入聯絡人電子郵件"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-800 placeholder-slate-400 text-sm transition-all focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10"
                  />
                </div>

                {/* 聯絡電話 */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                    聯絡電話
                  </label>
                  <input
                    type="text"
                    placeholder="手機或分機號碼 (選填)"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-800 placeholder-slate-400 text-sm transition-all focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10"
                  />
                </div>

                {/* 廠商地址 */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                    廠商地址
                  </label>
                  <textarea
                    rows={2}
                    placeholder="請輸入廠商登記或聯絡地址 (選填)"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-800 placeholder-slate-400 text-sm transition-all focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10 resize-none"
                  />
                </div>

                {/* 提交按鈕 */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full mt-4 inline-flex justify-center items-center rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-md hover:bg-indigo-500 active:scale-[0.98] transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:bg-indigo-400 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      處理中...
                    </span>
                  ) : editingId ? (
                    "儲存修改"
                  ) : (
                    "新增廠商"
                  )}
                </button>
              </form>
            </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
