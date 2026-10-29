/** [AI-GENERATED][QA][V217] Validate sensor-derived proofing advice as plain text. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildProofingInsight } from '../assets/js/core/proofing-insight.js';

test('valid numeric sensor readings preserve cold, ideal, and hot guidance', () => {
    assert.match(buildProofingInsight(20, 60).insight, /Suhu 20°C tergolong dingin/);
    assert.match(buildProofingInsight('25.5', '65').insight, /Suhu 25\.5°C adalah suhu ideal/);
    assert.match(buildProofingInsight(32, 82).insight, /Suhu 32°C cukup panas/);
    assert.match(buildProofingInsight(32, 82).recommendation, /setiap 15 menit/);
});

test('hostile or malformed sensor strings are rejected as data, not reflected as markup', () => {
    const advice = buildProofingInsight('<img src=x onerror=alert(1)>', '<svg onload=alert(2)>');
    assert.match(advice.insight, /belum valid/);
    for (const text of Object.values(advice)) {
        assert.doesNotMatch(text, /<\/?(?:img|svg|script)\b/i);
        assert.doesNotMatch(text, /onerror\s*=|onload\s*=/i);
    }
});

test('impossible sensor readings fall back safely and invalid humidity does not trigger humidity guidance', () => {
    assert.match(buildProofingInsight(101, 50).action, /suhu yang valid/);
    assert.match(buildProofingInsight(-81, 50).recommendation, /Periksa sensor/);
    const advice = buildProofingInsight(29, 150);
    assert.match(advice.insight, /Suhu 29°C cukup panas/);
    assert.doesNotMatch(advice.insight, /150%/);
    assert.doesNotMatch(advice.action, /kelembapan 150%/i);
});

test('missing or non-finite readings return conservative plain-text guidance', () => {
    for (const input of [null, undefined, '', NaN, Infinity, {}, '<b>25</b>']) {
        const advice = buildProofingInsight(input, '70');
        assert.match(advice.insight, /belum valid/);
        for (const text of Object.values(advice)) {
            assert.doesNotMatch(text, /<\/?[a-z][^>]*>/i, 'fallback advice must remain plain text');
        }
    }
});
