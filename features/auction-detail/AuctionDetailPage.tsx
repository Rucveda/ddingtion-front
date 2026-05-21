"use client";

import { AuctionDetailView } from "./AuctionDetailView";
import { useAuctionDetail } from "./hooks/useAuctionDetail";

export default function AuctionDetailPage() {
  const detail = useAuctionDetail();
  return <AuctionDetailView {...detail} />;
}
