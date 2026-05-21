import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const targets = new Set([
  "app/reset-password/page.tsx",
  "features/community/PostEditor.tsx",
  "features/market/MarketPage.tsx",
  "app/post/PostEditor.tsx",
  "app/market/page.tsx",
]);

function walk(dir, out = []) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    if (fs.statSync(p).isDirectory()) walk(p, out);
    else if (name.endsWith(".map")) out.push(p);
  }
  return out;
}

const importReplace = (content) =>
  content
    .replaceAll("@/utils/api", "@/lib/client/api")
    .replaceAll("@/utils/runtimeConfig", "@/lib/client/runtimeConfig")
    .replaceAll("@/utils/authPreferences", "@/lib/auth/authPreferences")
    .replaceAll("@/utils/devMode", "@/dev/devMode")
    .replaceAll("@/utils/localDummyData", "@/dev/localDummyData")
    .replaceAll("@/utils/bidIncrement", "@/lib/domain/bidIncrement")
    .replaceAll("@/utils/postCategories", "@/lib/domain/postCategories")
    .replaceAll("@/utils/auctionListRestore", "@/lib/auction/auctionListRestore")
    .replaceAll("@/app/market/marketData", "@/lib/domain/marketData")
    .replaceAll("@/lib/enhancementAllowlist", "@/lib/domain/enhancementAllowlist")
    .replaceAll("@/app/post/PostEditor", "@/features/community/PostEditor")
    .replaceAll("@/app/market/page", "@/features/market/MarketPage")
    .replaceAll('from "./marketData"', 'from "@/lib/domain/marketData"');

function collect(node, bucket) {
  if (!node || typeof node !== "object") return;
  if (Array.isArray(node)) {
    for (const item of node) collect(item, bucket);
    return;
  }
  if (node.version === 3 && Array.isArray(node.sources) && Array.isArray(node.sourcesContent)) {
    for (let i = 0; i < node.sources.length; i++) {
      const src = node.sources[i];
      const content = node.sourcesContent[i];
      if (typeof src !== "string" || typeof content !== "string") continue;
      if (!src.includes("/frontend/")) continue;
      const rel = src.slice(src.indexOf("/frontend/") + "/frontend/".length).replace(/\\/g, "/");
      if (!targets.has(rel)) continue;
      const full = path.join(root, rel);
      const prev = bucket.get(full);
      if (!prev || content.length > prev.length) bucket.set(full, content);
    }
  }
  for (const value of Object.values(node)) collect(value, bucket);
}

const bucket = new Map();
const nextDir = path.join(root, ".next");
if (fs.existsSync(nextDir)) {
  for (const mapPath of walk(nextDir)) {
    try {
      collect(JSON.parse(fs.readFileSync(mapPath, "utf8")), bucket);
    } catch {
      /* ignore */
    }
  }
}

for (const [full, raw] of bucket) {
  const content = importReplace(raw);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content, "utf8");
  console.log("ok", path.relative(root, full));
}

// fallback: post editor -> features/community
const postSrc = path.join(root, "app/post/PostEditor.tsx");
const postDst = path.join(root, "features/community/PostEditor.tsx");
if (fs.existsSync(postSrc) && !fs.existsSync(postDst)) {
  fs.copyFileSync(postSrc, postDst);
  console.log("copied post -> features/community");
}
