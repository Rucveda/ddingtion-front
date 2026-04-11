"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { io, Socket } from "socket.io-client";
import Link from "next/link";
import { request } from "@/utils/api"; 
import { motion, AnimatePresence } from "framer-motion";

interface CompletedAuction {
  id: number;
  currentPrice: number;
  endTime: string;
  seller: { ingameName: string };
}

export default function AuctionDetail() {
  const { id } = useParams();
  const router = useRouter();
  
  const [auction, setAuction] = useState<any>(null);
  const [bidAmount, setBidAmount] = useState<string>("0"); 
  const [socket, setSocket] = useState<Socket | null>(null);
  const [recentSales, setRecentSales] = useState<CompletedAuction[]>([]);
  const [timeLeft, setTimeLeft] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false); 
  const [isError, setIsError] = useState(false);
  const GAME_MAX_PRICE = 10000000000; 

  const getSecureUrl = (url: string) => url?.replace("http://", "https://") || "";

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

  const userStr = typeof window !== "undefined" ? localStorage.getItem("user") : null;
  const currentUser = userStr ? JSON.parse(userStr) : null;
  const isSeller = auction && currentUser && Number(auction.sellerId) === Number(currentUser.id);

  const category = useMemo(() => {
    if (!auction?.item?.category) return null;
    const cat = auction.item.category.toUpperCase();
    if (cat.includes("WILD") || cat.includes("야생")) return "WILD";
    if (cat.includes("ISLAND") || cat.includes("아일랜드")) return "ISLAND";
    if (cat.includes("RPG")) return "RPG";
    return "OTHER";
  }, [auction]);

  useEffect(() => {
    const initData = async () => {
      try {
        const data = await request(`/api/auctions/${id}`);
        if (data) {
          setAuction(data);
          setBidAmount(Math.floor(Number(data.currentPrice) * 1.1).toString());
          fetchRecentSales(data.itemId);
        }
      } catch (err) { console.error(err); }
    };
    initData();

    const newSocket = io("https://ddingtion-back.onrender.com");
    setSocket(newSocket);
    newSocket.emit("join_auction", id);
    newSocket.on("bid_updated", (data) => {
      setAuction((prev: any) => ({ ...prev, currentPrice: data.newPrice, lastBidder: data.bidderName }));
    });
    newSocket.on("auction_finished", (data) => {
      alert(`경매 종료. 낙찰자: ${data.winner}`);
      router.replace("/?tab=AUCTION"); 
    });
    return () => { newSocket.close(); };
  }, [id, router]);

  useEffect(() => {
    if (!auction || auction.status !== 'ACTIVE') return;
    const timer = setInterval(() => {
      const now = new Date().getTime();
      const end = new Date(auction.endTime).getTime();
      const distance = end - now;
      if (distance < 0) { setTimeLeft("경매 종료"); clearInterval(timer); }
      else {
        const h = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const m = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const s = Math.floor((distance % (1000 * 60)) / 1000);
        setTimeLeft(`${h}시간 ${m}분 ${s}초`);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [auction]);

  const fetchRecentSales = async (itemId: number) => {
    const data = await request(`/api/auctions/completed?itemId=${itemId}&limit=5`);
    if (data) setRecentSales(data);
  };

  const handleBid = () => {
    triggerHaptic();
    if (!currentUser) return router.push("/login");
    if (isSeller) return alert("본인이 등록한 물품에는 입찰할 수 없습니다.");
    if (Number(bidAmount) <= Number(auction.currentPrice)) return alert("현재가보다 높은 금액을 입력해야 합니다.");
    socket?.emit("place_bid", { auctionId: id, userId: currentUser.id, bidAmount: Number(bidAmount) });
  };

  const handleBuyNow = async () => {
    triggerHaptic();
    if (!currentUser) return router.push("/login");
    if (!confirm("즉시 구매를 진행하시겠습니까?")) return;
    setIsProcessing(true);
    try {
      const result = await request(`/api/auctions/${id}/buy`, { method: "POST" });
      if (result?.roomId) {
        socket?.emit('auction_finished', { auctionId: id, winner: currentUser.ingameName });
        localStorage.setItem("openChatId", result.roomId.toString());
        router.replace("/?tab=AUCTION");
      }
    } catch (err) { setIsProcessing(false); }
  };

  if (!auction || !auction.item) return (
    <div className="min-h-screen bg-[#010101] text-zinc-100 font-sans select-none relative flex flex-col items-center justify-center">
      <style jsx global>{`
        .premium-abyss-bg { position: fixed; inset: -15%; z-index: 0; background: radial-gradient(circle at 20% 30%, rgba(59, 130, 246, 0.08) 0%, transparent 40%), radial-gradient(circle at 80% 20%, rgba(239, 68, 68, 0.08) 0%, transparent 40%), #010101; filter: blur(80px); pointer-events: none; }
      `}</style>
      <div className="premium-abyss-bg" />
      <div className="text-xl font-black uppercase tracking-[0.4em] text-zinc-500 animate-pulse z-10">Linking Data...</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#010101] text-zinc-100 font-sans select-none relative overflow-x-hidden selection:bg-white selection:text-black">
      <style jsx global>{`
        .premium-abyss-bg { position: fixed; inset: -15%; z-index: 0; background: radial-gradient(circle at 20% 30%, rgba(59, 130, 246, 0.08) 0%, transparent 40%), radial-gradient(circle at 80% 20%, rgba(239, 68, 68, 0.08) 0%, transparent 40%), radial-gradient(circle at 50% 50%, rgba(15, 15, 15, 1) 0%, rgba(1, 1, 1, 1) 100%); filter: blur(80px); pointer-events: none; }
        .bg-texture { position: fixed; inset: 0; z-index: 1; opacity: 0.3; pointer-events: none; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='4' height='4' viewBox='0 0 4 4'%3E%3Cpath fill='%23ffffff' fill-opacity='0.08' d='M1 3h1v1H1V3zm2-2h1v1H2V1z'%3E%3C/path%3E%3C/svg%3E"); }
        .pixel-art { image-rendering: pixelated; }
        .shake-active { animation: shake 0.5s ease-in-out; border-color: #ef4444 !important; }
        @keyframes shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-5px); } 75% { transform: translateX(5px); } }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.05); border-radius: 10px; }
      `}</style>

      <div className="premium-abyss-bg" />
      <div className="bg-texture" />

      <nav className="sticky top-0 z-50 border-b border-white/5 bg-black/40 backdrop-blur-2xl">
        <div className="max-w-7xl mx-auto px-6 h-20 flex justify-between items-center relative z-10">
          <Link href="/" className="flex items-center group gap-1">
            <span className="text-3xl font-black tracking-tighter transition-transform group-hover:scale-105">
              <span className="text-[#3b82f6]">D</span><span className="text-[#eab308]">D</span>
              <span className="text-[#3b82f6]">I</span><span className="text-[#22c55e]">N</span>
              <span className="text-[#eab308]">G</span><span className="text-[#ef4444]">T</span>
              <span className="text-[#3b82f6]">I</span><span className="text-[#22c55e]">O</span>
              <span className="text-[#ef4444]">N</span>
            </span>
          </Link>
          <Link href="/?tab=AUCTION" onClick={triggerHaptic} className="w-10 h-10 flex items-center justify-center rounded-full bg-white/5 text-zinc-500 hover:text-white border border-white/5 transition-all">✕</Link>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-10 px-6 relative z-10">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* --- 좌측: 상세 정보 패널 --- */}
          <div className="lg:col-span-8 space-y-6">
            <div className="bg-white/[0.02] border border-white/5 p-10 rounded-[40px] shadow-2xl backdrop-blur-md min-h-[600px]">
              
              <div className="flex items-center gap-6 mb-12 bg-white/[0.03] p-6 rounded-3xl border border-white/5 relative overflow-hidden">
                <div className="w-20 h-20 bg-black/40 rounded-2xl flex items-center justify-center border border-white/5 shrink-0 shadow-inner">
                  <img src={getSecureUrl(auction.item.iconUrl)} className="w-12 h-12 pixel-art" alt="" />
                </div>
                <div className="min-w-0 flex-1">
                  <h1 className="text-3xl font-black tracking-tighter uppercase truncate text-zinc-100">{auction.item.name}</h1>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-blue-500 font-black text-[11px] uppercase tracking-wider whitespace-nowrap">분류: {auction.item.category}</span>
                    <div className="w-1 h-1 rounded-full bg-zinc-800 shrink-0" />
                    <span className="text-zinc-600 font-black text-[11px] uppercase tracking-wider whitespace-nowrap">ID: #{id}</span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-5xl font-black italic text-white/10 select-none">+{auction.enhancementLevel}</span>
                </div>
              </div>
              
              <div className="custom-scrollbar overflow-y-auto max-h-[550px] pr-4 space-y-12">
                {category === "WILD" && auction.enchantments && (
                  <div className="space-y-6">
                    <h2 className="text-[12px] font-black text-blue-500 uppercase tracking-[0.2em] flex items-center gap-3">
                      <div className="w-1 h-4 bg-blue-600 rounded-full" /> 적용된 인챈트 데이터
                    </h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {Object.entries(auction.enchantments).map(([name, lv]: any) => (
                        <div key={name} className="flex items-center justify-between p-4 rounded-2xl border bg-blue-600 border-blue-400 text-white shadow-lg">
                          <span className="font-bold text-xs truncate mr-1">{name}</span>
                          <span className="font-black text-[10px] bg-white/20 px-1.5 py-0.5 rounded-md shrink-0">{lv}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {category === "ISLAND" && auction.imprint && (
                  <div className="space-y-6">
                    <h2 className="text-[12px] font-black text-yellow-500 uppercase tracking-[0.2em] flex items-center gap-3">
                      <div className="w-1 h-4 bg-yellow-500 rounded-full" /> 활성화 각인 매트릭스
                    </h2>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {Object.entries(auction.imprint).map(([name, lv]: any) => (
                        <div key={name} className="flex items-center justify-between p-5 rounded-2xl border bg-yellow-500 border-yellow-400 text-black shadow-lg">
                          <span className="font-bold text-xs truncate mr-1">{name}</span>
                          <span className="font-black text-[10px] bg-black/10 px-1.5 py-0.5 rounded-md shrink-0">LV.{lv}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {category === "RPG" && (
                  <div className="space-y-12">
                    {/* RPG 룬 정보 */}
                    {auction.runes && (
                      <div className="space-y-6">
                        <h2 className="text-[12px] font-black text-orange-500 uppercase tracking-[0.2em] flex items-center gap-3">
                          <div className="w-1 h-4 bg-orange-500 rounded-full" /> 장착된 마법 룬 유닛
                        </h2>
                        <div className="grid grid-cols-3 gap-4">
                          {auction.runes.map((rune: any, i: number) => (
                            <div key={i} className={`h-20 rounded-2xl border flex flex-col items-center justify-center text-center ${rune.type ? 'bg-orange-500/10 border-orange-500/30' : 'bg-black/40 border-white/5 opacity-40'}`}>
                              {rune.type ? (
                                <>
                                  <span className="text-[8px] font-black text-orange-600 uppercase mb-1">{rune.grade}</span>
                                  <span className="text-[11px] font-black text-zinc-100 truncate w-full px-3">{rune.type}</span>
                                </>
                              ) : <span className="text-zinc-800 text-[10px] font-black uppercase">Slot {i+1}</span>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {/* RPG 스킬 정보 (누락분 추가) */}
                    {auction.skills && (
                      <div className="space-y-6">
                        <h2 className="text-[12px] font-black text-purple-500 uppercase tracking-[0.2em] flex items-center gap-3">
                          <div className="w-1 h-4 bg-purple-600 rounded-full" /> 전투 스킬 레벨링
                        </h2>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                          {Object.entries(auction.skills).map(([name, lv]: any) => (
                            <div key={name} className="flex items-center justify-between p-4 rounded-xl border bg-purple-600 border-purple-400 text-white shadow-lg">
                              <span className="font-bold text-xs truncate mr-1">{name}</span>
                              <span className="font-black text-[9px] bg-white/20 px-1.5 py-0.5 rounded-md shrink-0">Lv.{lv}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="pt-8 border-t border-white/5 relative">
                  <h2 className="text-[12px] font-black text-zinc-500 uppercase tracking-[0.2em] flex items-center gap-3 mb-6">
                    <div className="w-1 h-4 bg-zinc-600 rounded-full" /> 판매자 브리핑
                  </h2>
                  <div className="text-sm text-zinc-400 font-medium leading-relaxed bg-black/20 p-8 rounded-3xl border border-white/5 min-h-[120px] shadow-inner">
                    {auction.description || "등록된 상세 정보가 없습니다."}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* --- 우측: 조작 터미널 --- */}
          <div className="lg:col-span-4 space-y-6">
            <section className="bg-white/[0.02] border border-white/5 p-8 rounded-[32px] shadow-2xl backdrop-blur-md">
              <h2 className="text-xs font-black text-zinc-400 uppercase tracking-widest mb-10 flex items-center gap-2">
                <div className="w-1 h-3 bg-blue-600 rounded-full" /> 경매 라이브 터미널
              </h2>

              <div className="space-y-8">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-black/40 p-5 rounded-2xl border border-white/5 overflow-hidden">
                    <p className="text-[10px] font-black text-red-500 uppercase mb-2 tracking-tighter whitespace-nowrap">남은 경매 시간</p>
                    <p className="text-xl font-mono font-black text-zinc-200 whitespace-nowrap">{timeLeft}</p>
                  </div>
                  <div className="bg-black/40 p-5 rounded-2xl border border-white/5 text-right overflow-hidden min-w-0">
                    <p className="text-[10px] font-black text-zinc-600 uppercase mb-2 tracking-tighter whitespace-nowrap">최고 입찰자</p>
                    <p className="text-sm font-black text-cyan-400 uppercase italic truncate">{maskName(auction.lastBidder)}</p>
                  </div>
                </div>

                <div className="bg-black/40 p-6 rounded-2xl border border-white/5 relative">
                  <label className="text-[11px] font-black text-yellow-500 uppercase mb-3 block tracking-widest">현재 최고가 (Bid)</label>
                  <div className="flex items-baseline gap-2 overflow-hidden min-w-0">
                    <span className="text-4xl font-mono font-black text-yellow-500 whitespace-nowrap truncate">{formatGold(Number(auction.currentPrice))}</span>
                    <span className="text-yellow-900 font-black italic shrink-0">G</span>
                  </div>
                </div>

                <div className="space-y-4 pt-4 border-t border-white/5">
                  <div className="bg-black/40 p-6 rounded-2xl border border-white/10 relative">
                    <label className="text-[11px] font-black text-blue-500 uppercase mb-3 block tracking-widest">내 입찰 금액 입력</label>
                    <div className="flex items-baseline gap-2 overflow-hidden relative">
                      <input 
                        type="text" 
                        inputMode="numeric"
                        disabled={isSeller || isProcessing} 
                        value={Number(bidAmount).toLocaleString()} 
                        onChange={handleBidChange}
                        className={`w-full bg-transparent text-4xl font-mono font-black text-white outline-none min-w-0 ${isError ? 'shake-active' : ''}`}
                      />
                      <span className="text-blue-900 font-black shrink-0 relative top-1">G</span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-2">
                    {[10, 20, 50].map(pct => (
                      <button key={pct} disabled={isSeller || isProcessing} onClick={() => setBidAmount(Math.floor(Number(auction.currentPrice) * (1 + pct/100)).toString())} className="py-3 rounded-xl font-black text-[10px] bg-white/5 border border-white/5 text-zinc-500 hover:text-white transition-all active:scale-95 whitespace-nowrap">+{pct}% 부스트</button>
                    ))}
                  </div>
                </div>

                <div className="space-y-4 pt-8">
                  <button 
                    disabled={isSeller || isProcessing} 
                    onClick={handleBid} 
                    className={`w-full font-black py-6 rounded-2xl text-base uppercase tracking-[0.2em] transition-all shadow-xl active:scale-95 ${isSeller ? "bg-zinc-900 text-zinc-700 cursor-not-allowed" : "bg-blue-600 text-white hover:bg-blue-500 shadow-blue-900/20"}`}
                  >
                    {isSeller ? "내 물품 입찰 불가" : "경매 입찰 신청"}
                  </button>
                  
                  {auction.buyNowPrice && auction.status === 'ACTIVE' && (
                    <button 
                      disabled={isSeller || isProcessing} 
                      onClick={handleBuyNow} 
                      className="w-full font-black py-4 rounded-xl text-[11px] uppercase tracking-widest transition-all bg-white/5 text-zinc-500 hover:text-white border border-white/5 active:scale-95 whitespace-nowrap"
                    >
                      {isProcessing ? "처리 중..." : `즉시 구매 실행 (${formatGold(Number(auction.buyNowPrice))})`}
                    </button>
                  )}
                </div>
              </div>
            </section>
          </div>
        </motion.div>
      </main>

      <footer className="mt-20 border-t border-white/5 py-12 opacity-30 text-center relative z-10">
        <div className="text-[10px] font-black uppercase tracking-[0.5em]">DDINGTION PROTOCOL // 2026 // VERSION 2.1</div>
      </footer>
    </div>
  );

  function handleBidChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value.replace(/[^0-9]/g, "");
    if (Number(val) > GAME_MAX_PRICE) {
      triggerHaptic(); setIsError(true); setTimeout(() => setIsError(false), 500);
      return;
    }
    setBidAmount(val);
  }

  function maskName(name: string) {
    if (!name || name === "없음") return "입찰자 없음";
    return name.substring(0, 3) + "*".repeat(Math.max(0, name.length - 3));
  }
}