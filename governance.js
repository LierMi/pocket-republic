export function deriveConstitutionPolicy(articles, fallbackState) {
  const monthlyBudget = normalizeLimit(fallbackState.monthlyBudget, 0);
  const monthlySpent = normalizeLimit(fallbackState.monthlySpent, 0);
  return {
    monthlyBudget,
    monthlySpent,
    monthlyRemaining: Math.max(0, monthlyBudget - monthlySpent),
    singleSpendLimit: articleLimit(articles, "A2", fallbackState.singleSpendLimit),
    highRiskLimit: articleLimit(articles, "A3", fallbackState.highRiskLimit),
    coolingPeriodHours: normalizeLimit(fallbackState.coolingPeriodHours, 0),
    activeCooldownUntil: fallbackState.activeCooldownUntil ?? null,
  };
}

export function detectRiskSignals(context, amount, policy) {
  const signals = [];
  const normalizedContext = String(context ?? "").toLowerCase();

  if (amount > policy.singleSpendLimit) signals.push("over_single_spend_limit");
  if (amount > Math.max(policy.monthlyBudget * 0.2, 100)) signals.push("large_spend");
  if (/(meme|coin|dex|pump|100x|telegram|airdrop)/i.test(normalizedContext)) {
    signals.push("high_risk_asset");
  }
  if (/\b(?:tonight|now|miss|missing|fomo|pump)\b|100x|立刻|马上|错过/i.test(normalizedContext)) {
    signals.push("fomo");
  }
  if (/(api|data|project|mission|mvp|项目|工具|创作)/i.test(normalizedContext)) {
    signals.push("mission_aligned");
  }
  if (/(anxious|anxiety|stressed|stress|lonely|heartbreak|late night|焦虑|高压|孤独|失恋|深夜)/i.test(normalizedContext)) {
    signals.push("strong_emotion");
  }
  if (/(shopping|tip|donation|game top.?up|entertainment|购物|打赏|充值|娱乐)/i.test(normalizedContext)) {
    signals.push("non_essential_spend");
  }
  if (/(course|lesson|learning|study|scholarship|课程|章节|学习|奖学金)/i.test(normalizedContext)) {
    signals.push("learning_purchase");
  }

  return [...new Set(signals)];
}

export function buildPaymentDecision(request, nationState, constitutionArticles) {
  const policyLimits = deriveConstitutionPolicy(constitutionArticles, nationState);
  const context = `${request.title ?? ""} ${request.context ?? ""} ${request.category ?? ""} ${request.merchant ?? ""}`.toLowerCase();
  const riskSignals = detectRiskSignals(context, request.amount, policyLimits);
  const activeCooldown =
    policyLimits.activeCooldownUntil && Date.parse(policyLimits.activeCooldownUntil) > Date.now();
  if (activeCooldown) riskSignals.push("active_cooling_period");
  const strongEmotionSpend =
    nationState.id === "healing" &&
    riskSignals.includes("strong_emotion") &&
    riskSignals.includes("non_essential_spend");
  const milestoneMissing =
    nationState.id === "learning" &&
    riskSignals.includes("learning_purchase") &&
    request.milestoneAttestation?.status !== "user_attested";
  const highRisk = riskSignals.includes("high_risk_asset") || riskSignals.includes("fomo");
  const exceedsSingleLimit = request.amount > policyLimits.singleSpendLimit;

  let action = "approve";
  let approvedAmount = request.amount;
  let frozenAmount = 0;
  let policy = "所有宪法检查已通过，国库可以继续处理这笔付款。";

  if (activeCooldown) {
    action = "deny";
    approvedAmount = 0;
    frozenAmount = request.amount;
    policy = `A4 冷静期仍在生效，本次支付不予放行。可在 ${policyLimits.activeCooldownUntil} 后重新提交议案。`;
  } else if (strongEmotionSpend) {
    action = "deny";
    approvedAmount = 0;
    frozenAmount = request.amount;
    policy = "A5 心灵守护条款已触发：强情绪状态下，购物、打赏、充值与娱乐等非必要支付不予放行。";
  } else if (milestoneMissing) {
    action = "deny";
    approvedAmount = 0;
    frozenAmount = request.amount;
    policy = "A5 里程碑条款已触发：尚未提交完成声明，本阶段学习支付不予放行。";
  } else if (highRisk && request.amount > policyLimits.highRiskLimit) {
    action = "reduce_payment";
    approvedAmount = policyLimits.highRiskLimit;
    frozenAmount = request.amount - approvedAmount;
    policy = `A3 高风险上限将付款缩减到 ${policyLimits.highRiskLimit} USDC。其余金额本次不予放行，并进入 ${policyLimits.coolingPeriodHours || 24} 小时冷静期。`;
  } else if (exceedsSingleLimit) {
    action = "require_confirmation";
    approvedAmount = Math.min(request.amount, policyLimits.singleSpendLimit);
    frozenAmount = request.amount - approvedAmount;
    policy = `A2 国库审查将首次执行限制为 ${policyLimits.singleSpendLimit} USDC，剩余金额需要用户再次确认。`;
  }

  if (action !== "deny" && approvedAmount > policyLimits.monthlyRemaining) {
    approvedAmount = policyLimits.monthlyRemaining;
    frozenAmount = request.amount - approvedAmount;
    action = approvedAmount > 0 ? "reduce_payment" : "deny";
    riskSignals.push("over_monthly_budget");
    policy = `A2 共和国月度预算仅剩 ${policyLimits.monthlyRemaining} USDC，本次最多放行 ${approvedAmount} USDC。`;
  }
  const triggeredArticles = getTriggeredArticles(request, riskSignals, policyLimits);

  return {
    action,
    approvedAmount,
    frozenAmount,
    policyLimits,
    riskSignals,
    triggeredArticles,
    policy,
  };
}

export function calculateOverrideAmount(requestedAmount, alreadyExecutedAmount) {
  return Math.max(0, normalizeLimit(requestedAmount, 0) - normalizeLimit(alreadyExecutedAmount, 0));
}

export function calculateMonthlySpend(entries, providerMode, monthKey) {
  if (!Array.isArray(entries)) return 0;
  return entries
    .filter((entry) => {
      const entryMode = entry.providerMode ?? (entry.proofMode === "sandbox" ? "sandbox" : "kite-passport");
      return entryMode === providerMode && String(entry.createdAt ?? "").startsWith(monthKey);
    })
    .reduce(
      (sum, entry) =>
        sum + normalizeLimit(entry.budgetAccountedAmount ?? entry.executedAmount, 0),
      0,
    );
}

export function shouldStartCooldown(decision) {
  if (!decision || decision.frozenAmount <= 0 || decision.policyLimits?.coolingPeriodHours <= 0) return false;
  const signals = decision.riskSignals ?? [];
  return (
    signals.includes("fomo") ||
    signals.includes("high_risk_asset") ||
    signals.includes("active_cooling_period") ||
    (signals.includes("strong_emotion") && signals.includes("non_essential_spend"))
  );
}

export function cooldownScopeForRequest(request) {
  if (request?.id && request.id !== "custom") return request.id;
  return [request?.title, request?.merchant, request?.category, request?.serviceUrl]
    .map((value) => String(value ?? "").trim().toLowerCase())
    .join("|");
}

function getTriggeredArticles(request, riskSignals, policy) {
  const articles = ["A1"];
  if (request.amount > policy.singleSpendLimit || riskSignals.includes("over_monthly_budget")) articles.push("A2");
  if (riskSignals.includes("high_risk_asset")) articles.push("A3");
  if (riskSignals.includes("fomo") || riskSignals.includes("active_cooling_period")) articles.push("A4");
  if (
    riskSignals.includes("large_spend") ||
    riskSignals.includes("strong_emotion") ||
    riskSignals.includes("learning_purchase")
  ) {
    articles.push("A5");
  }
  return articles;
}

function articleLimit(articles, articleId, fallback) {
  const article = Array.isArray(articles) ? articles.find((item) => item.id === articleId) : null;
  const match = String(article?.text ?? "").match(/(\d+(?:\.\d+)?)\s*USDC/i);
  return match ? normalizeLimit(match[1], fallback) : normalizeLimit(fallback, 0);
}

function normalizeLimit(value, fallback) {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount < 0) return Number(fallback) || 0;
  return Math.round(amount * 100) / 100;
}
