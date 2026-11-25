# eduTech CBT — Platform Ujian Bahasa Jepang

Platform ujian CBT (Next.js 16, React 19, Prisma, Tailwind 4) bergaya ujian sertifikasi Jepang:
header dengan nomor soal, seksi, sisa waktu & tombol **終了**, daftar nomor soal di kiri,
soal dengan **furigana**, pilihan **ア／イ／ウ／エ**, tombol **フラグ**, **戻る／次へ**, dan halaman hasil.

## Cara menjalankan

Butuh **Node.js 20 atau lebih baru** (cek: `node -v`). Kalau belum ada, install dari https://nodejs.org (versi LTS).

```bash
cd ~/Documents/eduTech-Japan
npm install
npm run dev
```

Buka http://localhost:3000 → klik **受験開始**.

Login peserta (contoh): username `peserta1`, password `peserta123`. Peserta baru dibuat di admin → **Peserta**.

Halaman admin: http://localhost:3000/admin (password default lokal: `admin123`).
Untuk mengganti password, salin `.env.example` menjadi `.env.local` lalu ubah `ADMIN_PASSWORD`, kemudian restart `npm run dev`.
Di produksi (`NODE_ENV=production`) `ADMIN_PASSWORD` **wajib** diisi; tanpa itu login admin ditolak.

Build produksi:

```bash
npm run build
npm start
```

## Produksi & keamanan

- Set `ADMIN_PASSWORD` (kuat & unik) dan `DATABASE_URL` di environment server. Ganti/hapus akun contoh `peserta1`.
- Gunakan HTTPS: cookie sesi otomatis `Secure` + `HttpOnly` + `SameSite=Lax` di produksi, dan header keamanan
  (HSTS, `X-Frame-Options`, `nosniff`, dll.) diatur di `next.config.ts`.
- Login admin & peserta dibatasi 8 percobaan per 10 menit per IP (`lib/rateLimit.ts`, in-memory — untuk
  beberapa instance server pindahkan ke Redis/DB).
- Pakai PostgreSQL (lihat bagian Database) untuk deployment online; SQLite hanya untuk lokal/satu server.
- CI GitHub Actions (`.github/workflows/ci.yml`) menjalankan typecheck dan build di setiap push/PR.

## Fitur

- Timer hitung mundur (merah saat < 5 menit), auto-submit saat waktu habis
- Pilih jawaban (klik lagi untuk membatalkan), flag soal untuk ditinjau
- Navigasi lewat nomor soal, tombol 戻る/次へ, atau keyboard (← →, 1–4, F)
- Status nomor soal: hijau = belum dijawab, hijau tua = sudah dijawab, ikon bendera = di-flag
- Progres tersimpan di `localStorage` — refresh halaman tidak menghilangkan jawaban & waktu
- Pengaturan ⚙: ukuran huruf (標準/大/特大) dan tampil/sembunyikan furigana
- Halaman hasil: lulus/tidak (合格/不合格), skor, jumlah benar, waktu, pembahasan per soal

## Peserta & alur ujian

- Peserta harus login (`/login`). Akun dibuat admin di menu **Peserta** (tambah, reset password, nonaktifkan, hapus).
- Durasi diatur per ujian di admin. Timer mulai saat peserta menekan **開始する**.
- Waktu dihitung dari **deadline di server**: refresh, koneksi putus, atau tutup browser tidak menghentikan waktu.
  Selama belum submit dan waktu belum habis, peserta bisa login lagi dan **melanjutkan** dari soal & jawaban terakhir.
- Setiap jawaban/flag langsung disimpan ke server.
- Waktu habis → jawaban otomatis dikumpulkan dan dikunci (server menolak perubahan setelah deadline).
- **Urutan soal diacak per peserta** (bisa dimatikan per ujian di admin). Urutan disimpan, jadi tetap sama saat refresh. Nomor 問題1, 問題2, … dibuat otomatis sesuai urutan tampil.
- Setiap ujian hanya bisa dikerjakan satu kali. Admin bisa **Reset** percobaan di halaman **Lihat hasil peserta**.
- Kunci jawaban tidak dikirim ke browser selama ujian berlangsung.
- Layar ujian & hasil: teks tidak bisa diseleksi/di-copy, klik kanan & Ctrl/Cmd+C/V/A/P diblok.
  (Ini pencegahan dasar; screenshot atau foto layar tetap tidak bisa dicegah dari browser.)

## Backoffice / Admin (`/admin`)

- Login dengan password admin
- Buat, edit, hapus ujian (judul, level, deskripsi, durasi, nilai lulus)
- Tambah, edit, hapus, dan urutkan soal, dengan **preview langsung** seperti tampilan peserta (furigana ikut tampil)
- **Upload CSV**: preview dulu sebelum import, baris yang salah ditandai beserta alasannya, pilih "tambahkan" atau "ganti semua"
- **Download template CSV** dan **Export CSV** soal yang sudah ada
- Menu **Hasil**: hasil semua peserta di semua ujian, filter (ujian, status, nama), detail jawaban per peserta, reset, dan Export CSV

## Database

Data (ujian, soal, pilihan, peserta, sesi login, percobaan & jawaban) disimpan di database lewat **Prisma**.
Default-nya **SQLite** — satu file `prisma/dev.db`, tidak perlu install server database.

- `npm run dev` otomatis menerapkan migrasi (membuat/memperbarui tabel).
- Saat database masih kosong, otomatis diisi soal contoh (`data/seed.ts`) dan akun `peserta1`.
  Jika ada `storage/db.json` dari versi sebelumnya, isinya dipindahkan ke database sekali (file diganti nama jadi `db.json.imported`).
- `npm run db:studio` → buka Prisma Studio di browser untuk melihat/mengedit isi tabel.
- `npm run db:reset` → hapus semua data dan mulai dari awal.
- Skema tabel: `prisma/schema.prisma`. Semua query ada di `lib/db.ts`.

**Pindah ke PostgreSQL / Supabase** (untuk server online):
1. Di `prisma/schema.prisma` ganti `provider = "sqlite"` menjadi `provider = "postgresql"`
2. Di `.env` isi `DATABASE_URL` dengan connection string PostgreSQL
3. Hapus folder `prisma/migrations`, lalu jalankan `npx prisma migrate dev --name init`

### Format CSV

```
section,question,choice_a,choice_b,choice_c,choice_d,answer,explanation
{品質|ひんしつ}{管理|かんり},"{問題|もんだい}1：PDCAの「D」はどれか。",{計画|けいかく},{実行|じっこう},{評価|ひょうか},{改善|かいぜん},イ,
```

- `choice_a`–`choice_d` = ア, イ, ウ, エ
- `answer`: ア/イ/ウ/エ, A–D, atau 1–4
- `explanation` opsional
- Simpan dari Excel sebagai **CSV UTF-8** agar huruf Jepang tidak rusak

## Struktur

```
app/
  page.tsx                  # daftar ujian
  exam/[id]/page.tsx        # layar ujian
  exam/[id]/result/page.tsx # hasil
app/admin/                  # backoffice (login, ujian, soal, import CSV)
components/
  ExamRunner.tsx            # seluruh UI & logika ujian
  admin/                    # form ujian/soal, import CSV
  ResultView.tsx            # tampilan hasil
  Ruby.tsx                  # render furigana
data/seed.ts                # soal contoh awal
prisma/schema.prisma        # skema tabel database
prisma/migrations/          # migrasi database
lib/db.ts                   # semua query database
lib/csv.ts, lib/validate.ts # parser & validasi CSV/soal
lib/                        # tipe, parser furigana, auth, format waktu
```

## Menambah soal

Paling mudah lewat `/admin`. Furigana ditulis dengan format `{漢字|かんじ}`.

## Langkah berikutnya (saran)

- Deploy online dengan PostgreSQL/Supabase
- Login peserta & akun admin multi-user
- Acak urutan soal/pilihan, beberapa seksi per ujian, soal bergambar/audio

## Paket latihan, simulasi & laporan trainer

- Halaman depan mengelompokkan paket per level (satu "folder" per level). Tiap paket punya dua mode:
  - **Latihan** (`/practice/[id]`): tanpa batas waktu, setelah memilih jawaban langsung tampil benar/salah,
    kunci, dan pembahasan (bahasa Jepang dengan furigana + bahasa Indonesia). Bisa diulang.
  - **Simulasi Ujian** (`/exam/[id]`): seperti ujian asli, ada waktu, hanya 1 kali (admin bisa reset).
- Setiap hasil latihan/simulasi tersimpan di tabel `ResultLog` (tetap ada walau percobaan di-reset).
- **Laporan untuk trainer** (`/report/[id]`): identitas, nilai, 合格/不合格 (batas lulus per paket, default 60),
  % pemahaman per materi, lalu setiap soal dengan jawaban peserta, kunci, dan pembahasan. Tombol
  "Cetak / Simpan PDF" untuk dikirim ke trainer.
- **Perkembangan**: peserta di `/progress`, trainer di Admin → **Perkembangan** (semua peserta) dan
  Admin → Peserta → **Perkembangan** (detail per peserta: % per materi dari hasil ke hasil).
- Materi (seksi) soal dipakai sebagai topik penilaian, mis. `{作業管理|さぎょうかんり}`.
- Pembahasan: teks Jepang, lalu baris `[ID]`, lalu teks Indonesia.

### Import paket soal

Soal paket disimpan di `data/business-career/*.json` (tidak ikut di-commit karena berisi materi pihak ketiga).

```bash
node scripts/import-business-career.mjs            # tambah paket baru
node scripts/import-business-career.mjs --replace  # perbarui isi soal, riwayat peserta tetap
```

Setelah menarik versi baru, jalankan `npx prisma migrate deploy` (otomatis lewat `npm run dev`).
