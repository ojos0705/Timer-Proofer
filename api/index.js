/**
 * [AI-GENERATED][DEPLOYMENT][V342-K] Single Vercel Serverless Function router.
 * Preserves the public /api/* URLs while keeping handler modules outside Vercel's
 * auto-discovered api/ function directory. Product version remains V125.
 */
import aiAnalyze from '../serverless/api/ai-analyze.js';
import aiCostSummary from '../serverless/api/ai-cost-summary.js';
import aiTelemetry from '../serverless/api/ai-telemetry.js';
import aiTips from '../serverless/api/ai-tips.js';
import createPaymentToken from '../serverless/api/create-payment-token.js';
import featureAccess from '../serverless/api/feature-access.js';
import financeAdminSummary from '../serverless/api/finance-admin-summary.js';
import financeMidtransReconcile from '../serverless/api/finance-midtrans-reconcile.js';
import financePayoutImport from '../serverless/api/finance-payout-import.js';
import midtransNotification from '../serverless/api/midtrans-notification.js';
import monetizationCatalog from '../serverless/api/monetization-catalog.js';
import myEntitlements from '../serverless/api/my-entitlements.js';
import paymentStatus from '../serverless/api/payment-status.js';
import startFreeTrial from '../serverless/api/start-free-trial.js';
import translateLanguages from '../serverless/api/translate-languages.js';
import translate from '../serverless/api/translate.js';
import weather from '../serverless/api/weather.js';

const ROUTES = Object.freeze({
    'ai-analyze': aiAnalyze,
    'ai-cost-summary': aiCostSummary,
    'ai-telemetry': aiTelemetry,
    'ai-tips': aiTips,
    'create-payment-token': createPaymentToken,
    'feature-access': featureAccess,
    'finance-admin-summary': financeAdminSummary,
    'finance-midtrans-reconcile': financeMidtransReconcile,
    'finance-payout-import': financePayoutImport,
    'midtrans-notification': midtransNotification,
    'monetization-catalog': monetizationCatalog,
    'my-entitlements': myEntitlements,
    'payment-status': paymentStatus,
    'start-free-trial': startFreeTrial,
    'translate-languages': translateLanguages,
    'translate': translate,
    weather
});

function resolveRoute(req) {
    const queryRoute = typeof req.query?.__api_route === 'string' ? req.query.__api_route : '';
    const url = new URL(req.url || '/', 'https://timer-proofer.invalid');
    const pathRoute = url.pathname.replace(/^\/api\/?/, '');
    const candidate = (queryRoute || pathRoute).replace(/\.js$/i, '').replace(/^\/+|\/+$/g, '');
    if (!candidate || candidate.includes('..') || candidate.includes('/') || candidate.includes('\\')) return null;
    return ROUTES[candidate] || null;
}

export default async function handler(req, res) {
    const routeHandler = resolveRoute(req);
    if (!routeHandler) {
        res.setHeader('Cache-Control', 'no-store');
        return res.status(404).json({ error: 'API endpoint tidak ditemukan.' });
    }
    return routeHandler(req, res);
}

export const __test = Object.freeze({ routeNames: Object.keys(ROUTES), resolveRoute });
