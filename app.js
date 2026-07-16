import { createKiteProvider } from "./adapters/kite-provider.js";
import {
  buildConstitution,
  decodeConstitutionRecord,
  encodeConstitutionRecord,
  migrateNationState,
  nationPolicyVersion,
  nationTemplates,
} from "./nation-policies.js";
import {
  buildPaymentDecision,
  calculateMonthlySpend,
  calculateOverrideAmount,
  cooldownScopeForRequest,
  deriveConstitutionPolicy,
  shouldStartCooldown,
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
  spendLedger: "pocket-republic:monthly-spend-ledger",
  cooldowns: "pocket-republic:cooldowns",
  citizens: "pocket-republic:citizens",
};

const defaultNationState = migrateNationState(null);

let nationState = readNationState();
let constitutionArticles = readConstitutionArticles() ?? buildConstitution(nationState);

const requests = {
  meme: {
    id: "meme",
    title: "AI meme coin 冲动买入",
    requester: "立宪者 / 用户临时请求",
    amount: 300,
    currency: "USDT",
    merchant: "未知 DEX 池",
    category: "高风险 Web3 交易",
    summary:
      "用户想立刻花 300 USDT 买一个刚上线的 AI meme coin，因为 Telegram 群说今晚会 pump。",
    context:
      "Telegram 群里说这个 AI meme 币今晚就要拉盘，我怕错过下一个 100x，想立刻花 300 USDT 冲进去。",
    statusHint: "大概率触发冷静期",
  },
  api: {
    id: "api",
    title: "购买一封云外市场晨报",
    requester: "达·芬奇 / 建设部长",
    amount: 3,
    // 真实 x402 服务 StableCrypto 以 USDC 结算，此议案保持 USDC 以匹配链上实际资产。
    currency: "USDC",
    merchant: "StableCrypto / Kite 服务目录",
    category: "佣兵公会 · x402 数据采购",
    summary:
      "建设部长想雇佣一个国境外的数据服务，取得一份全球加密市场晨报，为今日的建设计划校准方向。",
    context:
      "创作工坊需要一份国境外的全球加密市场晨报。这是 Kite 目录中可验证的 x402 数据采购，直接服务于当前的项目使命。",
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
    requester: "巴菲特 / 财政大臣",
    amount: 49,
    currency: "USDT",
    merchant: "CanvasForge Pro",
    category: "订阅支出审查",
    summary:
      "创作者共和国想订阅一个 49 USDT/月的 AI 设计工具，但超过了单笔支出限额。",
    context:
      "创作者共和国希望订阅一个月的设计工具。它能提升当前项目质量，但金额超过单笔支出限额。",
    statusHint: "需要限额审查",
  },
};

const agentProfiles = [
  {
    id: "prime",
    name: "丘吉尔",
    role: "首相",
    englishRole: "Prime Minister",
    department: "内阁",
    persona: "以决断与号召力著称的战时首相，善于在混乱中给出清晰方向。",
    duty: "统合各部意见，把议会结论翻译成你能一键执行的决定。",
    permissions: ["summarize", "coordinate", "vote"],
    passport: "sandbox-agent:prime-minister:churchill",
    portrait: "./assets/citizens/sol.png",
    reputation: 94,
    voteClass: "vote-approve",
  },
  {
    id: "treasurer",
    name: "巴菲特",
    role: "财政大臣",
    englishRole: "Treasurer",
    department: "Kite 国库",
    persona: "极度自律的价值投资者，只为有把握的长期价值动用国库。",
    duty: "掌管 Kite 国库，只放行通过宪法的金额，多一分都进不了钱包。",
    permissions: ["read_budget", "propose_payment", "freeze_spend"],
    passport: "sandbox-agent:treasurer:buffett",
    portrait: "./assets/citizens/mira.png",
    reputation: 92,
    voteClass: "vote-reduce",
  },
  {
    id: "auditor",
    name: "包拯",
    role: "审计官",
    englishRole: "Auditor",
    department: "审计院",
    persona: "铁面无私的判官，最擅长识破话术与风险，绝不徇私。",
    duty: "扫描风险信号与历史记录，绝不让 Agent 顺着你的冲动签字。",
    permissions: ["audit", "risk_scan", "vote"],
    passport: "sandbox-agent:auditor:baozheng",
    portrait: "./assets/citizens/rin.png",
    reputation: 91,
    voteClass: "vote-oppose",
  },
  {
    id: "builder",
    name: "达·芬奇",
    role: "建设部长",
    englishRole: "Builder",
    department: "创作工坊",
    persona: "文艺复兴的全才工匠，把每一笔投入都对齐真正要做成的作品。",
    duty: "把每笔支出对齐项目目标，能省则省，给出更小的替代方案。",
    permissions: ["plan_project", "suggest_alternative", "vote"],
    passport: "sandbox-agent:builder:davinci",
    portrait: "./assets/citizens/ivo.png",
    reputation: 89,
    voteClass: "vote-approve",
  },
  {
    id: "opposition",
    name: "苏格拉底",
    role: "反对党领袖",
    englishRole: "Opposition",
    department: "国民议会",
    persona: "以诘问著称的哲人，永远追问“你真的需要它吗”。",
    duty: "被强制唱反调，替你挡住情绪和单一 Agent 的裹挟。",
    permissions: ["debate", "veto_warning", "vote"],
    passport: "sandbox-agent:opposition:socrates",
    portrait: "./assets/citizens/noa.png",
    reputation: 88,
    voteClass: "vote-delay",
  },
  {
    id: "caretaker",
    name: "尼采",
    role: "心灵部长",
    englishRole: "Caretaker",
    department: "心灵花园",
    persona: "洞察情绪与意志的哲人，警惕从众与冲动，主张先克制再行动。",
    duty: "识别焦虑、FOMO 与深夜情绪，先把不可逆的决定按进冷静期。",
    permissions: ["emotion_check", "cooling_period", "vote"],
    passport: "sandbox-agent:caretaker:nietzsche",
    portrait: "./assets/citizens/luma.png",
    reputation: 90,
    voteClass: "vote-delay",
  },
  {
    id: "archivist",
    name: "博尔赫斯",
    role: "书记官",
    englishRole: "Archivist",
    department: "档案馆",
    persona: "痴迷图书馆与档案的作家，视世界为一座无穷图书馆，执着让每条记录精确、可追溯、不可篡改。",
    duty: "把每次审议、支付和你的推翻记录，写成可核验的国家公报。",
    permissions: ["write_gazette", "hash_record", "export_trace"],
    passport: "sandbox-agent:archivist:borges",
    portrait: "./assets/citizens/vale.png",
    reputation: 93,
    voteClass: "vote-approve",
  },
];

// ---- 国民自定义：现有国民可改性格/头像，也可新建"你的国民" ----
let citizenStore = readCitizenStore();

function readCitizenStore() {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(storageKeys.citizens) ?? "null");
    if (parsed && typeof parsed === "object") {
      return {
        overrides: parsed.overrides && typeof parsed.overrides === "object" ? parsed.overrides : {},
        custom: Array.isArray(parsed.custom) ? parsed.custom : [],
      };
    }
  } catch {
    // ignore malformed store
  }
  return { overrides: {}, custom: [] };
}

function saveCitizenStore() {
  try {
    window.localStorage.setItem(storageKeys.citizens, JSON.stringify(citizenStore));
  } catch {
    // localStorage quota / disabled — customization simply won't persist
  }
}

const stanceVoteClass = {
  approve: "vote-approve",
  oppose: "vote-oppose",
  reduce: "vote-reduce",
  delay: "vote-delay",
};

function getCitizens() {
  const base = agentProfiles.map((agent) => {
    const override = citizenStore.overrides[agent.id];
    return override ? { ...agent, ...override, id: agent.id, customized: true } : agent;
  });
  const custom = citizenStore.custom.map((citizen) => ({
    department: "自定义部门",
    duty: "",
    permissions: ["debate", "vote"],
    passport: `custom-agent:${citizen.id}`,
    reputation: 85,
    ...citizen,
    voteClass: stanceVoteClass[citizen.stance] ?? "vote-approve",
    custom: true,
  }));
  return [...base, ...custom];
}

function getCitizenById(id) {
  return getCitizens().find((citizen) => citizen.id === id);
}

function getCitizenByName(name) {
  return getCitizens().find((citizen) => citizen.name === name);
}

function isCitizenImageSource(value) {
  return typeof value === "string"
    && (value.startsWith("data:image")
      || value.startsWith("http://")
      || value.startsWith("https://")
      || value.startsWith("./assets/")
      || value.startsWith("/assets/"));
}

function citizenAvatarHtml(citizen) {
  const portrait = citizen?.portrait;
  if (isCitizenImageSource(portrait)) {
    return `<span class="citizen-avatar has-image"><img src="${escapeHtml(portrait)}" alt="" /></span>`;
  }
  if (typeof portrait === "string" && portrait.trim()) {
    return `<span class="citizen-avatar">${escapeHtml(portrait.trim())}</span>`;
  }
  const initial = escapeHtml((citizen?.name ?? "?").trim().slice(0, 1) || "?");
  return `<span class="citizen-avatar">${initial}</span>`;
}

let editingCitizenId = null;
let editorPortrait = "";

function openCitizenEditor(id) {
  const existing = id ? getCitizenById(id) : null;
  editingCitizenId = id || null;
  const isBuiltIn = Boolean(id) && agentProfiles.some((agent) => agent.id === id);
  const isCustom = existing?.custom === true;
  setText(elements.citizenEditorTitle, existing ? `编辑 ${existing.name}` : "创造你的国民");
  if (elements.citizenName) elements.citizenName.value = existing?.name ?? "";
  if (elements.citizenRole) elements.citizenRole.value = existing?.role ?? "";
  if (elements.citizenDept) elements.citizenDept.value = existing?.department ?? "";
  if (elements.citizenPersona) elements.citizenPersona.value = existing?.persona ?? "";
  if (elements.citizenStance) elements.citizenStance.value = existing?.stance ?? "approve";
  if (elements.citizenPortraitEmoji) elements.citizenPortraitEmoji.value = "";
  if (elements.citizenPortraitFile) elements.citizenPortraitFile.value = "";
  editorPortrait = typeof existing?.portrait === "string" ? existing.portrait : "";
  if (elements.citizenStanceRow) elements.citizenStanceRow.hidden = isBuiltIn;
  if (elements.citizenDelete) elements.citizenDelete.hidden = !isCustom;
  renderEditorAvatar();
  elements.citizenEditor?.showModal?.();
}

function renderEditorAvatar() {
  if (!elements.citizenAvatarPreview) return;
  const portrait = editorPortrait;
  if (isCitizenImageSource(portrait)) {
    setHtml(elements.citizenAvatarPreview, `<img src="${escapeHtml(portrait)}" alt="" />`);
  } else if (portrait) {
    setText(elements.citizenAvatarPreview, portrait);
  } else {
    setText(elements.citizenAvatarPreview, (elements.citizenName?.value ?? "").trim().slice(0, 1) || "🙂");
  }
}

function handlePortraitEmoji(value) {
  const trimmed = String(value ?? "").trim();
  if (!trimmed) return;
  editorPortrait = trimmed;
  if (elements.citizenPortraitFile) elements.citizenPortraitFile.value = "";
  renderEditorAvatar();
}

async function handlePortraitFile(file) {
  if (!file) return;
  try {
    editorPortrait = await downscaleImageToDataUrl(file, 256);
    if (elements.citizenPortraitEmoji) elements.citizenPortraitEmoji.value = "";
    renderEditorAvatar();
  } catch {
    setText(elements.citizenAvatarPreview, "⚠️");
  }
}

function downscaleImageToDataUrl(file, maxSize) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("read failed"));
    reader.onload = () => {
      const image = new Image();
      image.onload = () => {
        const scale = Math.min(1, maxSize / Math.max(image.width, image.height, 1));
        const width = Math.max(1, Math.round(image.width * scale));
        const height = Math.max(1, Math.round(image.height * scale));
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("no canvas context"));
        ctx.drawImage(image, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", 0.82));
      };
      image.onerror = () => reject(new Error("image decode failed"));
      image.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

function saveCitizenFromEditor() {
  const name = (elements.citizenName?.value ?? "").trim();
  if (!name) {
    elements.citizenName?.focus();
    return;
  }
  const role = (elements.citizenRole?.value ?? "").trim() || "国民";
  const department = (elements.citizenDept?.value ?? "").trim() || "自定义部门";
  const persona = (elements.citizenPersona?.value ?? "").trim();
  const stance = elements.citizenStance?.value ?? "approve";
  const portrait = editorPortrait || "";
  const id = editingCitizenId;

  if (id && agentProfiles.some((agent) => agent.id === id)) {
    citizenStore.overrides[id] = { name, role, department, persona, portrait };
  } else if (id) {
    const target = citizenStore.custom.find((citizen) => citizen.id === id);
    if (target) Object.assign(target, { name, role, department, persona, portrait, stance });
  } else {
    citizenStore.custom.push({
      id: `custom-${Date.now().toString(36)}`,
      name,
      role,
      department,
      persona,
      portrait,
      stance,
    });
  }
  saveCitizenStore();
  renderCitizens();
  renderNationHeader();
  elements.citizenEditor?.close?.();
}

function deleteCitizenFromEditor() {
  if (editingCitizenId) {
    citizenStore.custom = citizenStore.custom.filter((citizen) => citizen.id !== editingCitizenId);
    saveCitizenStore();
    renderCitizens();
    renderNationHeader();
  }
  elements.citizenEditor?.close?.();
}

const elements = {
  entryButtons: [...document.querySelectorAll("[data-entry-action]")],
  viewButtons: [...document.querySelectorAll("[data-view-tab]")],
  viewPanels: [...document.querySelectorAll("[data-view-panel]")],
  citizenList: document.querySelector("#citizenList"),
  citizenEditor: document.querySelector("#citizenEditor"),
  citizenEditorTitle: document.querySelector("#citizenEditorTitle"),
  citizenName: document.querySelector("#citizenName"),
  citizenRole: document.querySelector("#citizenRole"),
  citizenDept: document.querySelector("#citizenDept"),
  citizenPersona: document.querySelector("#citizenPersona"),
  citizenStance: document.querySelector("#citizenStance"),
  citizenStanceRow: document.querySelector("#citizenStanceRow"),
  citizenPortraitFile: document.querySelector("#citizenPortraitFile"),
  citizenPortraitEmoji: document.querySelector("#citizenPortraitEmoji"),
  citizenAvatarPreview: document.querySelector("#citizenAvatarPreview"),
  citizenDelete: document.querySelector("#citizenDelete"),
  citizenSave: document.querySelector("#citizenSave"),
  citizenCancel: document.querySelector("#citizenCancel"),
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
  milestoneVerifiedInput: document.querySelector("#milestoneVerifiedInput"),
  requestList: document.querySelector("#requestList"),
  requestTitle: document.querySelector("#requestTitle"),
  requestSummary: document.querySelector("#requestSummary"),
  requestedAmount: document.querySelector("#requestedAmount"),
  requestMerchant: document.querySelector("#requestMerchant"),
  riskTags: document.querySelector("#riskTags"),
  runReviewButton: document.querySelector("#runReviewButton"),
  overrideButton: document.querySelector("#overrideButton"),
  reviewProgress: document.querySelector("#reviewProgress"),
  reviewResult: document.querySelector("#reviewResult"),
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
  providerModeButton: document.querySelector("#providerModeButton"),
  exportPassportBtn: document.querySelector("#exportPassportBtn"),
  passportDialog: document.querySelector("#passportExport"),
  ppTitle: document.querySelector("#ppTitle"),
  ppSubtitle: document.querySelector("#ppSubtitle"),
  ppIssuedDate: document.querySelector("#ppIssuedDate"),
  ppCoverMrz: document.querySelector("#ppCoverMrz"),
  ppBearer: document.querySelector("#ppBearer"),
  ppArticles: document.querySelector("#ppArticles"),
  ppGazette: document.querySelector("#ppGazette"),
  ppDataMrz: document.querySelector("#ppDataMrz"),
  closePassportBtn: document.querySelector("#closePassportBtn"),
  downloadPassportJsonBtn: document.querySelector("#downloadPassportJsonBtn"),
  printPassportBtn: document.querySelector("#printPassportBtn"),
  kiteGate: document.querySelector("#kiteGate"),
  providerDetail: document.querySelector("#providerDetail"),
  providerModeBadge: document.querySelector("#providerModeBadge"),
  passportState: document.querySelector("#passportState"),
  sessionState: document.querySelector("#sessionState"),
  paymentState: document.querySelector("#paymentState"),
  receiptState: document.querySelector("#receiptState"),
  treasuryCoreStatus: document.querySelector("#treasuryCoreStatus"),
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

  elements.citizenList?.addEventListener("click", (event) => {
    const editButton = event.target.closest("[data-citizen-edit]");
    if (editButton) {
      openCitizenEditor(editButton.dataset.citizenEdit);
      return;
    }
    if (event.target.closest("[data-citizen-create]")) {
      openCitizenEditor(null);
    }
  });
  elements.citizenSave?.addEventListener("click", saveCitizenFromEditor);
  elements.citizenCancel?.addEventListener("click", () => elements.citizenEditor?.close?.());
  elements.citizenDelete?.addEventListener("click", deleteCitizenFromEditor);
  elements.citizenPortraitFile?.addEventListener("change", (event) => handlePortraitFile(event.target.files?.[0]));
  elements.citizenPortraitEmoji?.addEventListener("input", (event) => handlePortraitEmoji(event.target.value));
  elements.citizenName?.addEventListener("input", renderEditorAvatar);

  elements.providerModeButton?.addEventListener("click", () => {
    const url = new URL(window.location.href);
    if (provider.providerMode === "kite-passport") {
      url.searchParams.delete("provider");
    } else {
      url.searchParams.set("provider", "kite");
    }
    window.location.assign(url.toString());
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
    elements.reviewResult?.scrollIntoView({ behavior: "smooth", block: "start" });
    elements.reviewResult?.focus({ preventScroll: true });
  });

  elements.overrideButton?.addEventListener("click", async () => {
    await overrideActiveDecision();
    setView("trace");
  });

  elements.downloadTraceButton?.addEventListener("click", () => {
    if (!latestTrace) return;
    downloadJson(latestTrace, `pocket-republic-trace-${activeRequestId}.json`);
  });

  elements.exportPassportBtn?.addEventListener("click", openPassportExport);
  elements.closePassportBtn?.addEventListener("click", () => elements.passportDialog?.close());
  elements.downloadPassportJsonBtn?.addEventListener("click", downloadPassportJson);
  elements.printPassportBtn?.addEventListener("click", () => window.print());

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
    ["当前共和国", `${template.cn} / ${template.en}`],
    ["支付资产", "USDT"],
    ["月度授权", `${template.monthlyBudget} USDT`],
    ["单笔审查线", `${template.singleSpendLimit} USDT`],
    ["高风险上限", `${template.highRiskLimit} USDT`],
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
  renderMonthlyBudgetMetric();
  setHtml(
    elements.nationTags,
    [
      nationState.cn,
      `国民：${getCitizens().length} 位`,
      `单笔限额：${policy.singleSpendLimit} USDT`,
      `高风险上限：${policy.highRiskLimit} USDT`,
      "忠诚对象：宪法",
    ]
      .map((tag) => `<span>${escapeHtml(tag)}</span>`)
      .join(""),
  );
}

function renderCitizens() {
  const gazetteHistory = readGazetteHistory();
  const cards = getCitizens()
    .map((agent) => {
      const score = computeReputationScore(agent, gazetteHistory);
      const participated = gazetteHistory.filter(
        (e) => Array.isArray(e.debate) && e.debate.some((d) => d.agent === agent.name),
      ).length;
      const scoreTip = participated > 0 ? `基于 ${participated} 笔公报` : "初始信用分·暂无公报记录";
      const scoreLabel = participated > 0
        ? `<code class="citizen-score citizen-score--live" title="${escapeHtml(scoreTip)}" aria-label="信誉分 ${score}，参与 ${participated} 笔公报"><span>${score}</span><small>${participated} 笔</small></code>`
        : `<code class="citizen-score" title="${escapeHtml(scoreTip)}" aria-label="信誉分 ${score}"><span>${score}</span></code>`;
      const theme = citizenThemeName(agent);
      return `
          <article class="citizen-card citizen-theme-${theme}${agent.custom ? " citizen-custom" : ""}" data-citizen-id="${escapeHtml(agent.id)}">
            <div class="citizen-card-top">
              <div class="citizen-portrait-wrap">${citizenAvatarHtml(agent)}</div>
              <div class="citizen-id-text">
                <h4><span>${escapeHtml(agent.role)}</span><strong>${escapeHtml(agent.name)}</strong></h4>
                <small>${escapeHtml(agent.englishRole || (agent.custom ? "Custom Citizen" : "AI Citizen"))}</small>
              </div>
              ${scoreLabel}
            </div>
            <section class="citizen-role-panel" aria-label="${escapeHtml(agent.role)}职能">
              <small>所属部门：<strong>${escapeHtml(agent.department)}</strong></small>
              <p>${escapeHtml(citizenDescription(agent))}</p>
            </section>
            <dl class="citizen-credential-list">
              <div>
                <dt>护照</dt>
                <dd>${escapeHtml(citizenPassportLabel(agent))}</dd>
              </div>
              <div>
                <dt>权限</dt>
                <dd>${escapeHtml(permissionsLabel(agent.permissions))}</dd>
              </div>
              <div>
                <dt>忠诚对象</dt>
                <dd>个人宪法</dd>
              </div>
            </dl>
            <footer class="citizen-card-footer">
              <button class="citizen-edit" type="button" data-citizen-edit="${escapeHtml(agent.id)}" aria-label="编辑 ${escapeHtml(agent.name)}">编辑资料</button>
              <span class="citizen-brand" aria-label="Pocket Republic 签发">
                <img src="./assets/figma-homepage/brand-mark.svg" alt="" />
                <strong>Pocket Republic</strong>
              </span>
            </footer>
          </article>
        `;
    })
    .join("");
  const createCard = `
          <button class="citizen-card citizen-create citizen-theme-custom" type="button" data-citizen-create aria-label="创造你的国民">
            <span class="citizen-create-orbit" aria-hidden="true"><i>+</i></span>
            <span class="citizen-create-copy">
              <small>新国民护照</small>
              <strong>创造你的国民</strong>
              <span>自定义名字、人格与头像，为你的 AI 国度增加一种新的判断。</span>
            </span>
            <span class="citizen-brand" aria-hidden="true">
              <img src="./assets/figma-homepage/brand-mark.svg" alt="" />
              <strong>Pocket Republic</strong>
            </span>
          </button>
        `;
  setHtml(elements.citizenList, cards + createCard);
}

function citizenDescription(agent) {
  if (agent.custom || agent.customized) return agent.persona || agent.duty || "这位国民还没有写下自己的行事准则。";
  return agent.duty || agent.persona || "这位国民还没有写下自己的行事准则。";
}

function citizenThemeName(agent) {
  const builtInThemes = {
    prime: "prime",
    treasurer: "treasurer",
    auditor: "auditor",
    builder: "builder",
    opposition: "opposition",
    caretaker: "caretaker",
    archivist: "archivist",
  };
  if (builtInThemes[agent.id]) return builtInThemes[agent.id];
  return ["approve", "oppose", "reduce", "delay"].includes(agent.stance) ? agent.stance : "custom";
}

function permissionsLabel(permissions = []) {
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
  const readable = permissions.map((permission) => labels[permission] ?? permission).filter(Boolean);
  return readable.length > 0 ? readable.join("、") : "参与议会";
}

function citizenPassportLabel(agent) {
  if (provider.providerMode !== "kite-passport") return agent.passport;
  if (agent.id !== "treasurer") return "后续阶段 · 待注册";
  if (!latestPassport || latestPassport.agentPassportId === "not-registered") return "Kite Agent · 待注册";
  return latestPassport.agentPassportId;
}

function renderConstitution() {
  let lastChapter = "";
  setHtml(
    elements.constitutionGrid,
    constitutionArticles
      .map((article) => {
        const chapterHeader =
          article.chapter && article.chapter !== lastChapter
            ? `<h4 class="policy-chapter">${escapeHtml(article.chapter)}</h4>`
            : "";
        lastChapter = article.chapter || lastChapter;
        return `
          ${chapterHeader}
          <article class="policy-card editable-policy">
            <span>${escapeHtml(article.id)}</span>
            <strong>${escapeHtml(article.title)}</strong>
            <div class="policy-editor">
              <textarea data-article-id="${escapeHtml(article.id)}" rows="5" aria-label="编辑宪法条款 ${escapeHtml(article.id)} ${escapeHtml(article.title)}">${escapeHtml(article.text)}</textarea>
              <small class="policy-effect">${escapeHtml(policyEffectLabel(article.id))}</small>
            </div>
          </article>
        `;
      })
      .join(""),
  );
}

function policyEffectLabel(articleId) {
  const policy = deriveConstitutionPolicy(constitutionArticles, nationState);
  if (articleId === "A2") return `当前生效：单笔审查线 ${policy.singleSpendLimit} USDT`;
  if (articleId === "A3") return `当前生效：高风险上限 ${policy.highRiskLimit} USDT`;
  if (articleId === "A4") return "当前生效：识别强时效与 FOMO 信号";
  if (articleId === "A5") return "当前生效：情绪、里程碑与高风险行动保护";
  if (articleId === "A6") return "当前生效：允许补付差额并保留完整审计记录";
  if (articleId === "A7") return "当前生效：多部门会签，任何 Agent 不得单独放行";
  if (articleId === "A8") return "当前生效：全部写入国家公报并附决策哈希";
  if (articleId === "A9") return "当前生效：忠于宪法，不迎合冲动、不泄露数据";
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
    renderMonthlyBudgetMetric();
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
    renderMonthlyBudgetMetric();
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
  syncTreasuryCoreStatus(
    isSandbox
      ? "沙盒国库已就绪"
      : !isAuthenticated
        ? "等待 Passport 登录"
        : hasSession
          ? "支付通道已就绪"
          : "等待国玺授权",
  );
  setText(
    elements.providerDetail,
    isSandbox
      ? "当前是可完整体验的沙盒共和国。所有审查、额度和公报都会运行，但不会伪装成 Kite 链上交易。"
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
  syncTreasuryCoreStatus("Kite 通道离线");
  setText(elements.providerDetail, providerErrorMessage(error));
  if (elements.providerModeButton) setText(elements.providerModeButton, "返回沙盒国库");
}

function selectTemplate(templateId) {
  const template = nationTemplates.find((item) => item.id === templateId);
  if (!template) return;
  nationState = {
    ...template,
    policyVersion: nationPolicyVersion,
    mission: template.mission,
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
    currency: "USDT",
    merchant: "用户指定服务",
    category: "自定义财政议案",
    summary: context,
    context,
    serviceUrl,
    serviceMethod: "GET",
    milestoneAttestation:
      elements.milestoneVerifiedInput?.checked === true
        ? { status: "user_attested", source: "proposal_form", recordedAt: new Date().toISOString() }
        : null,
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
  renderDebateLoading();
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
  syncTreasuryCoreStatus(decision.approvedAmount > 0 ? "议案已预审" : "宪法已拦截");
  setText(elements.traceId, "待执行");
  setText(
    elements.tracePayload,
    JSON.stringify(
      {
        notice:
          provider.providerMode === "sandbox"
            ? "点击“运行国库审查”后，系统会执行本地额度推演并生成明确标注非链上的国家公报。"
            : "点击“运行国库审查”后，合规议案才会创建 Kite payment intent；0 USDT 拒绝案不会请求 Kite。",
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
  renderDebateLoading();
  latestDecision = await decide(request);
  await playReviewProgress(defaultReviewSteps(latestDecision));
  await executeDecision(request, latestDecision, { record: true });
}

async function executeDecision(request, decision, options = {}) {
  syncProviderPolicy();
  let intent;
  let execution;
  let trace;
  try {
    if (provider.providerMode === "kite-passport" && decision.approvedAmount <= 0) {
      execution = createPolicyBlockedExecution(request, decision);
      trace = createPolicyBlockedTrace(request, decision, execution);
    } else {
      intent = await provider.createPaymentIntent({
        proposal: request,
        decision,
        decisionHash: decision.decisionHash,
      });
      execution = await provider.executePayment(intent);
      trace = await provider.tracePayment({ proposal: request, decision, intent, execution });
    }
  } catch (error) {
    latestTrace = null;
    latestExecution = null;
    const gated = isTestnetSettlementGated(error);
    setText(elements.decisionTitle, gated ? "测试网结算待放行" : "Kite 国库执行失败");
    setText(
      elements.decisionPolicy,
      gated
        ? "身份、授权与 Passkey 批准已在 Kite 测试网全部完成；最终结算需 Kite 官方可执行目录白名单放行，属 Roadmap v0.2。议会结论已保留，绝不伪造链上凭证。"
        : `议会结论已保留，但付款没有执行。${providerErrorMessage(error)}`,
    );
    setText(elements.statusMetric, gated ? "待放行" : "未执行");
    setText(elements.traceId, gated ? "测试网待放行" : "未生成账本");
    setText(
      elements.tracePayload,
      JSON.stringify(
        {
          status: gated ? "settlement_pending_testnet_allowlist" : "payment_not_executed",
          decisionHash: decision.decisionHash,
          note: gated
            ? "Kite 测试网身份、授权与 Passkey 批准已完成；结算受官方可执行目录白名单限制（Roadmap v0.2），未伪造 tx。"
            : undefined,
          message: providerErrorMessage(error),
        },
        null,
        2,
      ),
    );
    if (elements.downloadTraceButton) elements.downloadTraceButton.disabled = true;
    if (elements.overrideButton) elements.overrideButton.disabled = true;
    setText(elements.paymentState, gated ? "测试网待放行" : "执行失败");
    setText(elements.receiptState, gated ? "Roadmap v0.2" : "未生成");
    if (elements.kiteGate) elements.kiteGate.dataset.kiteState = gated ? "pending" : "error";
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
    renderMonthlyBudgetMetric(execution.budgetAccountedAmount ?? execution.executedAmount);
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
    renderCitizens(); // refresh reputation scores from new gazette entry
  }
  renderGazetteHistory();
  return true;
}

function createPolicyBlockedExecution(request, decision) {
  return {
    ledgerId: `policy-denial:${decision.decisionHash.slice(2, 18)}`,
    status: "blocked_by_constitution",
    txMode: "pocket-republic-policy",
    txHash: null,
    settlementReference: null,
    paymentReceipt: null,
    isOnchain: false,
    executedAmount: 0,
    quotedAmount: null,
    amountProvenance: "not_paid",
    budgetAccountedAmount: 0,
    budgetProvenance: "not_paid",
    currency: request.currency,
    remainingAllowance: latestAllowance?.remaining ?? 0,
    session: null,
    executedAt: new Date().toISOString(),
  };
}

function createPolicyBlockedTrace(request, decision, execution) {
  return {
    schema: "pocket-republic.policy-denial",
    mode: "application-policy",
    notice: "Pocket Republic 宪法已在应用层拦截；未创建 Kite Session，未请求 x402，未发生链上支付。",
    agentPassport: latestPassport?.status === "active" ? latestPassport : null,
    proposal: request,
    decision: {
      action: decision.action,
      approvedAmount: decision.approvedAmount,
      triggeredArticles: decision.triggeredArticles,
      decisionHash: decision.decisionHash,
    },
    paymentReceipt: null,
    execution,
  };
}

function renderExecutionProtocol(execution) {
  const pending = execution.status === "session_pending";
  const settled = execution.status === "settled_onchain";
  const sandbox = execution.txMode === "sandbox-ledger";
  const policyBlocked = execution.txMode === "pocket-republic-policy";
  const blocked = execution.status === "blocked_by_constitution" || execution.status === "blocked_by_allowance";
  if (elements.kiteGate) {
    elements.kiteGate.dataset.kiteState = policyBlocked
      ? "policy-blocked"
      : pending
        ? "pending"
        : settled
          ? "settled"
          : sandbox
            ? "sandbox"
            : "receipt-pending";
  }
  setText(
    elements.sessionState,
    policyBlocked ? "未创建 Session" : pending ? "等待 Passkey" : sandbox ? "本地额度已核验" : "Session 生效",
  );
  setText(
    elements.paymentState,
    pending ? "尚未执行" : blocked ? "宪法已拦截" : sandbox ? "沙盒已执行" : "x402 服务已交付",
  );
  setText(
    elements.receiptState,
    settled
      ? "链上凭证已生成"
      : blocked
        ? execution.txMode === "pocket-republic-policy"
          ? "未请求 Kite · 本地拒绝记录"
          : "沙盒拒绝记录 · 非链上"
        : sandbox
          ? "沙盒凭证 · 非链上"
          : pending
            ? "等待批准"
            : "服务回执已到，链上引用待确认",
  );
  syncTreasuryCoreStatus(
    policyBlocked || blocked
      ? "支付已被拦截"
      : pending
        ? "等待 Passkey 国玺"
        : settled
          ? "链上支付完成"
          : sandbox
            ? "沙盒执行完成"
            : "回执确认中",
  );
}

function syncTreasuryCoreStatus(label) {
  setText(elements.treasuryCoreStatus, label);
}

async function overrideActiveDecision() {
  if (!latestRequest || !latestDecision || isReviewing) return;
  const overrideDecision = await createOverrideDecision(latestRequest, latestDecision, latestExecution);
  latestDecision = overrideDecision;
  await playReviewProgress([
    "记录立宪者推翻操作",
    "检查 A6 用户主权条款",
    "生成推翻国家公报",
    provider.providerMode === "sandbox" ? "更新非链上沙盒记录" : "更新 Kite 执行记录",
  ]);
  await executeDecision(latestRequest, overrideDecision, { record: true });
}

async function decide(request) {
  const policyState = {
    ...nationState,
    monthlySpent: monthlyExecutedAmount(),
    activeCooldownUntil: readCooldownUntil(cooldownKeyFor(request)),
  };
  const coreDecision = buildPaymentDecision(request, policyState, constitutionArticles);
  const { action, approvedAmount, frozenAmount, policyLimits, riskSignals, triggeredArticles, policy } =
    coreDecision;

  const debate = await buildCouncilDebate({
    request,
    action,
    approvedAmount,
    frozenAmount,
    policyLimits,
    riskSignals,
    triggeredArticles,
    policy,
  });
  const vote = tallyVote(debate);
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

async function buildCouncilDebate(context) {
  const base = createDebate(context);
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 22000);
    let response;
    try {
      response = await fetch("/api/council", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          nationName: nationState.nationName,
          mission: nationState.mission,
          proposal: {
            title: context.request.title,
            amount: context.request.amount,
            currency: context.request.currency,
            context: context.request.context || context.request.summary || "",
          },
          decision: {
            action: context.action,
            approvedAmount: context.approvedAmount,
            frozenAmount:
              context.frozenAmount ?? Math.max(0, (context.request.amount ?? 0) - context.approvedAmount),
            triggeredArticles: context.triggeredArticles,
            riskSignals: context.riskSignals,
            policy: context.policy,
          },
          agents: base.map((item) => {
            const profile = getCitizenByName(item.agent);
            return {
              name: item.agent,
              role: item.role,
              duty: profile?.duty ?? "",
              persona: profile?.persona ?? "",
              stance: item.stance,
            };
          }),
        }),
      });
    } finally {
      clearTimeout(timer);
    }
    if (!response.ok) return base;
    const data = await response.json();
    if (!data || !Array.isArray(data.debate)) return base;
    const byName = new Map(data.debate.map((item) => [item.name, item.text]));
    return base.map((item) =>
      byName.get(item.agent) ? { ...item, text: byName.get(item.agent), aiVoiced: true } : item,
    );
  } catch {
    return base;
  }
}

function createDebate(context) {
  return getCitizens().map((citizen) => {
    const speech = scriptedSpeech(citizen, context);
    return {
      agent: citizen.name,
      role: citizen.role,
      department: citizen.department,
      stance: speech.stance,
      text: speech.text,
    };
  });
}

function scriptedSpeech(citizen, { request, action, approvedAmount, policyLimits, riskSignals, triggeredArticles }) {
  const missionAligned = riskSignals.includes("mission_aligned");
  const highRisk = riskSignals.includes("high_risk_asset");
  const fomo = riskSignals.includes("fomo");
  const articleText = triggeredArticles.join(", ");
  switch (citizen.id) {
    case "archivist":
      return {
        stance: "approve",
        text: `议案已登记：${request.title}，申请 ${request.amount} ${request.currency}。触发条款：${articleText}。`,
      };
    case "auditor":
      return {
        stance: highRisk ? "oppose" : "approve",
        text: highRisk
          ? "该请求包含高风险资产和时间压力，不能按普通付款处理。"
          : "未发现高风险资产信号，可以进入国库额度检查。",
      };
    case "treasurer":
      return {
        stance: action === "approve" ? "approve" : "reduce",
        text:
          action === "approve"
            ? `请求金额未超过 ${policyLimits.singleSpendLimit} USDT 单笔限额，国库可以进入下一步。`
            : `请求金额 ${request.amount} ${request.currency} 超出当前宪法边界，国库只放行 ${approvedAmount} ${request.currency}。`,
      };
    case "builder":
      return {
        stance: missionAligned ? "approve" : "reduce",
        text: missionAligned
          ? "这笔支出服务当前国家目标，可以作为项目推进预算处理。"
          : "建议先缩小试验金额，把剩余预算留给更确定的工具、API 或项目资产。",
      };
    case "opposition":
      return {
        stance: fomo ? "delay" : "oppose",
        text: fomo
          ? "这不是策略，是 FOMO。反对全额通过，建议进入冷静期。"
          : "我反对无条件通过，请先证明它符合国家目标和预算纪律。",
      };
    case "caretaker":
      return {
        stance: fomo ? "delay" : "approve",
        text: fomo
          ? "检测到“今晚、错过、100x”等强情绪词，建议先保护用户情绪，不做不可逆付款。"
          : "没有明显强情绪信号，心灵部不阻止本次议案继续审议。",
      };
    case "prime":
      return {
        stance: action === "approve" ? "approve" : "reduce",
        text:
          action === "approve"
            ? "内阁建议通过，并由书记官生成国家公报。"
            : "内阁建议按宪法执行限额方案，保留用户推翻权利，但必须归档。",
      };
    default: {
      const stance = ["approve", "oppose", "reduce", "delay"].includes(citizen.stance) ? citizen.stance : "approve";
      const byStance = {
        approve: "我支持这笔支出，它符合我的判断。",
        oppose: "我反对，这笔支出还需要更充分的理由。",
        reduce: "我建议缩减额度、分批放行更稳妥。",
        delay: "我建议先放进冷静期，稍后再议。",
      };
      return { stance, text: byStance[stance] };
    }
  }
}

function tallyVote(debate) {
  const tally = { approve: 0, oppose: 0, reduce: 0, delay: 0 };
  for (const item of debate) {
    if (tally[item.stance] != null) tally[item.stance] += 1;
  }
  return tally;
}

// Maps final ruling action → the stance that "predicted correctly"
function winningStance(action) {
  return { approve: "approve", deny: "oppose", reduce: "reduce", delay: "delay", policy_block: "oppose" }[action] ?? null;
}

// Real reputation: base rep blended with historical alignment rate from gazette records
function computeReputationScore(citizen, gazetteHistory) {
  const base = citizen.reputation ?? 85;
  const withDebate = gazetteHistory.filter((e) => Array.isArray(e.debate) && e.debate.length > 0);
  if (withDebate.length === 0) return base;

  let aligned = 0, total = 0;
  for (const entry of withDebate) {
    const ws = winningStance(entry.action);
    if (!ws) continue; // skip立宪者 override — not a council judgement
    const item = entry.debate.find((d) => d.agent === citizen.name);
    if (!item) continue;
    total++;
    if (item.stance === ws) aligned++;
  }
  if (total === 0) return base;

  // History weight grows to 60% as entries accumulate (saturates around 4 entries)
  const histWeight = Math.min(total * 0.15, 0.6);
  return Math.round(base * (1 - histWeight) + (aligned / total) * 100 * histWeight);
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

function renderDebateLoading() {
  if (!elements.debateTimeline) return;
  setHtml(
    elements.debateTimeline,
    `
      <article class="debate-item debate-loading">
        <div>
          <strong>国民议会</strong>
          <small>正在召集七位国民</small>
          <span class="ai-voiced ai-thinking">AI 思考中…</span>
        </div>
        <p>议会正在依据你的宪法，逐条审议这笔支付……</p>
      </article>
    `,
  );
}

function renderDebate(debate) {
  setHtml(
    elements.debateTimeline,
    debate
      .map((item) => {
        const profile = getCitizenByName(item.agent);
        const voteClass = item.stance === "override" ? "vote-override" : (profile?.voteClass ?? "vote-approve");
        return `
          <article class="debate-item">
            <div>
              <strong>${escapeHtml(item.agent)}</strong>
              <small>${escapeHtml(item.department)} / ${escapeHtml(item.role)}</small>
              <span class="vote ${voteClass}">${escapeHtml(stanceLabel(item.stance))}</span>
              ${item.aiVoiced ? '<span class="ai-voiced" title="由 Gonka 实时生成">Gonka AI</span>' : ""}
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
        <strong>${
          provider.providerMode === "sandbox"
            ? "已生成议会预审，等待财政大臣运行本地国库推演"
            : "已生成议会预审，等待财政大臣执行 Kite 国库审查"
        }</strong>
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
          <dd>${provider.providerMode === "sandbox" ? "等待本地国库推演" : "等待 Kite Session 执行"}</dd>
        </div>
      </dl>
    `,
  );
}

function renderGazette({ request, decision, execution }) {
  const proofLabel = execution.isOnchain
    ? "Kite 链上凭证"
    : execution.txMode === "pocket-republic-policy"
      ? "Pocket Republic 宪法拦截 · 未请求 Kite"
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
          <dd>${escapeHtml(executionAmountLabel(execution))}</dd>
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
  if (execution.txMode === "pocket-republic-policy") {
    return `
      <section class="gazette-terminal" data-execution-mode="policy-denial" aria-label="应用层宪法拦截记录">
        <div class="gazette-terminal-heading">
          <span>POCKET REPUBLIC POLICY GATE</span>
          <strong>未请求 Kite</strong>
        </div>
        <dl>
          <div><dt>宪法决定</dt><dd>${escapeHtml(decisionTitleFor(decision.action))}</dd></div>
          <div><dt>批准金额</dt><dd>0 ${escapeHtml(execution.currency)}</dd></div>
          <div><dt>决策哈希</dt><dd>${escapeHtml(decision.decisionHash)}</dd></div>
        </dl>
        <p>请求已在 Pocket Republic 应用层停止，因此没有 Agent Session、x402 请求、Receipt 或链上结算字段。</p>
      </section>
    `;
  }
  const isSandbox = execution.txMode === "sandbox-ledger";
  if (isSandbox) {
    const blocked = execution.status === "blocked_by_constitution" || execution.status === "blocked_by_allowance";
    return `
      <section class="gazette-terminal" data-execution-mode="sandbox" aria-label="沙盒执行记录">
        <div class="gazette-terminal-heading">
          <span>[SANDBOX] POCKET REPUBLIC POLICY SIMULATION</span>
          <strong>非链上记录</strong>
        </div>
        <dl>
          <div><dt>本地 Agent</dt><dd>${escapeHtml(latestPassport?.agentPassportId ?? "sandbox-agent")}</dd></div>
          <div><dt>本地 Session</dt><dd>${escapeHtml(execution.session?.sessionId ?? "sandbox-session")}</dd></div>
          <div><dt>${blocked ? "推演结果" : "推演支付"}</dt><dd>${
            blocked ? `宪法已拦截（0 ${escapeHtml(execution.currency)}）` : `${execution.executedAmount} ${escapeHtml(execution.currency)}`
          }</dd></div>
          <div><dt>宪法决策</dt><dd>${escapeHtml(decision.decisionHash)}</dd></div>
        </dl>
        <p>这份记录只证明 Pocket Republic 的宪法、议会与额度流程已经运行，不是 Kite 链上凭证，也不包含伪造交易哈希。</p>
      </section>
    `;
  }

  const agentPassportId = latestPassport?.status === "active" ? latestPassport.agentPassportId : null;
  const sessionId = execution.session?.sessionId || null;
  const settlementReference = execution.isOnchain ? execution.settlementReference : null;
  const paidAmount =
    execution.amountProvenance === "receipt" && execution.executedAmount > 0
      ? `${execution.executedAmount} ${execution.currency}`
      : null;
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

function executionAmountLabel(execution) {
  if (execution.txMode === "sandbox-ledger") {
    return `${execution.executedAmount} ${execution.currency}（沙盒推演）`;
  }
  if (execution.amountProvenance === "receipt") {
    return `${execution.executedAmount} ${execution.currency}`;
  }
  if (execution.status === "session_pending") return "尚未执行";
  if (execution.amountProvenance === "quote_only") {
    return `Receipt 待确认（预检报价 ${execution.quotedAmount} ${execution.currency}）`;
  }
  return "Receipt 尚未确认";
}

function recordGazette({ request, decision, execution, trace, kind }) {
  const coolingUntil =
    shouldStartCooldown(decision)
      ? ensureCooldown(cooldownKeyFor(request), decision.policyLimits.coolingPeriodHours, execution.executedAt)
      : null;
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
    budgetAccountedAmount: execution.budgetAccountedAmount ?? execution.executedAmount,
    currency: request.currency,
    ledgerId: execution.ledgerId,
    proofMode: execution.isOnchain ? "onchain" : execution.txMode === "sandbox-ledger" ? "sandbox" : execution.status,
    providerMode: provider.providerMode,
    decisionHash: decision.decisionHash,
    coolingUntil,
    createdAt: execution.executedAt,
    trace,
    debate: decision.debate ?? [],
  };
  recordMonthlySpend(entry);
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
  setText(
    elements.decisionPolicy,
    provider.providerMode === "sandbox"
      ? "Agent 国民正在根据你的宪法和本地沙盒额度推演这笔请求。"
      : "Agent 国民正在根据你的宪法和 Kite Session 授权额度检查这笔请求。",
  );
  setText(elements.statusMetric, "审查中");
  setText(elements.voteMetric, "...");
  syncTreasuryCoreStatus("国民议会审查中");
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

function defaultReviewSteps(decision = latestDecision) {
  if (provider.providerMode === "sandbox") {
    return [
      "读取个人宪法",
      "生成本地 Delegation 草案",
      "核验沙盒 Agent 身份",
      "推演本地额度变化",
      "生成非链上公报",
    ];
  }
  if (decision?.approvedAmount <= 0) {
    return [
      "读取个人宪法",
      "确认批准金额为 0 USDT",
      "在应用层停止支付请求",
      "不创建 Kite Session",
      "写入宪法拒绝公报",
    ];
  }
  return [
    "读取个人宪法",
    "生成 Kite Session Delegation",
    "核验真实 Agent Passport",
    "请求 x402 支付",
    "写入 Receipt 与公报",
  ];
}

function syncProviderPolicy() {
  if (!provider.allowance) return;
  const policy = deriveConstitutionPolicy(constitutionArticles, nationState);
  const spent = monthlyExecutedAmount();
  provider.allowance.totalLimit = nationState.monthlyBudget;
  provider.allowance.remaining = Math.max(0, nationState.monthlyBudget - spent);
  provider.allowance.singleSpendLimit = policy.singleSpendLimit;
  provider.allowance.highRiskLimit = policy.highRiskLimit;
}

function monthlyExecutedAmount(now = new Date()) {
  const monthKey = now.toISOString().slice(0, 7);
  return calculateMonthlySpend(readSpendLedger(), provider.providerMode, monthKey);
}

function renderMonthlyBudgetMetric(pendingExecutedAmount = 0) {
  const spent = monthlyExecutedAmount() + normalizeLedgerAmount(pendingExecutedAmount);
  const remaining = Math.max(0, nationState.monthlyBudget - spent);
  setText(elements.treasuryHeroMetric, `${remaining}/${nationState.monthlyBudget} USDT`);
}

function recordMonthlySpend(entry) {
  const accountedAmount = normalizeLedgerAmount(entry.budgetAccountedAmount ?? entry.executedAmount);
  if (accountedAmount <= 0) return;
  const ledger = readSpendLedger();
  if (ledger.some((item) => item.id === entry.id)) return;
  ledger.unshift({
    id: entry.id,
    executedAmount: normalizeLedgerAmount(entry.executedAmount),
    budgetAccountedAmount: accountedAmount,
    currency: entry.currency,
    createdAt: entry.createdAt,
    proofMode: entry.proofMode,
    providerMode: entry.providerMode,
  });
  const currentYear = new Date().getUTCFullYear();
  const retained = ledger.filter((item) => Number(String(item.createdAt ?? "").slice(0, 4)) >= currentYear - 1);
  window.localStorage.setItem(storageKeys.spendLedger, JSON.stringify(retained));
}

function readSpendLedger() {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(storageKeys.spendLedger) ?? "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function normalizeLedgerAmount(value) {
  const amount = Number(value);
  return Number.isFinite(amount) && amount > 0 ? amount : 0;
}

function cooldownKeyFor(request) {
  const scope = cooldownScopeForRequest(request);
  if (request.id !== "custom") return scope;
  return `custom:${stableHex(scope, 20)}`;
}

function readCooldownUntil(requestId) {
  try {
    const cooldowns = JSON.parse(window.localStorage.getItem(storageKeys.cooldowns) ?? "{}");
    const expiresAt = cooldowns[requestId];
    return expiresAt && Date.parse(expiresAt) > Date.now() ? expiresAt : null;
  } catch {
    return null;
  }
}

function ensureCooldown(requestId, hours, startedAt) {
  try {
    const cooldowns = JSON.parse(window.localStorage.getItem(storageKeys.cooldowns) ?? "{}");
    const current = cooldowns[requestId];
    if (current && Date.parse(current) > Date.now()) return current;
    const startTime = Number.isFinite(Date.parse(startedAt)) ? Date.parse(startedAt) : Date.now();
    const expiresAt = new Date(startTime + hours * 60 * 60 * 1000).toISOString();
    cooldowns[requestId] = expiresAt;
    window.localStorage.setItem(storageKeys.cooldowns, JSON.stringify(cooldowns));
    return expiresAt;
  } catch {
    return null;
  }
}

function readNationState() {
  try {
    const raw = window.localStorage.getItem(storageKeys.nation);
    if (!raw) return { ...defaultNationState };
    return migrateNationState(JSON.parse(raw));
  } catch {
    return { ...defaultNationState };
  }
}

function saveNationState() {
  window.localStorage.setItem(
    storageKeys.nation,
    JSON.stringify({ ...nationState, policyVersion: nationPolicyVersion }),
  );
}

function readConstitutionArticles() {
  try {
    const raw = window.localStorage.getItem(storageKeys.constitution);
    if (!raw) return null;
    return decodeConstitutionRecord(JSON.parse(raw));
  } catch {
    return null;
  }
}

function saveConstitutionArticles() {
  window.localStorage.setItem(
    storageKeys.constitution,
    JSON.stringify(encodeConstitutionRecord(constitutionArticles)),
  );
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

async function openPassportExport() {
  if (!elements.passportDialog) return;
  const hash = await constitutionHash();
  const gazette = readGazetteHistory();
  const citizens = getCitizens();
  const template = nationTemplates.find((t) => t.id === nationState.id) ?? nationTemplates[0];
  const issuedDate = new Date().toISOString().slice(0, 10);
  const nationName = nationState.nationName || template.nationName;

  setText(elements.ppTitle, nationName);
  setText(elements.ppSubtitle, template.cn);
  setText(elements.ppIssuedDate, `签发 ${issuedDate}`);

  // 封面机读区（装饰性）
  const mrzSlug = Array.from(nationName).map((c) => (/[一-龥]/.test(c) ? "<" : c.toUpperCase().replace(/[^A-Z0-9]/, "<"))).join("").slice(0, 22).padEnd(22, "<");
  setHtml(elements.ppCoverMrz, `P&lt;REPUBLIC&lt;&lt;${mrzSlug}&lt;&lt;&lt;<br>${hash.slice(2, 36).toUpperCase()}&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;`);

  // 持有者信息
  const agentId = latestPassport?.agentPassportId && latestPassport.agentPassportId !== "not-registered"
    ? latestPassport.agentPassportId.slice(0, 20) + "…"
    : "沙盒模式";
  const missionText = (nationState.mission || "").length > 40
    ? nationState.mission.slice(0, 40) + "…"
    : (nationState.mission || "—");
  setHtml(elements.ppBearer, [
    ["国家名称", nationName],
    ["治理模板", template.cn],
    ["国家使命", missionText],
    ["月度预算", `${nationState.monthlyBudget} USDT`],
    ["国民数量", `${citizens.length} 位`],
    ["Agent 护照", agentId],
    ["宪法哈希", `${hash.slice(0, 14)}…`],
    ["签发日期", issuedDate],
  ].map(([k, v]) => `<div><dt>${escapeHtml(k)}</dt><dd>${escapeHtml(String(v))}</dd></div>`).join(""));

  // 宪法（前5条）
  setHtml(elements.ppArticles, constitutionArticles.slice(0, 5).map((a) => {
    const short = a.text.length > 52 ? a.text.slice(0, 52) + "…" : a.text;
    return `<li><strong>${escapeHtml(a.id)}</strong><em>${escapeHtml(a.title)}</em><span>${escapeHtml(short)}</span></li>`;
  }).join(""));

  // 公报（最近4条）
  const actionCn = { approve: "批准", deny: "拒绝", reduce_payment: "缩减", delay: "延期", override_execute: "立宪覆盖", policy_block: "宪法拦截" };
  setHtml(elements.ppGazette, gazette.length > 0
    ? gazette.slice(0, 4).map((g) => {
        const cls = g.action === "approve" ? "pp-g-approve" : g.action === "deny" || g.action === "policy_block" ? "pp-g-deny" : "pp-g-reduce";
        const label = actionCn[g.action] ?? g.action;
        const date = g.createdAt ? new Date(g.createdAt).toLocaleDateString("zh-CN") : "";
        return `<li class="${cls}"><strong>${escapeHtml(label)}</strong>${escapeHtml(g.title)} · <em>${g.approvedAmount} ${escapeHtml(g.currency)}</em><small>${date}</small></li>`;
      }).join("")
    : '<li class="pp-g-empty">暂无公报记录</li>');

  // 数据页机读区
  setHtml(elements.ppDataMrz, `${hash.slice(2, 42).toUpperCase()}&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;<br>CITIZENS${String(citizens.length).padStart(2, "0")}&lt;&lt;GAZETTE${String(gazette.length).padStart(2, "0")}&lt;&lt;${issuedDate.replace(/-/g, "")}`);

  elements.passportDialog.showModal();
}

function downloadPassportJson() {
  const gazette = readGazetteHistory();
  const citizens = getCitizens();
  const template = nationTemplates.find((t) => t.id === nationState.id) ?? nationTemplates[0];
  const passport = {
    version: "pocket-republic-passport-v1",
    issuedAt: new Date().toISOString(),
    republic: {
      name: nationState.nationName || template.nationName,
      template: nationState.id,
      templateCn: template.cn,
      templateEn: template.en,
      mission: nationState.mission,
      monthlyBudget: nationState.monthlyBudget,
      singleSpendLimit: nationState.singleSpendLimit,
      highRiskLimit: nationState.highRiskLimit,
    },
    constitution: constitutionArticles.map((a) => ({
      id: a.id,
      chapter: a.chapter,
      title: a.title,
      text: a.text,
    })),
    citizens: citizens.map((c) => ({
      id: c.id,
      name: c.name,
      role: c.role,
      department: c.department,
      persona: c.persona,
      reputationScore: computeReputationScore(c, gazette),
      custom: c.custom ?? false,
    })),
    gazette: gazette.map((g) => ({
      id: g.id,
      title: g.title,
      action: g.action,
      requestedAmount: g.requestedAmount,
      approvedAmount: g.approvedAmount,
      currency: g.currency,
      proofMode: g.proofMode,
      decisionHash: g.decisionHash,
      createdAt: g.createdAt,
    })),
    kite: {
      agentPassportId: latestPassport?.agentPassportId ?? null,
      sessionId: latestPassport?.sessionId ?? null,
      providerMode: provider.providerMode,
    },
  };
  const safeName = (nationState.nationName || "republic").replace(/[^\w一-龥]/g, "-");
  downloadJson(passport, `pocket-republic-passport-${safeName}-${new Date().toISOString().slice(0, 10)}.json`);
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
    strong_emotion: "强情绪状态",
    non_essential_spend: "非必要支出",
    learning_purchase: "学习预算",
    over_monthly_budget: "超过月度预算",
    active_cooling_period: "冷静期生效中",
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

function isTestnetSettlementGated(error) {
  const message = (error instanceof Error ? error.message : String(error ?? "")).toLowerCase();
  return (
    message.includes("executable_catalog") ||
    message.includes("not allowlisted for paid execution") ||
    message.includes("payment_target_forbidden")
  );
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
