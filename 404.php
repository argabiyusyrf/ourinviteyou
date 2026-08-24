<?php
/**
 * 404.php — halaman tidak ditemukan dengan tema undangan.
 * Diarahkan oleh aturan terakhir .htaccess (path tak dikenal).
 */
declare(strict_types=1);
http_response_code(404);
header('Content-Type: text/html; charset=utf-8');
header('X-Robots-Tag: noindex');
?><!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>404 · Halaman Tidak Ditemukan</title>
  <meta name="robots" content="noindex" />
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      min-height: 100vh; display: grid; place-items: center;
      background: #1a0f0d radial-gradient(120% 90% at 50% 0%, rgba(158,107,77,.14) 0%, transparent 60%);
      color: #ece5d2; font-family: Georgia, 'Times New Roman', serif;
      text-align: center; padding: 24px;
    }
    .mono {
      width: 84px; height: 84px; margin: 0 auto 22px; border-radius: 50%;
      border: 1px solid rgba(158,107,77,.65); display: grid; place-items: center;
      font-style: italic; font-size: 38px; color: #c08866;
    }
    .code { font-size: clamp(3rem, 12vw, 5rem); letter-spacing: .12em; color: #c08866; line-height: 1; }
    h1 { font-weight: 500; font-size: clamp(1.15rem, 4vw, 1.5rem); margin: 18px 0 10px; color: #f3efe4; }
    p  { font-size: .95rem; line-height: 1.8; color: #b9ac97; max-width: 34ch; margin: 0 auto; }
    a {
      display: inline-block; margin-top: 30px; padding: 13px 34px; border-radius: 999px;
      background: linear-gradient(135deg, #c08866, #9e6b4d); color: #fffaf2;
      text-decoration: none; font-size: .82rem; letter-spacing: .18em; text-transform: uppercase;
      font-family: 'Segoe UI', system-ui, sans-serif; font-weight: 600;
      transition: transform .25s cubic-bezier(.16,1,.3,1), box-shadow .25s;
    }
    a:hover { transform: translateY(-2px); box-shadow: 0 14px 34px -12px rgba(192,136,102,.55); }
  </style>
</head>
<body>
  <main>
    <div class="mono" aria-hidden="true">F&amp;D</div>
    <p class="code">404</p>
    <h1>Halaman Tidak Ditemukan</h1>
    <p>Tautan yang Anda buka tidak tersedia atau sudah berubah. Mari kembali ke undangannya.</p>
    <a href="./">Buka Undangan</a>
  </main>
</body>
</html>
