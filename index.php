<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");

// Ambil parameter koordinat dari JavaScript
$lat = isset($_GET['lat']) ? $_GET['lat'] : '';
$lon = isset($_GET['lon']) ? $_GET['lon'] : '';

if (empty($lat) || empty($lon)) {
    http_response_code(400);
    echo json_encode(["error" => "Koordinat tidak lengkap"]);
    exit;
}

// Format data palsu (mock) disesuaikan agar dibungkus ke dalam array "weather" dan "geocode" 
// sesuai kebutuhan pembacaan objek di index.html
$response_data = [
    "weather" => [
        "main" => [
            "temp" => 29.5,       // Simulasi Suhu Lokal 29.5°C
            "humidity" => 75,     // Simulasi Kelembaban 75%
            "pressure" => 1010    // Tekanan udara standar
        ],
        "weather" => [
            [
                "id" => 803,
                "main" => "Clouds",
                "description" => "berawan"
            ]
        ]
    ],
    "geocode" => [
        "address" => [
            "village" => "Kecamatan Lokal",
            "city" => "Sidoarjo/Surabaya",
            "state" => "Jawa Timur",
            "country" => "Indonesia"
        ]
    ]
];

echo json_encode($response_data);