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

  // 💡 카테고리 판정 보조
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
      router.replace("/"); 
    });
    return () => { newSocket.close(); };
  }, [id, router]);

  useEffect(() => {
    if (!auction || auction.status !== 'ACTIVE') return;
    const timer = setInterval(() => {
      const now = new Date().getTime();
      const end = new Date(auction.endTime).getTime();
      const distance = end - now;
      if (distance < 0) { setTimeLeft("AUCTION ENDED"); clearInterval(timer); }
      else {
        const h = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const m = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
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
        router.replace("/");
      }
    } catch (err) { setIsProcessing(false); }
  };

  if (!auction || !auction.item) return <div className="min-h-screen bg-[#010101] text-white flex items-center justify-center font-black italic text-3xl animate-pulse uppercase">Uplinking...</div>;

  return (
    <div className="min-h-screen bg-[#010101] text-zinc-100 font-sans select-none overflow-x-hidden relative selection:bg-white selection:text-black">
      <style jsx global>{`
        .premium-abyss-bg { position: fixed; inset: -15%; z-index: 0; background: radial-gradient(circle at 20% 30%, rgba(59, 130, 246, 0.1) 0%, transparent 40%), radial-gradient(circle at 80% 70%, rgba(239, 68, 68, 0.05) 0%, transparent 40%), #010101; filter: blur(80px); pointer-events: none; }
        .pixel-art { image-rendering: pixelated; }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
      `}</style>
      <div className="premium-abyss-bg" />

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <header className="flex justify-between items-center py-12 mb-8">
          <Link href="/" className="text-3xl font-black tracking-tighter transition-transform hover:scale-105">DDINGTION</Link>
          <button onClick={() => router.back()} className="w-10 h-10 flex items-center justify-center rounded-full border border-white/10 bg-black/40 text-zinc-500 hover:text-white transition-all">✕</button>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 mb-24 items-start">
          {/* --- 좌측: 아이템 비주얼 및 상세 옵션 --- */}
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="space-y-8">
            <div className="relative bg-[#0d0d0f]/60 backdrop-blur-3xl border border-white/5 p-16 rounded-[46px] flex flex-col items-center justify-center shadow-2xl overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-b from-white/[0.02] to-transparent pointer-events-none" />
              
              {/* 강화 수치 오버레이 */}
              <div className="absolute top-10 right-10 flex flex-col items-end">
                <span className="text-7xl font-black italic text-white/5 select-none leading-none">+{auction.enhancementLevel}</span>
                {auction.enhancementRank && <span className="text-[10px] font-black text-cyan-500 uppercase tracking-widest mt-2">{auction.enhancementRank} RANK</span>}
              </div>

              <div className="w-64 h-64 mb-12 flex items-center justify-center relative">
                <div className="absolute inset-0 bg-blue-500/10 blur-[80px] rounded-full" />
                <img src={auction.item.iconUrl || "/default.png"} className="w-full h-full object-contain pixel-art drop-shadow-[0_0_30px_rgba(255,255,255,0.2)] relative z-10" alt="" />
              </div>
              
              <div className="text-center w-full relative z-10">
                <span className="bg-white/5 border border-white/10 text-zinc-500 text-[10px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest mb-4 inline-block">{auction.item.category}</span>
                <h1 className="text-6xl font-black mb-10 tracking-tighter leading-none uppercase italic">
                  {auction.item.name}
                  <span className="text-blue-500 ml-4">+{auction.enhancementLevel}</span>
                </h1>
                
                {/* 💡 [패치] 카테고리별 상세 옵션 출력 엔진 */}
                <div className="w-full bg-black/40 border border-white/5 rounded-[32px] p-8 text-left space-y-8">
                  {/* 야생 장비 인챈트 */}
                  {category === "WILD" && auction.enchantments && (
                    <div className="space-y-4">
                      <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest border-l-2 border-blue-500 pl-3">Active Inscriptions</p>
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(auction.enchantments).map(([name, lv]: any) => (
                          <div key={name} className="bg-white/5 border border-white/10 px-3 py-1.5 rounded-lg flex items-center gap-2">
                            <span className="text-[11px] font-bold text-zinc-300">{name}</span>
                            <span className="text-[10px] font-black text-blue-400">{lv}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 아일랜드 각인 */}
                  {category === "ISLAND" && auction.imprint && (
                    <div className="space-y-4">
                      <p className="text-[10px] font-black text-yellow-500 uppercase tracking-widest border-l-2 border-yellow-500 pl-3">Sigil Augmentation</p>
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(auction.imprint).map(([name, lv]: any) => (
                          <div key={name} className="bg-yellow-500/10 border border-yellow-500/20 px-4 py-2 rounded-xl flex items-center gap-3">
                            <span className="text-xs font-bold text-yellow-200">{name}</span>
                            <span className="text-[10px] font-black bg-yellow-500 text-black px-1.5 rounded">LV.{lv}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* RPG 룬 & 스킬 */}
                  {category === "RPG" && (
                    <div className="space-y-8">
                      {/* 룬 슬롯 시각화 */}
                      {auction.runes && (
                        <div className="space-y-4">
                          <p className="text-[10px] font-black text-orange-500 uppercase tracking-widest border-l-2 border-orange-500 pl-3">룬</p>
                          <div className="grid grid-cols-3 gap-3">
                            {auction.runes.map((rune: any, i: number) => (
                              <div key={i} className={`p-3 rounded-2xl border flex flex-col items-center justify-center text-center h-20 ${rune.type ? 'bg-orange-500/5 border-orange-500/30' : 'bg-white/5 border-white/5'}`}>
                                {rune.type ? (
                                  <>
                                    <span className="text-[8px] font-black text-orange-600 uppercase mb-1">{rune.grade}</span>
                                    <span className="text-[10px] font-bold text-zinc-200 leading-tight">{rune.type}</span>
                                  </>
                                ) : <span className="text-zinc-800 font-black">EMPTY</span>}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {/* 스킬 목록 */}
                      {auction.skills && (
                        <div className="space-y-4">
                          <p className="text-[10px] font-black text-purple-500 uppercase tracking-widest border-l-2 border-purple-500 pl-3">전투 스킬</p>
                          <div className="grid grid-cols-2 gap-2">
                            {Object.entries(auction.skills).map(([name, lv]: any) => (
                              <div key={name} className="bg-purple-500/5 border border-purple-500/20 p-3 rounded-xl flex justify-between items-center">
                                <span className="text-[11px] font-bold text-purple-200">{name}</span>
                                <span className="text-[10px] font-black text-white bg-purple-600 px-2 py-0.5 rounded">MAX {lv}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="pt-4 border-t border-white/5">
                    <p className="text-[9px] font-black text-zinc-700 uppercase tracking-widest mb-2">Seller's Note</p>
                    <p className="text-sm text-zinc-400 font-medium leading-relaxed">{auction.description || "추가 정보가 없습니다."}</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* --- 우측: 입찰 터미널 --- */}
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="flex flex-col justify-center">
            <div className="mb-6">
              <p className="text-red-500 font-black text-[10px] uppercase tracking-[0.4em] mb-2 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_red]" /> Time Remaining
              </p>
              <p className="text-4xl font-mono font-black text-zinc-200 tracking-tighter">{timeLeft}</p>
            </div>

            <div className="mb-12">
              <p className="text-zinc-500 font-black text-[10px] uppercase tracking-[0.2em] mb-4">현재 최고 입찰가</p>
              <div className="flex items-baseline gap-3">
                <span className="text-8xl font-black text-yellow-400 font-mono tracking-tighter italic leading-none">{formatGold(Number(auction.currentPrice))}</span>
                <span className="text-zinc-600 font-black italic text-2xl uppercase tracking-widest">G</span>
              </div>
            </div>

            <div className="bg-black/40 backdrop-blur-3xl border border-white/5 p-10 rounded-[40px] space-y-10 shadow-2xl relative">
              <div className="flex justify-between items-center px-4 py-1 border-l-2 border-cyan-500/50 bg-cyan-500/5">
                <span className="text-zinc-500 text-xs font-bold uppercase tracking-widest">최고 입찰자</span>
                <span className="text-cyan-400 font-black tracking-[0.1em] uppercase text-sm italic">{maskName(auction.lastBidder)}</span>
              </div>

              <div className="space-y-6">
                <div className="relative">
                  <p className="text-[10px] font-black text-zinc-600 uppercase mb-3 ml-2 tracking-widest">Bid Settlement</p>
                  <input type="text" inputMode="numeric" disabled={isSeller || isProcessing} value={Number(bidAmount).toLocaleString()} onChange={handleBidChange} className={`w-full bg-black/60 border border-white/10 p-8 rounded-[28px] text-5xl font-mono font-black outline-none transition-all text-white ${isError ? 'shake-active' : 'focus:border-yellow-400/30'} ${(isSeller || isProcessing) ? "opacity-30" : ""}`} />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  {[10, 20, 50].map(pct => (
                    <button key={pct} disabled={isSeller || isProcessing} onClick={() => setBidAmount(Math.floor(Number(auction.currentPrice) * (1 + pct/100)).toString())} className="bg-white/5 hover:bg-white/10 text-zinc-400 py-4 rounded-2xl text-[11px] font-black border border-white/5 uppercase active:scale-95 disabled:opacity-10">+{pct}% BOOST</button>
                  ))}
                </div>
              </div>

              <div className="space-y-4 pt-4">
                <button disabled={isSeller || isProcessing} onClick={handleBid} className={`w-full font-black py-7 rounded-[28px] text-2xl tracking-tighter transition-all active:scale-95 shadow-xl ${isSeller ? "bg-zinc-800 text-zinc-500" : "bg-[#3b82f6] text-white"}`}>{isSeller ? "본인 경매 입찰불가" : "SUBMIT BID"}</button>
                {auction.buyNowPrice && auction.status === 'ACTIVE' && (
                  <button disabled={isSeller || isProcessing} onClick={handleBuyNow} className={`w-full font-black py-6 rounded-[28px] text-lg tracking-tight transition-all active:scale-95 border border-white/10 ${isSeller ? "bg-zinc-900 text-zinc-700" : "bg-white text-black shadow-lg"}`}>{isProcessing ? "PROCESSING..." : `즉시 구매 : ${formatGold(Number(auction.buyNowPrice))} G`}</button>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );

  // --- 보조 함수 ---
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