# Pocket Republic 云上王国与 Kite 真实接入设计

日期：2026-07-15
目标赛道：Make It Agent-Payable / Kite AI

## 1. 产品命题

Pocket Republic 不是一个多 Agent 聊天室，也不是一个披着童话外壳的钱包面板。

它是一座由用户亲手立宪的个人云上国度。用户保留主权，Agent 作为国民拥有不同职责和可验证身份；当 Agent 需要花钱购买 API、数据、算力或服务时，必须先通过个人宪法，再在用户批准的 Kite Spending Session 内行动。每一次支付最终回到可验证的国家公报。

核心句：

> 当 AI 开始替你花钱，它需要的不只是一只钱包，而是一部宪法。

## 2. 双层叙事

产品同时保留两套语言，并始终一一对应。

| 云上王国 | 技术事实 |
| --- | --- |
| 立宪者 | Kite Passport 账户所有者 |
| Agent 国民护照 | Agent Passport / Agent DID |
| 国库 | Passport Wallet |
| 国库风门 | Approved Spending Session |
| 宪法财政条款 | Delegation payment policy |
| 拨款议案 | Agent payment request |
| 外交采购 | x402 HTTP service payment |
| 国家公报 | Kite activity event / payment receipt |
| 星轨凭证 | Transaction hash / settlement reference |
| 冷静云层 | Policy rejection or unapproved remainder |

文学标签不能隐藏协议事实。关键状态下必须同时显示 Kite 原始概念与真实值。

## 3. 核心旅程

### 第一幕：一块尚未升空的土地

开屏以云海和未完成的国度为主视觉。用户不是“进入 Dashboard”，而是“让我的国度升空”。

### 第二幕：写下这片土地要保护什么

用户选择国家性格、写国家使命、设置月度预算、单笔限额和高风险限额。系统生成可编辑的个人宪法。

### 第三幕：授予国民有限的权力

财政大臣对应真实 Kite Agent；用户创建一个有总额、单笔、时限、资产和 endpoint scope 的 Session。Passkey 是立宪者的国玺，批准一次后 Agent 可在边界内自主行动。

### 第四幕：一次真实的外交采购

建设部长为项目提出“购买一封云外市场晨报”的议案。议会按宪法审查。通过后，财政大臣先预检 x402 报价，再使用 Kite Passport 向目录服务付款并取得结果。

### 第五幕：风经过，账留下

国家公报保存议案、触发条款、Agent 身份、Session、支付金额、服务响应和链上 receipt。用户可以追溯 payment -> session -> agent -> owner。

## 4. MVP 范围

必须完成：

1. 用户可以创建国家并编辑宪法。
2. 宪法条款真实影响支付审查结果。
3. 演示模式在没有 Kite 账户时完整可用，但明确标为“沙盒推演”。
4. 本地真实模式通过官方 `kpass` / `ksearch` CLI 连接 Kite Passport。
5. 能显示 Passport 后端、登录、Agent、Session 和钱包状态。
6. 能创建 scoped delegation，等待 Passkey 批准，并执行 x402 请求。
7. 能读取 activity，显示真实支付 receipt / transaction hash。
8. 任何真实失败都以明确状态呈现，绝不回退成伪造的链上成功。

不在本次强做：

- 心理部、学院、创作部的完整 Agent 能力。
- 主网大额支付。
- 多人国家或 DAO。
- 浏览器内保存 Kite JWT 或 Passkey。

## 5. 技术架构

### 浏览器层

- `DemoKiteProvider`：纯本地沙盒，有清晰 `sandbox` 标识。
- `KitePassportBridgeProvider`：调用同源 `/api/kite/*`，只消费标准化结果。
- UI 状态机：`sandbox`、`offline`、`unauthenticated`、`agent_unregistered`、`session_pending`、`session_active`、`settling`、`settled`、`error`。

### 本地桥接层

Node 内置 HTTP 服务，静态托管页面并把有限 API 映射到官方 CLI：

- `GET /api/kite/status`
- `GET /api/kite/services`
- `GET /api/kite/activity`
- `POST /api/kite/agent/register`
- `POST /api/kite/session/create`
- `POST /api/kite/session/status`
- `POST /api/kite/session/use`
- `POST /api/kite/session/execute`

安全要求：

- 使用 `spawn` 参数数组，不拼接 shell 字符串。
- 只允许 HTTPS 目标；阻止 localhost、私网和 link-local 地址。
- 参数类型、金额、TTL、method 和 URL 均做白名单验证。
- 不向浏览器返回 JWT、OTP、Passkey 或本地配置内容。
- CLI 超时，输出大小受限。
- 真实请求失败时返回结构化错误。

### 部署层

Vercel 公网页面继续提供完整沙盒产品体验。由于 Passport CLI 的凭证和 Passkey 属于本机用户，真实模式默认由本地桥接服务运行。README 明确说明这不是“生产环境已托管用户私钥”，而是安全边界设计。

## 6. Kite 真实对象

### Agent

使用 `kpass agent:register --type pocket-republic-treasurer` 注册。Agent ID 回填财政大臣护照。

### Delegation / Session

由宪法和目标服务共同生成：

```json
{
  "task": { "summary": "为当前项目购买一封云外市场晨报" },
  "payment_policy": {
    "assets": ["USDC"],
    "max_amount_per_tx": "1",
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

### Payment / Receipt

支付使用 `kpass agent:session execute`。成功判断依据是目标服务 2xx、支付使用量变化和返回的 payment receipt / settlement reference；不使用可能有缓存的钱包余额冒充支付确认。

## 7. 视觉与交互

主视觉从高饱和马戏团改为“云上童话中的严肃制度”。

- 70% 云上乐土：云海、漂浮草地、日光、镜面湖、风、远方建筑。
- 20% 超现实童趣：比例异常的门、会呼吸的云、悬浮果实、软质建筑。
- 10% 数字舞台：WebGL 流体、光标扰动、章节切换、支付时的星轨。

色彩避免单一蓝白：深夜墨色、云白、天空青、薄荷绿、珊瑚红、国玺金共同构成系统。

风险越高，天气越沉；议案通过，云层打开；支付结算，星轨从国库飞向外交邮局；公报生成，轨迹凝成可点击凭证。

## 8. 商业闭环

1. 免费层：一个国家、基础宪法、沙盒治理。
2. 个人订阅：高级宪法模板、长期预算、跨设备公报、更多 Agent 国民。
3. Agent / 服务市场：专业 Agent、API、数据和工作流按次付费，平台抽取交易服务费。
4. 团队版：创作者工作室、小团队和家庭共享国库，提供角色权限和审计。
5. 基础设施：向其他 Agent 产品提供 Constitution-as-Policy SDK，所有支出先过 Pocket Republic 规则层。

复利来自：国民越多，服务需求越多；服务越多，国家越有用；每次行为又沉淀成更好的个人政策与信誉记录。

## 9. 诚实演示原则

- `sandbox-ledger` 永远显示“沙盒”，不显示为 testnet tx。
- 只有 CLI 返回 settlement reference 时才显示“链上已结算”。
- 未登录时显示“需要立宪者完成 Passport 登录”，不显示假 Passport ID。
- 未完成 Passkey 批准时显示“国玺待盖”，不允许执行支付。
- Vercel 不宣称托管真实 Kite 凭证。

## 10. 验收标准

- 旧的伪 MCP 工具名全部移除。
- Provider 与官方 Agent / Session / Delegation / x402 Receipt 模型一致。
- 沙盒和真实模式状态视觉可辨。
- 三类议案都能走完审查，且宪法修改会改变结果。
- 本地桥接对恶意 URL、非法金额、超时和未登录有测试。
- 桌面与移动端无重叠，WebGL 非空，`prefers-reduced-motion` 可用。
- README 给出从安装、登录、注册 Agent、批准 Session 到 x402 支付的真实步骤。
