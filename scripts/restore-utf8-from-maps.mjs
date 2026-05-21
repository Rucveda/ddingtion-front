import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const nextDir = path.join(root, ".next");

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (name.endsWith(".map")) out.push(p);
  }
  return out;
}

function collectSources(node, bucket) {
  if (!node || typeof node !== "object") return;
  if (Array.isArray(node)) {
    for (const item of node) collectSources(item, bucket);
    return;
  }
  if (node.version === 3 && Array.isArray(node.sources) && Array.isArray(node.sourcesContent)) {
    for (let i = 0; i < node.sources.length; i++) {
      const src = node.sources[i];
      const content = node.sourcesContent[i];
      if (typeof src === "string" && typeof content === "string" && src.includes("/frontend/")) {
        const idx = src.indexOf("/frontend/");
        const rel = src.slice(idx + "/frontend/".length).replace(/\\/g, "/");
        if (rel.endsWith(".ts") || rel.endsWith(".tsx")) {
          const full = path.join(root, rel);
          const prev = bucket.get(full);
          if (!prev || content.length > prev.length) bucket.set(full, content);
        }
      }
    }
  }
  for (const value of Object.values(node)) collectSources(value, bucket);
}

const bucket = new Map();
for (const mapPath of walk(nextDir)) {
  try {
    const json = JSON.parse(fs.readFileSync(mapPath, "utf8"));
    collectSources(json, bucket);
  } catch {
    /* ignore */
  }
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
    .replaceAll("@/app/market/page", "@/features/market/MarketPage");

let count = 0;
for (const [target, raw] of bucket) {
  const content = importReplace(raw);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content, "utf8");
  count++;
  console.log("restored", path.relative(root, target));
}

console.log("total restored", count);
