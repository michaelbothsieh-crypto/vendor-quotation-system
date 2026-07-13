"use client";

import { useEffect, useState } from "react";
import { useUI } from "@/components/ui";
import type { RoleDef } from "@/lib/calculator";

interface Template {
  id: string;
  name: string;
  isDefault: boolean;
  roles: RoleDef[];
  paymentTerms: string | null;
  notes: string | null;
  updatedAt: string;
}

interface RoleRow {
  key: string;
  label: string;
  rate: string;
}

const inputClass =
  "w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-800 placeholder-slate-400 text-sm transition-all focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10";

function newRoleKey(): string {
  return `role-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

const EMPTY_FORM = {
  id: null as string | null,
  name: "",
  isDefault: false,
  paymentTerms: "",
  notes: "",
  roles: [{ key: newRoleKey(), label: "", rate: "8000" }] as RoleRow[],
};

export default function TemplatesPage() {
  const { toast, confirm } = useUI();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });

  const fetchTemplates = async () => {
    try {
      const res = await fetch("/api/templates");
      if (!res.ok) throw new Error("無法取得範本列表");
      setTemplates(await res.json());
    } catch (err: any) {
      toast(err.message, "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startEdit = (t: Template) => {
    setForm({
      id: t.id,
      name: t.name,
      isDefault: t.isDefault,
      paymentTerms: t.paymentTerms ?? "",
      notes: t.notes ?? "",
      roles: t.roles.map((r) => ({ key: r.key, label: r.label, rate: String(r.rate) })),
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const resetForm = () => setForm({ ...EMPTY_FORM, roles: [{ key: newRoleKey(), label: "", rate: "8000" }] });

  // 角色列操作
  const updateRole = (index: number, field: "label" | "rate", value: string) => {
    if (field === "rate" && value !== "" && !/^\d*$/.test(value)) return;
    const roles = [...form.roles];
    roles[index] = { ...roles[index], [field]: value };
    setForm({ ...form, roles });
  };

  const moveRole = (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= form.roles.length) return;
    const roles = [...form.roles];
    [roles[index], roles[target]] = [roles[target], roles[index]];
    setForm({ ...form, roles });
  };

  const removeRole = (index: number) => {
    if (form.roles.length <= 1) {
      toast("範本至少需要一個角色欄位", "error");
      return;
    }
    setForm({ ...form, roles: form.roles.filter((_, i) => i !== index) });
  };

  const addRole = () => {
    setForm({ ...form, roles: [...form.roles, { key: newRoleKey(), label: "", rate: "6000" }] });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast("請輸入範本名稱", "error");
      return;
    }
    if (form.roles.some((r) => !r.label.trim())) {
      toast("角色欄位名稱不可為空白", "error");
      return;
    }

    const payload = {
      name: form.name.trim(),
      isDefault: form.isDefault,
      paymentTerms: form.paymentTerms,
      notes: form.notes,
      roles: form.roles.map((r) => ({
        key: r.key,
        label: r.label.trim(),
        rate: parseInt(r.rate || "0", 10),
      })),
    };

    try {
      setIsSubmitting(true);
      const res = await fetch(form.id ? `/api/templates/${form.id}` : "/api/templates", {
        method: form.id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "儲存範本失敗");
      toast(form.id ? "範本已更新" : "範本已建立");
      resetForm();
      fetchTemplates();
    } catch (err: any) {
      toast(err.message, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (t: Template) => {
    const ok = await confirm({
      title: `刪除範本「${t.name}」？`,
      message: "已建立的報價單保存自己的角色快照，不受影響。",
      confirmLabel: "刪除",
      danger: true,
    });
    if (!ok) return;
    try {
      const res = await fetch(`/api/templates/${t.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "刪除範本失敗");
      toast(`已刪除範本「${t.name}」`);
      if (form.id === t.id) resetForm();
      fetchTemplates();
    } catch (err: any) {
      toast(err.message, "error");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800">
      <div className="h-1.5 w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600"></div>

      <div className="bg-white border-b border-slate-200/60 px-4 sm:px-6 lg:px-8 py-6">
        <div className="max-w-7xl mx-auto w-full">
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 dark:from-slate-50 dark:via-indigo-200 dark:to-slate-50 bg-clip-text text-transparent">
            報價範本管理
          </h1>
          <p className="text-slate-500 text-sm mt-1.5 leading-relaxed">
            自訂報價單的工時角色欄位（名稱、費率、順序）與預設商務條件，建立新報價單時直接套用。
          </p>
        </div>
      </div>

      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-10 grid grid-cols-1 lg:grid-cols-5 gap-8">
        {/* 左側：範本列表 */}
        <div className="lg:col-span-2 space-y-4">
          {isLoading ? (
            <div className="bg-white rounded-2xl border border-slate-200/80 p-6 animate-pulse space-y-3">
              {[1, 2].map((n) => (
                <div key={n} className="h-16 bg-slate-100 rounded-xl"></div>
              ))}
            </div>
          ) : (
            templates.map((t) => (
              <div
                key={t.id}
                className={`bg-white rounded-2xl border shadow-sm p-5 transition-all ${
                  form.id === t.id ? "border-indigo-400 ring-4 ring-indigo-500/10" : "border-slate-200/80"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-slate-900">{t.name}</h3>
                      {t.isDefault && (
                        <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-[10px] font-bold border border-indigo-100/50">
                          預設
                        </span>
                      )}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {t.roles.map((r) => (
                        <span
                          key={r.key}
                          className="px-2 py-0.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-600"
                        >
                          {r.label} <span className="font-mono text-slate-400">${r.rate.toLocaleString()}/天</span>
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => startEdit(t)}
                      className="px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors"
                    >
                      編輯
                    </button>
                    <button
                      onClick={() => handleDelete(t)}
                      className="px-2.5 py-1.5 text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors"
                    >
                      刪除
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* 右側：新增/編輯表單 */}
        <form onSubmit={handleSubmit} className="lg:col-span-3 bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 sm:p-8 space-y-6 h-fit">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-indigo-600"></span>
              {form.id ? "編輯範本" : "新增範本"}
            </h2>
            {form.id && (
              <button
                type="button"
                onClick={resetForm}
                className="text-xs font-semibold text-slate-500 hover:text-slate-700"
              >
                改為新增 +
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-2">
                範本名稱 <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="例如：標準開發範本、純顧問服務"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className={inputClass}
              />
            </div>
            <label className="flex items-end gap-2 pb-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={form.isDefault}
                onChange={(e) => setForm({ ...form, isDefault: e.target.checked })}
                className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-sm font-semibold text-slate-700">設為預設範本（建單時自動套用）</span>
            </label>
          </div>

          {/* 角色欄位編輯器 */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-xs font-semibold text-slate-500">工時角色欄位（順序即報價單欄位順序）</label>
              <button
                type="button"
                onClick={addRole}
                className="px-3 py-1.5 text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-600 hover:text-white rounded-lg transition-all"
              >
                新增角色 +
              </button>
            </div>
            <div className="space-y-2">
              {form.roles.map((role, index) => (
                <div key={role.key} className="flex items-center gap-2">
                  <div className="flex flex-col">
                    <button
                      type="button"
                      onClick={() => moveRole(index, -1)}
                      disabled={index === 0}
                      className="text-slate-400 hover:text-indigo-600 disabled:opacity-20 leading-none p-0.5"
                      title="上移"
                    >
                      ▲
                    </button>
                    <button
                      type="button"
                      onClick={() => moveRole(index, 1)}
                      disabled={index === form.roles.length - 1}
                      className="text-slate-400 hover:text-indigo-600 disabled:opacity-20 leading-none p-0.5"
                      title="下移"
                    >
                      ▼
                    </button>
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="角色名稱（如：RD、設計師）"
                    value={role.label}
                    onChange={(e) => updateRole(index, "label", e.target.value)}
                    className={`${inputClass} flex-1`}
                  />
                  <div className="relative w-40">
                    <input
                      type="text"
                      required
                      placeholder="8000"
                      value={role.rate}
                      onChange={(e) => updateRole(index, "rate", e.target.value)}
                      className={`${inputClass} pr-12 text-right font-mono`}
                    />
                    <span className="absolute inset-y-0 right-3 flex items-center text-xs text-slate-400 pointer-events-none">
                      元/天
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeRole(index)}
                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                    title="刪除此角色"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-2">預設付款條件（建單時預填，可再修改）</label>
              <input
                type="text"
                placeholder="例如：驗收完成後 30 日內電匯付款"
                value={form.paymentTerms}
                onChange={(e) => setForm({ ...form, paymentTerms: e.target.value })}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-2">預設條款備註</label>
              <textarea
                rows={3}
                placeholder="例如：本報價單有效期限內有效，逾期需重新報價。"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className={inputClass}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-sm font-bold shadow-lg active:scale-[0.99] transition-all disabled:bg-slate-300 disabled:cursor-not-allowed"
          >
            {isSubmitting ? "儲存中..." : form.id ? "更新範本" : "建立範本"}
          </button>
        </form>
      </main>
    </div>
  );
}
