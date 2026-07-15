"use client";

import { useSyncExternalStore } from "react";

// 以 <html> 的 class 為唯一事實來源，任何地方改 dark class 都會同步到此按鈕
function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  return () => observer.disconnect();
}

export default function ThemeToggle() {
  const isDark = useSyncExternalStore(
    subscribe,
    () => document.documentElement.classList.contains("dark"),
    () => false // SSR 一律先當亮色
  );

  const toggle = () => {
    const next = !isDark;
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
  };

  return (
    <button
      onClick={toggle}
      title={isDark ? "切換為亮色模式" : "切換為深色模式"}
      className="no-print fixed bottom-4 left-4 z-[100] flex items-center gap-2 rounded-full bg-indigo-600 hover:bg-indigo-500 dark:bg-amber-400 dark:hover:bg-amber-300 pl-3 pr-4 py-2.5 shadow-xl ring-2 ring-white/40 dark:ring-black/20 text-white dark:text-slate-900 font-semibold text-sm hover:scale-105 active:scale-95 transition-all"
    >
      {isDark ? (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ) : (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
        </svg>
      )}
      {isDark ? "淺色模式" : "深色模式"}
    </button>
  );
}
