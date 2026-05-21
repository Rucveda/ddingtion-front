import fs from "node:fs";
import path from "node:path";

const filePath = path.join(process.cwd(), "features/home/HomePage.tsx");
let src = fs.readFileSync(filePath, "utf8");

src = src.replace(
  "{activeTab === \"AUCTION\" && <AuctionListTab isActive />}",
  "{activeTab === \"AUCTION\" && hasMounted && <AuctionListTab isActive />}",
);

fs.writeFileSync(filePath, src, { encoding: "utf8" });
console.log("patched auction mounted guard");
