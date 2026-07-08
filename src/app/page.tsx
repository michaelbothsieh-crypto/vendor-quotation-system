import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 flex flex-col justify-between">
      {/* 頂部裝飾條 */}
      <div className="h-1.5 w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600"></div>

      <main className="flex-1 flex flex-col items-center justify-center max-w-5xl mx-auto w-full px-6 py-16">
        <div className="text-center max-w-2xl mb-16">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-semibold tracking-wide mb-6">
            <span className="h-1.5 w-1.5 rounded-full bg-indigo-600 animate-pulse"></span>
            外包廠商報價管理系統
          </span>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 bg-clip-text text-transparent">
            Vendor Quotation System
          </h1>
          <p className="text-slate-500 text-base sm:text-lg mt-4 leading-relaxed">
            高效管理外部供應商資料庫，精密估算專案工時與人天費率，自動產生標準化報價單。
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full">
          {/* 卡片 1：廠商資料庫 */}
          <Link
            href="/vendors"
            className="group relative bg-white p-8 rounded-3xl border border-slate-200/80 shadow-sm hover:shadow-xl hover:border-blue-500/20 transition-all duration-300 flex flex-col justify-between overflow-hidden"
          >
            <div className="absolute top-0 left-0 h-1 w-full bg-gradient-to-r from-blue-500 to-indigo-500 transform -translate-y-1 group-hover:translate-y-0 transition-transform duration-300"></div>
            <div>
              <div className="flex items-center justify-center h-12 w-12 rounded-2xl bg-blue-50 text-blue-600 group-hover:scale-110 transition-transform duration-300">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-slate-900 mt-6 group-hover:text-blue-600 transition-colors">
                合作廠商管理
              </h2>
              <p className="text-sm text-slate-500 mt-2 leading-relaxed">
                維護合作供應商基本資料，包含聯絡窗口、電子郵件、電話、統一編號與地址，並管理對應的專案報價單。
              </p>
            </div>
            <div className="mt-8 flex items-center text-sm font-semibold text-blue-600 gap-1 group-hover:translate-x-1 transition-transform duration-300">
              進入廠商資料庫 <span>→</span>
            </div>
          </Link>

          {/* 卡片 2：費率設定 */}
          <Link
            href="/settings"
            className="group relative bg-white p-8 rounded-3xl border border-slate-200/80 shadow-sm hover:shadow-xl hover:border-purple-500/20 transition-all duration-300 flex flex-col justify-between overflow-hidden"
          >
            <div className="absolute top-0 left-0 h-1 w-full bg-gradient-to-r from-indigo-500 to-purple-500 transform -translate-y-1 group-hover:translate-y-0 transition-transform duration-300"></div>
            <div>
              <div className="flex items-center justify-center h-12 w-12 rounded-2xl bg-purple-50 text-purple-600 group-hover:scale-110 transition-transform duration-300">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-slate-900 mt-6 group-hover:text-purple-600 transition-colors">
                系統費率設定
              </h2>
              <p className="text-sm text-slate-500 mt-2 leading-relaxed">
                配置 RD、PM、QC、整合等各角色的預設人天費率。設定值將套用至新建立的報價單中，確保報價基準一致。
              </p>
            </div>
            <div className="mt-8 flex items-center text-sm font-semibold text-purple-600 gap-1 group-hover:translate-x-1 transition-transform duration-300">
              設定系統費率 <span>→</span>
            </div>
          </Link>
        </div>
      </main>

      <footer className="py-8 text-center text-xs text-slate-400 border-t border-slate-200 bg-white">
        © 2026 外包廠商報價管理系統. All Rights Reserved.
      </footer>
    </div>
  );
}
