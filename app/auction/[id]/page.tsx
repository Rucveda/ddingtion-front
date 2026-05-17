"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { io, Socket } from "socket.io-client";
import Link from "next/link";
import { request } from "@/utils/api";
import { motion, AnimatePresence } from "framer-motion";
import { SOCKET_URL } from "@/utils/runtimeConfig";

export default function AuctionDetail() {
  const { id } = useParams();
  const router = useRouter();

  const [auction, setAuction] = useState<any>(null);
  const [bidAmount, setBidAmount] = useState<string>("0");
  const [socket, setSocket] = useState<Socket | null>(null);
  const [timeLeft, setTimeLeft] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isError, setIsError] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null); // 💡 패치: 유저 상태 관리 추가
  const [tradePolicyLoaded, setTradePolicyLoaded] = useState(false);
  const GAME_MAX_PRICE = 10000000000;

  const needsDiscordForTrade =
    tradePolicyLoaded &&
    Boolean(currentUser?.discordVerificationRequired) &&
    !currentUser?.discordLinked;

  const verifyingSession =
    typeof window !== "undefined" &&
    Boolean(localStorage.getItem("token")) &&
    !tradePolicyLoaded;

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

  // 💡 패치: Next.js 하이드레이션(Hydration) 에러 방지를 위해 마운트 이후에 로컬 스토리지 접근
  useEffect(() => {
    const userStr = localStorage.getItem("user");
    if (userStr) setCurrentUser(JSON.parse(userStr));
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      setTradePolicyLoaded(true);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const fresh = await request("/api/auth/me");
        if (!cancelled && fresh) {
          setCurrentUser(fresh);
          localStorage.setItem("user", JSON.stringify(fresh));
        }
      } catch {
        /* ignore */
      } finally {
        if (!cancelled) setTradePolicyLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

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
        }
      } catch (err) { console.error(err); }
    };
    initData();

    const newSocket = io(SOCKET_URL);
    setSocket(newSocket);
    newSocket.emit("join_auction", id);
    newSocket.on("bid_updated", (data) => {
      setAuction((prev: any) => ({ ...prev, currentPrice: data.newPrice, lastBidder: data.bidderName }));
    });
    newSocket.on("chat_error", (data: { message?: string }) => {
      if (data?.message) alert(data.message);
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
        const d = Math.floor(distance / (1000 * 60 * 60 * 24));
        const h = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const m = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const s = Math.floor((distance % (1000 * 60)) / 1000);
        setTimeLeft(d > 0 ? `${d}일 ${h}시간 ${m}분 ${s}초` : `${h}시간 ${m}분 ${s}초`);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [auction]);

  const handleBid = () => {
    triggerHaptic();
    if (!currentUser) return router.push("/login");
    if (verifyingSession) {
      alert("계정 인증 정보를 불러오는 중입니다. 잠시 후 다시 시도해 주세요.");
      return;
    }
    if (needsDiscordForTrade) {
      alert("경매 입찰은 디스코드 인증이 필요합니다. 마이페이지에서 연동해 주세요.");
      return router.push("/mypage");
    }
    if (isSeller) return alert("본인이 등록한 물품에는 입찰할 수 없습니다.");
    if (Number(bidAmount) <= Number(auction.currentPrice)) return alert("현재가보다 높은 금액을 입력해야 합니다.");
    const token = localStorage.getItem("token"); // 로그인 시 저장되는 JWT 토큰
    socket?.emit("place_bid", { auctionId: id, token, bidAmount: Number(bidAmount) });
  };

  const CHAT_OPEN_EVENT = "ddingtion_chat_open";
  const handleBuyNow = async () => {
    // 1. 사전 검증 및 진동 피드백
    triggerHaptic();
    if (!currentUser) {
      alert("로그인이 필요한 서비스입니다.");
      return router.push("/login");
    }
    if (verifyingSession) {
      alert("계정 인증 정보를 불러오는 중입니다. 잠시 후 다시 시도해 주세요.");
      return;
    }
    if (needsDiscordForTrade) {
      alert("즉시 구매는 디스코드 인증이 필요합니다. 마이페이지에서 연동해 주세요.");
      return router.push("/mypage");
    }

    // 판매자 본인 여부 확인
    if (isSeller) {
      return alert("본인이 등록한 물품은 구매할 수 없습니다.");
    }

    if (!confirm("즉시 구매를 진행하시겠습니까? 확인 시 즉시 낙찰 처리됩니다.")) return;

    setIsProcessing(true);

    try {
      // 2. 서버에 구매 요청 전송
      const result = await request(`/api/auctions/${id}/buy`, {
        method: "POST"
      });

      if (result?.roomId) {
        // 3. 로컬 스토리지에 생성된 채팅방 ID 저장
        localStorage.setItem("openChatId", result.roomId.toString());

        // 4. 핵심: 동일 탭의 ChatWidget에게 채팅창을 열라고 신호를 보냄
        window.dispatchEvent(new Event(CHAT_OPEN_EVENT));

        // 5. 메인 경매 목록 탭으로 부드럽게 이동
        // replace를 사용하여 뒤로가기 시 구매창으로 다시 오지 않게 함
        router.replace("/?tab=AUCTION");

        // (선택사항) 성공 알림
        console.log("구매 성공: 채팅방으로 연결을 시도합니다.");
      } else {
        throw new Error("채팅방 생성에 실패했습니다.");
      }
    } catch (err: any) {
      console.error("Purchase Error:", err);

      // 에러 메시지 세분화
      if (err.status === 403) {
        alert("잔액이 부족하거나 구매 권한이 없습니다.");
      } else {
        alert(err.message || "구매 처리 중 오류가 발생했습니다. 다시 시도해 주세요.");
      }
    } finally {
      setIsProcessing(false);
    }
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
                      <div className="w-1 h-4 bg-blue-600 rounded-full" /> 인챈트
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
                      <div className="w-1 h-4 bg-yellow-500 rounded-full" /> 각인
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
                          <div className="w-1 h-4 bg-orange-500 rounded-full" /> 장착된 룬
                        </h2>
                        <div className="grid grid-cols-3 gap-4">
                          {auction.runes.map((rune: any, i: number) => (
                            <div key={i} className={`h-20 rounded-2xl border flex flex-col items-center justify-center text-center ${rune.type ? 'bg-orange-500/10 border-orange-500/30' : 'bg-black/40 border-white/5 opacity-40'}`}>
                              {rune.type ? (
                                <>
                                  <span className="text-[8px] font-black text-orange-600 uppercase mb-1">{rune.grade}</span>
                                  <span className="text-[11px] font-black text-zinc-100 truncate w-full px-3">{rune.type}</span>
                                </>
                              ) : <span className="text-zinc-800 text-[10px] font-black uppercase">Slot {i + 1}</span>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {/* RPG 스킬 정보 (누락분 추가) */}
                    {auction.skills && (
                      <div className="space-y-6">
                        <h2 className="text-[12px] font-black text-purple-500 uppercase tracking-[0.2em] flex items-center gap-3">
                          <div className="w-1 h-4 bg-purple-600 rounded-full" /> 전투 스킬
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
                    <div className="w-1 h-4 bg-zinc-600 rounded-full" /> 판매자 설명
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
              <h2 className="text-xs font-black text-zinc-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                <div className="w-1 h-3 bg-blue-600 rounded-full" /> 경매 입찰 메뉴
              </h2>

                <div className="space-y-8">
                {(needsDiscordForTrade || verifyingSession) && (
                  <div className="rounded-2xl border border-indigo-500/30 bg-indigo-500/10 px-4 py-3 text-[11px] font-bold text-indigo-200 leading-relaxed">
                    {verifyingSession
                      ? "계정 인증 상태를 확인하는 중입니다."
                      : (
                        <>
                          디스코드 인증이 필요합니다.{" "}
                          <Link href="/mypage" className="underline text-white">
                            마이페이지
                          </Link>
                          에서 연동 후 입찰·즉시 구매를 이용할 수 있습니다.
                        </>
                      )}
                  </div>
                )}
                <div className="space-y-2">
                  <div className="flex items-baseline gap-3">
                    <span className="text-[11px] font-black text-red-500 uppercase tracking-widest">남은 경매 시간 :</span>
                    <span className="text-lg font-mono font-black text-zinc-200">{timeLeft}</span>
                  </div>
                  <div className="flex items-baseline gap-3">
                    <span className="text-[11px] font-black text-zinc-500 uppercase tracking-widest">최고 입찰자 :</span>
                    <span className="text-base font-black text-cyan-400 uppercase italic truncate">{maskName(auction.lastBidder)}</span>
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
                        disabled={isSeller || isProcessing || needsDiscordForTrade || verifyingSession}
                        value={Number(bidAmount).toLocaleString()}
                        onChange={handleBidChange}
                        className={`w-full bg-transparent text-4xl font-mono font-black text-white outline-none min-w-0 ${isError ? 'shake-active' : ''}`}
                      />
                      <span className="text-blue-900 font-black shrink-0 relative top-1">G</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    {[10, 20, 50].map(pct => (
                      <button key={pct} disabled={isSeller || isProcessing || needsDiscordForTrade || verifyingSession} onClick={() => setBidAmount(Math.floor(Number(auction.currentPrice) * (1 + pct / 100)).toString())} className="py-3 rounded-xl font-black text-[10px] bg-white/5 border border-white/5 text-zinc-500 hover:text-white transition-all active:scale-95 whitespace-nowrap">+{pct}%</button>
                    ))}
                  </div>
                </div>

                <div className="space-y-4 pt-8">
                    <button
                    disabled={isSeller || isProcessing || needsDiscordForTrade || verifyingSession}
                    onClick={handleBid}
                    className={`w-full font-black py-6 rounded-2xl text-base uppercase tracking-[0.2em] transition-all shadow-xl active:scale-95 ${isSeller || needsDiscordForTrade || verifyingSession ? "bg-zinc-900 text-zinc-700 cursor-not-allowed" : "bg-blue-600 text-white hover:bg-blue-500 shadow-blue-900/20"}`}
                  >
                    {isSeller ? "내 물품 입찰 불가" : needsDiscordForTrade ? "디스코드 인증 필요" : verifyingSession ? "인증 확인 중…" : "경매 입찰 신청"}
                  </button>

                  {auction.buyNowPrice && auction.status === 'ACTIVE' && (
                    <button
                      disabled={isSeller || isProcessing || needsDiscordForTrade || verifyingSession}
                      onClick={handleBuyNow}
                      className="w-full font-black py-4 rounded-xl text-[11px] uppercase tracking-widest transition-all bg-white/5 text-zinc-500 hover:text-white border border-white/5 active:scale-95 whitespace-nowrap"
                    >
                      {isProcessing ? "처리 중..." : `즉시 구매 (${formatGold(Number(auction.buyNowPrice))})`}
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