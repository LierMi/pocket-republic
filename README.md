# Pocket Republic

Pocket Republic is a personal nation governed by AI agents. Users create a small AI nation, write a personal constitution, activate agent citizens, and let the Kite treasury execute only the spending proposals that pass governance.

中文一句话：口袋共和国：由 AI Agent 治理的个人国度。

**Live Demo:** https://pocket-republic.vercel.app

## Why This Fits Kite

This MVP focuses on the wallet side of Pocket Republic:

- **Kite Agent Passport** becomes an agent citizen identity.
- **Kite Wallet / Allowance** becomes the national treasury.
- **Kite Payment** becomes a governed fiscal action.
- **Kite Payment Trace** becomes a public gazette receipt.
- **Kite MCP server** is represented through an adapter envelope that can be replaced with the real server call.

The important distinction: Pocket Republic is not a generic multi-agent chatroom. It is a personal governance layer before AI agents act or spend money.

## Demo Flow

1. Open the Pocket Republic entry screen.
2. Click **开始建国** and choose a nation template.
3. Edit the user model: mission, monthly allowance, single-spend limit, and high-risk limit.
4. Open **个人宪法** to inspect or edit the generated constitution.
5. Open **财政议案**, submit a spending proposal, or choose a preset case.
6. Run treasury review: agent citizens debate, vote, and apply the constitution.
7. Open **国家公报** to see the Kite-style payment trace and gazette history.
8. Optionally use **推翻议会决策 (A6)** to show user sovereignty with an audited override receipt.

The default demo shows a 300 USDC high-risk meme coin proposal being reduced to 10 USDC with a cooling period. If the user invokes A6, the treasury pays only the outstanding remainder while preserving the previous decision hash and both ledger records.

## Run Locally

This is a static app with no package install.

```bash
cd pocket-republic
python3 -m http.server 5180
```

Open:

```text
http://localhost:5180
```

## Project Structure

```text
pocket-republic/
  index.html
  styles.css
  app.js
  governance.js
  adapters/
    kite-provider.js
  assets/
    nation-map.svg
    UI_ASSET_BRIEF.md
```

## UI Asset Slots

The page now uses a full-stage personal nation workspace instead of the former permanent three-column shell. Every visual entry point has a visible `ART-XX` placeholder and a precise handoff brief:

```text
assets/UI_ASSET_BRIEF.md
```

Current slots:

- `ART-00` opening fantasy nation panorama
- `ART-01` founding territory
- `ART-02` seven Agent citizens group portrait
- `ART-03` constitution hall
- `ART-04` Kite treasury and parliament chamber
- `ART-05` complete personal nation map
- `ART-06` gazette seal and archive ornament

The visual system is intentionally original. It uses surreal-utopia, dreamland, fantasy-nation, and theatrical digital-circus qualities without reproducing protected characters or scene designs.

## Interaction Layer

`effects.js` adds a zero-dependency visual layer:

- Procedural WebGL color reveal on the opening screen
- Organic iris transition into the nation
- View transitions tied to the five product destinations
- Pointer-position button ripples
- Magnetic desktop buttons and subtle Agent passport tilt
- Interactive nation-map hotspots
- Reduced-motion and no-WebGL fallbacks

## Execution Docs

Use these files for the two-person workflow:

```text
docs/UI_HANDOFF.md
docs/DEMO_SCRIPT.md
docs/SUBMISSION_CHECKLIST.md
docs/WORLD_BIBLE.md
docs/KITE_INTEGRATION.md
docs/SUBMISSION_PACKET.md
```

- `UI_HANDOFF.md` explains the page logic and image slots for the UI pass.
- `DEMO_SCRIPT.md` is the 3-minute recording script.
- `SUBMISSION_CHECKLIST.md` is the final anti-PPT-project checklist.
- `WORLD_BIBLE.md` defines the pocket-nation worldbuilding, future departments, and monetization gates.
- `KITE_INTEGRATION.md` documents the real Kite MCP provider boundary.
- `SUBMISSION_PACKET.md` is a copy-ready project description for hackathon submission.

## Technical Verification

Run the static provider-envelope check:

```bash
node scripts/verify-kite-envelope.mjs
```

Run the product structure and effects checks:

```bash
node scripts/verify-product-structure.mjs
node scripts/verify-effects-module.mjs
node scripts/verify-governance-logic.mjs
```

This verifies that the demo provider preserves the Kite-facing contract: Agent Passport, Allowance, Payment Intent, Payment Trace, MCP Tool Call, and audited override fields.

## Kite Adapter Boundary

The app uses `DemoKiteProvider` by default. The provider exposes the same product concepts that the real Kite integration should supply:

```js
getAgentPassport()
getAllowance()
createPaymentIntent()
executePayment()
tracePayment()
```

The current envelope intentionally keeps the Kite-facing data isolated in `adapters/kite-provider.js`:

```js
{
  agentPassport: {
    agentPassportId,
    agentName,
    agentRole,
    ownerNationId,
    walletAddress,
    status
  },
  allowance: {
    allowanceId,
    totalLimit,
    singleSpendLimit,
    highRiskLimit,
    remainingAfterExecution,
    currency,
    policySource
  },
  paymentIntent,
  paymentTrace,
  mcpToolCall
}
```

When Kite official SDK or MCP credentials are available, replace only the provider implementation:

```js
// app.js
// import { KiteMcpProvider } from "./adapters/kite-provider.js";
// const provider = new KiteMcpProvider({ apiKey, mcpUrl, agentPassportId, walletId });
```

The constitutional decision engine, parliament UI, and public gazette do not need to change.

There is now a `KiteMcpProvider` stub in [adapters/kite-provider.js](./adapters/kite-provider.js). See:

```text
.env.example
docs/KITE_INTEGRATION.md
```

## Hackathon Scope

P0 is intentionally narrow:

- One personal constitution
- One agent treasury
- One personal nation setup flow
- Four nation templates
- Seven Agent citizen passport cards
- One fiscal proposal workflow with three preset requests and custom input
- Governed payment decision
- A6 user override path with audit record
- Kite-style trace envelope
- Public gazette receipt
- Downloadable payment trace JSON
- Local gazette history in the browser
- SHA-256 decision hash generated with Web Crypto when available

Future departments such as Studio, Sanctuary, Academy, Embassy, and Archive are represented in the 国家地图 tab, but the hackathon build only executes the Kite treasury workflow.

## Worldbuilding

The inspiration is a pocket-sized imaginary nation: playful, accessible, and full of small "gadget-like" departments. The product avoids using any protected character or visual IP. The worldbuilding is documented in:

```text
docs/WORLD_BIBLE.md
```

The rule of thumb:

> Playfulness gets users into the pocket nation. Kite treasury makes it a real product.

## Technical Proof Points

The implementation exposes these verifiable integration points:

- `DemoKiteProvider` keeps the hackathon demo stable.
- `KiteMcpProvider` is a real integration boundary for Kite MCP / SDK wiring.
- `.env.example` lists the expected Kite runtime fields.
- Trace JSON can be downloaded from the 国家公报 tab.
- Gazette history is saved in localStorage as a lightweight audit log.
- Review progress shows the payment-governance pipeline instead of a static screen.
- Override decisions include `override: true` and `previousDecisionHash` for auditability.
- `scripts/verify-kite-envelope.mjs` provides a runnable contract check.
- Decision hashes use browser SHA-256 via Web Crypto, with a deterministic fallback.

## Pitch

AI agents will soon buy APIs, subscribe to tools, pay other agents, and move money on behalf of humans. Payment rails are not enough. Users need a way to define what agents are allowed to do.

Pocket Republic turns the Kite wallet into a governed national treasury. Every payment becomes a proposal, every proposal is checked against the user's constitution, and every execution leaves a trace.
