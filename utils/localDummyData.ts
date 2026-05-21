const now = Date.now();

export const LOCAL_DUMMY_USER = {
  id: 0,
  loginId: "Steve",
  ingameName: "Steve",
  role: "ADMIN",
  isBanned: false,
  reputationScore: 0,
  reviewCount: 0,
  successfulTrades: 0,
  discordLinked: true,
  discordVerificationRequired: false,
};

export const ensureLocalDummySession = () => {
  if (typeof window === "undefined") return LOCAL_DUMMY_USER;
  if (!localStorage.getItem("user")) {
    localStorage.setItem("user", JSON.stringify(LOCAL_DUMMY_USER));
  }
  if (!localStorage.getItem("token")) {
    localStorage.setItem("token", "local-dev-dummy-token");
  }
  return LOCAL_DUMMY_USER;
};

/** 필터 업데이트 UI 확인용 — 아이템명이 archetype 판별에 사용됩니다 */
export const LOCAL_DUMMY_ITEMS = [
  { id: 9001, name: "야생 다이아몬드 곡괭이", iconUrl: "https://mc-heads.net/item/diamond_pickaxe/64", category: "WILD" },
  { id: 9002, name: "야생 네더라이트 검", iconUrl: "https://mc-heads.net/item/netherite_sword/64", category: "WILD" },
  { id: 9003, name: "야생 다이아몬드 낚싯대", iconUrl: "https://mc-heads.net/item/fishing_rod/64", category: "WILD" },
  { id: 9004, name: "세이지 괭이", iconUrl: "https://mc-heads.net/item/diamond_hoe/64", category: "ISLAND" },
  { id: 9005, name: "세이지 곡괭이", iconUrl: "https://mc-heads.net/item/diamond_pickaxe/64", category: "ISLAND" },
  { id: 9006, name: "세이지 낚싯대", iconUrl: "https://mc-heads.net/item/fishing_rod/64", category: "ISLAND" },
  { id: 9007, name: "세이지 대검", iconUrl: "https://mc-heads.net/item/diamond_sword/64", category: "ISLAND" },
  { id: 9008, name: "루트바인 스태프 +12", iconUrl: "https://mc-heads.net/item/blaze_rod/64", category: "RPG" },
  { id: 9009, name: "야생 다이아몬드 투구", iconUrl: "https://mc-heads.net/item/diamond_helmet/64", category: "WILD" },
  { id: 9010, name: "★ [테스트] 풀옵션 곡괭이", iconUrl: "https://mc-heads.net/item/diamond_pickaxe/64", category: "WILD" },
];

/** 곡괭이 archetype 기준 일반+특수 인챈트 전부 (목록·masonry 밀도 확인용) */
const PICKAXE_MAX_ENCHANTMENTS: Record<string, number> = {
  효율: 10,
  행운: 5,
  섬세한손길: 1,
  내구성: 3,
  수선: 1,
  경험: 5,
  조급함: 3,
  서두름: 3,
  심호흡: 2,
  석탄: 3,
  구리: 3,
  금: 3,
  철: 3,
  청금석: 3,
  석영: 3,
  다이아몬드: 3,
  에메랄드: 3,
  고대잔해: 3,
  노련한손길: 3,
  견고함: 10,
};

const DUMMY_SELLERS = [
  { id: 101, ingameName: "MinerKim", reputationScore: 4.7, reviewCount: 18, successfulTrades: 34 },
  { id: 102, ingameName: "PvPHunter", reputationScore: 4.1, reviewCount: 22, successfulTrades: 41 },
  { id: 103, ingameName: "DeepMiner", reputationScore: 4.5, reviewCount: 15, successfulTrades: 28 },
  { id: 104, ingameName: "FisherJoe", reputationScore: 3.9, reviewCount: 7, successfulTrades: 11 },
  { id: 105, ingameName: "RaidMage", reputationScore: 4.2, reviewCount: 12, successfulTrades: 21 },
] as const;

const STEVE_SELLER = {
  id: 0,
  ingameName: "Steve",
  reputationScore: 4.2,
  reviewCount: 12,
  successfulTrades: 24,
};

type LocalDummyMarketSummary = {
  count: number;
  averagePrice: string;
  minPrice: string;
  maxPrice: string;
  latestPrice: string;
};

export type LocalDummyAuction = {
  id: number;
  sellerId: number;
  itemId: number;
  item: (typeof LOCAL_DUMMY_ITEMS)[number];
  seller: { id: number; ingameName: string; reputationScore: number; reviewCount?: number; successfulTrades?: number };
  startPrice: string;
  currentPrice: string;
  buyNowPrice: string | null;
  endTime: string;
  completedAt?: string;
  updatedAt?: string;
  status: string;
  marketReflected?: boolean;
  enhancementLevel: number;
  enhancementRank: string | null;
  quality: number | null;
  lampLines: string[] | null;
  enchantments: Record<string, number> | null;
  imprint: Record<string, number> | null;
  skills: Record<string, number> | null;
  runes: { grade?: string; type?: string }[] | null;
  description: string;
  lastBidder: string | null;
  lastBidderId: number | null;
  bidCount: number;
  marketSummary: LocalDummyMarketSummary;
  chatRoom?: { id: number; sellerConfirmed?: boolean; buyerConfirmed?: boolean };
};

/** 경매·마이페이지 페이지네이션 UI 확인용 대량 더미 */
const buildPaginationTestAuctions = (): LocalDummyAuction[] => {
  const endOffsetsMinutes = [18, 35, 55, 90, 150, 240, 480, 960, 1440, 2880];
  const marketplace: LocalDummyAuction[] = [];

  for (let i = 0; i < 25; i++) {
    const id = 9110 + i;
    const item = LOCAL_DUMMY_ITEMS[i % LOCAL_DUMMY_ITEMS.length];
    const seller = DUMMY_SELLERS[i % DUMMY_SELLERS.length];
    const endMinutes = endOffsetsMinutes[i % endOffsetsMinutes.length];
    const basePrice = 350_000 + i * 185_000;
    const currentPrice = basePrice + Math.round(basePrice * 0.18);
    const hasBuyNow = i % 3 !== 0;

    marketplace.push({
      id,
      sellerId: seller.id,
      itemId: item.id,
      item,
      seller: { ...seller },
      startPrice: String(basePrice),
      currentPrice: String(currentPrice),
      buyNowPrice: hasBuyNow ? String(Math.round(currentPrice * 1.22)) : null,
      endTime: new Date(now + 1000 * 60 * endMinutes).toISOString(),
      status: "ACTIVE",
      enhancementLevel: item.category === "WILD" ? 0 : 4 + (i % 9),
      enhancementRank: item.category === "RPG" && i % 4 === 0 ? "정예" : null,
      quality: item.category === "WILD" && i % 2 === 0 ? 64 + (i % 5) * 24 : null,
      lampLines:
        item.category === "WILD" && i % 3 === 0
          ? ["페이지네이션 테스트용 램프 옵션 (더미)"]
          : null,
      enchantments:
        item.category === "WILD"
          ? { 효율: 3 + (i % 4), 행운: 2 + (i % 3), 내구성: 2 }
          : null,
      imprint:
        item.category === "ISLAND"
          ? { 채광강화: 3 + (i % 3), 광물행운: 2 + (i % 2) }
          : null,
      skills:
        item.category === "RPG"
          ? { 리프시커: 3 + (i % 3), 우드서지: 2 + (i % 2) }
          : null,
      runes: item.category === "RPG" && i % 5 === 0 ? [{ grade: "노멀", type: "치명의룬" }] : null,
      description: `[페이지네이션 테스트 #${id}] ${item.name} — 경매 목록 ${Math.ceil((7 + 25) / 20)}페이지 이상 확인용.`,
      lastBidder: i % 4 === 0 ? "Steve" : i % 4 === 1 ? "Alex" : null,
      lastBidderId: i % 4 === 0 ? 0 : i % 4 === 1 ? 202 : null,
      bidCount: i % 7,
      marketSummary: {
        count: 3 + (i % 6),
        averagePrice: String(Math.round(currentPrice * 0.94)),
        minPrice: String(Math.round(currentPrice * 0.82)),
        maxPrice: String(Math.round(currentPrice * 1.12)),
        latestPrice: String(currentPrice),
      },
    });
  }

  const mySales: LocalDummyAuction[] = [];
  const myStatuses = ["ACTIVE", "ACTIVE", "ACTIVE", "ACTIVE", "ACTIVE", "ACTIVE", "ACTIVE", "EXPIRED", "EXPIRED", "PENDING_TRADE", "CANCEL_PENDING", "ACTIVE"] as const;

  for (let i = 0; i < 12; i++) {
    const id = 9301 + i;
    const item = LOCAL_DUMMY_ITEMS[i % LOCAL_DUMMY_ITEMS.length];
    const basePrice = 900_000 + i * 240_000;
    const currentPrice = basePrice + Math.round(basePrice * 0.12);
    const status = myStatuses[i];
    const endMinutes = status === "EXPIRED" ? -120 : 60 + i * 45;

    mySales.push({
      id,
      sellerId: 0,
      itemId: item.id,
      item,
      seller: { ...STEVE_SELLER },
      startPrice: String(basePrice),
      currentPrice: String(currentPrice),
      buyNowPrice: i % 2 === 0 ? String(Math.round(currentPrice * 1.15)) : null,
      endTime: new Date(now + 1000 * 60 * endMinutes).toISOString(),
      status,
      enhancementLevel: item.category === "ISLAND" ? 6 + (i % 6) : item.category === "RPG" ? 8 + (i % 5) : 0,
      enhancementRank: null,
      quality: null,
      lampLines: null,
      enchantments: item.category === "WILD" ? { 효율: 4, 행운: 3 } : null,
      imprint: item.category === "ISLAND" ? { 채집강화: 4 } : null,
      skills: item.category === "RPG" ? { 리프시커: 4 } : null,
      runes: null,
      description: `[마이페이지 판매 테스트 #${id}] Steve 판매 목록 페이지네이션(5건/페이지) 확인용.`,
      lastBidder: status === "PENDING_TRADE" ? "Alex" : null,
      lastBidderId: status === "PENDING_TRADE" ? 202 : null,
      bidCount: status === "ACTIVE" ? 1 + (i % 5) : 0,
      marketSummary: {
        count: 2 + (i % 4),
        averagePrice: String(Math.round(currentPrice * 0.96)),
        minPrice: String(Math.round(currentPrice * 0.88)),
        maxPrice: String(Math.round(currentPrice * 1.08)),
        latestPrice: String(currentPrice),
      },
      ...(status === "PENDING_TRADE"
        ? {
            chatRoom: {
              id: 9290 + i,
              sellerConfirmed: i % 2 === 0,
              buyerConfirmed: false,
            },
          }
        : {}),
    });
  }

  const completedSteveSales = [0, 1, 2, 3, 4, 5].map((i) => {
    const id = 9313 + i;
    const item = LOCAL_DUMMY_ITEMS[(i + 3) % LOCAL_DUMMY_ITEMS.length];
    const basePrice = 2_400_000 + i * 600_000;
    const currentPrice = basePrice + 300_000;
    const completedAt = new Date(now - 1000 * 60 * 60 * (6 + i * 18)).toISOString();
    return {
      id,
      sellerId: 0,
      itemId: item.id,
      item,
      seller: { ...STEVE_SELLER },
      startPrice: String(basePrice),
      currentPrice: String(currentPrice),
      buyNowPrice: null,
      endTime: new Date(now - 1000 * 60 * 60 * (24 + i)).toISOString(),
      completedAt,
      updatedAt: completedAt,
      status: "COMPLETED",
      marketReflected: true,
      enhancementLevel: item.category === "ISLAND" ? 8 : 0,
      enhancementRank: null,
      quality: null,
      lampLines: null,
      enchantments: null,
      imprint: item.category === "ISLAND" ? { 채광강화: 5 } : null,
      skills: null,
      runes: null,
      description: `[판매 완료 테스트 #${id}] marketReflected=true — 판매 목록에 표시됩니다.`,
      lastBidder: "Alex",
      lastBidderId: 202,
      bidCount: 4 + i,
      marketSummary: {
        count: 5,
        averagePrice: String(currentPrice),
        minPrice: String(Math.round(currentPrice * 0.9)),
        maxPrice: String(Math.round(currentPrice * 1.1)),
        latestPrice: String(currentPrice),
      },
    };
  });

  const steveBidEntries = Array.from({ length: 8 }, (_, i) => {
    const id = 9401 + i;
    const item = LOCAL_DUMMY_ITEMS[(i + 1) % LOCAL_DUMMY_ITEMS.length];
    const seller = DUMMY_SELLERS[i % DUMMY_SELLERS.length];
    const basePrice = 1_100_000 + i * 320_000;
    const currentPrice = basePrice + 150_000;
    const isCompleted = i >= 6;
    return {
      id,
      sellerId: seller.id,
      itemId: item.id,
      item,
      seller: { ...seller },
      startPrice: String(basePrice),
      currentPrice: String(currentPrice),
      buyNowPrice: i % 2 === 0 ? String(Math.round(currentPrice * 1.2)) : null,
      endTime: new Date(now + (isCompleted ? -1000 * 60 * 60 * 12 : 1000 * 60 * (90 + i * 30))).toISOString(),
      status: isCompleted ? "COMPLETED" : "ACTIVE",
      marketReflected: isCompleted,
      enhancementLevel: 0,
      enhancementRank: null,
      quality: null,
      lampLines: null,
      enchantments: item.category === "WILD" ? { 효율: 3, 행운: 2 } : null,
      imprint: null,
      skills: null,
      runes: null,
      description: `[입찰 목록 테스트 #${id}] Steve(lastBidderId=0) 입찰 페이지네이션 확인용.`,
      lastBidder: "Steve",
      lastBidderId: 0,
      bidCount: 2 + (i % 4),
      marketSummary: {
        count: 4,
        averagePrice: String(Math.round(currentPrice * 0.95)),
        minPrice: String(Math.round(currentPrice * 0.85)),
        maxPrice: String(Math.round(currentPrice * 1.05)),
        latestPrice: String(currentPrice),
      },
    };
  });

  return [...marketplace, ...mySales, ...completedSteveSales, ...steveBidEntries];
};

const LOCAL_DUMMY_AUCTIONS_CORE = [
  {
    id: 9099,
    sellerId: 101,
    itemId: 9010,
    item: LOCAL_DUMMY_ITEMS[9],
    seller: { id: 101, ingameName: "MinerKim", reputationScore: 4.9, reviewCount: 48, successfulTrades: 92 },
    startPrice: "12000000",
    currentPrice: "28500000",
    buyNowPrice: "32000000",
    endTime: new Date(now + 1000 * 60 * 6).toISOString(),
    status: "ACTIVE",
    enhancementLevel: 0,
    enhancementRank: null,
    quality: 255,
    lampLines: [
      "광석 채광 시 5~30% 확률로 성급함 I~II 효과를 1~10초간 부여합니다.",
      "다이아몬드 채광 시 0.5~5% 확률로 다이아몬드 1~2개를 추가 드롭합니다.",
    ],
    enchantments: { ...PICKAXE_MAX_ENCHANTMENTS },
    imprint: null,
    skills: null,
    runes: null,
    description: "[밀도 테스트] 곡괭이 인챈트 20종·품질·램프 2줄 — 목록 masonry·옵션 칩 최대 노출 확인용.",
    lastBidder: "Alex",
    lastBidderId: 202,
    bidCount: 12,
    marketSummary: { count: 14, averagePrice: "26000000", minPrice: "22000000", maxPrice: "31000000", latestPrice: "28500000" },
  },
  {
    id: 9101,
    sellerId: 101,
    itemId: 9001,
    item: LOCAL_DUMMY_ITEMS[0],
    seller: { id: 101, ingameName: "MinerKim", reputationScore: 4.7, reviewCount: 18, successfulTrades: 34 },
    startPrice: "5000000",
    currentPrice: "8200000",
    buyNowPrice: "9500000",
    endTime: new Date(now + 1000 * 60 * 42).toISOString(),
    status: "ACTIVE",
    enhancementLevel: 0,
    enhancementRank: null,
    quality: 128,
    lampLines: [
      "광석 채광 시 5~30% 확률로 성급함 I~II 효과를 1~10초간 부여합니다.",
      "다이아몬드 채광 시 0.5~5% 확률로 다이아몬드 1~2개를 추가 드롭합니다.",
    ],
    enchantments: { ...PICKAXE_MAX_ENCHANTMENTS },
    imprint: null,
    skills: null,
    runes: null,
    description: "[밀도 테스트] 9101 — 9099와 동일 풀옵션(인챈트 20종) + 색상(파랑/빨강/주황) 확인.",
    lastBidder: "Steve",
    lastBidderId: 0,
    bidCount: 3,
    marketSummary: { count: 9, averagePrice: "7800000", minPrice: "6500000", maxPrice: "9200000", latestPrice: "8200000" },
  },
  {
    id: 9102,
    sellerId: 102,
    itemId: 9002,
    item: LOCAL_DUMMY_ITEMS[1],
    seller: { id: 102, ingameName: "PvPHunter", reputationScore: 4.1, reviewCount: 22, successfulTrades: 41 },
    startPrice: "1200000",
    currentPrice: "2100000",
    buyNowPrice: "2800000",
    endTime: new Date(now + 1000 * 60 * 60 * 5).toISOString(),
    status: "ACTIVE",
    enhancementLevel: 0,
    enhancementRank: null,
    quality: null,
    lampLines: null,
    enchantments: { 날카로움: 7, 약탈: 4, 반격: 3, 흡혈: 4, 학구열: 4 },
    imprint: null,
    skills: null,
    runes: null,
    description: "[색상 테스트] 날카로움 Lv.7·약탈 Lv.4(상급·주황), 반격(파랑), 흡혈·학구열(빨강) 검 전용 경매입니다.",
    lastBidder: "Alex",
    lastBidderId: 202,
    bidCount: 5,
    marketSummary: { count: 11, averagePrice: "1950000", minPrice: "1500000", maxPrice: "2400000", latestPrice: "2100000" },
  },
  {
    id: 9103,
    sellerId: 102,
    itemId: 9004,
    item: LOCAL_DUMMY_ITEMS[3],
    seller: { id: 102, ingameName: "IslandPro", reputationScore: 3.8, reviewCount: 9, successfulTrades: 14 },
    startPrice: "3200000",
    currentPrice: "4100000",
    buyNowPrice: "5600000",
    endTime: new Date(now + 1000 * 60 * 60 * 9).toISOString(),
    status: "ACTIVE",
    enhancementLevel: 10,
    enhancementRank: null,
    quality: null,
    lampLines: null,
    enchantments: null,
    imprint: { 채집강화: 5, 원두행운: 4, 과일행운: 3, 농부룰렛: 2 },
    skills: null,
    runes: null,
    description: "[필터 테스트] 세이지 괭이 각인(원두행운 포함). 곡괭이 각인은 등록 UI에 보이지 않아야 합니다.",
    lastBidder: "Steve",
    lastBidderId: 0,
    bidCount: 4,
    marketSummary: { count: 8, averagePrice: "3900000", minPrice: "3100000", maxPrice: "5200000", latestPrice: "4200000" },
  },
  {
    id: 9104,
    sellerId: 103,
    itemId: 9005,
    item: LOCAL_DUMMY_ITEMS[4],
    seller: { id: 103, ingameName: "DeepMiner", reputationScore: 4.5, reviewCount: 15, successfulTrades: 28 },
    startPrice: "8000000",
    currentPrice: "11500000",
    buyNowPrice: null,
    endTime: new Date(now + 1000 * 60 * 60 * 18).toISOString(),
    status: "ACTIVE",
    enhancementLevel: 12,
    enhancementRank: null,
    enchantments: null,
    imprint: { 채광강화: 5, 광물행운: 4, 유물탐색: 3, 광부룰렛: 2 },
    skills: null,
    runes: null,
    description: "[필터 테스트] 세이지 곡괭이 — 채광 계열 각인만.",
    lastBidder: "없음",
    lastBidderId: null,
    bidCount: 0,
    marketSummary: { count: 6, averagePrice: "10800000", minPrice: "9200000", maxPrice: "13000000", latestPrice: "11500000" },
  },
  {
    id: 9105,
    sellerId: 103,
    itemId: 9008,
    item: LOCAL_DUMMY_ITEMS[7],
    seller: { id: 103, ingameName: "RaidMage", reputationScore: 4.2, reviewCount: 12, successfulTrades: 21 },
    startPrice: "9000000",
    currentPrice: "14500000",
    buyNowPrice: null,
    endTime: new Date(now + 1000 * 60 * 60 * 31).toISOString(),
    status: "ACTIVE",
    enhancementLevel: 12,
    enhancementRank: "정예",
    enchantments: null,
    imprint: null,
    skills: { 리프시커: 5, 우드서지: 4, 버던트메테오: 3 },
    runes: [{ grade: "레어", type: "증폭의룬" }, { grade: "노멀", type: "치명의룬" }, { grade: "루키", type: "" }],
    description: "[필터 테스트] RPG 스태프 — 무기별 스킬 5개만 노출.",
    lastBidder: "없음",
    lastBidderId: null,
    bidCount: 0,
    marketSummary: { count: 5, averagePrice: "13200000", minPrice: "11800000", maxPrice: "16000000", latestPrice: "14800000" },
  },
  {
    id: 9106,
    sellerId: 101,
    itemId: 9003,
    item: LOCAL_DUMMY_ITEMS[2],
    seller: { id: 101, ingameName: "FisherJoe", reputationScore: 3.9, reviewCount: 7, successfulTrades: 11 },
    startPrice: "600000",
    currentPrice: "950000",
    buyNowPrice: "1200000",
    endTime: new Date(now + 1000 * 60 * 120).toISOString(),
    status: "ACTIVE",
    enhancementLevel: 0,
    enhancementRank: null,
    quality: 85,
    lampLines: ["물고기 낚시 시 2.5% 확률로 고요한 결정 1개 드롭 (예시)"],
    enchantments: { 바다의행운: 3, 미끼: 3, 자동감기: 4, 바다의경험: 3 },
    imprint: null,
    skills: null,
    runes: null,
    description: "[필터 테스트] 낚싯대 — 낚시 인챈트만.",
    lastBidder: null,
    lastBidderId: null,
    bidCount: 1,
    marketSummary: { count: 4, averagePrice: "880000", minPrice: "700000", maxPrice: "1100000", latestPrice: "950000" },
  },
];

export const LOCAL_DUMMY_AUCTIONS: LocalDummyAuction[] = [
  ...(LOCAL_DUMMY_AUCTIONS_CORE as LocalDummyAuction[]),
  ...buildPaginationTestAuctions(),
];

export const LOCAL_DUMMY_NOTIFICATIONS = [
  { id: 1, type: "OUTBID", message: "[세이지 괭이] 입찰 주도권을 상실했습니다.", link: "/auction/9103", isRead: false, createdAt: new Date(now - 1000 * 60 * 4).toISOString() },
  { id: 2, type: "TRADE", message: "상대방이 거래를 확정했습니다. 채팅에서 거래 내용을 확인해주세요.", link: "/mypage", isRead: false, createdAt: new Date(now - 1000 * 60 * 23).toISOString() },
  { id: 3, type: "SYSTEM", message: "로컬 개발 더미 알림입니다. 서버 연결 없이 UI를 확인할 수 있습니다.", link: "/admin", isRead: true, createdAt: new Date(now - 1000 * 60 * 80).toISOString() },
];

export const LOCAL_DUMMY_POSTS = [
  {
    id: 6101,
    title: "로컬 개발용 커뮤니티 공지",
    content: "서버 연결 없이 커뮤니티 목록과 상세 화면을 확인하기 위한 더미 공지입니다.",
    type: "NOTICE",
    category: "NOTICE",
    authorId: 0,
    author: { id: 0, ingameName: "Steve" },
    createdAt: new Date(now - 1000 * 60 * 90).toISOString(),
  },
  {
    id: 6102,
    title: "거래 전 시세 확인 팁",
    content: "입찰 전 계산기 탭에서 강화 단계와 옵션 구성을 비교하면 적정가 판단에 도움이 됩니다.",
    type: "GENERAL",
    category: "TRADE",
    authorId: 101,
    author: { id: 101, ingameName: "Alex" },
    createdAt: new Date(now - 1000 * 60 * 180).toISOString(),
  },
];

export const LOCAL_DUMMY_CHAT_ROOMS = [
  {
    id: 9201,
    auctionId: 9102,
    sellerId: 102,
    buyerId: 0,
    status: "ACTIVE",
    isAdminChat: false,
    sellerConfirmed: true,
    buyerConfirmed: false,
    seller: { id: 102, ingameName: "IslandPro", reputationScore: 3.8 },
    buyer: { id: 0, ingameName: "Steve", reputationScore: 0 },
    messages: [{ id: 1, content: "거래 가능 시간 알려주세요.", createdAt: new Date(now - 1000 * 60 * 12).toISOString(), isRead: false, senderId: 102 }],
    _count: { messages: 1 },
  },
  {
    id: 9202,
    auctionId: null,
    sellerId: 999,
    buyerId: 0,
    status: "ACTIVE",
    isAdminChat: true,
    seller: { id: 999, ingameName: "Admin" },
    buyer: { id: 0, ingameName: "Steve" },
    messages: [{ id: 4, content: "로컬 더미 상담방입니다.", createdAt: new Date(now - 1000 * 60 * 30).toISOString(), isRead: true, senderId: 999 }],
    _count: { messages: 0 },
  },
];

type LocalDummyChatMessage = {
  id: number;
  roomId: number;
  senderId: number;
  content: string;
  createdAt: string;
  sender: { id: number; ingameName: string };
  isRead?: boolean;
};

type LocalDummyAuctionComment = {
  id: number;
  content: string;
  createdAt: string;
  author: { id: number; ingameName: string; reputationScore: number };
};

export const LOCAL_DUMMY_MESSAGES: Record<number, LocalDummyChatMessage[]> = {
  9201: [
    { id: 1, roomId: 9201, senderId: 102, content: "낙찰 감사합니다. 오늘 저녁 거래 가능하세요?", createdAt: new Date(now - 1000 * 60 * 14).toISOString(), sender: { id: 102, ingameName: "IslandPro" } },
    { id: 2, roomId: 9201, senderId: 0, content: "가능합니다. 거래 확인 후 확정 누르겠습니다.", createdAt: new Date(now - 1000 * 60 * 9).toISOString(), sender: { id: 0, ingameName: "Steve" } },
    { id: 3, roomId: 9201, senderId: 102, content: "저는 먼저 확정해두었습니다.", createdAt: new Date(now - 1000 * 60 * 4).toISOString(), sender: { id: 102, ingameName: "IslandPro" } },
  ],
  9202: [
    { id: 4, roomId: 9202, senderId: 999, content: "로컬 개발용 관리자 상담 메시지입니다.", createdAt: new Date(now - 1000 * 60 * 32).toISOString(), sender: { id: 999, ingameName: "Admin" } },
    { id: 5, roomId: 9202, senderId: 0, content: "알림과 채팅 UI 확인 중입니다.", createdAt: new Date(now - 1000 * 60 * 28).toISOString(), sender: { id: 0, ingameName: "Steve" } },
  ],
};

const LOCAL_DUMMY_AUCTION_COMMENTS: Record<number, LocalDummyAuctionComment[]> = {
  9099: [
    { id: 5099, content: "인챈트 20개 전부 붙은 테스트 카드 맞나요? 목록에서 높이 확인용입니다.", createdAt: new Date(now - 1000 * 60 * 12).toISOString(), author: { id: 0, ingameName: "Steve", reputationScore: 0 } },
    { id: 5100, content: "네, 곡괭이 등록 가능한 옵션은 전부 넣었습니다.", createdAt: new Date(now - 1000 * 60 * 8).toISOString(), author: { id: 101, ingameName: "MinerKim", reputationScore: 4.9 } },
  ],
  9101: [
    { id: 5101, content: "품질 128 기준으로 특수 인챈트 몇 개까지 붙였나요?", createdAt: new Date(now - 1000 * 60 * 36).toISOString(), author: { id: 0, ingameName: "Steve", reputationScore: 0 } },
    { id: 5102, content: "석탄·철·노련한손길 세팅입니다. 램프 2줄도 그대로 유지돼요.", createdAt: new Date(now - 1000 * 60 * 28).toISOString(), author: { id: 101, ingameName: "MinerKim", reputationScore: 4.7 } },
  ],
  9103: [
    { id: 5201, content: "원두행운 각인 포함 맞죠?", createdAt: new Date(now - 1000 * 60 * 54).toISOString(), author: { id: 202, ingameName: "Alex", reputationScore: 4.1 } },
  ],
  9105: [
    { id: 5301, content: "룬 교체 없이 그대로 판매인가요?", createdAt: new Date(now - 1000 * 60 * 18).toISOString(), author: { id: 0, ingameName: "Steve", reputationScore: 0 } },
    { id: 5302, content: "네, 표시된 룬 포함입니다.", createdAt: new Date(now - 1000 * 60 * 12).toISOString(), author: { id: 103, ingameName: "RaidMage", reputationScore: 4.2 } },
  ],
};

const LOCAL_DUMMY_USERS = [
  { ...LOCAL_DUMMY_USER, discordLinked: true },
  { id: 101, loginId: "Alex", ingameName: "Alex", role: "USER", isBanned: false, reputationScore: 4.7, successfulTrades: 34, discordLinked: true },
  { id: 102, loginId: "IslandPro", ingameName: "IslandPro", role: "USER", isBanned: false, reputationScore: 3.8, successfulTrades: 14, discordLinked: false },
  { id: 404, loginId: "BadTrader", ingameName: "BadTrader", role: "USER", isBanned: true, reputationScore: 1.3, successfulTrades: 2, discordLinked: true },
];

const marketHistory = LOCAL_DUMMY_AUCTIONS.map((auction, index) => ({
  id: 4000 + index,
  itemId: auction.itemId,
  item: auction.item,
  price: auction.marketSummary?.latestPrice || auction.currentPrice,
  tradeDate: new Date(now - 1000 * 60 * 60 * 24 * (index + 1)).toISOString(),
  enhancementLevel: auction.enhancementLevel,
  enhancementRank: auction.enhancementRank,
  isValid: true,
}));

const marketAnalysisFor = (itemId: number) => {
  const auction = LOCAL_DUMMY_AUCTIONS.find((entry) => entry.itemId === itemId) || LOCAL_DUMMY_AUCTIONS[0];
  const average = Number(auction.marketSummary?.averagePrice || auction.currentPrice);
  return {
    fairPrice: Math.round(average * 1.04),
    avgPrice: average,
    sampleCount: auction.marketSummary?.count || 6,
    history: Array.from({ length: 8 }).map((_, index) => ({
      tradeDate: new Date(now - 1000 * 60 * 60 * 24 * (8 - index)).toISOString(),
      price: Math.round(average * (0.86 + index * 0.035)),
    })),
  };
};

export const getLocalDummyResponse = (url: string, method = "GET") => {
  const path = url.split("?")[0];
  const query = url.includes("?") ? new URLSearchParams(url.split("?")[1]) : null;

  if (method !== "GET") {
    if (path === "/api/auth/password-reset/discord/authorize") return { url: "/reset-password?token=local-dev-reset-token" };
    if (path === "/api/auth/password-reset/confirm") return { message: "로컬 더미 비밀번호 재설정 완료" };
    if (path === "/api/chat/rooms/admin") return LOCAL_DUMMY_CHAT_ROOMS[1];
    if (path.includes("/close")) return { completed: false, message: "로컬 더미 거래 확정이 기록되었습니다.", room: LOCAL_DUMMY_CHAT_ROOMS[0] };
    if (path.startsWith("/api/auctions/") && path.endsWith("/buy")) return { message: "로컬 더미 즉시 구매 완료", roomId: 9201 };
    if (path.includes("/read") || path.includes("/clear") || method === "DELETE" || method === "PATCH" || method === "POST") return { ok: true, id: 9999 };
  }

  if (path === "/api/auth/me") return LOCAL_DUMMY_USER;
  if (path === "/api/auctions/items" || path === "/api/admin/items") return LOCAL_DUMMY_ITEMS;
  if (path.startsWith("/api/auctions/market-analysis/")) {
    const itemId = Number(path.split("/").pop());
    return marketAnalysisFor(itemId);
  }
  if (path === "/api/auctions") return LOCAL_DUMMY_AUCTIONS;
  if (path === "/api/auctions/my-auctions") return LOCAL_DUMMY_AUCTIONS.filter((auction) => auction.sellerId === 0);
  if (path === "/api/auctions/my-bids") return LOCAL_DUMMY_AUCTIONS.filter((auction) => auction.lastBidderId === 0).map((auction) => ({ ...auction, myBidAmount: auction.currentPrice, isHighestBidder: true, chatRoom: LOCAL_DUMMY_CHAT_ROOMS[0] }));
  if (path.endsWith("/comments")) {
    const parts = path.split("/");
    const auctionId = Number(parts[parts.length - 2]);
    return LOCAL_DUMMY_AUCTION_COMMENTS[auctionId] || [];
  }
  if (path.startsWith("/api/auctions/")) {
    const auctionId = Number(path.split("/").pop());
    return LOCAL_DUMMY_AUCTIONS.find((auction) => auction.id === auctionId) || LOCAL_DUMMY_AUCTIONS[0];
  }
  if (path === "/api/notifications") return LOCAL_DUMMY_NOTIFICATIONS;
  if (path === "/api/posts") {
    const postType = query?.get("type");
    return postType ? LOCAL_DUMMY_POSTS.filter((post) => post.type === postType) : LOCAL_DUMMY_POSTS;
  }
  if (path === "/api/posts/category-guides") {
    return {
      guides: {
        WILD: "WILD 카테고리 아이템 관련 글을 올려 주세요.",
        ISLAND: "ISLAND(섬) 카테고리 아이템 관련 글을 올려 주세요.",
        RPG: "RPG 카테고리 아이템 관련 글을 올려 주세요.",
        MARKET_TALK: "시세·가격 토론 글을 올려 주세요.",
      },
    };
  }
  if (path === "/api/chat/rooms") return LOCAL_DUMMY_CHAT_ROOMS;
  if (path === "/api/chat/rooms/admin") return LOCAL_DUMMY_CHAT_ROOMS[1];
  if (path.endsWith("/messages")) {
    const parts = path.split("/");
    const roomId = Number(parts[parts.length - 2]);
    return LOCAL_DUMMY_MESSAGES[roomId] || [];
  }
  if (path === "/api/admin/users") return LOCAL_DUMMY_USERS;
  if (path === "/api/admin/support/rooms") return LOCAL_DUMMY_CHAT_ROOMS.filter((room) => room.isAdminChat);
  if (path === "/api/admin/market/history") return marketHistory;
  if (path === "/api/admin/market/variables") return [
    { key: "MAT_RPG_BASE_스태프", value: 7200000, category: "RPG", label: "스태프 종류 순정 시세" },
    { key: "MAT_ISLAND_CONTRACT", value: 18000, category: "ISLAND", label: "각인 계약서 단가" },
    { key: "MAT_BOOK_날카로움", value: 45000, category: "WILD", label: "날카로움 (일반 10%)" },
  ];

  return null;
};
