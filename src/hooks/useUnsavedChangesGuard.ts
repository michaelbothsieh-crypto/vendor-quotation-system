"use client";

import { useEffect } from "react";

const DEFAULT_MESSAGE = "你有尚未儲存的變更，確定要離開嗎？";

/**
 * 表單有未儲存變更時，攔截頁面關閉/重新整理（beforeunload）與站內連結點擊，
 * 詢問是否放棄變更。
 * ponytail: 瀏覽器「上一頁/下一頁」按鈕（popstate）不會被攔截 —
 * App Router 沒有提供可攔截的路由守衛 API，真的需要再加。
 */
export function useUnsavedChangesGuard(isDirty: boolean, message: string = DEFAULT_MESSAGE) {
  useEffect(() => {
    if (!isDirty) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);

    const handleClick = (e: MouseEvent) => {
      const anchor = (e.target as HTMLElement)?.closest("a");
      if (!anchor) return;
      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#")) return;
      if (!window.confirm(message)) {
        e.preventDefault();
        e.stopImmediatePropagation();
      }
    };
    document.addEventListener("click", handleClick, true);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("click", handleClick, true);
    };
  }, [isDirty, message]);
}
