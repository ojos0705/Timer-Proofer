/**
 * [AI-GENERATED][SECURITY][V217] Build proofing advice from untrusted sensor readings.
 * The returned values are plain text; callers must escape them before HTML rendering.
 */
function toFiniteNumber(value) {
    if (typeof value === 'number') return Number.isFinite(value) ? value : null;
    if (typeof value !== 'string' || value.trim() === '') return null;

    const parsed = Number(value.trim());
    return Number.isFinite(parsed) ? parsed : null;
}

function normalizeTemperature(value) {
    const parsed = toFiniteNumber(value);
    // Reject impossible/faulty readings rather than presenting misleading guidance.
    return parsed !== null && parsed >= -80 && parsed <= 100 ? parsed : null;
}

function normalizeHumidity(value) {
    const parsed = toFiniteNumber(value);
    return parsed !== null && parsed >= 0 && parsed <= 100 ? parsed : null;
}

export function buildProofingInsight(temp, humidity) {
    const temperature = normalizeTemperature(temp);
    const relativeHumidity = normalizeHumidity(humidity);

    if (temperature === null) {
        return {
            insight: 'Data suhu belum valid atau belum tersedia.',
            action: 'Pastikan sensor atau layanan cuaca mengirim angka suhu yang valid dalam °C.',
            recommendation: '🔎 Periksa sensor, lalu perbarui pembacaan suhu sebelum mengandalkan rekomendasi otomatis.'
        };
    }

    let insight;
    let action;
    let recommendation;

    if (temperature < 22) {
        insight = `Suhu ${temperature}°C tergolong dingin. Ragi akan bekerja lambat.`;
        action = 'Adonan membutuhkan waktu lebih lama untuk mengembang dengan baik.';
        recommendation = '💡 Rekomendasi: Gunakan air hangat untuk melarutkan ragi.';
    } else if (temperature <= 28) {
        insight = `Suhu ${temperature}°C adalah suhu ideal untuk proofing adonan donat.`;
        action = 'Kondisi sangat stabil untuk fermentasi ragi.';
        recommendation = '\n✅ Kondisi sempurna, ikuti durasi standar proofing.';
    } else {
        const humidityDescription = relativeHumidity === null
            ? 'Pantau permukaan adonan agar tidak mengering atau membentuk kulit tebal.'
            : `Kelembaban ${relativeHumidity}% perlu diperhatikan agar permukaan adonan tidak mengering atau membentuk kulit tebal.`;
        insight = `Suhu ${temperature}°C cukup panas. Ragi akan bekerja sangat cepat. ${humidityDescription}`;
        action = `Risiko over-proofing sangat tinggi jika tidak dipantau.${relativeHumidity === null ? '' : ` Karena kelembapan ${relativeHumidity}%,`} sangat disarankan untuk menutup adonan dengan kain lembap atau plastik (plastic wrap) agar bagian atas adonan tidak mengalami crusting (pengerasan kulit) yang bisa menyebabkan permukaan donat pecah saat digoreng.`;
        recommendation = '⚠️ Rekomendasi: Awasi dengan ketat setiap 15 menit, jangan sampai adonan terlalu mengembang.';
    }

    if (relativeHumidity !== null && relativeHumidity > 70) {
        insight += ' Kelembaban tinggi dapat membuat adonan lengket.';
        action += ' Taburi sedikit tepung saat membentuk adonan untuk mencegah lengket.';
        recommendation += '\n💡 Rekomendasi: Taburi sedikit tepung saat membentuk donat.';
    }

    return { insight, action, recommendation };
}
