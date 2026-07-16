import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const html = await readFile(resolve(here, "../index.html"), "utf8");
const appSource = await readFile(resolve(here, "../app.js"), "utf8");
const styles = await readFile(resolve(here, "../styles.css"), "utf8");
const readme = await readFile(resolve(here, "../README.md"), "utf8");
const vercelIgnore = await readFile(resolve(here, "../.vercelignore"), "utf8");

const assertions = [
  [!html.includes('class="treasury-app"'), "旧的三栏 treasury-app 外壳已移除"],
  [html.includes('id="nationStatusRibbon"'), "存在紧凑国家状态带"],
  [html.includes('class="nation-workspace"'), "存在单舞台国家工作区"],
  [html.includes('id="entryFluidCanvas"'), "开屏包含流体画布"],
  [html.includes('class="entry-topnav"'), "开屏保留左右两端的顶部品牌栏"],
  [html.includes('class="entry-nav-brand"'), "顶部左侧保留 Pocket Republic 品牌"],
  [html.includes('class="entry-nav-actions"'), "顶部右侧保留模式状态与进入国家按钮"],
  [!html.includes('class="entry-nav-menu"'), "开屏中间不展示未接功能的导航菜单"],
  [html.includes('class="entry-island-visual"'), "Figma 开屏包含中央等距国度"],
  [html.includes('./assets/figma-homepage/isometric-island.jpg'), "中央国度使用本地化 Figma 素材"],
  [html.includes('./assets/figma-homepage/hero-background.png'), "开屏背景使用本地化 Figma 素材"],
  [html.includes('data-art-slot="ART-00"'), "存在 ART-00 开屏图像槽"],
  [html.includes('data-art-slot="ART-01"'), "存在 ART-01 建国图像槽"],
  [html.includes('data-art-slot="ART-02"'), "存在 ART-02 Agent 群像槽"],
  [html.includes('data-art-slot="ART-03"'), "存在 ART-03 宪法大厅槽"],
  [html.includes('data-art-slot="ART-04"'), "存在 ART-04 国库大厅槽"],
  [html.includes('data-art-slot="ART-06"'), "存在 ART-06 公报装饰槽"],
  [!html.includes('data-view-panel="map"'), "国家地图概念页已从 MVP 移除"],
  [!html.includes('data-view-tab="map"'), "主导航不再展示国家地图"],
  [html.indexOf('class="citizen-section"') < html.indexOf('class="view-intro setup-intro"'), "Agent 国民卡片位于建国页最前"],
  [/\/\* Cloud kingdom narrative layer \*\/[\s\S]{0,180}body\s*\{[^}]*background:\s*#fff/s.test(styles), "浅色工作区使用白色背景"],
  [html.includes('id="nationNameInput"'), "建国流程允许命名个人共和国"],
  [html.includes('<strong id="nationName">大雄的云上王国</strong>'), "默认国名使用大雄的云上王国"],
  [html.includes('id="milestoneVerifiedInput"'), "财政议案可提交学习里程碑证明"],
  [appSource.includes("milestoneVerifiedInput?.checked"), "学习里程碑完成声明进入实际决策请求"],
  [appSource.includes('status: "user_attested"'), "学习里程碑声明带有来源标记"],
  [appSource.includes('provider.providerMode === "sandbox" ? "等待本地国库推演"'), "公报草案按运行模式区分沙盒与 Kite"],
  [appSource.includes('aria-label="编辑宪法条款'), "宪法编辑框具有可访问名称"],
  [!appSource.includes("shouldAutoRunJudgeDemo"), "产品代码不包含评委自动演示捷径"],
  [html.includes("<span>Pocket Republic</span><span>口袋共和国</span>"), "Hero 显示中英文品牌"],
  [/\.entry-brand\s*\{[^}]*font-size:\s*64px/s.test(styles), "Hero 品牌名匹配 Figma 64px 字级"],
  [!html.includes("当 AI 开始替你花钱"), "Hero 已移除冗余宪法宣言"],
  [!html.includes("#entryManifesto"), "Hero 不保留失效的宪法宣言锚点"],
  [html.includes('data-entry-action="review"'), "Hero 提供财政议案快捷入口"],
  [!/尚未升空|让我的国度升空|国家种子/.test(html), "Hero 删除升空隐喻"],
  [html.includes('id="policyPreview"'), "建国页包含 Kite 国库策略预览"],
  [html.includes("Kite Treasury Policy Preview"), "策略预览使用明确的 Kite 标题"],
  [appSource.includes("function renderPolicyPreview"), "策略预览会随国家模板动态渲染"],
  [appSource.includes("mission: template.mission"), "切换国家模板会载入对应的默认使命"],
  [appSource.includes("walletMetrics") && appSource.includes("approvalRoute"), "国家模板卡展示钱包指标与审批路线"],
  [appSource.includes("providerMode") && appSource.includes("policyPreview"), "策略预览区分沙盒与真实 Passport"],
  [appSource.includes("function renderGazetteTerminal"), "国家公报包含动态 Kite 执行终端"],
  [appSource.includes("[SANDBOX]") && appSource.includes("非链上记录"), "沙盒终端明确声明不是链上证明"],
  [appSource.includes("settlementReference") && appSource.includes("agentPassportId"), "真实终端只读取 Kite 返回的身份与结算字段"],
  [appSource.includes('if (providerName === "DemoKiteProvider") return "Kite 测试网已接入"'), "顶部状态突出 Kite 测试网接入"],
  [readme.includes("Kite 测试网接入状态") && readme.includes("尚未完成最终 x402 支付结算"), "README 明确测试网已接入但尚未真实支付"],
  [vercelIgnore.includes(".kite-passport/"), "Vercel 产物排除本地 Passport 凭证"],
  [vercelIgnore.includes(".kite-tools/"), "Vercel 产物排除本地 Kite CLI"],
  [vercelIgnore.includes("server.mjs"), "Vercel 沙盒不发布本地凭证桥接"],
];

const viewNames = ["setup", "constitution", "review", "trace"];
for (const viewName of viewNames) {
  const panelMatches = html.match(new RegExp(`data-view-panel="${viewName}"`, "g")) ?? [];
  assertions.push([
    panelMatches.length === 1,
    `${viewName} 视图恰好存在一次`,
  ]);
}

const navMatches = html.match(/data-view-tab="(?:setup|constitution|review|trace)"/g) ?? [];
assertions.push([navMatches.length === 4, "主导航恰好包含四个核心产品入口"]);
assertions.push([
  /\.nav-liquid\s*\{[^}]*width:\s*calc\(\(100% - 22px\) \/ 4\)/s.test(styles),
  "导航选中浮块按四个核心入口等宽定位",
]);
assertions.push([
  !/\.nation-nav\s*\{[^}]*grid-template-columns:\s*repeat\(5,/s.test(styles),
  "桌面与移动端导航均不再使用旧的五栏布局",
]);

const failures = assertions.filter(([passed]) => !passed);

for (const [passed, message] of assertions) {
  console.log(`${passed ? "PASS" : "FAIL"} ${message}`);
}

if (failures.length > 0) {
  process.exitCode = 1;
}
