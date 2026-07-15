"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { canCreate, isAdmin } from "@/lib/permissions";

export default function AppHeader() {
  const pathname = usePathname();
  const { data: session, status } = useSession();

  // 登入頁不需要導覽列；未登入時 session 還沒建立也先不顯示，避免閃爍。
  if (pathname === "/login" || status !== "authenticated") return null;

  const role = (session?.user as any)?.role;
  const allowCreate = canCreate(role);
  const admin = isAdmin(role);

  return (
    <header className="no-print sticky top-0 z-40 bg-white border-b border-slate-200/60 px-4 sm:px-6 lg:px-8 py-3">
      <div className="max-w-7xl mx-auto w-full flex flex-wrap items-center justify-between gap-3">
        <Link href="/" className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-semibold tracking-wide hover:bg-indigo-100 transition-colors">
          <span className="h-1.5 w-1.5 rounded-full bg-indigo-600 animate-pulse"></span>
          外包廠商報價管理系統
        </Link>

        <div className="flex flex-wrap items-center gap-2">
          {allowCreate && (
            <Link
              href="/quotations/new"
              className="inline-flex justify-center items-center rounded-xl bg-indigo-600 px-3.5 py-2 text-sm font-semibold text-white shadow-md hover:bg-indigo-500 active:scale-[0.98] transition-all"
            >
              + 建立新報價單
            </Link>
          )}
          <Link
            href="/vendors"
            className="inline-flex justify-center items-center rounded-xl bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 border border-slate-200 shadow-sm hover:bg-slate-50 active:scale-[0.98] transition-all"
          >
            廠商管理
          </Link>
          {admin && (
            <Link
              href="/revenue"
              className="inline-flex justify-center items-center rounded-xl bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 border border-slate-200 shadow-sm hover:bg-slate-50 active:scale-[0.98] transition-all"
            >
              收益總覽
            </Link>
          )}
          {admin && (
            <Link
              href="/templates"
              className="inline-flex justify-center items-center rounded-xl bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 border border-slate-200 shadow-sm hover:bg-slate-50 active:scale-[0.98] transition-all"
            >
              報價範本
            </Link>
          )}
          <Link
            href="/database"
            className="inline-flex justify-center items-center rounded-xl bg-white px-3.5 py-2 text-sm font-semibold text-slate-500 border border-slate-200 shadow-sm hover:bg-slate-50 active:scale-[0.98] transition-all"
          >
            🗄️ 資料庫
          </Link>
          {admin && (
            <Link
              href="/users"
              className="inline-flex justify-center items-center rounded-xl bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 border border-slate-200 shadow-sm hover:bg-slate-50 active:scale-[0.98] transition-all"
            >
              人員管理
            </Link>
          )}
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="inline-flex justify-center items-center rounded-xl bg-white px-3.5 py-2 text-sm font-semibold text-slate-500 border border-slate-200 shadow-sm hover:bg-slate-50 active:scale-[0.98] transition-all"
          >
            登出
          </button>
        </div>
      </div>
    </header>
  );
}
