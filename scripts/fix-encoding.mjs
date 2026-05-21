import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

const sortBlock = `const AUCTION_SORT_OPTIONS: { key: AuctionSortKey; label: string }[] = [
  { key: "default", label: "기본" },
  { key: "priceAsc", label: "가격 낮은순" },
  { key: "priceDesc", label: "가격 높은순" },
  { key: "newest", label: "최근 등록" },
];`;

const heroBurstBlock = `const HERO_BURST_WORDS = [
  { label: "귀중한", chars: ["귀", "중", "한"] },
  { label: "아이템", chars: ["아", "이", "템"] },
] as const;`;

function repair(content) {
  let s = content;
  s = s.replace(/const AUCTION_SORT_OPTIONS:[\s\S]*?\];/, sortBlock);
  s = s.replace(/const HERO_BURST_WORDS = [\s\S]*?\] as const;/, heroBurstBlock);
  s = s.replace(
    /if \(d > 0\) setTimeLeft\(`[^`]*`\);/,
    'if (d > 0) setTimeLeft(`${d}일 ${h}시간`);',
  );
  s = s.replace(
    /else if \(h > 0\) setTimeLeft\(`\$[\s\S]*?\`\);/,
    "else if (h > 0) setTimeLeft(`${h}시간 ${m}분`);",
  );
  s = s.replace(
    /else setTimeLeft\(`\$[\s\S]*?\`\);/,
    "else setTimeLeft(`${m}분 ${s}초`);",
  );
  return s;
}

const pagePath = path.join(root, "app/page.tsx");
const page = repair(fs.readFileSync(pagePath, "utf8"));
fs.writeFileSync(pagePath, page, "utf8");

const homePath = path.join(root, "features/home/HomePage.tsx");
fs.mkdirSync(path.dirname(homePath), { recursive: true });
fs.writeFileSync(homePath, page, "utf8");

console.log("repaired page.tsx and HomePage.tsx");
