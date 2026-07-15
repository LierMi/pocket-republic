import { createKiteProvider } from "./adapters/kite-provider.js";
import { buildConstitution, nationTemplates } from "./nation-policies.js";
import {
  buildPaymentDecision,
  calculateOverrideAmount,
  deriveConstitutionPolicy,
} from "./governance.js";
import {
  initVisualEffects,
  playEntryExit,
  playViewTransition,
  pulseElement,
  resetEntryScene,
  syncNavigation,
} from "./effects.js";

const provider = createKiteProvider();

const storageKeys = {
  nation: "pocket-republic:nation",
  constitution: "pocket-republic:constitution",
  gazette: "pocket-republic:gazette-history",
};

const defaultNationState = { ...nationTemplates[0] };

let nationState = readNationState();
let constitutionArticles = readConstitutionArticles() ?? buildConstitution(nationState);

const requests = {
  meme: {
    id: "meme",
    title: "AI meme coin 冲动买入",
    requester: "立宪者 / 用户临时请求",
    amount: 300,
    currency: "USDC",
    merchant: "未知 DEX 池",
    category: "高风险 Web3 交易",
    summary:
      "用户想立刻花 300 USDC 买一个刚上线的 AI meme coin，因为 Telegram 群说今晚会 pump。",
    context:
      "A Telegram group says this AI meme coin will pump tonight. I feel I might miss the next 100x and want to spend 300 USDC now.",
    statusHint: "大概率触发冷静期",
  },
  api: {
    id: "api",
    title: "购买一封云外市场晨报",
    requester: "Ivo / 建设部长",
    amount: 3,
    currency: "USDC",
    merchant: "StableCrypto / Kite 服务目录",
    category: "外交邮局 · x402 数据采购",
    summary:
      "建设部长想雇佣一个国境外的数据服务，取得一份全球加密市场晨报，为今日的建设计划校准方向。",
    context:
      "The Studio needs one external global crypto market report. This catalog-listed x402 data purchase directly supports the current project mission.",
    serviceUrl: "https://stablecrypto.dev/api/coingecko/global",
    serviceMethod: "POST",
    serviceBody: {},
    paymentAsset: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    estimatedCost: 0.01,
    statusHint: "Kite 目录可验证 · x402 实时报价",
  },
  tool: {
    id: "tool",
    title: "AI 设计工具订阅",
    requester: "Mira / 财政大臣",
    amount: 49,
    currency: "USDC",
    merchant: "CanvasForge Pro",
    category: "订阅支出审查",
    summary:
      "建设者共和国想订阅一个 49 USDC/月的 AI 设计工具，但超过了单笔支出限额。",
    context:
      "建设者共和国希望订阅一个月的设计工具。它能提升当前项目质量，但金额超过单笔支出限额。",
    statusHint: "需要限额审查",
  },
};

const agentProfiles = [
  {
    id: "prime",
    name: "Sol",
    role: "首相",
    englishRole: "Prime Minister",
    department: "内阁",
    duty: "总结议案、协调各部门，并把最终建议翻译成用户能执行的动作。",
    permissions: ["summarize", "coordinate", "vote"],
    passport: "sandbox-agent:prime-minister:sol",
    reputation: 94,
    voteClass: "vote-approve",
  },
  {
    id: "treasurer",
    name: "Mira",
    role: "财政大臣",
    englishRole: "Treasurer",
    department: "Kite 国库",
    duty: "读取预算、创建支付意图，并只让通过宪法的金额进入 Kite 国库。",
    permissions: ["read_budget", "propose_payment", "freeze_spend"],
    passport: "sandbox-agent:treasurer:mira",
    reputation: 92,
    voteClass: "vote-reduce",
  },
  {
    id: "auditor",
    name: "Rin",
    role: "审计官",
    englishRole: "Auditor",
    department: "审计院",
    duty: "检查风险信号、触发条款和历史记录，防止 Agent 迎合用户冲动。",
    permissions: ["audit", "risk_scan", "vote"],
    passport: "sandbox-agent:auditor:rin",
    reputation: 91,
    voteClass: "vote-oppose",
  },
  {
    id: "builder",
    name: "Ivo",
    role: "建设部长",
    englishRole: "Builder",
    department: "创作工坊",
    duty: "把支出和项目目标对齐，提出更小、更可执行的替代方案。",
    permissions: ["plan_project", "suggest_alternative", "vote"],
    passport: "sandbox-agent:builder:ivo",
    reputation: 89,
    voteClass: "vote-approve",
  },
  {
    id: "opposition",
    name: "Noa",
    role: "反对党领袖",
    englishRole: "Opposition",
    department: "国民议会",
    duty: "强制提出反方观点，保护用户不被自己的情绪和单个 Agent 带着走。",
    permissions: ["debate", "veto_warning", "vote"],
    passport: "sandbox-agent:opposition:noa",
    reputation: 88,
    voteClass: "vote-delay",
  },
  {
    id: "caretaker",
    name: "Luma",
    role: "心灵部长",
    englishRole: "Caretaker",
    department: "心灵花园",
    duty: "识别焦虑、FOMO 和强情绪状态，把不可逆决策先放进冷静期。",
    permissions: ["emotion_check", "cooling_period", "vote"],
    passport: "sandbox-agent:caretaker:luma",
    reputation: 90,
    voteClass: "vote-delay",
  },
  {
    id: "archivist",
    name: "Vale",
    role: "书记官",
    englishRole: "Archivist",
    department: "档案馆",
    duty: "生成国家公报、保存决策哈希、Kite 账本和用户推翻历史。",
    permissions: ["write_gazette", "hash_record", "export_trace"],
    passport: "sandbox-agent:archivist:vale",
    reputation: 93,
    voteClass: "vote-approve",
  },
];

const mapDepartments = {
  treasury: {
    status: "当前开放 · MVP",
    title: "Kite 国库",
    description:
      "Agent Passport 是国民身份，Scoped Spending Session 是财政权限，x402 Receipt 是写进国家公报的执行记录。",
    actionLabel: "前往财政议案",
    view: "review",
  },
  garden: {
    status: "概念版图 · Roadmap v0.2",
    title: "心灵花园",
    description:
      "未来由陪伴 Agent 协助用户标记焦虑、FOMO 与关系冲突，再把非必要支出送入国库冷静期。可进一步接入可验证推理服务；当前版本优先开放 Kite 国库治理。",
    actionLabel: "查看国库治理",
    view: "review",
    requestId: "meme",
  },
  studio: {
    status: "已接入国库试验",
    title: "创作工坊",
    description:
      "建设部长与用户共创项目，并把 API、数据和工具采购提交为财政议案。当前可体验一笔外部 x402 数据服务采购，由宪法先审议，再交给 Kite 支付层。",
    actionLabel: "审议一笔 API 采购",
    view: "review",
    requestId: "api",
  },
  academy: {
    status: "概念版图 · Roadmap v0.2",
    title: "学院",
    description:
      "未来由考官 Agent 验证学习里程碑，再解锁下一阶段工具预算或奖励议案。当前版本只保留国库规则入口，不宣称已经实现自动托管与验证。",
    actionLabel: "配置成长国度",
    view: "setup",
  },
  embassy: {
    status: "概念版图 · Roadmap v0.2",
    title: "外交邮局",
    description:
      "未来通过 Kite MCP 与外部 Agent、商家和按次付费服务协作；所有报价仍需先通过个人宪法，再进入受限 Spending Session。当前尚未开放自动谈判。",
    actionLabel: "查看财政议案",
    view: "review",
    requestId: "api",
  },
  shop: {
    status: "概念版图 · Roadmap v0.2",
    title: "道具铺",
    description:
      "未来提供专业 Agent 国民、国库宪法模板和工作流市场，并由 Kite 国库完成受控购买。它将成为模板订阅、Agent 交易与平台抽成的商业入口。",
    actionLabel: "选择国库模板",
    view: "setup",
  },
};

const elements = {
  entryButtons: [...document.querySelectorAll("[data-entry-action]")],
  viewButtons: [...document.querySelectorAll("[data-view-tab]")],
  viewPanels: [...document.querySelectorAll("[data-view-panel]")],
  citizenList: document.querySelector("#citizenList"),
  templateOptions: document.querySelector("#templateOptions"),
  policyPreview: document.querySelector("#policyPreview"),
  policyPreviewContent: document.querySelector("#policyPreviewContent"),
  nationName: document.querySelector("#nationName"),
  nationMission: document.querySelector("#nationMission"),
  nationTags: document.querySelector("#nationTags"),
  treasuryHeroMetric: document.querySelector("#treasuryHeroMetric"),
  missionInput: document.querySelector("#missionInput"),
  nationNameInput: document.querySelector("#nationNameInput"),
  monthlyBudgetInput: document.querySelector("#monthlyBudgetInput"),
  singleLimitInput: document.querySelector("#singleLimitInput"),
  highRiskLimitInput: document.querySelector("#highRiskLimitInput"),
  updateNationButton: document.querySelector("#updateNationButton"),
  setupStatus: document.querySelector("#setupStatus"),
  proposalForm: document.querySelector("#proposalForm"),
  proposalTitleInput: document.querySelector("#proposalTitleInput"),
  proposalAmountInput: document.querySelector("#proposalAmountInput"),
  proposalContextInput: document.querySelector("#proposalContextInput"),
  proposalServiceUrlInput: document.querySelector("#proposalServiceUrlInput"),
  requestList: document.querySelector("#requestList"),
  requestTitle: document.querySelector("#requestTitle"),
  requestSummary: document.querySelector("#requestSummary"),
  requestedAmount: document.querySelector("#requestedAmount"),
  requestMerchant: document.querySelector("#requestMerchant"),
  riskTags: document.querySelector("#riskTags"),
  runReviewButton: document.querySelector("#runReviewButton"),
  overrideButton: document.querySelector("#overrideButton"),
  reviewProgress: document.querySelector("#reviewProgress"),
  decisionTitle: document.querySelector("#decisionTitle"),
  decisionPolicy: document.querySelector("#decisionPolicy"),
  approvedAmount: document.querySelector("#approvedAmount"),
  voteMetric: document.querySelector("#voteMetric"),
  statusMetric: document.querySelector("#statusMetric"),
  debateTimeline: document.querySelector("#debateTimeline"),
  constitutionGrid: document.querySelector("#constitutionGrid"),
  gazetteCard: document.querySelector("#gazetteCard"),
  gazetteHistory: document.querySelector("#gazetteHistory"),
  downloadTraceButton: document.querySelector("#downloadTraceButton"),
  traceId: document.querySelector("#traceId"),
  tracePayload: document.querySelector("#tracePayload"),
  providerName: document.querySelector("#providerName"),
  passportId: document.querySelector("#passportId"),
  allowanceText: document.querySelector("#allowanceText"),
  balanceMetric: document.querySelector("#balanceMetric"),
  frozenMetric: document.querySelector("#frozenMetric"),
  triggeredLaws: document.querySelector("#triggeredLaws"),
  departmentCurrent: document.querySelector("#departmentCurrent"),
  departmentStatus: document.querySelector("#departmentStatus"),
  departmentTitle: document.querySelector("#departmentTitle"),
  departmentDescription: document.querySelector("#departmentDescription"),
  departmentAction: document.querySelector("#departmentAction"),
  providerModeButton: document.querySelector("#providerModeButton"),
  kiteGate: document.querySelector("#kiteGate"),
  providerDetail: document.querySelector("#providerDetail"),
  providerModeBadge: document.querySelector("#providerModeBadge"),
  passportState: document.querySelector("#passportState"),
  sessionState: document.querySelector("#sessionState"),
  paymentState: document.querySelector("#paymentState"),
  receiptState: document.querySelector("#receiptState"),
};

let activeRequestId = "meme";
let latestDecision = null;
let latestTrace = null;
let latestExecution = null;
let latestRequest = null;
let latestAllowance = null;
let latestPassport = null;
let isReviewing = false;

init();

async function init() {
  initVisualEffects();
  syncProviderPolicy();
  renderTemplateOptions();
  renderPolicyPreview(nationState);
  renderSetupForm();
  renderNationHeader();
  renderCitizens();
  renderConstitution();
  renderRequestList();
  renderMapDepartment("treasury");
  bindEvents();
  await renderProviderStatus();
  setView("setup");
  await selectRequest(activeRequestId);
  renderGazetteHistory();

}

function bindEvents() {
  elements.entryButtons.forEach((button) => {
    button.addEventListener("click", async () => {
      const action = button.dataset.entryAction;
      if (action === "home") {
        document.body.classList.add("pre-entry");
        resetEntryScene();
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }

      await playEntryExit();
      document.body.classList.remove("pre-entry");
      resetEntryScene();
      if (action === "review") {
        await selectRequest("meme");
        setView("review");
        return;
      }

      setView("setup");
    });
  });

  elements.viewButtons.forEach((button) => {
    button.addEventListener("click", () => setView(button.dataset.viewTab));
  });

  elements.providerModeButton?.addEventListener("click", () => {
    const url = new URL(window.location.href);
    if (provider.providerMode === "kite-passport") {
      url.searchParams.delete("provider");
    } else {
      url.searchParams.set("provider", "kite");
    }
    window.location.assign(url.toString());
  });

  document.querySelectorAll("[data-map-view]").forEach((button) => {
    button.addEventListener("click", async () => {
      if (button.dataset.mapRequest) await selectRequest(button.dataset.mapRequest);
      if (button.dataset.mapView) setView(button.dataset.mapView);
    });
  });

  document.querySelectorAll("[data-map-target]").forEach((button) => {
    button.addEventListener("click", () => renderMapDepartment(button.dataset.mapTarget));
  });

  elements.templateOptions?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-template-id]");
    if (!button) return;
    selectTemplate(button.dataset.templateId);
  });

  elements.updateNationButton?.addEventListener("click", async () => {
    updateNationFromForm();
    setText(elements.setupStatus, "个人宪法已根据新的目标和预算重新生成。");
    pulseElement(elements.updateNationButton);
    await selectRequest(activeRequestId);
    setView("constitution");
  });

  elements.constitutionGrid?.addEventListener("input", (event) => {
    const field = event.target.closest("[data-article-id]");
    if (!field) return;
    const article = constitutionArticles.find((item) => item.id === field.dataset.articleId);
    if (!article) return;
    article.text = field.value;
    saveConstitutionArticles();
    const effect = field.closest(".policy-editor")?.querySelector(".policy-effect");
    setText(effect, policyEffectLabel(article.id));
    syncProviderPolicy();
    renderNationHeader();
  });

  elements.requestList?.addEventListener("click", async (event) => {
    const card = event.target.closest("[data-request-id]");
    if (!card) return;
    await selectRequest(card.dataset.requestId);
  });

  elements.requestList?.addEventListener("keydown", async (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    const card = event.target.closest("[data-request-id]");
    if (!card) return;
    event.preventDefault();
    await selectRequest(card.dataset.requestId);
  });

  elements.proposalForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    await submitCustomProposal();
    pulseElement(elements.proposalForm);
  });

  elements.runReviewButton?.addEventListener("click", async () => {
    await reviewActiveRequest();
    setView("review");
  });

  elements.overrideButton?.addEventListener("click", async () => {
    await overrideActiveDecision();
    setView("trace");
  });

  elements.downloadTraceButton?.addEventListener("click", () => {
    if (!latestTrace) return;
    downloadJson(latestTrace, `pocket-republic-trace-${activeRequestId}.json`);
  });

}

function renderTemplateOptions() {
  setHtml(
    elements.templateOptions,
    nationTemplates
      .map((template) => {
        const active = template.id === nationState.id;
        const featured = template.featured
          ? `<em class="template-featured">${escapeHtml(template.featured)}</em>`
          : "";
        return `
          <button class="template-chip${active ? " active" : ""}" type="button" data-template-id="${template.id}" aria-pressed="${active}">
            <span class="template-policy-label">Kite Wallet Policy</span>
            ${featured}
            <span class="template-title">
              <strong>${escapeHtml(template.cn)}</strong>
              <small>${escapeHtml(template.en)}</small>
            </span>
            <span class="template-subtitle">${escapeHtml(template.subtitle)}</span>
            <span class="template-wallet-metrics">
              ${template.walletMetrics
                .map(
                  (metric) => `
                    <span>
                      <small>${escapeHtml(metric.label)}</small>
                      <strong>${escapeHtml(metric.value)}</strong>
                    </span>
                  `,
                )
                .join("")}
            </span>
            <span class="template-rule">${escapeHtml(template.treasuryRule)}</span>
            <span class="template-route">审批路线：${escapeHtml(template.approvalRoute)}</span>
            <span class="template-demo">${escapeHtml(template.demoHint)}</span>
          </button>
        `;
      })
      .join(""),
  );
}

function renderPolicyPreview(template = nationState) {
  if (!elements.policyPreviewContent || !template) return;
  const isSandbox = provider.providerMode === "sandbox";
  const providerLabel = isSandbox ? "Sandbox / 本地政策推演" : "Kite Passport / Scoped Spending Session";
  const coolingLabel = template.coolingPeriodHours > 0 ? `${template.coolingPeriodHours} 小时` : "按议案触发";
  const rows = [
    ["当前国度", `${template.cn} / ${template.en}`],
    ["支付资产", "USDC"],
    ["月度授权", `${template.monthlyBudget} USDC`],
    ["单笔审查线", `${template.singleSpendLimit} USDC`],
    ["高风险上限", `${template.highRiskLimit} USDC`],
    ["冷静期", coolingLabel],
    ["审批路线", template.approvalRoute],
    ["运行环境", providerLabel],
  ];

  setHtml(
    elements.policyPreviewContent,
    `
      <dl class="policy-preview-list">
        ${rows
          .map(
            ([label, value]) => `
              <div>
                <dt>${escapeHtml(label)}</dt>
                <dd>${escapeHtml(value)}</dd>
              </div>
            `,
          )
          .join("")}
      </dl>
      <div class="policy-preview-rule">
        <span>国库放行原则</span>
        <p>${escapeHtml(template.treasuryRule)}</p>
      </div>
      <p class="policy-preview-truth">
        ${
          isSandbox
            ? "当前仅推演宪法、额度与审议结果，不执行或伪造链上交易。"
            : "实际支付还必须同时通过立宪者批准的 Kite Spending Session。"
        }
      </p>
    `,
  );
  pulseElement(elements.policyPreview);
}

function renderSetupForm() {
  if (elements.nationNameInput) elements.nationNameInput.value = nationState.nationName;
  if (elements.missionInput) elements.missionInput.value = nationState.mission;
  if (elements.monthlyBudgetInput) elements.monthlyBudgetInput.value = String(nationState.monthlyBudget);
  if (elements.singleLimitInput) elements.singleLimitInput.value = String(nationState.singleSpendLimit);
  if (elements.highRiskLimitInput) elements.highRiskLimitInput.value = String(nationState.highRiskLimit);
  setText(elements.setupStatus, `${nationState.cn}已准备就绪。`);
}

function renderNationHeader() {
  const policy = deriveConstitutionPolicy(constitutionArticles, nationState);
  setText(elements.nationName, nationState.nationName);
  setText(elements.nationMission, `本阶段目标：${nationState.mission}`);
  setText(elements.treasuryHeroMetric, `${nationState.monthlyBudget} USDC`);
  setHtml(
    elements.nationTags,
    [
      nationState.cn,
      `国民：${agentProfiles.length} 位`,
      `单笔限额：${policy.singleSpendLimit} USDC`,
      `高风险上限：${policy.highRiskLimit} USDC`,
      "忠诚对象：宪法",
    ]
      .map((tag) => `<span>${escapeHtml(tag)}</span>`)
      .join(""),
  );
}

function renderCitizens() {
  setHtml(
    elements.citizenList,
    agentProfiles
      .map(
        (agent) => `
          <article class="citizen-card">
            <div class="citizen-head">
              <span>${escapeHtml(agent.name)}</span>
              <code>${agent.reputation}</code>
            </div>
            <strong>${escapeHtml(agent.role)}</strong>
            <p>所属部门：${escapeHtml(agent.department)}</p>
            <small>${escapeHtml(agent.duty)}</small>
            <dl>
              <div>
                <dt>护照</dt>
                <dd>${escapeHtml(citizenPassportLabel(agent))}</dd>
              </div>
              <div>
                <dt>权限</dt>
                <dd>${escapeHtml(agent.permissions.map(permissionLabel).join("、"))}</dd>
              </div>
              <div>
                <dt>忠诚对象</dt>
                <dd>个人宪法</dd>
              </div>
            </dl>
          </article>
        `,
      )
      .join(""),
  );
}

function citizenPassportLabel(agent) {
  if (provider.providerMode !== "kite-passport") return agent.passport;
  if (agent.id !== "treasurer") return "后续阶段 · 待注册";
  if (!latestPassport || latestPassport.agentPassportId === "not-registered") return "Kite Agent · 待注册";
  return latestPassport.agentPassportId;
}

function renderMapDepartment(departmentId) {
  const department = mapDepartments[departmentId] ?? mapDepartments.treasury;
  document.querySelectorAll("[data-map-target]").forEach((button) => {
    button.classList.toggle("active", button.dataset.mapTarget === departmentId);
  });
  setText(elements.departmentStatus, department.status);
  setText(elements.departmentTitle, department.title);
  setText(elements.departmentDescription, department.description);
  setText(elements.departmentAction, department.actionLabel);
  if (elements.departmentAction) {
    elements.departmentAction.disabled = !department.view;
    if (department.view) {
      elements.departmentAction.dataset.mapView = department.view;
    } else {
      delete elements.departmentAction.dataset.mapView;
    }
    if (department.requestId) {
      elements.departmentAction.dataset.mapRequest = department.requestId;
    } else {
      delete elements.departmentAction.dataset.mapRequest;
    }
  }
  if (elements.departmentCurrent) {
    elements.departmentCurrent.dataset.department = departmentId;
    pulseElement(elements.departmentCurrent);
  }
}

function renderConstitution() {
  setHtml(
    elements.constitutionGrid,
    constitutionArticles
      .map(
        (article) => `
          <article class="policy-card editable-policy">
            <span>${escapeHtml(article.id)}</span>
            <strong>${escapeHtml(article.title)}</strong>
            <div class="policy-editor">
              <textarea data-article-id="${escapeHtml(article.id)}" rows="5" aria-label="编辑宪法条款 ${escapeHtml(article.id)} ${escapeHtml(article.title)}">${escapeHtml(article.text)}</textarea>
              <small class="policy-effect">${escapeHtml(policyEffectLabel(article.id))}</small>
            </div>
          </article>
        `,
      )
      .join(""),
  );
}

function policyEffectLabel(articleId) {
  const policy = deriveConstitutionPolicy(constitutionArticles, nationState);
  if (articleId === "A2") return `当前生效：单笔审查线 ${policy.singleSpendLimit} USDC`;
  if (articleId === "A3") return `当前生效：高风险上限 ${policy.highRiskLimit} USDC`;
  if (articleId === "A4") return "当前生效：识别强时效与 FOMO 信号";
  if (articleId === "A6") return "当前生效：允许补付差额并保留完整审计记录";
  return "已纳入下一次财政审议";
}

function renderRequestList() {
  setHtml(
    elements.requestList,
    Object.values(requests)
      .map(
        (request) => `
          <article class="request-card" tabindex="0" role="button" data-request-id="${escapeHtml(request.id)}">
            <div>
              <span>${escapeHtml(request.category)}</span>
              <strong>${escapeHtml(request.title)}</strong>
              <p>${escapeHtml(request.summary)}</p>
            </div>
            <div class="request-card-footer">
              <code>${request.amount} ${escapeHtml(request.currency)}</code>
              <em>${escapeHtml(request.statusHint)}</em>
            </div>
          </article>
        `,
      )
      .join(""),
  );
}

async function renderProviderStatus() {
  syncProviderPolicy();
  try {
    const passport = await provider.getAgentPassport();
    const allowance = await provider.getAllowance();
    latestPassport = passport;
    latestAllowance = allowance;

    setText(elements.providerName, providerDisplayName(provider.providerName));
    setText(elements.passportId, passport.agentPassportId);
    setText(elements.allowanceText, allowanceStatusText(allowance));
    setText(
      elements.balanceMetric,
      provider.providerMode === "kite-passport"
        ? allowance.walletBalance == null
          ? "待读取"
          : `${allowance.walletBalance} ${allowance.currency}`
        : `${allowance.remaining} ${allowance.currency}`,
    );
    setText(
      elements.treasuryHeroMetric,
      allowance.totalLimit > 0 ? `${allowance.remaining}/${allowance.totalLimit} ${allowance.currency}` : "尚未授权",
    );
    renderProtocolStatus(passport, allowance);
    renderPolicyPreview(nationState);
    renderCitizens();
    return true;
  } catch (error) {
    latestPassport = null;
    latestAllowance = null;
    setText(elements.providerName, "Kite Passport 离线");
    setText(elements.passportId, "尚未连接 Agent Passport");
    setText(elements.allowanceText, providerErrorMessage(error));
    setText(elements.balanceMetric, "不可用");
    setText(elements.treasuryHeroMetric, "不可用");
    renderProtocolError(error);
    renderPolicyPreview(nationState);
    renderCitizens();
    return false;
  }
}

function renderProtocolStatus(passport, allowance) {
  const isSandbox = provider.providerMode === "sandbox";
  const isAuthenticated = passport.status !== "unauthenticated";
  const hasAgent = passport.status === "active" || isSandbox;
  const hasSession = allowance.status === "active" || allowance.status === "sandbox_active";

  if (elements.kiteGate) {
    elements.kiteGate.dataset.kiteState = isSandbox
      ? "sandbox"
      : !isAuthenticated
        ? "unauthenticated"
        : hasSession
          ? "ready"
          : "session-required";
  }
  setText(elements.providerModeBadge, isSandbox ? "沙盒推演 · 非链上" : "Kite Passport 真实模式");
  setText(elements.passportState, isSandbox ? "演示身份" : !isAuthenticated ? "等待登录" : hasAgent ? "身份有效" : "待注册");
  setText(elements.sessionState, isSandbox ? "本地额度" : hasSession ? "Session 生效" : "待立宪者批准");
  setText(elements.paymentState, "等待议案");
  setText(elements.receiptState, isSandbox ? "仅生成沙盒凭证" : "尚未生成");
  setText(
    elements.providerDetail,
    isSandbox
      ? "当前是可完整体验的沙盒国度。所有审查、额度和公报都会运行，但不会伪装成 Kite 链上交易。"
      : !isAuthenticated
        ? "Kite 生产后端已连接。立宪者完成邮箱登录与 Passkey 后，财政大臣才能申请 Spending Session。"
        : hasSession
          ? "财政大臣拥有一个仍在有效期内的 Scoped Session，可以在宪法与 Session 的双重边界内购买服务。"
          : "Agent Passport 已连接，下一笔合规议案会生成 Delegation，并请求你用 Passkey 盖下国玺。",
  );
  if (elements.providerModeButton) {
    const isLocal = ["localhost", "127.0.0.1"].includes(window.location.hostname);
    elements.providerModeButton.hidden = !isLocal && isSandbox;
    setText(elements.providerModeButton, isSandbox ? "启用真实 Passport" : "返回沙盒国库");
  }
}

function renderProtocolError(error) {
  if (elements.kiteGate) elements.kiteGate.dataset.kiteState = "offline";
  setText(elements.providerModeBadge, "Kite 桥接未连接");
  setText(elements.passportState, "不可用");
  setText(elements.sessionState, "不可用");
  setText(elements.paymentState, "未执行");
  setText(elements.receiptState, "未生成");
  setText(elements.providerDetail, providerErrorMessage(error));
  if (elements.providerModeButton) setText(elements.providerModeButton, "返回沙盒国库");
}

function selectTemplate(templateId) {
  const template = nationTemplates.find((item) => item.id === templateId);
  if (!template) return;
  nationState = {
    ...template,
    mission: elements.missionInput?.value.trim() || template.mission,
  };
  constitutionArticles = buildConstitution(nationState);
  saveNationState();
  saveConstitutionArticles();
  syncProviderPolicy();
  renderTemplateOptions();
  renderPolicyPreview(nationState);
  renderSetupForm();
  renderNationHeader();
  renderConstitution();
  renderProviderStatus();
}

function updateNationFromForm() {
  nationState = {
    ...nationState,
    nationName: elements.nationNameInput?.value.trim() || nationState.nationName,
    mission: elements.missionInput?.value.trim() || nationState.mission,
    monthlyBudget: normalizeAmount(elements.monthlyBudgetInput?.value, nationState.monthlyBudget),
    singleSpendLimit: normalizeAmount(elements.singleLimitInput?.value, nationState.singleSpendLimit),
    highRiskLimit: normalizeAmount(elements.highRiskLimitInput?.value, nationState.highRiskLimit),
  };
  constitutionArticles = buildConstitution(nationState);
  saveNationState();
  saveConstitutionArticles();
  syncProviderPolicy();
  renderTemplateOptions();
  renderPolicyPreview(nationState);
  renderNationHeader();
  renderConstitution();
  renderProviderStatus();
}

async function submitCustomProposal() {
  const title = elements.proposalTitleInput?.value.trim() || "用户提交的新财政议案";
  const amount = normalizeAmount(elements.proposalAmountInput?.value, nationState.singleSpendLimit);
  const context =
    elements.proposalContextInput?.value.trim() ||
    "用户提交了一笔新的支出请求，希望国民议会根据个人宪法判断是否批准。";
  const serviceUrl = elements.proposalServiceUrlInput?.value.trim() || null;

  requests.custom = {
    id: "custom",
    title,
    requester: "立宪者 / 用户提交",
    amount,
    currency: "USDC",
    merchant: "用户指定服务",
    category: "自定义财政议案",
    summary: context,
    context,
    serviceUrl,
    serviceMethod: "GET",
    statusHint: "等待议会审查",
  };

  renderRequestList();
  await selectRequest("custom");
  setView("review");
  setText(elements.setupStatus, "新财政议案已提交给国民议会。");
}

async function selectRequest(requestId) {
  activeRequestId = requestId;
  const request = requests[requestId];
  if (!request) return;

  document.querySelectorAll("[data-request-id]").forEach((card) => {
    card.classList.toggle("active", card.dataset.requestId === requestId);
  });

  latestRequest = request;
  latestDecision = await decide(request);
  latestTrace = null;
  latestExecution = null;

  setText(elements.requestTitle, request.title);
  setText(elements.requestSummary, request.summary);
  setText(elements.requestedAmount, `${request.amount} ${request.currency}`);
  setText(elements.requestMerchant, request.merchant);

  renderDraftReview(request, latestDecision);
}

function renderDraftReview(request, decision) {
  renderRiskTags(decision);
  renderTriggeredLaws(decision);
  renderDebate(decision.debate);
  resetReviewProgress();

  setText(elements.decisionTitle, `${decisionTitleFor(decision.action)}（预审）`);
  setText(elements.decisionPolicy, decision.policy);
  setText(elements.approvedAmount, `${decision.approvedAmount} ${request.currency}`);
  setText(
    elements.voteMetric,
    `${decision.vote.approve}:${decision.vote.oppose + decision.vote.reduce + decision.vote.delay}`,
  );
  setText(elements.statusMetric, "待执行");
  setText(elements.frozenMetric, `${decision.frozenAmount} ${request.currency}`);
  setText(elements.traceId, "待执行");
  setText(
    elements.tracePayload,
    JSON.stringify(
      {
        notice: "点击“运行国库审查”后，财政大臣会创建 Kite payment intent 并生成国家公报。",
        nation: {
          name: nationState.nationName,
          template: nationState.label,
        },
        proposal: request,
        draftDecision: decision,
      },
      null,
      2,
    ),
  );
  if (elements.downloadTraceButton) elements.downloadTraceButton.disabled = true;
  if (elements.overrideButton) elements.overrideButton.disabled = true;
  renderGazetteDraft({ request, decision });
}

async function reviewActiveRequest() {
  if (isReviewing) return;
  const request = requests[activeRequestId];
  if (!request) return;
  latestRequest = request;
  await playReviewProgress();
  latestDecision = await decide(request);
  await executeDecision(request, latestDecision, { record: true });
}

async function executeDecision(request, decision, options = {}) {
  syncProviderPolicy();
  let intent;
  let execution;
  let trace;
  try {
    intent = await provider.createPaymentIntent({
      proposal: request,
      decision,
      decisionHash: decision.decisionHash,
    });
    execution = await provider.executePayment(intent);
    trace = await provider.tracePayment({ proposal: request, decision, intent, execution });
  } catch (error) {
    latestTrace = null;
    latestExecution = null;
    setText(elements.decisionTitle, "Kite 国库执行失败");
    setText(elements.decisionPolicy, `议会结论已保留，但付款没有执行。${providerErrorMessage(error)}`);
    setText(elements.statusMetric, "未执行");
    setText(elements.traceId, "未生成账本");
    setText(
      elements.tracePayload,
      JSON.stringify(
        {
          status: "payment_not_executed",
          decisionHash: decision.decisionHash,
          message: providerErrorMessage(error),
        },
        null,
        2,
      ),
    );
    if (elements.downloadTraceButton) elements.downloadTraceButton.disabled = true;
    if (elements.overrideButton) elements.overrideButton.disabled = true;
    setText(elements.paymentState, "执行失败");
    setText(elements.receiptState, "未生成");
    if (elements.kiteGate) elements.kiteGate.dataset.kiteState = "error";
    return false;
  }
  latestTrace = trace;
  latestExecution = execution;

  const isSessionPending = execution.status === "session_pending";
  setText(elements.decisionTitle, isSessionPending ? "国玺待盖" : decisionTitleFor(decision.action));
  setText(
    elements.decisionPolicy,
    isSessionPending
      ? "宪法已经通过议案，Kite Spending Session 正在等待立宪者用 Passkey 批准。批准后再次运行，Agent 才能自主支付。"
      : decision.policy,
  );
  setText(elements.approvedAmount, `${decision.approvedAmount} ${request.currency}`);
  setText(
    elements.voteMetric,
    `${decision.vote.approve}:${decision.vote.oppose + decision.vote.reduce + decision.vote.delay}`,
  );
  setText(elements.statusMetric, executionStatusLabel(execution, decision));
  setText(elements.frozenMetric, `${decision.frozenAmount} ${request.currency}`);
  if (!isSessionPending && Number.isFinite(execution.remainingAllowance)) {
    setText(elements.treasuryHeroMetric, `${execution.remainingAllowance} ${request.currency}`);
    if (execution.txMode === "sandbox-ledger") {
      setText(elements.balanceMetric, `${execution.remainingAllowance} ${request.currency}`);
    }
  }
  if (latestAllowance && !isSessionPending && latestAllowance.totalLimit > 0) {
    latestAllowance.remaining = execution.remainingAllowance;
    setText(
      elements.allowanceText,
      `${execution.remainingAllowance}/${latestAllowance.totalLimit} ${latestAllowance.currency}`,
    );
  }
  setText(elements.traceId, execution.ledgerId);
  setText(elements.tracePayload, JSON.stringify(trace, null, 2));
  if (elements.downloadTraceButton) elements.downloadTraceButton.disabled = false;
  if (elements.overrideButton) {
    elements.overrideButton.disabled =
      isSessionPending || decision.action === "override_execute" || decision.frozenAmount <= 0;
  }

  renderExecutionProtocol(execution);

  renderDebate(decision.debate);
  renderGazette({ request, decision, execution });
  if (options.record) {
    recordGazette({
      request,
      decision,
      execution,
      trace,
      kind: decision.action === "override_execute" ? "override" : "review",
    });
  }
  renderGazetteHistory();
  return true;
}

function renderExecutionProtocol(execution) {
  const pending = execution.status === "session_pending";
  const settled = execution.status === "settled_onchain";
  const sandbox = execution.txMode === "sandbox-ledger";
  if (elements.kiteGate) {
    elements.kiteGate.dataset.kiteState = pending ? "pending" : settled ? "settled" : sandbox ? "sandbox" : "receipt-pending";
  }
  setText(elements.sessionState, pending ? "等待 Passkey" : sandbox ? "本地额度已核验" : "Session 生效");
  setText(elements.paymentState, pending ? "尚未执行" : sandbox ? "沙盒已执行" : "x402 服务已交付");
  setText(
    elements.receiptState,
    settled ? "链上凭证已生成" : sandbox ? "沙盒凭证 · 非链上" : pending ? "等待批准" : "服务回执已到，链上引用待确认",
  );
}

async function overrideActiveDecision() {
  if (!latestRequest || !latestDecision || isReviewing) return;
  const overrideDecision = await createOverrideDecision(latestRequest, latestDecision, latestExecution);
  latestDecision = overrideDecision;
  await playReviewProgress([
    "记录立宪者推翻操作",
    "检查 A6 用户主权条款",
    "生成推翻国家公报",
    "更新 Kite 凭证包",
  ]);
  await executeDecision(latestRequest, overrideDecision, { record: true });
}

async function decide(request) {
  const coreDecision = buildPaymentDecision(request, nationState, constitutionArticles);
  const { action, approvedAmount, frozenAmount, policyLimits, riskSignals, triggeredArticles, policy } =
    coreDecision;

  const vote = createVote(action);
  const debate = createDebate({
    request,
    action,
    approvedAmount,
    policyLimits,
    riskSignals,
    triggeredArticles,
  });
  const decisionHash = await sha256Hex({
    requestId: request.id,
    title: request.title,
    amount: request.amount,
    currency: request.currency,
    action,
    approvedAmount,
    frozenAmount,
    triggeredArticles,
    policy,
    policyLimits,
    constitutionHash: await constitutionHash(),
    nationTemplate: nationState.id,
  });

  return {
    action,
    approvedAmount,
    frozenAmount,
    riskSignals,
    triggeredArticles,
    policy,
    policyLimits,
    debate,
    vote,
    decisionHash,
  };
}

function createVote(action) {
  if (action === "approve") {
    return { approve: 6, oppose: 0, reduce: 0, delay: 0 };
  }
  if (action === "require_confirmation") {
    return { approve: 2, oppose: 1, reduce: 3, delay: 0 };
  }
  if (action === "override_execute") {
    return { approve: 1, oppose: 4, reduce: 0, delay: 1 };
  }
  return { approve: 1, oppose: 3, reduce: 1, delay: 1 };
}

function createDebate({ request, action, approvedAmount, policyLimits, riskSignals, triggeredArticles }) {
  const missionAligned = riskSignals.includes("mission_aligned");
  const highRisk = riskSignals.includes("high_risk_asset");
  const fomo = riskSignals.includes("fomo");
  const articleText = triggeredArticles.join(", ");

  return [
    {
      agent: "Vale",
      role: "书记官",
      department: "档案馆",
      stance: "approve",
      text: `议案已登记：${request.title}，申请 ${request.amount} ${request.currency}。触发条款：${articleText}。`,
    },
    {
      agent: "Rin",
      role: "审计官",
      department: "审计院",
      stance: highRisk ? "oppose" : "approve",
      text: highRisk
        ? `该请求包含高风险资产和时间压力，不能按普通付款处理。`
        : `未发现高风险资产信号，可以进入国库额度检查。`,
    },
    {
      agent: "Mira",
      role: "财政大臣",
      department: "Kite 国库",
      stance: action === "approve" ? "approve" : "reduce",
      text:
        action === "approve"
          ? `请求金额未超过 ${policyLimits.singleSpendLimit} USDC 单笔限额，Kite 国库可以执行。`
          : `请求金额 ${request.amount} ${request.currency} 超出当前宪法边界，国库只放行 ${approvedAmount} ${request.currency}。`,
    },
    {
      agent: "Ivo",
      role: "建设部长",
      department: "创作工坊",
      stance: missionAligned ? "approve" : "reduce",
      text: missionAligned
        ? `这笔支出服务当前国家目标，可以作为项目推进预算处理。`
        : `建议先缩小试验金额，把剩余预算留给更确定的工具、API 或项目资产。`,
    },
    {
      agent: "Noa",
      role: "反对党领袖",
      department: "国民议会",
      stance: fomo ? "delay" : "oppose",
      text: fomo
        ? `这不是策略，是 FOMO。反对全额通过，建议进入冷静期。`
        : `我反对无条件通过，请先证明它符合国家目标和预算纪律。`,
    },
    {
      agent: "Luma",
      role: "心灵部长",
      department: "心灵花园",
      stance: fomo ? "delay" : "approve",
      text: fomo
        ? `检测到“今晚、错过、100x”等强情绪词，建议先保护用户情绪，不做不可逆付款。`
        : `没有明显强情绪信号，心灵部不阻止本次议案继续审议。`,
    },
    {
      agent: "Sol",
      role: "首相",
      department: "内阁",
      stance: action === "approve" ? "approve" : "reduce",
      text:
        action === "approve"
          ? `内阁建议通过，并由书记官生成国家公报。`
          : `内阁建议按宪法执行限额方案，保留用户推翻权利，但必须归档。`,
    },
  ];
}

async function createOverrideDecision(request, previousDecision, previousExecution) {
  const alreadyExecutedAmount = previousExecution?.executedAmount ?? 0;
  const approvedAmount = calculateOverrideAmount(request.amount, alreadyExecutedAmount);
  const frozenAmount = 0;
  const triggeredArticles = [...new Set([...previousDecision.triggeredArticles, "A6"])];
  const policy = `立宪者触发 A6 用户主权条款。议会警告仍会归档，Kite 国库只补付尚未执行的 ${approvedAmount} ${request.currency}。`;
  const decisionHash = await sha256Hex({
    requestId: request.id,
    title: request.title,
    amount: request.amount,
    currency: request.currency,
    action: "override_execute",
    approvedAmount,
    alreadyExecutedAmount,
    frozenAmount,
    triggeredArticles,
    previousDecisionHash: previousDecision.decisionHash,
    policy,
    constitutionHash: await constitutionHash(),
    nationTemplate: nationState.id,
  });

  return {
    action: "override_execute",
    approvedAmount,
    alreadyExecutedAmount,
    frozenAmount,
    previousDecisionHash: previousDecision.decisionHash,
    riskSignals: previousDecision.riskSignals,
    triggeredArticles,
    policy,
    vote: createVote("override_execute"),
    decisionHash,
    debate: [
      ...previousDecision.debate,
      {
        agent: "Vale",
        role: "书记官",
        department: "档案馆",
        stance: "override",
        text: `立宪者推翻议会结论。A6 已触发：已执行 ${alreadyExecutedAmount} ${request.currency}，本次仅补付 ${approvedAmount} ${request.currency}，全部记录写入国家公报。`,
      },
    ],
  };
}

function renderRiskTags(decision) {
  setHtml(
    elements.riskTags,
    decision.riskSignals.length
      ? decision.riskSignals.map((signal) => `<span>${escapeHtml(riskSignalLabel(signal))}</span>`).join("")
      : "<span>未发现主要风险</span>",
  );
}

function renderTriggeredLaws(decision) {
  setHtml(
    elements.triggeredLaws,
    decision.triggeredArticles
      .map((articleId) => {
        const article = constitutionArticles.find((item) => item.id === articleId);
        return `<span class="law-chip">${escapeHtml(articleId)} ${escapeHtml(article?.title ?? "自定义条款")}</span>`;
      })
      .join(""),
  );
}

function renderDebate(debate) {
  setHtml(
    elements.debateTimeline,
    debate
      .map((item) => {
        const profile = agentProfiles.find((agent) => agent.name === item.agent);
        const voteClass = item.stance === "override" ? "vote-override" : (profile?.voteClass ?? "vote-approve");
        return `
          <article class="debate-item">
            <div>
              <strong>${escapeHtml(item.agent)}</strong>
              <small>${escapeHtml(item.department)} / ${escapeHtml(item.role)}</small>
              <span class="vote ${voteClass}">${escapeHtml(stanceLabel(item.stance))}</span>
            </div>
            <p>${escapeHtml(item.text)}</p>
          </article>
        `;
      })
      .join(""),
  );
}

function resetReviewProgress() {
  setHtml(
    elements.reviewProgress,
    `
      <div class="progress-step muted">
        <span>0</span>
        <strong>已生成议会预审，等待财政大臣执行 Kite 国库审查</strong>
      </div>
    `,
  );
}

function renderGazetteDraft({ request, decision }) {
  setHtml(
    elements.gazetteCard,
    `
      <p class="kicker">国家公报草案</p>
      <h3>${escapeHtml(decisionTitleFor(decision.action))}</h3>
      <dl class="gazette-list">
        <div>
          <dt>国家</dt>
          <dd>${escapeHtml(nationState.nationName)}</dd>
        </div>
        <div>
          <dt>议案</dt>
          <dd>${escapeHtml(request.title)}</dd>
        </div>
        <div>
          <dt>申请金额</dt>
          <dd>${request.amount} ${escapeHtml(request.currency)}</dd>
        </div>
        <div>
          <dt>预审金额</dt>
          <dd>${decision.approvedAmount} ${escapeHtml(request.currency)}</dd>
        </div>
        <div>
          <dt>状态</dt>
          <dd>等待 Kite 国库执行</dd>
        </div>
      </dl>
    `,
  );
}

function renderGazette({ request, decision, execution }) {
  const proofLabel = execution.isOnchain
    ? "Kite 链上凭证"
    : execution.txMode === "sandbox-ledger"
      ? "沙盒推演 · 非链上"
      : execution.status === "session_pending"
        ? "Spending Session 等待 Passkey"
        : "服务回执已到，结算引用待确认";
  setHtml(
    elements.gazetteCard,
    `
      <p class="kicker">国家公报</p>
      <h3>${escapeHtml(decisionTitleFor(decision.action))}</h3>
      <dl class="gazette-list">
        <div>
          <dt>国家</dt>
          <dd>${escapeHtml(nationState.nationName)}</dd>
        </div>
        <div>
          <dt>请求来源</dt>
          <dd>${escapeHtml(request.requester)}</dd>
        </div>
        <div>
          <dt>申请金额</dt>
          <dd>${request.amount} ${escapeHtml(request.currency)}</dd>
        </div>
        <div>
          <dt>批准金额</dt>
          <dd>${decision.approvedAmount} ${escapeHtml(request.currency)}</dd>
        </div>
        <div>
          <dt>实际支付</dt>
          <dd>${execution.executedAmount} ${escapeHtml(execution.currency)}</dd>
        </div>
        <div>
          <dt>${execution.status === "session_pending" ? "Session 请求" : "账本编号"}</dt>
          <dd>${escapeHtml(execution.ledgerId)}</dd>
        </div>
        <div>
          <dt>证明状态</dt>
          <dd>${escapeHtml(proofLabel)}</dd>
        </div>
        <div>
          <dt>决策哈希</dt>
          <dd>${escapeHtml(decision.decisionHash)}</dd>
        </div>
      </dl>
      ${renderGazetteTerminal({ decision, execution })}
    `,
  );
}

function renderGazetteTerminal({ decision, execution }) {
  const isSandbox = execution.txMode === "sandbox-ledger";
  if (isSandbox) {
    return `
      <section class="gazette-terminal" data-execution-mode="sandbox" aria-label="沙盒执行记录">
        <div class="gazette-terminal-heading">
          <span>[SANDBOX] POCKET REPUBLIC POLICY SIMULATION</span>
          <strong>非链上记录</strong>
        </div>
        <dl>
          <div><dt>本地 Agent</dt><dd>${escapeHtml(latestPassport?.agentPassportId ?? "sandbox-agent")}</dd></div>
          <div><dt>本地 Session</dt><dd>${escapeHtml(execution.session?.sessionId ?? "sandbox-session")}</dd></div>
          <div><dt>推演支付</dt><dd>${execution.executedAmount} ${escapeHtml(execution.currency)}</dd></div>
          <div><dt>宪法决策</dt><dd>${escapeHtml(decision.decisionHash)}</dd></div>
        </dl>
        <p>这份记录只证明 Pocket Republic 的宪法、议会与额度流程已经运行，不是 Kite 链上凭证，也不包含伪造交易哈希。</p>
      </section>
    `;
  }

  const agentPassportId = latestPassport?.status === "active" ? latestPassport.agentPassportId : null;
  const sessionId = execution.session?.sessionId || null;
  const settlementReference = execution.isOnchain ? execution.settlementReference : null;
  const paidAmount = execution.executedAmount > 0 ? `${execution.executedAmount} ${execution.currency}` : null;
  const fields = [
    ["Agent Passport ID", agentPassportId],
    ["Spending Session ID", sessionId],
    ["Settlement Reference", settlementReference],
    ["Paid Amount", paidAmount],
  ].filter(([, value]) => Boolean(value));

  return `
    <section class="gazette-terminal" data-execution-mode="kite-passport" aria-label="Kite 真实执行字段">
      <div class="gazette-terminal-heading">
        <span>KITE PASSPORT EXECUTION</span>
        <strong>${fields.length ? "Kite 返回字段" : "等待 Kite 返回执行字段"}</strong>
      </div>
      ${
        fields.length
          ? `<dl>${fields
              .map(
                ([label, value]) => `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`,
              )
              .join("")}</dl>`
          : '<p class="gazette-terminal-empty">当前尚无可展示的 Kite 执行字段。未返回的 Agent、Session 与结算信息不会被补造。</p>'
      }
    </section>
  `;
}

function recordGazette({ request, decision, execution, trace, kind }) {
  const entry = {
    id: `${kind}:${request.id}:${execution.ledgerId}`,
    kind,
    requestId: request.id,
    title: request.title,
    requester: request.requester,
    action: decision.action,
    requestedAmount: request.amount,
    approvedAmount: decision.approvedAmount,
    executedAmount: execution.executedAmount,
    currency: request.currency,
    ledgerId: execution.ledgerId,
    proofMode: execution.isOnchain ? "onchain" : execution.txMode === "sandbox-ledger" ? "sandbox" : execution.status,
    decisionHash: decision.decisionHash,
    createdAt: execution.executedAt,
    trace,
  };
  const history = readGazetteHistory().filter((item) => item.id !== entry.id);
  history.unshift(entry);
  window.localStorage.setItem(storageKeys.gazette, JSON.stringify(history.slice(0, 8)));
}

function renderGazetteHistory() {
  const history = readGazetteHistory();
  setHtml(
    elements.gazetteHistory,
    history.length
      ? history
          .map(
            (item) => `
              <article class="history-item">
                <div>
                  <span>${escapeHtml(historyActionLabel(item))}</span>
                  <strong>${escapeHtml(item.title)}</strong>
                  <p>申请 ${item.requestedAmount} ${escapeHtml(item.currency)} · 批准 ${item.approvedAmount} ${escapeHtml(
                    item.currency,
                  )} · ${escapeHtml(historyProofLabel(item))}</p>
                </div>
                <code>${escapeHtml(item.ledgerId)}</code>
              </article>
            `,
          )
          .join("")
      : `<p class="empty-state">暂无国家公报记录。</p>`,
  );
}

async function playReviewProgress(steps = defaultReviewSteps()) {
  isReviewing = true;
  setDisabled(elements.runReviewButton, true);
  setDisabled(elements.overrideButton, true);
  setText(elements.decisionTitle, "正在审查议案");
  setText(elements.decisionPolicy, "Agent 国民正在根据你的宪法和 Kite 授权额度检查这笔请求。");
  setText(elements.statusMetric, "审查中");
  setText(elements.voteMetric, "...");
  setHtml(
    elements.reviewProgress,
    steps
      .map(
        (step, index) => `
          <div class="progress-step${index === 0 ? " active" : ""}">
            <span>${index + 1}</span>
            <strong>${escapeHtml(step)}</strong>
          </div>
        `,
      )
      .join(""),
  );

  for (let index = 0; index < steps.length; index += 1) {
    elements.reviewProgress?.querySelectorAll(".progress-step").forEach((item, itemIndex) => {
      item.classList.toggle("active", itemIndex === index);
      item.classList.toggle("done", itemIndex < index);
    });
    await wait(260);
  }

  elements.reviewProgress?.querySelectorAll(".progress-step").forEach((item) => {
    item.classList.remove("active");
    item.classList.add("done");
  });
  setDisabled(elements.runReviewButton, false);
  setDisabled(elements.overrideButton, false);
  isReviewing = false;
}

function defaultReviewSteps() {
  return [
    "读取个人宪法",
    "形成 Session Delegation",
    "核验 Agent Passport",
    "请求 x402 支付",
    "写入 Receipt 与公报",
  ];
}

function syncProviderPolicy() {
  if (!provider.allowance) return;
  const policy = deriveConstitutionPolicy(constitutionArticles, nationState);
  const spent = Math.max(0, provider.allowance.totalLimit - provider.allowance.remaining);
  provider.allowance.totalLimit = nationState.monthlyBudget;
  provider.allowance.remaining = Math.max(0, nationState.monthlyBudget - spent);
  provider.allowance.singleSpendLimit = policy.singleSpendLimit;
  provider.allowance.highRiskLimit = policy.highRiskLimit;
}

function readNationState() {
  try {
    const raw = window.localStorage.getItem(storageKeys.nation);
    if (!raw) return { ...defaultNationState };
    const parsed = JSON.parse(raw);
    const template = nationTemplates.find((item) => item.id === parsed.id) ?? defaultNationState;
    const migrated = { ...template, ...parsed };
    const legacyNames = [
      "Emily's Builder Republic",
      "Emily's Web3 Republic",
      "Emily's Healing Republic",
      "Emily's Learning Republic",
    ];
    if (legacyNames.includes(parsed.nationName)) migrated.nationName = template.nationName;
    if (parsed.mission === "在 7 月 16 日前完成 Kite 赛道黑客松 MVP。") {
      migrated.mission = template.mission;
    }
    return migrated;
  } catch {
    return { ...defaultNationState };
  }
}

function saveNationState() {
  window.localStorage.setItem(storageKeys.nation, JSON.stringify(nationState));
}

function readConstitutionArticles() {
  try {
    const raw = window.localStorage.getItem(storageKeys.constitution);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function saveConstitutionArticles() {
  window.localStorage.setItem(storageKeys.constitution, JSON.stringify(constitutionArticles));
}

async function constitutionHash() {
  return sha256Hex({
    nation: nationState.nationName,
    articles: constitutionArticles,
  });
}

function normalizeAmount(value, fallback) {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount < 0) return fallback;
  return Math.round(amount);
}

function setView(viewName) {
  syncNavigation(viewName);
  let activePanel = null;
  elements.viewPanels.forEach((panel) => {
    const active = panel.dataset.viewPanel === viewName;
    panel.hidden = !active;
    panel.classList.toggle("active", active);
    if (active) activePanel = panel;
  });
  playViewTransition(activePanel);
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function readGazetteHistory() {
  try {
    const raw = window.localStorage.getItem(storageKeys.gazette);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function wait(milliseconds) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, milliseconds);
  });
}

function downloadJson(payload, filename) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function setText(element, value) {
  if (!element) return;
  element.textContent = value;
}

function setHtml(element, value) {
  if (!element) return;
  element.innerHTML = value;
}

function setDisabled(element, value) {
  if (!element) return;
  element.disabled = value;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function shortHash(value) {
  if (!value) return "缺失";
  return `${value.slice(0, 10)}...${value.slice(-6)}`;
}

async function sha256Hex(payload) {
  const normalized = stableStringify(payload);
  if (window.crypto?.subtle) {
    const bytes = new TextEncoder().encode(normalized);
    const digest = await window.crypto.subtle.digest("SHA-256", bytes);
    return `0x${[...new Uint8Array(digest)]
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("")}`;
  }
  return `0x${stableHex(normalized, 64)}`;
}

function stableStringify(value) {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }
  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function stableHex(input, length) {
  let hash = 0;
  for (let index = 0; index < input.length; index += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(index);
    hash |= 0;
  }
  const seed = Math.abs(hash).toString(16).padStart(8, "0");
  return seed.repeat(Math.ceil(length / seed.length)).slice(0, length);
}

function decisionTitleFor(action) {
  if (action === "approve") return "付款已批准";
  if (action === "override_execute") return "用户已推翻议会";
  if (action === "require_confirmation") return "已应用单笔限额";
  if (action === "deny") return "付款已拦截";
  return "付款缩减 + 冷静期";
}

function statusFor(action) {
  if (action === "approve") return "已批准";
  if (action === "override_execute") return "已推翻";
  if (action === "require_confirmation") return "需确认";
  if (action === "deny") return "已拦截";
  return "已缩减";
}

function riskSignalLabel(signal) {
  const labels = {
    over_single_spend_limit: "超过单笔限额",
    large_spend: "大额支出",
    high_risk_asset: "高风险资产",
    fomo: "FOMO 冲动",
    mission_aligned: "服务当前目标",
  };
  return labels[signal] ?? signal.replaceAll("_", " ");
}

function permissionLabel(permission) {
  const labels = {
    summarize: "总结议案",
    coordinate: "协调部门",
    vote: "参与表决",
    read_budget: "读取预算",
    propose_payment: "提出付款",
    freeze_spend: "限制支出",
    audit: "审计记录",
    risk_scan: "扫描风险",
    plan_project: "规划项目",
    suggest_alternative: "提出替代方案",
    debate: "提出辩论",
    veto_warning: "发出反对警告",
    emotion_check: "检查情绪",
    cooling_period: "启动冷静期",
    write_gazette: "撰写公报",
    hash_record: "保存哈希",
    export_trace: "导出凭证",
  };
  return labels[permission] ?? permission;
}

function providerDisplayName(providerName) {
  if (providerName === "DemoKiteProvider") return "沙盒推演 · 非链上";
  if (providerName === "KitePassportBridgeProvider") return "Kite Passport 真实模式";
  return "Kite 国库";
}

function providerErrorMessage(error) {
  const message = error instanceof Error ? error.message : String(error ?? "");
  if (message.includes("fetch") || message.includes("HTTP 404") || message.includes("非 JSON")) {
    return "真实 Passport 需要通过本地 Kite 桥接服务运行；当前页面没有连接到桥接端点。";
  }
  return message || "Kite 服务暂时不可用，请稍后重试。";
}

function allowanceStatusText(allowance) {
  if (allowance.status === "unauthenticated") return "等待立宪者登录 Kite Passport";
  if (allowance.status === "no_active_session") return "尚无 Spending Session";
  if (allowance.status === "sandbox_active") {
    return `${allowance.remaining}/${allowance.totalLimit} ${allowance.currency} · 沙盒额度`;
  }
  return `${allowance.remaining}/${allowance.totalLimit} ${allowance.currency} · ${allowance.status}`;
}

function executionStatusLabel(execution, decision) {
  if (execution.status === "session_pending") return "等待 Passkey";
  if (execution.status === "settled_onchain") return "链上已结算";
  if (execution.status === "service_delivered_receipt_pending") return "服务已交付";
  if (execution.status === "executed_sandbox") return "沙盒已执行";
  return statusFor(decision.action);
}

function historyProofLabel(item) {
  if (item.proofMode === "onchain") return "链上凭证";
  if (item.proofMode === "sandbox") return "沙盒凭证";
  if (item.proofMode === "session_pending") return "等待 Passkey";
  return "支付记录";
}

function stanceLabel(stance) {
  const labels = {
    approve: "同意",
    oppose: "反对",
    reduce: "限额",
    delay: "延迟",
    override: "推翻",
  };
  return labels[stance] ?? stance;
}

function historyActionLabel(item) {
  if (item.kind === "override") return "推翻";
  const labels = {
    approve: "批准",
    reduce_payment: "限额付款",
    require_confirmation: "需确认",
    deny: "拦截",
  };
  return labels[item.action] ?? item.action.replaceAll("_", " ");
}
