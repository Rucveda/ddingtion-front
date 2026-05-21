import fs from "node:fs";
import path from "node:path";

const root = path.join(process.cwd(), "app", "auction", "[id]", "page.tsx");
const out = path.join(process.cwd(), "features", "auction-detail", "AuctionDetailView.tsx");
const content = fs.readFileSync(root, "utf8");

const loadingStart = content.indexOf("if (!auction || !auction.item) return (");
const mainReturnStart = content.indexOf("  return (\n    <div className=\"min-h-screen bg-[#010101]");
if (loadingStart < 0 || mainReturnStart < 0) {
  console.error("markers not found");
  process.exit(1);
}

const loadingBlock = content.slice(loadingStart, mainReturnStart).trim();
let mainBlock = content.slice(mainReturnStart);
mainBlock = mainBlock.replace(/^  return \(/, "  return (");
const helpersEnd = mainBlock.lastIndexOf("  function handleBidChange");
if (helpersEnd > 0) {
  mainBlock = mainBlock.slice(0, helpersEnd).trimEnd();
  if (mainBlock.endsWith(");")) mainBlock = mainBlock.slice(0, -2).trimEnd();
  mainBlock += "\n  );\n";
}

const header = `"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { SimpleTopBar, SiteBackground, SiteFooter } from "@/components/SiteChrome";
import {
  BID_EXTENSION_MINUTES,
  BID_TIME_BANDS,
  PRICE_INCREMENT_TIERS,
  formatDurationShort,
  getMinBidIncrement,
  getMinimumBid,
} from "@/lib/domain/bidIncrement";
import { getWildEnchantActiveBadgeClass } from "@/lib/domain/enhancementAllowlist";
import { formatGold, getSecureUrl } from "./auctionDetailUtils";
import { maskBidderName } from "./auctionDetailUtils";
import type { useAuctionDetail } from "./hooks/useAuctionDetail";

export type AuctionDetailViewProps = ReturnType<typeof useAuctionDetail>;

export function AuctionDetailView(props: AuctionDetailViewProps) {
  const {
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
    pricing,
    marketAnalysisLoading,
    currentUser,
    needsDiscordForTrade,
    verifyingSession,
    comments,
    commentInput,
    setCommentInput,
    isCommenting,
    handleCommentSubmit,
    isProcessing,
    isSeller,
    canAuctionTrade,
    handleBid,
    handleBuyNow,
    handleCancelRequest,
    handleCancelRevoke,
  } = props;

  const {
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
  } = pricing;

`;

const loadingAdapted = loadingBlock
  .replace(/getSecureUrl/g, "getSecureUrl")
  .replace(/formatGold/g, "formatGold")
  .replace(/maskName\(/g, "maskBidderName(");

const mainAdapted = mainBlock
  .replace(/maskName\(/g, "maskBidderName(")
  .replace(/triggerHaptic/g, "() => {}")
  .replace(/onNavigate={triggerHaptic}/g, "onNavigate={() => {}}");

fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, header + "\n  " + loadingAdapted + "\n\n  " + mainAdapted + "\n}\n", "utf8");
console.log("wrote", out);
