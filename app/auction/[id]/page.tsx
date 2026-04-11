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
      if (distance < 0) { setTimeLeft("ENDED"); clearInterval(timer); }
      else {
        const h = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const m = Math.floor((distance % (1000 * 60)) / (1000 * 60));
        const s = Math.floor((distance % (1000 * 60)) / 1000);
        setTimeLeft(`${h}H ${m}M ${s}S`);
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
    if (isSeller) return alert("본인 경매 참여 불가");
    if (Number(bidAmount) <= Number(auction.currentPrice)) return alert("현재가보다 높아야 합니다.");
    socket?.emit("place_bid", { auctionId: id, userId: currentUser.id, bidAmount: Number(bidAmount) });
  };

  const handleBuyNow = async () => {
    triggerHaptic();
    if (!currentUser) return router.push("/login");
    if (!confirm("즉시 구매하시겠습니까?")) return;
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

  if (!auction || !auction.item) return <div className="min-h-screen bg-[#010101] text-zinc-500 flex items-center justify-center font-light text-xl animate-pulse uppercase tracking-widest">loading...</div>;

  return (
    <div className="min-h-screen bg-[#010101] text-zinc-100 font-sans select-none overflow-x-hidden relative selection:bg-white selection:text-black">
      <style jsx global>{`
        .premium-abyss-bg { position: fixed; inset: -15%; z-index: 0; background: radial-gradient(circle at 20% 30%, rgba(59, 130, 246, 0.08) 0%, transparent 40%), radial-gradient(circle at 80% 70%, rgba(239, 68, 68, 0.04) 0%, transparent 40%), #010101; filter: blur(80px); pointer-events: none; }
        .pixel-art { image-rendering: pixelated; }
        .shake-active { animation: shake 0.5s ease-in-out; border-color: #ef4444 !important; }
        @keyframes shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-5px); } 75% { transform: translateX(5px); } }
      `}</style>
      <div className="premium-abyss-bg" />

      <div className="max-w-6xl mx-auto px-6 relative z-10">
        <header className="flex justify-between items-center py-8">
          {/* 🛠️ [패치] 메인 페이지와 동일한 멀티컬러 로고로 변경 */}
          <Link href="/" className="flex items-center group shrink-0">
            <span className="text-2xl font-black tracking-tighter transition-transform group-hover:scale-105">
              <span className="text-[#3b82f6]">D</span><span className="text-[#eab308]">D</span>
              <span className="text-[#3b82f6]">I</span><span className="text-[#22c55e]">N</span>
              <span className="text-[#eab308]">G</span><span className="text-[#ef4444]">T</span>
              <span className="text-[#3b82f6]">I</span><span className="text-[#22c55e]">O</span>
              <span className="text-[#ef4444]">N</span>
            </span>
          </Link>
          <Link 
            href="/?tab=AUCTION" 
            onClick={triggerHaptic}
            className="w-9 h-9 flex items-center justify-center rounded-full border border-white/5 bg-white/5 text-zinc-500 hover:text-white transition-all shadow-lg active:scale-90"
          >
            <span className="text-lg font-light leading-none">✕</span>
          </Link>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 mt-4 mb-20 items-start">
          {/* --- 좌측: 상세 정보 (크기 대폭 축소) --- */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="relative bg-[#0d0d0f]/40 backdrop-blur-2xl border border-white/5 p-10 rounded-[32px] flex flex-col items-center justify-center shadow-2xl overflow-hidden">
              <div className="absolute top-8 right-8 flex flex-col items-end">
                <span className="text-5xl font-black text-white/5 select-none leading-none">+{auction.enhancementLevel}</span>
                {auction.enhancementRank && <span className="text-[9px] font-bold text-cyan-500/60 uppercase tracking-widest mt-1">{auction.enhancementRank}</span>}
              </div>

              <div className="w-40 h-40 mb-8 flex items-center justify-center relative">
                <div className="absolute inset-0 bg-blue-500/5 blur-[60px] rounded-full" />
                <img src={getSecureUrl(auction.item.iconUrl)} className="w-full h-full object-contain pixel-art drop-shadow-2xl relative z-10" alt="" />
              </div>
              
              <div className="text-center w-full relative z-10">
                <span className="bg-white/5 border border-white/5 text-zinc-500 text-[9px] font-bold px-3 py-1 rounded-full uppercase tracking-widest mb-3 inline-block">{auction.item.category}</span>
                <h1 className="text-3xl font-light mb-8 tracking-tight uppercase text-zinc-200">
                  {auction.item.name} <span className="text-blue-500 font-medium">+{auction.enhancementLevel}</span>
                </h1>
                
                <div className="w-full bg-black/20 border border-white/5 rounded-2xl p-6 text-left space-y-6">
                  {category === "WILD" && auction.enchantments && (
                    <div className="space-y-3">
                      <p className="text-[9px] font-bold text-blue-500/70 uppercase tracking-widest border-l border-blue-500/50 pl-2">Enchantments</p>
                      <div className="flex flex-wrap gap-1.5">
                        {Object.entries(auction.enchantments).map(([name, lv]: any) => (
                          <div key={name} className="bg-white/5 border border-white/5 px-2.5 py-1 rounded-md flex items-center gap-2">
                            <span className="text-[10px] font-medium text-zinc-400">{name}</span>
                            <span className="text-[9px] font-bold text-blue-400">{lv}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {category === "ISLAND" && auction.imprint && (
                    <div className="space-y-3">
                      <p className="text-[9px] font-bold text-yellow-500/70 uppercase tracking-widest border-l border-yellow-500/50 pl-2">Sigils</p>
                      <div className="flex flex-wrap gap-1.5">
                        {Object.entries(auction.imprint).map(([name, lv]: any) => (
                          <div key={name} className="bg-yellow-500/5 border border-yellow-500/10 px-3 py-1.5 rounded-lg flex items-center gap-2">
                            <span className="text-[10px] font-medium text-yellow-200/80">{name}</span>
                            <span className="text-[9px] font-bold text-yellow-500">LV.{lv}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {category === "RPG" && (
                    <div className="space-y-6">
                      {auction.runes && (
                        <div className="space-y-3">
                          <p className="text-[9px] font-bold text-orange-500/70 uppercase tracking-widest border-l border-orange-500/50 pl-2">Runes</p>
                          <div className="grid grid-cols-3 gap-2">
                            {auction.runes.map((rune: any, i: number) => (
                              <div key={i} className={`p-2 rounded-xl border flex flex-col items-center justify-center text-center h-14 ${rune.type ? 'bg-orange-500/5 border-orange-500/20' : 'bg-white/5 border-white/5'}`}>
                                {rune.type ? (
                                  <>
                                    <span className="text-[7px] font-bold text-orange-600 uppercase">{rune.grade}</span>
                                    <span className="text-[9px] font-medium text-zinc-300 leading-tight truncate w-full px-1">{rune.type}</span>
                                  </>
                                ) : <span className="text-zinc-800 text-[8px] font-bold">EMPTY</span>}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="pt-4 border-t border-white/5">
                    <p className="text-[8px] font-bold text-zinc-600 uppercase tracking-widest mb-1.5">Description</p>
                    <p className="text-[12px] text-zinc-500 font-light leading-relaxed">{auction.description || "상세 설명이 없습니다."}</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* --- 우측: 입찰 터미널 (UI 크기 최적화) --- */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col">
            <div className="mb-8 flex justify-between items-end px-2">
              <div>
                <p className="text-red-500 font-bold text-[9px] uppercase tracking-[0.3em] mb-1.5 flex items-center gap-2">
                  <span className="w-1 h-1 rounded-full bg-red-500 animate-pulse" /> Time Remaining
                </p>
                <p className="text-3xl font-mono font-light text-zinc-200">{timeLeft}</p>
              </div>
              <div className="text-right">
                <p className="text-zinc-500 font-bold text-[9px] uppercase tracking-[0.2em] mb-1.5">Last Bidder</p>
                <span className="text-cyan-400 font-medium tracking-widest text-xs uppercase italic">{maskName(auction.lastBidder)}</span>
              </div>
            </div>

            <div className="bg-white/[0.02] border border-white/5 p-8 rounded-[32px] space-y-8 shadow-2xl">
              <div>
                <p className="text-zinc-600 font-bold text-[9px] uppercase tracking-[0.2em] mb-3 ml-1">Current Price</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-6xl font-light text-yellow-400 tracking-tighter">{formatGold(Number(auction.currentPrice))}</span>
                  <span className="text-zinc-700 font-bold text-lg uppercase">G</span>
                </div>
              </div>

              <div className="space-y-4">
                <div className="relative">
                  <p className="text-[9px] font-bold text-zinc-700 uppercase mb-2 ml-1 tracking-widest">Your Bid</p>
                  <input 
                    type="text" 
                    inputMode="numeric" 
                    disabled={isSeller || isProcessing} 
                    value={Number(bidAmount).toLocaleString()} 
                    onChange={handleBidChange} 
                    className={`w-full bg-black/40 border border-white/10 p-6 rounded-2xl text-4xl font-mono font-light outline-none transition-all text-white ${isError ? 'shake-active border-red-500' : 'focus:border-blue-500/30'}`} 
                  />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[10, 20, 50].map(pct => (
                    <button key={pct} disabled={isSeller || isProcessing} onClick={() => setBidAmount(Math.floor(Number(auction.currentPrice) * (1 + pct/100)).toString())} className="bg-white/5 hover:bg-white/10 text-zinc-500 py-2.5 rounded-xl text-[10px] font-bold border border-white/5 transition-all">+{pct}%</button>
                  ))}
                </div>
              </div>

              <div className="space-y-3 pt-4">
                <button 
                  disabled={isSeller || isProcessing} 
                  onClick={handleBid} 
                  className={`w-full font-bold py-5 rounded-2xl text-lg tracking-widest transition-all active:scale-95 shadow-xl ${isSeller ? "bg-zinc-900 text-zinc-700 cursor-not-allowed" : "bg-blue-600 text-white hover:bg-blue-500"}`}
                >
                  {isSeller ? "CANNOT BID" : "PLACE BID"}
                </button>
                {auction.buyNowPrice && auction.status === 'ACTIVE' && (
                  <button 
                    disabled={isSeller || isProcessing} 
                    onClick={handleBuyNow} 
                    className="w-full font-medium py-4 rounded-2xl text-[13px] tracking-widest transition-all bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10 border border-white/5"
                  >
                    {isProcessing ? "PROCESSING..." : `BUY NOW : ${formatGold(Number(auction.buyNowPrice))} G`}
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
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
    if (!name || name === "없음") return "NO BIDDER";
    return name.substring(0, 3) + "*".repeat(Math.max(0, name.length - 3));
  }
}