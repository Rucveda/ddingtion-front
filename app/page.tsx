"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { request } from "@/utils/api"; 
import NoticePopup from "@/components/NoticePopup";
import PostEditor from "@/app/post/PostEditor";

interface Auction {
  id: number;
  currentPrice: number;
  endTime: string;
  status: string;
  item: { name: string; iconUrl: string; category: string; };
  seller: { ingameName: string; };
}

interface User { id: number; ingameName: string; role: string; }

export default function Home() {
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [particles, setParticles] = useState<{ id: number; x: number; y: number; size: number }[]>([]);
  const [activeTab, setActiveTab] = useState<"MARKET" | "WRITE">("MARKET");
  const [searchQuery, setSearchQuery] = useState("");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [activeFilters, setActiveFilters] = useState({ category: "ALL" });
  const filterRef = useRef<HTMLDivElement>(null);

  const triggerHaptic = useCallback(() => {
    if (typeof window !== "undefined" && window.navigator?.vibrate) {
      window.navigator.vibrate(10);
    }
  }, []);

  const formatGold = (amount: number) => {
    if (amount >= 100000000) {
      const eok = Math.floor(amount / 100000000);
      const man = Math.floor((amount % 100000000) / 10000);
      return man > 0 ? `${eok.toLocaleString()}억 ${man.toLocaleString()}만` : `${eok.toLocaleString()}억`;
    }
    if (amount >= 10000) return `${Math.floor(amount / 10000).toLocaleString()}만`;
    return amount.toLocaleString();
  };

  const triggerGoldExplosion = () => {
    triggerHaptic();
    const particleCount = 20;
    const newParticles = Array.from({ length: particleCount }).map((_, i) => {
      const angle = (i / particleCount) * Math.PI * 2;
      const velocity = 100 + Math.random() * 250;
      return { id: Date.now() + i, x: Math.cos(angle) * velocity, y: Math.sin(angle) * velocity, size: Math.random() * 4 + 2 };
    });
    setParticles(newParticles);
    setTimeout(() => setParticles([]), 800);
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    const storedUser = localStorage.getItem("user");
    setIsLoggedIn(!!token);
    if (storedUser) {
      try {
        const parsedUser: User = JSON.parse(storedUser);
        setUserRole(parsedUser.role ? parsedUser.role.toUpperCase() : "USER");
      } catch (e) { console.error(e); }
    }
    const fetchAuctions = async () => {
      const data = await request("/api/auctions");
      if (Array.isArray(data)) {
        const now = new Date();
        setAuctions(data.filter((a: Auction) => a.status === "ACTIVE" && new Date(a.endTime) > now));
      }
    };
    fetchAuctions();
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) setIsFilterOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredAuctions = useMemo(() => {
    return auctions.filter((a) => {
      const matchesSearch = a.item.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = activeFilters.category === "ALL" || a.item.category === activeFilters.category;
      return matchesSearch && matchesCategory;
    });
  }, [auctions, searchQuery, activeFilters]);

  const filterOptions = useMemo(() => {
    const cats = Array.from(new Set(auctions.map((a) => a.item.category)));
    return [{ key: "category", label: "카테고리", options: ["ALL", ...cats] }];
  }, [auctions]);

  const handleLogout = () => {
    triggerHaptic();
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.reload();
  };

  return (
    // 💡 flex flex-col 및 min-h-screen으로 하단 푸터 밀림 방지
    <div className="min-h-screen flex flex-col bg-[#010101] text-zinc-100 font-sans select-none overflow-x-hidden relative selection:bg-white selection:text-black">
      
      <style jsx global>{`
        @keyframes prismPan { 0% { background-position: 0% center; } 100% { background-position: 200% center; } }
        .prism-text-overlay { position: relative; display: inline-block; color: rgba(255, 255, 255, 0.9); }
        .prism-text-overlay::after {
          content: attr(data-text); position: absolute; left: 0; top: 0; width: 100%; height: 100%;
          background: linear-gradient(135deg, transparent 25%, rgba(255,100,100,0.5) 35%, rgba(255,200,100,0.5) 45%, rgba(100,255,100,0.5) 55%, rgba(100,200,255,0.5) 65%, rgba(200,100,255,0.5) 75%, transparent 85%);
          background-size: 200% auto; background-clip: text; -webkit-background-clip: text; color: transparent;
          animation: prismPan 5s ease-in-out infinite; opacity: 0.5; filter: blur(0.3px); transition: opacity 0.4s ease;
        }
        .prism-text-overlay:hover::after { opacity: 1; filter: blur(0px) brightness(1.5); }
        @keyframes drift { 0% { transform: translate(-5%, -5%) scale(1); opacity: 0.5; } 50% { transform: translate(5%, 5%) scale(1.1); opacity: 0.8; } 100% { transform: translate(-5%, -5%) scale(1); opacity: 0.5; } }
        .premium-abyss-bg { position: fixed; inset: -15%; z-index: 0; background: radial-gradient(circle at 20% 30%, rgba(59, 130, 246, 0.15) 0%, transparent 40%), radial-gradient(circle at 80% 20%, rgba(239, 68, 68, 0.1) 0%, transparent 40%), radial-gradient(circle at 50% 80%, rgba(34, 197, 94, 0.1) 0%, transparent 40%), radial-gradient(circle at 70% 70%, rgba(234, 179, 8, 0.1) 0%, transparent 40%), #010101; filter: blur(80px); animation: drift 18s ease-in-out infinite; pointer-events: none; }
        .pixel-art { image-rendering: pixelated; image-rendering: crisp-edges; }
        .bg-texture { position: fixed; inset: 0; z-index: 1; opacity: 0.4; pointer-events: none; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='4' height='4' viewBox='0 0 4 4'%3E%3Cpath fill='%23ffffff' fill-opacity='0.08' d='M1 3h1v1H1V3zm2-2h1v1H2V1z'%3E%3C/path%3E%3C/svg%3E"); }
        .on-air-glow { box-shadow: 0 0 25px rgba(220, 38, 38, 0.6); text-shadow: 0 0 5px white; }
      `}</style>

      <div className="premium-abyss-bg" />
      <div className="bg-texture" />
      <NoticePopup />

      <nav className="sticky top-0 z-50 border-b border-white/5 bg-black/40 backdrop-blur-2xl">
        <div className="max-w-7xl mx-auto px-6 h-20 flex justify-between items-center relative z-10">
          {/* 좌측 로고 영역 */}
          <Link href="/" onClick={() => { triggerHaptic(); setActiveTab("MARKET"); }} className="flex items-center group shrink-0">
            <span className="text-3xl font-black tracking-tighter transition-transform group-hover:scale-105">
              <span className="text-[#3b82f6]">D</span><span className="text-[#eab308]">D</span>
              <span className="text-[#3b82f6]">I</span><span className="text-[#22c55e]">N</span>
              <span className="text-[#eab308]">G</span><span className="text-[#ef4444]">T</span>
              <span className="text-[#3b82f6]">I</span><span className="text-[#22c55e]">O</span>
              <span className="text-[#ef4444]">N</span>
            </span>
          </Link>

          {/* 💡 [패치] 중앙/우측 통합 네비게이션 정렬 */}
          <div className="flex items-center gap-10 font-bold text-sm">
            {/* 메인 서비스 탭 */}
            <div className="flex items-center gap-8 border-r border-white/10 pr-10">
              <button 
                onClick={() => { triggerHaptic(); setActiveTab("MARKET"); }}
                className={`text-[11px] font-black uppercase tracking-[0.2em] transition-colors ${activeTab === "MARKET" ? "text-white" : "text-zinc-600 hover:text-zinc-400"}`}
              >
                AUCTION
              </button>
              <button 
                onClick={() => { triggerHaptic(); setActiveTab("WRITE"); }}
                className={`text-[11px] font-black uppercase tracking-[0.2em] transition-colors ${activeTab === "WRITE" ? "text-blue-500" : "text-zinc-600 hover:text-zinc-400"}`}
              >
                COMMUNITY
              </button>
            </div>

            {/* 유틸리티 메뉴 */}
            <div className="flex items-center gap-8">
              <Link href="/market" onClick={triggerHaptic} className="flex items-center gap-2 group">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse shadow-[0_0_8px_#3b82f6]" />
                <span className="text-blue-500 group-hover:text-white transition-colors duration-200 uppercase tracking-widest text-[11px] font-black">실시간 시세</span>
              </Link>

              <AnimatePresence mode="wait">
                {isLoggedIn ? (
                  <motion.div key="logged-in" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.1 }} className="flex items-center gap-8">
                    <Link href="/sell" className="text-zinc-400 hover:text-cyan-400 transition-colors duration-200">경매등록</Link>
                    <Link href="/mypage" className="text-zinc-400 hover:text-white transition-colors duration-200">마이페이지</Link>
                    {userRole === "ADMIN" && (
                      <Link href="/admin" onClick={triggerHaptic} className="text-[10px] font-black text-red-500 px-3 py-1.5 border border-red-500/20 bg-red-500/5 rounded-lg tracking-widest leading-none">ADMIN</Link>
                    )}
                    <button onClick={handleLogout} className="text-red-500/60 hover:text-red-400 transition-colors duration-200 font-bold">LOGOUT</button>
                  </motion.div>
                ) : (
                  <motion.div key="logged-out" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-6">
                    <Link href="/login" className="text-sm font-bold text-zinc-400 hover:text-white">로그인</Link>
                    <Link href="/register" className="bg-white text-black px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-cyan-500 transition-all active:scale-95">회원가입</Link>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </nav>

      {/* 💡 [패치] flex-1을 부여하여 컨텐츠가 없어도 푸터를 아래로 고정, 밝기 문제 방지 */}
      <main className="flex-1 relative z-10">
        <AnimatePresence mode="wait">
          {activeTab === "MARKET" ? (
            <motion.div 
              key="market-view"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <header className="relative py-32 overflow-visible z-10">
                <div className="max-w-7xl mx-auto px-6 relative z-10">
                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1 }}>
                    <div className="inline-flex items-center gap-2 mb-12 overflow-hidden rounded-md border border-white/10 bg-black/70 shadow-2xl relative z-10">
                      <div className="bg-red-600 px-4 py-2 flex items-center gap-2.5 on-air-glow animate-pulse">
                        <div className="w-2.5 h-2.5 rounded-full bg-white shadow-[0_0_10px_white]" />
                        <span className="text-[12px] font-black text-white tracking-widest uppercase">LIVE ON-AIR</span>
                      </div>
                      <div className="px-5 py-2 text-[11px] font-black text-zinc-400 tracking-widest uppercase relative z-10">Global Auction Server #1</div>
                    </div>
                    
                    <h1 className="text-8xl font-black mb-8 tracking-tighter leading-[1.05] text-zinc-100 relative">
                      <span className="relative inline-block">
                        <motion.span onHoverStart={triggerGoldExplosion} whileHover={{ color: "#facc15", textShadow: "0px 0px 40px rgba(250, 204, 21, 0.8)", scale: 1.03 }} className="cursor-pointer transition-all duration-300 relative z-20 inline-block">귀중한 아이템</motion.span>
                        <AnimatePresence>
                          {particles.map((p) => (
                            <motion.span key={p.id} initial={{ opacity: 1, x: 0, y: 0, scale: 1 }} animate={{ opacity: 0, x: p.x, y: p.y, scale: 0, rotate: Math.random() * 360 }} exit={{ opacity: 0 }} transition={{ duration: 0.7, ease: [0.1, 0.8, 0.3, 1] }} className="absolute top-1/2 left-1/2 pointer-events-none z-10" style={{ width: p.size, height: p.size }}>
                              <div className="w-full h-full bg-gradient-to-br from-[#fef3c7] via-[#facc15] to-[#b45309] rounded-full shadow-[0_0_12px_rgba(250,204,21,0.9)]" />
                            </motion.span>
                          ))}
                        </AnimatePresence>
                      </span>
                      <span className="ml-4">을 거래하는</span><br />
                      <motion.span className="prism-text-overlay italic relative cursor-pointer" data-text="가장 현명한 방법." whileHover={{ scale: 1.01 }}>가장 현명한 방법.</motion.span>
                    </h1>
                    <p className="text-zinc-500 max-w-xl font-medium text-lg leading-relaxed shadow-lg relative z-10">실시간 시세를 반영한 예측 엔진, 유저가 직접 시세를 입력하는 계산기와 함께<br />거래에 오랜시간이 걸리는 고가치 아이템들의 실시간 경매를 지금 시작하세요.</p>
                  </motion.div>
                </div>
              </header>

              <div className="max-w-7xl mx-auto px-6 pb-40">
                <div className="mt-20 mb-16 flex gap-4 items-center border-b border-white/5 pb-12">
                  <div className="relative flex-1">
                    <input type="text" placeholder="찾으시는 물품의 이름을 입력하세요..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-white/5 border border-white/10 p-5 pl-14 rounded-2xl text-lg font-bold outline-none focus:border-cyan-500/50 transition-all placeholder:text-zinc-700" />
                    <span className="absolute left-6 top-1/2 -translate-y-1/2 text-xl opacity-30">🔍</span>
                  </div>

                  <div className="relative" ref={filterRef}>
                    <button onClick={() => { triggerHaptic(); setIsFilterOpen(!isFilterOpen); }} className={`h-[68px] px-8 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-3 transition-all border ${isFilterOpen || activeFilters.category !== "ALL" ? "bg-white text-black border-white" : "bg-white/5 text-zinc-500 border-white/5 hover:border-white/20"}`}>
                      <span>FILTER</span>
                      <span className={`transition-transform duration-300 ${isFilterOpen ? "rotate-180" : ""}`}>▼</span>
                    </button>
                    <AnimatePresence>
                      {isFilterOpen && (
                        <motion.div initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.95 }} className="absolute right-0 mt-4 w-72 bg-[#121214] border border-white/10 rounded-[32px] p-6 shadow-2xl z-50 backdrop-blur-xl">
                          {filterOptions.map((group) => (
                            <div key={group.key} className="space-y-4">
                              <div className="text-[10px] font-black text-zinc-600 uppercase tracking-widest px-2">{group.label}</div>
                              <div className="grid grid-cols-1 gap-2">
                                {group.options.map((opt) => (
                                  <button key={opt} onClick={() => { triggerHaptic(); setActiveFilters({ ...activeFilters, [group.key]: opt }); }} className={`text-left px-4 py-3 rounded-xl text-xs font-bold transition-all ${activeFilters.category === opt ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20" : "text-zinc-500 hover:bg-white/5 hover:text-zinc-300"}`}>{opt}</button>
                                ))}
                              </div>
                            </div>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-12">
                  {filteredAuctions.length > 0 ? (
                    filteredAuctions.map((auction) => (
                      <Link href={`/auction/${auction.id}`} onClick={triggerHaptic} key={auction.id} className="group relative">
                        <div className="absolute -inset-[1px] bg-gradient-to-b from-white/10 to-transparent rounded-[38px] opacity-100" />
                        <div className="relative bg-[#0d0d0f]/70 backdrop-blur-md border border-white/5 rounded-[36px] overflow-hidden group-hover:bg-[#121214]/80 transition-all duration-500 group-hover:-translate-y-3 shadow-2xl">
                          <div className="aspect-square bg-gradient-to-b from-white/[0.02] to-transparent flex items-center justify-center relative p-12 border-b border-white/5">
                            {auction.item.iconUrl ? (
                              <img src={auction.item.iconUrl} className="w-full h-full object-contain pixel-art group-hover:scale-110 transition-transform duration-700 ease-out" alt="" />
                            ) : (
                              <span className="text-8xl">📦</span>
                            )}
                            <div className="absolute top-6 left-6">
                              <span className="px-3 py-1 bg-white/5 backdrop-blur-md rounded-lg text-[9px] font-black text-zinc-500 border border-white/10 uppercase tracking-widest">{auction.item.category}</span>
                            </div>
                          </div>
                          <div className="p-8 pt-0 mt-10">
                            <h3 className="text-2xl font-bold mb-3 truncate group-hover:text-cyan-400 transition-colors tracking-tighter">{auction.item.name}</h3>
                            <div className="flex items-center gap-2 mb-8 opacity-60">
                              <div className="w-5 h-5 rounded-full bg-zinc-800 flex items-center justify-center text-[8px]">👤</div>
                              <span className="text-sm font-bold truncate">{auction.seller.ingameName}</span>
                            </div>
                            <div className="bg-black/50 p-5 rounded-2xl border border-white/5 shadow-inner">
                              <div className="flex flex-col gap-3">
                                <div>
                                  <p className="text-[9px] font-black text-zinc-600 uppercase mb-1">Current Bid</p>
                                  <span className="text-2xl font-black text-yellow-400 font-mono italic">{formatGold(auction.currentPrice)}</span>
                                </div>
                                <div className="h-[1px] w-full bg-white/5" />
                                <div className="flex justify-between items-center">
                                  <p className="text-[9px] font-black text-zinc-600 uppercase">Closing Time</p>
                                  <p className="text-xs font-bold text-zinc-400 uppercase">{new Date(auction.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </Link>
                    ))
                  ) : (
                    <div className="col-span-full py-40 text-center border-2 border-dashed border-white/5 rounded-[48px] bg-white/[0.01]">
                      <p className="text-zinc-600 text-lg font-bold italic tracking-widest uppercase opacity-50">{searchQuery ? "검색 결과가 없습니다." : "진행 중인 경매가 없습니다."}</p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key="write-view"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="pt-20 pb-40"
            >
              <PostEditor userRole={userRole || "USER"} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className="border-t border-white/5 py-20 bg-black/40 backdrop-blur-md relative z-10 mt-auto">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-8">
          <p className="text-zinc-700 text-[10px] font-black uppercase tracking-[0.4em]">© 2026 DDINGTION. ELITE AUCTION HOUSE.</p>
          <div className="flex gap-8 text-zinc-600 text-[10px] font-black uppercase tracking-widest">
            <span onClick={triggerHaptic} className="hover:text-white cursor-pointer transition-colors">Terms</span>
            <span onClick={triggerHaptic} className="hover:text-white cursor-pointer transition-colors">Privacy</span>
            <span onClick={triggerHaptic} className="hover:text-white cursor-pointer transition-colors">Support</span>
          </div>
        </div>
      </footer>
    </div>
  );
}