export function deriveConstitutionPolicy(articles, fallbackState) {
  return {
    monthlyBudget: normalizeLimit(fallbackState.monthlyBudget, 0),
    singleSpendLimit: articleLimit(articles, "A2", fallbackState.singleSpendLimit),
    highRiskLimit: articleLimit(articles, "A3", fallbackState.highRiskLimit),
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

  return [...new Set(signals)];
}

export function buildPaymentDecision(request, nationState, constitutionArticles) {
  const policyLimits = deriveConstitutionPolicy(constitutionArticles, nationState);
  const context = `${request.title ?? ""} ${request.context ?? ""}`.toLowerCase();
  const riskSignals = detectRiskSignals(context, request.amount, policyLimits);
  const triggeredArticles = getTriggeredArticles(request, riskSignals, policyLimits);
  const highRisk = riskSignals.includes("high_risk_asset") || riskSignals.includes("fomo");
  const exceedsSingleLimit = request.amount > policyLimits.singleSpendLimit;

  let action = "approve";
  let approvedAmount = request.amount;
  let frozenAmount = 0;
  let policy = "所有宪法检查已通过，Kite 国库可以执行这笔付款。";

  if (highRisk && request.amount > policyLimits.highRiskLimit) {
    action = "reduce_payment";
    approvedAmount = policyLimits.highRiskLimit;
    frozenAmount = request.amount - approvedAmount;
    policy = `A3 高风险上限将付款缩减到 ${policyLimits.highRiskLimit} USDC。A4 冷静期会限制剩余金额 24 小时。`;
  } else if (exceedsSingleLimit) {
    action = "require_confirmation";
    approvedAmount = Math.min(request.amount, policyLimits.singleSpendLimit);
    frozenAmount = request.amount - approvedAmount;
    policy = `A2 国库审查将首次执行限制为 ${policyLimits.singleSpendLimit} USDC，剩余金额需要用户再次确认。`;
  }

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

function getTriggeredArticles(request, riskSignals, policy) {
  const articles = ["A1"];
  if (request.amount > policy.singleSpendLimit) articles.push("A2");
  if (riskSignals.includes("high_risk_asset")) articles.push("A3");
  if (riskSignals.includes("fomo")) articles.push("A4");
  if (riskSignals.includes("large_spend")) articles.push("A5");
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
