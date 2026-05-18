"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import {
  ISLAND_ENHANCE_TABLE,
  RPG_ENHANCE_DATA,
  RPG_MAT_LIST,
  WILD_BASE,
  WILD_SPECIAL,
  ISLAND_IMPRINTS,
  RUNE_GRADES,
  RUNE_TYPES,
  RPG_SKILL_SYSTEM,
  RPG_SKILL_COMMON_RATES,
  SKILL_SLOT_SEAL_COSTS,
  RPG_WEAPON_INFO
} from "./marketData";
import { DEFAULT_PRICES, useMarket } from "./MarketContext";

export default function CalcTab({ selectedItem }: { selectedItem: any }) {
  const { prices, enchantPrices, imprintPrices, updateEnchantPrice, saveAllPrices, importPricePreset, resetAllPrices, updatePrice, setCalcResult } = useMarket();
  const [rpgRank, setRpgRank] = useState("입문");
  const [activeRuneSlot, setActiveRuneSlot] = useState<number | null>(null);

  const [isPriceFeedbackActive, setIsPriceFeedbackActive] = useState(false);
  const [isFilterFeedbackActive, setIsFilterFeedbackActive] = useState(false);
  const [importCode, setImportCode] = useState("");
  const [shareFeedback, setShareFeedback] = useState("");

  const initialFilters = {
    enhancementLevel: 0,
    enchantments: {} as Record<string, number>,
    imprints: {} as Record<string, number>,
    skills: {} as Record<string, number>,
    runes: [{ grade: "루키", type: "" }, { grade: "루키", type: "" }, { grade: "루키", type: "" }]
  };

  const [filters, setFilters] = useState(initialFilters);

  useEffect(() => {
    if (selectedItem) {
      const weaponGroup = Object.keys(RPG_WEAPON_INFO).find(key => selectedItem.name.includes(key));
      if (weaponGroup) {
        setRpgRank(RPG_WEAPON_INFO[weaponGroup].rank);
      }
      const savedPreset = localStorage.getItem(`preset_${selectedItem.id}`);
      if (savedPreset) setFilters(JSON.parse(savedPreset));
      else setFilters(initialFilters);
    }
  }, [selectedItem]);

  const triggerHaptic = useCallback((intensity = 10) => {
    if (typeof window !== "undefined" && window.navigator?.vibrate) window.navigator.vibrate(intensity);
  }, []);

  const getSecureUrl = (url: string) => url?.replace("http://", "https://") || "";

  const formatGold = (num: number) => {
    const safeNum = Math.abs(isNaN(num) ? 0 : num);
    if (safeNum >= 100000000) {
      const uk = Math.floor(safeNum / 100000000);
      const man = Math.floor((safeNum % 100000000) / 10000);
      return `${uk}억 ${man > 0 ? man.toLocaleString() + '만' : ''}`;
    }
    if (safeNum >= 10000) {
      return `${Math.floor(safeNum / 10000).toLocaleString()}만`;
    }
    return safeNum.toLocaleString();
  };

  const handleSavePrices = () => {
    triggerHaptic();
    saveAllPrices();
    setIsPriceFeedbackActive(true);
    setTimeout(() => setIsPriceFeedbackActive(false), 1500);
  };

  const handleResetPrices = () => {
    triggerHaptic();
    if (!confirm("저장된 시세 입력값을 모두 초기화할까요?")) return;
    resetAllPrices();
    setImportCode("");
    setShareFeedback("시세 초기화됨");
    setTimeout(() => setShareFeedback(""), 1800);
  };

  const handleSaveFilters = () => {
    triggerHaptic();
    if (!selectedItem) return;
    localStorage.setItem(`preset_${selectedItem.id}`, JSON.stringify(filters));
    setIsFilterFeedbackActive(true);
    setTimeout(() => setIsFilterFeedbackActive(false), 1500);
  };

  const handleResetFilters = () => {
    triggerHaptic();
    if (!selectedItem) return;
    if (!confirm("현재 아이템의 선택 옵션을 초기화할까요?")) return;
    setFilters(initialFilters);
    setActiveRuneSlot(null);
    const weaponGroup = Object.keys(RPG_WEAPON_INFO).find(key => selectedItem.name.includes(key));
    setRpgRank(weaponGroup ? RPG_WEAPON_INFO[weaponGroup].rank : "입문");
    localStorage.removeItem(`preset_${selectedItem.id}`);
    setIsFilterFeedbackActive(true);
    setTimeout(() => setIsFilterFeedbackActive(false), 1500);
  };

  const encodePreset = (payload: unknown) => {
    const json = JSON.stringify(payload);
    const bytes = new TextEncoder().encode(json);
    const binary = Array.from(bytes, (byte) => String.fromCharCode(byte)).join("");
    return btoa(binary)
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/g, "");
  };

  const decodePreset = (code: string) => {
    const normalized = code.trim().replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    return JSON.parse(new TextDecoder().decode(bytes));
  };

  const handleExportPricePreset = async () => {
    triggerHaptic();
    const typedPrices = prices as Record<string, string>;
    const typedEnchantPrices = enchantPrices as Record<string, { price: string; rate: string }>;
    const typedImprintPrices = imprintPrices as Record<string, string>;
    const compactPrices = Object.entries(typedPrices).filter(([key, value]) => {
      return String(value ?? "") !== String(DEFAULT_PRICES[key] ?? "");
    });
    const compactEnchantPrices = Object.entries(typedEnchantPrices).map(([name, data]) => [
      name,
      data.price || "",
      data.rate || "",
    ]);
    const compactImprintPrices = Object.entries(typedImprintPrices);
    const payload = {
      v: 2,
      p: compactPrices,
      e: compactEnchantPrices,
      i: compactImprintPrices,
    };
    const code = encodePreset(payload);
    setImportCode(code);
    setShareFeedback("공유 코드 생성됨");
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(code).catch(() => null);
      setShareFeedback("공유 코드 복사됨");
    }
    setTimeout(() => setShareFeedback(""), 1800);
  };

  const handleImportPricePreset = () => {
    triggerHaptic();
    try {
      const parsed = decodePreset(importCode);
      if (parsed?.v === 2) {
        const restoredPrices = Object.fromEntries(Array.isArray(parsed.p) ? parsed.p : []);
        const restoredEnchantPrices = Object.fromEntries(
          (Array.isArray(parsed.e) ? parsed.e : []).map(([name, price, rate]: string[]) => [
            name,
            { price: price || "", rate: rate || "" },
          ])
        );
        const restoredImprintPrices = Object.fromEntries(Array.isArray(parsed.i) ? parsed.i : []);
        importPricePreset({
          prices: restoredPrices,
          enchantPrices: restoredEnchantPrices,
          imprintPrices: restoredImprintPrices,
        });
      } else if (parsed?.v === 1 && parsed.prices) {
        importPricePreset({
          prices: parsed.prices,
          enchantPrices: parsed.enchantPrices || {},
          imprintPrices: parsed.imprintPrices || {},
        });
      } else {
        throw new Error("invalid preset");
      }
      setImportCode("");
      setShareFeedback("공유 시세 적용됨");
      setTimeout(() => setShareFeedback(""), 1800);
    } catch {
      alert("공유 코드를 읽을 수 없습니다. 전체 문자열을 다시 붙여넣어 주세요.");
    }
  };

  const category = selectedItem?.category.toUpperCase().includes("WILD") ? "WILD" : selectedItem?.category.toUpperCase().includes("ISLAND") ? "ISLAND" : selectedItem?.category.toUpperCase().includes("RPG") ? "RPG" : "OTHER";

  const weaponType = useMemo(() => {
    if (category !== "RPG") return null;
    return ["스태프", "망치", "총", "활", "창", "대검"].find(t => selectedItem.name.includes(t)) || null;
  }, [selectedItem, category]);

  const skillConfig = weaponType ? RPG_SKILL_SYSTEM[weaponType] : null;

  const activeNeededMaterials = useMemo(() => {
    if (category !== "RPG") return [];
    const needed = new Set<string>();
    const steps = RPG_ENHANCE_DATA[rpgRank] || [];
    for (let i = 0; i < filters.enhancementLevel; i++) {
      if (steps[i]) Object.keys(steps[i].mats).forEach(m => needed.add(m));
    }
    return Array.from(needed);
  }, [category, rpgRank, filters.enhancementLevel]);

  const toggleOption = (type: 'enchantments' | 'imprints' | 'skills', name: string, maxTier: number) => {
    triggerHaptic();
    setFilters(prev => {
      const current = { ...prev[type] };
      if (!current[name]) {
        if (type === 'skills' && Object.keys(current).length >= 4) {
          alert("전투 스킬은 최대 4개까지만 장착 가능합니다.");
          return prev;
        }
        current[name] = 1;
      }
      else if (current[name] < maxTier) current[name] += 1;
      else delete current[name];
      return { ...prev, [type]: current };
    });
  };

  const updateRune = (grade?: string, type?: string) => {
    if (activeRuneSlot === null) return;
    triggerHaptic();
    const newRunes = [...filters.runes];
    if (grade !== undefined) newRunes[activeRuneSlot].grade = grade;
    if (type !== undefined) newRunes[activeRuneSlot].type = type;
    setFilters({ ...filters, runes: newRunes });
  };

  const receiptData = useMemo(() => {
    if (!selectedItem) return { items: [], total: 0 };
    let items: any[] = [];
    let cumulative = 0;

    if (category === "WILD") {
      Object.entries(filters.enchantments).forEach(([name, level]) => {
        const HIGH_LIMITS: Record<string, number> = { "날카로움": 5, "미끼": 3, "보호": 4, "약탈": 3, "행운": 3, "효율": 5 };
        const normalMax = HIGH_LIMITS[name] || 5;

        const enchant = enchantPrices[name] || { price: "0", rate: "10" };
        const normalPrice = Number(enchant.price);
        const normalRate = Number(enchant.rate) || 10;

        if (level <= normalMax) {
          const unitCost = Math.round((normalPrice / (normalRate / 100)) * (level as number));
          cumulative += unitCost;
          items.push({ name, subText: `인챈트 Lv.${level} (${normalRate}% 기댓값)`, cost: unitCost });
        } else {
          const normalRangeCost = Math.round((normalPrice / (normalRate / 100)) * normalMax);
          cumulative += normalRangeCost;
          items.push({ name, subText: `일반 구간 Lv.${normalMax} 누적`, cost: normalRangeCost });

          const highBookPrice = Number(prices[`MAT_HIGH_BOOK_${name}`] || 0);
          const highRate = Number(prices[`MAT_HIGH_RATE_${name}`] || 10);
          const highLevelCost = Math.round(highBookPrice / (highRate / 100));

          const extraLevels = (level as number) - normalMax;
          const totalHighCost = highLevelCost * extraLevels;
          cumulative += totalHighCost;
          items.push({ name: `상급 ${name}`, subText: `상급 Lv.${extraLevels} (${highRate}% 기댓값)`, cost: totalHighCost });
        }
      });
    }
    else if (category === "ISLAND") {
      const contractPrice = Number(prices.MAT_ISLAND_CONTRACT || 0);
      const lowStone = Number(prices.MAT_STONE_LOW || 0);
      const midStone = Number(prices.MAT_STONE_MID || 0);
      const highStone = Number(prices.MAT_STONE_HIGH || 0);
      const usageMap: Record<number, number> = { 1: 5, 2: 10, 3: 15, 4: 20, 5: 25 };

      Object.entries(filters.imprints).forEach(([name, level]) => {
        const stonePrice = Number(prices[`MAT_SCROLL_투박한_${name}`] || 0);
        const unitCost = Math.round((stonePrice + (usageMap[level as number] * contractPrice)) * 20);
        if (unitCost > 0) {
          cumulative += unitCost;
          items.push({ name, subText: `각인 Lv.${level} 제작 비용`, cost: unitCost });
        }
      });
      for (let i = 1; i <= filters.enhancementLevel; i++) {
        const step = ISLAND_ENHANCE_TABLE[i - 1];
        if (step) {
          const tryCost = step.gold + (step.mats.low * lowStone) + (step.mats.mid * midStone) + (step.mats.high * highStone);
          const unitCost = Math.round(tryCost * (100 / step.rate));
          cumulative += unitCost;
          items.push({ name: `강화 +${i}`, subText: `성공률 ${step.rate}% 기댓값`, cost: unitCost });
        }
      }
    }
    else if (category === "RPG") {
      const wType = ["스태프", "망치", "총", "활", "창", "대검"].find(t => selectedItem.name.includes(t));
      const base = Number(prices[`MAT_RPG_BASE_${wType}`] || prices[`MAT_RPG_BASE_${selectedItem.name}`] || 0);
      cumulative = base;
      items.push({ name: selectedItem.name, subText: `순정 본체 시세`, cost: base });

      if (skillConfig) {
        const skillEntries = Object.entries(filters.skills);
        const skillCount = skillEntries.length;
        const sealPrice = Number(prices["MAT_RPG_해방의 인장"] || 0);
        const emblemPrice = Number(prices["MAT_RPG_개방의 문장"] || 0);
        const awakenStonePrice = Number(prices[`MAT_RPG_${skillConfig.material}`] || 0);

        let totalSealNeeded = 0;
        for (let i = 0; i < skillCount; i++) totalSealNeeded += SKILL_SLOT_SEAL_COSTS[i];

        if (totalSealNeeded > 0) {
          const totalSealCost = totalSealNeeded * sealPrice;
          cumulative += totalSealCost;
          items.push({ name: `스킬 슬롯 해금 (${skillCount}개)`, subText: `해방의 인장 ${totalSealNeeded}개 누적`, cost: totalSealCost });
        }

        skillEntries.forEach(([skillName, level]) => {
          const info = skillConfig.skills[skillName];
          if (info) {
            const unlockCost = (info.emblem * emblemPrice) + info.unlockGold;
            cumulative += unlockCost;
            items.push({ name: skillName, subText: `스킬 활성화 (문장 ${info.emblem}개)`, cost: unlockCost });
            for (let i = 0; i < level; i++) {
              const tryCost = info.enhanceGold[i] + awakenStonePrice;
              const expectedValue = Math.round(tryCost * (100 / RPG_SKILL_COMMON_RATES[i]));
              cumulative += expectedValue;
              items.push({ name: `${skillName} +${i + 1}`, subText: `${RPG_SKILL_COMMON_RATES[i]}% 기댓값`, cost: expectedValue });
            }
          }
        });
      }

      filters.runes.forEach((rune) => {
        if (rune.type) {
          const rPrice = Number(prices[`MAT_RUNE_${rune.type}_${rune.grade}`]) || 0;
          cumulative += rPrice;
          items.push({ name: rune.type, subText: `룬 장착 [${rune.grade}]`, cost: rPrice });
        }
      });

      const steps = RPG_ENHANCE_DATA[rpgRank] || [];
      for (let i = 0; i < filters.enhancementLevel; i++) {
        const step = steps[i];
        if (step) {
          let matCost = 0;
          Object.entries(step.mats).forEach(([mName, count]: any) => matCost += (Number(prices[`MAT_RPG_${mName}`] || 0) * count));
          const unitCost = step.gold + matCost;
          cumulative += unitCost;
          items.push({ name: `강화 +${i + 1}`, subText: `${rpgRank} 등급 강화비`, cost: unitCost });
        }
      }
    }
    return { items, total: cumulative };
  }, [selectedItem, prices, enchantPrices, filters, rpgRank, category, skillConfig]);

  const chartData = useMemo(() => {
    let sum = 0;
    const initial = [{ name: "시작", expected: 0 }];
    const data = receiptData.items.map(item => { sum += item.cost; return { name: item.name, expected: sum }; });
    return data.length > 0 ? [...initial, ...data] : initial;
  }, [receiptData]);

  useEffect(() => {
    if (receiptData.total !== undefined) {
      setCalcResult(receiptData.total);
    }
  }, [receiptData.total, setCalcResult]);

  if (!selectedItem) return null;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <section className="lg:col-span-7 bg-white/[0.02] border border-white/5 p-5 rounded-[30px] shadow-2xl flex flex-col h-[320px] backdrop-blur-md relative overflow-hidden">
          <div className="flex items-center gap-3 mb-4 px-1"><div className="w-1.5 h-3.5 bg-blue-600 rounded-full" /><h3 className="text-[11px] font-extrabold text-zinc-400 uppercase tracking-[0.14em]">기댓값 시뮬레이션</h3></div>
          <div className="flex-1 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff03" vertical={false} />
                <XAxis dataKey="name" hide />
                <YAxis hide domain={['auto', 'auto']} />
                <Tooltip contentStyle={{ backgroundColor: '#0a0a0b', border: '1px solid #ffffff10', borderRadius: '12px' }} itemStyle={{ fontSize: '11px', fontWeight: 'bold' }} formatter={(val: any) => [formatGold(val), "누적 비용"]} />
                <Line type="monotone" dataKey="expected" stroke="#3b82f6" strokeWidth={4} dot={false} animationDuration={600} isAnimationActive={true} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="lg:col-span-5 bg-white/[0.02] border border-white/5 p-5 rounded-[30px] shadow-2xl flex flex-col h-[320px] backdrop-blur-md">
          <div className="flex justify-between items-end mb-4 border-b border-white/5 pb-3"><div className="flex flex-col gap-1"><span className="text-[10px] font-extrabold text-blue-400 uppercase tracking-[0.14em]">Simulation Ledger</span><h4 className="text-base font-extrabold text-zinc-200">직작 예상 비용</h4></div><div className="text-right"><div className="text-xl font-black text-blue-400 font-mono tracking-[-0.04em] tabular-nums">{formatGold(receiptData.total)} G</div></div></div>
          <div className="flex-1 overflow-y-auto pr-2 space-y-2 custom-scrollbar">
            {receiptData.items.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between bg-black/20 px-3 py-2.5 rounded-xl border border-white/5 transition-all">
                <div className="min-w-0 flex-1 mr-4"><div className="text-[11px] font-semibold text-zinc-300 truncate">{item.name}</div><div className="text-[9px] text-zinc-600 font-extrabold uppercase tracking-tight truncate">{item.subText}</div></div>
                <div className="text-xs font-black text-zinc-500 font-mono shrink-0">+{formatGold(item.cost)}</div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="bg-blue-600/[0.03] border border-blue-500/20 p-5 rounded-[30px] shadow-xl backdrop-blur-md">
        <div className="flex flex-col gap-3 mb-4 px-1 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3"><div className="w-1.5 h-4 bg-blue-500 rounded-full" /><h3 className="text-[11px] font-extrabold text-zinc-300 uppercase tracking-[0.14em]">시세 입력</h3></div>
          <div className="flex flex-wrap items-center gap-2">
            {shareFeedback && (
              <span className="rounded-full border border-green-500/15 bg-green-500/8 px-2.5 py-1 text-[9px] font-semibold leading-none tracking-[-0.01em] text-green-300/85">
                {shareFeedback}
              </span>
            )}
            <button onClick={handleExportPricePreset} className="site-btn site-btn-secondary site-btn-compact">
              공유 코드 생성
            </button>
            <button onClick={handleResetPrices} className="site-btn site-btn-ghost site-btn-compact">
              시세 초기화
            </button>
            <button onClick={handleSavePrices} className={`site-btn site-btn-compact ${isPriceFeedbackActive ? "border-green-500/30 bg-green-500/15 text-green-100" : "site-btn-primary"}`}>
              {isPriceFeedbackActive ? "✓ 시세 저장됨" : "현재 시세 저장"}
            </button>
          </div>
        </div>

        <div className="mb-4 grid grid-cols-1 gap-2 md:grid-cols-[1fr_auto]">
          <input
            value={importCode}
            onChange={(e) => setImportCode(e.target.value.trim())}
            className="min-w-0 rounded-xl border border-white/10 bg-black/35 px-3 py-2 font-mono text-[10px] font-semibold text-zinc-300 outline-none placeholder:text-zinc-700 focus:border-blue-500/40"
            placeholder="공유받은 시세 코드를 붙여넣기"
          />
          <button
            type="button"
            onClick={handleImportPricePreset}
            disabled={!importCode.trim()}
            className="site-btn site-btn-primary site-btn-compact"
          >
            코드 적용
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-2">
          {category === "RPG" && (
            <>
              {(() => {
                const wType = ["스태프", "망치", "총", "활", "창", "대검"].find(t => selectedItem.name.includes(t));
                const baseKey = `MAT_RPG_BASE_${wType || selectedItem.name}`;
                return (
                  <div className="bg-black/50 px-3 py-2.5 rounded-2xl border border-cyan-500/30 flex flex-col gap-1.5">
                    <span className="text-[9px] font-extrabold text-cyan-400 uppercase tracking-[0.12em]">순정 시세 ({wType || "기본"})</span>
                    <input className="bg-transparent text-sm font-black font-mono text-white outline-none w-full" value={prices[baseKey] || ""} onChange={e => updatePrice(baseKey, e.target.value.replace(/[^0-9]/g, ''))} placeholder="0" />
                  </div>
                );
              })()}
              <div className="bg-black/40 px-3 py-2.5 rounded-2xl border border-white/5 flex flex-col gap-1.5"><span className="text-[9px] font-extrabold text-zinc-600 uppercase">해방의 인장</span><input className="bg-transparent text-sm font-black font-mono text-cyan-400 outline-none w-full" value={prices["MAT_RPG_해방의 인장"] || ""} onChange={e => updatePrice("MAT_RPG_해방의 인장", e.target.value.replace(/[^0-9]/g, ''))} placeholder="0" /></div>
              <div className="bg-black/40 px-3 py-2.5 rounded-2xl border border-white/5 flex flex-col gap-1.5"><span className="text-[9px] font-extrabold text-zinc-600 uppercase">개방의 문장</span><input className="bg-transparent text-sm font-black font-mono text-purple-400 outline-none w-full" value={prices["MAT_RPG_개방의 문장"] || ""} onChange={e => updatePrice("MAT_RPG_개방의 문장", e.target.value.replace(/[^0-9]/g, ''))} placeholder="0" /></div>
              {skillConfig && (<div className="bg-black/40 px-3 py-2.5 rounded-2xl border border-white/5 flex flex-col gap-1.5"><span className="text-[9px] font-extrabold text-zinc-600 uppercase">{skillConfig.material}</span><input className="bg-transparent text-sm font-black font-mono text-orange-400 outline-none w-full" value={prices[`MAT_RPG_${skillConfig.material}`] || ""} onChange={e => updatePrice(`MAT_RPG_${skillConfig.material}`, e.target.value.replace(/[^0-9]/g, ''))} placeholder="0" /></div>)}
              {activeNeededMaterials.map(m => (
                <div key={m} className="bg-black/50 px-3 py-2.5 rounded-2xl border border-blue-500/20 flex flex-col gap-1.5"><span className="text-[9px] font-extrabold text-blue-400 uppercase">{m}</span><input className="bg-transparent text-sm font-black font-mono text-zinc-100 outline-none w-full" value={prices[`MAT_RPG_${m}`] || ""} onChange={e => updatePrice(`MAT_RPG_${m}`, e.target.value.replace(/[^0-9]/g, ''))} placeholder="0" /></div>
              ))}
            </>
          )}
          {category === "ISLAND" && (
            <>
              <div className="bg-black/40 px-3 py-2.5 rounded-2xl border border-white/5 flex flex-col gap-1.5"><span className="text-[9px] font-extrabold text-yellow-500 uppercase">각인 계약서</span><input className="bg-transparent text-sm font-black font-mono text-yellow-500 outline-none w-full" value={prices.MAT_ISLAND_CONTRACT || ""} onChange={e => updatePrice("MAT_ISLAND_CONTRACT", e.target.value.replace(/[^0-9]/g, ''))} placeholder="0" /></div>
              <div className="bg-black/40 px-3 py-2.5 rounded-2xl border border-white/5 flex flex-col gap-1.5"><span className="text-[9px] font-extrabold text-zinc-600 uppercase">라이프스톤(하)</span><input className="bg-transparent text-sm font-black font-mono text-zinc-100 outline-none w-full" value={prices.MAT_STONE_LOW || ""} onChange={e => updatePrice("MAT_STONE_LOW", e.target.value.replace(/[^0-9]/g, ''))} placeholder="0" /></div>
              <div className="bg-black/40 px-3 py-2.5 rounded-2xl border border-white/5 flex flex-col gap-1.5"><span className="text-[9px] font-extrabold text-zinc-600 uppercase">라이프스톤(중)</span><input className="bg-transparent text-sm font-black font-mono text-zinc-100 outline-none w-full" value={prices.MAT_STONE_MID || ""} onChange={e => updatePrice("MAT_STONE_MID", e.target.value.replace(/[^0-9]/g, ''))} placeholder="0" /></div>
              <div className="bg-black/40 px-3 py-2.5 rounded-2xl border border-white/5 flex flex-col gap-1.5"><span className="text-[9px] font-extrabold text-zinc-600 uppercase">라이프스톤(상)</span><input className="bg-transparent text-sm font-black font-mono text-zinc-100 outline-none w-full" value={prices.MAT_STONE_HIGH || ""} onChange={e => updatePrice("MAT_STONE_HIGH", e.target.value.replace(/[^0-9]/g, ''))} placeholder="0" /></div>
              {Object.keys(filters.imprints).map(name => (
                <div key={name} className="bg-black/50 px-3 py-2.5 rounded-2xl border border-yellow-500/20 flex flex-col gap-1.5">
                  <span className="text-[9px] font-extrabold text-yellow-600 uppercase">{name} 각인서</span>
                  <input className="bg-transparent text-sm font-black font-mono text-white outline-none w-full" value={prices[`MAT_SCROLL_투박한_${name}`] || ""} onChange={e => updatePrice(`MAT_SCROLL_투박한_${name}`, e.target.value.replace(/[^0-9]/g, ''))} placeholder="0" />
                </div>
              ))}
            </>
          )}
          {category === "WILD" && Object.keys(filters.enchantments).map(name => {
            const HIGH_LIMITS: Record<string, number> = { "날카로움": 5, "미끼": 3, "보호": 4, "약탈": 3, "행운": 3, "효율": 5 };
            const isHighAvailable = HIGH_LIMITS[name] !== undefined && filters.enchantments[name] > HIGH_LIMITS[name];

            return (
              <div key={name} className="contents">
                {/* 일반 인챈트 시세 / 확률 */}
                <div className="bg-black/40 px-3 py-2.5 rounded-2xl border border-white/5 flex flex-col gap-1.5">
                  <span className="text-[9px] font-extrabold text-blue-400 uppercase">{name} 가격 / 확률(%)</span>
                  <div className="flex gap-2">
                    <input className="bg-transparent text-sm font-black font-mono text-zinc-100 outline-none w-full" value={enchantPrices[name]?.price || ""} onChange={e => updateEnchantPrice(name, e.target.value, enchantPrices[name]?.rate || "10")} placeholder="0" />
                    <input className="bg-transparent text-sm font-black font-mono text-blue-500 outline-none w-12 text-center border-l border-white/10" value={enchantPrices[name]?.rate || ""} onChange={e => updateEnchantPrice(name, enchantPrices[name]?.price || "0", e.target.value)} placeholder="10" />
                  </div>
                </div>

                {/* 상급 인챈트 시세 / 확률 (통합형) */}
                {isHighAvailable && (
                  <div className="bg-black/50 px-3 py-2.5 rounded-2xl border border-orange-500/30 flex flex-col gap-1.5">
                    <span className="text-[9px] font-extrabold text-orange-500 uppercase">상급 {name} 가격 / 확률(%)</span>
                    <div className="flex gap-2">
                      <input
                        className="bg-transparent text-sm font-black font-mono text-orange-400 outline-none w-full"
                        value={prices[`MAT_HIGH_BOOK_${name}`] || ""}
                        onChange={e => updatePrice(`MAT_HIGH_BOOK_${name}`, e.target.value.replace(/[^0-9]/g, ''))}
                        placeholder="0"
                      />
                      <input
                        className="bg-transparent text-sm font-black font-mono text-orange-500 outline-none w-12 text-center border-l border-white/10"
                        value={prices[`MAT_HIGH_RATE_${name}`] || ""}
                        onChange={e => updatePrice(`MAT_HIGH_RATE_${name}`, e.target.value.replace(/[^0-9]/g, ''))}
                        placeholder="10"
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <section className="bg-white/[0.02] border border-white/5 p-5 md:p-6 rounded-[32px] shadow-2xl backdrop-blur-md">
        <div className="flex flex-col gap-3 mb-5 border-b border-white/5 pb-4 px-1 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4"><div className="w-11 h-11 bg-black/40 rounded-2xl flex items-center justify-center border border-white/5 shrink-0 shadow-inner"><img src={getSecureUrl(selectedItem.iconUrl)} className="w-8 h-8 pixel-art" alt="" /></div><div><h3 className="text-lg font-extrabold uppercase tracking-[-0.03em]">{selectedItem.name}</h3><p className="text-blue-400 font-extrabold text-[10px] uppercase tracking-[0.12em] mt-1">아이템 커스텀 설정</p></div></div>
          <div className="flex flex-wrap justify-end gap-2">
            <button onClick={handleResetFilters} className="site-btn site-btn-ghost site-btn-compact">선택 옵션 초기화</button>
            <button onClick={handleSaveFilters} className={`site-btn site-btn-compact ${isFilterFeedbackActive ? "border-green-500/30 bg-green-500/15 text-green-100" : "site-btn-secondary"}`}>{isFilterFeedbackActive ? "✓ 설정 저장됨" : "선택 옵션 저장"}</button>
          </div>
        </div>

        <div className="custom-scrollbar overflow-y-auto max-h-[430px] pr-2">
          {category === "RPG" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-3">
                  <div className="text-[10px] font-extrabold text-cyan-400 uppercase tracking-[0.14em] border-l-2 border-cyan-500 pl-3">강화 랭크 / +{filters.enhancementLevel}</div>
                  <div className="flex gap-1.5 p-1 bg-white/5 rounded-xl border border-white/5">
                    {["입문", "견습", "정예", "영웅"].map(rank => (<button key={rank} onClick={() => setRpgRank(rank)} className={`min-h-[32px] flex-1 py-1.5 rounded-md text-[10px] font-black transition-all ${rpgRank === rank ? "bg-cyan-600 text-white shadow-md" : "text-zinc-600 hover:text-zinc-400"}`}>{rank}</button>))}
                  </div>
                  <div className="flex items-center bg-black/40 p-4 rounded-2xl border border-white/5 mt-2"><input type="range" min="0" max="15" value={filters.enhancementLevel} onChange={e => setFilters({ ...filters, enhancementLevel: parseInt(e.target.value) })} className="calc-range calc-range-cyan flex-1" /></div>
                </div>

                <div className="space-y-3">
                  <div className="text-[10px] font-extrabold text-orange-400 uppercase tracking-[0.14em] border-l-2 border-orange-500 pl-3">룬 장착</div>
                  <div className="grid grid-cols-3 gap-2">
                    {filters.runes.map((rune, idx) => (
                      <button key={idx} onClick={() => setActiveRuneSlot(activeRuneSlot === idx ? null : idx)} className={`aspect-square rounded-xl border flex flex-col items-center justify-center p-2 transition-all relative ${activeRuneSlot === idx ? 'border-orange-500 bg-orange-500/20 shadow-[0_0_15px_rgba(249,115,22,0.2)]' : 'bg-black/40 border-white/5 text-zinc-700 hover:border-white/10'}`}>
                        {rune.type ? (
                          <div className="text-center">
                            <div className="text-[7px] font-black text-orange-600 uppercase mb-0.5">{rune.grade}</div>
                            <div className="text-[10px] font-black text-zinc-100 leading-tight">{rune.type.replace("의룬", "")}</div>
                          </div>
                        ) : (
                          <div className="w-5 h-5 border border-zinc-800 rotate-45 flex items-center justify-center opacity-30"><div className="w-1 h-1 bg-zinc-800 rounded-full" /></div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <AnimatePresence>
                {activeRuneSlot !== null && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="bg-orange-500/[0.03] border border-orange-500/20 rounded-3xl p-5 space-y-5 overflow-hidden">
                    <div className="flex justify-between items-center px-1"><div className="text-[11px] font-black text-orange-500 uppercase flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />룬 설정 #{activeRuneSlot + 1}</div><button onClick={() => setActiveRuneSlot(null)} className="text-[10px] font-black text-zinc-600 hover:text-white transition-colors">닫기</button></div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div className="space-y-4"><p className="text-[10px] font-black text-zinc-500 uppercase ml-1">룬 등급</p><div className="flex gap-1.5">{RUNE_GRADES.map(g => (<button key={g} onClick={() => updateRune(g)} className={`min-h-[32px] flex-1 py-1.5 rounded-md text-[10px] font-black transition-all ${filters.runes[activeRuneSlot!].grade === g ? 'bg-orange-500 text-black shadow-lg' : 'bg-white/5 text-zinc-600'}`}>{g}</button>))}</div></div>
                      <div className="space-y-4"><p className="text-[10px] font-black text-zinc-500 uppercase ml-1">룬 종류</p><div className="grid grid-cols-4 gap-1.5">{RUNE_TYPES.slice(0, 8).map(t => (<button key={t} onClick={() => updateRune(undefined, t)} className={`py-2 rounded-lg text-[9px] font-bold transition-all border ${filters.runes[activeRuneSlot!].type === t ? 'bg-zinc-100 text-black border-white' : 'bg-black/20 border-white/5 text-zinc-500'}`}>{t.replace("의룬", "")}</button>))}</div></div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="space-y-3">
                <div className="text-[10px] font-extrabold text-purple-400 uppercase tracking-[0.14em] border-l-2 border-purple-500 pl-3">무기 전용 전투 스킬</div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 xl:grid-cols-6 gap-1.5">
                  {skillConfig && Object.keys(skillConfig.skills).map(name => (
                    <button key={name} onClick={() => toggleOption('skills', name, 7)} className={`min-h-[34px] flex items-center justify-between px-2.5 py-1.5 rounded-lg border transition-all ${filters.skills[name] ? "bg-purple-600 border-purple-400 text-white shadow-lg shadow-purple-600/10" : "bg-white/[0.035] border-transparent text-zinc-500 hover:bg-white/10 hover:text-zinc-200"}`}>
                      <span className="font-semibold text-[10px] truncate">{name}</span>
                      {filters.skills[name] && <span className="font-black text-[9px] bg-white/20 px-1.5 py-0.5 rounded-md">Lv.{filters.skills[name]}</span>}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {category === "WILD" && (
            <div className="space-y-6">
              <div className="space-y-3">
                <div className="text-[10px] font-extrabold text-blue-400 uppercase tracking-[0.14em] border-l-2 border-blue-500 pl-3">일반 인챈트</div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 xl:grid-cols-6 gap-1.5">
                  {WILD_BASE.map(([name, max]: any) => {
                    const HIGH_LIMITS: Record<string, number> = { "효율": 10, "날카로움": 7, "보호": 6, "미끼": 5, "약탈": 5, "행운": 5 };
                    const currentMax = HIGH_LIMITS[name] || max;
                    return (
                      <button key={name} onClick={() => toggleOption('enchantments', name, currentMax)} className={`min-h-[34px] px-2.5 py-1.5 rounded-lg border text-[10px] font-semibold transition-all ${filters.enchantments[name] ? "bg-blue-600 border-blue-400 text-white shadow-lg shadow-blue-600/10" : "bg-white/[0.035] border-white/5 text-zinc-500 hover:bg-white/10 hover:text-zinc-200"}`}>
                        {name} {filters.enchantments[name] && <span className="bg-white/20 px-1.5 py-0.5 rounded ml-1 text-[9px]">Lv.{filters.enchantments[name]}</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="space-y-3">
                <div className="text-[10px] font-extrabold text-red-400 uppercase tracking-[0.14em] border-l-2 border-red-500 pl-3">특수 인챈트</div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 xl:grid-cols-6 gap-1.5">
                  {WILD_SPECIAL.map(([name, max]: any) => (
                    <button key={name} onClick={() => toggleOption('enchantments', name, max)} className={`min-h-[34px] px-2.5 py-1.5 rounded-lg border text-[10px] font-semibold transition-all ${filters.enchantments[name] ? "bg-red-600 border-red-400 text-white shadow-lg shadow-red-600/10" : "bg-white/[0.035] border-white/5 text-zinc-500 hover:bg-white/10 hover:text-zinc-200"}`}>
                      {name} {filters.enchantments[name] && <span className="bg-white/20 px-1.5 py-0.5 rounded ml-1 text-[9px]">Lv.{filters.enchantments[name]}</span>}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {category === "ISLAND" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-3">
                  <div className="text-[10px] font-extrabold text-yellow-400 uppercase tracking-[0.14em] border-l-2 border-yellow-500 pl-3">장비 강화 +{filters.enhancementLevel}</div>
                  <div className="flex items-center bg-black/40 p-4 rounded-2xl border border-white/5 mt-2">
                    <input type="range" min="0" max="15" value={filters.enhancementLevel} onChange={e => { triggerHaptic(5); setFilters({ ...filters, enhancementLevel: parseInt(e.target.value) }); }} className="calc-range calc-range-yellow flex-1" />
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                <div className="text-[10px] font-extrabold text-zinc-500 uppercase tracking-[0.14em] border-l-2 border-white/10 pl-3">각인 활성화</div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-1.5">{ISLAND_IMPRINTS.map(name => (<button key={name} onClick={() => toggleOption('imprints', name, 5)} className={`min-h-[34px] flex items-center justify-between px-2.5 py-1.5 rounded-lg border transition-all ${filters.imprints[name] ? "bg-yellow-500 border-yellow-300 text-black shadow-lg shadow-yellow-500/10" : "bg-white/[0.035] border-white/5 text-zinc-500 hover:bg-white/10 hover:text-zinc-200"}`}><span className="font-semibold text-[10px]">{name}</span>{filters.imprints[name] && <span className="font-black text-[9px] bg-black/10 px-1.5 py-0.5 rounded">Lv.{filters.imprints[name]}</span>}</button>))}</div>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}