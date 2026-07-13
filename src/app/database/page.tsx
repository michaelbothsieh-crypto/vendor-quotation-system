"use client";

import { Fragment, useEffect, useState } from "react";
import Link from "next/link";

interface DatabaseSnapshot {
  vendors: any[];
  quoteTemplates: any[];
  quotations: any[];
  quotationCategories: any[];
  quotationItems: any[];
}

const TABLE_LABELS: Record<keyof DatabaseSnapshot, string> = {
  quotations: "📋 報價單 (Quotations)",
  vendors: "🏢 廠商 (Vendors)",
  quotationCategories: "📁 大項 (Categories)",
  quotationItems: "📝 細項 (Items)",
  quoteTemplates: "🧩 報價範本 (QuoteTemplates)",
};

type TableKey = keyof DatabaseSnapshot;

export default function DatabasePage() {
  const [data, setData] = useState<DatabaseSnapshot | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTable, setActiveTable] = useState<TableKey>("quotations");
  const [searchText, setSearchText] = useState("");
  const [expandedRows, setExpandedRows] = useState<Record<number, boolean>>({});
  const [lastFetched, setLastFetched] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setError(null);
      const res = await fetch("/api/admin/database", { cache: "no-store" });
      if (!res.ok) throw new Error("無法取得資料庫資料");
      const json = await res.json();
      setData(json);
      setLastFetched(new Date().toLocaleString("zh-TW"));
    } catch (err: any) {
      setError(err.message || "發生未知錯誤");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // 選擇資料表後重置搜尋與展開狀態
  const handleTableChange = (table: TableKey) => {
    setActiveTable(table);
    setSearchText("");
    setExpandedRows({});
  };

  const toggleRow = (index: number) => {
    setExpandedRows((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  const activeRows: any[] = data ? (data[activeTable] ?? []) : [];

  // 全域文字過濾（JSON 字串搜尋）
  const filteredRows = activeRows.filter((row) =>
    JSON.stringify(row).toLowerCase().includes(searchText.toLowerCase())
  );

  // 取得目前資料表的所有欄位名稱
  const columns = filteredRows.length > 0 ? Object.keys(filteredRows[0]) : [];

  const formatCellValue = (val: any): string => {
    if (val === null || val === undefined) return "—";
    if (typeof val === "boolean") return val ? "✅ true" : "❌ false";
    if (typeof val === "object") return JSON.stringify(val, null, 2);
    return String(val);
  };

  const isLongValue = (val: any): boolean => {
    return typeof val === "object" && val !== null;
  };

  return (
    <div className="min-h-screen bg-slate-950 font-sans text-slate-100 flex flex-col">
      {/* 頂部裝飾條 */}
      <div className="h-1 w-full bg-gradient-to-r from-emerald-500 via-cyan-500 to-blue-500"></div>

      {/* Header */}
      <header className="sticky top-0 z-30 bg-slate-900 border-b border-slate-800 py-4 px-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-emerald-400 text-xs font-mono font-bold tracking-wider">
              DATABASE INSPECTOR
            </span>
            <span className="text-slate-600 text-xs">|</span>
            <span className="text-slate-500 text-xs font-mono">
              {lastFetched ? `Last fetched: ${lastFetched}` : "..."}
            </span>
          </div>
          <h1 className="text-xl font-extrabold tracking-tight text-white">
            🗄️ 資料庫 Raw Data 檢視器
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchData}
            disabled={isLoading}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold transition-colors disabled:opacity-50"
          >
            <svg className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            重新整理
          </button>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm font-semibold transition-colors"
          >
            ← 返回儀表板
          </Link>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* 側邊資料表選擇器 */}
        <aside className="w-56 shrink-0 bg-slate-900 border-r border-slate-800 p-4 flex flex-col gap-1">
          <p className="text-xs text-slate-500 font-semibold mb-3 tracking-wider">資料表 (Tables)</p>
          {data &&
            (Object.keys(TABLE_LABELS) as TableKey[]).map((key) => {
              const count = data[key]?.length ?? 0;
              return (
                <button
                  key={key}
                  onClick={() => handleTableChange(key)}
                  className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center justify-between gap-2 ${
                    activeTable === key
                      ? "bg-indigo-600 text-white shadow"
                      : "text-slate-400 hover:bg-slate-800 hover:text-slate-100"
                  }`}
                >
                  <span className="truncate">{TABLE_LABELS[key]}</span>
                  <span
                    className={`shrink-0 text-xs font-mono rounded-full px-1.5 py-0.5 ${
                      activeTable === key ? "bg-indigo-500 text-white" : "bg-slate-700 text-slate-400"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}

          {/* 統計摘要 */}
          {data && (
            <div className="mt-6 pt-4 border-t border-slate-800">
              <p className="text-xs text-slate-500 font-semibold mb-2 tracking-wider">資料庫統計</p>
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs text-slate-400">
                  <span>報價單</span>
                  <span className="font-mono text-slate-300">{data.quotations.length}</span>
                </div>
                <div className="flex justify-between text-xs text-slate-400">
                  <span>廠商</span>
                  <span className="font-mono text-slate-300">{data.vendors.length}</span>
                </div>
                <div className="flex justify-between text-xs text-slate-400">
                  <span>大項</span>
                  <span className="font-mono text-slate-300">{data.quotationCategories.length}</span>
                </div>
                <div className="flex justify-between text-xs text-slate-400">
                  <span>細項</span>
                  <span className="font-mono text-slate-300">{data.quotationItems.length}</span>
                </div>
              </div>
            </div>
          )}
        </aside>

        {/* 主要內容區 */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {isLoading ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <svg className="animate-spin h-10 w-10 text-indigo-400 mx-auto" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <p className="text-slate-400 text-sm mt-3">連接資料庫中...</p>
              </div>
            </div>
          ) : error ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center bg-rose-900/30 border border-rose-700 rounded-2xl p-8">
                <p className="text-rose-400 font-semibold">{error}</p>
                <button
                  onClick={fetchData}
                  className="mt-4 px-4 py-2 bg-rose-700 hover:bg-rose-600 text-white rounded-lg text-sm font-semibold"
                >
                  重試
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* 工具列 */}
              <div className="bg-slate-900 border-b border-slate-800 px-4 py-3 flex items-center gap-4">
                <div className="font-semibold text-white text-sm">
                  {TABLE_LABELS[activeTable]}
                  <span className="ml-2 text-xs text-slate-500 font-normal">
                    ({filteredRows.length} / {activeRows.length} 筆)
                  </span>
                </div>
                <div className="relative flex-1 max-w-xs">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </span>
                  <input
                    type="text"
                    placeholder="全欄位搜尋..."
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    className="w-full pl-9 pr-4 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 placeholder-slate-500 text-xs focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* 表格資料 */}
              <div className="flex-1 overflow-auto">
                {filteredRows.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-slate-500 text-sm">
                    暫無資料
                  </div>
                ) : (
                  <table className="w-full text-xs font-mono border-collapse">
                    <thead className="sticky top-0 z-10 bg-slate-800">
                      <tr>
                        <th className="py-2 px-3 text-left text-slate-400 font-semibold border-b border-r border-slate-700 w-10">#</th>
                        {columns.map((col) => (
                          <th
                            key={col}
                            className="py-2 px-3 text-left text-emerald-400 font-semibold border-b border-r border-slate-700 whitespace-nowrap"
                          >
                            {col}
                          </th>
                        ))}
                        <th className="py-2 px-3 text-left text-slate-400 font-semibold border-b border-slate-700 w-16">JSON</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRows.map((row, rowIdx) => (
                        <Fragment key={rowIdx}>
                          <tr
                            className="border-b border-slate-800/60 hover:bg-slate-800/40 transition-colors cursor-pointer"
                            onClick={() => toggleRow(rowIdx)}
                          >
                            <td className="py-2 px-3 text-slate-600 border-r border-slate-800">{rowIdx + 1}</td>
                            {columns.map((col) => (
                              <td
                                key={col}
                                className="py-2 px-3 text-slate-300 border-r border-slate-800 max-w-[200px] truncate"
                                title={formatCellValue(row[col])}
                              >
                                {isLongValue(row[col]) ? (
                                  <span className="text-indigo-400 italic">[object]</span>
                                ) : (
                                  <span className={row[col] === null || row[col] === undefined ? "text-slate-600" : ""}>
                                    {formatCellValue(row[col])}
                                  </span>
                                )}
                              </td>
                            ))}
                            <td className="py-2 px-3">
                              <svg
                                className={`h-4 w-4 text-slate-500 transition-transform duration-200 ${expandedRows[rowIdx] ? "rotate-90" : ""}`}
                                fill="none" viewBox="0 0 24 24" stroke="currentColor"
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                            </td>
                          </tr>
                          {expandedRows[rowIdx] && (
                            <tr key={`${rowIdx}-json`} className="bg-slate-950">
                              <td colSpan={columns.length + 2} className="p-0">
                                <div className="px-6 py-4 border-b border-slate-800">
                                  <pre className="text-xs text-emerald-300 bg-slate-900 rounded-xl border border-slate-700 p-4 overflow-x-auto leading-relaxed whitespace-pre-wrap">
                                    {JSON.stringify(row, null, 2)}
                                  </pre>
                                </div>
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </>
          )}
        </main>
      </div>

      <footer className="py-3 text-center text-[10px] text-slate-700 border-t border-slate-800 bg-slate-900">
        資料庫原始資料僅供內部管理使用，請勿公開分享。
      </footer>
    </div>
  );
}
