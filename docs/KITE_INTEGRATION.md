# Kite Agent Passport 真实接入说明

更新：2026-07-15
实现：Kite Passport CLI + Scoped Spending Session + x402 Preflight + Receipt

## 1. 当前真实性结论

项目已经接入 Kite 官方 CLI 边界，并验证：

- `kpass 1.8.0` 可以连接 `passport.prod.gokite.ai`。
- `ksearch 1.0.6` 可以连接 Kite 服务发现后端。
- 页面真实模式可以读取 backend、user、agent、session 状态。
- 本地桥接可以注册 Agent、预检 x402 报价、创建 Delegation、请求 Session、选择 Session、执行 x402、读取 Session 历史与 Receipt。

仍需用户本人完成：

- 邮箱注册或登录。
- Dashboard Passkey。
- Passport Wallet 资金。
- Passkey 批准 Session。
- 第一笔真实 x402 结算。

在这些步骤完成前，项目不会展示伪造的 tx hash。

## 2. 为什么不用旧 MCP Stub

旧版本曾使用下面这类占位工具名：

```text
allowance.get
treasury.createPaymentIntent
treasury.executeGovernedPayment
```

它们不是当前官方 CLI Reference 里的真实命令，现已全部移除。

当前官方路径是：

```text
kpass agent:register
kpass agent:session create --delegation
kpass agent:session status
kpass agent:session use
kpass agent:session execute
kpass user sessions
```

## 3. 安装

官方安装命令：

```bash
curl -fsSL https://agentpassport.ai/install.sh | bash
```

项目服务器按顺序寻找：

1. `KITE_KPASS_PATH` / `KITE_KSEARCH_PATH`
2. `.kite-tools/bin/`
3. `~/.kpass/bin/`
4. `~/.local/bin/`

检查版本与后端：

```bash
kpass --version
ksearch --version
kpass health --output json
ksearch health --output json
```

## 4. 登录与 Passkey

新用户：

```bash
kpass signup init --email you@example.com --output json --no-interactive
kpass signup exchange --signup-id <id> --code <code> --output json --no-interactive
```

已有用户：

```bash
kpass login init --email you@example.com --output json --no-interactive
kpass login verify --login-id <id> --code <code> --output json --no-interactive
```

邮箱 code 和 Passkey 都必须由用户本人处理。不要把 code、JWT 或本地 `.kpass` 目录提交到 Git。

确认状态：

```bash
kpass status --output json --no-interactive
kpass wallet balance --output json
```

## 5. Pocket Republic 如何生成 Delegation

宪法与议案被转换为：

```json
{
  "task": {
    "summary": "为购买一封云外市场晨报执行一次经宪法批准的服务采购"
  },
  "payment_policy": {
    "assets": ["USDC"],
    "max_amount_per_tx": "3",
    "max_total_amount": "3",
    "ttl_seconds": 3600
  },
  "execution_constraints": {
    "x402_http": {
      "scope_mode": "scoped",
      "allowed_endpoints": [
        {
          "method": "POST",
          "host": "stablecrypto.dev",
          "path_prefix": "/api/coingecko/global"
        }
      ]
    }
  }
}
```

对应关系：

- A2 单笔限额限制 `max_amount_per_tx`。
- 议会批准金额限制 `max_total_amount`。
- 一小时国库风门对应 `ttl_seconds: 3600`。
- x402 服务地址变成 endpoint scope。
- 建立 Session 前先对服务发起无签名请求，解析 `payment-required` 中的 Base USDC 合约、原始金额与小数精度。
- x402 合约地址用于验证报价和 Receipt；Kite Spending Session 按官方 CLI 约定使用 `USDC` 资产符号。
- 预检报价必须不高于议会批准上限；否则不创建 Session。
- 议会批准额和 x402 实际成交额分开记录。

## 6. 本地桥接 API

`server.mjs` 提供：

| API | 官方 CLI |
| --- | --- |
| `GET /api/kite/status` | `kpass status` + wallet + sessions |
| `GET /api/kite/services` | `ksearch services list` |
| `GET /api/kite/activity` | `kpass user sessions` + execute receipt |
| `POST /api/kite/preflight` | 无签名 x402 `payment-required` 预检 |
| `POST /api/kite/agent/register` | `kpass agent:register` |
| `POST /api/kite/session/create` | `kpass agent:session create --delegation` |
| `POST /api/kite/session/status` | `kpass agent:session status` |
| `POST /api/kite/session/use` | `kpass agent:session use` |
| `POST /api/kite/session/execute` | `kpass agent:session execute` |

浏览器不接触 CLI 凭证，只读取标准化 JSON。

## 7. 一笔支付的状态机

```text
unauthenticated
  -> agent_unregistered
  -> x402_quote_verified
  -> session_pending
  -> session_active
  -> settling
  -> service_delivered_receipt_pending
  -> settled_onchain
```

失败状态不会被吞掉：

- 没有 service URL：只做宪法预审，不执行。
- 没登录：`KITE_AUTH_REQUIRED`。
- x402 报价超过宪法批准额：不创建 Session。
- 资产精度无法可靠判定：拒绝授权，不猜 token decimals。
- Session 未批：显示“国玺待盖”。
- 目标服务失败：保留议会结论，支付标记未执行。
- 无 settlement reference：只显示“服务已交付”，不写“链上已结算”。

## 8. 安全设计

- `spawn(binary, args, { shell: false })`。
- 不拼接 shell 命令。
- 请求体最大 64 KB。
- CLI 输出最大 2 MB。
- 普通命令 30 秒超时；支付命令 5 分钟超时。
- x402 URL 仅允许 HTTPS。
- 默认只允许项目已验证的 Kite 目录服务与官方测试服务；可用 `KITE_ALLOWED_HOSTS` 显式扩展。
- 预检要求 HTTP 402，不跟随重定向，15 秒超时。
- 阻止 localhost、环回、私网、link-local 和 multicast 地址。
- CSP 限制网页只连接同源桥接。
- `.kpass/`、`.kite-passport/`、`.kite-tools/` 均不进入 Git。
- `.vercelignore` 会在部署构建时排除上述目录、`server.mjs`、测试与内部文档，避免“Git 忽略了但 Vercel 仍打包”。

## 9. 沙盒与真实证明

沙盒：

```json
{
  "proofType": "sandbox_receipt",
  "isOnchain": false,
  "warning": "此记录仅用于产品推演，不是 Kite 链上交易。"
}
```

真实模式只有在官方结果携带 settlement reference / transaction hash 时才设置：

```json
{
  "proofType": "kite_onchain_receipt",
  "isOnchain": true
}
```

## 10. 评委演示建议

稳定录屏使用两段：

1. Vercel 沙盒展示完整产品与宪法治理。
2. 本地真实模式展示 `kpass status`、Session approval 和 x402 receipt。

如果现场账户或余额未准备好，诚实展示生产后端已连接、状态为未登录，并运行自动化测试；不要把沙盒 hash 当成 testnet tx。

## 11. 官方文档

- https://docs.gokite.ai/kite-agent-passport
- https://docs.gokite.ai/kite-agent-passport/cli-reference
- https://docs.gokite.ai/kite-agent-passport/service-provider-guide
