"use client";

import { useEffect, useCallback, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { isLocalDev } from "@/dev/devMode";
import {
  clearAuthSession,
  markIdleLogout,
  SESSION_TIMEOUT_MS,
} from "@/lib/auth/authPreferences";

export function useSessionTimeout() {
  const router = useRouter();
  const pathname = usePathname();
  const lastUpdateRef = useRef(0);

  const logout = useCallback(() => {
    clearAuthSession({ keepAutoLogin: true });
    markIdleLogout();
    if (pathname === "/login") return;
    alert("10분 이상 활동이 없어 로그아웃 되었습니다.");
    router.replace("/login");
  }, [router, pathname]);

  const updateActivity = useCallback(() => {
    const now = Date.now();
    if (now - lastUpdateRef.current > 1000) {
      localStorage.setItem("lastActivity", now.toString());
      lastUpdateRef.current = now;
    }
  }, []);

  useEffect(() => {
    if (isLocalDev()) return;

    const token = localStorage.getItem("token");
    if (!token) return;

    const checkTimeout = () => {
      const lastActivity = localStorage.getItem("lastActivity");
      if (lastActivity && Date.now() - parseInt(lastActivity, 10) > SESSION_TIMEOUT_MS) {
        logout();
        return true;
      }
      return false;
    };

    if (!checkTimeout()) {
      const isAuthFormPage = pathname === "/login" || pathname === "/register";
      if (!isAuthFormPage) {
        updateActivity();
      }
    }

    const interval = setInterval(checkTimeout, 60000);

    const events = ["mousemove", "mousedown", "keydown", "scroll", "touchstart", "click"];
    const onActivity = () => {
      if (pathname === "/login" || pathname === "/register") return;
      updateActivity();
    };
    events.forEach((event) => window.addEventListener(event, onActivity));

    return () => {
      clearInterval(interval);
      events.forEach((event) => window.removeEventListener(event, onActivity));
    };
  }, [logout, updateActivity, pathname]);
}
