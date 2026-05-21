import fs from "node:fs";
import path from "node:path";

const filePath = path.join(process.cwd(), "features/home/HomePage.tsx");
let src = fs.readFileSync(filePath, "utf8");

src = src.replace(
  `<button onClick={() => setHomeTab("HOME")} className="flex items-center group shrink-0">
              <DdingtionLogo />
            </button>`,
  `<Link
              href="/"
              onClick={() => {
                triggerHaptic();
                setActiveTab("HOME");
              }}
              className="flex items-center group shrink-0"
            >
              <DdingtionLogo />
            </Link>`,
);

fs.writeFileSync(filePath, src, { encoding: "utf8" });
console.log("patched logo link");
