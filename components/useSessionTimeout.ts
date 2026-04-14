"use client";

import { useEffect, useCallback, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";

const TIMEOUT_MS = 10 * 60 * 1000; // 10분 (밀리초 단위)

export function useSessionTimeout() {
  const router = useRouter();
  const pathname = usePathname();
  const lastUpdateRef = useRef(Date.now());

  const logout = useCallback(() => {
    // 스토리지 초기화 및 로그아웃 처리
    localStorage.removeItem("lastActivity");
    sessionStorage.removeItem("token"); 
    sessionStorage.removeItem("user");
    localStorage.removeItem("token"); // 기존 유지용 로컬 데이터도 안전하게 함께 제거
    localStorage.removeItem("user"); 
    
    alert("10분 이상 활동이 없어 로그아웃 되었습니다.");
    // 실제 프로젝트의 로그인 라우트 경로로 변경해주세요
    router.push("/login"); 
  }, [router]);

  const updateActivity = useCallback(() => {
    const now = Date.now();
    // 성능 최적화: 마우스 이동 등 이벤트 폭주 시 1초에 한 번만 localStorage 접근
    if (now - lastUpdateRef.current > 1000) {
      localStorage.setItem("lastActivity", now.toString());
      lastUpdateRef.current = now;
    }
  }, []);

  useEffect(() => {
    // 💡 로그인 및 회원가입 페이지에서는 세션 타이머를 작동시키지 않음
    if (pathname === "/login" || pathname === "/register") return;

    const checkTimeout = () => {
      const lastActivity = localStorage.getItem("lastActivity");
      if (lastActivity && Date.now() - parseInt(lastActivity, 10) > TIMEOUT_MS) {
        logout();
        return true;
      }
      return false;
    };

    // 1. 초기 진입 시 로드 (창 닫은 후 10분이 지났는지 오프라인 시간 체크)
    if (!checkTimeout()) {
      updateActivity();
    }

    // 2. 켜둔 상태에서 지속적으로 1분마다 만료 여부 확인
    const interval = setInterval(checkTimeout, 60000);

    // 3. 사용자 활동 감지 시 lastActivity 갱신하여 타이머 초기화
    const events = ["mousemove", "mousedown", "keydown", "scroll", "touchstart", "click"];
    events.forEach((event) => window.addEventListener(event, updateActivity));

    return () => {
      clearInterval(interval);
      events.forEach((event) => window.removeEventListener(event, updateActivity));
    };
  }, [logout, updateActivity]);
}