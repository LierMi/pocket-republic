import {
  buildPaymentDecision,
  calculateOverrideAmount,
  deriveConstitutionPolicy,
  detectRiskSignals,
} from "../governance.js";

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

check("Override 只支付未执行差额", calculateOverrideAmount(300, 10) === 290);
check("Override 不会产生负支付", calculateOverrideAmount(300, 320) === 0);

for (const item of checks) {
  console.log(`${item.pass ? "PASS" : "FAIL"} ${item.name}${item.detail ? `: ${item.detail}` : ""}`);
}

if (checks.some((item) => !item.pass)) process.exitCode = 1;
