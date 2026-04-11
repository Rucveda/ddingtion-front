"use client";

import { useEffect, useState, useCallback, useMemo, useRef, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { request } from "@/utils/api";
import NoticePopup from "@/components/NoticePopup";
import PostEditor from "@/app/post/PostEditor";
import MarketTab from "@/app/market/page";

interface Auction {
  id: number;
  currentPrice: number;
  endTime: string;
  status: string;
  item: { name: string; iconUrl: string; category: string; };
  seller: { ingameName: string; };
}

interface User { id: number; ingameName: string; role: string; }

type TabType = "HOME" | "NOTICE" | "CALCULATOR" | "AUCTION";

/**
 * 🛠️ [패치] HomeComponent: 실제 로직이 담긴 컴포넌트
 */
function HomeComponent() {
  const searchParams = useSearchParams();
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [particles, setParticles] = useState<{ id: number; x: number; y: number; size: number }[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>("HOME");
  const [marketSubTab, setMarketSubTab] = useState<"SEARCH" | "CALC" | "ETC" | "ADMIN">("SEARCH");
  const [searchQuery, setSearchQuery] = useState("");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [activeFilters, setActiveFilters] = useState({ category: "ALL" });
  const filterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab === "AUCTION" || tab === "NOTICE" || tab === "CALCULATOR") {
      setActiveTab(tab as TabType);
    }
  }, [searchParams]);

  const getSecureUrl = (url: string) => {
    if (!url) return "";
    return url.replace("http://", "https://");
  };

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

      <nav className="sticky top-0 z-[100] border-b border-white/5 bg-black/60 backdrop-blur-2xl">
        <div className="max-w-7xl mx-auto px-6 relative">
          <div className="h-20 flex justify-between items-center">
            <button onClick={() => { triggerHaptic(); setActiveTab("HOME"); }} className="flex items-center group shrink-0">
              <span className="text-3xl font-black tracking-tighter transition-transform group-hover:scale-105">
                <span className="text-[#3b82f6]">D</span><span className="text-[#eab308]">D</span>
                <span className="text-[#3b82f6]">I</span><span className="text-[#22c55e]">N</span>
                <span className="text-[#eab308]">G</span><span className="text-[#ef4444]">T</span>
                <span className="text-[#3b82f6]">I</span><span className="text-[#22c55e]">O</span>
                <span className="text-[#ef4444]">N</span>
              </span>
            </button>

            <div className="flex items-center gap-10">
              <div className="flex items-center gap-8">
                {(["NOTICE", "CALCULATOR", "AUCTION"] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => { triggerHaptic(); setActiveTab(tab); }}
                    className={`text-[11px] font-black uppercase tracking-[0.2em] transition-all duration-300 ${activeTab === tab ? "text-blue-500 scale-110" : "text-zinc-600 hover:text-zinc-400"}`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-6 border-l border-white/10 pl-10">
                {isLoggedIn ? (
                  <div className="flex items-center gap-6">
                    {userRole === "ADMIN" && (
                      <Link href="/admin" onClick={triggerHaptic} className="text-[10px] font-black text-red-500 px-3 py-1.5 border border-red-500/20 bg-red-500/5 rounded-lg tracking-widest leading-none">ADMIN</Link>
                    )}
                    <button onClick={handleLogout} className="text-red-500/60 hover:text-red-400 text-[10px] font-black tracking-widest">LOGOUT</button>
                  </div>
                ) : (
                  <Link href="/login" className="text-[10px] font-black text-zinc-400 hover:text-white tracking-widest">LOGIN</Link>
                )}
              </div>
            </div>
          </div>

          <div className="absolute left-0 right-0 top-full overflow-visible pointer-events-none">
            <AnimatePresence mode="wait">
              {activeTab === "AUCTION" && (
                <motion.div
                  key="auction-sub"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                  className="w-full bg-gradient-to-b from-black/40 to-transparent pointer-events-none"
                >
                  <div className="max-w-7xl mx-auto px-6 py-4 flex justify-end gap-8 pointer-events-auto">
                    <Link href="/sell" className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-500 hover:text-cyan-400 transition-all duration-200">LISTING</Link>
                    <Link href="/mypage" className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-500 hover:text-white transition-all duration-200">MY PAGE</Link>
                  </div>
                </motion.div>
              )}

              {activeTab === "CALCULATOR" && (
                <motion.div
                  key="calc-sub"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                  className="w-full bg-gradient-to-b from-black/40 to-transparent pointer-events-none"
                >
                  <div className="max-w-7xl mx-auto px-6 py-4 flex justify-end gap-8 pointer-events-auto">
                    {[
                      { id: "SEARCH", label: "ANALYSIS" },
                      { id: "CALC", label: "SIMULATOR" },
                      { id: "ETC", label: "MARKET" }
                    ].map((st) => (
                      <button
                        key={st.id}
                        onClick={() => { triggerHaptic(); setMarketSubTab(st.id as any); }}
                        className={`text-[11px] font-black uppercase tracking-[0.2em] transition-all duration-200 ${marketSubTab === st.id ? "text-blue-500" : "text-zinc-500 hover:text-white"
                          }`}
                      >
                        {st.label}
                      </button>
                    ))}
                    {userRole === "ADMIN" && (
                      <button onClick={() => setMarketSubTab("ADMIN")} className={`text-[11px] font-black uppercase tracking-[0.2em] transition-all duration-200 ${marketSubTab === "ADMIN" ? "text-red-500" : "text-red-900/40 hover:text-red-500"}`}>ADMIN</button>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </nav>

      <main className="flex-1 relative z-10">
        <AnimatePresence mode="wait">
          {activeTab === "HOME" && (
            <motion.div key="home-view" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="max-w-7xl mx-auto px-6 py-40">
              <div className="max-w-4xl"> {/* 텍스트 폭을 조금 더 넓게 확보 */}
                <h1 className="text-5xl md:text-7xl font-black mb-8 tracking-tighter leading-tight whitespace-nowrap">
                  띵타이쿤 <span className="text-blue-500">강화 계산기</span>,<br />
                  <span className="inline-block">띵션에 오신 것을 환영합니다.</span>
                </h1>
                <p className="text-zinc-400 text-lg md:text-xl font-medium leading-relaxed mb-12 whitespace-nowrap">
                  가치 있는 장비들의 시세를 계산 및 분석하고,<br />
                  경매를 통한 최적의 거래 기회를 찾아드립니다.
                </p>
                <div className="flex gap-4">
                  <button onClick={() => setActiveTab("AUCTION")} className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-4 rounded-2xl font-black transition-all shadow-xl shadow-blue-600/20 whitespace-nowrap">경매 BETA</button>
                  <button onClick={() => setActiveTab("CALCULATOR")} className="bg-zinc-800 hover:bg-zinc-700 text-white px-8 py-4 rounded-2xl font-black transition-all whitespace-nowrap">강화 계산기</button>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === "AUCTION" && (
            <motion.div key="auction-view" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <header className="relative py-32 overflow-visible">
                <div className="max-w-7xl mx-auto px-6">
                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
                    <div className="inline-flex items-center gap-2 mb-12 overflow-hidden rounded-md border border-white/10 bg-black/70 shadow-2xl">
                      <div className="bg-red-600 px-4 py-2 flex items-center gap-2.5 on-air-glow animate-pulse">
                        <div className="w-2.5 h-2.5 rounded-full bg-white" />
                        <span className="text-[12px] font-black text-white tracking-widest uppercase">LIVE ON-AIR</span>
                      </div>
                      <div className="px-5 py-2 text-[11px] font-black text-zinc-400 tracking-widest uppercase">Global Auction Server #1</div>
                    </div>

                    <h1 className="text-8xl font-black mb-8 tracking-tighter leading-[1.05]">
                      <span className="relative inline-block">
                        <motion.span onHoverStart={triggerGoldExplosion} whileHover={{ color: "#facc15", scale: 1.03 }} className="cursor-pointer transition-all duration-300 relative z-20">귀중한 아이템</motion.span>
                        <AnimatePresence>
                          {particles.map((p) => (
                            <motion.span key={p.id} initial={{ opacity: 1, x: 0, y: 0 }} animate={{ opacity: 0, x: p.x, y: p.y, scale: 0 }} transition={{ duration: 0.7 }} className="absolute top-1/2 left-1/2 pointer-events-none z-10" style={{ width: p.size, height: p.size }}>
                              <div className="w-full h-full bg-[#facc15] rounded-full shadow-[0_0_12px_#facc15]" />
                            </motion.span>
                          ))}
                        </AnimatePresence>
                      </span>
                      <span className="ml-4">을 거래하는</span><br />
                      <motion.span className="prism-text-overlay italic" data-text="가장 현명한 방법.">가장 현명한 방법.</motion.span>
                    </h1>
                  </motion.div>
                </div>
              </header>

              <div className="max-w-7xl mx-auto px-6 pb-40">
                <div className="mb-16 flex gap-4 items-center border-b border-white/5 pb-12">
                  <div className="relative flex-1">
                    <input type="text" placeholder="찾으시는 물품의 이름을 입력하세요..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-white/5 border border-white/10 p-5 pl-14 rounded-2xl text-lg font-bold outline-none focus:border-cyan-500/50 transition-all placeholder:text-zinc-700" />
                    <span className="absolute left-6 top-1/2 -translate-y-1/2 opacity-30 text-xl">🔍</span>
                  </div>
                  <div className="relative" ref={filterRef}>
                    <button onClick={() => { triggerHaptic(); setIsFilterOpen(!isFilterOpen); }} className={`h-[68px] px-8 rounded-2xl font-black text-xs transition-all border ${isFilterOpen ? "bg-white text-black" : "bg-white/5 text-zinc-500 border-white/5"}`}>FILTER ▼</button>
                    <AnimatePresence>
                      {isFilterOpen && (
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="absolute right-0 mt-4 w-72 bg-[#121214] border border-white/10 rounded-[32px] p-6 shadow-2xl z-50 backdrop-blur-xl">
                          {filterOptions.map((group) => (
                            <div key={group.key} className="space-y-4">
                              <div className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">{group.label}</div>
                              <div className="grid grid-cols-1 gap-2">
                                {group.options.map((opt) => (
                                  <button key={opt} onClick={() => { triggerHaptic(); setActiveFilters({ category: opt }); }} className={`text-left px-4 py-3 rounded-xl text-xs font-bold ${activeFilters.category === opt ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20" : "text-zinc-500"}`}>{opt}</button>
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
                  {filteredAuctions.map((auction) => (
                    <Link href={`/auction/${auction.id}`} onClick={triggerHaptic} key={auction.id} className="group relative">
                      <div className="absolute -inset-[1px] bg-gradient-to-b from-white/10 to-transparent rounded-[38px]" />
                      <div className="relative bg-[#0d0d0f]/70 backdrop-blur-md border border-white/5 rounded-[36px] overflow-hidden group-hover:-translate-y-3 transition-all duration-500 shadow-2xl">
                        <div className="aspect-square flex items-center justify-center p-12 border-b border-white/5 bg-white/[0.02]">
                          <img src={getSecureUrl(auction.item.iconUrl)} className="w-full h-full object-contain pixel-art group-hover:scale-110 transition-transform duration-700" alt="" />
                        </div>
                        <div className="p-8">
                          <h3 className="text-2xl font-bold truncate mb-6 tracking-tighter group-hover:text-cyan-400 transition-colors">{auction.item.name}</h3>
                          <div className="bg-black/50 p-5 rounded-2xl border border-white/5">
                            <p className="text-[9px] font-black text-zinc-600 uppercase mb-1">Current Bid</p>
                            <span className="text-2xl font-black text-yellow-400 font-mono italic">{formatGold(auction.currentPrice)}</span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === "CALCULATOR" && (
            <motion.div key="calc-view" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="pt-10 relative z-10">
              <MarketTab initialTab={marketSubTab} />
            </motion.div>
          )}

          {activeTab === "NOTICE" && (
            <motion.div key="notice-view" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="pt-20 pb-40 relative z-10">
              <PostEditor userRole={userRole || "USER"} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className="border-t border-white/5 py-20 bg-black/40 backdrop-blur-md relative z-10 mt-auto">
        <div className="max-w-7xl mx-auto px-6">
          <p className="text-zinc-700 text-[10px] font-black uppercase tracking-[0.4em] text-center md:text-left">© 2026 DDINGTION. ELITE AUCTION HOUSE.</p>
        </div>
      </footer>
    </div>
  );
}

/**
 * 🛠️ [패치 2] 최종 export default: Suspense로 감싸 이름 충돌 해결 및 빌드 성공 보장
 */
export default function Home() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#010101] flex items-center justify-center">
        <div className="text-white font-black animate-pulse uppercase tracking-widest">Protocol Loading...</div>
      </div>
    }>
      <HomeComponent />
    </Suspense>
  );
}