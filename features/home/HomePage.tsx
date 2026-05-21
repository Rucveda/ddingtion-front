"use client";

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import PostEditor from "@/features/community/PostEditor";
import MarketTab from "@/features/market/MarketPage";
import { DdingtionLogo, SiteBackground, SiteFooter } from "@/components/SiteChrome";
import { clearAuthSession } from "@/lib/auth/authPreferences";
import { isLocalDev } from "@/dev/devMode";
import { ensureLocalDummySession } from "@/dev/localDummyData";
import { resolveHomeTab, type HomeTabType, type HomeUser } from "@/features/home/auctionListTypes";
import { triggerHaptic } from "@/features/home/auctionListUtils";
import { HomeGlobalStyles } from "@/features/home/HomeGlobalStyles";

const AuctionListTab = dynamic(
  () => import("@/features/home/AuctionListTab").then((mod) => mod.AuctionListTab),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-[40vh] items-center justify-center px-4 text-xs font-extrabold tracking-[0.16em] text-zinc-500">
        경매 목록 불러오는 중...
      </div>
    ),
  },
);

function HomeComponent() {
  const searchParams = useSearchParams();
  const activeTab = resolveHomeTab(searchParams.get("tab"));
  const [hasMounted, setHasMounted] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userDiscordLinked, setUserDiscordLinked] = useState(false);
  const [marketSubTab, setMarketSubTab] = useState<"SEARCH" | "CALC" | "ETC" | "ADMIN">("SEARCH");

  useEffect(() => {
    if (isLocalDev()) ensureLocalDummySession();
    const token = localStorage.getItem("token");
    const storedUser = localStorage.getItem("user");
    setIsLoggedIn(!!token);
    if (storedUser) {
      try {
        const parsedUser: HomeUser = JSON.parse(storedUser);
        setUserRole(parsedUser.role ? parsedUser.role.toUpperCase() : "USER");
        setUserDiscordLinked(Boolean(parsedUser.discordLinked));
      } catch (e) {
        console.error(e);
      }
    }
    setHasMounted(true);
  }, []);

  const setHomeTab = (tab: HomeTabType) => {
    triggerHaptic();
    const href = tab === "HOME" ? "/" : `/?tab=${tab}`;
    window.location.href = href;
  };

  const handleLogout = () => {
    triggerHaptic();
    clearAuthSession();
    window.location.reload();
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#010101] text-zinc-100 font-sans select-none overflow-x-hidden relative selection:bg-white selection:text-black">
      <HomeGlobalStyles />
      <SiteBackground variant="home" />

      <nav className="site-topbar z-[100]">
        <div className={`max-w-7xl mx-auto px-4 sm:px-6 relative transition-[padding] duration-300 ${activeTab === "CALCULATOR" || activeTab === "AUCTION" ? "sm:pb-9 md:pb-10" : ""}`}>
          <div className="h-16 md:h-[4.5rem] flex justify-between items-center gap-3">
<Link href="/" onClick={triggerHaptic} className="flex items-center group shrink-0">
              <DdingtionLogo />
            </Link>

            <div className="flex flex-1 min-w-0 items-center justify-end gap-4 md:gap-10">
              <div className="hidden sm:flex min-w-0 items-center gap-5 md:gap-8">
                <div className="relative">
                  <button
                    onClick={() => setHomeTab("COMMUNITY")}
                    className={`shrink-0 text-[11px] font-extrabold uppercase tracking-[0.16em] transition-all duration-300 ${activeTab === "COMMUNITY" ? "text-blue-500 md:scale-110" : "text-zinc-500 hover:text-zinc-300"}`}
                  >
                    COMMUNITY
                  </button>
                </div>

                <div className="relative">
                  <button
                    onClick={() => setHomeTab("CALCULATOR")}
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
                          { id: "ETC", label: "MARKET" },
                        ] as const).map((st) => (
                          <button
                            key={st.id}
                            onClick={() => { triggerHaptic(); setMarketSubTab(st.id); }}
                            className={`rounded-xl px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.12em] transition-all duration-200 ${marketSubTab === st.id ? "bg-blue-600 text-white shadow-lg shadow-blue-600/15" : "text-zinc-500 hover:bg-white/5 hover:text-zinc-200"}`}
                          >
                            {st.label}
                          </button>
                        ))}
                        {hasMounted && userRole === "ADMIN" && (
                          <button
                            onClick={() => setMarketSubTab("ADMIN")}
                            className={`rounded-xl px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.12em] transition-all duration-200 ${marketSubTab === "ADMIN" ? "bg-red-600 text-white shadow-lg shadow-red-600/15" : "text-red-900/60 hover:bg-red-500/10 hover:text-red-400"}`}
                          >
                            ADMIN
                          </button>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="relative">
                  <button
                    onClick={() => setHomeTab("AUCTION")}
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
                {!hasMounted ? (
                  <span className="invisible text-[11px] font-extrabold tracking-[0.14em]">LOGIN</span>
                ) : isLoggedIn ? (
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
                onClick={() => setHomeTab(tab)}
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
                      { id: "ETC", label: "MARKET" },
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
                    </span>
                    <br />
                    <span className="hero-glitch-title" data-text="띵션에 오신 것을 환영합니다.">띵션에 오신 것을 환영합니다.</span>
                  </span>
                </h1>
                <p className="max-w-2xl text-zinc-300 text-base md:text-lg font-medium leading-7 mb-10 md:mb-12 break-keep">
                  가치 있는 장비들의 시세를 계산 및 분석하고,
                  <br />
                  경매를 통한 최적의 거래 기회를 찾아드립니다.
                </p>
                <div className="flex flex-col gap-3 sm:flex-row sm:gap-4">
                  <button onClick={() => setHomeTab("AUCTION")} className="home-hero-cta home-hero-cta-auction">
                    <span className="home-hero-cta-kicker">Live Auction</span>
                    <span className="home-hero-cta-label">경매 보기</span>
                  </button>
                  <button onClick={() => setHomeTab("CALCULATOR")} className="home-hero-cta home-hero-cta-calc">
                    <span className="home-hero-cta-kicker">Enhance Calculator</span>
                    <span className="home-hero-cta-label">강화 계산기</span>
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === "AUCTION" && hasMounted && <AuctionListTab isActive />}

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

export default function Home() {
  return (
    <Suspense
      fallback={(
        <div className="min-h-screen bg-[#010101] flex items-center justify-center">
          <div className="animate-pulse text-xs font-extrabold tracking-[0.16em] text-white">페이지 로딩 중...</div>
        </div>
      )}
    >
      <HomeComponent />
    </Suspense>
  );
}
