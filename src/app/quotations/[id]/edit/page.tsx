"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import QuotationForm from "../../quotation-form";

interface EditQuotationPageProps {
  params: Promise<{ id: string }>;
}

export default function EditQuotationPage({ params }: EditQuotationPageProps) {
  const { id } = use(params);
  const [initialData, setInitialData] = useState<any>(null);
  const [isLatest, setIsLatest] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadQuotation = async () => {
      try {
        setIsLoading(true);
        const res = await fetch(`/api/quotations/${id}`);
        if (!res.ok) {
          throw new Error("無法取得報價單詳細資料");
        }
        const data = await res.json();
        setInitialData(data);
        // 判斷是否為最新版本（歷史版本使用唯讀模式）
        setIsLatest(data.isLatest !== false);
      } catch (err: any) {
        setError(err.message || "發生未知錯誤");
      } finally {
        setIsLoading(false);
      }
    };

    loadQuotation();
  }, [id]);

  const isReadOnly = !isLatest;

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800">
      <div className="h-1.5 w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600"></div>

      <header className="bg-white border-b border-slate-200 py-5 px-6 sm:px-12 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 bg-clip-text text-transparent">
            {isReadOnly ? "查看歷史版本（唯讀）" : "編輯報價單"}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {isReadOnly
              ? "此報價單為歷史封存版本，僅供查閱，不開放修改。"
              : "修改當前專案報價單的名稱、廠商、各角色人天費率與細項工時。"}
          </p>
        </div>
        <div>
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition-all hover:bg-slate-50 focus:outline-none"
          >
            ← 返回儀表板
          </Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
            <svg className="animate-spin h-10 w-10 text-indigo-600" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="text-slate-500 text-sm font-medium">載入報價單中，請稍候...</p>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200/80 rounded-2xl p-6 text-center text-red-600">
            <p className="text-sm font-semibold">{error}</p>
          </div>
        ) : (
          <QuotationForm id={id} initialData={initialData} readOnly={isReadOnly} />
        )}
      </main>
    </div>
  );
}
