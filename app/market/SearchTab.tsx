"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { request } from "@/utils/api";
import { motion, AnimatePresence } from "framer-motion";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { 
  WILD_BASE, 
  WILD_SPECIAL, 
  ISLAND_IMPRINTS, 
  RPG_WEAPON_INFO,
  RUNE_GRADES, 
  RUNE_TYPES,
  RPG_SKILL_SYSTEM
} from "./marketData";
import { useMarket } from "./MarketContext";

export default function SearchTab({ selectedItem }: { selectedItem: any }) {
  // 🛠️ [패치] Context에서 유저의 커스텀 계산 결과(calcResult)를 직접 가져옵니다.
  const { calcResult } = useMarket();
  
  const [analysis, setAnalysis] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeRuneSlot, setActiveRuneSlot] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [chartSize, setChartSize] = useState({ width: 0, height: 300 });

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

  useEffect(() => {
    const handleResize = () => { if (containerRef.current) setChartSize({ width: containerRef.current.offsetWidth, height: 300 }); };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (selectedItem) {
      // RPG인 경우 해당 무기의 기본 랭크 설정
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
      });
      const data = await request(`/api/auctions/market-analysis/${selectedItem.id}?${params.toString()}`);
      if (data) setAnalysis(data);
    } catch (err) { console.error(err); } finally { setIsLoading(false); }
  }, [selectedItem, filters]);

  useEffect(() => { fetchAnalysis(); }, [fetchAnalysis]);

  const toggleOption = (type: 'enchantments' | 'imprints' | 'skills', name: string, maxTier: number) => {
    triggerHaptic();
    setFilters(prev => {
      const current = { ...prev[type] };
      if (!current[name]) current[name] = 1;
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

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">
      {/* AI 분석 요약 패널 */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
          <div className="xl:col-span-4 grid grid-cols-1 sm:grid-cols-3 xl:grid-cols-1 gap-3">
            <div className="bg-blue-600 p-5 rounded-[26px] shadow-2xl relative overflow-hidden">
              <p className="text-[10px] font-extrabold text-white/55 uppercase tracking-[0.12em] mb-2">예측 엔진</p>
              <h2 className="text-2xl md:text-3xl font-black text-white tracking-[-0.04em] tabular-nums mb-1">{formatGold(Number(analysis?.fairPrice || 0))} G</h2>
              <p className="text-[11px] text-white/50 font-semibold">거래 데이터 기반 적정가</p>
            </div>
            <div className="bg-white/[0.03] border border-blue-500/20 p-5 rounded-[26px] backdrop-blur-md relative overflow-hidden">
              <p className="text-[10px] font-extrabold text-blue-400 uppercase tracking-[0.12em] mb-2">나의 시뮬레이션</p>
              <h2 className="text-2xl md:text-3xl font-black text-zinc-100 tracking-[-0.04em] tabular-nums mb-2">{formatGold(theoreticalValue)} G</h2>
              <div className="flex items-center gap-2">
              {(() => {
                const avgPrice = Number(analysis?.avgPrice) || 0;
                const pct = avgPrice > 0 ? Math.round((theoreticalValue / avgPrice) * 100) : 0;
                const isInsufficient = avgPrice === 0 || pct > 999;
                return (
                  <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md border ${isInsufficient ? 'border-zinc-500/30 text-zinc-400 bg-zinc-500/5' : theoreticalValue > avgPrice ? 'border-red-500/30 text-red-400 bg-red-500/5' : 'border-green-500/30 text-green-400 bg-green-500/5'}`}>
                    {isInsufficient ? "데이터 부족" : `평균가 대비 ${pct}% 가치`}
                  </span>
                );
              })()}
              </div>
            </div>
            <div className="bg-white/[0.02] border border-white/5 p-5 rounded-[26px]">
              <p className="text-[10px] font-extrabold text-zinc-600 uppercase tracking-[0.12em] mb-2">최근 평균 거래가</p>
              <h2 className="text-2xl font-black text-zinc-300 tracking-[-0.04em] tabular-nums">{formatGold(Number(analysis?.avgPrice || 0))} G</h2>
            </div>
          </div>
          {/* 차트 영역 */}
          <div className="xl:col-span-8 bg-white/[0.02] border border-white/5 p-5 md:p-6 rounded-[30px] backdrop-blur-md relative">
            <div className="absolute top-5 right-5 flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                <p className="text-[10px] font-extrabold text-zinc-600 uppercase tracking-[0.12em]">시세 변동성</p>
            </div>
            <div ref={containerRef} className="w-full h-[260px]">
              {chartSize.width > 0 && analysis?.history && analysis.history.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={analysis.history}>
                    <defs><linearGradient id="blueGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/><stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/></linearGradient></defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff03" vertical={false} />
                    <XAxis dataKey="tradeDate" stroke="#333" fontSize={10} tickFormatter={(d) => new Date(d).toLocaleDateString([], {month:'numeric', day:'numeric'})} tickLine={false} axisLine={false} />
                    <YAxis hide domain={['auto', 'auto']} />
                    <Tooltip contentStyle={{ backgroundColor: '#0a0a0b', border: '1px solid #ffffff10', borderRadius: '16px' }} formatter={(val: any) => [`${formatGold(Number(val))} G`, "가격"]} />
                    <Area type="monotone" dataKey="price" stroke="#3b82f6" strokeWidth={4} fill="url(#blueGrad)" isAnimationActive={true} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : <div className="h-full flex items-center justify-center text-zinc-800 font-black uppercase text-xs tracking-widest">분석 데이터 로딩 중...</div>}
            </div>
          </div>
      </div>

      {/* 분석 필터 설정 */}
      <div className="bg-white/[0.02] border border-white/5 p-5 md:p-6 rounded-[32px] shadow-2xl backdrop-blur-md">
        <div className="flex items-center gap-4 mb-5 border-b border-white/5 pb-4">
          <div className="w-11 h-11 bg-black/40 rounded-2xl flex items-center justify-center border border-white/5 shrink-0 shadow-inner">
            <img src={getSecureUrl(selectedItem.iconUrl)} className="w-8 h-8 pixel-art" alt="" />
          </div>
          <div>
            <h3 className="text-lg font-extrabold uppercase tracking-[-0.03em]">{selectedItem.name}</h3>
            <p className="text-blue-400 font-extrabold text-[10px] uppercase tracking-[0.12em] mt-1">정밀 분석 필터</p>
          </div>
        </div>

        <div className="custom-scrollbar overflow-y-auto max-h-[460px] pr-2">
          {category === "WILD" && (
            <div className="space-y-6">
              <div className="space-y-3">
                <div className="text-[10px] font-extrabold text-blue-400 uppercase tracking-[0.14em] border-l-2 border-blue-500 pl-3">인챈트 구성</div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 xl:grid-cols-6 gap-1.5">
                  {WILD_BASE.map(([name, max]: any) => {
                    const HIGH_LIMITS: Record<string, number> = { "효율": 10, "날카로움": 7, "보호": 6, "미끼": 5, "약탈": 5, "행운": 5 };
                    const currentMax = HIGH_LIMITS[name as string] || (max as number);

                    return (
                      <button key={name as string} onClick={() => toggleOption('enchantments', name as string, currentMax)} className={`min-h-[34px] px-2.5 py-1.5 rounded-lg border transition-all flex justify-between items-center ${filters.enchantments[name as string] ? "bg-blue-600 border-blue-400 text-white shadow-lg shadow-blue-600/10" : "bg-white/[0.035] border-white/5 text-zinc-500 hover:bg-white/10 hover:text-zinc-200"}`}>
                        <span className="font-semibold text-[10px]">{name as string}</span>
                        {filters.enchantments[name as string] && <span className="bg-white/20 px-2 py-0.5 rounded-md text-[10px] font-black">{filters.enchantments[name as string]}</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="space-y-3">
                <div className="text-[10px] font-extrabold text-red-400 uppercase tracking-[0.14em] border-l-2 border-red-500 pl-3">특수 인챈트</div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 xl:grid-cols-6 gap-1.5">
                  {WILD_SPECIAL.map(([name, max]) => (
                    <button key={name as string} onClick={() => toggleOption('enchantments', name as string, max as number)} className={`min-h-[34px] px-2.5 py-1.5 rounded-lg border transition-all flex justify-between items-center ${filters.enchantments[name as string] ? "bg-red-600 border-red-400 text-white shadow-lg shadow-red-600/10" : "bg-white/[0.035] border-white/5 text-zinc-500 hover:bg-white/10 hover:text-zinc-200"}`}>
                      <span className="font-semibold text-[10px]">{name as string}</span>
                      {filters.enchantments[name as string] && <span className="bg-white/20 px-2 py-0.5 rounded-md text-[10px] font-black">{filters.enchantments[name as string]}</span>}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
          
          {category === "ISLAND" && (
            <div className="space-y-5">
                <div className="max-w-xs space-y-3">
                  <div className="text-[10px] font-extrabold text-yellow-400 uppercase tracking-[0.14em] px-1">장비 강화 +{filters.enhancementLevel}</div>
                  <div className="bg-black/40 p-4 rounded-2xl flex items-center border border-white/5">
                    <input 
                      type="range" min="0" max="15" value={filters.enhancementLevel} 
                      onChange={e => { triggerHaptic(5); setFilters({...filters, enhancementLevel: parseInt(e.target.value)}); }} 
                      className="calc-range calc-range-yellow flex-1" 
                    />
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="text-[10px] font-extrabold text-zinc-500 uppercase tracking-[0.14em] ml-1">각인 활성화</div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-1.5">
                    {ISLAND_IMPRINTS.map(name => (
                      <button key={name} onClick={() => toggleOption('imprints', name, 5)} className={`min-h-[34px] flex items-center justify-between px-2.5 py-1.5 rounded-lg border transition-all ${filters.imprints[name] ? "bg-yellow-500 border-yellow-300 text-black shadow-lg shadow-yellow-500/10" : "bg-white/[0.035] border-white/5 text-zinc-500 hover:bg-white/10 hover:text-zinc-200"}`}>
                        <span className="font-semibold text-[10px]">{name}</span>
                        {filters.imprints[name] && <span className="font-black text-[9px] bg-black/10 px-1.5 py-0.5 rounded">Lv.{filters.imprints[name]}</span>}
                      </button>
                    ))}
                  </div>
                </div>
            </div>
          )}
          
          {category === "RPG" && (
            <div className="space-y-6">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-3">
                     <div className="text-[10px] font-extrabold text-cyan-400 uppercase tracking-[0.14em] ml-1">강화 랭크 / +{filters.enhancementLevel}</div>
                     <div className="flex gap-1.5 p-1 bg-white/5 rounded-xl border border-white/5">
                       {["입문", "견습", "정예", "영웅"].map(rank => (
                         <button key={rank} onClick={() => { triggerHaptic(); setFilters({...filters, enhancementRank: rank}); }} className={`min-h-[32px] flex-1 py-1.5 rounded-md text-[10px] font-extrabold transition-all ${filters.enhancementRank === rank ? "bg-cyan-600 text-white shadow-md" : "text-zinc-600 hover:text-zinc-300"}`}>{rank}</button>
                       ))}
                     </div>
                     <div className="bg-black/40 border border-white/5 p-4 rounded-2xl flex items-center mt-2">
                        <input 
                          type="range" min="0" max="15" value={filters.enhancementLevel} 
                          onChange={e => { triggerHaptic(5); setFilters({...filters, enhancementLevel: parseInt(e.target.value)}); }} 
                          className="calc-range calc-range-cyan flex-1" 
                        />
                     </div>
                  </div>
                  <div className="space-y-3">
                     <div className="text-[10px] font-extrabold text-orange-400 uppercase tracking-[0.14em] ml-1">룬 장착 검색</div>
                     <div className="grid grid-cols-3 gap-2">
                        {filters.runes.map((rune, idx) => (
                          <button key={idx} onClick={() => setActiveRuneSlot(activeRuneSlot === idx ? null : idx)} className={`aspect-square rounded-xl border transition-all flex flex-col items-center justify-center p-2 relative ${activeRuneSlot === idx ? 'border-orange-500 bg-orange-500/10' : 'bg-black/40 border-white/5 text-zinc-700 hover:border-white/10'}`}>
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
                      <div className="flex justify-between items-center px-1">
                        <div className="text-[11px] font-black text-orange-500 uppercase flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />룬 설정 #{activeRuneSlot + 1}</div>
                        <button onClick={() => setActiveRuneSlot(null)} className="text-[10px] font-black text-zinc-600 hover:text-white">닫기</button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                         <div className="space-y-4">
                            <p className="text-[10px] font-black text-zinc-500 uppercase ml-1">룬 등급</p>
                            <div className="flex gap-1.5">{RUNE_GRADES.map(g => (<button key={g} onClick={() => updateRune(g)} className={`min-h-[32px] flex-1 py-1.5 rounded-md text-[10px] font-black transition-all ${filters.runes[activeRuneSlot!].grade === g ? 'bg-orange-500 text-black shadow-lg' : 'bg-white/5 text-zinc-600'}`}>{g}</button>))}</div>
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
                  <div className="text-[10px] font-extrabold text-purple-400 uppercase tracking-[0.14em] border-l-2 border-purple-500 pl-3">전투 스킬 필터</div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 xl:grid-cols-6 gap-1.5">
                    {skillConfig && Object.keys(skillConfig.skills).map(name => (
                      <button key={name} onClick={() => toggleOption('skills', name, 7)} className={`min-h-[34px] flex items-center justify-between px-2.5 py-1.5 rounded-lg border transition-all ${filters.skills[name] ? "bg-purple-600 border-purple-400 text-white shadow-lg shadow-purple-600/10" : "bg-white/[0.035] border-white/5 text-zinc-500 hover:bg-white/10 hover:text-zinc-200"}`}>
                        <span className="font-semibold text-[10px] truncate">{name}</span>
                        {filters.skills[name] && <span className="font-black text-[9px] bg-white/20 px-1.5 py-0.5 rounded-md">Lv.{filters.skills[name]}</span>}
                      </button>
                    ))}
                  </div>
               </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}