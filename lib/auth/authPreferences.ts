/** 무활동 로그아웃·수동 로그아웃 시 소켓 등 실시간 연결 해제용 */
export const SESSION_IDLE_EVENT = "ddingtion_session_idle";

/** 10분 무활동 로그아웃 직후 — 자동 로그인 재진입 방지 */
export const SESSION_IDLE_LOGOUT_KEY = "ddingtion_idle_logout";

export const SESSION_TIMEOUT_MS = 10 * 60 * 1000;

export const markIdleLogout = () => {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(SESSION_IDLE_LOGOUT_KEY, "1");
};

export const consumeIdleLogout = () => {
  if (typeof window === "undefined") return false;
  const flagged = sessionStorage.getItem(SESSION_IDLE_LOGOUT_KEY) === "1";
  if (flagged) sessionStorage.removeItem(SESSION_IDLE_LOGOUT_KEY);
  return flagged;
};

export const isSessionIdleExpired = () => {
  if (typeof window === "undefined") return false;
  const lastActivity = localStorage.getItem("lastActivity");
  if (!lastActivity) return false;
  return Date.now() - parseInt(lastActivity, 10) > SESSION_TIMEOUT_MS;
};

/** 로그인 화면 설정·세션 저장 키 (localStorage.clear 시 보존) */
export const AUTH_PREF_KEYS = {
  rememberLoginId: "ddingtion_remember_login_id",
  savedLoginId: "ddingtion_saved_login_id",
  autoLogin: "ddingtion_auto_login",
} as const;

export const getRememberLoginIdEnabled = () =>
  typeof window !== "undefined" &&
  localStorage.getItem(AUTH_PREF_KEYS.rememberLoginId) === "1";

export const getSavedLoginId = () => {
  if (!getRememberLoginIdEnabled()) return "";
  return localStorage.getItem(AUTH_PREF_KEYS.savedLoginId) || "";
};

export const setRememberLoginId = (enabled: boolean, loginId?: string) => {
  if (typeof window === "undefined") return;
  if (enabled && loginId?.trim()) {
    localStorage.setItem(AUTH_PREF_KEYS.rememberLoginId, "1");
    localStorage.setItem(AUTH_PREF_KEYS.savedLoginId, loginId.trim());
  } else {
    localStorage.removeItem(AUTH_PREF_KEYS.rememberLoginId);
    localStorage.removeItem(AUTH_PREF_KEYS.savedLoginId);
  }
};

export const getAutoLoginEnabled = () =>
  typeof window !== "undefined" &&
  localStorage.getItem(AUTH_PREF_KEYS.autoLogin) === "1";

export const setAutoLoginEnabled = (enabled: boolean) => {
  if (typeof window === "undefined") return;
  if (enabled) {
    localStorage.setItem(AUTH_PREF_KEYS.autoLogin, "1");
  } else {
    localStorage.removeItem(AUTH_PREF_KEYS.autoLogin);
  }
};

/** 로그아웃·세션 만료 시 인증 데이터만 제거 (아이디 저장 설정은 유지) */
export const clearAuthSession = (options?: { keepAutoLogin?: boolean }) => {
  if (typeof window === "undefined") return;
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  localStorage.removeItem("lastActivity");
  sessionStorage.removeItem("token");
  sessionStorage.removeItem("user");
  if (!options?.keepAutoLogin) {
    localStorage.removeItem(AUTH_PREF_KEYS.autoLogin);
  }
  window.dispatchEvent(new Event(SESSION_IDLE_EVENT));
};

export const subscribeSessionIdle = (handler: () => void) => {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(SESSION_IDLE_EVENT, handler);
  return () => window.removeEventListener(SESSION_IDLE_EVENT, handler);
};
