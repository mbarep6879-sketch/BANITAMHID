
-- BUAT ADMIN UTAMA : admintamhid

-- LANGKAH 1
-- Buat user di Supabase Authentication:
-- Email    : admintamhid@gmail.com
-- Password : tamhid@2026

-- LANGKAH 2
-- Jalankan SQL berikut setelah user dibuat

UPDATE public.user_profiles
SET
  role = 'super_admin',
  nama_lengkap = 'Admin Tamhid',
  aktif = TRUE
WHERE email = 'admintamhid@gmail.com';

-- Verifikasi
SELECT id,email,nama_lengkap,role
FROM public.user_profiles
WHERE email = 'admintamhid@gmail.com';
