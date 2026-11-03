/** [AI-GENERATED][QA][V195] Real-browser integration harness for native IndexedDB. */
import { RecipePhotoPersistenceService as persistence } from '../assets/js/recipe-photo-persistence-service.js';

const summary = document.getElementById('summary');
const results = document.getElementById('results');
const outcome = [];
const ownerId = `qa-browser-${crypto.randomUUID()}`;
const recipeId = `recipe-${crypto.randomUUID()}`;
const peerRecipeId = `peer-recipe-${crypto.randomUUID()}`;
const peerOwnerId = `peer-owner-${crypto.randomUUID()}`;

function assert(condition, message) {
    if (!condition) throw new Error(message);
}
function pass(message) { outcome.push({ status: 'pass', message }); }
function bytesMatch(blob, expected) {
    return blob.arrayBuffer().then((buffer) =>
        [...new Uint8Array(buffer)].join(',') === expected.join(','));
}
function file(name, bytes, type = 'image/jpeg') {
    return new File([new Uint8Array(bytes)], name, { type });
}

async function run() {
    try {
    assert(typeof indexedDB !== 'undefined', 'IndexedDB tidak tersedia di origin ini.');
    assert(typeof File !== 'undefined', 'File API tidak tersedia di browser ini.');

    const initial = Array(5).fill(null);
    initial[0] = file('utama-v195.jpg', [1, 4, 9]);
    initial[3] = file('kemasan-v195.png', [2, 5, 8], 'image/png');
    assert(await persistence.replaceRecipePhotos(ownerId, recipeId, initial), 'Penyimpanan foto awal gagal.');
    const loaded = await persistence.loadRecipePhotos(ownerId, recipeId);
    assert(loaded.length === 5 && loaded[1] === null && loaded[2] === null && loaded[4] === null,
        'Slot kosong bergeser atau hilang.');
    assert(loaded[0]?.name === 'utama-v195.jpg' && loaded[0]?.type === 'image/jpeg',
        'Metadata foto utama tidak terpulihkan.');
    assert(await bytesMatch(loaded[0], [1, 4, 9]), 'Byte foto utama berubah setelah dipulihkan.');
    assert(loaded[3]?.name === 'kemasan-v195.png' && await bytesMatch(loaded[3], [2, 5, 8]),
        'Foto kemasan tidak terpulihkan utuh.');
    pass('Simpan dan pulihkan mempertahankan byte, nama, MIME type, dan posisi slot.');

    await persistence.replaceRecipePhotos(ownerId, peerRecipeId, [file('peer-same-owner.jpg', [7])]);
    await persistence.replaceRecipePhotos(peerOwnerId, recipeId, [file('peer-other-owner.jpg', [6])]);
    const replacement = Array(5).fill(null);
    replacement[2] = file('replacement-v195.jpg', [3, 1, 4]);
    assert(await persistence.replaceRecipePhotos(ownerId, recipeId, replacement), 'Penggantian foto gagal.');
    const replaced = await persistence.loadRecipePhotos(ownerId, recipeId);
    assert(replaced[0] === null && replaced[3] === null && replaced[2]?.name === 'replacement-v195.jpg',
        'Penggantian foto tidak menghapus data slot usang dengan benar.');
    assert((await persistence.loadRecipePhotos(ownerId, peerRecipeId))[0]?.name === 'peer-same-owner.jpg',
        'Penggantian mengubah foto resep lain pada pemilik yang sama.');
    assert((await persistence.loadRecipePhotos(peerOwnerId, recipeId))[0]?.name === 'peer-other-owner.jpg',
        'Penggantian mengubah foto milik akun lain.');
    pass('Penggantian foto menghapus slot usang tanpa menyentuh resep atau akun lain.');

    assert(await persistence.deleteRecipePhotos(ownerId, recipeId), 'Penghapusan foto gagal.');
    const removed = await persistence.loadRecipePhotos(ownerId, recipeId);
    assert(removed.every((entry) => entry === null), 'Foto masih tersisa setelah dihapus.');
    assert((await persistence.loadRecipePhotos(ownerId, peerRecipeId))[0]?.name === 'peer-same-owner.jpg',
        'Penghapusan menghapus foto resep tetangga.');
    pass('Hapus foto hanya memengaruhi resep yang dipilih.');
} catch (error) {
    outcome.push({ status: 'fail', message: error?.message || String(error) });
} finally {
    // Remove only the rows created by this run; owner IDs are unique per page load.
    await Promise.allSettled([
        persistence.deleteRecipePhotos(ownerId, recipeId),
        persistence.deleteRecipePhotos(ownerId, peerRecipeId),
        persistence.deleteRecipePhotos(peerOwnerId, recipeId)
    ]);
    for (const item of outcome) {
        const row = document.createElement('li');
        row.dataset.status = item.status;
        row.textContent = `${item.status === 'pass' ? 'LULUS' : 'GAGAL'} — ${item.message}`;
        results.appendChild(row);
    }
    const passed = outcome.filter((item) => item.status === 'pass').length;
    const failed = outcome.filter((item) => item.status === 'fail').length;
    summary.textContent = `${passed} skenario lulus; ${failed} gagal.`;
    summary.dataset.status = failed ? 'fail' : 'pass';
    document.body.dataset.testState = failed ? 'failed' : 'passed';
    if (failed) console.error('[RecipePhotoPersistence Browser QA]', outcome.filter((item) => item.status === 'fail'));
    }
}

run().catch((error) => {
    summary.textContent = `QA berhenti karena kesalahan harness: ${error?.message || String(error)}`;
    summary.dataset.status = 'fail';
    document.body.dataset.testState = 'failed';
    console.error('[RecipePhotoPersistence Browser QA]', error);
});
