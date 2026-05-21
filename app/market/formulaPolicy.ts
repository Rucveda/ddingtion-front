export const FORMULA_POLICY = {
  MIN_UNIT_ENCHANT_RATE_PERCENT: 10,
  MIN_UNIT_IMPRINT_RATE_PERCENT: 5,
  MARKET_ALPHA_K: 8,
  MARKET_ALPHA_MAX: 0.85,
} as const;

export const getExpectedCost = (costPerAttempt: number, ratePercent: number) => {
  const safeRate = Number(ratePercent) > 0 ? Number(ratePercent) : 100;
  return costPerAttempt / (safeRate / 100);
};

export const getMinimumUnitEnchantCost = (bookPrice: number, level: number) => {
  return getExpectedCost(bookPrice, FORMULA_POLICY.MIN_UNIT_ENCHANT_RATE_PERCENT) * level;
};

export const getMinimumUnitImprintCost = (costPerAttempt: number) => {
  return getExpectedCost(costPerAttempt, FORMULA_POLICY.MIN_UNIT_IMPRINT_RATE_PERCENT);
};
