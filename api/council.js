// Vercel Serverless Function：让"国民议会 AI"在线上沙盒也能跑。
// 浏览器 fetch("/api/council") 同源命中本函数；GONKA_API_KEY 存在 Vercel 环境变量里，绝不进浏览器。
// 与本地桥接 server.mjs 共用同一份 gonka.js 逻辑；未配置 key 时返回 503，前端自动退回脚本发言。
import { gonkaModel, runGonkaCouncil } from "../gonka.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ status: "error", error: "议会接口仅支持 POST。" });
    return;
  }

  const apiKey = String(process.env.GONKA_API_KEY ?? "").trim();
  if (!apiKey) {
    res.status(503).json({ status: "error", error: "未配置 GONKA_API_KEY，议会退回脚本模式。" });
    return;
  }

  try {
    const input =
      typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body && typeof req.body === "object" ? req.body : {};
    const debate = await runGonkaCouncil(input, apiKey);
    res.status(200).json({ source: "gonka", model: gonkaModel(), debate });
  } catch (error) {
    res.status(502).json({
      status: "error",
      error: error instanceof Error ? error.message : "议会 AI 调用失败。",
    });
  }
}
