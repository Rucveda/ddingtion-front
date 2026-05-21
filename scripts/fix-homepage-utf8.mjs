import fs from "node:fs";
import path from "node:path";

const filePath = path.join(process.cwd(), "features/home/HomePage.tsx");
let src = fs.readFileSync(filePath, "utf8");

const replacements = [
  [
    /                  <span className="hero-title-wrap">[\s\S]*?                <\/div>\r?\n              <\/div>\r?\n            <\/motion\.div>/,
    `                  <span className="hero-title-wrap">
                    <span>
                      띵타이쿤 <span className="hero-glitch-title hero-prism-text" data-text="경매 플랫폼">경매 플랫폼</span>,
                    </span>
                    <br />
                    <span className="hero-glitch-title" data-text="띵션에 오신 것을 환영합니다.">띵션에 오신 것을 환영합니다.</span>
                  </span>
                </h1>
                <p className="max-w-2xl text-zinc-300 text-base md:text-lg font-medium leading-7 mb-10 md:mb-12 break-keep">
                  가치 있는 장비들의 시세를 계산 및 분석하고,
                  <br />
                  경매를 통한 최적의 거래 기회를 찾아드립니다.
                </p>
                <div className="flex flex-col gap-3 sm:flex-row sm:gap-4">
                  <button onClick={() => setHomeTab("AUCTION")} className="home-hero-cta home-hero-cta-auction">
                    <span className="home-hero-cta-kicker">Live Auction</span>
                    <span className="home-hero-cta-label">경매 보기</span>
                  </button>
                  <button onClick={() => setHomeTab("CALCULATOR")} className="home-hero-cta home-hero-cta-calc">
                    <span className="home-hero-cta-kicker">Enhance Calculator</span>
                    <span className="home-hero-cta-label">강화 계산기</span>
                  </button>
                </div>
              </div>
            </motion.div>`,
  ],
  [
    /<div className="animate-pulse text-xs font-extrabold tracking-\[0\.16em\] text-white">[^<]*<\/div>/,
    `<div className="animate-pulse text-xs font-extrabold tracking-[0.16em] text-white">페이지 로딩 중...</div>`,
  ],
];

for (const [pattern, replacement] of replacements) {
  const next = src.replace(pattern, replacement);
  if (next === src) {
    console.error("No match for pattern:", pattern);
    process.exit(1);
  }
  src = next;
}

fs.writeFileSync(filePath, src, { encoding: "utf8" });
console.log("Fixed UTF-8:", filePath);
console.log("Has 띵타이쿤:", src.includes("띵타이쿤"));
