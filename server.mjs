import { spawn } from "node:child_process";
import { createReadStream, existsSync, readFileSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { homedir } from "node:os";
import { extname, join, normalize, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { gonkaModel, runGonkaCouncil } from "./gonka.js";

const rootDirectory = fileURLToPath(new URL(".", import.meta.url));
loadLocalEnv();
const kpassPath = resolveOfficialCli("kpass");
const ksearchPath = resolveOfficialCli("ksearch");
const maxBodyBytes = 64 * 1024;
const maxCliOutputBytes = 2 * 1024 * 1024;
const defaultAllowedHosts = ["stablecrypto.dev", "x402.dev.gokite.ai"];
const knownAssets = new Map([
  [
    "eip155:8453:0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",
    { decimals: 6, symbol: "USDC" },
  ],
]);

const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
};

export function validateTargetUrl(rawUrl, allowedHosts = allowedKiteHosts()) {
  let target;
  try {
    target = new URL(String(rawUrl ?? ""));
  } catch {
    throw new Error("目标 URL 无效。");
  }

  if (target.protocol !== "https:") {
    throw new Error("真实支付目标必须使用 HTTPS。");
  }

  const hostname = target.hostname.toLowerCase();
  if (isPrivateHostname(hostname)) {
    throw new Error("出于安全原因，不允许访问本机或私网地址。");
  }

  if (Array.isArray(allowedHosts) && allowedHosts.length > 0 && !allowedHosts.includes(hostname)) {
    throw new Error(`目标主机不在 Kite 服务允许名单中：${hostname}`);
  }

  return target;
}

export function buildDelegation(input) {
  const taskSummary = cleanText(input?.taskSummary, "taskSummary", 120);
  const maxAmountPerTx = positiveAmount(input?.maxAmountPerTx, "maxAmountPerTx");
  const maxTotalAmount = positiveAmount(input?.maxTotalAmount, "maxTotalAmount");
  const ttlSeconds = boundedInteger(input?.ttlSeconds, "ttlSeconds", 300, 604800);
  const asset = normalizeAsset(input?.asset ?? "USDC");

  if (Number(maxTotalAmount) < Number(maxAmountPerTx)) {
    throw new Error("maxTotalAmount 不能小于 maxAmountPerTx。");
  }

  const delegation = {
    task: { summary: taskSummary },
    payment_policy: {
      assets: [asset],
      max_amount_per_tx: maxAmountPerTx,
      max_total_amount: maxTotalAmount,
      ttl_seconds: ttlSeconds,
    },
  };

  if (input?.targetUrl) {
    const target = validateTargetUrl(input.targetUrl);
    const method = validateMethod(input.method ?? "GET");
    delegation.execution_constraints = {
      x402_http: {
        scope_mode: "scoped",
        allowed_endpoints: [
          {
            method,
            host: target.hostname,
            path_prefix: target.pathname || "/",
          },
        ],
      },
    };
  }

  return delegation;
}

export function validateExecutePayload(input) {
  const target = validateTargetUrl(input?.url);
  const method = validateMethod(input?.method ?? "GET");
  const sessionId = input?.sessionId ? cleanIdentifier(input.sessionId, "sessionId") : "";
  const headers = input?.headers == null ? null : validatePlainObject(input.headers, "headers");
  const body = input?.body == null ? null : validatePlainObject(input.body, "body");

  return {
    url: target.toString(),
    method,
    sessionId,
    headers,
    body,
  };
}

export function parsePaymentRequiredHeader(headerValue, preferredNetwork = "eip155:8453") {
  const encoded = String(headerValue ?? "").trim();
  if (!encoded || encoded.length > 128 * 1024) throw new Error("x402 服务未返回有效的 payment-required。");

  let payload;
  try {
    payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
  } catch {
    throw new Error("x402 payment-required 无法解析。");
  }

  const accepts = Array.isArray(payload.accepts) ? payload.accepts : [];
  const requirement = accepts.find((item) => item?.network === preferredNetwork) ?? accepts[0];
  if (!requirement?.asset || !/^\d+$/.test(String(requirement.amount ?? ""))) {
    throw new Error("x402 payment-required 缺少可用的资产或金额。");
  }

  const asset = normalizeAsset(requirement.asset);
  const network = cleanText(requirement.network, "network", 80);
  const assetMetadata = knownAssets.get(`${network}:${asset.toLowerCase()}`) ?? null;
  const decimals = assetMetadata?.decimals ?? null;
  const amount = decimals == null ? null : formatRawTokenAmount(requirement.amount, decimals);

  return {
    x402Version: payload.x402Version ?? null,
    resource: payload.resource ?? null,
    requirement: {
      scheme: requirement.scheme ?? null,
      network,
      asset,
      assetSymbol: assetMetadata?.symbol ?? null,
      amountRaw: String(requirement.amount),
      amount,
      decimals,
      payTo: requirement.payTo ?? null,
      maxTimeoutSeconds: requirement.maxTimeoutSeconds ?? null,
      assetName: requirement.extra?.name ?? null,
    },
  };
}

export async function preflightX402(input, fetchImpl = globalThis.fetch) {
  if (typeof fetchImpl !== "function") throw new Error("当前 Node 环境不支持 fetch。");
  const request = validateExecutePayload(input);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  const headers = { Accept: "application/json" };
  const hasBody = request.body && request.method !== "GET";
  if (hasBody) headers["Content-Type"] = "application/json";

  try {
    const response = await fetchImpl(request.url, {
      method: request.method,
      headers,
      body: hasBody ? JSON.stringify(request.body) : undefined,
      redirect: "manual",
      signal: controller.signal,
    });
    if (response.status >= 300 && response.status < 400) {
      throw new Error("x402 预检不允许重定向。");
    }
    if (response.status !== 402) {
      throw new Error(`目标服务未返回 x402 支付要求（HTTP ${response.status}）。`);
    }
    return {
      status: "payment_required",
      httpStatus: response.status,
      ...parsePaymentRequiredHeader(response.headers.get("payment-required")),
    };
  } catch (error) {
    if (error?.name === "AbortError") throw new Error("x402 预检超时。");
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

export function normalizeCliEnvelope(command, stdout) {
  try {
    return { command, data: JSON.parse(stdout) };
  } catch {
    throw new Error(`${command} 返回了非 JSON 数据。`);
  }
}

export function runCli(binary, args, options = {}) {
  if (!existsSync(binary)) {
    return Promise.reject(new Error(`未找到 Kite 官方 CLI：${binary}`));
  }

  const timeoutMs = options.timeoutMs ?? 30000;
  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(binary, args, {
      cwd: rootDirectory,
      env: {
        ...process.env,
        CI: "1",
        KPASS_NO_UPDATE_CHECK: "1",
      },
      shell: false,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    let outputBytes = 0;

    const timer = setTimeout(() => {
      child.kill("SIGTERM");
      rejectPromise(new Error(`Kite CLI 超时：${args.slice(0, 2).join(" ")}`));
    }, timeoutMs);

    child.stdout.on("data", (chunk) => {
      outputBytes += chunk.length;
      if (outputBytes > maxCliOutputBytes) {
        child.kill("SIGTERM");
        return;
      }
      stdout += chunk.toString("utf8");
    });
    child.stderr.on("data", (chunk) => {
      outputBytes += chunk.length;
      if (outputBytes <= maxCliOutputBytes) stderr += chunk.toString("utf8");
    });
    child.on("error", (error) => {
      clearTimeout(timer);
      rejectPromise(error);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (outputBytes > maxCliOutputBytes) {
        rejectPromise(new Error("Kite CLI 输出超过安全上限。"));
        return;
      }
      if (code !== 0) {
        const detail = parseCliError(stdout) ?? parseCliError(stderr) ?? stderr.trim() ?? stdout.trim();
        const error = new Error(detail || `Kite CLI 退出码 ${code}`);
        error.exitCode = code;
        rejectPromise(error);
        return;
      }
      try {
        resolvePromise(normalizeCliEnvelope(`${binary.endsWith("ksearch") ? "ksearch" : "kpass"} ${args[0]}`, stdout));
      } catch (error) {
        rejectPromise(error);
      }
    });
  });
}

async function runKpass(args, options) {
  return runCli(kpassPath, [...args, "--output", "json", "--no-interactive"], options);
}

async function runKsearch(args, options) {
  return runCli(ksearchPath, [...args, "--output", "json"], options);
}

async function routeApi(request, response, url) {
  try {
    if (request.method === "GET" && url.pathname === "/api/kite/status") {
      const status = await runKpass(["status"]);
      const loggedIn = Boolean(status.data?.user?.logged_in);
      const details = { status: status.data, wallet: null, sessions: null };
      if (loggedIn) {
        const [wallet, sessions] = await Promise.all([
          runKpass(["wallet", "balance"]),
          runKpass(["user", "sessions", "--status", "active", "--limit", "20"]),
        ]);
        details.wallet = wallet.data;
        details.sessions = sessions.data;
      }
      sendJson(response, 200, { mode: "kite-passport-cli", ...details });
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/kite/services") {
      const query = String(url.searchParams.get("query") ?? "StableCrypto").slice(0, 80);
      const result = await runKsearch([
        "services",
        "list",
        "--query",
        query,
        "--limit",
        "10",
      ]);
      sendJson(response, 200, result.data);
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/kite/activity") {
      const result = await runKpass(["user", "sessions", "--limit", "20"]);
      sendJson(response, 200, {
        source: "kpass user sessions",
        note: "x402 交易引用取自 execute receipt，当前 CLI 会话历史由 user sessions 提供。",
        sessions: result.data,
      });
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/kite/preflight") {
      const result = await preflightX402(await readJson(request));
      sendJson(response, 200, result);
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/kite/agent/register") {
      const input = await readJson(request);
      const type = cleanIdentifier(input.type ?? "pocket-republic-treasurer", "type");
      const result = await runKpass(["agent:register", "--type", type]);
      sendJson(response, 200, result.data);
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/kite/session/create") {
      const input = await readJson(request);
      const delegation = buildDelegation(input);
      const result = await runKpass(["agent:session", "create", "--delegation", JSON.stringify(delegation)]);
      sendJson(response, 200, { ...result.data, delegation });
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/kite/session/status") {
      const input = await readJson(request);
      const requestId = cleanIdentifier(input.requestId, "requestId");
      const result = await runKpass(["agent:session", "status", "--request-id", requestId]);
      sendJson(response, 200, result.data);
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/kite/session/use") {
      const input = await readJson(request);
      const sessionId = cleanIdentifier(input.sessionId, "sessionId");
      const result = await runKpass(["agent:session", "use", "--session-id", sessionId]);
      sendJson(response, 200, result.data);
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/kite/session/execute") {
      const input = validateExecutePayload(await readJson(request));
      const args = ["agent:session", "execute", "--url", input.url, "--method", input.method];
      if (input.sessionId) args.push("--session-id", input.sessionId);
      if (input.headers) args.push("--headers", JSON.stringify(input.headers));
      if (input.body) args.push("--body", JSON.stringify(input.body));
      const result = await runKpass(args, { timeoutMs: 300000 });
      sendJson(response, 200, result.data);
      return;
    }

    sendJson(response, 404, { status: "error", error: "API 路径不存在。" });
  } catch (error) {
    const statusCode = error?.exitCode === 3 ? 401 : error?.exitCode === 4 ? 404 : 400;
    sendJson(response, statusCode, {
      status: "error",
      error: error instanceof Error ? error.message : "Kite 桥接服务发生未知错误。",
      exitCode: error?.exitCode ?? null,
    });
  }
}

async function handleCouncil(request, response) {
  if (request.method !== "POST") {
    sendJson(response, 405, { status: "error", error: "议会接口仅支持 POST。" });
    return;
  }
  try {
    const apiKey = String(process.env.GONKA_API_KEY ?? "").trim();
    if (!apiKey) {
      sendJson(response, 503, { status: "error", error: "未配置 GONKA_API_KEY，议会退回脚本模式。" });
      return;
    }
    const input = await readJson(request);
    const debate = await runGonkaCouncil(input, apiKey);
    sendJson(response, 200, { source: "gonka", model: gonkaModel(), debate });
  } catch (error) {
    sendJson(response, 502, {
      status: "error",
      error: error instanceof Error ? error.message : "议会 AI 调用失败。",
    });
  }
}


function loadLocalEnv() {
  const envPath = join(rootDirectory, ".env");
  if (!existsSync(envPath)) return;
  try {
    for (const rawLine of readFileSync(envPath, "utf8").split("\n")) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#")) continue;
      const separator = line.indexOf("=");
      if (separator === -1) continue;
      const key = line.slice(0, separator).trim();
      let value = line.slice(separator + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (key && !(key in process.env)) process.env[key] = value;
    }
  } catch {
    // A malformed .env should never crash the bridge.
  }
}

function serveStatic(request, response, url) {
  const pathname = url.pathname === "/" ? "/index.html" : decodeURIComponent(url.pathname);
  if (pathname.includes("\0") || pathname.split("/").some((part) => part.startsWith("."))) {
    sendJson(response, 404, { status: "error", error: "文件不存在。" });
    return;
  }

  const candidate = resolve(rootDirectory, `.${normalize(pathname)}`);
  const localPath = relative(rootDirectory, candidate);
  if (localPath.startsWith("..") || localPath === "server.mjs" || !existsSync(candidate) || statSync(candidate).isDirectory()) {
    sendJson(response, 404, { status: "error", error: "文件不存在。" });
    return;
  }

  response.writeHead(200, {
    "Cache-Control": "no-store",
    "Content-Type": mimeTypes[extname(candidate)] ?? "application/octet-stream",
    ...securityHeaders(),
  });
  createReadStream(candidate).pipe(response);
}

export function createPocketRepublicServer() {
  return createServer(async (request, response) => {
    const url = new URL(request.url ?? "/", "http://127.0.0.1");
    if (url.pathname === "/api/council") {
      await handleCouncil(request, response);
      return;
    }
    if (url.pathname.startsWith("/api/kite/")) {
      await routeApi(request, response, url);
      return;
    }
    if (request.method !== "GET" && request.method !== "HEAD") {
      sendJson(response, 405, { status: "error", error: "不支持的请求方法。" });
      return;
    }
    serveStatic(request, response, url);
  });
}

function readJson(request) {
  return new Promise((resolvePromise, rejectPromise) => {
    let body = "";
    let bytes = 0;
    request.on("data", (chunk) => {
      bytes += chunk.length;
      if (bytes > maxBodyBytes) {
        request.destroy();
        rejectPromise(new Error("请求体超过安全上限。"));
        return;
      }
      body += chunk.toString("utf8");
    });
    request.on("end", () => {
      try {
        resolvePromise(body ? JSON.parse(body) : {});
      } catch {
        rejectPromise(new Error("请求体必须是 JSON。"));
      }
    });
    request.on("error", rejectPromise);
  });
}

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    "Cache-Control": "no-store",
    "Content-Type": "application/json; charset=utf-8",
    ...securityHeaders(),
  });
  response.end(JSON.stringify(payload));
}

function securityHeaders() {
  return {
    "Content-Security-Policy": "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'",
    "Referrer-Policy": "no-referrer",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
  };
}

function allowedKiteHosts() {
  const configured = String(process.env.KITE_ALLOWED_HOSTS ?? "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
  return [...new Set([...defaultAllowedHosts, ...configured])];
}

function resolveOfficialCli(binaryName) {
  const configured = process.env[`KITE_${binaryName.toUpperCase()}_PATH`];
  const candidates = [
    configured,
    join(rootDirectory, ".kite-tools", "bin", binaryName),
    join(homedir(), ".kpass", "bin", binaryName),
    join(homedir(), ".local", "bin", binaryName),
  ].filter(Boolean);
  return candidates.find((candidate) => existsSync(candidate)) ?? candidates[0];
}

function cleanText(value, label, maxLength) {
  const text = String(value ?? "").trim();
  if (!text || text.length > maxLength) throw new Error(`${label} 长度无效。`);
  return text;
}

function cleanIdentifier(value, label) {
  const text = String(value ?? "").trim();
  if (!/^[A-Za-z0-9:_-]{3,160}$/.test(text)) throw new Error(`${label} 格式无效。`);
  return text;
}

function positiveAmount(value, label) {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0 || amount > 10000) throw new Error(`${label} 金额无效。`);
  return String(Math.round(amount * 1e6) / 1e6);
}

function normalizeAsset(value) {
  const asset = String(value ?? "").trim();
  if (/^0x[a-fA-F0-9]{40}$/.test(asset)) return asset;
  const symbol = asset.toUpperCase();
  if (!/^[A-Z0-9.]{2,12}$/.test(symbol)) throw new Error("asset 格式无效。");
  return symbol;
}

function formatRawTokenAmount(rawValue, decimals) {
  const raw = BigInt(String(rawValue));
  if (decimals === 0) return raw.toString();
  const padded = raw.toString().padStart(decimals + 1, "0");
  const whole = padded.slice(0, -decimals);
  const fraction = padded.slice(-decimals).replace(/0+$/, "");
  return fraction ? `${whole}.${fraction}` : whole;
}

function boundedInteger(value, label, minimum, maximum) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < minimum || parsed > maximum) {
    throw new Error(`${label} 必须在 ${minimum} 到 ${maximum} 之间。`);
  }
  return parsed;
}

function validateMethod(value) {
  const method = String(value ?? "GET").toUpperCase();
  if (!new Set(["GET", "POST", "PUT", "PATCH", "DELETE"]).has(method)) {
    throw new Error("method 不在允许范围内。");
  }
  return method;
}

function validatePlainObject(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${label} 必须是对象。`);
  const encoded = JSON.stringify(value);
  if (encoded.length > 16000) throw new Error(`${label} 超过安全上限。`);
  return value;
}

function isPrivateHostname(hostname) {
  if (hostname === "localhost" || hostname.endsWith(".localhost") || hostname === "::1") return true;
  const parts = hostname.split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) {
    return false;
  }
  const [a, b] = parts;
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    a >= 224
  );
}

function parseCliError(value) {
  try {
    const parsed = JSON.parse(value);
    return parsed.error ?? parsed.hint ?? null;
  } catch {
    return null;
  }
}

const isDirectRun = process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url;
if (isDirectRun) {
  const port = Number(process.env.PORT ?? 5180);
  const server = createPocketRepublicServer();
  server.listen(port, "127.0.0.1", () => {
    console.log(`Pocket Republic: http://127.0.0.1:${port}`);
    console.log(`Kite real mode: http://127.0.0.1:${port}/?provider=kite`);
  });
}
