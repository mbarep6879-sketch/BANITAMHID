// ============================================================
// BANITAMHID - Supabase Configuration
// GANTI nilai di bawah ini dengan Project URL dan Anon Key
// dari: Supabase Dashboard → Settings → API
// ============================================================

// Guard: jika sudah di-load sebelumnya, skip agar tidak error
// "Identifier already declared" saat file di-execute dua kali
if (!window.BANITAMHID) { (function() {

const SUPABASE_URL = 'https://yogjdqrtlkicmtwjsorp.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlvZ2pkcXJ0bGtpY210d2pzb3JwIiwicm9sZSI6ImFub24iLCJpYXQiOj';

const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ============================================================
// AUTH HELPERS
// ============================================================

// Konversi username ke email internal (format standar)
const toInternalEmail = (username) =>
  `${username.toLowerCase().trim()}@banitamhid.internal`;

const Auth = {
  // Login dengan EMAIL (tetap tersedia untuk kompatibilitas)
  async login(email, password) {
    const { data, error } = await db.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  },

  // Login dengan USERNAME — cara utama yang dipakai aplikasi
  // Strategi: cari email asli via RPC, lalu login dengan email tersebut.
  // Fallback: konversi username ke email internal jika RPC gagal.
  async loginByUsername(username, password) {
    const uname = username.toLowerCase().trim();

    // Validasi format username
    if (!/^[a-z0-9_]{3,30}$/.test(uname)) {
      throw new Error('Username hanya boleh huruf kecil, angka, dan underscore (3–30 karakter).');
    }

    // Coba ambil email asli dari tabel user_profiles via RPC
    let emailToUse = null;
    try {
      const { data } = await db.rpc('get_email_by_username', { p_username: uname });
      if (data) emailToUse = data;
    } catch (_) { /* RPC belum ada atau error, lanjut ke fallback */ }

    // Fallback: gunakan email internal
    if (!emailToUse) emailToUse = toInternalEmail(uname);

    const { data, error } = await db.auth.signInWithPassword({
      email: emailToUse,
      password
    });
    if (error) {
      // Pesan error yang ramah untuk user
      if (error.message.includes('Invalid') || error.message.includes('credentials')) {
        throw new Error('Username atau password salah.');
      }
      throw error;
    }
    return data;
  },

  async logout() {
    const { error } = await db.auth.signOut();
    if (error) throw error;
    window.location.href = '/index.html';
  },

  async resetPassword(email) {
    const { error } = await db.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + '/pages/reset-password.html'
    });
    if (error) throw error;
  },

  async getUser() {
    const { data: { user } } = await db.auth.getUser();
    return user;
  },

  async getSession() {
    const { data: { session } } = await db.auth.getSession();
    return session;
  },

  async requireAuth() {
    const session = await this.getSession();
    if (!session) {
      window.location.href = '/index.html';
      return null;
    }
    return session;
  },

  // Buat akun baru — email internal dibuat otomatis dari username
  async createUser(username, password, metadata = {}) {
    const uname = username.toLowerCase().trim();
    if (!/^[a-z0-9_]{3,30}$/.test(uname)) {
      throw new Error('Username hanya boleh huruf kecil, angka, dan underscore (3–30 karakter).');
    }
    const email = toInternalEmail(uname);
    const { data, error } = await db.auth.signUp({
      email,
      password,
      options: { data: { ...metadata, username: uname } }
    });
    if (error) throw error;
    return { ...data, internalEmail: email };
  },

  // Perbarui password user yang sedang login
  async updatePassword(newPassword) {
    const { data, error } = await db.auth.updateUser({ password: newPassword });
    if (error) throw error;
    return data;
  },

  // Perbarui email user yang sedang login
  async updateEmail(newEmail) {
    const { data, error } = await db.auth.updateUser({ email: newEmail });
    if (error) throw error;
    return data;
  }
};

// ============================================================
// USER PROFILE & ROLE HELPERS
// ============================================================

const UserProfile = {
  async getProfile(userId) {
    const { data, error } = await db
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single();
    if (error) throw error;
    return data;
  },

  async getUserByUsername(username) {
    const { data, error } = await db
      .from('user_profiles')
      .select('*')
      .eq('username', username.toLowerCase().trim())
      .single();
    if (error) throw error;
    return data;
  },

  async isUsernameAvailable(username) {
    const { data } = await db
      .from('user_profiles')
      .select('id')
      .eq('username', username.toLowerCase().trim())
      .maybeSingle();
    return !data;
  },

  async getCurrentRole() {
    const user = await Auth.getUser();
    if (!user) return null;
    const profile = await this.getProfile(user.id);
    return profile?.role;
  },

  async isAdmin() {
    const role = await this.getCurrentRole();
    return role === 'super_admin' || role === 'admin_keluarga';
  },

  async isSuperAdmin() {
    const role = await this.getCurrentRole();
    return role === 'super_admin';
  }
};

// ============================================================
// ANGGOTA KELUARGA HELPERS
// ============================================================

const Anggota = {
  async getAll(options = {}) {
    let query = db.from('anggota_keluarga').select(`
      *,
      pernikahan:pernikahan_anggota(
        id, nama_pasangan, tanggal_menikah, tanggal_berakhir, status
      )
    `).order('nama_lengkap');

    if (options.jenis_kelamin) query = query.eq('jenis_kelamin', options.jenis_kelamin);
    if (options.status_hidup)  query = query.eq('status_hidup', options.status_hidup);
    if (options.search) query = query.ilike('nama_lengkap', `%${options.search}%`);

    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  async getById(id) {
    const { data, error } = await db
      .from('anggota_keluarga')
      .select(`
        *,
        pernikahan:pernikahan_anggota(*),
        foto:foto_anggota(*),
        anak:anggota_keluarga!nama_ayah_id(id, nama_lengkap, jenis_kelamin, tanggal_lahir)
      `)
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  },

  async create(data) {
    const { data: result, error } = await db
      .from('anggota_keluarga')
      .insert(data)
      .select()
      .single();
    if (error) throw error;
    return result;
  },

  async update(id, data) {
    const { data: result, error } = await db
      .from('anggota_keluarga')
      .update(data)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return result;
  },

  async delete(id) {
    const { error } = await db
      .from('anggota_keluarga')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  async search(keyword) {
    const { data, error } = await db
      .from('anggota_keluarga')
      .select('id, nama_lengkap, jenis_kelamin, tanggal_lahir, foto_profil_url')
      .or(`nama_lengkap.ilike.%${keyword}%,nama_ayah.ilike.%${keyword}%,nama_ibu.ilike.%${keyword}%,alamat.ilike.%${keyword}%`)
      .limit(20);
    if (error) throw error;
    return data;
  },

  async getStatistik() {
    const { data, error } = await db.rpc('get_statistik_keluarga');
    if (error) throw error;
    return data;
  }
};

// ============================================================
// FOTO / STORAGE HELPERS
// ============================================================

const Foto = {
  async upload(file, anggotaId, tipe = 'profil') {
    const ext = file.name.split('.').pop();
    const path = `${anggotaId}/${tipe}_${Date.now()}.${ext}`;

    const { error: uploadError } = await db.storage
      .from('foto-anggota')
      .upload(path, file, { upsert: true });
    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = db.storage
      .from('foto-anggota')
      .getPublicUrl(path);

    // Simpan referensi ke database
    const { data, error } = await db
      .from('foto_anggota')
      .insert({ anggota_id: anggotaId, url: publicUrl, tipe, storage_path: path })
      .select()
      .single();
    if (error) throw error;

    // Jika foto profil, update anggota
    if (tipe === 'profil') {
      await Anggota.update(anggotaId, { foto_profil_url: publicUrl });
    }

    return data;
  },

  async delete(fotoId, storagePath) {
    await db.storage.from('foto-anggota').remove([storagePath]);
    await db.from('foto_anggota').delete().eq('id', fotoId);
  }
};

// ============================================================
// NOTIFIKASI HELPERS
// ============================================================

const Notifikasi = {
  async getAll(limit = 20) {
    const { data, error } = await db
      .from('notifikasi')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return data;
  },

  async markRead(id) {
    const { error } = await db
      .from('notifikasi')
      .update({ dibaca: true })
      .eq('id', id);
    if (error) throw error;
  },

  async markAllRead() {
    const { error } = await db
      .from('notifikasi')
      .update({ dibaca: true })
      .eq('dibaca', false);
    if (error) throw error;
  },

  subscribeRealtime(callback) {
    return db
      .channel('notifikasi')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifikasi' }, callback)
      .subscribe();
  }
};

// ============================================================
// AUDIT LOG HELPERS
// ============================================================

const AuditLog = {
  async getAll(options = {}) {
    let query = db
      .from('audit_log')
      .select(`*, user:user_profiles(nama_lengkap, email)`)
      .order('created_at', { ascending: false });

    if (options.limit) query = query.limit(options.limit);
    if (options.tabel)  query = query.eq('tabel_nama', options.tabel);

    const { data, error } = await query;
    if (error) throw error;
    return data;
  }
};

// ============================================================
// UI TOAST NOTIFICATION
// ============================================================

const Toast = {
  show(message, type = 'info', duration = 3500) {
    const existing = document.getElementById('banitamhid-toast');
    if (existing) existing.remove();

    const colors = {
      success: '#22c55e',
      error:   '#ef4444',
      info:    '#3b82f6',
      warning: '#f59e0b'
    };
    const icons = { success: '✓', error: '✕', info: 'ℹ', warning: '⚠' };

    const toast = document.createElement('div');
    toast.id = 'banitamhid-toast';
    toast.style.cssText = `
      position:fixed; bottom:24px; right:24px; z-index:9999;
      background:#1e293b; color:#fff; padding:12px 20px;
      border-radius:10px; font-size:14px; display:flex;
      align-items:center; gap:10px; box-shadow:0 4px 20px rgba(0,0,0,.3);
      border-left:4px solid ${colors[type]};
      animation: slideIn .3s ease; max-width:340px;
    `;
    toast.innerHTML = `
      <style>@keyframes slideIn{from{transform:translateX(120%);opacity:0}to{transform:translateX(0);opacity:1}}</style>
      <span style="color:${colors[type]};font-size:16px;font-weight:700">${icons[type]}</span>
      <span>${message}</span>
    `;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), duration);
  },

  success(msg) { this.show(msg, 'success'); },
  error(msg)   { this.show(msg, 'error'); },
  info(msg)    { this.show(msg, 'info'); },
  warning(msg) { this.show(msg, 'warning'); }
};

// ============================================================
// EXPORT GLOBAL
// ============================================================
// Export dengan kedua nama agar kompatibel
window.BANITAMHID = { db, Auth, UserProfile, Anggota, Foto, Notifikasi, AuditLog, Toast };
window.BANITAMHID = window.BANITAMHID; // alias

})(); } // end guard
