# Submission Checklist

## 产品

- [ ] 开屏一句话讲清“Agent 花钱前需要一部个人宪法”。
- [ ] 建国 -> 宪法 -> 财政议案 -> 国家地图 -> 国家公报连贯。
- [ ] 用户可输入目标、预算并编辑宪法。
- [ ] A2/A3 修改会改变真实决策。
- [ ] 心灵花园等未来部门没有抢走国库主线。
- [ ] 页面没有“评委一键演示”或自动制造记录。

## Kite

- [ ] `kpass --version` 与 `ksearch --version` 可运行。
- [ ] `kpass health --output json` 返回 healthy。
- [ ] `ksearch health --output json` 返回 healthy。
- [ ] 真实账户已登录并设置 Passkey。
- [ ] Passport Wallet 有演示所需余额。
- [ ] 财政大臣 Agent 已注册。
- [ ] Session Delegation 包含 asset、per-tx、total、TTL 和 endpoint scope。
- [ ] Session Pending 明确等待 Passkey。
- [ ] x402 执行返回 2xx 和服务结果。
- [ ] Receipt 有 settlement reference 后才显示“链上已结算”。
- [ ] `kpass user sessions --output json` 能找到该 Session，execute 结果含 receipt / settlement reference。

## 诚实性

- [ ] 沙盒凭证显示 `isOnchain: false`。
- [ ] 沙盒不生成伪 tx hash。
- [ ] 未登录、未批准、余额不足和服务失败都有清晰状态。
- [ ] Vercel 页面不宣称保存用户 Kite 凭证。
- [ ] README 明确区分线上沙盒与本地真实模式。

## 安全

- [ ] `.kpass/`、`.kite-passport/`、`.kite-tools/` 未提交。
- [ ] Git 中没有 JWT、OTP、私钥和邮箱 code。
- [ ] x402 URL 只允许 HTTPS 与允许名单主机。
- [ ] localhost、私网、metadata URL 测试通过。
- [ ] 本地桥接不使用 shell 字符串拼接。

## 自动化

- [ ] `npm test`
- [ ] `node --check app.js`
- [ ] `node --check adapters/kite-provider.js`
- [ ] `node --check server.mjs`
- [ ] `curl -I http://127.0.0.1:5180/`
- [ ] `curl http://127.0.0.1:5180/api/kite/status`

## 浏览器

- [ ] 1280 x 800 开屏与五个视图无重叠。
- [ ] 390 x 844 导航、国库风门、表单无横向溢出。
- [ ] 320 x 568 最长中文与按钮不溢出。
- [ ] WebGL canvas 非空，有 no-WebGL 回退。
- [ ] reduced-motion 可用。
- [ ] 控制台无 error。

## 交付

- [ ] UI 同学看过 `docs/UI_HANDOFF.md`。
- [ ] UI 同学按 `assets/UI_ASSET_BRIEF.md` 输出 ART-00 至 ART-06。
- [ ] 视频按 `docs/DEMO_SCRIPT.md` 录制。
- [ ] 提交文案来自 `docs/SUBMISSION_PACKET.md`。
- [ ] GitHub main 已推送。
- [ ] Vercel 部署可访问。
