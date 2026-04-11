"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { request } from "@/utils/api";
import { motion, AnimatePresence } from "framer-motion";

import { MarketProvider } from "./MarketContext";
import SearchTab from "./SearchTab";
import CalcTab from "./CalcTab";
import EtcTab from "./EtcTab";
import AdminTab from "./AdminTab";

export default function MarketIntelligence() {
  const [dbItems, setDbItems] = useState<any[]>([]);
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<"SEARCH" | "CALC" | "ETC" | "ADMIN">("SEARCH");
  const [userRole, setUserRole] = useState<string>("USER");

  const getSecureUrl = (url: string) => url?.replace("http://", "https://") || "";

  const triggerHaptic = useCallback(() => {
    if (typeof window !== "undefined" && window.navigator?.vibrate) {
      window.navigator.vibrate(10);
    }
  }, []);

  useEffect(() => {
    request("/api/auctions/items").then(data => {
      if (Array.isArray(data)) setDbItems(data);
    });

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

        <main className="max-w-7xl mx-auto py-4 px-6 relative z-10">
          {/* 🛠️ [패치] 상단바/로고/X버튼 제거 및 내부 탭 메뉴 재배치 */}
          <div className="flex flex-col gap-8">
            
            {/* 탭 버튼 정렬 (메인 CALCULATOR 버튼 아래에 위치하게 됨) */}
            <div className="flex flex-wrap items-center gap-2 bg-white/5 p-1.5 rounded-2xl border border-white/5 w-fit">
              {[
                { id: "SEARCH", label: "시세 정밀 분석" },
                { id: "CALC", label: "강화 시뮬레이터" },
                { id: "ETC", label: "아이템 시세" }
              ].map(t => (
                <button 
                  key={t.id} 
                  onClick={() => { triggerHaptic(); setActiveTab(t.id as any); }} 
                  className={`px-6 py-2.5 rounded-xl text-[11px] font-black transition-all whitespace-nowrap ${activeTab === t.id ? "bg-blue-600 text-white shadow-lg shadow-blue-900/20" : "text-zinc-500 hover:text-zinc-200"}`}
                >
                  {t.label}
                </button>
              ))}
              {userRole === "ADMIN" && (
                <button 
                  onClick={() => { triggerHaptic(); setActiveTab("ADMIN"); }} 
                  className={`ml-1 px-6 py-2.5 rounded-xl text-[11px] font-black transition-all whitespace-nowrap ${activeTab === "ADMIN" ? "bg-red-600 text-white shadow-lg shadow-red-900/20" : "text-red-500/60 hover:text-red-400"}`}
                >
                  아이템 DB 관리
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* 왼쪽 아이템 리스트 */}
              <aside className="lg:col-span-3 w-full">
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white/[0.02] border border-white/5 p-5 rounded-[32px] backdrop-blur-md"
                >
                  <div className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-4 flex items-center gap-2 px-1">
                    <div className="w-1 h-3 bg-blue-600 rounded-full" /> 아이템 선택
                  </div>
                  
                  <input 
                    type="text" placeholder="아이템 검색..." 
                    className="w-full bg-black/40 border border-white/10 p-3.5 rounded-xl text-xs font-bold outline-none focus:border-blue-500/50 transition-all mb-4 placeholder:text-zinc-800"
                    value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                  />

                  <div className="max-h-[50vh] overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                    {filteredItems.map(item => (
                      <button 
                        key={item.id}
                        onClick={() => handleSelectItem(item)}
                        className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all border ${selectedItem?.id === item.id ? "bg-blue-600/10 border-blue-500/30 text-white" : "bg-white/[0.02] border-transparent text-zinc-500 hover:bg-white/5"}`}
                      >
                        <div className="w-7 h-7 flex items-center justify-center shrink-0">
                          <img src={getSecureUrl(item.iconUrl)} className="w-full h-full object-contain pixel-art" alt="" />
                        </div>
                        <span className="font-bold text-[11px] truncate flex-1 text-left tracking-tight">{item.name}</span>
                      </button>
                    ))}
                  </div>
                </motion.div>
              </aside>

              {/* 오른쪽 메인 컨텐츠 */}
              <div className="lg:col-span-9 w-full min-w-0">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeTab + (selectedItem?.id || "none")}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className="w-full"
                  >
                    <section className="bg-white/[0.01] border border-white/5 p-6 md:p-10 rounded-[48px] shadow-2xl backdrop-blur-md min-h-[60vh] flex flex-col w-full overflow-hidden">
                      {selectedItem || activeTab === "ETC" || activeTab === "ADMIN" ? (
                        <div className="w-full h-full">
                          {activeTab === "SEARCH" && <SearchTab selectedItem={selectedItem} />}
                          {activeTab === "CALC" && <CalcTab selectedItem={selectedItem} />}
                          {activeTab === "ETC" && <EtcTab items={dbItems} />}
                          {activeTab === "ADMIN" && userRole === "ADMIN" ? (
                            <AdminTab items={dbItems} />
                          ) : activeTab === "ADMIN" ? (
                            <div className="flex-1 flex items-center justify-center text-xs font-black uppercase text-zinc-700 tracking-widest">Access Denied</div>
                          ) : null}
                        </div>
                      ) : (
                        <div className="flex-1 flex flex-col items-center justify-center opacity-20 py-20">
                          <div className="w-12 h-12 border border-zinc-700 rotate-45 flex items-center justify-center mb-6">
                             <div className="w-1 h-1 bg-zinc-700 rounded-full" />
                          </div>
                          <p className="text-[10px] font-black tracking-[0.3em] uppercase text-center">Please Select Target Item</p>
                        </div>
                      )}
                    </section>
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </div>
        </main>
      </div>
    </MarketProvider>
  );
}