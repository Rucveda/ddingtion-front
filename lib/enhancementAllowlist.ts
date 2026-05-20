import { WILD_BASE, WILD_SPECIAL } from "@/app/market/marketData";

export type EnchantTuple = [string, number];
export type WildArchetype =
  | "wild_shovel"
  | "wild_pickaxe"
  | "wild_hoe"
  | "wild_axe"
  | "wild_sword"
  | "wild_fishing_rod"
  | "wild_bow"
  | "wild_crossbow"
  | "wild_trident"
  | "wild_mace"
  | "wild_helmet"
  | "wild_chestplate"
  | "wild_leggings"
  | "wild_boots"
  | "wild_elytra"
  | "wild_common";

export type IslandArchetype =
  | "island_sage_hoe"
  | "island_sage_pickaxe"
  | "island_sage_rod"
  | "island_sage_greatsword"
  | "island_unknown";

export type EquipmentArchetype = WildArchetype | IslandArchetype | "rpg" | "other";

/** 상급 인챈트 상한 — 위키 미반영, 기존 서비스 유지 */
export const WILD_HIGH_ENCHANT_LIMITS: Record<string, number> = {
  효율: 10,
  날카로움: 7,
  보호: 6,
  미끼: 5,
  약탈: 5,
  행운: 5,
};

const ENCHANT_MAX: Record<string, number> = Object.fromEntries(
  [...WILD_BASE, ...WILD_SPECIAL].map(([name, max]) => [name as string, max as number])
);

const WILD_UNIVERSAL_BASE = ["내구성", "수선"] as const;
const WILD_UNIVERSAL_SPECIAL = ["견고함"] as const;

const MINING_TOOL_BASE = ["효율", "행운", "섬세한손길"];
const MINING_TOOL_SPECIAL = ["경험", "조급함", "서두름"];

const PICKAXE_SPECIAL = [
  "심호흡", "석탄", "구리", "금", "철", "청금석", "석영", "다이아몬드", "에메랄드", "고대잔해", "노련한손길",
];

const AXE_SPECIAL = ["참격", "위력", "벌목", "출혈", "냉혈함"];
const SWORD_AXE_SPECIAL = ["골절", "백신", "천적", "속격", "마무리", "활력", "서막", "천벌"];
const SWORD_SPECIAL = [
  "반격", "광휘", "속박", "흡혈", "잠행", "혈전", "흡혈귀", "이중타격", "일격", "여명", "심판", "밤기사",
  "학구열", "좀비", "스켈레톤", "거미", "크리퍼",
];

const ARMOR_BASE_SHARED = ["폭발보호", "화염보호", "발사체보호", "가시", "보호"];
const ARMOR_SPECIAL_SHARED = [
  "견갑", "복원", "반사", "수호", "흡수", "내폭성", "회피", "엔더보호", "네더보호", "내화성", "과충전",
];

export const ISLAND_IMPRINTS_BY_TOOL: Record<Exclude<IslandArchetype, "island_unknown">, string[]> = {
  island_sage_hoe: [
    "채집강화", "채집가속", "씨앗행운", "과일행운", "과일가속", "원두행운", "빠른농부", "작물상자",
    "과일바구니", "유성낙하", "농부룰렛",
  ],
  island_sage_pickaxe: [
    "채광강화", "채광가속", "광물행운", "유물탐색", "코비탐색", "빠른광부", "보석코비", "광산수레", "광부룰렛",
  ],
  island_sage_rod: [
    "물고기행운", "어획강화", "조개탐색", "어패행운", "수중호흡", "빠른어부", "정령고래", "가오리인도", "어부룰렛",
  ],
  island_sage_greatsword: [
    "공격강화", "공격가속", "전리품행운", "조각탐색", "빠른사냥꾼", "흔적추적", "조각공명", "흡인사냥", "사냥꾼룰렛",
  ],
};

const WILD_ENCHANT_BY_ARCHETYPE: Record<WildArchetype, { base: string[]; special: string[] }> = {
  wild_shovel: { base: [...MINING_TOOL_BASE], special: [...MINING_TOOL_SPECIAL] },
  wild_pickaxe: {
    base: [...MINING_TOOL_BASE],
    special: [...MINING_TOOL_SPECIAL, ...PICKAXE_SPECIAL],
  },
  wild_hoe: { base: [...MINING_TOOL_BASE], special: [...MINING_TOOL_SPECIAL] },
  wild_axe: {
    base: [...MINING_TOOL_BASE],
    special: [...MINING_TOOL_SPECIAL, ...AXE_SPECIAL, ...SWORD_AXE_SPECIAL],
  },
  wild_sword: {
    base: ["밀치기", "휩쓸기", "약탈", "날카로움", "발화"],
    special: [...SWORD_SPECIAL, ...SWORD_AXE_SPECIAL],
  },
  wild_fishing_rod: {
    base: ["바다의행운", "미끼"],
    special: ["자동감기", "뾰족함", "바다의경험"],
  },
  wild_bow: { base: ["화염", "밀어내기", "힘", "무한"], special: [] },
  wild_crossbow: { base: ["다중발사", "관통", "빠른장전"], special: [] },
  wild_trident: { base: ["집전", "찌르기", "충성", "급류"], special: [] },
  wild_mace: { base: ["발화", "살충", "강타", "육중", "격파", "돌풍"], special: [] },
  wild_helmet: {
    base: [...ARMOR_BASE_SHARED, "친수성", "호흡"],
    special: [...ARMOR_SPECIAL_SHARED, "아가미", "투시"],
  },
  wild_chestplate: {
    base: [...ARMOR_BASE_SHARED],
    special: [...ARMOR_SPECIAL_SHARED, "불멸", "격퇴", "강인함"],
  },
  wild_leggings: {
    base: [...ARMOR_BASE_SHARED, "신속한잠행"],
    special: [...ARMOR_SPECIAL_SHARED, "소화"],
  },
  wild_boots: {
    base: [...ARMOR_BASE_SHARED, "물갈퀴", "가벼운착지", "영혼가속", "차가운걸음"],
    special: [
      ...ARMOR_SPECIAL_SHARED,
      "추격", "심연", "탈출", "가벼운걸음", "낙하", "뜨거운걸음", "가속화", "완벽한착지", "용수철",
    ],
  },
  wild_elytra: {
    base: [],
    special: ["창공", "추진력", "경감"],
  },
  wild_common: {
    base: [...WILD_UNIVERSAL_BASE],
    special: [...WILD_UNIVERSAL_SPECIAL],
  },
};

const KEY_ALIASES: Record<string, string> = {
  "바다의 행운": "바다의행운",
  "섬세한 손길": "섬세한손길",
  "고대 잔해": "고대잔해",
  "바다의 경험": "바다의경험",
  "노련한 손길": "노련한손길",
  "신속한 잠행": "신속한잠행",
  "가벼운 착지": "가벼운착지",
  "영혼 가속": "영혼가속",
  "차가운 걸음": "차가운걸음",
  "폭발 보호": "폭발보호",
  "화염 보호": "화염보호",
  "발사체 보호": "발사체보호",
  "엔더 보호": "엔더보호",
  "네더 보호": "네더보호",
  "가벼운 걸음": "가벼운걸음",
  "뜨거운 걸음": "뜨거운걸음",
  "완벽한 착지": "완벽한착지",
  "이중 타격": "이중타격",
  "빠른 장전": "빠른장전",
  "다중 발사": "다중발사",
};

export function normalizeOptionKey(name: string): string {
  const trimmed = name.trim();
  if (KEY_ALIASES[trimmed]) return KEY_ALIASES[trimmed];
  return trimmed.replace(/\s+/g, "");
}

export function getVanillaEnchantMaxLevel(name: string): number {
  const key = normalizeOptionKey(name);
  return ENCHANT_MAX[key] ?? 5;
}

/** UI 토글 상한 (상급 인챈트 구간 포함) */
export function getEnchantMaxLevel(name: string): number {
  const key = normalizeOptionKey(name);
  return WILD_HIGH_ENCHANT_LIMITS[key] ?? ENCHANT_MAX[key] ?? 5;
}

export function getHighEnchantThreshold(name: string): number | undefined {
  const key = normalizeOptionKey(name);
  if (WILD_HIGH_ENCHANT_LIMITS[key] === undefined) return undefined;
  return ENCHANT_MAX[key];
}

function toEnchantTuples(names: string[]): EnchantTuple[] {
  return names.map((name) => [name, getEnchantMaxLevel(name)]);
}

function appendUniversal(entries: { base: string[]; special: string[] }) {
  const base = new Set([...entries.base, ...WILD_UNIVERSAL_BASE]);
  const special = new Set([...entries.special, ...WILD_UNIVERSAL_SPECIAL]);
  return { base: [...base], special: [...special] };
}

export function resolveArchetype(item: { name: string; category: string } | null | undefined): EquipmentArchetype {
  if (!item) return "other";
  const cat = item.category.toUpperCase();
  const name = item.name;

  if (cat.includes("ISLAND") || cat.includes("아일랜드")) {
    if (name.includes("세이지") && name.includes("괭이") && !name.includes("곡괭이")) return "island_sage_hoe";
    if (name.includes("세이지") && name.includes("곡괭이")) return "island_sage_pickaxe";
    if (name.includes("세이지") && (name.includes("낚싯대") || name.includes("낚시"))) return "island_sage_rod";
    if (name.includes("세이지") && name.includes("대검")) return "island_sage_greatsword";
    return "island_unknown";
  }

  if (cat.includes("RPG")) return "rpg";

  if (cat.includes("WILD") || cat.includes("야생")) {
    if (name.includes("겉날개")) return "wild_elytra";
    if (name.includes("투구") || name.includes("헬멧")) return "wild_helmet";
    if (name.includes("흉갑") || name.includes("갑옷")) return "wild_chestplate";
    if (name.includes("레깅스") || name.includes("각반")) return "wild_leggings";
    if (name.includes("부츠") || name.includes("신발")) return "wild_boots";
    if (name.includes("낚싯대") || name.includes("낚시")) return "wild_fishing_rod";
    if (name.includes("삼지창")) return "wild_trident";
    if (name.includes("쇠뇌")) return "wild_crossbow";
    if (name.includes("활") && !name.includes("활성")) return "wild_bow";
    if (name.includes("철퇴")) return "wild_mace";
    if (name.includes("검")) return "wild_sword";
    if (name.includes("도끼")) return "wild_axe";
    if (name.includes("곡괭이") || name.includes("석괭")) return "wild_pickaxe";
    if (name.includes("괭이")) return "wild_hoe";
    if (name.includes("삽")) return "wild_shovel";
    return "wild_common";
  }

  return "other";
}

export function getWildEnchantOptions(archetype: EquipmentArchetype): {
  base: EnchantTuple[];
  special: EnchantTuple[];
} {
  const wildKey = archetype.startsWith("wild_") ? (archetype as WildArchetype) : "wild_common";
  const raw = WILD_ENCHANT_BY_ARCHETYPE[wildKey] ?? WILD_ENCHANT_BY_ARCHETYPE.wild_common;
  const merged = appendUniversal(raw);
  return {
    base: toEnchantTuples(merged.base),
    special: toEnchantTuples(merged.special),
  };
}

export function getIslandImprintOptions(archetype: EquipmentArchetype): string[] {
  if (
    archetype === "island_sage_hoe" ||
    archetype === "island_sage_pickaxe" ||
    archetype === "island_sage_rod" ||
    archetype === "island_sage_greatsword"
  ) {
    return ISLAND_IMPRINTS_BY_TOOL[archetype];
  }
  return [];
}

export function normalizeEnchantmentsMap(
  enchantments: Record<string, number> | null | undefined
): Record<string, number> {
  if (!enchantments) return {};
  const out: Record<string, number> = {};
  for (const [key, level] of Object.entries(enchantments)) {
    if (!level) continue;
    const normalized = normalizeOptionKey(key);
    out[normalized] = Math.max(out[normalized] || 0, Number(level));
  }
  return out;
}

export function normalizeImprintsMap(
  imprints: Record<string, number> | null | undefined
): Record<string, number> {
  if (!imprints) return {};
  const out: Record<string, number> = {};
  for (const [key, level] of Object.entries(imprints)) {
    if (!level) continue;
    const normalized = normalizeOptionKey(key);
    out[normalized] = Math.max(out[normalized] || 0, Number(level));
  }
  return out;
}

export function sanitizeSelections(
  item: { name: string; category: string } | null,
  selections: {
    enchantments?: Record<string, number>;
    imprints?: Record<string, number>;
  }
): { enchantments: Record<string, number>; imprints: Record<string, number> } {
  const archetype = resolveArchetype(item);
  const enchantments = normalizeEnchantmentsMap(selections.enchantments);
  const imprints = normalizeImprintsMap(selections.imprints);

  if (!item) {
    return { enchantments: {}, imprints: {} };
  }

  const cat = item.category.toUpperCase();
  let allowedEnchant = new Set<string>();
  let allowedImprint = new Set<string>();

  if (cat.includes("WILD") || cat.includes("야생")) {
    const { base, special } = getWildEnchantOptions(archetype);
    allowedEnchant = new Set([...base, ...special].map(([n]) => n));
  } else if (cat.includes("ISLAND") || cat.includes("아일랜드")) {
    allowedImprint = new Set(getIslandImprintOptions(archetype));
  }

  const filteredEnchantments: Record<string, number> = {};
  for (const [name, level] of Object.entries(enchantments)) {
    if (allowedEnchant.has(name)) filteredEnchantments[name] = level;
  }

  const filteredImprints: Record<string, number> = {};
  for (const [name, level] of Object.entries(imprints)) {
    if (allowedImprint.has(name)) filteredImprints[name] = level;
  }

  return { enchantments: filteredEnchantments, imprints: filteredImprints };
}

export function buildLampLines(line1: string, line2: string): string[] | null {
  const a = line1.trim();
  const b = line2.trim();
  if (!a && !b) return null;
  return [a, b];
}

export function parseLampLines(value: unknown): string[] {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.map((v) => String(v).trim()).filter(Boolean).slice(0, 2);
  }
  return [];
}
