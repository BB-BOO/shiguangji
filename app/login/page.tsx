"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { IconLeaf } from "@/components/ui/Icons";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const { login, isAuthenticated } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

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

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError("请填写完整");
      return;
    }
    login(email, password);
    router.push("/");
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
          value={email}
          onChange={(e) => { setEmail(e.target.value); setError(""); }}
          placeholder="邮箱 / 手机号"
          className="w-full rounded-2xl border border-[var(--color-border)] bg-white/80 px-4 py-3.5 text-sm outline-none transition-all focus:border-emerald-300 focus:bg-white focus:shadow-[0_0_0_3px_rgba(46,184,114,0.12)]"
        />
        <input
          type="password"
          value={password}
          onChange={(e) => { setPassword(e.target.value); setError(""); }}
          placeholder="密码"
          className="w-full rounded-2xl border border-[var(--color-border)] bg-white/80 px-4 py-3.5 text-sm outline-none transition-all focus:border-emerald-300 focus:bg-white focus:shadow-[0_0_0_3px_rgba(46,184,114,0.12)]"
        />
        {error && (
          <p className="text-center text-xs text-red-500">{error}</p>
        )}
        <button
          type="submit"
          className="btn-primary w-full rounded-[24px] py-3.5 text-base font-semibold text-white"
        >
          登录
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
