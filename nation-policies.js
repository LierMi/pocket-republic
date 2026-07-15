export const nationPolicyVersion = 3;

export const nationTemplates = [
  {
    id: "builder",
    label: "开发与采购",
    cn: "创作者共和国",
    en: "Builder Republic",
    subtitle: "为交付护航的开发采购共和国",
    audience: "黑客松选手、独立开发者、Solo Founder",
    nationName: "大雄的云上王国",
    mission: "在截止日期前交付 MVP，把时间、专注力与开发预算留给当前主线。",
    monthlyBudget: 200,
    singleSpendLimit: 20,
    highRiskLimit: 10,
    coolingPeriodHours: 0,
    protectedAssets: ["时间", "专注力", "开发预算"],
    description: "保护交付节奏与开发预算的实干家内阁。",
    walletMetrics: [
      { label: "免审额度", value: "20 USDT", detail: "小额工具与 API" },
      { label: "月度预算", value: "200 USDT", detail: "超额进入议会" },
    ],
    treasuryRule:
      "超过 20 USDT 的 API、SaaS 与开发工具采购，必须由财政大臣与审计官共同审查 ROI。",
    policyTags: ["高效开发", "采购治理", "防止闲置订阅"],
    demoHint: "示例场景：审议一笔 49 USDT 的 AI 设计工具订阅",
    approvalRoute: "财政大臣 + 审计官",
    featured: "默认推荐",
  },
  {
    id: "web3",
    label: "链上风控",
    cn: "链上主权共和国",
    en: "Sovereign Republic",
    subtitle: "守住本金的链上风控共和国",
    audience: "Web3 玩家、加密交易者、空投交互用户",
    nationName: "大雄的云上王国",
    mission: "保护链上本金，识别 FOMO，并对未知资产支付执行强制风险上限。",
    monthlyBudget: 500,
    singleSpendLimit: 30,
    highRiskLimit: 10,
    coolingPeriodHours: 24,
    protectedAssets: ["链上本金", "钱包安全", "长期判断"],
    description: "你的链上投资防火墙与反 FOMO 冷静期系统。",
    walletMetrics: [
      { label: "高风险上限", value: "10 USDT", detail: "未知资产强制缩减" },
      { label: "冷静期", value: "24 小时", detail: "剩余金额不予放行" },
    ],
    treasuryRule:
      "检测到 Meme 币、未知合约或 FOMO 信号时，国库把支付上限缩减为 10 USDT，其余金额进入 24 小时冷静期。",
    policyTags: ["钱包防护", "FOMO 拦截", "风险隔离"],
    demoHint: "核心演示：300 USDT 高风险交易被缩减至 10 USDT",
    approvalRoute: "财政大臣 + 审计官 + 议会 5:1",
    featured: "核心支付 Demo",
  },
  {
    id: "healing",
    label: "情绪守护",
    cn: "心灵花园共和国",
    en: "Sanctuary Republic",
    subtitle: "情绪上头时替你踩刹车的共和国",
    audience: "容易在焦虑、压力或深夜里冲动消费的人",
    nationName: "大雄的云上王国",
    mission: "在高压、焦虑或深夜强情绪状态下，暂停非必要支付与重大决策。",
    monthlyBudget: 300,
    singleSpendLimit: 30,
    highRiskLimit: 0,
    coolingPeriodHours: 12,
    protectedAssets: ["情绪稳定", "现实资产", "睡眠"],
    description: "在你情绪最强烈的时候，替你守住钱包和重要决定。",
    walletMetrics: [
      { label: "强情绪限额", value: "0 USDT", detail: "非必要支付暂停" },
      { label: "日常上限", value: "30 USDT", detail: "超额需二次审议" },
    ],
    treasuryRule:
      "强情绪状态被用户标记或议会识别后，购物、打赏与娱乐等非必要支付进入延迟审议。",
    policyTags: ["情绪标记", "冲动消费锁", "延迟支付"],
    demoHint: "概念场景：深夜的冲动消费被按下 12 小时暂停键",
    approvalRoute: "心灵部长 + 财政大臣",
    featured: null,
  },
  {
    id: "learning",
    label: "里程碑支付",
    cn: "探索成长共和国",
    en: "Explorer Republic",
    subtitle: "让预算只为真正掌握买单",
    audience: "终身学习者、学生、需要掌握新技能的职场人",
    nationName: "大雄的云上王国",
    mission: "让学习预算为真正的知识掌握买单，用有来源记录的里程碑解锁下一阶段支付。",
    monthlyBudget: 150,
    singleSpendLimit: 15,
    highRiskLimit: 5,
    coolingPeriodHours: 0,
    protectedAssets: ["学习预算", "注意力", "长期积累"],
    description: "以结果为导向的知识进阶与自我奖励共和国。",
    walletMetrics: [
      { label: "学习预算", value: "150 USDT", detail: "用于课程与工具" },
      { label: "阶段奖励", value: "15 USDT", detail: "验证后提交放行议案" },
    ],
    treasuryRule:
      "MVP 记录立宪者的里程碑完成声明；Roadmap v0.2 由学院考官验证后解锁工具预算或奖励议案。",
    policyTags: ["里程碑支付", "知识奖励", "预算解锁"],
    demoHint: "概念场景：完成测试后提交 15 USDT 学习奖励议案",
    approvalRoute: "立宪者背书 + 财政大臣",
    featured: null,
  },
];

export function getNationTemplate(templateId) {
  return nationTemplates.find((item) => item.id === templateId) ?? nationTemplates[0];
}

export function migrateNationState(storedState) {
  const parsed = storedState && typeof storedState === "object" ? storedState : {};
  const template = getNationTemplate(parsed.id);
  if (parsed.policyVersion === nationPolicyVersion) {
    return { ...template, ...parsed, policyVersion: nationPolicyVersion };
  }

  const legacyNames = new Set([
    "Emily's Builder Republic",
    "Emily's Web3 Republic",
    "Emily's Healing Republic",
    "Emily's Learning Republic",
    "星芽建设者共和国",
    "星芽创作者国度",
    "星潮链上主权国度",
    "微光心灵花园国",
    "微光心灵自律国度",
    "长青探索成长国度",
  ]);
  const legacyMission = parsed.mission === "在 7 月 16 日前完成 Kite 赛道黑客松 MVP。";
  return {
    ...template,
    policyVersion: nationPolicyVersion,
    nationName:
      parsed.nationName && !legacyNames.has(parsed.nationName) ? parsed.nationName : template.nationName,
    mission: parsed.mission && !legacyMission ? parsed.mission : template.mission,
  };
}

export function encodeConstitutionRecord(articles) {
  return {
    policyVersion: nationPolicyVersion,
    articles: Array.isArray(articles) ? articles : [],
  };
}

export function decodeConstitutionRecord(record) {
  if (!record || typeof record !== "object" || Array.isArray(record)) return null;
  if (record.policyVersion !== nationPolicyVersion || !Array.isArray(record.articles)) return null;
  return record.articles;
}

export function buildConstitution(state) {
  return [
    {
      id: "A1",
      title: "国家目标",
      text: `本阶段最重要的目标是：${state.mission}`,
    },
    {
      id: "A2",
      title: "国库审查",
      text: `任何单笔超过 ${state.singleSpendLimit} USDT 的支出，必须进入财政部和国民议会审查。`,
    },
    {
      id: "A3",
      title: "高风险上限",
      text:
        state.highRiskLimit === 0
          ? "强情绪状态下，高风险与非必要支付默认批准上限为 0 USDT。"
          : `高风险 Web3 购买、meme coin、未知 DEX 池或强投机行为，默认最多批准 ${state.highRiskLimit} USDT。`,
    },
    {
      id: "A4",
      title: "冷静期",
      text: coolingArticle(state),
    },
    {
      id: "A5",
      title: state.id === "learning" ? "里程碑放行" : "行动保护",
      text: protectionArticle(state),
    },
    {
      id: "A6",
      title: "用户主权",
      text: "用户可以强制推翻议会，但必须生成用户主权国家公报，记录原始建议、决策哈希和最终执行金额。",
    },
  ];
}

function coolingArticle(state) {
  if (state.id === "web3") {
    return `包含 FOMO、今晚、立刻、100x、错过等冲动信号时，未批准金额进入 ${state.coolingPeriodHours} 小时冷静期。`;
  }
  if (state.id === "healing") {
    return `用户标记高压、焦虑或深夜强情绪后，非必要支付进入 ${state.coolingPeriodHours} 小时延迟审议。`;
  }
  return "当议案与国家使命无关或存在强冲动信号时，议会可以暂缓执行并要求重新说明。";
}

function protectionArticle(state) {
  if (state.id === "healing") {
    return "强情绪状态未解除前，购物、打赏、游戏充值和娱乐订阅等非必要支付必须由心灵部与财政部联合复核。";
  }
  if (state.id === "learning") {
    return "MVP 由立宪者提交并留存学习里程碑完成声明后，才能解锁下一阶段工具预算；学院考官验证属于 Roadmap v0.2，实际支付仍需经过 Kite 授权。";
  }
  if (state.id === "builder") {
    return "超过免审额度的 API、SaaS 与开发工具采购，必须由财政大臣与审计官共同审查 ROI。";
  }
  return "高风险链上行动需要财政大臣、审计官与议会共同审议，任何 Agent 不得单独放行。";
}
