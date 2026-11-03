/** [AI-GENERATED][QA][V334] Pure language-code and translation batching contracts. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
    normalizeTranslationLanguageCode,
    buildTranslationBatches,
    resolveSupportedTranslationLanguageCode
} from '../assets/js/translation-utils.js';

 test('language codes normalize separators and reject malformed values', () => {
    assert.equal(normalizeTranslationLanguageCode(' zh_CN '), 'zh-CN');
    assert.throws(() => normalizeTranslationLanguageCode('not a language'), { code: 'TRANSLATION_INVALID_LANGUAGE' });
    assert.throws(() => normalizeTranslationLanguageCode(''), { code: 'TRANSLATION_INVALID_LANGUAGE' });
});

test('translation batches respect both item count and Unicode character limits', () => {
    const batches = buildTranslationBatches(['a', 'bb', 'ccc', 'dddd', '', 'éé'], {
        maxItems: 2,
        maxCharacters: 5
    });
    assert.deepEqual(batches, [['a', 'bb'], ['ccc'], ['dddd'], ['éé']]);
    assert.throws(() => buildTranslationBatches(['x'.repeat(5001)]), { code: 'TRANSLATION_TEXT_TOO_LONG' });
});

test('provider language catalog is authoritative and regional codes may use only a supported base language', () => {
    const supported = ['en', 'fr', 'he', 'fil', 'zh-CN'];
    assert.equal(resolveSupportedTranslationLanguageCode('fr-CA', supported), 'fr');
    assert.equal(resolveSupportedTranslationLanguageCode('zh-CN', supported), 'zh-CN');
    assert.equal(resolveSupportedTranslationLanguageCode('iw', supported), 'he');
    assert.equal(resolveSupportedTranslationLanguageCode('tl', supported), 'fil');
    assert.equal(resolveSupportedTranslationLanguageCode('ab', supported), null);
});
