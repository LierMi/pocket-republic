# Pocket Republic / 口袋共和国

> 当 AI 开始替你花钱，它需要的不只是一只钱包，而是一部宪法。

Pocket Republic 是一座由用户立宪、由 AI Agent 国民协作治理的个人云上国度。用户保留主权，Agent 拥有不同职责；当 Agent 要购买 API、数据、算力或服务时，请求先通过个人宪法，再在用户批准的 Kite Agent Passport Spending Session 内执行，最后写入可验证的国家公报。

线上沙盒：[pocket-republic.vercel.app](https://pocket-republic.vercel.app)

## 为什么贴合 Kite

| Pocket Republic | Kite 官方机制 |
| --- | --- |
| 立宪者 | Passport account owner |
| 财政大臣护照 | Agent Passport / Agent DID |
| 国库 | Passport Wallet |
| 国库风门 | Scoped Spending Session |
| 宪法财政条款 | Delegation payment policy |
| 外交采购 | x402 HTTP payment |
| 国家公报 | Session history + x402 receipt |
| 星轨凭证 | Settlement reference / transaction hash |

Kite 让 Agent 获得可验证身份、受控钱包和支付能力。Pocket Republic 解决用户侧的下一层问题：这笔支付是否符合我的目标、预算和价值边界。

## 已实现

- 完整建国流程：四套国度与 Kite 国库宪法模板、国家名称、使命和预算。
- 可编辑个人宪法，A2-A5 会实际执行单笔限额、月度预算、强情绪拒付、学习里程碑和冷静期规则。
- 七位不同职责的 Agent 国民与强制反方意见。
- 财政议案：批准、限额、冷静期和有留痕的用户主权操作。
- 沙盒 Provider：完整可演示，所有凭证明确标记“非链上”。
- 真实 Provider：通过本地安全桥接调用 Kite 官方 `kpass` / `ksearch` CLI。
- Kite 状态机：未登录、Agent 待注册、Session 待批准、Session 生效、x402 执行、Receipt 结算。
- Scoped Delegation：金额、总额、TTL、资产、HTTP method、host 和 path 都进入 Session policy。
- 双层预算：Pocket Republic 用本地月度支出账本计算国度剩余额度，每一笔获批金额再成为 Kite Spending Session 的硬上限。
- x402 无签名预检：先读取 `payment-required` 中的网络、资产合约与真实报价，再创建授权。
- x402 示例：建设部长通过 Kite 目录中的 StableCrypto 购买一份全球市场数据。
- Session 历史、x402 Receipt 接入口、动态执行终端与国家公报 JSON 导出。
- SSRF 防护、参数白名单、CLI 超时、输出上限和安全响应头。
- 原创 WebGL 云海显色、章节切换、按钮涟漪和 reduced-motion 回退。

## 两种运行模式

### 1. 线上沙盒

直接访问 Vercel。沙盒会运行完整产品逻辑，但不会宣称发生了 Kite 链上交易。

### 2. Kite Passport 真实模式

真实模式需要官方 CLI、用户登录、Passkey 和可用余额。凭证留在本机，不放进静态网页或 Vercel 环境变量。

安装官方工具：

```bash
curl -fsSL https://agentpassport.ai/install.sh | bash
```

先检查：

```bash
kpass health --output json
ksearch health --output json
kpass status --output json --no-interactive
```

再启动本地桥接：

```bash
npm start
```

打开：

```text
http://127.0.0.1:5180/?provider=kite
```

首次使用需要本人完成：

1. 使用 `kpass signup init` / `signup exchange` 或 `kpass login init` / `login verify` 完成邮箱验证。
2. 在 Agent Passport Dashboard 创建 Passkey。
3. 为 Passport Wallet 准备可用资产。
4. 页面发起 Session 后，用 Passkey 批准范围、单笔额度、总额度和时限。
5. 再次运行议案，财政大臣会在已批准 Session 内执行 x402 请求。

完整步骤见 [KITE_INTEGRATION.md](./docs/KITE_INTEGRATION.md)。

## 真实支付路径

```text
用户使命与宪法
      ↓
Agent 提交财政议案
      ↓
Pocket Republic 规则引擎审查
      ↓
预检 x402 payment-required 与真实报价
      ↓
生成 Kite Delegation
      ↓
Passkey 批准 Spending Session
      ↓
kpass agent:session execute
      ↓
x402 服务返回结果与 Receipt
      ↓
国家公报保存 decision hash + settlement reference
```

## 安全边界

- 浏览器永远不读取 Kite JWT、OTP 或 Passkey。
- 本地桥接使用 `spawn` 参数数组，不执行 shell 拼接。
- x402 目标必须是 HTTPS 且位于服务允许名单。
- localhost、私网、link-local 和 metadata 地址会被拒绝。
- CLI 调用有超时与输出大小限制。
- `.vercelignore` 会在构建时排除 `.kite-passport/`、`.kpass/`、本地 CLI 和桥接服务，线上只发布无凭证的前端沙盒。
- 只有官方返回 settlement reference 时，页面才显示“链上已结算”。
- 钱包余额不作为支付成功的唯一证据；Receipt 与服务响应才是结算判断依据。
- 宪法批准额是上限，x402 预检报价与 Receipt 实付金额分开记录；只有 Receipt 明确返回的金额才会显示为 `Paid Amount`。
- 国度月度预算属于 Pocket Republic 应用层政策，可由用户清除本地数据后重建；Kite 负责强制执行当前 Spending Session 的金额、时限、资产与 endpoint 边界。

## 测试

```bash
npm test
```

测试覆盖：

- 产品结构与五个主流程入口
- WebGL/motion 辅助函数
- 宪法限额、FOMO 风险和 override 差额
- 沙盒与真实 Provider 合约
- Delegation schema
- x402 `payment-required` 解析、USDC 精度和真实成交额
- URL、method、金额、TTL 与 SSRF 防护

## 项目结构

```text
pocket-republic/
  index.html
  styles.css
  app.js
  effects.js
  governance.js
  server.mjs                 # Kite CLI 本地安全桥接
  adapters/
    kite-provider.js         # Sandbox + Kite Passport Provider
  scripts/
    verify-*.mjs
  assets/
    UI_ASSET_BRIEF.md
  docs/
    KITE_INTEGRATION.md
    DEMO_SCRIPT.md
    WORLD_BIBLE.md
    UI_HANDOFF.md
```

## 商业闭环

1. 免费层：一个国家、基础宪法、沙盒治理。
2. 个人订阅：高级条款、长期公报、多 Agent 国民和跨设备同步。
3. Agent / 服务市场：国民购买 API、数据、算力和工作流，平台收取交易服务费。
4. 团队版：家庭、工作室和创业团队共享国库、角色权限与审计。
5. 基础设施：向其他 Agent 产品提供 Constitution-as-Policy SDK，让所有 Agent 支出先经过规则层。

产品飞轮：更多 Agent 国民带来更多服务需求，更多可支付服务让个人国度更有用，每次行为又沉淀为更准确的政策与信誉记录。

## Hackathon Scope

本次 MVP 只把 Kite 国库做深。创作工坊已接入一条 API / x402 数据采购试验；心灵花园、学院、外交邮局和道具铺保留为 `Roadmap v0.2` 入口，不伪装成已经完成的功能。

## 官方参考

- [Kite Agent Passport](https://docs.gokite.ai/kite-agent-passport)
- [Kite Agent Passport CLI Reference](https://docs.gokite.ai/kite-agent-passport/cli-reference)
- [Kite Service Provider Guide](https://docs.gokite.ai/kite-agent-passport/service-provider-guide)
