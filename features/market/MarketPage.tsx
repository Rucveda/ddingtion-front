"use client";

import { useState, useEffect, useCallback, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { request } from "@/lib/client/api";
import { motion, AnimatePresence } from "framer-motion";

import { MarketProvider } from "./MarketContext";
import SearchTab from "./SearchTab";
import CalcTab from "./CalcTab";
import EtcTab from "./EtcTab";
import AdminTab from "./AdminTab";
import { SimpleTopBar, SiteBackground, SiteFooter } from "@/components/SiteChrome";
import { isLocalDev } from "@/dev/devMode";
import { ensureLocalDummySession } from "@/dev/localDummyData";

interface MarketTabProps {
  initialTab?: "SEARCH" | "CALC" | "ETC" | "ADMIN";
}

function MarketIntelligenceContent({ initialTab }: MarketTabProps) {
  const searchParams = useSearchParams();
  const isEmbedded = initialTab !== undefined;
  const resolvedInitialTab = initialTab ?? "SEARCH";
  const [dbItems, setDbItems] = useState<any[]>([]);
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<"SEARCH" | "CALC" | "ETC" | "ADMIN">(resolvedInitialTab);
  const [userRole, setUserRole] = useState<string>("USER");

  /**
   * 🛠️ [패치] URL 쿼리 파라미터 또는 Prop으로 탭 상태 동기화
   */
  useEffect(() => {
    const tabFromQuery = searchParams.get('tab')?.toUpperCase();
    if (tabFromQuery && ["SEARCH", "CALC", "ETC", "ADMIN"].includes(tabFromQuery)) {
      setActiveTab(tabFromQuery as any);
    } else {
      setActiveTab(resolvedInitialTab);
    }
  }, [resolvedInitialTab, searchParams]);

  const getSecureUrl = (url: string) => {
    if (!url) return "";
    return url.replace("http://", "https://");
  };

  const triggerHaptic = useCallback(() => {
    if (typeof window !== "undefined" && window.navigator?.vibrate) {
      window.navigator.vibrate(10);
    }
  }, []);

  useEffect(() => {
    if (isLocalDev()) {
      ensureLocalDummySession();
      setUserRole("ADMIN");
    }
    // 아이템 리스트 로드
    request("/api/auctions/items")
      .then(data => {
        if (Array.isArray(data)) {
          setDbItems(data);
        }
      })
      .catch(err => {
        console.error("아이템 목록 로드 실패:", err);
        setDbItems([]);
      });

    // 유저 권한 확인
    const savedUser = localStorage.getItem("user");
    if (!isLocalDev() && savedUser) {
      try {
        const { role } = JSON.parse(savedUser);
        setUserRole(role || "USER");
      } catch {
        setUserRole("USER");
      }
    } else if (isLocalDev()) {
      setUserRole("ADMIN");
    }
  }, []);

  const filteredItems = useMemo(() => {
    return dbItems.filter(i => i.name.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [dbItems, searchTerm]);

  const emptyStateDescription = {
    SEARCH: "선택한 아이템의 거래 기준과 옵션별 시장 평가를 확인하는 분석 화면입니다.",
    CALC: "강화, 인챈트, 각인, 스킬 옵션을 조합해 예상 가치를 계산하는 시뮬레이터입니다.",
    ETC: "등록된 아이템과 시장 데이터를 바탕으로 전체 시세 흐름을 참고하는 보조 화면입니다.",
    ADMIN: "관리자 권한으로 아이템과 시세 데이터를 관리하는 화면입니다.",
  }[activeTab];

  const handleSelectItem = (item: any) => {
    triggerHaptic();
    setSelectedItem(item);
    setSearchTerm(item.name);
  };

  return (
    <MarketProvider>
      <div className={`${isEmbedded ? "w-full" : "min-h-screen bg-[#010101]"} text-zinc-100 font-sans select-none relative selection:bg-white selection:text-black`}>
        {!isEmbedded && (
          <>
            <SiteBackground />
            <SimpleTopBar onNavigate={triggerHaptic} closeHref="/" closeLabel="홈으로 돌아가기" />
          </>
        )}

        <main className={`mx-auto max-w-7xl ${isEmbedded ? "py-1" : "py-6 md:py-8"} relative z-10 px-3 sm:px-5`}>
          <div className="grid grid-cols-1 items-start gap-3 lg:grid-cols-12">
            
            {/* 왼쪽 사이드바: 아이템 리스트 */}
            <aside className="w-full lg:sticky lg:top-28 lg:col-span-3">
              <motion.div 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="rounded-2xl border border-white/5 bg-white/[0.018] p-3"
              >
                <div className="mb-2 flex items-center justify-between gap-2 px-1">
                  <div className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.12em] text-zinc-400">
                    <div className="h-3 w-1 rounded-full bg-blue-600" /> 아이템 선택
                  </div>
                  <span className="text-[10px] font-semibold text-zinc-600">{filteredItems.length}/{dbItems.length}</span>
                </div>
                
                <input 
                  type="text" 
                  placeholder="아이템 이름 입력..." 
                  className="mb-2 w-full rounded-xl border border-white/10 bg-black/35 px-3 py-2.5 text-xs font-semibold outline-none transition-all placeholder:text-zinc-600 focus:border-blue-500/40"
                  value={searchTerm} 
                  onChange={e => setSearchTerm(e.target.value)}
                />

                <div className="custom-scrollbar max-h-[36vh] space-y-1 overflow-y-auto pr-1 lg:max-h-[62vh]">
                  {filteredItems.map(item => (
                    <button 
                      key={item.id}
                      onClick={() => handleSelectItem(item)}
                      className={`flex w-full items-center gap-2.5 rounded-xl border px-2.5 py-2 transition-all ${selectedItem?.id === item.id ? "border-blue-500/35 bg-blue-500/10 text-white" : "border-transparent bg-black/20 text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-200"}`}
                    >
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center">
                        <img src={getSecureUrl(item.iconUrl)} className="h-full w-full object-contain pixel-art" alt="" />
                      </div>
                      <div className="min-w-0 flex-1 text-left">
                        <span className="block truncate text-[11px] font-semibold tracking-tight">{item.name}</span>
                        <span className="mt-0.5 block truncate text-[9px] font-bold uppercase tracking-[0.08em] text-zinc-700">{item.category}</span>
                      </div>
                    </button>
                  ))}
                  {filteredItems.length === 0 && (
                    <div className="rounded-xl border border-dashed border-white/5 bg-black/15 px-3 py-8 text-center text-xs font-bold text-zinc-500">
                      아이템이 없습니다.
                      <div className="mt-2 text-[11px] font-medium text-zinc-600">검색어를 확인해 주세요.</div>
                    </div>
                  )}
                </div>
              </motion.div>
            </aside>

            {/* 오른쪽 메인 컨텐츠 영역 */}
            <div className="min-w-0 w-full lg:col-span-9">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab + (selectedItem?.id || "none")}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                  className="w-full"
                >
                  {/* 내부 컨텐츠 박스 */}
                  <section className="flex min-h-[460px] w-full flex-col overflow-hidden rounded-2xl border border-white/5 bg-white/[0.012] p-3 md:min-h-[64vh] md:p-4">
                    {selectedItem || activeTab === "ADMIN" ? (
                      <div className="w-full h-full">
                        {activeTab === "SEARCH" && <SearchTab selectedItem={selectedItem} />}
                        {activeTab === "CALC" && <CalcTab selectedItem={selectedItem} />}
                        {activeTab === "ETC" && <EtcTab selectedItem={selectedItem} />}
                        {activeTab === "ADMIN" && userRole === "ADMIN" ? (
                          <AdminTab items={dbItems} />
                        ) : activeTab === "ADMIN" ? (
                          <div className="flex-1 flex flex-col items-center justify-center py-20">
                             <div className="text-red-500 text-4xl mb-4">⚠️</div>
                             <div className="text-sm font-black uppercase text-zinc-600 tracking-widest">Access Denied: Admin Only</div>
                          </div>
                        ) : null}
                      </div>
                    ) : (
                      /* 아이템 미선택 시 가이드 화면 */
                      <div className="flex flex-1 items-center justify-center py-16 text-center md:py-20">
                        <div className="max-w-2xl px-4">
                          <p className="text-sm font-bold leading-relaxed text-zinc-400 break-keep">
                            분석할 아이템을 왼쪽 리스트에서 선택해주세요
                          </p>
                          <p className="mt-2 text-xs font-medium leading-relaxed text-zinc-500 break-keep">
                            {emptyStateDescription}
                          </p>
                        </div>
                      </div>
                    )}
                  </section>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </main>
        {!isEmbedded && <SiteFooter />}
      </div>
    </MarketProvider>
  );
}

/**
 * 🛠️ [빌드 에러 방지] useSearchParams를 사용하는 경우 Suspense로 감싸야 합니다.
 */
export default function MarketIntelligence(props: MarketTabProps) {
  return (
    <Suspense fallback={
      <div className="w-full min-h-screen flex items-center justify-center opacity-20 text-[10px] font-black uppercase tracking-widest text-zinc-500">Loading Market...</div>
    }>
      <MarketIntelligenceContent {...props} />
    </Suspense>
  );
}