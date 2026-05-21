export const GAME_MAX_PRICE = 10_000_000_000;
export const CHAT_OPEN_EVENT = "ddingtion_chat_open";

export type ItemCategory = "WILD" | "ISLAND" | "RPG" | "OTHER" | null;

export type AuctionStatusMeta = {
  label: string;
  className: string;
  description: string;
};

export const AUCTION_STATUS_UI: Record<string, AuctionStatusMeta> = {
  ACTIVE: {
    label: "진행 중",
    className: "bg-blue-500/10 text-blue-300 border-blue-500/20",
    description: "입찰 또는 즉시 구매가 가능한 경매입니다.",
  },
  PENDING_TRADE: {
    label: "거래 중",
    className: "bg-amber-500/10 text-amber-300 border-amber-500/20",
    description: "낙찰 후 구매자와 판매자가 거래를 확정하는 단계입니다.",
  },
  COMPLETED: {
    label: "거래 완료",
    className: "bg-emerald-500/10 text-emerald-300 border-emerald-500/20",
    description: "양측 확정이 끝나 시세 기록에 반영된 거래입니다.",
  },
  DISPUTED: {
    label: "분쟁",
    className: "bg-red-500/10 text-red-300 border-red-500/20",
    description: "신고가 접수되어 운영 확인이 필요한 거래입니다.",
  },
  CANCEL_PENDING: {
    label: "취소 보류",
    className: "bg-amber-500/10 text-amber-300 border-amber-500/20",
    description:
      "판매자 취소 요청 후 5분이 지나면 유찰 처리됩니다. 판매자는 철회하여 경매를 재개할 수 있습니다.",
  },
};

export type AuctionComment = {
  id: number;
  content: string;
  createdAt: string;
  author?: {
    id: number;
    ingameName?: string;
    reputationScore?: number;
  };
};

export type AuctionDetailRecord = {
  id?: number | string;
  sellerId: number;
  status: string;
  currentPrice: number | string;
  startPrice: number | string;
  buyNowPrice?: number | string | null;
  endTime: string;
  description?: string | null;
  enhancementLevel?: number;
  enhancementRank?: string;
  quality?: number | null;
  lampLines?: string[];
  enchantments?: Record<string, number> | null;
  imprint?: Record<string, number> | null;
  skills?: Record<string, number> | null;
  runes?: Array<{ type?: string; grade?: string }> | null;
  itemId?: number;
  item: {
    name: string;
    category: string;
    iconUrl: string;
  };
  seller?: {
    id?: number;
    ingameName?: string;
    reputationScore?: number;
    successfulTrades?: number;
    reviewCount?: number;
  };
  lastBidder?: string;
  lastBidderId?: number;
  bidCount?: number;
  cancelRequestedAt?: string | null;
  marketSummary?: {
    averagePrice?: number | string;
    count?: number;
  };
};
