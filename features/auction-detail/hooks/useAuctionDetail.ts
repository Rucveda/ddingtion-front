"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { getBidIncrementDetails, parseBidPrice } from "@/lib/domain/bidIncrement";
import { partitionWildEnchantments } from "@/lib/domain/enhancementAllowlist";
import { AUCTION_STATUS_UI } from "../auctionDetailTypes";
import { detectItemCategory, parseBidInput } from "../auctionDetailUtils";
import { useAuctionSession } from "./useAuctionSession";
import { useAuctionSocket } from "./useAuctionSocket";
import { useAuctionMarketAnalysis } from "./useAuctionMarketAnalysis";
import { useAuctionComments } from "./useAuctionComments";
import { useAuctionCountdown } from "./useAuctionCountdown";
import { useAuctionActions } from "./useAuctionActions";
import { getMinimumBid } from "@/lib/domain/bidIncrement";

export function useAuctionDetail() {
  const { id: rawId } = useParams();
  const auctionId = String(rawId ?? "");

  const session = useAuctionSession(rawId);
  const socketState = useAuctionSocket(auctionId);
  const { auction, setAuction, socket, extensionNotice } = socketState;

  const [bidAmount, setBidAmount] = useState("0");
  const [isError, setIsError] = useState(false);
  const [bidRulesOpen, setBidRulesOpen] = useState(false);

  const initialBidSyncedFor = useRef<string | null>(null);

  useEffect(() => {
    initialBidSyncedFor.current = null;
  }, [auctionId]);

  useEffect(() => {
    if (!auction?.item) return;
    if (initialBidSyncedFor.current === auctionId) return;
    initialBidSyncedFor.current = auctionId;
    setBidAmount(getMinimumBid(parseBidPrice(auction.currentPrice), auction.endTime).toString());
  }, [auctionId, auction]);

  const { marketAnalysis, marketAnalysisLoading } = useAuctionMarketAnalysis(auction);
  const commentsState = useAuctionComments(auctionId, session.currentUser);
  const { timeLeft, nowTs } = useAuctionCountdown(auction);

  const actions = useAuctionActions({
    auctionId,
    auction,
    setAuction,
    socket,
    currentUser: session.currentUser,
    bidAmount,
    setBidAmount,
    needsDiscordForTrade: session.needsDiscordForTrade,
    verifyingSession: session.verifyingSession,
  });

  const category = useMemo(() => detectItemCategory(auction), [auction]);
  const wildEnchantGroups = useMemo(
    () => partitionWildEnchantments(auction?.enchantments ?? null),
    [auction?.enchantments],
  );

  const currentPrice = parseBidPrice(auction?.currentPrice);
  const bidDetails = useMemo(
    () => getBidIncrementDetails(currentPrice, auction?.endTime, new Date(nowTs)),
    [currentPrice, auction?.endTime, nowTs],
  );

  const handleBidChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = parseBidInput(e.target.value, () => {
      setIsError(true);
      setTimeout(() => setIsError(false), 500);
    });
    if (next !== null) setBidAmount(next);
  };

  const auctionStatus =
    (auction && AUCTION_STATUS_UI[auction.status]) || {
      label: auction?.status || "상태 확인",
      className: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
      description: "현재 경매 상태를 확인해 주세요.",
    };

  const startPrice = parseBidPrice(auction?.startPrice);
  const buyNowPrice = auction?.buyNowPrice ? parseBidPrice(auction.buyNowPrice) : null;
  const { minimumBid, effectiveIncrement: minBidIncrement, priceTierLabel: bidIncrementTierLabel } =
    bidDetails;
  const priceIncreaseRate =
    startPrice > 0 ? Math.round(((currentPrice - startPrice) / startPrice) * 100) : 0;
  const buyNowGap = buyNowPrice ? buyNowPrice - currentPrice : null;
  const marketAverage = auction?.marketSummary?.averagePrice
    ? Number(auction.marketSummary.averagePrice)
    : null;
  const estimatedFairPrice = marketAnalysis?.fairPrice ? Number(marketAnalysis.fairPrice) : null;
  const estimatedDiffRate = estimatedFairPrice
    ? Math.round(((currentPrice - estimatedFairPrice) / estimatedFairPrice) * 100)
    : null;
  const analysisSampleCount = Array.isArray(marketAnalysis?.history)
    ? marketAnalysis.history.length
    : auction?.marketSummary?.count || 0;

  return {
    auctionId,
    auction,
    bidAmount,
    setBidAmount,
    isError,
    bidRulesOpen,
    setBidRulesOpen,
    extensionNotice,
    category,
    wildEnchantGroups,
    timeLeft,
    bidDetails,
    handleBidChange,
    auctionStatus,
    pricing: {
      currentPrice,
      startPrice,
      buyNowPrice,
      minimumBid,
      minBidIncrement,
      bidIncrementTierLabel,
      priceIncreaseRate,
      buyNowGap,
      marketAverage,
      estimatedFairPrice,
      estimatedDiffRate,
      analysisSampleCount,
    },
    marketAnalysisLoading,
    ...session,
    ...commentsState,
    ...actions,
  };
}
