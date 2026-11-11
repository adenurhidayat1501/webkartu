# 🪪 SMKN CIPATUJAH - ID CARD STUDIO (WEB APPLICATION)

Aplikasi web modern, proper, dan kompleks untuk **membuat dan mencetak Kartu Pelajar (ID Card Siswa) secara otomatis per-kelas** berdasarkan template desain SVG resmi dan data Excel Dapodik/Kesiswaan beserta folder foto siswa.

---

## 🌟 Fitur Utama

1. **Desain Presisi Sesuai Template Asli (Depan & Belakang)**:
   - Ukuran standar kartu identitas internasional **CR-80 (86 × 54 mm)**.
   - **Sisi Depan**: Kop SMK Negeri Cipatujah, logo resmi, foto siswa 3×4 berbingkai rapi, judul *KARTU PELAJAR*, nama siswa, nomor NISN, pita dekoratif, dan **QR Code dinamis** beresolusi tinggi dengan label *SCAN HERE*.
   - **Sisi Belakang**: Identitas lengkap siswa (Nama, NISN, NIS/NIPD, Agama, Jenis Kelamin, Tempat Tanggal Lahir, Alamat Lengkap), garis pemisah, titimangsa (*Cipatujah, 15 Juli 2026*), jabatan, **tanda tangan & stempel digital resmi**, nama Kepala Sekolah bergaris bawah beserta NIP, catatan masa berlaku, dan pita dekoratif.

2. **Deteksi Cerdas Nama & Foto Siswa (Smart Fuzzy Matching)**:
   - Menghubungkan secara otomatis data siswa di Excel dengan file foto di folder masing-masing kelas.
   - Dilengkapi algoritma normalisasi fonetik bahasa Indonesia (`f` ↔ `p`, `z` ↔ `j`, `v` ↔ `f`, `kh` ↔ `h`, `sy` ↔ `s`, singkatan nama `M.` ↔ `Muhammad`, dll.) serta *Levenshtein Distance*.
   - Tingkat keberhasilan deteksi otomatis awal mencapai **100% (358 dari 358 siswa)**.
   - Status indikator transparan:
     - 🟢 **Foto Pas (Exact)**: Nama foto sama persis dengan nama di Excel.
     - 🔵 **Cocok Nama (Fuzzy/Fonetik)**: Terdeteksi otomatis meskipun terdapat variasi ejaan.
     - 🟡 **Disarankan**: Foto yang belum terpakai di folder kelas.
     - 🔴 **Tanpa Foto**: Menggunakan avatar placeholder standar.

3. **3 Mode Tampilan Interaktif**:
   - 🎴 **Mode 3D Flip**: Efek animasi 3D rotasi 180° saat kartu diklik untuk melihat sisi depan dan belakang secara interaktif.
   - 📄 **Mode Berdampingan (Side-by-side)**: Menampilkan sisi depan dan belakang secara bersamaan untuk verifikasi cepat.
   - 📋 **Mode Tabel Data**: Tampilan tabel ringkas dengan thumbnail foto, NISN, NIS, TTL, alamat, dan tombol aksi cepat.

4. **Kustomisasi & Pengaturan Fleksibel**:
   - Ubah Nama Sekolah, Alamat Baris 1 & 2 pada Kop Kartu.
   - Ubah Nama Kepala Sekolah, NIP, Jabatan, dan Tanggal Titimangsa.
   - Ganti file Logo Sekolah atau Tanda Tangan & Stempel Digital langsung dari aplikasi.
   - Pilihan format data QR Code: Ringkas (NISN|Nama|Kelas), Nomor NISN saja, atau vCard lengkap.
   - Semua preferensi tersimpan otomatis di *Local Storage* peramban.

5. **Pencetakan & Ekspor Skala Besar (Batch Export)**:
   - 🖨️ **Cetak Lembar A4 (10 Kartu per Halaman)**:
     - Tata letak presisi 2 kolom × 5 baris pada kertas A4 (210 × 297 mm).
     - Pilihan: **Mode Dupleks (Bolak-Balik)** yang mencerminkan posisi kolom halaman belakang agar pas saat dicetak timbal-balik, **Hanya Sisi Depan**, atau **Hanya Sisi Belakang**.
     - Dilengkapi garis tanda potong (*crop marks*) halus di setiap sudut kartu.
   - 📄 **Ekspor PDF Kelas**: Menghasilkan dokumen PDF multi-halaman beresolusi tinggi siap cetak.
   - 📦 **Unduh ZIP Gambar**: Mengekspor seluruh kartu siswa dalam satu kelas (Depan & Belakang format PNG resolusi 300 DPI) beserta rekap data `daftar_siswa.csv`.
   - ⬇️ **Unduh Satuan**: Download gambar PNG kartu depan/belakang per siswa.

6. **Dukungan Data Kustom (Unggah Excel & Foto Baru)**:
   - Tombol **Unggah Data** memungkinkan pemrosesan untuk tahun ajaran baru atau sekolah lain cukup dengan memilih file Excel dan folder foto melalui peramban.

---

## 🚀 Cara Menjalankan Aplikasi

### Opsi 1: Satu Kali Klik (Windows)
Cukup klik ganda (double-click) pada file:
```
start.bat
```
Aplikasi akan otomatis menjalankan server lokal dan membuka peramban web di `http://localhost:8000`.

### Opsi 2: Menggunakan Terminal / PowerShell
Jalankan perintah berikut pada direktori proyek:
```bash
python server.py
```
Lalu buka peramban Anda dan akses:
```
http://localhost:8000
```

---

## 📁 Struktur Direktori Proyek

```
web auto create id card/
├── index.html                   # Halaman utama aplikasi web
├── server.py                    # Server lokal Python (0 dependensi eksternal)
├── start.bat                    # Script peluncur instan untuk Windows
├── css/
│   └── style.css                # Desain responsif, animasi 3D, dan layout cetak A4
├── js/
│   ├── app.js                   # State manager & controller interaksi aplikasi
│   ├── card-generator.js        # Engine pembuat SVG kartu pelajar & canvas PNG
│   ├── fuzzy-matcher.js         # Algoritma pencocokan nama pintar siswa & foto
│   ├── export-manager.js        # Engine ekspor ZIP, PDF A4, dan cetak lembar
│   └── vendor/
│       ├── qrcode.min.js        # Generator QR Code offline
│       ├── xlsx.full.min.js     # Parser file Excel client-side
│       ├── jszip.min.js         # Pembuat berkas arsip ZIP client-side
│       └── jspdf.umd.min.js     # Generator dokumen PDF A4
├── assets/
│   ├── logo.png                 # Logo resmi SMK Negeri Cipatujah
│   ├── avatar-placeholder.svg   # Placeholder siswa tanpa foto
│   └── signature-sample.svg     # Tanda tangan & stempel digital Kepala Sekolah
├── data/
│   └── students-data.json       # Index data 10 rombel kelas X beserta foto & QR
├── dataqr/                      # Berkas gambar QR Code resmi per-rombel
│   ├── X_TO_1_QR_Codes/         # QR Code kelas X TO 1
│   ├── X_TO_2_QR_Codes/         # QR Code kelas X TO 2
│   ├── X_TO_3_QR_Codes/         # QR Code kelas X TO 3
│   ├── X_TJKT_1_QR_Codes/       # QR Code kelas X TJKT 1
│   ├── X_TJKT_2_QR_Codes/       # QR Code kelas X TJKT 2
│   ├── X_APHP_QR_Codes/         # QR Code kelas X APHP
│   ├── X_PM_1_QR_Codes/         # QR Code kelas X PM 1
│   ├── X_PM_2_QR_Codes/         # QR Code kelas X PM 2
│   ├── X_MPLB_1_QR_Codes/       # QR Code kelas X MPLB 1
│   └── X_MPLB_2_QR_Codes/       # QR Code kelas X MPLB 2
├── KARTU OSIS KELAS X THN 2026-2027/
    ├── Data Untuk Kartu Osis Tahun Pelajaran 2026-2027.xlsx
    ├── 1. to1/                  # Foto siswa kelas X TO 1
    ├── 2. to2/                  # Foto siswa kelas X TO 2
    ├── 3. to3/                  # Foto siswa kelas X TO 3
    ├── 4. tkj1/                 # Foto siswa kelas X TJKT 1
    ├── 5. tkj2/                 # Foto siswa kelas X TJKT 2
    ├── 6. aphp/                 # Foto siswa kelas X APHP
    ├── 7. br1/                  # Foto siswa kelas X PM 1
    ├── 8. br2/                  # Foto siswa kelas X PM 2
    ├── 9. mplb1/                # Foto siswa kelas X MPLB 1
    └── 10. mplb2/               # Foto siswa kelas X MPLB 2
```

---

## 📋 Data Rombel Kelas yang Telah Terindeks

| No | Nama Rombel | Jurusan / Program Keahlian | Jumlah Siswa | Status Foto |
|:--:|:------------|:---------------------------|:------------:|:-----------:|
| 1  | **X TO 1**  | Teknik Otomotif 1 | 44 | 100% (44/44) |
| 2  | **X TO 2**  | Teknik Otomotif 2 | 39 | 100% (39/39) |
| 3  | **X TO 3**  | Teknik Otomotif 3 | 40 | 100% (40/40) |
| 4  | **X TJKT 1**| Teknik Jaringan Komputer & Telekomunikasi 1 | 35 | 100% (35/35) |
| 5  | **X TJKT 2**| Teknik Jaringan Komputer & Telekomunikasi 2 | 35 | 100% (35/35) |
| 6  | **X APHP**  | Agribisnis Pengolahan Hasil Pertanian | 28 | 100% (28/28) |
| 7  | **X PM 1**  | Pemasaran 1 / Bisnis Ritel 1 | 35 | 100% (35/35) |
| 8  | **X PM 2**  | Pemasaran 2 / Bisnis Ritel 2 | 35 | 100% (35/35) |
| 9  | **X MPLB 1**| Manajemen Perkantoran & Layanan Bisnis 1 | 34 | 100% (34/34) |
| 10 | **X MPLB 2**| Manajemen Perkantoran & Layanan Bisnis 2 | 33 | 100% (33/33) |
| **TOTAL** | **10 Kelas** | **Seluruh Rombel Kelas X** | **358 Siswa** | **100% Terhubung** |

---

## 🌐 Panduan Deploy & Hosting (Bisa Online 100% Gratis)

Aplikasi ini dirancang sebagai **Single-Page Application (SPA) Murni (Client-Side)** dengan data statis JSON, sehingga **TIDAK memerlukan backend server yang rumit**. Anda dapat meng-hosting aplikasi ini di berbagai platform gratis maupun berbayar:

### Opsi 1: Netlify (Paling Mudah - Drag & Drop)
1. Buka [https://app.netlify.com/drop](https://app.netlify.com/drop) (login/daftar gratis).
2. Seret (drag & drop) seluruh folder `web auto create id card` ke browser.
3. Tunggu proses unggah selesai (beberapa detik).
4. Aplikasi langsung online dan Anda mendapatkan URL publik (misal: `https://idcard-smkncipatujah.netlify.app`).

### Opsi 2: Vercel
1. Unggah folder ke akun GitHub Anda.
2. Buka [https://vercel.com](https://vercel.com), pilih **Add New Project** -> **Import Git Repository**.
3. Framework Preset: **Other**. Root Directory: `./`.
4. Klik **Deploy**.

### Opsi 3: GitHub Pages (Gratis Selamanya)
1. Buat repository baru di GitHub dan lakukan `git push` semua berkas proyek ini.
2. Buka tab **Settings** di repository GitHub Anda.
3. Pada menu samping, klik **Pages**.
4. Pada bagian **Build and deployment** -> **Source**: pilih **Deploy from a branch**.
5. Pilih branch `main` dan folder `/(root)`, lalu klik **Save**.
6. Web akan live di: `https://<username>.github.io/<nama-repo>/`.

### Opsi 4: Web Hosting Sekolah (cPanel / Apache / Nginx)
1. Buka cPanel hosting sekolah -> masuk ke **File Manager** -> buka folder `public_html/` (atau subdomain misal `kartu.smkncipatujah.sch.id`).
2. Kompres seluruh folder proyek ini ke format `.zip`, lalu unggah dan ekstrak di `public_html/`.
3. Pastikan berkas `index.html`, folder `assets/`, `css/`, `data/`, `dataqr/`, `js/`, dan `photos/` berada di root direktori domain tersebut.
4. Aplikasi langsung dapat digunakan oleh seluruh staf/guru secara online.

### Opsi 5: Localhost / Jaringan Lokal Sekolah (Intranet Tanpa Internet)
- Jalankan file `start.bat`.
- Guru atau operator lain di satu ruangan/jaringan Wi-Fi yang sama dapat mengaksesnya via IP server, contoh: `http://192.168.1.15:8000`.

---

## 💡 Tips Cetak (*Printing Guidelines*)

1. Saat mencetak melalui peramban (browser print dialog `Ctrl + P`):
   - **Tujuan Cetak / Printer**: Pilih printer fisik Anda atau *Save as PDF*.
   - **Ukuran Kertas**: Pilih **A4**.
   - **Tata Letak**: **Potret (Portrait)**.
   - **Skala / Scale**: Pilih **Sesungguhnya / 100%** (*Actual Size*, jangan pilih *Fit to printable area*).
   - **Margin**: Pilih **Tidak Ada / Minimum** (*None* atau *Minimum*).
   - **Opsi Latar Belakang**: Pastikan mencentang **Grafik latar belakang** (*Background graphics*).
2. Jika menggunakan mode dupleks timbal balik manual:
   - Cetak halaman ganjil (sisi depan) terlebih dahulu.
   - Balik kertas dan masukkan kembali ke tray printer.
   - Cetak halaman genap (sisi belakang yang telah dicerminkan). Hasil potongan depan dan belakang akan simetris dan pas.

