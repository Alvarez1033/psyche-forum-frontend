/* ============================================================
   PSYCHE — localStorage Persistence Layer
   Saves/loads all user data so nothing is lost on refresh.
   Runs AFTER profile.js (needs PSYCHE to exist).
   ============================================================ */

const PSYCHE_STORE = {
  KEYS: {
    users:       'psyche_users',
    currentUser: 'psyche_current_user_id',
    siteState:   'psyche_site_state',
    flagged:     'psyche_flagged_content',
  },

  // ---- SAVE ----

  saveUsers() {
    try {
      localStorage.setItem(this.KEYS.users, JSON.stringify(PSYCHE.users));
    } catch(e) { console.warn('PSYCHE storage: could not save users', e); }
  },

  saveCurrentUser() {
    try {
      if (PSYCHE.currentUser) {
        localStorage.setItem(this.KEYS.currentUser, PSYCHE.currentUser.id);
      } else {
        localStorage.removeItem(this.KEYS.currentUser);
      }
    } catch(e) { console.warn('PSYCHE storage: could not save session', e); }
  },

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
    this.saveUsers();
    this.saveCurrentUser();
    this.saveSiteState();
    this.saveFlagged();
  },

  // ---- LOAD ----

  loadUsers() {
    try {
      const raw = localStorage.getItem(this.KEYS.users);
      if (!raw) return false;
      const saved = JSON.parse(raw);

      // Merge saved users into PSYCHE.users
      // Superadmin is always seeded from code — never overwrite its password/role
      Object.entries(saved).forEach(([id, user]) => {
        if (id === 'u_superadmin') {
          // Keep hardcoded superadmin credentials but restore other fields
          const existing = PSYCHE.users['u_superadmin'];
          PSYCHE.users['u_superadmin'] = Object.assign({}, user, {
            email:    existing.email,
            password: existing.password,
            role:     'superadmin',
          });
        } else {
          PSYCHE.users[id] = user;
        }
      });
      return true;
    } catch(e) {
      console.warn('PSYCHE storage: could not load users', e);
      return false;
    }
  },

  loadSession() {
    try {
      const uid = localStorage.getItem(this.KEYS.currentUser);
      if (uid && PSYCHE.users[uid]) {
        PSYCHE.currentUser = PSYCHE.users[uid];
        return true;
      }
    } catch(e) {}
    return false;
  },

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

  // ---- PATCH PSYCHE METHODS to auto-save ----

  install() {
    const store = this;

    // Patch: createUser
    const _createUser = PSYCHE.createUser.bind(PSYCHE);
    PSYCHE.createUser = function(data) {
      const user = _createUser(data);
      store.saveUsers();
      return user;
    };

    // Patch: signup (save session when new user is created)
    const _signup = PSYCHE.signup.bind(PSYCHE);
    PSYCHE.signup = function(data) {
      const result = _signup(data);
      if (result.success) {
        store.saveUsers();
        store.saveCurrentUser();
      }
      return result;
    };

    // Patch: login
    const _login = PSYCHE.login.bind(PSYCHE);
    PSYCHE.login = function(emailOrUsername, password) {
      const result = _login(emailOrUsername, password);
      if (result.success) store.saveCurrentUser();
      return result;
    };

    // Patch: logout
    const _logout = PSYCHE.logout.bind(PSYCHE);
    PSYCHE.logout = function() {
      _logout();
      store.saveCurrentUser();
    };

    // Patch: updateProfile
    const _updateProfile = PSYCHE.updateProfile.bind(PSYCHE);
    PSYCHE.updateProfile = function(fields) {
      const result = _updateProfile(fields);
      store.saveUsers();
      return result;
    };

    // Patch: updateSettings
    const _updateSettings = PSYCHE.updateSettings.bind(PSYCHE);
    PSYCHE.updateSettings = function(settings) {
      const result = _updateSettings(settings);
      store.saveUsers();
      return result;
    };

    // Patch: updateAvatar
    const _updateAvatar = PSYCHE.updateAvatar.bind(PSYCHE);
    PSYCHE.updateAvatar = function(color) {
      _updateAvatar(color);
      store.saveUsers();
    };

    // Patch: assignRole
    const _assignRole = PSYCHE.assignRole.bind(PSYCHE);
    PSYCHE.assignRole = function(targetId, newRole) {
      const result = _assignRole(targetId, newRole);
      if (result.success) store.saveUsers();
      return result;
    };

    // Patch: setBanned
    const _setBanned = PSYCHE.setBanned.bind(PSYCHE);
    PSYCHE.setBanned = function(targetId, banned) {
      const result = _setBanned(targetId, banned);
      if (result.success) store.saveUsers();
      return result;
    };

    console.log('[Psyche] Storage layer installed.');
  },

  // ---- BOOTSTRAP ----

  init() {
    // 1. Load saved users (merges over seeded demo users)
    const hadData = this.loadUsers();

    // 2. Load saved site state + flagged content
    this.loadSiteState();
    this.loadFlagged();

    // 3. Restore session (auto-login if they were logged in before)
    const restored = this.loadSession();
    if (restored) {
      // Update nav to reflect restored login
      PSYCHE._updateNav();
      // Show announcement if active
      if (typeof updateSiteAnnouncement === 'function') {
        updateSiteAnnouncement();
      }
    }

    // 4. Patch all PSYCHE methods to auto-save
    this.install();
    // 5. Load shop + tickets (these scripts load before storage.js)
    // Using setTimeout to ensure shop/ticket objects are initialized
    setTimeout(() => {
      if (typeof PSYCHE_SHOP !== 'undefined') PSYCHE_SHOP.load();
      if (typeof PSYCHE_TICKETS !== 'undefined') PSYCHE_TICKETS.load();
      if (typeof PSYCHE_ROLES !== 'undefined') PSYCHE_ROLES.init();
    }, 0);

    if (hadData) {
      console.log(`[Psyche] Restored ${Object.keys(PSYCHE.users).length} users from storage.`);
    }
  },

  // ---- UTILS ----

  // Clear everything — useful for debugging or "factory reset"
  clear() {
    Object.values(this.KEYS).forEach(k => localStorage.removeItem(k));
    console.log('[Psyche] Storage cleared. Reload to start fresh.');
  },

  // Get storage usage info
  info() {
    const used = Object.values(this.KEYS).reduce((total, k) => {
      return total + (localStorage.getItem(k)?.length || 0);
    }, 0);
    return {
      users: Object.keys(PSYCHE.users).length,
      currentUser: PSYCHE.currentUser?.username || null,
      storageSizeKB: (used / 1024).toFixed(1),
    };
  }
};

// ---- AUTO-INIT on DOMContentLoaded ----
document.addEventListener('DOMContentLoaded', () => {
  PSYCHE_STORE.init();
});
