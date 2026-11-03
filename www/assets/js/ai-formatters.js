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


// [AI-GENERATED][AI-TIPS][V322] Keep the tips formatter separate so the
// already-working AI Analysis presentation contract remains unchanged.
function formatTipsInlineMarkdown(value) {
    return escapeHtmlMarkup(value)
        .replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>')
        .replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/g, '<em>$1</em>')
        .replace(/`([^`\n]+)`/g, '<code style="padding:1px 4px;border-radius:4px;background:#f5eee7;color:#4E342E;font-size:.88em;">$1</code>');
}

function normalizeTipsText(value) {
    return String(value)
        .replace(/\r\n?/g, '\n')
        .replace(/```(?:markdown|md|text)?\s*/gi, '')
        .replace(/```/g, '')
        // Separate numbered steps even when the model puts the full answer on one line.
        .replace(/([^\n])\s+(?=(?:\*\*)?\d{1,2}\.(?:\*\*)?\s*(?:\*\*)?[A-ZÀ-ÿ])/g, '$1\n')
        .replace(/([^\n])\s+(?=[•●▪]\s+)/g, '$1\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
}

export function formatTipsHasilAI(teks) {
    if (!teks) return 'Tips AI tidak tersedia.';

    const lines = normalizeTipsText(teks).split('\n');
    const htmlLines = [];

    lines.forEach((rawLine) => {
        const line = rawLine.trim();
        if (!line) return;

        const markdownHeading = line.match(/^#{1,6}\s+(.+)$/);
        const boldHeading = line.match(/^\*\*([^*]{2,140})\*\*$/);
        const orderedItem = line.match(/^(?:\*\*)?(\d{1,2})\.(?:\*\*)?\s*(.+)$/);
        const bulletItem = line.match(/^[•●▪*-]\s+(.+)$/);

        if (markdownHeading || boldHeading) {
            const heading = markdownHeading ? markdownHeading[1] : boldHeading[1];
            htmlLines.push(`<div class="ai-tips-heading" style="font-weight:900;margin:18px 0 9px;color:#4E342E;font-size:1rem;line-height:1.35;border-bottom:2px solid #F2D2A9;padding-bottom:6px;">${formatTipsInlineMarkdown(heading)}</div>`);
        } else if (orderedItem) {
            htmlLines.push(`<div class="ai-tips-list-item" style="display:grid;grid-template-columns:22px minmax(0,1fr);gap:7px;margin:0 0 9px;padding-left:3px;line-height:1.6;font-size:.9rem;color:#4E342E;"><strong style="color:#E67E22;">${orderedItem[1]}.</strong><span>${formatTipsInlineMarkdown(orderedItem[2])}</span></div>`);
        } else if (bulletItem) {
            htmlLines.push(`<div class="ai-tips-bullet-item" style="display:grid;grid-template-columns:14px minmax(0,1fr);gap:7px;margin:0 0 8px;padding-left:9px;line-height:1.6;font-size:.9rem;color:#4E342E;"><strong style="color:#E67E22;">•</strong><span>${formatTipsInlineMarkdown(bulletItem[1])}</span></div>`);
        } else {
            htmlLines.push(`<p class="ai-tips-paragraph" style="margin:0 0 11px;line-height:1.65;font-size:.9rem;color:#51413A;text-align:justify;">${formatTipsInlineMarkdown(line)}</p>`);
        }
    });

    return htmlLines.join('');
}
