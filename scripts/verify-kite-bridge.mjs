import assert from "node:assert/strict";
import {
  buildDelegation,
  normalizeCliEnvelope,
  parsePaymentRequiredHeader,
  preflightX402,
  validateExecutePayload,
  validateTargetUrl,
} from "../server.mjs";

const delegation = buildDelegation({
  taskSummary: "为当前项目购买一封云外市场晨报",
  maxAmountPerTx: 1,
  maxTotalAmount: 3,
  ttlSeconds: 3600,
  asset: "USDC",
  targetUrl: "https://stablecrypto.dev/api/coingecko/global",
  method: "POST",
});

assert.deepEqual(delegation.payment_policy, {
  assets: ["USDC"],
  max_amount_per_tx: "1",
  max_total_amount: "3",
  ttl_seconds: 3600,
});
assert.deepEqual(delegation.execution_constraints.x402_http.allowed_endpoints, [
  {
    method: "POST",
    host: "stablecrypto.dev",
    path_prefix: "/api/coingecko/global",
  },
]);

assert.equal(
  validateTargetUrl("https://stablecrypto.dev/api/coingecko/global", ["stablecrypto.dev"]).hostname,
  "stablecrypto.dev",
);
assert.throws(() => validateTargetUrl("http://stablecrypto.dev/api/coingecko/global"), /HTTPS/);
assert.throws(() => validateTargetUrl("https://localhost/api"), /不允许/);
assert.throws(() => validateTargetUrl("https://127.0.0.1/api"), /不允许/);
assert.throws(() => validateTargetUrl("https://169.254.169.254/latest/meta-data"), /不允许/);
assert.throws(
  () => validateTargetUrl("https://evil.example/api", ["stablecrypto.dev"]),
  /允许名单/,
);

const executePayload = validateExecutePayload({
  url: "https://stablecrypto.dev/api/coingecko/global",
  method: "POST",
  sessionId: "session_demo_123",
  body: {},
});
assert.equal(executePayload.method, "POST");
assert.equal(executePayload.sessionId, "session_demo_123");
assert.throws(
  () =>
    validateExecutePayload({
      url: "https://stablecrypto.dev/api/coingecko/global",
      method: "TRACE",
    }),
  /method/,
);

const envelope = normalizeCliEnvelope(
  "kpass status",
  JSON.stringify({ status: "success", user: { logged_in: false } }),
);
assert.equal(envelope.command, "kpass status");
assert.equal(envelope.data.user.logged_in, false);
assert.throws(() => normalizeCliEnvelope("kpass status", "not-json"), /非 JSON/);

const paymentRequired = Buffer.from(
  JSON.stringify({
    x402Version: 2,
    resource: { url: "https://stablecrypto.dev/api/coingecko/global", method: "POST" },
    accepts: [
      {
        scheme: "exact",
        network: "eip155:8453",
        amount: "10000",
        asset: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
        payTo: "0x124F620b4F3b53559Cd9148c9b1B2773ca104478",
        extra: { name: "USD Coin" },
      },
    ],
  }),
).toString("base64url");

const parsedRequirement = parsePaymentRequiredHeader(paymentRequired);
assert.equal(parsedRequirement.requirement.amountRaw, "10000");
assert.equal(parsedRequirement.requirement.amount, "0.01");
assert.equal(parsedRequirement.requirement.decimals, 6);
assert.equal(parsedRequirement.requirement.assetSymbol, "USDC");

let preflightRequest;
const preflight = await preflightX402(
  {
    url: "https://stablecrypto.dev/api/coingecko/global",
    method: "POST",
    body: {},
  },
  async (url, options) => {
    preflightRequest = { url, options };
    return new Response(null, { status: 402, headers: { "payment-required": paymentRequired } });
  },
);
assert.equal(preflight.status, "payment_required");
assert.equal(preflight.requirement.amount, "0.01");
assert.equal(preflightRequest.options.body, "{}");

console.log("Kite bridge verification passed");
