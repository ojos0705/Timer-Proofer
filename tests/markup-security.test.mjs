/** [AI-GENERATED][QA][V217] Regression tests for untrusted data rendered as HTML. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { escapeHtmlMarkup, normalizeSafeRecipeImageSource } from '../assets/js/core/markup-security.js';
import { formatHasilAI } from '../assets/js/ai-formatters.js';

const appCore = fs.readFileSync(new URL('../assets/js/app-core.js', import.meta.url), 'utf8');

test('HTML escaping covers text and quoted-attribute metacharacters', () => {
    assert.equal(
        escapeHtmlMarkup(`<img src="x" onerror='alert(1)'>&`),
        '&lt;img src=&quot;x&quot; onerror=&#039;alert(1)&#039;&gt;&amp;',
    );
    assert.equal(escapeHtmlMarkup(null), '');
    assert.equal(escapeHtmlMarkup(0), '0');
});

test('safe recipe image source accepts common raster data URLs and web image URLs', () => {
    assert.equal(normalizeSafeRecipeImageSource('data:image/png;base64,iVBORw0KGgo='), 'data:image/png;base64,iVBORw0KGgo=');
    assert.equal(normalizeSafeRecipeImageSource('https://cdn.example.test/recipe/photo.jpg?size=large'), 'https://cdn.example.test/recipe/photo.jpg?size=large');
    assert.equal(normalizeSafeRecipeImageSource('./photos/recipe.webp'), './photos/recipe.webp');
});

test('safe recipe image source rejects active, local-file, SVG data URLs and unreasonable sizes', () => {
    for (const unsafe of [
        'javascript:alert(1)',
        'vbscript:msgbox(1)',
        'file:///etc/passwd',
        'data:text/html;base64,PHNjcmlwdD4=',
        'data:image/svg+xml;base64,PHN2ZyBvbmxvYWQ9ImFsZXJ0KDEpIj4=',
        `https://cdn.example.test/${'a'.repeat(5 * 1024 * 1024 + 1)}`,
    ]) {
        assert.equal(normalizeSafeRecipeImageSource(unsafe), '', `must reject ${unsafe.slice(0, 70)}`);
    }
    assert.equal(normalizeSafeRecipeImageSource(null), '');
    assert.equal(normalizeSafeRecipeImageSource({ src: 'https://example.test/a.png' }), '');
});

test('production-step photo markup uses a validated and escaped source', () => {
    assert.match(appCore, /const safeStepPhoto = normalizeSafeRecipeImageSource\(stepPhoto\)/);
    assert.match(appCore, /src="\$\{safeStepPhotoAttribute\}"/);
    assert.doesNotMatch(appCore, /src="\$\{stepPhoto\}"/);
});

test('saved recipe cards and print documents escape imported values while retaining raw share text', () => {
    assert.match(appCore, /const namaResepHtml = escapeHtmlMarkup\(namaResep\)/);
    assert.match(appCore, /const tepungUtamaHtml = escapeHtmlMarkup\(tepungUtama\)/);
    assert.match(appCore, /const targetYieldHtml = escapeHtmlMarkup\(targetYield\)/);
    assert.match(appCore, /const waktuSimpanHtml = escapeHtmlMarkup\(waktuSimpan\)/);
    assert.match(appCore, /title: namaResep, text: `Resep \$\{namaResep\}/);
    assert.doesNotMatch(appCore, /<h2>🍩 '\s*\+ namaResep \+\s*'<\/h2>/);
});


test('AI formatter escapes model-supplied HTML before adding presentation markup', () => {
    const hostileOutput = '</div><img src=x onerror="alert(1)"><script>alert(2)</script>';
    const formatted = formatHasilAI(hostileOutput);
    assert.match(formatted, /&lt;img src=x onerror=&quot;alert\(1\)&quot;&gt;/);
    assert.match(formatted, /&lt;script&gt;alert\(2\)&lt;\/script&gt;/);
    assert.doesNotMatch(formatted, /<img\s+src=x/i);
    assert.doesNotMatch(formatted, /<script>/i);
});

test('AI question, error, telemetry, and provider text are escaped at direct HTML sinks', () => {
    assert.match(appCore, /AI sedang memformulasikan solusi untuk "\$\{escapeHtmlMarkup\(pertanyaan\)\}"/);
    assert.match(appCore, /Gagal terhubung ke AI Asisten: \$\{escapeHtmlMarkup\(error\?\.message/);
    assert.match(appCore, /AI online sedang tidak tersedia/);
    assert.match(appCore, /escapeHtmlMarkup\(error\?\.message/);
    assert.match(appCore, /\$\{formatHasilAI\(hasilAI\)\}/);
    assert.doesNotMatch(appCore, /\$\{hasilAI\.replace\(\/\n\/g, '<br>'\)\}/);
    assert.match(appCore, /\$\{escapeHtmlMarkup\(deskripsiBersih\)\}/);
    assert.match(appCore, /weather-status-line[\s\S]{0,160}\$\{escapeHtmlMarkup\(userMessage\)\}/);
});

test('AI greeting escapes weather and temperature values read from the rendered provider UI', () => {
    assert.match(appCore, /const elemenCuacaHtml = escapeHtmlMarkup\(elemenCuaca\)/);
    assert.match(appCore, /const elemenSuhuHtml = escapeHtmlMarkup\(elemenSuhu\)/);
    assert.match(appCore, /<strong>\$\{elemenCuacaHtml\}<\/strong>[\s\S]{0,100}\$\{elemenSuhuHtml\}/);
    assert.doesNotMatch(appCore, /<strong>\$\{elemenCuaca\}<\/strong>/);
});

test('sensor advice no longer interpolates raw sensor values into innerHTML', () => {
    assert.match(appCore, /const advice = buildProofingInsight\(temp, humidity\)/);
    assert.match(appCore, /escapeHtmlMarkup\(advice\.insight\)/);
    assert.match(appCore, /escapeHtmlMarkup\(advice\.action\)/);
    assert.match(appCore, /escapeHtmlMarkup\(advice\.recommendation\)/);
    assert.doesNotMatch(appCore, /insightEl\.innerHTML = `[^`]*\$\{insight\}/);
});
