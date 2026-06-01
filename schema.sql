-- ============================================================
-- BANITAMHID — Database Schema Lengkap
-- Bani Tamhid Family Tree System
--
-- CARA PENGGUNAAN:
-- 1. Buka Supabase Dashboard → SQL Editor
-- 2. Paste seluruh isi file ini
-- 3. Klik "Run"
--
-- ✅ Schema ini AMAN dijalankan BERULANG KALI (idempotent)
--    Tidak akan error jika tabel/trigger sudah ada sebelumnya
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";


-- ============================================================
-- 1. USER PROFILES (Extends Supabase Auth)
-- ============================================================
CREATE TABLE IF NOT EXISTS user_profiles (
  id           UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email        TEXT NOT NULL,
  username     TEXT UNIQUE,               -- username untuk login (huruf kecil, tanpa spasi)
  nama_lengkap TEXT NOT NULL,
  role         TEXT NOT NULL DEFAULT 'member'
                 CHECK (role IN ('super_admin', 'admin_keluarga', 'member')),
  aktif        BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tambah kolom username jika schema dijalankan ulang pada tabel yang sudah ada
DO $$ BEGIN
  ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS username TEXT UNIQUE;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- Index untuk lookup username cepat
CREATE INDEX IF NOT EXISTS idx_user_username ON user_profiles(username);


-- ============================================================
-- 2. ANGGOTA KELUARGA
-- ============================================================
CREATE TABLE IF NOT EXISTS anggota_keluarga (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Data Utama
  nama_lengkap     TEXT NOT NULL,
  jenis_kelamin    TEXT NOT NULL CHECK (jenis_kelamin IN ('L', 'P')),

  -- Relasi Orang Tua
  nama_ayah        TEXT,
  nama_ayah_id     UUID REFERENCES anggota_keluarga(id) ON DELETE SET NULL,
  nama_ibu         TEXT,
  nama_ibu_id      UUID REFERENCES anggota_keluarga(id) ON DELETE SET NULL,

  -- Kelahiran
  tempat_lahir     TEXT,
  tanggal_lahir    DATE,

  -- Status Hidup
  status_hidup     TEXT NOT NULL DEFAULT 'hidup'
                     CHECK (status_hidup IN ('hidup', 'meninggal')),
  tanggal_wafat    DATE,
  lokasi_makam     TEXT,
  keterangan_wafat TEXT,

  -- Kontak
  alamat           TEXT,
  nomor_hp         TEXT,
  email            TEXT,

  -- Status Pernikahan (ringkasan)
  status_pernikahan TEXT DEFAULT 'belum_menikah'
                     CHECK (status_pernikahan IN ('belum_menikah','menikah','cerai','duda_janda')),

  -- Foto
  foto_profil_url  TEXT,

  -- Generasi (dihitung otomatis)
  generasi         INT,

  -- Metadata
  created_by       UUID REFERENCES user_profiles(id),
  updated_by       UUID REFERENCES user_profiles(id),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index untuk pencarian cepat
CREATE INDEX IF NOT EXISTS idx_anggota_nama       ON anggota_keluarga(nama_lengkap);
CREATE INDEX IF NOT EXISTS idx_anggota_ayah_id    ON anggota_keluarga(nama_ayah_id);
CREATE INDEX IF NOT EXISTS idx_anggota_ibu_id     ON anggota_keluarga(nama_ibu_id);
CREATE INDEX IF NOT EXISTS idx_anggota_status     ON anggota_keluarga(status_hidup);


-- ============================================================
-- 3. PERNIKAHAN (Mendukung Riwayat Lengkap)
-- ============================================================
CREATE TABLE IF NOT EXISTS pernikahan_anggota (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  anggota_id        UUID NOT NULL REFERENCES anggota_keluarga(id) ON DELETE CASCADE,
  pasangan_id       UUID REFERENCES anggota_keluarga(id) ON DELETE SET NULL,
  nama_pasangan     TEXT NOT NULL,
  urutan            INT NOT NULL DEFAULT 1,
  tanggal_menikah   DATE,
  tanggal_berakhir  DATE,
  status            TEXT NOT NULL DEFAULT 'aktif'
                      CHECK (status IN ('aktif','cerai','meninggal')),
  keterangan        TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pernikahan_anggota ON pernikahan_anggota(anggota_id);


-- ============================================================
-- 4. FOTO ANGGOTA
-- ============================================================
CREATE TABLE IF NOT EXISTS foto_anggota (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  anggota_id    UUID NOT NULL REFERENCES anggota_keluarga(id) ON DELETE CASCADE,
  url           TEXT NOT NULL,
  storage_path  TEXT NOT NULL,
  tipe          TEXT NOT NULL DEFAULT 'profil'
                  CHECK (tipe IN ('profil','keluarga','dokumen')),
  keterangan    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_foto_anggota ON foto_anggota(anggota_id);


-- ============================================================
-- 5. NOTIFIKASI
-- ============================================================
CREATE TABLE IF NOT EXISTS notifikasi (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tipe         TEXT NOT NULL
                 CHECK (tipe IN ('kelahiran','kematian','pernikahan','edit','tambah')),
  judul        TEXT NOT NULL,
  pesan        TEXT NOT NULL,
  data_id      UUID,
  dibaca       BOOLEAN NOT NULL DEFAULT FALSE,
  created_by   UUID REFERENCES user_profiles(id),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ============================================================
-- 6. AUDIT LOG
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_log (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID REFERENCES user_profiles(id),
  tabel_nama   TEXT NOT NULL,
  record_id    UUID,
  aksi         TEXT NOT NULL CHECK (aksi IN ('INSERT','UPDATE','DELETE')),
  data_lama    JSONB,
  data_baru    JSONB,
  ip_address   TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_tabel    ON audit_log(tabel_nama);
CREATE INDEX IF NOT EXISTS idx_audit_user     ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_waktu    ON audit_log(created_at DESC);


-- ============================================================
-- 7. STORED FUNCTION: Lookup email dari username (untuk login)
-- ============================================================
-- Fungsi ini dipanggil oleh frontend sebelum login
-- agar username dapat dikonversi ke email Supabase Auth
CREATE OR REPLACE FUNCTION get_email_by_username(p_username TEXT)
RETURNS TEXT AS $$
  SELECT email
  FROM   user_profiles
  WHERE  LOWER(username) = LOWER(p_username)
    AND  aktif = TRUE
  LIMIT  1;
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Izinkan fungsi ini dipanggil tanpa login (untuk halaman login)
GRANT EXECUTE ON FUNCTION get_email_by_username(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION get_email_by_username(TEXT) TO authenticated;


-- ============================================================
-- 7b. STORED FUNCTION: Statistik Dashboard
-- ============================================================
CREATE OR REPLACE FUNCTION get_statistik_keluarga()
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'total_anggota',        (SELECT COUNT(*) FROM anggota_keluarga),
    'total_laki',           (SELECT COUNT(*) FROM anggota_keluarga WHERE jenis_kelamin = 'L'),
    'total_perempuan',      (SELECT COUNT(*) FROM anggota_keluarga WHERE jenis_kelamin = 'P'),
    'total_hidup',          (SELECT COUNT(*) FROM anggota_keluarga WHERE status_hidup = 'hidup'),
    'total_meninggal',      (SELECT COUNT(*) FROM anggota_keluarga WHERE status_hidup = 'meninggal'),
    'total_pernikahan',     (SELECT COUNT(*) FROM pernikahan_anggota WHERE status = 'aktif'),
    'total_kepala_keluarga',(SELECT COUNT(DISTINCT anggota_id) FROM pernikahan_anggota WHERE status = 'aktif')
  ) INTO result;
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================================
-- 8. TRIGGER FUNCTIONS: Auto update updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop dulu jika sudah ada, lalu buat ulang
DROP TRIGGER IF EXISTS trg_anggota_updated_at    ON anggota_keluarga;
DROP TRIGGER IF EXISTS trg_pernikahan_updated_at  ON pernikahan_anggota;
DROP TRIGGER IF EXISTS trg_profile_updated_at     ON user_profiles;

CREATE TRIGGER trg_anggota_updated_at
  BEFORE UPDATE ON anggota_keluarga
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_pernikahan_updated_at
  BEFORE UPDATE ON pernikahan_anggota
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_profile_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- ============================================================
-- 9. TRIGGER: Auto Notifikasi saat INSERT anggota baru
-- ============================================================
CREATE OR REPLACE FUNCTION notif_anggota_baru()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO notifikasi (tipe, judul, pesan, data_id, created_by)
  VALUES (
    'tambah',
    'Anggota baru ditambahkan',
    'Anggota baru: ' || NEW.nama_lengkap || ' telah ditambahkan ke database.',
    NEW.id,
    NEW.created_by
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_notif_anggota_baru ON anggota_keluarga;
CREATE TRIGGER trg_notif_anggota_baru
  AFTER INSERT ON anggota_keluarga
  FOR EACH ROW EXECUTE FUNCTION notif_anggota_baru();


-- ============================================================
-- 10. TRIGGER: Auto Notifikasi saat kematian dicatat
-- ============================================================
CREATE OR REPLACE FUNCTION notif_kematian()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status_hidup = 'meninggal' AND OLD.status_hidup = 'hidup' THEN
    INSERT INTO notifikasi (tipe, judul, pesan, data_id, created_by)
    VALUES (
      'kematian',
      'Innalillahi — Berita Duka',
      NEW.nama_lengkap || ' telah berpulang ke rahmatullah.',
      NEW.id,
      NEW.updated_by
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_notif_kematian ON anggota_keluarga;
CREATE TRIGGER trg_notif_kematian
  AFTER UPDATE ON anggota_keluarga
  FOR EACH ROW EXECUTE FUNCTION notif_kematian();


-- ============================================================
-- 11. TRIGGER: Auto Notifikasi pernikahan baru
-- ============================================================
CREATE OR REPLACE FUNCTION notif_pernikahan()
RETURNS TRIGGER AS $$
DECLARE
  nama_anggota TEXT;
BEGIN
  SELECT nama_lengkap INTO nama_anggota FROM anggota_keluarga WHERE id = NEW.anggota_id;
  INSERT INTO notifikasi (tipe, judul, pesan, data_id)
  VALUES (
    'pernikahan',
    'Pernikahan dicatat',
    nama_anggota || ' menikah dengan ' || NEW.nama_pasangan || '.',
    NEW.anggota_id
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_notif_pernikahan ON pernikahan_anggota;
CREATE TRIGGER trg_notif_pernikahan
  AFTER INSERT ON pernikahan_anggota
  FOR EACH ROW EXECUTE FUNCTION notif_pernikahan();


-- ============================================================
-- 12. TRIGGER: Auto Profile saat user baru registrasi
-- ============================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_profiles (id, email, username, nama_lengkap, role)
  VALUES (
    NEW.id,
    NEW.email,
    LOWER(REGEXP_REPLACE(COALESCE(NEW.raw_user_meta_data->>'username', ''), '[^a-z0-9_]', '', 'g')),
    COALESCE(NEW.raw_user_meta_data->>'nama_lengkap', 'Pengguna Baru'),
    COALESCE(NEW.raw_user_meta_data->>'role', 'member')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_new_user ON auth.users;
CREATE TRIGGER trg_new_user
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();


-- ============================================================
-- 13. ROW LEVEL SECURITY (RLS)
-- ============================================================

-- Enable RLS
ALTER TABLE user_profiles      ENABLE ROW LEVEL SECURITY;
ALTER TABLE anggota_keluarga   ENABLE ROW LEVEL SECURITY;
ALTER TABLE pernikahan_anggota ENABLE ROW LEVEL SECURITY;
ALTER TABLE foto_anggota       ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifikasi         ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log          ENABLE ROW LEVEL SECURITY;

-- Helper function: ambil role user saat ini
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS TEXT AS $$
  SELECT role FROM user_profiles WHERE id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- ── Drop semua policy lama agar tidak conflict saat re-run ──
DO $$ BEGIN
  -- user_profiles
  DROP POLICY IF EXISTS "Semua login bisa lihat profile"      ON user_profiles;
  DROP POLICY IF EXISTS "User bisa update profile sendiri"    ON user_profiles;
  DROP POLICY IF EXISTS "Super admin kelola semua user"       ON user_profiles;
  -- anggota_keluarga
  DROP POLICY IF EXISTS "Semua login bisa lihat anggota"      ON anggota_keluarga;
  DROP POLICY IF EXISTS "Admin bisa tambah anggota"           ON anggota_keluarga;
  DROP POLICY IF EXISTS "Admin bisa edit anggota"             ON anggota_keluarga;
  DROP POLICY IF EXISTS "Super admin bisa hapus anggota"      ON anggota_keluarga;
  -- pernikahan_anggota
  DROP POLICY IF EXISTS "Semua login bisa lihat pernikahan"   ON pernikahan_anggota;
  DROP POLICY IF EXISTS "Admin bisa kelola pernikahan"        ON pernikahan_anggota;
  -- foto_anggota
  DROP POLICY IF EXISTS "Semua login bisa lihat foto"         ON foto_anggota;
  DROP POLICY IF EXISTS "Admin bisa kelola foto"              ON foto_anggota;
  -- notifikasi
  DROP POLICY IF EXISTS "Semua login bisa lihat notifikasi"   ON notifikasi;
  DROP POLICY IF EXISTS "Admin bisa kelola notifikasi"        ON notifikasi;
  -- audit_log
  DROP POLICY IF EXISTS "Semua login bisa lihat audit log"    ON audit_log;
  DROP POLICY IF EXISTS "System saja yang insert audit log"   ON audit_log;
  -- storage
  DROP POLICY IF EXISTS "Admin upload foto"    ON storage.objects;
  DROP POLICY IF EXISTS "Publik bisa lihat foto" ON storage.objects;
  DROP POLICY IF EXISTS "Admin hapus foto"     ON storage.objects;
END $$;

-- ── USER PROFILES ──
CREATE POLICY "Semua login bisa lihat profile"
  ON user_profiles FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY "User bisa update profile sendiri"
  ON user_profiles FOR UPDATE TO authenticated USING (id = auth.uid());

CREATE POLICY "Super admin kelola semua user"
  ON user_profiles FOR ALL TO authenticated
  USING (get_my_role() = 'super_admin');

-- ── ANGGOTA KELUARGA ──
CREATE POLICY "Semua login bisa lihat anggota"
  ON anggota_keluarga FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY "Admin bisa tambah anggota"
  ON anggota_keluarga FOR INSERT TO authenticated
  WITH CHECK (get_my_role() IN ('super_admin', 'admin_keluarga'));

CREATE POLICY "Admin bisa edit anggota"
  ON anggota_keluarga FOR UPDATE TO authenticated
  USING (get_my_role() IN ('super_admin', 'admin_keluarga'));

CREATE POLICY "Super admin bisa hapus anggota"
  ON anggota_keluarga FOR DELETE TO authenticated
  USING (get_my_role() = 'super_admin');

-- ── PERNIKAHAN ──
CREATE POLICY "Semua login bisa lihat pernikahan"
  ON pernikahan_anggota FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY "Admin bisa kelola pernikahan"
  ON pernikahan_anggota FOR ALL TO authenticated
  USING (get_my_role() IN ('super_admin', 'admin_keluarga'));

-- ── FOTO ──
CREATE POLICY "Semua login bisa lihat foto"
  ON foto_anggota FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY "Admin bisa kelola foto"
  ON foto_anggota FOR ALL TO authenticated
  USING (get_my_role() IN ('super_admin', 'admin_keluarga'));

-- ── NOTIFIKASI ──
CREATE POLICY "Semua login bisa lihat notifikasi"
  ON notifikasi FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY "Admin bisa kelola notifikasi"
  ON notifikasi FOR ALL TO authenticated
  USING (get_my_role() IN ('super_admin', 'admin_keluarga'));

-- ── AUDIT LOG ──
CREATE POLICY "Semua login bisa lihat audit log"
  ON audit_log FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY "System saja yang insert audit log"
  ON audit_log FOR INSERT TO authenticated
  WITH CHECK (get_my_role() IN ('super_admin', 'admin_keluarga'));


-- ============================================================
-- 14. SUPABASE STORAGE BUCKET
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('foto-anggota', 'foto-anggota', TRUE)
ON CONFLICT DO NOTHING;

CREATE POLICY "Admin upload foto"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'foto-anggota'
    AND get_my_role() IN ('super_admin', 'admin_keluarga')
  );

CREATE POLICY "Publik bisa lihat foto"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'foto-anggota');

CREATE POLICY "Admin hapus foto"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'foto-anggota'
    AND get_my_role() IN ('super_admin', 'admin_keluarga')
  );


-- ============================================================
-- 15. DATA AWAL: Super Admin Pertama
-- ============================================================
-- CATATAN: Jalankan bagian ini SETELAH membuat user via
-- Supabase Dashboard → Authentication → Users → Add User
-- Lepas komentar (--) dan ganti email sesuai akun Anda:

-- UPDATE user_profiles
--   SET role = 'admintamhid', nama_lengkap = 'Admin Tamhid'
--   WHERE email = 'admintamhid@gmail.com';


-- ============================================================
-- SELESAI! Database BANITAMHID siap digunakan.
-- Schema ini idempotent — aman dijalankan ulang kapan saja.
-- ============================================================
