"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { request } from "@/lib/client/api";
import { consumeAuctionListRestore, saveAuctionListRestore } from "@/lib/auction/auctionListRestore";
import { ISLAND_IMPRINTS, RPG_SKILLS, WILD_BASE, WILD_SPECIAL } from "@/lib/domain/marketData";
import {
  AUCTION_FILTER_STORAGE_KEY,
  AUCTION_SORT_OPTIONS,
  AUCTIONS_PER_PAGE,
  DEFAULT_AUCTION_FILTERS,
  type Auction,
  type AuctionFilterState,
  type AuctionSortKey,
  type DetailFilterSection,
  type FilterSection,
} from "@/features/home/auctionListTypes";
import { triggerHaptic } from "@/features/home/auctionListUtils";

export function useAuctionList(isActive: boolean) {
  const router = useRouter();
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [nowTimestamp, setNowTimestamp] = useState(0);
  const [activeFilters, setActiveFilters] = useState<AuctionFilterState>(DEFAULT_AUCTION_FILTERS);
  const [isAuctionFilterSavedFeedback, setIsAuctionFilterSavedFeedback] = useState(false);
  const [openFilterSections, setOpenFilterSections] = useState<Record<FilterSection, boolean>>({
    category: false,
    priceRange: false,
    timeRange: false,
    detail: false,
  });
  const [openDetailFilterSections, setOpenDetailFilterSections] = useState<Record<DetailFilterSection, boolean>>({
    enhancement: false,
    enchantments: false,
    imprints: false,
    skills: false,
  });
  const [auctionPage, setAuctionPage] = useState(1);
  const [auctionSort, setAuctionSort] = useState<AuctionSortKey>("default");
  const auctionPaginationRef = useRef<HTMLDivElement>(null);
  const isRestoringAuctionListRef = useRef(false);
  const pendingAuctionScrollYRef = useRef<number | null>(null);

  useEffect(() => {
    queueMicrotask(() => setNowTimestamp(Date.now()));
    const timer = setInterval(() => setNowTimestamp(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(AUCTION_FILTER_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed?.filters && typeof parsed.filters === "object") {
        setActiveFilters({
          ...DEFAULT_AUCTION_FILTERS,
          ...parsed.filters,
          category: Array.isArray(parsed.filters.category) ? parsed.filters.category : [],
          timeRange: Array.isArray(parsed.filters.timeRange) ? parsed.filters.timeRange : [],
          enhancementLevels: Array.isArray(parsed.filters.enhancementLevels) ? parsed.filters.enhancementLevels : [],
          enchantments: Array.isArray(parsed.filters.enchantments) ? parsed.filters.enchantments : [],
          imprints: Array.isArray(parsed.filters.imprints) ? parsed.filters.imprints : [],
          skills: Array.isArray(parsed.filters.skills) ? parsed.filters.skills : [],
          priceMin: typeof parsed.filters.priceMin === "string" ? parsed.filters.priceMin : "",
          priceMax: typeof parsed.filters.priceMax === "string" ? parsed.filters.priceMax : "",
        });
      }
      if (typeof parsed?.searchQuery === "string") {
        setSearchQuery(parsed.searchQuery);
      }
    } catch {
      /* ignore corrupt preset */
    }
  }, []);

  useEffect(() => {
    const fetchAuctions = async () => {
      try {
        const data = await request("/api/auctions");
        if (Array.isArray(data)) {
          const now = new Date();
          setAuctions(data.filter((a: Auction) => a.status === "ACTIVE" && new Date(a.endTime) > now));
        }
      } catch (err) {
        console.error("경매 목록 로드 실패:", err);
        setAuctions([]);
      }
    };
    fetchAuctions();
  }, []);

  const filteredAuctions = useMemo(() => {
    return auctions.filter((a) => {
      const matchesSearch = a.item.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = activeFilters.category.length === 0 || activeFilters.category.includes(a.item.category);
      const price = Number(a.currentPrice);
      const minPrice = activeFilters.priceMin.trim() === "" ? null : Number(activeFilters.priceMin);
      const maxPrice = activeFilters.priceMax.trim() === "" ? null : Number(activeFilters.priceMax);
      const matchesPrice =
        (minPrice === null || price >= minPrice) &&
        (maxPrice === null || price <= maxPrice);
      const timeDistance = new Date(a.endTime).getTime() - nowTimestamp;
      const matchesTime =
        activeFilters.timeRange.length === 0 ||
        activeFilters.timeRange.some((range) => (
          (range === "URGENT" && timeDistance <= 1000 * 60 * 60) ||
          (range === "TODAY" && timeDistance > 1000 * 60 * 60 && timeDistance <= 1000 * 60 * 60 * 24) ||
          (range === "LATER" && timeDistance > 1000 * 60 * 60 * 24)
        ));
      const matchesEnhancement =
        activeFilters.enhancementLevels.length === 0 ||
        activeFilters.enhancementLevels.includes(a.enhancementLevel);
      const matchesEnchantments =
        activeFilters.enchantments.length === 0 ||
        activeFilters.enchantments.some((name) => !!a.enchantments?.[name]);
      const matchesImprints =
        activeFilters.imprints.length === 0 ||
        activeFilters.imprints.some((name) => !!a.imprint?.[name]);
      const matchesSkills =
        activeFilters.skills.length === 0 ||
        activeFilters.skills.some((name) => !!a.skills?.[name]);

      return matchesSearch && matchesCategory && matchesPrice && matchesTime && matchesEnhancement && matchesEnchantments && matchesImprints && matchesSkills;
    });
  }, [auctions, searchQuery, activeFilters, nowTimestamp]);

  const sortedAuctions = useMemo(() => {
    const list = [...filteredAuctions];
    switch (auctionSort) {
      case "priceAsc":
        return list.sort((a, b) => Number(a.currentPrice) - Number(b.currentPrice));
      case "priceDesc":
        return list.sort((a, b) => Number(b.currentPrice) - Number(a.currentPrice));
      case "newest":
        return list.sort((a, b) => {
          const aTime = a.createdAt ? new Date(a.createdAt).getTime() : a.id;
          const bTime = b.createdAt ? new Date(b.createdAt).getTime() : b.id;
          return bTime - aTime;
        });
      default:
        return list;
    }
  }, [filteredAuctions, auctionSort]);

  const auctionTotalPages = Math.max(1, Math.ceil(sortedAuctions.length / AUCTIONS_PER_PAGE));

  const paginatedAuctions = useMemo(() => {
    const start = (auctionPage - 1) * AUCTIONS_PER_PAGE;
    return sortedAuctions.slice(start, start + AUCTIONS_PER_PAGE);
  }, [sortedAuctions, auctionPage]);

  useEffect(() => {
    if (!isActive) return;
    const saved = consumeAuctionListRestore();
    if (!saved) return;

    isRestoringAuctionListRef.current = true;
    if (AUCTION_SORT_OPTIONS.some((option) => option.key === saved.sort)) {
      setAuctionSort(saved.sort as AuctionSortKey);
    }
    setAuctionPage(saved.page);
    pendingAuctionScrollYRef.current = saved.scrollY;
  }, [isActive]);

  useEffect(() => {
    if (isRestoringAuctionListRef.current) return;
    setAuctionPage(1);
  }, [searchQuery, activeFilters, auctionSort]);

  useEffect(() => {
    if (!isActive) return;
    if (!isRestoringAuctionListRef.current && pendingAuctionScrollYRef.current == null) return;
    if (auctions.length === 0 && filteredAuctions.length === 0) return;

    const scrollY = pendingAuctionScrollYRef.current ?? 0;
    pendingAuctionScrollYRef.current = null;

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        window.scrollTo({ top: scrollY, left: 0, behavior: "auto" });
        isRestoringAuctionListRef.current = false;
      });
    });
  }, [isActive, auctions.length, filteredAuctions.length, sortedAuctions.length, auctionPage, paginatedAuctions.length]);

  useEffect(() => {
    if (auctionPage > auctionTotalPages) {
      setAuctionPage(auctionTotalPages);
    }
  }, [auctionPage, auctionTotalPages]);

  const auctionSummary = useMemo(() => {
    const urgentCount = auctions.filter((a) => {
      const end = new Date(a.endTime).getTime();
      return end > nowTimestamp && end - nowTimestamp <= 1000 * 60 * 60;
    }).length;

    return {
      activeCount: auctions.length,
      urgentCount,
    };
  }, [auctions, nowTimestamp]);

  const filterOptions = useMemo(() => {
    const cats = Array.from(new Set(auctions.map((a) => a.item.category)));
    return [
      {
        key: "category" as const,
        label: "카테고리",
        options: cats.map((cat) => ({ value: cat, label: cat })),
      },
      {
        key: "timeRange" as const,
        label: "남은 시간",
        options: [
          { value: "URGENT", label: "1시간 이내" },
          { value: "TODAY", label: "24시간 이내" },
          { value: "LATER", label: "여유 있음" },
        ],
      },
    ];
  }, [auctions]);

  const detailFilterOptions = useMemo(() => {
    const enchantments = Array.from(new Set([...WILD_BASE, ...WILD_SPECIAL].map(([name]) => String(name))));

    return {
      enhancement: Array.from({ length: 15 }, (_, i) => ({ value: i + 1, label: `+${i + 1}` })),
      enchantments: enchantments.map((name) => ({ value: name, label: name })),
      imprints: ISLAND_IMPRINTS.map((name) => ({ value: name, label: name })),
      skills: RPG_SKILLS.map((name) => ({ value: name, label: name })),
    };
  }, []);

  const activeFilterCount = useMemo(() => (
    activeFilters.category.length +
    activeFilters.timeRange.length +
    activeFilters.enhancementLevels.length +
    activeFilters.enchantments.length +
    activeFilters.imprints.length +
    activeFilters.skills.length +
    (activeFilters.priceMin.trim() ? 1 : 0) +
    (activeFilters.priceMax.trim() ? 1 : 0)
  ), [activeFilters]);

  const resetAuctionFilters = () => {
    setSearchQuery("");
    setActiveFilters({ ...DEFAULT_AUCTION_FILTERS });
    localStorage.removeItem(AUCTION_FILTER_STORAGE_KEY);
  };

  const saveAuctionFilters = () => {
    triggerHaptic();
    localStorage.setItem(
      AUCTION_FILTER_STORAGE_KEY,
      JSON.stringify({ searchQuery, filters: activeFilters }),
    );
    setIsAuctionFilterSavedFeedback(true);
    setTimeout(() => setIsAuctionFilterSavedFeedback(false), 1500);
  };

  const scrollToAuctionPagination = useCallback(() => {
    triggerHaptic();
    auctionPaginationRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const openAuctionDetail = useCallback(
    (auctionId: number) => {
      triggerHaptic();
      saveAuctionListRestore({
        page: auctionPage,
        sort: auctionSort,
        scrollY: window.scrollY,
      });
      router.push(`/auction/${auctionId}`);
    },
    [auctionPage, auctionSort, router],
  );

  const toggleTextFilter = (key: "category" | "timeRange" | "enchantments" | "imprints" | "skills", value: string) => {
    setActiveFilters((prev) => {
      const values = prev[key];
      const nextValues = values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
      return { ...prev, [key]: nextValues };
    });
  };

  const toggleEnhancementFilter = (value: number) => {
    setActiveFilters((prev) => {
      const values = prev.enhancementLevels;
      const nextValues = values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
      return { ...prev, enhancementLevels: nextValues };
    });
  };

  const toggleFilterSection = (section: FilterSection) => {
    setOpenFilterSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const toggleDetailFilterSection = (section: DetailFilterSection) => {
    setOpenDetailFilterSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  return {
    searchQuery,
    setSearchQuery,
    activeFilters,
    setActiveFilters,
    isAuctionFilterSavedFeedback,
    openFilterSections,
    openDetailFilterSections,
    auctionPage,
    setAuctionPage,
    auctionSort,
    setAuctionSort,
    auctionPaginationRef,
    filteredAuctions,
    sortedAuctions,
    paginatedAuctions,
    auctionTotalPages,
    auctionSummary,
    filterOptions,
    detailFilterOptions,
    activeFilterCount,
    resetAuctionFilters,
    saveAuctionFilters,
    scrollToAuctionPagination,
    openAuctionDetail,
    toggleTextFilter,
    toggleEnhancementFilter,
    toggleFilterSection,
    toggleDetailFilterSection,
  };
}
