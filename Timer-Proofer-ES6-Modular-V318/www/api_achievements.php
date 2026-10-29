<?php
// api_achievements.php
require 'koneksi_database.php'; // Panggil file koneksi PDO Anda
session_start();

$userId = $_SESSION['user_id']; // Ambil ID user yang sedang login

function checkRecipeAchievements($userId, $pdo) {
    // 1. Hitung total resep yang sudah ada di database
    $stmt = $pdo->prepare("SELECT COUNT(*) FROM recipes WHERE user_id = ?");
    $stmt->execute([$userId]);
    $totalRecipes = $stmt->fetchColumn();

    // 2. Tentukan aturan Tiered Achievements
    $tiers = [
        ['id' => 'tier_1', 'threshold' => 5, 'title' => 'First Batch', 'desc' => 'Membuat 5 Resep'],
        ['id' => 'tier_2', 'threshold' => 25, 'title' => 'Artisan Baker', 'desc' => 'Membuat 25 Resep'],
        ['id' => 'tier_3', 'threshold' => 50, 'title' => 'Head Pastry Chef', 'desc' => 'Membuat 50 Resep'],
        ['id' => 'tier_4', 'threshold' => 100, 'title' => 'Master Baker', 'desc' => 'Membuat 100 Resep']
    ];

    $newUnlocked = [];

    // 3. Cek mana saja yang sudah memenuhi syarat
    foreach ($tiers as $tier) {
        if ($totalRecipes >= $tier['threshold']) {
            // 4. Cek apakah gelar ini sudah pernah diberikan sebelumnya
            $checkStmt = $pdo->prepare("SELECT id FROM user_achievements WHERE user_id = ? AND achievement_id = ?");
            $checkStmt->execute([$userId, $tier['id']]);
            
            if ($checkStmt->rowCount() === 0) {
                // Jika belum ada, masukkan ke database (Kunci agar tidak berulang)
                $insertStmt = $pdo->prepare("INSERT INTO user_achievements (user_id, achievement_id) VALUES (?, ?)");
                $insertStmt->execute([$userId, $tier['id']]);
                
                // Masukkan ke array untuk dikirim ke Frontend
                $newUnlocked[] = $tier;
            }
        }
    }

    // Kembalikan array pencapaian baru dalam format JSON untuk diproses JavaScript
    return json_encode($newUnlocked);
}

// Jalankan fungsi dan cetak sebagai JSON
header('Content-Type: application/json');
echo checkRecipeAchievements($userId, $pdo);
?>