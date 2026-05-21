"use client";

import { useEffect, useState } from "react";
import { request } from "@/lib/client/api";
import { isLocalDev } from "@/dev/devMode";
import { ensureLocalDummySession } from "@/dev/localDummyData";

export function useAuctionSession(auctionId: string | string[] | undefined) {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [tradePolicyLoaded, setTradePolicyLoaded] = useState(false);

  useEffect(() => {
    if (isLocalDev()) {
      setCurrentUser(ensureLocalDummySession());
      setTradePolicyLoaded(true);
      return;
    }
    const userStr = localStorage.getItem("user");
    if (userStr) setCurrentUser(JSON.parse(userStr));
  }, []);

  useEffect(() => {
    if (isLocalDev()) {
      setTradePolicyLoaded(true);
      return;
    }
    const token = localStorage.getItem("token");
    if (!token) {
      setTradePolicyLoaded(true);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const fresh = await request("/api/auth/me");
        if (!cancelled && fresh) {
          setCurrentUser(fresh);
          localStorage.setItem("user", JSON.stringify(fresh));
        }
      } catch {
        /* ignore */
      } finally {
        if (!cancelled) setTradePolicyLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [auctionId]);

  const needsDiscordForTrade =
    tradePolicyLoaded &&
    Boolean(currentUser?.discordVerificationRequired) &&
    !currentUser?.discordLinked;

  const verifyingSession =
    typeof window !== "undefined" &&
    Boolean(localStorage.getItem("token")) &&
    !tradePolicyLoaded;

  return {
    currentUser,
    setCurrentUser,
    tradePolicyLoaded,
    needsDiscordForTrade,
    verifyingSession,
  };
}
