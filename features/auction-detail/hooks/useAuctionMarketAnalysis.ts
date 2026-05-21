"use client";

import { useEffect, useMemo, useState } from "react";
import { request } from "@/lib/client/api";
import type { AuctionDetailRecord } from "../auctionDetailTypes";

export function useAuctionMarketAnalysis(auction: AuctionDetailRecord | null) {
  const [marketAnalysis, setMarketAnalysis] = useState<any>(null);
  const [marketAnalysisLoading, setMarketAnalysisLoading] = useState(false);

  const marketAnalysisQuery = useMemo(() => {
    if (!auction?.itemId) return "";
    const params = new URLSearchParams();
    params.set("level", String(auction.enhancementLevel || 0));
    if (auction.enhancementRank) params.set("rank", String(auction.enhancementRank));
    if (auction.enchantments && Object.keys(auction.enchantments).length > 0) {
      params.set("enchantments", JSON.stringify(auction.enchantments));
    }
    if (auction.imprint && Object.keys(auction.imprint).length > 0) {
      params.set("imprints", JSON.stringify(auction.imprint));
    }
    if (auction.skills && Object.keys(auction.skills).length > 0) {
      params.set("skills", JSON.stringify(auction.skills));
    }
    if (Array.isArray(auction.runes) && auction.runes.some((r) => r?.type)) {
      params.set("runes", JSON.stringify(auction.runes.filter((r) => r?.type)));
    }
    return params.toString();
  }, [auction]);

  useEffect(() => {
    if (!auction?.itemId) return;
    let cancelled = false;
    setMarketAnalysisLoading(true);
    const analysisUrl = `/api/auctions/market-analysis/${auction.itemId}${marketAnalysisQuery ? `?${marketAnalysisQuery}` : ""}`;
    const cacheKey = `market-analysis:${analysisUrl}`;
    if (typeof window !== "undefined") {
      try {
        const cached = sessionStorage.getItem(cacheKey);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Date.now() - parsed.createdAt < 60_000) {
            setMarketAnalysis(parsed.data);
            setMarketAnalysisLoading(false);
            return;
          }
        }
      } catch {
        sessionStorage.removeItem(cacheKey);
      }
    }

    request(analysisUrl)
      .then((data) => {
        if (!cancelled) {
          setMarketAnalysis(data || null);
          if (typeof window !== "undefined" && data) {
            sessionStorage.setItem(cacheKey, JSON.stringify({ data, createdAt: Date.now() }));
          }
        }
      })
      .catch(() => {
        if (!cancelled) setMarketAnalysis(null);
      })
      .finally(() => {
        if (!cancelled) setMarketAnalysisLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [auction?.itemId, marketAnalysisQuery]);

  return { marketAnalysis, marketAnalysisLoading };
}
