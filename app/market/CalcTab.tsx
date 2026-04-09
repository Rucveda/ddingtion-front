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
import { useMarket } from "./MarketContext";

export default function CalcTab({ selectedItem }: { selectedItem: any }) {
  const { prices, enchantPrices, updateEnchantPrice, saveAllPrices, updatePrice } = useMarket();
  const [rpgRank, setRpgRank] = useState("입문");
  const [activeRuneSlot, setActiveRuneSlot] = useState<number | null>(null);
  
  const [isPriceFeedbackActive, setIsPriceFeedbackActive] = useState(false);
  const [isFilterFeedbackActive, setIsFilterFeedbackActive] = useState(false);

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

  /**
   * 🛠️ [패치 1] 이미지 보안 처리
   * 모든 이미지 URL을 HTTPS로 안전하게 변환합니다.
   */
  const getSecureUrl = (url: string) => url?.replace("http://", "https://") || "";

  /**
   * 🛠️ [패치 2] 골드 포맷 가독성 개선
   * 억/만 단위 구분 및 쉼표 처리를 강화했습니다.
   */
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

  const handleSaveFilters = () => {
    triggerHaptic();
    if (!selectedItem) return;
    localStorage.setItem(`preset_${selectedItem.id}`, JSON.stringify(filters));
    setIsFilterFeedbackActive(true);
    setTimeout(() => setIsFilterFeedbackActive(false), 1500);
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
    const maxLevelToCheck = filters.enhancementLevel > 0 ? filters.enhancementLevel : 1;
    for (let i = 0; i < maxLevelToCheck; i++) {
      if (steps[i]) {
        Object.keys(steps[i].mats).forEach(m => needed.add(m));
      }
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
        const rawPrice = enchantPrices[name]?.price || "0";
        const unitCost = Math.round(Number(rawPrice) * 10 * (level as number));
        if (unitCost > 0) {
          cumulative += unitCost;
          items.push({ name, subText: `인챈트 Lv.${level} (10% 기댓값)`, cost: unitCost });
        }
      });
    } 
    else if (category === "ISLAND") {
      const contractPrice = Number(prices.MAT_ISLAND_CONTRACT || 0);
      const usageMap: Record<number, number> = { 1: 5, 2: 10, 3: 15, 4: 20, 5: 25 };
      Object.entries(filters.imprints).forEach(([name, level]) => {
        const rawStonePrice = prices[`MAT_SCROLL_투박한_${name}`] || "0";
        const unitCost = Math.round((Number(rawStonePrice) + (usageMap[level as number] * contractPrice)) * 20);
        if (unitCost > 0) {
          cumulative += unitCost;
          items.push({ name, subText: `각인 Lv.${level} 제작 비용`, cost: unitCost });
        }
      });
      for (let i = 1; i <= filters.enhancementLevel; i++) {
        const step = ISLAND_ENHANCE_TABLE[i - 1];
        if (step) {
          const tryCost = step.gold + (step.mats.low * Number(prices.LOW_LIFE || 0)) + (step.mats.mid * Number(prices.MID_LIFE || 0)) + (step.mats.high * Number(prices.HIGH_LIFE || 0));
          const unitCost = Math.round(tryCost * (100 / step.rate));
          cumulative += unitCost;
          items.push({ name: `강화 +${i}`, subText: `성공률 ${step.rate}% 기댓값`, cost: unitCost });
        }
      }
    }
    else if (category === "RPG") {
      const base = Number(prices[`MAT_RPG_BASE_${selectedItem.name}`]) || 0;
      cumulative = base;
      items.push({ name: selectedItem.name, subText: "순정 본체 시세", cost: base });

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
          items.push({ name: `스킬 슬롯 해금 (${skillCount}개)`, subText: `해방의 인장 ${totalSealNeeded}개 누적 비용`, cost: totalSealCost });
        }

        skillEntries.forEach(([skillName, level]) => {
          const info = skillConfig.skills[skillName];
          if (info) {
            const unlockCost = (info.emblem * emblemPrice) + info.unlockGold;
            cumulative += unlockCost;
            items.push({ name: skillName, subText: `스킬 활성화 (개방의 문장 ${info.emblem}개)`, cost: unlockCost });
            for (let i = 0; i < level; i++) {
              const tryCost = info.enhanceGold[i] + awakenStonePrice;
              const expectedValue = Math.round(tryCost * (100 / RPG_SKILL_COMMON_RATES[i]));
              cumulative += expectedValue;
              items.push({ name: `${skillName} +${i+1}`, subText: `성공률 ${RPG_SKILL_COMMON_RATES[i]}% 기댓값`, cost: expectedValue });
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
          items.push({ name: `강화 +${i + 1}`, subText: `${rpgRank} 등급 강화비 (재료 포함)`, cost: unitCost });
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

  if (!selectedItem) return null;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <section className="lg:col-span-7 bg-white/[0.02] border border-white/5 p-6 rounded-[40px] shadow-2xl flex flex-col h-[380px] backdrop-blur-md relative overflow-hidden">
          <div className="flex items-center gap-3 mb-6 px-2"><div className="w-1.5 h-3.5 bg-blue-600 rounded-full" /><h3 className="text-xs font-black text-zinc-400 uppercase tracking-widest">비용 성장 시뮬레이션</h3></div>
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

        <section className="lg:col-span-5 bg-white/[0.02] border border-white/5 p-8 rounded-[40px] shadow-2xl flex flex-col h-[380px] backdrop-blur-md">
          <div className="flex justify-between items-end mb-6 border-b border-white/5 pb-4"><div className="flex flex-col gap-1"><span className="text-[10px] font-black text-blue-500 uppercase tracking-widest">Simulation Ledger</span><h4 className="text-lg font-black text-zinc-200">직작 예상 비용</h4></div><div className="text-right"><div className="text-2xl font-black text-blue-500 font-mono tracking-tighter tabular-nums">{formatGold(receiptData.total)} G</div></div></div>
          <div className="flex-1 overflow-y-auto pr-2 space-y-2 custom-scrollbar">
            {receiptData.items.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between bg-black/20 p-3 rounded-xl border border-white/5 transition-all">
                <div className="min-w-0 flex-1 mr-4"><div className="text-[11px] font-bold text-zinc-300 truncate">{item.name}</div><div className="text-[9px] text-zinc-600 font-black uppercase tracking-tighter truncate">{item.subText}</div></div>
                <div className="text-xs font-black text-zinc-500 font-mono shrink-0">+{formatGold(item.cost)}</div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="bg-blue-600/[0.03] border border-blue-500/20 p-8 rounded-[40px] shadow-xl backdrop-blur-md">
        <div className="flex items-center justify-between mb-8 px-2">
          <div className="flex items-center gap-3"><div className="w-1.5 h-4 bg-blue-500 rounded-full" /><h3 className="text-sm font-black text-zinc-300 uppercase tracking-widest">실시간 시세 동기화</h3></div>
          <button onClick={handleSavePrices} className={`px-5 py-2 rounded-xl text-[11px] font-black transition-all active:scale-95 ${isPriceFeedbackActive ? "bg-green-600 text-white shadow-lg" : "bg-blue-600 text-white shadow-lg"}`}>
            {isPriceFeedbackActive ? "✓ 시세 저장됨" : "현재 시세 저장"}
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {category === "RPG" && (
            <>
              {/** 🛠️ [패치 3] 입력 필드 안정성 처리 (숫자만 입력 허용) */}
              <div className="bg-black/40 p-4 rounded-2xl border border-white/5 flex flex-col gap-2"><span className="text-[9px] font-black text-zinc-600 uppercase">해방의 인장 (슬롯용)</span><input className="bg-transparent text-sm font-black font-mono text-cyan-400 outline-none w-full" value={prices["MAT_RPG_해방의 인장"] || ""} onChange={e => updatePrice("MAT_RPG_해방의 인장", e.target.value.replace(/[^0-9]/g, ''))} placeholder="0" /></div>
              <div className="bg-black/40 p-4 rounded-2xl border border-white/5 flex flex-col gap-2"><span className="text-[9px] font-black text-zinc-600 uppercase">개방의 문장 (스킬용)</span><input className="bg-transparent text-sm font-black font-mono text-purple-400 outline-none w-full" value={prices["MAT_RPG_개방의 문장"] || ""} onChange={e => updatePrice("MAT_RPG_개방의 문장", e.target.value.replace(/[^0-9]/g, ''))} placeholder="0" /></div>
              {skillConfig && (<div className="bg-black/40 p-4 rounded-2xl border border-white/5 flex flex-col gap-2"><span className="text-[9px] font-black text-zinc-600 uppercase">{skillConfig.material}</span><input className="bg-transparent text-sm font-black font-mono text-orange-400 outline-none w-full" value={prices[`MAT_RPG_${skillConfig.material}`] || ""} onChange={e => updatePrice(`MAT_RPG_${skillConfig.material}`, e.target.value.replace(/[^0-9]/g, ''))} placeholder="0" /></div>)}
              <div className="bg-black/40 p-4 rounded-2xl border border-white/5 flex flex-col gap-2"><span className="text-[9px] font-black text-zinc-600 uppercase">순정 본체</span><input className="bg-transparent text-sm font-black font-mono text-cyan-400 outline-none w-full" value={prices[`MAT_RPG_BASE_${selectedItem.name}`] || ""} onChange={e => updatePrice(`MAT_RPG_BASE_${selectedItem.name}`, e.target.value.replace(/[^0-9]/g, ''))} placeholder="0" /></div>
              {activeNeededMaterials.map(m => (
                <div key={m} className="bg-black/60 p-4 rounded-2xl border border-blue-500/20 flex flex-col gap-2 animate-in fade-in slide-in-from-top-1">
                  <span className="text-[9px] font-black text-blue-400 uppercase">{m}</span>
                  <input className="bg-transparent text-sm font-black font-mono text-zinc-100 outline-none w-full" value={prices[`MAT_RPG_${m}`] || ""} onChange={e => updatePrice(`MAT_RPG_${m}`, e.target.value.replace(/[^0-9]/g, ''))} placeholder="0" />
                </div>
              ))}
            </>
          )}
          {category === "WILD" && Object.keys(filters.enchantments).map(name => (
            <div key={name} className="bg-black/40 p-4 rounded-2xl border border-white/5 flex flex-col gap-2 group focus-within:border-blue-500/50 transition-all">
              <span className="text-[9px] font-black text-zinc-600 uppercase group-focus-within:text-blue-500 transition-colors">{name} (10%)</span>
              <div className="flex items-center gap-2">
                <input className="bg-transparent text-sm font-black font-mono text-zinc-100 outline-none w-full" value={enchantPrices[name]?.price || ""} onChange={e => updateEnchantPrice(name, e.target.value.replace(/[^0-9]/g, ''), "10")} placeholder="0" />
                <span className="text-[10px] font-black text-zinc-800">G</span>
              </div>
            </div>
          ))}
          {category === "ISLAND" && (
            <>
              <div className="bg-black/40 p-4 rounded-2xl border border-white/5 flex flex-col gap-2"><span className="text-[9px] font-black text-zinc-600 uppercase">각인 계약서</span><input className="bg-transparent text-sm font-black font-mono text-yellow-500 outline-none w-full" value={prices.MAT_ISLAND_CONTRACT || ""} onChange={e => updatePrice("MAT_ISLAND_CONTRACT", e.target.value.replace(/[^0-9]/g, ''))} placeholder="0" /></div>
              {["LOW_LIFE", "MID_LIFE", "HIGH_LIFE"].map(k => (
                <div key={k} className="bg-black/40 p-4 rounded-2xl border border-white/5 flex flex-col gap-2">
                  <span className="text-[9px] font-black text-zinc-600 uppercase">{k.replace('_LIFE', '')} 강화석</span>
                  <input className="bg-transparent text-sm font-black font-mono text-zinc-100 outline-none w-full" value={prices[k] || ""} onChange={e => updatePrice(k, e.target.value.replace(/[^0-9]/g, ''))} placeholder="0" />
                </div>
              ))}
            </>
          )}
        </div>
      </section>

      <section className="bg-white/[0.02] border border-white/5 p-8 md:p-10 rounded-[48px] shadow-2xl backdrop-blur-md">
        <div className="flex items-center justify-between mb-10 border-b border-white/5 pb-8 px-2">
          <div className="flex items-center gap-6"><div className="w-14 h-14 bg-black/40 rounded-2xl flex items-center justify-center border border-white/5 shrink-0 shadow-inner"><img src={getSecureUrl(selectedItem.iconUrl)} className="w-8 h-8 pixel-art" alt="" /></div><div><h3 className="text-xl font-black uppercase tracking-tighter">{selectedItem.name}</h3><p className="text-blue-500 font-black text-[10px] uppercase tracking-widest mt-1">아이템 커스텀 설정</p></div></div>
          <button onClick={handleSaveFilters} className={`px-5 py-2 rounded-xl text-[11px] font-black transition-all active:scale-95 ${isFilterFeedbackActive ? "bg-green-600 text-white shadow-lg" : "bg-zinc-100 text-black hover:bg-white shadow-lg"}`}>{isFilterFeedbackActive ? "✓ 설정 저장됨" : "선택 옵션 저장"}</button>
        </div>

        <div className="custom-scrollbar overflow-y-auto max-h-[500px] pr-4">
          {category === "RPG" && (
            <div className="space-y-12">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="space-y-4">
                  <div className="text-[11px] font-black text-cyan-500 uppercase tracking-widest border-l-4 border-cyan-500 pl-4">강화 랭크 및 단계 (+{filters.enhancementLevel})</div>
                  <div className="flex gap-1.5 p-1 bg-white/5 rounded-xl border border-white/5">
                    {["입문", "견습", "정예", "영웅"].map(rank => (<button key={rank} onClick={() => setRpgRank(rank)} className={`flex-1 py-2.5 rounded-lg text-[10px] font-black transition-all ${rpgRank === rank ? "bg-cyan-600 text-white shadow-md" : "text-zinc-600 hover:text-zinc-400"}`}>{rank}</button>))}
                  </div>
                  <div className="flex items-center bg-black/40 p-5 rounded-2xl border border-white/5 mt-2"><input type="range" min="0" max="15" value={filters.enhancementLevel} onChange={e => setFilters({...filters, enhancementLevel: parseInt(e.target.value)})} className="flex-1 h-1 bg-zinc-800 rounded-lg appearance-none accent-cyan-500 cursor-pointer" /></div>
                </div>

                <div className="space-y-4">
                  <div className="text-[11px] font-black text-orange-500 uppercase tracking-widest border-l-4 border-orange-500 pl-4">룬 장착</div>
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
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="bg-orange-500/[0.03] border border-orange-500/20 rounded-3xl p-8 space-y-8 overflow-hidden">
                    <div className="flex justify-between items-center px-1"><div className="text-[11px] font-black text-orange-500 uppercase flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />룬 설정 #{activeRuneSlot + 1}</div><button onClick={() => setActiveRuneSlot(null)} className="text-[10px] font-black text-zinc-600 hover:text-white transition-colors">닫기</button></div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                      <div className="space-y-4"><p className="text-[10px] font-black text-zinc-500 uppercase ml-1">룬 등급</p><div className="flex gap-1.5">{RUNE_GRADES.map(g => (<button key={g} onClick={() => updateRune(g)} className={`flex-1 py-2.5 rounded-lg text-[10px] font-black transition-all ${filters.runes[activeRuneSlot!].grade === g ? 'bg-orange-500 text-black shadow-lg' : 'bg-white/5 text-zinc-600'}`}>{g}</button>))}</div></div>
                      <div className="space-y-4"><p className="text-[10px] font-black text-zinc-500 uppercase ml-1">룬 종류</p><div className="grid grid-cols-4 gap-1.5">{RUNE_TYPES.slice(0, 8).map(t => (<button key={t} onClick={() => updateRune(undefined, t)} className={`py-2 rounded-lg text-[9px] font-bold transition-all border ${filters.runes[activeRuneSlot!].type === t ? 'bg-zinc-100 text-black border-white' : 'bg-black/20 border-white/5 text-zinc-500'}`}>{t.replace("의룬", "")}</button>))}</div></div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="space-y-6">
                <div className="text-[11px] font-black text-purple-500 uppercase tracking-widest border-l-4 border-purple-500 pl-4">무기 전용 전투 스킬 (최대 4개)</div>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
                  {skillConfig && Object.keys(skillConfig.skills).map(name => (
                    <button key={name} onClick={() => toggleOption('skills', name, 7)} className={`flex items-center justify-between p-4 rounded-xl border transition-all ${filters.skills[name] ? "bg-purple-600 border-purple-400 text-white shadow-lg" : "bg-white/5 border-transparent text-zinc-600 hover:bg-white/10"}`}>
                      <span className="font-bold text-xs truncate">{name}</span>
                      {filters.skills[name] && <span className="font-black text-[9px] bg-white/20 px-1.5 py-0.5 rounded-md">Lv.{filters.skills[name]}</span>}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {category === "WILD" && (
            <div className="space-y-12">
              <div className="space-y-6"><div className="text-[11px] font-black text-blue-500 uppercase tracking-widest border-l-4 border-blue-500 pl-4">일반 인챈트</div><div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">{WILD_BASE.map(([name, max]: any) => (<button key={name} onClick={() => toggleOption('enchantments', name, max)} className={`p-4 rounded-xl border text-xs font-bold transition-all ${filters.enchantments[name] ? "bg-blue-600 border-blue-400 text-white shadow-lg" : "bg-white/5 border-white/5 text-zinc-600 hover:bg-white/10"}`}>{name} {filters.enchantments[name] && <span className="bg-white/20 px-1.5 py-0.5 rounded ml-1 text-[9px]">Lv.{filters.enchantments[name]}</span>}</button>))}</div></div>
            </div>
          )}

          {category === "ISLAND" && (
            <div className="space-y-12">
              <div className="max-w-xs space-y-4">
                <div className="flex justify-between items-center px-1"><div className="text-[11px] font-black text-yellow-500 uppercase tracking-widest">장비 강화 단계</div><div className="text-xl font-black text-white italic">+{filters.enhancementLevel}</div></div>
                <div className="bg-black/40 p-6 rounded-2xl border border-white/5 relative group">
                  <div className="absolute inset-x-6 top-1/2 -translate-y-1/2 h-1 bg-zinc-800 rounded-full overflow-hidden"><div className="h-full bg-yellow-500 transition-all duration-300" style={{ width: `${(filters.enhancementLevel / 15) * 100}%` }} /></div>
                  <input type="range" min="0" max="15" step="1" value={filters.enhancementLevel} onChange={(e) => { const val = parseInt(e.target.value); if (val !== filters.enhancementLevel) { triggerHaptic(5); setFilters(prev => ({ ...prev, enhancementLevel: val })); } }} className="relative z-10 w-full h-1 bg-transparent appearance-none cursor-pointer accent-yellow-500" style={{ WebkitAppearance: 'none', outline: 'none' }} />
                  <div className="flex justify-between mt-4 px-1">{[0, 5, 10, 15].map(tick => (<span key={tick} className="text-[9px] font-black text-zinc-700">{tick}</span>))}</div>
                </div>
              </div>
              <div className="space-y-6">
                <div className="text-[11px] font-black text-zinc-500 uppercase tracking-widest ml-1">각인 활성화</div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">{ISLAND_IMPRINTS.map(name => (<button key={name} onClick={() => toggleOption('imprints', name, 5)} className={`flex items-center justify-between p-4 rounded-xl border transition-all ${filters.imprints[name] ? "bg-yellow-600 border-yellow-400 text-black shadow-lg" : "bg-white/5 border-white/5 text-zinc-600 hover:bg-white/10"}`}><span className="font-bold text-xs">{name}</span>{filters.imprints[name] && <span className="font-black text-[9px] bg-black/10 px-1.5 py-0.5 rounded">Lv.{filters.imprints[name]}</span>}</button>))}</div>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}