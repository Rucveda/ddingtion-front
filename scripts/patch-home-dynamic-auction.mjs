import fs from "node:fs";
import path from "node:path";

const filePath = path.join(process.cwd(), "features/home/HomePage.tsx");
let src = fs.readFileSync(filePath, "utf8");

if (!src.includes('import dynamic from "next/dynamic"')) {
  src = src.replace(
    'import { motion, AnimatePresence } from "framer-motion";',
    'import dynamic from "next/dynamic";\nimport { motion, AnimatePresence } from "framer-motion";',
  );
}

src = src.replace(
  'import { AuctionListTab } from "@/features/home/AuctionListTab";\n',
  `const AuctionListTab = dynamic(
  () => import("@/features/home/AuctionListTab").then((mod) => mod.AuctionListTab),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-[40vh] items-center justify-center px-4 text-xs font-extrabold tracking-[0.16em] text-zinc-500">
        경매 목록 불러오는 중...
      </div>
    ),
  },
);

`,
);

fs.writeFileSync(filePath, src, { encoding: "utf8" });
console.log("patched dynamic AuctionListTab");
