/** [AI-GENERATED][QA][V328] Isolate settings preview audio and stop it on save. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (relative) => fs.readFileSync(new URL(`../${relative}`, import.meta.url), 'utf8');
const preferences = read('assets/js/features-preferences.js');
const alarm = read('assets/js/proofing-alarm-service.js');

function section(source, start, end) {
    const from = source.indexOf(start);
    const to = source.indexOf(end, from + start.length);
    assert.ok(from >= 0, `Missing start marker: ${start}`);
    assert.ok(to > from, `Missing end marker: ${end}`);
    return source.slice(from, to);
}

test('saving preferences stops the preview before closing the modal', () => {
    const save = section(preferences, 'function simpanPreferensiLengkap()', 'window.simpanPreferensiLengkap');
    assert.match(save, /ProofingAlarmService\.stopPreview\(\)/);
    assert.ok(save.indexOf('ProofingAlarmService.stopPreview()') < save.indexOf("toggleModal('modal-preferensi')"));
});

test('settings preview uses its own playback API, not the real proofing alarm API', () => {
    const preview = section(preferences, 'function handlerPratinjauSuara()', 'function handlerPratinjauGetaran()');
    assert.match(preview, /ProofingAlarmService\.playPreview\(/);
    assert.doesNotMatch(preview, /window\.playAlarmSound\(/);
});

test('alarm service tracks preview audio separately from completion alarm audio', () => {
    assert.match(alarm, /let previewAudioAktif = null/);
    assert.match(alarm, /let previewPlaybackGeneration = 0/);
    assert.match(alarm, /function stopAlarmPreview\(\)/);
    assert.match(alarm, /function playAlarmPreview\(/);
    assert.match(alarm, /stopPreview:\s*stopAlarmPreview/);
    assert.match(alarm, /playPreview:\s*playAlarmPreview/);
});

test('late preview play rejection cannot restart audio after Save stopped it', () => {
    const preview = section(alarm, 'function playAlarmPreview(', 'export const ProofingAlarmService');
    assert.match(preview, /playbackGeneration !== previewPlaybackGeneration/);
    assert.match(preview, /previewAudioAktif !== audio/);
    const stop = section(alarm, 'function stopAlarmPreview()', 'function playAlarmPreviewTone');
    assert.match(stop, /previewPlaybackGeneration \+= 1/);
    assert.match(stop, /audio\.pause\(\)/);
    assert.match(stop, /audio\.currentTime = 0/);
});


test('turning the sound setting off stops the current preview immediately', () => {
    const preview = section(preferences, 'function handlerPratinjauSuara()', 'function handlerPratinjauGetaran()');
    assert.match(preview, /if \(!elSound \|\| !elSound\.checked\)\s*\{[\s\S]*?ProofingAlarmService\.stopPreview\(\)/);
});
