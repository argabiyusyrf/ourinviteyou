# Undangan Pernikahan Digital — Faisal & Detika

Undangan pernikahan statis satu halaman (semua teks UI bahasa Indonesia) untuk **Ade Faisal Anugrah** & **Detika Aura Henza** — 11 & 13 September 2026. Tanpa framework, tanpa build step: HTML + CSS + vanilla JS + GSAP/ScrollTrigger yang di-vendor lokal, dengan backend PHP mini untuk buku tamu.

---

## Fitur

- **Sampul gerbang 3D** — foto latar hitam putih yang "robek" dua saat undangan dibuka; kartu berbingkai emas berisi monogram, nama, dan nama tamu.
- **Nama tamu dinamis** lewat tautan pribadi (`/arya`, `/ratih-dewi`) atau `?to=Nama+Tamu`.
- **Hitung mundur**, acara akad & resepsi dengan tombol peta (Google Maps) dan *Simpan Kalender*.
- **Galeri mozaik** 12 kolom × 9 baris (fallback 2 kolom ≤760px, 1 kolom ≤480px) + lightbox.
- **RSVP & Ucapan Doa** tersimpan ke server (`data/undangan.json`) via `api.php`; ucapan opsional (cukup konfirmasi hadir); fallback localStorage saat server tidak aktif; daftar bertahap dengan tombol "muat lagi".
- **Panel manajemen** di `/isalyaya`: **login berbasis sesi PHP** (kunci hanya di server), buat tautan tunggal maupun **impor massal** (satu baris satu nama), baca isi ucapan, status hadir/berhalangan/belum konfirmasi, estimasi jumlah orang, **ekspor CSV tamu & ucapan** + JSON.
- Musik latar, tombol home, progress bar emas, animasi scroll (reveal, tilt, split-char) — semua nonaktif otomatis bila GSAP gagal dimuat atau pengguna memakai *reduced motion* (konten tetap terlihat semua).
- Lightbox mendukung swipe di layar sentuh (usap kiri/kanan navigasi, usap ke bawah menutup); nomor rekening & alamat kado bisa diketuk untuk disalin; countdown berganti judul "Hari Bahagia Telah Tiba" setelah lewat; halaman 404 ber-branding; rate limit ringan anti-spam per IP.

## Menjalankan Lokal

Butuh Apache + PHP 8.x (mod_php aktif).

```
DocumentRoot → /var/www/html
URL → http://localhost/undangan
```

Folder `data/` harus **writable oleh user Apache** (`www-data`). Secara lokal dibuat dengan `chmod 777` karena webroot milik user; di InfinityFree default sudah writable.

Server statis apa pun juga bisa, tapi RSVP/ucapan akan jatuh ke mode offline (localStorage saja).

## Routing (.htaccess)

| URL | Hasil |
|---|---|
| `/undangan/isalyaya` | Panel manajemen (`manaje.html`) |
| `/undangan/arya` | Undangan dengan nama "Arya" (dash/garis bawah → spasi, kapital otomatis) |
| File/folder nyata | Dilayani normal |
| Path lain (mis. `/foo/bar`) | `404.php` — halaman 404 ber-branding (status 404) |
| `.git/*`, `data/*`, `*.json`, `*.md`, dotfiles | **Diblokir (403)** |

Aturan ditulis tanpa `RewriteBase` agar portabel: sah di subfolder maupun webroot langsung.

Urutan aturan: blokir path bertitik → blokir `data/` → file nyata lolos → `^isalyaya/?$` sebelum catch-all → catch-all `^([^./]+)/?$` (satu segmen, tanpa titik) → sisanya ke `404.php`.

## Panel Admin & API

Buka **`/isalyaya`**. Panel memakai **login sesi PHP**: kunci (`ADMIN_KEY`, hanya ada di `api.php`) dikirim sekali saat masuk, diverifikasi server, lalu sesi cookie `HttpOnly`/`SameSite=Lax` yang mengatur akses admin. Ganti kunci dengan mengedit `api.php` saja. Percobaan login dibatasi 8 kali per 15 menit per IP.

Endpoint `api.php`:

| Metode | Aksi | Akses |
|---|---|---|
| GET | `?action=list` | publik |
| GET | `?action=me` | publik (status sesi admin) |
| POST | `{action:"login", key}` | publik, rate-limited |
| POST | `{action:"logout"}` | publik |
| POST | `{action:"create", name}` | admin |
| POST | `{action:"create_many", names[]}` | admin (maks 1000 nama) |
| POST | `{action:"delete", slug}` | admin |
| POST | `{action:"clear"}` | admin (hanya daftar tamu; ucapan tetap) |
| POST | `{action:"wish", slug?, n, a, g, m?}` | publik, rate-limited (6×/10 menit/IP) |

- Ucapan **opsional** — tamu bisa konfirmasi hadir tanpa menulis apa pun.
- Kiriman dengan `slug` tamu terdaftar mencatat status hadir **dan memperbarui ucapan lama tamu tersebut** (bukan diduplikasi), sehingga tamu dapat mengoreksi RSVP-nya.
- Bila fetch gagal: `main.js` fallback ke localStorage (`fd-wishes-v1`); panel menampilkan banner offline + daftar lokal (`fd-guests-v1`).
- Tidak ada entri palsu/palsu-benih — daftar kosong merender placeholder `.wishes__empty`.

## Kustomisasi

- **Preview WhatsApp/OG**: tag OG + Twitter Card di `index.html` memakai **domain produksi absolut** (`ourinviteyou.likesyou.org`, lihat `CNAME`) dan gambar khusus `assets/image/og-cover.jpg` (1200×630). Jika domain berubah, perbarui seluruh blok meta tersebut.
- **Tanggal**: hardcoded di banyak tempat — `CONFIG.dateISO` di `assets/js/main.js` (hanya countdown) plus tanggal terlihat di title/meta `index.html`, sampul, strip hero, marquee (2 span), kartu acara, dan URL Google Calendar tiap tombol "Simpan Kalender". Ubah **semuanya sekaligus**.
- **Nama, venue, alamat**: edit langsung di `index.html` (+ `CONFIG.shareText`).
- **Foto** di `assets/image/`, sudah terkompresi (sisi terpanjang ±2000px, q80, total ±3 MB). Semua foto kamera aslinya **potret** dengan EXIF orientation 8 — salinan web diregenerasi dengan `exif_transpose()`. Pengecualian `foto 2.jpeg` (latar sampul): piksel mentah diputar 90° searah jarum jam lalu dibalik vertikal secara manual (pilihan eksplisit, bukan arah EXIF), tampil B&W `object-fit: cover`. Original resolusi penuh ada di `/home/argabiyusyrf/foto-asli-undangan/` (di luar webroot — jangan di-deploy).
- **Palet warna**: tema batik cokelat-maroon via CSS variables (`--bg-0`, `--gold`, `--gold-bright`, …) — jangan hardcode hex baru.

## Deploy

Via skrip pendamping `/var/www/html/deploy.py` (FTP ke InfinityFree, dijalankan dari `/var/www/html`). Folder `undangan` belum terdaftar di `FOLDER_DOMAIN` — deploy pertama akan menanyakan domain; konfirmasi dulu sebelum memetakan.

## Struktur

```
undangan/
├── index.html          # undangan tamu (+ meta OG/WA)
├── manaje.html         # panel admin, login sesi (akses: /isalyaya)
├── api.php             # backend mini (JSON file storage + session + rate limit)
├── 404.php             # halaman 404 ber-branding
├── .htaccess           # routing + proteksi
├── AGENTS.md           # dokumentasi teknis lengkap (konvensi & gotcha)
├── assets/
│   ├── css/style.css   # seluruh styling + animasi ambient
│   ├── js/main.js      # logika, animasi GSAP, RSVP/wishes
│   ├── image/          # foto terkompresi (+ og-cover.jpg utk preview WA)
│   ├── fonts/          # woff2 self-hosted (2 preloaded)
│   └── vendor/         # GSAP + ScrollTrigger (vanilla script)
└── data/
    ├── undangan.json   # tamu + ucapan (tidak bisa diakses web)
    └── ratelimit.json  # catatan laju per IP (dibuat otomatis)
```

Detail teknis lanjutan (gate animasi, aturan transform, urutan routing, dsb.): lihat **AGENTS.md**.
