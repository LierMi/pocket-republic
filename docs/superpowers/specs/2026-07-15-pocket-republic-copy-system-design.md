# Pocket Republic 全站文案系统改版

日期：2026-07-15

## 1. 目标

第一屏必须在 5 秒内说清楚三件事：

1. 产品名叫 `Pocket Republic / 口袋共和国`。
2. 它是一个由 AI Agent 国民组成的个人 AI 国度，不是多 Agent 聊天室。
3. 用户作为立宪者，用宪法约束 Agent 代表自己行动与花钱。

奇幻感继续由色彩、图像、动效和国家隐喻承担，不再用“土地升空”等无产品含义的抽象文字承担信息。

## 2. Hero 最终文案

- 品牌：`Pocket Republic / 口袋共和国`
- 赛道标签：`Kite AI Track · Agent Wallet & Payment Governance`
- 主标题：`建立你的个人 AI 国度`
- 一句话定义：`不只是多 Agent 聊天室，而是代表你行动与花钱的个人治理层。`
- 核心说明：`你将作为“立宪者”制定个人宪法，组建不同职业的 AI Agent 国民内阁。它们不仅协助你共创项目，更在宪法与议会审议下，治理你的预算与链上行动。`
- 主 CTA：`创建我的口袋国度`
- 次 CTA：`提交一笔财政议案`，附属小字 `试玩 Demo`
- 四步流程：`选择国家模板 → 颁布个人宪法 → 激活 Agent 国民 → 审议财政与支付`

Hero 内增加一个独立 Kite 技术说明：

> 基于 Kite AI 构建 Agent 经济主权：Agent Passport 提供可验证身份，Spending Session 定义所有者授权额度，x402 支付与 Receipt 把每次行动写入可追溯记录。

## 3. 双入口行为

- “创建我的口袋国度”进入建国流程。
- “提交一笔财政议案”直接进入财政议案页，默认选中 `300 USDC 高风险 Meme 币` 案例。
- 次入口只缩短体验路径，不自动运行、不自动支付、不伪造评委演示。

## 4. 快速理解锚点

在 Hero 下方以一行紧凑说明展示：

> 核心演示：当你申请花 300 USDC 购买高风险 Meme 币，AI 财政大臣与审计官将根据宪法第 3 条，把支付上限缩减为 10 USDC，并冻结其余 290 USDC。

## 5. 全站语言系统

删除或重写：

- 尚未升空的土地
- 让国度升空
- 国家种子
- 无产品含义的“一阵风”等支付隐喻
- 将 Agent 称为助手、机器人或聊天角色

统一使用：

- Pocket Republic / 口袋共和国
- 个人 AI 国度
- Agent 国民 / Agent 国民内阁
- 立宪者 / 个人宪法
- 议会审议
- 国家国库 / Kite Treasury
- 所有者授权额度
- 国家公报 / Gazette
- 概念版图 / Roadmap v0.2

## 6. 概念部门反穿帮

心灵花园、学院、外交邮局和道具铺保留在地图，点击后显示：

- 状态：`概念版图 · Roadmap v0.2`
- 说明：`当前 Hackathon 版本优先开放 Kite 国库钱包治理与议会审议链路。本部门将在后续版本接入 Kite MCP 与可验证推理基础设施。`
- 当前已实现的国库不显示 Roadmap 锁。
- 不宣称已接入 0G TEE 或 Kite MCP。

## 7. 国家公报终端块

公报底部新增等宽字体凭证块，数据必须来自当前执行对象，不写死。

沙盒模式：

```text
[SANDBOX] DECISION TRACE: sandbox-ledger:...
[AGENT] Treasurer#Mira · Reputation 92
[POLICY] Article 3 · High-Risk Cap Activated
[ALLOWANCE] 10.00 USDC approved · 290.00 USDC frozen
[PROOF] Demonstration only · Not on-chain
```

真实 Kite 模式只有在官方返回对应字段时才显示：

```text
[KITE] SETTLEMENT REFERENCE: <official reference>
[AGENT PASSPORT] <official agent id>
[SESSION] <official session id>
[POLICY] <triggered constitution articles>
[PAID] <actual x402 amount and asset>
```

## 8. 验收条件

1. 页面展开后第一视口同时出现中英文品牌、个人 AI 国度定义和双 CTA。
2. 全局搜索不再出现“尚未升空”“让我的国度升空”“国家种子”。
3. 主 CTA 进入建国，次 CTA 进入 Meme 币议案预审。
4. 概念部门明确显示 Roadmap，不伪装成已实现功能。
5. 沙盒凭证不使用伪 Kite transaction hash；真实凭证只显示官方返回的引用。
6. 桌面、390px 和 320px 视口无横向溢出，双 CTA 文字完整可见。
