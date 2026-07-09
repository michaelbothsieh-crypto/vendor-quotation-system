"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  createdAt: string;
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState("USER");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/users");
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "無法取得人員列表");
      }
      const data = await res.json();
      setUsers(data);
      setError(null);
    } catch (err: any) {
      setError(err.message || "發生未知錯誤");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  const resetForm = () => {
    setEditingId(null);
    setEmail("");
    setPassword("");
    setName("");
    setRole("USER");
    setSubmitError(null);
  };

  const handleEdit = (u: User) => {
    setEditingId(u.id);
    setEmail(u.email);
    setPassword("");
    setName(u.name);
    setRole(u.role);
    setSubmitError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const url = editingId ? `/api/users/${editingId}` : "/api/users";
      const method = editingId ? "PATCH" : "POST";
      const body = editingId
        ? { name, role, ...(password ? { password } : {}) }
        : { email, password, name, role };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "操作失敗");
      }
      setSuccessMessage(editingId ? "已更新人員" : "已新增人員");
      resetForm();
      fetchUsers();
    } catch (err: any) {
      setSubmitError(err.message || "發生未知錯誤");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, label: string) => {
    if (!window.confirm(`確定要刪除人員「${label}」嗎？`)) return;
    try {
      const res = await fetch(`/api/users/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "刪除失敗");
      setSuccessMessage(`已刪除人員「${label}」`);
      fetchUsers();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800">
      <div className="h-1.5 w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600"></div>

      <main className="max-w-5xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-10">
        {successMessage && (
          <div className="fixed bottom-5 right-5 z-50">
            <div className="bg-slate-900 text-white px-5 py-3 rounded-xl shadow-xl flex items-center gap-3 border border-slate-800">
              <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <p className="text-sm font-medium">{successMessage}</p>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between mb-8 border-b border-slate-200/60 pb-6">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900">人員管理</h1>
            <p className="text-slate-500 text-sm mt-1">管理可登入系統的帳號與權限</p>
          </div>
          <Link
            href="/"
            className="inline-flex items-center rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 border border-slate-200 shadow-sm hover:bg-slate-50"
          >
            返回首頁
          </Link>
        </div>

        {/* 表單 */}
        <form
          onSubmit={handleSubmit}
          className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm mb-8 grid grid-cols-1 sm:grid-cols-2 gap-4"
        >
          <h2 className="col-span-full text-sm font-bold text-slate-700">
            {editingId ? "編輯人員" : "新增人員"}
          </h2>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">帳號 (Email)</label>
            <input
              type="email"
              required
              disabled={!!editingId}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-sm disabled:opacity-60 text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">姓名</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-sm text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              密碼{editingId ? "（留空表示不修改）" : ""}
            </label>
            <input
              type="password"
              required={!editingId}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-sm text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">角色</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-sm text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10"
            >
              <option value="USER">一般使用者</option>
              <option value="ADMIN">管理員</option>
            </select>
          </div>

          {submitError && (
            <div className="col-span-full bg-red-50 border border-red-200/80 rounded-lg px-3 py-2 text-sm text-red-700">
              {submitError}
            </div>
          )}

          <div className="col-span-full flex gap-3">
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md hover:bg-indigo-500 active:scale-[0.98] transition-all disabled:opacity-50"
            >
              {isSubmitting ? "處理中..." : editingId ? "儲存變更" : "新增人員"}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 border border-slate-200"
              >
                取消
              </button>
            )}
          </div>
        </form>

        {/* 列表 */}
        {isLoading ? (
          <p className="text-slate-400 text-sm">載入中...</p>
        ) : error ? (
          <div className="bg-red-50 border border-red-200/80 rounded-2xl p-8 text-center text-red-700 shadow-sm">
            {error}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200/80 text-slate-500 font-semibold">
                  <th className="py-3 px-4">帳號</th>
                  <th className="py-3 px-4">姓名</th>
                  <th className="py-3 px-4">角色</th>
                  <th className="py-3 px-4">建立時間</th>
                  <th className="py-3 px-4 text-center">動作</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                    <td className="py-3 px-4 font-mono text-xs">{u.email}</td>
                    <td className="py-3 px-4 font-medium">{u.name}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${
                          u.role === "ADMIN"
                            ? "bg-indigo-50 text-indigo-700 border border-indigo-200/50"
                            : "bg-slate-50 text-slate-600 border border-slate-200"
                        }`}
                      >
                        {u.role === "ADMIN" ? "管理員" : "一般使用者"}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-500 font-mono text-xs">
                      {new Date(u.createdAt).toLocaleDateString("zh-TW")}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleEdit(u)}
                          className="px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200"
                        >
                          編輯
                        </button>
                        <button
                          onClick={() => handleDelete(u.id, u.name)}
                          className="px-2.5 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-lg border border-transparent hover:border-rose-100"
                        >
                          刪除
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
