import assert from "node:assert/strict";
import { buildConstitution, nationTemplates } from "../nation-policies.js";

assert.equal(nationTemplates.length, 4);

const builder = nationTemplates.find((item) => item.id === "builder");
assert.equal(builder.cn, "创作者国度");
assert.equal(builder.singleSpendLimit, 20);
assert.equal(builder.monthlyBudget, 200);
assert.equal(builder.walletMetrics.length, 2);

const web3 = nationTemplates.find((item) => item.id === "web3");
assert.equal(web3.cn, "链上主权国度");
assert.equal(web3.highRiskLimit, 10);
assert.equal(web3.coolingPeriodHours, 24);

const sanctuary = nationTemplates.find((item) => item.id === "healing");
assert.equal(sanctuary.cn, "心灵自律国度");
assert.match(sanctuary.treasuryRule, /强情绪/);

const explorer = nationTemplates.find((item) => item.id === "learning");
assert.equal(explorer.cn, "探索成长国度");
assert.equal(explorer.monthlyBudget, 150);
assert.match(explorer.treasuryRule, /里程碑/);

const web3Constitution = buildConstitution(web3);
assert.match(web3Constitution.find((item) => item.id === "A3").text, /10 USDC/);
assert.match(web3Constitution.find((item) => item.id === "A4").text, /24 小时/);

const sanctuaryConstitution = buildConstitution(sanctuary);
assert.match(sanctuaryConstitution.find((item) => item.id === "A5").text, /非必要支付/);

const explorerConstitution = buildConstitution(explorer);
assert.match(explorerConstitution.find((item) => item.id === "A5").text, /学习里程碑/);
assert.doesNotMatch(explorerConstitution.find((item) => item.id === "A5").text, /已自动发放/);

console.log("Pocket Republic nation policy verification passed");
