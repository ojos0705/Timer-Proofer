/** [AI-GENERATED][QA][V258] Verify the legacy PDF bridge is isolated behind an ES module adapter. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createPdfExportService } from '../assets/js/pdf-export-service.js';

const appCore = fs.readFileSync(new URL('../assets/js/app-core.js', import.meta.url), 'utf8');
const html = fs.readFileSync(new URL('../www/index.html', import.meta.url), 'utf8');
const sw = fs.readFileSync(new URL('../www/sw.js', import.meta.url), 'utf8');
const manifest = fs.readFileSync(new URL('../assets/js/module-manifest.js', import.meta.url), 'utf8');

test('native PDF adapter validates the output and returns only the base64 payload', async () => {
    const expectedElement = {};
    let receivedElement;
    const service = createPdfExportService({
        getHtml2Pdf: () => () => ({
            from(element) {
                receivedElement = element;
                return { outputPdf: async (format) => {
                    assert.equal(format, 'datauristring');
                    return 'data:application/pdf;base64,QUJDREVGRw==';
                } };
            }
        })
    });
    assert.equal(await service.createPdfBase64(expectedElement), 'QUJDREVGRw==');
    assert.equal(receivedElement, expectedElement);
});

test('native PDF adapter gives an actionable error when the local bundle is unavailable', async () => {
    const service = createPdfExportService({ getHtml2Pdf: () => undefined });
    await assert.rejects(service.createPdfBase64({}), { code: 'PDF_LIBRARY_UNAVAILABLE' });
});

test('app-core consumes PDF services rather than directly depending on canvas/jsPDF globals', () => {
    assert.match(appCore, /import \{ PdfRenderService \} from '\.\/pdf-render-service\.js'/);
    assert.match(appCore, /import \{ PdfExportService \} from '\.\/pdf-export-service\.js'/);
    assert.doesNotMatch(appCore, /\bhtml2canvas\s*\(/);
    assert.doesNotMatch(appCore, /window\.jspdf/);
    assert.match(appCore, /PdfExportService\.createPdfBase64\(element\)/);
    assert.doesNotMatch(html, /"(?:html2canvas|jspdf)"\s*:/);
    assert.doesNotMatch(html, /cdnjs\.cloudflare\.com/);
    assert.match(sw, /'\.\/assets\/js\/pdf-render-service\.js'/);
    assert.match(sw, /'\.\/assets\/js\/pdf-export-service\.js'/);
    assert.match(manifest, /'pdf-render-service\.js', 'pdf-export-service\.js'/);
});
