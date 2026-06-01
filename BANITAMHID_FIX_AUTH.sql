
-- PATCH BANITAMHID - PERBAIKAN AUTHENTICATION & USER MANAGEMENT

-- Hapus trigger lama jika ada
DROP TRIGGER IF EXISTS trg_new_user ON auth.users;

-- Function membuat profile otomatis
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_profiles (
    id,
    email,
    nama_lengkap,
    role,
    aktif
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'nama_lengkap', split_part(NEW.email,'@',1)),
    'member',
    TRUE
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_new_user
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();

-- Hak super admin mengelola user_profiles
DROP POLICY IF EXISTS "Super admin kelola semua user" ON user_profiles;

CREATE POLICY "Super admin kelola semua user"
ON user_profiles
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM user_profiles up
    WHERE up.id = auth.uid()
      AND up.role = 'super_admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM user_profiles up
    WHERE up.id = auth.uid()
      AND up.role = 'super_admin'
  )
);

-- Izinkan service_role insert profile
GRANT ALL ON TABLE public.user_profiles TO service_role;

-- Sinkronisasi user yang sudah ada
INSERT INTO public.user_profiles(id,email,nama_lengkap,role,aktif)
SELECT
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'nama_lengkap', split_part(au.email,'@',1)),
  'member',
  TRUE
FROM auth.users au
LEFT JOIN public.user_profiles up ON up.id=au.id
WHERE up.id IS NULL;
