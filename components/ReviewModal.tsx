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

export default function ReviewModal({
  isOpen,
  auctionId,
  revieweeId,
  revieweeName,
  onClose
}: ReviewModalProps) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      // 💡 백엔드 리뷰 저장 API 호출
      await request("/api/reviews", {
        method: "POST",
        body: JSON.stringify({
          auctionId,
          targetId: revieweeId, // 리뷰를 받는 사람
          rating,
          comment: comment.trim() || "매너 있는 거래였습니다."
        }),
      });

      alert(`${revieweeName}님에게 평점을 남겼습니다.`);
      onClose();
    } catch (error) {
      console.error("리뷰 등록 실패:", error);
      alert("평점 등록 중 오류가 발생했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-6">
          {/* 배경 오버레이 */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          />

          {/* 모달 본체 */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-[400px] bg-zinc-950 border border-white/10 rounded-[32px] p-8 shadow-2xl overflow-hidden"
          >
            {/* 상단 장식 라인 */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 to-transparent opacity-50" />

            <div className="text-center mb-8">
              <span className="text-[10px] font-black text-blue-500 uppercase tracking-[0.4em] block mb-2">Transaction Feedback</span>
              <h2 className="text-xl font-bold text-white">거래는 어떠셨나요?</h2>
              <p className="text-[12px] text-zinc-500 mt-2 font-medium">
                <span className="text-blue-400 font-bold">{revieweeName}</span>님과의 거래 평점을 남겨주세요.
              </p>
            </div>

            {/* 별점 선택 */}
            <div className="flex justify-center gap-3 mb-8">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setRating(star)}
                  className={`text-2xl transition-all ${
                    star <= rating ? "grayscale-0 scale-110" : "grayscale opacity-20 scale-100"
                  }`}
                >
                  ⭐
                </button>
              ))}
            </div>

            {/* 한줄 평 입력 */}
            <div className="mb-8">
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="간단한 후기를 남겨주세요 (선택사항)"
                className="w-full h-24 bg-white/[0.03] border border-white/10 rounded-2xl p-4 text-[13px] text-white outline-none focus:border-blue-500/50 transition-all resize-none font-medium placeholder:text-zinc-700"
              />
            </div>

            {/* 버튼 섹션 */}
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="site-btn site-btn-secondary flex-1 py-4"
              >
                나중에
              </button>
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="site-btn site-btn-primary flex-1 py-4"
              >
                {isSubmitting ? "전송 중..." : "평가 완료"}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}