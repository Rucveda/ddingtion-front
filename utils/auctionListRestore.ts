export const AUCTION_LIST_RESTORE_KEY = "ddingtion_auction_list_restore";

export type AuctionListRestoreState = {
  page: number;
  sort: string;
  scrollY: number;
};

export const saveAuctionListRestore = (state: AuctionListRestoreState) => {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(AUCTION_LIST_RESTORE_KEY, JSON.stringify(state));
};

/** 상세에서 목록으로 돌아올 때 한 번만 읽고 제거합니다. */
export const consumeAuctionListRestore = (): AuctionListRestoreState | null => {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(AUCTION_LIST_RESTORE_KEY);
  if (!raw) return null;
  sessionStorage.removeItem(AUCTION_LIST_RESTORE_KEY);

  try {
    const parsed = JSON.parse(raw) as Partial<AuctionListRestoreState>;
    if (typeof parsed.page !== "number" || typeof parsed.scrollY !== "number") return null;
    return {
      page: Math.max(1, Math.floor(parsed.page)),
      sort: typeof parsed.sort === "string" ? parsed.sort : "default",
      scrollY: Math.max(0, parsed.scrollY),
    };
  } catch {
    return null;
  }
};
