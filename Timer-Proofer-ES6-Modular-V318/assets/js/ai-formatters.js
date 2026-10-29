/**
 * [AI-GENERATED][SECURITY][V216] Canonical AI result formatter.
 * Single source of truth for AI analysis and AI tips rendering.
 * Model output is always treated as untrusted text before formatting.
 */
import { escapeHtmlMarkup } from './core/markup-security.js';

export function formatHasilAI(teks) {
    if (!teks) return 'Analisis tidak tersedia.';

    // [AI-GENERATED][SECURITY][V216] Escape AI/server text through the shared helper
    // before converting only known presentation markers into generated markup.
    // [AI-GENERATED][REFACTOR] Normalize broken bullet/newline combinations after escaping.
    let cleanText = escapeHtmlMarkup(teks).replace(/([\*\-•])\s*\n\s*/g, '$1 ');

    cleanText = cleanText
        .replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>')
        .replace(/_([^_\n]+)_/g, '<em>$1</em>');

    const lines = cleanText.split('\n');
    const htmlLines = [];

    lines.forEach((line) => {
        let t = line.trim();
        if (!t || t === '•' || t === '-' || t === '*') return;

        // [AI-GENERATED][REFACTOR] Preserve the existing visual formatting contract.
        if (/^([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])\s*(.+)$/.test(t) || /^#\s/.test(t)) {
            t = t.replace(/^#\s*/, '').toLowerCase();
            htmlLines.push(`<div style="font-weight:900; margin:24px 0 12px 0; color:#4a235a; font-size:1.05rem; border-bottom:2px solid #e8daef; padding-bottom:6px; text-transform:capitalize; letter-spacing:0.3px;">${t}</div>`);
        } else if (t.endsWith(':') || /^#{2,6}\s/.test(t)) {
            t = t.replace(/^#{2,6}\s*/, '');
            htmlLines.push(`<div style="font-weight:800; margin:16px 0 6px 0; color:#2980b9; font-size:0.95rem;">${t}</div>`);
        } else if (/^(\d+)\.\s+(.+)/.test(t)) {
            const match = t.match(/^(\d+)\.\s+(.+)/);
            htmlLines.push(`<div style="padding-left:12px; margin-bottom:8px; display:flex; line-height:1.5; font-size:0.9rem;"><span style="margin-right:8px; font-weight:900; color:#d35400;">${match[1]}.</span><span>${match[2]}</span></div>`);
        } else if (/^[\*\-•]\s+/.test(t)) {
            t = t.replace(/^[\*\-•]\s+/, '');
            htmlLines.push(`<div style="padding-left:12px; margin-bottom:8px; display:flex; line-height:1.5; font-size:0.9rem;"><span style="margin-right:10px; color:#d35400; font-size:1.2rem; line-height:0.8;">•</span><span>${t}</span></div>`);
        } else {
            htmlLines.push(`<div style="margin-bottom:10px; line-height:1.6; font-size:0.9rem; color:#444; text-align:justify;">${t}</div>`);
        }
    });

    return htmlLines.join('');
}
