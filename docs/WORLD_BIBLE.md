# Pocket Republic World Bible

版本：v0.2
用途：统一世界观、产品入口和商业化叙事。  
核心原则：**云上童话让人愿意把愿望写下来，Kite 国库让被授予的权力有边界。**

---

## 1. 世界观一句话

Pocket Republic 是一座漂浮在用户日常生活上方的 AI 云上小国。

每个人心里都有一块尚未升空的土地。用户写下它要保护的愿望、预算和边界，土地由此升空。Agent 是国民，Kite Passport Wallet 是国库，个人宪法是法律；所有花钱请求都先成为财政议案，经过国民审查，再由 Scoped Spending Session 放行并写入国家公报。

这个世界观可以有童趣、道具感、冒险感，但不能让评委误解成儿童向游戏或泛聊天玩具。它的落点必须是：

> 当 Agent 开始替你花钱，它需要的不只是一只钱包，而是一部宪法。

---

## 2. 语气边界

可以使用：

- 口袋
- 小国
- 国民
- 道具铺
- 邮筒
- 护照局
- 宪法厅
- 国库
- 国家公报
- 心灵花园
- 创作工坊

避免使用：

- 任何受版权保护的角色、形象、名字和视觉元素
- 只剩空洞奇观、无法对应产品功能的魔法设定
- 让 Kite Session 和支付主线变弱的儿童化包装

推荐调性：

> 像童年认真建造的一座云上国家。浪漫，但制度清楚；奇幻，但每一座建筑都对应 Agent 身份、权限、行动或支付。

---

## 3. 国家核心结构

### 3.1 口袋邮筒 / Payment Inbox

功能：

- 接收所有 Agent 支出请求。
- 把“钱包弹窗”变成“待审批事项”。
- 用户看到请求来源、金额、商家、用途、风险标签。

黑客松状态：已做。

商业价值：

- 用户每天打开的工作台。
- 后续可接浏览器插件、Telegram bot、移动端通知。

### 3.2 宪法厅 / Constitution Hall

功能：

- 存放用户的个人宪法。
- 定义支出限额、高风险上限、冷静期、override 条款。
- A6 允许用户推翻议会，但必须生成 Override Gazette，保留原始 decision hash。
- 未来可以有模板：Builder、Web3、Student、Family、DAO。

黑客松状态：已做基础版。

商业价值：

- Pro 订阅的核心。
- 高级用户会为更细的 policy guardrails 付费。

### 3.3 Kite 国库与风门 / Treasury

功能：

- 连接 Kite Agent Passport、Delegation、Scoped Spending Session、x402、Session 历史与 Receipt。
- 议会通过后，由用户用 Passkey 批准 Session 的金额、时限、资产和 scope。
- Agent 只在 Session 与宪法的双重边界内执行。
- 把每次支付变成 receipt，并在有 settlement reference 时标记链上结算。

黑客松状态：已做明确非链上的 `DemoKiteProvider`，并通过本地安全桥接真实调用官方 `kpass` / `ksearch`。账户、Passkey、余额和第一笔结算仍需立宪者本人完成。

商业价值：

- 最贴 Kite 赛道。
- 未来可做 Agent Spending Policy SDK。

### 3.4 国民议会 / Parliament

功能：

- 多 Agent 审查同一笔支出。
- 不是聊天，而是不同职责的审批意见。
- 角色包括审计官、财政大臣、反对党领袖、书记官。

黑客松状态：已做。

商业价值：

- 可售卖专业 Agent 国民。
- 可拓展团队版审批流。

### 3.5 国家公报 / Public Gazette

功能：

- 记录 requester、触发条款、投票、Delegation、Session、批准金额、实际支付、receipt 与 decision hash。
- 记录用户 override：被推翻的原始决策、previousDecisionHash、override 标记。
- 未来可以接 0G / TEE 证明或链上存证。

黑客松状态：已做基础版。

商业价值：

- 长期记忆和合规审计。
- 团队/DAO 版非常需要。

---

## 4. 后续国家部门入口

### 4.1 护照局 / Passport Office

一句话：给每个 Agent 国民发身份、职位、权限和信用记录。

未来功能：

- Agent Passport 列表
- Agent 权限管理
- Agent 信用分
- 哪些 Agent 能发起支出请求
- 哪些 Agent 只能建议，不能执行

商业化：

- Agent seat-based pricing
- 高级权限管理
- Agent reputation analytics

### 4.2 创作工坊 / Studio

一句话：让 Agent 和用户一起做项目，但任何采购都进入国库。

未来功能：

- 产品共创
- Demo 脚本生成
- 设计素材采购
- API / 数据包采购
- 外包任务 bounty

商业化：

- 创作者 Pro
- API / 素材市场抽成
- 黑客松/独立开发者工具包

### 4.3 心灵花园 / Sanctuary

一句话：在用户情绪强烈时保护钱包和重大决策。

未来功能：

- FOMO 检测
- 焦虑状态冷静期
- 夜间高风险交易锁
- 情绪复盘
- 非医疗性质的自我反思

商业化：

- 情绪预算管理
- 消费冷静期插件
- 家庭/青少年钱包模式

边界：

- 不做医疗诊断。
- 不宣称心理治疗。

### 4.4 学院 / Academy

一句话：把学习目标变成训练任务和预算计划。

未来功能：

- 学习计划
- 考官 Agent
- 课程购买审批
- 训练任务奖励
- 学习档案

商业化：

- 课程分销
- 学习教练 Agent
- 考试/证书模板

### 4.5 外交邮局 / Embassy

一句话：代表用户和外部 Agent、API、商家沟通与付款。

未来功能：

- 向外部 Agent 发任务
- 发布 bounty
- 购买 x402/API 服务
- 与商家 checkout 集成

商业化：

- 支付抽成
- Bounty marketplace
- 商家接入费

### 4.6 道具铺 / Gadget Shop

一句话：用户给自己的口袋共和国安装新能力。

未来功能：

- Agent 国民市场
- 宪法模板市场
- 工具包市场
- 工作流模板
- 专业领域插件

商业化：

- Marketplace take rate
- Featured placement
- Premium templates

### 4.7 档案馆 / Archive

一句话：保存用户长期决策、支出、override 和成长记录。

未来功能：

- 国家公报历史
- 决策复盘
- 支出模式分析
- 用户价值观演化
- 导出 JSON / PDF / 链上记录

商业化：

- Pro 长期记忆
- 合规导出
- 团队审计报告

---

## 5. 商业模式

### 5.1 Free / Pro / Team

Free：

- 一个个人国度
- 基础宪法
- 每月有限支出审查
- Demo ledger

Pro：

- 多宪法模板
- 更多 Agent 国民
- 长期公报档案
- 高级风险规则
- 真实钱包/支付 provider

Team：

- 多成员
- 团队国库
- 多级审批
- 导出审计报告
- DAO / startup / creator studio 场景

### 5.2 Agent 国民市场

用户购买或订阅专业 Agent：

- Growth Minister
- Solidity Auditor
- Budget Guardian
- Relationship Diplomat
- Study Examiner
- VC Critic
- Tax Clerk

收入：

- 平台抽成
- 订阅分成
- 专业模板售卖

### 5.3 道具铺抽成

当 Agent 购买 API、数据服务、外包任务、课程、模板时，平台可以抽成。

这条线和 Kite 最贴：

> Agent 有支付能力以后，谁来帮用户决定哪些支付应该发生？

### 5.4 Spending Policy SDK

长期方向：

> 任何 AI Agent 产品想替用户花钱，都可以接 Pocket Republic 的宪法审批层。

产品飞轮：

```text
更多 Agent 国民
  -> 更多 API / 数据 / 算力采购
  -> 更多可支付服务进入道具铺与外交邮局
  -> 个人国度能力更强
  -> 行为沉淀为更准确的宪法模板与 Agent 信誉
  -> 吸引更多用户与服务
```

收入：

- API 调用费
- 企业授权
- 合规审计包

---

## 6. 黑客松呈现原则

黑客松阶段只展示完整入口，不做完整功能。

必须做深：

- Payment Inbox
- Treasury Review Desk
- Constitution
- Kite Trace

可以作为未来入口：

- 护照局
- 创作工坊
- 心灵花园
- 学院
- 外交邮局
- 道具铺
- 档案馆

讲法：

> 这是一个口袋里的 AI 小国，但第一座已经开门营业的建筑是 Kite 国库。

---

## 7. 最终 Pitch

英文：

> Pocket Republic is a tiny AI nation in your pocket. Agent citizens can create, advise, and act, but every payment must pass through your constitution and Kite treasury first.

中文：

> Pocket Republic 是你口袋里的一座 AI 小国。Agent 国民可以创作、建议和行动，但每一次花钱，都必须先经过你的个人宪法和 Kite 国库。
