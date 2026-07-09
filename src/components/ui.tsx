"use client";

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";

// 全域 UI 回饋元件：toast 通知與確認對話框，取代原生 alert/confirm。

type ToastType = "success" | "error" | "info";

interface ToastItem {
  id: number;
  type: ToastType;
  message: string;
}

interface ConfirmOptions {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

interface UIContextValue {
  toast: (message: string, type?: ToastType) => void;
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const UIContext = createContext<UIContextValue | null>(null);

export function useUI(): UIContextValue {
  const ctx = useContext(UIContext);
  if (!ctx) throw new Error("useUI 必須在 UIProvider 內使用");
  return ctx;
}

const TOAST_STYLES: Record<ToastType, { dot: string; border: string }> = {
  success: { dot: "bg-emerald-400", border: "border-emerald-500/30" },
  error: { dot: "bg-rose-400", border: "border-rose-500/30" },
  info: { dot: "bg-indigo-400", border: "border-indigo-500/30" },
};

export function UIProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [confirmState, setConfirmState] = useState<ConfirmOptions | null>(null);
  const nextId = useRef(0);
  const resolverRef = useRef<((ok: boolean) => void) | null>(null);

  const toast = useCallback((message: string, type: ToastType = "success") => {
    const id = nextId.current++;
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  }, []);

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      // 若已有開啟中的對話框，先取消它
      resolverRef.current?.(false);
      resolverRef.current = resolve;
      setConfirmState(options);
    });
  }, []);

  const closeConfirm = (ok: boolean) => {
    resolverRef.current?.(ok);
    resolverRef.current = null;
    setConfirmState(null);
  };

  return (
    <UIContext.Provider value={{ toast, confirm }}>
      {children}

      {/* Toast 疊放區 */}
      <div className="no-print fixed bottom-5 right-5 z-[70] flex flex-col gap-2 items-end">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`bg-slate-900 text-white px-5 py-3 rounded-xl shadow-xl flex items-center gap-3 border ${TOAST_STYLES[t.type].border} animate-[toast-in_0.25s_ease-out]`}
            role="status"
          >
            <span className={`flex h-2.5 w-2.5 rounded-full ${TOAST_STYLES[t.type].dot} animate-pulse`}></span>
            <p className="text-sm font-medium">{t.message}</p>
          </div>
        ))}
      </div>

      {/* 確認對話框 */}
      {confirmState && (
        <div
          className="no-print fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-sm"
          onClick={() => closeConfirm(false)}
        >
          <div
            className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">{confirmState.title}</h3>
            {confirmState.message && (
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 leading-relaxed whitespace-pre-line">
                {confirmState.message}
              </p>
            )}
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => closeConfirm(false)}
                className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                {confirmState.cancelLabel ?? "取消"}
              </button>
              <button
                type="button"
                autoFocus
                onClick={() => closeConfirm(true)}
                className={`px-4 py-2 rounded-xl text-sm font-bold text-white shadow-sm transition-colors ${
                  confirmState.danger
                    ? "bg-rose-600 hover:bg-rose-500"
                    : "bg-indigo-600 hover:bg-indigo-500"
                }`}
              >
                {confirmState.confirmLabel ?? "確認"}
              </button>
            </div>
          </div>
        </div>
      )}
    </UIContext.Provider>
  );
}
