import test from 'node:test';
import assert from 'node:assert/strict';
import {
    readForcedOfflinePreference,
    readOfflineWeatherCache,
    readOfflineWeatherValue,
    splitWeatherLocationName,
    writeOfflineWeatherCache
} from '../assets/js/core/offline-weather-cache.js';

function createStorage(entries = {}) {
    const data = new Map(Object.entries(entries));
    return {
        getItem(key) { return data.has(key) ? data.get(key) : null; },
        setItem(key, value) { data.set(key, String(value)); },
        data
    };
}

test('offline preference reads true only for the explicit stored value', () => {
    assert.equal(readForcedOfflinePreference(createStorage({ app_force_offline: 'true' })), true);
    assert.equal(readForcedOfflinePreference(createStorage({ app_force_offline: 'false' })), false);
});

test('offline weather cache rejects malformed JSON and non-object payloads safely', () => {
    assert.deepEqual(readOfflineWeatherCache(createStorage({ donut_weather_cache: '{' })), {
        cache: {}, hasSavedCache: false
    });
    assert.deepEqual(readOfflineWeatherCache(createStorage({ donut_weather_cache: '[]' })), {
        cache: {}, hasSavedCache: false
    });
});

test('offline cache helper contains storage access failures', () => {
    const blockedStorage = {
        getItem() { throw new Error('storage disabled'); },
        setItem() { throw new Error('storage quota'); }
    };
    assert.equal(readForcedOfflinePreference(blockedStorage), false);
    assert.equal(readOfflineWeatherValue('saved_lat', blockedStorage), null);
    assert.deepEqual(readOfflineWeatherCache(blockedStorage), { cache: {}, hasSavedCache: false });
    assert.equal(writeOfflineWeatherCache({ temp: 24 }, blockedStorage), false);
});

test('location labels accept a single component and preserve additional separators', () => {
    assert.deepEqual(splitWeatherLocationName('Bandung'), ['Bandung', '']);
    assert.deepEqual(splitWeatherLocationName(' Bandung | Jawa Barat | Indonesia '), ['Bandung', 'Jawa Barat | Indonesia']);
    assert.deepEqual(splitWeatherLocationName({ city: 'Bandung' }), ['', '']);
});

test('offline cache writes JSON through the injected storage boundary', () => {
    const storage = createStorage();
    assert.equal(writeOfflineWeatherCache({ temp: 27, condition: 'clouds' }, storage), true);
    assert.deepEqual(JSON.parse(storage.data.get('donut_weather_cache')), { temp: 27, condition: 'clouds' });
});
