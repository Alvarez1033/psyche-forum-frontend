/* ============================================================
   PSYCHE — Profile & Auth System
   All state is in-memory (simulates a real backend)
   ============================================================ */

// ---- DATA MODEL ----
const PSYCHE = {

  // Current session user (null = logged out)
  currentUser: null,

  // Simulated user database
  users: {},

  // Available role types (ordered by permission level)
  roles: {
    member:      { label: 'Member',       color: '#4f5d6e', bg: '#edf0f3', level: 0 },
    contributor: { label: 'Contributor',  color: '#1d6fa4', bg: '#ddeef8', level: 1 },
    author:      { label: 'Author',       color: '#0d7c6e', bg: '#e0f4f1', level: 2 },
    editor:      { label: 'Editor',       color: '#7c3aed', bg: '#ede9fe', level: 3 },
    moderator:   { label: 'Moderator',    color: '#b45309', bg: '#fef3c7', level: 4 },
    admin:       { label: 'Admin',        color: '#0369a1', bg: '#e0f2fe', level: 5 },
    superadmin:  { label: 'Superadmin',   color: '#7c2d12', bg: '#fff1f2', level: 6 },
  },

  // Map API user object to frontend format
  _mapApiUser(apiUser) {
    return {
      id: apiUser.id,
      email: apiUser.email,
      username: apiUser.username,
      displayName: apiUser.name || apiUser.username,
      avatarColor: apiUser.avatar_color || '#6366f1',
      avatar: null,
      bio: apiUser.bio || '',
      role: apiUser.role || 'member',
      interests: apiUser.interests || [],
      banned: apiUser.banned || false,
      postCount: apiUser.post_count || 0,
      joinedAt: apiUser.created_at || new Date().toISOString(),
      karma: 0,
      commentCount: 0,
      pronouns: '',
      location: '',
      website: '',
      credentials: '',
      institution: '',
      followedTopics: [],
      joinedCommunities: [],
      settings: { emailNotifications: true, replyNotifications: true, mentionNotifications: true, upvoteNotifications: false, profilePublic: true, showEmail: false, showLocation: true, showActivity: true, contentWarnings: true, darkModeDefault: false },
      pinnedPost: null,
      onboarding: { complete: true },
    };
  },

  // Permission helpers
  isSuperAdmin(u) { return (u || this.currentUser)?.role === 'superadmin'; },
  isAdmin(u)      { return ['admin','superadmin'].includes((u || this.currentUser)?.role); },
  isMod(u)        { return ['moderator','admin','superadmin'].includes((u || this.currentUser)?.role); },
  canAccessAdmin(u){ return this.isMod(u || this.currentUser); },
  // Contributor+ can publish blog posts; all logged-in users can post in forum discussions
  canPost(u)      { return ['contributor','author','editor','moderator','admin','superadmin'].includes((u || this.currentUser)?.role); },

  // Assign role — only superadmin can make admins; admins can assign up to moderator
  assignRole(targetId, newRole) {
    const me = this.currentUser;
    if (!me) return { success: false, error: 'Not logged in.' };
    const target = this.users[targetId];
    if (!target) return { success: false, error: 'User not found.' };
    if (target.role === 'superadmin') return { success: false, error: 'Cannot modify superadmin.' };
    const roleLevel = this.roles[newRole]?.level ?? -1;
    if (!this.isSuperAdmin() && roleLevel >= 4) return { success: false, error: 'Only superadmin can assign admin roles.' };
    if (!this.isAdmin()) return { success: false, error: 'Insufficient permissions.' };
    target.role = newRole;
    return { success: true };
  },

  // Ban / unban user
  setBanned(targetId, banned) {
    if (!this.isMod()) return { success: false, error: 'Insufficient permissions.' };
    const target = this.users[targetId];
    if (!target || target.role === 'superadmin') return { success: false, error: 'Cannot modify this user.' };
    target.banned = banned;
    return { success: true };
  },

  // All topic options
  topics: [
    'Anxiety', 'Depression', 'Trauma & PTSD', 'Mindfulness',
    'CBT & Therapy', 'Relationships', 'Neuroscience', 'Self-Esteem',
    'Grief & Loss', 'Sleep & Fatigue', 'Personality', 'OCD',
    'Addiction', 'Eating Disorders', 'ADHD', 'Bipolar',
    'Schizophrenia', 'Positive Psychology', 'Child Psychology', 'Aging'
  ],

  // Simulated activity feed for demo profiles
  sampleActivity: [
    { type: 'post',    title: 'Does anyone else feel physically sick before social events?', community: 'r/Anxiety',        time: '2h ago',  votes: 247 },
    { type: 'comment', title: 'Commented on: The Science of Emotional Regulation',           community: 'r/Neuroscience',    time: '5h ago',  votes: 32  },
    { type: 'post',    title: '3 years of therapy — what I learned about attachment',        community: 'r/Relationships',   time: '2d ago',  votes: 891 },
    { type: 'comment', title: 'Commented on: 14 Cognitive Distortions',                     community: 'r/CBT',             time: '3d ago',  votes: 17  },
    { type: 'post',    title: 'New study: 8 weeks of mindfulness changes amygdala volume',  community: 'r/Neuroscience',    time: '5d ago',  votes: 1204 },
  ],

  // ---- METHODS ----

  createUser(data) {
    const id = 'u_' + Date.now();
    const user = {
      id,
      // Auth
      email:        data.email.trim().toLowerCase(),
      password:     data.password, // plaintext for demo only
      // Identity
      username:     data.username.trim().toLowerCase().replace(/\s+/g, '_'),
      displayName:  data.displayName || data.username,
      avatar:       null,           // null = use initials
      avatarColor:  randomAvatarColor(),
      pronouns:     '',
      bio:          '',
      location:     '',
      website:      '',
      // Role & expertise
      role:         'guest',   // New users start as guest until checklist complete
      credentials:  '',             // e.g. "PhD, Clinical Psychology"
      institution:  '',
      // Community
      followedTopics: [],
      joinedCommunities: [],
      // Stats
      karma:        0,
      postCount:    0,
      commentCount: 0,
      joinedAt:     new Date().toISOString(),
      // Settings
      settings: {
        emailNotifications: true,
        replyNotifications: true,
        mentionNotifications: true,
        upvoteNotifications: false,
        profilePublic:    true,
        showEmail:        false,
        showLocation:     true,
        showActivity:     true,
        contentWarnings:  true,
        darkModeDefault:  false,
      },
      // Pinned post
      pinnedPost: null,
      // Onboarding checklist
      checklist: {
        profileComplete: false,  // added bio + avatar
        topicsSelected: false,   // picked 3+ topics
        firstPost: false,        // posted or commented once
      },
      checklistComplete: false,
    };
    this.users[id] = user;
    return user;
  },

  login(emailOrUsername, password) {
    const match = Object.values(this.users).find(u =>
      (u.email === emailOrUsername.toLowerCase() || u.username === emailOrUsername.toLowerCase()) &&
      u.password === password
    );
    if (match) {
      this.currentUser = match;
      this._updateNav();
      return { success: true, user: match };
    }
    return { success: false, error: 'Invalid email/username or password.' };
  },

  signup(data) {
    // Validate
    if (!data.email || !data.password || !data.username) {
      return { success: false, error: 'Please fill in all required fields.' };
    }
    if (data.password.length < 8) {
      return { success: false, error: 'Password must be at least 8 characters.' };
    }
    if (!/^[a-zA-Z0-9_]+$/.test(data.username)) {
      return { success: false, error: 'Username can only contain letters, numbers, and underscores.' };
    }
    const emailTaken    = Object.values(this.users).some(u => u.email    === data.email.toLowerCase());
    const usernameTaken = Object.values(this.users).some(u => u.username === data.username.toLowerCase());
    if (emailTaken)    return { success: false, error: 'That email is already registered.' };
    if (usernameTaken) return { success: false, error: 'That username is taken.' };

    const user = this.createUser(data);
    this.currentUser = user;
    this._updateNav();
    return { success: true, user };
  },

  logout() {
    this.currentUser = null;
    this._updateNav();
    navigateTo('page-home');
    showToast('Signed out successfully.');
  },

  updateProfile(fields) {
    if (!this.currentUser) return;
    const allowed = ['displayName','pronouns','bio','location','website',
                     'credentials','institution','role','followedTopics','pinnedPost'];
    allowed.forEach(k => {
      if (fields[k] !== undefined) this.currentUser[k] = fields[k];
    });
    this._updateNav();
    return this.currentUser;
  },

  updateSettings(settings) {
    if (!this.currentUser) return;
    Object.assign(this.currentUser.settings, settings);
    return this.currentUser;
  },

  updateAvatar(color) {
    if (!this.currentUser) return;
    this.currentUser.avatarColor = color;
    this._updateNav();
  },

  // Check and upgrade guest -> member when checklist complete
  checkChecklist() {
    const u = this.currentUser;
    if (!u || u.role !== 'guest') return;
    const c = u.checklist || {};
    if (c.profileComplete && c.topicsSelected) {
      u.role = 'member';
      u.checklistComplete = true;
      this._updateNav();
      showToast('Welcome! Your account is now a full Member.');
      if (typeof PSYCHE_STORE !== 'undefined') PSYCHE_STORE.saveUsers();
    }
  },

  _updateNav() {
    const u = this.currentUser;
    const signinBtn  = document.querySelector('.btn-signin');
    const postBtn    = document.querySelector('.btn-post');
    const navRight   = document.querySelector('.nav-right');

    // Remove existing user nav if present
    document.querySelector('.nav-user-menu')?.remove();

    if (u) {
      // Hide sign-in, show user avatar + dropdown trigger
      if (signinBtn) signinBtn.style.display = 'none';

      const menu = document.createElement('div');
      menu.className = 'nav-user-menu';
      menu.innerHTML = `
        <button class="nav-avatar-btn" aria-label="Your profile" aria-expanded="false" aria-haspopup="true">
          <div class="nav-avatar" style="background:${u.avatarColor}">
            ${u.avatar ? `<img src="${u.avatar}" alt="${u.displayName}">` : initials(u.displayName)}
          </div>
          <span class="nav-username">${u.displayName}</span>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M6 9l6 6 6-6"/></svg>
        </button>
        <div class="nav-dropdown" role="menu" hidden>
          <div class="nav-dropdown-header">
            <div class="nav-avatar nav-avatar--lg" style="background:${u.avatarColor}">
              ${u.avatar ? `<img src="${u.avatar}" alt="${u.displayName}">` : initials(u.displayName)}
            </div>
            <div>
              <div class="nav-dropdown-name">${u.displayName}</div>
              <div class="nav-dropdown-username">@${u.username}</div>
              <div class="nav-dropdown-karma">${formatKarma(u.karma)} karma</div>
            </div>
          </div>
          <div class="nav-dropdown-divider"></div>
          <button class="nav-dropdown-item" data-page="page-profile" role="menuitem">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            View Profile
          </button>
          \${(typeof PSYCHE_HD !== 'undefined' && PSYCHE_HD.getForUser(u.id).filter(t=>!['resolved','closed'].includes(t.status)).length > 0) ? \`
          <button class="nav-dropdown-item nav-dropdown-item--tickets" data-page="page-tickets" role="menuitem">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
            My Tickets
            \${(function(){
              const unread = typeof PSYCHE_NOTIFICATIONS !== 'undefined'
                ? PSYCHE_NOTIFICATIONS.getForUser(u.id).filter(n => !n.read && (n.type==='ticket_reply'||n.type==='ticket_claimed'||n.type==='ticket_resolved'||n.type==='ticket_escalated')).length
                : 0;
              return unread > 0 ? \`<span class="nav-ticket-badge">\${unread}</span>\` : '';
            })()}
          </button>\` : ''}
          <button class="nav-dropdown-item" data-page="page-settings" role="menuitem">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
            Settings
          </button>
          <button class="nav-dropdown-item" data-page="page-shop" role="menuitem">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
            Shop
          </button>
          <button class="nav-dropdown-item" id="nav-help-desk-btn" role="menuitem">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            Help Desk
          </button>
          ${PSYCHE.canAccessAdmin(u) ? `
          <div class="nav-dropdown-divider"></div>
          <button class="nav-dropdown-item nav-dropdown-item--admin" data-page="page-admin" role="menuitem">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            Admin Panel
          </button>` : ''}
          <div class="nav-dropdown-divider"></div>
          <button class="nav-dropdown-item nav-dropdown-item--danger" id="signout-btn" role="menuitem">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            Sign Out
          </button>
        </div>`;

      // Insert before theme toggle
      const themeToggle = navRight.querySelector('[data-theme-toggle]');
      navRight.insertBefore(menu, themeToggle);

      // Dropdown toggle
      const btn = menu.querySelector('.nav-avatar-btn');
      const dropdown = menu.querySelector('.nav-dropdown');
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = !dropdown.hidden;
        dropdown.hidden = isOpen;
        btn.setAttribute('aria-expanded', !isOpen);
      });
      document.addEventListener('click', () => { dropdown.hidden = true; btn.setAttribute('aria-expanded','false'); }, { once: false });

      // Sign out
      menu.querySelector('#signout-btn').addEventListener('click', () => PSYCHE.logout());

    } else {
      if (signinBtn) signinBtn.style.display = '';
    }
  }
};

// ---- HELPERS ----
function initials(name) {
  return (name || '?').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

function formatKarma(n) {
  if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
  return String(n);
}

function randomAvatarColor() {
  const colors = [
    '#1d6fa4','#0d7c6e','#7c3aed','#b45309',
    '#c2410c','#0f766e','#1d4ed8','#be185d',
    '#065f46','#6d28d9'
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}

// ---- SEED A DEMO USER so the profile page has content ----
(function seedDemoUser() {
  const demo = PSYCHE.createUser({
    email:       'sarah@example.com',
    password:    'demo1234',
    username:    'Sarah_L',
    displayName: 'Sarah L.',
  });
  demo.bio          = 'Living with generalized anxiety and learning every day. Big believer in therapy, small wins, and community support. I share my journey here.';
  demo.role         = 'contributor';
  demo.pronouns     = 'she/her';
  demo.location     = 'Seattle, WA';
  demo.website      = 'sarahlwrites.com';
  demo.followedTopics = ['Anxiety', 'CBT & Therapy', 'Mindfulness', 'Relationships'];
  demo.karma        = 3847;
  demo.postCount    = 24;
  demo.commentCount = 187;
  demo.joinedAt     = '2024-08-12T00:00:00Z';
  demo.avatarColor  = '#1d6fa4';
  demo.pinnedPost   = {
    title: 'Does anyone else feel physically sick before social events?',
    community: 'r/Anxiety',
    votes: 247,
    comments: 83,
    time: '2 days ago'
  };
})();


// ---- AUTH MODAL ----
function openAuthModal(tab = 'signin') {
  document.querySelector('.auth-modal-overlay')?.remove();

  const overlay = document.createElement('div');
  overlay.className = 'auth-modal-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', tab === 'signin' ? 'Sign in' : 'Create account');

  overlay.innerHTML = `
    <div class="auth-modal">
      <button class="auth-modal-close" aria-label="Close">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>

      <div class="auth-logo">
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
          <circle cx="16" cy="16" r="14" fill="var(--color-primary)" opacity="0.1"/>
          <circle cx="16" cy="16" r="14" stroke="var(--color-primary)" stroke-width="1.5"/>
          <text x="16" y="21.5" text-anchor="middle" font-size="17" fill="var(--color-primary)" font-family="Georgia,serif" font-style="italic">ψ</text>
        </svg>
        <span>Psyche</span>
      </div>

      <!-- Tabs -->
      <div class="auth-tabs" role="tablist">
        <button class="auth-tab ${tab==='signin'?'active':''}" data-tab="signin" role="tab" aria-selected="${tab==='signin'}">Sign In</button>
        <button class="auth-tab ${tab==='signup'?'active':''}" data-tab="signup" role="tab" aria-selected="${tab==='signup'}">Create Account</button>
      </div>

      <!-- Sign In Form -->
      <form class="auth-form ${tab==='signin'?'active':''}" id="form-signin" data-form="signin" novalidate>
        <div class="form-group">
          <label class="form-label" for="signin-email">Email or Username</label>
          <input class="form-input" id="signin-email" name="email" type="text" placeholder="you@example.com" autocomplete="email" required>
        </div>
        <div class="form-group">
          <label class="form-label" for="signin-password">
            Password
            <a href="#" class="form-label-link" id="forgot-password-link">Forgot password?</a>
          </label>
          <div class="form-input-wrap">
            <input class="form-input" id="signin-password" name="password" type="password" placeholder="Your password" autocomplete="current-password" required>
            <button type="button" class="form-eye-btn" data-target="signin-password" aria-label="Show password">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            </button>
          </div>
        </div>
        <div class="form-error" id="signin-error" hidden></div>
        <button type="submit" class="form-submit">Sign In</button>
        <p class="form-footer">Don't have an account? <a href="#" data-tab="signup">Create one →</a></p>
      </form>

      <!-- Sign Up Form -->
      <form class="auth-form ${tab==='signup'?'active':''}" id="form-signup" data-form="signup" novalidate>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label" for="signup-displayname">Display Name <span class="form-required">*</span></label>
            <input class="form-input" id="signup-displayname" name="displayName" type="text" placeholder="Your Name" autocomplete="name" required>
          </div>
          <div class="form-group">
            <label class="form-label" for="signup-username">Username <span class="form-required">*</span></label>
            <div class="form-input-wrap">
              <span class="form-input-prefix">@</span>
              <input class="form-input form-input--prefixed" id="signup-username" name="username" type="text" placeholder="username" autocomplete="username" required>
            </div>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label" for="signup-email">Email Address <span class="form-required">*</span></label>
          <input class="form-input" id="signup-email" name="email" type="email" placeholder="you@example.com" autocomplete="email" required>
        </div>
        <div class="form-group">
          <label class="form-label" for="signup-password">Password <span class="form-required">*</span></label>
          <div class="form-input-wrap">
            <input class="form-input" id="signup-password" name="password" type="password" placeholder="At least 8 characters" autocomplete="new-password" required>
            <button type="button" class="form-eye-btn" data-target="signup-password" aria-label="Show password">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            </button>
          </div>
          <div class="form-password-strength" id="password-strength" hidden>
            <div class="strength-bar"><div class="strength-fill" id="strength-fill"></div></div>
            <span class="strength-label" id="strength-label"></span>
          </div>
        </div>
        <!-- Roles are assigned by admin only — all signups start as Member -->
        <input type="hidden" id="signup-role" value="member">
        <div class="form-group">
          <label class="form-label">Topics I care about</label>
          <div class="topic-picker" id="signup-topics">
            ${PSYCHE.topics.map(t => `<button type="button" class="topic-pick-btn" data-topic="${t}">${t}</button>`).join('')}
          </div>
        </div>
        <div class="form-check">
          <input type="checkbox" id="signup-terms" required>
          <label for="signup-terms">I agree to the <a href="#">Terms of Use</a> and <a href="#">Community Guidelines</a></label>
        </div>
        <div class="form-error" id="signup-error" hidden></div>
        <button type="submit" class="form-submit">Create Account</button>
        <p class="form-footer">Already have an account? <a href="#" data-tab="signin">Sign in →</a></p>
      </form>
    </div>`;

  document.body.appendChild(overlay);

  // Close handlers
  overlay.querySelector('.auth-modal-close').addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });

  // Tab switching
  overlay.querySelectorAll('.auth-tab, [data-tab]').forEach(el => {
    el.addEventListener('click', e => {
      e.preventDefault();
      const target = el.dataset.tab;
      if (!target) return;
      overlay.querySelectorAll('.auth-tab').forEach(t => {
        t.classList.toggle('active', t.dataset.tab === target);
        t.setAttribute('aria-selected', t.dataset.tab === target);
      });
      overlay.querySelectorAll('.auth-form').forEach(f => {
        f.classList.toggle('active', f.dataset.form === target);
      });
    });
  });

  // Password visibility toggle
  overlay.querySelectorAll('.form-eye-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const input = document.getElementById(btn.dataset.target);
      const isText = input.type === 'text';
      input.type = isText ? 'password' : 'text';
      btn.setAttribute('aria-label', isText ? 'Show password' : 'Hide password');
    });
  });

  // Password strength meter
  const pwInput = document.getElementById('signup-password');
  const strengthBar = document.getElementById('password-strength');
  const fill = document.getElementById('strength-fill');
  const label = document.getElementById('strength-label');
  if (pwInput) {
    pwInput.addEventListener('input', () => {
      const val = pwInput.value;
      if (!val) { strengthBar.hidden = true; return; }
      strengthBar.hidden = false;
      const score = getPasswordStrength(val);
      const levels = [
        { pct: 20, color: '#b91c1c', text: 'Very weak' },
        { pct: 40, color: '#c2410c', text: 'Weak' },
        { pct: 65, color: '#b45309', text: 'Fair' },
        { pct: 85, color: '#1d6fa4', text: 'Strong' },
        { pct: 100, color: '#0d7c6e', text: 'Very strong' },
      ];
      const l = levels[score];
      fill.style.width = l.pct + '%';
      fill.style.background = l.color;
      label.textContent = l.text;
      label.style.color = l.color;
    });
  }

  // Topic picker
  overlay.querySelectorAll('.topic-pick-btn').forEach(btn => {
    btn.addEventListener('click', () => btn.classList.toggle('selected'));
  });

  // Form submissions
  overlay.querySelector('#form-signin').addEventListener('submit', async e => {
    e.preventDefault();
    const email = document.getElementById('signin-email').value;
    const password = document.getElementById('signin-password').value;
    const errEl = document.getElementById('signin-error');
    const result = await PSYCHE.login(email, password);
    if (result.success) {
      overlay.remove();
      showToast(`Welcome back, ${result.user.displayName}!`);
    } else {
      errEl.textContent = result.error;
      errEl.hidden = false;
    }
  });

  overlay.querySelector('#form-signup').addEventListener('submit', async e => {
    e.preventDefault();
    const errEl = document.getElementById('signup-error');
    const topics = [...overlay.querySelectorAll('.topic-pick-btn.selected')].map(b => b.dataset.topic);
    const data = {
      displayName: document.getElementById('signup-displayname').value,
      username:    document.getElementById('signup-username').value,
      email:       document.getElementById('signup-email').value,
      password:    document.getElementById('signup-password').value,
      role:        document.getElementById('signup-role').value,
    };
    const result = await PSYCHE.signup(data);
    if (result.success) {
      // Update via updateProfile so storage layer picks it up
      PSYCHE.updateProfile({ followedTopics: topics });
      overlay.remove();
      showToast(`Welcome to Psyche, ${result.user.displayName}!`);
      // Save session so it survives reload
      if (typeof PSYCHE_STORE !== 'undefined') PSYCHE_STORE.saveAll();
      // Go to settings to finish setup
      setTimeout(() => navigateTo('page-settings'), 600);
    } else {
      errEl.textContent = result.error;
      errEl.hidden = false;
    }
  });

  // Forgot password
  overlay.querySelector('#forgot-password-link')?.addEventListener('click', e => {
    e.preventDefault();
    showToast('Password reset link sent to your email.');
  });

  // Focus first field
  setTimeout(() => overlay.querySelector('.auth-form.active input')?.focus(), 100);
}

function getPasswordStrength(pw) {
  let score = 0;
  if (pw.length >= 8)  score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  return Math.min(score, 4);
}

// ---- RENDER PROFILE PAGE ----
function renderProfilePage(userId) {
  const u = userId ? PSYCHE.users[userId] : PSYCHE.currentUser;
  if (!u) { navigateTo('page-home'); return; }

  const role = PSYCHE.roles[u.role] || PSYCHE.roles.member;
  const joinedDate = new Date(u.joinedAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const isOwn = PSYCHE.currentUser?.id === u.id;

  const page = document.getElementById('page-profile');
  page.innerHTML = `
    <div class="profile-hero">
      <div class="container container--default">
        <div class="profile-hero-inner">
          <!-- Avatar -->
          <div class="profile-avatar-wrap">
            <div class="profile-avatar" style="background:${u.avatarColor}">
              ${u.avatar ? `<img src="${u.avatar}" alt="${u.displayName}">` : initials(u.displayName)}
            </div>
            ${isOwn ? `<button class="profile-avatar-edit" data-page="page-settings" aria-label="Edit avatar">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </button>` : ''}
          </div>

          <!-- Identity -->
          <div class="profile-identity">
            <div class="profile-name-row">
              <h1 class="profile-display-name">${escapeHtml(u.displayName)}</h1>
              ${u.pronouns ? `<span class="profile-pronouns">${escapeHtml(u.pronouns)}</span>` : ''}
              <span class="profile-role-badge" style="color:${role.color};background:${role.bg}">${role.label}</span>
            </div>
            <div class="profile-username">@${u.username}</div>
            ${u.credentials ? `<div class="profile-credentials">${escapeHtml(u.credentials)}${u.institution ? ` · ${escapeHtml(u.institution)}` : ''}</div>` : ''}
            ${u.bio ? `<p class="profile-bio">${escapeHtml(u.bio)}</p>` : ''}

            <div class="profile-meta-row">
              ${u.location ? `<span class="profile-meta-item"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>${escapeHtml(u.location)}</span>` : ''}
              ${u.website ? `<a class="profile-meta-item profile-meta-link" href="https://${u.website.replace(/^https?:\/\//,'')}" target="_blank" rel="noopener noreferrer"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>${escapeHtml(u.website)}</a>` : ''}
              <span class="profile-meta-item"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>Joined ${joinedDate}</span>
            </div>
          </div>

          <!-- Actions -->
          <div class="profile-actions">
            ${isOwn
              ? `<button class="btn-profile-edit" data-page="page-settings">Edit Profile</button>`
              : `<button class="btn-profile-follow">Follow</button>
                 <button class="btn-profile-msg">Message</button>`
            }
          </div>
        </div>

        <!-- Stats bar -->
        <div class="profile-stats-bar">
          <div class="profile-stat">
            <span class="profile-stat-number">${formatKarma(u.karma)}</span>
            <span class="profile-stat-label">Karma</span>
          </div>
          <div class="profile-stat">
            <span class="profile-stat-number">${u.postCount}</span>
            <span class="profile-stat-label">Posts</span>
          </div>
          <div class="profile-stat">
            <span class="profile-stat-number">${u.commentCount}</span>
            <span class="profile-stat-label">Comments</span>
          </div>
          <div class="profile-stat">
            <span class="profile-stat-number">${u.followedTopics.length}</span>
            <span class="profile-stat-label">Topics</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Profile body -->
    <div class="container container--default" style="padding-block: var(--space-8);">
      <div class="profile-layout">

        <!-- Main column -->
        <div class="profile-main">

          <!-- Pinned post -->
          ${u.pinnedPost ? `
          <div class="profile-section">
            <div class="section-header"><span class="section-title">📌 Pinned Post</span></div>
            <div class="post-card">
              <div class="post-body">
                <h3 class="post-title">${escapeHtml(u.pinnedPost.title)}</h3>
              </div>
              <div class="post-tags">
                <span class="post-tag post-tag--research">${escapeHtml(u.pinnedPost.community)}</span>
              </div>
              <div class="post-actions">
                <span class="post-action-btn"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 19V5M5 12l7-7 7 7"/></svg> ${u.pinnedPost.votes}</span>
                <span class="post-action-btn"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg> ${u.pinnedPost.comments} comments</span>
                <span class="post-action-btn post-action-spacer" style="flex:1"></span>
                <span class="post-action-btn" style="color:var(--color-text-faint)">${u.pinnedPost.time}</span>
              </div>
            </div>
          </div>` : ''}

          <!-- Recent Activity -->
          <div class="profile-section">
            <div class="section-header"><span class="section-title">Recent Activity</span></div>
            <div class="activity-feed">
              ${PSYCHE.sampleActivity.map(a => `
              <div class="activity-item">
                <div class="activity-icon activity-icon--${a.type}">
                  ${a.type === 'post'
                    ? `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>`
                    : `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`
                  }
                </div>
                <div class="activity-content">
                  <span class="activity-type">${a.type === 'post' ? 'Posted in' : 'Commented in'}</span>
                  <span class="activity-community">${a.community}</span>
                  <p class="activity-title">${escapeHtml(a.title)}</p>
                </div>
                <div class="activity-meta">
                  <span class="activity-votes"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 19V5M5 12l7-7 7 7"/></svg>${formatKarma(a.votes)}</span>
                  <span class="activity-time">${a.time}</span>
                </div>
              </div>`).join('')}
            </div>
          </div>
        </div>

        <!-- Sidebar -->
        <aside class="profile-sidebar">

          <!-- Followed Topics -->
          ${u.followedTopics.length ? `
          <div class="sidebar-card">
            <div class="sidebar-card-title">Topics Followed</div>
            <div class="profile-topic-list">
              ${u.followedTopics.map(t => `<span class="topic-pill">${t}</span>`).join('')}
            </div>
          </div>` : ''}

          <!-- About card -->
          <div class="sidebar-card">
            <div class="sidebar-card-title">About</div>
            <ul class="profile-about-list">
              <li><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> Member since ${joinedDate}</li>
              <li><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg> ${formatKarma(u.karma)} total karma</li>
              <li><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg> ${u.postCount} posts · ${u.commentCount} comments</li>
              ${u.role !== 'member' ? `<li><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg> <span style="color:${role.color};font-weight:600">${role.label}</span></li>` : ''}
            </ul>
          </div>

        </aside>
      </div>
    </div>`;
}


// ---- RENDER SETTINGS PAGE ----
function renderSettingsPage() {
  if (!PSYCHE.currentUser) {
    openAuthModal('signin');
    return;
  }
  const u = PSYCHE.currentUser;
  const page = document.getElementById('page-settings');

  page.innerHTML = `
    <div class="container container--default" style="padding-block: var(--space-10);">
      <div class="settings-layout">

        <!-- Settings nav -->
        <nav class="settings-nav" aria-label="Settings sections">
          <div class="settings-nav-title">Settings</div>
          <ul role="list">
            <li><a href="#" class="settings-nav-link active" data-section="profile">Profile</a></li>
            <li><a href="#" class="settings-nav-link" data-section="account">Account</a></li>
            <li><a href="#" class="settings-nav-link" data-section="topics">Topics & Communities</a></li>
            <li><a href="#" class="settings-nav-link" data-section="notifications">Notifications</a></li>
            <li><a href="#" class="settings-nav-link" data-section="privacy">Privacy</a></li>
            <li><a href="#" class="settings-nav-link settings-nav-link--danger" data-section="danger">Danger Zone</a></li>
          </ul>
        </nav>

        <!-- Settings panels -->
        <div class="settings-body">

          <!-- PROFILE SECTION -->
          <section class="settings-section active" data-section="profile">
            <h2 class="settings-section-title">Public Profile</h2>
            <p class="settings-section-desc">This information is visible to other community members.</p>

            <!-- Avatar picker -->
            <div class="settings-field settings-field--avatar">
              <label class="settings-label">Profile Picture</label>
              <div class="avatar-editor">
                <div class="settings-avatar" style="background:${u.avatarColor}" id="settings-avatar-preview">
                  ${initials(u.displayName)}
                </div>
                <div class="avatar-editor-right">
                  <p class="settings-hint">Choose an avatar color. Photo upload coming soon.</p>
                  <div class="avatar-color-swatches">
                    ${['#1d6fa4','#0d7c6e','#7c3aed','#b45309','#c2410c','#0f766e','#1d4ed8','#be185d','#065f46','#6d28d9'].map(c =>
                      `<button type="button" class="color-swatch ${u.avatarColor===c?'active':''}" data-color="${c}" style="background:${c}" aria-label="Color ${c}"></button>`
                    ).join('')}
                  </div>
                </div>
              </div>
            </div>

            <div class="settings-divider"></div>

            <form id="profile-form" novalidate>
              <div class="settings-row">
                <div class="settings-field">
                  <label class="settings-label" for="s-displayname">Display Name <span class="form-required">*</span></label>
                  <input class="form-input" id="s-displayname" name="displayName" value="${escapeHtml(u.displayName)}" maxlength="50" required>
                  <span class="settings-hint">50 characters max.</span>
                </div>
                <div class="settings-field">
                  <label class="settings-label" for="s-username">Username</label>
                  <div class="form-input-wrap">
                    <span class="form-input-prefix">@</span>
                    <input class="form-input form-input--prefixed" id="s-username" value="${escapeHtml(u.username)}" disabled>
                  </div>
                  <span class="settings-hint">Username cannot be changed after signup.</span>
                </div>
              </div>

              <div class="settings-field">
                <label class="settings-label" for="s-pronouns">Pronouns</label>
                <div style="display:flex;gap:var(--space-2);flex-wrap:wrap">
                  ${['he/him','she/her','they/them','ze/zir','any'].map(p =>
                    `<button type="button" class="pronoun-btn ${u.pronouns===p?'active':''}" data-pronoun="${p}">${p}</button>`
                  ).join('')}
                  <input class="form-input" id="s-pronouns" name="pronouns" value="${escapeHtml(u.pronouns)}" placeholder="Custom…" style="flex:1;min-width:120px;" maxlength="30">
                </div>
              </div>

              <div class="settings-field">
                <label class="settings-label" for="s-bio">Bio</label>
                <textarea class="form-input form-textarea" id="s-bio" name="bio" rows="4" maxlength="300" placeholder="Tell the community a bit about yourself…">${escapeHtml(u.bio)}</textarea>
                <div class="settings-char-count"><span id="bio-count">${u.bio.length}</span>/300</div>
              </div>

              <div class="settings-row">
                <div class="settings-field">
                  <label class="settings-label" for="s-location">Location</label>
                  <input class="form-input" id="s-location" name="location" value="${escapeHtml(u.location)}" placeholder="City, Country" maxlength="60">
                </div>
                <div class="settings-field">
                  <label class="settings-label" for="s-website">Website</label>
                  <input class="form-input" id="s-website" name="website" value="${escapeHtml(u.website)}" placeholder="yoursite.com" maxlength="100">
                </div>
              </div>

              <div class="settings-divider"></div>
              <h3 class="settings-subsection-title">Role & Expertise</h3>

              <div class="settings-field">
                <label class="settings-label" for="s-role">I am a…</label>
                <select class="form-select" id="s-role" name="role">
                  ${Object.entries(PSYCHE.roles).map(([k,v]) =>
                    `<option value="${k}" ${u.role===k?'selected':''}>${v.label}</option>`
                  ).join('')}
                </select>
              </div>

              <div class="settings-row" id="expert-fields" style="${u.role==='member'?'display:none':''}">
                <div class="settings-field">
                  <label class="settings-label" for="s-credentials">Credentials</label>
                  <input class="form-input" id="s-credentials" name="credentials" value="${escapeHtml(u.credentials)}" placeholder="e.g. PhD, LCSW, PsyD" maxlength="80">
                </div>
                <div class="settings-field">
                  <label class="settings-label" for="s-institution">Institution / Practice</label>
                  <input class="form-input" id="s-institution" name="institution" value="${escapeHtml(u.institution)}" placeholder="e.g. Stanford, Private Practice" maxlength="80">
                </div>
              </div>

              <div class="settings-save-bar">
                <button type="submit" class="form-submit" style="width:auto">Save Profile</button>
                <span class="settings-save-status" id="profile-save-status" hidden>✓ Saved</span>
              </div>
            </form>
          </section>

          <!-- ACCOUNT SECTION -->
          <section class="settings-section" data-section="account">
            <h2 class="settings-section-title">Account</h2>
            <p class="settings-section-desc">Manage your login credentials and account details.</p>
            <div class="settings-field">
              <label class="settings-label">Email Address</label>
              <div style="display:flex;gap:var(--space-3);align-items:center;">
                <input class="form-input" value="${escapeHtml(u.email)}" disabled style="flex:1">
                <button class="sort-btn" style="white-space:nowrap">Change Email</button>
              </div>
            </div>
            <div class="settings-field">
              <label class="settings-label">Password</label>
              <button class="sort-btn" style="padding: var(--space-2) var(--space-5);">Change Password</button>
            </div>
            <div class="settings-divider"></div>
            <div class="settings-field">
              <label class="settings-label">Two-Factor Authentication</label>
              <p class="settings-hint" style="margin-bottom:var(--space-3)">Add an extra layer of security to your account.</p>
              <button class="sort-btn" style="padding: var(--space-2) var(--space-5);">Enable 2FA</button>
            </div>
            <div class="settings-divider"></div>
            <div class="settings-subsection-title">Membership</div>
            \${typeof renderUpgradeSection === 'function' ? renderUpgradeSection(u) : ''}
          </section>

          <!-- TOPICS SECTION -->
          <section class="settings-section" data-section="topics">
            <h2 class="settings-section-title">Topics & Communities</h2>
            <p class="settings-section-desc">Choose the topics that appear in your home feed.</p>
            <div class="settings-field">
              <label class="settings-label">Followed Topics</label>
              <div class="topic-picker" id="settings-topics">
                ${PSYCHE.topics.map(t =>
                  `<button type="button" class="topic-pick-btn ${u.followedTopics.includes(t)?'selected':''}" data-topic="${t}">${t}</button>`
                ).join('')}
              </div>
            </div>
            <div class="settings-save-bar">
              <button class="form-submit" style="width:auto" id="save-topics-btn">Save Topics</button>
              <span class="settings-save-status" id="topics-save-status" hidden>✓ Saved</span>
            </div>
          </section>

          <!-- NOTIFICATIONS SECTION -->
          <section class="settings-section" data-section="notifications">
            <h2 class="settings-section-title">Notifications</h2>
            <p class="settings-section-desc">Control what Psyche notifies you about.</p>
            ${[
              ['emailNotifications',  'Email Notifications',     'Receive a daily digest of activity in your followed topics.'],
              ['replyNotifications',  'Replies to my posts',      'Get notified when someone replies to your post.'],
              ['mentionNotifications','Mentions',                 'Get notified when someone @mentions you.'],
              ['upvoteNotifications', 'Upvotes',                  'Get notified when your posts receive upvotes.'],
            ].map(([key, label, desc]) => `
            <div class="settings-toggle-row">
              <div class="settings-toggle-info">
                <div class="settings-toggle-label">${label}</div>
                <div class="settings-toggle-desc">${desc}</div>
              </div>
              <label class="toggle-switch" aria-label="${label}">
                <input type="checkbox" data-setting="${key}" ${u.settings[key]?'checked':''}>
                <span class="toggle-track"><span class="toggle-thumb"></span></span>
              </label>
            </div>`).join('')}
          </section>

          <!-- PRIVACY SECTION -->
          <section class="settings-section" data-section="privacy">
            <h2 class="settings-section-title">Privacy</h2>
            <p class="settings-section-desc">Control who can see your information and activity.</p>
            ${[
              ['profilePublic',  'Public Profile',      'Anyone can view your profile page.'],
              ['showEmail',      'Show Email',          'Display your email on your public profile.'],
              ['showLocation',   'Show Location',       'Display your location on your public profile.'],
              ['showActivity',   'Show Activity',       'Others can see your recent posts and comments.'],
              ['contentWarnings','Content Warnings',    'Show content warnings before sensitive posts.'],
            ].map(([key, label, desc]) => `
            <div class="settings-toggle-row">
              <div class="settings-toggle-info">
                <div class="settings-toggle-label">${label}</div>
                <div class="settings-toggle-desc">${desc}</div>
              </div>
              <label class="toggle-switch" aria-label="${label}">
                <input type="checkbox" data-setting="${key}" ${u.settings[key]?'checked':''}>
                <span class="toggle-track"><span class="toggle-thumb"></span></span>
              </label>
            </div>`).join('')}
          </section>

          <!-- DANGER ZONE -->
          <section class="settings-section" data-section="danger">
            <h2 class="settings-section-title" style="color:var(--color-error)">Danger Zone</h2>
            <p class="settings-section-desc">These actions are permanent and cannot be undone.</p>
            <div class="danger-card">
              <div>
                <div class="danger-card-title">Deactivate Account</div>
                <div class="danger-card-desc">Temporarily hide your profile and posts. You can reactivate at any time.</div>
              </div>
              <button class="danger-btn danger-btn--soft" id="deactivate-btn">Deactivate</button>
            </div>
            <div class="danger-card">
              <div>
                <div class="danger-card-title">Delete Account</div>
                <div class="danger-card-desc">Permanently delete your account, posts, and all data. This cannot be reversed.</div>
              </div>
              <button class="danger-btn danger-btn--hard" id="delete-account-btn">Delete Account</button>
            </div>
          </section>

        </div>
      </div>
    </div>`;

  // --- Wire settings interactions ---

  // Section nav
  page.querySelectorAll('.settings-nav-link').forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      const sec = link.dataset.section;
      page.querySelectorAll('.settings-nav-link').forEach(l => l.classList.remove('active'));
      page.querySelectorAll('.settings-section').forEach(s => s.classList.remove('active'));
      link.classList.add('active');
      page.querySelector(`.settings-section[data-section="${sec}"]`).classList.add('active');
    });
  });

  // Avatar color swatches
  page.querySelectorAll('.color-swatch').forEach(swatch => {
    swatch.addEventListener('click', () => {
      page.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('active'));
      swatch.classList.add('active');
      const color = swatch.dataset.color;
      PSYCHE.updateAvatar(color);
      document.getElementById('settings-avatar-preview').style.background = color;
    });
  });

  // Pronoun buttons
  page.querySelectorAll('.pronoun-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      page.querySelectorAll('.pronoun-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('s-pronouns').value = btn.dataset.pronoun;
    });
  });

  // Bio char count
  const bioEl = document.getElementById('s-bio');
  const bioCount = document.getElementById('bio-count');
  bioEl?.addEventListener('input', () => { bioCount.textContent = bioEl.value.length; });

  // Show/hide expert fields based on role
  document.getElementById('s-role')?.addEventListener('change', function() {
    const ef = document.getElementById('expert-fields');
    ef.style.display = this.value === 'member' ? 'none' : '';
  });

  // Profile form save
  document.getElementById('profile-form')?.addEventListener('submit', e => {
    e.preventDefault();
    const fd = new FormData(e.target);
    PSYCHE.updateProfile({
      displayName:  document.getElementById('s-displayname').value,
      pronouns:     document.getElementById('s-pronouns').value,
      bio:          document.getElementById('s-bio').value,
      location:     document.getElementById('s-location').value,
      website:      document.getElementById('s-website').value,
      role:         document.getElementById('s-role').value,
      credentials:  document.getElementById('s-credentials')?.value || '',
      institution:  document.getElementById('s-institution')?.value || '',
    });
    const status = document.getElementById('profile-save-status');
    status.hidden = false;
    setTimeout(() => { status.hidden = true; }, 3000);
    showToast('Profile updated.');
  });

  // Topics save
  document.getElementById('save-topics-btn')?.addEventListener('click', () => {
    const selected = [...page.querySelectorAll('#settings-topics .topic-pick-btn.selected')].map(b => b.dataset.topic);
    PSYCHE.updateProfile({ followedTopics: selected });
    const status = document.getElementById('topics-save-status');
    status.hidden = false;
    setTimeout(() => { status.hidden = true; }, 3000);
    showToast('Topics saved.');
  });

  page.querySelectorAll('#settings-topics .topic-pick-btn').forEach(btn => {
    btn.addEventListener('click', () => btn.classList.toggle('selected'));
  });

  // Toggle switches (notifications + privacy)
  page.querySelectorAll('.toggle-switch input[type="checkbox"]').forEach(cb => {
    cb.addEventListener('change', () => {
      PSYCHE.updateSettings({ [cb.dataset.setting]: cb.checked });
    });
  });

  // Danger zone
  document.getElementById('deactivate-btn')?.addEventListener('click', () => {
    showToast('Account deactivated. Sign in to reactivate.');
    PSYCHE.logout();
  });
  document.getElementById('delete-account-btn')?.addEventListener('click', () => {
    const confirmed = confirm('Are you absolutely sure? This will permanently delete your account and all data. This cannot be undone.');
    if (confirmed) {
      showToast('Account deleted.');
      PSYCHE.logout();
    }
  });
}

// ---- SEED SUPERADMIN ----
(function seedSuperAdmin() {
  // Superadmin account — hardcoded, reserved
  const id = 'u_superadmin';
  PSYCHE.users[id] = {
    id,
    email:        'admin@psyche.com',
    password:     'admin123',
    username:     'admin',
    displayName:  'Psyche Admin',
    avatar:       null,
    avatarColor:  '#7c2d12',
    pronouns:     '',
    bio:          'Site superadmin.',
    location:     '',
    website:      '',
    role:         'superadmin',
    credentials:  'Site Owner',
    institution:  'Psyche',
    followedTopics: [],
    joinedCommunities: [],
    karma:        0,
    postCount:    0,
    commentCount: 0,
    joinedAt:     '2025-01-01T00:00:00.000Z',
    banned:       false,
    settings: {
      emailNotifications: true, replyNotifications: true,
      mentionNotifications: true, upvoteNotifications: false,
      profilePublic: true, showEmail: false, showLocation: true,
      showActivity: true, contentWarnings: true, darkModeDefault: false,
    },
    pinnedPost: null,
  };
})();

// ---- INIT ----
document.addEventListener('DOMContentLoaded', () => {
  // Wire Sign In button
  document.querySelector('.btn-signin')?.addEventListener('click', () => openAuthModal('signin'));
  document.querySelector('.btn-post')?.addEventListener('click', () => {
    if (!PSYCHE.currentUser) { openAuthModal('signin'); return; }
    if (!PSYCHE.canPost()) {
      showToast('Contributor role or higher required to post.');
      return;
    }
    if (typeof openComposeModal === 'function') openComposeModal();
    else navigateTo('page-forum');
  });
});
