import {
  buildPaymentDecision,
  calculateMonthlySpend,
  calculateOverrideAmount,
  cooldownScopeForRequest,
  deriveConstitutionPolicy,
  detectRiskSignals,
  shouldStartCooldown,
} from "../governance.js";
import { buildConstitution, nationTemplates } from "../nation-policies.js";

const nation = {
  monthlyBudget: 500,
  singleSpendLimit: 30,
  highRiskLimit: 10,
};

const constitution = [
  { id: "A2", text: "任何单笔超过 60 USDC 的支出必须进入国民议会审查。" },
  { id: "A3", text: "高风险资产默认最多批准 250 USDC。" },
];

const checks = [];

function check(name, condition, detail = "") {
  checks.push({ name, pass: Boolean(condition), detail });
}

const policy = deriveConstitutionPolicy(constitution, nation);
check("A2 自定义单笔限额进入有效政策", policy.singleSpendLimit === 60, JSON.stringify(policy));
check("A3 自定义高风险上限进入有效政策", policy.highRiskLimit === 250, JSON.stringify(policy));

const missionSignals = detectRiskSignals(
  "The studio needs an API package that supports the current project mission.",
  18,
  policy,
);
check("mission 不会被误判为 FOMO", !missionSignals.includes("fomo"), missionSignals.join(","));
check("项目采购仍会识别为目标对齐", missionSignals.includes("mission_aligned"), missionSignals.join(","));

const highRiskDecision = buildPaymentDecision(
  {
    amount: 300,
    title: "AI meme coin 冲动买入",
    context: "Telegram says this coin will pump tonight.",
  },
  nation,
  constitution,
);
check(
  "实际决策使用 A3 自定义上限",
  highRiskDecision.action === "reduce_payment" && highRiskDecision.approvedAmount === 250,
  JSON.stringify(highRiskDecision),
);

const builder = nationTemplates.find((item) => item.id === "builder");
const builderDecision = buildPaymentDecision(
  {
    amount: 49,
    title: "AI 开发工具订阅",
    context: "为当前 MVP 购买一个 SaaS 开发工具。",
  },
  builder,
  buildConstitution(builder),
);
check(
  "创作者共和国执行 20 USDC 采购审查线",
  builderDecision.action === "require_confirmation" && builderDecision.approvedAmount === 20,
  JSON.stringify(builderDecision),
);

const sanctuary = nationTemplates.find((item) => item.id === "healing");
const sanctuaryDecision = buildPaymentDecision(
  {
    amount: 100,
    title: "深夜冲动购物",
    context: "我现在很焦虑，也很孤独，想立刻购物和游戏充值。",
  },
  sanctuary,
  buildConstitution(sanctuary),
);
check(
  "心灵花园共和国在强情绪下拒绝非必要支付",
  sanctuaryDecision.action === "deny" && sanctuaryDecision.approvedAmount === 0,
  JSON.stringify(sanctuaryDecision),
);

const explorer = nationTemplates.find((item) => item.id === "learning");
const unverifiedLearningDecision = buildPaymentDecision(
  {
    amount: 10,
    title: "下一阶段课程订阅",
    context: "购买下一章节的学习工具。",
    milestoneAttestation: null,
  },
  explorer,
  buildConstitution(explorer),
);
check(
  "探索成长共和国在里程碑未验证时拒绝学习支付",
  unverifiedLearningDecision.action === "deny" && unverifiedLearningDecision.approvedAmount === 0,
  JSON.stringify(unverifiedLearningDecision),
);

const verifiedLearningDecision = buildPaymentDecision(
  {
    amount: 10,
    title: "下一阶段课程订阅",
    context: "购买下一章节的学习工具。",
    milestoneAttestation: { status: "user_attested", source: "test" },
  },
  explorer,
  buildConstitution(explorer),
);
check(
  "探索成长共和国在里程碑验证后允许额度内支付",
  verifiedLearningDecision.action === "approve" && verifiedLearningDecision.approvedAmount === 10,
  JSON.stringify(verifiedLearningDecision),
);

const monthlyBudgetDecision = buildPaymentDecision(
  {
    amount: 18,
    title: "API 数据采购",
    context: "购买支持当前项目的 API 数据。",
  },
  { ...builder, monthlySpent: 195 },
  buildConstitution(builder),
);
check(
  "所有模板受当月剩余额度约束",
  monthlyBudgetDecision.approvedAmount === 5 && monthlyBudgetDecision.policyLimits.monthlyRemaining === 5,
  JSON.stringify(monthlyBudgetDecision),
);

const coolingDecision = buildPaymentDecision(
  {
    amount: 10,
    title: "重复提交高风险交易",
    context: "再次购买 meme coin。",
  },
  { ...nationTemplates.find((item) => item.id === "web3"), activeCooldownUntil: "2999-01-01T00:00:00.000Z" },
  buildConstitution(nationTemplates.find((item) => item.id === "web3")),
);
check(
  "生效中的冷静期会拒绝重复支付",
  coolingDecision.action === "deny" && coolingDecision.riskSignals.includes("active_cooling_period"),
  JSON.stringify(coolingDecision),
);

const mixedModeLedger = [
  {
    id: "sandbox:1",
    providerMode: "sandbox",
    budgetAccountedAmount: 10,
    createdAt: "2026-07-15T00:00:00.000Z",
  },
  {
    id: "real:1",
    providerMode: "kite-passport",
    executedAmount: 0,
    budgetAccountedAmount: 0.01,
    createdAt: "2026-07-15T00:00:00.000Z",
  },
];
check(
  "沙盒推演不会占用真实 Passport 的月度预算",
  calculateMonthlySpend(mixedModeLedger, "kite-passport", "2026-07") === 0.01,
);
check(
  "沙盒支出只计入沙盒月度预算",
  calculateMonthlySpend(mixedModeLedger, "sandbox", "2026-07") === 10,
);

check(
  "普通单笔限额缩减不会误触发冷静期",
  !shouldStartCooldown({
    frozenAmount: 20,
    policyLimits: { coolingPeriodHours: 12 },
    riskSignals: ["over_single_spend_limit"],
  }),
);
check(
  "FOMO 缩减会触发冷静期",
  shouldStartCooldown({
    frozenAmount: 290,
    policyLimits: { coolingPeriodHours: 24 },
    riskSignals: ["fomo"],
  }),
);
check(
  "高风险资产即使没有 FOMO 词也会触发冷静期",
  shouldStartCooldown({
    frozenAmount: 90,
    policyLimits: { coolingPeriodHours: 24 },
    riskSignals: ["high_risk_asset"],
  }),
);
check(
  "强情绪下的必要支出不会误触发冷静期",
  !shouldStartCooldown({
    frozenAmount: 20,
    policyLimits: { coolingPeriodHours: 12 },
    riskSignals: ["strong_emotion", "over_single_spend_limit"],
  }),
);
check(
  "不同自定义议案拥有不同冷静期作用域",
  cooldownScopeForRequest({ id: "custom", title: "Meme A", merchant: "DEX A" }) !==
    cooldownScopeForRequest({ id: "custom", title: "课程 B", merchant: "School B" }),
);

check("Override 只支付未执行差额", calculateOverrideAmount(300, 10) === 290);
check("Override 不会产生负支付", calculateOverrideAmount(300, 320) === 0);

for (const item of checks) {
  console.log(`${item.pass ? "PASS" : "FAIL"} ${item.name}${item.detail ? `: ${item.detail}` : ""}`);
}

if (checks.some((item) => !item.pass)) process.exitCode = 1;
