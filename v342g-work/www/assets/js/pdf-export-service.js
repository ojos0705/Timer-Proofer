/**
 * [AI-GENERATED][ES6 MODULE][V258]
 * Compatibility adapter for the locally bundled html2pdf UMD library.
 * All legacy access to window.html2pdf is contained in this module.
 */
export function createPdfExportService({
    getHtml2Pdf = () => globalThis.window?.html2pdf || globalThis.html2pdf
} = {}) {
    async function createPdfDataUri(element) {
        if (!element || typeof element !== 'object') {
            throw new TypeError('Elemen HTML untuk ekspor PDF tidak valid.');
        }

        const html2pdf = getHtml2Pdf();
        if (typeof html2pdf !== 'function') {
            const error = new Error('Library html2pdf belum tersedia.');
            error.code = 'PDF_LIBRARY_UNAVAILABLE';
            throw error;
        }

        const worker = html2pdf().from(element);
        if (!worker || typeof worker.outputPdf !== 'function') {
            throw new TypeError('API output PDF dari html2pdf tidak tersedia.');
        }

        const dataUri = await worker.outputPdf('datauristring');
        if (typeof dataUri !== 'string' || !dataUri.startsWith('data:') || !dataUri.includes(',')) {
            throw new Error('Library PDF mengembalikan format data yang tidak valid.');
        }
        return dataUri;
    }

    async function createPdfBase64(element) {
        const dataUri = await createPdfDataUri(element);
        const separator = dataUri.indexOf(',');
        const base64 = dataUri.slice(separator + 1).trim();
        if (!base64) throw new Error('Data PDF kosong.');
        return base64;
    }

    return Object.freeze({ createPdfDataUri, createPdfBase64 });
}

export const PdfExportService = createPdfExportService();
