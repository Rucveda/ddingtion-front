"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ListPagination from "@/components/ListPagination";
import { getWildEnchantListBadgeClass } from "@/lib/domain/enhancementAllowlist";
import { AUCTION_SORT_OPTIONS, AUCTIONS_PER_PAGE } from "@/features/home/auctionListTypes";
import { TimeLeft } from "@/features/home/TimeLeft";
import {
  formatGold,
  getSecureUrl,
  hasBuyNowPrice,
  triggerHaptic,
} from "@/features/home/auctionListUtils";
import { useAuctionList } from "@/features/home/hooks/useAuctionList";
import {
  HERO_BURST_STAGE1,
  HERO_BURST_STAGE2,
  HERO_BURST_WORDS,
  buildBurstParticles,
  withOrigins,
  type HeroParticle,
} from "@/features/home/heroParticles";

type AuctionListTabProps = {
  isActive: boolean;
};

export function AuctionListTab({ isActive }: AuctionListTabProps) {
  const list = useAuctionList(isActive);
  const [particles, setParticles] = useState<HeroParticle[]>([]);
  const particleBurstLock = useRef(0);
  const stage2TimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clearParticlesTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const heroBurstRef = useRef<HTMLSpanElement>(null);
  const heroCharRefs = useRef<(HTMLSpanElement | null)[]>([]);

  const triggerGoldExplosion = useCallback(() => {
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      triggerHaptic();
      return;
    }

    const now = Date.now();
    if (now - particleBurstLock.current < 900) return;
    particleBurstLock.current = now;

    triggerHaptic();
    if (stage2TimerRef.current) clearTimeout(stage2TimerRef.current);
    if (clearParticlesTimerRef.current) clearTimeout(clearParticlesTimerRef.current);

    const spawnBurst = () => {
      const wrap = heroBurstRef.current;
      const wrapRect = wrap?.getBoundingClientRect();
      const origins: { x: number; y: number }[] = [];
      const letterCount = HERO_BURST_WORDS.reduce((sum, word) => sum + word.chars.length, 0);
      heroCharRefs.current = heroCharRefs.current.slice(0, letterCount);

      if (wrapRect) {
        heroCharRefs.current.forEach((el) => {
          if (!el) return;
          const rect = el.getBoundingClientRect();
          if (rect.width < 1 || rect.height < 1) return;
          origins.push({
            x: rect.left + rect.width / 2 - wrapRect.left - wrapRect.width / 2,
            y: rect.top + rect.height / 2 - wrapRect.top - wrapRect.height / 2,
          });
        });
      }
      if (origins.length === 0) origins.push({ x: 0, y: 0 });

      const stage1: HeroParticle[] = [];
      origins.forEach((origin, index) => {
        const batch = buildBurstParticles(5, now + index * 120, HERO_BURST_STAGE1);
        stage1.push(...withOrigins(batch, origin, 14));
      });
      setParticles(stage1);

      stage2TimerRef.current = setTimeout(() => {
        const stage2Targets = [...origins].sort(() => Math.random() - 0.5).slice(0, Math.min(4, origins.length));
        const stage2: HeroParticle[] = [];
        stage2Targets.forEach((origin, index) => {
          const batch = buildBurstParticles(6, now + 4000 + index * 90, HERO_BURST_STAGE2);
          stage2.push(...withOrigins(batch, origin, 16));
        });
        setParticles((prev) => [...prev, ...stage2]);
      }, 90);

      clearParticlesTimerRef.current = setTimeout(() => setParticles([]), 2100);
    };

    requestAnimationFrame(() => requestAnimationFrame(spawnBurst));
  }, []);

  useEffect(() => {
    return () => {
      if (stage2TimerRef.current) clearTimeout(stage2TimerRef.current);
      if (clearParticlesTimerRef.current) clearTimeout(clearParticlesTimerRef.current);
    };
  }, []);

  if (!isActive) return null;

  return (
    <motion.div key="auction-view" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, pointerEvents: "none" }}>
      <header className="relative pt-20 pb-12 md:pt-32 md:pb-20 overflow-visible">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
            <h1 className="auction-hero-title text-5xl sm:text-6xl lg:text-7xl font-black mb-6 tracking-[-0.055em] leading-[1.08] break-keep">
              <span className="auction-hero-line block">
                <motion.span
                  ref={heroBurstRef}
                  onHoverStart={triggerGoldExplosion}
                  whileHover={{
                    scale: 1.02,
                    filter: "brightness(1.18) drop-shadow(0 0 14px rgba(234, 179, 8, 0.5))",
                  }}
                  className="relative inline-block cursor-pointer overflow-visible transition-[filter] duration-300"
                >
                  {HERO_BURST_WORDS.map((word, wordIndex) => {
                    let letterOffset = HERO_BURST_WORDS.slice(0, wordIndex).reduce((sum, w) => sum + w.chars.length, 0);
                    return (
                      <span key={word.label} className="inline">
                        {wordIndex > 0 ? " " : null}
                        {word.chars.map((char) => {
                          const refIndex = letterOffset;
                          letterOffset += 1;
                          return (
                            <span
                              key={`${word.label}-${char}-${refIndex}`}
                              ref={(el) => {
                                heroCharRefs.current[refIndex] = el;
                              }}
                              className="relative z-20 inline text-[#facc15]"
                            >
                              {char}
                            </span>
                          );
                        })}
                      </span>
                    );
                  })}
                  <AnimatePresence initial={false}>
                    {particles.map((p) => (
                      <motion.span
                        key={p.id}
                        initial={{ opacity: 0.95, x: 0, y: 0, scale: 1 }}
                        animate={{
                          opacity: 0,
                          x: [0, p.xPeak, p.x],
                          y: [0, p.yPeak, p.y],
                          scale: [1, 0.9, 0.12],
                        }}
                        transition={{
                          duration: p.duration,
                          times: [0, p.peakTime, 1],
                          ease: ["easeOut", "easeIn"],
                          opacity: {
                            duration: p.duration * 0.78,
                            delay: p.duration * 0.48,
                            ease: [0.03, 0.96, 0.1, 1],
                          },
                        }}
                        className="absolute z-30 -translate-x-1/2 -translate-y-1/2 pointer-events-none rounded-full"
                        style={{
                          left: `calc(50% + ${p.originX}px)`,
                          top: `calc(50% + ${p.originY}px)`,
                          width: p.size,
                          height: p.size,
                          backgroundColor: p.color,
                          boxShadow: `0 0 9px ${p.color}, 0 0 16px ${p.color}66`,
                        }}
                      />
                    ))}
                  </AnimatePresence>
                </motion.span>
                을 거래하는
              </span>
              <motion.span
                className="auction-hero-line prism-text-overlay block italic"
                data-text="가장 현명한 방법."
              >
                가장 현명한 방법.
              </motion.span>
            </h1>
            <p className="max-w-2xl text-base md:text-lg font-medium text-zinc-300 leading-7 break-keep">
              실시간 입찰과 즉시구매로 원하는 아이템을 빠르게 구해보세요.
            </p>

            <div className="mt-7 inline-flex overflow-hidden rounded-2xl bg-white/[0.045] shadow-lg shadow-black/10 backdrop-blur-md">
              <div className="px-5 py-3">
                <span className="mr-3 text-xs font-semibold text-zinc-400">진행 중</span>
                <span className="font-mono text-lg font-bold text-white">{list.auctionSummary.activeCount}</span>
                <span className="ml-1 text-xs font-semibold text-zinc-400">건</span>
              </div>
              <div className="w-px bg-white/10" />
              <div className="px-5 py-3">
                <span className="mr-3 text-xs font-semibold text-rose-300/80">마감 임박</span>
                <span className="font-mono text-lg font-bold text-rose-100">{list.auctionSummary.urgentCount}</span>
                <span className="ml-1 text-xs font-semibold text-rose-300/70">건</span>
              </div>
            </div>
          </motion.div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-32 md:pb-40">
        <div className="mb-10 md:mb-16 rounded-[28px] border border-white/10 bg-white/[0.025] p-3 md:p-4 shadow-2xl backdrop-blur-md">
          <div className="relative">
            <input
              type="text"
              placeholder="찾으시는 물품의 이름을 입력하세요..."
              value={list.searchQuery}
              onChange={(e) => list.setSearchQuery(e.target.value)}
              className="w-full bg-black/30 border border-white/10 p-4 md:p-5 pl-12 md:pl-14 rounded-2xl text-sm md:text-base font-semibold outline-none focus:border-cyan-500/50 transition-all placeholder:text-zinc-500"
            />
            <svg className="absolute left-5 md:left-6 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500 md:h-5 md:w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
              <path d="m21 21-4.3-4.3" />
              <circle cx="11" cy="11" r="7" />
            </svg>
          </div>

          <div className="mt-3 rounded-[22px] bg-black/20 p-3 md:p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-zinc-500">Filters</div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => {
                    triggerHaptic();
                    list.resetAuctionFilters();
                  }}
                  className="site-btn site-btn-ghost site-btn-compact"
                >
                  초기화 {list.activeFilterCount > 0 && `(${list.activeFilterCount})`}
                </button>
                <button
                  onClick={list.saveAuctionFilters}
                  className={`site-btn site-btn-compact ${list.isAuctionFilterSavedFeedback ? "border-green-500/30 bg-green-500/15 text-green-100" : "site-btn-secondary"}`}
                >
                  {list.isAuctionFilterSavedFeedback ? "✓ 저장됨" : "검색·필터 저장"}
                </button>
              </div>
            </div>

            <div className="grid gap-2">
              {list.filterOptions.map((group) => (
                <div key={group.key} className="rounded-2xl bg-white/[0.025]">
                  <button
                    onClick={() => {
                      triggerHaptic();
                      list.toggleFilterSection(group.key);
                    }}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left"
                  >
                    <span className="text-xs font-extrabold text-zinc-300">{group.label}</span>
                    <span className="text-[11px] font-extrabold text-zinc-500">
                      {list.openFilterSections[group.key] ? "▲" : "▼"}
                    </span>
                  </button>
                  {list.openFilterSections[group.key] && (
                    <div className="flex flex-wrap gap-2 px-4 pb-4">
                      {group.options.length === 0 ? (
                        <span className="rounded-xl bg-white/[0.035] px-3 py-2 text-xs font-semibold text-zinc-600">데이터 없음</span>
                      ) : group.options.map((option) => {
                        const isActiveFilter = list.activeFilters[group.key].includes(option.value);
                        return (
                          <button
                            key={`${group.key}-${option.value}`}
                            onClick={() => {
                              triggerHaptic();
                              list.toggleTextFilter(group.key, option.value);
                            }}
                            className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${isActiveFilter
                              ? "bg-cyan-500/15 text-cyan-200 shadow-lg shadow-cyan-500/5"
                              : "bg-white/[0.035] text-zinc-400 hover:bg-white/[0.07] hover:text-zinc-200"
                              }`}
                          >
                            {option.label}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}

              <div className="rounded-2xl bg-white/[0.025]">
                <button
                  onClick={() => {
                    triggerHaptic();
                    list.toggleFilterSection("priceRange");
                  }}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left"
                >
                  <span className="text-xs font-extrabold text-zinc-300">가격대</span>
                  <span className="text-[11px] font-extrabold text-zinc-500">
                    {list.openFilterSections.priceRange ? "▲" : "▼"}
                  </span>
                </button>
                {list.openFilterSections.priceRange && (
                  <div className="flex flex-wrap items-center gap-2 px-4 pb-4">
                    <input
                      type="text"
                      inputMode="numeric"
                      value={list.activeFilters.priceMin}
                      onChange={(e) => list.setActiveFilters((prev) => ({ ...prev, priceMin: e.target.value.replace(/\D/g, "") }))}
                      placeholder="최소 입찰가"
                      className="w-36 rounded-xl bg-black/30 px-3 py-2 text-xs font-semibold text-zinc-100 outline-none ring-1 ring-white/10 transition-all placeholder:text-zinc-600 focus:ring-cyan-500/40 sm:w-44"
                    />
                    <span className="px-1 text-xs font-extrabold text-zinc-500">~</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={list.activeFilters.priceMax}
                      onChange={(e) => list.setActiveFilters((prev) => ({ ...prev, priceMax: e.target.value.replace(/\D/g, "") }))}
                      placeholder="최대 입찰가"
                      className="w-36 rounded-xl bg-black/30 px-3 py-2 text-xs font-semibold text-zinc-100 outline-none ring-1 ring-white/10 transition-all placeholder:text-zinc-600 focus:ring-cyan-500/40 sm:w-44"
                    />
                  </div>
                )}
              </div>

              <div className="rounded-2xl bg-white/[0.025]">
                <button
                  onClick={() => {
                    triggerHaptic();
                    list.toggleFilterSection("detail");
                  }}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left"
                >
                  <span className="text-xs font-extrabold text-zinc-300">세부 특성</span>
                  <span className="text-[11px] font-extrabold text-zinc-500">
                    {list.openFilterSections.detail ? "▲" : "▼"}
                  </span>
                </button>
                {list.openFilterSections.detail && (
                  <div className="space-y-3 px-4 pb-4">
                    <div className="grid gap-2">
                      {([
                        { key: "enhancement" as const, label: "강화", count: list.activeFilters.enhancementLevels.length },
                        { key: "enchantments" as const, label: "인챈트", count: list.activeFilters.enchantments.length },
                        { key: "imprints" as const, label: "각인", count: list.activeFilters.imprints.length },
                        { key: "skills" as const, label: "스킬", count: list.activeFilters.skills.length },
                      ]).map((section) => (
                        <div key={section.key} className="rounded-2xl bg-black/20">
                          <button
                            onClick={() => {
                              triggerHaptic();
                              list.toggleDetailFilterSection(section.key);
                            }}
                            className="flex w-full items-center gap-3 px-3 py-2.5 text-left"
                          >
                            <span className="text-xs font-extrabold text-zinc-300">{section.label}</span>
                            <span className="text-[11px] font-extrabold text-zinc-500">
                              {list.openDetailFilterSections[section.key] ? "▲" : "▼"}
                            </span>
                          </button>

                          {list.openDetailFilterSections[section.key] && (
                            <div className="max-h-44 overflow-y-auto px-3 pb-3 pr-1 custom-scrollbar">
                              <div className="flex flex-wrap gap-2">
                                {section.key === "enhancement" ? (
                                  list.detailFilterOptions.enhancement.map((option) => {
                                    const isActiveEnh = list.activeFilters.enhancementLevels.includes(option.value);
                                    return (
                                      <button
                                        key={`enhancement-${option.value}`}
                                        onClick={() => {
                                          triggerHaptic();
                                          list.toggleEnhancementFilter(option.value);
                                        }}
                                        className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${isActiveEnh ? "bg-yellow-500/15 text-yellow-100" : "bg-white/[0.035] text-zinc-400 hover:bg-white/[0.07] hover:text-zinc-200"}`}
                                      >
                                        {option.label}
                                      </button>
                                    );
                                  })
                                ) : (
                                  list.detailFilterOptions[section.key].map((option) => {
                                    const isActiveDetail = list.activeFilters[section.key].includes(option.value);
                                    return (
                                      <button
                                        key={`${section.key}-${option.value}`}
                                        onClick={() => {
                                          triggerHaptic();
                                          list.toggleTextFilter(section.key, option.value);
                                        }}
                                        className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${isActiveDetail ? "bg-purple-500/15 text-purple-100" : "bg-white/[0.035] text-zinc-400 hover:bg-white/[0.07] hover:text-zinc-200"}`}
                                      >
                                        {option.label}
                                      </button>
                                    );
                                  })
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {list.filteredAuctions.length > 0 && (
          <div
            ref={list.auctionPaginationRef}
            className="mb-3 scroll-mt-24 rounded-[22px] border border-white/10 bg-white/[0.025] px-4 py-3"
          >
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
              {AUCTION_SORT_OPTIONS.map((option, index) => (
                <span key={option.key} className="inline-flex items-center gap-2">
                  {index > 0 && <span className="text-[11px] text-zinc-700" aria-hidden="true">·</span>}
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic();
                      list.setAuctionSort(option.key);
                    }}
                    className={`text-[11px] font-semibold transition-[color,text-shadow] duration-200 ${
                      list.auctionSort === option.key
                        ? "text-white [text-shadow:0_0_14px_rgba(255,255,255,0.65),0_0_28px_rgba(255,255,255,0.25)]"
                        : "text-zinc-500 hover:text-zinc-300"
                    }`}
                  >
                    {option.label}
                  </button>
                </span>
              ))}
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-white/5 pt-3">
              <p className="text-[11px] font-semibold text-zinc-500">
                <span className="text-zinc-300">{list.sortedAuctions.length}</span>건
                <span className="mx-2 text-zinc-700">·</span>
                페이지당 {AUCTIONS_PER_PAGE}건
              </p>
              <ListPagination
                page={list.auctionPage}
                totalPages={list.auctionTotalPages}
                onPageChange={(next) => {
                  triggerHaptic();
                  list.setAuctionPage(next);
                }}
              />
            </div>
          </div>
        )}

        {list.filteredAuctions.length === 0 ? (
          <div className="rounded-[24px] border border-dashed border-white/10 bg-white/[0.02] px-6 py-16 text-center text-sm font-semibold text-zinc-300">
            <div className="flex flex-col items-center gap-3">
              {list.auctions.length > 0 && list.activeFilterCount > 0 ? (
                <>
                  <span>저장된 필터 조건 때문에 경매가 숨겨져 있습니다.</span>
                  <span className="text-xs font-medium text-zinc-500">
                    전체 {list.auctions.length}건 중 표시 0건 · 필터를 초기화해 보세요
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic();
                      list.resetAuctionFilters();
                    }}
                    className="site-btn site-btn-secondary mt-1"
                  >
                    필터 초기화
                  </button>
                </>
              ) : (
                <>
                  <span>현재 진행 중인 경매가 없습니다.</span>
                  <span className="text-xs font-medium text-zinc-500">
                    방금 등록했다면 잠시 후 목록이 갱신되거나, 마이페이지 판매 목록에서 확인해 주세요
                  </span>
                </>
              )}
            </div>
          </div>
        ) : (
          <div className="auction-list-masonry w-full">
            {list.paginatedAuctions.map((auction) => {
              const hasOptions =
                auction.enhancementLevel > 0 ||
                Boolean(auction.enchantments && Object.keys(auction.enchantments).length > 0) ||
                Boolean(auction.imprint && Object.keys(auction.imprint).length > 0) ||
                Boolean(auction.skills && Object.keys(auction.skills).length > 0) ||
                Boolean(auction.runes?.some((rune) => rune?.grade || rune?.type));

              return (
                <article
                  key={auction.id}
                  onClick={() => list.openAuctionDetail(auction.id)}
                  className="auction-list-card site-card group cursor-pointer rounded-[22px] p-3 transition-colors hover:border-white/15 hover:bg-white/[0.04]"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl border border-white/5 bg-white/[0.035] transition-all group-hover:border-white/20">
                      <img src={getSecureUrl(auction.item.iconUrl)} className="h-14 w-14 object-contain pixel-art" alt="icon" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-col gap-2">
                        <div className="min-w-0">
                          <h3 className="truncate text-sm font-semibold text-zinc-100 transition-colors group-hover:text-cyan-300">
                            {auction.item.name}
                          </h3>
                          <p className="mt-0.5 text-[11px] font-medium text-zinc-600">
                            판매자 {auction.seller.ingameName}
                            {auction.seller.reputationScore != null && (
                              <span className="ml-1.5 font-semibold text-emerald-400/90">
                                ★ {Number(auction.seller.reputationScore).toFixed(1)}
                              </span>
                            )}
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-white/5 bg-black/20 px-2.5 py-1.5">
                          <span className="font-mono text-xs font-semibold text-yellow-400">
                            {formatGold(Number(auction.currentPrice))}
                          </span>
                          {hasBuyNowPrice(auction.buyNowPrice) && (
                            <>
                              <span className="h-3 w-px bg-white/10" />
                              <span className="font-mono text-xs font-semibold text-sky-300/90">
                                즉시 {formatGold(Number(auction.buyNowPrice))}
                              </span>
                            </>
                          )}
                          <span className="h-3 w-px bg-white/10" />
                          <TimeLeft endTime={auction.endTime} status={auction.status} />
                        </div>
                      </div>

                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {auction.enhancementLevel > 0 && (
                          <span className="rounded-lg border border-cyan-500/20 bg-cyan-500/10 px-2 py-0.5 text-[11px] font-semibold text-cyan-300">
                            강화 +{auction.enhancementLevel}
                          </span>
                        )}
                        {auction.enchantments && Object.entries(auction.enchantments).map(([name, lv]) => (
                          <span key={`enchant-${name}`} className={getWildEnchantListBadgeClass(name, Number(lv))}>
                            {name} Lv.{String(lv)}
                          </span>
                        ))}
                        {auction.imprint && Object.entries(auction.imprint).map(([name, lv]) => (
                          <span key={`imprint-${name}`} className="rounded-lg border border-yellow-500/20 bg-yellow-500/10 px-2 py-0.5 text-[11px] font-semibold text-yellow-200">
                            {name} Lv.{String(lv)}
                          </span>
                        ))}
                        {auction.skills && Object.entries(auction.skills).map(([name, lv]) => (
                          <span key={`skill-${name}`} className="rounded-lg border border-purple-500/20 bg-purple-500/10 px-2 py-0.5 text-[11px] font-semibold text-purple-200">
                            {name} Lv.{String(lv)}
                          </span>
                        ))}
                        {auction.runes?.filter((rune) => rune?.grade || rune?.type).map((rune, idx) => (
                          <span key={`rune-${idx}`} className="rounded-lg border border-orange-500/20 bg-orange-500/10 px-2 py-0.5 text-[11px] font-semibold text-orange-200">
                            {rune.grade || "룬"} {rune.type ? rune.type.replace("의룬", "") : ""}
                          </span>
                        ))}
                        {!hasOptions && (
                          <span className="text-[11px] font-medium text-zinc-600">옵션 없음</span>
                        )}
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {list.filteredAuctions.length > 0 && (
          <div className="mt-8 flex justify-center">
            <button
              type="button"
              onClick={list.scrollToAuctionPagination}
              className="text-xs font-semibold text-zinc-500 transition-colors hover:text-zinc-300"
            >
              상단으로 이동하기
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
}
