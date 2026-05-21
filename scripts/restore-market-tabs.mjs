import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const files = [
  "MarketContext.tsx",
  "SearchTab.tsx",
  "CalcTab.tsx",
  "EtcTab.tsx",
  "AdminTab.tsx",
];

const targets = new Set(files.map((f) => `app/market/${f}`));

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
    .replaceAll("@/lib/enhancementAllowlist", "@/lib/domain/enhancementAllowlist")
    .replaceAll('from "./marketData"', 'from "@/lib/domain/marketData"')
    .replaceAll('from "./MarketContext"', 'from "./MarketContext"');

function collect(node, bucket) {
  if (!node || typeof node !== "object") return;
  if (Array.isArray(node)) return node.forEach((n) => collect(n, bucket));
  if (node.version === 3 && Array.isArray(node.sources) && Array.isArray(node.sourcesContent)) {
    for (let i = 0; i < node.sources.length; i++) {
      const src = node.sources[i];
      const content = node.sourcesContent[i];
      if (typeof src !== "string" || typeof content !== "string" || !src.includes("/frontend/")) continue;
      const rel = src.slice(src.indexOf("/frontend/") + "/frontend/".length).replace(/\\/g, "/");
      if (!targets.has(rel)) continue;
      const name = path.basename(rel);
      const full = path.join(root, "features/market", name);
      const prev = bucket.get(full);
      if (!prev || content.length > prev.length) bucket.set(full, content);
    }
  }
  Object.values(node).forEach((n) => collect(n, bucket));
}

const bucket = new Map();
for (const mapPath of walk(path.join(root, ".next"))) {
  try {
    collect(JSON.parse(fs.readFileSync(mapPath, "utf8")), bucket);
  } catch {
    /* ignore */
  }
}

for (const [full, raw] of bucket) {
  fs.writeFileSync(full, importReplace(raw), "utf8");
  console.log("ok", path.relative(root, full), raw.length);
}

console.log("count", bucket.size);
