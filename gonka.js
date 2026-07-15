// Gonka（赞助方，Anthropic Messages 兼容）为国民议会提供真实 AI 推理。
// 本模块被本地桥接 server.mjs 与 Vercel serverless 函数 api/council.js 共用。
// 规则引擎负责金额与投票的最终裁决；Gonka 只生成每位国民的发言，不改动任何数字。

export function gonkaBaseUrl() {
  return String(process.env.GONKA_BASE_URL ?? "https://api.gonkarouter.io/v1").replace(/\/+$/, "");
}

export function gonkaModel() {
  return String(process.env.GONKA_MODEL ?? "moonshotai/Kimi-K2.6").trim();
}

export async function runGonkaCouncil(input, apiKey, fetchImpl = globalThis.fetch) {
  if (typeof fetchImpl !== "function") throw new Error("当前运行环境不支持 fetch。");
  const key = String(apiKey ?? "").trim();
  if (!key) throw new Error("缺少 GONKA_API_KEY。");
  const agents = Array.isArray(input?.agents) ? input.agents.slice(0, 8) : [];
  if (agents.length === 0) throw new Error("议会缺少国民角色。");
  const proposal = input?.proposal ?? {};
  const decision = input?.decision ?? {};

  const system =
    "你是 Pocket Republic 口袋共和国的国民议会。根据一笔支付议案、宪法裁决结果和每位国民的职责，" +
    "为每位国民生成一句第一人称中文发言，体现其身份与立场，并且必须与给定裁决结果保持一致，不得改动任何金额或最终结论。" +
    "每句不超过 45 个汉字，要针对这笔议案给出具体、有观点的理由，不要说空话套话。" +
    '只输出一个 JSON 数组，元素为 {"name":"国民名","text":"发言"}，顺序与输入国民一致，禁止输出 JSON 以外的任何字符。';

  const payload = {
    国家: { 名称: clip(input?.nationName, 40), 使命: clip(input?.mission, 160) },
    议案: {
      标题: clip(proposal.title, 80),
      金额: `${Number(proposal.amount) || 0} ${clip(proposal.currency, 8) || "USDT"}`,
      背景: clip(proposal.context, 400),
    },
    宪法裁决: {
      结论: clip(decision.action, 40),
      批准金额: `${Number(decision.approvedAmount) || 0}`,
      冻结金额: `${Number(decision.frozenAmount) || 0}`,
      触发条款: Array.isArray(decision.triggeredArticles) ? decision.triggeredArticles.slice(0, 12) : [],
      裁决说明: clip(decision.policy, 200),
    },
    国民: agents.map((agent) => ({
      name: clip(agent.name, 24),
      职位: clip(agent.role, 24),
      职责: clip(agent.duty, 120),
      立场: clip(agent.stance, 16),
    })),
  };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30000);
  try {
    const res = await fetchImpl(`${gonkaBaseUrl()}/messages`, {
      method: "POST",
      headers: {
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: gonkaModel(),
        max_tokens: 900,
        system,
        messages: [{ role: "user", content: JSON.stringify(payload) }],
      }),
      signal: controller.signal,
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(`Gonka HTTP ${res.status}${detail ? `：${detail.slice(0, 200)}` : ""}`);
    }
    const data = await res.json();
    const text = Array.isArray(data?.content)
      ? data.content.filter((part) => part?.type === "text").map((part) => part.text).join("")
      : "";
    return parseCouncilJson(text, agents);
  } catch (error) {
    if (error?.name === "AbortError") throw new Error("Gonka 议会调用超时。");
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

export function parseCouncilJson(rawText, agents) {
  const text = String(rawText ?? "");
  const start = text.indexOf("[");
  const end = text.lastIndexOf("]");
  if (start === -1 || end === -1 || end < start) throw new Error("Gonka 未返回可解析的议会 JSON。");
  let parsed;
  try {
    parsed = JSON.parse(text.slice(start, end + 1));
  } catch {
    throw new Error("Gonka 议会 JSON 解析失败。");
  }
  if (!Array.isArray(parsed)) throw new Error("Gonka 议会返回格式无效。");
  const byName = new Map(
    parsed
      .filter((item) => item && typeof item.name === "string")
      .map((item) => [item.name.trim(), String(item.text ?? "").replace(/\s+/g, " ").trim().slice(0, 120)]),
  );
  return agents
    .map((agent) => ({ name: String(agent.name), text: byName.get(String(agent.name).trim()) || "" }))
    .filter((item) => item.text);
}

function clip(value, maxLength) {
  return String(value ?? "").trim().slice(0, maxLength);
}
