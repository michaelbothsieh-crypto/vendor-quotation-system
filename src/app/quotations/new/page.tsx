"use client";

import Link from "next/link";
import QuotationForm from "../quotation-form";

export default function NewQuotationPage() {
  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800">
      <div className="h-1.5 w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600"></div>

      <header className="bg-white border-b border-slate-200 py-5 px-6 sm:px-12 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 bg-clip-text text-transparent">
            建立新報價單
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            為特定的合作廠商規劃專案功能大項、預估工時並產生詳細的報價單。
          </p>
        </div>
        <div>
          <Link
            href="/vendors"
            className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition-all hover:bg-slate-50 focus:outline-none"
          >
            ← 返回列表
          </Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <QuotationForm />
      </main>
    </div>
  );
}
