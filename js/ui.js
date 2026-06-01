// ============================================================
// BAFITS — UI Helpers (sidebar, topbar, navigasi)
// Include setelah supabase.js di setiap halaman
// ============================================================

const UI = {

  // ── Render sidebar & topbar ke halaman ──
  async init(pageTitle = 'Dashboard', activeNav = 'dashboard') {
    // Cek auth
    const session = await BAFITS.Auth.requireAuth();
    if (!session) return;

    const user = await BAFITS.Auth.getUser();
    const profile = await BAFITS.UserProfile.getProfile(user.id);

    // Inject layout
    document.body.innerHTML = `
      <div class="app-shell">
        ${UI._sidebar(activeNav, profile)}
        <div class="main-wrap">
          ${UI._topbar(pageTitle, profile)}
          <div class="page-content" id="pageContent">
            ${document.body.innerHTML}
          </div>
        </div>
      </div>
      <div class="sidebar-overlay" onclick="UI.closeSidebar()" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.4);z-index:99;"></div>
    ` + document.body.innerHTML;

    this._bindEvents(profile);
    this._loadNotifBadge();
  },

  // ── Render sidebar HTML ──
  _sidebar(activeNav, profile) {
    const isAdmin = profile?.role === 'super_admin' || profile?.role === 'admin_keluarga';
    const isSuperAdmin = profile?.role === 'super_admin';

    const navItem = (href, icon, label, key, badge = '') => `
      <a href="${href}" class="nav-item ${activeNav === key ? 'active' : ''}">
        ${icon}
        <span>${label}</span>
        ${badge ? `<span class="nav-badge" id="badge-${key}">${badge}</span>` : ''}
      </a>
    `;

    return `
    <aside class="sidebar" id="sidebar">
      <div class="sidebar-logo">
        <div class="logo-icon">🌳</div>
        <div>
          <div class="logo-text">بني تمهيد</div>
          <div class="logo-sub">BAFITS</div>
        </div>
      </div>

      <nav class="sidebar-nav">
        <div class="nav-section">Utama</div>
        ${navItem('dashboard.html', icons.home, 'Dashboard', 'dashboard')}
        ${navItem('cari.html', icons.search, 'Cari Data', 'cari')}
        ${navItem('silsilah.html', icons.tree, 'Pohon Silsilah', 'silsilah')}

        <div class="nav-section">Master Data</div>
        ${navItem('anggota.html', icons.users, 'Anggota Keluarga', 'anggota')}
        ${navItem('pernikahan.html', icons.heart, 'Pernikahan', 'pernikahan')}
        ${navItem('kelahiran.html', icons.baby, 'Kelahiran', 'kelahiran')}
        ${navItem('kematian.html', icons.moon, 'Kematian', 'kematian')}

        <div class="nav-section">Lainnya</div>
        ${navItem('galeri.html', icons.photo, 'Galeri Foto', 'galeri')}
        ${navItem('laporan.html', icons.file, 'Laporan', 'laporan')}
        ${navItem('notifikasi.html', icons.bell, 'Notifikasi', 'notifikasi', '')}

        ${isAdmin ? `
        <div class="nav-section">Admin</div>
        ${navItem('pengaturan.html', icons.settings, 'Pengaturan', 'pengaturan')}
        ` : ''}

        ${isSuperAdmin ? `
        ${navItem('manajemen-user.html', icons.shield, 'Manajemen User', 'users')}
        ${navItem('pengaturan.html', icons.database, 'Backup & Pengaturan', 'backup')}
        ` : ''}
      </nav>

      <div class="sidebar-footer">
        <div class="user-chip">
          <div class="user-avatar">${(profile?.nama_lengkap || 'U')[0].toUpperCase()}</div>
          <div class="user-info">
            <div class="user-name">${profile?.nama_lengkap || 'Pengguna'}</div>
            <div class="user-role">${UI._roleLabel(profile?.role)}</div>
          </div>
          <button class="btn-logout" onclick="UI.logout()" title="Keluar">
            ${icons.logout}
          </button>
        </div>
      </div>
    </aside>
    <!-- Bottom Nav Mobile -->
    <nav class="mobile-bottom-nav" id="mobileBottomNav">
      <a href="dashboard.html" class="${activeNav === 'dashboard' ? 'active' : ''}">
        ${icons.home}<span>Beranda</span>
      </a>
      <a href="cari.html" class="${activeNav === 'cari' ? 'active' : ''}">
        ${icons.search}<span>Cari</span>
      </a>
      <a href="anggota.html" class="${activeNav === 'anggota' ? 'active' : ''}">
        ${icons.users}<span>Anggota</span>
      </a>
      <a href="notifikasi.html" class="${activeNav === 'notifikasi' ? 'active' : ''}">
        ${icons.bell}<span>Notif</span>
      </a>
      <a href="pengaturan.html" class="${activeNav === 'pengaturan' ? 'active' : ''}">
        ${icons.settings}<span>Lainnya</span>
      </a>
    </nav>`;
  },

  // ── Render topbar HTML ──
  _topbar(title, profile) {
    return `
    <header class="topbar">
      <button class="btn-icon" id="sidebarToggle" onclick="UI.toggleSidebar()" style="display:none">
        ${icons.menu}
      </button>
      <div class="topbar-title">${title}</div>
      <div class="topbar-actions">
        <button class="btn-icon" onclick="window.location.href='notifikasi.html'" title="Notifikasi">
          ${icons.bell}
          <span class="notif-dot" id="notifDot" style="display:none"></span>
        </button>
      </div>
    </header>`;
  },

  _roleLabel(role) {
    return { super_admin: 'Super Admin', admin_keluarga: 'Admin Keluarga', member: 'Member' }[role] || 'Member';
  },

  _bindEvents(profile) {
    // Responsive sidebar toggle
    const toggleBtn = document.getElementById('sidebarToggle');
    if (window.innerWidth <= 900 && toggleBtn) toggleBtn.style.display = 'flex';

    window.addEventListener('resize', () => {
      if (toggleBtn) toggleBtn.style.display = window.innerWidth <= 900 ? 'flex' : 'none';
    });

    // Logout
    window.UI = UI;
  },

  toggleSidebar() {
    const sidebar  = document.getElementById('sidebar');
    const overlay  = document.querySelector('.sidebar-overlay');
    sidebar.classList.toggle('open');
    if (overlay) overlay.style.display = sidebar.classList.contains('open') ? 'block' : 'none';
  },

  closeSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.querySelector('.sidebar-overlay');
    sidebar.classList.remove('open');
    if (overlay) overlay.style.display = 'none';
  },

  async logout() {
    try {
      await BAFITS.Auth.logout();
    } catch (e) {
      window.location.href = '../index.html';
    }
  },

  async _loadNotifBadge() {
    try {
      const { data } = await BAFITS.db
        .from('notifikasi')
        .select('id', { count: 'exact', head: true })
        .eq('dibaca', false);
      const dot = document.getElementById('notifDot');
      if (dot && data?.count > 0) dot.style.display = 'block';
    } catch (_) {}
  },

  // ── MODAL HELPERS ──
  openModal(id) {
    const el = document.getElementById(id);
    if (el) el.classList.add('show');
  },

  closeModal(id) {
    const el = document.getElementById(id);
    if (el) el.classList.remove('show');
  },

  // ── CONFIRM DIALOG ──
  confirm(message, onConfirm, confirmLabel = 'Hapus', type = 'danger') {
    const id = 'confirm-modal-' + Date.now();
    const el = document.createElement('div');
    el.id = id;
    el.className = 'modal-backdrop';
    el.innerHTML = `
      <div class="modal" style="max-width:420px">
        <div class="modal-header">
          <h3>Konfirmasi</h3>
          <button class="btn-icon" onclick="document.getElementById('${id}').remove()">
            ${icons.x}
          </button>
        </div>
        <div class="modal-body">
          <p style="font-size:14px;color:var(--text-mid);line-height:1.7">${message}</p>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary btn-sm" onclick="document.getElementById('${id}').remove()">Batal</button>
          <button class="btn btn-${type === 'danger' ? 'danger' : 'primary'} btn-sm" id="${id}-confirm">${confirmLabel}</button>
        </div>
      </div>`;
    document.body.appendChild(el);
    requestAnimationFrame(() => el.classList.add('show'));
    document.getElementById(`${id}-confirm`).onclick = () => { el.remove(); onConfirm(); };
  },

  // ── FORMAT HELPERS ──
  formatDate(dateStr) {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  },

  formatAge(tanggalLahir, tanggalWafat = null) {
    if (!tanggalLahir) return '—';
    const end = tanggalWafat ? new Date(tanggalWafat) : new Date();
    const age = Math.floor((end - new Date(tanggalLahir)) / (365.25 * 24 * 3600 * 1000));
    return age + ' tahun';
  },

  inisial(nama) {
    if (!nama) return '?';
    return nama.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
  },

  // ── LOADING STATE ──
  setLoading(btnEl, loading) {
    if (loading) {
      btnEl.classList.add('loading');
      btnEl.disabled = true;
    } else {
      btnEl.classList.remove('loading');
      btnEl.disabled = false;
    }
  },

  // ── SKELETON TABLE ROWS ──
  skeletonRows(cols = 5, rows = 6) {
    return Array(rows).fill('').map(() => `
      <tr>${Array(cols).fill('').map(() => `
        <td><div class="skeleton" style="height:16px;width:${60+Math.random()*30}%"></div></td>
      `).join('')}</tr>
    `).join('');
  },

  // ── TABS ──
  initTabs(containerEl) {
    const btns  = containerEl.querySelectorAll('.tab-btn');
    const panes = containerEl.querySelectorAll('.tab-pane');
    btns.forEach(btn => {
      btn.addEventListener('click', () => {
        btns.forEach(b => b.classList.remove('active'));
        panes.forEach(p => p.classList.remove('active'));
        btn.classList.add('active');
        const target = containerEl.querySelector('#' + btn.dataset.tab);
        if (target) target.classList.add('active');
      });
    });
  }
};

// ── SVG ICONS (centralized) ──
const icons = {
  home:     `<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`,
  users:    `<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
  tree:     `<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="23" y1="11" x2="17" y2="11"/><line x1="20" y1="8" x2="20" y2="14"/></svg>`,
  heart:    `<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>`,
  baby:     `<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M12 14c-5.33 0-8 2.67-8 4v2h16v-2c0-1.33-2.67-4-8-4z"/></svg>`,
  moon:     `<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`,
  photo:    `<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>`,
  file:     `<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>`,
  bell:     `<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>`,
  settings: `<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`,
  shield:   `<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`,
  database: `<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>`,
  logout:   `<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>`,
  menu:     `<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>`,
  plus:     `<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`,
  edit:     `<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`,
  trash:    `<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>`,
  eye:      `<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`,
  x:        `<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
  search:   `<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`,
  cari:     `<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>`,
  download: `<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`,
  chart:    `<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>`,
  refresh:  `<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>`,
  upload:   `<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/></svg>`,
  check:    `<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>`,
  info:     `<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
};

window.UI = UI;
window.icons = icons;
