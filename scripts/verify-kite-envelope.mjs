import assert from "node:assert/strict";
import {
  DemoKiteProvider,
  KitePassportBridgeProvider,
  kiteTreasurySchema,
} from "../adapters/kite-provider.js";

const provider = new DemoKiteProvider();
const proposal = {
  id: "api",
  title: "购买一封云外市场晨报",
  amount: 18,
  currency: "USDC",
  merchant: "StableCrypto / Kite 服务目录",
  serviceUrl: "https://stablecrypto.dev/api/coingecko/global",
  serviceMethod: "POST",
  serviceBody: {},
  paymentAsset: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
  estimatedCost: 0.01,
};
const decision = {
  action: "approve",
  approvedAmount: 18,
  frozenAmount: 0,
  triggeredArticles: ["A1"],
  vote: { approve: 4, oppose: 0, reduce: 0, delay: 0 },
  decisionHash: "0xdecision",
  policy: "宪法检查通过。",
  policyLimits: { singleSpendLimit: 30, highRiskLimit: 10 },
};

const intent = await provider.createPaymentIntent({ proposal, decision, decisionHash: decision.decisionHash });
const execution = await provider.executePayment(intent);
const trace = await provider.tracePayment({ proposal, decision, intent, execution });

assert.deepEqual(kiteTreasurySchema.requiredConcepts, [
  "agentPassport",
  "spendingSession",
  "delegation",
  "paymentIntent",
  "paymentReceipt",
  "activity",
]);
assert.equal(provider.providerMode, "sandbox");
assert.equal(execution.txMode, "sandbox-ledger");
assert.equal(execution.status, "executed_sandbox");
assert.equal(execution.isOnchain, false);
assert.equal(execution.executedAmount, 0.01);
assert.match(execution.ledgerId, /^sandbox-ledger:/);
assert.equal(trace.paymentReceipt.proofType, "sandbox_receipt");
assert.equal(trace.paymentReceipt.isOnchain, false);
assert.equal(trace.spendingSession.status, "sandbox_active");
assert.equal(trace.delegation.payment_policy.assets[0], "USDC");
assert.equal("mcpToolCall" in trace, false);

const calls = [];
const bridge = new KitePassportBridgeProvider({
  fetchImpl: async (url, options = {}) => {
    calls.push({ url, options });
    if (url.endsWith("/status")) {
      return jsonResponse({
        mode: "kite-passport-cli",
        status: {
          status: "success",
          user: { logged_in: false },
          agent: { registered: false },
          session: { active: false },
        },
      });
    }
    throw new Error(`Unexpected URL ${url}`);
  },
});

const passport = await bridge.getAgentPassport();
assert.equal(passport.status, "unauthenticated");
assert.equal(bridge.providerMode, "kite-passport");
assert.equal(calls.length, 1);

const realCalls = [];
const realBridge = new KitePassportBridgeProvider({
  fetchImpl: async (url, options = {}) => {
    const body = options.body ? JSON.parse(options.body) : null;
    realCalls.push({ url, options, body });
    if (url.endsWith("/status")) {
      return jsonResponse({
        status: {
          user: { logged_in: true, user_id: "user_demo" },
          agent: { registered: true, agent_id: "agent_demo" },
          session: { active: false },
        },
      });
    }
    if (url.endsWith("/preflight")) {
      return jsonResponse({
        status: "payment_required",
        requirement: {
          network: "eip155:8453",
          asset: proposal.paymentAsset,
          assetSymbol: "USDC",
          amountRaw: "10000",
          amount: "0.01",
          decimals: 6,
        },
      });
    }
    if (url.endsWith("/session/create")) {
      return jsonResponse({ status: "success", session_id: "session_demo" });
    }
    if (url.endsWith("/session/use")) return jsonResponse({ status: "success" });
    if (url.endsWith("/session/execute")) {
      return jsonResponse({
        session_id: "session_demo",
        x402: { status_code: 200, parsed_response_body: { market: "delivered" } },
        payment: { transaction_hash: "0xsettled" },
        payment_requirement: { amount: "10000", asset: proposal.paymentAsset },
        usage: { spent_total: "0.01" },
      });
    }
    throw new Error(`Unexpected URL ${url}`);
  },
});
const realIntent = await realBridge.createPaymentIntent({
  proposal,
  decision,
  decisionHash: decision.decisionHash,
});
const realExecution = await realBridge.executePayment(realIntent);
assert.equal(realExecution.status, "settled_onchain");
assert.equal(realExecution.executedAmount, 0.01);
assert.equal(realExecution.currency, "USDC");
assert.equal(realExecution.paymentAsset, proposal.paymentAsset);
assert.equal(realExecution.settlementReference, "0xsettled");
assert.equal(realIntent.delegation.payment_policy.assets[0], "USDC");
assert.deepEqual(
  realCalls.find((call) => call.url.endsWith("/session/execute")).body.body,
  {},
);

const overLimitCalls = [];
const overLimitBridge = new KitePassportBridgeProvider({
  fetchImpl: async (url) => {
    overLimitCalls.push(url);
    if (url.endsWith("/status")) {
      return jsonResponse({
        status: {
          user: { logged_in: true },
          agent: { registered: true },
          session: { active: false },
        },
      });
    }
    if (url.endsWith("/preflight")) {
      return jsonResponse({
        status: "payment_required",
        requirement: {
          network: "eip155:8453",
          asset: proposal.paymentAsset,
          assetSymbol: "USDC",
          amountRaw: "50000000",
          amount: "50",
          decimals: 6,
        },
      });
    }
    throw new Error(`Unexpected URL ${url}`);
  },
});
const overLimitIntent = await overLimitBridge.createPaymentIntent({
  proposal,
  decision: { ...decision, approvedAmount: 3 },
  decisionHash: decision.decisionHash,
});
await assert.rejects(
  () => overLimitBridge.executePayment(overLimitIntent),
  (error) => error.code === "KITE_QUOTE_EXCEEDS_CONSTITUTION",
);
assert.equal(overLimitCalls.some((url) => url.endsWith("/session/create")), false);

console.log("Pocket Republic Kite provider verification passed");

function jsonResponse(payload, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    async json() {
      return payload;
    },
  };
}
