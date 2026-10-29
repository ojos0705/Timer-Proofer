/** [AI-GENERATED][QA][V224] Account deletion must include IndexedDB photo cleanup. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync(new URL('../assets/js/app-core.js', import.meta.url), 'utf8');
const start = source.indexOf('async function hapusAkunPermanen()');
const end = source.indexOf('window.validateSubmitButton =', start);
assert.ok(start >= 0 && end > start, 'permanent account deletion function must exist');
const deletionFlow = source.slice(start, end);

test('permanent account deletion clears owner-scoped IndexedDB blobs', () => {
    assert.match(deletionFlow, /deleteAllPhotosForOwner\(user\.id\)/);
    assert.match(deletionFlow, /RecipePhotoService\.clear\(\)/);
    assert.match(deletionFlow, /!photoDataCleared/);
    assert.match(deletionFlow, /foto resep di IndexedDB tidak berhasil dipastikan terhapus/);
});

test('ordinary signed-out lifecycle does not delete persisted recipe photos', () => {
    const lifecycleStart = source.indexOf('onSignedOut: async (epoch) =>');
    const lifecycleEnd = source.indexOf('\n    }\n};', lifecycleStart);
    assert.ok(lifecycleStart >= 0 && lifecycleEnd > lifecycleStart, 'signed-out lifecycle handler must exist');
    const lifecycle = source.slice(lifecycleStart, lifecycleEnd);
    assert.doesNotMatch(lifecycle, /deleteAllPhotosForOwner/);
});

