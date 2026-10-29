/**
 * [AI-GENERATED][QA][V289] Audit duplicate named function declarations in ES modules.
 * Cross-module names are informational because ES modules have isolated lexical scopes.
 * Duplicate declarations in one module fail the release audit.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export function auditFunctionNames(fileSources) {
    const byName = new Map();
    const duplicatesWithinModule = [];
    for (const { file, source } of fileSources) {
        const seenInFile = new Map();
        // Declaration-only scan; methods, callbacks and function expressions are intentionally excluded.
        const pattern = /^\s*(?:export\s+)?(?:default\s+)?(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(/gm;
        for (const match of source.matchAll(pattern)) {
            const name = match[1];
            const line = source.slice(0, match.index).split('\n').length;
            const record = { file, line };
            const previous = seenInFile.get(name);
            if (previous) duplicatesWithinModule.push({ name, first: previous, duplicate: record });
            else seenInFile.set(name, record);
            if (!byName.has(name)) byName.set(name, []);
            byName.get(name).push(record);
        }
    }
    const acrossModules = [...byName.entries()]
        .filter(([, locations]) => new Set(locations.map(({ file }) => file)).size > 1)
        .map(([name, locations]) => ({ name, locations }));
    return { duplicatesWithinModule, acrossModules };
}

function collectSources(directory) {
    const results = [];
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
        const fullPath = path.join(directory, entry.name);
        if (entry.isDirectory()) results.push(...collectSources(fullPath));
        else if (entry.isFile() && /\.m?js$/i.test(entry.name)) {
            results.push({ file: path.relative(root, fullPath).split(path.sep).join('/'), source: fs.readFileSync(fullPath, 'utf8') });
        }
    }
    return results;
}

const isDirectExecution = process.argv[1]
    && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;
if (isDirectExecution) {
    const { duplicatesWithinModule, acrossModules } = auditFunctionNames(collectSources(path.join(root, 'assets/js')));
    console.log(`Nama fungsi berulang lintas modul (informatif): ${acrossModules.length}`);
    for (const { name, locations } of acrossModules) {
        console.log(`- ${name}: ${locations.map(({ file, line }) => `${file}:${line}`).join(', ')}`);
    }
    console.log(`Deklarasi fungsi duplikat dalam modul yang sama: ${duplicatesWithinModule.length}`);
    if (duplicatesWithinModule.length) {
        for (const item of duplicatesWithinModule) {
            console.error(`- ${item.name}: ${item.first.file}:${item.first.line} dan ${item.duplicate.file}:${item.duplicate.line}`);
        }
        process.exitCode = 1;
    } else {
        console.log('LULUS: tidak ada deklarasi function bernama duplikat dalam satu modul.');
    }
}
