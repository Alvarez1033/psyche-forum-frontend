/* ============================================================
   PSYCHE — Advanced Role System
   Features:
   - Permission-based roles (not just hierarchy)
   - Role inheritance (a role can inherit from parent roles)
   - Custom display names per role
   - User-specific display name override
   - Superadmin: create/edit/delete/assign any role
   - Admin: assign roles up to their own level
   ============================================================ */

// ---- ALL AVAILABLE PERMISSIONS ----
const PSYCHE_PERMISSIONS = {
  // Content
  'post.create':       { label: 'Create Posts',         group: 'Content',       desc: 'Publish blog posts and articles' },
  'post.edit.own':     { label: 'Edit Own Posts',        group: 'Content',       desc: 'Edit posts you authored' },
  'post.edit.any':     { label: 'Edit Any Post',         group: 'Content',       desc: 'Edit any post on the platform' },
  'post.delete.own':   { label: 'Delete Own Posts',      group: 'Content',       desc: 'Delete posts you authored' },
  'post.delete.any':   { label: 'Delete Any Post',       group: 'Content',       desc: 'Delete any post on the platform' },
  'post.pin':          { label: 'Pin Posts',             group: 'Content',       desc: 'Pin posts to the top of feeds' },
  'post.feature':      { label: 'Feature Posts',         group: 'Content',       desc: 'Mark posts as featured/editor picks' },
  // Forum / Discussions
  'discuss.create':    { label: 'Start Discussions',     group: 'Forum',         desc: 'Post in the forum/discussions area' },
  'discuss.reply':     { label: 'Reply to Discussions',  group: 'Forum',         desc: 'Comment and reply in discussions' },
  'discuss.vote':      { label: 'Vote on Posts',         group: 'Forum',         desc: 'Upvote and downvote posts and comments' },
  // Moderation
  'mod.flag.review':   { label: 'Review Flagged Content',group: 'Moderation',    desc: 'See and act on flagged posts/comments' },
  'mod.remove':        { label: 'Remove Content',        group: 'Moderation',    desc: 'Remove posts and comments' },
  'mod.ban':           { label: 'Ban Users',             group: 'Moderation',    desc: 'Ban and suspend user accounts' },
  'mod.warn':          { label: 'Warn Users',            group: 'Moderation',    desc: 'Issue warnings to users' },
  // Users
  'users.view':        { label: 'View User Profiles',    group: 'Users',         desc: 'View all user profiles and details' },
  'users.edit':        { label: 'Edit User Profiles',    group: 'Users',         desc: 'Edit other users\' profile data' },
  'users.roles.assign':{ label: 'Assign Roles',          group: 'Users',         desc: 'Assign roles to other users' },
  // Post workflow
  'post.review':         { label: 'Review Posts',          group: 'Content',    desc: 'Review pending posts and leave internal notes' },
  'post.comment.internal':{ label: 'Internal Comments',    group: 'Content',    desc: 'Leave invisible editor notes on posts' },
  'post.ghost':          { label: 'Ghost Posts',           group: 'Moderation', desc: 'Hide a post from public without notifying author' },
  'post.temp_remove':    { label: 'Temporarily Remove',    group: 'Moderation', desc: 'Temporarily remove a post (author notified)' },
  'post.approve':        { label: 'Approve Posts',         group: 'Moderation', desc: 'Approve pending blog posts' },
  // Support
  'support.view_tickets':  { label: 'View Support Tickets',  group: 'Support', desc: 'View and manage user support tickets' },
  'support.respond':       { label: 'Respond to Tickets',    group: 'Support', desc: 'Send responses to support tickets' },
  'support.close_tickets': { label: 'Close Tickets',         group: 'Support', desc: 'Mark tickets as resolved or closed' },
  'support.shop_orders':   { label: 'View Shop Orders',      group: 'Support', desc: 'View order details for support purposes' },
  // Privacy tiers (what user info staff can see)
  'users.support_info':    { label: 'Support-Level User Info', group: 'Users', desc: 'View username, email, join date, ticket history, order status (no card details)' },
  'users.mod_info':        { label: 'Moderator-Level User Info', group: 'Users', desc: 'Support info + post history, bans, warnings, IP region' },
  'users.admin_info':      { label: 'Admin-Level User Info',  group: 'Users', desc: 'Mod info + account flags, login history, full order history' },
  'users.full_info':       { label: 'Full User Info',         group: 'Users', desc: 'All info (superadmin only). Excludes raw card/payment data.' },
  // Forum
  'forum.post.approve':  { label: 'Approve Forum Posts',   group: 'Forum',      desc: 'Approve guest/member forum posts' },
  // Admin
  'admin.panel':       { label: 'Access Admin Panel',    group: 'Admin',         desc: 'Access the admin dashboard' },
  'admin.roles.manage':{ label: 'Manage Roles',          group: 'Admin',         desc: 'Create, edit and delete roles (superadmin only)' },
  'admin.settings':    { label: 'Site Settings',         group: 'Admin',         desc: 'Change site-wide settings and announcements' },
  'admin.stats':       { label: 'View Site Stats',       group: 'Admin',         desc: 'View analytics and site statistics' },
};

// ---- DEFAULT ROLE DEFINITIONS ----
const DEFAULT_ROLES = {
  guest: {
    id: 'guest', name: 'Guest', displayName: 'Guest',
    color: '#6b7280', bg: '#f3f4f6', level: 0, protected: true,
    inherits: [], isDefault: true,
    permissions: ['discuss.create', 'discuss.reply', 'discuss.vote'],
    description: 'Registered but has not completed the signup checklist. Forum posts require approval.',
  },
  member: {
    id: 'member', name: 'Member', displayName: 'Member',
    color: '#4f5d6e', bg: '#edf0f3', level: 1, protected: true,
    inherits: ['guest'],
    permissions: ['discuss.create', 'discuss.reply', 'discuss.vote', 'post.edit.own', 'post.delete.own'],
    description: 'Completed signup checklist. Forum posts have a short approval timer.',
    isDefault: false,
  },
  verified: {
    id: 'verified', name: 'Verified', displayName: 'Verified',
    color: '#0369a1', bg: '#dbeafe', level: 2, protected: true,
    inherits: ['member'],
    permissions: ['discuss.create', 'discuss.reply', 'discuss.vote', 'post.edit.own', 'post.delete.own'],
    description: 'Email verified and staff approved. Forum posts auto-approved.',
    isDefault: false,
  },
  pro: {
    id: 'pro', name: 'Pro', displayName: 'Pro',
    color: '#7c3aed', bg: '#ede9fe', level: 3, protected: true,
    inherits: ['verified'],
    permissions: ['discuss.create', 'discuss.reply', 'discuss.vote', 'post.edit.own', 'post.delete.own'],
    description: 'Premium tier 1 member.',
    isDefault: false,
  },
  premium: {
    id: 'premium', name: 'Premium', displayName: 'Premium ✦',
    color: '#b45309', bg: '#fef3c7', level: 4, protected: true,
    inherits: ['pro'],
    permissions: ['discuss.create', 'discuss.reply', 'discuss.vote', 'post.edit.own', 'post.delete.own'],
    description: 'Premium tier 2 member.',
    isDefault: false,
  },
  support_agent: {
    id: 'support_agent', name: 'Support Agent', displayName: 'Support Agent',
    color: '#0891b2', bg: '#cffafe', level: 5, protected: true,
    inherits: ['premium'],
    permissions: [
      'discuss.create', 'discuss.reply', 'discuss.vote',
      'post.edit.own', 'post.delete.own',
      'support.view_tickets', 'support.respond', 'support.close_tickets',
      'users.view', 'users.support_info',
    ],
    description: 'Handles support tickets and shop-related customer assistance.',
    isDefault: false,
  },
  contributor: {
    id: 'contributor', name: 'Contributor', displayName: 'Contributor',
    color: '#1d6fa4', bg: '#ddeef8', level: 6, protected: true,
    inherits: ['support_agent'],
    permissions: ['post.create', 'post.edit.own', 'post.delete.own', 'discuss.create', 'discuss.reply', 'discuss.vote'],
    description: 'Can publish blog posts (pending approval by editors/admins).',
    isDefault: false,
  },
  author: {
    id: 'author', name: 'Author', displayName: 'Author',
    color: '#0d7c6e', bg: '#e0f4f1', level: 7, protected: true,
    inherits: ['contributor'],
    permissions: ['post.create', 'post.edit.own', 'post.delete.own', 'post.feature'],
    description: 'Trusted writer. Posts pending approval.',
    isDefault: false,
  },
  editor: {
    id: 'editor', name: 'Editor', displayName: 'Editor',
    color: '#7c3aed', bg: '#ede9fe', level: 8, protected: true,
    inherits: ['author'],
    permissions: ['post.create', 'post.edit.own', 'post.edit.any', 'post.delete.own', 'post.feature', 'post.pin', 'post.review', 'post.comment.internal'],
    description: 'Can review posts, leave internal comments, flag for needs-review.',
    isDefault: false,
  },
  moderator: {
    id: 'moderator', name: 'Moderator', displayName: 'Moderator',
    color: '#b45309', bg: '#fef3c7', level: 9, protected: true,
    inherits: ['editor'],
    permissions: ['post.create', 'post.edit.any', 'post.delete.any', 'post.pin', 'post.feature', 'post.ghost', 'mod.flag.review', 'mod.remove', 'mod.warn', 'mod.ban', 'users.view', 'users.support_info', 'users.mod_info', 'support.view_tickets', 'support.respond', 'support.close_tickets', 'admin.panel', 'admin.stats'],
    description: 'Can ghost posts and manage community content.',
    isDefault: false,
  },
  admin: {
    id: 'admin', name: 'Admin', displayName: 'Admin',
    color: '#0369a1', bg: '#e0f2fe', level: 10, protected: true,
    inherits: ['moderator'],
    permissions: ['post.create', 'post.edit.any', 'post.delete.any', 'post.pin', 'post.feature', 'post.ghost', 'post.temp_remove', 'post.approve', 'mod.flag.review', 'mod.remove', 'mod.ban', 'mod.warn', 'users.view', 'users.edit', 'users.roles.assign', 'users.support_info', 'users.mod_info', 'users.admin_info', 'support.view_tickets', 'support.respond', 'support.close_tickets', 'support.shop_orders', 'admin.panel', 'admin.settings', 'admin.stats', 'shop.manage'],
    description: 'Full admin. Auto-approves own blog posts. Can temp-remove and delete posts.',
    isDefault: false,
  },
  superadmin: {
    id: 'superadmin', name: 'Superadmin', displayName: 'Superadmin',
    color: '#7c2d12', bg: '#fff1f2', level: 99, protected: true,
    inherits: ['admin'],
    permissions: Object.keys(PSYCHE_PERMISSIONS),
    description: 'Full unrestricted access. Site owner.',
    isDefault: false,
  },
};

// ---- ROLE ENGINE ----
const PSYCHE_ROLES = {

  // Live role store (can be extended with custom roles)
  roles: {},

  // ---- INIT ----
  init() {
    // Load from localStorage or seed defaults
    const saved = this._load();
    if (saved && Object.keys(saved).length > 0) {
      // Merge saved with defaults (defaults always keep protected=true)
      this.roles = saved;
      // Re-apply default protected roles (don't let storage corrupt them)
      Object.values(DEFAULT_ROLES).forEach(r => {
        if (r.protected) this.roles[r.id] = { ...r, ...this.roles[r.id], protected: true, permissions: [...new Set([...r.permissions, ...(this.roles[r.id]?.extraPermissions || [])])] };
      });
    } else {
      // Fresh install — seed defaults
      this.roles = { ...DEFAULT_ROLES };
    }
    // Sync into legacy PSYCHE.roles for backward compat
    this._syncLegacy();
    this._save();
  },

  // ---- GET ROLE ----
  get(roleId) {
    return this.roles[roleId] || this.roles['member'];
  },

  getAll() {
    return Object.values(this.roles).sort((a, b) => a.level - b.level);
  },

  // ---- RESOLVE PERMISSIONS (including inheritance) ----
  resolvePermissions(roleId) {
    const seen = new Set();
    const perms = new Set();
    const resolve = (id) => {
      if (seen.has(id)) return; // prevent circular
      seen.add(id);
      const role = this.roles[id];
      if (!role) return;
      // Inherit from parent roles first
      (role.inherits || []).forEach(parentId => resolve(parentId));
      // Then add own permissions
      (role.permissions || []).forEach(p => perms.add(p));
    };
    resolve(roleId);
    return perms;
  },

  // ---- CHECK PERMISSION ----
  // Pass a user object or use PSYCHE.currentUser
  can(permission, user) {
    const u = user || PSYCHE.currentUser;
    if (!u) return false;
    // Superadmin always has everything
    if (u.role === 'superadmin') return true;
    // Check user's role permissions (including inherited)
    const perms = this.resolvePermissions(u.role);
    return perms.has(permission);
  },

  // Shorthand helpers
  canPost(u)        { return this.can('post.create', u); },
  canManageShop(u)  { return this.can('shop.manage', u) || this.isSuperAdmin(u); },
  privacyLevel(u)   {
    const usr = u || PSYCHE.currentUser;
    if (!usr) return 0;
    if (this.can('users.full_info', usr))    return 4; // superadmin
    if (this.can('users.admin_info', usr))   return 3; // admin
    if (this.can('users.mod_info', usr))     return 2; // mod
    if (this.can('users.support_info', usr)) return 1; // support agent
    return 0;
  },
  canAutoApprovePost(u) { const usr = u || PSYCHE.currentUser; return (this.roles[usr?.role]?.level || 0) >= 9; }, // admin+
  canAutoApproveForumPost(u) { const usr = u || PSYCHE.currentUser; return (this.roles[usr?.role]?.level || 0) >= 2; }, // verified+
  getForumPostApprovalMode(u) {
    const usr = u || PSYCHE.currentUser;
    if (!usr) return 'guest_approval';
    const lvl = this.roles[usr.role]?.level || 0;
    if (lvl >= 2) return 'auto';       // verified+: instant
    if (lvl >= 1) return 'timer';      // member: short timer (10 min)
    return 'approval';                 // guest: manual approval
  },
  canDiscuss(u)     { return this.can('discuss.create', u); },
  canModerate(u)    { return this.can('mod.flag.review', u); },
  canAccessAdmin(u) { return this.can('admin.panel', u); },
  isAdmin(u)        { return this.can('admin.settings', u); },
  isSuperAdmin(u)   { const usr = u || PSYCHE.currentUser; return usr?.role === 'superadmin'; },
  isMod(u)          { return this.can('mod.remove', u); },

  // ---- CREATE ROLE (superadmin only) ----
  createRole({ name, displayName, color, bg, level, inherits, permissions, description }) {
    if (!this.isSuperAdmin()) return { success: false, error: 'Only superadmin can create roles.' };
    if (!name?.trim()) return { success: false, error: 'Role name is required.' };
    const id = name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
    if (this.roles[id]) return { success: false, error: 'A role with that name already exists.' };

    this.roles[id] = {
      id,
      name: name.trim(),
      displayName: displayName?.trim() || name.trim(),
      color: color || '#4f5d6e',
      bg: bg || '#edf0f3',
      level: parseInt(level) || 1,
      protected: false,
      inherits: inherits || [],
      permissions: permissions || [],
      description: description || '',
      isDefault: false,
      createdAt: new Date().toISOString(),
    };
    this._syncLegacy();
    this._save();
    return { success: true, role: this.roles[id] };
  },

  // ---- EDIT ROLE ----
  editRole(roleId, updates) {
    if (!this.isSuperAdmin()) return { success: false, error: 'Only superadmin can edit roles.' };
    const role = this.roles[roleId];
    if (!role) return { success: false, error: 'Role not found.' };

    const allowed = ['displayName','color','bg','level','inherits','permissions','description','extraPermissions'];
    allowed.forEach(k => { if (updates[k] !== undefined) role[k] = updates[k]; });
    // Protected roles can't have name changed
    if (!role.protected && updates.name) role.name = updates.name;
    this._syncLegacy();
    this._save();
    return { success: true, role };
  },

  // ---- DELETE ROLE ----
  deleteRole(roleId) {
    if (!this.isSuperAdmin()) return { success: false, error: 'Only superadmin can delete roles.' };
    const role = this.roles[roleId];
    if (!role) return { success: false, error: 'Role not found.' };
    if (role.protected) return { success: false, error: 'Default roles cannot be deleted.' };
    // Move users with this role back to member
    Object.values(PSYCHE.users).forEach(u => { if (u.role === roleId) u.role = 'member'; });
    delete this.roles[roleId];
    this._syncLegacy();
    this._save();
    return { success: true };
  },

  // ---- ASSIGN ROLE to user ----
  assignRole(targetUserId, newRoleId, actor) {
    const me = actor || PSYCHE.currentUser;
    if (!me) return { success: false, error: 'Not logged in.' };
    const target = PSYCHE.users[targetUserId];
    if (!target) return { success: false, error: 'User not found.' };
    if (target.role === 'superadmin') return { success: false, error: 'Cannot modify the superadmin.' };
    const newRole = this.roles[newRoleId];
    if (!newRole) return { success: false, error: 'Role not found.' };
    // Superadmin can assign any role
    if (this.isSuperAdmin(me)) {
      target.role = newRoleId;
      if (typeof PSYCHE_STORE !== 'undefined') PSYCHE_STORE.saveUsers();
      return { success: true };
    }
    // Admin can assign up to but not including admin level
    if (this.can('users.roles.assign', me)) {
      const myLevel = this.roles[me.role]?.level || 0;
      if (newRole.level >= myLevel) return { success: false, error: 'Cannot assign a role equal to or above your own.' };
      target.role = newRoleId;
      if (typeof PSYCHE_STORE !== 'undefined') PSYCHE_STORE.saveUsers();
      return { success: true };
    }
    return { success: false, error: 'Insufficient permissions to assign roles.' };
  },

  // ---- GET ROLE DISPLAY NAME for a user ----
  // Users can have a custom display role name override
  getDisplayRole(user) {
    if (!user) return null;
    // User-level override (e.g. "Chief Editor", "Founder")
    if (user.roleDisplayOverride) return {
      label: user.roleDisplayOverride,
      color: user.roleDisplayColor || this.get(user.role).color,
      bg:    user.roleDisplayBg    || this.get(user.role).bg,
    };
    // Role default display
    const role = this.get(user.role);
    return { label: role.displayName || role.name, color: role.color, bg: role.bg };
  },

  // ---- SYNC legacy PSYCHE.roles for backward compat ----
  _syncLegacy() {
    if (typeof PSYCHE !== 'undefined') {
      PSYCHE.roles = {};
      Object.values(this.roles).forEach(r => {
        PSYCHE.roles[r.id] = { label: r.displayName || r.name, color: r.color, bg: r.bg, level: r.level };
      });
      // Update PSYCHE helper methods to use new engine
      PSYCHE.canPost        = (u) => PSYCHE_ROLES.canPost(u);
      PSYCHE.canDiscuss     = (u) => PSYCHE_ROLES.canDiscuss(u);
      PSYCHE.canAccessAdmin = (u) => PSYCHE_ROLES.canAccessAdmin(u);
      PSYCHE.isAdmin        = (u) => PSYCHE_ROLES.isAdmin(u);
      PSYCHE.isMod          = (u) => PSYCHE_ROLES.isMod(u);
      PSYCHE.isSuperAdmin   = (u) => PSYCHE_ROLES.isSuperAdmin(u);
      PSYCHE.can            = (perm, u) => PSYCHE_ROLES.can(perm, u);
      PSYCHE.assignRole     = (targetId, roleId) => PSYCHE_ROLES.assignRole(targetId, roleId);
    }
  },

  // ---- PERSISTENCE ----
  _save() {
    try { localStorage.setItem('psyche_roles', JSON.stringify(this.roles)); } catch(e) {}
  },
  _load() {
    try {
      const raw = localStorage.getItem('psyche_roles');
      return raw ? JSON.parse(raw) : null;
    } catch(e) { return null; }
  },
};

// ---- ROLE MANAGER UI (for Admin Panel) ----
function renderRoleManagerSection(isSA) {
  const roles = PSYCHE_ROLES.getAll();
  const permGroups = {};
  Object.entries(PSYCHE_PERMISSIONS).forEach(([key, val]) => {
    if (!permGroups[val.group]) permGroups[val.group] = [];
    permGroups[val.group].push({ key, ...val });
  });

  return `
    <div class="role-manager">

      <!-- Role list -->
      <div class="role-manager-left">
        <div class="admin-card-title">All Roles</div>
        <div class="role-list" id="role-list">
          ${roles.map(r => `
            <div class="role-list-item ${r.protected?'role-list-item--protected':''}" data-role-id="${r.id}" id="role-item-${r.id}">
              <div class="role-list-swatch" style="background:${r.color}"></div>
              <div class="role-list-info">
                <div class="role-list-name">${escapeHtml(r.displayName||r.name)}</div>
                <div class="role-list-meta">
                  Lvl ${r.level} · ${(r.permissions||[]).length} perms
                  ${r.inherits?.length ? `· inherits ${r.inherits.join(', ')}` : ''}
                </div>
              </div>
              <div class="role-list-actions">
                <button class="admin-action-btn admin-action-btn--role role-edit-btn" data-role-id="${r.id}">Edit</button>
                ${isSA && !r.protected ? `<button class="admin-action-btn admin-action-btn--ban role-delete-btn" data-role-id="${r.id}">Delete</button>` : ''}
              </div>
            </div>
          `).join('')}
        </div>
        ${isSA ? `<button class="admin-save-btn" id="create-role-btn" style="margin-top:1rem;width:100%">+ Create New Role</button>` : ''}
      </div>

      <!-- Role editor -->
      <div class="role-manager-right" id="role-editor-panel">
        <div class="role-editor-placeholder">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" opacity=".3"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          <p>Select a role to edit, or create a new one.</p>
        </div>
      </div>
    </div>
  `;
}

function openRoleEditor(roleId, isNew = false) {
  const panel = document.getElementById('role-editor-panel');
  if (!panel) return;
  const isSA = PSYCHE_ROLES.isSuperAdmin();

  const role = isNew ? {
    id: '', name: '', displayName: '', color: '#1d6fa4', bg: '#ddeef8',
    level: 1, inherits: [], permissions: [], description: '', protected: false
  } : PSYCHE_ROLES.get(roleId);

  const permGroups = {};
  Object.entries(PSYCHE_PERMISSIONS).forEach(([key, val]) => {
    if (!permGroups[val.group]) permGroups[val.group] = [];
    permGroups[val.group].push({ key, ...val });
  });

  const resolvedPerms = isNew ? new Set() : PSYCHE_ROLES.resolvePermissions(roleId);
  const allRoles = PSYCHE_ROLES.getAll().filter(r => r.id !== roleId);

  panel.innerHTML = `
    <div class="role-editor">
      <div class="role-editor-header">
        <h3 class="role-editor-title">${isNew ? 'Create New Role' : `Edit: ${escapeHtml(role.displayName||role.name)}`}</h3>
        ${!isNew && role.protected ? `<span class="role-protected-badge">Protected</span>` : ''}
      </div>

      <!-- Identity -->
      <div class="role-editor-section">
        <div class="role-editor-section-title">Identity</div>
        <div class="role-editor-row">
          <div class="admin-field" style="flex:1">
            <label class="admin-label">Role Name ${role.protected?'<span style="color:#6e7681;font-weight:400">(locked)</span>':''}</label>
            <input class="admin-input" id="re-name" value="${escapeHtml(role.name)}" ${role.protected?'disabled':''} placeholder="e.g. Senior Writer">
          </div>
          <div class="admin-field" style="flex:1">
            <label class="admin-label">Display Name <span class="role-hint">(shown on badges)</span></label>
            <input class="admin-input" id="re-displayname" value="${escapeHtml(role.displayName||role.name)}" placeholder="e.g. ✍ Senior Writer">
          </div>
        </div>
        <div class="admin-field">
          <label class="admin-label">Description</label>
          <input class="admin-input" id="re-desc" value="${escapeHtml(role.description||'')}" placeholder="What can this role do?">
        </div>
        <div class="role-editor-row">
          <div class="admin-field">
            <label class="admin-label">Badge Color</label>
            <div class="role-color-row">
              <input type="color" id="re-color" value="${role.color}" class="role-color-picker">
              <input class="admin-input" id="re-color-hex" value="${role.color}" placeholder="#1d6fa4" style="flex:1">
            </div>
          </div>
          <div class="admin-field">
            <label class="admin-label">Badge Background</label>
            <div class="role-color-row">
              <input type="color" id="re-bg" value="${role.bg||'#ddeef8'}" class="role-color-picker">
              <input class="admin-input" id="re-bg-hex" value="${role.bg||'#ddeef8'}" placeholder="#ddeef8" style="flex:1">
            </div>
          </div>
          <div class="admin-field" style="max-width:100px">
            <label class="admin-label">Level</label>
            <input type="number" class="admin-input" id="re-level" value="${role.level||1}" min="0" max="98" ${role.protected?'disabled':''}>
          </div>
        </div>
        <!-- Live badge preview -->
        <div class="role-badge-preview">
          <span style="font-size:.78rem;color:#6e7681">Preview:</span>
          <span class="role-badge-live" id="re-badge-preview" style="background:${role.bg||'#ddeef8'};color:${role.color}">${escapeHtml(role.displayName||role.name||'Role Name')}</span>
        </div>
      </div>

      <!-- Inheritance -->
      <div class="role-editor-section">
        <div class="role-editor-section-title">Inherits From <span class="role-hint">(gains all permissions of selected roles)</span></div>
        <div class="role-inherits-list">
          ${allRoles.map(r => `
            <label class="role-inherit-item">
              <input type="checkbox" class="re-inherit-check" value="${r.id}" ${(role.inherits||[]).includes(r.id)?'checked':''}>
              <span class="role-badge-sm" style="background:${r.bg};color:${r.color}">${escapeHtml(r.displayName||r.name)}</span>
              <span style="font-size:.78rem;color:#6e7681">Lvl ${r.level}</span>
            </label>`).join('')}
        </div>
      </div>

      <!-- Permissions -->
      <div class="role-editor-section">
        <div class="role-editor-section-title">Permissions</div>
        ${Object.entries(permGroups).map(([group, perms]) => `
          <div class="role-perm-group">
            <div class="role-perm-group-title">
              ${group}
              <button class="role-perm-toggle-all" data-group="${group}">Toggle all</button>
            </div>
            <div class="role-perm-grid">
              ${perms.map(p => {
                const inherited = !isNew && resolvedPerms.has(p.key) && !(role.permissions||[]).includes(p.key);
                const owned = (role.permissions||[]).includes(p.key);
                return `
                  <label class="role-perm-item ${inherited?'role-perm-item--inherited':''}">
                    <input type="checkbox" class="re-perm-check" data-group="${group}" value="${p.key}"
                      ${owned || inherited ? 'checked' : ''}
                      ${inherited ? 'disabled title="Inherited from parent role"' : ''}>
                    <div>
                      <div class="role-perm-label">${p.label} ${inherited?'<span class="role-inherited-tag">inherited</span>':''}</div>
                      <div class="role-perm-desc">${p.desc}</div>
                    </div>
                  </label>`;
              }).join('')}
            </div>
          </div>`).join('')}
      </div>

      <div class="role-editor-error" id="re-error" hidden></div>

      <div class="role-editor-footer">
        ${!isNew && !role.protected && isSA ? `<button class="admin-action-btn admin-action-btn--ban" id="re-delete-btn" data-role-id="${roleId}">Delete Role</button>` : '<span></span>'}
        <div style="display:flex;gap:.5rem">
          <button class="compose-cancel-btn" id="re-cancel-btn">Cancel</button>
          <button class="admin-save-btn" id="re-save-btn">${isNew ? 'Create Role' : 'Save Changes'}</button>
        </div>
      </div>
    </div>
  `;

  // Live badge preview
  const updatePreview = () => {
    const label = document.getElementById('re-displayname')?.value || document.getElementById('re-name')?.value || 'Role';
    const color = document.getElementById('re-color-hex')?.value || '#4f5d6e';
    const bg    = document.getElementById('re-bg-hex')?.value    || '#edf0f3';
    const preview = document.getElementById('re-badge-preview');
    if (preview) { preview.textContent = label; preview.style.color = color; preview.style.background = bg; }
  };
  panel.querySelector('#re-displayname')?.addEventListener('input', updatePreview);
  panel.querySelector('#re-name')?.addEventListener('input', updatePreview);
  panel.querySelector('#re-color')?.addEventListener('input', e => { panel.querySelector('#re-color-hex').value = e.target.value; updatePreview(); });
  panel.querySelector('#re-color-hex')?.addEventListener('input', e => { panel.querySelector('#re-color').value = e.target.value; updatePreview(); });
  panel.querySelector('#re-bg')?.addEventListener('input', e => { panel.querySelector('#re-bg-hex').value = e.target.value; updatePreview(); });
  panel.querySelector('#re-bg-hex')?.addEventListener('input', e => { panel.querySelector('#re-bg').value = e.target.value; updatePreview(); });

  // Toggle all perms in a group
  panel.querySelectorAll('.role-perm-toggle-all').forEach(btn => {
    btn.addEventListener('click', () => {
      const group = btn.dataset.group;
      const checks = panel.querySelectorAll(`.re-perm-check[data-group="${group}"]:not([disabled])`);
      const allChecked = [...checks].every(c => c.checked);
      checks.forEach(c => c.checked = !allChecked);
    });
  });

  // Cancel
  panel.querySelector('#re-cancel-btn')?.addEventListener('click', () => {
    panel.innerHTML = `<div class="role-editor-placeholder"><p>Select a role to edit.</p></div>`;
  });

  // Delete
  panel.querySelector('#re-delete-btn')?.addEventListener('click', () => {
    if (!confirm(`Delete role "${role.name}"? Users with this role will be moved to Member.`)) return;
    const result = PSYCHE_ROLES.deleteRole(roleId);
    if (result.success) {
      showToast('Role deleted.');
      refreshRoleManager();
    } else { showToast(result.error); }
  });

  // Save
  panel.querySelector('#re-save-btn')?.addEventListener('click', () => {
    const errEl = document.getElementById('re-error');
    const data = {
      name:        document.getElementById('re-name')?.value,
      displayName: document.getElementById('re-displayname')?.value,
      description: document.getElementById('re-desc')?.value,
      color:       document.getElementById('re-color-hex')?.value,
      bg:          document.getElementById('re-bg-hex')?.value,
      level:       parseInt(document.getElementById('re-level')?.value || '1'),
      inherits:    [...panel.querySelectorAll('.re-inherit-check:checked')].map(c => c.value),
      permissions: [...panel.querySelectorAll('.re-perm-check:checked:not([disabled])')].map(c => c.value),
    };

    let result;
    if (isNew) {
      result = PSYCHE_ROLES.createRole(data);
    } else {
      result = PSYCHE_ROLES.editRole(roleId, data);
    }

    if (result.success) {
      showToast(isNew ? `Role "${data.displayName||data.name}" created!` : 'Role updated.');
      refreshRoleManager();
    } else {
      errEl.textContent = result.error;
      errEl.hidden = false;
    }
  });
}

function refreshRoleManager() {
  const section = document.querySelector('.admin-section[data-section="roles"]');
  if (!section) return;
  const isSA = PSYCHE_ROLES.isSuperAdmin();
  section.innerHTML = `
    <div class="admin-card" style="padding:0;overflow:hidden">
      ${renderRoleManagerSection(isSA)}
    </div>`;
  wireRoleManager(section);
}

function wireRoleManager(container) {
  container?.querySelectorAll('.role-edit-btn').forEach(btn => {
    btn.addEventListener('click', () => openRoleEditor(btn.dataset.roleId, false));
  });
  container?.querySelectorAll('.role-delete-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (!confirm('Delete this role?')) return;
      const result = PSYCHE_ROLES.deleteRole(btn.dataset.roleId);
      if (result.success) { showToast('Role deleted.'); refreshRoleManager(); }
      else showToast(result.error);
    });
  });
  container?.querySelector('#create-role-btn')?.addEventListener('click', () => openRoleEditor(null, true));
}

// ---- USER DISPLAY ROLE OVERRIDE (in settings) ----
// Renders the override fields in user settings
function renderDisplayRoleSettings(user) {
  const role = PSYCHE_ROLES.get(user.role);
  return `
    <div class="settings-field">
      <label class="settings-label">Custom Display Title <span class="settings-hint">(optional — overrides role badge text)</span></label>
      <input class="form-input" id="s-role-display-override" value="${escapeHtml(user.roleDisplayOverride||'')}" placeholder="e.g. Founder, Chief Editor, Clinician…" maxlength="40">
      <div class="settings-hint">Leave blank to use your role name: <span class="role-badge-sm" style="background:${role.bg};color:${role.color}">${role.displayName||role.name}</span></div>
    </div>
  `;
}

// ---- INIT ----
document.addEventListener('DOMContentLoaded', () => {
  PSYCHE_ROLES.init();
});
