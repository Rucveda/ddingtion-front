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
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
      {/* AI 분석 요약 패널 */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          <div className="xl:col-span-4 space-y-4">
            <div className="bg-blue-600 p-8 rounded-[40px] shadow-2xl relative overflow-hidden">
              <p className="text-[10px] font-black text-white/50 uppercase tracking-widest mb-3">띵션 예측 엔진 (BETA)</p>
              <h2 className="text-4xl font-black text-white tracking-tighter tabular-nums mb-1">{formatGold(Number(analysis?.fairPrice || 0))} G</h2>
              <p className="text-[9px] text-white/40 italic">실제 거래 데이터 및 기댓값 계산</p>
            </div>
            <div className="bg-white/[0.03] border border-blue-500/20 p-8 rounded-[40px] backdrop-blur-md relative overflow-hidden">
              <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-3">나의 시뮬레이션</p>
              <h2 className="text-4xl font-black text-zinc-100 tracking-tighter tabular-nums mb-2">{formatGold(theoreticalValue)} G</h2>
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-black px-2 py-0.5 rounded border ${theoreticalValue > (Number(analysis?.avgPrice) || 0) ? 'border-red-500/30 text-red-400 bg-red-500/5' : 'border-green-500/30 text-green-400 bg-green-500/5'}`}>
                  평균가 대비 {theoreticalValue > 0 ? (theoreticalValue / (Number(analysis?.avgPrice) || 1) * 100).toFixed(0) : 0}% 가치
                </span>
              </div>
            </div>
            <div className="bg-white/[0.02] border border-white/5 p-8 rounded-[40px]">
              <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-3">최근 평균 거래가</p>
              <h2 className="text-3xl font-black text-zinc-400 tracking-tighter tabular-nums">{formatGold(Number(analysis?.avgPrice || 0))} G</h2>
            </div>
          </div>
          {/* 차트 영역 */}
          <div className="xl:col-span-8 bg-white/[0.02] border border-white/5 p-10 rounded-[48px] backdrop-blur-md relative">
            <div className="absolute top-10 right-10 flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest italic">시세 변동성 분석</p>
            </div>
            <div ref={containerRef} className="w-full h-[320px]">
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
      <div className="bg-white/[0.02] border border-white/5 p-8 md:p-12 rounded-[56px] shadow-2xl backdrop-blur-md">
        <div className="flex items-center gap-6 mb-10 border-b border-white/5 pb-8">
          <div className="w-14 h-14 bg-black/40 rounded-2xl flex items-center justify-center border border-white/5 shrink-0 shadow-inner">
            <img src={getSecureUrl(selectedItem.iconUrl)} className="w-8 h-8 pixel-art" alt="" />
          </div>
          <div>
            <h3 className="text-2xl font-black uppercase tracking-tighter">{selectedItem.name}</h3>
            <p className="text-blue-500 font-black text-[10px] uppercase tracking-widest mt-1">정밀 분석 필터 구성</p>
          </div>
        </div>

        <div className="custom-scrollbar overflow-y-auto max-h-[600px] pr-4">
          {category === "WILD" && (
            <div className="space-y-12">
              <div className="space-y-6">
                <div className="text-[11px] font-black text-blue-500 uppercase tracking-widest border-l-4 border-blue-500 pl-4">인챈트 구성 (한계 돌파 포함)</div>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
                  {WILD_BASE.map(([name, max]: any) => {
                    const HIGH_LIMITS: Record<string, number> = { "효율": 10, "날카로움": 7, "보호": 6, "미끼": 5, "약탈": 5, "행운": 5 };
                    const currentMax = HIGH_LIMITS[name as string] || (max as number);

                    return (
                      <button key={name as string} onClick={() => toggleOption('enchantments', name as string, currentMax)} className={`p-4 rounded-xl border transition-all flex justify-between items-center ${filters.enchantments[name as string] ? "bg-blue-600 border-blue-400 text-white shadow-lg" : "bg-white/5 border-white/5 text-zinc-600 hover:bg-white/10"}`}>
                        <span className="font-bold text-xs">{name as string}</span>
                        {filters.enchantments[name as string] && <span className="bg-white/20 px-2 py-0.5 rounded-md text-[10px] font-black">{filters.enchantments[name as string]}</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="space-y-6">
                <div className="text-[11px] font-black text-red-500 uppercase tracking-widest border-l-4 border-red-500 pl-4">특수 인챈트 선택</div>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
                  {WILD_SPECIAL.map(([name, max]) => (
                    <button key={name as string} onClick={() => toggleOption('enchantments', name as string, max as number)} className={`p-4 rounded-xl border transition-all flex justify-between items-center ${filters.enchantments[name as string] ? "bg-red-600 border-red-400 text-white shadow-lg" : "bg-white/5 border-white/5 text-zinc-600 hover:bg-white/10"}`}>
                      <span className="font-bold text-xs">{name as string}</span>
                      {filters.enchantments[name as string] && <span className="bg-white/20 px-2 py-0.5 rounded-md text-[10px] font-black">{filters.enchantments[name as string]}</span>}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
          
          {category === "ISLAND" && (
            <div className="space-y-12">
                <div className="max-w-xs space-y-4">
                  <div className="text-[11px] font-black text-yellow-500 uppercase tracking-widest px-1">장비 강화 수치 (+{filters.enhancementLevel})</div>
                  <div className="bg-black/40 p-6 rounded-2xl flex items-center border border-white/5">
                    <input 
                      type="range" min="0" max="15" value={filters.enhancementLevel} 
                      onChange={e => { triggerHaptic(5); setFilters({...filters, enhancementLevel: parseInt(e.target.value)}); }} 
                      className="flex-1 h-1 bg-zinc-800 rounded-lg appearance-none accent-yellow-500 cursor-pointer" 
                    />
                  </div>
                </div>
                <div className="space-y-6">
                  <div className="text-[11px] font-black text-zinc-500 uppercase tracking-widest ml-1">각인 활성화</div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {ISLAND_IMPRINTS.map(name => (
                      <button key={name} onClick={() => toggleOption('imprints', name, 5)} className={`flex items-center justify-between p-4 rounded-xl border transition-all ${filters.imprints[name] ? "bg-yellow-600 border-yellow-400 text-black shadow-lg" : "bg-white/5 border-white/5 text-zinc-600 hover:bg-white/10"}`}>
                        <span className="font-bold text-xs">{name}</span>
                        {filters.imprints[name] && <span className="font-black text-[9px] bg-black/10 px-1.5 py-0.5 rounded">Lv.{filters.imprints[name]}</span>}
                      </button>
                    ))}
                  </div>
                </div>
            </div>
          )}
          
          {category === "RPG" && (
            <div className="space-y-12">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  <div className="space-y-6">
                     <div className="text-[11px] font-black text-cyan-500 uppercase tracking-widest ml-1">강화 랭크 및 단계 (+{filters.enhancementLevel})</div>
                     <div className="flex gap-1.5 p-1 bg-white/5 rounded-xl border border-white/5">
                       {["입문", "견습", "정예", "영웅"].map(rank => (
                         <button key={rank} onClick={() => { triggerHaptic(); setFilters({...filters, enhancementRank: rank}); }} className={`flex-1 py-3 rounded-lg text-[10px] font-black transition-all ${filters.enhancementRank === rank ? "bg-cyan-600 text-white shadow-md" : "text-zinc-600"}`}>{rank}</button>
                       ))}
                     </div>
                     <div className="bg-black/40 border border-white/5 p-5 rounded-2xl flex items-center mt-2">
                        <input 
                          type="range" min="0" max="15" value={filters.enhancementLevel} 
                          onChange={e => { triggerHaptic(5); setFilters({...filters, enhancementLevel: parseInt(e.target.value)}); }} 
                          className="flex-1 h-1 bg-zinc-800 rounded-lg appearance-none accent-cyan-500 cursor-pointer" 
                        />
                     </div>
                  </div>
                  <div className="space-y-6">
                     <div className="text-[11px] font-black text-orange-500 uppercase tracking-widest ml-1">룬 장착 검색</div>
                     <div className="grid grid-cols-3 gap-3">
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
                   <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="bg-orange-500/[0.03] border border-orange-500/20 rounded-3xl p-8 space-y-8 overflow-hidden">
                      <div className="flex justify-between items-center px-1">
                        <div className="text-[11px] font-black text-orange-500 uppercase flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />룬 설정 #{activeRuneSlot + 1}</div>
                        <button onClick={() => setActiveRuneSlot(null)} className="text-[10px] font-black text-zinc-600 hover:text-white">닫기</button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                         <div className="space-y-4">
                            <p className="text-[10px] font-black text-zinc-500 uppercase ml-1">룬 등급</p>
                            <div className="flex gap-1.5">{RUNE_GRADES.map(g => (<button key={g} onClick={() => updateRune(g)} className={`flex-1 py-2.5 rounded-lg text-[10px] font-black transition-all ${filters.runes[activeRuneSlot!].grade === g ? 'bg-orange-500 text-black shadow-lg' : 'bg-white/5 text-zinc-600'}`}>{g}</button>))}</div>
                         </div>
                         <div className="space-y-4">
                            <p className="text-[10px] font-black text-zinc-500 uppercase ml-1">룬 종류</p>
                            <div className="grid grid-cols-4 gap-1.5">{RUNE_TYPES.slice(0, 8).map(t => (<button key={t} onClick={() => updateRune(undefined, t)} className={`py-2 rounded-lg text-[9px] font-bold transition-all border ${filters.runes[activeRuneSlot!].type === t ? 'bg-zinc-100 text-black border-white' : 'bg-black/20 border-white/5 text-zinc-500'}`}>{t.replace("의룬", "")}</button>))}</div>
                         </div>
                      </div>
                   </motion.div>
                 )}
               </AnimatePresence>

               <div className="space-y-6">
                  <div className="text-[11px] font-black text-purple-500 uppercase tracking-widest border-l-4 border-purple-500 pl-4">보유 전투 스킬 분석 필터</div>
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
                    {skillConfig && Object.keys(skillConfig.skills).map(name => (
                      <button key={name} onClick={() => toggleOption('skills', name, 7)} className={`flex items-center justify-between p-4 rounded-xl border transition-all ${filters.skills[name] ? "bg-purple-600 border-purple-400 text-white shadow-lg" : "bg-white/5 border-white/5 text-zinc-600 hover:bg-white/10"}`}>
                        <span className="font-bold text-xs truncate">{name}</span>
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