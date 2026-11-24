# eduTech CBT — Web App Ujian (Next.js)

Kerangka awal platform ujian CBT bergaya ujian sertifikasi Jepang:
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

Build produksi:

```bash
npm run build
npm start
```

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
