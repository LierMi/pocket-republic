# Submission Checklist

提交前检查清单。目标是避免评委觉得这是纯前端剧本或泛多 Agent 项目。

---

## 1. 产品主线

- [ ] 开屏页一句话讲清楚：给 AI Agent 花钱前加一部个人宪法。
- [ ] 页面流程像产品：开屏 -> 建国 -> 个人宪法 -> 财政议案 -> 国家地图 -> 国家公报。
- [ ] 其他部门没有抢主线。
- [ ] README 明确写：不是多 Agent 聊天室，而是 Agent 支付前治理层。
- [ ] Product Map 展示世界观和商业化入口，但不削弱 Kite 国库主线。
- [ ] 世界观参考 [docs/WORLD_BIBLE.md](./WORLD_BIBLE.md)。
- [ ] 点击审查后才写入 Gazette History，页面不是自动刷记录。
- [ ] 用户推翻条款明确表达用户主权和审计留痕。

---

## 2. Kite 贴合度

- [ ] README 有 Kite section。
- [ ] 页面显示 Kite Adapter 状态。
- [ ] Payment Trace JSON 包含 `agentPassport`。
- [ ] Payment Trace JSON 包含 `allowance`。
- [ ] Payment Trace JSON 包含 `paymentIntent`。
- [ ] Payment Trace JSON 包含 `paymentTrace`。
- [ ] Payment Trace JSON 包含 `mcpToolCall`。
- [ ] 代码里有独立 provider：[adapters/kite-provider.js](../adapters/kite-provider.js)。
- [ ] 代码里有 `KiteMcpProvider` stub。
- [ ] `.env.example` 包含 Kite 真实接入字段。
- [ ] `国家公报`可以下载 Kite Trace JSON。
- [ ] 国家公报有本地历史记录。
- [ ] Decision hash 使用 SHA-256。
- [ ] Override trace 包含 `override: true`。
- [ ] Override trace 包含 `previousDecisionHash`。
- [ ] `docs/SUBMISSION_PACKET.md` 可直接复制到提交表单。

---

## 3. Demo 稳定性

- [ ] `python3 -m http.server 5180` 可以启动。
- [ ] 打开 `http://localhost:5180` 没有断图。
- [ ] 点击“进入我的国度”能进入产品。
- [ ] 三个示例议案都能切换。
- [ ] Meme coin 场景显示 300 USDC -> 10 USDC。
- [ ] 点击“召集国民议会”能看到审查步骤动画。
- [ ] 点击用户推翻按钮能生成 override 记录。
- [ ] API data 场景能显示较宽松审批。
- [ ] AI tool 场景触发单笔限额。
- [ ] Payment Trace 可以下载成 JSON。
- [ ] 点击审查或 Override 后 Gazette History 会出现记录。

---

## 4. 代码检查

- [ ] `node --check app.js`
- [ ] `node --check adapters/kite-provider.js`
- [ ] `node scripts/verify-kite-envelope.mjs`
- [ ] `curl -I http://localhost:5180/`
- [ ] `curl -I http://localhost:5180/assets/hero-placeholder.svg`
- [ ] `node scripts/verify-product-structure.mjs`
- [ ] `node scripts/verify-effects-module.mjs`
- [ ] `node scripts/verify-governance-logic.mjs`

---

## 5. UI 交付

- [ ] UI 同学看过 [docs/UI_HANDOFF.md](./UI_HANDOFF.md)。
- [ ] UI 同学知道图片入口在 [assets/UI_ASSET_BRIEF.md](../assets/UI_ASSET_BRIEF.md)。
- [ ] 开屏主视觉替换。
- [ ] Kite Treasury Visual 替换。
- [ ] Agent 国民群像替换。
- [ ] 替换后移动端不溢出。

---

## 6. 视频提交

- [ ] 录屏按 [docs/DEMO_SCRIPT.md](./DEMO_SCRIPT.md) 走。
- [ ] 视频里出现代码层 Kite provider。
- [ ] 视频里出现 Payment Trace JSON。
- [ ] 提交说明引用 [docs/SUBMISSION_PACKET.md](./SUBMISSION_PACKET.md)。
- [ ] 视频不要花太多时间讲“未来能做情感陪伴/创作部”。
- [ ] 最后一句收束到 Kite：Payment rails let agents pay. Pocket Republic decides whether they should pay.
