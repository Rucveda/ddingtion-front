"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { request } from "@/lib/client/api";
import { motion, AnimatePresence } from "framer-motion";
import { 
  RPG_WEAPON_INFO,
  RUNE_GRADES, 
  RUNE_TYPES,
  RPG_SKILL_SYSTEM
} from "@/lib/domain/marketData";
import {
  getIslandImprintOptions,
  getWildEnchantActiveBadgeClass,
  getWildEnchantOptions,
  resolveArchetype,
  sanitizeSelections,
} from "@/lib/domain/enhancementAllowlist";
import { useMarket } from "./MarketContext";

export default function SearchTab({ selectedItem }: { selectedItem: any }) {
  // 🛠️ [패치] Context에서 유저의 커스텀 계산 결과(calcResult)를 직접 가져옵니다.
  const { calcResult, setCalcResult } = useMarket();
  
  const [analysis, setAnalysis] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isFilterFeedbackActive, setIsFilterFeedbackActive] = useState(false);
  const [activeRuneSlot, setActiveRuneSlot] = useState<number | null>(null);

  const [filters, setFilters] = useState({ 
    enhancementLevel: 0, 
    enhancementRank: "입문", 
    enchantments: {} as Record<string, number>, 
    imprints: {} as Record<string, number>, 
    skills: {} as Record<string, number>,
    runes: [{ grade: "루키", type: "" }, { grade: "루키", type: "" }, { grade: "루키", type: "" }]
  });

  const triggerHaptic = useCallback((intensity = 10) => {
    if (typeof window !== "undefined" && window.navigator?.vibrate) window.navigator.vibrate(intensity);
  }, []);

  const getSecureUrl = (url: string) => url?.replace("http://", "https://") || "";

  const formatGold = (num: number) => {
    const safeNum = Math.abs(Math.round(num || 0));
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
  
  // 🛠️ [패치] 기존의 복잡한 theoreticalValue useMemo 로직을 삭제하고 공유값으로 대체
  const theoreticalValue = calcResult;

  const category = selectedItem?.category.toUpperCase().includes("WILD") ? "WILD" : selectedItem?.category.toUpperCase().includes("ISLAND") ? "ISLAND" : selectedItem?.category.toUpperCase().includes("RPG") ? "RPG" : "OTHER";

  const weaponType = useMemo(() => {
    if (category !== "RPG") return null;
    return ["스태프", "망치", "총", "활", "창", "대검"].find(t => selectedItem.name.includes(t)) || null;
  }, [selectedItem, category]);

  const skillConfig = weaponType ? RPG_SKILL_SYSTEM[weaponType] : null;

  const equipmentArchetype = useMemo(() => resolveArchetype(selectedItem), [selectedItem]);
  const wildEnchantOptions = useMemo(
    () => (category === "WILD" ? getWildEnchantOptions(equipmentArchetype) : { base: [], special: [] }),
    [category, equipmentArchetype]
  );
  const islandImprintOptions = useMemo(
    () => (category === "ISLAND" ? getIslandImprintOptions(equipmentArchetype) : []),
    [category, equipmentArchetype]
  );

  useEffect(() => {
    if (!selectedItem) return;
    setFilters((prev) => {
      const sanitized = sanitizeSelections(selectedItem, {
        enchantments: prev.enchantments,
        imprints: prev.imprints,
      });
      return { ...prev, enchantments: sanitized.enchantments, imprints: sanitized.imprints };
    });
  }, [selectedItem?.id, equipmentArchetype]);

  useEffect(() => {
    if (!selectedItem?.id) return;
    setCalcResult(0);
  }, [selectedItem?.id, setCalcResult]);

  useEffect(() => {
    if (selectedItem) {
      // RPG인 경우 해당 무기의 기본 랭크 설정
      const weaponGroup = Object.keys(RPG_WEAPON_INFO).find(key => selectedItem.name.includes(key));
      const initialRank = weaponGroup ? (RPG_WEAPON_INFO as any)[weaponGroup].rank : "입문";

      const savedPreset = localStorage.getItem(`preset_${selectedItem.id}`);
      if (savedPreset) {
        try {
          const parsed = JSON.parse(savedPreset);
          const savedFilters = parsed.filters || parsed;
          setFilters({
            enhancementLevel: Number(savedFilters.enhancementLevel || 0),
            enhancementRank: savedFilters.enhancementRank || parsed.rpgRank || initialRank,
            enchantments: savedFilters.enchantments || {},
            imprints: savedFilters.imprints || {},
            skills: savedFilters.skills || {},
            runes: Array.isArray(savedFilters.runes) ? savedFilters.runes : [{ grade: "루키", type: "" }, { grade: "루키", type: "" }, { grade: "루키", type: "" }]
          });
        } catch {
          setFilters({
            enhancementLevel: 0,
            enhancementRank: initialRank,
            enchantments: {},
            imprints: {},
            skills: {},
            runes: [{ grade: "루키", type: "" }, { grade: "루키", type: "" }, { grade: "루키", type: "" }]
          });
        }
      } else {
        setFilters({ 
        enhancementLevel: 0, 
        enhancementRank: initialRank, 
        enchantments: {}, 
        imprints: {}, 
        skills: {}, 
          runes: [{ grade: "루키", type: "" }, { grade: "루키", type: "" }, { grade: "루키", type: "" }] 
        });
      }
      setActiveRuneSlot(null);
      setAnalysis(null);
    }
  }, [selectedItem]);

  const fetchAnalysis = useCallback(async () => {
    if (!selectedItem) return;
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        level: filters.enhancementLevel.toString(), rank: filters.enhancementRank,
        enchantments: JSON.stringify(filters.enchantments), imprints: JSON.stringify(filters.imprints),
        skills: JSON.stringify(filters.skills), runes: JSON.stringify(filters.runes),
        cacheTtl: "4",
      });
      const data = await request(`/api/auctions/market-analysis/${selectedItem.id}?${params.toString()}`);
      if (data) setAnalysis(data);
    } catch (err) { console.error(err); } finally { setIsLoading(false); }
  }, [selectedItem, filters]);

  useEffect(() => { fetchAnalysis(); }, [fetchAnalysis]);

  const toggleOption = (type: 'enchantments' | 'imprints' | 'skills', name: string, maxTier: number, delta = 1) => {
    triggerHaptic();
    setFilters(prev => {
      const current = { ...prev[type] };
      const currentLevel = current[name] || 0;
      if (delta < 0) {
        if (currentLevel <= 1) delete current[name];
        else current[name] = currentLevel - 1;
      } else if (!currentLevel) current[name] = 1;
      else if (currentLevel < maxTier) current[name] = currentLevel + 1;
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

  const handleResetFilters = () => {
    triggerHaptic();
    if (!selectedItem) return;
    const weaponGroup = Object.keys(RPG_WEAPON_INFO).find(key => selectedItem.name.includes(key));
    const initialRank = weaponGroup ? (RPG_WEAPON_INFO as any)[weaponGroup].rank : "입문";
    setFilters({
      enhancementLevel: 0,
      enhancementRank: initialRank,
      enchantments: {},
      imprints: {},
      skills: {},
      runes: [{ grade: "루키", type: "" }, { grade: "루키", type: "" }, { grade: "루키", type: "" }]
    });
    setActiveRuneSlot(null);
    localStorage.removeItem(`preset_${selectedItem.id}`);
    setIsFilterFeedbackActive(true);
    setTimeout(() => setIsFilterFeedbackActive(false), 1500);
  };

  const handleSaveFilters = () => {
    triggerHaptic();
    if (!selectedItem) return;
    localStorage.setItem(`preset_${selectedItem.id}`, JSON.stringify({
      filters,
      rpgRank: filters.enhancementRank,
    }));
    setIsFilterFeedbackActive(true);
    setTimeout(() => setIsFilterFeedbackActive(false), 1500);
  };

  return (
    <motion.div initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} className="space-y-3">
      <section className="rounded-2xl border border-white/5 bg-white/[0.018] p-4">
        <div className="mb-3 flex items-center justify-between border-b border-white/5 pb-3">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-zinc-500">시세 분석</p>
            <h3 className="mt-1 text-sm font-extrabold text-zinc-200">선택 조건 기준 가격 정보</h3>
          </div>
          {isLoading && <span className="text-[10px] font-bold text-blue-300">분석 중...</span>}
        </div>
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
          <div className="rounded-xl border border-blue-500/15 bg-blue-500/10 px-3 py-2.5">
            <p className="text-[9px] font-extrabold uppercase tracking-[0.1em] text-blue-300/70">적정가</p>
            <p className="mt-1 font-mono text-lg font-black tracking-[-0.04em] text-blue-100">{formatGold(Number(analysis?.fairPrice || 0))} G</p>
          </div>
          <div className="rounded-xl border border-white/5 bg-black/25 px-3 py-2.5">
            <p className="text-[9px] font-extrabold uppercase tracking-[0.1em] text-zinc-600">평균가</p>
            <p className="mt-1 font-mono text-lg font-black tracking-[-0.04em] text-zinc-200">{formatGold(Number(analysis?.avgPrice || 0))} G</p>
          </div>
          <div className="rounded-xl border border-white/5 bg-black/25 px-3 py-2.5">
            <p className="text-[9px] font-extrabold uppercase tracking-[0.1em] text-zinc-600">내 계산값</p>
            <p className="mt-1 font-mono text-lg font-black tracking-[-0.04em] text-zinc-200">{formatGold(theoreticalValue)} G</p>
          </div>
          <div className="rounded-xl border border-white/5 bg-black/25 px-3 py-2.5">
            <p className="text-[9px] font-extrabold uppercase tracking-[0.1em] text-zinc-600">거래 데이터</p>
            <p className="mt-1 font-mono text-lg font-black tracking-[-0.04em] text-zinc-200">{analysis?.history?.length || 0}건</p>
          </div>
        </div>
        {(() => {
          const avgPrice = Number(analysis?.avgPrice) || 0;
          const pct = avgPrice > 0 ? Math.round((theoreticalValue / avgPrice) * 100) : 0;
          const isInsufficient = avgPrice === 0 || pct > 999;
          return (
            <div className={`mt-2 rounded-xl border px-3 py-2 text-[11px] font-semibold ${
              isInsufficient
                ? "border-white/5 bg-black/20 text-zinc-500"
                : theoreticalValue > avgPrice
                  ? "border-red-500/15 bg-red-500/5 text-red-300"
                  : "border-green-500/15 bg-green-500/5 text-green-300"
            }`}>
              {isInsufficient ? "비교 가능한 평균가 데이터가 부족합니다." : `내 계산값은 평균가 대비 ${pct}% 수준입니다.`}
            </div>
          );
        })()}
        <div className="mt-2 rounded-xl border border-white/5 bg-black/20 px-3 py-2 text-[11px] font-medium leading-relaxed text-zinc-500 break-keep">
          분석 엔진은 최근 유효 거래를 기준으로 평균가와 적정가를 계산합니다. 비슷한 거래가 있으면 선택한 옵션과 거래 옵션의 제작 비용 차이를 보정하고, 거래 데이터가 부족하면 재료 시세와 강화/옵션 기댓값으로 가격을 추정합니다.
        </div>
      </section>

      {/* 분석 필터 설정 */}
      <section className="rounded-2xl border border-white/5 bg-white/[0.018] p-4">
        <div className="mb-3 flex flex-col gap-3 border-b border-white/5 pb-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/5 bg-black/35">
              <img src={getSecureUrl(selectedItem.iconUrl)} className="h-7 w-7 pixel-art" alt="" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold uppercase tracking-[-0.02em] text-zinc-100">{selectedItem.name}</h3>
              <p className="mt-0.5 text-[10px] font-extrabold uppercase tracking-[0.1em] text-zinc-500">분석 필터</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 self-start md:self-auto">
            <button onClick={handleResetFilters} className="site-btn site-btn-ghost site-btn-compact">
              선택 옵션 초기화
            </button>
            <button onClick={handleSaveFilters} className={`site-btn site-btn-compact ${isFilterFeedbackActive ? "border-green-500/30 bg-green-500/15 text-green-100" : "site-btn-secondary"}`}>
              {isFilterFeedbackActive ? "✓ 옵션 저장됨" : "옵션 저장"}
            </button>
          </div>
        </div>

        <div className="custom-scrollbar max-h-[420px] overflow-y-auto pr-1">
          {category === "WILD" && (
            <div className="space-y-4">
              {wildEnchantOptions.base.length > 0 && (
                <div className="space-y-2">
                  <div className="border-l-2 border-blue-500 pl-3 text-[10px] font-extrabold uppercase tracking-[0.12em] text-blue-400">인챈트 구성</div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 xl:grid-cols-6 gap-1.5">
                    {wildEnchantOptions.base.map(([name, max]) => (
                      <button key={name} onClick={() => toggleOption("enchantments", name, max)} onContextMenu={(e) => { e.preventDefault(); toggleOption("enchantments", name, max, -1); }} className={`min-h-[34px] px-2.5 py-1.5 rounded-lg border transition-all flex justify-between items-center ${filters.enchantments[name] ? getWildEnchantActiveBadgeClass(name, filters.enchantments[name]) : "bg-white/[0.035] border-white/5 text-zinc-500 hover:bg-white/10 hover:text-zinc-200"}`}>
                        <span className="font-semibold text-[10px]">{name}</span>
                        {filters.enchantments[name] && <span className="bg-white/20 px-2 py-0.5 rounded-md text-[10px] font-black">{filters.enchantments[name]}</span>}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {wildEnchantOptions.special.length > 0 && (
                <div className="space-y-2">
                  <div className="border-l-2 border-red-500 pl-3 text-[10px] font-extrabold uppercase tracking-[0.12em] text-red-400">특수 인챈트</div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 xl:grid-cols-6 gap-1.5">
                    {wildEnchantOptions.special.map(([name, max]) => (
                      <button key={name} onClick={() => toggleOption("enchantments", name, max)} onContextMenu={(e) => { e.preventDefault(); toggleOption("enchantments", name, max, -1); }} className={`min-h-[34px] px-2.5 py-1.5 rounded-lg border transition-all flex justify-between items-center ${filters.enchantments[name] ? "bg-red-600 border-red-400 text-white shadow-lg shadow-red-600/10" : "bg-white/[0.035] border-white/5 text-zinc-500 hover:bg-white/10 hover:text-zinc-200"}`}>
                        <span className="font-semibold text-[10px]">{name}</span>
                        {filters.enchantments[name] && <span className="bg-white/20 px-2 py-0.5 rounded-md text-[10px] font-black">{filters.enchantments[name]}</span>}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          
          {category === "ISLAND" && (
            <div className="space-y-4">
                <div className="max-w-xs space-y-2">
                  <div className="border-l-2 border-yellow-500 pl-3 text-[10px] font-extrabold uppercase tracking-[0.12em] text-yellow-400">장비 강화 +{filters.enhancementLevel}</div>
                  <div className="flex items-center rounded-xl border border-white/5 bg-black/30 p-3">
                    <input 
                      type="range" min="0" max="15" value={filters.enhancementLevel} 
                      onChange={e => { triggerHaptic(5); setFilters({...filters, enhancementLevel: parseInt(e.target.value)}); }} 
                      className="calc-range calc-range-yellow flex-1" 
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="border-l-2 border-white/10 pl-3 text-[10px] font-extrabold uppercase tracking-[0.12em] text-zinc-500">각인 활성화</div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-1.5">
                    {islandImprintOptions.map(name => (
                      <button key={name} onClick={() => toggleOption('imprints', name, 5)} onContextMenu={(e) => { e.preventDefault(); toggleOption('imprints', name, 5, -1); }} className={`min-h-[34px] flex items-center justify-between px-2.5 py-1.5 rounded-lg border transition-all ${filters.imprints[name] ? "bg-yellow-500 border-yellow-300 text-black shadow-lg shadow-yellow-500/10" : "bg-white/[0.035] border-white/5 text-zinc-500 hover:bg-white/10 hover:text-zinc-200"}`}>
                        <span className="font-semibold text-[10px]">{name}</span>
                        {filters.imprints[name] && <span className="font-black text-[9px] bg-black/10 px-1.5 py-0.5 rounded">Lv.{filters.imprints[name]}</span>}
                      </button>
                    ))}
                  </div>
                </div>
            </div>
          )}
          
          {category === "RPG" && (
            <div className="space-y-4">
               <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                     <div className="border-l-2 border-blue-500 pl-3 text-[10px] font-extrabold uppercase tracking-[0.12em] text-blue-300">강화 랭크 / +{filters.enhancementLevel}</div>
                     <div className="flex gap-1 rounded-xl border border-white/5 bg-black/25 p-1">
                       {["입문", "견습", "정예", "영웅"].map(rank => (
                         <button key={rank} onClick={() => { triggerHaptic(); setFilters({...filters, enhancementRank: rank}); }} className={`min-h-[30px] flex-1 rounded-md py-1 text-[10px] font-bold transition-all ${filters.enhancementRank === rank ? "bg-blue-600 text-white" : "text-zinc-600 hover:text-zinc-300"}`}>{rank}</button>
                       ))}
                     </div>
                     <div className="mt-2 flex items-center rounded-xl border border-white/5 bg-black/30 p-3">
                        <input 
                          type="range" min="0" max="15" value={filters.enhancementLevel} 
                          onChange={e => { triggerHaptic(5); setFilters({...filters, enhancementLevel: parseInt(e.target.value)}); }} 
                          className="calc-range flex-1" 
                        />
                     </div>
                  </div>
                  <div className="space-y-2">
                     <div className="border-l-2 border-indigo-500 pl-3 text-[10px] font-extrabold uppercase tracking-[0.12em] text-indigo-300">룬 장착 검색</div>
                     <div className="grid grid-cols-3 gap-2">
                        {filters.runes.map((rune, idx) => (
                          <button key={idx} onClick={() => setActiveRuneSlot(activeRuneSlot === idx ? null : idx)} className={`flex aspect-square flex-col items-center justify-center rounded-xl border p-2 transition-all ${activeRuneSlot === idx ? 'border-indigo-400 bg-indigo-500/10' : 'border-white/5 bg-black/30 text-zinc-700 hover:border-white/10'}`}>
                            {rune.type ? (
                              <div className="text-center">
                                <div className="text-[7px] font-black text-indigo-300 uppercase mb-0.5">{rune.grade}</div>
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
                   <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="space-y-3 overflow-hidden rounded-2xl border border-indigo-500/15 bg-black/25 p-4">
                      <div className="flex justify-between items-center px-1">
                        <div className="text-[10px] font-extrabold uppercase tracking-[0.1em] text-indigo-300">룬 설정 #{activeRuneSlot + 1}</div>
                        <button onClick={() => setActiveRuneSlot(null)} className="text-[10px] font-bold text-zinc-600 hover:text-white">닫기</button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                         <div className="space-y-4">
                            <p className="text-[10px] font-black text-zinc-500 uppercase ml-1">룬 등급</p>
                            <div className="flex gap-1.5">{RUNE_GRADES.map(g => (<button key={g} onClick={() => updateRune(g)} className={`min-h-[32px] flex-1 py-1.5 rounded-md text-[10px] font-black transition-all ${filters.runes[activeRuneSlot!].grade === g ? 'bg-indigo-500 text-white' : 'bg-white/5 text-zinc-600'}`}>{g}</button>))}</div>
                         </div>
                         <div className="space-y-4">
                            <p className="text-[10px] font-black text-zinc-500 uppercase ml-1">룬 종류</p>
                            <div className="grid grid-cols-4 gap-1.5">{RUNE_TYPES.slice(0, 8).map(t => (<button key={t} onClick={() => updateRune(undefined, t)} className={`py-2 rounded-lg text-[9px] font-bold transition-all border ${filters.runes[activeRuneSlot!].type === t ? 'bg-zinc-100 text-black border-white' : 'bg-black/20 border-white/5 text-zinc-500'}`}>{t.replace("의룬", "")}</button>))}</div>
                         </div>
                      </div>
                   </motion.div>
                 )}
               </AnimatePresence>

               <div className="space-y-3">
                  <div className="border-l-2 border-purple-500 pl-3 text-[10px] font-extrabold uppercase tracking-[0.12em] text-purple-400">전투 스킬 필터</div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 xl:grid-cols-6 gap-1.5">
                    {skillConfig && Object.keys(skillConfig.skills).map(name => (
                      <button key={name} onClick={() => toggleOption('skills', name, 7)} onContextMenu={(e) => { e.preventDefault(); toggleOption('skills', name, 7, -1); }} className={`min-h-[34px] flex items-center justify-between px-2.5 py-1.5 rounded-lg border transition-all ${filters.skills[name] ? "border-purple-400 bg-purple-600 text-white" : "border-white/5 bg-white/[0.035] text-zinc-500 hover:bg-white/10 hover:text-zinc-200"}`}>
                        <span className="font-semibold text-[10px] truncate">{name}</span>
                        {filters.skills[name] && <span className="font-black text-[9px] bg-white/20 px-1.5 py-0.5 rounded-md">Lv.{filters.skills[name]}</span>}
                      </button>
                    ))}
                  </div>
               </div>
            </div>
          )}
        </div>
      </section>
    </motion.div>
  );
}