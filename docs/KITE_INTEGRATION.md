# Kite Integration Notes

当前状态：默认使用 `DemoKiteProvider`，页面稳定可演示。  
真实接入边界：`adapters/kite-provider.js` 中的 `KiteMcpProvider`。

---

## Provider Interface

业务层只依赖这 5 个方法：

```js
getAgentPassport()
getAllowance()
createPaymentIntent()
executePayment()
tracePayment()
```

所以真实 Kite 接入只需要替换 provider，不需要重写页面和 policy engine。

---

## Demo Provider

默认：

```js
const provider = createKiteProvider();
```

不带参数时使用：

```js
DemoKiteProvider
```

它会生成：

- `agentPassport`
- `allowance`
- `paymentIntent`
- `paymentTrace`
- `mcpToolCall`

---

## Kite MCP Provider Stub

可以通过 URL query 切换到 Kite provider：

```text
http://localhost:5180/?provider=kite&kite_mcp_url=...&kite_api_key=...&kite_agent_passport_id=...&kite_wallet_id=...
```

当前 stub 会向 `KITE_MCP_URL` 发送：

```json
{
  "server": "kite-agent-passport-mcp",
  "tool": "treasury.executeGovernedPayment",
  "arguments": {}
}
```

实际字段应根据 Kite 官方 SDK / MCP server 文档调整，但业务层不会变。

已实现的 MCP tool 名称占位：

```text
agentPassport.get
allowance.get
treasury.createPaymentIntent
treasury.executeGovernedPayment
treasury.tracePayment
```

这些名称用于表达接入边界。拿到 Kite 官方字段后，只需要在 `KiteMcpProvider.callMcp()` 以及各方法 payload 中对齐真实 schema。

---

## Environment Variables

See [.env.example](../.env.example):

```bash
KITE_PROVIDER=demo
KITE_MCP_URL=
KITE_API_KEY=
KITE_AGENT_PASSPORT_ID=
KITE_WALLET_ID=
KITE_NETWORK=kite-testnet
```

安全说明：

- 黑客松静态页面不要直接放生产密钥。
- 真实上线建议通过本地后端或 serverless proxy 调 Kite MCP。
- 前端只保留 `traceId`、`ledgerId`、`decisionHash` 等可公开记录。

---

## Audit Features Already Implemented

- 国家公报 shows the full Kite-style envelope.
- “下载支付凭证” exports the latest trace.
- Gazette history is stored in `localStorage`.
- `decisionHash` is generated with SHA-256 through browser Web Crypto when available.
- “召集国民议会” writes a normal gazette entry only after user action.
- “行使 A6 立宪者权利” creates an audited user-sovereignty trace with `override: true`.
- Override traces preserve `previousDecisionHash`, so the original AI council decision remains inspectable.
- The 国家公报 view exposes the Agent Passport, allowance, ledger ID, decision hash, and raw Kite-style trace.
- The 财政议案 view renders the governed payment pipeline as an interactive product workflow.
- `node scripts/verify-kite-envelope.mjs` verifies the provider envelope without opening the UI.
