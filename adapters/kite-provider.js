export const kiteTreasurySchema = {
  schemaName: "pocket-republic.kite-passport-trace",
  schemaVersion: "1.0.0",
  requiredConcepts: [
    "agentPassport",
    "spendingSession",
    "delegation",
    "paymentIntent",
    "paymentReceipt",
    "activity",
  ],
};

export class KiteTreasuryProvider {
  constructor(options = {}) {
    this.providerName = options.providerName ?? "KiteTreasuryProvider";
    this.providerMode = options.providerMode ?? "unknown";
    this.network = options.network ?? "kite-passport";
  }

  async getAgentPassport() {
    throw new Error("getAgentPassport must be implemented by a Kite adapter.");
  }

  async getAllowance() {
    throw new Error("getAllowance must be implemented by a Kite adapter.");
  }

  async createPaymentIntent() {
    throw new Error("createPaymentIntent must be implemented by a Kite adapter.");
  }

  async executePayment() {
    throw new Error("executePayment must be implemented by a Kite adapter.");
  }

  async tracePayment() {
    throw new Error("tracePayment must be implemented by a Kite adapter.");
  }
}

export function createKiteProvider(options = {}) {
  const params =
    typeof window === "undefined" ? new URLSearchParams() : new URLSearchParams(window.location.search);
  const providerMode = options.providerMode ?? params.get("provider") ?? "demo";

  if (providerMode === "kite") {
    return new KitePassportBridgeProvider({
      baseUrl: options.baseUrl ?? params.get("kite_bridge_url") ?? "/api/kite",
      fetchImpl: options.fetchImpl,
    });
  }

  return new DemoKiteProvider();
}

export class DemoKiteProvider extends KiteTreasuryProvider {
  constructor() {
    super({ providerName: "DemoKiteProvider", providerMode: "sandbox", network: "kite-sandbox" });
    this.passport = {
      agentPassportId: "sandbox-agent:treasurer:mira",
      agentName: "Mira",
      agentRole: "Treasurer",
      ownerNationId: "sandbox-owner:pocket-republic",
      walletAddress: "sandbox-wallet:no-onchain-address",
      status: "sandbox",
      identityType: "demonstration_only",
    };
    this.allowance = {
      sessionId: "sandbox-session:pocket-republic",
      currency: "USDT",
      totalLimit: 500,
      remaining: 500,
      singleSpendLimit: 30,
      highRiskLimit: 10,
      expiresAt: "sandbox-no-expiry",
      status: "sandbox_active",
      policySource: "constitution:A2-A4",
    };
  }

  async getAgentPassport() {
    return { ...this.passport };
  }

  async getAllowance() {
    return { ...this.allowance };
  }

  async createPaymentIntent({ proposal, decision, decisionHash }) {
    const delegation = buildSessionDelegation(proposal, decision);
    return {
      intentId: `sandbox-intent:${proposal.id}:${Date.now()}`,
      requester: proposal.requester ?? "Pocket Republic Parliament",
      agentPassportId: this.passport.agentPassportId,
      requestedAmount: proposal.amount,
      approvedAmount: decision.approvedAmount,
      currency: proposal.currency,
      decisionHash,
      policy: decision.policy,
      action: decision.action,
      merchant: proposal.merchant,
      serviceUrl: proposal.serviceUrl ?? null,
      serviceMethod: proposal.serviceMethod ?? "GET",
      serviceBody: proposal.serviceBody ?? null,
      paymentAsset: proposal.paymentAsset ?? proposal.currency,
      paymentQuote:
        proposal.estimatedCost == null
          ? null
          : {
              amount: formatAmount(proposal.estimatedCost),
              asset: proposal.paymentAsset ?? proposal.currency,
              source: "sandbox_catalog_estimate",
            },
      delegation,
      network: this.network,
    };
  }

  async executePayment(intent) {
    const executionAmount = Math.min(
      intent.approvedAmount,
      numberValue(intent.paymentQuote?.amount, intent.approvedAmount),
    );
    const hasFunds = executionAmount <= this.allowance.remaining;
    const executed = executionAmount > 0 && intent.action !== "deny" && hasFunds;
    const remainingAllowance = executed
      ? Math.max(0, this.allowance.remaining - executionAmount)
      : this.allowance.remaining;
    this.allowance.remaining = remainingAllowance;

    return {
      ledgerId: `sandbox-ledger:${stableHex(intent.intentId + intent.decisionHash, 24)}`,
      status: executed ? "executed_sandbox" : hasFunds ? "blocked_by_constitution" : "blocked_by_allowance",
      txMode: "sandbox-ledger",
      txHash: null,
      settlementReference: null,
      paymentReceipt: {
        proofType: "sandbox_receipt",
        isOnchain: false,
        warning: "此记录仅用于产品推演，不是 Kite 链上交易。",
      },
      isOnchain: false,
      executedAmount: executed ? executionAmount : 0,
      quotedAmount: executionAmount,
      amountProvenance: "sandbox_simulation",
      budgetAccountedAmount: executed ? executionAmount : 0,
      budgetProvenance: "sandbox_simulation",
      currency: intent.currency,
      remainingAllowance,
      session: {
        sessionId: this.allowance.sessionId,
        status: this.allowance.status,
        delegation: intent.delegation,
        usage: {
          spentTotal: this.allowance.totalLimit - remainingAllowance,
          remainingTotal: remainingAllowance,
        },
      },
      executedAt: new Date().toISOString(),
    };
  }

  async tracePayment({ proposal, decision, intent, execution }) {
    return {
      schema: kiteTreasurySchema,
      mode: "sandbox",
      agentPassport: { ...this.passport },
      spendingSession: {
        sessionId: execution.session.sessionId,
        status: execution.session.status,
        totalLimit: this.allowance.totalLimit,
        remainingAfterExecution: execution.remainingAllowance,
        currency: this.allowance.currency,
      },
      delegation: intent.delegation,
      paymentIntent: intent,
      paymentReceipt: {
        ...execution.paymentReceipt,
        ledgerId: execution.ledgerId,
        status: execution.status,
        requestedAmount: proposal.amount,
        approvedAmount: decision.approvedAmount,
        executedAmount: execution.executedAmount,
        currency: proposal.currency,
        paymentAsset: intent.paymentAsset,
        paymentQuote: intent.paymentQuote,
        triggeredArticles: decision.triggeredArticles,
        vote: decision.vote,
        decisionHash: decision.decisionHash,
        override: decision.action === "override_execute",
        previousDecisionHash: decision.previousDecisionHash ?? null,
      },
      activity: {
        source: "browser-local-sandbox",
        recordedAt: execution.executedAt,
      },
    };
  }
}

export class KitePassportBridgeProvider extends KiteTreasuryProvider {
  constructor(options = {}) {
    super({
      providerName: "KitePassportBridgeProvider",
      providerMode: "kite-passport",
      network: "kite-passport-x402",
    });
    this.baseUrl = String(options.baseUrl ?? "/api/kite").replace(/\/$/, "");
    this.fetchImpl = options.fetchImpl ?? globalThis.fetch?.bind(globalThis);
    this.statusSnapshot = null;
  }

  async getStatus({ refresh = false } = {}) {
    if (!refresh && this.statusSnapshot) return this.statusSnapshot;
    this.statusSnapshot = await this.request("/status");
    return this.statusSnapshot;
  }

  async getAgentPassport() {
    const snapshot = await this.getStatus();
    const status = snapshot.status ?? {};
    const agent = status.agent ?? {};
    const user = status.user ?? {};
    const walletAddress = extractWalletAddress(snapshot.wallet);

    return {
      agentPassportId: agent.agent_id ?? "not-registered",
      agentName: "Mira",
      agentRole: "Treasurer",
      ownerNationId: user.user_id ?? "not-authenticated",
      walletAddress: walletAddress ?? "wallet-unavailable",
      status: !user.logged_in ? "unauthenticated" : agent.registered ? "active" : "agent_unregistered",
      identityType: "kite-agent-passport",
      backendReachable: Boolean(status.backend?.reachable ?? status.backend?.status === "ok"),
    };
  }

  async getAllowance() {
    const snapshot = await this.getStatus();
    const session = extractActiveSession(snapshot);
    const policy = session?.delegation?.payment_policy ?? session?.payment_policy ?? {};
    const usage = session?.usage ?? {};
    const totalLimit = numberValue(policy.max_total_amount, 0);
    const spent = numberValue(usage.spent_total, 0);
    const remaining = Math.max(0, totalLimit - spent);

    return {
      sessionId: session?.session_id ?? session?.id ?? "no-active-session",
      currency: displayAssetLabel(policy.assets?.[0]),
      totalLimit,
      remaining,
      singleSpendLimit: numberValue(policy.max_amount_per_tx, 0),
      highRiskLimit: 0,
      expiresAt: session?.expires_at ?? null,
      status: session?.status ?? (snapshot.status?.user?.logged_in ? "no_active_session" : "unauthenticated"),
      policySource: "kite-passport-delegation",
      walletBalance: extractWalletBalance(snapshot.wallet),
    };
  }

  async createPaymentIntent({ proposal, decision, decisionHash }) {
    if (!proposal.serviceUrl) {
      throw providerError(
        "KITE_SERVICE_URL_REQUIRED",
        "真实 Kite 模式只执行声明了 x402 HTTPS 服务地址的议案。当前议案可以继续做宪法预审，但不会伪造支付。",
      );
    }

    return {
      intentId: `kite-intent:${proposal.id}:${Date.now()}`,
      requester: proposal.requester ?? "Pocket Republic Parliament",
      requestedAmount: proposal.amount,
      approvedAmount: decision.approvedAmount,
      currency: proposal.currency,
      decisionHash,
      policy: decision.policy,
      action: decision.action,
      merchant: proposal.merchant,
      serviceUrl: proposal.serviceUrl,
      serviceMethod: proposal.serviceMethod ?? "GET",
      serviceBody: proposal.serviceBody ?? null,
      paymentAsset: proposal.paymentAsset ?? proposal.currency,
      delegation: buildSessionDelegation(proposal, decision),
      network: this.network,
    };
  }

  async executePayment(intent) {
    const snapshot = await this.getStatus({ refresh: true });
    if (!snapshot.status?.user?.logged_in) {
      throw providerError(
        "KITE_AUTH_REQUIRED",
        "Kite Passport 尚未登录。请在终端完成邮箱验证和 Passkey 设置后重试。",
      );
    }

    if (!snapshot.status?.agent?.registered) {
      await this.request("/agent/register", {
        method: "POST",
        body: { type: "pocket-republic-treasurer" },
      });
      this.statusSnapshot = null;
    }

    const preflight = await this.request("/preflight", {
      method: "POST",
      body: {
        url: intent.serviceUrl,
        method: intent.serviceMethod,
        body: intent.serviceBody,
      },
    });
    const quote = preflight.requirement;
    const quotedAmount = numberValue(quote?.amount, Number.NaN);
    if (!Number.isFinite(quotedAmount)) {
      throw providerError(
        "KITE_ASSET_DECIMALS_UNKNOWN",
        "x402 服务已报价，但当前无法可靠确定该资产的小数精度，因此没有创建授权。",
      );
    }
    if (quotedAmount > intent.approvedAmount) {
      throw providerError(
        "KITE_QUOTE_EXCEEDS_CONSTITUTION",
        `x402 真实报价 ${quote.amount} 超过宪法批准上限 ${intent.approvedAmount} ${intent.currency}，国库已拒绝创建 Session。`,
      );
    }
    if (
      intent.paymentAsset &&
      String(intent.paymentAsset).startsWith("0x") &&
      String(intent.paymentAsset).toLowerCase() !== String(quote.asset).toLowerCase()
    ) {
      throw providerError("KITE_QUOTE_ASSET_MISMATCH", "x402 报价资产与议案声明的资产不一致。");
    }
    intent.paymentQuote = quote;
    if (quote.assetSymbol && String(quote.assetSymbol).toUpperCase() !== String(intent.currency).toUpperCase()) {
      throw providerError("KITE_QUOTE_SYMBOL_MISMATCH", "x402 报价币种与议案币种不一致。");
    }
    intent.delegation.payment_policy.assets = [quote.assetSymbol ?? intent.currency];

    const policy = intent.delegation.payment_policy;
    const sessionResult = await this.request("/session/create", {
      method: "POST",
      body: {
        taskSummary: intent.delegation.task.summary,
        maxAmountPerTx: policy.max_amount_per_tx,
        maxTotalAmount: policy.max_total_amount,
        ttlSeconds: policy.ttl_seconds,
        asset: policy.assets[0],
        targetUrl: intent.serviceUrl,
        method: intent.serviceMethod,
      },
    });

    const reusableSessionId = extractReusableSessionId(sessionResult);
    if (reusableSessionId) {
      await this.request("/session/use", {
        method: "POST",
        body: { sessionId: reusableSessionId },
      });
      return this.executeX402(intent, reusableSessionId, sessionSpentBefore(snapshot, reusableSessionId));
    }

    const approvedSessionId = sessionResult.session_id ?? sessionResult.session?.session_id;
    if (sessionResult.status === "success" && approvedSessionId) {
      await this.request("/session/use", {
        method: "POST",
        body: { sessionId: approvedSessionId },
      });
      return this.executeX402(intent, approvedSessionId, sessionSpentBefore(snapshot, approvedSessionId));
    }

    const requestId = sessionResult.request_id ?? sessionResult.session_request_id ?? "kite-session-pending";
    return {
      ledgerId: requestId,
      status: "session_pending",
      txMode: "kite-passport-session",
      txHash: null,
      settlementReference: null,
      paymentReceipt: null,
      isOnchain: false,
      executedAmount: 0,
      quotedAmount: numberValue(intent.paymentQuote?.amount, 0),
      amountProvenance: "not_paid",
      budgetAccountedAmount: 0,
      budgetProvenance: "not_paid",
      currency: intent.currency,
      remainingAllowance: numberValue(policy.max_total_amount, 0),
      session: {
        requestId,
        sessionId: null,
        status: sessionResult.status ?? "human_action_required",
        approvalUrl: sessionResult.approval_url ?? sessionResult.action_url ?? null,
        delegation: intent.delegation,
        raw: sessionResult,
      },
      executedAt: new Date().toISOString(),
    };
  }

  async executeX402(intent, sessionId, spentBefore = 0) {
    const result = await this.request("/session/execute", {
      method: "POST",
      body: {
        url: intent.serviceUrl,
        method: intent.serviceMethod,
        sessionId,
        body: intent.serviceBody,
      },
    });
    const statusCode = numberValue(result.x402?.status_code ?? result.payment?.status_code, 0);
    const settlementReference = extractSettlementReference(result);
    const isOnchain = Boolean(settlementReference);
    const spent = numberValue(result.usage?.spent_total, 0);
    const total = numberValue(result.delegation?.payment_policy?.max_total_amount, intent.approvedAmount);
    const quotedAmount = numberValue(intent.paymentQuote?.amount, 0);
    const receiptAmount = extractReceiptAmount(result.payment_receipt ?? result.payment?.payment_receipt);
    const usageDelta = Math.max(0, spent - numberValue(spentBefore, 0));
    // A delivered service has consumed at least its verified quote even when the
    // provider has not returned a receipt or refreshed Session usage yet.
    const budgetAccountedAmount = receiptAmount ?? (usageDelta > 0 ? usageDelta : quotedAmount);

    if (statusCode < 200 || statusCode >= 300) {
      throw providerError("KITE_SERVICE_FAILED", `x402 服务返回 HTTP ${statusCode || "未知"}，支付未确认。`);
    }

    return {
      ledgerId: settlementReference ?? result.payment_receipt?.id ?? `kite-service:${Date.now()}`,
      status: isOnchain ? "settled_onchain" : "service_delivered_receipt_pending",
      txMode: "kite-passport-x402",
      txHash: settlementReference,
      settlementReference,
      paymentReceipt: result.payment_receipt ?? result.payment?.payment_receipt ?? null,
      isOnchain,
      executedAmount: receiptAmount ?? 0,
      quotedAmount,
      amountProvenance: receiptAmount == null ? "quote_only" : "receipt",
      budgetAccountedAmount,
      budgetProvenance:
        receiptAmount == null ? (usageDelta > 0 ? "session_usage_delta" : "verified_quote_fallback") : "receipt",
      currency: intent.currency,
      paymentAsset: result.payment_requirement?.asset ?? intent.paymentQuote?.asset ?? intent.paymentAsset,
      paymentQuote: intent.paymentQuote ?? null,
      remainingAllowance: Math.max(0, total - spent),
      session: {
        sessionId: result.session_id ?? sessionId,
        status: result.session_status ?? "active",
        delegation: result.delegation ?? intent.delegation,
        usage: result.usage ?? null,
      },
      serviceResponse: result.x402?.parsed_response_body ?? result.x402?.response_body ?? null,
      raw: result,
      executedAt: new Date().toISOString(),
    };
  }

  async tracePayment({ proposal, decision, intent, execution }) {
    return {
      schema: kiteTreasurySchema,
      mode: "kite-passport",
      agentPassport: await this.getAgentPassport(),
      spendingSession: execution.session,
      delegation: intent.delegation,
      paymentIntent: intent,
      paymentReceipt: {
        proofType: execution.isOnchain ? "kite_onchain_receipt" : execution.status,
        isOnchain: execution.isOnchain,
        settlementReference: execution.settlementReference,
        receipt: execution.paymentReceipt,
        ledgerId: execution.ledgerId,
        status: execution.status,
        requestedAmount: proposal.amount,
        approvedAmount: decision.approvedAmount,
        executedAmount: execution.executedAmount,
        quotedAmount: execution.quotedAmount,
        amountProvenance: execution.amountProvenance,
        budgetAccountedAmount: execution.budgetAccountedAmount,
        budgetProvenance: execution.budgetProvenance,
        currency: execution.currency,
        paymentAsset: execution.paymentAsset ?? intent.paymentAsset,
        paymentQuote: execution.paymentQuote ?? intent.paymentQuote ?? null,
        triggeredArticles: decision.triggeredArticles,
        decisionHash: decision.decisionHash,
      },
      activity: {
        source: "kpass user sessions + x402 execute receipt",
        endpoint: "/api/kite/activity",
        recordedAt: execution.executedAt,
      },
      serviceResponse: execution.serviceResponse ?? null,
    };
  }

  async getActivity() {
    return this.request("/activity");
  }

  async request(path, options = {}) {
    if (typeof this.fetchImpl !== "function") throw new Error("当前环境不支持 fetch。");
    const response = await this.fetchImpl(`${this.baseUrl}${path}`, {
      method: options.method ?? "GET",
      headers: options.body ? { "Content-Type": "application/json" } : undefined,
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
    let payload;
    try {
      payload = await response.json();
    } catch {
      payload = { error: `Kite 桥接服务返回了非 JSON 响应（HTTP ${response.status}）。` };
    }
    if (!response.ok) {
      throw providerError("KITE_BRIDGE_ERROR", payload.error ?? `Kite 桥接服务 HTTP ${response.status}`);
    }
    return payload;
  }
}

export function buildSessionDelegation(proposal, decision) {
  const approvedAmount = Math.max(0.01, numberValue(decision.approvedAmount, 0.01));
  const perTransaction = Math.max(
    0.01,
    Math.min(approvedAmount, numberValue(decision.policyLimits?.singleSpendLimit, approvedAmount)),
  );
  const target = proposal.serviceUrl ? new URL(proposal.serviceUrl) : null;
  const delegation = {
    task: {
      summary: `为“${proposal.title}”执行一次经宪法批准的服务采购`.slice(0, 120),
    },
    payment_policy: {
      assets: [proposal.currency ?? "USDC"],
      max_amount_per_tx: formatAmount(perTransaction),
      max_total_amount: formatAmount(approvedAmount),
      ttl_seconds: 3600,
    },
  };

  if (target) {
    delegation.execution_constraints = {
      x402_http: {
        scope_mode: "scoped",
        allowed_endpoints: [
          {
            method: String(proposal.serviceMethod ?? "GET").toUpperCase(),
            host: target.hostname,
            path_prefix: target.pathname || "/",
          },
        ],
      },
    };
  }
  return delegation;
}

function extractActiveSession(snapshot) {
  if (snapshot.status?.session?.active && snapshot.status.session.details) {
    return snapshot.status.session.details;
  }
  const candidates = snapshot.sessions?.sessions ?? snapshot.sessions?.items ?? [];
  return candidates.find((session) => session.status === "active") ?? candidates[0] ?? null;
}

function extractReusableSessionId(result) {
  const candidates = result.reuse_candidates ?? result.candidates ?? result.reusable_sessions ?? [];
  const fromCandidate = candidates[0]?.session_id ?? candidates[0]?.id;
  if (fromCandidate) return fromCandidate;
  const commandMatch = String(result.next_command ?? "").match(/--session-id\s+([A-Za-z0-9:_-]+)/);
  return result.reuse_available ? commandMatch?.[1] ?? null : null;
}

function sessionSpentBefore(snapshot, sessionId) {
  const session = extractActiveSession(snapshot);
  const activeId = session?.session_id ?? session?.id;
  if (!session || !activeId || String(activeId) !== String(sessionId)) return 0;
  return numberValue(session.usage?.spent_total, 0);
}

function extractWalletAddress(wallet) {
  return (
    wallet?.wallet_address ??
    wallet?.address ??
    wallet?.wallet?.address ??
    wallet?.wallets?.[0]?.address ??
    wallet?.assets?.[0]?.wallet_address ??
    null
  );
}

function extractWalletBalance(wallet) {
  const direct = wallet?.balance ?? wallet?.total_balance;
  if (direct != null) return numberValue(direct, 0);
  const asset = wallet?.assets?.find((item) => String(item.symbol ?? item.asset).toUpperCase().includes("USDC"));
  return numberValue(asset?.balance ?? asset?.amount, 0);
}

function extractReceiptAmount(receipt) {
  if (!receipt || typeof receipt !== "object") return null;
  const candidates = [receipt.paid_amount, receipt.amount_paid, receipt.amount, receipt.value];
  for (const candidate of candidates) {
    const amount = Number(candidate);
    if (Number.isFinite(amount) && amount >= 0) return amount;
  }
  return null;
}

function extractSettlementReference(result) {
  return (
    result.payment?.payment_response?.reference ??
    result.payment?.transaction_hash ??
    result.payment_receipt?.transaction_hash ??
    result.payment_receipt?.tx_hash ??
    result.x402?.transaction_hash ??
    null
  );
}

function displayAssetLabel(asset) {
  if (!asset) return "USDC";
  if (String(asset).toLowerCase() === "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913") return "USDC";
  return String(asset);
}

function providerError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

function numberValue(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function formatAmount(value) {
  return String(Math.round(numberValue(value, 0) * 1e6) / 1e6);
}

function stableHex(input, length) {
  let hash = 0;
  for (let index = 0; index < input.length; index += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(index);
    hash |= 0;
  }
  const seed = Math.abs(hash).toString(16).padStart(8, "0");
  return seed.repeat(Math.ceil(length / seed.length)).slice(0, length);
}
