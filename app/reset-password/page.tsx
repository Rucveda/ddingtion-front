"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { request } from "@/lib/client/api";
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
    if (!token) return alert("??? ??? ????. ??? ???? ?? ??? ???.");
    if (password.length < 4) return alert("????? 4? ????? ???.");
    if (password !== confirmPassword) return alert("????? ???? ????.");

    setIsSubmitting(true);
    try {
      await request("/api/auth/password-reset/confirm", {
        method: "POST",
        body: JSON.stringify({ token, password }),
      });
      alert("????? ????????. ? ????? ???? ???.");
      router.push("/login");
    } catch (error) {
      alert(error instanceof Error ? error.message : "???? ???? ??????.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#010101] text-zinc-100 font-sans relative overflow-x-hidden">
      <SiteBackground />
      <SimpleTopBar closeHref="/login" closeLabel="????? ????" />

      <main className="relative z-10 flex min-h-[calc(100vh-4.5rem)] items-center justify-center px-4 py-12">
        <section className="site-card w-full max-w-md rounded-[32px] p-6 sm:p-8">
          <p className="site-label text-blue-400">Password Reset</p>
          <h1 className="mt-2 text-2xl font-extrabold tracking-[-0.04em] text-white">???? ???</h1>
          <p className="mt-3 text-xs font-medium leading-relaxed text-zinc-500 break-keep">
            Discord ??? ???????. ? ????? ???? ?? ????? ?????.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="? ????"
              className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-zinc-100 outline-none transition-all placeholder:text-zinc-700 focus:border-blue-500/40"
            />
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="? ???? ??"
              className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-zinc-100 outline-none transition-all placeholder:text-zinc-700 focus:border-blue-500/40"
            />
            <button
              type="submit"
              disabled={!token || isSubmitting}
              className="site-btn site-btn-primary w-full py-3"
            >
              {isSubmitting ? "?? ?..." : "???? ??"}
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
