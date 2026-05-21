import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

const importReplace = (content) =>
  content
    .replaceAll("@/utils/api", "@/lib/client/api")
    .replaceAll("@/utils/runtimeConfig", "@/lib/client/runtimeConfig")
    .replaceAll("@/utils/authPreferences", "@/lib/auth/authPreferences")
    .replaceAll("@/utils/devMode", "@/dev/devMode")
    .replaceAll("@/utils/localDummyData", "@/dev/localDummyData")
    .replaceAll("@/utils/postCategories", "@/lib/domain/postCategories")
    .replaceAll("@/app/market/marketData", "@/lib/domain/marketData")
    .replaceAll("@/lib/enhancementAllowlist", "@/lib/domain/enhancementAllowlist")
    .replaceAll('from "./marketData"', 'from "@/lib/domain/marketData"');

const post = importReplace(fs.readFileSync(path.join(root, "app/post/PostEditor.tsx"), "utf8"));
fs.writeFileSync(path.join(root, "features/community/PostEditor.tsx"), post, "utf8");

const market = importReplace(fs.readFileSync(path.join(root, "app/market/page.tsx"), "utf8"));
fs.writeFileSync(path.join(root, "features/market/MarketPage.tsx"), market, "utf8");

console.log("synced PostEditor and MarketPage");
