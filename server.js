/**
 * [AI-GENERATED][REFACTOR][V199] Small dependency-free static preview server.
 * This serves the PWA shell/assets for local QA; Vercel serverless API routes
 * still run in their deployment environment and are not emulated here.
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const BLOCKED_PATH_SEGMENTS = new Set(['api', 'scripts', 'tests', 'node_modules', '.git']);
const BLOCKED_FILENAMES = new Set(['server.js', 'package.json', 'package-lock.json', 'refs.txt']);
const BLOCKED_EXTENSIONS = new Set(['.md', '.php', '.sh', '.txt']);

const MIME_TYPES = Object.freeze({
    '.css': 'text/css; charset=utf-8',
    '.html': 'text/html; charset=utf-8',
    '.ico': 'image/x-icon',
    '.jpeg': 'image/jpeg',
    '.jpg': 'image/jpeg',
    '.js': 'text/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.mjs': 'text/javascript; charset=utf-8',
    '.mp3': 'audio/mpeg',
    '.m4a': 'audio/mp4',
    '.pdf': 'application/pdf',
    '.png': 'image/png',
    '.svg': 'image/svg+xml',
    '.wav': 'audio/wav',
    '.webmanifest': 'application/manifest+json; charset=utf-8',
    '.webp': 'image/webp',
    '.woff2': 'font/woff2'
});

function sendText(response, statusCode, message, extraHeaders = {}) {
    const body = `${message}\n`;
    response.writeHead(statusCode, {
        'Content-Type': 'text/plain; charset=utf-8',
        'Content-Length': Buffer.byteLength(body),
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
        ...extraHeaders
    });
    response.end(response.req?.method === 'HEAD' ? undefined : body);
}

/**
 * [AI-GENERATED][SECURITY][V199] Resolve only files contained by rootDir.
 * Returns null for malformed/unsafe paths; hidden path segments are denied.
 */
function resolvePublicPath(rootDir, requestTarget) {
    let url;
    try {
        url = new URL(requestTarget, 'http://timer-proofer.local');
    } catch {
        return { error: 400 };
    }

    let decodedPath;
    try {
        decodedPath = decodeURIComponent(url.pathname);
    } catch {
        return { error: 400 };
    }

    if (decodedPath.includes('\0') || decodedPath.includes('\\')) return { error: 400 };

    const normalizedSegments = decodedPath.split('/').filter(Boolean);
    const relativePath = normalizedSegments.length ? normalizedSegments.join(path.sep) : 'index.html';
    const targetPath = path.resolve(rootDir, relativePath);
    const relativeToRoot = path.relative(rootDir, targetPath);
    if (relativeToRoot === '..' || relativeToRoot.startsWith(`..${path.sep}`) || path.isAbsolute(relativeToRoot)) {
        return { error: 403 };
    }
    const lowerSegments = normalizedSegments.map((segment) => segment.toLowerCase());
    if (lowerSegments.some((segment) => segment.startsWith('.') || BLOCKED_PATH_SEGMENTS.has(segment))) {
        return { error: 404 };
    }
    const basename = path.basename(targetPath).toLowerCase();
    const extension = path.extname(targetPath).toLowerCase();
    if (BLOCKED_FILENAMES.has(basename) || BLOCKED_EXTENSIONS.has(extension)) return { error: 404 };
    return { targetPath };
}

export function createStaticServer({ root = process.cwd(), host = '127.0.0.1' } = {}) {
    const rootDir = path.resolve(root);

    return http.createServer((request, response) => {
        response.req = request;
        const method = String(request.method || 'GET').toUpperCase();
        if (method !== 'GET' && method !== 'HEAD') {
            sendText(response, 405, 'Method Not Allowed', { Allow: 'GET, HEAD' });
            return;
        }

        const resolved = resolvePublicPath(rootDir, request.url || '/');
        if (resolved.error) {
            sendText(response, resolved.error, resolved.error === 403 ? 'Forbidden' : resolved.error === 400 ? 'Bad Request' : 'Not Found');
            return;
        }

        fs.stat(resolved.targetPath, (statError, stats) => {
            if (statError || !stats.isFile()) {
                sendText(response, 404, 'Not Found');
                return;
            }

            const extension = path.extname(resolved.targetPath).toLowerCase();
            response.writeHead(200, {
                'Content-Type': MIME_TYPES[extension] || 'application/octet-stream',
                'Content-Length': stats.size,
                'Cache-Control': 'no-cache',
                'X-Content-Type-Options': 'nosniff',
                'Referrer-Policy': 'same-origin'
            });

            if (method === 'HEAD') {
                response.end();
                return;
            }

            const stream = fs.createReadStream(resolved.targetPath);
            stream.on('error', () => {
                if (!response.headersSent) sendText(response, 500, 'Internal Server Error');
                else response.destroy();
            });
            stream.pipe(response);
        });
    }).on('listening', function () {
        const address = this.address();
        if (address && typeof address === 'object') {
            console.info(`[Timer Proofer QA server] http://${host}:${address.port}`);
        }
    });
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : '';
if (invokedPath === fileURLToPath(import.meta.url)) {
    const portValue = Number(process.env.PORT || 4173);
    const port = Number.isInteger(portValue) && portValue >= 0 && portValue <= 65535 ? portValue : 4173;
    const host = process.env.HOST || '127.0.0.1';
    const server = createStaticServer({ root: path.join(path.dirname(fileURLToPath(import.meta.url)), 'www'), host, port });
    server.listen(port, host);
}
