/** [AI-GENERATED][QA][V258] Verify the local, offline-capable PDF renderer module. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { createPdfRenderService } from '../assets/js/pdf-render-service.js';

test('PDF service renders an element with the local worker and returns its canvas and document', async () => {
    const calls = [];
    const canvas = { toDataURL: () => 'data:image/png;base64,AA==', width: 100, height: 200 };
    const pdf = { save: (filename) => calls.push(['save', filename]) };
    const worker = {
        set(options) { calls.push(['set', options]); return this; },
        from(element) { calls.push(['from', element]); return this; },
        toCanvas() { calls.push(['toCanvas']); return this; },
        get(key) {
            calls.push(['get', key]);
            if (key === 'canvas') return Promise.resolve(canvas);
            if (key === 'pdf') return Promise.resolve(pdf);
            return Promise.resolve(undefined);
        },
        toPdf() { calls.push(['toPdf']); return Promise.resolve(this); }
    };
    const service = createPdfRenderService({ getHtml2Pdf: () => () => worker });
    const element = {};
    const result = await service.renderElementToPdf(element, { scale: 2.5, useCORS: true }, { format: 'a4' });
    assert.equal(result.canvas, canvas);
    assert.equal(result.pdf, pdf);
    assert.deepEqual(calls.map((call) => call[0]), ['set', 'from', 'toCanvas', 'get', 'toPdf', 'get']);
    assert.equal(calls[1][1], element);
    assert.deepEqual(calls[0][1], {
        margin: 0,
        html2canvas: { scale: 2.5, useCORS: true },
        jsPDF: { orientation: 'p', unit: 'mm', format: 'a4' }
    });
});

test('invalid renderer input is rejected before calling the local PDF factory', async () => {
    let loads = 0;
    const service = createPdfRenderService({ getHtml2Pdf: () => { loads += 1; return () => ({}); } });
    await assert.rejects(service.renderElementToPdf(null), { name: 'TypeError' });
    assert.equal(loads, 0);
});

test('missing local PDF bundle is reported as a retryable capability error', async () => {
    const service = createPdfRenderService({ getHtml2Pdf: () => undefined });
    await assert.rejects(service.renderElementToPdf({}), { code: 'PDF_LIBRARY_UNAVAILABLE' });
});
