"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { IconLeaf } from "@/components/ui/Icons";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const { login, isAuthenticated } = useAuth();
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      router.replace("/");
      return;
    }
    setReady(true);
  }, [isAuthenticated, router]);

  if (!ready) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <span className="h-8 w-8 animate-pulse rounded-full bg-emerald-200/60" />
          <p className="text-sm text-[var(--color-muted)]">加载中…</p>
        </div>
      </div>
    );
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      setError("请输入用户名");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await login(username.trim());
      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "登录失败");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-dvh flex-col px-6 pt-10">
      <div className="mb-10 flex flex-col items-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-[22px] bg-gradient-to-br from-emerald-400 to-[#2eb872] text-white shadow-[0_8px_24px_rgba(46,184,114,0.35)]">
          <IconLeaf className="h-10 w-10" />
        </div>
        <h1 className="mt-5 text-[28px] font-bold tracking-tight text-[var(--color-text)]">
          食光记
        </h1>
        <p className="mt-1.5 text-sm text-[var(--color-muted)]">
          AI 饮食分析助手
        </p>
      </div>

      <form onSubmit={handleLogin} className="space-y-4">
        <input
          type="text"
          value={username}
          onChange={(e) => { setUsername(e.target.value); setError(""); }}
          placeholder="用户名"
          autoComplete="username"
          className="w-full rounded-2xl border border-[var(--color-border)] bg-white/80 px-4 py-3.5 text-sm outline-none transition-all focus:border-emerald-300 focus:bg-white focus:shadow-[0_0_0_3px_rgba(46,184,114,0.12)]"
        />
        {error && (
          <p className="text-center text-xs text-red-500">{error}</p>
        )}
        <button
          type="submit"
          disabled={loading}
          className="btn-primary w-full rounded-[24px] py-3.5 text-base font-semibold text-white disabled:opacity-60"
        >
          {loading ? "登录中..." : "登录"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-[var(--color-muted)]">
        没有账号？
        <Link href="/register" className="ml-1 font-medium text-emerald-600 hover:text-emerald-700">
          立即注册
        </Link>
      </p>
    </main>
  );
}
