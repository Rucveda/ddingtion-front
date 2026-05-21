import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const src = fs.readFileSync(path.join(root, "app/page.tsx"), "utf8");

const newImports = `import { getWildEnchantListBadgeClass } from "@/lib/domain/enhancementAllowlist";
import {
  AUCTIONS_PER_PAGE,
  AUCTION_FILTER_STORAGE_KEY,
  AUCTION_SORT_OPTIONS,
  DEFAULT_AUCTION_FILTERS,
  type Auction,
  type AuctionFilterState,
  type AuctionSortKey,
  type DetailFilterSection,
  type FilterSection,
  type HomeTabType,
  type HomeUser,
} from "@/features/home/auctionListTypes";
import { TimeLeft } from "@/features/home/TimeLeft";
import {
  HERO_BURST_STAGE1,
  HERO_BURST_STAGE2,
  HERO_BURST_WORDS,
  buildBurstParticles,
  withOrigins,
  type HeroParticle,
} from "@/features/home/heroParticles";
import { HomeGlobalStyles } from "@/features/home/HomeGlobalStyles";
`;

let out = src.replace(
  /import \{ getWildEnchantListBadgeClass \} from "@\/lib\/domain\/enhancementAllowlist";\n/,
  `${newImports}\n`,
);

out = out.replace(
  /const AUCTIONS_PER_PAGE = 20;[\s\S]*?const HERO_BURST_STAGE2[\s\S]*?peakRatio: 0\.3,\n\};\n\n/,
  "",
);

out = out.replace(/\bTabType\b/g, "HomeTabType");
out = out.replace(/\bUser\b/g, "HomeUser");
out = out.replace(/const parsedUser: HomeUser/g, "const parsedUser: HomeUser");
out = out.replace(/parsedUser: HomeUser = JSON/g, "parsedUser: HomeUser = JSON");

out = out.replace(
  /<style jsx global>\{`[\s\S]*?`\}<\/style>/,
  "<HomeGlobalStyles />",
);

const homePath = path.join(root, "features/home/HomePage.tsx");
fs.mkdirSync(path.dirname(homePath), { recursive: true });
fs.writeFileSync(homePath, out, "utf8");

const thinPage = `"use client";

export { default } from "@/features/home/HomePage";
`;
fs.writeFileSync(path.join(root, "app/page.tsx"), thinPage, "utf8");
console.log("HomePage.tsx lines:", out.split("\n").length);
