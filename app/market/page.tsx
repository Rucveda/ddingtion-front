"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { request } from "@/utils/api";
import { motion, AnimatePresence } from "framer-motion";

import { MarketProvider } from "./MarketContext";
import SearchTab from "./SearchTab";
import CalcTab from "./CalcTab";
import EtcTab from "./EtcTab";
import AdminTab from "./AdminTab";

interface MarketTabProps {
  initialTab?: "SEARCH" | "CALC" | "ETC" | "ADMIN";
}

export default function MarketIntelligence({ initialTab = "SEARCH" }: MarketTabProps) {
  const [dbItems, setDbItems] = useState<any[]>([]);
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<"SEARCH" | "CALC" | "ETC" | "ADMIN">(initialTab);
  const [userRole, setUserRole] = useState<string>("USER");

  /**
   * 🛠️ [패치] 부모 컴포넌트(page.tsx)에서 전달한 탭 상태와 동기화
   */
  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

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
    // 아이템 리스트 로드
    request("/api/auctions/items").then(data => {
      if (Array.isArray(data)) {
        setDbItems(data);
      }
    });

    // 유저 권한 확인
    const savedUser = localStorage.getItem("user");
    if (savedUser) {
      try {
        const { role } = JSON.parse(savedUser);
        setUserRole(role || "USER");
      } catch (e) {
        setUserRole("USER");
      }
    }
  }, []);

  const filteredItems = useMemo(() => {
    return dbItems.filter(i => i.name.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [dbItems, searchTerm]);

  const handleSelectItem = (item: any) => {
    triggerHaptic();
    setSelectedItem(item);
    setSearchTerm(item.name);
  };

  return (
    <MarketProvider>
      <div className="w-full text-zinc-100 font-sans select-none relative selection:bg-white selection:text-black">
        <style jsx global>{`
          .pixel-art { image-rendering: pixelated; }
          .custom-scrollbar::-webkit-scrollbar { width: 4px; }
          .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
          .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.1); border-radius: 10px; }
        `}</style>

        {/* 🛠️ 메인 페이지와 통합되었으므로 상단바, 로고, X버튼을 모두 제거한 레이아웃입니다. */}
        <main className="max-w-7xl mx-auto py-4 px-6 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* 왼쪽 사이드바: 아이템 리스트 */}
            <aside className="lg:col-span-3 w-full sticky top-32">
              <motion.div 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-white/[0.02] border border-white/5 p-5 rounded-[32px] backdrop-blur-md shadow-2xl"
              >
                <div className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-4 flex items-center gap-2 px-1">
                  <div className="w-1 h-3 bg-blue-600 rounded-full" /> 아이템 선택
                </div>
                
                <input 
                  type="text" 
                  placeholder="아이템 이름 입력..." 
                  className="w-full bg-black/40 border border-white/10 p-4 rounded-2xl text-xs font-bold outline-none focus:border-blue-500/50 transition-all mb-4 placeholder:text-zinc-800"
                  value={searchTerm} 
                  onChange={e => setSearchTerm(e.target.value)}
                />

                <div className="max-h-[60vh] overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                  {filteredItems.map(item => (
                    <button 
                      key={item.id}
                      onClick={() => handleSelectItem(item)}
                      className={`w-full flex items-center gap-3 p-3.5 rounded-xl transition-all border ${selectedItem?.id === item.id ? "bg-blue-600/10 border-blue-500/40 text-white shadow-[0_0_15px_rgba(59,130,246,0.1)]" : "bg-white/[0.02] border-transparent text-zinc-500 hover:bg-white/5"}`}
                    >
                      <div className="w-7 h-7 flex items-center justify-center shrink-0">
                        <img src={getSecureUrl(item.iconUrl)} className="w-full h-full object-contain pixel-art" alt="" />
                      </div>
                      <span className="font-bold text-[11px] truncate flex-1 text-left tracking-tight">{item.name}</span>
                    </button>
                  ))}
                  {filteredItems.length === 0 && (
                    <div className="text-center py-10 opacity-20 text-[10px] font-black uppercase tracking-widest">No Items Found</div>
                  )}
                </div>
              </motion.div>
            </aside>

            {/* 오른쪽 메인 컨텐츠 영역 */}
            <div className="lg:col-span-9 w-full min-w-0">
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
                  <section className="bg-white/[0.01] border border-white/5 p-6 md:p-10 rounded-[48px] shadow-2xl backdrop-blur-md min-h-[75vh] flex flex-col w-full overflow-hidden">
                    {selectedItem || activeTab === "ETC" || activeTab === "ADMIN" ? (
                      <div className="w-full h-full">
                        {activeTab === "SEARCH" && <SearchTab selectedItem={selectedItem} />}
                        {activeTab === "CALC" && <CalcTab selectedItem={selectedItem} />}
                        {activeTab === "ETC" && <EtcTab items={dbItems} />}
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
                      <div className="flex-1 flex flex-col items-center justify-center opacity-20 py-32">
                        <div className="w-16 h-16 border-2 border-zinc-700 rotate-45 flex items-center justify-center mb-8">
                           <div className="w-2 h-2 bg-zinc-700 rounded-full animate-pulse" />
                        </div>
                        <h3 className="text-xs font-black tracking-[0.4em] uppercase text-center mb-2">Market Intelligence</h3>
                        <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest text-center px-8">분석할 아이템을 왼쪽 리스트에서 선택해주세요</p>
                      </div>
                    )}
                  </section>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </main>

        <footer className="mt-20 border-t border-white/5 py-12 opacity-20 text-center">
          <p className="text-[9px] font-black uppercase tracking-[0.5em]">DDINGTION CALCULATOR 2026</p>
        </footer>
      </div>
    </MarketProvider>
  );
}