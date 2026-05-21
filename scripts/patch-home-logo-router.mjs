import fs from "node:fs";
import path from "node:path";

const filePath = path.join(process.cwd(), "features/home/HomePage.tsx");
let src = fs.readFileSync(filePath, "utf8");

src = src.replace(
  `<Link href="/" onClick={triggerHaptic} className="flex items-center group shrink-0">`,
  `<Link
              href="/"
              onClick={(e) => {
                triggerHaptic();
                if (activeTab !== "HOME") {
                  e.preventDefault();
                  router.replace("/");
                }
              }}
              className="flex items-center group shrink-0"
            >`,
);

fs.writeFileSync(filePath, src, { encoding: "utf8" });
console.log("patched logo router.replace");
