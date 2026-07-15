"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import QuotationForm from "../../quotation-form";

interface EditQuotationPageProps {
  params: Promise<{ id: string }>;
}

const STATUS_LABELS: Record<string, string> = {
  SENT: "待核",
  APPROVED: "已核准",
  REJECTED: "已拒絕",
};

export default function EditQuotationPage({ params }: EditQuotationPageProps) {
  const { id } = use(params);
  const [initialData, setInitialData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // 非草稿的最新版預設唯讀，按「另存新版本」後解鎖（儲存時後端會建立新版草稿）
  const [forceEdit, setForceEdit] = useState(false);

  useEffect(() => {
    const loadQuotation = async () => {
      try {
        setIsLoading(true);
        const res = await fetch(`/api/quotations/${id}`);
        if (!res.ok) {
          throw new Error("無法取得報價單詳細資料");
        }
        setInitialData(await res.json());
      } catch (err: any) {
        setError(err.message || "發生未知錯誤");
      } finally {
        setIsLoading(false);
      }
    };

    loadQuotation();
  }, [id]);

  const isLatest = initialData?.isLatest !== false;
  const isDraft = initialData?.status === "DRAFT";
  const isReadOnly = !isLatest || (!isDraft && !forceEdit);
  const statusLabel = STATUS_LABELS[initialData?.status] ?? initialData?.status;

  const readOnlyReason = !isLatest
    ? `此為歷史封存版本（v${initialData?.version ?? "?"}），僅供查閱`
    : `此報價單狀態為「${statusLabel}」，內容已鎖定`;

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800">
      <div className="h-1.5 w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600"></div>

      <header className="sticky top-0 z-30 bg-white border-b border-slate-200 py-5 px-6 sm:px-12 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 dark:from-slate-50 dark:via-indigo-200 dark:to-slate-50 bg-clip-text text-transparent">
            {isReadOnly ? "查看報價單（唯讀）" : forceEdit ? "另存新版本" : "編輯報價單"}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {isReadOnly
              ? readOnlyReason
              : forceEdit
                ? "儲存後將建立新一版草稿，原版本內容與狀態保留為稽核紀錄。"
                : "修改當前草稿的名稱、廠商、商務條件、費率與細項工時。"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isLatest && !isDraft && !forceEdit && !isLoading && !error && (
            <button
              onClick={() => setForceEdit(true)}
              className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-indigo-500"
            >
              另存新版本
            </button>
          )}
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
          <QuotationForm
            key={String(isReadOnly)}
            id={id}
            initialData={initialData}
            readOnly={isReadOnly}
            readOnlyReason={readOnlyReason}
          />
        )}
      </main>
    </div>
  );
}
