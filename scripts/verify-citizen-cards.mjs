import { access, readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const appSource = await readFile(resolve(root, "app.js"), "utf8");
const styles = await readFile(resolve(root, "styles.css"), "utf8");

const portraits = ["sol", "mira", "rin", "ivo", "noa", "luma", "vale"];
const portraitChecks = await Promise.all(
  portraits.map(async (name) => {
    const relativePath = `./assets/citizens/${name}.png`;
    let exists = true;
    try {
      await access(resolve(root, relativePath));
    } catch {
      exists = false;
    }
    return [exists && appSource.includes(relativePath), `本地化 ${name} 国民头像并接入默认资料`];
  }),
);

const assertions = [
  ...portraitChecks,
  [appSource.includes('class="citizen-role-panel"'), "国民卡包含独立职能说明模块"],
  [appSource.includes('class="citizen-credential-list"'), "国民卡包含结构化身份字段"],
  [appSource.includes("permissionsLabel(agent.permissions)"), "国民权限以可读中文展示"],
  [appSource.includes('class="citizen-brand"'), "国民卡包含 Pocket Republic 品牌签发标记"],
  [appSource.includes("data-citizen-edit"), "保留编辑国民入口"],
  [appSource.includes("data-citizen-create"), "保留创造国民入口"],
  [styles.includes("--citizen-accent"), "卡片颜色由国民主题变量驱动"],
  [/\.citizen-role-panel\s*\{[^}]*border-radius:\s*47\.5px 16px 16px 100px/s.test(styles), "职能模块采用 Figma 混合圆角"],
  [/@media \(max-width: 640px\)[\s\S]*?\.citizen-list\s*\{[^}]*grid-template-columns:\s*1fr/s.test(styles), "手机端国民卡为单列布局"],
];

const failures = assertions.filter(([passed]) => !passed);

for (const [passed, message] of assertions) {
  console.log(`${passed ? "PASS" : "FAIL"} ${message}`);
}

if (failures.length > 0) process.exitCode = 1;
