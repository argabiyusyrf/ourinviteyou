<?php
/**
 * api.php — backend mini undangan Faisal & Detika
 * Penyimpanan: file JSON di data/undangan.json (diblokir dari web via .htaccess)
 *
 * GET  ?action=list                  -> {ok, guests, wishes}  (publik)
 * POST {action:"create", key, name}  -> tambah tamu           (admin)
 * POST {action:"delete", key, slug}  -> hapus tamu            (admin)
 * POST {action:"clear",  key}        -> kosongkan semua       (admin)
 * POST {action:"wish", slug?, n,a,g,m} -> kirim ucapan (+update status tamu bila slug dikenal) (publik)
 */
declare(strict_types=1);

const DATA_DIR  = __DIR__ . '/data';
const DATA_FILE = DATA_DIR . '/undangan.json';
const ADMIN_KEY = 'isalyaya-2026-fd';

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');

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

function toSlug(string $s): string {
    return trim((string)preg_replace('/[^a-z0-9]+/', '-', strtolower($s)), '-');
}

function cleanStr(mixed $v, int $max): string {
    return mb_substr(trim(strip_tags((string)$v)), 0, $max);
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

    case 'create': {
        if (($body['key'] ?? '') !== ADMIN_KEY) respond(['ok' => false, 'error' => 'akses ditolak'], 403);
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

    case 'delete': {
        if (($body['key'] ?? '') !== ADMIN_KEY) respond(['ok' => false, 'error' => 'akses ditolak'], 403);
        $slug = cleanStr($body['slug'] ?? '', 60);
        $d = loadData();
        $before = count($d['guests']);
        $d['guests'] = array_values(array_filter($d['guests'], fn($g) => ($g['slug'] ?? '') !== $slug));
        if (count($d['guests']) === $before) respond(['ok' => false, 'error' => 'tamu tidak ditemukan'], 404);
        saveData($d);
        respond(['ok' => true]);
    }

    case 'clear': {
        if (($body['key'] ?? '') !== ADMIN_KEY) respond(['ok' => false, 'error' => 'akses ditolak'], 403);
        saveData(emptyData());
        respond(['ok' => true]);
    }

    case 'wish': {
        $n = cleanStr($body['n'] ?? '', 60);
        $m = cleanStr($body['m'] ?? '', 500);
        $a = ($body['a'] ?? '') === 'hadir' ? 'hadir' : 'tidak';
        $g = max(1, min(20, (int)($body['g'] ?? 1)));
        $g = $a === 'hadir' ? $g : 0;
        if (mb_strlen($n) < 2 || mb_strlen($m) < 3) {
            respond(['ok' => false, 'error' => 'nama dan ucapan wajib diisi'], 422);
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

        $d['wishes'][] = [
            'slug' => $slug,
            'n' => $n, 'a' => $a, 'g' => $g,
            'm' => $m, 't' => (int)round(microtime(true) * 1000),
        ];
        if (count($d['wishes']) > 2000) {
            $d['wishes'] = array_slice($d['wishes'], -2000);
        }
        saveData($d);
        respond(['ok' => true, 'knownGuest' => $slug !== null]);
    }

    default:
        respond(['ok' => false, 'error' => 'aksi tidak dikenal'], 400);
}
