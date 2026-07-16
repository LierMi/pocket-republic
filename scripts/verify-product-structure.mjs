import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const html = await readFile(resolve(here, "../index.html"), "utf8");
const appSource = await readFile(resolve(here, "../app.js"), "utf8");
const styles = await readFile(resolve(here, "../styles.css"), "utf8");
const vercelIgnore = await readFile(resolve(here, "../.vercelignore"), "utf8");

const assertions = [
  [!html.includes('class="treasury-app"'), "旧的三栏 treasury-app 外壳已移除"],
  [html.includes('id="nationStatusRibbon"'), "存在紧凑国家状态带"],
  [html.includes('class="nation-workspace"'), "存在单舞台国家工作区"],
  [html.includes('id="entryFluidCanvas"'), "开屏包含流体画布"],
  [html.includes('class="entry-topnav"'), "Figma 开屏包含顶部玻璃导航"],
  [html.includes('class="entry-island-visual"'), "Figma 开屏包含中央等距国度"],
  [html.includes('./assets/figma-homepage/isometric-island.jpg'), "中央国度使用本地化 Figma 素材"],
  [html.includes('./assets/figma-homepage/hero-background.png'), "开屏背景使用本地化 Figma 素材"],
  [html.includes('data-art-slot="ART-00"'), "存在 ART-00 开屏图像槽"],
  [html.includes('data-art-slot="ART-01"'), "存在 ART-01 建国图像槽"],
  [html.includes('data-art-slot="ART-02"'), "存在 ART-02 Agent 群像槽"],
  [html.includes('data-art-slot="ART-03"'), "存在 ART-03 宪法大厅槽"],
  [html.includes('data-art-slot="ART-04"'), "存在 ART-04 国库大厅槽"],
  [html.includes('data-art-slot="ART-05"'), "存在 ART-05 国家地图槽"],
  [html.includes('data-art-slot="ART-06"'), "存在 ART-06 公报装饰槽"],
  [html.includes('id="departmentStatus"'), "地图存在部门开放状态"],
  [html.includes('id="departmentTitle"'), "地图存在动态部门标题"],
  [html.includes('id="departmentDescription"'), "地图存在动态部门说明"],
  [html.includes('id="departmentAction"'), "地图存在动态部门动作"],
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
  [html.includes("当 AI 开始替你花钱"), "Hero 直接说明 AI 钱包宪法价值"],
  [html.includes('data-entry-action="review"'), "Hero 提供财政议案快捷入口"],
  [!/尚未升空|让我的国度升空|国家种子/.test(html), "Hero 删除升空隐喻"],
  [html.includes('id="policyPreview"'), "建国页包含 Kite 国库策略预览"],
  [html.includes("Kite Treasury Policy Preview"), "策略预览使用明确的 Kite 标题"],
  [appSource.includes("function renderPolicyPreview"), "策略预览会随国家模板动态渲染"],
  [appSource.includes("mission: template.mission"), "切换国家模板会载入对应的默认使命"],
  [appSource.includes("walletMetrics") && appSource.includes("approvalRoute"), "国家模板卡展示钱包指标与审批路线"],
  [appSource.includes("providerMode") && appSource.includes("policyPreview"), "策略预览区分沙盒与真实 Passport"],
  [appSource.includes('status: "概念版图 · Roadmap v0.2"'), "未来部门明确标注 Roadmap 状态"],
  [appSource.includes('status: "已接入国库试验"'), "创作工坊连接现有国库试验"],
  [appSource.includes('requestId: "api"'), "创作工坊入口打开 API 采购议案"],
  [appSource.includes("function renderGazetteTerminal"), "国家公报包含动态 Kite 执行终端"],
  [appSource.includes("[SANDBOX]") && appSource.includes("非链上记录"), "沙盒终端明确声明不是链上证明"],
  [appSource.includes("settlementReference") && appSource.includes("agentPassportId"), "真实终端只读取 Kite 返回的身份与结算字段"],
  [vercelIgnore.includes(".kite-passport/"), "Vercel 产物排除本地 Passport 凭证"],
  [vercelIgnore.includes(".kite-tools/"), "Vercel 产物排除本地 Kite CLI"],
  [vercelIgnore.includes("server.mjs"), "Vercel 沙盒不发布本地凭证桥接"],
];

const viewNames = ["setup", "constitution", "review", "map", "trace"];
for (const viewName of viewNames) {
  const panelMatches = html.match(new RegExp(`data-view-panel="${viewName}"`, "g")) ?? [];
  assertions.push([
    panelMatches.length === 1,
    `${viewName} 视图恰好存在一次`,
  ]);
}

const navMatches = html.match(/data-view-tab="(?:setup|constitution|review|map|trace)"/g) ?? [];
assertions.push([navMatches.length === 5, "主导航恰好包含五个产品入口"]);

const hotspotMatches = html.match(/data-map-target="(?:treasury|garden|studio|academy|embassy|shop)"/g) ?? [];
assertions.push([hotspotMatches.length === 6, "国家地图包含六个可点击部门入口"]);

const failures = assertions.filter(([passed]) => !passed);

for (const [passed, message] of assertions) {
  console.log(`${passed ? "PASS" : "FAIL"} ${message}`);
}

if (failures.length > 0) {
  process.exitCode = 1;
}
