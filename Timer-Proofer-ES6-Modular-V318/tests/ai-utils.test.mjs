/** [AI-GENERATED][QA][V211] Tests for bounded AI SDK calls, model routing, and request validation. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  AI_UPSTREAM_TIMEOUT_MS,
  AI_UPSTREAM_RETRY_OPTIONS,
  GEMINI_MODELS,
  createAIClient,
  validateRequestBody,
  generateWithModel,
  extractAnswerText,
  getFinishReason,
  isTransientAvailabilityError,
  isQuotaError,
  AI_BACKEND_REVISION,
  setupCORSHeaders,
} from '../api/ai-utils.js';

function createResponseHarness() {
  const result = { statusCode: 200, payload: undefined };
  const res = {
    status(code) { result.statusCode = code; return this; },
    json(payload) { result.payload = payload; return this; },
  };
  return { result, res };
}

test('AI SDK client has an explicit upstream timeout and does not nest default retries', () => {
  let capturedOptions;
  class FakeGoogleGenAI {
    constructor(options) { capturedOptions = options; }
  }

  const ai = createAIClient(FakeGoogleGenAI, 'unit-test-key');
  assert.ok(ai instanceof FakeGoogleGenAI);
  assert.equal(capturedOptions.apiKey, 'unit-test-key');
  assert.equal(capturedOptions.httpOptions.timeout, AI_UPSTREAM_TIMEOUT_MS);
  assert.ok(AI_UPSTREAM_TIMEOUT_MS > 0 && AI_UPSTREAM_TIMEOUT_MS <= 30_000);
  assert.equal(capturedOptions.httpOptions.retryOptions.attempts, 1);
  assert.equal(AI_UPSTREAM_RETRY_OPTIONS.attempts, 1);
});

test('AI client creates independent HTTP options for each request handler instance', () => {
  const captured = [];
  class FakeGoogleGenAI {
    constructor(options) { captured.push(options); }
  }
  createAIClient(FakeGoogleGenAI, 'first-key');
  createAIClient(FakeGoogleGenAI, 'second-key');

  assert.notStrictEqual(captured[0].httpOptions, captured[1].httpOptions);
  assert.notStrictEqual(captured[0].httpOptions.retryOptions, captured[1].httpOptions.retryOptions);
  assert.equal(captured[0].apiKey, 'first-key');
  assert.equal(captured[1].apiKey, 'second-key');
});

test('AI request validation enforces POST and a non-empty promptContext under the size limit', () => {
  let harness = createResponseHarness();
  assert.equal(validateRequestBody({ method: 'GET', body: {} }, harness.res), harness.res);
  assert.equal(harness.result.statusCode, 405);

  harness = createResponseHarness();
  assert.equal(validateRequestBody({ method: 'POST', body: { promptContext: '   ' } }, harness.res), harness.res);
  assert.equal(harness.result.statusCode, 400);

  harness = createResponseHarness();
  assert.equal(validateRequestBody({ method: 'POST', body: { promptContext: 'x'.repeat(8_001) } }, harness.res), harness.res);
  assert.equal(harness.result.statusCode, 400);

  harness = createResponseHarness();
  assert.equal(validateRequestBody({ method: 'POST', body: { promptContext: 'x'.repeat(8_000) } }, harness.res), null);
});

test('AI response parsing ignores internal thought parts and reports finish reason', () => {
  const response = {
    candidates: [{
      finishReason: 'STOP',
      content: { parts: [
        { thought: true, text: 'internal reasoning must not escape' },
        { text: 'Analisis ' },
        { text: 'adonan selesai.' },
      ] },
    }],
    text: 'fallback should not be used',
  };
  assert.equal(extractAnswerText(response), 'Analisis adonan selesai.');
  assert.equal(getFinishReason(response), 'STOP');
});


test('AI fallback chain uses distinct stable backends and excludes model IDs that auto-route', () => {
  assert.deepEqual(GEMINI_MODELS, [
    'gemini-3.8-flash',
    'gemini-3.6-flash',
    'gemini-3.5-flash-lite',
  ]);
  assert.equal(new Set(GEMINI_MODELS).size, GEMINI_MODELS.length, 'fallback model IDs must be unique');

  // These model IDs automatically route to another candidate in the chain,
  // so including them would retry the same effective upstream backend.
  for (const autoRoutedModel of [
    'gemini-3.7-flash',
    'gemini-3.5-flash',
    'gemini-3.1-flash-lite',
  ]) {
    assert.equal(GEMINI_MODELS.includes(autoRoutedModel), false, `${autoRoutedModel} must not duplicate a fallback backend`);
  }
});

test('AI fallback candidates are never repeated when advancing through the configured chain', () => {
  const attemptedModels = [];
  for (const model of GEMINI_MODELS) {
    attemptedModels.push(model);
    assert.equal(attemptedModels.filter((candidate) => candidate === model).length, 1);
  }
  assert.deepEqual(attemptedModels, [...new Set(attemptedModels)]);
});

test('Gemini 3.8 generation config omits unsupported legacy sampling parameters', async () => {
  let capturedRequest;
  const ai = {
    models: {
      async generateContent(request) {
        capturedRequest = request;
        return { text: 'Analisis selesai.' };
      },
    },
  };

  await generateWithModel(ai, 'gemini-3.8-flash', '  prompt adonan  ', 'Instruksi sistem');

  assert.equal(capturedRequest.model, 'gemini-3.8-flash');
  assert.equal(capturedRequest.contents, 'prompt adonan');
  assert.equal(capturedRequest.config.systemInstruction, 'Instruksi sistem');
  assert.equal(capturedRequest.config.maxOutputTokens, 4096);
  assert.equal(capturedRequest.config.automaticContinuation, false);
  assert.ok(capturedRequest.config.abortSignal instanceof AbortSignal);
  for (const unsupported of ['temperature', 'topP', 'topK', 'candidateCount', 'thinkingBudget']) {
    assert.equal(Object.hasOwn(capturedRequest.config, unsupported), false, `${unsupported} must not be sent to Gemini 3.8`);
  }
  assert.equal(Object.hasOwn(capturedRequest.config, 'thinkingConfig'), false, 'Gemini 3.8 should use its supported default thinking level');
});

test('the Gemini 3.6 fallback only receives supported thinkingLevel configuration', async () => {
  let capturedRequest;
  const ai = {
    models: {
      async generateContent(request) {
        capturedRequest = request;
        return { text: 'Analisis selesai.' };
      },
    },
  };

  await generateWithModel(ai, 'gemini-3.6-flash', 'prompt', 'Instruksi sistem');
  assert.deepEqual(capturedRequest.config.thinkingConfig, { thinkingLevel: 'minimal' });
  assert.equal(Object.hasOwn(capturedRequest.config, 'temperature'), false);
});


test('AI service recognizes temporary high-demand and availability errors for model fallback', () => {
  assert.equal(isTransientAvailabilityError(new Error('This model is currently experiencing high demand. Please try again later.')), true);
  assert.equal(isTransientAvailabilityError({ status: 503, message: 'Service unavailable' }), true);
  assert.equal(isTransientAvailabilityError(new Error('Invalid prompt content')), false);
});


test('AI backend revision is explicit so deployment logs identify the shipped fix', () => {
  assert.equal(AI_BACKEND_REVISION, 'V318');
});

test('AI request deadline aborts provider call and rejects even if SDK promise hangs', async () => {
  let capturedSignal;
  const ai = {
    models: {
      generateContent(request) {
        capturedSignal = request.config.abortSignal;
        return new Promise(() => {}); // Simulate a provider call that never settles.
      },
    },
  };

  await assert.rejects(
    generateWithModel(ai, 'gemini-3.8-flash', 'prompt', 'system', 25),
    (error) => error.code === 'AI_UPSTREAM_TIMEOUT' && /25ms/.test(error.message),
  );
  assert.equal(capturedSignal.aborted, true, 'the underlying SDK request should receive an abort signal');
});

test('upstream timeout and overload errors use availability fallback, not quota handling', () => {
  const timeout = Object.assign(new Error('Gemini request timed out after 6000ms'), { code: 'AI_UPSTREAM_TIMEOUT' });
  assert.equal(isTransientAvailabilityError(timeout), true);
  assert.equal(isQuotaError(timeout), false);
  assert.equal(isTransientAvailabilityError(new Error('This model is currently experiencing high demand. Please try again later.')), true);
  assert.equal(isQuotaError(new Error('This model is currently experiencing high demand. Please try again later.')), false);
});


test('AI endpoint exposes backend revision header for production deployment verification', () => {
  const headers = {};
  const res = { setHeader(name, value) { headers[name] = value; } };
  setupCORSHeaders({ method: 'POST' }, res);
  assert.equal(headers['X-AI-Backend-Revision'], 'V318');
  assert.equal(headers['Access-Control-Expose-Headers'], 'X-AI-Backend-Revision');
});
