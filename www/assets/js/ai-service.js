/**
 * [AI-GENERATED][REFACTOR][V36]
 * Canonical AI domain transport facade.
 * Endpoint resolution, timeout, abort, offline detection, and JSON validation
 * are delegated to ApiClientService so every AI feature follows one policy.
 */
import { getApiUrl, postJson } from './api-client-service.js';
import { AuthService } from './auth-service.js';

async function authenticatedOptions(options = {}) {
    const session = await AuthService.getSession();
    if (!session?.access_token) {
        const error = new Error('Silakan login untuk menggunakan fitur AI online.');
        error.code = 'FEATURE_AUTH_REQUIRED';
        error.status = 401;
        throw error;
    }
    return { ...options, headers: { ...(options.headers || {}), Authorization: `Bearer ${session.access_token}` } };
}

export async function requestAITelemetry(payload, options = {}) {
    return postJson('/api/ai-telemetry', payload, options);
}

export async function requestAIAnalysis(promptContext, options = {}) {
    return postJson('/api/ai-analyze', { promptContext }, await authenticatedOptions(options));
}

export async function requestAITips(promptContext, options = {}) {
    return postJson('/api/ai-tips', { promptContext }, await authenticatedOptions(options));
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
