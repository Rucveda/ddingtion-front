"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { request } from "@/utils/api";
import { SimpleTopBar, SiteBackground } from "@/components/SiteChrome";

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return alert("재설정 토큰이 없습니다. 로그인 화면에서 다시 시도해 주세요.");
    if (password.length < 4) return alert("비밀번호는 4자 이상이어야 합니다.");
    if (password !== confirmPassword) return alert("비밀번호가 일치하지 않습니다.");

    setIsSubmitting(true);
    try {
      await request("/api/auth/password-reset/confirm", {
        method: "POST",
        body: JSON.stringify({ token, password }),
      });
      alert("비밀번호가 재설정되었습니다. 새 비밀번호로 로그인해 주세요.");
      router.push("/login");
    } catch (error) {
      alert(error instanceof Error ? error.message : "비밀번호 재설정에 실패했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#010101] text-zinc-100 font-sans relative overflow-x-hidden">
      <SiteBackground />
      <SimpleTopBar closeHref="/login" closeLabel="로그인으로 돌아가기" />

      <main className="relative z-10 flex min-h-[calc(100vh-4.5rem)] items-center justify-center px-4 py-12">
        <section className="site-card w-full max-w-md rounded-[32px] p-6 sm:p-8">
          <p className="site-label text-blue-400">Password Reset</p>
          <h1 className="mt-2 text-2xl font-extrabold tracking-[-0.04em] text-white">비밀번호 재설정</h1>
          <p className="mt-3 text-xs font-medium leading-relaxed text-zinc-500 break-keep">
            Discord 인증이 완료되었습니다. 새 비밀번호를 입력하면 계정 비밀번호가 변경됩니다.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="새 비밀번호"
              className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-zinc-100 outline-none transition-all placeholder:text-zinc-700 focus:border-blue-500/40"
            />
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="새 비밀번호 확인"
              className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-zinc-100 outline-none transition-all placeholder:text-zinc-700 focus:border-blue-500/40"
            />
            <button
              type="submit"
              disabled={!token || isSubmitting}
              className="site-btn site-btn-primary w-full py-3"
            >
              {isSubmitting ? "변경 중..." : "비밀번호 변경"}
            </button>
          </form>
        </section>
      </main>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#010101]" />}>
      <ResetPasswordContent />
    </Suspense>
  );
}
