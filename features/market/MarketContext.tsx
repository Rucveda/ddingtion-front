"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { RPG_MAT_LIST } from "@/lib/domain/marketData";

export const DEFAULT_PRICES: Record<string, string> = {
  "LOW_LIFE": "11000", "MID_LIFE": "33500", "HIGH_LIFE": "66500",
  "ISLAND_SCROLL": "100000",
  "RUNE_1": "0", "RUNE_2": "0", "RUNE_3": "0",
  "BASE_ITEM": "0",
  ...Object.fromEntries(RPG_MAT_LIST.map(k => [k, "10000"]))
};

const MarketContext = createContext<any>(null);

export function MarketProvider({ children }: { children: React.ReactNode }) {
  const [prices, setPrices] = useState<Record<string, string>>(DEFAULT_PRICES);
  // 인챈트 시세 (이름별 가격/확률)
  const [enchantPrices, setEnchantPrices] = useState<Record<string, { price: string, rate: string }>>({});
  // 각인 시세 (각인 이름별 가격)
  const [imprintPrices, setImprintPrices] = useState<Record<string, string>>({});
  const [isSaved, setIsSaved] = useState(true);

  // 🛠️ [패치] 유저가 CalcTab에서 계산한 최종 결과값을 저장하는 전역 상태
  const [calcResult, setCalcResult] = useState<number>(0);

  useEffect(() => {
    const saved = localStorage.getItem("ddingtion_market_total_data");
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.prices) setPrices(parsed.prices);
      if (parsed.enchantPrices) setEnchantPrices(parsed.enchantPrices);
      if (parsed.imprintPrices) setImprintPrices(parsed.imprintPrices);
    }
  }, []);

  const updatePrice = (key: string, value: string) => {
    setPrices(prev => ({ ...prev, [key]: value.replace(/[^0-9]/g, '') }));
    setIsSaved(false);
  };

  const updateEnchantPrice = (name: string, price: string, rate: string) => {
    setEnchantPrices(prev => ({ ...prev, [name]: { price: price.replace(/[^0-9]/g, ''), rate: rate.replace(/[^0-9.]/g, '') } }));
    setIsSaved(false);
  };

  const updateImprintPrice = (name: string, price: string) => {
    setImprintPrices(prev => ({ ...prev, [name]: price.replace(/[^0-9]/g, '') }));
    setIsSaved(false);
  };

  const saveAllPrices = () => {
    const data = { prices, enchantPrices, imprintPrices };
    localStorage.setItem("ddingtion_market_total_data", JSON.stringify(data));
    setIsSaved(true);
  };

  const importPricePreset = (data: {
    prices?: Record<string, string>;
    enchantPrices?: Record<string, { price: string; rate: string }>;
    imprintPrices?: Record<string, string>;
  }) => {
    const nextPrices = { ...prices, ...(data.prices || {}) };
    const nextEnchantPrices = { ...enchantPrices, ...(data.enchantPrices || {}) };
    const nextImprintPrices = { ...imprintPrices, ...(data.imprintPrices || {}) };
    setPrices(nextPrices);
    setEnchantPrices(nextEnchantPrices);
    setImprintPrices(nextImprintPrices);
    localStorage.setItem("ddingtion_market_total_data", JSON.stringify({
      prices: nextPrices,
      enchantPrices: nextEnchantPrices,
      imprintPrices: nextImprintPrices,
    }));
    setIsSaved(true);
  };

  const resetAllPrices = () => {
    setPrices(DEFAULT_PRICES);
    setEnchantPrices({});
    setImprintPrices({});
    localStorage.setItem("ddingtion_market_total_data", JSON.stringify({
      prices: DEFAULT_PRICES,
      enchantPrices: {},
      imprintPrices: {},
    }));
    setIsSaved(true);
  };

  return (
    <MarketContext.Provider value={{ 
      prices, enchantPrices, imprintPrices, 
      updatePrice, updateEnchantPrice, updateImprintPrice, 
      saveAllPrices, importPricePreset, resetAllPrices, isSaved,
      // 🛠️ [패치] 공유 변수 및 설정 함수 노출
      calcResult, 
      setCalcResult 
    }}>
      {children}
    </MarketContext.Provider>
  );
}

export const useMarket = () => useContext(MarketContext);