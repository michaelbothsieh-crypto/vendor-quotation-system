"use client";

import Link from "next/link";
import { Fragment, useEffect, useState } from "react";
import { calculateQuotation, parseRoles } from "@/lib/calculator";
import { useSession } from "next-auth/react";
import { canCreate, canEdit } from "@/lib/permissions";
import { useUI } from "@/components/ui";

interface Vendor {
  id: string;
  name: string;
}

interface Quotation {
  id: string;
  quotationNumber: string;
  title: string;
  status: string;
  version: number;
  isLatest: boolean;
  taxRate: number;
  discount: number;
  roles: unknown;
  createdAt: string;
  vendor: Vendor;
  categories: {
    id: string;
    items: { days: Record<string, unknown> }[];
  }[];
}

interface HistoryQuotation {
  id: string;
  quotationNumber: string;
  title: string;
  version: number;
  isLatest: boolean;
  createdAt: string;
}

export default function DashboardPage() {
  const { data: session } = useSession();
  const { toast, confirm } = useUI();
  const role = (session?.user as any)?.role;
  const allowEdit = canEdit(role);
  const allowCreate = canCreate(role);

  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 版本歷史相關 State
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});
  const [historyMap, setHistoryMap] = useState<Record<string, HistoryQuotation[]>>({});
  const [historyLoading, setHistoryLoading] = useState<Record<string, boolean>>({});

  const fetchQuotations = async () => {
    try {
      const res = await fetch("/api/quotations");
      if (!res.ok) {
        throw new Error("無法取得報價單列表資料");
      }
      const data = await res.json();
      setQuotations(data);
      setError(null);
    } catch (err: any) {
      setError(err.message || "發生未知錯誤");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchQuotations();
  }, []);

  const handleDelete = async (id: string, quotationNumber: string) => {
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

      toast(`已成功刪除報價單「${quotationNumber}」`);
      fetchQuotations();
    } catch (err: any) {
      toast(err.message, "error");
    }
  };

  // 狀態轉換動作定義
  const STATUS_ACTIONS: Record<string, { label: string; target: string; adminOnly: boolean; confirmTitle: string; danger?: boolean }[]> = {
    DRAFT: [{ label: "送核", target: "SENT", adminOnly: false, confirmTitle: "送出待核？送核後內容將鎖定，修改需另存新版本。" }],
    SENT: [
      { label: "核准", target: "APPROVED", adminOnly: true, confirmTitle: "核准此報價單？核准後內容將永久鎖定。" },
      { label: "拒絕", target: "REJECTED", adminOnly: true, confirmTitle: "拒絕此報價單？", danger: true },
      { label: "撤回", target: "DRAFT", adminOnly: true, confirmTitle: "撤回為草稿？撤回後可再次編輯。" },
    ],
  };

  const handleStatusChange = async (q: Quotation, target: string, confirmTitle: string, danger?: boolean) => {
    const ok = await confirm({
      title: `${q.quotationNumber}`,
      message: confirmTitle,
      confirmLabel: "確認",
      danger,
    });
    if (!ok) return;
    try {
      const res = await fetch(`/api/quotations/${q.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: target }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "變更狀態失敗");
      toast(`報價單「${q.quotationNumber}」狀態已更新`);
      fetchQuotations();
    } catch (err: any) {
      toast(err.message, "error");
    }
  };

  const handleDuplicate = async (q: Quotation) => {
    try {
      const res = await fetch(`/api/quotations/${q.id}/duplicate`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "複製報價單失敗");
      toast(`已建立複本「${data.quotationNumber}」（草稿）`);
      fetchQuotations();
    } catch (err: any) {
      toast(err.message, "error");
    }
  };

  // 展開/收起歷史版本
  const toggleHistory = async (quotationId: string, qNumber: string) => {
    if (expandedIds[quotationId]) {
      // 收起
      setExpandedIds((prev) => ({ ...prev, [quotationId]: false }));
      return;
    }

    // 已撈過就直接展開
    if (historyMap[quotationId]) {
      setExpandedIds((prev) => ({ ...prev, [quotationId]: true }));
      return;
    }

    // 撈取該單號下的所有版本（排除當前最新版）
    setHistoryLoading((prev) => ({ ...prev, [quotationId]: true }));
    try {
      const res = await fetch(
        `/api/quotations?allVersions=true&quotationNumber=${encodeURIComponent(qNumber)}`
      );
      if (res.ok) {
        const data: HistoryQuotation[] = await res.json();
        // 只保留歷史版本（非最新版本）
        const historyOnly = data.filter((q) => q.id !== quotationId && !q.isLatest);
        setHistoryMap((prev) => ({ ...prev, [quotationId]: historyOnly }));
      }
    } catch (e) {
      console.error("載入歷史版本失敗:", e);
    } finally {
      setHistoryLoading((prev) => ({ ...prev, [quotationId]: false }));
      setExpandedIds((prev) => ({ ...prev, [quotationId]: true }));
    }
  };

  // 過濾搜尋
  const filteredQuotations = quotations.filter((q) => {
    const query = searchQuery.toLowerCase();
    return (
      q.title.toLowerCase().includes(query) ||
      q.quotationNumber.toLowerCase().includes(query) ||
      q.vendor.name.toLowerCase().includes(query)
    );
  });

  // 狀態翻譯與顏色對應
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "APPROVED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold border border-emerald-200/50">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
            已核准
          </span>
        );
      case "SENT":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold border border-blue-200/50">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-500"></span>
            待核
          </span>
        );
      case "REJECTED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 text-xs font-semibold border border-rose-200">
            <span className="h-1.5 w-1.5 rounded-full bg-rose-500"></span>
            已拒絕
          </span>
        );
      case "DRAFT":
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-50 text-slate-600 text-xs font-semibold border border-slate-200">
            <span className="h-1.5 w-1.5 rounded-full bg-slate-400"></span>
            草稿
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 flex flex-col justify-between">
      {/* 頂部裝飾條 */}
      <div className="h-1.5 w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600"></div>

      {/* 頁面標題（導覽按鈕已搬到全域固定的 AppHeader，切換頁面時不會消失） */}
      <div className="bg-white border-b border-slate-200/60 px-4 sm:px-6 lg:px-8 py-6">
        <div className="max-w-7xl mx-auto w-full">
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 dark:from-slate-50 dark:via-indigo-200 dark:to-slate-50 bg-clip-text text-transparent">
            報價單與供應商儀表板
          </h1>
          <p className="text-slate-500 text-sm mt-1.5 leading-relaxed">
            檢視歷史報價單紀錄，快速檢索估算明細，並進行格式化輸出。
          </p>
        </div>
      </div>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-10">

        {/* 搜尋列 */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm mb-6 flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="relative w-full sm:max-w-md">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </span>
            <input
              type="text"
              placeholder="搜尋報價單號、專案名稱或合作廠商..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-800 placeholder-slate-400 text-sm transition-all focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10"
            />
          </div>
          <div className="text-xs text-slate-400 font-medium whitespace-nowrap">
            共找到 {filteredQuotations.length} 筆報價單
          </div>
        </div>

        {/* 報價單表格 */}
        {isLoading ? (
          // 骨架屏
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="p-6 divide-y divide-slate-100 space-y-4 animate-pulse">
              {[1, 2, 3, 4].map((n) => (
                <div key={n} className="pt-4 first:pt-0 flex items-center justify-between gap-4">
                  <div className="space-y-2 flex-1">
                    <div className="h-5 w-1/4 bg-slate-200 rounded"></div>
                    <div className="h-4 w-1/2 bg-slate-100 rounded"></div>
                  </div>
                  <div className="h-5 w-16 bg-slate-100 rounded"></div>
                </div>
              ))}
            </div>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200/80 rounded-2xl p-8 text-center text-red-650 shadow-sm">
            <p className="text-sm font-semibold">{error}</p>
            <button
              onClick={fetchQuotations}
              className="mt-3 px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg text-xs font-semibold transition-colors"
            >
              重新載入
            </button>
          </div>
        ) : filteredQuotations.length === 0 ? (
          <div className="bg-white border border-slate-200/80 rounded-2xl p-16 text-center text-slate-400 shadow-sm">
            <svg className="mx-auto h-14 w-14 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="mt-4 text-base font-bold text-slate-700">尚未建立報價單</h3>
            <p className="mt-2 text-xs text-slate-500">
              請嘗試修改關鍵字，或點擊右上角「建立新報價單」。
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200/80 text-slate-500 font-semibold">
                    <th className="py-4 px-4 w-8"></th>
                    <th className="py-4 px-4">單號</th>
                    <th className="py-4 px-4">專案名稱</th>
                    <th className="py-4 px-4">合作廠商</th>
                    <th className="py-4 px-4 text-right">總工時</th>
                    <th className="py-4 px-4 text-right">含稅總額</th>
                    <th className="py-4 px-4 text-center">狀態</th>
                    <th className="py-4 px-4">建立時間</th>
                    <th className="py-4 px-4 text-center">動作</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredQuotations.map((q) => {
                    const items = q.categories.flatMap((cat: any) => cat.items);
                    const summary = calculateQuotation(items, parseRoles(q.roles), q.taxRate, q.discount);
                    const isExpanded = expandedIds[q.id];
                    const isHistLoading = historyLoading[q.id];
                    const historyItems = historyMap[q.id] ?? [];

                    return (
                      <Fragment key={q.id}>
                        <tr className="hover:bg-slate-50/50 transition-colors border-b border-slate-100">
                          {/* 展開按鈕欄（版本 > 1 才顯示） */}
                          <td className="py-4 px-4">
                            {q.version > 1 && (
                              <button
                                onClick={() => toggleHistory(q.id, q.quotationNumber)}
                                className="p-1 rounded text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                                title={isExpanded ? "收起歷史版本" : "展開歷史版本"}
                              >
                                <svg
                                  className={`h-4 w-4 transition-transform duration-200 ${isExpanded ? "rotate-90" : ""}`}
                                  fill="none" viewBox="0 0 24 24" stroke="currentColor"
                                >
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                              </button>
                            )}
                          </td>
                          <td className="py-4 px-4 font-mono text-xs font-bold text-slate-750">
                            <div className="flex items-center gap-2">
                              <span className="inline-block px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-lg border border-indigo-100/50">
                                {q.quotationNumber}
                              </span>
                              {q.version > 1 && (
                                <span className="inline-block px-1.5 py-0.5 bg-violet-100 text-violet-700 rounded text-[10px] font-bold border border-violet-200/60">
                                  v{q.version}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-4 px-4 font-bold text-slate-900 max-w-[200px]">
                            <div className="truncate" title={q.title}>{q.title}</div>
                          </td>
                          <td className="py-4 px-4 font-medium text-slate-700 truncate max-w-[150px]" title={q.vendor.name}>
                            {q.vendor.name}
                          </td>
                          <td className="py-4 px-4 text-right font-mono text-slate-600 font-medium">
                            {summary.totalDays} 人天
                          </td>
                          <td className="py-4 px-4 text-right font-mono font-bold text-slate-900">
                            ${summary.total.toLocaleString()}
                          </td>
                          <td className="py-4 px-4 text-center">
                            {getStatusBadge(q.status)}
                          </td>
                          <td className="py-4 px-4 text-slate-500 font-mono text-xs">
                            {new Date(q.createdAt).toLocaleDateString("zh-TW")}
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex items-center justify-center gap-2">
                              {/* 狀態流程操作 */}
                              {(STATUS_ACTIONS[q.status] ?? [])
                                .filter((a) => (a.adminOnly ? allowEdit : allowCreate))
                                .map((a) => (
                                  <button
                                    key={a.target}
                                    onClick={() => handleStatusChange(q, a.target, a.confirmTitle, a.danger)}
                                    className={`inline-flex items-center px-2.5 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                                      a.danger
                                        ? "text-rose-600 bg-rose-50 hover:bg-rose-100"
                                        : a.target === "APPROVED"
                                          ? "text-emerald-700 bg-emerald-50 hover:bg-emerald-100"
                                          : "text-blue-700 bg-blue-50 hover:bg-blue-100"
                                    }`}
                                    title={a.confirmTitle}
                                  >
                                    {a.label}
                                  </button>
                                ))}
                              {allowCreate && (
                                <button
                                  onClick={() => handleDuplicate(q)}
                                  className="inline-flex items-center px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200"
                                  title="以此單內容建立新草稿"
                                >
                                  複製
                                </button>
                              )}
                              <Link
                                href={`/quotations/${q.id}/print`}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-indigo-650 hover:text-indigo-750 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
                                title="預覽/列印"
                              >
                                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                                </svg>
                                列印
                              </Link>
                              {allowEdit && (
                              <Link
                                href={`/quotations/${q.id}/edit`}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200"
                                title="編輯"
                              >
                                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                </svg>
                                編輯
                              </Link>
                              )}
                              {allowEdit && (
                              <button
                                onClick={() => handleDelete(q.id, q.quotationNumber)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors border border-transparent hover:border-rose-100"
                                title="刪除"
                              >
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                              )}
                            </div>
                          </td>
                        </tr>

                        {/* 歷史版本子表格（展開時渲染） */}
                        {isExpanded && (
                          <tr key={`${q.id}-history`}>
                            <td colSpan={9} className="px-6 py-0 bg-indigo-50/30">
                              <div className="border-l-4 border-indigo-200 pl-4 py-3 my-2">
                                <p className="text-xs font-semibold text-indigo-700 mb-2">
                                  📜 {q.quotationNumber} 的版本變更歷史紀錄
                                </p>
                                {isHistLoading ? (
                                  <p className="text-xs text-slate-400 animate-pulse">載入歷史版本中...</p>
                                ) : historyItems.length === 0 ? (
                                  <p className="text-xs text-slate-400">無更早的歷史版本</p>
                                ) : (
                                  <table className="w-full text-xs">
                                    <thead>
                                      <tr className="text-slate-500 text-left border-b border-indigo-100">
                                        <th className="pb-1.5 pr-4 font-semibold">版本</th>
                                        <th className="pb-1.5 pr-4 font-semibold">專案名稱</th>
                                        <th className="pb-1.5 pr-4 font-semibold">建立時間</th>
                                        <th className="pb-1.5 font-semibold">操作</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {historyItems.map((hq) => (
                                        <tr key={hq.id} className="border-t border-indigo-100/60">
                                          <td className="py-1.5 pr-4">
                                            <span className="inline-block px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-bold border border-slate-200/60">
                                              v{hq.version}
                                            </span>
                                          </td>
                                          <td className="py-1.5 pr-4 text-slate-600 truncate max-w-[200px]" title={hq.title}>
                                            {hq.title}
                                          </td>
                                          <td className="py-1.5 pr-4 text-slate-500 font-mono">
                                            {new Date(hq.createdAt).toLocaleString("zh-TW")}
                                          </td>
                                          <td className="py-1.5">
                                            <div className="flex items-center gap-3">
                                              <Link
                                                href={`/quotations/${hq.id}/print`}
                                                target="_blank"
                                                className="text-indigo-600 hover:text-indigo-800 hover:underline font-medium"
                                              >
                                                列印預覽
                                              </Link>
                                              <Link
                                                href={`/quotations/${hq.id}/edit`}
                                                className="text-slate-500 hover:text-slate-700 hover:underline"
                                              >
                                                唯讀查看
                                              </Link>
                                            </div>
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      <footer className="py-8 text-center text-xs text-slate-400 border-t border-slate-200/60 bg-white">
        © 2026 外包廠商報價管理系統. All Rights Reserved.
      </footer>
    </div>
  );
}
