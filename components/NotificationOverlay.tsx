"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { subscribeSessionIdle } from "@/lib/auth/authPreferences";
import {
  OUTBID_TOAST_EVENT,
  type OutbidToastPayload,
  normalizeOutbidPayload,
} from "@/lib/client/notificationEvents";

export default function NotificationOverlay() {
  const [notification, setNotification] = useState<OutbidToastPayload | null>(null);
  const [hasSession, setHasSession] = useState(false);
  const router = useRouter();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const triggerHaptic = useCallback(() => {
    if (typeof window !== "undefined" && window.navigator?.vibrate) {
      window.navigator.vibrate([50, 30, 50]);
    }
  }, []);

  const showToast = useCallback((raw: unknown) => {
    const data = normalizeOutbidPayload(raw);
    if (!data?.auctionId) return;
    triggerHaptic();
    audioRef.current?.play().catch(() => {});
    setNotification(data);
    if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
    dismissTimerRef.current = setTimeout(() => setNotification(null), 6000);
  }, [triggerHaptic]);

  useEffect(() => {
    audioRef.current = new Audio("https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3");
    audioRef.current.volume = 0.5;

    const syncSession = () => {
      const has = Boolean(localStorage.getItem("token") && localStorage.getItem("user"));
      setHasSession(has);
      if (!has) setNotification(null);
    };
    syncSession();

    const onOutbid = (event: Event) => {
      showToast((event as CustomEvent).detail);
    };

    window.addEventListener(OUTBID_TOAST_EVENT, onOutbid);
    window.addEventListener("storage", syncSession);
    window.addEventListener("focus", syncSession);

    const unsubscribeIdle = subscribeSessionIdle(() => {
      setNotification(null);
      setHasSession(false);
    });

    return () => {
      window.removeEventListener(OUTBID_TOAST_EVENT, onOutbid);
      window.removeEventListener("storage", syncSession);
      window.removeEventListener("focus", syncSession);
      unsubscribeIdle();
      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
    };
  }, [showToast]);

  if (!hasSession) return null;

  return (
    <div className="pointer-events-none fixed bottom-40 right-3 z-[10000] flex flex-col items-end sm:right-6">
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, x: 100, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 20, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="pointer-events-auto relative w-[min(340px,calc(100vw-1.5rem))] cursor-pointer overflow-hidden rounded-[32px] border border-red-500/40 bg-black/80 p-7 shadow-[0_25px_60px_rgba(239,68,68,0.3)] backdrop-blur-3xl"
            onClick={() => {
              router.push(`/auction/${notification.auctionId}`);
              setNotification(null);
            }}
          >
            <div className="absolute left-0 top-0 h-full w-1.5 bg-red-600 shadow-[0_0_20px_#ef4444]" />

            <div className="flex items-start gap-5">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-red-500/20 bg-red-500/10 text-3xl shadow-inner">
                ⚠️
              </div>
              <div className="min-w-0 flex-1 pt-1">
                <p className="mb-1.5 animate-pulse text-[10px] font-black uppercase tracking-[0.25em] text-red-500">
                  상위 입찰 알림
                </p>
                <h4 className="truncate text-base font-black uppercase italic leading-tight text-white">
                  {notification.itemName || "경매 물품"}
                </h4>
                <p className="mt-2 text-[11px] font-bold tracking-tight text-zinc-500">
                  다른 입찰자가 더 높은 가격을 제시했습니다.
                </p>
              </div>
            </div>

            <div className="-mx-7 -mb-7 mt-6 flex items-center justify-between border-t border-white/5 bg-white/[0.03] p-4 px-7">
              <div className="flex flex-col">
                <span className="text-[8px] font-black uppercase tracking-widest text-zinc-600">현재 최고가</span>
                <span className="font-mono text-xl font-black text-yellow-400">
                  {(notification.newPrice ?? 0).toLocaleString()}{" "}
                  <span className="text-[10px] text-zinc-600">G</span>
                </span>
              </div>
              <span className="rounded-xl bg-red-600 px-5 py-2.5 text-[10px] font-black uppercase tracking-tighter text-white shadow-lg shadow-red-600/20">
                경매 보기
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
