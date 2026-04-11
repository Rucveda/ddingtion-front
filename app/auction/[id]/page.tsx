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
      if (distance < 0) { setTimeLeft("종료됨"); clearInterval(timer); }
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
    if (isSeller) return alert("본인이 등록한 물품은 입찰할 수 없습니다.");
    if (Number(bidAmount) <= Number(auction.currentPrice)) return alert("현재가보다 높은 금액을 입력해주세요.");
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

  if (!auction || !auction.item) return (
    <div className="min-h-screen bg-[#010101] text-zinc-500 flex items-center justify-center font-black uppercase tracking-[0.3em] animate-pulse text-xl">
      데이터 동기화 중...
    </div>
  );

  return (
    <div className="min-h-screen bg-[#010101] text-zinc-100 font-sans select-none overflow-x-hidden relative selection:bg-white selection:text-black">
      <style jsx global>{`
        .premium-abyss-bg { position: fixed; inset: -15%; z-index: 0; background: radial-gradient(circle at 20% 30%, rgba(59, 130, 246, 0.08) 0%, transparent 40%), radial-gradient(circle at 80% 70%, rgba(239, 68, 68, 0.04) 0%, transparent 40%), #010101; filter: blur(80px); pointer-events: none; }
        .pixel-art { image-rendering: pixelated; }
        .shake-active { animation: shake 0.5s ease-in-out; border-color: #ef4444 !important; }
        @keyframes shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-5px); } 75% { transform: translateX(5px); } }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.05); border-radius: 10px; }
      `}</style>
      <div className="premium-abyss-bg" />

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        {/* 상단 네비게이션 */}
        <header className="flex justify-between items-center h-20 mb-4">
          <Link href="/" className="flex items-center group">
            <span className="text-2xl font-black tracking-tighter transition-transform group-hover:scale-105">
              <span className="text-[#3b82f6]">D</span><span className="text-[#eab308]">D</span>
              <span className="text-[#3b82f6]">I</span><span className="text-[#22c55e]">N</span>
              <span className="text-[#eab308]">G</span><span className="text-[#ef4444]">T</span>
              <span className="text-[#3b82f6]">I</span><span className="text-[#22c55e]">O</span>
              <span className="text-[#ef4444]">N</span>
            </span>
          </Link>
          <Link href="/?tab=AUCTION" onClick={triggerHaptic} className="w-10 h-10 flex items-center justify-center rounded-full bg-white/5 text-zinc-500 hover:text-white border border-white/5 transition-all">✕</Link>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* --- 좌측: 아이템 정보 상세 (Sell 스타일 결과창) --- */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="lg:col-span-8 space-y-6 order-2 lg:order-1">
            <div className="bg-white/[0.02] border border-white/5 p-8 rounded-[40px] shadow-2xl backdrop-blur-md min-h-[600px]">
              
              {/* 아이템 기본 헤더 */}
              <div className="flex items-center gap-6 mb-10 bg-white/[0.03] p-6 rounded-3xl border border-white/5">
                <div className="w-16 h-16 bg-black/40 rounded-xl flex items-center justify-center border border-white/5 shrink-0 overflow-hidden">
                  <img src={getSecureUrl(auction.item.iconUrl)} className="w-10 h-10 pixel-art" alt="" />
                </div>
                <div className="min-w-0 flex-1">
                  <h1 className="text-2xl font-black tracking-tighter uppercase truncate">{auction.item.name}</h1>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-blue-500 font-black text-[10px] uppercase whitespace-nowrap">분류: {auction.item.category}</span>
                    <div className="w-1 h-1 rounded-full bg-zinc-800 shrink-0" />
                    <span className="text-zinc-600 font-black text-[10px] whitespace-nowrap">고유 식별번호: #{id}</span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-4xl font-black italic text-white/10 select-none">+{auction.enhancementLevel}</span>
                </div>
              </div>
              
              {/* 옵션 상세 출력 영역 */}
              <div className="custom-scrollbar overflow-y-auto max-h-[500px] pr-4 space-y-10">
                
                {/* 야생 장비 인챈트 스타일 */}
                {category === "WILD" && auction.enchantments && (
                  <div className="space-y-4">
                    <h2 className="text-[11px] font-black text-blue-500 uppercase tracking-widest flex items-center gap-2">
                      <div className="w-1 h-3 bg-blue-600 rounded-full" /> 적용된 인챈트 목록
                    </h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {Object.entries(auction.enchantments).map(([name, lv]: any) => (
                        <div key={name} className="flex items-center justify-between p-3.5 rounded-xl border bg-blue-600 border-blue-400 text-white shadow-lg">
                          <span className="font-bold text-xs truncate mr-2">{name}</span>
                          <span className="font-black text-[10px] bg-white/20 px-1.5 py-0.5 rounded-md shrink-0">{lv}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 아일랜드 각인 스타일 */}
                {category === "ISLAND" && auction.imprint && (
                  <div className="space-y-4">
                    <h2 className="text-[11px] font-black text-yellow-500 uppercase tracking-widest flex items-center gap-2">
                      <div className="w-1 h-3 bg-yellow-500 rounded-full" /> 활성화된 각인 효과
                    </h2>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {Object.entries(auction.imprint).map(([name, lv]: any) => (
                        <div key={name} className="flex items-center justify-between p-4 rounded-xl border bg-yellow-500 border-yellow-400 text-black shadow-lg">
                          <span className="font-bold text-xs truncate mr-2">{name}</span>
                          <span className="font-black text-[10px] bg-black/10 px-1.5 py-0.5 rounded-md shrink-0">LV.{lv}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* RPG 룬 장착 정보 */}
                {category === "RPG" && auction.runes && (
                  <div className="space-y-4">
                    <h2 className="text-[11px] font-black text-orange-500 uppercase tracking-widest flex items-center gap-2">
                      <div className="w-1 h-3 bg-orange-500 rounded-full" /> 장착된 마법 룬
                    </h2>
                    <div className="grid grid-cols-3 gap-2">
                      {auction.runes.map((rune: any, i: number) => (
                        <div key={i} className={`h-16 rounded-xl border flex flex-col items-center justify-center text-center ${rune.type ? 'bg-orange-500/10 border-orange-500/30' : 'bg-black/40 border-white/5'}`}>
                          {rune.type ? (
                            <>
                              <span className="text-[7px] font-black text-orange-600 uppercase mb-0.5">{rune.grade}</span>
                              <span className="text-[10px] font-black text-zinc-200 truncate w-full px-2">{rune.type}</span>
                            </>
                          ) : <span className="text-zinc-800 text-[10px] font-black uppercase">빈 슬롯 {i+1}</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 판매자 추가 메모 */}
                <div className="pt-6 border-t border-white/5">
                  <h2 className="text-[11px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-2 mb-4">
                    <div className="w-1 h-3 bg-zinc-600 rounded-full" /> 판매자 등록 메모
                  </h2>
                  <p className="text-sm text-zinc-400 font-medium leading-relaxed bg-black/20 p-6 rounded-2xl border border-white/5 min-h-[100px]">
                    {auction.description || "등록된 추가 정보가 없습니다."}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* --- 우측: 입찰 패널 (Sell 스타일 입력창) --- */}
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="lg:col-span-4 space-y-6 order-1 lg:order-2">
            <section className="bg-white/[0.02] border border-white/5 p-8 rounded-[32px] shadow-2xl backdrop-blur-md">
              <h2 className="text-xs font-black text-zinc-400 uppercase tracking-widest mb-8 flex items-center gap-2">
                <div className="w-1 h-3 bg-blue-600 rounded-full" /> 실시간 경매 관리
              </h2>

              <div className="space-y-6">
                {/* 시간 및 마지막 입찰자 */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-black/40 p-4 rounded-xl border border-white/5 overflow-hidden">
                    <p className="text-[9px] font-black text-red-500 uppercase mb-1 whitespace-nowrap">남은 시간</p>
                    <p className="text-lg font-mono font-black text-zinc-200 whitespace-nowrap">{timeLeft}</p>
                  </div>
                  <div className="bg-black/40 p-4 rounded-xl border border-white/5 text-right min-w-0">
                    <p className="text-[9px] font-black text-zinc-600 uppercase mb-1 whitespace-nowrap">현재 입찰자</p>
                    <p className="text-sm font-black text-cyan-400 uppercase italic truncate">{maskName(auction.lastBidder)}</p>
                  </div>
                </div>

                {/* 현재 최고가 표시 */}
                <div className="bg-black/40 p-5 rounded-2xl border border-white/5">
                  <label className="text-[11px] font-black text-yellow-500 uppercase mb-2 block tracking-widest">현재 최고 입찰가</label>
                  <div className="flex items-baseline gap-2 overflow-hidden min-w-0">
                    <span className="text-3xl font-mono font-black text-yellow-500 whitespace-nowrap truncate">
                      {formatGold(Number(auction.currentPrice))}
                    </span>
                    <span className="text-yellow-900 font-black italic shrink-0">G</span>
                  </div>
                </div>

                {/* 입찰 금액 설정 */}
                <div className="space-y-4">
                  <div className="bg-black/40 p-5 rounded-2xl border border-white/10">
                    <label className="text-[11px] font-black text-blue-500 uppercase mb-3 block tracking-widest">내 입찰 금액 설정</label>
                    <div className="flex items-baseline gap-2 overflow-hidden">
                      <input 
                        type="text" 
                        inputMode="numeric"
                        disabled={isSeller || isProcessing} 
                        value={Number(bidAmount).toLocaleString()} 
                        onChange={handleBidChange}
                        className={`w-full bg-transparent text-3xl font-mono font-black text-white outline-none min-w-0 ${isError ? 'shake-active' : ''}`}
                      />
                      <span className="text-blue-900 font-black shrink-0">G</span>
                    </div>
                  </div>
                  
                  {/* 입찰 금액 증액 버튼 */}
                  <div className="grid grid-cols-3 gap-2">
                    {[10, 20, 50].map(pct => (
                      <button 
                        key={pct} 
                        disabled={isSeller || isProcessing} 
                        onClick={() => setBidAmount(Math.floor(Number(auction.currentPrice) * (1 + pct/100)).toString())} 
                        className="py-2.5 rounded-xl font-black text-[9px] bg-white/5 border border-white/5 text-zinc-500 hover:text-white transition-all active:scale-95"
                      >
                        +{pct}% 증액
                      </button>
                    ))}
                  </div>
                </div>

                {/* 실행 버튼 세트 */}
                <div className="space-y-3 pt-4">
                  <button 
                    disabled={isSeller || isProcessing} 
                    onClick={handleBid} 
                    className={`w-full font-black py-5 rounded-xl text-sm uppercase tracking-widest transition-all shadow-xl active:scale-95 ${isSeller ? "bg-zinc-900 text-zinc-700 cursor-not-allowed" : "bg-blue-600 text-white hover:bg-blue-500"}`}
                  >
                    {isSeller ? "내 물품 입찰 불가" : "입찰 신청하기"}
                  </button>
                  
                  {auction.buyNowPrice && auction.status === 'ACTIVE' && (
                    <button 
                      disabled={isSeller || isProcessing} 
                      onClick={handleBuyNow} 
                      className="w-full font-black py-4 rounded-xl text-[10px] uppercase tracking-widest transition-all bg-white/5 text-zinc-500 hover:text-white border border-white/5"
                    >
                      {isProcessing ? "처리 중..." : `즉시 구매 (${formatGold(Number(auction.buyNowPrice))})`}
                    </button>
                  )}
                </div>
              </div>
            </section>
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
    if (!name || name === "없음") return "입찰자 없음";
    return name.substring(0, 3) + "*".repeat(Math.max(0, name.length - 3));
  }
}