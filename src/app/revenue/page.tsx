"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { isAdmin } from "@/lib/permissions";

interface RevenueRow {
  id: string;
  quotationNumber: string;
  title: string;
  vendorName: string;
  status: string;
  issueDate: string;
  subtotal: number;
  discount: number;
  total: number;
}

type PeriodKey = "all" | "month" | "quarter" | "year";

const PERIOD_OPTIONS: { key: PeriodKey; label: string }[] = [
  { key: "all", label: "全部期間" },
  { key: "month", label: "本月" },
  { key: "quarter", label: "本季" },
  { key: "year", label: "本年" },
];

const STATUS_META: Record<string, { label: string; badge: string }> = {
  APPROVED: { label: "已核准", badge: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  SENT: { label: "待核", badge: "bg-sky-50 text-sky-700 border-sky-200" },
  DRAFT: { label: "草稿", badge: "bg-slate-100 text-slate-600 border-slate-200" },
  REJECTED: { label: "已拒絕", badge: "bg-rose-50 text-rose-600 border-rose-200" },
};

const money = (n: number) => `$${n.toLocaleString()}`;

function periodStart(key: PeriodKey): Date | null {
  const now = new Date();
  switch (key) {
    case "month":
      return new Date(now.getFullYear(), now.getMonth(), 1);
    case "quarter":
      return new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
    case "year":
      return new Date(now.getFullYear(), 0, 1);
    default:
      return null;
  }
}

export default function RevenuePage() {
  const { data: session, status: authStatus } = useSession();
  const [rows, setRows] = useState<RevenueRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [period, setPeriod] = useState<PeriodKey>("all");
  const [vendorFilter, setVendorFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        setIsLoading(true);
        const res = await fetch("/api/revenue");
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "無法取得收益資料");
        setRows(data.rows);
      } catch (err: any) {
        setError(err.message || "發生未知錯誤");
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  const vendorNames = useMemo(
    () => [...new Set(rows.map((r) => r.vendorName).filter(Boolean))].sort(),
    [rows]
  );

  // 期間 + 客戶篩選後的資料：KPI、圖表、排行、明細共用同一份
  const filtered = useMemo(() => {
    const start = periodStart(period);
    return rows.filter((r) => {
      if (start && new Date(r.issueDate) < start) return false;
      if (vendorFilter && r.vendorName !== vendorFilter) return false;
      return true;
    });
  }, [rows, period, vendorFilter]);

  const tableRows = useMemo(
    () => (statusFilter ? filtered.filter((r) => r.status === statusFilter) : filtered),
    [filtered, statusFilter]
  );

  const kpi = useMemo(() => {
    const approved = filtered.filter((r) => r.status === "APPROVED");
    const sent = filtered.filter((r) => r.status === "SENT");
    const rejected = filtered.filter((r) => r.status === "REJECTED");
    const approvedTotal = approved.reduce((s, r) => s + r.total, 0);
    const decided = approved.length + sent.length + rejected.length;
    return {
      approvedTotal,
      approvedSubtotal: approved.reduce((s, r) => s + r.subtotal, 0),
      approvedCount: approved.length,
      sentTotal: sent.reduce((s, r) => s + r.total, 0),
      sentCount: sent.length,
      winRate: decided > 0 ? Math.round((approved.length / decided) * 100) : null,
      avgApproved: approved.length > 0 ? Math.round(approvedTotal / approved.length) : 0,
    };
  }, [filtered]);

  // 近 12 個月趨勢（已核准 + 待確認），受客戶篩選影響、不受期間篩選影響
  const monthly = useMemo(() => {
    const now = new Date();
    const buckets: { key: string; label: string; approved: number; sent: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      buckets.push({
        key: `${d.getFullYear()}-${d.getMonth()}`,
        label: `${d.getMonth() + 1}月`,
        approved: 0,
        sent: 0,
      });
    }
    const byKey = new Map(buckets.map((b) => [b.key, b]));
    for (const r of rows) {
      if (vendorFilter && r.vendorName !== vendorFilter) continue;
      const d = new Date(r.issueDate);
      const bucket = byKey.get(`${d.getFullYear()}-${d.getMonth()}`);
      if (!bucket) continue;
      if (r.status === "APPROVED") bucket.approved += r.total;
      else if (r.status === "SENT") bucket.sent += r.total;
    }
    const max = Math.max(...buckets.map((b) => b.approved + b.sent), 1);
    return { buckets, max };
  }, [rows, vendorFilter]);

  // 客戶收益排行（已核准），受期間篩選影響
  const vendorRanking = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of filtered) {
      if (r.status !== "APPROVED") continue;
      map.set(r.vendorName, (map.get(r.vendorName) ?? 0) + r.total);
    }
    const list = [...map.entries()]
      .map(([name, total]) => ({ name: name || "（未填客戶）", total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);
    const max = list[0]?.total ?? 1;
    const grand = [...map.values()].reduce((a, b) => a + b, 0);
    return { list, max, grand };
  }, [filtered]);

  if (authStatus === "loading" || isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-slate-500 text-sm font-medium">載入收益資料中，請稍候...</p>
      </div>
    );
  }

  if (authStatus === "authenticated" && !isAdmin((session?.user as any)?.role)) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white border border-slate-200 rounded-2xl p-8 max-w-md text-center shadow-sm">
          <p className="text-sm font-bold text-slate-700 mb-4">權限不足：僅管理員可檢視收益總覽</p>
          <Link href="/" className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 transition-all">
            返回首頁
          </Link>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-red-50 border border-red-200/80 rounded-2xl p-8 max-w-md text-center shadow-sm">
          <p className="text-sm font-bold text-red-650">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* 標題與篩選 */}
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">報價總收益</h1>
            <p className="text-xs text-slate-400 mt-1">已核准報價單列為確定收益，待核列為待確認金額；僅計算各報價單的最新版本。</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
              {PERIOD_OPTIONS.map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => setPeriod(opt.key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    period === opt.key ? "bg-indigo-600 text-white shadow" : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <select
              value={vendorFilter}
              onChange={(e) => setVendorFilter(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm focus:border-indigo-500 focus:outline-none"
            >
              <option value="">全部客戶</option>
              {vendorNames.map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* KPI 卡片 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">確定總收益（已核准）</p>
            <p className="text-2xl font-black text-emerald-600 mt-2 font-mono">{money(kpi.approvedTotal)}</p>
            <p className="text-xs text-slate-400 mt-1 font-mono">未稅 {money(kpi.approvedSubtotal)}・{kpi.approvedCount} 張</p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">待確認金額（待核）</p>
            <p className="text-2xl font-black text-sky-600 mt-2 font-mono">{money(kpi.sentTotal)}</p>
            <p className="text-xs text-slate-400 mt-1 font-mono">{kpi.sentCount} 張報價中</p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">成交率</p>
            <p className="text-2xl font-black text-slate-900 mt-2 font-mono">
              {kpi.winRate === null ? "--" : `${kpi.winRate}%`}
            </p>
            <p className="text-xs text-slate-400 mt-1">核准 ÷ (核准+待核+拒絕)</p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">平均單價（已核准）</p>
            <p className="text-2xl font-black text-slate-900 mt-2 font-mono">{money(kpi.avgApproved)}</p>
            <p className="text-xs text-slate-400 mt-1">含稅平均金額</p>
          </div>
        </div>

        {/* 月度趨勢 + 客戶排行 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-slate-900">近 12 個月收益趨勢</h2>
              <div className="flex items-center gap-3 text-xs text-slate-500">
                <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-emerald-500"></span>已核准</span>
                <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-sky-300"></span>待確認</span>
              </div>
            </div>
            <div className="flex items-end gap-1.5 h-44">
              {monthly.buckets.map((b) => {
                const total = b.approved + b.sent;
                return (
                  <div key={b.key} className="flex-1 flex flex-col items-center gap-1 group" title={`已核准 ${money(b.approved)}／待確認 ${money(b.sent)}`}>
                    <span className="text-[10px] font-mono text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                      {total > 0 ? money(total) : ""}
                    </span>
                    <div className="w-full flex flex-col justify-end" style={{ height: "130px" }}>
                      <div className="w-full bg-sky-300 rounded-t-sm" style={{ height: `${(b.sent / monthly.max) * 100}%` }}></div>
                      <div className={`w-full bg-emerald-500 ${b.sent === 0 ? "rounded-t-sm" : ""}`} style={{ height: `${(b.approved / monthly.max) * 100}%` }}></div>
                    </div>
                    <span className="text-[10px] text-slate-400">{b.label}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <h2 className="text-sm font-bold text-slate-900 mb-4">客戶收益排行（已核准）</h2>
            {vendorRanking.list.length === 0 ? (
              <p className="text-xs text-slate-400 py-8 text-center">目前篩選範圍內沒有已核准的報價單</p>
            ) : (
              <div className="space-y-3">
                {vendorRanking.list.map((v, i) => (
                  <div key={v.name}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-semibold text-slate-700 truncate">
                        <span className="text-slate-400 font-mono mr-1.5">{i + 1}.</span>{v.name}
                      </span>
                      <span className="font-mono text-slate-500 whitespace-nowrap ml-2">
                        {money(v.total)}
                        <span className="text-slate-300 ml-1.5">{vendorRanking.grand > 0 ? Math.round((v.total / vendorRanking.grand) * 100) : 0}%</span>
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                      <div className="h-full rounded-full bg-indigo-500" style={{ width: `${(v.total / vendorRanking.max) * 100}%` }}></div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 明細表格 */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 px-6 pt-5 pb-3">
            <h2 className="text-sm font-bold text-slate-900">報價單明細（{tableRows.length} 張）</h2>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 focus:border-indigo-500 focus:outline-none"
            >
              <option value="">全部狀態</option>
              {Object.entries(STATUS_META).map(([key, meta]) => (
                <option key={key} value={key}>{meta.label}</option>
              ))}
            </select>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-xs border-y border-slate-200">
                  <th className="py-2.5 px-6 font-semibold">報價單號</th>
                  <th className="py-2.5 px-3 font-semibold">專案名稱</th>
                  <th className="py-2.5 px-3 font-semibold">客戶</th>
                  <th className="py-2.5 px-3 font-semibold">狀態</th>
                  <th className="py-2.5 px-3 font-semibold">報價日期</th>
                  <th className="py-2.5 px-3 font-semibold text-right">未稅金額</th>
                  <th className="py-2.5 px-6 font-semibold text-right">含稅總額</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tableRows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-xs text-slate-400">篩選範圍內沒有報價單</td>
                  </tr>
                ) : (
                  tableRows.map((r) => {
                    const meta = STATUS_META[r.status] ?? { label: r.status, badge: "bg-slate-100 text-slate-600 border-slate-200" };
                    return (
                      <tr key={r.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-2.5 px-6 font-mono text-xs text-slate-500">
                          <Link href={`/quotations/${r.id}/edit`} className="hover:text-indigo-600 hover:underline">
                            {r.quotationNumber}
                          </Link>
                        </td>
                        <td className="py-2.5 px-3 font-medium text-slate-900 max-w-[280px] truncate" title={r.title}>{r.title}</td>
                        <td className="py-2.5 px-3 text-slate-600">{r.vendorName || "-"}</td>
                        <td className="py-2.5 px-3">
                          <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${meta.badge}`}>
                            {meta.label}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-mono text-xs text-slate-500">
                          {new Date(r.issueDate).toLocaleDateString("zh-TW")}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-600">{money(r.subtotal)}</td>
                        <td className="py-2.5 px-6 text-right font-mono font-semibold text-slate-900">{money(r.total)}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
