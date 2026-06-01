# 🌳 BAFITS — Bani Tamhid Family Tree System
> Sistem Silsilah Digital Keluarga Besar Bani Tamhid

---

## 📁 Struktur Project (Lengkap)

```
bafits/
├── index.html                  ← Halaman Login
├── vercel.json                 ← Konfigurasi Vercel
├── schema.sql                  ← Database schema Supabase
├── README.md
├── css/
│   └── main.css                ← Design system global
├── js/
│   ├── supabase.js             ← ⚠️ ISI URL & KEY SUPABASE DI SINI
│   └── ui.js                  ← Komponen sidebar, topbar, icons
└── pages/
    ├── dashboard.html          ← Dashboard statistik & grafik
    ├── anggota.html            ← CRUD anggota keluarga
    ├── pernikahan.html         ← Manajemen data pernikahan
    ├── kelahiran.html          ← Data kelahiran & grafik
    ├── kematian.html           ← Data kematian & lokasi makam
    ├── silsilah.html           ← Pohon silsilah interaktif
    ├── galeri.html             ← Galeri foto keluarga
    ├── laporan.html            ← Cetak & export Excel
    ├── notifikasi.html         ← Pusat notifikasi real-time
    ├── pengaturan.html         ← Profil, password, backup
    ├── manajemen-user.html     ← Kelola user (Super Admin)
    └── reset-password.html     ← Halaman reset password
```

---

## 🚀 Panduan Setup (Ikuti Urutan!)

### LANGKAH 1 — Buat Akun Gratis

| Platform | Link | Fungsi |
|----------|------|--------|
| GitHub | https://github.com | Menyimpan kode |
| Supabase | https://supabase.com | Backend & Database |
| Vercel | https://vercel.com | Hosting aplikasi |

### LANGKAH 2 — Buat Project Supabase

1. Login Supabase → New Project → nama: `bafits`
2. Region: Southeast Asia (Singapore)
3. Catat database password

### LANGKAH 3 — Jalankan Schema Database

1. Supabase → SQL Editor → New Query
2. Salin isi `schema.sql` → Paste → Run ✅

### LANGKAH 4 — Isi Konfigurasi Supabase

Edit `js/supabase.js`:
```javascript
const SUPABASE_URL = 'https://XXXXX.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGci...';
```
Nilai didapat dari: Supabase → Settings → API

### LANGKAH 5 — Buat Super Admin

1. Supabase → Authentication → Users → Add User
2. Isi email & password
3. Jalankan di SQL Editor:
```sql
UPDATE user_profiles
  SET role = 'super_admin', nama_lengkap = 'Administrator'
  WHERE email = 'email-kamu@gmail.com';
```

### LANGKAH 6 — Upload ke GitHub

1. Buat repo baru di GitHub (nama: `bafits`)
2. Upload semua file dengan drag & drop
3. Commit changes

### LANGKAH 7 — Deploy ke Vercel

1. Login Vercel dengan GitHub
2. Add New Project → import repo `bafits`
3. Deploy → selesai! 🎉

### LANGKAH 8 — Set Auth URL di Supabase

Supabase → Authentication → URL Configuration:
- Site URL: `https://bafits-xxxx.vercel.app`
- Redirect URLs: `https://bafits-xxxx.vercel.app/pages/reset-password.html`

---

## 🔐 Role & Hak Akses

| Role | Kemampuan |
|------|-----------|
| Super Admin | Semua fitur + kelola user + backup |
| Admin Keluarga | Tambah, edit, hapus + upload foto |
| Member | Hanya lihat & jelajahi data |

---

## ✅ Fitur Lengkap

- Login / Logout / Reset Password
- Dashboard statistik + grafik pertumbuhan anggota
- CRUD anggota keluarga (form multi-tab)
- Riwayat pernikahan (multiple pasangan)
- Data kelahiran + grafik per tahun
- Data kematian + persebaran lokasi makam
- Pohon silsilah interaktif (zoom, drag, expand/collapse)
- Galeri foto (upload drag-drop, lightbox)
- Laporan PDF + export Excel (5 jenis)
- Notifikasi real-time
- Manajemen user & hak akses (RBAC)
- Backup database ke Excel
- Audit trail (log semua perubahan)
- Pencarian multi-kriteria
- Autocomplete orang tua & pasangan
- Responsive mobile-friendly

---

*BAFITS v1.0 — Untuk Keluarga Besar Bani Tamhid*
