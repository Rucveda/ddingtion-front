/** NotificationCenter → NotificationOverlay 입찰 토스트 연동 */
export const OUTBID_TOAST_EVENT = "ddingtion_outbid_toast";

export type OutbidToastPayload = {
  auctionId?: number;
  itemName?: string;
  newPrice?: number;
};

export function normalizeOutbidPayload(raw: unknown): OutbidToastPayload | null {
  if (!raw || typeof raw !== "object") return null;
  const data = raw as Record<string, unknown>;
  const auctionId = data.auctionId != null ? Number(data.auctionId) : undefined;
  const newPriceRaw = data.newPrice;
  const newPrice =
    newPriceRaw != null && newPriceRaw !== ""
      ? Number(String(newPriceRaw).replace(/,/g, ""))
      : undefined;

  return {
    auctionId: Number.isFinite(auctionId) ? auctionId : undefined,
    itemName: typeof data.itemName === "string" ? data.itemName : undefined,
    newPrice: Number.isFinite(newPrice) ? newPrice : undefined,
  };
}

export function dispatchOutbidToast(raw: unknown) {
  const payload = normalizeOutbidPayload(raw);
  if (!payload) return;
  window.dispatchEvent(new CustomEvent(OUTBID_TOAST_EVENT, { detail: payload }));
}
