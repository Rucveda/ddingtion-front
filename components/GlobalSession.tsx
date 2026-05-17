"use client";

import { useSessionTimeout } from "@/hooks/useSessionTimeout";

export default function GlobalSession() {
  // 앱 전역에서 사용자 활동을 감지하고 세션을 관리합니다.
  useSessionTimeout();
  return null;
}