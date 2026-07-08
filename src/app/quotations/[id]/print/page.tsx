"use client";

import { useEffect, useState, use, Fragment } from "react";
import Link from "next/link";
import { calculateQuotation, calculateItem } from "@/lib/calculator";

interface PrintPageProps {
  params: Promise<{ id: string }>;
}

export default function PrintQuotationPage({ params }: PrintPageProps) {
  const { id } = use(params);
  const [quotation, setQuotation] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadQuotation = async () => {
      try {
        setIsLoading(true);
        const res = await fetch(`/api/quotations/${id}`);
        if (!res.ok) {
          throw new Error("無法取得報價單資料");
        }
        const data = await res.json();
        setQuotation(data);
      } catch (err: any) {
        setError(err.message || "發生未知錯誤");
      } finally {
        setIsLoading(false);
      }
    };

    loadQuotation();
  }, [id]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-3 no-print">
        <svg className="animate-spin h-10 w-10 text-indigo-650" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <p className="text-slate-500 text-sm font-medium">載入報價單中，請稍候...</p>
      </div>
    );
  }

  if (error || !quotation) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 no-print">
        <div className="bg-red-50 border border-red-200/80 rounded-2xl p-8 max-w-md text-center shadow-sm">
          <p className="text-sm font-bold text-red-650 mb-4">{error || "找不到該報價單"}</p>
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-all hover:bg-slate-800"
          >
            返回首頁
          </Link>
        </div>
      </div>
    );
  }

  // 整理計算資料
  const allItems = quotation.categories.flatMap((cat: any) => cat.items);
  const rates = {
    rdRate: quotation.rdRate,
    pmRate: quotation.pmRate,
    qcRate: quotation.qcRate,
    integrationRate: quotation.integrationRate,
  };
  const summary = calculateQuotation(allItems, rates, quotation.taxRate);

  // 用於表格序號
  let itemIndexCounter = 0;

  // 我方抬頭資料 (一般系統設定或寫死作為預設)
  const ourCompany = {
    name: "安迪葛拉維科技股份有限公司",
    taxId: "88888888",
    contact: "專案開發處 報價組",
    phone: "02-2345-6789",
    email: "billing@antigravity.tw",
    address: "台北市信義區信義路五段 7 號",
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-slate-100 py-8 px-4 sm:px-6 lg:px-8 font-sans print:bg-white print:p-0 print:m-0">
      {/* 頂部操作按鈕區 (螢幕上顯示，列印時隱藏) */}
      <div className="max-w-4xl mx-auto mb-6 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4 no-print">
        <div className="flex items-center gap-2">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200"
          >
            ← 返回首頁
          </Link>
          <Link
            href={`/quotations/${id}/edit`}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-indigo-650 hover:text-indigo-750 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            編輯此報價單
          </Link>
        </div>
        <button
          onClick={handlePrint}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold shadow-md hover:shadow-lg active:scale-[0.98] transition-all"
        >
          <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </svg>
          列印報價單 (PDF)
        </button>
      </div>

      {/* 報價單列印主體 */}
      <main className="max-w-4xl mx-auto bg-white p-12 border border-slate-200 shadow-lg rounded-3xl print:border-none print:shadow-none print:p-0 print:rounded-none">
        
        {/* 頁首標題 */}
        <div className="border-b-2 border-slate-900 pb-6 mb-8 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">專案開發服務報價單</h1>
            <p className="text-xs text-slate-400 mt-2 font-mono uppercase tracking-wider">
              Project Development Service Quotation
            </p>
          </div>
          <div className="text-left md:text-right font-mono text-sm space-y-1">
            <p className="text-slate-500">
              <span className="font-semibold text-slate-700">報價單號：</span>
              <span className="px-2 py-0.5 bg-slate-100 rounded text-slate-950 font-bold border border-slate-200/50 print:border-none print:bg-transparent print:p-0">
                {quotation.quotationNumber}
              </span>
            </p>
            <p className="text-slate-500">
              <span className="font-semibold text-slate-700">報價日期：</span>
              {new Date(quotation.createdAt).toLocaleDateString("zh-TW")}
            </p>
          </div>
        </div>

        {/* 雙方資訊欄位 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          {/* 客戶抬頭資料 */}
          <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 print:bg-transparent print:p-0 print:border-none">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">客戶抬頭</h2>
            <div className="space-y-2 text-sm text-slate-800">
              <p className="text-base font-bold text-slate-950">{quotation.vendor.name}</p>
              {quotation.vendor.taxId && (
                <p>
                  <span className="text-slate-400 font-medium">統一編號：</span>
                  {quotation.vendor.taxId}
                </p>
              )}
              <p>
                <span className="text-slate-400 font-medium">聯絡窗口：</span>
                {quotation.vendor.contactName}
              </p>
              <p>
                <span className="text-slate-400 font-medium">聯絡信箱：</span>
                <span className="font-mono">{quotation.vendor.contactEmail}</span>
              </p>
              {quotation.vendor.contactPhone && (
                <p>
                  <span className="text-slate-400 font-medium">聯絡電話：</span>
                  {quotation.vendor.contactPhone}
                </p>
              )}
              {quotation.vendor.address && (
                <p>
                  <span className="text-slate-400 font-medium">聯絡地址：</span>
                  {quotation.vendor.address}
                </p>
              )}
            </div>
          </div>

          {/* 我方抬頭資料 */}
          <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 print:bg-transparent print:p-0 print:border-none">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">我方抬頭</h2>
            <div className="space-y-2 text-sm text-slate-800">
              <p className="text-base font-bold text-slate-950">{ourCompany.name}</p>
              <p>
                <span className="text-slate-400 font-medium">統一編號：</span>
                {ourCompany.taxId}
              </p>
              <p>
                <span className="text-slate-400 font-medium">經辦窗口：</span>
                {ourCompany.contact}
              </p>
              <p>
                <span className="text-slate-400 font-medium">聯絡信箱：</span>
                <span className="font-mono">{ourCompany.email}</span>
              </p>
              <p>
                <span className="text-slate-400 font-medium">聯絡電話：</span>
                {ourCompany.phone}
              </p>
              <p>
                <span className="text-slate-400 font-medium">聯絡地址：</span>
                {ourCompany.address}
              </p>
            </div>
          </div>
        </div>

        {/* 專案基本資料 */}
        <div className="mb-8 p-4 rounded-xl border border-dashed border-slate-200">
          <p className="text-sm">
            <span className="font-bold text-slate-900 mr-2">專案名稱：</span>
            <span className="text-base font-semibold text-indigo-700">{quotation.title}</span>
          </p>
        </div>

        {/* 報價明細表格 */}
        <div className="mb-8">
          <h2 className="text-base font-bold text-slate-900 mb-4 border-l-4 border-indigo-600 pl-3">報價項目明細</h2>
          <div className="overflow-x-auto print:overflow-visible">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-700 border-b border-slate-300">
                  <th className="py-2.5 px-3 font-semibold text-center w-12">項次</th>
                  <th className="py-2.5 px-3 font-semibold">功能項目與描述</th>
                  <th className="py-2.5 px-3 font-semibold text-right w-16">RD (天)</th>
                  <th className="py-2.5 px-3 font-semibold text-right w-16">PM (天)</th>
                  <th className="py-2.5 px-3 font-semibold text-right w-16">QC (天)</th>
                  <th className="py-2.5 px-3 font-semibold text-right w-16">整合 (天)</th>
                  <th className="py-2.5 px-3 font-semibold text-right w-24">小計金額</th>
                  <th className="py-2.5 px-3 font-semibold max-w-[120px]">備註</th>
                </tr>
              </thead>
              <tbody>
                {quotation.categories.map((cat: any) => (
                  <Fragment key={cat.id}>
                    <tr className="border-b border-slate-200">
                      <td colSpan={8} className="py-2 px-3 bg-indigo-50/50 font-bold text-indigo-900 print:bg-slate-100">
                        大項：{cat.name}
                      </td>
                    </tr>
                    {cat.items.map((item: any) => {
                      itemIndexCounter++;
                      const calculatedItem = calculateItem(item, rates);
                      return (
                        <tr key={item.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                          <td className="py-2 px-3 text-slate-500 text-center font-mono text-xs">{itemIndexCounter}</td>
                          <td className="py-2 px-3 text-slate-900 font-medium">{item.description}</td>
                          <td className="py-2 px-3 text-slate-700 text-right font-mono">{Number(item.rdDays) || 0}</td>
                          <td className="py-2 px-3 text-slate-700 text-right font-mono">{Number(item.pmDays) || 0}</td>
                          <td className="py-2 px-3 text-slate-700 text-right font-mono">{Number(item.qcDays) || 0}</td>
                          <td className="py-2 px-3 text-slate-700 text-right font-mono">{Number(item.integrationDays) || 0}</td>
                          <td className="py-2 px-3 text-slate-900 text-right font-mono font-semibold">
                            ${calculatedItem.amount.toLocaleString()}
                          </td>
                          <td className="py-2 px-3 text-slate-500 text-xs truncate max-w-[120px]" title={item.note || ""}>
                            {item.note || "-"}
                          </td>
                        </tr>
                      );
                    })}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 角色天數加總與費率明細 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8 border-t border-slate-200 pt-8 print:grid-cols-2 print:gap-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 mb-3">研發與專案角色工時費率明細</h3>
            <table className="w-full text-xs text-left border border-slate-200">
              <thead>
                <tr className="bg-slate-50 text-slate-600 border-b border-slate-200">
                  <th className="p-2">角色</th>
                  <th className="p-2 text-right">總工時 (天)</th>
                  <th className="p-2 text-right">費率 (TWD/天)</th>
                  <th className="p-2 text-right">金額小計</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                <tr>
                  <td className="p-2 font-sans">RD (研發工程師)</td>
                  <td className="p-2 text-right">{summary.totalRdDays}</td>
                  <td className="p-2 text-right">${rates.rdRate?.toLocaleString()}</td>
                  <td className="p-2 text-right">${summary.totalRdAmount.toLocaleString()}</td>
                </tr>
                <tr>
                  <td className="p-2 font-sans">PM (專案經理)</td>
                  <td className="p-2 text-right">{summary.totalPmDays}</td>
                  <td className="p-2 text-right">${rates.pmRate?.toLocaleString()}</td>
                  <td className="p-2 text-right">${summary.totalPmAmount.toLocaleString()}</td>
                </tr>
                <tr>
                  <td className="p-2 font-sans">QC (測試工程師)</td>
                  <td className="p-2 text-right">{summary.totalQcDays}</td>
                  <td className="p-2 text-right">${rates.qcRate?.toLocaleString()}</td>
                  <td className="p-2 text-right">${summary.totalQcAmount.toLocaleString()}</td>
                </tr>
                <tr>
                  <td className="p-2 font-sans">整合 (系統整合工程師)</td>
                  <td className="p-2 text-right">{summary.totalIntegrationDays}</td>
                  <td className="p-2 text-right">${rates.integrationRate?.toLocaleString()}</td>
                  <td className="p-2 text-right">${summary.totalIntegrationAmount.toLocaleString()}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* 總金額計算 */}
          <div className="flex flex-col justify-end bg-slate-50 p-6 rounded-2xl border border-slate-200/50 print:bg-transparent print:p-0 print:border-none">
            <div className="space-y-2 text-sm text-slate-700 font-mono">
              <div className="flex justify-between">
                <span className="font-sans text-slate-500">總工時天數加總：</span>
                <span className="font-semibold text-slate-800">{summary.totalDays} 人天</span>
              </div>
              <div className="flex justify-between">
                <span className="font-sans text-slate-500">未稅金額總計：</span>
                <span className="font-semibold text-slate-900">${summary.subtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-sans text-slate-500">營業稅 (5%)：</span>
                <span className="font-semibold text-slate-900">${summary.tax.toLocaleString()}</span>
              </div>
              <div className="border-t border-slate-200 my-2 pt-2 flex justify-between items-baseline">
                <span className="font-sans text-base font-bold text-slate-900">含稅總計金額：</span>
                <span className="text-2xl font-black text-indigo-700">${summary.total.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>

        {/* 雙方簽章區 */}
        <div className="mt-16 pt-8 border-t border-slate-200">
          <div className="grid grid-cols-2 gap-12 print:gap-8">
            <div className="flex flex-col gap-12">
              <div>
                <p className="text-sm font-bold text-slate-900">客戶簽認 (委託方)：</p>
                <p className="text-xs text-slate-400 mt-1">{quotation.vendor.name}</p>
              </div>
              <div className="border-b border-slate-450 h-8 w-full max-w-[280px]"></div>
              <div className="text-xs text-slate-500 space-y-1 font-mono">
                <p>簽名蓋章：_________________________</p>
                <p>簽署日期：20___ 年 ___ 月 ___ 日</p>
              </div>
            </div>
            
            <div className="flex flex-col gap-12">
              <div>
                <p className="text-sm font-bold text-slate-900">我方簽認 (受託方)：</p>
                <p className="text-xs text-slate-400 mt-1">{ourCompany.name}</p>
              </div>
              <div className="border-b border-slate-450 h-8 w-full max-w-[280px]"></div>
              <div className="text-xs text-slate-500 space-y-1 font-mono">
                <p>經辦人：___________________________</p>
                <p>核准日期：20___ 年 ___ 月 ___ 日</p>
              </div>
            </div>
          </div>
        </div>

      </main>
    </div>
  );
}
