import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const html = await readFile(resolve(here, "../index.html"), "utf8");
const appSource = await readFile(resolve(here, "../app.js"), "utf8");
const styles = await readFile(resolve(here, "../styles.css"), "utf8");

const assertions = [
  [html.includes('class="treasury-console"'), "财政页使用统一三栏控制台"],
  [(html.match(/class="protocol-arch"/g) ?? []).length === 4, "Kite 四道门都有独立视觉拱门"],
  [html.includes('id="treasuryCoreStatus"'), "中央执行核心具有动态状态出口"],
  [html.includes('class="treasury-ledger-visual"'), "决策区使用真实执行可视化而非作业占位"],
  [!html.includes("云上国库与国民议会"), "移除 ART-04 作业式图片说明"],
  [appSource.includes("treasuryCoreStatus: document.querySelector"), "执行核心接入页面状态管理"],
  [appSource.includes("syncTreasuryCoreStatus"), "Kite 状态会同步到执行核心"],
  [html.includes('id="reviewResult"'), "财政页包含明确的审查结果锚点"],
  [appSource.includes('elements.reviewResult?.scrollIntoView'), "国库审查完成后滚动到审查结果"],
  [!/runReviewButton\?\.addEventListener[\s\S]{0,180}setView\("review"\)/.test(appSource), "审查完成后不再重复切页并滚回顶部"],
  [/\.treasury-console\s*\{[^}]*grid-template-columns:\s*minmax\(280px, 0\.78fr\) minmax\(480px, 1\.44fr\) minmax\(280px, 0\.78fr\)/s.test(styles), "桌面财政控制台采用左中右三栏"],
  [/@media \(max-width: 980px\)[\s\S]*?\.treasury-console\s*\{[^}]*grid-template-columns:\s*1fr/s.test(styles), "窄屏财政控制台退化为单列"],
];

const failures = assertions.filter(([passed]) => !passed);
for (const [passed, message] of assertions) console.log(`${passed ? "PASS" : "FAIL"} ${message}`);
if (failures.length > 0) process.exitCode = 1;
