// Shared AI utility functions to avoid DRY violations
// Used by ai-analyze.js, ai-telemetry.js, and ai-tips.js

// [AI-GENERATED][ROBUSTNESS][V205] Keep each upstream model call bounded and avoid
// multiplying provider retries across the explicit model-fallback loop. Quota
// responses are handled by trying the next configured model below.
// Keep three sequential fallback attempts within the frontend 30s timeout.
// Each request also receives an AbortSignal and a hard Promise deadline because
// SDK/network timeout behavior can vary across runtime and SDK versions.
const AI_UPSTREAM_TIMEOUT_MS = 6_000;
const AI_BACKEND_REVISION = "V318";
const AI_UPSTREAM_RETRY_OPTIONS = Object.freeze({ attempts: 1 });

export function createAIClient(GoogleGenAI, apiKey) {
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      timeout: AI_UPSTREAM_TIMEOUT_MS,
      retryOptions: { ...AI_UPSTREAM_RETRY_OPTIONS },
    },
  });
}

// [AI-GENERATED][SECURITY][V157] Best-effort per-instance abuse protection.
// Vercel serverless instances are ephemeral, so this is intentionally a bounded
// first line of defense rather than a claim of globally distributed rate limiting.
const AI_RATE_LIMIT_WINDOW_MS = 60_000;
const AI_RATE_LIMIT_MAX_REQUESTS = 20;
const AI_RATE_LIMIT_MAX_CLIENTS = 1_024;
const AI_MAX_CONCURRENT_REQUESTS = 4;
const aiRateLimitBuckets = new Map();
let activeAIRequests = 0;

function getClientKey(req) {
  const forwarded = req?.headers?.['x-forwarded-for'] || req?.headers?.['x-real-ip'];
  const raw = Array.isArray(forwarded) ? forwarded[0] : String(forwarded || '').split(',')[0];
  const normalized = raw.trim();
  return normalized || 'unknown-client';
}

function pruneAIRateLimitBuckets(now = Date.now()) {
  for (const [key, bucket] of aiRateLimitBuckets) {
    if (!bucket || now - bucket.windowStart >= AI_RATE_LIMIT_WINDOW_MS) {
      aiRateLimitBuckets.delete(key);
    }
  }
  while (aiRateLimitBuckets.size > AI_RATE_LIMIT_MAX_CLIENTS) {
    const oldestKey = aiRateLimitBuckets.keys().next().value;
    if (oldestKey === undefined) break;
    aiRateLimitBuckets.delete(oldestKey);
  }
}

function enforceAIRateLimit(req, res) {
  const now = Date.now();
  pruneAIRateLimitBuckets(now);
  const key = getClientKey(req);
  let bucket = aiRateLimitBuckets.get(key);

  if (!bucket || now - bucket.windowStart >= AI_RATE_LIMIT_WINDOW_MS) {
    bucket = { windowStart: now, count: 0 };
    aiRateLimitBuckets.set(key, bucket);
  }

  if (bucket.count >= AI_RATE_LIMIT_MAX_REQUESTS) {
    const retryAfter = Math.max(1, Math.ceil((bucket.windowStart + AI_RATE_LIMIT_WINDOW_MS - now) / 1000));
    res.setHeader('Retry-After', String(retryAfter));
    return res.status(429).json({
      error: 'Terlalu banyak permintaan AI. Coba lagi nanti.',
      code: 'AI_RATE_LIMITED',
      retryAfter
    });
  }

  if (activeAIRequests >= AI_MAX_CONCURRENT_REQUESTS) {
    res.setHeader('Retry-After', '5');
    return res.status(429).json({
      error: 'Layanan AI sedang sibuk. Coba lagi beberapa saat lagi.',
      code: 'AI_BUSY',
      retryAfter: 5
    });
  }

  bucket.count += 1;
  activeAIRequests += 1;
  let released = false;
  return () => {
    if (released) return;
    released = true;
    activeAIRequests = Math.max(0, activeAIRequests - 1);
  };
}

// [AI-GENERATED][ROBUSTNESS][V211] Keep fallback candidates pointed at distinct
// stable backends. Google's current deprecation guidance says requests for
// gemini-3.7-flash route to gemini-3.8-flash and requests for
// gemini-3.1-flash-lite route to gemini-3.5-flash-lite. Do not include those
// aliases in the chain: when quota is exhausted they would repeat an upstream
// backend rather than provide a useful fallback.
const GEMINI_MODELS = [
  "gemini-3.8-flash",
  "gemini-3.6-flash",
  "gemini-3.5-flash-lite",
];

function getRawErrorText(error) {
  return error?.message || String(error || "Gagal memproses analisis AI");
}

function toUserFacingError(error) {
  // [AI-GENERATED][SECURITY][V155] Pesan provider/API tidak boleh diteruskan ke browser.
  // Detail seperti endpoint, request id, model, quota metadata, atau stack/provider payload
  // dapat berubah dan berpotensi membocorkan informasi internal. Detail tetap dicatat server-side.
  const status = error?.status || error?.code || error?.error?.code;
  if (status === 429 || status === "RESOURCE_EXHAUSTED") {
    return "Layanan AI sedang mencapai batas penggunaan. Coba lagi nanti.";
  }
  return "Layanan AI sedang mengalami gangguan. Silakan coba lagi nanti.";
}

function isTransientAvailabilityError(error) {
  const rawText = getRawErrorText(error).toLowerCase();
  const code = error?.status || error?.code || error?.error?.code;
  return code === 500 || code === 502 || code === 503 || code === 504 ||
    code === "AI_UPSTREAM_TIMEOUT" || code === "ETIMEDOUT" ||
    rawText.includes('timed out') || rawText.includes('timeout') || rawText.includes('high demand') || rawText.includes('currently overloaded') ||
    rawText.includes('model is overloaded') || rawText.includes('service unavailable') ||
    rawText.includes('temporarily unavailable') || rawText.includes('try again later') ||
    rawText.includes('overloaded');
}

function isQuotaError(error) {
  const rawText = getRawErrorText(error).toLowerCase();
  const code = error?.status || error?.code || error?.error?.code;
  return (
    code === 429 ||
    code === "RESOURCE_EXHAUSTED" ||
    rawText.includes("quota") ||
    rawText.includes("rate limit") ||
    rawText.includes("too many requests") ||
    rawText.includes("resource_exhausted")
  );
}

function parseRetrySeconds(error) {
  const text = getRawErrorText(error);
  const match = text.match(/retry(?: in|after|[-_ ]after)?\s*[:=]?\s*([\d.]+)\s*s/i);
  return match ? Math.ceil(parseFloat(match[1])) : null;
}

async function generateWithModel(ai, model, promptContext, systemInstruction, timeoutMs = AI_UPSTREAM_TIMEOUT_MS) {
  const useThinking = model.startsWith("gemini-3.6");
  const controller = new AbortController();
  let timeoutHandle;
  const timeoutError = () => {
    const error = new Error(`Gemini request timed out after ${timeoutMs}ms`);
    error.code = "AI_UPSTREAM_TIMEOUT";
    return error;
  };
  // [AI-GENERATED][ROBUSTNESS][V210] Gemini 3.x no longer accepts legacy
  // sampling controls such as temperature/topP/topK. Keep generation config
  // limited to supported fields so a 400 config error cannot block fallback.
  const config = {
    systemInstruction,
    maxOutputTokens: 4096,
    // [AI-GENERATED][ROBUSTNESS][V318] Do not let automatic continuation turn
    // one provider call into several hidden calls beyond the request deadline.
    automaticContinuation: false,
    // [AI-GENERATED][ROBUSTNESS][V318] Abort the HTTP request on timeout.
    abortSignal: controller.signal,
  };
  if (useThinking) {
    config.thinkingConfig = { thinkingLevel: "minimal" };
  }

  // [AI-GENERATED][ROBUSTNESS][V318] The explicit race is a second line of
  // defense: even if an SDK/network layer fails to reject promptly on abort,
  // the serverless handler continues to the next fallback within a hard bound.
  const requestPromise = Promise.resolve().then(() => ai.models.generateContent({
    model,
    contents: promptContext.trim(),
    config,
  }));
  const deadlinePromise = new Promise((resolve, reject) => {
    timeoutHandle = setTimeout(() => {
      controller.abort();
      reject(timeoutError());
    }, timeoutMs);
  });

  try {
    return await Promise.race([requestPromise, deadlinePromise]);
  } finally {
    if (timeoutHandle) clearTimeout(timeoutHandle);
  }
}

function extractAnswerText(response) {
  const parts = response?.candidates?.[0]?.content?.parts || [];
  const fromParts = parts
    .filter((part) => !part?.thought && typeof part?.text === "string")
    .map((part) => part.text)
    .join("")
    .trim();
  if (fromParts) return fromParts;
  return typeof response?.text === "string" ? response.text.trim() : "";
}

function getFinishReason(response) {
  return response?.candidates?.[0]?.finishReason || response?.finishReason || "";
}

function setupCORSHeaders(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, Accept, X-Requested-With"
  );
  // [AI-GENERATED][OBSERVABILITY][V318] Expose the backend revision on every
  // response, including preflight and errors, so production routing is verifiable.
  res.setHeader("Access-Control-Expose-Headers", "X-AI-Backend-Revision");
  res.setHeader("X-AI-Backend-Revision", AI_BACKEND_REVISION);
}

function handlePreflight(req, res) {
  if (req.method === "OPTIONS") {
    return res.status(200).send("OK");
  }
  return null;
}

function validateRequestBody(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { promptContext } = req.body || {};
  if (typeof promptContext !== "string" || promptContext.trim() === "") {
    return res.status(400).json({ error: "promptContext wajib diisi (string)" });
  }

  if (promptContext.length > 8000) {
    return res.status(400).json({ error: "promptContext terlalu panjang" });
  }

  return null; // Validation passed
}

function handleQuotaError(error, res) {
  const retrySec = parseRetrySeconds(error);
  const retryHint = retrySec ? ` Coba lagi dalam ${retrySec} detik.` : "";
  return res.status(429).json({
    error: `Kuota AI gratis habis.${retryHint} Gunakan analisis instan atau coba lagi nanti.`,
    code: "QUOTA_EXCEEDED",
    retryAfter: retrySec,
  });
}

async function processAIRequest(req, res, systemInstruction, errorMessagePrefix) {
  setupCORSHeaders(req, res);
  
  const preflightResponse = handlePreflight(req, res);
  if (preflightResponse) return preflightResponse;

  const validationError = validateRequestBody(req, res);
  if (validationError) return validationError;

  // [AI-GENERATED][SECURITY][V157] Apply abuse protection only after cheap
  // method/body validation so malformed requests cannot consume the AI quota.
  const releaseAIRequest = enforceAIRateLimit(req, res);
  if (typeof releaseAIRequest !== 'function') return releaseAIRequest;

  if (!process.env.GEMINI_API_KEY) {
    releaseAIRequest();
    console.error("GEMINI_API_KEY belum diset di environment Vercel");
    return res.status(500).json({ error: "Layanan AI belum dikonfigurasi di server" });
  }

  try {
    const { GoogleGenAI } = await import("@google/genai");
    // [AI-GENERATED][ROBUSTNESS][V205] Apply explicit per-request timeout and
    // disable nested SDK retries; the model fallback loop already owns retries.
    const ai = createAIClient(GoogleGenAI, process.env.GEMINI_API_KEY);

    let response = null;
    let usedModel = GEMINI_MODELS[0];
    let lastQuotaError = null;
    let lastAvailabilityError = null;

    for (const model of GEMINI_MODELS) {
      try {
        response = await generateWithModel(ai, model, req.body.promptContext, systemInstruction);
        usedModel = model;
        break;
      } catch (error) {
        if (isQuotaError(error)) {
          lastQuotaError = error;
          console.warn(`[${errorMessagePrefix}][${AI_BACKEND_REVISION}] quota hit for ${model}, trying fallback...`, { status: error?.status ?? error?.error?.code ?? null });
          continue;
        }
        if (isTransientAvailabilityError(error)) {
          lastAvailabilityError = error;
          console.warn(`[${errorMessagePrefix}][${AI_BACKEND_REVISION}] model temporarily unavailable (${model}); trying fallback model.`, { status: error?.status ?? error?.error?.code ?? null });
          continue;
        }
        throw error;
      }
    }

    if (!response) {
      if (lastQuotaError) return handleQuotaError(lastQuotaError, res);
      if (lastAvailabilityError) {
        return res.status(503).json({
          error: 'Layanan AI sedang sibuk atau mengalami gangguan sementara. Coba lagi beberapa saat lagi.',
          code: 'AI_TEMPORARILY_UNAVAILABLE',
          retryAfter: 15
        });
      }
      return res.status(502).json({ error: 'Model AI tidak mengembalikan respons yang dapat digunakan.' });
    }

    const result = extractAnswerText(response);
    const finishReason = getFinishReason(response);

    if (!result) {
      return res.status(502).json({ error: "AI tidak mengembalikan hasil, coba lagi" });
    }

    const truncated = finishReason === "MAX_TOKENS";
    const finalResult = truncated
      ? `${result}\n\n_(Analisis terpotong karena batas token. Coba lagi atau sederhanakan resep.)_`
      : result;

    return res.status(200).json({ result: finalResult, truncated, model: usedModel });
  } catch (error) {
    console.error(`[${errorMessagePrefix}][${AI_BACKEND_REVISION}] provider request failed`, {
      status: error?.status ?? error?.error?.code ?? null,
      code: error?.code ?? error?.error?.status ?? null,
      message: getRawErrorText(error).slice(0, 500),
    });
    if (isQuotaError(error)) {
      return handleQuotaError(error, res);
    }
    return res.status(500).json({ error: toUserFacingError(error) });
  } finally {
    // [AI-GENERATED][ROBUSTNESS][V157] Always release the instance concurrency
    // slot, including provider failures and early successful responses.
    releaseAIRequest();
  }
}

export {
  AI_UPSTREAM_TIMEOUT_MS,
  AI_UPSTREAM_RETRY_OPTIONS,
  AI_BACKEND_REVISION,
  GEMINI_MODELS,
  toUserFacingError,
  isQuotaError,
  isTransientAvailabilityError,
  parseRetrySeconds,
  generateWithModel,
  extractAnswerText,
  getFinishReason,
  setupCORSHeaders,
  handlePreflight,
  validateRequestBody,
  handleQuotaError,
  processAIRequest,
  enforceAIRateLimit
};