"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { request } from "@/utils/api";
import { SimpleTopBar, SiteBackground } from "@/components/SiteChrome";
import {
  clearAuthSession,
  getAutoLoginEnabled,
  getRememberLoginIdEnabled,
  getSavedLoginId,
  setAutoLoginEnabled,
  setRememberLoginId,
} from "@/utils/authPreferences";

export default function LoginPage() {
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [rememberLoginId, setRememberLoginIdState] = useState(false);
  const [autoLogin, setAutoLoginState] = useState(false);
  const [prefsLoaded, setPrefsLoaded] = useState(false);
  const [autoLoginChecking, setAutoLoginChecking] = useState(true);
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

  useEffect(() => {
    setRememberLoginIdState(getRememberLoginIdEnabled());
    setAutoLoginState(getAutoLoginEnabled());
    const saved = getSavedLoginId();
    if (saved) setLoginId(saved);
    setPrefsLoaded(true);
  }, []);

  useEffect(() => {
    if (!prefsLoaded) return;

    const tryAutoLogin = async () => {
      if (!getAutoLoginEnabled()) {
        setAutoLoginChecking(false);
        return;
      }

      const token = localStorage.getItem("token");
      if (!token) {
        setAutoLoginChecking(false);
        return;
      }

      try {
        const freshUser = await request("/api/auth/me");
        if (freshUser) {
          localStorage.setItem("user", JSON.stringify(freshUser));
          localStorage.setItem("lastActivity", Date.now().toString());
          router.replace("/");
          return;
        }
        clearAuthSession({ keepAutoLogin: true });
      } catch {
        clearAuthSession({ keepAutoLogin: true });
      } finally {
        setAutoLoginChecking(false);
      }
    };

    void tryAutoLogin();
  }, [prefsLoaded, router]);

  const handleInputChange = (setter: (val: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const filteredValue = value.replace(/[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/g, "");
    setter(filteredValue);
  };

  const persistLoginPreferences = useCallback(() => {
    const shouldRememberId = rememberLoginId || autoLogin;
    setRememberLoginId(shouldRememberId, loginId);
    setAutoLoginEnabled(autoLogin);
  }, [rememberLoginId, loginId, autoLogin]);

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (isLoading || !loginId || !password) return;

    triggerHaptic();
    setIsLoading(true);
    setIsLongWait(false);

    const timeoutId = setTimeout(() => {
      setIsLongWait(true);
    }, 5000);

    try {
      const data = await request("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({
          loginId,
          password,
          rememberMe: autoLogin,
        }),
      });

      if (data && data.token) {
        sessionStorage.clear();
        localStorage.setItem("token", data.token);
        if (data.user) {
          localStorage.setItem("user", JSON.stringify(data.user));
        }
        localStorage.setItem("lastActivity", Date.now().toString());
        persistLoginPreferences();
        router.push("/");
        setTimeout(() => {
          window.location.reload();
        }, 100);
      }
    } catch (error) {
      alert(error instanceof Error ? error.message : "로그인에 실패했습니다.");
    } finally {
      clearTimeout(timeoutId);
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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      void handleLogin();
    }
  };

  if (!prefsLoaded || autoLoginChecking) {
    return (
      <div className="min-h-screen bg-[#010101] text-zinc-100 font-sans flex flex-col items-center justify-center">
        <SiteBackground />
        <p className="relative z-10 text-sm font-semibold text-zinc-500 animate-pulse">접속 확인 중...</p>
      </div>
    );
  }

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
                  autoComplete="username"
                  placeholder="예: Steve"
                  onKeyDown={handleKeyDown}
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
                  autoComplete="current-password"
                  onKeyDown={handleKeyDown}
                  className="w-full bg-white/[0.04] border border-white/10 p-4 sm:p-5 rounded-[20px] text-zinc-100 focus:border-blue-500/40 outline-none transition-all font-bold text-lg"
                  value={password}
                  onChange={handleInputChange(setPassword)}
                />
              </div>

              <div className="flex flex-col gap-2.5 -mt-2">
                <label className="flex cursor-pointer items-center gap-2.5 text-xs font-semibold text-zinc-400">
                  <input
                    type="checkbox"
                    checked={rememberLoginId}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setRememberLoginIdState(checked);
                      if (!checked) setRememberLoginId(false);
                    }}
                    className="h-4 w-4 rounded border-white/20 bg-black/40 accent-blue-500"
                  />
                  아이디 저장
                </label>
                <label className="flex cursor-pointer items-center gap-2.5 text-xs font-semibold text-zinc-400">
                  <input
                    type="checkbox"
                    checked={autoLogin}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setAutoLoginState(checked);
                      if (checked) setRememberLoginIdState(true);
                    }}
                    className="h-4 w-4 rounded border-white/20 bg-black/40 accent-blue-500"
                  />
                  자동 로그인 (30일 유지 · 10분 비활성 로그아웃 해제)
                </label>
              </div>

              <button
                type="submit"
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
