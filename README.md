# SOLEFUL SOAKS! SHOES CARE — PANDUAN PENGEMBANGAN & PENGGUNAAN LOKAL

Aplikasi web terpadu untuk **Soleful Soaks! Shoes Care** yang mencakup:
1. **Website Publik Pelanggan:** Informasi katalog layanan & harga, pelacakan status pesanan real-time, pengumuman toko, dan kontak WhatsApp CS.
2. **Dashboard Internal Pegawai/Admin:** Pencatatan pesanan dengan kalkulasi estimasi otomatis berbasis antrean/kapasitas, konfirmasi pembayaran kasir di tempat, pembuat kolase 2×2 dokumentasi foto di browser, kalender jadwal pengerjaan, manajemen stok item add-on, hingga laporan keuangan transparan.

---

## 1. Menjalankan Aplikasi di Komputer Lokal

### Langkah 1: Buka Terminal di Folder Proyek
Pastikan Node.js LTS sudah terpasang.

### Langkah 2: Buat File Lingkungan Lokal
Salin file `.env.example` menjadi `.env.local`:
```powershell
Copy-Item .env.example .env.local
```
Secara default, `VITE_DATA_MODE=local` akan aktif (mode demo lokal aman dengan penyimpanan localStorage & IndexedDB).

### Langkah 3: Jalankan Development Server
```powershell
npm run dev
```
Buka browser di URL: [http://localhost:5173](http://localhost:5173).

---

## 2. Alur Penggunaan Pertama Kali

### A. Inisialisasi Akun Admin
1. Buka [http://localhost:5173/admin/login](http://localhost:5173/admin/login).
2. Sistem otomatis mengenali bahwa belum ada akun terdaftar dan menampilkan form **Inisialisasi Akun Admin**.
3. Masukkan nama lengkap, email, dan kata sandi (minimal 8 karakter).
4. Klik **Buat Akun Administrator**. Anda akan langsung masuk ke Dashboard.

### B. Input Pesanan Pertama di Toko
1. Buka menu **Pesanan & Antrean** -> Klik **➕ Catat Pesanan Baru**.
2. Masukkan data pelanggan (Nama & No. WhatsApp).
3. Pilih layanan (misal: *Basic Clean*).
4. Perhatikan box **Estimasi Selesai**: Sistem otomatis menghitung target tanggal selesai berdasarkan antrean aktif, kapasitas harian (default: 20 unit), jam operasional, dan hari libur.
5. Konfirmasi pembayaran tunai atau QRIS.
6. Klik **Catat & Simpan**.
7. Buka detail pesanan untuk menguji pembuat kolase: pilih 4 foto dari komputer, sistem canvas browser akan menggabungkannya menjadi satu file kolase 2×2 berlabel.

### C. Pengujian Pelacakan Publik (Sisi Pelanggan)
1. Salin kode pesanan unik (contoh: `SS-XXXXX-XXXXX`).
2. Buka menu publik **Cek Pesanan** ([http://localhost:5173/cek-pesanan](http://localhost:5173/cek-pesanan)).
3. Masukkan kode tersebut.
4. Data pesanan, estimasi, rincian biaya, riwayat status, dan foto kolase akan tampil tanpa membocorkan nomor HP atau catatan rahasia internal toko.

---

## 3. Fitur Utama yang Telah Berfungsi Penuh

| Fitur | Deskripsi | Status |
|---|---|:---:|
| **Katalog & Snapshot Harga** | Perubahan harga di katalog tidak merusak transaksi lama karena pesanan menggunakan snapshot. | ✅ Siap |
| **Kalkulasi Estimasi Antrean** | Menghitung antrean aktif dengan bobot layanan (Heavy Clean > Basic Clean), hari libur mingguan, dan menolak klaim palsu jika antrean penuh. | ✅ Siap |
| **Kolase 2×2 Otomatis** | Mengompres 4 foto di browser dan menggabungkannya menjadi 1 gambar kolase 2×2 dengan label sebelum/sesudah. | ✅ Siap |
| **Retensi Foto 6 Bulan** | Fitur pembersihan berkala dengan simulasi (dry run) dan eksekusi aman yang menjaga riwayat transaksi. | ✅ Siap |
| **Pelacakan Anti-Tebak** | Kode 10 karakter dengan entropi tinggi (~49.5 bits), rate-limiting percobaan tebak, dan opsi verifikasi 4-digit WA. | ✅ Siap |
| **Laporan Akuntansi Terbuka** | Memisahkan omzet riil (hanya dari pesanan lunas) dan piutang kasir yang belum lunas. | ✅ Siap |
| **Pengaturan Tanpa Ubah Kode** | Kapasitas antrean, jam buka, hari libur, nomor WA CS, dan disclaimer harga dapat diatur dari UI. | ✅ Siap |

---

## 4. Pengujian Otomatis (Unit & Integration Tests)

Jalankan test suite vitest untuk memverifikasi seluruh aturan bisnis:
```powershell
npm run test
```
Terdapat 29 test case otomatis yang menguji perhitungan hari kerja, libur nasional, beban layanan, keamanan autentikasi PBKDF2, aturan retensi foto, dan snapshot transaksi.

---

## 5. Rencana Hosting Frontend & Migrasi Cloud (Nanti)

Ketika pemilik proyek sudah siap untuk go-online:
1. **Frontend Hosting:** Cloudflare Pages (Gratis & Cepat). Cukup hubungkan repository GitHub, build command: `npm run build`, output directory: `dist`. File `public/_redirects` sudah disiapkan untuk SPA routing.
2. **Database & Auth:** Supabase Cloud (Paket Gratis). Jalankan migrasi SQL dari file `supabase/migrations/0001_init.sql`.
3. **Penyimpanan Foto Google Drive:** Ikuti panduan pada file `docs/GOOGLE_DRIVE.gs`.
