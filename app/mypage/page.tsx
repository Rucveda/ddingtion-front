"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { request } from "@/utils/api"; 
import { motion, AnimatePresence } from "framer-motion";

export default function MyPage() {
  const [user, setUser] = useState<any>(null);
  const [myAuctions, setMyAuctions] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const triggerHaptic = useCallback(() => {
    if (typeof window !== "undefined" && window.navigator?.vibrate) {
      window.navigator.vibrate(10);
    }
  }, []);

  useEffect(() => {
    const fetchAllData = async () => {
      const storedUser = localStorage.getItem("user");
      if (!storedUser) {
        router.push("/login");
        return;
      }

      try {
        const freshUser = await request("/api/auth/me");
        if (freshUser) {
          setUser(freshUser);
          localStorage.setItem("user", JSON.stringify(freshUser));
          const auctionData = await request("/api/auctions");
          if (auctionData) {
            setMyAuctions(auctionData.filter((a: any) => a.sellerId === freshUser.id));
          }
        }
      } catch (err) {
        console.error("데이터 동기화 에러:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchAllData();
  }, [router]);

  if (loading) return (
    <div className="min-h-screen bg-[#010101] flex items-center justify-center">
      <div className="text-zinc-500 font-black uppercase tracking-[0.3em] animate-pulse">Syncing Profile...</div>
    </div>
  );
  
  if (!user) return null;

  const score = user.reputationScore || 0;
  const repUI = score >= 4.5 ? { label: "신용", color: "text-emerald-400", bg: "bg-emerald-500/10" } :
                score >= 3.5 ? { label: "성실", color: "text-blue-400", bg: "bg-blue-500/10" } :
                score >= 2.0 ? { label: "보통", color: "text-zinc-400", bg: "bg-zinc-500/10" } :
                               { label: "경계", color: "text-red-400", bg: "bg-red-500/10" };

  return (
    <div className="min-h-screen bg-[#010101] text-zinc-100 font-sans select-none relative overflow-x-hidden">
      
      <style jsx global>{`
        .premium-abyss-bg {
          position: fixed; inset: -15%; z-index: 0;
          background: radial-gradient(circle at 20% 30%, rgba(59, 130, 246, 0.12) 0%, transparent 40%),
                      radial-gradient(circle at 80% 20%, rgba(239, 68, 68, 0.08) 0%, transparent 40%),
                      radial-gradient(circle at 50% 50%, rgba(15, 15, 15, 1) 0%, rgba(1, 1, 1, 1) 100%);
          filter: blur(80px); pointer-events: none;
        }
        .bg-texture {
          position: fixed; inset: 0; z-index: 1; opacity: 0.3; pointer-events: none;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='4' height='4' viewBox='0 0 4 4'%3E%3Cpath fill='%23ffffff' fill-opacity='0.08' d='M1 3h1v1H1V3zm2-2h1v1H2V1z'%3E%3C/path%3E%3C/svg%3E");
        }
        .pixel-art { image-rendering: pixelated; }
      `}</style>

      <div className="premium-abyss-bg" />
      <div className="bg-texture" />

      <nav className="sticky top-0 z-50 border-b border-white/5 bg-black/40 backdrop-blur-2xl">
        <div className="max-w-7xl mx-auto px-6 h-20 flex justify-between items-center relative z-10">
          <Link href="/" onClick={triggerHaptic} className="flex items-center gap-1 group">
            <span className="text-3xl font-black tracking-tighter transition-transform group-hover:scale-105">
              <span className="text-[#3b82f6]">D</span><span className="text-[#eab308]">D</span>
              <span className="text-[#3b82f6]">I</span><span className="text-[#22c55e]">N</span>
              <span className="text-[#eab308]">G</span><span className="text-[#ef4444]">T</span>
              <span className="text-[#3b82f6]">I</span><span className="text-[#22c55e]">O</span>
              <span className="text-[#ef4444]">N</span>
            </span>
          </Link>

          {/* 🛠️ [패치] X 버튼 경로 수정: AUCTION 탭으로 이동 */}
          <Link 
            href="/?tab=AUCTION" 
            onClick={triggerHaptic}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-white/5 text-zinc-500 hover:text-white hover:bg-white/10 border border-white/5 transition-all"
          >
            <span className="text-lg font-light leading-none">✕</span>
          </Link>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-6 py-16 relative z-10">
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          
          <section className="bg-white/[0.02] border border-white/5 p-10 rounded-[40px] mb-10 flex flex-col md:flex-row items-center gap-10 shadow-2xl relative overflow-hidden">
            <div className="w-24 h-24 bg-zinc-900 border border-white/10 rounded-3xl flex items-center justify-center relative shrink-0">
               <div className="w-10 h-10 border-2 border-zinc-700 rotate-45 flex items-center justify-center">
                  <div className="w-3 h-3 bg-zinc-700 rounded-full" />
               </div>
               <span className="absolute -bottom-2 -right-2 text-2xl">👤</span>
            </div>

            <div className="text-center md:text-left flex-1">
              <div className="flex flex-col md:flex-row items-center gap-4 mb-3">
                <h1 className="text-4xl font-black tracking-tight uppercase">{user.ingameName}</h1>
                <span className={`text-[10px] font-black px-3 py-1 rounded-md border ${repUI.color} ${repUI.bg} border-current/20 tracking-widest`}>
                  {repUI.label}
                </span>
              </div>
              <p className="text-zinc-600 font-bold text-xs uppercase tracking-[0.3em]">계정 식별번호: {user.loginId}</p>
            </div>
          </section>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
            <div className="md:col-span-4 space-y-6">
              <div className="bg-white/[0.02] border border-white/5 p-8 rounded-[32px] group">
                <p className="text-[10px] text-zinc-500 font-black uppercase mb-4 tracking-widest">신뢰 점수</p>
                <div className="flex items-baseline gap-2">
                  <span className={`text-5xl font-black ${repUI.color}`}>{score.toFixed(1)}</span>
                  <span className="text-zinc-700 text-lg font-bold">/ 5.0</span>
                </div>
                <div className="h-[1px] w-full bg-white/5 my-6" />
                <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest">누적 평가 참여: {user.reviewCount || 0}건</p>
              </div>

              <div className="bg-white/[0.02] border border-white/5 p-8 rounded-[32px]">
                <p className="text-[10px] text-zinc-500 font-black uppercase mb-4 tracking-widest">판매 중인 물품</p>
                <p className="text-5xl font-black text-white">{myAuctions.length}<span className="text-lg ml-2 text-zinc-700 not-italic font-bold">건</span></p>
              </div>

              <Link href="/sell" onClick={triggerHaptic} className="block w-full bg-blue-600 text-white font-black py-5 rounded-2xl text-center hover:bg-blue-500 transition-all shadow-xl shadow-blue-900/10 active:scale-95 text-sm uppercase tracking-widest">
                아이템 등록하기
              </Link>
            </div>

            <div className="md:col-span-8 space-y-4">
              <h2 className="text-[11px] font-black text-zinc-500 uppercase tracking-[0.3em] ml-2 mb-6 flex items-center gap-3">
                <div className="w-1 h-3 bg-blue-600 rounded-full" /> 판매 목록 관리
              </h2>
              
              <div className="space-y-4">
                {myAuctions.length > 0 ? (
                  myAuctions.map((auction: any) => (
                    <div key={auction.id} className="group relative bg-white/[0.02] border border-white/5 p-6 rounded-[28px] flex items-center justify-between hover:bg-white/[0.04] transition-all">
                      <div className="flex items-center gap-6">
                        <div className="w-16 h-16 bg-zinc-900/50 rounded-2xl flex items-center justify-center p-3 border border-white/5 shrink-0 overflow-hidden relative">
                          {auction.item.iconUrl ? (
                            <img src={auction.item.iconUrl.replace("http://", "https://")} className="w-full h-full object-contain pixel-art group-hover:scale-110 transition-transform" alt="" />
                          ) : (
                            <span className="text-2xl">📦</span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 mb-1 font-bold">
                            <span className="text-[9px] text-blue-500 uppercase tracking-tighter">{auction.item.category}</span>
                            <div className="w-1 h-1 rounded-full bg-zinc-800" />
                            <span className="text-[9px] text-zinc-600 uppercase font-black">{auction.status}</span>
                          </div>
                          <h3 className="text-lg font-bold text-zinc-200 truncate group-hover:text-white transition-colors">{auction.item.name}</h3>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-8">
                        <div className="text-right">
                          <p className="text-[9px] text-zinc-600 font-black mb-1 uppercase tracking-tighter">최고 입찰가</p>
                          <p className="text-xl font-black text-yellow-400 font-mono tracking-tight">{auction.currentPrice.toLocaleString()} G</p>
                        </div>
                        <Link href={`/auction/${auction.id}`} onClick={triggerHaptic} className="w-10 h-10 flex items-center justify-center bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M9 18l6-6-6-6"/></svg>
                        </Link>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-24 border border-dashed border-white/5 rounded-[40px] text-center opacity-30">
                    <p className="text-[11px] font-black uppercase tracking-[0.4em]">진행 중인 경매가 없습니다</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </main>

      <footer className="mt-20 border-t border-white/5 py-12 opacity-30 text-center">
        <p className="text-[10px] font-black uppercase tracking-[0.5em]">DDINGTION PROTOCOL // 2026</p>
      </footer>
    </div>
  );
}