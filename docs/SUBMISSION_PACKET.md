# Submission Packet

项目：Pocket Republic / 口袋共和国
赛道：Make It Agent-Payable / Kite AI

## One-liner

Pocket Republic is a constitutional spending layer for AI agents: users write the rules, Kite Passport grants scoped payment authority, and every x402 action becomes a traceable national record.

中文：当 AI 开始替你花钱，它需要的不只是一只钱包，而是一部宪法。

## Problem

Agents can increasingly buy APIs, data and services, but wallet confirmation is too thin for autonomous spending. Users need identity, scoped authority, policy and evidence, not a black-box assistant with unrestricted money access.

## Solution

1. User founds a personal AI nation and writes its constitution.
2. Agent citizens submit and review spending proposals.
3. Pocket Republic converts the approved policy into a Kite Delegation.
4. The owner approves a time-boxed, scoped Spending Session with a Passkey.
5. The treasurer Agent executes an x402 service purchase.
6. The public gazette records the decision hash, session, receipt and settlement reference.

## Kite Fit

- Verifiable Agent identity: Kite Agent Passport.
- Owner-authorized budget: Delegation + Scoped Spending Session.
- Stablecoin / machine payment: x402 execution through `kpass`.
- Traceability: session history, payment receipt and settlement reference.
- Agent-payable commerce: Studio and Embassy Agents purchase external APIs, data and compute.

This is not a generic multi-agent chat. Multiple Agents form an institution, and Kite turns institutional approval into controlled economic action.

## Technical Proof

- Official `kpass 1.8.0` and `ksearch 1.0.6` integration.
- Production Passport and service-discovery health checks verified.
- Local credential-safe bridge with no browser JWT exposure.
- Scoped endpoint, asset, per-tx, total budget and TTL delegation.
- x402 preflight / execute, session history and receipt endpoints.
- Explicit sandbox / real / pending / settled states.
- SSRF protection, safe process spawning, request and output limits.
- Automated tests via `npm test`.

## Demo URLs

- Public sandbox: https://pocket-republic.vercel.app
- Local real mode: `http://127.0.0.1:5180/?provider=kite`

## Commercial Model

- Personal Pro subscription for advanced constitutions, Agent citizens and long-term gazette history.
- Team tier for family, creator studio and startup treasury permissions and audit.
- Marketplace take rate on paid Agent citizens, APIs, data and workflows.
- Constitution-as-Policy SDK for other Agent products.

## Deliberate Scope

The hackathon MVP makes the treasury deep and real. Sanctuary, Studio, Academy, Embassy and Gadget Shop are product and revenue entrances, not falsely completed features.
