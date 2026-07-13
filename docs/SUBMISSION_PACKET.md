# Submission Packet

项目名：Pocket Republic  
赛道：Kite / Agent Wallet Governance  
一句话：给 AI Agent 花钱前加一部个人宪法。

---

## Short Description

Pocket Republic is a constitutional wallet layer for AI agents. Users define a personal constitution, agent citizens review every spending request, and the Kite treasury executes only what passes governance while producing an auditable payment trace.

中文：

Pocket Republic 是 AI Agent 的宪法国库。Agent 想花钱时，请求先进入财政议案，再由个人宪法、Agent 国民议会和 Kite 国库共同决定批准、限额、冷静期或用户主权操作。

---

## Problem

AI agents are gaining the ability to buy APIs, subscribe to tools, pay services, and eventually move real money. Wallet confirmation alone is too thin for this future. Users need a way to define what agents are allowed to do before payment execution.

---

## Solution

Pocket Republic turns every agent payment into a governed proposal:

1. Agent submits a spending request.
2. The request enters 财政议案 as a national proposal.
3. The personal constitution checks limits, risk signals, and cooling-period rules.
4. Agent citizens provide role-based review: auditor, treasurer, opposition, archivist.
5. Kite Treasury creates a payment intent and trace envelope.
6. 国家公报 records requester, approved amount, ledger id, decision hash, and user-sovereignty status.

---

## Kite Fit

This is not a generic multi-agent chat demo. It is a governance layer before Kite wallet execution.

Kite-facing concepts implemented in the MVP:

- `agentPassport`: identity for the treasurer agent.
- `allowance`: owner-authorized spend limits.
- `paymentIntent`: governed payment request.
- `paymentTrace`: execution receipt with decision data.
- `mcpToolCall`: adapter boundary for Kite MCP server calls.

The project includes both:

- `DemoKiteProvider` for stable hackathon demo.
- `KiteMcpProvider` stub for real Kite MCP / SDK wiring.

---

## Demo Flow

Recommended URL:

```text
http://localhost:5180/
```

The product demo follows this user-driven flow:

1. Create a personal nation and define its mission and budgets.
2. Edit the personal constitution that binds Agent citizens.
3. Select the 300 USDC high-risk AI meme coin proposal.
4. Convene the citizen council and reduce the payment to 10 USDC.
5. Open 国家公报 to inspect the Kite-style trace and decision hash.
6. Optionally invoke user sovereignty to create an audited override record.

---

## Technical Proof

Run:

```bash
node scripts/verify-kite-envelope.mjs
```

Expected proof:

- Kite-facing schema concepts exist.
- Agent Passport exists.
- Allowance covers the demo.
- Review trace reduces high-risk spend.
- Override trace carries `override: true`.
- Override trace preserves `previousDecisionHash`.
- MCP arguments carry the override flag.

---

## Why It Can Become A Product

Initial wedge:

- Agent spending inbox
- Personal constitution
- Kite wallet allowance control
- Public audit trail

Expansion:

- Pro personal treasury
- Team / DAO treasury
- Agent citizen marketplace
- Spending policy SDK for other agent products
- Gazette archive and compliance export

Business model:

- Pro subscription for advanced policies and long-term archives.
- Team tier for multi-user treasury approvals.
- Marketplace take rate on paid agent citizens and tool purchases.
- SDK pricing for agent platforms that need payment governance.

---

## What Is Deliberately Out Of Scope

The world can later expand into Studio, Sanctuary, Academy, Embassy, and Gadget Shop, but the hackathon MVP stays narrow:

> Agent payment request -> constitution review -> Kite treasury execution -> auditable payment trace.

This keeps the demo focused on Kite rather than becoming a broad multi-agent toy.
