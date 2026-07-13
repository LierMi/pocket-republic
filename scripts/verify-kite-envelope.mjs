import { DemoKiteProvider, kiteTreasurySchema } from "../adapters/kite-provider.js";

const provider = new DemoKiteProvider();

const proposal = {
  id: "meme",
  title: "AI meme coin impulse buy",
  amount: 300,
  currency: "USDC",
  merchant: "Unknown DEX pool",
};

const reviewedDecision = {
  action: "reduce_payment",
  approvedAmount: 10,
  frozenAmount: 290,
  triggeredArticles: ["A1", "A2", "A3", "A4"],
  vote: { approve: 0, oppose: 2, reduce: 1, delay: 1 },
  decisionHash: "0xreviewed_decision_hash",
  policy: "A3 High-Risk Cap reduced the payment to 10 USDC.",
};

const overrideDecision = {
  action: "override_execute",
  approvedAmount: 290,
  frozenAmount: 0,
  triggeredArticles: ["A1", "A2", "A3", "A4", "A5"],
  vote: { approve: 1, oppose: 3, reduce: 0, delay: 0 },
  decisionHash: "0xoverride_decision_hash",
  previousDecisionHash: reviewedDecision.decisionHash,
  policy: "User invoked A5 Override Gazette.",
};

const checks = [];

function assertCheck(name, condition, detail = "") {
  checks.push({ name, pass: Boolean(condition), detail });
}

async function createTrace(decision) {
  const intent = await provider.createPaymentIntent({
    proposal,
    decision,
    decisionHash: decision.decisionHash,
  });
  const execution = await provider.executePayment(intent);
  return provider.tracePayment({ proposal, decision, intent, execution });
}

const passport = await provider.getAgentPassport();
const allowance = await provider.getAllowance();
const reviewTrace = await createTrace(reviewedDecision);
const overrideTrace = await createTrace(overrideDecision);

assertCheck("schema exposes Kite-facing concepts", kiteTreasurySchema.requiredConcepts.length === 5);
assertCheck("agent passport exists", passport.agentPassportId?.startsWith("kite-passport:"));
assertCheck("allowance can cover override demo", allowance.totalLimit >= proposal.amount);
assertCheck("review trace reduces high-risk spend", reviewTrace.paymentTrace.approvedAmount === 10);
assertCheck("review trace keeps MCP tool call", reviewTrace.mcpToolCall.tool === "treasury.executeGovernedPayment");
assertCheck("override trace executes only the unpaid remainder", overrideTrace.paymentTrace.approvedAmount === 290);
assertCheck("override trace has override flag", overrideTrace.paymentTrace.override === true);
assertCheck(
  "override trace preserves previous decision hash",
  overrideTrace.paymentTrace.previousDecisionHash === reviewedDecision.decisionHash,
);
assertCheck("override MCP arguments carry override flag", overrideTrace.mcpToolCall.arguments.override === true);
assertCheck("review deducts from the live allowance", reviewTrace.allowance.remainingAfterExecution === 490);
assertCheck("override continues deducting from the live allowance", overrideTrace.allowance.remainingAfterExecution === 200);
assertCheck("provider retains the cumulative remaining allowance", provider.allowance.remaining === 200);

const failed = checks.filter((check) => !check.pass);

console.log("Pocket Republic Kite envelope verification");
console.log(JSON.stringify({ provider: provider.providerName, checks }, null, 2));

if (failed.length > 0) {
  console.error(`Failed checks: ${failed.map((check) => check.name).join(", ")}`);
  process.exit(1);
}
