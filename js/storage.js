/* ============================================================
   PSYCHE — Persistence Layer (API-backed)
   Restores session from JWT tokens on page load.
   Patches PSYCHE methods to call the backend API.
   localStorage is used ONLY for JWT tokens + UI prefs.
   ============================================================ */

const PSYCHE_STORE = {
  KEYS: {
    siteState:   'psyche_site_state',
    flagged:     'psyche_flagged_content',
  },

  // ---- LOCAL-ONLY SAVES (UI state, not user data) ----

  saveSiteState() {
    try {
      if (typeof SITE_STATE !== 'undefined') {
        localStorage.setItem(this.KEYS.siteState, JSON.stringify(SITE_STATE));
      }
    } catch(e) {}
  },

  saveFlagged() {
    try {
      if (typeof FLAGGED_CONTENT !== 'undefined') {
        localStorage.setItem(this.KEYS.flagged, JSON.stringify(FLAGGED_CONTENT));
      }
    } catch(e) {}
  },

  saveAll() {
    this.saveSiteState();
    this.saveFlagged();
  },

  // Keep saveUsers/saveCurrentUser as no-ops for backward compat
  saveUsers()      {},
  saveCurrentUser() {},

  // ---- LOAD LOCAL STATE ----

  loadSiteState() {
    try {
      const raw = localStorage.getItem(this.KEYS.siteState);
      if (raw && typeof SITE_STATE !== 'undefined') {
        Object.assign(SITE_STATE, JSON.parse(raw));
      }
    } catch(e) {}
  },

  loadFlagged() {
    try {
      const raw = localStorage.getItem(this.KEYS.flagged);
      if (raw && typeof FLAGGED_CONTENT !== 'undefined') {
        const saved = JSON.parse(raw);
        FLAGGED_CONTENT.length = 0;
        saved.forEach(f => FLAGGED_CONTENT.push(f));
      }
    } catch(e) {}
  },

  // ---- PATCH PSYCHE METHODS to use API ----

  install() {
    // Patch: signup — call API
    PSYCHE.signup = async function(data) {
      if (!data.email || !data.password || !data.username) {
        return { success: false, error: 'Please fill in all required fields.' };
      }
      if (data.password.length < 8) {
        return { success: false, error: 'Password must be at least 8 characters.' };
      }
      try {
        const res = await API.signup({
          username: data.username,
          email:    data.email,
          password: data.password,
          name:     data.displayName || data.username,
        });
        const user = PSYCHE._mapApiUser(res.user);
        PSYCHE.users[user.id] = user;
        PSYCHE.currentUser = user;
        PSYCHE._updateNav();
        return { success: true, user };
      } catch(err) {
        return { success: false, error: err.message };
      }
    };

    // Patch: login — call API
    PSYCHE.login = async function(emailOrUsername, password) {
      try {
        const res = await API.login(emailOrUsername, password);
        const user = PSYCHE._mapApiUser(res.user);
        PSYCHE.users[user.id] = user;
        PSYCHE.currentUser = user;
        PSYCHE._updateNav();
        return { success: true, user };
      } catch(err) {
        return { success: false, error: err.message };
      }
    };

    // Patch: logout — call API
    PSYCHE.logout = async function() {
      try { await API.logout(); } catch {}
      Auth.clear();
      PSYCHE.currentUser = null;
      PSYCHE._updateNav();
      navigateTo('page-home');
      showToast('Signed out successfully.');
    };

    // Patch: updateProfile — call API then update local
    const _origUpdateProfile = PSYCHE.updateProfile.bind(PSYCHE);
    PSYCHE.updateProfile = async function(fields) {
      // Update locally first for immediate UI feedback
      _origUpdateProfile(fields);
      try {
        const apiFields = {};
        if (fields.displayName !== undefined) apiFields.name = fields.displayName;
        if (fields.bio !== undefined) apiFields.bio = fields.bio;
        if (fields.interests !== undefined) apiFields.interests = fields.interests;
        if (fields.avatarColor !== undefined) apiFields.avatar_color = fields.avatarColor;
        if (Object.keys(apiFields).length) {
          await API.updateProfile(apiFields);
        }
      } catch(err) {
        console.warn('Profile update API failed:', err.message);
      }
      return PSYCHE.currentUser;
    };

    // Patch: updateAvatar — call API
    const _origUpdateAvatar = PSYCHE.updateAvatar.bind(PSYCHE);
    PSYCHE.updateAvatar = async function(color) {
      _origUpdateAvatar(color);
      try { await API.updateProfile({ avatar_color: color }); } catch {}
    };

    // Patch: assignRole — call API
    PSYCHE.assignRole = async function(targetId, newRole) {
      try {
        await API.setUserRole(targetId, newRole, '');
        const target = PSYCHE.users[targetId];
        if (target) target.role = newRole;
        return { success: true };
      } catch(err) {
        return { success: false, error: err.message };
      }
    };

    // Patch: setBanned — call API
    PSYCHE.setBanned = async function(targetId, banned) {
      try {
        await API.setUserBan(targetId, banned, '');
        const target = PSYCHE.users[targetId];
        if (target) target.banned = banned;
        return { success: true };
      } catch(err) {
        return { success: false, error: err.message };
      }
    };

    console.log('[Psyche] API-backed storage layer installed.');
  },

  // ---- BOOTSTRAP ----

  async init() {
    // 1. Load local-only state (site settings, flagged content)
    this.loadSiteState();
    this.loadFlagged();

    // 2. Restore session from JWT tokens
    if (Auth.isLoggedIn()) {
      try {
        const user = await API.me();
        const mapped = PSYCHE._mapApiUser(user);
        PSYCHE.users[mapped.id] = mapped;
        PSYCHE.currentUser = mapped;
        PSYCHE._updateNav();
        if (typeof updateSiteAnnouncement === 'function') {
          updateSiteAnnouncement();
        }
        console.log('[Psyche] Session restored from API.');
      } catch(err) {
        console.warn('[Psyche] Session restore failed:', err.message);
        Auth.clear();
      }
    }

    // 3. Patch PSYCHE methods to use API
    this.install();

    // 4. Load shop + tickets (localStorage-based, kept as-is)
    setTimeout(() => {
      if (typeof PSYCHE_SHOP !== 'undefined') PSYCHE_SHOP.load();
      if (typeof PSYCHE_TICKETS !== 'undefined') PSYCHE_TICKETS.load();
      if (typeof PSYCHE_ROLES !== 'undefined') PSYCHE_ROLES.init();
    }, 0);
  },

  // ---- UTILS ----

  clear() {
    Auth.clear();
    Object.values(this.KEYS).forEach(k => localStorage.removeItem(k));
    console.log('[Psyche] Storage cleared. Reload to start fresh.');
  },

  info() {
    return {
      users: Object.keys(PSYCHE.users).length,
      currentUser: PSYCHE.currentUser?.username || null,
      loggedIn: Auth.isLoggedIn(),
    };
  }
};

// ---- AUTO-INIT on DOMContentLoaded ----
document.addEventListener('DOMContentLoaded', () => {
  PSYCHE_STORE.init();
});
