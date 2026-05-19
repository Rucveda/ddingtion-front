"use client";

import { useEffect, useCallback, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { isLocalDev } from "@/utils/devMode";
import { clearAuthSession } from "@/utils/authPreferences";

const TIMEOUT_MS = 10 * 60 * 1000; // 10분

export function useSessionTimeout() {
  const router = useRouter();
  const pathname = usePathname();
  const lastUpdateRef = useRef(0);
  const loggingOutRef = useRef(false);

  const logout = useCallback(() => {
    if (loggingOutRef.current) return;
    loggingOutRef.current = true;
    clearAuthSession({ keepAutoLogin: true });
    alert("10분 이상 활동이 없어 접속이 종료되었습니다. 자동 로그인 설정은 유지됩니다.");
    router.push("/login");
  }, [router]);

  const updateActivity = useCallback(() => {
    const now = Date.now();
    if (now - lastUpdateRef.current > 1000) {
      localStorage.setItem("lastActivity", now.toString());
      lastUpdateRef.current = now;
    }
  }, []);

  useEffect(() => {
    if (isLocalDev()) return;
    if (pathname === "/login" || pathname === "/register") return;

    const token = localStorage.getItem("token");
    if (!token) return;

    loggingOutRef.current = false;

    const checkTimeout = () => {
      const lastActivity = localStorage.getItem("lastActivity");
      if (lastActivity && Date.now() - parseInt(lastActivity, 10) > TIMEOUT_MS) {
        logout();
        return true;
      }
      return false;
    };

    if (!checkTimeout()) {
      updateActivity();
    }

    const interval = setInterval(checkTimeout, 60000);

    const events = ["mousemove", "mousedown", "keydown", "scroll", "touchstart", "click"];
    events.forEach((event) => window.addEventListener(event, updateActivity));

    return () => {
      clearInterval(interval);
      events.forEach((event) => window.removeEventListener(event, updateActivity));
    };
  }, [logout, updateActivity, pathname]);
}
