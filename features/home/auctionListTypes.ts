export const AUCTIONS_PER_PAGE = 20;

export type AuctionSortKey = "default" | "priceAsc" | "priceDesc" | "newest";

export const AUCTION_SORT_OPTIONS: { key: AuctionSortKey; label: string }[] = [
  { key: "default", label: "기본" },
  { key: "priceAsc", label: "가격 낮은순" },
  { key: "priceDesc", label: "가격 높은순" },
  { key: "newest", label: "최근 등록" },
];

export const AUCTION_FILTER_STORAGE_KEY = "ddingtion_auction_list_filters";

export interface Auction {
  id: number;
  currentPrice: number;
  endTime: string;
  createdAt?: string;
  status: string;
  item: { name: string; iconUrl: string; category: string };
  seller: { ingameName: string; reputationScore?: number };
  enhancementLevel: number;
  enchantments?: Record<string, number>;
  imprint?: Record<string, number>;
  skills?: Record<string, number>;
  runes?: { grade?: string; type?: string }[] | null;
  buyNowPrice?: number | string | null;
}

export interface HomeUser {
  id: number;
  ingameName: string;
  role: string;
  discordLinked?: boolean;
}

export type HomeTabType = "HOME" | "COMMUNITY" | "CALCULATOR" | "AUCTION";

export function resolveHomeTab(tab: string | null): HomeTabType {
  if (tab === "AUCTION" || tab === "COMMUNITY" || tab === "CALCULATOR") return tab;
  if (tab === "NOTICE") return "COMMUNITY";
  return "HOME";
}

export function homeTabHref(tab: HomeTabType): string {
  return tab === "HOME" ? "/" : `/?tab=${tab}`;
}

export type FilterSection = "category" | "priceRange" | "timeRange" | "detail";
export type DetailFilterSection = "enhancement" | "enchantments" | "imprints" | "skills";

export type AuctionFilterState = {
  category: string[];
  priceMin: string;
  priceMax: string;
  timeRange: string[];
  enhancementLevels: number[];
  enchantments: string[];
  imprints: string[];
  skills: string[];
};

export const DEFAULT_AUCTION_FILTERS: AuctionFilterState = {
  category: [],
  priceMin: "",
  priceMax: "",
  timeRange: [],
  enhancementLevels: [],
  enchantments: [],
  imprints: [],
  skills: [],
};
