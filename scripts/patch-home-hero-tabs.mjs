import fs from "node:fs";
import path from "node:path";

const filePath = path.join(process.cwd(), "features/home/HomePage.tsx");
let src = fs.readFileSync(filePath, "utf8");

src = src
  .replaceAll('onClick={() => setActiveTab("AUCTION")}', 'onClick={() => setHomeTab("AUCTION")}')
  .replaceAll('onClick={() => setActiveTab("CALCULATOR")}', 'onClick={() => setHomeTab("CALCULATOR")}')
  .replace("?? ?? ???? ?...", "경매 목록 불러오는 중...");

// Simpler logo link (no preventDefault race)
src = src.replace(
  /            <Link\r?\n              href="\/"\r?\n              onClick=\{\(e\) => \{[\s\S]*?\}\}\r?\n              className="flex items-center group shrink-0"\r?\n            >/,
  `<Link href="/" onClick={triggerHaptic} className="flex items-center group shrink-0">`,
);

fs.writeFileSync(filePath, src, { encoding: "utf8" });
console.log("fixed hero tabs + logo link");
