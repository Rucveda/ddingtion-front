"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { request } from "@/utils/api";
import { motion, AnimatePresence } from "framer-motion";

import { MarketProvider } from "./MarketContext";
import SearchTab from "./SearchTab";
import CalcTab from "./CalcTab";
import EtcTab from "./EtcTab";
import AdminTab from "./AdminTab";

export default function MarketIntelligence() {
  const router = useRouter();
  const [dbItems, setDbItems] = useState<any[]>([]);
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<"SEARCH" | "CALC" | "ETC" | "ADMIN">("SEARCH");
  const [userRole, setUserRole] = useState<string>("USER");

  /**
   * 🛠️ [이미지 보안 패치]
   * http 주소를 https로 강제 변환하여 Mixed Content 에러를 방지합니다.
   */
  const getSecureUrl = (url: string) => url?.replace("http://", "https://") || "";

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
      <div className="min-h-screen bg-[#010101] text-zinc-100 font-sans select-none relative overflow-x-hidden">
        <style jsx global>{`
          html { scrollbar-gutter: stable; }
          .premium-abyss-bg {
            position: fixed; inset: -15%; z-index: 0;
            background: radial-gradient(circle at 20% 30%, rgba(59, 130, 246, 0.1) 0%, transparent 40%),
                        radial-gradient(circle at 80% 20%, rgba(239, 68, 68, 0.08) 0%, transparent 40%),
                        radial-gradient(circle at 50% 50%, rgba(15, 15, 15, 1) 0%, rgba(1, 1, 1, 1) 100%);
            filter: blur(80px); pointer-events: none;
          }
          .bg-texture {
            position: fixed; inset: 0; z-index: 1; opacity: 0.3; pointer-events: none;
            background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='4' height='4' viewBox='0 0 4 4'%3E%3Cpath fill='%23ffffff' fill-opacity='0.08' d='M1 3h1v1H1V3zm2-2h1v1H2V1z'%3E%3C/path%3E%3C/svg%3E");
          }
          .pixel-art { image-rendering: pixelated; }
          ::-webkit-scrollbar { width: 6px; }
          ::-webkit-scrollbar-track { background: transparent; }
          ::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.05); border-radius: 10px; }
          ::-webkit-scrollbar-thumb:hover { background: rgba(255, 255, 255, 0.1); }
          .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        `}</style>

        <div className="premium-abyss-bg" />
        <div className="bg-texture" />

        <nav className="sticky top-0 z-50 border-b border-white/5 bg-black/40 backdrop-blur-2xl">
          <div className="max-w-7xl mx-auto px-6 h-20 flex justify-between items-center relative z-10">
            <div className="flex items-center gap-8">
              <Link href="/" onClick={triggerHaptic} className="flex items-center gap-1 group shrink-0">
                <span className="text-3xl font-black tracking-tighter transition-transform group-hover:scale-105">
                  <span className="text-[#3b82f6]">D</span><span className="text-[#eab308]">D</span>
                  <span className="text-[#3b82f6]">I</span><span className="text-[#22c55e]">N</span>
                  <span className="text-[#eab308]">G</span><span className="text-[#ef4444]">T</span>
                  <span className="text-[#3b82f6]">I</span><span className="text-[#22c55e]">O</span>
                  <span className="text-[#ef4444]">N</span>
                </span>
              </Link>
              
              <div className="hidden lg:flex bg-white/5 p-1 rounded-xl border border-white/5 items-center">
                {[
                  { id: "SEARCH", label: "시세 정밀 분석" },
                  { id: "CALC", label: "강화 시뮬레이터" },
                  { id: "ETC", label: "아이템 시세" }
                ].map(t => (
                  <button 
                    key={t.id} 
                    onClick={() => { triggerHaptic(); setActiveTab(t.id as any); }} 
                    className={`px-5 py-2 rounded-lg text-xs font-black transition-all whitespace-nowrap ${activeTab === t.id ? "bg-blue-600 text-white shadow-lg" : "text-zinc-500 hover:text-white"}`}
                  >
                    {t.label}
                  </button>
                ))}
                {userRole === "ADMIN" && (
                  <button 
                    onClick={() => { triggerHaptic(); setActiveTab("ADMIN"); }} 
                    className={`ml-1 px-5 py-2 rounded-lg text-xs font-black transition-all whitespace-nowrap ${activeTab === "ADMIN" ? "bg-red-600 text-white shadow-lg" : "text-red-500/60 hover:text-red-400"}`}
                  >
                    아이템 DB 관리
                  </button>
                )}
              </div>
            </div>
            <Link href="/" onClick={triggerHaptic} className="w-10 h-10 flex items-center justify-center rounded-full bg-white/5 text-zinc-500 hover:text-white border border-white/5 transition-all shrink-0">✕</Link>
          </div>
        </nav>

        <main className="max-w-7xl mx-auto py-8 px-6 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            <aside className="lg:col-span-3 w-full sticky top-28">
              <motion.div 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-white/[0.02] border border-white/5 p-5 rounded-[32px] shadow-2xl backdrop-blur-md"
              >
                <div className="text-[11px] font-black text-zinc-500 uppercase tracking-widest mb-4 flex items-center gap-2 px-1">
                  <div className="w-1 h-3 bg-blue-600 rounded-full" /> 아이템 선택
                </div>
                
                <input 
                  type="text" placeholder="아이템 이름 입력" 
                  className="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-sm font-bold outline-none focus:border-blue-500/50 transition-all mb-4 placeholder:text-zinc-700"
                  value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                />

                <div className="max-h-[60vh] overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                  {filteredItems.map(item => (
                    <button 
                      key={item.id}
                      onClick={() => handleSelectItem(item)}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all border ${selectedItem?.id === item.id ? "bg-blue-600/10 border-blue-500/50 text-white" : "bg-white/[0.03] border-transparent text-zinc-500 hover:bg-white/10"}`}
                    >
                      <div className="w-8 h-8 flex items-center justify-center shrink-0">
                        {/* 🛠️ [이미지 보안 패치 적용] */}
                        <img src={getSecureUrl(item.iconUrl)} className="w-full h-full object-contain pixel-art" alt="" />
                      </div>
                      <span className="font-bold text-xs truncate flex-1 text-left tracking-tight">{item.name}</span>
                    </button>
                  ))}
                  {filteredItems.length === 0 && (
                    <div className="text-center py-8 text-xs text-zinc-700 font-bold uppercase tracking-widest">결과 없음</div>
                  )}
                </div>
              </motion.div>
            </aside>

            <div className="lg:col-span-9 w-full min-w-0">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab + (selectedItem?.id || "none")}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                  className="w-full"
                >
                  <section className="bg-white/[0.02] border border-white/5 p-6 md:p-10 rounded-[40px] shadow-2xl backdrop-blur-md min-h-[70vh] flex flex-col w-full overflow-hidden">
                    {selectedItem || activeTab === "ETC" || activeTab === "ADMIN" ? (
                      <div className="w-full h-full">
                        {activeTab === "SEARCH" && <SearchTab selectedItem={selectedItem} />}
                        {activeTab === "CALC" && <CalcTab selectedItem={selectedItem} />}
                        {activeTab === "ETC" && <EtcTab items={dbItems} />}
                        {/* 🛠️ [관리자 탭 2차 보안 강화] */}
                        {activeTab === "ADMIN" && userRole === "ADMIN" ? (
                          <AdminTab items={dbItems} />
                        ) : activeTab === "ADMIN" ? (
                          <div className="flex-1 flex items-center justify-center">권한이 없습니다.</div>
                        ) : null}
                      </div>
                    ) : (
                      <div className="flex-1 flex flex-col items-center justify-center opacity-30 py-20">
                        <div className="w-12 h-12 border border-zinc-700 rotate-45 flex items-center justify-center mb-6">
                           <div className="w-1.5 h-1.5 bg-zinc-700 rounded-full" />
                        </div>
                        <p className="text-sm font-black tracking-[0.2em] uppercase text-center px-4">왼쪽 리스트에서 아이템을 선택해주세요</p>
                      </div>
                    )}
                  </section>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </main>

        <footer className="mt-12 border-t border-white/5 py-10 opacity-30 text-center">
          <p className="text-[10px] font-black uppercase tracking-[0.4em]">시세 데이터 분석 시스템 // 딩션 프로토콜 2026</p>
        </footer>
      </div>
    </MarketProvider>
  );
}