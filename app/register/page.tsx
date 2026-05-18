"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { request } from "@/utils/api";
import { SimpleTopBar, SiteBackground } from "@/components/SiteChrome";

export default function Register() {
  const [form, setForm] = useState({ loginId: "", password: "" });
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const triggerHaptic = useCallback(() => {
    if (typeof window !== "undefined" && window.navigator?.vibrate) {
      window.navigator.vibrate(10);
    }
  }, []);

  // 마인크래프트 닉네임과 비밀번호에서 한글 입력을 실시간으로 차단합니다.
  const handleInputChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const filteredValue = value.replace(/[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/g, "");
    setForm({ ...form, [field]: filteredValue });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    triggerHaptic();
    setIsLoading(true);
    try {
      await request("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({
          ...form,
          ingameName: form.loginId,
        }),
      });

      alert("가입을 축하합니다! 이제 로그인할 수 있습니다.");
      router.push("/login");
    } catch (error) {
      alert(error instanceof Error ? error.message : "가입 처리 중 문제가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#010101] text-zinc-100 font-sans select-none overflow-x-hidden relative flex flex-col">
      <SiteBackground />
      <SimpleTopBar onNavigate={triggerHaptic} />

      {/* 중앙 메인 컨텐츠 */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-12 sm:p-6 relative z-10">
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-[400px]"
        >
          <div className="text-center mb-8 md:mb-10">
            <h2 className="text-3xl font-black tracking-tighter uppercase text-zinc-100">회원가입</h2>
            <p className="mt-3 text-sm font-medium leading-relaxed text-zinc-500 break-keep">
              거래 알림과 경매 참여에 사용할 계정을 생성합니다.
            </p>
          </div>

          <div className="relative">
            <form 
              onSubmit={handleSubmit} 
              className="space-y-6 bg-white/[0.03] backdrop-blur-3xl p-6 sm:p-10 rounded-[32px] sm:rounded-[40px] border border-white/10 shadow-2xl"
            >
              {/* 마인크래프트 닉네임 (백엔드 필드는 loginId 유지) */}
              <div className="space-y-2">
                <label className="text-[10px] font-extrabold text-zinc-400 uppercase tracking-[0.14em] ml-2">마인크래프트 닉네임</label>
                <input 
                  required
                  type="text"
                  autoComplete="off"
                  placeholder="예: Steve"
                  className="w-full bg-white/[0.04] border border-white/10 p-4 sm:p-5 rounded-[20px] text-zinc-100 focus:border-blue-500/40 outline-none transition-all font-semibold text-base sm:text-lg placeholder:text-zinc-700" 
                  value={form.loginId}
                  onChange={handleInputChange("loginId")} 
                />
              </div>

              {/* 비밀번호 */}
              <div className="space-y-2">
                <label className="text-[10px] font-extrabold text-zinc-400 uppercase tracking-[0.14em] ml-2">비밀번호</label>
                <input 
                  required
                  type="password"
                  className="w-full bg-white/[0.04] border border-white/10 p-4 sm:p-5 rounded-[20px] text-zinc-100 focus:border-blue-500/40 outline-none transition-all font-semibold text-base sm:text-lg" 
                  value={form.password}
                  onChange={handleInputChange("password")} 
                />
              </div>

              <button 
                type="submit"
                disabled={isLoading}
                className="site-btn site-btn-primary mt-2 w-full py-4 text-sm sm:mt-4 sm:py-5 sm:text-base"
              >
                {isLoading ? "가입 중..." : "회원가입"}
              </button>
            </form>
          </div>

          <div className="mt-8 text-center">
            <Link href="/login" onClick={triggerHaptic} className="site-btn site-btn-ghost site-btn-compact">
              이미 계정이 있으신가요?
            </Link>
          </div>
        </motion.div>
      </main>
    </div>
  );
}