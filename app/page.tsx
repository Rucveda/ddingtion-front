"use client";

import { useEffect, useState, useCallback, useMemo, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { request } from "@/utils/api";
import PostEditor from "@/app/post/PostEditor";
import MarketTab from "@/app/market/page";
import { ISLAND_IMPRINTS, RPG_SKILLS, WILD_BASE, WILD_SPECIAL } from "@/app/market/marketData";
import { DdingtionLogo, SiteBackground, SiteFooter } from "@/components/SiteChrome";

interface Auction {
  id: number;
  currentPrice: number;
  endTime: string;
  status: string;
  item: { name: string; iconUrl: string; category: string; };
  seller: { ingameName: string; };
  enhancementLevel: number;
  enchantments?: Record<string, number>;
  imprint?: Record<string, number>;
  skills?: Record<string, number>;
  runes?: { grade?: string; type?: string }[] | null;
  buyNowPrice?: number | string | null;
}

interface User { id: number; ingameName: string; role: string; discordLinked?: boolean; }

type TabType = "HOME" | "COMMUNITY" | "CALCULATOR" | "AUCTION";
type FilterSection = "category" | "priceRange" | "timeRange" | "detail";
type DetailFilterSection = "enhancement" | "enchantments" | "imprints" | "skills";
type AuctionFilterState = {
  category: string[];
  priceMin: string;
  priceMax: string;
  timeRange: string[];
  enhancementLevels: number[];
  enchantments: string[];
  imprints: string[];
  skills: string[];
};

/**
 * 🛠️ [패치] 남은 시간 표시 컴포넌트
 */
const TimeLeft = ({ endTime, status }: { endTime: string, status: string }) => {
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    if (status !== 'ACTIVE') {
      setTimeLeft("경매 종료");
      return;
    }

    const calculateTimeLeft = () => {
      const now = new Date().getTime();
      const end = new Date(endTime).getTime();
      const distance = end - now;

      if (distance < 0) {
        setTimeLeft("경매 종료");
        return false;
      } else {
        const d = Math.floor(distance / (1000 * 60 * 60 * 24));
        const h = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const m = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const s = Math.floor((distance % (1000 * 60)) / 1000);

        if (d > 0) setTimeLeft(`${d}일 ${h}시간`);
        else if (h > 0) setTimeLeft(`${h}시간 ${m}분`);
        else setTimeLeft(`${m}분 ${s}초`);
        return true;
      }
    };

    if (calculateTimeLeft()) {
      const timer = setInterval(() => { if (!calculateTimeLeft()) clearInterval(timer); }, 1000);
      return () => clearInterval(timer);
    }
  }, [endTime, status]);

  return <span className="font-mono text-xs font-semibold text-red-400">{timeLeft}</span>;
};

/**
 * 🛠️ [패치] HomeComponent: 실제 로직이 담긴 컴포넌트
 */
function HomeComponent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userDiscordLinked, setUserDiscordLinked] = useState(false);
  const [particles, setParticles] = useState<{ id: number; x: number; y: number; size: number }[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>("HOME");
  const [marketSubTab, setMarketSubTab] = useState<"SEARCH" | "CALC" | "ETC" | "ADMIN">("SEARCH");
  const [searchQuery, setSearchQuery] = useState("");
  const [nowTimestamp, setNowTimestamp] = useState(0);
  const [activeFilters, setActiveFilters] = useState<AuctionFilterState>({
    category: [],
    priceMin: "",
    priceMax: "",
    timeRange: [],
    enhancementLevels: [],
    enchantments: [],
    imprints: [],
    skills: [],
  });
  const [openFilterSections, setOpenFilterSections] = useState<Record<FilterSection, boolean>>({
    category: false,
    priceRange: false,
    timeRange: false,
    detail: false,
  });
  const [openDetailFilterSections, setOpenDetailFilterSections] = useState<Record<DetailFilterSection, boolean>>({
    enhancement: false,
    enchantments: false,
    imprints: false,
    skills: false,
  });

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab === "AUCTION" || tab === "COMMUNITY" || tab === "CALCULATOR") {
      setActiveTab(tab as TabType);
    }
    if (tab === "NOTICE") {
      setActiveTab("COMMUNITY");
    }
  }, [searchParams]);

  useEffect(() => {
    queueMicrotask(() => setNowTimestamp(Date.now()));
    const timer = setInterval(() => setNowTimestamp(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);

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
        setUserDiscordLinked(Boolean(parsedUser.discordLinked));
      } catch (e) { console.error(e); }
    }
    const fetchAuctions = async () => {
      try {
        const data = await request("/api/auctions");
        if (Array.isArray(data)) {
          const now = new Date();
          setAuctions(data.filter((a: Auction) => a.status === "ACTIVE" && new Date(a.endTime) > now));
        }
      } catch (err) {
        console.error("경매 목록 로드 실패:", err);
        setAuctions([]);
      }
    };
    fetchAuctions();
  }, []);

  const filteredAuctions = useMemo(() => {
    return auctions.filter((a) => {
      const matchesSearch = a.item.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = activeFilters.category.length === 0 || activeFilters.category.includes(a.item.category);
      const price = Number(a.currentPrice);
      const minPrice = activeFilters.priceMin.trim() === "" ? null : Number(activeFilters.priceMin);
      const maxPrice = activeFilters.priceMax.trim() === "" ? null : Number(activeFilters.priceMax);
      const matchesPrice =
        (minPrice === null || price >= minPrice) &&
        (maxPrice === null || price <= maxPrice);
      const timeDistance = new Date(a.endTime).getTime() - nowTimestamp;
      const matchesTime =
        activeFilters.timeRange.length === 0 ||
        activeFilters.timeRange.some((range) => (
          (range === "URGENT" && timeDistance <= 1000 * 60 * 60) ||
          (range === "TODAY" && timeDistance > 1000 * 60 * 60 && timeDistance <= 1000 * 60 * 60 * 24) ||
          (range === "LATER" && timeDistance > 1000 * 60 * 60 * 24)
        ));
      const matchesEnhancement =
        activeFilters.enhancementLevels.length === 0 ||
        activeFilters.enhancementLevels.includes(a.enhancementLevel);
      const matchesEnchantments =
        activeFilters.enchantments.length === 0 ||
        activeFilters.enchantments.some((name) => !!a.enchantments?.[name]);
      const matchesImprints =
        activeFilters.imprints.length === 0 ||
        activeFilters.imprints.some((name) => !!a.imprint?.[name]);
      const matchesSkills =
        activeFilters.skills.length === 0 ||
        activeFilters.skills.some((name) => !!a.skills?.[name]);

      return matchesSearch && matchesCategory && matchesPrice && matchesTime && matchesEnhancement && matchesEnchantments && matchesImprints && matchesSkills;
    });
  }, [auctions, searchQuery, activeFilters, nowTimestamp]);

  const auctionSummary = useMemo(() => {
    const urgentCount = auctions.filter((a) => {
      const end = new Date(a.endTime).getTime();
      return end > nowTimestamp && end - nowTimestamp <= 1000 * 60 * 60;
    }).length;

    return {
      activeCount: auctions.length,
      urgentCount,
    };
  }, [auctions, nowTimestamp]);

  const filterOptions = useMemo(() => {
    const cats = Array.from(new Set(auctions.map((a) => a.item.category)));
    return [
      {
        key: "category" as const,
        label: "카테고리",
        options: cats.map((cat) => ({ value: cat, label: cat })),
      },
      {
        key: "timeRange" as const,
        label: "남은 시간",
        options: [
          { value: "URGENT", label: "1시간 이내" },
          { value: "TODAY", label: "24시간 이내" },
          { value: "LATER", label: "여유 있음" },
        ],
      },
    ];
  }, [auctions]);

  const detailFilterOptions = useMemo(() => {
    const enchantments = Array.from(new Set([...WILD_BASE, ...WILD_SPECIAL].map(([name]) => String(name))));

    return {
      enhancement: Array.from({ length: 15 }, (_, i) => ({ value: i + 1, label: `+${i + 1}` })),
      enchantments: enchantments.map((name) => ({ value: name, label: name })),
      imprints: ISLAND_IMPRINTS.map((name) => ({ value: name, label: name })),
      skills: RPG_SKILLS.map((name) => ({ value: name, label: name })),
    };
  }, []);

  const activeFilterCount = useMemo(() => (
    activeFilters.category.length +
    activeFilters.timeRange.length +
    activeFilters.enhancementLevels.length +
    activeFilters.enchantments.length +
    activeFilters.imprints.length +
    activeFilters.skills.length +
    (activeFilters.priceMin.trim() ? 1 : 0) +
    (activeFilters.priceMax.trim() ? 1 : 0)
  ), [activeFilters]);

  const resetAuctionFilters = () => {
    setActiveFilters({
      category: [],
      priceMin: "",
      priceMax: "",
      timeRange: [],
      enhancementLevels: [],
      enchantments: [],
      imprints: [],
      skills: [],
    });
  };

  const toggleTextFilter = (key: "category" | "timeRange" | "enchantments" | "imprints" | "skills", value: string) => {
    setActiveFilters((prev) => {
      const values = prev[key];
      const nextValues = values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
      return { ...prev, [key]: nextValues };
    });
  };

  const toggleEnhancementFilter = (value: number) => {
    setActiveFilters((prev) => {
      const values = prev.enhancementLevels;
      const nextValues = values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
      return { ...prev, enhancementLevels: nextValues };
    });
  };

  const toggleFilterSection = (section: FilterSection) => {
    setOpenFilterSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const toggleDetailFilterSection = (section: DetailFilterSection) => {
    setOpenDetailFilterSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

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
        .on-air-glow { box-shadow: 0 0 25px rgba(220, 38, 38, 0.6); text-shadow: 0 0 5px white; }
        @keyframes heroGlowPulse {
          0%, 100% { opacity: 0.34; transform: scale(0.96); }
          50% { opacity: 0.72; transform: scale(1.08); }
        }
        @keyframes heroPrismDrift {
          0% { background-position: 0% 50%; }
          100% { background-position: 200% 50%; }
        }
        @keyframes titleSoftGlow {
          0%, 100% { text-shadow: 0 0 30px rgba(59, 130, 246, 0.16); }
          50% { text-shadow: 0 0 46px rgba(59, 130, 246, 0.34); }
        }
        .hero-title-wrap {
          position: relative;
          display: inline-block;
        }
        .hero-title-wrap::before {
          content: "";
          position: absolute;
          inset: -0.18em -0.08em -0.06em;
          background:
            radial-gradient(circle at 18% 28%, rgba(59, 130, 246, 0.2), transparent 40%),
            radial-gradient(circle at 72% 55%, rgba(168, 85, 247, 0.14), transparent 42%);
          filter: blur(26px);
          opacity: 0.46;
          animation: heroGlowPulse 5.8s ease-in-out infinite;
          pointer-events: none;
          z-index: -2;
        }
        .hero-glitch-title {
          position: relative;
          display: inline-block;
          isolation: isolate;
          text-shadow: 0 0 36px rgba(59, 130, 246, 0.18);
          animation: titleSoftGlow 7s ease-in-out infinite;
        }
        .hero-prism-text {
          background: linear-gradient(110deg, #3b82f6 0%, #60a5fa 26%, #a78bfa 48%, #facc15 62%, #3b82f6 100%);
          background-size: 200% auto;
          background-clip: text;
          -webkit-background-clip: text;
          color: transparent;
          animation: heroPrismDrift 7s ease-in-out infinite;
          filter: drop-shadow(0 0 18px rgba(59, 130, 246, 0.16));
        }
      `}</style>

      <SiteBackground variant="home" />
      <nav className="site-topbar z-[100]">
        <div className={`max-w-7xl mx-auto px-4 sm:px-6 relative transition-[padding] duration-300 ${(activeTab === "CALCULATOR" || activeTab === "AUCTION") ? "sm:pb-9 md:pb-10" : ""}`}>
          <div className="h-16 md:h-[4.5rem] flex justify-between items-center gap-3">
            <button onClick={() => { triggerHaptic(); setActiveTab("HOME"); }} className="flex items-center group shrink-0">
              <DdingtionLogo />
            </button>

            <div className="flex flex-1 min-w-0 items-center justify-end gap-4 md:gap-10">
              <div className="hidden sm:flex min-w-0 items-center gap-5 md:gap-8">
                <div className="relative">
                  <button
                    onClick={() => { triggerHaptic(); setActiveTab("COMMUNITY"); }}
                    className={`shrink-0 text-[11px] font-extrabold uppercase tracking-[0.16em] transition-all duration-300 ${activeTab === "COMMUNITY" ? "text-blue-500 md:scale-110" : "text-zinc-500 hover:text-zinc-300"}`}
                  >
                    COMMUNITY
                  </button>
                </div>

                <div className="relative">
                  <button
                    onClick={() => { triggerHaptic(); setActiveTab("CALCULATOR"); }}
                    className={`shrink-0 text-[11px] font-extrabold uppercase tracking-[0.16em] transition-all duration-300 ${activeTab === "CALCULATOR" ? "text-blue-500 md:scale-110" : "text-zinc-500 hover:text-zinc-300"}`}
                  >
                    CALCULATOR
                  </button>
                  <AnimatePresence>
                    {activeTab === "CALCULATOR" && (
                    <motion.div
                      key="calculator-subnav"
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.24, ease: "easeOut" }}
                      className="absolute left-1/2 top-full mt-6 flex -translate-x-1/2 items-center gap-1.5 rounded-2xl border border-white/10 bg-black/35 p-1.5 shadow-xl backdrop-blur-xl whitespace-nowrap"
                    >
                      {([
                        { id: "SEARCH", label: "ANALYSIS" },
                        { id: "CALC", label: "SIMULATOR" },
                        { id: "ETC", label: "MARKET" }
                      ] as const).map((st) => (
                        <button
                          key={st.id}
                          onClick={() => { triggerHaptic(); setMarketSubTab(st.id); }}
                          className={`rounded-xl px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.12em] transition-all duration-200 ${marketSubTab === st.id ? "bg-blue-600 text-white shadow-lg shadow-blue-600/15" : "text-zinc-500 hover:bg-white/5 hover:text-zinc-200"}`}
                        >
                          {st.label}
                        </button>
                      ))}
                      {userRole === "ADMIN" && (
                        <button onClick={() => setMarketSubTab("ADMIN")} className={`rounded-xl px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.12em] transition-all duration-200 ${marketSubTab === "ADMIN" ? "bg-red-600 text-white shadow-lg shadow-red-600/15" : "text-red-900/60 hover:bg-red-500/10 hover:text-red-400"}`}>ADMIN</button>
                      )}
                    </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="relative">
                  <button
                    onClick={() => { triggerHaptic(); setActiveTab("AUCTION"); }}
                    className={`shrink-0 text-[11px] font-extrabold uppercase tracking-[0.16em] transition-all duration-300 ${activeTab === "AUCTION" ? "text-blue-500 md:scale-110" : "text-zinc-500 hover:text-zinc-300"}`}
                  >
                    AUCTION
                  </button>
                  <AnimatePresence>
                    {activeTab === "AUCTION" && (
                    <motion.div
                      key="auction-subnav"
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.24, ease: "easeOut" }}
                      className="absolute left-1/2 top-full mt-7 flex -translate-x-1/2 items-center gap-4 whitespace-nowrap"
                    >
                      <Link href="/sell" className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-zinc-500 hover:text-cyan-400 transition-all duration-200">LISTING</Link>
                      <Link href="/mypage" className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-zinc-500 hover:text-white transition-all duration-200">MY PAGE</Link>
                    </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              <div className="flex items-center gap-4 sm:gap-6 sm:border-l border-white/10 sm:pl-6 md:pl-10">
                {isLoggedIn ? (
                  <div className="flex items-center gap-4 sm:gap-6">
                    {userRole === "ADMIN" && (
                      <Link href="/admin" onClick={triggerHaptic} className="text-[11px] font-extrabold text-red-500 px-3 py-1.5 border border-red-500/20 bg-red-500/5 rounded-lg tracking-[0.14em] leading-none">ADMIN</Link>
                    )}
                    <button onClick={handleLogout} className="text-red-500/60 hover:text-red-400 text-[11px] font-extrabold tracking-[0.14em]">LOGOUT</button>
                  </div>
                ) : (
                  <Link href="/login" className="text-[11px] font-extrabold text-zinc-300 hover:text-white tracking-[0.14em]">LOGIN</Link>
                )}
              </div>
            </div>
          </div>

          <div className="flex sm:hidden items-center justify-between gap-3 border-t border-white/5 py-2.5">
            {(["COMMUNITY", "CALCULATOR", "AUCTION"] as const).map((tab) => (
              <button
                key={`mobile-${tab}`}
                onClick={() => { triggerHaptic(); setActiveTab(tab); }}
                className={`text-[11px] font-extrabold uppercase tracking-[0.14em] transition-all duration-300 ${activeTab === tab ? "text-blue-500" : "text-zinc-400 hover:text-zinc-200"}`}
              >
                {tab}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            {(activeTab === "AUCTION" || activeTab === "CALCULATOR") && (
              <motion.div
                key={`mobile-${activeTab}-subnav`}
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.24, ease: "easeOut" }}
                className="flex sm:hidden justify-end gap-1.5 overflow-x-auto border-t border-white/5 py-2 custom-scrollbar"
              >
                {activeTab === "AUCTION" && (
                  <>
                    <Link href="/sell" className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-zinc-500 hover:text-cyan-400 transition-all duration-200">LISTING</Link>
                    <Link href="/mypage" className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-zinc-500 hover:text-white transition-all duration-200">MY PAGE</Link>
                  </>
                )}
                {activeTab === "CALCULATOR" && (
                  <>
                    {([
                      { id: "SEARCH", label: "ANALYSIS" },
                      { id: "CALC", label: "SIMULATOR" },
                      { id: "ETC", label: "MARKET" }
                    ] as const).map((st) => (
                      <button
                        key={`mobile-sub-${st.id}`}
                        onClick={() => { triggerHaptic(); setMarketSubTab(st.id); }}
                        className={`rounded-xl px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.12em] transition-all duration-200 ${marketSubTab === st.id ? "bg-blue-600 text-white shadow-lg shadow-blue-600/15" : "bg-white/[0.03] text-zinc-500 hover:bg-white/[0.07] hover:text-zinc-200"}`}
                      >
                        {st.label}
                      </button>
                    ))}
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </nav>

      <main className="flex-1 relative z-10">
        <AnimatePresence mode="wait">
          {activeTab === "HOME" && (
            <motion.div key="home-view" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="max-w-7xl mx-auto px-4 sm:px-6 py-24 md:py-40">
              <div className="max-w-5xl">
                <h1 className="text-4xl sm:text-5xl md:text-7xl font-black mb-5 md:mb-7 tracking-[-0.05em] leading-[1.08] break-keep">
                  <span className="hero-title-wrap">
                    <span>
                      띵타이쿤 <span className="hero-glitch-title hero-prism-text" data-text="경매 플랫폼">경매 플랫폼</span>,
                    </span><br />
                    <span className="hero-glitch-title" data-text="띵션에 오신 것을 환영합니다.">띵션에 오신 것을 환영합니다.</span>
                  </span>
                </h1>
                <p className="max-w-2xl text-zinc-300 text-base md:text-lg font-medium leading-7 mb-10 md:mb-12 break-keep">
                  가치 있는 장비들의 시세를 계산 및 분석하고,<br />
                  경매를 통한 최적의 거래 기회를 찾아드립니다.
                </p>
                <div className="flex flex-col gap-3 sm:flex-row sm:gap-4">
                  <button onClick={() => setActiveTab("AUCTION")} className="home-hero-cta home-hero-cta-auction">
                    <span className="home-hero-cta-kicker">Live Market</span>
                    <span className="home-hero-cta-label">경매 보기</span>
                  </button>
                  <button onClick={() => setActiveTab("CALCULATOR")} className="home-hero-cta home-hero-cta-calc">
                    <span className="home-hero-cta-kicker">Enhance Tool</span>
                    <span className="home-hero-cta-label">강화 계산기</span>
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === "AUCTION" && (
            <motion.div key="auction-view" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <header className="relative pt-20 pb-12 md:pt-32 md:pb-20 overflow-visible">
                <div className="max-w-7xl mx-auto px-4 sm:px-6">
                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
                    <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black mb-6 tracking-[-0.055em] leading-[1.05] break-keep">
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
                      <span className="sm:ml-4">을 거래하는</span><br />
                      <motion.span className="prism-text-overlay italic" data-text="가장 현명한 방법.">가장 현명한 방법.</motion.span>
                    </h1>
                    <p className="max-w-2xl text-base md:text-lg font-medium text-zinc-300 leading-7 break-keep">
                      실시간 입찰과 즉시구매로 원하는 아이템을 빠르게 찾아보세요.
                    </p>

                    <div className="mt-7 inline-flex overflow-hidden rounded-2xl bg-white/[0.045] shadow-lg shadow-black/10 backdrop-blur-md">
                      <div className="px-5 py-3">
                        <span className="mr-3 text-xs font-semibold text-zinc-400">진행 중</span>
                        <span className="font-mono text-lg font-bold text-white">{auctionSummary.activeCount}</span>
                        <span className="ml-1 text-xs font-semibold text-zinc-400">건</span>
                      </div>
                      <div className="w-px bg-white/10" />
                      <div className="px-5 py-3">
                        <span className="mr-3 text-xs font-semibold text-rose-300/80">마감 임박</span>
                        <span className="font-mono text-lg font-bold text-rose-100">{auctionSummary.urgentCount}</span>
                        <span className="ml-1 text-xs font-semibold text-rose-300/70">건</span>
                      </div>
                    </div>
                  </motion.div>
                </div>
              </header>

              <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-32 md:pb-40">
                <div className="mb-10 md:mb-16 rounded-[28px] border border-white/10 bg-white/[0.025] p-3 md:p-4 shadow-2xl backdrop-blur-md">
                  <div className="relative">
                    <input type="text" placeholder="찾으시는 물품의 이름을 입력하세요..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-black/30 border border-white/10 p-4 md:p-5 pl-12 md:pl-14 rounded-2xl text-sm md:text-base font-semibold outline-none focus:border-cyan-500/50 transition-all placeholder:text-zinc-500" />
                    <svg className="absolute left-5 md:left-6 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500 md:h-5 md:w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                      <path d="m21 21-4.3-4.3" />
                      <circle cx="11" cy="11" r="7" />
                    </svg>
                  </div>

                  <div className="mt-3 rounded-[22px] bg-black/20 p-3 md:p-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-zinc-500">Filters</div>
                      <button
                        onClick={() => {
                          triggerHaptic();
                          resetAuctionFilters();
                        }}
                        className="site-btn site-btn-secondary site-btn-compact"
                      >
                        Reset {activeFilterCount > 0 && `(${activeFilterCount})`}
                      </button>
                    </div>

                    <div className="grid gap-2">
                      {filterOptions.map((group) => (
                        <div key={group.key} className="rounded-2xl bg-white/[0.025]">
                          <button
                            onClick={() => {
                              triggerHaptic();
                              toggleFilterSection(group.key);
                            }}
                            className="flex w-full items-center gap-3 px-4 py-3 text-left"
                          >
                            <span className="text-xs font-extrabold text-zinc-300">{group.label}</span>
                            <span className="text-[11px] font-extrabold text-zinc-500">
                              {openFilterSections[group.key] ? "▲" : "▼"}
                            </span>
                          </button>
                          {openFilterSections[group.key] && (
                            <div className="flex flex-wrap gap-2 px-4 pb-4">
                              {group.options.length === 0 ? (
                                <span className="rounded-xl bg-white/[0.035] px-3 py-2 text-xs font-semibold text-zinc-600">데이터 없음</span>
                              ) : group.options.map((option) => {
                                const isActive = activeFilters[group.key].includes(option.value);

                                return (
                                  <button
                                    key={`${group.key}-${option.value}`}
                                    onClick={() => {
                                      triggerHaptic();
                                      toggleTextFilter(group.key, option.value);
                                    }}
                                    className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${isActive
                                      ? "bg-cyan-500/15 text-cyan-200 shadow-lg shadow-cyan-500/5"
                                      : "bg-white/[0.035] text-zinc-400 hover:bg-white/[0.07] hover:text-zinc-200"
                                      }`}
                                  >
                                    {option.label}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      ))}

                      <div className="rounded-2xl bg-white/[0.025]">
                        <button
                          onClick={() => {
                            triggerHaptic();
                            toggleFilterSection("priceRange");
                          }}
                          className="flex w-full items-center gap-3 px-4 py-3 text-left"
                        >
                          <span className="text-xs font-extrabold text-zinc-300">가격대</span>
                          <span className="text-[11px] font-extrabold text-zinc-500">
                            {openFilterSections.priceRange ? "▲" : "▼"}
                          </span>
                        </button>
                        {openFilterSections.priceRange && (
                          <div className="flex flex-wrap items-center gap-2 px-4 pb-4">
                            <input
                              type="text"
                              inputMode="numeric"
                              value={activeFilters.priceMin}
                              onChange={(e) => setActiveFilters((prev) => ({ ...prev, priceMin: e.target.value.replace(/\D/g, "") }))}
                              placeholder="최소 입찰가"
                              className="w-36 rounded-xl bg-black/30 px-3 py-2 text-xs font-semibold text-zinc-100 outline-none ring-1 ring-white/10 transition-all placeholder:text-zinc-600 focus:ring-cyan-500/40 sm:w-44"
                            />
                            <span className="px-1 text-xs font-extrabold text-zinc-500">~</span>
                            <input
                              type="text"
                              inputMode="numeric"
                              value={activeFilters.priceMax}
                              onChange={(e) => setActiveFilters((prev) => ({ ...prev, priceMax: e.target.value.replace(/\D/g, "") }))}
                              placeholder="최대 입찰가"
                              className="w-36 rounded-xl bg-black/30 px-3 py-2 text-xs font-semibold text-zinc-100 outline-none ring-1 ring-white/10 transition-all placeholder:text-zinc-600 focus:ring-cyan-500/40 sm:w-44"
                            />
                          </div>
                        )}
                      </div>

                      <div className="rounded-2xl bg-white/[0.025]">
                        <button
                          onClick={() => {
                            triggerHaptic();
                            toggleFilterSection("detail");
                          }}
                          className="flex w-full items-center gap-3 px-4 py-3 text-left"
                        >
                          <span className="text-xs font-extrabold text-zinc-300">세부 특성</span>
                          <span className="text-[11px] font-extrabold text-zinc-500">
                            {openFilterSections.detail ? "▲" : "▼"}
                          </span>
                        </button>
                        {openFilterSections.detail && (
                          <div className="space-y-3 px-4 pb-4">
                            <div className="grid gap-2">
                              {[
                                { key: "enhancement" as const, label: "강화", count: activeFilters.enhancementLevels.length },
                                { key: "enchantments" as const, label: "인챈트", count: activeFilters.enchantments.length },
                                { key: "imprints" as const, label: "각인", count: activeFilters.imprints.length },
                                { key: "skills" as const, label: "스킬", count: activeFilters.skills.length },
                              ].map((section) => (
                                <div key={section.key} className="rounded-2xl bg-black/20">
                                  <button
                                    onClick={() => {
                                      triggerHaptic();
                                      toggleDetailFilterSection(section.key);
                                    }}
                                    className="flex w-full items-center gap-3 px-3 py-2.5 text-left"
                                  >
                                    <span className="text-xs font-extrabold text-zinc-300">{section.label}</span>
                                    <span className="text-[11px] font-extrabold text-zinc-500">
                                      {openDetailFilterSections[section.key] ? "▲" : "▼"}
                                    </span>
                                  </button>

                                  {openDetailFilterSections[section.key] && (
                                    <div className="max-h-44 overflow-y-auto px-3 pb-3 pr-1 custom-scrollbar">
                                      <div className="flex flex-wrap gap-2">
                                        {section.key === "enhancement" ? (
                                          detailFilterOptions.enhancement.map((option) => {
                                            const isActive = activeFilters.enhancementLevels.includes(option.value);
                                            return (
                                              <button
                                                key={`enhancement-${option.value}`}
                                                onClick={() => {
                                                  triggerHaptic();
                                                  toggleEnhancementFilter(option.value);
                                                }}
                                                className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${isActive ? "bg-yellow-500/15 text-yellow-100" : "bg-white/[0.035] text-zinc-400 hover:bg-white/[0.07] hover:text-zinc-200"}`}
                                              >
                                                {option.label}
                                              </button>
                                            );
                                          })
                                        ) : (
                                          detailFilterOptions[section.key].map((option) => {
                                            const isActive = activeFilters[section.key].includes(option.value);
                                            return (
                                              <button
                                                key={`${section.key}-${option.value}`}
                                                onClick={() => {
                                                  triggerHaptic();
                                                  toggleTextFilter(section.key, option.value);
                                                }}
                                                className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${isActive ? "bg-purple-500/15 text-purple-100" : "bg-white/[0.035] text-zinc-400 hover:bg-white/[0.07] hover:text-zinc-200"}`}
                                              >
                                                {option.label}
                                              </button>
                                            );
                                          })
                                        )}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid w-full gap-3 lg:grid-cols-2">
                  {filteredAuctions.length === 0 ? (
                    <div className="rounded-[24px] border border-dashed border-white/10 bg-white/[0.02] px-6 py-16 text-center text-sm font-semibold text-zinc-300 lg:col-span-2">
                      <div className="flex flex-col items-center gap-3">
                        <span>현재 검색 조건에 맞는 경매가 없습니다.</span>
                        <span className="text-xs font-medium text-zinc-500">데이터 연결 또는 필터 조건을 확인해 주세요</span>
                      </div>
                    </div>
                  ) : (
                    filteredAuctions.map((auction) => {
                      const hasOptions =
                        auction.enhancementLevel > 0 ||
                        Boolean(auction.enchantments && Object.keys(auction.enchantments).length > 0) ||
                        Boolean(auction.imprint && Object.keys(auction.imprint).length > 0) ||
                        Boolean(auction.skills && Object.keys(auction.skills).length > 0) ||
                        Boolean(auction.runes?.some((rune) => rune?.grade || rune?.type));

                      return (
                        <article
                          key={auction.id}
                          onClick={() => { triggerHaptic(); router.push(`/auction/${auction.id}`); }}
                          className="site-card group cursor-pointer rounded-[22px] p-3 transition-colors hover:border-white/15 hover:bg-white/[0.04]"
                        >
                          <div className="flex gap-3">
                            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl border border-white/5 bg-white/[0.035] transition-all group-hover:border-white/20">
                              <img src={getSecureUrl(auction.item.iconUrl)} className="h-14 w-14 object-contain pixel-art" alt="icon" />
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex flex-col gap-2">
                                <div className="min-w-0">
                                  <h3 className="truncate text-sm font-semibold text-zinc-100 transition-colors group-hover:text-cyan-300">
                                    {auction.item.name}
                                  </h3>
                                  <p className="mt-0.5 text-[11px] font-medium text-zinc-600">
                                    판매자 {auction.seller.ingameName}
                                  </p>
                                </div>

                                <div className="flex items-center gap-2 rounded-xl border border-white/5 bg-black/20 px-2.5 py-1.5">
                                  <span className="font-mono text-xs font-semibold text-yellow-400">
                                    {formatGold(Number(auction.currentPrice))}
                                  </span>
                                  <span className="h-3 w-px bg-white/10" />
                                  <TimeLeft endTime={auction.endTime} status={auction.status} />
                                </div>
                              </div>

                              <div className="mt-2 flex flex-wrap gap-1.5">
                                {auction.enhancementLevel > 0 && (
                                  <span className="rounded-lg border border-cyan-500/20 bg-cyan-500/10 px-2 py-0.5 text-[11px] font-semibold text-cyan-300">
                                    강화 +{auction.enhancementLevel}
                                  </span>
                                )}
                                {auction.enchantments && Object.entries(auction.enchantments).map(([name, lv]) => (
                                  <span key={`enchant-${name}`} className="rounded-lg border border-blue-500/20 bg-blue-500/10 px-2 py-0.5 text-[11px] font-semibold text-blue-200">
                                    {name} Lv.{String(lv)}
                                  </span>
                                ))}
                                {auction.imprint && Object.entries(auction.imprint).map(([name, lv]) => (
                                  <span key={`imprint-${name}`} className="rounded-lg border border-yellow-500/20 bg-yellow-500/10 px-2 py-0.5 text-[11px] font-semibold text-yellow-200">
                                    {name} Lv.{String(lv)}
                                  </span>
                                ))}
                                {auction.skills && Object.entries(auction.skills).map(([name, lv]) => (
                                  <span key={`skill-${name}`} className="rounded-lg border border-purple-500/20 bg-purple-500/10 px-2 py-0.5 text-[11px] font-semibold text-purple-200">
                                    {name} Lv.{String(lv)}
                                  </span>
                                ))}
                                {auction.runes?.filter((rune) => rune?.grade || rune?.type).map((rune, idx) => (
                                  <span key={`rune-${idx}`} className="rounded-lg border border-orange-500/20 bg-orange-500/10 px-2 py-0.5 text-[11px] font-semibold text-orange-200">
                                    {rune.grade || "룬"} {rune.type ? rune.type.replace("의룬", "") : ""}
                                  </span>
                                ))}
                                {!hasOptions && (
                                  <span className="text-[11px] font-medium text-zinc-600">옵션 없음</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </article>
                      );
                    })
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === "CALCULATOR" && (
            <motion.div key="calc-view" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="pt-6 relative z-10">
              <MarketTab initialTab={marketSubTab} />
            </motion.div>
          )}

          {activeTab === "COMMUNITY" && (
            <motion.div key="community-view" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="pt-20 pb-40 relative z-10">
              <PostEditor userRole={userRole || "USER"} userDiscordLinked={userDiscordLinked} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <SiteFooter />
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
        <div className="animate-pulse text-xs font-extrabold tracking-[0.16em] text-white">페이지 로딩 중...</div>
      </div>
    }>
      <HomeComponent />
    </Suspense>
  );
}