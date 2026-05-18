"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { io, Socket } from "socket.io-client";
import Link from "next/link";
import { request } from "@/utils/api";
import { motion } from "framer-motion";
import { SOCKET_URL } from "@/utils/runtimeConfig";
import { SimpleTopBar, SiteBackground, SiteFooter } from "@/components/SiteChrome";
import { isLocalDev } from "@/utils/devMode";
import { ensureLocalDummySession } from "@/utils/localDummyData";

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
  const [comments, setComments] = useState<any[]>([]);
  const [commentInput, setCommentInput] = useState("");
  const [isCommenting, setIsCommenting] = useState(false);
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
    if (isLocalDev()) {
      setCurrentUser(ensureLocalDummySession());
      setTradePolicyLoaded(true);
      return;
    }
    const userStr = localStorage.getItem("user");
    if (userStr) setCurrentUser(JSON.parse(userStr));
  }, []);

  useEffect(() => {
    if (isLocalDev()) {
      setTradePolicyLoaded(true);
      return;
    }
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
  const canAuctionTrade = auction?.status === "ACTIVE";
  const statusUI: Record<string, { label: string; className: string; description: string }> = {
    ACTIVE: {
      label: "진행 중",
      className: "bg-blue-500/10 text-blue-300 border-blue-500/20",
      description: "입찰 또는 즉시 구매가 가능한 경매입니다.",
    },
    PENDING_TRADE: {
      label: "거래 중",
      className: "bg-amber-500/10 text-amber-300 border-amber-500/20",
      description: "낙찰 후 구매자와 판매자가 거래를 확정하는 단계입니다.",
    },
    COMPLETED: {
      label: "거래 완료",
      className: "bg-emerald-500/10 text-emerald-300 border-emerald-500/20",
      description: "양측 확정이 끝나 시세 기록에 반영된 거래입니다.",
    },
    DISPUTED: {
      label: "분쟁",
      className: "bg-red-500/10 text-red-300 border-red-500/20",
      description: "신고가 접수되어 운영 확인이 필요한 거래입니다.",
    },
  };

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

    if (isLocalDev()) return;

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

  const fetchComments = useCallback(async () => {
    try {
      const data = await request(`/api/auctions/${id}/comments`);
      setComments(Array.isArray(data) ? data : []);
    } catch {
      setComments([]);
    }
  }, [id]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

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
    if (!canAuctionTrade) return alert("현재 입찰할 수 없는 경매 상태입니다.");
    if (isSeller) return alert("본인이 등록한 물품에는 입찰할 수 없습니다.");
    if (Number(bidAmount) <= Number(auction.currentPrice)) return alert("현재가보다 높은 금액을 입력해야 합니다.");
    if (isLocalDev()) {
      setAuction((prev: any) => ({ ...prev, currentPrice: bidAmount, lastBidder: currentUser.ingameName, lastBidderId: currentUser.id, bidCount: (prev.bidCount || 0) + 1 }));
      alert("로컬 더미 입찰이 반영되었습니다.");
      return;
    }
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
    if (!canAuctionTrade) {
      return alert("현재 즉시 구매할 수 없는 경매 상태입니다.");
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

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const content = commentInput.trim();
    if (!content || isCommenting) return;
    if (!currentUser) return router.push("/login");
    if (content.length > 500) return alert("댓글은 500자 이하로 입력해주세요.");

    setIsCommenting(true);
    try {
      const created = await request(`/api/auctions/${id}/comments`, {
        method: "POST",
        body: JSON.stringify({ content }),
      });
      const fallback = {
        id: Date.now(),
        content,
        createdAt: new Date().toISOString(),
        author: {
          id: currentUser.id,
          ingameName: currentUser.ingameName || currentUser.loginId || "Unknown",
          reputationScore: currentUser.reputationScore || 0,
        },
      };
      setComments((prev) => [...prev, created?.content ? created : fallback]);
      setCommentInput("");
    } catch (err: any) {
      alert(err?.message || "댓글 등록에 실패했습니다.");
    } finally {
      setIsCommenting(false);
    }
  };

  if (!auction || !auction.item) return (
    <div className="min-h-screen bg-[#010101] text-zinc-100 font-sans select-none relative flex flex-col items-center justify-center">
      <SiteBackground />
      <div className="text-xl font-black uppercase tracking-[0.4em] text-zinc-500 animate-pulse z-10">Linking Data...</div>
    </div>
  );

  const currentPrice = Number(auction.currentPrice);
  const startPrice = Number(auction.startPrice);
  const buyNowPrice = auction.buyNowPrice ? Number(auction.buyNowPrice) : null;
  const minimumBid = Math.floor(currentPrice * 1.1);
  const priceIncreaseRate = startPrice > 0 ? Math.round(((currentPrice - startPrice) / startPrice) * 100) : 0;
  const buyNowGap = buyNowPrice ? buyNowPrice - currentPrice : null;
  const auctionStatus = statusUI[auction.status] || {
    label: auction.status || "상태 확인",
    className: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
    description: "현재 경매 상태를 확인해 주세요.",
  };
  const marketAverage = auction.marketSummary?.averagePrice ? Number(auction.marketSummary.averagePrice) : null;
  const marketDiffRate = marketAverage ? Math.round(((currentPrice - marketAverage) / marketAverage) * 100) : null;

  return (
    <div className="min-h-screen bg-[#010101] text-zinc-100 font-sans select-none relative overflow-x-hidden selection:bg-white selection:text-black">
      <style jsx global>{`
        .shake-active { animation: shake 0.5s ease-in-out; border-color: #ef4444 !important; }
        @keyframes shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-5px); } 75% { transform: translateX(5px); } }
      `}</style>

      <SiteBackground />
      <SimpleTopBar onNavigate={triggerHaptic} closeHref="/?tab=AUCTION" />

      <main className="max-w-7xl mx-auto py-6 md:py-8 px-4 sm:px-6 relative z-10">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">

          {/* --- 좌측: 상세 정보 패널 --- */}
          <div className="lg:col-span-8 space-y-4">
            <div className="site-card p-4 md:p-5 rounded-[30px] min-h-[520px]">

              <div className="flex items-center gap-4 mb-4 bg-white/[0.03] p-4 rounded-[24px] border border-white/5 relative overflow-hidden">
                <div className="w-14 h-14 bg-black/40 rounded-2xl flex items-center justify-center border border-white/5 shrink-0 shadow-inner">
                  <img src={getSecureUrl(auction.item.iconUrl)} className="w-9 h-9 pixel-art" alt="" />
                </div>
                <div className="min-w-0 flex-1">
                  <h1 className="text-xl md:text-2xl font-extrabold tracking-[-0.04em] uppercase truncate text-zinc-100">{auction.item.name}</h1>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="text-blue-400 font-extrabold text-[10px] uppercase tracking-[0.12em] whitespace-nowrap">분류: {auction.item.category}</span>
                    <div className="w-1 h-1 rounded-full bg-zinc-800 shrink-0" />
                    <span className="text-zinc-600 font-extrabold text-[10px] uppercase tracking-[0.12em] whitespace-nowrap">ID: #{id}</span>
                  </div>
                </div>
              </div>

              <div className="mb-5 grid grid-cols-2 gap-2.5 md:grid-cols-4">
                <div className="rounded-2xl border border-white/5 bg-black/20 p-3">
                  <p className="mb-1 text-[10px] font-extrabold uppercase tracking-[0.12em] text-zinc-600">경매 상태</p>
                  <span className={`inline-flex rounded-md border px-2.5 py-1 text-[10px] font-extrabold tracking-[0.1em] ${auctionStatus.className}`}>
                    {auctionStatus.label}
                  </span>
                  <p className="mt-2 text-[11px] font-medium leading-snug text-zinc-500">{auctionStatus.description}</p>
                </div>
                <div className="rounded-2xl border border-white/5 bg-black/20 p-3">
                  <p className="mb-1 text-[10px] font-extrabold uppercase tracking-[0.12em] text-zinc-600">입찰 경쟁도</p>
                  <p className="font-mono text-xl font-black text-white">
                    {auction.bidCount || 0}
                    <span className="ml-1 text-xs font-bold text-zinc-700">회</span>
                  </p>
                  <p className="mt-1 text-[11px] font-semibold text-zinc-500">시작가 대비 {priceIncreaseRate >= 0 ? "+" : ""}{priceIncreaseRate}%</p>
                </div>
                <div className="rounded-2xl border border-white/5 bg-black/20 p-3">
                  <p className="mb-1 text-[10px] font-extrabold uppercase tracking-[0.12em] text-zinc-600">판매자 신뢰</p>
                  <p className="font-mono text-xl font-black text-emerald-300">
                    {Number(auction.seller?.reputationScore || 0).toFixed(1)}
                    <span className="ml-1 text-xs font-bold text-zinc-700">/5</span>
                  </p>
                  <p className="mt-1 text-[11px] font-semibold text-zinc-500">거래 {auction.seller?.successfulTrades || 0}건 · 평가 {auction.seller?.reviewCount || 0}건</p>
                </div>
                <div className="rounded-2xl border border-white/5 bg-black/20 p-3">
                  <p className="mb-1 text-[10px] font-extrabold uppercase tracking-[0.12em] text-zinc-600">최근 시세</p>
                  {marketAverage ? (
                    <>
                      <p className="font-mono text-xl font-black text-yellow-300">{formatGold(marketAverage)}<span className="ml-1 text-xs font-bold text-zinc-700">G</span></p>
                      <p className={`mt-1 text-[11px] font-semibold ${marketDiffRate && marketDiffRate > 0 ? "text-red-300/80" : "text-emerald-300/80"}`}>
                        현재가가 평균 대비 {marketDiffRate && marketDiffRate > 0 ? "+" : ""}{marketDiffRate}%
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="font-mono text-xl font-black text-zinc-500">데이터 없음</p>
                      <p className="mt-1 text-[11px] font-semibold text-zinc-600">동일 강화/등급 거래 기록 부족</p>
                    </>
                  )}
                </div>
              </div>

              <div className="custom-scrollbar overflow-y-auto max-h-[470px] pr-2 space-y-6">
                {category !== "WILD" && (
                  <div className="space-y-3">
                    <h2 className="text-[10px] font-extrabold text-cyan-400 uppercase tracking-[0.14em] flex items-center gap-2">
                      <div className="w-1 h-3 bg-cyan-500 rounded-full" /> 강화 단계
                    </h2>
                    <div className="inline-flex items-baseline gap-2 rounded-2xl border border-cyan-500/15 bg-cyan-500/[0.06] px-4 py-2.5">
                      <span className="font-mono text-xl font-extrabold text-cyan-100">+{auction.enhancementLevel || 0}</span>
                      <span className="text-xs font-semibold text-cyan-300/70">강화</span>
                    </div>
                  </div>
                )}

                {category === "WILD" && auction.enchantments && (
                  <div className="space-y-3">
                    <h2 className="text-[10px] font-extrabold text-blue-400 uppercase tracking-[0.14em] flex items-center gap-2">
                      <div className="w-1 h-3 bg-blue-600 rounded-full" /> 인챈트
                    </h2>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-1.5">
                      {Object.entries(auction.enchantments).map(([name, lv]: any) => (
                        <div key={name} className="min-h-[34px] flex items-center justify-between px-2.5 py-1.5 rounded-lg border bg-blue-600 border-blue-400 text-white shadow-lg shadow-blue-600/10">
                          <span className="font-semibold text-[10px] truncate mr-1">{name}</span>
                          <span className="font-black text-[9px] bg-white/20 px-1.5 py-0.5 rounded-md shrink-0">{lv}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {category === "ISLAND" && auction.imprint && (
                  <div className="space-y-3">
                    <h2 className="text-[10px] font-extrabold text-yellow-400 uppercase tracking-[0.14em] flex items-center gap-2">
                      <div className="w-1 h-3 bg-yellow-500 rounded-full" /> 각인
                    </h2>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-1.5">
                      {Object.entries(auction.imprint).map(([name, lv]: any) => (
                        <div key={name} className="min-h-[34px] flex items-center justify-between px-2.5 py-1.5 rounded-lg border bg-yellow-500 border-yellow-400 text-black shadow-lg shadow-yellow-500/10">
                          <span className="font-semibold text-[10px] truncate mr-1">{name}</span>
                          <span className="font-black text-[9px] bg-black/10 px-1.5 py-0.5 rounded-md shrink-0">LV.{lv}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {category === "RPG" && (
                  <div className="space-y-6">
                    {/* RPG 룬 정보 */}
                    {auction.runes && (
                      <div className="space-y-3">
                        <h2 className="text-[10px] font-extrabold text-orange-400 uppercase tracking-[0.14em] flex items-center gap-2">
                          <div className="w-1 h-3 bg-orange-500 rounded-full" /> 장착된 룬
                        </h2>
                        <div className="grid grid-cols-3 gap-2">
                          {auction.runes.map((rune: any, i: number) => (
                            <div key={i} className={`h-14 rounded-xl border flex flex-col items-center justify-center text-center ${rune.type ? 'bg-orange-500/10 border-orange-500/30' : 'bg-black/40 border-white/5 opacity-40'}`}>
                              {rune.type ? (
                                <>
                                  <span className="text-[8px] font-black text-orange-500 uppercase mb-0.5">{rune.grade}</span>
                                  <span className="text-[10px] font-extrabold text-zinc-100 truncate w-full px-2">{rune.type}</span>
                                </>
                              ) : <span className="text-zinc-800 text-[10px] font-black uppercase">Slot {i + 1}</span>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {/* RPG 스킬 정보 (누락분 추가) */}
                    {auction.skills && (
                      <div className="space-y-3">
                        <h2 className="text-[10px] font-extrabold text-purple-400 uppercase tracking-[0.14em] flex items-center gap-2">
                          <div className="w-1 h-3 bg-purple-600 rounded-full" /> 전투 스킬
                        </h2>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-1.5">
                          {Object.entries(auction.skills).map(([name, lv]: any) => (
                            <div key={name} className="min-h-[34px] flex items-center justify-between px-2.5 py-1.5 rounded-lg border bg-purple-600 border-purple-400 text-white shadow-lg shadow-purple-600/10">
                              <span className="font-semibold text-[10px] truncate mr-1">{name}</span>
                              <span className="font-black text-[9px] bg-white/20 px-1.5 py-0.5 rounded-md shrink-0">Lv.{lv}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="pt-5 border-t border-white/5 relative">
                  <h2 className="text-[10px] font-extrabold text-zinc-500 uppercase tracking-[0.14em] flex items-center gap-2 mb-3">
                    <div className="w-1 h-3 bg-zinc-600 rounded-full" /> 판매자 설명
                  </h2>
                  <div className="text-xs text-zinc-400 font-medium leading-relaxed bg-black/20 p-4 rounded-2xl border border-white/5 min-h-[80px] shadow-inner">
                    {auction.description || "등록된 상세 정보가 없습니다."}
                  </div>
                </div>

                <div className="pt-5 border-t border-white/5 relative">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <h2 className="text-[10px] font-extrabold text-zinc-500 uppercase tracking-[0.14em] flex items-center gap-2">
                      <div className="w-1 h-3 bg-blue-600 rounded-full" /> 댓글
                    </h2>
                    <span className="rounded-md border border-white/5 bg-white/[0.03] px-2 py-0.5 text-[10px] font-extrabold text-zinc-500">
                      {comments.length}개
                    </span>
                  </div>

                  <div className="space-y-2">
                    {comments.length > 0 ? (
                      comments.map((comment) => {
                        const isAuthorSeller = Number(comment.author?.id) === Number(auction.sellerId);
                        const isMine = Number(comment.author?.id) === Number(currentUser?.id);
                        return (
                          <div key={comment.id} className="rounded-2xl border border-white/5 bg-black/20 px-4 py-3">
                            <div className="mb-1.5 flex items-center justify-between gap-3">
                              <div className="flex min-w-0 items-center gap-2">
                                <span className="truncate text-[11px] font-extrabold text-zinc-200">
                                  {comment.author?.ingameName || "Unknown"}
                                </span>
                                {isAuthorSeller && (
                                  <span className="rounded-md border border-blue-500/20 bg-blue-500/10 px-1.5 py-0.5 text-[9px] font-extrabold text-blue-300">
                                    판매자
                                  </span>
                                )}
                                {isMine && (
                                  <span className="rounded-md border border-emerald-500/20 bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-extrabold text-emerald-300">
                                    나
                                  </span>
                                )}
                              </div>
                              <time className="shrink-0 text-[10px] font-semibold text-zinc-600">
                                {new Date(comment.createdAt).toLocaleString([], { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                              </time>
                            </div>
                            <p className="whitespace-pre-wrap break-words text-xs font-medium leading-relaxed text-zinc-400">
                              {comment.content}
                            </p>
                          </div>
                        );
                      })
                    ) : (
                      <div className="rounded-2xl border border-dashed border-white/5 bg-white/[0.015] px-4 py-8 text-center">
                        <p className="text-xs font-semibold text-zinc-500">아직 댓글이 없습니다.</p>
                        <p className="mt-1 text-[11px] font-medium text-zinc-600">가격, 옵션, 거래 가능 시간 등을 댓글로 문의해보세요.</p>
                      </div>
                    )}
                  </div>

                  <form onSubmit={handleCommentSubmit} className="mt-3 rounded-2xl border border-white/5 bg-black/30 p-3">
                    <textarea
                      value={commentInput}
                      onChange={(e) => setCommentInput(e.target.value)}
                      disabled={isCommenting}
                      maxLength={500}
                      placeholder={currentUser ? "댓글을 입력하세요..." : "로그인 후 댓글을 남길 수 있습니다."}
                      className="min-h-[72px] w-full resize-none bg-transparent text-xs font-medium leading-relaxed text-zinc-200 outline-none placeholder:text-zinc-600 disabled:opacity-50"
                    />
                    <div className="mt-2 flex items-center justify-between gap-3 border-t border-white/5 pt-2">
                      <span className="text-[10px] font-semibold text-zinc-600">{commentInput.length}/500</span>
                      <button
                        type="submit"
                        disabled={!commentInput.trim() || isCommenting}
                        className="site-btn site-btn-primary site-btn-compact"
                      >
                        {isCommenting ? "등록 중" : "댓글 등록"}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>

          {/* --- 우측: 조작 터미널 --- */}
          <div className="lg:col-span-4 space-y-4">
            <section className="site-card p-4 md:p-5 rounded-[28px]">
              <h2 className="text-[11px] font-extrabold text-zinc-400 uppercase tracking-[0.14em] mb-4 flex items-center gap-2">
                <div className="w-1 h-3 bg-blue-600 rounded-full" /> 경매 입찰 메뉴
              </h2>

                <div className="space-y-4">
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
                <div className="space-y-1.5 rounded-2xl border border-white/5 bg-black/20 px-3 py-2.5">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="shrink-0 text-[10px] font-extrabold text-red-400 uppercase tracking-[0.12em]">남은 시간</span>
                    <span className="min-w-0 truncate text-right text-sm font-mono font-black text-zinc-200">{timeLeft}</span>
                  </div>
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="shrink-0 text-[10px] font-extrabold text-zinc-500 uppercase tracking-[0.12em]">최고 입찰자</span>
                    <span className="min-w-0 truncate text-right text-sm font-extrabold text-cyan-400 uppercase">{maskName(auction.lastBidder)}</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-2">
                  <div className="rounded-2xl border border-white/5 bg-black/30 p-3">
                    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                      <div className="min-w-0">
                        <p className="mb-1 whitespace-nowrap text-[10px] font-extrabold uppercase tracking-[0.12em] text-zinc-600">시작가</p>
                        <p className="truncate text-right font-mono text-xs font-black text-zinc-300">{formatGold(startPrice)} G</p>
                      </div>
                      <div className="h-8 w-px bg-white/10" />
                      <div className="min-w-0">
                        <p className="mb-1 whitespace-nowrap text-[10px] font-extrabold uppercase tracking-[0.12em] text-zinc-600">최소 입찰가</p>
                        <p className="truncate text-right font-mono text-xs font-black text-blue-300">{formatGold(minimumBid)} G</p>
                      </div>
                    </div>
                  </div>
                  <div className="rounded-2xl border border-white/5 bg-black/30 p-3">
                    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                      <div className="min-w-0">
                        <p className="mb-1 whitespace-nowrap text-[10px] font-extrabold uppercase tracking-[0.12em] text-zinc-600">즉시구매가</p>
                        <p className="truncate text-right font-mono text-xs font-black text-zinc-300">{buyNowPrice ? `${formatGold(buyNowPrice)} G` : "없음"}</p>
                      </div>
                      <div className="h-8 w-px bg-white/10" />
                      <div className="min-w-0">
                        <p className="mb-1 whitespace-nowrap text-[10px] font-extrabold uppercase tracking-[0.12em] text-zinc-600">차액</p>
                        <p className="truncate text-right font-mono text-xs font-black text-yellow-300">{buyNowGap !== null ? `${formatGold(Math.max(0, buyNowGap))} G` : "-"}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-black/40 p-4 rounded-2xl border border-white/5 relative">
                  <label className="text-[10px] font-extrabold text-yellow-400 uppercase mb-2 block tracking-[0.12em]">현재 최고가</label>
                  <div className="flex items-baseline gap-2 overflow-hidden min-w-0">
                    <span className="text-2xl md:text-3xl font-mono font-black text-yellow-400 whitespace-nowrap truncate">{formatGold(Number(auction.currentPrice))}</span>
                    <span className="text-yellow-900 font-black shrink-0">G</span>
                  </div>
                </div>

                <div className="space-y-3 pt-2 border-t border-white/5">
                  <div className="bg-black/40 p-4 rounded-2xl border border-white/10 relative">
                    <label className="text-[10px] font-extrabold text-blue-400 uppercase mb-2 block tracking-[0.12em]">내 입찰 금액</label>
                    <div className="flex items-baseline gap-2 overflow-hidden relative">
                      <input
                        type="text"
                        inputMode="numeric"
                        disabled={!canAuctionTrade || isSeller || isProcessing || needsDiscordForTrade || verifyingSession}
                        value={Number(bidAmount).toLocaleString()}
                        onChange={handleBidChange}
                        className={`w-full bg-transparent text-2xl md:text-3xl font-mono font-black text-white outline-none min-w-0 ${isError ? 'shake-active' : ''}`}
                      />
                      <span className="text-blue-900 font-black shrink-0 relative top-1">G</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    {[10, 20, 50].map(pct => (
                      <button key={pct} disabled={!canAuctionTrade || isSeller || isProcessing || needsDiscordForTrade || verifyingSession} onClick={() => setBidAmount(Math.floor(Number(auction.currentPrice) * (1 + pct / 100)).toString())} className="site-btn site-btn-secondary site-btn-compact min-h-[34px] whitespace-nowrap">+{pct}%</button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2.5 pt-2">
                    <button
                    disabled={!canAuctionTrade || isSeller || isProcessing || needsDiscordForTrade || verifyingSession}
                    onClick={handleBid}
                    className="site-btn site-btn-primary w-full whitespace-nowrap py-4 text-sm"
                  >
                    {!canAuctionTrade ? "입찰 불가 상태" : isSeller ? "내 물품 입찰 불가" : needsDiscordForTrade ? "디스코드 인증 필요" : verifyingSession ? "인증 확인 중…" : "경매 입찰 신청"}
                  </button>

                  {auction.buyNowPrice && auction.status === 'ACTIVE' && (
                    <button
                      disabled={isSeller || isProcessing || needsDiscordForTrade || verifyingSession}
                      onClick={handleBuyNow}
                      className="site-btn site-btn-secondary w-full whitespace-nowrap"
                    >
                      {isProcessing ? "처리 중..." : `즉시 구매 (${formatGold(Number(auction.buyNowPrice))})`}
                    </button>
                  )}
                </div>

                <div className="rounded-2xl border border-white/5 bg-white/[0.025] p-4">
                  <p className="mb-2 text-[10px] font-extrabold uppercase tracking-[0.14em] text-zinc-500">거래 진행 안내</p>
                  <div className="space-y-1.5 text-[11px] font-medium leading-relaxed text-zinc-400">
                    <p>낙찰 또는 즉시 구매 후에는 거래 채팅이 열립니다.</p>
                    <p>구매자와 판매자가 모두 거래 확정을 눌러야 완료 처리되고 시세에 반영됩니다.</p>
                    <p>문제가 있으면 채팅 신고를 통해 분쟁 상태로 전환할 수 있습니다.</p>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </motion.div>
      </main>

      <SiteFooter />
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