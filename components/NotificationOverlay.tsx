"use client";

import { useEffect, useState, useCallback, useRef } from "react"; // useRef 추가
import { io } from "socket.io-client";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";

export default function NotificationOverlay() {
  const [notification, setNotification] = useState<any>(null);
  const router = useRouter();
  
  // 💡 알림 효과음용 Ref
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const triggerHaptic = useCallback(() => {
    if (typeof window !== "undefined" && window.navigator?.vibrate) {
      window.navigator.vibrate([50, 30, 50]); 
    }
  }, []);

  useEffect(() => {
    // 💡 효과음 객체 초기화 (공용 알림음 경로 사용 권장)
    audioRef.current = new Audio("https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3");
    audioRef.current.volume = 0.5;

    const userStr = localStorage.getItem("user");
    if (!userStr) return;
    const user = JSON.parse(userStr);

    const socket = io("http://localhost:8080");
    
    socket.emit("setup_notifications", user.id);

    socket.on("outbid_notification", (data) => {
      console.log("🚨 Outbid Detected:", data);
      
      // 1. 햅틱 실행
      triggerHaptic();
      
      // 2. 효과음 재생
      audioRef.current?.play().catch(() => console.log("Sound blocked by browser policy"));
      
      // 3. 상태 업데이트
      setNotification(data);
      
      // 6초 후 자동 종료
      setTimeout(() => setNotification(null), 6000);
    });

    return () => { socket.close(); };
  }, [triggerHaptic]);

  return (
    <div className="fixed bottom-24 right-6 z-[10000] pointer-events-none flex flex-col items-end gap-4">
      <AnimatePresence mode="wait">
        {notification && (
          <motion.div
            initial={{ opacity: 0, x: 100, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 20, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="pointer-events-auto w-[340px] bg-black/80 backdrop-blur-3xl border border-red-500/40 rounded-[32px] p-7 shadow-[0_25px_60px_rgba(239,68,68,0.3)] overflow-hidden relative group cursor-pointer"
            onClick={() => {
              router.push(`/auction/${notification.auctionId}`);
              setNotification(null);
            }}
          >
            {/* 딩션 시그니처: 네온 스트립 */}
            <div className="absolute top-0 left-0 w-1.5 h-full bg-red-600 shadow-[0_0_20px_#ef4444]" />
            
            <div className="flex items-start gap-5">
              <div className="w-14 h-14 bg-red-500/10 rounded-2xl flex items-center justify-center text-3xl border border-red-500/20 shrink-0 shadow-inner">
                ⚠️
              </div>
              <div className="flex-1 min-w-0 pt-1">
                <p className="text-[10px] font-black text-red-500 uppercase tracking-[0.25em] mb-1.5 animate-pulse">
                  Security Breach
                </p>
                <h4 className="text-base font-black text-white truncate leading-tight uppercase italic group-hover:text-red-400 transition-colors">
                  {notification.itemName}
                </h4>
                <p className="text-[11px] text-zinc-500 mt-2 font-bold tracking-tight">
                  권한을 상실했습니다. 즉시 대응하세요.
                </p>
              </div>
            </div>

            <div className="mt-6 flex justify-between items-center bg-white/[0.03] -mx-7 -mb-7 p-4 px-7 border-t border-white/5 group-hover:bg-white/[0.06] transition-colors">
              <div className="flex flex-col">
                <span className="text-[8px] font-black text-zinc-600 uppercase tracking-widest">New Price Target</span>
                <span className="text-xl font-mono font-black text-yellow-400">
                  {notification.newPrice?.toLocaleString()} <span className="text-[10px] text-zinc-600">G</span>
                </span>
              </div>
              <div className="bg-red-600 text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-tighter shadow-lg shadow-red-600/20 group-hover:scale-105 transition-transform active:scale-95">
                Counter Bid
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}