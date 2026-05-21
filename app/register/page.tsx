"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { request } from "@/lib/client/api";
import { SimpleTopBar, SiteBackground } from "@/components/SiteChrome";

export default function RegisterPage() {
  const [form, setForm] = useState({ loginId: "", password: "", ingameName: "" });
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const triggerHaptic = useCallback(() => {
    if (typeof window !== "undefined" && window.navigator?.vibrate) {
      window.navigator.vibrate(10);
    }
  }, []);

  const handleLatinInput =
    (field: "loginId" | "password" | "ingameName") => (e: React.ChangeEvent<HTMLInputElement>) => {
      const value =
        field === "password" ? e.target.value : e.target.value.replace(/[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/g, "");
      setForm((prev) => ({ ...prev, [field]: value }));
    };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    triggerHaptic();
    setIsLoading(true);
    try {
      const data = await request("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({
          loginId: form.loginId.trim(),
          password: form.password,
          ingameName: form.ingameName.trim(),
        }),
      });
      if (data) {
        alert("가입을 축하합니다! DDINGTION의 회원이 되셨습니다.");
        router.push("/login");
      }
    } catch (error) {
      alert(error instanceof Error ? error.message : "회원가입에 실패했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#010101] text-zinc-100 font-sans select-none overflow-x-hidden relative flex flex-col">
      <SiteBackground />
      <SimpleTopBar onNavigate={triggerHaptic} />

      <main className="flex-1 flex flex-col items-center justify-center px-4 py-12 sm:p-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-[400px]"
        >
          <div className="text-center mb-8 md:mb-10">
            <h2 className="text-3xl font-black tracking-tighter uppercase text-zinc-100">회원가입</h2>
            <p className="mt-3 text-sm font-medium leading-relaxed text-zinc-500 break-keep">
              가입 아이디로 로그인하고, 마인크래프트 닉네임은 서비스에 표시됩니다. 둘 다 나중에 다르게 설정할 수 있습니다.
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="flex flex-col space-y-6 bg-white/[0.03] backdrop-blur-3xl p-6 sm:p-10 rounded-[32px] sm:rounded-[40px] border border-white/10 shadow-2xl"
          >
            <div className="space-y-2">
              <label className="text-[10px] font-extrabold text-zinc-400 uppercase tracking-[0.14em] ml-2">
                가입 아이디
              </label>
              <input
                required
                autoFocus
                type="text"
                autoComplete="username"
                placeholder="영문·숫자·_ (로그인용)"
                className="w-full bg-white/[0.04] border border-white/10 p-4 sm:p-5 rounded-[20px] text-zinc-100 focus:border-blue-500/40 outline-none transition-all font-semibold text-base sm:text-lg placeholder:text-zinc-700"
                value={form.loginId}
                onChange={handleLatinInput("loginId")}
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-extrabold text-zinc-400 uppercase tracking-[0.14em] ml-2">
                비밀번호
              </label>
              <input
                required
                type="password"
                autoComplete="new-password"
                className="w-full bg-white/[0.04] border border-white/10 p-4 sm:p-5 rounded-[20px] text-zinc-100 focus:border-blue-500/40 outline-none transition-all font-bold text-lg"
                value={form.password}
                onChange={handleLatinInput("password")}
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-extrabold text-zinc-400 uppercase tracking-[0.14em] ml-2">
                마인크래프트 닉네임
              </label>
              <input
                required
                type="text"
                autoComplete="nickname"
                placeholder="예: Steve (3~16자)"
                className="w-full bg-white/[0.04] border border-white/10 p-4 sm:p-5 rounded-[20px] text-zinc-100 focus:border-blue-500/40 outline-none transition-all font-semibold text-base sm:text-lg placeholder:text-zinc-700"
                value={form.ingameName}
                onChange={handleLatinInput("ingameName")}
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="site-btn site-btn-primary mt-2 w-full py-4 text-sm sm:mt-4 sm:py-5 sm:text-base"
            >
              {isLoading ? "가입 처리 중..." : "가입하기"}
            </button>
          </form>

          <div className="mt-8 flex flex-col items-center gap-3 text-center">
            <Link href="/login" onClick={triggerHaptic} className="site-btn site-btn-ghost site-btn-compact">
              이미 계정이 있으신가요? 로그인
            </Link>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
