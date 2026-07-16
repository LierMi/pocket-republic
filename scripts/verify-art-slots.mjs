import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const html = await readFile(resolve(root, "index.html"), "utf8");

const checks = [
  [!html.includes('class="art-slot-note'), "页面不再暴露 ART 制作占位说明"],
  [!html.includes("./assets/product-ui/nation-map.png"), "已移除非核心国家地图素材"],
  [html.includes('class="constitution-sheet" data-art-slot="ART-03"'), "宪法页以规则正文作为居中主视觉"],
  [html.includes('class="gazette-side" data-art-slot="ART-06"'), "国家公报直接呈现 Kite 凭证"],
];

for (const [passed, label] of checks) console.log(`${passed ? "PASS" : "FAIL"} ${label}`);
if (checks.some(([passed]) => !passed)) process.exitCode = 1;
