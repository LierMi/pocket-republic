# Pocket Republic Copy And Treasury Policy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 Pocket Republic 首屏与四个国家模板改成清晰、可执行、与 Kite Agent Wallet & Payment Governance 强绑定的产品体验。

**Architecture:** 将国家模板及其宪法生成逻辑拆到独立 `nation-policies.js`，使卡片数字、表单默认值、宪法条款和议会决策来自同一数据源。`app.js` 只负责视图绑定、双入口导航、策略预览与公报呈现；真实 Kite 执行继续由现有 Provider 负责。

**Tech Stack:** Vanilla HTML/CSS/ES modules, Node built-in test runner scripts, Kite Passport CLI bridge, Vercel static deployment.

## Global Constraints

- 第一视口必须显示 `Pocket Republic / 口袋共和国`、`建立你的个人 AI 国度`和双 CTA。
- 删除“尚未升空”“让国度升空”“国家种子”等无产品含义的文案。
- 主 CTA 进入建国；次 CTA 只跳转 Meme 币议案预审，不自动运行或支付。
- 四个模板的卡片数字、宪法条款和实际决策必须一致。
- 不宣称已部署自定义 `.sol` 合约、链上托管、生物识别锁或 0G TEE。
- 沙盒凭证必须显示 `Not on-chain`；真实 Kite 凭证只展示官方返回字段。
- 所有功能文字使用中文，Kite 协议对象保留官方英文名。
- 不引入新的前端依赖。

---

### Task 1: 可测试的国家国库政策模型

**Files:**
- Create: `nation-policies.js`
- Modify: `app.js`
- Create: `scripts/verify-nation-policies.mjs`
- Modify: `package.json`

**Interfaces:**
- Produces: `nationTemplates: NationTemplate[]`
- Produces: `getNationTemplate(templateId: string): NationTemplate`
- Produces: `buildConstitution(state: NationTemplate): ConstitutionArticle[]`
- `NationTemplate` includes `id`, `cn`, `en`, `subtitle`, `audience`, `monthlyBudget`, `singleSpendLimit`, `highRiskLimit`, `coolingPeriodHours`, `walletMetrics`, `treasuryRule`, `policyTags`, `demoHint`, `mission`, `protectedAssets`.

- [ ] **Step 1: Write the failing policy test**

```js
import assert from "node:assert/strict";
import { buildConstitution, nationTemplates } from "../nation-policies.js";

assert.equal(nationTemplates.length, 4);
const builder = nationTemplates.find((item) => item.id === "builder");
assert.equal(builder.singleSpendLimit, 20);
assert.equal(builder.monthlyBudget, 200);

const web3 = nationTemplates.find((item) => item.id === "web3");
assert.equal(web3.highRiskLimit, 10);
assert.equal(web3.coolingPeriodHours, 24);

const constitution = buildConstitution(web3);
assert.match(constitution.find((item) => item.id === "A3").text, /10 USDC/);
assert.match(constitution.find((item) => item.id === "A4").text, /24 小时/);
```

- [ ] **Step 2: Run the policy test and verify it fails**

Run: `node scripts/verify-nation-policies.mjs`

Expected: FAIL because `nation-policies.js` does not exist.

- [ ] **Step 3: Implement the four policy templates**

Create `nation-policies.js` with these effective values:

```js
export const nationTemplates = [
  { id: "builder", cn: "创作者国度", en: "Builder Republic", monthlyBudget: 200, singleSpendLimit: 20, highRiskLimit: 10, coolingPeriodHours: 0 },
  { id: "web3", cn: "链上主权国度", en: "DeGen Republic", monthlyBudget: 500, singleSpendLimit: 30, highRiskLimit: 10, coolingPeriodHours: 24 },
  { id: "healing", cn: "心灵自律国度", en: "Sanctuary Republic", monthlyBudget: 300, singleSpendLimit: 30, highRiskLimit: 0, coolingPeriodHours: 12 },
  { id: "learning", cn: "探索成长国度", en: "Explorer Republic", monthlyBudget: 150, singleSpendLimit: 15, highRiskLimit: 5, coolingPeriodHours: 0 },
];
```

Complete each object using the approved copy. `buildConstitution(state)` must generate A2 from `singleSpendLimit`, A3 from `highRiskLimit`, and A4 from `coolingPeriodHours`. Sanctuary A5 must say strong-emotion non-essential payments enter delayed review; Explorer A5 must say verified milestones unlock the next payment proposal, not claim automatic on-chain escrow.

- [ ] **Step 4: Replace in-file template definitions**

At the top of `app.js` import:

```js
import { buildConstitution, nationTemplates } from "./nation-policies.js";
```

Remove the former `nationTemplates` array and former `buildConstitution()` function from `app.js`. Add `node scripts/verify-nation-policies.mjs` to the `npm test` chain.

- [ ] **Step 5: Run the policy test**

Run: `node scripts/verify-nation-policies.mjs`

Expected: `Pocket Republic nation policy verification passed`.

### Task 2: 品牌 Hero 与双入口

**Files:**
- Modify: `index.html`
- Modify: `app.js`
- Modify: `styles.css`
- Modify: `scripts/verify-product-structure.mjs`

**Interfaces:**
- Consumes: existing `[data-entry-action]` event delegation.
- Produces: entry actions `enter` and `review`.

- [ ] **Step 1: Add failing structure assertions**

```js
assertions.push([html.includes("Pocket Republic / 口袋共和国"), "Hero 显示中英文品牌"]);
assertions.push([html.includes("建立你的个人 AI 国度"), "Hero 直接定义个人 AI 国度"]);
assertions.push([html.includes('data-entry-action="review"'), "Hero 提供财政议案快捷入口"]);
assertions.push([!/尚未升空|让我的国度升空|国家种子/.test(html), "Hero 删除升空隐喻"]);
```

- [ ] **Step 2: Run the structure test and verify it fails**

Run: `node scripts/verify-product-structure.mjs`

Expected: FAIL on the new Hero assertions.

- [ ] **Step 3: Replace Hero copy and add dual CTAs**

Implement the exact copy from `docs/superpowers/specs/2026-07-15-pocket-republic-copy-system-design.md`. Use a CSS/lightning symbol or existing icon treatment rather than embedding a decorative emoji in text. Add a compact `entry-demo-anchor` for the 300-to-10 USDC scenario.

- [ ] **Step 4: Implement the review entry action**

Keep the existing branch in `bindEvents()`:

```js
if (action === "review") {
  await selectRequest("meme");
  setView("review");
  return;
}
```

The CTA must not call `reviewActiveRequest()`.

- [ ] **Step 5: Add responsive CTA styles**

At desktop, place CTAs in one row with primary and secondary hierarchy. At `max-width: 640px`, stack them full-width and keep button text on at most two lines. Ensure the first viewport still shows the product definition and both actions.

- [ ] **Step 6: Run the structure test**

Run: `node scripts/verify-product-structure.mjs`

Expected: all Hero assertions PASS.

### Task 3: 钱包化模板卡与 Kite Policy Preview

**Files:**
- Modify: `index.html`
- Modify: `app.js`
- Modify: `styles.css`
- Modify: `scripts/verify-product-structure.mjs`

**Interfaces:**
- Consumes: `NationTemplate.walletMetrics`, `treasuryRule`, `policyTags`, `demoHint`.
- Produces: `renderPolicyPreview(template: NationTemplate): void`.

- [ ] **Step 1: Add failing UI structure assertions**

```js
assertions.push([html.includes('id="policyPreview"'), "建国页存在 Kite 国库政策预览"]);
assertions.push([appSource.includes("walletMetrics"), "模板卡显示钱包配置指标"]);
assertions.push([appSource.includes("renderPolicyPreview"), "选择模板会更新政策预览"]);
```

- [ ] **Step 2: Run test and verify it fails**

Run: `node scripts/verify-product-structure.mjs`

Expected: FAIL on policy preview assertions.

- [ ] **Step 3: Redesign `renderTemplateOptions()`**

Each template card renders:

```html
<span class="template-policy-label">Kite Wallet Policy</span>
<strong>创作者国度</strong>
<small>Builder Republic · 开发与采购专项国度</small>
<dl class="template-wallet-metrics">
  <div><dt>免审额度</dt><dd>20 USDC</dd></div>
  <div><dt>月度预算</dt><dd>200 USDC</dd></div>
</dl>
<p class="template-treasury-rule">超过 20 USDC 的 API、SaaS 与开发工具采购进入 ROI 双重审查。</p>
<div class="template-policy-tags"><span>效率</span><span>采购治理</span><span>防止闲置订阅</span></div>
```

Builder receives `默认推荐`; Web3 receives `核心支付 Demo`. Use text and CSS/icon treatments, not emoji-heavy badges.

- [ ] **Step 4: Add the real policy preview**

Add `#policyPreview` below or beside the card grid. `renderPolicyPreview(template)` displays:

```text
Nation          DeGen Republic
Asset           USDC
Single Spend    30 USDC
High-Risk Cap   10 USDC
Cooling Period  24 Hours
Approval Route  Treasurer + Auditor + Parliament
Provider        Sandbox / Kite Passport
```

It must be labeled `Kite Treasury Policy Preview`, not `Contract.sol`, and must not show Agent Passport `[OK]` unless the real provider status says so.

- [ ] **Step 5: Keep preview synchronized**

Call `renderPolicyPreview(nationState)` from `init()`, `selectTemplate()`, `updateNationFromForm()`, and `renderProviderStatus()`. Custom form values update the three numeric preview rows.

- [ ] **Step 6: Style stable responsive cards**

Use a two-column card grid at desktop and one column below 760px. Keep metrics as stable two-column rows. The preview is one unframed institutional panel, not a nested decorative card.

- [ ] **Step 7: Run tests**

Run: `npm test`

Expected: policy and structure suites PASS.

### Task 4: Roadmap 部门和真实公报终端

**Files:**
- Modify: `app.js`
- Modify: `styles.css`
- Modify: `scripts/verify-kite-envelope.mjs`
- Modify: `scripts/verify-product-structure.mjs`

**Interfaces:**
- Consumes: `execution.txMode`, `execution.ledgerId`, `execution.session`, `execution.executedAmount`, `decision.triggeredArticles`.
- Produces: `renderGazetteTerminal({ decision, execution }): string`.

- [ ] **Step 1: Add failing copy and receipt assertions**

```js
assertions.push([appSource.includes("概念版图 · Roadmap v0.2"), "未开放部门标明 Roadmap"]);
assertions.push([appSource.includes("renderGazetteTerminal"), "国家公报包含动态凭证终端"]);
```

Extend the sandbox provider test:

```js
assert.equal(execution.isOnchain, false);
assert.equal(execution.txHash, null);
```

- [ ] **Step 2: Run tests and verify they fail on the new presentation assertions**

Run: `npm test`

Expected: product structure test FAIL; provider truthfulness assertions PASS.

- [ ] **Step 3: Update Roadmap departments**

Set garden, academy, embassy and shop status to `概念版图 · Roadmap v0.2`. Their descriptions state that the Hackathon version prioritizes Kite treasury governance and that later versions may integrate Kite MCP and verifiable reasoning. Keep Studio as `已接入国库试验`，with an action leading to the existing x402 data-purchase proposal; do not claim a complete project co-creation backend. Do not say Kite MCP or verifiable reasoning are currently connected.

- [ ] **Step 4: Implement terminal receipt rendering**

`renderGazetteTerminal()` returns sandbox lines with `[SANDBOX]` and `Not on-chain`, or real lines using only official Agent ID, Session ID, settlement reference and actual paid amount. Escape every dynamic value before interpolation.

- [ ] **Step 5: Insert the terminal into final Gazette only**

Call the renderer from `renderGazette()`. Draft Gazette continues to show `等待国库执行` and never invents receipt data.

- [ ] **Step 6: Style terminal output**

Use a compact dark panel, monospace font, green/white status text, 6px radius and horizontal scrolling only inside the terminal. On mobile, use `font-size: 11px` and preserve wrapping for long IDs.

- [ ] **Step 7: Run tests**

Run: `npm test`

Expected: all suites PASS.

### Task 5: 文案清理、浏览器验证与部署

**Files:**
- Modify: `README.md`
- Modify: `assets/UI_ASSET_BRIEF.md`
- Modify: `docs/WORLD_BIBLE.md`
- Modify: `docs/DEMO_SCRIPT.md`
- Modify: `docs/UI_HANDOFF.md`

**Interfaces:**
- Consumes: all implemented copy and policy states.
- Produces: consistent handoff and demo documentation.

- [ ] **Step 1: Run the banned-copy scan before cleanup**

Run: `rg -n "尚未升空|让.*国度升空|国家种子|一阵风带出国境" index.html app.js README.md assets docs`

Expected: existing matches identify every line that must be rewritten.

- [ ] **Step 2: Rewrite documentation and art briefs**

Use `Pocket Republic / 口袋共和国`、`个人 AI 国度`、`Agent 国民`、`国家国库`、`议会审议`、`国家公报` consistently. Image briefs may remain dreamlike but must depict an already functioning AI nation, not an unexplained floating-land origin story.

- [ ] **Step 3: Run the banned-copy scan after cleanup**

Run the same `rg` command.

Expected: exit 1 with no matches.

- [ ] **Step 4: Run complete verification**

Run: `npm test`

Expected: all suites PASS.

Run separately:

```text
node --check app.js
node --check nation-policies.js
git diff --check
vercel build --yes
```

Expected: every command exits 0; Vercel output excludes `.kite-passport/`, `.kpass/`, `.kite-tools/`, `server.mjs` and internal docs.

- [ ] **Step 5: Browser verification**

Verify at 1280x800, 390x844 and 320x568:

- Hero shows bilingual brand, definition and both CTAs.
- Main CTA opens setup.
- Demo CTA opens Meme proposal preview without executing payment.
- Every template updates the policy preview and form numbers.
- Sandbox Gazette says `Not on-chain`.
- No horizontal page overflow and no console errors.

- [ ] **Step 6: Commit, push and verify Production**

```text
git add -A
git commit -m "Refine Pocket Republic wallet policy experience"
git push origin main
vercel ls pocket-republic
```

Expected: latest `main` deployment is Production `Ready` and aliased to `https://pocket-republic.vercel.app`.
