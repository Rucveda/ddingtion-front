import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const mapPath = path.join(root, ".next/dev/server/chunks/ssr/_07g5ljw._.js.map");
const map = JSON.parse(fs.readFileSync(mapPath, "utf8"));

let content = null;
function find(node) {
  if (!node || typeof node !== "object") return;
  if (Array.isArray(node)) return node.forEach(find);
  if (node.version === 3 && node.sources?.[0]?.includes("app/market/page.tsx")) {
    content = node.sourcesContent[0];
  }
  Object.values(node).forEach(find);
}
find(map);

if (!content) {
  console.error("market page source not found");
  process.exit(1);
}

const out = content
  .replaceAll("@/utils/api", "@/lib/client/api")
  .replaceAll("@/utils/devMode", "@/dev/devMode")
  .replaceAll("@/utils/localDummyData", "@/dev/localDummyData")
  .replaceAll('from "./MarketContext"', 'from "./MarketContext"')
  .replaceAll('from "./SearchTab"', 'from "./SearchTab"')
  .replaceAll('from "./CalcTab"', 'from "./CalcTab"')
  .replaceAll('from "./EtcTab"', 'from "./EtcTab"')
  .replaceAll('from "./AdminTab"', 'from "./AdminTab"');

fs.writeFileSync(path.join(root, "features/market/MarketPage.tsx"), out, "utf8");
console.log("restored MarketPage.tsx", out.length);
