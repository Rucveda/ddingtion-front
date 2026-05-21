import type { AuctionDetailRecord, ItemCategory } from "./auctionDetailTypes";
import { GAME_MAX_PRICE } from "./auctionDetailTypes";
import { triggerHaptic } from "@/features/home/auctionListUtils";

export { formatGold, getSecureUrl, triggerHaptic } from "@/features/home/auctionListUtils";

export const detectItemCategory = (auction: AuctionDetailRecord | null): ItemCategory => {
  if (!auction?.item?.category) return null;
  const cat = auction.item.category.toUpperCase();
  if (cat.includes("WILD") || cat.includes("야생")) return "WILD";
  if (cat.includes("ISLAND") || cat.includes("아일랜드")) return "ISLAND";
  if (cat.includes("RPG")) return "RPG";
  return "OTHER";
};

export const maskBidderName = (name?: string) => {
  if (!name || name === "없음") return "입찰자 없음";
  return name.substring(0, 3) + "*".repeat(Math.max(0, name.length - 3));
};

export const parseBidInput = (
  raw: string,
  onOverMax: () => void,
): string | null => {
  const val = raw.replace(/[^0-9]/g, "");
  if (Number(val) > GAME_MAX_PRICE) {
    triggerHaptic();
    onOverMax();
    return null;
  }
  return val;
};
