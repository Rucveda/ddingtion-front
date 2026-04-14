export const request = async (url: string, options: RequestInit = {}) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null; // 💡 앱 전체 호환성을 위해 localStorage로 복구
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  try {
    const response = await fetch(`https://ddingtion-back.onrender.com${url}`, { 
      ...options, 
      headers 
    });

    // 💡 401 Unauthorized: 유령 계정 처리
    if (response.status === 401 && !url.includes('/api/auth/login')) { // 💡 로그인 시도 중 틀린 경우는 가로채지 않음!
      if (typeof window !== 'undefined') {
        alert("세션이 만료되었습니다. 다시 로그인해주세요.");
        localStorage.clear();
        window.location.href = '/login';
      }
      return null;
    }

    // 💡 403 Forbidden: 차단(Ban)된 계정 처리
    if (response.status === 403) {
      if (typeof window !== 'undefined') {
        alert("관리자에 의해 접근이 차단된 계정입니다.");
        localStorage.clear();
        window.location.href = '/login';
      }
      return null;
    }

    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      const data = await response.json();
      // 💡 에러 발생 시 백엔드 에러 메시지를 즉시 throw 하여 catch 블록으로 넘김
      if (!response.ok) {
        throw new Error(data.error || data.message || "요청 중 오류가 발생했습니다.");
      }
      return data;
    }

    if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
    return response;

  } catch (error) {
    // 💡 핵심 패치: 서버가 꺼져서 fetch 자체가 실패(Failed to fetch)한 경우
    console.error("Critical Connection Error:", error);

    if (typeof window !== 'undefined') {
      // 안내 페이지로 강제 리다이렉트
      // 무한 루프 방지를 위해 현재 페이지가 이미 안내 페이지인지 확인합니다.
      if (!window.location.pathname.includes('/server-error')) {
        window.location.href = '/server-error';
      }
    }
    throw error;
  }
};