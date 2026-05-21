"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { SimpleTopBar, SiteBackground, SiteFooter } from "@/components/SiteChrome";
import {
  BID_EXTENSION_MINUTES,
  BID_TIME_BANDS,
  PRICE_INCREMENT_TIERS,
  formatDurationShort,
  getMinBidIncrement,
  getMinimumBid,
} from "@/lib/domain/bidIncrement";
import { triggerHaptic } from "./auctionDetailUtils";
import { getWildEnchantActiveBadgeClass } from "@/lib/domain/enhancementAllowlist";
import { formatGold, getSecureUrl } from "./auctionDetailUtils";
import { maskBidderName } from "./auctionDetailUtils";
import type { useAuctionDetail } from "./hooks/useAuctionDetail";

export type AuctionDetailViewProps = ReturnType<typeof useAuctionDetail>;

export function AuctionDetailView(props: AuctionDetailViewProps) {
  const {
    auctionId,
    auction,
    bidAmount,
    setBidAmount,
    isError,
    bidRulesOpen,
    setBidRulesOpen,
    extensionNotice,
    category,
    wildEnchantGroups,
    timeLeft,
    bidDetails,
    handleBidChange,
    auctionStatus,
    pricing,
    marketAnalysisLoading,
    currentUser,
    needsDiscordForTrade,
    verifyingSession,
    comments,
    commentInput,
    setCommentInput,
    isCommenting,
    handleCommentSubmit,
    isProcessing,
    isSeller,
    canAuctionTrade,
    handleBid,
    handleBuyNow,
    handleCancelRequest,
    handleCancelRevoke,
  } = props;

  const {
    currentPrice,
    startPrice,
    buyNowPrice,
    minimumBid,
    minBidIncrement,
    bidIncrementTierLabel,
    priceIncreaseRate,
    buyNowGap,
    marketAverage,
    estimatedFairPrice,
    estimatedDiffRate,
    analysisSampleCount,
  } = pricing;


  if (!auction || !auction.item) return (
    <div className="min-h-screen bg-[#010101] text-zinc-100 font-sans select-none relative flex flex-col items-center justify-center">
      <SiteBackground />
      <div className="text-xl font-black uppercase tracking-[0.4em] text-zinc-500 animate-pulse z-10">Linking Data...</div>
    </div>
  );

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
            <div className="site-card flex flex-col p-4 md:p-5 rounded-[30px]">

              <div className="flex items-center gap-4 mb-4 bg-white/[0.03] p-4 rounded-[24px] border border-white/5 relative overflow-hidden">
                <div className="w-14 h-14 bg-black/40 rounded-2xl flex items-center justify-center border border-white/5 shrink-0 shadow-inner">
                  <img src={getSecureUrl(auction.item.iconUrl)} className="w-9 h-9 pixel-art" alt="" />
                </div>
                <div className="min-w-0 flex-1">
                  <h1 className="text-xl md:text-2xl font-extrabold tracking-[-0.04em] uppercase truncate text-zinc-100">{auction.item.name}</h1>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="text-blue-400 font-extrabold text-[10px] uppercase tracking-[0.12em] whitespace-nowrap">분류: {auction.item.category}</span>
                    <div className="w-1 h-1 rounded-full bg-zinc-800 shrink-0" />
                    <span className="text-zinc-600 font-extrabold text-[10px] uppercase tracking-[0.12em] whitespace-nowrap">ID: #{auctionId}</span>
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
                  <p className="mb-1 text-[10px] font-extrabold uppercase tracking-[0.12em] text-zinc-600">예상 적정가</p>
                  {marketAnalysisLoading ? (
                    <>
                      <p className="font-mono text-xl font-black text-zinc-500">분석 중</p>
                      <p className="mt-1 text-[11px] font-semibold text-zinc-600">옵션 기반 시세 계산 중</p>
                    </>
                  ) : estimatedFairPrice ? (
                    <>
                      <p className="font-mono text-xl font-black text-yellow-300">{formatGold(estimatedFairPrice)}<span className="ml-1 text-xs font-bold text-zinc-700">G</span></p>
                      <p className={`mt-1 text-[11px] font-semibold ${estimatedDiffRate && estimatedDiffRate > 0 ? "text-red-300/80" : "text-emerald-300/80"}`}>
                        현재가가 추정가 대비 {estimatedDiffRate && estimatedDiffRate > 0 ? "+" : ""}{estimatedDiffRate}%
                      </p>
                      <p className="mt-1 text-[10px] font-semibold text-zinc-600">
                        옵션 반영 · 참고 거래 {analysisSampleCount}건{marketAverage ? ` · 유사 평균 ${formatGold(marketAverage)}G` : ""}
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="font-mono text-xl font-black text-zinc-500">데이터 없음</p>
                      <p className="mt-1 text-[11px] font-semibold text-zinc-600">옵션 기반 추정 데이터 부족</p>
                    </>
                  )}
                </div>
              </div>

              <div className="space-y-6">
                {category !== "WILD" && (
                  <div className="space-y-3">
                    <h2 className="text-[10px] font-extrabold text-blue-300 uppercase tracking-[0.14em] flex items-center gap-2">
                      <div className="w-1 h-3 bg-blue-500 rounded-full" /> 강화 단계
                    </h2>
                    <div className="inline-flex items-baseline gap-2 rounded-2xl border border-blue-500/15 bg-blue-500/[0.06] px-4 py-2.5">
                      <span className="font-mono text-xl font-extrabold text-blue-100">+{auction.enhancementLevel || 0}</span>
                      <span className="text-xs font-semibold text-blue-300/70">강화</span>
                    </div>
                  </div>
                )}

                {category === "WILD" && (auction.quality != null || (Array.isArray(auction.lampLines) && auction.lampLines.length > 0)) && (
                  <div className="space-y-2">
                    <h2 className="text-[10px] font-extrabold text-emerald-400 uppercase tracking-[0.14em] flex items-center gap-2">
                      <div className="w-1 h-3 bg-emerald-500 rounded-full" /> 품질 · 램프
                    </h2>
                    <div className="grid grid-cols-[4.5rem_1fr] items-center gap-3 rounded-xl border border-white/5 bg-black/30 px-3 py-2.5">
                      {auction.quality != null ? (
                        <div className="flex flex-col gap-0.5 self-center">
                          <span className="text-[9px] font-extrabold text-emerald-400/80 uppercase tracking-[0.1em]">품질</span>
                          <span className="font-mono text-sm font-extrabold text-emerald-300 tabular-nums">{auction.quality}</span>
                        </div>
                      ) : (
                        <div />
                      )}
                      {Array.isArray(auction.lampLines) && auction.lampLines.length > 0 ? (
                        <div className="space-y-1 min-w-0 self-center">
                          {auction.lampLines.map((line: string, idx: number) => (
                            <div key={idx} className="text-[10px] text-zinc-300 leading-snug">
                              <span className="text-amber-500/80 font-extrabold text-[9px] uppercase mr-1.5">램프{idx + 1}</span>
                              {line}
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </div>
                )}

                {category === "WILD" && (wildEnchantGroups.base.length > 0 || wildEnchantGroups.special.length > 0) && (
                  <div className="space-y-4">
                    {wildEnchantGroups.base.length > 0 && (
                      <div className="space-y-2">
                        <h2 className="text-[10px] font-extrabold text-blue-400 uppercase tracking-[0.14em] flex items-center gap-2">
                          <div className="w-1 h-3 bg-blue-600 rounded-full" /> 일반 인챈트
                        </h2>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-1.5">
                          {wildEnchantGroups.base.map(([name, lv]) => (
                            <div key={name} className={`min-h-[34px] flex items-center justify-between px-2.5 py-1.5 rounded-lg border ${getWildEnchantActiveBadgeClass(name, lv)}`}>
                              <span className="font-semibold text-[10px] truncate mr-1">{name}</span>
                              <span className="font-black text-[9px] bg-white/20 px-1.5 py-0.5 rounded-md shrink-0">{lv}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {wildEnchantGroups.special.length > 0 && (
                      <div className="space-y-2">
                        <h2 className="text-[10px] font-extrabold text-red-400 uppercase tracking-[0.14em] flex items-center gap-2">
                          <div className="w-1 h-3 bg-red-600 rounded-full" /> 특수 인챈트
                        </h2>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-1.5">
                          {wildEnchantGroups.special.map(([name, lv]) => (
                            <div key={name} className={`min-h-[34px] flex items-center justify-between px-2.5 py-1.5 rounded-lg border ${getWildEnchantActiveBadgeClass(name, lv)}`}>
                              <span className="font-semibold text-[10px] truncate mr-1">{name}</span>
                              <span className="font-black text-[9px] bg-white/20 px-1.5 py-0.5 rounded-md shrink-0">{lv}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
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
                        <h2 className="text-[10px] font-extrabold text-indigo-300 uppercase tracking-[0.14em] flex items-center gap-2">
                          <div className="w-1 h-3 bg-indigo-500 rounded-full" /> 장착된 룬
                        </h2>
                        <div className="grid grid-cols-3 gap-2">
                          {auction.runes.map((rune: any, i: number) => (
                            <div key={i} className={`h-14 rounded-xl border flex flex-col items-center justify-center text-center ${rune.type ? 'bg-indigo-500/10 border-indigo-500/30' : 'bg-black/40 border-white/5 opacity-40'}`}>
                              {rune.type ? (
                                <>
                                  <span className="text-[8px] font-black text-indigo-300 uppercase mb-0.5">{rune.grade}</span>
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
              </div>

                <div className="mt-5 pt-5 border-t border-white/5 relative shrink-0 flex flex-col min-h-[280px] lg:min-h-[320px]">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <h2 className="text-[10px] font-extrabold text-zinc-500 uppercase tracking-[0.14em] flex items-center gap-2">
                      <div className="w-1 h-3 bg-blue-600 rounded-full" /> 댓글
                    </h2>
                    <span className="rounded-md border border-white/5 bg-white/[0.03] px-2 py-0.5 text-[10px] font-extrabold text-zinc-500">
                      {comments.length}개
                    </span>
                  </div>

                  <div className="custom-scrollbar space-y-2 overflow-y-auto max-h-[min(28vh,340px)] lg:max-h-[380px] pr-1 flex-1 min-h-0">
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

                  <form onSubmit={handleCommentSubmit} className="mt-3 shrink-0 rounded-2xl border border-white/5 bg-black/30 p-3">
                    <textarea
                      value={commentInput}
                      onChange={(e) => setCommentInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          if (!isCommenting && commentInput.trim()) {
                            void handleCommentSubmit(e as unknown as React.FormEvent);
                          }
                        }
                      }}
                      disabled={isCommenting}
                      maxLength={500}
                      placeholder={currentUser ? "댓글을 입력하세요... (Enter 전송, Shift+Enter 줄바꿈)" : "로그인 후 댓글을 남길 수 있습니다."}
                      className="min-h-[88px] w-full resize-y bg-transparent text-xs font-medium leading-relaxed text-zinc-200 outline-none placeholder:text-zinc-600 disabled:opacity-50"
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

          {/* --- 우측: 조작 터미널 --- */}
          <div className="lg:col-span-4 space-y-4 lg:sticky lg:top-24 lg:self-start">
            <section className="site-card custom-scrollbar max-h-[min(88vh,920px)] overflow-y-auto p-4 md:p-5 rounded-[28px] lg:max-h-[calc(100vh-6.5rem)]">
              <h2 className="mb-3 flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[0.14em] text-zinc-400">
                <div className="w-1 h-3 bg-blue-600 rounded-full" /> 경매 정보
              </h2>

                <div className="space-y-3">
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
                {extensionNotice && (
                  <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs font-semibold leading-relaxed text-amber-100">
                    {extensionNotice}
                  </div>
                )}

                <div className="space-y-1.5 rounded-2xl border border-white/5 bg-black/20 px-3 py-2.5">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="shrink-0 text-[10px] font-extrabold text-red-400 uppercase tracking-[0.12em]">남은 시간</span>
                    <span className="min-w-0 truncate text-right text-sm font-mono font-black text-zinc-200">{timeLeft}</span>
                  </div>
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="shrink-0 text-[10px] font-extrabold text-zinc-500 uppercase tracking-[0.12em]">최고 입찰자</span>
                    <span className="min-w-0 truncate text-right text-sm font-extrabold text-cyan-400 uppercase">{maskBidderName(auction.lastBidder)}</span>
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

                <div className="mt-1 space-y-3 border-t border-white/5 pt-4">
                  <h3 className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.14em] text-zinc-500">
                    <div className="h-3 w-1 rounded-full bg-blue-600" /> 경매 입찰
                  </h3>
                  <div className="rounded-2xl border border-white/10 bg-black/40 p-3.5">
                    <div>
                      <label className="mb-2 block text-[10px] font-extrabold uppercase tracking-[0.12em] text-yellow-400">현재 최고가</label>
                      <div className="flex min-w-0 items-baseline gap-2 overflow-hidden">
                        <span className="truncate whitespace-nowrap font-mono text-2xl font-black text-yellow-400 md:text-3xl">{formatGold(currentPrice)}</span>
                        <span className="shrink-0 font-black text-yellow-900">G</span>
                      </div>
                    </div>
                    <div className="my-3 h-px w-full bg-white/10" />
                    <div>
                      <label className="mb-2 block text-[10px] font-extrabold uppercase tracking-[0.12em] text-blue-400">내 입찰 금액</label>
                      <div className="relative flex items-baseline gap-2 overflow-hidden">
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
                  </div>

                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    <button
                      type="button"
                      disabled={!canAuctionTrade || isSeller || isProcessing || needsDiscordForTrade || verifyingSession}
                      onClick={() => setBidAmount(getMinimumBid(currentPrice, auction.endTime).toString())}
                      className="site-btn site-btn-secondary site-btn-compact min-h-[34px] whitespace-nowrap"
                    >
                      최소
                    </button>
                    {[10, 20, 50].map((pct) => (
                      <button
                        key={pct}
                        type="button"
                        disabled={!canAuctionTrade || isSeller || isProcessing || needsDiscordForTrade || verifyingSession}
                        onClick={() =>
                          setBidAmount(
                            (currentPrice + Math.max(getMinBidIncrement(currentPrice, auction.endTime), Math.ceil(currentPrice * (pct / 100)))).toString(),
                          )
                        }
                        className="site-btn site-btn-secondary site-btn-compact min-h-[34px] whitespace-nowrap"
                      >
                        +{pct}%
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2.5 pt-1">
                    <button
                    disabled={!canAuctionTrade || isSeller || isProcessing || needsDiscordForTrade || verifyingSession}
                    onClick={handleBid}
                    className="auction-bid-btn whitespace-nowrap"
                  >
                    {!canAuctionTrade ? "입찰 불가 상태" : isSeller ? "내 물품 입찰 불가" : needsDiscordForTrade ? "디스코드 인증 필요" : verifyingSession ? "인증 확인 중…" : "상위 입찰하기"}
                  </button>

                  {isSeller && auction.status === "ACTIVE" && (
                    <button
                      type="button"
                      disabled={isProcessing || needsDiscordForTrade || verifyingSession}
                      onClick={handleCancelRequest}
                      className="site-btn site-btn-secondary w-full whitespace-nowrap"
                    >
                      {isProcessing ? "처리 중..." : "경매 취소 요청 (5분 후 유찰)"}
                    </button>
                  )}

                  {isSeller && auction.status === "CANCEL_PENDING" && (
                    <button
                      type="button"
                      disabled={isProcessing || needsDiscordForTrade || verifyingSession}
                      onClick={handleCancelRevoke}
                      className="site-btn site-btn-primary w-full whitespace-nowrap"
                    >
                      {isProcessing ? "처리 중..." : "취소 철회 · 경매 재개"}
                    </button>
                  )}

                  {auction.buyNowPrice && auction.status === 'ACTIVE' && (
                    <button
                      disabled={isSeller || isProcessing || needsDiscordForTrade || verifyingSession}
                      onClick={handleBuyNow}
                      className="auction-buy-now-btn whitespace-nowrap"
                    >
                      {isProcessing ? "처리 중..." : `즉시 구매 (${formatGold(buyNowPrice ?? 0)})`}
                    </button>
                  )}
                </div>

                {canAuctionTrade && (
                  <div className="rounded-2xl border border-blue-500/20 bg-blue-500/5 overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setBidRulesOpen((open) => !open)}
                      className="flex w-full items-start justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-blue-500/10"
                      aria-expanded={bidRulesOpen}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-blue-300">입찰 규칙 안내</p>
                        {!bidRulesOpen && (
                          <p className="mt-1 text-[11px] font-medium leading-relaxed text-zinc-400">
                            지금 최소 인상{" "}
                            <span className="font-mono text-blue-300">+{minBidIncrement.toLocaleString()} G</span>
                            {" "}({bidIncrementTierLabel} · {bidDetails.timeBand.label})
                            {bidDetails.extendsOnBid && (
                              <span className="text-amber-200/90"> · 입찰 시 {BID_EXTENSION_MINUTES}분 연장</span>
                            )}
                          </p>
                        )}
                      </div>
                      <span className="shrink-0 pt-0.5 text-[10px] font-bold uppercase tracking-wider text-blue-400/80">
                        {bidRulesOpen ? "접기 ▲" : "펼치기 ▼"}
                      </span>
                    </button>
                    {bidRulesOpen && (
                      <div className="space-y-3 border-t border-blue-500/15 px-4 pb-4 pt-3">
                        <p className="text-[11px] font-medium leading-relaxed text-zinc-400">
                          최소 인상은 <span className="text-zinc-200">가격 구간</span>과{" "}
                          <span className="text-zinc-200">마감까지 남은 시간</span>에 따라 달라집니다.
                          마감이 가까울수록 한 번에 더 크게 올려야 합니다.
                        </p>
                        <div className="space-y-1.5">
                          <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-zinc-500">① 가격 구간 (기본 인상)</p>
                          <ul className="space-y-1 text-[11px] text-zinc-400">
                            {PRICE_INCREMENT_TIERS.map((tier) => (
                              <li key={tier.label} className="flex justify-between gap-2">
                                <span>{tier.label}</span>
                                <span className="font-mono text-zinc-300">+{tier.increment.toLocaleString()} G</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div className="space-y-1.5">
                          <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-zinc-500">② 마감 임박 시간 배수</p>
                          <ul className="space-y-1.5">
                            {BID_TIME_BANDS.map((band) => {
                              const active = bidDetails.timeBand.id === band.id;
                              return (
                                <li
                                  key={band.id}
                                  className={`rounded-xl border px-3 py-2 text-[11px] leading-relaxed ${
                                    active
                                      ? "border-blue-500/40 bg-blue-500/10 text-blue-100"
                                      : "border-white/5 bg-black/20 text-zinc-500"
                                  }`}
                                >
                                  <div className="flex items-center justify-between gap-2 font-semibold">
                                    <span>{band.label}</span>
                                    <span className="font-mono">×{band.multiplier}</span>
                                  </div>
                                  <p className={`mt-1 ${active ? "text-blue-200/80" : "text-zinc-600"}`}>{band.description}</p>
                                </li>
                              );
                            })}
                          </ul>
                        </div>
                        <div className="rounded-xl border border-white/5 bg-black/25 px-3 py-2.5 text-[11px] leading-relaxed text-zinc-400">
                          <p>
                            <span className="font-semibold text-zinc-200">지금 적용:</span>{" "}
                            {bidIncrementTierLabel} 기본 {bidDetails.baseIncrement.toLocaleString()} G × {bidDetails.multiplier}배 ={" "}
                            <span className="font-mono text-blue-300">+{minBidIncrement.toLocaleString()} G</span>
                          </p>
                          {bidDetails.nextBand && bidDetails.msUntilNextBand !== null && (
                            <p className="mt-1.5 text-amber-200/90">
                              {formatDurationShort(bidDetails.msUntilNextBand)} 후 「{bidDetails.nextBand.label}」(×
                              {bidDetails.nextBand.multiplier})로 변경됩니다.
                            </p>
                          )}
                          {bidDetails.extendsOnBid && (
                            <p className="mt-1.5 text-amber-200/90">
                              현재 구간에서는 유효 입찰 시 마감이 {BID_EXTENSION_MINUTES}분 연장됩니다. (반복 연장 가능)
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

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

}
