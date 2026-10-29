/**
 * [AI-GENERATED][REFACTOR][V36]
 * Canonical network/data service for weather and elevation APIs.
 * UI rendering remains in app-core.js; this module only retrieves and validates data.
 */
import { getJson } from './api-client-service.js';

function assertCoordinates(lat, lon) {
    const latitude = Number(lat);
    const longitude = Number(lon);
    if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
        throw new Error('Koordinat lintang tidak valid.');
    }
    if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
        throw new Error('Koordinat bujur tidak valid.');
    }
    return { latitude, longitude };
}

export async function fetchWeather(lat, lon, options = {}) {
    const { latitude, longitude } = assertCoordinates(lat, lon);
    const query = `?lat=${encodeURIComponent(latitude)}&lon=${encodeURIComponent(longitude)}`;
    const data = await getJson(`/api/weather${query}`, {
        timeoutMs: options.timeoutMs ?? 15000,
        signal: options.signal
    });

    const weather = data?.weather || data;
    const current = weather?.main;
    const condition = Array.isArray(weather?.weather) ? weather.weather[0] : null;

    if (!current || !condition) {
        throw new Error('Struktur data cuaca tidak valid.');
    }

    const temp = Number(current.temp);
    const humidity = Number(current.humidity);
    const pressure = Number(current.pressure);
    const weatherId = Number(condition.id);

    if (![temp, humidity, pressure, weatherId].every(Number.isFinite)) {
        throw new Error('Data cuaca mengandung nilai numerik yang tidak valid.');
    }

    return Object.freeze({
        raw: data,
        weather,
        temp,
        humidity,
        pressure,
        weatherId,
        mainWeather: String(condition.main || ''),
        description: String(condition.description || condition.main || '')
    });
}

export async function fetchElevation(lat, lon, options = {}) {
    const { latitude, longitude } = assertCoordinates(lat, lon);
    const data = await getJson(
        `https://api.open-meteo.com/v1/elevation?latitude=${encodeURIComponent(latitude)}&longitude=${encodeURIComponent(longitude)}`,
        { timeoutMs: options.timeoutMs ?? 10000, signal: options.signal }
    );

    const elevation = Number(Array.isArray(data?.elevation) ? data.elevation[0] : NaN);
    if (!Number.isFinite(elevation)) throw new Error('Data elevasi tidak valid.');
    return Math.round(elevation);
}

export const WeatherService = Object.freeze({ fetchWeather, fetchElevation });
