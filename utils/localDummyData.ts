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

export const LOCAL_DUMMY_ITEMS = [
  { id: 9001, name: "야생 다이아몬드 검", iconUrl: "https://mc-heads.net/item/diamond_sword/64", category: "WILD" },
  { id: 9002, name: "섬 생명의 낫", iconUrl: "https://mc-heads.net/item/diamond_hoe/64", category: "ISLAND" },
  { id: 9003, name: "RPG 정예 스태프", iconUrl: "https://mc-heads.net/item/blaze_rod/64", category: "RPG" },
  { id: 9004, name: "희귀 장식 블록", iconUrl: "https://mc-heads.net/item/amethyst_block/64", category: "ETC" },
];

export const LOCAL_DUMMY_AUCTIONS = [
  {
    id: 9101,
    sellerId: 101,
    itemId: 9001,
    item: LOCAL_DUMMY_ITEMS[0],
    seller: { id: 101, ingameName: "Alex", reputationScore: 4.7, reviewCount: 18, successfulTrades: 34 },
    startPrice: "450000",
    currentPrice: "780000",
    buyNowPrice: "1200000",
    endTime: new Date(now + 1000 * 60 * 42).toISOString(),
    status: "ACTIVE",
    enhancementLevel: 0,
    enhancementRank: null,
    enchantments: { 날카로움: 5, 약탈: 3, 내구성: 3, 화염: 2 },
    imprint: null,
    skills: null,
    runes: null,
    description: "PVP와 사냥 겸용으로 쓰기 좋은 야생 검입니다. 인챈트 구성이 깔끔해서 바로 사용 가능합니다.",
    lastBidder: "MinerKim",
    lastBidderId: 202,
    bidCount: 7,
    marketSummary: { count: 12, averagePrice: "720000", minPrice: "610000", maxPrice: "950000", latestPrice: "760000" },
  },
  {
    id: 9102,
    sellerId: 102,
    itemId: 9002,
    item: LOCAL_DUMMY_ITEMS[1],
    seller: { id: 102, ingameName: "IslandPro", reputationScore: 3.8, reviewCount: 9, successfulTrades: 14 },
    startPrice: "3200000",
    currentPrice: "4100000",
    buyNowPrice: "5600000",
    endTime: new Date(now + 1000 * 60 * 60 * 9).toISOString(),
    status: "ACTIVE",
    enhancementLevel: 8,
    enhancementRank: null,
    enchantments: null,
    imprint: { 풍요: 4, 성장: 3, 수확: 5 },
    skills: null,
    runes: null,
    description: "섬 자원 수급용으로 세팅된 장비입니다. 각인 레벨이 높아 생산 루틴에 바로 투입할 수 있습니다.",
    lastBidder: "Steve",
    lastBidderId: 0,
    bidCount: 4,
    marketSummary: { count: 8, averagePrice: "3900000", minPrice: "3100000", maxPrice: "5200000", latestPrice: "4200000" },
  },
  {
    id: 9103,
    sellerId: 103,
    itemId: 9003,
    item: LOCAL_DUMMY_ITEMS[2],
    seller: { id: 103, ingameName: "RaidMage", reputationScore: 4.2, reviewCount: 12, successfulTrades: 21 },
    startPrice: "9000000",
    currentPrice: "14500000",
    buyNowPrice: null,
    endTime: new Date(now + 1000 * 60 * 60 * 31).toISOString(),
    status: "ACTIVE",
    enhancementLevel: 11,
    enhancementRank: "정예",
    enchantments: null,
    imprint: null,
    skills: { 화염구: 5, 마력폭발: 4, 보호막: 3 },
    runes: [{ grade: "영웅", type: "마력의룬" }, { grade: "정예", type: "치명의룬" }, { grade: "루키", type: "" }],
    description: "레이드 테스트용 스태프입니다. 스킬과 룬 구성이 모두 들어간 구매 상세 화면 확인용 더미입니다.",
    lastBidder: "없음",
    lastBidderId: null,
    bidCount: 0,
    marketSummary: { count: 5, averagePrice: "13200000", minPrice: "11800000", maxPrice: "16000000", latestPrice: "14800000" },
  },
];

export const LOCAL_DUMMY_NOTIFICATIONS = [
  { id: 1, type: "OUTBID", message: "[섬 생명의 낫] 입찰 주도권을 상실했습니다.", link: "/auction/9102", isRead: false, createdAt: new Date(now - 1000 * 60 * 4).toISOString() },
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

export const LOCAL_DUMMY_MESSAGES: Record<number, any[]> = {
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

const LOCAL_DUMMY_AUCTION_COMMENTS: Record<number, any[]> = {
  9101: [
    { id: 5101, content: "혹시 오늘 밤에도 거래 가능하신가요?", createdAt: new Date(now - 1000 * 60 * 36).toISOString(), author: { id: 0, ingameName: "Steve", reputationScore: 0 } },
    { id: 5102, content: "가능합니다. 즉시구매하시면 채팅으로 시간 맞추겠습니다.", createdAt: new Date(now - 1000 * 60 * 28).toISOString(), author: { id: 101, ingameName: "Alex", reputationScore: 4.7 } },
  ],
  9102: [
    { id: 5201, content: "각인 구성 좋아 보이네요. 수확 세팅용 맞나요?", createdAt: new Date(now - 1000 * 60 * 54).toISOString(), author: { id: 202, ingameName: "MinerKim", reputationScore: 3.4 } },
  ],
  9103: [
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

const LOCAL_DUMMY_REPORTS = [
  { id: 3001, reason: "거래 확정 후 응답이 없습니다.", isResolved: false, createdAt: new Date(now - 1000 * 60 * 60).toISOString(), reporter: { ingameName: "Steve" }, target: { ingameName: "BadTrader" }, room: { id: 9201 } },
  { id: 3002, reason: "시세 조작 의심 입찰 패턴입니다.", isResolved: true, createdAt: new Date(now - 1000 * 60 * 180).toISOString(), reporter: { ingameName: "Alex" }, target: { ingameName: "MinerKim" }, room: { id: 9203 } },
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
    if (path.includes("/report")) return { message: "로컬 더미 신고가 접수되었습니다.", reportId: 3999 };
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
  if (path === "/api/admin/reports") return LOCAL_DUMMY_REPORTS;
  if (path === "/api/admin/market/history") return marketHistory;
  if (path === "/api/admin/market/variables") return [
    { key: "MAT_RPG_BASE_스태프", value: 7200000, category: "RPG", label: "스태프 종류 순정 시세" },
    { key: "MAT_ISLAND_CONTRACT", value: 18000, category: "ISLAND", label: "각인 계약서 단가" },
    { key: "MAT_BOOK_날카로움", value: 45000, category: "WILD", label: "날카로움 (일반 10%)" },
  ];

  return null;
};
