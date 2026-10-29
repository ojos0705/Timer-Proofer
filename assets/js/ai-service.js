/**
 * [AI-GENERATED][REFACTOR][V36]
 * Canonical AI domain transport facade.
 * Endpoint resolution, timeout, abort, offline detection, and JSON validation
 * are delegated to ApiClientService so every AI feature follows one policy.
 */
import { getApiUrl, postJson } from './api-client-service.js';

export async function requestAITelemetry(payload, options = {}) {
    return postJson('/api/ai-telemetry', payload, options);
}

export async function requestAIAnalysis(promptContext, options = {}) {
    return postJson('/api/ai-analyze', { promptContext }, options);
}

export async function requestAITips(promptContext, options = {}) {
    return postJson('/api/ai-tips', { promptContext }, options);
}

export function resolveEndpoint(path) {
    return getApiUrl(path);
}

// [AI-GENERATED][COMPATIBILITY] Minimal global facade for legacy dynamic callers.
window.AIService = Object.freeze({
    requestAITelemetry,
    requestAIAnalysis,
    requestAITips,
    resolveEndpoint
});
