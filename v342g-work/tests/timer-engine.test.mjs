/** [AI-GENERATED][QA][V208] Boundary tests for countdown parsing and formatting. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { parseTimerSeconds, formatTimerSeconds } from '../assets/js/timer-engine.js';

test('parses canonical MM:SS and HH:MM:SS countdown text', () => {
    assert.equal(parseTimerSeconds('05:07'), 307);
    assert.equal(parseTimerSeconds('01:02:03'), 3723);
    assert.equal(parseTimerSeconds('120:09'), 7209, 'long MM:SS values remain accepted for compatibility');
    assert.equal(parseTimerSeconds('+00:12'), 12, 'overtime display marker keeps its existing magnitude behavior');
});

test('rejects malformed countdown text and out-of-range minute/second fields', () => {
    for (const input of [
        '', '   ', '12', '00:60', '1:60:00', '1:00:60',
        '01:2x', '1.5:30', '-00:10', '++00:10',
        '1:2:3:4', '999999999999999999:00', '00:00:999999999999999999'
    ]) {
        assert.equal(parseTimerSeconds(input), 0, `expected invalid value ${JSON.stringify(input)} to be rejected`);
    }
    assert.equal(parseTimerSeconds(null), 0);
    assert.equal(parseTimerSeconds(120), 0);
});

test('formatted non-negative timer values parse back to the same number of seconds', () => {
    for (const seconds of [0, 1, 59, 60, 3599, 3600, 3723, 72000]) {
        assert.equal(parseTimerSeconds(formatTimerSeconds(seconds)), seconds);
    }
});
