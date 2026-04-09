export const request = async (url: string, options: RequestInit = {}) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  
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
    if (response.status === 401) {
      if (typeof window !== 'undefined') {
        alert("세션이 만료되었습니다. 다시 로그인해주세요.");
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
      return null;
    }

    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      return response.json();
    }
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