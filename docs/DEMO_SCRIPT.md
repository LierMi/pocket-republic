# Pocket Republic 3 分钟 Demo 脚本

主线：浪漫建国 45 秒，个人宪法 35 秒，Kite 真实支付 80 秒，商业闭环 20 秒。

## 0:00 - 0:20 一块尚未升空的土地

画面：云海开屏，点击“让我的国度升空”。

旁白：

> 每个人心里，都有一块尚未升空的土地。它装着愿望，也保管我们即将交给 AI 的权力。未来 Agent 会替我们买 API、数据和算力，但一只只会问“确认吗”的钱包，还不足以承载这种信任。

## 0:20 - 0:45 建国

画面：选择建设者共和国，写下“完成 Kite 黑客松 MVP”，设置 500 / 30 / 10 USDC。

旁白：

> Pocket Republic 让用户建立一个由 AI Agent 国民组成的个人国度。你写下国家使命、月度预算、单笔限额和高风险边界。这不是给 AI 一句提示词，而是在定义它被允许怎样行动。

## 0:45 - 1:05 个人宪法

画面：进入个人宪法，修改 A2 或 A3 数值。

旁白：

> 宪法可以逐条编辑，而且会真实改变下一次支付审查。Agent 国民忠于这部宪法，而不是迎合用户一时的冲动。

## 1:05 - 1:25 国库风门

画面：进入财政议案，展示四道门。

旁白：

> 当 Agent 要把一阵风带出国境，它要经过四道门：Agent Passport 证明身份；Scoped Session 写入金额、时限和 endpoint；x402 完成服务采购；Receipt 把轨迹留在国家公报。

## 1:25 - 1:55 宪法治理

画面：先选 300 USDC meme coin，运行沙盒审查。

旁白：

> 这笔 300 USDC 的冲动投资触发了 FOMO、高风险限额和冷静期。议会只批准 10 USDC，其余 290 USDC 留在云层中。Kite 让 Agent 能支付，Pocket Republic 决定它应不应该支付、能支付多少。

## 1:55 - 2:35 Kite 真实模式

画面：切到本地 `?provider=kite`，终端短暂展示 `kpass status`，选择“购买一封云外市场晨报”。

旁白：

> 这不是虚构的 MCP 方法。项目通过官方 kpass 和 ksearch 连接 Kite Passport。建设部长从 Kite 目录雇佣 StableCrypto 购买一份市场数据。系统先预检 x402 真实报价与合约资产，再把宪法批准上限、`USDC` Session 资产、host 与 path 写进 Delegation。

画面：Session Pending 时展示“国玺待盖”；在 Passport Dashboard 用 Passkey 批准；回到页面再次执行。

旁白：

> 用户只签一次 Session。此后财政大臣可以在批准的额度、时限和服务范围内自主行动。成功后，页面读取服务结果与 settlement reference，不用假 tx hash 充数。

## 2:35 - 2:50 国家公报

画面：国家公报，显示 decision hash、Session、实际支付、Receipt。

旁白：

> 最终每一笔支付都能从 payment 回溯到 session、agent 和 owner。风会离开云层，但它走过的轨迹不会消失。

## 2:50 - 3:00 商业闭环

画面：国家地图，点亮外交邮局、道具铺、创作工坊。

旁白：

> 下一步，Agent 国民可以互相雇佣、购买 API 与工作流。Pocket Republic 对高级宪法和团队审计订阅收费，并从 Agent 服务市场抽成。它最终会成为所有 Agent 支出之前的个人主权层。

## 录屏前置

- 稳定产品段使用线上沙盒。
- 真实支付段使用 `npm start` 和 `?provider=kite`。
- 先准备 Passport 登录、Passkey、余额和已知 x402 服务。
- 若真实结算临时失败，保留失败状态并解释，不切换成假链上凭证。
- 终端展示 `npm test` 与 `kpass status --output json --no-interactive`。
