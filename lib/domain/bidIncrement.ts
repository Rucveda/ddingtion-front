/**
 * 구간별 최소 입찰 인상 + 마감 임박 시간 배수 (백엔드 bidIncrement.js 와 동일)
 */
const MS_MINUTE = 60 * 1000;
const MS_HOUR = 60 * MS_MINUTE;

/** 100만G (백만) / 1,000만G (천만) / 1억G (억) */
const TIER_BAEKMAN = 1_000_000;
const TIER_CHEONMAN = 10_000_000;

const INCREMENT_BAEKMAN = 10_000;
const INCREMENT_CHEONMAN = 100_000;
const INCREMENT_EOK = 500_000;

export const parseBidPrice = (value: unknown): number => {
  if (value === null || value === undefined) return 0;
  if (typeof value === "bigint") return Number(value);
  if (typeof value === "number") {
    return Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
  }
  const normalized = String(value).replace(/[,_\s]/g, "").trim();
  if (!normalized) return 0;
  const num = Number(normalized);
  return Number.isFinite(num) ? Math.max(0, Math.floor(num)) : 0;
};

export const BID_EXTENSION_THRESHOLD_MS = 10 * MS_MINUTE;
export const BID_EXTENSION_MS = 3 * MS_MINUTE;
export const BID_EXTENSION_MINUTES = BID_EXTENSION_MS / MS_MINUTE;

export const BID_TIME_BANDS = [
  {
    id: "normal",
    label: "마감 1시간 초과",
    multiplier: 1,
    description: "가격 구간 기본 최소 인상",
  },
  {
    id: "soon",
    label: "마감 1시간 이내",
    multiplier: 2,
    description: "최소 인상 2배",
  },
  {
    id: "final",
    label: "마감 10분 이내",
    multiplier: 3,
    description: "최소 인상 3배 · 유효 입찰 시 3분 연장",
  },
] as const;

export const PRICE_INCREMENT_TIERS = [
  { label: "백만 단위 (100만G 미만)", increment: INCREMENT_BAEKMAN },
  { label: "천만 단위 (100만G ~ 1,000만G 미만)", increment: INCREMENT_CHEONMAN },
  { label: "억 단위 (1,000만G 이상)", increment: INCREMENT_EOK },
] as const;

export const getBaseMinBidIncrement = (currentPrice: number): number => {
  const price = parseBidPrice(currentPrice);
  if (price < TIER_BAEKMAN) return INCREMENT_BAEKMAN;
  if (price < TIER_CHEONMAN) return INCREMENT_CHEONMAN;
  return INCREMENT_EOK;
};

export const getPriceTierLabel = (currentPrice: number): string => {
  const price = parseBidPrice(currentPrice);
  if (price < TIER_BAEKMAN) return "백만 단위";
  if (price < TIER_CHEONMAN) return "천만 단위";
  return "억 단위";
};

export const getTimeBidContext = (endTime: string | Date, now: Date = new Date()) => {
  const end = typeof endTime === "string" ? new Date(endTime) : endTime;
  const remainingMs = Math.max(0, end.getTime() - now.getTime());

  if (remainingMs > MS_HOUR) {
    return { multiplier: 1, band: BID_TIME_BANDS[0], remainingMs, extendsOnBid: false };
  }
  if (remainingMs > BID_EXTENSION_THRESHOLD_MS) {
    return { multiplier: 2, band: BID_TIME_BANDS[1], remainingMs, extendsOnBid: false };
  }
  return { multiplier: 3, band: BID_TIME_BANDS[2], remainingMs, extendsOnBid: remainingMs > 0 };
};

export const getMinBidIncrement = (
  currentPrice: number,
  endTime?: string | Date | null,
  now: Date = new Date(),
): number => {
  const base = getBaseMinBidIncrement(currentPrice);
  if (!endTime) return base;
  const { multiplier } = getTimeBidContext(endTime, now);
  return base * multiplier;
};

export const getMinimumBid = (
  currentPrice: number,
  endTime?: string | Date | null,
  now: Date = new Date(),
): number => parseBidPrice(currentPrice) + getMinBidIncrement(currentPrice, endTime, now);

export type BidIncrementDetails = {
  baseIncrement: number;
  effectiveIncrement: number;
  minimumBid: number;
  priceTierLabel: string;
  timeBand: (typeof BID_TIME_BANDS)[number];
  multiplier: number;
  extendsOnBid: boolean;
  nextBand: (typeof BID_TIME_BANDS)[number] | null;
  msUntilNextBand: number | null;
};

export const getBidIncrementDetails = (
  currentPrice: number,
  endTime?: string | Date | null,
  now: Date = new Date(),
): BidIncrementDetails => {
  const price = parseBidPrice(currentPrice);
  const baseIncrement = getBaseMinBidIncrement(price);
  const timeCtx = endTime ? getTimeBidContext(endTime, now) : { multiplier: 1, band: BID_TIME_BANDS[0], remainingMs: 0, extendsOnBid: false };
  const effectiveIncrement = baseIncrement * timeCtx.multiplier;

  let nextBand: (typeof BID_TIME_BANDS)[number] | null = null;
  let msUntilNextBand: number | null = null;
  if (endTime) {
    const end = typeof endTime === "string" ? new Date(endTime) : endTime;
    const remaining = end.getTime() - now.getTime();
    if (remaining > MS_HOUR) {
      nextBand = BID_TIME_BANDS[1];
      msUntilNextBand = remaining - MS_HOUR;
    } else if (remaining > BID_EXTENSION_THRESHOLD_MS) {
      nextBand = BID_TIME_BANDS[2];
      msUntilNextBand = remaining - BID_EXTENSION_THRESHOLD_MS;
    }
  }

  return {
    baseIncrement,
    effectiveIncrement,
    minimumBid: price + effectiveIncrement,
    priceTierLabel: getPriceTierLabel(price),
    timeBand: timeCtx.band,
    multiplier: timeCtx.multiplier,
    extendsOnBid: timeCtx.extendsOnBid,
    nextBand,
    msUntilNextBand,
  };
};

export const formatDurationShort = (ms: number): string => {
  if (ms <= 0) return "곧";
  const totalSec = Math.ceil(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}시간 ${m}분`;
  if (m > 0) return `${m}분 ${s}초`;
  return `${s}초`;
};
