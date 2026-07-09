"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { canEdit } from "@/lib/permissions";

export default function SettingsPage() {
  const { data: session } = useSession();
  const allowEdit = canEdit((session?.user as any)?.role);

  const [rdRate, setRdRate] = useState<string>("8000");
  const [pmRate, setPmRate] = useState<string>("6000");
  const [qcRate, setQcRate] = useState<string>("5000");
  const [integrationRate, setIntegrationRate] = useState<string>("6500");

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fetchSettings = async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/settings");
      if (!res.ok) {
        throw new Error("無法取得費率設定資料");
      }
      const data = await res.json();
      setRdRate(String(data.DEFAULT_RD_RATE ?? 8000));
      setPmRate(String(data.DEFAULT_PM_RATE ?? 6000));
      setQcRate(String(data.DEFAULT_QC_RATE ?? 5000));
      setIntegrationRate(String(data.DEFAULT_INTEGRATION_RATE ?? 6500));
      setError(null);
    } catch (err: any) {
      setError(err.message || "載入設定時發生未知錯誤");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  // 成功訊息自動淡出
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccessMessage(null);

    // 基本驗證
    const rates = {
      DEFAULT_RD_RATE: Number(rdRate),
      DEFAULT_PM_RATE: Number(pmRate),
      DEFAULT_QC_RATE: Number(qcRate),
      DEFAULT_INTEGRATION_RATE: Number(integrationRate),
    };

    for (const [key, val] of Object.entries(rates)) {
      if (isNaN(val) || val < 0 || !Number.isInteger(val)) {
        setError(`所有費率欄位皆必須是零或正整數`);
        setIsSubmitting(false);
        return;
      }
    }

    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(rates),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "儲存費率設定失敗");
      }

      setSuccessMessage("系統預設費率設定已儲存成功！");
    } catch (err: any) {
      setError(err.message || "伺服器通訊錯誤");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 flex flex-col">
      {/* 頂部裝飾條與導覽 */}
      <div className="h-1.5 w-full bg-gradient-to-r from-violet-600 via-indigo-600 to-purple-600"></div>

      <header className="bg-white border-b border-slate-200 py-5 px-6 sm:px-12 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 dark:from-slate-50 dark:via-indigo-200 dark:to-slate-50 bg-clip-text text-transparent">
            系統費率設定
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            設定報價系統中各開發角色（RD、PM、QC、整合）的預設人天費率 (TWD)
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition-all hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          >
            ← 返回首頁
          </Link>
        </div>
      </header>

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-12 flex flex-col items-center">
        {/* 全域成功通知浮窗 */}
        {successMessage && (
          <div className="fixed bottom-5 right-5 z-50 transform translate-y-0 opacity-100 transition-all duration-300">
            <div className="bg-slate-900 text-white px-5 py-3 rounded-xl shadow-xl flex items-center gap-3 border border-slate-800">
              <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <p className="text-sm font-medium">{successMessage}</p>
            </div>
          </div>
        )}

        <div className="w-full bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 shadow-md overflow-hidden transition-all duration-300">
          <div className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950 dark:to-purple-950 px-8 py-6 border-b border-slate-100 dark:border-slate-800">
            <h2 className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2 text-lg">
              <svg className="h-5 w-5 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              預設角色費率設定
            </h2>
            <p className="text-slate-500 text-xs mt-1">
              修改此處將作為新建立報價單時的預設費率，已建立之報價單不受影響。
            </p>
          </div>

          <div className="p-8">
            {error && (
              <div className="mb-6 p-4 bg-rose-50 border border-rose-100 text-rose-600 rounded-xl text-sm font-medium flex items-center gap-2">
                <svg className="h-5 w-5 text-rose-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                {error}
              </div>
            )}

            {isLoading ? (
              <div className="space-y-6 animate-pulse">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                    <div className="h-5 bg-slate-200 rounded w-1/3"></div>
                    <div className="h-10 bg-slate-100 rounded md:col-span-2"></div>
                  </div>
                ))}
                <div className="h-12 bg-slate-200 rounded mt-8"></div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="divide-y divide-slate-100 space-y-6">
                  {/* RD Rate */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start pt-2">
                    <div className="pt-2">
                      <label className="block text-sm font-semibold text-slate-700">
                        開發工程師 (RD) 費率
                      </label>
                      <p className="text-xs text-slate-400 mt-0.5">系統研發、軟體開發工時</p>
                    </div>
                    <div className="md:col-span-2 relative">
                      <input
                        type="number"
                        required
                        min="0"
                        value={rdRate}
                        onChange={(e) => setRdRate(e.target.value)}
                        disabled={!allowEdit}
                        className="w-full pl-4 pr-12 py-3 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-800 placeholder-slate-400 text-sm font-medium transition-all focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10"
                      />
                      <span className="absolute inset-y-0 right-0 pr-4 flex items-center text-sm font-semibold text-slate-400 pointer-events-none">
                        元 / 天
                      </span>
                    </div>
                  </div>

                  {/* PM Rate */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start pt-6">
                    <div className="pt-2">
                      <label className="block text-sm font-semibold text-slate-700">
                        專案經理 (PM) 費率
                      </label>
                      <p className="text-xs text-slate-400 mt-0.5">專案規劃、時程控管、溝通協調</p>
                    </div>
                    <div className="md:col-span-2 relative">
                      <input
                        type="number"
                        required
                        min="0"
                        value={pmRate}
                        onChange={(e) => setPmRate(e.target.value)}
                        disabled={!allowEdit}
                        className="w-full pl-4 pr-12 py-3 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-800 placeholder-slate-400 text-sm font-medium transition-all focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10"
                      />
                      <span className="absolute inset-y-0 right-0 pr-4 flex items-center text-sm font-semibold text-slate-400 pointer-events-none">
                        元 / 天
                      </span>
                    </div>
                  </div>

                  {/* QC Rate */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start pt-6">
                    <div className="pt-2">
                      <label className="block text-sm font-semibold text-slate-700">
                        品質控制 (QC) 費率
                      </label>
                      <p className="text-xs text-slate-400 mt-0.5">系統測試、品質檢驗、自動化測試</p>
                    </div>
                    <div className="md:col-span-2 relative">
                      <input
                        type="number"
                        required
                        min="0"
                        value={qcRate}
                        onChange={(e) => setQcRate(e.target.value)}
                        disabled={!allowEdit}
                        className="w-full pl-4 pr-12 py-3 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-800 placeholder-slate-400 text-sm font-medium transition-all focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10"
                      />
                      <span className="absolute inset-y-0 right-0 pr-4 flex items-center text-sm font-semibold text-slate-400 pointer-events-none">
                        元 / 天
                      </span>
                    </div>
                  </div>

                  {/* Integration Rate */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start pt-6">
                    <div className="pt-2">
                      <label className="block text-sm font-semibold text-slate-700">
                        系統整合 (Integration) 費率
                      </label>
                      <p className="text-xs text-slate-400 mt-0.5">系統部署、API 串接、環境設定</p>
                    </div>
                    <div className="md:col-span-2 relative">
                      <input
                        type="number"
                        required
                        min="0"
                        value={integrationRate}
                        onChange={(e) => setIntegrationRate(e.target.value)}
                        disabled={!allowEdit}
                        className="w-full pl-4 pr-12 py-3 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-800 placeholder-slate-400 text-sm font-medium transition-all focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10"
                      />
                      <span className="absolute inset-y-0 right-0 pr-4 flex items-center text-sm font-semibold text-slate-400 pointer-events-none">
                        元 / 天
                      </span>
                    </div>
                  </div>
                </div>

                {/* 儲存按鈕 */}
                <div className="pt-6 border-t border-slate-100 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={fetchSettings}
                    disabled={isSubmitting}
                    className="inline-flex justify-center items-center rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm transition-all hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:opacity-50"
                  >
                    重設預設值
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || !allowEdit}
                    title={!allowEdit ? "權限不足：僅管理員可異動費率設定" : undefined}
                    className="inline-flex justify-center items-center rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-md hover:bg-indigo-500 active:scale-[0.98] transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:bg-indigo-400 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <span className="flex items-center gap-2">
                        <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        儲存中...
                      </span>
                    ) : (
                      "儲存費率設定"
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
