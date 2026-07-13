# 3 分钟 Demo 脚本

项目：Pocket Republic  
中文名：口袋共和国  
目标：让观众相信这是一个“个人 AI 国度”产品，黑客松第一版把 Kite 国库 / Agent 钱包治理跑通。

世界观参考：[WORLD_BIBLE.md](./WORLD_BIBLE.md)

---

## 0:00 - 0:20 问题

画面：开屏页。

旁白：

> 未来 AI Agent 会替我们买 API、订阅工具、支付服务，甚至参与投资。问题是，钱包只会问“确认吗”，但 Agent 花钱前更应该先问：这符合我的长期目标、预算和个人边界吗？

---

## 0:20 - 0:45 建国

画面：点击“开始建国”，进入建国 tab。

旁白：

> Pocket Republic 让每个人建立一个由 AI Agent 国民组成的个人国度。你不是在使用一个 AI 助手，而是在创建一个小国家。你选择国家模板，写下当前目标，设置月度授权、单笔限额和高风险上限。

操作：

- 选择 Builder Republic。
- 修改目标：完成 Kite 赛道黑客松 MVP。
- 点击“更新个人宪法”。

---

## 0:45 - 1:10 个人宪法

画面：个人宪法 tab。

旁白：

> 系统根据用户建模生成个人宪法，而且这些条款可以直接编辑。A2 是单笔限额，A3 是高风险上限，A4 是冷静期，A6 保留用户主权：用户可以推翻议会，但必须留下国家公报。

关键句：

> 这不是 AI 给建议，而是 Agent 行动前必须遵守的制度。

---

## 1:10 - 1:35 Agent 国民和国家地图

画面：左侧国民护照 + 国家地图 tab。

旁白：

> 这些 Agent 不只是多个聊天角色。它们是国民和官员：首相协调目标，财政大臣管理 Kite 国库，审计官查风险，反对党防止 AI 迎合，心灵部长处理 FOMO 和焦虑，书记官生成国家公报。

补充：

> 现在 demo 只跑通财政部，但创作工坊、心灵花园、学院、外交邮局和道具铺都保留为后续产品入口。

---

## 1:35 - 2:15 财政议案

画面：财政议案 tab，选择 AI meme coin 冲动买入。

旁白：

> 用户想花 300 USDC 买一个刚上线的 AI meme coin。普通钱包只会弹出确认按钮，但在 Pocket Republic 里，这会先变成国事议案。

操作：点击“运行国库审查”。

旁白：

> 审计官发现高风险资产和 FOMO，财政大臣检查 Kite 授权额度，反对党要求冷静期，心灵部长识别强情绪信号。最终议会不会全额放款，而是根据宪法只批准 10 USDC，剩余 290 USDC 冻结。

关键句：

> Kite 让 Agent 能支付。Pocket Republic 决定 Agent 应不应该支付、能支付多少。

---

## 2:15 - 2:35 用户主权 Override

画面：回到财政议案，点击“推翻议会决策 (A6)”。

旁白：

> Pocket Republic 不是让 AI 替用户当主人。用户仍然可以推翻议会，但 A6 会强制生成 Override 公报：全额执行可以发生，原始建议、反对意见、previousDecisionHash 和 override 标记都必须留痕。

---

## 2:35 - 3:00 国家公报和 Kite 国库

画面：国家公报 tab。

旁白：

> 最终每次国库动作都会生成国家公报和 Kite-style trace。这里可以看到 Agent Passport、Allowance、Payment Intent、Payment Trace、ledgerId、decisionHash 和 override 信息。真实 Kite 接入时，只需要替换 provider adapter，个人宪法、议会和国家公报逻辑不用改。

操作：

- 展示凭证 JSON。
- 展示国家公报历史。
- 点击“下载凭证 JSON”。

结尾：

> AI Agent 时代，每个人需要的不是一个更会聊天的助手，而是一个能被信任、被约束、能协作、能花钱的个人国度。

---

## 录屏重点

- Pocket Republic 开屏和“开始建国”。
- 建国流程：模板、目标、预算。
- 可编辑个人宪法。
- 7 个 Agent 国民护照。
- 国家地图和未来部门入口。
- 300 USDC -> 10 USDC 的财政议案。
- A6 Override。
- 国家公报里的 Kite-style trace。
- `node scripts/verify-kite-envelope.mjs` 命令输出。

---

## 备用中文结尾

> Kite 解决 Agent 钱包和支付能力。Pocket Republic 解决下一步问题：用户凭什么敢把钱包授权给 Agent？答案是个人宪法、Agent 国民议会、授权额度和可追踪的国家公报。
