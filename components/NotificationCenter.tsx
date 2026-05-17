"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { request } from "@/utils/api"; 
import { io } from "socket.io-client";
import { SOCKET_URL } from "@/utils/runtimeConfig";

export default function NotificationCenter() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const router = useRouter();

  const fetchLogs = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const data = await request("/api/notifications");
      if (data && Array.isArray(data)) {
        setNotifications(data);
      } else {
        setNotifications([]);
      }
    } catch (err) {
      console.error("알림 로드 실패:", err);
      setNotifications([]);
    }
  }, []);

  useEffect(() => {
    const userStr = localStorage.getItem("user");
    const token = localStorage.getItem("token");
    
    queueMicrotask(() => {
      setIsReady(true);
      setHasSession(Boolean(userStr && token));
    });
    if (!userStr || !token) return;
    const user = JSON.parse(userStr);

    queueMicrotask(() => {
      fetchLogs();
    });

    const socket = io(SOCKET_URL);
    socket.emit("setup_notifications", user.id);
    
    socket.on("outbid_notification", () => {
      fetchLogs();
    });

    return () => { socket.close(); };
  }, [fetchLogs]);

  const safeNotifications = Array.isArray(notifications) ? notifications : [];
  const unreadCount = safeNotifications.filter(n => !n.isRead).length;

  if (!isReady || !hasSession) return null;

  // 💡 [핵심 패치] 알림 클릭 시 읽음 처리 및 UI 즉시 반영
  const handleNotificationClick = async (e: React.MouseEvent, notification: any) => {
    // 삭제 버튼 클릭 시 이벤트 전파 방지
    if ((e.target as HTMLElement).closest('.delete-btn')) return;

    if (!notification.isRead) {
      // 1. UI 즉시 업데이트 (Optimistic Update)
      setNotifications(prev => 
        prev.map(n => n.id === notification.id ? { ...n, isRead: true } : n)
      );

      // 2. 서버에 읽음 상태 전송
      try {
        await request(`/api/notifications/${notification.id}/read`, { method: "PATCH" });
      } catch (err) {
        console.error("읽음 처리 서버 통신 실패:", err);
        // 실패 시 다시 데이터를 불러와서 상태 복구
        fetchLogs();
      }
    }
    
    // 알림창 닫기 및 링크 이동
    setIsOpen(false);
    if (notification.link) router.push(notification.link);
  };

  const deleteNotification = async (id: number) => {
    // UI에서 즉시 제거
    setNotifications(prev => prev.filter(n => n.id !== id));
    // 서버에서 삭제
    await request(`/api/notifications/${id}`, { method: "DELETE" });
  };

  const clearAll = async () => {
    if (!confirm("모든 알림 기록을 파기하시겠습니까?")) return;
    setNotifications([]); // UI 즉시 초기화
    await request("/api/notifications/all/clear", { method: "DELETE" });
  };

  return (
    <div className="fixed bottom-24 right-6 z-[9999] flex flex-col items-end font-sans">
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 15, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="w-80 bg-black/95 border border-white/10 rounded-[32px] shadow-2xl mb-4 backdrop-blur-3xl overflow-hidden flex flex-col"
          >
            <div className="flex justify-between items-center p-6 pb-4 border-b border-white/5 bg-white/[0.02]">
              <div>
                <h3 className="text-sm font-bold text-zinc-100 tracking-tight">알림 센터</h3>
              </div>
              <button onClick={() => setIsOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 text-zinc-500 hover:text-white transition-colors">✕</button>
            </div>

            <div className="max-h-72 overflow-y-auto space-y-2 p-4 custom-scrollbar">
              {safeNotifications.length === 0 ? (
                <div className="text-center py-16">
                  <p className="text-xs text-zinc-500 font-bold">알림 없음</p>
                </div>
              ) : (
                safeNotifications.map((n) => (
                  <div 
                    key={n.id} 
                    onClick={(e) => handleNotificationClick(e, n)}
                    className={`group relative p-4 rounded-2xl cursor-pointer transition-all border ${
                      n.isRead 
                        ? 'border-white/5 bg-transparent opacity-60' 
                        : 'border-red-500/30 bg-red-500/5 hover:bg-red-500/10 shadow-[0_0_20px_rgba(239,68,68,0.05)]'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-md border ${n.isRead ? 'border-zinc-700 text-zinc-500' : 'border-red-500/40 text-red-500'} tracking-tight`}>
                        {n.type === 'OUTBID' ? '상위 입찰' : n.type}
                      </span>
                      <button 
                        onClick={(e) => { e.stopPropagation(); deleteNotification(n.id); }}
                        className="delete-btn opacity-0 group-hover:opacity-100 p-1 text-zinc-600 hover:text-white transition-all"
                      >
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4"><path d="M18 6L6 18M6 6l12 12"/></svg>
                      </button>
                    </div>
                    <p className={`text-sm leading-snug tracking-tight ${n.isRead ? 'text-zinc-500' : 'text-zinc-200 font-bold'}`}>{n.message}</p>
                    <p className="text-[11px] text-zinc-500 mt-2 font-mono">{new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                ))
              )}
            </div>

            {safeNotifications.length > 0 && (
              <button 
                onClick={clearAll}
                className="w-full py-4 bg-white/[0.02] hover:bg-red-900/20 text-xs font-black text-zinc-500 hover:text-red-500 transition-all border-t border-white/5 tracking-tight"
              >
                모든 기록 파기
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-14 h-14 bg-zinc-900 border border-white/10 rounded-full flex items-center justify-center relative hover:scale-110 active:scale-95 transition-all shadow-xl group backdrop-blur-md"
      >
        <div className={`relative flex items-center justify-center transition-all ${isOpen ? 'scale-90' : 'opacity-50 group-hover:opacity-100'} ${unreadCount > 0 && !isOpen ? 'animate-pulse' : ''}`}>
          {isOpen ? (
            <span className="text-sm font-black text-white">✕</span>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill={unreadCount > 0 ? "#ef4444" : "#71717a"} xmlns="http://www.w3.org/2000/svg">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h15s-3-2-3-9z" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
        </div>
        
        {unreadCount > 0 && !isOpen && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-red-600 text-[9px] font-black text-white rounded-full border-2 border-zinc-900 flex items-center justify-center shadow-lg animate-bounce">
            {unreadCount}
          </span>
        )}
      </button>
    </div>
  );
}