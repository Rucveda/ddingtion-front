export const POST_FILTER_OPTIONS = [
  { id: "ALL", label: "전체" },
  { id: "WILD", label: "WILD" },
  { id: "ISLAND", label: "ISLAND" },
  { id: "RPG", label: "RPG" },
  { id: "MARKET_TALK", label: "시세토론" },
] as const;

export const WRITABLE_POST_CATEGORIES = POST_FILTER_OPTIONS.filter((c) => c.id !== "ALL");

export const LEGACY_POST_CATEGORY_LABELS: Record<string, string> = {
  GENERAL: "일반",
  TRADE: "거래",
  QUESTION: "질문",
};

export const DEFAULT_CATEGORY_GUIDES: Record<string, string> = {
  WILD:
    "WILD 카테고리 아이템 관련 글을 올려 주세요.\n예: 옵션·인챈트 질문, 세팅 공유, 아이템 정보 정리",
  ISLAND:
    "ISLAND(섬) 카테고리 아이템 관련 글을 올려 주세요.\n예: 각인·채집·농사 세팅, 아이템 비교, 이용 팁",
  RPG:
    "RPG 카테고리 아이템 관련 글을 올려 주세요.\n예: 스킬·룬 조합, 장비 세팅, 직업별 정보",
  MARKET_TALK:
    "시세·가격에 대한 의견·분석·토론 글을 올려 주세요.\n예: 최근 체결가 해석, 적정가 의견, 시장 동향 (개인 거래 희망 글은 경매 등록 이용)",
};

export const getPostCategoryLabel = (category?: string) => {
  const id = (category || "WILD").toUpperCase();
  const found = POST_FILTER_OPTIONS.find((option) => option.id === id);
  if (found) return found.label;
  return LEGACY_POST_CATEGORY_LABELS[id] || id;
};

export type PostCategoryId = (typeof POST_FILTER_OPTIONS)[number]["id"];
