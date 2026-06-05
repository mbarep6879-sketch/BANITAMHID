-- ================================================================
-- BANITAMHID — Supabase Database Schema
-- Jalankan file ini di Supabase → SQL Editor → New Query
-- ================================================================

-- ----------------------------------------------------------------
-- 1. TABEL MEMBERS (Anggota Keluarga)
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS members (
  id           TEXT PRIMARY KEY,
  nama         TEXT NOT NULL,
  gender       TEXT CHECK (gender IN ('L','P')) DEFAULT 'L',
  status       TEXT CHECK (status IN ('hidup','wafat')) DEFAULT 'hidup',
  tmpt         TEXT,
  tgl          DATE,
  nik          TEXT,
  hp           TEXT,
  kerja        TEXT,
  didik        TEXT,
  alamat       TEXT,
  ayah         TEXT,
  ibu          TEXT,
  ayah_id      TEXT REFERENCES members(id) ON DELETE SET NULL,
  ibu_id       TEXT REFERENCES members(id) ON DELETE SET NULL,
  gen          INTEGER DEFAULT 1,
  urut         INTEGER DEFAULT 1,
  catatan      TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ----------------------------------------------------------------
-- 2. TABEL PASANGAN (Data Pernikahan — bisa lebih dari 1)
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pasangan (
  id           SERIAL PRIMARY KEY,
  member_id    TEXT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  nama         TEXT NOT NULL,
  tgl_nikah    DATE,
  tmpt_nikah   TEXT,
  status_nikah TEXT DEFAULT 'menikah',
  hp           TEXT,
  catatan      TEXT,
  urut         INTEGER DEFAULT 1
);

-- ----------------------------------------------------------------
-- 3. TABEL USERS (Pengguna Sistem)
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS bt_users (
  id           TEXT PRIMARY KEY,
  username     TEXT UNIQUE NOT NULL,
  password     TEXT NOT NULL,
  name         TEXT NOT NULL,
  role         TEXT CHECK (role IN ('admin','member')) DEFAULT 'member',
  avatar       TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ----------------------------------------------------------------
-- 4. TABEL ACTIVITY LOG
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS activity_log (
  id           SERIAL PRIMARY KEY,
  ico          TEXT,
  msg          TEXT,
  user_id      TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ----------------------------------------------------------------
-- 5. TRIGGERS — auto-update updated_at
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_members_updated ON members;
CREATE TRIGGER trg_members_updated
  BEFORE UPDATE ON members
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ----------------------------------------------------------------
-- 6. ROW LEVEL SECURITY (RLS) — Keamanan data
-- ----------------------------------------------------------------
ALTER TABLE members      ENABLE ROW LEVEL SECURITY;
ALTER TABLE pasangan     ENABLE ROW LEVEL SECURITY;
ALTER TABLE bt_users     ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

-- Allow semua operasi menggunakan anon key (kita handle auth sendiri di app)
CREATE POLICY "allow_all_members"      ON members      FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_pasangan"     ON pasangan     FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_users"        ON bt_users     FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_activity"     ON activity_log FOR ALL USING (true) WITH CHECK (true);

-- ----------------------------------------------------------------
-- 7. DATA AWAL — Default users
-- ----------------------------------------------------------------
INSERT INTO bt_users (id, username, password, name, role, avatar)
VALUES
  ('u1', 'admin',    'admin123',   'Administrator',    'admin',  'AD'),
  ('u2', 'keluarga', 'tamhid2024', 'Anggota Keluarga', 'member', 'KL')
ON CONFLICT (id) DO NOTHING;

-- ----------------------------------------------------------------
-- 8. INDEXES — Optimasi query
-- ----------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_members_gen    ON members(gen);
CREATE INDEX IF NOT EXISTS idx_members_gender ON members(gender);
CREATE INDEX IF NOT EXISTS idx_members_status ON members(status);
CREATE INDEX IF NOT EXISTS idx_members_ayah   ON members(ayah_id);
CREATE INDEX IF NOT EXISTS idx_members_ibu    ON members(ibu_id);
CREATE INDEX IF NOT EXISTS idx_pasangan_mbr   ON pasangan(member_id);
CREATE INDEX IF NOT EXISTS idx_activity_time  ON activity_log(created_at DESC);

-- ----------------------------------------------------------------
-- SELESAI — Cek hasil
-- ----------------------------------------------------------------
SELECT 'Schema berhasil dibuat!' AS status;
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
