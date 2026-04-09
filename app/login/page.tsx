"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";

export default function LoginPage() {
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const triggerHaptic = useCallback(() => {
    if (typeof window !== "undefined" && window.navigator?.vibrate) {
      window.navigator.vibrate(10);
    }
  }, []);

  // 한글 입력을 실시간으로 제거하는 함수
  const handleInputChange = (setter: (val: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const filteredValue = value.replace(/[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/g, "");
    setter(filteredValue);
  };

  const handleLogin = async (e?: React.FormEvent) => {
    // 💡 form의 기본 제출 동작(새로고침) 방지
    if (e) e.preventDefault();
    
    if (isLoading || !loginId || !password) return;

    triggerHaptic();
    setIsLoading(true);

    try {
      const res = await fetch("https://ddingtion-back.onrender.com/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ loginId, password }),
      });

      const data = await res.json();

      if (res.ok) {
        localStorage.clear(); 
        localStorage.setItem("token", data.token);
        if (data.user) {
          localStorage.setItem("user", JSON.stringify(data.user));
        }
        router.push("/");
        setTimeout(() => { window.location.reload(); }, 100); 
      } else {
        alert(data.error || "정보를 확인해주세요.");
      }
    } catch (error) {
      alert("서버 연결 실패");
    } finally {
      setIsLoading(false);
    }
  };

  // 💡 엔터키 입력을 감지하는 핸들러 추가
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleLogin();
    }
  };

  return (
    <div className="min-h-screen bg-[#010101] text-zinc-100 font-sans select-none overflow-x-hidden relative flex flex-col">
      
      <style jsx global>{`
        .premium-abyss-bg {
          position: fixed; inset: -15%; z-index: 0;
          background: radial-gradient(circle at 20% 30%, rgba(59, 130, 246, 0.12) 0%, transparent 40%),
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

      <main className="flex-1 flex flex-col items-center justify-center p-6 relative z-10">
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-[400px]"
        >
          <div className="text-center mb-10">
            <h2 className="text-3xl font-black tracking-tighter uppercase">로그인</h2>
          </div>

          <div className="relative">
            {/* 💡 onSubmit 핸들러가 엔터키를 감지합니다. */}
            <form 
              onSubmit={handleLogin} 
              className="space-y-6 bg-white/[0.02] backdrop-blur-3xl p-10 rounded-[40px] border border-white/5 shadow-2xl"
            >
              <div className="space-y-2">
                <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest ml-2">아이디</label>
                <input 
                  required
                  autoFocus
                  type="text"
                  autoComplete="off"
                  onKeyDown={handleKeyDown} // 💡 개별 입력창에서도 엔터 감지
                  className="w-full bg-white/[0.03] border border-white/10 p-5 rounded-[20px] text-zinc-100 focus:border-blue-500/30 outline-none transition-all font-bold text-lg"
                  value={loginId}
                  onChange={handleInputChange(setLoginId)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest ml-2">비밀번호</label>
                <input 
                  required
                  type="password"
                  onKeyDown={handleKeyDown} // 💡 개별 입력창에서도 엔터 감지
                  className="w-full bg-white/[0.03] border border-white/10 p-5 rounded-[20px] text-zinc-100 focus:border-blue-500/30 outline-none transition-all font-bold text-lg"
                  value={password}
                  onChange={handleInputChange(setPassword)}
                />
              </div>

              <button 
                type="submit" // 💡 submit 타입은 엔터키를 눌렀을 때 form을 제출시킵니다.
                disabled={isLoading}
                className="w-full bg-white hover:bg-zinc-200 text-black font-black py-5 rounded-[20px] transition-all transform active:scale-[0.98] shadow-xl text-lg disabled:bg-zinc-900 disabled:text-zinc-700 mt-4"
              >
                {isLoading ? "접속 중..." : "로그인"}
              </button>
            </form>
          </div>

          <div className="mt-8 text-center">
            <Link href="/register" onClick={triggerHaptic} className="text-zinc-500 hover:text-white text-xs font-bold uppercase tracking-widest transition-all">
              계정 생성하기
            </Link>
          </div>
        </motion.div>
      </main>
    </div>
  );
}