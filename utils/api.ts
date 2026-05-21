import { API_BASE_URL } from "@/lib/client/runtimeConfig";
import { isLocalDev } from "@/dev/devMode";
import { getLocalDummyResponse } from "@/dev/localDummyData";

type RequestOptions = RequestInit & {
  redirectOnNetworkError?: boolean;
};

export const request = async (url: string, options: RequestOptions = {}) => {
  const { redirectOnNetworkError = false, ...fetchOptions } = options;
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null; // 💡 앱 전체 호환성을 위해 localStorage로 복구
  const method = (fetchOptions.method || "GET").toString().toUpperCase();
  if (isLocalDev()) {
    const localResponse = getLocalDummyResponse(url, method);
    if (localResponse !== null) return localResponse;
  }
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...(fetchOptions.headers || {}),
  };

  try {
    const response = await fetch(`${API_BASE_URL}${url}`, { 
      ...fetchOptions, 
      headers 
    });

    const contentType = response.headers.get("content-type");
    const isJson = Boolean(contentType && contentType.includes("application/json"));
    const data = isJson ? await response.json().catch(() => null) : null;

    // 💡 401 Unauthorized: 유령 계정 처리
    if (response.status === 401 && !url.includes('/api/auth/login')) { // 💡 로그인 시도 중 틀린 경우는 가로채지 않음!
      if (isLocalDev()) return getLocalDummyResponse(url, method);
      if (typeof window !== 'undefined') {
        alert("세션이 만료되었습니다. 다시 로그인해주세요.");
        localStorage.clear();
        window.location.href = '/login';
      }
      return null;
    }

    // 💡 403: 차단 계정 vs 디스코드 미인증 구분
    if (response.status === 403) {
      if (data?.code === "DISCORD_REQUIRED") {
        throw new Error(data.error || "디스코드 인증이 필요합니다.");
      }
      if (isLocalDev()) return getLocalDummyResponse(url, method);
      if (typeof window !== 'undefined') {
        alert(data?.error || "관리자에 의해 접근이 차단된 계정입니다.");
        localStorage.clear();
        window.location.href = '/login';
      }
      return null;
    }

    if (isJson) {
      if (!response.ok) {
        throw new Error(data?.error || data?.message || "요청 중 오류가 발생했습니다.");
      }
      return data;
    }

    if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
    return response;

  } catch (error) {
    console.error("Critical Connection Error:", error);
    if (isLocalDev()) {
      const localResponse = getLocalDummyResponse(url, method);
      if (localResponse !== null) return localResponse;
    }
    const isNetwork =
      error instanceof TypeError ||
      (error instanceof Error && /failed to fetch|networkerror/i.test(error.message));

    if (typeof window !== 'undefined' && isNetwork && redirectOnNetworkError) {
      if (!window.location.pathname.includes('/server-error')) {
        window.location.href = '/server-error';
      }
    }
    throw error;
  }
};
