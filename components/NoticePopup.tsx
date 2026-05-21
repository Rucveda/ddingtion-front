"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { request } from "@/lib/client/api";

const NOTICE_CACHE_KEY = "ddingtion_latest_notice_cache";
const NOTICE_CACHE_TTL_MS = 5 * 60 * 1000;

export default function NoticePopup() {
  const [isOpen, setIsOpen] = useState(false);
  const [notice, setNotice] = useState<any>(null);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    let isMounted = true; // 💡 패치: 컴포넌트 마운트 상태 추적

    const loadNotice = async () => {
      try {
        let data: any[] | null = null;
        const cached = sessionStorage.getItem(NOTICE_CACHE_KEY);
        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            if (Date.now() - parsed.createdAt < NOTICE_CACHE_TTL_MS) {
              data = parsed.data;
            }
          } catch {
            sessionStorage.removeItem(NOTICE_CACHE_KEY);
          }
        }

        if (!data) {
          data = await request("/api/posts?type=NOTICE");
          if (Array.isArray(data)) {
            sessionStorage.setItem(NOTICE_CACHE_KEY, JSON.stringify({ data, createdAt: Date.now() }));
          }
        }
        
        if (!isMounted) return; // 💡 패치: 이미 언마운트된 첫 번째 Effect의 비동기 결과 무시
        
        if (data && Array.isArray(data) && data.length > 0) {
          const latest = data[0];
          setNotice(latest);

          const hideUntil = localStorage.getItem("hide_notice_until");
          const lastId = localStorage.getItem("last_notice_id");
          const now = new Date().getTime();

          // 1. 이미 확인(영구 닫기)을 누른 공지인지 확인
          const isAlreadyRead = lastId === latest.id.toString();
          // 2. '하루 안 보기' 기간이 아직 남아있는지 확인
          const isHiddenForADay = hideUntil && now < parseInt(hideUntil);

          // 이미 읽었거나, 하루 닫기 기간이 안 지났으면 띄우지 않음
          if (!isAlreadyRead && !isHiddenForADay) {
            timeoutId = setTimeout(() => {
              if (isMounted) setIsOpen(true);
            }, 1000);
          }
        }
      } catch (err) { console.error("Notice error:", err); }
    };
    loadNotice();

    return () => {
      isMounted = false; // 💡 패치: 클린업 시 마운트 해제
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, []);

  const closePopup = () => {
    setIsOpen(false);
    if (notice) localStorage.setItem("last_notice_id", notice.id.toString());
  };

  const hideForADay = () => {
    const expireDate = new Date().getTime() + 24 * 60 * 60 * 1000;
    localStorage.setItem("hide_notice_until", expireDate.toString());
    setIsOpen(false);
  };

  if (!notice) return null;

  return (
    <div className="fixed bottom-6 left-6 z-[9999]">
      <AnimatePresence>
        {isOpen && (
          <motion.div key="notice-popup" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, scale: 0.9 }} className="w-[320px] bg-[#0c0c0e]/95 border border-white/10 rounded-[28px] shadow-2xl backdrop-blur-3xl overflow-hidden flex flex-col border-l-4 border-l-blue-600">
          <div className="p-6">
            <div className="flex justify-between items-start mb-4">
              <span className="px-2 py-0.5 bg-blue-500/10 text-blue-400 text-[9px] font-black rounded border border-blue-500/20 uppercase">Notice</span>
              <button onClick={closePopup} className="site-btn site-btn-ghost h-7 w-7 p-0">✕</button>
            </div>
            <h3 className="text-[15px] font-bold text-white mb-4 leading-tight">{notice.title}</h3>
            <div className="text-[12px] text-zinc-400 leading-relaxed whitespace-pre-wrap max-h-[150px] overflow-y-auto mb-6 custom-scrollbar">
              {notice.content}
            </div>
            <div className="flex items-center justify-between pt-4 border-t border-white/5">
              <button onClick={hideForADay} className="site-btn site-btn-ghost site-btn-compact">하루 닫기</button>
              <button onClick={closePopup} className="site-btn site-btn-primary site-btn-compact">확인</button>
            </div>
          </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}