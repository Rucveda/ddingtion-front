"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { request } from "@/utils/api";
import { SimpleTopBar, SiteBackground } from "@/components/SiteChrome";

export default function LoginPage() {
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [resetLoginId, setResetLoginId] = useState("");
  const [showReset, setShowReset] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isLongWait, setIsLongWait] = useState(false);
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
    setIsLongWait(false);

    const timeoutId = setTimeout(() => {
      setIsLongWait(true);
    }, 5000); // 💡 요청 후 5초가 지나면 지연 안내 메시지 표시

    try {
      const data = await request("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ loginId, password }),
      });

      if (data && data.token) {
        localStorage.clear();
        sessionStorage.clear();
        localStorage.setItem("token", data.token); // 💡 새 탭 유지 및 타 컴포넌트 연동을 위해 로컬로 저장
        if (data.user) {
          localStorage.setItem("user", JSON.stringify(data.user));
        }
        router.push("/");
        setTimeout(() => { window.location.reload(); }, 100); 
      }
    } catch (error) {
      alert(error instanceof Error ? error.message : "로그인에 실패했습니다.");
    } finally {
      clearTimeout(timeoutId); // 💡 완료되거나 실패하면 타이머 정리
      if (!isLongWait) setIsLongWait(false);
      setIsLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!resetLoginId.trim() || resetLoading) return;
    triggerHaptic();
    setResetLoading(true);
    try {
      const data = await request("/api/auth/password-reset/discord/authorize", {
        method: "POST",
        body: JSON.stringify({ loginId: resetLoginId.trim() }),
      });
      if (data?.url) {
        window.location.href = data.url as string;
        return;
      }
      alert("비밀번호 재설정 인증 주소를 받지 못했습니다.");
    } catch (error) {
      alert(error instanceof Error ? error.message : "비밀번호 재설정을 시작할 수 없습니다.");
    } finally {
      setResetLoading(false);
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
      <SiteBackground />
      <SimpleTopBar onNavigate={triggerHaptic} />

      <main className="flex-1 flex flex-col items-center justify-center px-4 py-12 sm:p-6 relative z-10">
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-[400px]"
        >
          <div className="text-center mb-8 md:mb-10">
            <h2 className="text-3xl font-black tracking-tighter uppercase text-zinc-100">로그인</h2>
            <p className="mt-3 text-sm font-medium leading-relaxed text-zinc-500 break-keep">
              경매 입찰, 물품 등록, 거래 채팅을 이용하려면 계정 접속이 필요합니다.
            </p>
          </div>

          <div className="relative">
            {/* 💡 onSubmit 핸들러가 엔터키를 감지합니다. */}
            <form 
              onSubmit={handleLogin} 
              className="flex flex-col space-y-6 bg-white/[0.03] backdrop-blur-3xl p-6 sm:p-10 rounded-[32px] sm:rounded-[40px] border border-white/10 shadow-2xl"
            >
              <div className="space-y-2">
                <label className="text-[10px] font-extrabold text-zinc-400 uppercase tracking-[0.14em] ml-2">마인크래프트 닉네임</label>
                <input 
                  required
                  autoFocus
                  type="text"
                  autoComplete="off"
                  placeholder="예: Steve"
                  onKeyDown={handleKeyDown} // 💡 개별 입력창에서도 엔터 감지
                  className="w-full bg-white/[0.04] border border-white/10 p-4 sm:p-5 rounded-[20px] text-zinc-100 focus:border-blue-500/40 outline-none transition-all font-semibold text-base sm:text-lg placeholder:text-zinc-700"
                  value={loginId}
                  onChange={handleInputChange(setLoginId)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-2">비밀번호</label>
                <input 
                  required
                  type="password"
                  onKeyDown={handleKeyDown} // 💡 개별 입력창에서도 엔터 감지
                  className="w-full bg-white/[0.04] border border-white/10 p-4 sm:p-5 rounded-[20px] text-zinc-100 focus:border-blue-500/40 outline-none transition-all font-bold text-lg"
                  value={password}
                  onChange={handleInputChange(setPassword)}
                />
              </div>

              <button 
                type="submit" // 💡 submit 타입은 엔터키를 눌렀을 때 form을 제출시킵니다.
                disabled={isLoading}
                className="site-btn site-btn-primary mt-2 w-full py-4 text-sm sm:mt-4 sm:py-5 sm:text-base"
              >
                {isLoading ? "접속 중..." : "로그인"}
              </button>

              {isLongWait && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-4 text-center text-xs font-bold text-blue-400 space-y-1"
                >
                  <p>서버 연결을 준비하는 중입니다.</p>
                  <p>최대 1분 정도 소요될 수 있습니다.</p>
                </motion.div>
              )}
            </form>

            <div className="mt-3 rounded-[24px] border border-white/5 bg-white/[0.02] p-4">
              <button
                type="button"
                onClick={() => {
                  triggerHaptic();
                  setShowReset((prev) => !prev);
                  setResetLoginId(loginId);
                }}
                className="site-btn site-btn-secondary w-full"
              >
                비밀번호 재설정
              </button>
              {showReset && (
                <div className="mt-3 space-y-3">
                  <p className="text-xs font-medium leading-relaxed text-zinc-500 break-keep">
                    Discord 인증으로 본인 확인 후 새 비밀번호를 설정합니다. 기존에 Discord 연동된 계정만 사용할 수 있습니다.
                  </p>
                  <input
                    type="text"
                    value={resetLoginId}
                    onChange={handleInputChange(setResetLoginId)}
                    placeholder="마인크래프트 닉네임"
                    className="w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm font-semibold text-zinc-100 outline-none transition-all placeholder:text-zinc-700 focus:border-blue-500/40"
                  />
                  <button
                    type="button"
                    onClick={handlePasswordReset}
                    disabled={!resetLoginId.trim() || resetLoading}
                    className="site-btn site-btn-primary w-full"
                  >
                    {resetLoading ? "인증 준비 중..." : "Discord로 재설정"}
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="mt-8 text-center">
            <Link href="/register" onClick={triggerHaptic} className="site-btn site-btn-ghost site-btn-compact">
              계정 생성하기
            </Link>
          </div>
        </motion.div>
      </main>
    </div>
  );
}