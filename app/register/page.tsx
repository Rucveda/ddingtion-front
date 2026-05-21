"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";

export default function Register() {
  const [form, setForm] = useState({ loginId: "", password: "", ingameName: "" });
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const triggerHaptic = useCallback(() => {
    if (typeof window !== "undefined" && window.navigator?.vibrate) {
      window.navigator.vibrate(10);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    triggerHaptic();
    setIsLoading(true);
    try {
      const res = await fetch("http://localhost:8080/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (res.ok) {
        alert("가입을 축하합니다! DDINGTION의 회원이 되셨습니다.");
        router.push("/login");
      } else {
        alert("이미 사용 중인 아이디이거나 입력 정보가 올바르지 않습니다.");
      }
    } catch (error) {
      alert("서버 연결에 실패했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#010101] text-zinc-100 font-sans select-none overflow-x-hidden relative flex flex-col items-center justify-center p-6 selection:bg-white selection:text-black">
      
      <style jsx global>{`
        @keyframes drift {
          0% { transform: translate(-5%, -5%) scale(1); opacity: 0.5; }
          50% { transform: translate(5%, 5%) scale(1.1); opacity: 0.8; }
          100% { transform: translate(-5%, -5%) scale(1); opacity: 0.5; }
        }
        .premium-abyss-bg {
          position: fixed; inset: -15%; z-index: 0;
          background: radial-gradient(circle at 20% 30%, rgba(59, 130, 246, 0.15) 0%, transparent 40%),
                      radial-gradient(circle at 80% 20%, rgba(239, 68, 68, 0.1) 0%, transparent 40%),
                      radial-gradient(circle at 50% 80%, rgba(34, 197, 94, 0.1) 0%, transparent 40%),
                      radial-gradient(circle at 70% 70%, rgba(234, 179, 8, 0.1) 0%, transparent 40%),
                      #010101;
          filter: blur(80px); animation: drift 18s ease-in-out infinite; pointer-events: none;
        }
        .bg-texture {
          position: fixed; inset: 0; z-index: 1; opacity: 0.4; pointer-events: none;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='4' height='4' viewBox='0 0 4 4'%3E%3Cpath fill='%23ffffff' fill-opacity='0.08' d='M1 3h1v1H1V3zm2-2h1v1H2V1z'%3E%3C/path%3E%3C/svg%3E");
        }
      `}</style>

      {/* 배경 레이어 */}
      <div className="premium-abyss-bg" />
      <div className="bg-texture" />

      {/* 우측 상단 닫기 버튼 */}
      <Link 
        href="/" 
        onClick={triggerHaptic}
        className="absolute top-8 right-8 z-50 w-12 h-12 flex items-center justify-center rounded-full border border-white/10 bg-black/40 backdrop-blur-md text-zinc-500 hover:text-white transition-all duration-300 group"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 transform group-hover:rotate-90 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </Link>

      <motion.main 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="w-full max-w-lg relative z-10"
      >
        {/* 상단 로고부 */}
        <div className="text-center mb-12">
          <Link href="/" onClick={triggerHaptic} className="inline-block group transition-transform duration-500 hover:scale-105 mb-8">
            <span className="text-5xl font-black tracking-tighter">
              <span className="text-[#3b82f6]">D</span><span className="text-[#eab308]">D</span>
              <span className="text-[#3b82f6]">I</span><span className="text-[#22c55e]">N</span>
              <span className="text-[#eab308]">G</span><span className="text-[#ef4444]">T</span>
              <span className="text-[#3b82f6]">I</span><span className="text-[#22c55e]">O</span>
              <span className="text-[#ef4444]">N</span>
            </span>
          </Link>
          <h2 className="text-4xl font-black tracking-tighter italic uppercase mb-3 leading-none">Registration</h2>
          <p className="text-zinc-500 font-bold text-xs uppercase tracking-[0.3em] opacity-80">Join the Elite Hunter Guild</p>
        </div>

        {/* 회원가입 카드 */}
        <div className="relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-[48px] blur-3xl opacity-50 group-focus-within:opacity-100 transition-opacity duration-700" />
          
          <form 
            onSubmit={handleSubmit} 
            className="relative space-y-7 bg-black/40 backdrop-blur-3xl p-12 rounded-[48px] border border-white/5 shadow-2xl"
          >
            {/* 아이디 */}
            <div className="space-y-3">
              <label className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.2em] ml-2">Identity Token (ID)</label>
              <input 
                required
                className="w-full bg-black/60 border border-white/10 p-5 rounded-[22px] text-zinc-100 focus:border-white/20 outline-none transition-all duration-300 placeholder:text-zinc-800 font-bold text-lg" 
                placeholder="Unique Identifier" 
                onChange={e => setForm({...form, loginId: e.target.value})} 
              />
            </div>

            {/* 비밀번호 */}
            <div className="space-y-3">
              <label className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.2em] ml-2">Access Key (PW)</label>
              <input 
                required
                type="password"
                className="w-full bg-black/60 border border-white/10 p-5 rounded-[22px] text-zinc-100 focus:border-white/20 outline-none transition-all duration-300 placeholder:text-zinc-800 font-bold text-lg" 
                placeholder="Secure Code" 
                onChange={e => setForm({...form, password: e.target.value})} 
              />
            </div>

            {/* 인게임 닉네임 */}
            <div className="space-y-3">
              <label className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.2em] ml-2">Alias (MC Name)</label>
              <input 
                required
                className="w-full bg-black/60 border border-white/10 p-5 rounded-[22px] text-zinc-100 focus:border-white/20 outline-none transition-all duration-300 placeholder:text-zinc-800 font-bold text-lg" 
                placeholder="Minecraft Nickname" 
                onChange={e => setForm({...form, ingameName: e.target.value})} 
              />
            </div>
            
            <button 
              disabled={isLoading}
              className="w-full bg-white hover:bg-zinc-200 text-black font-black py-6 rounded-[24px] transition-all duration-500 transform active:scale-[0.96] shadow-2xl text-xl uppercase italic tracking-tighter disabled:bg-zinc-900 disabled:text-zinc-700 mt-4"
            >
              {isLoading ? "Processing..." : "Complete Deployment"}
            </button>
          </form>
        </div>

        {/* 하단 네비게이션 */}
        <div className="mt-10 text-center space-y-6">
          <p className="text-zinc-500 text-sm font-bold uppercase tracking-widest">
            Already verified?{" "}
            <Link href="/login" onClick={triggerHaptic} className="text-white hover:text-cyan-400 font-black transition-all border-b border-white/10 hover:border-cyan-400/50 pb-1 ml-2">
              SIGN IN NOW
            </Link>
          </p>
          
          <div className="pt-10 opacity-30">
            <div className="text-[9px] font-black tracking-[0.5em] text-zinc-600 uppercase">
              DDINGTION REGISTER PROTOCOL v2.6
            </div>
          </div>
        </div>
      </motion.main>
    </div>
  );
}