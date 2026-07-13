export const kiteTreasurySchema = {
  schemaName: "pocket-republic.kite-treasury-envelope",
  schemaVersion: "0.1.0",
  requiredConcepts: [
    "agentPassport",
    "allowance",
    "paymentIntent",
    "paymentTrace",
    "mcpToolCall",
  ],
};

export class KiteTreasuryProvider {
  constructor(options = {}) {
    this.providerName = options.providerName ?? "KiteTreasuryProvider";
    this.network = options.network ?? "kite-testnet-or-sandbox";
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
    return new KiteMcpProvider({
      mcpUrl: options.mcpUrl ?? params.get("kite_mcp_url"),
      apiKey: options.apiKey ?? params.get("kite_api_key"),
      agentPassportId: options.agentPassportId ?? params.get("kite_agent_passport_id"),
      walletId: options.walletId ?? params.get("kite_wallet_id"),
      network: options.network ?? params.get("kite_network") ?? "kite-testnet",
    });
  }

  return new DemoKiteProvider();
}

export class DemoKiteProvider extends KiteTreasuryProvider {
  constructor() {
    super({ providerName: "DemoKiteProvider", network: "kite-sandbox" });
    this.passport = {
      agentPassportId: "kite-passport:treasurer:mira:sandbox",
      agentName: "Mira",
      agentRole: "Treasurer",
      ownerNationId: "pocket-republic:builder:001",
      walletAddress: "0xK1TE000000000000000000000000000000M1RA",
      status: "active",
      issuedAt: "2026-07-13T00:00:00.000Z",
    };
    this.allowance = {
      allowanceId: "kite-allowance:builder-republic:monthly",
      currency: "USDC",
      totalLimit: 500,
      remaining: 500,
      singleSpendLimit: 30,
      highRiskLimit: 10,
      resetWindow: "monthly",
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
    const intentId = `kite-intent:${proposal.id}:${Date.now()}`;
    return {
      intentId,
      requester: "Pocket Republic Parliament",
      agentPassportId: this.passport.agentPassportId,
      walletAddress: this.passport.walletAddress,
      requestedAmount: proposal.amount,
      approvedAmount: decision.approvedAmount,
      currency: proposal.currency,
      decisionHash,
      policy: decision.policy,
      action: decision.action,
      merchant: proposal.merchant,
      network: this.network,
    };
  }

  async executePayment(intent) {
    const hasFunds = intent.approvedAmount <= this.allowance.remaining;
    const executed = intent.approvedAmount > 0 && intent.action !== "deny" && hasFunds;
    const remainingAllowance = executed
      ? Math.max(0, this.allowance.remaining - intent.approvedAmount)
      : this.allowance.remaining;
    this.allowance.remaining = remainingAllowance;

    return {
      ledgerId: `kite-ledger:${intent.intentId.split(":").slice(-2).join(":")}`,
      status: executed ? "executed_sandbox" : hasFunds ? "blocked_by_constitution" : "blocked_by_allowance",
      txMode: "sandbox-ledger",
      txHash: executed ? `0x${stableHex(intent.intentId + intent.decisionHash, 64)}` : null,
      executedAmount: executed ? intent.approvedAmount : 0,
      currency: intent.currency,
      remainingAllowance,
      executedAt: new Date().toISOString(),
    };
  }

  async tracePayment({ proposal, decision, intent, execution }) {
    return {
      schema: kiteTreasurySchema,
      agentPassport: {
        agentPassportId: this.passport.agentPassportId,
        agentName: this.passport.agentName,
        agentRole: this.passport.agentRole,
        ownerNationId: this.passport.ownerNationId,
        walletAddress: this.passport.walletAddress,
        status: this.passport.status,
      },
      allowance: {
        allowanceId: this.allowance.allowanceId,
        totalLimit: this.allowance.totalLimit,
        singleSpendLimit: this.allowance.singleSpendLimit,
        highRiskLimit: this.allowance.highRiskLimit,
        remainingAfterExecution: execution.remainingAllowance,
        currency: this.allowance.currency,
        policySource: this.allowance.policySource,
      },
      paymentIntent: intent,
      paymentTrace: {
        ledgerId: execution.ledgerId,
        status: execution.status,
        txMode: execution.txMode,
        txHash: execution.txHash,
        requestedAmount: proposal.amount,
        approvedAmount: decision.approvedAmount,
        currency: proposal.currency,
        triggeredArticles: decision.triggeredArticles,
        vote: decision.vote,
        finalAction: decision.action,
        override: decision.action === "override_execute",
        previousDecisionHash: decision.previousDecisionHash ?? null,
      },
      mcpToolCall: {
        server: "kite-agent-passport-mcp",
        tool: "treasury.executeGovernedPayment",
        arguments: {
          agentPassportId: this.passport.agentPassportId,
          allowanceId: this.allowance.allowanceId,
          proposalId: proposal.id,
          decisionHash: decision.decisionHash,
          approvedAmount: decision.approvedAmount,
          currency: proposal.currency,
          override: decision.action === "override_execute",
          previousDecisionHash: decision.previousDecisionHash ?? null,
        },
        result: {
          ledgerId: execution.ledgerId,
          status: execution.status,
        },
      },
    };
  }
}

export class KiteMcpProvider extends KiteTreasuryProvider {
  constructor(options = {}) {
    super({ providerName: "KiteMcpProvider", network: options.network ?? "kite-testnet" });
    this.mcpUrl = options.mcpUrl ?? "";
    this.apiKey = options.apiKey ?? "";
    this.agentPassportId = options.agentPassportId ?? "";
    this.walletId = options.walletId ?? "";
  }

  assertConfigured() {
    const missing = [];
    if (!this.mcpUrl) missing.push("KITE_MCP_URL");
    if (!this.apiKey) missing.push("KITE_API_KEY");
    if (!this.agentPassportId) missing.push("KITE_AGENT_PASSPORT_ID");
    if (!this.walletId) missing.push("KITE_WALLET_ID");

    if (missing.length > 0) {
      throw new Error(`Kite MCP provider is not configured. Missing: ${missing.join(", ")}`);
    }
  }

  async getAgentPassport() {
    this.assertConfigured();
    return this.callMcp("agentPassport.get", {
      agentPassportId: this.agentPassportId,
      walletId: this.walletId,
      network: this.network,
    });
  }

  async getAllowance() {
    this.assertConfigured();
    return this.callMcp("allowance.get", {
      agentPassportId: this.agentPassportId,
      walletId: this.walletId,
      network: this.network,
    });
  }

  async createPaymentIntent({ proposal, decision, decisionHash }) {
    this.assertConfigured();
    return this.callMcp("treasury.createPaymentIntent", {
      agentPassportId: this.agentPassportId,
      walletId: this.walletId,
      proposalId: proposal.id,
      requestedAmount: proposal.amount,
      approvedAmount: decision.approvedAmount,
      currency: proposal.currency,
      merchant: proposal.merchant,
      action: decision.action,
      policy: decision.policy,
      decisionHash,
      network: this.network,
    });
  }

  async executePayment(intent) {
    this.assertConfigured();
    return this.callMcp("treasury.executeGovernedPayment", {
      agentPassportId: this.agentPassportId,
      walletId: this.walletId,
      paymentIntent: intent,
      network: this.network,
    });
  }

  async tracePayment({ proposal, decision, intent, execution }) {
    this.assertConfigured();
    return this.callMcp("treasury.tracePayment", {
      schema: kiteTreasurySchema,
      agentPassportId: this.agentPassportId,
      walletId: this.walletId,
      proposal,
      decision,
      paymentIntent: intent,
      execution,
      network: this.network,
    });
  }

  async callMcp(tool, payload) {
    const response = await fetch(this.mcpUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        server: "kite-agent-passport-mcp",
        tool,
        arguments: payload,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Kite MCP ${tool} failed: ${response.status} ${errorText}`);
    }

    return response.json();
  }
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
