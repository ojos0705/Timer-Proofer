/**
 * [AI-GENERATED][ES6 MODULE][V258]
 * Browser PDF renderer facade backed by the locally bundled html2pdf worker.
 * Using the app-local bundle avoids fetching html2canvas/jsPDF from a CDN when
 * the user exports while offline. Global UMD access stays isolated in this module.
 */
export function createPdfRenderService({
    getHtml2Pdf = () => globalThis.window?.html2pdf || globalThis.html2pdf
} = {}) {
    async function renderElementToPdf(element, canvasOptions = {}, pdfOptions = {}) {
        if (!element || typeof element !== 'object') {
            throw new TypeError('Elemen HTML untuk ekspor PDF tidak valid.');
        }

        const html2pdf = getHtml2Pdf();
        if (typeof html2pdf !== 'function') {
            const error = new Error('Library PDF lokal belum tersedia.');
            error.code = 'PDF_LIBRARY_UNAVAILABLE';
            throw error;
        }

        const worker = html2pdf().set({
            margin: 0,
            html2canvas: canvasOptions,
            jsPDF: { orientation: 'p', unit: 'mm', format: 'a4', ...pdfOptions }
        }).from(element);

        if (!worker || typeof worker.toCanvas !== 'function' || typeof worker.toPdf !== 'function' || typeof worker.get !== 'function') {
            throw new TypeError('API worker html2pdf tidak lengkap.');
        }

        const canvas = await worker.toCanvas().get('canvas');
        if (!canvas || typeof canvas.toDataURL !== 'function') {
            throw new Error('Renderer PDF tidak menghasilkan canvas yang valid.');
        }

        await worker.toPdf();
        const pdf = await worker.get('pdf');
        if (!pdf || typeof pdf.save !== 'function') {
            throw new Error('Renderer PDF tidak menghasilkan dokumen yang valid.');
        }

        return Object.freeze({ canvas, pdf });
    }

    return Object.freeze({ renderElementToPdf });
}

export const PdfRenderService = createPdfRenderService();
