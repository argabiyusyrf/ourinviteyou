# Undangan Pernikahan Digital — Faisal & Detika

Undangan pernikahan statis satu halaman (semua teks UI bahasa Indonesia) untuk **Ade Faisal Anugrah** & **Detika Aura Henza** — 11 & 13 September 2026. Tanpa framework, tanpa build step: HTML + CSS + vanilla JS + GSAP/ScrollTrigger yang di-vendor lokal, dengan backend PHP mini untuk buku tamu.

---

## Fitur

- **Sampul gerbang 3D** — foto latar hitam putih yang "robek" dua saat undangan dibuka; kartu berbingkai emas berisi monogram, nama, dan nama tamu.
- **Nama tamu dinamis** lewat tautan pribadi (`/arya`, `/ratih-dewi`) atau `?to=Nama+Tamu`.
- **Hitung mundur**, acara akad & resepsi dengan tombol peta (Google Maps) dan *Simpan Kalender*.
- **Galeri mozaik** 12 kolom × 9 baris (fallback 2 kolom ≤760px, 1 kolom ≤480px) + lightbox.
- **RSVP & Ucapan Doa** tersimpan ke server (`data/undangan.json`) via `api.php`; fallback localStorage saat server tidak aktif.
- **Panel manajemen** di `/isalyaya`: buat/hapus tautan tamu, lihat status hadir/berhalangan/belum konfirmasi, ucapan masuk, estimasi jumlah orang, ekspor JSON.
- Musik latar, tombol home, progress bar emas, animasi scroll (reveal, tilt, split-char) — semua nonaktif otomatis bila GSAP gagal dimuat atau pengguna memakai *reduced motion* (konten tetap terlihat semua).

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
| `.git/*`, `data/*`, `*.json`, `*.md`, dotfiles | **Diblokir (403)** |

Aturan ditulis tanpa `RewriteBase` agar portabel: sah di subfolder maupun webroot langsung.

Urutan aturan: blokir path bertitik → blokir `data/` → file nyata lolos → `^isalyaya/?$` sebelum catch-all → catch-all `^([^./]+)/?$` (satu segmen, tanpa titik).

## Panel Admin & API

Buka **`/isalyaya`**. Tombol aksi mengirim `key` yang harus sama dengan `ADMIN_KEY` (didefinisikan di **dua tempat**: `api.php` dan `manaje.html` — ubah keduanya bersamaan).

Endpoint `api.php`:

| Metode | Aksi | Akses |
|---|---|---|
| GET | `?action=list` | publik |
| POST | `{action:"create", name}` | admin |
| POST | `{action:"delete", slug}` | admin |
| POST | `{action:"clear"}` | admin |
| POST | `{action:"wish", slug?, n, a, g, m}` | publik |

- Ucapan yang dikirim dengan `slug` tamu terdaftar otomatis mencatat status hadir tamu tersebut.
- Tamu dari tautan pribadi mendapat nama terisi otomatis + terkunci di form RSVP.
- Bila fetch gagal: `main.js` fallback ke localStorage (`fd-wishes-v1`); panel menampilkan banner offline + daftar lokal (`fd-guests-v1`).
- Tidak ada entri palsu/palsu-benih — daftar kosong merender placeholder `.wishes__empty`.

## Kustomisasi

- **Tanggal**: hardcoded di banyak tempat — `CONFIG.dateISO` di `assets/js/main.js` (hanya countdown) plus tanggal terlihat di title/meta `index.html`, sampul, strip hero, marquee (2 span), kartu acara, dan URL Google Calendar tiap tombol "Simpan Kalender". Ubah **semuanya sekaligus**.
- **Nama, venue, alamat**: edit langsung di `index.html` (+ `CONFIG.shareText`).
- **Foto** di `assets/image/`, sudah terkompresi (sisi terpanjang ±2000px, q80, total ±3 MB). Semua foto kamera aslinya **potret** dengan EXIF orientation 8 — salinan web diregenerasi dengan `exif_transpose()`. Pengecualian `foto 2.jpeg` (latar sampul): piksel mentah diputar 90° searah jarum jam lalu dibalik vertikal secara manual (pilihan eksplisit, bukan arah EXIF), tampil B&W `object-fit: cover`. Original resolusi penuh ada di `/home/argabiyusyrf/foto-asli-undangan/` (di luar webroot — jangan di-deploy).
- **Palet warna**: tema batik cokelat-maroon via CSS variables (`--bg-0`, `--gold`, `--gold-bright`, …) — jangan hardcode hex baru.

## Deploy

Via skrip pendamping `/var/www/html/deploy.py` (FTP ke InfinityFree, dijalankan dari `/var/www/html`). Folder `undangan` belum terdaftar di `FOLDER_DOMAIN` — deploy pertama akan menanyakan domain; konfirmasi dulu sebelum memetakan.

## Struktur

```
undangan/
├── index.html          # undangan tamu
├── manaje.html         # panel admin (akses: /isalyaya)
├── api.php             # backend mini (JSON file storage)
├── .htaccess           # routing + proteksi
├── AGENTS.md           # dokumentasi teknis lengkap (konvensi & gotcha)
├── assets/
│   ├── css/style.css   # seluruh styling + animasi ambient
│   ├── js/main.js      # logika, animasi GSAP, RSVP/wishes
│   ├── image/          # foto terkompresi
│   ├── fonts/          # woff2 self-hosted (2 preloaded)
│   └── vendor/         # GSAP + ScrollTrigger (vanilla script)
└── data/
    └── undangan.json   # tamu + ucapan (tidak bisa diakses web)
```

Detail teknis lanjutan (gate animasi, aturan transform, urutan routing, dsb.): lihat **AGENTS.md**.
