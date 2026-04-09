"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { request } from "@/utils/api";

export default function NoticePopup() {
  const [isOpen, setIsOpen] = useState(false);
  const [notice, setNotice] = useState<any>(null);

  useEffect(() => {
    const loadNotice = async () => {
      try {
        // 💡 중요: 전체 경로 확인 요망
        const data = await request("/api/posts?type=NOTICE");
        if (data && Array.isArray(data) && data.length > 0) {
          const latest = data[0];
          setNotice(latest);

          const hideUntil = localStorage.getItem("hide_notice_until");
          const lastId = localStorage.getItem("last_notice_id");
          const now = new Date().getTime();

          // 새 공지가 있거나 하루 닫기 기간이 지났을 때
          if (!hideUntil || now > parseInt(hideUntil) || lastId !== latest.id.toString()) {
            setTimeout(() => setIsOpen(true), 1000);
          }
        }
      } catch (err) { console.error("Notice error:", err); }
    };
    loadNotice();
  }, []);

  const closePopup = () => {
    setIsOpen(false);
    if (notice) localStorage.setItem("last_notice_id", notice.id.toString());
  };

  const hideForADay = () => {
    const expireDate = new Date().getTime() + 24 * 60 * 60 * 1000;
    localStorage.setItem("hide_notice_until", expireDate.toString());
    if (notice) localStorage.setItem("last_notice_id", notice.id.toString());
    setIsOpen(false);
  };

  if (!notice || !isOpen) return null;

  return (
    <div className="fixed bottom-6 left-6 z-[9999]">
      <AnimatePresence>
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, scale: 0.9 }} className="w-[320px] bg-[#0c0c0e]/95 border border-white/10 rounded-[28px] shadow-2xl backdrop-blur-3xl overflow-hidden flex flex-col border-l-4 border-l-blue-600">
          <div className="p-6">
            <div className="flex justify-between items-start mb-4">
              <span className="px-2 py-0.5 bg-blue-500/10 text-blue-400 text-[9px] font-black rounded border border-blue-500/20 uppercase">Notice</span>
              <button onClick={closePopup} className="text-zinc-600 hover:text-white">✕</button>
            </div>
            <h3 className="text-[15px] font-bold text-white mb-4 leading-tight">{notice.title}</h3>
            <div className="text-[12px] text-zinc-400 leading-relaxed whitespace-pre-wrap max-h-[150px] overflow-y-auto mb-6 custom-scrollbar">
              {notice.content}
            </div>
            <div className="flex items-center justify-between pt-4 border-t border-white/5">
              <button onClick={hideForADay} className="text-[10px] font-black text-zinc-600 hover:text-white uppercase tracking-widest">하루 닫기</button>
              <button onClick={closePopup} className="px-5 py-2 bg-white text-black text-[11px] font-black rounded-xl active:scale-95">확인</button>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}