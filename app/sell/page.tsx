"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { request } from "@/utils/api"; 
import { motion, AnimatePresence } from "framer-motion";
import { SimpleTopBar, SiteBackground, SiteFooter } from "@/components/SiteChrome";

// --- 데이터 정의 (기존 데이터 유지) ---
const WILD_BASE = [["효율", 5], ["행운", 3], ["섬세한손길", 1], ["바다의행운", 3], ["미끼", 3], ["밀치기", 2], ["휩쓸기", 3], ["약탈", 3], ["날카로움", 5], ["발화", 2], ["살충", 5], ["강타", 5], ["화염", 1], ["밀어내기", 2], ["힘", 5], ["무한", 1], ["다중발사", 1], ["관통", 4], ["빠른장전", 3], ["집전", 1], ["찌르기", 5], ["충성", 3], ["급류", 3], ["육중", 5], ["격파", 4], ["돌풍", 3], ["폭발보호", 4], ["화염보호", 4], ["발사체보호", 4], ["가시", 3], ["보호", 4], ["친수성", 1], ["호흡", 3], ["신속한잠행", 3], ["물갈퀴", 3], ["가벼운착지", 4], ["영혼가속", 3], ["차가운걸음", 2], ["내구성", 3], ["수선", 1]];
const WILD_SPECIAL = [["경험", 5], ["조급함", 3], ["서두름", 3], ["심호흡", 2], ["석탄", 3], ["구리", 3], ["금", 3], ["철", 3], ["청금석", 3], ["석영", 3], ["다이아몬드", 3], ["에메랄드", 3], ["고대잔해", 3], ["노련한손길", 3], ["자동감기", 4], ["뾰족함", 5], ["바다의경험", 3], ["참격", 4], ["위력", 4], ["벌목", 3], ["출혈", 6], ["냉혈함", 4], ["골절", 3], ["백신", 5], ["천적", 4], ["속격", 3], ["반격", 3], ["광휘", 3], ["속박", 3], ["흡혈", 5], ["잠행", 3], ["혈전", 5], ["흡혈귀", 3], ["이중타격", 3], ["일격", 3], ["여명", 3], ["심판", 3], ["밤기사", 3], ["학구열", 4], ["좀비", 3], ["스켈레톤", 3], ["거미", 3], ["크리퍼", 3], ["마무리", 3], ["활력", 3], ["서막", 5], ["천벌", 5], ["견고함", 10], ["창공", 3], ["추진력", 3], ["경감", 4], ["견갑", 4], ["복원", 3], ["반사", 5], ["수호", 2], ["흡수", 4], ["내폭성", 3], ["회피", 5], ["엔더보호", 3], ["네더보호", 3], ["내화성", 1], ["과충전", 3], ["아가미", 1], ["투시", 1], ["불멸", 3], ["격퇴", 5], ["강인함", 6], ["소화", 3], ["추격", 3], ["심연", 4], ["탈출", 2], ["가벼운걸음", 1], ["낙하", 3], ["뜨거운걸음", 1], ["가속화", 3], ["완벽한착지", 3], ["용수철", 3]];
const ISLAND_IMPRINTS = ["채집강화", "채집가속", "씨앗행운", "과일행운", "과일가속", "빠른농부", "작물상자", "과일바구니", "유성낙하", "농부룰렛", "채광강화", "채광가속", "광물행운", "유물탐색", "코비탐색", "빠른광부", "보석코비", "광산수레", "광부룰렛", "물고기행운", "어획강화", "조개탐색", "어패행운", "수중호흡", "빠른어부", "정령고래", "가오리인도", "어부룰렛", "공격강화", "공격가속", "전리품행운", "조각탐색", "빠른사냥꾼", "흔적추적", "조각공명", "흡인사냥", "사냥꾼룰렛"];
const RPG_SKILLS = ["리프시커", "바인크리프", "우드서지", "버던트메테오", "그로브클랩", "스틸임팩트", "헤비사이클론", "그랜드크러시", "오리진이지스", "팔라딘저지먼트", "에너지버스트", "브로드샷", "락온트리거", "펄스레이닝", "오버클럭프로토콜", "차지블로우", "스위프트샷", "컨비전스스플릿", "리니어레인", "세라핌디센트", "피어스폴", "스러스트러시", "플리커랜서", "프로스트드롭", "앱솔루트도미니온", "플래임슬래시", "리버스커터", "업리프트임팩트", "드래곤이그니션", "와이번어웨이크"];
const RPG_SKILL_MAP: Record<string, string[]> = {
  "스태프": ["리프시커", "바인크리프", "우드서지", "버던트메테오", "그로브클랩"],
  "망치": ["스틸임팩트", "헤비사이클론", "그랜드크러시", "오리진이지스", "팔라딘저지먼트"],
  "총": ["에너지버스트", "브로드샷", "락온트리거", "펄스레이닝", "오버클럭프로토콜"],
  "활": ["차지블로우", "스위프트샷", "컨비전스스플릿", "리니어레인", "세라핌디센트"],
  "창": ["피어스폴", "스러스트러시", "플리커랜서", "프로스트드롭", "앱솔루트도미니온"],
  "대검": ["플래임슬래시", "리버스커터", "업리프트임팩트", "드래곤이그니션", "와이번어웨이크"]
};
const RUNE_GRADES = ["루키", "커먼", "노멀", "레어"];
const RUNE_TYPES = ["파괴의룬", "타격의룬", "증폭의룬", "기습의룬", "사냥의룬", "지배의룬", "개시의룬", "처형의룬", "한기의룬", "화염의룬", "자연의룬", "뇌전의룬", "강철의룬", "흡혈의룬", "열상의룬", "출혈의룬", "정밀의룬", "치명의룬", "역습의룬", "반격의룬"];

interface Item { id: number; name: string; iconUrl: string; category: string; }

export default function SellItem() {
  const router = useRouter();
  const [dbItems, setDbItems] = useState<Item[]>([]); 
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [searchTerm, setSearchTerm] = useState(""); 
  const [showDropdown, setShowDropdown] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [activeRuneSlot, setActiveRuneSlot] = useState<number | null>(null);
  const [relistSourceId, setRelistSourceId] = useState<string | null>(null);

  const [form, setForm] = useState({ 
    startPrice: "", buyNowPrice: "", durationDays: "1", description: "",
    enhancementLevel: 0, enhancementRank: "입문", enchantments: {} as Record<string, number>, 
    imprints: {} as Record<string, number>, skills: {} as Record<string, number>,
    runes: [{ grade: "", type: "" }, { grade: "", type: "" }, { grade: "", type: "" }]
  });

  /**
   * 🛠️ [패치 1] 이미지 보안 처리
   */
  const getSecureUrl = (url: string) => url?.replace("http://", "https://") || "";

  /**
   * 🛠️ [패치 2] 골드 포맷 가독성 개선
   */
  const formatGold = (amount: string) => {
    const num = Number(amount.replace(/[^0-9]/g, ""));
    if (isNaN(num) || num === 0) return "0";
    if (num >= 100000000) {
      const uk = Math.floor(num / 100000000);
      const man = Math.floor((num % 100000000) / 10000);
      return `${uk}억 ${man > 0 ? man.toLocaleString() + '만' : ''}`;
    }
    if (num >= 10000) return `${Math.floor(num / 10000).toLocaleString()}만`;
    return num.toLocaleString();
  };

  const filteredItems = useMemo(() => {
    return dbItems.filter(item => 
      item.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [dbItems, searchTerm]);

  const category = useMemo(() => {
    if (!selectedItem) return null;
    const cat = selectedItem.category.toUpperCase();
    if (cat.includes("WILD") || cat.includes("야생")) return "WILD";
    if (cat.includes("ISLAND") || cat.includes("아일랜드")) return "ISLAND";
    if (cat.includes("RPG")) return "RPG";
    return "OTHER";
  }, [selectedItem]);

  const currentWeaponSkills = useMemo(() => {
    if (!selectedItem) return RPG_SKILLS;
    const name = selectedItem.name;
    if (name.includes("스태프")) return RPG_SKILL_MAP["스태프"];
    if (name.includes("망치")) return RPG_SKILL_MAP["망치"];
    if (name.includes("총")) return RPG_SKILL_MAP["총"];
    if (name.includes("활")) return RPG_SKILL_MAP["활"];
    if (name.includes("창")) return RPG_SKILL_MAP["창"];
    if (name.includes("대검")) return RPG_SKILL_MAP["대검"];
    return RPG_SKILLS;
  }, [selectedItem]);

  const triggerHaptic = useCallback(() => {
    if (typeof window !== "undefined" && window.navigator?.vibrate) window.navigator.vibrate(10);
  }, []);

  useEffect(() => {
    request("/api/auctions/items")
      .then(data => Array.isArray(data) && setDbItems(data))
      .catch(err => {
        console.error("아이템 목록 로드 실패:", err);
        setDbItems([]);
      });
  }, []);

  useEffect(() => {
    const sourceId = new URLSearchParams(window.location.search).get("relist");
    if (!sourceId || dbItems.length === 0) return;

    const loadRelistSource = async () => {
      try {
        const auction = await request(`/api/auctions/${sourceId}`);
        if (!auction) return;
        if (!["EXPIRED", "CANCELED"].includes(auction.status)) {
          alert("만료되었거나 유찰된 경매만 다시 등록할 수 있습니다.");
          return;
        }
        const item = dbItems.find((candidate) => candidate.id === Number(auction.itemId)) || auction.item;
        if (!item) return;
        setRelistSourceId(sourceId);
        setSelectedItem(item);
        setSearchTerm(item.name);
        setShowDropdown(false);
        setForm({
          startPrice: String(auction.startPrice || ""),
          buyNowPrice: auction.buyNowPrice ? String(auction.buyNowPrice) : "",
          durationDays: "1",
          description: auction.description || "",
          enhancementLevel: Number(auction.enhancementLevel || 0),
          enhancementRank: auction.enhancementRank || "입문",
          enchantments: auction.enchantments || {},
          imprints: auction.imprint || {},
          skills: auction.skills || {},
          runes: Array.isArray(auction.runes) && auction.runes.length === 3
            ? auction.runes
            : [{ grade: "", type: "" }, { grade: "", type: "" }, { grade: "", type: "" }],
        });
      } catch (error) {
        console.error("재등록 원본 로드 실패:", error);
        alert("기존 경매 정보를 불러오지 못했습니다.");
      }
    };

    loadRelistSource();
  }, [dbItems]);

  const handleSelectItem = (item: Item) => {
    triggerHaptic();
    setRelistSourceId(null);
    setSelectedItem(item);
    setSearchTerm(item.name);
    setShowDropdown(false);
    setForm(prev => ({ 
      ...prev, enchantments: {}, imprints: {}, skills: {}, enhancementLevel: 0, 
      runes: [{ grade: "", type: "" }, { grade: "", type: "" }, { grade: "" , type: "" }] 
    }));
  };

  const toggleOption = (type: 'enchantments' | 'imprints' | 'skills', name: string, maxTier: number) => {
    triggerHaptic();
    setForm(prev => {
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
    const newRunes = [...form.runes];
    if (grade !== undefined) newRunes[activeRuneSlot].grade = grade;
    if (type !== undefined) newRunes[activeRuneSlot].type = type;
    setForm({ ...form, runes: newRunes });
  };

  const handleSell = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return;
    setIsLoading(true);
    try {
      await request(relistSourceId ? `/api/auctions/${relistSourceId}/relist` : "/api/auctions", {
        method: "POST",
        body: JSON.stringify({ 
          itemId: selectedItem.id, 
          ...form, 
          startPrice: Number(form.startPrice), 
          buyNowPrice: form.buyNowPrice ? Number(form.buyNowPrice) : null 
        }),
      });
      router.push(relistSourceId ? "/mypage" : "/?tab=AUCTION");
    } catch (error) { 
      console.error(error); 
      alert(error instanceof Error ? error.message : "아이템 등록 중 오류가 발생했습니다.");
    } finally { setIsLoading(false); }
  };

  return (
    <div className="min-h-screen bg-[#010101] text-zinc-100 font-sans select-none relative overflow-x-hidden">
      <SiteBackground />
      <SimpleTopBar onNavigate={triggerHaptic} closeHref="/?tab=AUCTION" />

      <main className="max-w-7xl mx-auto py-6 md:py-8 px-4 sm:px-6 relative z-10">
        <motion.form 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ duration: 0.5 }}
          onSubmit={handleSell} 
          className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start"
        >
          <aside className="lg:col-span-4 space-y-4">
            <section className="site-card p-4 md:p-5 rounded-[28px]">
              <h2 className="text-[11px] font-extrabold text-zinc-400 uppercase tracking-[0.14em] mb-4 flex items-center gap-2">
                <div className="w-1 h-3 bg-blue-600 rounded-full" /> {relistSourceId ? "경매 다시 등록" : "경매 등록"}
              </h2>
              {relistSourceId && (
                <div className="mb-4 rounded-2xl border border-amber-500/15 bg-amber-500/10 px-4 py-3 text-xs font-semibold leading-relaxed text-amber-100/80">
                  만료된 경매 정보를 불러왔습니다. 가격과 기간을 확인한 뒤 새 경매로 등록됩니다.
                </div>
              )}
              
              <div className="space-y-4">
                <div className="relative">
                  <div className="text-[10px] font-extrabold text-zinc-600 mb-2 ml-1 uppercase tracking-[0.12em]">아이템 검색</div>
                  <input 
                    type="text" placeholder="아이템 이름을 입력하세요..." 
                    className="w-full bg-black/40 border border-white/10 px-4 py-3 rounded-2xl text-xs font-semibold outline-none focus:border-blue-500/50 transition-all placeholder:text-zinc-600"
                    value={searchTerm} onChange={e => { setSearchTerm(e.target.value); setShowDropdown(true); }}
                  />
                  <AnimatePresence>
                    {showDropdown && searchTerm && (
                      <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="absolute top-full left-0 w-full mt-2 bg-[#0d0d0f]/95 border border-white/10 rounded-2xl overflow-hidden z-[100] shadow-3xl max-h-56 overflow-y-auto custom-scrollbar backdrop-blur-3xl">
                        {filteredItems.map(item => (
                          <div key={item.id} onClick={() => handleSelectItem(item)} className="px-3 py-2.5 hover:bg-white/5 cursor-pointer flex items-center gap-3 border-b border-white/5 group transition-colors">
                            {/* 🛠️ [패치 적용] */}
                            <img src={getSecureUrl(item.iconUrl)} className="w-7 h-7 pixel-art" alt="" />
                            <div>
                              <div className="font-semibold text-[11px] text-zinc-300 group-hover:text-white">{item.name}</div>
                              <div className="text-[9px] text-zinc-600 font-extrabold uppercase tracking-tight">{item.category}</div>
                            </div>
                          </div>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="space-y-3">
                  <div className="text-[10px] font-extrabold text-zinc-600 ml-1 uppercase tracking-[0.12em]">가격 설정</div>
                  <div className="bg-black/40 rounded-2xl border border-white/5 overflow-hidden">
                    <div className="p-4">
                      <label className="text-[10px] font-extrabold text-yellow-400 uppercase mb-1.5 block tracking-[0.12em]">경매 시작가</label>
                      <div className="flex items-baseline gap-2">
                        <input required type="text" className="w-full bg-transparent text-xl font-mono font-extrabold text-yellow-400 outline-none" value={form.startPrice} onChange={e => setForm({...form, startPrice: e.target.value.replace(/[^0-9]/g, "")})} />
                        <span className="text-yellow-900 font-extrabold">G</span>
                      </div>
                      <div className="text-[10px] text-zinc-700 font-semibold mt-1">{formatGold(form.startPrice)} 골드</div>
                    </div>

                    <div className="h-px bg-white/5" />

                    <div className="p-4">
                      <label className="text-[10px] font-extrabold text-blue-400 uppercase mb-1.5 block tracking-[0.12em]">즉시 구매가</label>
                      <div className="flex items-baseline gap-2">
                        <input type="text" className="w-full bg-transparent text-xl font-mono font-extrabold text-blue-400 outline-none placeholder:text-blue-900/20" placeholder="선택사항" value={form.buyNowPrice} onChange={e => setForm({...form, buyNowPrice: e.target.value.replace(/[^0-9]/g, "")})} />
                        <span className="text-blue-900 font-extrabold">G</span>
                      </div>
                      <div className="text-[10px] text-zinc-700 font-semibold mt-1">{formatGold(form.buyNowPrice)} 골드</div>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="text-[10px] font-extrabold text-zinc-600 ml-1 uppercase tracking-[0.12em]">경매 등록 기간</div>
                  <div className="bg-black/40 p-4 rounded-2xl border border-white/5 space-y-3">
                    <div className="flex items-baseline gap-3">
                      <span className="text-2xl font-extrabold text-white font-mono tracking-[-0.04em]">{form.durationDays}</span>
                      <span className="text-xs font-extrabold text-zinc-500">일 동안 진행</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="7"
                      step="1"
                      value={form.durationDays}
                      onChange={e => { triggerHaptic(); setForm({ ...form, durationDays: e.target.value }); }}
                      className="calc-range"
                    />
                    <div className="flex justify-between text-[9px] font-extrabold text-zinc-700 uppercase">
                      <span>1일</span>
                      <span>7일</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="text-[10px] font-extrabold text-zinc-600 ml-1 uppercase tracking-[0.12em]">판매자 설명</div>
                  <div className="bg-black/40 p-4 rounded-2xl border border-white/5">
                    <textarea
                      value={form.description}
                      onChange={e => setForm({ ...form, description: e.target.value })}
                      maxLength={500}
                      placeholder="거래 가능 시간, 옵션 설명, 특이사항을 입력하세요..."
                      className="min-h-[92px] w-full resize-none bg-transparent text-xs font-medium leading-relaxed text-zinc-200 outline-none placeholder:text-zinc-600"
                    />
                    <div className="mt-2 border-t border-white/5 pt-2 text-right text-[10px] font-semibold text-zinc-600">
                      {form.description.length}/500
                    </div>
                  </div>
                </div>
              </div>

              <button 
                disabled={isLoading || !selectedItem} 
                className="site-btn site-btn-primary mt-5 w-full py-4 text-sm"
              >
                {isLoading ? "등록 중..." : relistSourceId ? "새 경매로 다시 등록" : "아이템 등록하기"}
              </button>
            </section>
          </aside>

          <div className="lg:col-span-8">
            <AnimatePresence mode="wait">
              {selectedItem ? (
                <motion.section 
                  key={selectedItem.id} 
                  initial={{ opacity: 0, x: 10 }} 
                  animate={{ opacity: 1, x: 0 }} 
                  exit={{ opacity: 0, x: -10 }} 
                  className="site-card p-4 md:p-5 rounded-[28px] min-h-[520px]"
                >
                  <div className="flex items-center gap-4 mb-5 bg-white/[0.03] p-4 rounded-[24px] border border-white/5">
                    <div className="w-14 h-14 bg-black/40 rounded-2xl flex items-center justify-center border border-white/5 shrink-0">
                      {/* 🛠️ [패치 적용] */}
                      <img src={getSecureUrl(selectedItem.iconUrl)} className="w-9 h-9 pixel-art" alt="" />
                    </div>
                    <div>
                      <h3 className="text-xl md:text-2xl font-extrabold tracking-[-0.04em] uppercase">{selectedItem.name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-blue-400 font-extrabold text-[10px] uppercase tracking-[0.12em]">분류: {selectedItem.category}</span>
                        <div className="w-1 h-1 rounded-full bg-zinc-800" />
                        <span className="text-zinc-600 font-extrabold text-[10px] tracking-[0.12em]">ID: #{selectedItem.id}</span>
                      </div>
                    </div>
                  </div>

                  <div className="custom-scrollbar overflow-y-auto max-h-[470px] pr-2 space-y-6">
                    {category === "WILD" && (
                      <div className="space-y-6">
                        <div className="space-y-3">
                          <div className="text-[10px] font-extrabold text-blue-400 uppercase tracking-[0.14em] border-l-2 border-blue-500 pl-3">
                            일반 인챈트
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 xl:grid-cols-6 gap-1.5">
                            {WILD_BASE.map(([name, max]) => (
                              <button key={name as string} type="button" onClick={() => toggleOption('enchantments', name as string, max as number)} 
                                className={`min-h-[34px] flex items-center justify-between px-2.5 py-1.5 rounded-lg border transition-all ${form.enchantments[name as string] ? "bg-blue-600 border-blue-400 text-white shadow-lg shadow-blue-600/10" : "bg-white/[0.035] border-white/5 text-zinc-500 hover:bg-white/10 hover:text-zinc-200"}`}>
                                <span className="font-semibold text-[10px]">{name as string}</span>
                                {form.enchantments[name as string] && <span className="font-extrabold text-[9px] bg-white/20 px-1.5 py-0.5 rounded-md">{form.enchantments[name as string]}</span>}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="space-y-3">
                          <div className="text-[10px] font-extrabold text-red-400 uppercase tracking-[0.14em] border-l-2 border-red-500 pl-3">
                            특수 인챈트
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 xl:grid-cols-6 gap-1.5">
                            {WILD_SPECIAL.map(([name, max]) => (
                              <button key={name as string} type="button" onClick={() => toggleOption('enchantments', name as string, max as number)}
                                className={`min-h-[34px] flex items-center justify-between px-2.5 py-1.5 rounded-lg border transition-all ${form.enchantments[name as string] ? "bg-red-600 border-red-400 text-white shadow-lg shadow-red-600/10" : "bg-white/[0.035] border-white/5 text-zinc-500 hover:bg-white/10 hover:text-zinc-200"}`}>
                                <span className="font-semibold text-[10px]">{name as string}</span>
                                {form.enchantments[name as string] && <span className="font-extrabold text-[9px] bg-white/20 px-1.5 py-0.5 rounded-md">{form.enchantments[name as string]}</span>}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {category === "ISLAND" && (
                      <div className="space-y-6">
                        <div className="max-w-xs space-y-3">
                          <div className="text-[10px] font-extrabold text-yellow-400 uppercase tracking-[0.14em] border-l-2 border-yellow-500 pl-3">
                            아이템 강화 +{form.enhancementLevel}
                          </div>
                          <div className="bg-yellow-500/5 border border-yellow-500/20 p-4 rounded-2xl flex items-center gap-4">
                            <span className="text-2xl font-extrabold italic text-yellow-500 w-10">+{form.enhancementLevel}</span>
                            <input type="range" min="0" max="15" value={form.enhancementLevel} onChange={e => { triggerHaptic(); setForm({...form, enhancementLevel: parseInt(e.target.value)}); }} className="calc-range calc-range-yellow flex-1" />
                          </div>
                        </div>
                        <div className="space-y-3">
                          <div className="text-[10px] font-extrabold text-zinc-500 uppercase tracking-[0.14em] border-l-2 border-white/10 pl-3">
                            각인 옵션
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-1.5">
                            {ISLAND_IMPRINTS.map(name => (
                              <button key={name} type="button" onClick={() => toggleOption('imprints', name, 5)} className={`min-h-[34px] flex items-center justify-between px-2.5 py-1.5 rounded-lg border transition-all ${form.imprints[name] ? "bg-yellow-500 border-yellow-400 text-black shadow-lg shadow-yellow-500/10" : "bg-white/[0.035] border-white/5 text-zinc-500 hover:bg-white/10 hover:text-zinc-200"}`}>
                                <span className="font-semibold text-[10px]">{name}</span>
                                {form.imprints[name] && <span className="font-extrabold text-[9px] bg-black/10 px-1.5 py-0.5 rounded-md">LV.{form.imprints[name]}</span>}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {category === "RPG" && (
                      <div className="space-y-6">
                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
                          <div className="space-y-3">
                            <div className="text-[10px] font-extrabold text-cyan-400 uppercase tracking-[0.14em] border-l-2 border-cyan-500 pl-3">강화 랭크 / +{form.enhancementLevel}</div>
                            <div className="flex gap-1.5 p-1 bg-white/5 rounded-xl border border-white/5">
                              {["입문", "견습", "정예", "영웅"].map(rank => (
                                <button key={rank} type="button" onClick={() => { triggerHaptic(); setForm({...form, enhancementRank: rank}); }} className={`min-h-[32px] flex-1 py-1.5 rounded-md text-[10px] font-extrabold transition-all ${form.enhancementRank === rank ? "bg-cyan-600 text-white shadow-lg" : "text-zinc-600 hover:text-zinc-300"}`}>{rank}</button>
                              ))}
                            </div>
                            <div className="flex items-center gap-4 bg-black/40 p-4 rounded-2xl border border-white/5 mt-2">
                              <span className="text-2xl font-extrabold text-cyan-500 italic w-10">+{form.enhancementLevel}</span>
                              <input type="range" min="0" max="15" value={form.enhancementLevel} onChange={e => { triggerHaptic(); setForm({...form, enhancementLevel: parseInt(e.target.value)}); }} className="calc-range calc-range-cyan flex-1" />
                            </div>
                          </div>
                          
                          <div className="space-y-3">
                            <div className="text-[10px] font-extrabold text-orange-400 uppercase tracking-[0.14em] border-l-2 border-orange-500 pl-3">룬 장착</div>
                            <div className="grid grid-cols-3 gap-2">
                              {[0, 1, 2].map(idx => (
                                <button key={idx} type="button" onClick={() => { triggerHaptic(); setActiveRuneSlot(activeRuneSlot === idx ? null : idx); }} className={`relative aspect-square rounded-xl border flex flex-col items-center justify-center transition-all ${activeRuneSlot === idx ? 'border-orange-500 bg-orange-500/10 shadow-[0_0_10px_rgba(249,115,22,0.1)]' : 'bg-black/40 border-white/5 hover:border-white/10'}`}>
                                  {form.runes[idx].type ? (
                                    <div className="text-center p-1">
                                      <div className="text-[7px] font-extrabold text-orange-500 uppercase">{form.runes[idx].grade}</div>
                                      <div className="text-[10px] font-extrabold text-zinc-200 leading-tight">{form.runes[idx].type.replace("의룬", "")}</div>
                                    </div>
                                  ) : (
                                    <div className="w-5 h-5 border border-zinc-800 rotate-45 flex items-center justify-center opacity-30">
                                      <div className="w-1 h-1 bg-zinc-800 rounded-full" />
                                    </div>
                                  )}
                                  <div className="absolute bottom-1.5 text-[7px] font-extrabold text-zinc-700">SLOT {idx+1}</div>
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>

                        <AnimatePresence>
                          {activeRuneSlot !== null && (
                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="bg-orange-500/[0.03] border border-orange-500/20 rounded-2xl p-5 space-y-5 overflow-hidden">
                              <div className="flex justify-between items-center">
                                <div className="text-[10px] font-extrabold text-orange-400 uppercase tracking-[0.14em] flex items-center gap-2">룬 설정 #{activeRuneSlot + 1}</div>
                                <button type="button" onClick={() => setActiveRuneSlot(null)} className="text-[10px] font-extrabold text-zinc-600 hover:text-white transition-colors">닫기</button>
                              </div>
                              <div className="space-y-3">
                                <div className="text-[10px] font-extrabold text-zinc-600 ml-1">룬 등급</div>
                                <div className="flex gap-1.5">{RUNE_GRADES.map(g => (<button key={g} type="button" onClick={() => updateRune(g)} className={`min-h-[32px] flex-1 py-1.5 rounded-md text-[10px] font-extrabold transition-all ${form.runes[activeRuneSlot!].grade === g ? 'bg-orange-500 text-black' : 'bg-white/[0.035] border border-white/5 text-zinc-600 hover:text-zinc-300'}`}>{g}</button>))}</div>
                              </div>
                              <div className="space-y-3">
                                <div className="text-[10px] font-extrabold text-zinc-600 ml-1">룬 종류</div>
                                <div className="grid grid-cols-4 gap-1.5">{RUNE_TYPES.slice(0, 8).map(t => (<button key={t} type="button" onClick={() => updateRune(undefined, t)} className={`min-h-[32px] py-1.5 rounded-md text-[10px] font-semibold transition-all border ${form.runes[activeRuneSlot!].type === t ? 'bg-zinc-100 text-black border-white' : 'bg-black/40 border-white/5 text-zinc-600 hover:text-zinc-300'}`}>{t.replace("의룬", "")}</button>))}</div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>

                        <div className="space-y-3">
                          <div className="text-[10px] font-extrabold text-purple-400 uppercase tracking-[0.14em] border-l-2 border-purple-500 pl-3">
                            전투 스킬
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 xl:grid-cols-6 gap-1.5">
                            {currentWeaponSkills.map(name => (
                              <button key={name} type="button" onClick={() => toggleOption('skills', name, 7)} className={`min-h-[34px] flex items-center justify-between px-2.5 py-1.5 rounded-lg border transition-all ${form.skills[name] ? "bg-purple-600 border-purple-400 text-white shadow-lg shadow-purple-600/10" : "bg-white/[0.035] border-white/5 text-zinc-500 hover:bg-white/10 hover:text-zinc-200"}`}>
                                <span className="font-semibold text-[10px] truncate">{name}</span>
                                {form.skills[name] && <span className="font-extrabold text-[9px] bg-white/20 px-1.5 py-0.5 rounded-md">Lv.{form.skills[name]}</span>}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </motion.section>
              ) : (
              <div className="h-[520px] border border-dashed border-white/5 bg-white/[0.015] rounded-[28px] flex flex-col items-center justify-center px-6 text-center">
                <div className="text-sm font-extrabold tracking-tight text-zinc-300">아이템을 선택해주세요</div>
                <p className="mt-2 max-w-sm text-xs font-medium leading-relaxed text-zinc-500 break-keep">
                  등록할 아이템을 선택하면 카테고리에 맞는 강화, 인챈트, 각인, 스킬 옵션을 설정할 수 있습니다.
                </p>
                </div>
              )}
            </AnimatePresence>
          </div>
        </motion.form>
      </main>

      <SiteFooter />
    </div>
  );
}