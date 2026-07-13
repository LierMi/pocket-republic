import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const html = await readFile(resolve(here, "../index.html"), "utf8");
const appSource = await readFile(resolve(here, "../app.js"), "utf8");

const assertions = [
  [!html.includes('class="treasury-app"'), "旧的三栏 treasury-app 外壳已移除"],
  [html.includes('id="nationStatusRibbon"'), "存在紧凑国家状态带"],
  [html.includes('class="nation-workspace"'), "存在单舞台国家工作区"],
  [html.includes('id="entryFluidCanvas"'), "开屏包含流体画布"],
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
  [html.includes('id="nationNameInput"'), "建国流程允许命名个人国度"],
  [appSource.includes('aria-label="编辑宪法条款'), "宪法编辑框具有可访问名称"],
  [!appSource.includes("shouldAutoRunJudgeDemo"), "产品代码不包含评委自动演示捷径"],
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
