// [AI-GENERATED][REFACTOR] ES6 feature module: Bluetooth Health Thermometer.
// Existing DOM IDs, button contracts, and window compatibility names are preserved.
import { bindReplaceableClick } from './core/dom-events.js';

const koneksiGATT = {
    utama: null,
    ruang: null,
    adonan: null
};

// Fungsi membuka modal
function KoneksiBluetoothModal() {
    if (typeof window.toggleModal === 'function') {
        return window.toggleModal('modal-koneksi-sensor');
    }
    return false;
}
window.KoneksiBluetoothModal = KoneksiBluetoothModal; // Compatibility export untuk action delegation.

// 1. FUNGSI UTAMA MENYAMBUNGKAN BLUETOOTH & PROFIL GATT
async function connectHealthThermometer(idPerangkat) {
    if (!navigator.bluetooth) {
        alert("Browser Anda belum mendukung Web Bluetooth API.");
        return;
    }

    updateUIBluetoothLoading(idPerangkat);

    try {
        const device = await navigator.bluetooth.requestDevice({
            filters: [
                { services: ['health_thermometer'] } 
            ],
            optionalServices: ['battery_service', 'device_information']
        });

        const server = await device.gatt.connect();
        koneksiGATT[idPerangkat] = device;
        
        device.addEventListener('gattserverdisconnected', () => handlerSensorTerputus(idPerangkat));

        const service = await server.getPrimaryService('health_thermometer');
        const characteristic = await service.getCharacteristic('temperature_measurement');

        await characteristic.startNotifications();
        characteristic.addEventListener('characteristicvaluechanged', (event) => {
            const dataBiner = event.target.value;
            const suhuCelcius = parseHealthThermometerData(dataBiner);
            
            if (suhuCelcius !== null) {
                updateUIRealtimeSuhu(idPerangkat, suhuCelcius);
            }
        });

        updateUIBluetoothConnected(idPerangkat, device.name || "Termometer BLE");

    } catch (error) {
        if (error.name === 'NotFoundError') {
            console.log("Pencarian dibatalkan oleh pengguna.");
        } else {
            console.warn("Bluetooth Error:", error);
        }
        handlerSensorTerputus(idPerangkat);
    }
}
window.connectHealthThermometer = connectHealthThermometer; // Compatibility export untuk action delegation.
// Compatibility alias dipertahankan untuk nama action legacy yang masih mungkin dipanggil dari UI.
window.connectBluetoothThermometer = connectHealthThermometer;

// Fungsi Parsing Data Biner Spesifik Health Thermometer (IEEE-11073 Float)
function parseHealthThermometerData(dataView) {
    try {
        // Byte pertama adalah flags (menentukan unit Celsius/Fahrenheit dan format data)
        const flags = dataView.getUint8(0);
        const unitFahrenheit = (flags & 0x01) !== 0; // Bit 0: 0 = Celsius, 1 = Fahrenheit

        // Pembacaan nilai float 32-bit pada byte ke-1
        if (!dataView || dataView.byteLength < 5) {
            throw new RangeError('Payload Health Thermometer terlalu pendek.');
        }

        // [AI-GENERATED][BUG FIX] Health Thermometer Measurement memakai IEEE-11073 FLOAT,
        // bukan IEEE-754 Float32 JavaScript. Mantissa = signed 24-bit, exponent = signed 8-bit.
        let mantissa = dataView.getUint8(1)
            | (dataView.getUint8(2) << 8)
            | (dataView.getUint8(3) << 16);
        if (mantissa & 0x800000) mantissa -= 0x1000000;

        const exponent = dataView.getInt8(4);
        let tempValue = mantissa * Math.pow(10, exponent);

        if (unitFahrenheit) {
            // Konversi Fahrenheit ke Celsius jika perangkat mengirim format F.
            tempValue = (tempValue - 32) * 5 / 9;
        }

        if (!Number.isFinite(tempValue)) return null;
        return Number(tempValue.toFixed(1));
    } catch (e) {
        console.error("Gagal melakukan parsing biner sensor:", e);
        return null;
    }
}



// --- FUNGSI UPDATE UI DINAMIS & REAL-TIME ---

function updateUIRealtimeSuhu(id, suhu) {
    if (id === 'utama') {
        const status = document.getElementById('ble-status-utama');
        if (status) {
            status.innerText = `Status: Terhubung • ${suhu}°C`;
            status.style.color = "#27ae60";
        }
    } else {
        const status = document.getElementById(`status-text-${id}`);
        if (status) {
            status.innerText = `Terhubung • ${suhu}°C`;
            status.style.color = "#27ae60";
        }
    }
}

function updateUIBluetoothLoading(id) {
    if (id === 'utama') {
        const btn = document.getElementById('btn-ble');
        const status = document.getElementById('ble-status-utama');
        if (btn) {
            btn.innerText = "Mencari Perangkat...";
            btn.style.opacity = "0.7";
            btn.disabled = true;
        }
        if (status) status.innerText = "Status: Memindai sinyal...";
    } else {
        const btn = document.getElementById(`btn-${id}`);
        if (btn) {
            btn.innerText = "Mencari...";
            btn.disabled = true;
        }
    }
}

function updateUIBluetoothConnected(id, namaDevice) {
    if (id === 'utama') {
        const btn = document.getElementById('btn-ble');
        const icon = document.getElementById('ble-main-icon');
        const status = document.getElementById('ble-status-utama');
        
        if (btn) {
            btn.innerText = "Putuskan Koneksi";
            btn.style.background = "#ef4444";
            btn.style.opacity = "1";
            btn.disabled = false;
            bindReplaceableClick(btn, () => window.putuskanSensorBluetooth?.('utama'));
        }
        if (icon) icon.innerHTML = "🔗";
        if (status) {
            status.innerText = `Status: Terhubung ke ${namaDevice}`;
            status.style.color = "#27ae60";
        }
    } else {
        const btn = document.getElementById(`btn-${id}`);
        const card = document.getElementById(`card-sensor-${id}`);
        const dot = document.getElementById(`dot-${id}`);
        const status = document.getElementById(`status-text-${id}`);
        
        if (btn) {
            btn.innerText = "Putus";
            btn.style.background = "#fee2e2";
            btn.style.color = "#ef4444";
            btn.disabled = false;
            bindReplaceableClick(btn, () => window.putuskanSensorBluetooth?.(id));
        }
        if (card) {
            card.style.border = "1px solid #27ae60";
            card.style.opacity = "1";
            card.style.boxShadow = "0 1px 3px rgba(39, 174, 96, 0.1)";
        }
        if (dot) {
            dot.innerText = "🟢";
            dot.style.animation = "pulse 2s infinite";
        }
        if (status) {
            status.innerText = "Terhubung • Menunggu data...";
            status.style.color = "#27ae60";
        }
    }
}

function handlerSensorTerputus(id) {
    koneksiGATT[id] = null;

    if (id === 'utama') {
        const btn = document.getElementById('btn-ble');
        const icon = document.getElementById('ble-main-icon');
        const status = document.getElementById('ble-status-utama');
        
        if (btn) {
            btn.innerText = "Hubungkan Termometer BLE";
            btn.style.background = "#27ae60";
            btn.disabled = false;
            bindReplaceableClick(btn, () => connectHealthThermometer('utama'));
        }
        if (icon) icon.innerHTML = "📶";
        if (status) {
            status.innerText = "Status: Belum Terhubung";
            status.style.color = "#64748b";
        }
    } else {
        const btn = document.getElementById(`btn-${id}`);
        const card = document.getElementById(`card-sensor-${id}`);
        const dot = document.getElementById(`dot-${id}`);
        const status = document.getElementById(`status-text-${id}`);
        
        if (btn) {
            btn.innerText = "Pindai";
            btn.style.background = "var(--accent)";
            btn.style.color = "#fff";
            btn.disabled = false;
            bindReplaceableClick(btn, () => connectHealthThermometer(id));
        }
        if (card) {
            card.style.border = "1px solid #e2e8f0";
            card.style.opacity = "0.8";
            card.style.boxShadow = "none";
        }
        if (dot) {
            dot.innerText = "⚫";
            dot.style.animation = "none";
        }
        if (status) {
            status.innerText = "Terputus";
            status.style.color = "#94a3b8";
        }
    }
}


// [AI-GENERATED][REFACTOR] Named exports make the feature independently testable.
export { KoneksiBluetoothModal, connectHealthThermometer, parseHealthThermometerData, updateUIRealtimeSuhu, updateUIBluetoothLoading, updateUIBluetoothConnected, handlerSensorTerputus };
