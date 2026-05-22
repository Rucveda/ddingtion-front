"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { request } from "@/lib/client/api"; 
import { motion } from "framer-motion";
import { SimpleTopBar, SiteBackground, SiteFooter } from "@/components/SiteChrome";
import ListPagination from "@/components/ListPagination";
import { isLocalDev } from "@/dev/devMode";
import { ensureLocalDummySession } from "@/dev/localDummyData";

const SALES_PER_PAGE = 5;
const BIDS_PER_PAGE = 5;
const COMPLETED_SALES_PER_PAGE = 5;

type SaleTimestampFields = { completedAt?: string; updatedAt?: string; endTime?: string };

type MyPageUser = {
  id: number;
  loginId?: string;
  ingameName?: string;
  role?: string;
  reputationScore?: number;
  discordLinked?: boolean;
  discordVerificationRequired?: boolean;
};

type MyPageChatRoom = {
  id?: number;
  sellerConfirmed?: boolean;
  buyerConfirmed?: boolean;
};

type MyPageAuctionItem = {
  name: string;
  category: string;
  iconUrl?: string;
};

type MyPageAuction = SaleTimestampFields & {
  id: number;
  sellerId: number;
  status: string;
  relistedAt?: string | null;
  item: MyPageAuctionItem;
  currentPrice: string | number;
  marketReflected?: boolean;
  isHighestBidder?: boolean;
  chatRoom?: MyPageChatRoom | null;
};

const toHttpsUrl = (url: string) => url.replace("http://", "https://");

function AuctionItemIcon({ iconUrl, className }: { iconUrl?: string; className?: string }) {
  if (!iconUrl) {
    return <span className="text-2xl">📦</span>;
  }
  return (
    <Image
      src={toHttpsUrl(iconUrl)}
      alt=""
      width={48}
      height={48}
      unoptimized
      className={className ?? "h-full w-full object-contain pixel-art"}
    />
  );
}

const getSaleCompletedAt = (auction: SaleTimestampFields) =>
  auction.completedAt ?? auction.updatedAt ?? auction.endTime;

const getSaleCompletedAtMs = (auction: SaleTimestampFields) => {
  const raw = getSaleCompletedAt(auction);
  return raw ? new Date(raw).getTime() : 0;
};

const formatSaleCompletedAt = (auction: SaleTimestampFields) => {
  const raw = getSaleCompletedAt(auction);
  if (!raw) return "일시 정보 없음";
  return new Date(raw).toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const LOCAL_DEV_USER: MyPageUser = {
  id: 0,
  loginId: "Steve",
  ingameName: "Steve",
  role: "ADMIN",
  discordLinked: false,
  discordVerificationRequired: false,
};

const getMinecraftHeadUrl = (name?: string) => {
  const nickname = name?.trim();
  if (!nickname) return null;
  return `https://mc-heads.net/avatar/${encodeURIComponent(nickname)}/80`;
};

const STATUS_UI: Record<string, { label: string; className: string }> = {
  ACTIVE: { label: "진행 중", className: "bg-blue-500/10 text-blue-300 border-blue-500/20" },
  PENDING_TRADE: { label: "거래 중", className: "bg-amber-500/10 text-amber-300 border-amber-500/20" },
  COMPLETED: { label: "거래 완료", className: "bg-emerald-500/10 text-emerald-300 border-emerald-500/20" },
  CANCEL_PENDING: { label: "취소 보류", className: "bg-amber-500/10 text-amber-300 border-amber-500/20" },
  CANCELED: { label: "취소", className: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20" },
  EXPIRED: { label: "만료", className: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20" },
};

const getStatusUI = (auction: MyPageAuction, userId: number) => {
  if (auction.status === "PENDING_TRADE") {
    const room = auction.chatRoom;
    const isSeller = auction.sellerId === userId;
    const confirmed = isSeller ? room?.sellerConfirmed : room?.buyerConfirmed;
    const partnerConfirmed = isSeller ? room?.buyerConfirmed : room?.sellerConfirmed;
    if (!confirmed) {
      return { label: "확정 필요", className: "bg-yellow-500/10 text-yellow-300 border-yellow-500/20" };
    }
    if (!partnerConfirmed) {
      return { label: "상대 확인 대기", className: "bg-amber-500/10 text-amber-300 border-amber-500/20" };
    }
  }
  return STATUS_UI[auction.status] || { label: auction.status || "확인 필요", className: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20" };
};

export default function MyPage() {
  const [user, setUser] = useState<MyPageUser | null>(() => (isLocalDev() ? LOCAL_DEV_USER : null));
  const [myAuctions, setMyAuctions] = useState<MyPageAuction[]>([]);
  const [myBidAuctions, setMyBidAuctions] = useState<MyPageAuction[]>([]);
  const [loading, setLoading] = useState(() => !isLocalDev());
  const [linkingDiscord, setLinkingDiscord] = useState(false);
  const [isMinecraftNameEditorOpen, setIsMinecraftNameEditorOpen] = useState(false);
  const [minecraftNameInput, setMinecraftNameInput] = useState("");
  const [savingMinecraftName, setSavingMinecraftName] = useState(false);
  const [salesPage, setSalesPage] = useState(1);
  const [completedSalesPage, setCompletedSalesPage] = useState(1);
  const [bidsPage, setBidsPage] = useState(1);
  const router = useRouter();

  const triggerHaptic = useCallback(() => {
    if (typeof window !== "undefined" && window.navigator?.vibrate) {
      window.navigator.vibrate(10);
    }
  }, []);

  const openTradeChat = useCallback((roomId?: number) => {
    if (!roomId) return;
    triggerHaptic();
    localStorage.setItem("openChatId", String(roomId));
    window.dispatchEvent(new Event("ddingtion_chat_open"));
  }, [triggerHaptic]);

  const openRelistPage = useCallback((auctionId: number) => {
    triggerHaptic();
    router.push(`/sell?relist=${auctionId}`);
  }, [router, triggerHaptic]);

  /** 진행 중·거래 중 등 (완료 건은 판매완료 목록으로 분리) */
  const ongoingSales = useMemo(
    () => myAuctions.filter((auction) => auction.status !== "COMPLETED"),
    [myAuctions]
  );

  /** 시세에 반영된 완료 건만 표시 (무효 처리된 거래는 제외) */
  const completedSalesList = useMemo(
    () =>
      myAuctions
        .filter((auction) => auction.status === "COMPLETED" && auction.marketReflected)
        .sort((a, b) => getSaleCompletedAtMs(b) - getSaleCompletedAtMs(a)),
    [myAuctions]
  );

  const salesTotalPages = Math.max(1, Math.ceil(ongoingSales.length / SALES_PER_PAGE));
  const paginatedSales = useMemo(() => {
    const start = (salesPage - 1) * SALES_PER_PAGE;
    return ongoingSales.slice(start, start + SALES_PER_PAGE);
  }, [ongoingSales, salesPage]);

  const completedSalesTotalPages = Math.max(1, Math.ceil(completedSalesList.length / COMPLETED_SALES_PER_PAGE));
  const paginatedCompletedSales = useMemo(() => {
    const start = (completedSalesPage - 1) * COMPLETED_SALES_PER_PAGE;
    return completedSalesList.slice(start, start + COMPLETED_SALES_PER_PAGE);
  }, [completedSalesList, completedSalesPage]);

  const visibleBidAuctions = useMemo(
    () => myBidAuctions.filter((auction) => {
      if (auction.status === "COMPLETED") return Boolean(auction.marketReflected);
      return (
        auction.status === "ACTIVE" ||
        (auction.status === "PENDING_TRADE" && auction.isHighestBidder)
      );
    }),
    [myBidAuctions]
  );

  const bidsTotalPages = Math.max(1, Math.ceil(visibleBidAuctions.length / BIDS_PER_PAGE));
  const paginatedBids = useMemo(() => {
    const start = (bidsPage - 1) * BIDS_PER_PAGE;
    return visibleBidAuctions.slice(start, start + BIDS_PER_PAGE);
  }, [visibleBidAuctions, bidsPage]);

  useEffect(() => {
    if (salesPage > salesTotalPages) {
      setSalesPage(salesTotalPages);
    }
  }, [salesPage, salesTotalPages]);

  useEffect(() => {
    if (bidsPage > bidsTotalPages) {
      setBidsPage(bidsTotalPages);
    }
  }, [bidsPage, bidsTotalPages]);

  useEffect(() => {
    if (completedSalesPage > completedSalesTotalPages) {
      setCompletedSalesPage(completedSalesTotalPages);
    }
  }, [completedSalesPage, completedSalesTotalPages]);

  const refreshTradeLists = useCallback(async () => {
    if (!user) return;
    try {
      if (isLocalDev()) ensureLocalDummySession();
      const [auctionData, bidData] = await Promise.all([
        request("/api/auctions/my-auctions"),
        request("/api/auctions/my-bids"),
      ]);
      setMyAuctions(Array.isArray(auctionData) ? auctionData : []);
      setMyBidAuctions(Array.isArray(bidData) ? bidData : []);
    } catch (err) {
      console.error("거래 목록 갱신 실패:", err);
    }
  }, [user]);

  const handleCancelRevoke = useCallback(async (auctionId: number) => {
    triggerHaptic();
    if (!confirm("취소 요청을 철회하고 경매를 다시 진행하시겠습니까?")) return;
    try {
      const data = await request(`/api/auctions/${auctionId}/cancel-revoke`, { method: "POST" });
      if (data) {
        alert(data.message || "경매가 다시 진행됩니다.");
        await refreshTradeLists();
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "취소 철회에 실패했습니다.");
    }
  }, [triggerHaptic, refreshTradeLists]);

  useEffect(() => {
    const fetchAllData = async () => {
      const storedUser = localStorage.getItem("user");
      if (isLocalDev()) {
        ensureLocalDummySession();
        let localUser = LOCAL_DEV_USER;
        if (storedUser) {
          try {
            localUser = JSON.parse(storedUser) as MyPageUser;
          } catch {
            localStorage.removeItem("user");
          }
        }
        try {
          const [auctionData, bidData] = await Promise.all([
            request("/api/auctions/my-auctions"),
            request("/api/auctions/my-bids"),
          ]);
          setUser(localUser);
          setMyAuctions(Array.isArray(auctionData) ? auctionData : []);
          setMyBidAuctions(Array.isArray(bidData) ? bidData : []);
        } catch (err) {
          console.error("로컬 더미 거래 목록 로드 실패:", err);
          setUser(localUser);
          setMyAuctions([]);
          setMyBidAuctions([]);
        } finally {
          setLoading(false);
        }
        return;
      }

      if (!storedUser) {
        router.push("/login");
        return;
      }

      try {
        const [freshUser, auctionData, bidData] = await Promise.all([
          request("/api/auth/me"),
          request("/api/auctions/my-auctions"),
          request("/api/auctions/my-bids"),
        ]);
        if (freshUser) {
          setUser(freshUser);
          localStorage.setItem("user", JSON.stringify(freshUser));
        }
        setMyAuctions(Array.isArray(auctionData) ? auctionData : []);
        setMyBidAuctions(Array.isArray(bidData) ? bidData : []);
      } catch (err) {
        console.error("데이터 동기화 에러:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchAllData();
  }, [router]);

  useEffect(() => {
    if (!user) return;
    const refetchOnReturn = () => {
      if (document.visibilityState === "visible") {
        void refreshTradeLists();
      }
    };
    window.addEventListener("focus", refetchOnReturn);
    document.addEventListener("visibilitychange", refetchOnReturn);
    return () => {
      window.removeEventListener("focus", refetchOnReturn);
      document.removeEventListener("visibilitychange", refetchOnReturn);
    };
  }, [user, refreshTradeLists]);

  useEffect(() => {
    const onTradeUpdated = () => {
      void refreshTradeLists();
    };
    window.addEventListener("ddingtion_trade_updated", onTradeUpdated);
    return () => window.removeEventListener("ddingtion_trade_updated", onTradeUpdated);
  }, [refreshTradeLists]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const d = params.get("discord");
    if (!d) return;

    const reason = params.get("reason") || "";
    const notificationKey = `discord_callback:${d}:${reason}`;
    const alreadyHandled = sessionStorage.getItem(notificationKey) === "1";

    // alert가 라우터 갱신보다 먼저 브라우저를 막을 수 있어 URL을 즉시 정리합니다.
    window.history.replaceState(null, "", "/mypage");

    const reasonText: Record<string, string> = {
      guild: "지정된 디스코드 서버에 가입된 계정만 연동할 수 있습니다.",
      in_use: "이 디스코드 계정은 이미 다른 사이트 계정에 연결되어 있습니다.",
      in_use_banned: "이 디스코드 계정은 차단된 기존 계정에 연결되어 있습니다. 관리자에게 기존 계정의 디스코드 연동 해제를 요청해 주세요.",
      invalid_state: "인증 세션이 만료되었습니다. 다시 시도해 주세요.",
      missing_params: "디스코드 응답이 올바르지 않습니다.",
      forbidden: "연동할 수 없는 계정입니다.",
      server: "서버 오류로 연동에 실패했습니다. 잠시 후 다시 시도해 주세요.",
    };

    const run = async () => {
      if (d === "linked") {
        try {
          const fresh = await request("/api/auth/me");
          if (fresh) {
            setUser(fresh);
            localStorage.setItem("user", JSON.stringify(fresh));
          }
        } catch {
          /* ignore */
        }
        if (!alreadyHandled) {
          sessionStorage.setItem(notificationKey, "1");
          alert("디스코드 계정이 연동되었습니다. 이제 경매 입찰·즉시 구매를 이용할 수 있습니다.");
        }
      } else if (d === "error") {
        if (!alreadyHandled) {
          sessionStorage.setItem(notificationKey, "1");
          alert(reasonText[reason] || "디스코드 연동에 실패했습니다.");
        }
      }
    };
    void run();
  }, []);

  useEffect(() => {
    if (user) setMinecraftNameInput(user.ingameName || "");
  }, [user]);

  const handleDiscordLink = useCallback(async () => {
    setLinkingDiscord(true);
    try {
      const data = await request("/api/auth/discord/authorize");
      if (data?.url) {
        // replace: OAuth 복귀 후 X(뒤로가기)가 Discord 인증 화면으로 가지 않도록
        window.location.replace(data.url as string);
        return;
      }
      alert("인증 주소를 받지 못했습니다.");
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "디스코드 연동을 시작할 수 없습니다.");
    } finally {
      setLinkingDiscord(false);
    }
  }, []);

  const handleMinecraftNameUpdate = useCallback(async () => {
    if (!user) return;
    const minecraftName = minecraftNameInput.trim();
    if (!minecraftName || minecraftName === user.ingameName) return;
    if (!/^[A-Za-z0-9_]{3,16}$/.test(minecraftName)) {
      alert("마인크래프트 닉네임은 영문, 숫자, _ 조합의 3~16자여야 합니다.");
      return;
    }
    triggerHaptic();
    setSavingMinecraftName(true);
    try {
      if (isLocalDev()) {
        const nextUser = { ...user, ingameName: minecraftName };
        setUser(nextUser);
        localStorage.setItem("user", JSON.stringify(nextUser));
        return;
      }
      const updated = await request("/api/auth/me/minecraft-name", {
        method: "PATCH",
        body: JSON.stringify({ minecraftName }),
      });
      if (updated) {
        setUser(updated);
        localStorage.setItem("user", JSON.stringify(updated));
        setIsMinecraftNameEditorOpen(false);
        alert("표시 닉네임이 변경되었습니다. 로그인은 가입 아이디로 계속할 수 있습니다.");
      }
    } catch (error) {
      alert(error instanceof Error ? error.message : "마인크래프트 닉네임 변경에 실패했습니다.");
    } finally {
      setSavingMinecraftName(false);
    }
  }, [minecraftNameInput, triggerHaptic, user]);

  if (loading) return (
    <div className="min-h-screen bg-[#010101] flex items-center justify-center">
      <div className="animate-pulse text-xs font-extrabold uppercase tracking-[0.16em] text-zinc-500">Syncing Profile...</div>
    </div>
  );
  
  if (!user) return null;

  const score = user.reputationScore || 0;
  const repUI = score === 0 ? { label: "신규", color: "text-zinc-400", bg: "bg-zinc-500/10" } :
                score >= 4 ? { label: "신용", color: "text-emerald-400", bg: "bg-emerald-500/10" } :
                score >= 2 ? { label: "보통", color: "text-blue-400", bg: "bg-blue-500/10" } :
                              { label: "경계", color: "text-red-400", bg: "bg-red-500/10" };
  const tradeStatus = user.discordLinked
    ? { label: "거래 가능", color: "text-emerald-300", bg: "bg-emerald-500/10", border: "border-emerald-500/20" }
    : { label: "인증 필요", color: "text-indigo-300", bg: "bg-indigo-500/10", border: "border-indigo-500/20" };
  const minecraftName = user.ingameName || user.loginId;
  const loginIdLabel = user.loginId;
  const minecraftHeadUrl = getMinecraftHeadUrl(minecraftName);
  const activeSales = myAuctions.filter((auction) => auction.status === "ACTIVE");
  const completedSales = myAuctions.filter(
    (auction) => auction.status === "COMPLETED" && auction.marketReflected
  );
  const pendingSales = myAuctions.filter((auction) => auction.status === "PENDING_TRADE");
  const salesNeedConfirm = pendingSales.filter((auction) => !auction.chatRoom?.sellerConfirmed);
  const activeBidAuctions = myBidAuctions.filter((auction) => auction.status === "ACTIVE");
  const pendingWonAuctions = myBidAuctions.filter((auction) => auction.status === "PENDING_TRADE" && auction.isHighestBidder);
  const bidsNeedConfirm = pendingWonAuctions.filter((auction) => !auction.chatRoom?.buyerConfirmed);
  const actionNeededCount = salesNeedConfirm.length + bidsNeedConfirm.length;

  return (
    <div className="min-h-screen bg-[#010101] text-zinc-100 font-sans select-none relative overflow-x-hidden">
      <SiteBackground />
      <SimpleTopBar
        onNavigate={triggerHaptic}
        closeHref="/?tab=AUCTION"
        preferBrowserBack={false}
      />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 md:py-10 relative z-10">
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
          <section className="site-card p-5 sm:p-6 rounded-[28px] relative overflow-hidden">
            <div className="flex flex-col sm:flex-row items-center gap-5 sm:gap-6">
              <div className="flex flex-col sm:flex-row items-center gap-5 sm:gap-6 min-w-0">
                <div className="w-20 h-20 bg-zinc-900 border border-white/10 rounded-2xl flex items-center justify-center relative shrink-0 overflow-hidden">
                   {minecraftHeadUrl ? (
                    <Image
                      src={minecraftHeadUrl}
                      alt={`${minecraftName} Minecraft head`}
                      width={80}
                      height={80}
                      unoptimized
                      className="h-full w-full object-cover pixel-art"
                    />
                   ) : (
                    <div className="w-8 h-8 border-2 border-zinc-700 rotate-45 flex items-center justify-center">
                      <div className="w-2.5 h-2.5 bg-zinc-700 rounded-full" />
                    </div>
                   )}
                </div>

                <div className="text-center sm:text-left flex-1 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:flex-wrap items-center gap-2.5">
                    <h1 className="text-2xl sm:text-[28px] font-black tracking-[-0.04em] uppercase leading-tight truncate">{minecraftName}</h1>
                    <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-md border ${repUI.color} ${repUI.bg} border-current/20 tracking-[0.12em]`}>
                      {repUI.label}
                    </span>
                    <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-md border ${tradeStatus.border} ${tradeStatus.color} ${tradeStatus.bg} tracking-[0.12em]`}>
                      {tradeStatus.label}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="my-5 h-px w-full bg-white/10" />

            <div>
              <p className="mb-3 text-[10px] text-zinc-500 font-extrabold uppercase tracking-[0.14em]">활동 요약</p>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <div className="rounded-2xl bg-white/[0.025] p-3">
                  <p className="mb-1 text-[10px] font-semibold text-zinc-600">신뢰 점수</p>
                  <p className={`font-mono text-2xl font-bold ${repUI.color}`}>
                    {score.toFixed(1)}
                    <span className="ml-1 text-xs font-semibold text-zinc-700">/5</span>
                  </p>
                </div>
                <div className="rounded-2xl bg-white/[0.025] p-3">
                  <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                    <div>
                      <p className="mb-1 text-[10px] font-semibold text-zinc-600">판매중</p>
                      <p className="font-mono text-2xl font-bold text-white">
                        {activeSales.length}
                        <span className="ml-1 text-xs font-semibold text-zinc-700">건</span>
                      </p>
                    </div>
                    <div className="h-9 w-px bg-white/10" />
                    <div>
                      <p className="mb-1 text-[10px] font-semibold text-zinc-600">확정필요</p>
                      <p className="font-mono text-2xl font-bold text-zinc-200">
                        {salesNeedConfirm.length}
                        <span className="ml-1 text-xs font-semibold text-zinc-700">건</span>
                      </p>
                    </div>
                  </div>
                </div>
                <div className="rounded-2xl bg-white/[0.025] p-3">
                  <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                    <div>
                      <p className="mb-1 text-[10px] font-semibold text-zinc-600">입찰중</p>
                      <p className="font-mono text-2xl font-bold text-zinc-200">
                        {activeBidAuctions.length}
                        <span className="ml-1 text-xs font-semibold text-zinc-700">건</span>
                      </p>
                    </div>
                    <div className="h-9 w-px bg-white/10" />
                    <div>
                      <p className="mb-1 text-[10px] font-semibold text-zinc-600">낙찰대기</p>
                      <p className="font-mono text-2xl font-bold text-zinc-200">
                        {pendingWonAuctions.length}
                        <span className="ml-1 text-xs font-semibold text-zinc-700">건</span>
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              {(actionNeededCount > 0 || completedSales.length > 0) && (
                <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {actionNeededCount > 0 && (
                    <div className="rounded-2xl border border-yellow-500/15 bg-yellow-500/[0.06] px-4 py-3">
                      <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-yellow-300">확인 필요</p>
                      <p className="mt-1 text-xs font-semibold text-yellow-100/80">거래 확정이 필요한 항목이 {actionNeededCount}건 있습니다.</p>
                    </div>
                  )}
                  {completedSales.length > 0 && (
                    <div className="rounded-2xl border border-emerald-500/15 bg-emerald-500/[0.05] px-4 py-3">
                      <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-emerald-300">판매완료</p>
                      <p className="mt-1 text-xs font-semibold text-emerald-100/80">확정 완료된 판매 거래 {completedSales.length}건이 시세에 반영되었습니다.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>

          <div className="space-y-3">
            <section
              className={`p-5 sm:p-6 rounded-[28px] border ${
                user.discordLinked
                  ? "border-emerald-500/20 bg-emerald-500/5"
                  : user.discordVerificationRequired
                    ? "border-indigo-500/30 bg-indigo-500/[0.07]"
                    : "border-amber-500/20 bg-amber-500/[0.04]"
              }`}
            >
              <div className="flex h-full flex-col justify-between gap-4">
              <div>
                <p className="text-[10px] font-extrabold text-zinc-500 uppercase tracking-[0.14em] mb-1.5">
                  신뢰 기반 거래
                </p>
                <h2 className="text-base font-extrabold text-white tracking-[-0.02em] mb-1.5">
                  디스코드 계정 연동
                </h2>
                <p className="text-xs text-zinc-400 font-medium leading-relaxed break-keep">
                  {user.discordLinked
                    ? "디스코드로 인증된 계정입니다. 경매 입찰 및 즉시 구매를 이용할 수 있습니다."
                    : user.discordVerificationRequired
                      ? "입찰·즉시 구매는 디스코드로 인증된 계정만 가능합니다."
                      : "디스코드 인증 기능은 준비 중입니다."}
                </p>
              </div>
              {!user.discordLinked && (
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic();
                    void handleDiscordLink();
                  }}
                  disabled={linkingDiscord || !user.discordVerificationRequired}
                  className="w-full px-4 py-2.5 rounded-xl text-[11px] font-extrabold uppercase tracking-[0.14em] bg-[#5865F2] text-white hover:bg-[#4752C4] transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
                >
                  {linkingDiscord
                    ? "연결 중..."
                    : user.discordVerificationRequired
                      ? "디스코드로 인증"
                      : "준비 중"}
                </button>
              )}
              </div>
            </section>
              <div className="rounded-2xl border border-white/5 bg-black/15 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-zinc-500">표시 닉네임</p>
                    <p className="mt-1 truncate text-xs font-semibold text-zinc-300">{minecraftName}</p>
                    <p className="mt-1 truncate text-[10px] font-medium text-zinc-600">로그인 아이디: {loginIdLabel}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic();
                      setIsMinecraftNameEditorOpen((prev) => !prev);
                      setMinecraftNameInput(user.ingameName || user.loginId || "");
                    }}
                    className="site-btn site-btn-secondary site-btn-compact shrink-0"
                  >
                    {isMinecraftNameEditorOpen ? "닫기" : "변경"}
                  </button>
                </div>
                {isMinecraftNameEditorOpen && (
                  <div className="mt-3 border-t border-white/5 pt-3">
                    <div className="flex flex-col gap-2">
                      <input
                        type="text"
                        value={minecraftNameInput}
                        onChange={(e) => setMinecraftNameInput(e.target.value.replace(/[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/g, ""))}
                        className="w-full rounded-xl border border-white/10 bg-white/[0.035] px-3 py-2 text-xs font-semibold text-zinc-100 outline-none placeholder:text-zinc-700 focus:border-blue-500/40"
                        placeholder="새 마인크래프트 닉네임"
                      />
                      <button
                        type="button"
                        onClick={handleMinecraftNameUpdate}
                        disabled={
                          savingMinecraftName ||
                          !minecraftNameInput.trim() ||
                          minecraftNameInput.trim() === (user.ingameName || "")
                        }
                        className="site-btn site-btn-primary site-btn-compact w-full"
                      >
                        {savingMinecraftName ? "저장 중..." : "변경 저장"}
                      </button>
                    </div>
                    <p className="mt-2 text-[10px] font-medium leading-relaxed text-zinc-600">
                      표시 닉네임만 변경됩니다. 로그인 아이디({loginIdLabel})는 그대로 유지됩니다.
                    </p>
                  </div>
                )}
              </div>
          </div>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-2">
            <div className="space-y-8">
            <section className="space-y-3">
              <h2 className="text-[11px] font-extrabold text-zinc-500 uppercase tracking-[0.14em] ml-1 flex items-center gap-3 py-3">
                <div className="w-1 h-3 bg-blue-600 rounded-full" /> 판매 목록
              </h2>
              
              <div className="space-y-3">
                {ongoingSales.length > 0 ? (
                  paginatedSales.map((auction) => {
                    const statusUI = getStatusUI(auction, user.id);
                    const needsConfirm = auction.status === "PENDING_TRADE" && !auction.chatRoom?.sellerConfirmed;
                    const canRelist = auction.status === "EXPIRED" && !auction.relistedAt;
                    const canRevokeCancel = auction.status === "CANCEL_PENDING";
                    return (
                    <div key={auction.id} className="group relative bg-white/[0.02] border border-white/5 p-4 rounded-[22px] flex items-center justify-between hover:bg-white/[0.04] transition-all">
                      <div className="flex items-center gap-4 min-w-0">
                        <div className="w-12 h-12 bg-zinc-900/50 rounded-xl flex items-center justify-center p-2.5 border border-white/5 shrink-0 overflow-hidden relative">
                          <AuctionItemIcon
                            iconUrl={auction.item.iconUrl}
                            className="h-full w-full object-contain pixel-art transition-transform group-hover:scale-110"
                          />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] font-extrabold text-blue-500 uppercase tracking-[0.08em]">{auction.item.category}</span>
                            <div className="w-1 h-1 rounded-full bg-zinc-800" />
                            <span className={`rounded-md border px-2 py-0.5 text-[10px] font-extrabold tracking-[0.08em] ${statusUI.className}`}>{statusUI.label}</span>
                          </div>
                          <h3 className="text-sm font-semibold text-zinc-200 truncate group-hover:text-white transition-colors">{auction.item.name}</h3>
                          {needsConfirm && (
                            <p className="mt-1 text-[11px] font-semibold text-yellow-300/80">거래 내용을 확인하고 확정해주세요.</p>
                          )}
                          {canRevokeCancel && (
                            <p className="mt-1 text-[11px] font-semibold text-amber-300/80">5분 내 철회하면 경매를 재개할 수 있습니다.</p>
                          )}
                          {auction.status === "EXPIRED" && auction.relistedAt && (
                            <p className="mt-1 text-[11px] font-semibold text-zinc-500">이미 새 경매로 다시 등록되었습니다.</p>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4 shrink-0">
                        <div className="text-right">
                          <p className="text-[10px] text-zinc-600 font-extrabold mb-1 uppercase tracking-[0.08em]">최고 입찰가</p>
                          <p className="text-sm font-bold text-yellow-400 font-mono tracking-tight">{Number(auction.currentPrice).toLocaleString()} G</p>
                        </div>
                        {auction.chatRoom?.id && auction.status === "PENDING_TRADE" && (
                          <button
                            type="button"
                            onClick={() => openTradeChat(auction.chatRoom?.id)}
                            className="h-9 px-3 rounded-xl border border-yellow-500/20 bg-yellow-500/10 text-[10px] font-extrabold text-yellow-200 hover:bg-yellow-500/15 transition-all"
                          >
                            채팅
                          </button>
                        )}
                        {canRevokeCancel && (
                          <button
                            type="button"
                            onClick={() => handleCancelRevoke(auction.id)}
                            className="h-9 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 text-[10px] font-extrabold text-emerald-200 transition-all hover:bg-emerald-500/15"
                          >
                            취소 철회
                          </button>
                        )}
                        {canRelist && (
                          <button
                            type="button"
                            onClick={() => openRelistPage(auction.id)}
                            className="h-9 rounded-xl border border-blue-500/20 bg-blue-500/10 px-3 text-[10px] font-extrabold text-blue-200 transition-all hover:bg-blue-500/15"
                          >
                            다시 등록
                          </button>
                        )}
                        <Link
                          href={`/auction/${auction.id}`}
                          onClick={triggerHaptic}
                          aria-label="경매 상세 보기"
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-lg font-black leading-none text-zinc-300 transition-all hover:border-blue-500/30 hover:bg-blue-500/10 hover:text-white"
                        >
                          &gt;
                        </Link>
                      </div>
                    </div>
                  )})
                ) : (
                  <div className="py-14 border border-dashed border-white/5 rounded-[28px] text-center">
                    <p className="text-xs font-semibold text-zinc-400">판매 내역이 없습니다</p>
                    <p className="mt-2 text-xs font-medium text-zinc-600">아이템을 등록하면 진행 및 거래 확정 상태를 이곳에서 관리할 수 있습니다.</p>
                  </div>
                )}
                {ongoingSales.length > 0 && (
                  <ListPagination
                    page={salesPage}
                    totalPages={salesTotalPages}
                    onPageChange={setSalesPage}
                    className="pt-2"
                  />
                )}
              </div>
            </section>

            <section className="space-y-3">
              <h2 className="text-[11px] font-extrabold text-zinc-500 uppercase tracking-[0.14em] ml-1 flex items-center gap-3 py-3">
                <div className="w-1 h-3 bg-emerald-500 rounded-full" /> 판매완료
              </h2>

              <div className="space-y-3">
                {completedSalesList.length > 0 ? (
                  paginatedCompletedSales.map((auction) => (
                    <div
                      key={auction.id}
                      className="group relative flex items-center justify-between rounded-[22px] border border-white/5 bg-white/[0.02] p-4 transition-all hover:bg-white/[0.04]"
                    >
                      <div className="flex min-w-0 items-center gap-4">
                        <div className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/5 bg-zinc-900/50 p-2.5">
                          <AuctionItemIcon
                            iconUrl={auction.item.iconUrl}
                            className="h-full w-full object-contain pixel-art transition-transform group-hover:scale-110"
                          />
                        </div>
                        <div className="min-w-0">
                          <div className="mb-1 flex items-center gap-2">
                            <span className="text-[10px] font-extrabold uppercase tracking-[0.08em] text-emerald-400/90">
                              {auction.item.category}
                            </span>
                            <div className="h-1 w-1 rounded-full bg-zinc-800" />
                            <span className="rounded-md border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-extrabold tracking-[0.08em] text-emerald-300">
                              거래 완료
                            </span>
                          </div>
                          <h3 className="truncate text-sm font-semibold text-zinc-200 transition-colors group-hover:text-white">
                            {auction.item.name}
                          </h3>
                          <p className="mt-1 text-[11px] font-medium text-zinc-500">
                            완료 {formatSaleCompletedAt(auction)}
                          </p>
                        </div>
                      </div>

                      <div className="flex shrink-0 items-center gap-4">
                        <div className="text-right">
                          <p className="mb-1 text-[10px] font-extrabold uppercase tracking-[0.08em] text-zinc-600">
                            낙찰가
                          </p>
                          <p className="font-mono text-sm font-bold tracking-tight text-yellow-400">
                            {Number(auction.currentPrice).toLocaleString()} G
                          </p>
                        </div>
                        <Link
                          href={`/auction/${auction.id}`}
                          onClick={triggerHaptic}
                          aria-label="경매 상세 보기"
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-lg font-black leading-none text-zinc-300 transition-all hover:border-emerald-500/30 hover:bg-emerald-500/10 hover:text-white"
                        >
                          &gt;
                        </Link>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-[28px] border border-dashed border-white/5 py-14 text-center">
                    <p className="text-xs font-semibold text-zinc-400">완료된 판매 내역이 없습니다</p>
                    <p className="mt-2 text-xs font-medium text-zinc-600">
                      거래가 확정되고 시세에 반영된 판매만 이곳에 표시됩니다.
                    </p>
                  </div>
                )}
                {completedSalesList.length > 0 && (
                  <ListPagination
                    page={completedSalesPage}
                    totalPages={completedSalesTotalPages}
                    onPageChange={(next) => {
                      triggerHaptic();
                      setCompletedSalesPage(next);
                    }}
                    className="pt-2"
                  />
                )}
              </div>
            </section>
            </div>

            <section className="space-y-3">
              <h2 className="text-[11px] font-extrabold text-zinc-500 uppercase tracking-[0.14em] ml-1 flex items-center gap-3 py-3">
                <div className="w-1 h-3 bg-yellow-500 rounded-full" /> 입찰 목록
              </h2>

              <div className="space-y-3">
                {visibleBidAuctions.length > 0 ? (
                  paginatedBids.map((auction) => {
                    const statusUI = getStatusUI(auction, user.id);
                    const needsConfirm = auction.status === "PENDING_TRADE" && auction.isHighestBidder && !auction.chatRoom?.buyerConfirmed;
                    return (
                    <div key={auction.id} className="group relative bg-white/[0.02] border border-white/5 p-4 rounded-[22px] flex items-center justify-between hover:bg-white/[0.04] transition-all">
                      <div className="flex items-center gap-4 min-w-0">
                        <div className="w-12 h-12 bg-zinc-900/50 rounded-xl flex items-center justify-center p-2.5 border border-white/5 shrink-0 overflow-hidden relative">
                          <AuctionItemIcon
                            iconUrl={auction.item.iconUrl}
                            className="h-full w-full object-contain pixel-art transition-transform group-hover:scale-110"
                          />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] font-extrabold text-yellow-500 uppercase tracking-[0.08em]">{auction.isHighestBidder ? "최고 입찰" : "입찰 참여"}</span>
                            <div className="w-1 h-1 rounded-full bg-zinc-800" />
                            <span className={`rounded-md border px-2 py-0.5 text-[10px] font-extrabold tracking-[0.08em] ${statusUI.className}`}>{statusUI.label}</span>
                          </div>
                          <h3 className="text-sm font-semibold text-zinc-200 truncate group-hover:text-white transition-colors">{auction.item.name}</h3>
                          {needsConfirm && (
                            <p className="mt-1 text-[11px] font-semibold text-yellow-300/80">낙찰된 거래를 확인하고 확정해주세요.</p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-4 shrink-0">
                        <div className="text-right">
                          <p className="text-[10px] text-zinc-600 font-extrabold mb-1 uppercase tracking-[0.08em]">현재가</p>
                          <p className="text-sm font-bold text-yellow-400 font-mono tracking-tight">{Number(auction.currentPrice).toLocaleString()} G</p>
                        </div>
                        {auction.chatRoom?.id && auction.status === "PENDING_TRADE" && (
                          <button
                            type="button"
                            onClick={() => openTradeChat(auction.chatRoom?.id)}
                            className="h-9 px-3 rounded-xl border border-yellow-500/20 bg-yellow-500/10 text-[10px] font-extrabold text-yellow-200 hover:bg-yellow-500/15 transition-all"
                          >
                            채팅
                          </button>
                        )}
                        <Link href={`/auction/${auction.id}`} onClick={triggerHaptic} className="site-btn site-btn-secondary h-9 w-9 p-0">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M9 18l6-6-6-6"/></svg>
                        </Link>
                      </div>
                    </div>
                  )})
                ) : (
                  <div className="py-14 border border-dashed border-white/5 rounded-[28px] text-center">
                    <p className="text-xs font-semibold text-zinc-400">입찰 중인 경매가 없습니다</p>
                    <p className="mt-2 text-xs font-medium text-zinc-600">입찰한 물품은 이곳에서 현재가를 추적할 수 있습니다.</p>
                  </div>
                )}
                {visibleBidAuctions.length > 0 && (
                  <ListPagination
                    page={bidsPage}
                    totalPages={bidsTotalPages}
                    onPageChange={(next) => {
                      triggerHaptic();
                      setBidsPage(next);
                    }}
                    className="pt-2"
                  />
                )}
              </div>
            </section>
          </div>
        </motion.div>
      </main>

      <SiteFooter />
    </div>
  );
}