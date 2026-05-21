export const getSecureUrl = (url: string) => {
  if (!url) return "";
  return url.replace("http://", "https://");
};

export const triggerHaptic = () => {
  if (typeof window !== "undefined" && window.navigator?.vibrate) {
    window.navigator.vibrate(10);
  }
};

export const formatGold = (amount: number) => {
  if (amount >= 100000000) {
    const eok = Math.floor(amount / 100000000);
    const man = Math.floor((amount % 100000000) / 10000);
    return man > 0 ? `${eok.toLocaleString()}억 ${man.toLocaleString()}만` : `${eok.toLocaleString()}억`;
  }
  if (amount >= 10000) return `${Math.floor(amount / 10000).toLocaleString()}만`;
  return amount.toLocaleString();
};

export const hasBuyNowPrice = (buyNowPrice?: number | string | null) => {
  if (buyNowPrice == null || buyNowPrice === "") return false;
  return Number(buyNowPrice) > 0;
};
