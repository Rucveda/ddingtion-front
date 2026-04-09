"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { request } from "@/utils/api";

interface ReviewModalProps {
  isOpen: boolean;
  auctionId: number;
  revieweeId: number;
  revieweeName: string;
  onClose: () => void;
}

export default function ReviewModal({ isOpen, auctionId, revieweeId, revieweeName, onClose }: ReviewModalProps) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await request("/api/reviews", {
        method: "POST",
        body: JSON.stringify({ auctionId, revieweeId, rating, comment })
      });
      alert(`${revieweeName}님에 대한 평가가 완료되었습니다.`);
      onClose();
    } catch (error) {
      alert("평가 등록 중 오류가 발생했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[10001] flex items-center justify-center p-6">
          {/* 배경 블러 */}
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/80 backdrop-blur-xl"
            onClick={onClose}
          />

          {/* 모달 본체 */}
          <motion.div 
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="relative w-full max-w-[340px] bg-zinc-900 border border-white/10 rounded-[32px] p-8 shadow-2xl overflow-hidden"
          >
            {/* 장식용 육각형 배경 */}
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-blue-600/10 rounded-full blur-3xl" />

            <div className="text-center relative z-10">
              <span className="text-[10px] font-black text-blue-500 uppercase tracking-[0.3em] block mb-2 font-mono">Terminal Review</span>
              <h2 className="text-lg font-bold text-white mb-1">{revieweeName}님과의 거래</h2>
              <p className="text-[11px] text-zinc-500 font-bold mb-8 uppercase tracking-tight">거래 신뢰도를 평가해주세요</p>

              {/* 별점 선택 (1~5) */}
              <div className="flex justify-center gap-2 mb-8">
                {[1, 2, 3, 4, 5].map((num) => (
                  <button
                    key={num}
                    onClick={() => setRating(num)}
                    className={`w-10 h-10 rounded-xl font-black transition-all flex items-center justify-center border ${
                      rating >= num 
                        ? "bg-blue-600 border-blue-500 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)]" 
                        : "bg-white/5 border-white/5 text-zinc-700"
                    }`}
                  >
                    {num}
                  </button>
                ))}
              </div>

              {/* 후기 입력 */}
              <textarea
                className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-[13px] text-white outline-none focus:border-blue-500/40 transition-all mb-6 h-24 resize-none font-bold placeholder:text-zinc-800"
                placeholder="거래 후기를 짧게 남겨주세요 (선택)"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />

              {/* 버튼 그룹 */}
              <div className="flex gap-3">
                <button 
                  onClick={onClose}
                  className="flex-1 py-4 rounded-xl bg-zinc-800 text-[11px] font-black text-zinc-500 uppercase tracking-widest transition-all hover:bg-zinc-700"
                >
                  나중에
                </button>
                <button 
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="flex-1 py-4 rounded-xl bg-blue-600 text-[11px] font-black text-white uppercase tracking-widest shadow-lg shadow-blue-600/20 transition-all hover:scale-105 active:scale-95"
                >
                  전송 완료
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}