<?php
/**
 * api.php — backend mini undangan Faisal & Detika
 * Penyimpanan: file JSON di data/ (diblokir dari web via .htaccess)
 *
 * Autentikasi admin memakai SESSION PHP: kunci rahasia hanya ada di server,
 * tidak pernah dikirim ke browser (tidak ada ADMIN_KEY di manaje.html).
 *
 * GET  ?action=list                    -> {ok, guests, wishes}          (publik)
 * GET  ?action=me                      -> {ok, admin:bool}              (publik)
 * POST {action:"login", key}           -> sesi admin dibuat             (publik, rate-limited)
 * POST {action:"logout"}               -> hapus sesi admin              (publik)
 * POST {action:"change_key", old, new} -> ubah kunci (hash tersimpan)   (admin)
 * POST {action:"create", name}         -> tambah tamu                   (admin)
 * POST {action:"create_many", names[]} -> impor tamu massal             (admin)
 * POST {action:"delete", slug}         -> hapus tamu                    (admin)
 * POST {action:"clear"}                -> kosongkan daftar tamu         (admin)
 *      (ucapan TIDAK dihapus agar buku ucapan tetap utuh)
 * POST {action:"wish", slug?, n,a,g,m} -> konfirmasi/ucapan; m opsional (publik, rate-limited)
 *      Bila slug dikenal: status tamu diperbarui & ucapan lama tamu tsb
 *      diperbarui (bukan diduplikasi) sehingga tamu bisa mengoreksi RSVP-nya.
 */
declare(strict_types=1);

const DATA_DIR  = __DIR__ . '/data';
const DATA_FILE = DATA_DIR . '/undangan.json';
const RATE_FILE = DATA_DIR . '/ratelimit.json';
const KEY_FILE  = DATA_DIR . '/key.json';
const ADMIN_KEY = 'isalyaya-2026-fd';

/* ---------- sesi ---------- */

if (PHP_SAPI !== 'cli') {
    session_name('fdundangan');
    $secure = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
        || (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https');
    session_set_cookie_params([
        'lifetime' => 0,
        'path'     => '/',
        'domain'   => '',
        'secure'   => $secure,
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
    session_start();
}

function isAdmin(): bool {
    return !empty($_SESSION['admin']);
}

/**
 * Verifikasi kunci panel.
 * Bila data/key.json ada, pakai hash di sana (kunci sudah diubah lewat panel);
 * bila belum, pakai konstanta ADMIN_KEY sebagai nilai bawaan.
 */
function verifyKey(string $k): bool {
    if ($k === '') return false;
    if (is_file(KEY_FILE)) {
        $d = json_decode((string)@file_get_contents(KEY_FILE), true);
        $hash = is_array($d) ? ($d['hash'] ?? '') : '';
        return $hash !== '' && password_verify($k, $hash);
    }
    return hash_equals(ADMIN_KEY, $k);
}

/* ---------- respons & penyimpanan ---------- */

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('Cache-Control: no-store');

function respond(array $payload, int $code = 200): void {
    http_response_code($code);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    exit;
}

function emptyData(): array {
    return ['guests' => [], 'wishes' => []];
}

function loadData(): array {
    if (!is_file(DATA_FILE)) return emptyData();
    $fp = @fopen(DATA_FILE, 'r');
    if (!$fp) respond(['ok' => false, 'error' => 'gagal membuka data'], 500);
    flock($fp, LOCK_SH);
    $raw = stream_get_contents($fp);
    flock($fp, LOCK_UN);
    fclose($fp);
    $d = json_decode($raw ?: '', true);
    if (!is_array($d)) return emptyData();
    if (!isset($d['guests']) || !is_array($d['guests'])) $d['guests'] = [];
    if (!isset($d['wishes']) || !is_array($d['wishes'])) $d['wishes'] = [];
    return $d;
}

function saveData(array $d): void {
    if (!is_dir(DATA_DIR)) @mkdir(DATA_DIR, 0755, true);
    $json = json_encode($d, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    if ($json === false) respond(['ok' => false, 'error' => 'gagal menyusun data'], 500);
    $tmp = DATA_FILE . '.tmp';
    if (@file_put_contents($tmp, $json, LOCK_EX) === false) {
        respond(['ok' => false, 'error' => 'gagal menulis data'], 500);
    }
    rename($tmp, DATA_FILE);
}

/* ---------- pembatas laju sederhana per IP (anti-spam ringan) ---------- */

function clientIp(): string {
    return (string)($_SERVER['HTTP_CF_CONNECTING_IP'] ?? $_SERVER['REMOTE_ADDR'] ?? 'unknown');
}

/** true = masih boleh lewat; false = kuota habis */
function rateLimit(string $bucket, int $max, int $windowSec): bool {
    if (!is_dir(DATA_DIR)) @mkdir(DATA_DIR, 0755, true);
    $key = hash('sha256', $bucket . '|' . clientIp());
    $now = (int)round(microtime(true) * 1000);

    $data = [];
    if (is_file(RATE_FILE)) {
        $fp = @fopen(RATE_FILE, 'r');
        if ($fp) {
            flock($fp, LOCK_SH);
            $raw = stream_get_contents($fp);
            flock($fp, LOCK_UN);
            fclose($fp);
            $d = json_decode($raw ?: '', true);
            if (is_array($d)) $data = $d;
        }
    }

    /* buang semua catatan lebih tua dari 1 jam agar berkas tetap ramping */
    foreach ($data as $k => $hits) {
        $hits = array_values(array_filter(is_array($hits) ? $hits : [], fn($t) => ($now - (int)$t) < 3600_000));
        if ($hits) $data[$k] = $hits; else unset($data[$k]);
    }

    $hits = is_array($data[$key] ?? null) ? $data[$key] : [];
    if (count($hits) >= $max) {
        @file_put_contents(RATE_FILE, json_encode($data), LOCK_EX);
        return false;
    }
    $hits[] = $now;
    $data[$key] = $hits;
    @file_put_contents(RATE_FILE, json_encode($data), LOCK_EX);
    return true;
}

/** hapus catatan laju IP ini pada satu bucket (mis. setelah login sukses) */
function rateReset(string $bucket): void {
    if (!is_file(RATE_FILE)) return;
    $key = hash('sha256', $bucket . '|' . clientIp());
    $raw = @file_get_contents(RATE_FILE);
    $data = json_decode($raw ?: '', true);
    if (!is_array($data) || !isset($data[$key])) return;
    unset($data[$key]);
    @file_put_contents(RATE_FILE, json_encode($data), LOCK_EX);
}

/* ---------- util ---------- */

function toSlug(string $s): string {
    return trim((string)preg_replace('/[^a-z0-9]+/', '-', strtolower($s)), '-');
}

function cleanStr(mixed $v, int $max): string {
    return mb_substr(trim(strip_tags((string)$v)), 0, $max);
}

function requireAdmin(): void {
    if (!isAdmin()) respond(['ok' => false, 'error' => 'akses ditolak — silakan masuk dulu'], 403);
}

/* ---------- routing ---------- */

$body = [];
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $body = json_decode(file_get_contents('php://input') ?: '', true);
    if (!is_array($body)) $body = $_POST;
}

$action = $_GET['action'] ?? ($body['action'] ?? '');

switch ($action) {

    case 'list':
        respond(['ok' => true] + loadData());

    case 'me':
        respond(['ok' => true, 'admin' => isAdmin()]);

    case 'login': {
        /* brute-force guard: maks 8 percobaan gagal per 15 menit per IP */
        if (!rateLimit('login', 8, 900)) {
            respond(['ok' => false, 'error' => 'terlalu banyak percobaan — coba lagi 15 menit lagi'], 429);
        }
        $key = (string)($body['key'] ?? '');
        if (!verifyKey($key)) {
            respond(['ok' => false, 'error' => 'kunci tidak sah'], 401);
        }
        rateReset('login');
        session_regenerate_id(true);
        $_SESSION['admin'] = true;
        respond(['ok' => true]);
    }

    case 'logout': {
        $_SESSION = [];
        if (ini_get('session.use_cookies')) {
            $p = session_get_cookie_params();
            setcookie(session_name(), '', time() - 42000, $p['path'], $p['domain'], $p['secure'], $p['httponly']);
        }
        session_destroy();
        respond(['ok' => true]);
    }

    case 'change_key': {
        requireAdmin();
        $old = (string)($body['old'] ?? '');
        $new = (string)($body['new'] ?? '');
        if (!verifyKey($old)) {
            respond(['ok' => false, 'error' => 'kunci lama tidak cocok'], 403);
        }
        if (mb_strlen($new) < 6) {
            respond(['ok' => false, 'error' => 'kunci baru minimal 6 karakter'], 422);
        }
        if (!is_dir(DATA_DIR)) @mkdir(DATA_DIR, 0755, true);
        $payload = json_encode(['hash' => password_hash($new, PASSWORD_DEFAULT)], JSON_UNESCAPED_UNICODE);
        if (@file_put_contents(KEY_FILE, $payload, LOCK_EX) === false) {
            respond(['ok' => false, 'error' => 'gagal menyimpan kunci baru'], 500);
        }
        respond(['ok' => true]);
    }

    case 'create': {
        requireAdmin();
        $name = cleanStr($body['name'] ?? '', 60);
        $slug = toSlug($name);
        if ($slug === '') respond(['ok' => false, 'error' => 'nama tidak valid'], 422);
        $d = loadData();
        foreach ($d['guests'] as $g) {
            if (($g['slug'] ?? '') === $slug) respond(['ok' => false, 'error' => 'tamu dengan nama itu sudah ada'], 409);
        }
        $guest = ['name' => $name, 'slug' => $slug, 't' => (int)round(microtime(true) * 1000), 'hadir' => null];
        $d['guests'][] = $guest;
        saveData($d);
        respond(['ok' => true, 'guest' => $guest]);
    }

    case 'create_many': {
        requireAdmin();
        $names = $body['names'] ?? null;
        if (!is_array($names)) respond(['ok' => false, 'error' => 'names harus berupa larik'], 422);
        if (count($names) > 1000) respond(['ok' => false, 'error' => 'maksimal 1000 nama sekali impor'], 422);

        $d = loadData();
        $existing = [];
        foreach ($d['guests'] as $g) $existing[$g['slug'] ?? ''] = true;

        $created = [];
        $skipped = [];
        foreach ($names as $raw) {
            $name = cleanStr($raw, 60);
            $slug = toSlug($name);
            if ($slug === '' || isset($existing[$slug])) {
                if ($slug !== '') $skipped[] = $name !== '' ? $name : $slug;
                continue;
            }
            $guest = ['name' => $name, 'slug' => $slug, 't' => (int)round(microtime(true) * 1000), 'hadir' => null];
            $d['guests'][] = $guest;
            $existing[$slug] = true;
            $created[] = $guest;
        }
        if ($created) saveData($d);
        respond(['ok' => true, 'created' => $created, 'skipped' => $skipped]);
    }

    case 'delete': {
        requireAdmin();
        $slug = cleanStr($body['slug'] ?? '', 60);
        $d = loadData();
        $before = count($d['guests']);
        $d['guests'] = array_values(array_filter($d['guests'], fn($g) => ($g['slug'] ?? '') !== $slug));
        if (count($d['guests']) === $before) respond(['ok' => false, 'error' => 'tamu tidak ditemukan'], 404);
        saveData($d);
        respond(['ok' => true]);
    }

    case 'clear': {
        requireAdmin();
        /* hanya daftar tamu yang dikosongkan; buku ucapan tetap tersimpan */
        $d = loadData();
        $d['guests'] = [];
        saveData($d);
        respond(['ok' => true]);
    }

    case 'wish': {
        /* anti-spam ringan: maks 6 kiriman per 10 menit per IP */
        if (!rateLimit('wish', 6, 600)) {
            respond(['ok' => false, 'error' => 'terlalu sering mengirim — coba beberapa menit lagi'], 429);
        }

        $n = cleanStr($body['n'] ?? '', 60);
        $m = cleanStr($body['m'] ?? '', 500); /* ucapan OPSIONAL */
        $a = ($body['a'] ?? '') === 'hadir' ? 'hadir' : 'tidak';
        $g = max(1, min(20, (int)($body['g'] ?? 1)));
        $g = $a === 'hadir' ? $g : 0;
        if (mb_strlen($n) < 2) {
            respond(['ok' => false, 'error' => 'nama wajib diisi'], 422);
        }

        $d   = loadData();
        $rawSlug = toSlug(cleanStr($body['slug'] ?? '', 60));
        $slug = null;

        if ($rawSlug !== '') {
            foreach ($d['guests'] as $i => $gst) {
                if (($gst['slug'] ?? '') === $rawSlug) {
                    $slug = $rawSlug;
                    $d['guests'][$i]['hadir'] = $a; // konfirmasi kehadiran tercatat
                    break;
                }
            }
        }

        $entry = [
            'slug' => $slug,
            'n' => $n, 'a' => $a, 'g' => $g,
            'm' => $m, 't' => (int)round(microtime(true) * 1000),
        ];

        /* tamu ber-tautan bisa MENGORESSI kiriman: perbarui entri lamanya */
        $updated = false;
        if ($slug !== null) {
            foreach ($d['wishes'] as $i => $w) {
                if (($w['slug'] ?? null) === $slug) {
                    $d['wishes'][$i] = $entry;
                    $updated = true;
                    break;
                }
            }
        }
        if (!$updated) {
            $d['wishes'][] = $entry;
        }
        if (count($d['wishes']) > 2000) {
            $d['wishes'] = array_slice($d['wishes'], -2000);
        }
        saveData($d);
        respond(['ok' => true, 'knownGuest' => $slug !== null, 'updated' => $updated]);
    }

    default:
        respond(['ok' => false, 'error' => 'aksi tidak dikenal'], 400);
}
