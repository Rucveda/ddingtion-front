"use client";

import { useEffect, useState } from "react";

export function TimeLeft({ endTime, status }: { endTime: string; status: string }) {
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    if (status !== "ACTIVE") {
      setTimeLeft("경매 종료");
      return;
    }

    const calculateTimeLeft = () => {
      const now = new Date().getTime();
      const end = new Date(endTime).getTime();
      const distance = end - now;

      if (distance < 0) {
        setTimeLeft("경매 종료");
        return false;
      }

      const d = Math.floor(distance / (1000 * 60 * 60 * 24));
      const h = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const m = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      const s = Math.floor((distance % (1000 * 60)) / 1000);

      if (d > 0) setTimeLeft(`${d}일 ${h}시간`);
      else if (h > 0) setTimeLeft(`${h}시간 ${m}분`);
      else setTimeLeft(`${m}분 ${s}초`);
      return true;
    };

    if (calculateTimeLeft()) {
      const timer = setInterval(() => {
        if (!calculateTimeLeft()) clearInterval(timer);
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [endTime, status]);

  return <span className="font-mono text-xs font-semibold text-red-400">{timeLeft}</span>;
}
