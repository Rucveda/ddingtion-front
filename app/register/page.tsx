"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { request } from "@/utils/api";

export default function Register() {
  const [form, setForm] = useState({ loginId: "", password: "", ingameName: "" });
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const triggerHaptic = useCallback(() => {
    if (typeof window !== "undefined" && window.navigator?.vibrate) {
      window.navigator.vibrate(10);
    }
  }, []);

  // 💡 아이디와 비밀번호에서 한글 입력을 실시간으로 차단하는 함수
  const handleInputChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // 아이디와 비밀번호는 영문/숫자/특수문자만 허용 (한글 제거)
    const filteredValue = field === "ingameName" ? value : value.replace(/[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/g, "");
    setForm({ ...form, [field]: filteredValue });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    triggerHaptic();
    setIsLoading(true);
    try {
      const data = await request("/api/auth/register", {
        method: "POST",
        body: JSON.stringify(form),
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
      
      <style jsx global>{`
        .premium-abyss-bg {
          position: fixed; inset: -15%; z-index: 0;
          background: radial-gradient(circle at 20% 30%, rgba(59, 130, 246, 0.12) 0%, transparent 40%),
                      radial-gradient(circle at 80% 20%, rgba(239, 68, 68, 0.08) 0%, transparent 40%),
                      radial-gradient(circle at 50% 50%, rgba(15, 15, 15, 1) 0%, rgba(1, 1, 1, 1) 100%);
          filter: blur(80px); pointer-events: none;
        }
        .bg-texture {
          position: fixed; inset: 0; z-index: 1; opacity: 0.3; pointer-events: none;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='4' height='4' viewBox='0 0 4 4'%3E%3Cpath fill='%23ffffff' fill-opacity='0.08' d='M1 3h1v1H1V3zm2-2h1v1H2V1z'%3E%3C/path%3E%3C/svg%3E");
        }
      `}</style>

      <div className="premium-abyss-bg" />
      <div className="bg-texture" />

      {/* 상단 네비게이션: 로그인과 동일하게 로고만 */}
      <nav className="sticky top-0 z-50 border-b border-white/5 bg-black/40 backdrop-blur-2xl">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center relative z-10">
          <Link href="/" onClick={triggerHaptic} className="flex items-center gap-1 group">
            <span className="text-3xl font-black tracking-tighter transition-transform group-hover:scale-105">
              <span className="text-[#3b82f6]">D</span><span className="text-[#eab308]">D</span>
              <span className="text-[#3b82f6]">I</span><span className="text-[#22c55e]">N</span>
              <span className="text-[#eab308]">G</span><span className="text-[#ef4444]">T</span>
              <span className="text-[#3b82f6]">I</span><span className="text-[#22c55e]">O</span>
              <span className="text-[#ef4444]">N</span>
            </span>
          </Link>
        </div>
      </nav>

      {/* 중앙 메인 컨텐츠 */}
      <main className="flex-1 flex flex-col items-center justify-center p-6 relative z-10">
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-[400px]"
        >
          <div className="text-center mb-10">
            <h2 className="text-3xl font-black tracking-tighter uppercase">회원가입</h2>
          </div>

          <div className="relative">
            <form 
              onSubmit={handleSubmit} 
              className="space-y-6 bg-white/[0.02] backdrop-blur-3xl p-10 rounded-[40px] border border-white/5 shadow-2xl"
            >
              {/* 아이디 */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest ml-2">아이디</label>
                <input 
                  required
                  type="text"
                  autoComplete="off"
                  className="w-full bg-white/[0.03] border border-white/10 p-5 rounded-[20px] text-zinc-100 focus:border-blue-500/30 outline-none transition-all font-bold text-lg" 
                  value={form.loginId}
                  onChange={handleInputChange("loginId")} 
                />
              </div>

              {/* 비밀번호 */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest ml-2">비밀번호</label>
                <input 
                  required
                  type="password"
                  className="w-full bg-white/[0.03] border border-white/10 p-5 rounded-[20px] text-zinc-100 focus:border-blue-500/30 outline-none transition-all font-bold text-lg" 
                  value={form.password}
                  onChange={handleInputChange("password")} 
                />
              </div>

              {/* 인게임 닉네임 (닉네임은 한글 허용 가능성이 있어 필터 제외) */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest ml-2">인게임 닉네임</label>
                <input 
                  required
                  type="text"
                  className="w-full bg-white/[0.03] border border-white/10 p-5 rounded-[20px] text-zinc-100 focus:border-blue-500/30 outline-none transition-all font-bold text-lg" 
                  value={form.ingameName}
                  onChange={handleInputChange("ingameName")} 
                />
              </div>
              
              <button 
                type="submit"
                disabled={isLoading}
                className="w-full bg-white hover:bg-zinc-200 text-black font-black py-5 rounded-[20px] transition-all transform active:scale-[0.98] shadow-xl text-lg disabled:bg-zinc-900 disabled:text-zinc-700 mt-4"
              >
                {isLoading ? "가입 중..." : "회원가입"}
              </button>
            </form>
          </div>

          <div className="mt-8 text-center">
            <Link href="/login" onClick={triggerHaptic} className="text-zinc-500 hover:text-white text-xs font-bold uppercase tracking-widest transition-all">
              이미 계정이 있으신가요?
            </Link>
          </div>
        </motion.div>
      </main>
    </div>
  );
}