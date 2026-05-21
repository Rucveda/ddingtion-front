"use client";

import { useEffect, useState } from "react";
import type { AuctionDetailRecord } from "../auctionDetailTypes";

export function useAuctionCountdown(auction: AuctionDetailRecord | null) {
  const [timeLeft, setTimeLeft] = useState("");
  const [nowTs, setNowTs] = useState(() => Date.now());

  useEffect(() => {
    if (!auction || auction.status !== "ACTIVE") return;
    const timer = setInterval(() => {
      setNowTs(Date.now());
      const now = Date.now();
      const end = new Date(auction.endTime).getTime();
      const distance = end - now;
      if (distance < 0) {
        setTimeLeft("경매 종료");
        clearInterval(timer);
      } else {
        const d = Math.floor(distance / (1000 * 60 * 60 * 24));
        const h = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const m = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const s = Math.floor((distance % (1000 * 60)) / 1000);
        setTimeLeft(d > 0 ? `${d}일 ${h}시간 ${m}분 ${s}초` : `${h}시간 ${m}분 ${s}초`);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [auction]);

  return { timeLeft, nowTs };
}
