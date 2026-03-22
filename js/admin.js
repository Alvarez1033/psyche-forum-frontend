/* ============================================================
   PSYCHE — Admin Panel
   Access: moderator, admin, superadmin only
   Superadmin credentials: admin@psyche.com / admin123
   ============================================================ */

// ---- SEED DEMO USERS FOR ADMIN PANEL TESTING ----
(function seedDemoUsers() {
  const demoUsers = [
    { id:'u_demo1', username:'sarah_l',    displayName:'Sarah L.',      email:'sarah@example.com',  password:'demo1234', role:'member',    karma:3420, postCount:47, commentCount:212, joinedAt:'2024-03-15T10:00:00Z', banned:false, avatarColor:'#1d6fa4' },
    { id:'u_demo2', username:'drpatel',    displayName:'Dr. Patel',     email:'patel@example.com',  password:'demo1234', role:'author',    karma:8910, postCount:83, commentCount:445, joinedAt:'2023-11-20T10:00:00Z', banned:false, avatarColor:'#0d7c6e' },
    { id:'u_demo3', username:'researcherx',displayName:'ResearcherX',   email:'rx@example.com',     password:'demo1234', role:'editor',    karma:5670, postCount:31, commentCount:178, joinedAt:'2024-01-08T10:00:00Z', banned:false, avatarColor:'#7c3aed' },
    { id:'u_demo4', username:'mindful_m',  displayName:'Mindful Maya',  email:'maya@example.com',   password:'demo1234', role:'contributor',karma:1240,postCount:22, commentCount:89,  joinedAt:'2024-06-01T10:00:00Z', banned:false, avatarColor:'#b45309' },
    { id:'u_demo5', username:'anxious_q',  displayName:'Anonymous Q',   email:'aq@example.com',     password:'demo1234', role:'member',    karma:320,  postCount:8,  commentCount:41,  joinedAt:'2025-01-14T10:00:00Z', banned:false, avatarColor:'#4f5d6e' },
    { id:'u_demo6', username:'banned_user',displayName:'Banned User',   email:'ban@example.com',    password:'demo1234', role:'member',    karma:10,   postCount:3,  commentCount:5,   joinedAt:'2025-02-01T10:00:00Z', banned:true,  avatarColor:'#dc2626' },
  ];
  demoUsers.forEach(u => {
    if (!PSYCHE.users[u.id]) {
      PSYCHE.users[u.id] = Object.assign({
        avatar: null, pronouns: '', bio: '', location: '', website: '',
        credentials: '', institution: '', followedTopics: [], joinedCommunities: [],
        pinnedPost: null,
        settings: {
          emailNotifications:true, replyNotifications:true, mentionNotifications:true,
          upvoteNotifications:false, profilePublic:true, showEmail:false,
          showLocation:true, showActivity:true, contentWarnings:true, darkModeDefault:false
        }
      }, u);
    }
  });
})();

// ---- SIMULATED FLAGGED CONTENT ----
const FLAGGED_CONTENT = [
  { id:'f1', type:'post',    title:'Everyone should stop taking their meds and meditate instead',   author:'anonymous_poster', community:'r/Mindfulness',   flags:8,  time:'2h ago',  status:'pending',  reason:'Dangerous medical advice', category:'medical_misinformation', flaggers:['u_demo1','u_demo2','u_demo3'] },
  { id:'f2', type:'comment', title:'That therapist sounds like a scammer, all therapists are fake', author:'angry_user99',     community:'r/CBT',           flags:5,  time:'4h ago',  status:'pending',  reason:'Harassment / disparaging professionals', category:'harassment', flaggers:['u_demo1','u_demo4'] },
  { id:'f3', type:'post',    title:'Sharing my personal experience with self-harm [TW]',            author:'user_healing',     community:'r/Trauma',        flags:3,  time:'1d ago',  status:'pending',  reason:'Sensitive content — needs content warning review', category:'sensitive_content', flaggers:['u_demo2'] },
  { id:'f4', type:'comment', title:'Replied with slurs to a post about LGBTQ+ mental health',      author:'banned_user',      community:'r/Relationships', flags:14, time:'3d ago',  status:'removed',  reason:'Hate speech / slurs', category:'hate_speech', flaggers:['u_demo1','u_demo2','u_demo3','u_demo4'] },
  { id:'f5', type:'post',    title:'Promoting unverified herbal cure for schizophrenia',            author:'herbal_harold',    community:'r/Schizophrenia', flags:11, time:'5d ago',  status:'removed',  reason:'Unverified health claims / misinformation', category:'medical_misinformation', flaggers:['u_demo2','u_demo3'] },
];

// Flag categories for user-facing flag modal
const FLAG_CATEGORIES = [
  { id:'spam',                  label:'Spam',                          desc:'Promotional or repetitive content' },
  { id:'misinformation',        label:'Misinformation',                desc:'False or misleading information' },
  { id:'medical_misinformation',label:'Dangerous Medical Advice',      desc:'Advice that could cause harm' },
  { id:'harassment',            label:'Harassment or Bullying',        desc:'Targeting, intimidating, or demeaning someone' },
  { id:'hate_speech',           label:'Hate Speech',                   desc:'Content targeting identity, religion, or orientation' },
  { id:'sensitive_content',     label:'Sensitive Content',             desc:'Needs a content warning (self-harm, violence, etc.)' },
  { id:'off_topic',             label:'Off Topic',                     desc:'Does not belong in this community' },
  { id:'other',                 label:'Other',                         desc:'Something else — please describe' },
];

// Site announcements state
const SITE_STATE = {
  announcement: '',
  announcementActive: false,
  featuredTopics: ['Anxiety', 'Depression', 'Neuroscience', 'CBT & Therapy'],
};

// ---- RENDER ADMIN PANEL ----
function renderAdminPage() {
  // Access check
  if (!PSYCHE.currentUser || !PSYCHE.canAccessAdmin()) {
    openAuthModal('signin');
    return;
  }

  const page = document.getElementById('page-admin');
  if (!page) return;

  const u = PSYCHE.currentUser;
  const isSA = PSYCHE.isSuperAdmin();
  const isAdm = PSYCHE.isAdmin();
  const allUsers = Object.values(PSYCHE.users);
  const totalUsers = allUsers.length;
  const totalBanned = allUsers.filter(u => u.banned).length;
  const totalKarma = allUsers.reduce((s, u) => s + (u.karma || 0), 0);
  const pendingFlags = FLAGGED_CONTENT.filter(f => f.status === 'pending').length;

  page.innerHTML = `
    <div class="admin-wrap">

      <!-- Sidebar -->
      <aside class="admin-sidebar">
        <div class="admin-sidebar-header">
          <div class="admin-sidebar-logo">
            <svg width="22" height="22" viewBox="0 0 32 32" fill="none">
              <circle cx="16" cy="16" r="14" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.25)" stroke-width="1.5"/>
              <text x="16" y="21.5" text-anchor="middle" font-size="17" fill="white" font-family="Georgia,serif" font-style="italic">ψ</text>
            </svg>
            <span class="admin-sidebar-name">Psyche Admin</span>
          </div>
          <div class="admin-sidebar-role">${isSA ? '⬡ Superadmin' : isAdm ? '⬡ Admin' : '⬡ Moderator'}</div>
        </div>

        <nav class="admin-nav">
          <button class="admin-nav-item active" data-section="dashboard">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
            Dashboard
          </button>
          <button class="admin-nav-item" data-section="users">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            User Management
            <span class="admin-nav-badge">${totalUsers}</span>
          </button>
          <button class="admin-nav-item" data-section="moderation">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            Moderation
            ${pendingFlags > 0 ? `<span class="admin-nav-badge admin-nav-badge--alert">${pendingFlags}</span>` : ''}
          </button>
          <button class="admin-nav-item" data-section="support">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            Support
            ${typeof PSYCHE_TICKETS !== 'undefined' && PSYCHE_TICKETS.tickets.filter(t=>t.status==='open').length > 0 ? `<span class="admin-nav-badge admin-nav-badge--alert">${PSYCHE_TICKETS.tickets.filter(t=>t.status==='open').length}</span>` : ''}
          </button>
          ${isAdm ? `
          <button class="admin-nav-item" data-section="roles">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            Roles
          </button>` : ''}
          ${isAdm ? `
          <button class="admin-nav-item" data-section="permissions">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            Permissions
          </button>` : ''}
          <button class="admin-nav-item" data-section="audit">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
            Audit Log
          </button>
          ${isAdm ? `
          <button class="admin-nav-item" data-section="updates">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            Updates
          </button>` : ''}
          ${isAdm ? `
          <button class="admin-nav-item" data-section="settings">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
            Site Settings
          </button>` : ''}
        </nav>

        <div class="admin-sidebar-footer">
          <button class="admin-back-btn" data-page="page-home">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
            Back to Psyche
          </button>
        </div>
      </aside>

      <!-- Main content -->
      <main class="admin-main">

        <!-- Header bar -->
        <header class="admin-topbar">
          <div class="admin-topbar-left">
            <h1 class="admin-page-title" id="admin-page-title">Dashboard</h1>
          </div>
          <div class="admin-topbar-right">
            <div class="admin-topbar-user">
              <div class="nav-avatar" style="background:${u.avatarColor};width:30px;height:30px;font-size:.8rem;font-weight:800;border:none;">
                ${initials(u.displayName)}
              </div>
              <span>${u.displayName}</span>
            </div>
          </div>
        </header>

        <!-- ── DASHBOARD SECTION ── -->
        <section class="admin-section active" data-section="dashboard">
          <div class="admin-stat-grid">
            <div class="admin-stat-card">
              <div class="admin-stat-icon admin-stat-icon--blue">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
              </div>
              <div class="admin-stat-body">
                <div class="admin-stat-number">${totalUsers}</div>
                <div class="admin-stat-label">Total Users</div>
              </div>
            </div>
            <div class="admin-stat-card">
              <div class="admin-stat-icon admin-stat-icon--green">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
              </div>
              <div class="admin-stat-body">
                <div class="admin-stat-number">${allUsers.reduce((s,u)=>s+(u.postCount||0),0)}</div>
                <div class="admin-stat-label">Total Posts</div>
              </div>
            </div>
            <div class="admin-stat-card">
              <div class="admin-stat-icon admin-stat-icon--purple">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
              </div>
              <div class="admin-stat-body">
                <div class="admin-stat-number">${allUsers.reduce((s,u)=>s+(u.commentCount||0),0)}</div>
                <div class="admin-stat-label">Total Comments</div>
              </div>
            </div>
            <div class="admin-stat-card ${pendingFlags > 0 ? 'admin-stat-card--alert' : ''}">
              <div class="admin-stat-icon admin-stat-icon--red">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              </div>
              <div class="admin-stat-body">
                <div class="admin-stat-number">${pendingFlags}</div>
                <div class="admin-stat-label">Pending Flags</div>
              </div>
            </div>
            <div class="admin-stat-card">
              <div class="admin-stat-icon admin-stat-icon--orange">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              </div>
              <div class="admin-stat-body">
                <div class="admin-stat-number">${totalBanned}</div>
                <div class="admin-stat-label">Banned Users</div>
              </div>
            </div>
            <div class="admin-stat-card">
              <div class="admin-stat-icon admin-stat-icon--teal">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
              </div>
              <div class="admin-stat-body">
                <div class="admin-stat-number">${(totalKarma/1000).toFixed(1)}k</div>
                <div class="admin-stat-label">Total Karma</div>
              </div>
            </div>
          </div>

          <!-- Role breakdown -->
          <div class="admin-card" style="margin-top:1.5rem">
            <div class="admin-card-title">Users by Role</div>
            <div class="admin-role-breakdown">
              ${Object.entries(PSYCHE.roles).map(([key, role]) => {
                const count = allUsers.filter(u => u.role === key).length;
                const pct = totalUsers ? Math.round((count/totalUsers)*100) : 0;
                return `
                  <div class="admin-role-row">
                    <span class="role-badge-sm" style="background:${role.bg};color:${role.color}">${role.label}</span>
                    <div class="admin-role-bar-wrap">
                      <div class="admin-role-bar" style="width:${pct}%;background:${role.color}"></div>
                    </div>
                    <span class="admin-role-count">${count}</span>
                  </div>`;
              }).join('')}
            </div>
          </div>

          <!-- Recent signups -->
          <div class="admin-card" style="margin-top:1.5rem">
            <div class="admin-card-title">Recent Signups</div>
            <table class="admin-table">
              <thead><tr><th>User</th><th>Role</th><th>Joined</th><th>Karma</th></tr></thead>
              <tbody>
                ${allUsers.slice(-5).reverse().map(u => `
                  <tr>
                    <td>
                      <div class="admin-user-cell">
                        <div class="admin-mini-avatar" style="background:${u.avatarColor}">${initials(u.displayName)}</div>
                        <div>
                          <div class="admin-user-name">${escapeHtml(u.displayName)}</div>
                          <div class="admin-user-uname">@${escapeHtml(u.username)}</div>
                        </div>
                      </div>
                    </td>
                    <td><span class="role-badge-sm" style="background:${PSYCHE.roles[u.role]?.bg||'#eee'};color:${PSYCHE.roles[u.role]?.color||'#666'}">${PSYCHE.roles[u.role]?.label||u.role}</span></td>
                    <td class="admin-td-muted">${new Date(u.joinedAt).toLocaleDateString()}</td>
                    <td class="admin-td-muted">${(u.karma||0).toLocaleString()}</td>
                  </tr>`).join('')}
              </tbody>
            </table>
          </div>
        </section>

        <!-- ── USERS SECTION ── -->
        <section class="admin-section" data-section="users">
          <div class="admin-toolbar">
            <input class="admin-search" id="user-search" type="search" placeholder="Search by name, username or email…">
            <select class="admin-filter-select" id="user-role-filter">
              <option value="">All Roles</option>
              ${Object.entries(PSYCHE.roles).map(([k,v]) => `<option value="${k}">${v.label}</option>`).join('')}
            </select>
            <select class="admin-filter-select" id="user-status-filter">
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="banned">Banned</option>
            </select>
          </div>

          <div class="admin-card">
            <table class="admin-table admin-table--users" id="users-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Role</th>
                  <th>Joined</th>
                  <th>Posts</th>
                  <th>Karma</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody id="users-tbody">
                ${renderUsersRows(Object.values(PSYCHE.users), isSA, isAdm)}
              </tbody>
            </table>
          </div>
        </section>

        <!-- ── SUPPORT SECTION ── -->
        <section class="admin-section" data-section="support">
          <div class="admin-card" style="padding:0;overflow:hidden">
            ${typeof renderStaffTicketDashboard === 'function' ? renderStaffTicketDashboard(typeof PSYCHE_ROLES !== 'undefined' ? PSYCHE_ROLES.privacyLevel() : 1) : renderSupportTickets?.() || '<p class="admin-empty">Loading...</p>'}
          </div>
        </section>

        <!-- ── MODERATION SECTION ── -->
        <section class="admin-section" data-section="moderation">
          <div class="admin-card">
            <div class="admin-card-title">Flagged Content</div>
            <div class="admin-flag-list" id="flag-list">
              ${renderFlaggedContent()}
            </div>
          </div>
        </section>

        <!-- ── ROLES SECTION ── -->
        ${isAdm ? `
        <section class="admin-section" data-section="roles">
          <div class="admin-card" style="padding:0;overflow:hidden">
            ${typeof renderRoleManagerSection === 'function' ? renderRoleManagerSection(isSA) : ''}
          </div>
        </section>` : ''}

        <!-- ── PERMISSIONS SECTION ── -->
        ${isAdm ? `
        <section class="admin-section" data-section="permissions">
          ${typeof renderPermissionsTree === 'function' ? renderPermissionsTree(isSA, isAdm) : '<p style="color:#6e7681;padding:1rem">Loading...</p>'}
        </section>` : ''}

        <!-- ── AUDIT LOG SECTION ── -->
        <section class="admin-section" data-section="audit">
          <div class="admin-card" style="padding:0;overflow:hidden">
            ${typeof renderAuditLogSection === 'function' ? renderAuditLogSection(typeof PSYCHE_ROLES !== 'undefined' ? PSYCHE_ROLES.privacyLevel() : 3) : '<p class="admin-empty">Loading...</p>'}
          </div>
        </section>

        <!-- ── UPDATES SECTION ── -->
        ${isAdm ? `
        <section class="admin-section" data-section="updates">
          ${typeof renderUpdateLogSection === 'function' ? renderUpdateLogSection(isSA, isAdm) : '<p class="admin-empty">Loading...</p>'}
        </section>` : ''}

        <!-- ── SETTINGS SECTION ── -->
        ${isAdm ? `
        <section class="admin-section" data-section="settings">
          <div class="admin-card" style="max-width:580px">
            <div class="admin-card-title">Site Announcement</div>
            <p class="admin-card-desc">Show a banner to all users at the top of every page.</p>
            <div class="admin-field">
              <label class="admin-label">Announcement Text</label>
              <textarea class="admin-textarea" id="announcement-text" placeholder="e.g. Site maintenance scheduled for Sunday 2am…" rows="3">${escapeHtml(SITE_STATE.announcement)}</textarea>
            </div>
            <div class="admin-field" style="flex-direction:row;align-items:center;gap:1rem">
              <label class="admin-label" style="margin:0">Show announcement banner</label>
              <label class="toggle-track">
                <input type="checkbox" id="announcement-active" ${SITE_STATE.announcementActive ? 'checked' : ''}>
                <span class="toggle-thumb"></span>
              </label>
            </div>
            <button class="admin-save-btn" id="save-announcement">Save Announcement</button>
          </div>

          <div class="admin-card" style="max-width:580px;margin-top:1.5rem">
            <div class="admin-card-title" style="display:flex;align-items:center;justify-content:space-between">
              Staff Announcement
              ${isSA ? `<button class="admin-save-btn" id="add-announcement-btn" style="margin:0;font-size:.78rem">+ Post Announcement</button>` : ''}
            </div>
            <p class="admin-card-desc">Send a confidential notice to staff members.</p>
          </div>
          <div class="admin-card" style="max-width:580px;margin-top:1.5rem">
            <div class="admin-card-title">Featured Topics</div>
            <p class="admin-card-desc">Topics highlighted on the homepage and sidebar.</p>
            <div class="topic-picker" id="admin-featured-topics">
              ${PSYCHE.topics.map(t => `<button type="button" class="topic-pick-btn ${SITE_STATE.featuredTopics.includes(t)?'selected':''}" data-topic="${t}">${t}</button>`).join('')}
            </div>
            <button class="admin-save-btn" id="save-topics" style="margin-top:1rem">Save Featured Topics</button>
          </div>
        </section>` : ''}

      </main>
    </div>
  `;

  // ---- Wire up interactions ----
  wireAdminPanel(page, isSA, isAdm);
}

// ---- RENDER HELPERS ----
function renderUsersRows(users, isSA, isAdm) {
  if (!users.length) return `<tr><td colspan="7" class="admin-empty">No users found.</td></tr>`;
  return users.map(u => {
    const role = PSYCHE.roles[u.role] || PSYCHE.roles.member;
    const isSelf = PSYCHE.currentUser?.id === u.id;
    const canEdit = !isSelf && (isSA || (isAdm && u.role !== 'superadmin'));
    return `
      <tr class="${u.banned ? 'admin-row--banned' : ''}" data-uid="${u.id}">
        <td>
          <div class="admin-user-cell">
            <div class="admin-mini-avatar" style="background:${u.avatarColor}">${initials(u.displayName)}</div>
            <div>
              <div class="admin-user-name">${escapeHtml(u.displayName)} ${isSelf ? '<span class="admin-you-tag">You</span>' : ''}</div>
              <div class="admin-user-uname">@${escapeHtml(u.username)} · ${escapeHtml(u.email)}</div>
            </div>
          </div>
        </td>
        <td>
          ${canEdit ? `
            <select class="admin-role-select" data-uid="${u.id}">
              ${Object.entries(PSYCHE.roles)
                .filter(([k]) => isSA || (isAdm && PSYCHE.roles[k].level < 4))
                .map(([k,v]) => `<option value="${k}" ${u.role===k?'selected':''}>${v.label}</option>`).join('')}
            </select>
          ` : `<span class="role-badge-sm" style="background:${role.bg};color:${role.color}">${role.label}</span>`}
        </td>
        <td class="admin-td-muted">${new Date(u.joinedAt).toLocaleDateString()}</td>
        <td class="admin-td-muted">${(u.postCount||0)}</td>
        <td class="admin-td-muted">${(u.karma||0).toLocaleString()}</td>
        <td>
          ${u.banned
            ? `<span class="admin-status-badge admin-status-badge--banned">Banned</span>`
            : `<span class="admin-status-badge admin-status-badge--active">Active</span>`}
        </td>
        <td>
          <div class="admin-actions-cell">
            ${canEdit ? `
              <button class="admin-action-btn admin-action-btn--role" data-uid="${u.id}" title="Apply role change">Save Role</button>
              ${u.banned
                ? `<button class="admin-action-btn admin-action-btn--unban" data-uid="${u.id}" title="Unban">Unban</button>`
                : `<button class="admin-action-btn admin-action-btn--ban" data-uid="${u.id}" title="Ban">Ban</button>`}
            ` : '<span class="admin-td-muted">—</span>'}
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function renderFlaggedContent() {
  const catLabels = Object.fromEntries((FLAG_CATEGORIES||[]).map(c => [c.id, c.label]));
  return FLAGGED_CONTENT.map(f => {
    const catLabel = catLabels[f.category] || f.category || 'Flagged';
    const catColor = {
      spam:'#6b7280', misinformation:'#f97316', medical_misinformation:'#dc2626',
      harassment:'#db2777', hate_speech:'#7c3aed', sensitive_content:'#ca8a04',
      off_topic:'#0891b2', other:'#6b7280',
    }[f.category] || '#6b7280';
    return `
    <div class="admin-flag-item ${f.status!=='pending'?'admin-flag-item--resolved':''}" data-fid="${f.id}">
      <div class="admin-flag-left">
        <div style="display:flex;align-items:center;gap:.5rem;margin-bottom:.3rem">
          <div class="admin-flag-type ${f.type==='post'?'admin-flag-type--post':'admin-flag-type--comment'}">
            ${f.type === 'post'
              ? `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg> Post`
              : `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg> Comment`}
          </div>
          <span class="admin-flag-category" style="background:${catColor}22;color:${catColor};border:1px solid ${catColor}44">${catLabel}</span>
          <span class="admin-flag-count">${f.flags} flag${f.flags!==1?'s':''}</span>
        </div>
        <div class="admin-flag-title admin-flag-title--link" data-flag-title="${escapeHtml(f.id)}" style="cursor:pointer" title="Click to view">${escapeHtml(f.title)}</div>
        <div class="admin-flag-reason">"${escapeHtml(f.reason||'No reason given')}"</div>
        <div class="admin-flag-meta">
          <span>by @${escapeHtml(f.author)}</span>
          <span>${escapeHtml(f.community)}</span>
          <span>${f.time}</span>
          ${f.flaggers?.length ? `<span>${f.flaggers.length} user${f.flaggers.length!==1?'s':''} flagged</span>` : ''}
        </div>
      </div>
      <div class="admin-flag-right" style="flex-direction:column;gap:.3rem;align-items:flex-end">
        ${f.status === 'pending' ? `
          <button class="admin-action-btn" data-view-flag="${f.id}" style="background:rgba(255,255,255,0.06);color:#8b949e;border-color:rgba(255,255,255,0.1);margin-bottom:.15rem">View</button>
          <button class="admin-action-btn admin-action-btn--approve" data-fid="${f.id}">Keep</button>
          <button class="admin-action-btn admin-action-btn--remove" data-fid="${f.id}">Remove</button>
        ` : `
          <button class="admin-action-btn" data-view-flag="${f.id}" style="background:rgba(255,255,255,0.06);color:#8b949e;border-color:rgba(255,255,255,0.1)">View</button>
          <span class="admin-status-badge admin-status-badge--removed">${f.status === 'approved' ? 'Kept' : 'Removed'}</span>
        `}
      </div>
    </div>`;
  }).join('');
}

// ---- RENDER SUPPORT TICKETS ----
function renderSupportTickets() {
  if (typeof PSYCHE_TICKETS === 'undefined') return '<p class="admin-empty">Support system loading...</p>';
  const tickets = PSYCHE_TICKETS.getForAgent();
  if (!tickets.length) return '<p class="admin-empty">No tickets yet.</p>';
  const privLevel = typeof PSYCHE_ROLES !== 'undefined' ? PSYCHE_ROLES.privacyLevel() : 0;

  return tickets.map(t => `
    <div class="admin-flag-item" data-ticket-id="${t.id}">
      <div class="admin-flag-left">
        <div class="admin-flag-type admin-flag-type--post">${t.category}</div>
        <div class="admin-flag-title">${escapeHtml(t.subject)}</div>
        <div class="admin-flag-meta">
          <span>From: ${escapeHtml(t.userDisplay)}</span>
          ${t.userEmail ? `<span>${escapeHtml(t.userEmail)}</span>` : ''}
          ${t.userRole  ? `<span>Role: ${t.userRole}</span>` : ''}
          ${t.userKarma !== null && t.userKarma !== undefined ? `<span>Karma: ${t.userKarma}</span>` : ''}
          ${t.userBanned ? `<span style="color:#f87171">⚠ Banned</span>` : ''}
          <span>${new Date(t.createdAt).toLocaleDateString()}</span>
          <span class="admin-status-badge admin-status-badge--${t.status==='open'?'active':'removed'}">${t.status}</span>
          <span class="admin-status-badge ${t.priority==='high'?'admin-status-badge--banned':'admin-status-badge--active'}">${t.priority} priority</span>
        </div>
        <div style="font-size:.78rem;color:#8b949e;margin-top:.3rem;line-height:1.4">${escapeHtml(t.message.slice(0,200))}${t.message.length>200?'…':''}</div>
        ${t.responses?.length ? `<div style="font-size:.72rem;color:#6e7681;margin-top:.25rem">${t.responses.length} response${t.responses.length!==1?'s':''}</div>` : ''}
      </div>
      <div class="admin-flag-right" style="flex-direction:column;gap:.3rem">
        ${t.status === 'open' ? `
          <button class="admin-action-btn admin-action-btn--approve" data-ticket-respond="${t.id}">Respond</button>
          <button class="admin-action-btn admin-action-btn--remove" data-ticket-close="${t.id}">Close</button>
        ` : `<span class="admin-status-badge admin-status-badge--removed">Resolved</span>`}
      </div>
    </div>`).join('');
}

// ---- RENDER POST QUEUE ----
function renderPostQueue(kind, isAdm, isSA) {
  if (typeof PSYCHE_DATA === 'undefined') return '<p class="admin-empty">Loading...</p>';
  const posts = PSYCHE_DATA.getPendingPosts(kind);
  if (!posts.length) return '<p class="admin-empty">No pending posts.</p>';

  return posts.map(p => {
    const author = PSYCHE.users[p.authorId];
    const statusLabel = {
      pending: 'Pending Review',
      needs_review: '⚠ Needs Review',
      timer: '⏱ Timer (auto-approves)',
    }[p.status] || p.status;

    return `
      <div class="admin-flag-item" data-post-id="${p.id}">
        <div class="admin-flag-left">
          <div class="admin-flag-type admin-flag-type--post">${kind === 'blog' ? '📝 Blog' : '💬 Forum'}</div>
          <div class="admin-flag-title">${escapeHtml(p.title)}</div>
          <div class="admin-flag-meta">
            <span>by @${escapeHtml(author?.username || '?')}</span>
            <span>${escapeHtml(p.topic)}</span>
            <span>${new Date(p.createdAt).toLocaleDateString()}</span>
            <span class="admin-status-badge admin-status-badge--${p.status === 'pending' || p.status === 'timer' ? 'active' : 'banned'}">${statusLabel}</span>
          </div>
          ${p.needsReviewReason ? `<div style="font-size:.78rem;color:#f87171;margin-top:.3rem">Review note: ${escapeHtml(p.needsReviewReason)}</div>` : ''}
        </div>
        <div class="admin-flag-right" style="flex-direction:column;gap:.3rem">
          ${isAdm ? `<button class="admin-action-btn admin-action-btn--approve" data-action="approve" data-pid="${p.id}">Approve</button>` : ''}
          ${isAdm ? `<button class="admin-action-btn admin-action-btn--ban" data-action="temp_remove" data-pid="${p.id}">Temp Remove</button>` : ''}
          ${isSA ? `<button class="admin-action-btn admin-action-btn--ban" data-action="delete" data-pid="${p.id}" style="background:rgba(127,29,29,.2);color:#f87171">Delete</button>` : ''}
        </div>
      </div>`;
  }).join('');
}

// ---- WIRE INTERACTIONS ----
function wireAdminPanel(page, isSA, isAdm) {

  // Section navigation
  page.querySelectorAll('.admin-nav-item').forEach(btn => {
    btn.addEventListener('click', () => {
      const sec = btn.dataset.section;
      page.querySelectorAll('.admin-nav-item').forEach(b => b.classList.remove('active'));
      page.querySelectorAll('.admin-section').forEach(s => s.classList.remove('active'));
      btn.classList.add('active');
      page.querySelector(`.admin-section[data-section="${sec}"]`)?.classList.add('active');
      page.querySelector('#admin-page-title').textContent =
        { dashboard: 'Dashboard', users: 'User Management', moderation: 'Moderation', support: 'Support Tickets', roles: 'Role Manager', permissions: 'Permissions Reference', audit: 'Audit Log', updates: 'Updates & Changelogs', settings: 'Site Settings' }[sec] || 'Admin';
    });
  });

  // Back to site
  page.querySelector('.admin-back-btn')?.addEventListener('click', () => navigateTo('page-home'));

  // User search + filters
  function filterUsers() {
    const q = (document.getElementById('user-search')?.value || '').toLowerCase();
    const role = document.getElementById('user-role-filter')?.value;
    const status = document.getElementById('user-status-filter')?.value;
    let users = Object.values(PSYCHE.users).filter(u => {
      const matchQ = !q || u.displayName.toLowerCase().includes(q) ||
                     u.username.toLowerCase().includes(q) ||
                     u.email.toLowerCase().includes(q);
      const matchRole = !role || u.role === role;
      const matchStatus = !status || (status === 'banned' ? u.banned : !u.banned);
      return matchQ && matchRole && matchStatus;
    });
    document.getElementById('users-tbody').innerHTML = renderUsersRows(users, isSA, isAdm);
    wireUserActions(page);
  }
  document.getElementById('user-search')?.addEventListener('input', filterUsers);
  document.getElementById('user-role-filter')?.addEventListener('change', filterUsers);
  document.getElementById('user-status-filter')?.addEventListener('change', filterUsers);

  wireUserActions(page);
  wireModerationActions(page);
  wirePostQueueActions(page);
  wireSupportTicketActions(page);

  // Wire permissions tree interactions
  const permSearch = page.querySelector('#perm-search');
  permSearch?.addEventListener('input', () => {
    const q = permSearch.value.toLowerCase().trim();
    page.querySelectorAll('.perm-matrix-row').forEach(row => {
      const key = row.dataset.permKey || '';
      const label = row.dataset.permLabel || '';
      row.style.display = (!q || key.includes(q) || label.includes(q)) ? '' : 'none';
    });
    // Also show/hide group rows based on whether any children are visible
    page.querySelectorAll('.perm-group-row').forEach(groupRow => {
      let next = groupRow.nextElementSibling;
      let anyVisible = false;
      while (next && !next.classList.contains('perm-group-row')) {
        if (next.style.display !== 'none') anyVisible = true;
        next = next.nextElementSibling;
      }
      groupRow.style.display = anyVisible ? '' : 'none';
    });
  });

  // View toggle: Matrix vs By Role
  page.querySelector('#perm-view-matrix')?.addEventListener('click', (e) => {
    page.querySelector('#perm-matrix-view').style.display = 'block';
    page.querySelector('#perm-roles-view').style.display = 'none';
    page.querySelectorAll('.perm-view-btn').forEach(b => b.classList.remove('active'));
    e.target.classList.add('active');
  });
  page.querySelector('#perm-view-roles')?.addEventListener('click', (e) => {
    page.querySelector('#perm-matrix-view').style.display = 'none';
    page.querySelector('#perm-roles-view').style.display = 'block';
    page.querySelectorAll('.perm-view-btn').forEach(b => b.classList.remove('active'));
    e.target.classList.add('active');
  });

  // Role list buttons in by-role view
  page.querySelectorAll('.perm-role-list-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      page.querySelectorAll('.perm-role-list-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const roleId = btn.dataset.roleId;
      const role = typeof PSYCHE_ROLES !== 'undefined' ? PSYCHE_ROLES.get(roleId) : null;
      const perms = typeof PSYCHE_PERMISSIONS !== 'undefined' ? Object.entries(PSYCHE_PERMISSIONS) : [];
      const myPerms = PSYCHE.currentUser ? PSYCHE_ROLES.resolvePermissions(PSYCHE.currentUser.role) : new Set();
      const detail = page.querySelector('#perm-role-detail');
      if (detail && role) detail.innerHTML = renderRoleDetail(role, perms, myPerms);
    });
  });

  // Wire audit log
  const auditSearch = page.querySelector('#audit-search');
  const auditActionFilter = page.querySelector('#audit-action-filter');
  const auditLevelFilter = page.querySelector('#audit-level-filter');
  const filterAudit = () => {
    const q = auditSearch?.value.toLowerCase() || '';
    const action = auditActionFilter?.value || '';
    const level = parseInt(auditLevelFilter?.value) || 0;
    page.querySelectorAll('.audit-row').forEach(row => {
      const rowAction = row.dataset.action || '';
      const rowLevel = parseInt(row.dataset.level) || 0;
      const text = row.textContent.toLowerCase();
      const show = (!q || text.includes(q)) && (!action || rowAction.includes(action)) && (!level || rowLevel === level);
      row.style.display = show ? '' : 'none';
    });
  };
  auditSearch?.addEventListener('input', filterAudit);
  auditActionFilter?.addEventListener('change', filterAudit);
  auditLevelFilter?.addEventListener('change', filterAudit);

  // Wire updates buttons
  page.querySelector('#add-changelog-btn')?.addEventListener('click', () => typeof openAddChangelogModal === 'function' && openAddChangelogModal());
  page.querySelector('#add-next-update-btn')?.addEventListener('click', () => typeof openAddNextUpdateModal === 'function' && openAddNextUpdateModal());
  page.querySelector('#add-announcement-btn')?.addEventListener('click', () => typeof openCreateAnnouncementModal === 'function' && openCreateAnnouncementModal());

  // Wire role manager
  if (isAdm && typeof wireRoleManager === 'function') {
    wireRoleManager(page.querySelector('.admin-section[data-section="roles"]'));
  }

  // Settings
  if (isAdm) {
    document.getElementById('admin-featured-topics')?.querySelectorAll('.topic-pick-btn').forEach(btn => {
      btn.addEventListener('click', () => btn.classList.toggle('selected'));
    });
    document.getElementById('save-announcement')?.addEventListener('click', () => {
      SITE_STATE.announcement = document.getElementById('announcement-text').value;
      SITE_STATE.announcementActive = document.getElementById('announcement-active').checked;
      updateSiteAnnouncement();
      showToast('Announcement saved.');
    });
    document.getElementById('save-topics')?.addEventListener('click', () => {
      SITE_STATE.featuredTopics = [...document.querySelectorAll('#admin-featured-topics .topic-pick-btn.selected')].map(b => b.dataset.topic);
      showToast(`Featured topics updated (${SITE_STATE.featuredTopics.length} selected).`);
    });
  }
}

function wireUserActions(page) {
  // View user profile (staff view)
  page.querySelectorAll('[data-view-uid]').forEach(btn => {
    btn.addEventListener('click', () => openStaffUserView(btn.dataset.viewUid));
  });
  // Save role buttons
  page.querySelectorAll('.admin-action-btn--role').forEach(btn => {
    btn.addEventListener('click', () => {
      const uid = btn.dataset.uid;
      const select = page.querySelector(`.admin-role-select[data-uid="${uid}"]`);
      const newRole = select?.value;
      if (!newRole) return;
      const result = PSYCHE.assignRole(uid, newRole);
      if (result.success) {
        const roleDef = PSYCHE.roles[newRole];
        const badge = page.querySelector(`tr[data-uid="${uid}"] .role-badge-sm`);
        showToast(`Role updated to ${roleDef.label}`);
        // Re-render just the status badge color on the select
        select.style.borderColor = roleDef.color;
        setTimeout(() => select.style.borderColor = '', 1500);
      } else {
        showToast(result.error);
      }
    });
  });

  // Ban buttons
  page.querySelectorAll('.admin-action-btn--ban').forEach(btn => {
    btn.addEventListener('click', () => {
      const uid = btn.dataset.uid;
      const result = PSYCHE.setBanned(uid, true);
      if (result.success) {
        showToast('User banned.');
        const row = page.querySelector(`tr[data-uid="${uid}"]`);
        if (row) {
          row.classList.add('admin-row--banned');
          row.querySelector('.admin-status-badge').className = 'admin-status-badge admin-status-badge--banned';
          row.querySelector('.admin-status-badge').textContent = 'Banned';
          btn.className = 'admin-action-btn admin-action-btn--unban';
          btn.textContent = 'Unban';
          btn.title = 'Unban';
          btn.dataset.uid = uid;
        }
      } else { showToast(result.error); }
    });
  });

  // Unban buttons
  page.querySelectorAll('.admin-action-btn--unban').forEach(btn => {
    btn.addEventListener('click', () => {
      const uid = btn.dataset.uid;
      const result = PSYCHE.setBanned(uid, false);
      if (result.success) {
        showToast('User unbanned.');
        const row = page.querySelector(`tr[data-uid="${uid}"]`);
        if (row) {
          row.classList.remove('admin-row--banned');
          row.querySelector('.admin-status-badge').className = 'admin-status-badge admin-status-badge--active';
          row.querySelector('.admin-status-badge').textContent = 'Active';
          btn.className = 'admin-action-btn admin-action-btn--ban';
          btn.textContent = 'Ban';
          btn.title = 'Ban';
          btn.dataset.uid = uid;
        }
      } else { showToast(result.error); }
    });
  });
}

function wireModerationActions(page) {
  // View flagged content (jump to post or show detail)
  page.querySelectorAll('[data-view-flag]').forEach(btn => {
    btn.addEventListener('click', () => {
      const fid = btn.dataset.viewFlag;
      const item = FLAGGED_CONTENT.find(f => f.id === fid);
      if (!item) return;
      // Try to open the post in the review panel if it has a post ID
      if (item.postId && typeof openPostReviewPanel === 'function') {
        openPostReviewPanel(item.postId);
      } else {
        // Show a detail modal with all info
        openFlagDetailModal(item);
      }
    });
  });
  // Clickable title
  page.querySelectorAll('[data-flag-title]').forEach(el => {
    el.addEventListener('click', () => {
      const fid = el.dataset.flagTitle;
      const item = FLAGGED_CONTENT.find(f => f.id === fid);
      if (item) openFlagDetailModal(item);
    });
  });
  page.querySelectorAll('.admin-action-btn--remove').forEach(btn => {
    btn.addEventListener('click', () => {
      const fid = btn.dataset.fid;
      const item = FLAGGED_CONTENT.find(f => f.id === fid);
      if (item) {
        item.status = 'removed';
        document.getElementById('flag-list').innerHTML = renderFlaggedContent();
        wireModerationActions(page);
        showToast('Content removed.');
      }
    });
  });
  page.querySelectorAll('.admin-action-btn--approve').forEach(btn => {
    btn.addEventListener('click', () => {
      const fid = btn.dataset.fid;
      const item = FLAGGED_CONTENT.find(f => f.id === fid);
      if (item) {
        item.status = 'approved';
        const el = page.querySelector(`.admin-flag-item[data-fid="${fid}"]`);
        if (el) el.remove();
        showToast('Content kept — flags dismissed.');
      }
    });
  });
}

function wireSupportTicketActions(page) {
  // New ticket dashboard wiring is handled by helpdesk.js event delegation
  // Wire search/filter for staff ticket list
  const search = page.querySelector('#std-search');
  const statusF = page.querySelector('#std-status-filter');
  const priorityF = page.querySelector('#std-priority-filter');
  const claimedF = page.querySelector('#std-claimed-filter');

  const filterTickets = () => {
    const q = search?.value.toLowerCase() || '';
    const status = statusF?.value || '';
    const priority = priorityF?.value || '';
    const claimed = claimedF?.value || '';
    const u = PSYCHE.currentUser;

    let tickets = [...PSYCHE_HD.getEscalated(), ...PSYCHE_HD.getOpen().filter(t => t.status !== 'escalated'), ...PSYCHE_HD.getResolved()];
    if (q) tickets = tickets.filter(t => t.id.toLowerCase().includes(q) || t.subject.toLowerCase().includes(q) || t.email?.toLowerCase().includes(q));
    if (status) tickets = tickets.filter(t => t.status === status);
    if (priority) tickets = tickets.filter(t => t.priority === priority);
    if (claimed === 'mine') tickets = tickets.filter(t => t.claimedBy === u?.id);
    if (claimed === 'unclaimed') tickets = tickets.filter(t => !t.claimedBy);

    const privLevel = typeof PSYCHE_ROLES !== 'undefined' ? PSYCHE_ROLES.privacyLevel() : 1;
    const list = page.querySelector('#std-ticket-list');
    if (list) list.innerHTML = renderStaffTicketList(tickets, u, privLevel);
  };

  search?.addEventListener('input', filterTickets);
  statusF?.addEventListener('change', filterTickets);
  priorityF?.addEventListener('change', filterTickets);
  claimedF?.addEventListener('change', filterTickets);
}

function openFlagDetailModal(f) {
  document.querySelector('.flag-detail-overlay')?.remove();
  const overlay = document.createElement('div');
  overlay.className = 'flag-detail-overlay auth-modal-overlay';
  overlay.style.cssText = 'opacity:1;z-index:9010';
  const catColors = {
    spam:'#6b7280', misinformation:'#f97316', medical_misinformation:'#dc2626',
    harassment:'#db2777', hate_speech:'#7c3aed', sensitive_content:'#ca8a04',
    off_topic:'#0891b2', other:'#6b7280',
  };
  const color = catColors[f.category] || '#6b7280';

  overlay.innerHTML = `
    <div class="auth-modal" style="max-width:500px">
      <button class="auth-modal-close" id="fld-close">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
      <div style="display:flex;align-items:center;gap:.6rem;margin-bottom:1rem">
        <span class="admin-flag-category" style="background:${color}22;color:${color};border:1px solid ${color}44;font-size:.78rem;padding:.25rem .65rem;border-radius:4px">${(FLAG_CATEGORIES||[]).find(c=>c.id===f.category)?.label||f.category||'Flagged'}</span>
        <span style="font-size:.8rem;color:#8b949e">${f.type} · ${f.flags} flag${f.flags!==1?'s':''} · ${f.time}</span>
      </div>
      <h2 style="font-size:1rem;font-weight:700;color:var(--color-text);margin:0 0 .6rem">${escapeHtml(f.title)}</h2>
      <div style="background:rgba(255,255,255,.04);border-radius:8px;padding:.75rem;margin-bottom:1rem">
        <div style="font-size:.72rem;text-transform:uppercase;letter-spacing:.05em;color:#6e7681;margin-bottom:.35rem">Flag Reason</div>
        <div style="font-size:.88rem;color:#e6edf3">"${escapeHtml(f.reason||'No reason provided')}"</div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:.5rem;margin-bottom:1rem">
        <div class="sview-field"><span class="sview-label">Author</span><span class="sview-val">@${escapeHtml(f.author)}</span></div>
        <div class="sview-field"><span class="sview-label">Community</span><span class="sview-val">${escapeHtml(f.community)}</span></div>
        <div class="sview-field"><span class="sview-label">Flaggers</span><span class="sview-val">${f.flaggers?.length||f.flags} user${(f.flaggers?.length||f.flags)!==1?'s':''}</span></div>
        <div class="sview-field"><span class="sview-label">Status</span><span class="sview-val">${f.status}</span></div>
      </div>
      ${f.status === 'pending' ? `
      <div style="display:flex;gap:.5rem;justify-content:flex-end">
        <button class="admin-action-btn admin-action-btn--approve" onclick="FLAGGED_CONTENT.find(x=>x.id==='${f.id}').status='approved';this.closest('.auth-modal-overlay').remove();showToast('Content kept.')">Keep Content</button>
        <button class="admin-action-btn admin-action-btn--remove" onclick="FLAGGED_CONTENT.find(x=>x.id==='${f.id}').status='removed';this.closest('.auth-modal-overlay').remove();showToast('Content removed.')">Remove Content</button>
      </div>` : ''}
    </div>
  `;

  document.body.appendChild(overlay);
  overlay.querySelector('#fld-close').addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
}

function wirePostQueueActions(page) {
  // Actions are handled by helpdesk.js event delegation for review button
  // Direct approve/remove/delete actions still handled here
  page.querySelectorAll('[data-action][data-pid]').forEach(btn => {
    btn.addEventListener('click', () => {
      const pid = btn.dataset.pid;
      const action = btn.dataset.action;
      const actor = PSYCHE.currentUser?.id;
      let result;
      if (action === 'approve') {
        result = PSYCHE_DATA.approvePost(pid, actor);
        if (result.success) { showToast('Post approved and published.'); PSYCHE_NOTIFICATIONS.add?.({ userId: PSYCHE_DATA.getPost(pid)?.authorId, type:'post_approved', title:'Your post is live! 🎉', body:'Your post has been approved and published.', link:'post:'+pid }); }
      } else if (action === 'temp_remove') {
        const reason = prompt('Reason for temporary removal:');
        if (!reason) return;
        result = PSYCHE_DATA.tempRemovePost(pid, reason, actor);
        if (result.success) showToast('Post temporarily removed. Author notified.');
      } else if (action === 'delete') {
        if (!confirm('Permanently delete this post?')) return;
        result = PSYCHE_DATA.softDeletePost(pid, actor);
        if (result.success) showToast('Post deleted and archived.');
      }
      if (result?.success) {
        const isSA = PSYCHE_ROLES.isSuperAdmin(); const isAdm = PSYCHE_ROLES.isAdmin();
        const blogQ  = page.querySelector('#blog-post-queue');
        const forumQ = page.querySelector('#forum-post-queue');
        if (blogQ)  blogQ.innerHTML  = typeof renderPostQueue === 'function' ? renderPostQueue('blog', isAdm, isSA) : '';
        if (forumQ) forumQ.innerHTML = typeof renderPostQueue === 'function' ? renderPostQueue('forum', isAdm, isSA) : '';
        wirePostQueueActions(page);
      } else if (result) showToast(result.error);
    });
  });
}

function updateSiteAnnouncement() {
  let bar = document.getElementById('site-announcement-bar');
  if (SITE_STATE.announcementActive && SITE_STATE.announcement) {
    if (!bar) {
      bar = document.createElement('div');
      bar.id = 'site-announcement-bar';
      bar.className = 'site-announcement-bar';
      document.body.insertBefore(bar, document.body.firstChild);
    }
    bar.textContent = SITE_STATE.announcement;
    bar.style.display = 'block';
  } else if (bar) {
    bar.style.display = 'none';
  }
}

// ============================================================
// PERMISSIONS REFERENCE TREE — Redesigned
// ============================================================
function renderPermissionsTree(isSA, isAdm) {
  const viewer = PSYCHE.currentUser;
  const privLevel = typeof PSYCHE_ROLES !== 'undefined' ? PSYCHE_ROLES.privacyLevel(viewer) : 0;

  const CONFIDENTIAL_PERMS = ['users.full_info','users.admin_info','admin.roles.manage','admin.settings','post.temp_remove'];
  const SUPERADMIN_ONLY_PERMS = ['users.full_info','admin.roles.manage'];

  const roles = typeof PSYCHE_ROLES !== 'undefined' ? PSYCHE_ROLES.getAll() : [];
  const perms = typeof PSYCHE_PERMISSIONS !== 'undefined' ? PSYCHE_PERMISSIONS : {};

  // Build filtered perms list
  const visiblePerms = Object.entries(perms).filter(([key]) => {
    if (SUPERADMIN_ONLY_PERMS.includes(key) && !isSA) return false;
    if (CONFIDENTIAL_PERMS.includes(key) && !isAdm) return false;
    return true;
  });

  // My own permissions
  const myPerms = viewer ? (typeof PSYCHE_ROLES !== 'undefined' ? PSYCHE_ROLES.resolvePermissions(viewer.role) : new Set()) : new Set();

  // Group perms
  const groupOrder = ['Forum','Content','Moderation','Support','Users','Admin'];
  const groups = {};
  visiblePerms.forEach(([key, val]) => {
    if (!groups[val.group]) groups[val.group] = [];
    groups[val.group].push({ key, ...val });
  });
  const sortedGroups = Object.entries(groups).sort(([a],[b]) => (groupOrder.indexOf(a)??99)-(groupOrder.indexOf(b)??99));

  return `
    <div class="perm-tree">

      <!-- Controls bar -->
      <div class="perm-controls">
        <input type="search" class="admin-search" id="perm-search" placeholder="Search permissions or roles…" style="max-width:280px">
        <div class="perm-view-toggle">
          <button class="perm-view-btn active" id="perm-view-matrix" title="Matrix view">⊞ Matrix</button>
          <button class="perm-view-btn" id="perm-view-roles" title="Roles view">☰ By Role</button>
        </div>
        <div class="perm-legend">
          <span class="perm-legend-dot" style="background:#4ade80"></span><span>Direct</span>
          <span class="perm-legend-dot" style="background:#60a5fa"></span><span>Inherited</span>
          <span class="perm-legend-dot" style="background:#1f2937;border:1px solid #374151"></span><span>None</span>
        </div>
        <span class="perm-tree-subtitle">
          Your level:
          <span class="perm-viewer-role" style="background:${PSYCHE_ROLES.get(viewer?.role)?.bg};color:${PSYCHE_ROLES.get(viewer?.role)?.color}">
            ${PSYCHE_ROLES.get(viewer?.role)?.displayName || viewer?.role || '?'}
          </span>
          ${!isSA ? '<span class="perm-confidential-note">· Some permissions hidden</span>' : ''}
        </span>
      </div>

      <!-- MATRIX VIEW -->
      <div class="perm-matrix-view" id="perm-matrix-view">
        <div class="perm-matrix-scroll">
          <table class="perm-matrix-table" id="perm-matrix-table">
            <thead>
              <tr>
                <th class="perm-matrix-th-perm">Permission</th>
                ${roles.map(r => `
                  <th class="perm-matrix-th-role ${r.id === viewer?.role ? 'perm-matrix-th--me' : ''}"
                    title="Level ${r.level} — ${r.description||''}">
                    <div class="perm-matrix-role-header">
                      <span class="perm-matrix-role-dot" style="background:${r.color}"></span>
                      <span class="perm-matrix-role-name">${r.displayName||r.name}</span>
                      <span class="perm-matrix-role-level">Lv ${r.level}</span>
                    </div>
                  </th>`).join('')}
              </tr>
            </thead>
            <tbody id="perm-matrix-body">
              ${sortedGroups.map(([group, groupPerms]) => `
                <tr class="perm-group-row">
                  <td colspan="${roles.length + 1}" class="perm-group-header-cell">${group} <span class="perm-group-count">${groupPerms.length}</span></td>
                </tr>
                ${groupPerms.map(p => {
                  const isConf = CONFIDENTIAL_PERMS.includes(p.key);
                  const isSAOnly = SUPERADMIN_ONLY_PERMS.includes(p.key);
                  const isMine = myPerms.has(p.key);
                  return `
                    <tr class="perm-matrix-row ${isMine ? 'perm-matrix-row--mine' : ''}" data-perm-key="${p.key}" data-perm-label="${p.label.toLowerCase()}">
                      <td class="perm-matrix-td-label">
                        <div class="perm-matrix-label-wrap">
                          ${isConf ? '<span title="Admin+ only">🔒</span>' : ''}
                          ${isSAOnly ? '<span title="Superadmin only">👑</span>' : ''}
                          <div>
                            <div class="perm-matrix-perm-name">${p.label} ${isMine ? '<span class="perm-mine-tag">You</span>' : ''}</div>
                            <div class="perm-matrix-perm-key">${p.key}</div>
                          </div>
                        </div>
                      </td>
                      ${roles.map(r => {
                        const resolved = typeof PSYCHE_ROLES !== 'undefined' ? PSYCHE_ROLES.resolvePermissions(r.id) : new Set();
                        const hasOwn = (r.permissions||[]).includes(p.key);
                        const hasInherited = resolved.has(p.key) && !hasOwn;
                        return `
                          <td class="perm-matrix-cell ${r.id===viewer?.role?'perm-matrix-cell--me':''} ${hasOwn?'perm-matrix-cell--own':hasInherited?'perm-matrix-cell--inherited':'perm-matrix-cell--none'}"
                            title="${hasOwn ? 'Directly granted to '+r.name : hasInherited ? 'Inherited' : 'Not granted'}">
                            ${hasOwn ? `<span class="perm-cell-check" style="color:${r.color}">✓</span>` :
                              hasInherited ? '<span class="perm-cell-inherit">↑</span>' :
                              '<span class="perm-cell-none">·</span>'}
                          </td>`;
                      }).join('')}
                    </tr>`;
                }).join('')}
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <!-- BY-ROLE VIEW -->
      <div class="perm-roles-view" id="perm-roles-view" style="display:none">
        <div class="perm-roles-layout">
          <div class="perm-role-list" id="perm-role-list">
            ${roles.map((r,i) => `
              <button class="perm-role-list-btn ${i===0?'active':''}" data-role-id="${r.id}">
                <span class="perm-matrix-role-dot" style="background:${r.color}"></span>
                <div>
                  <div class="perm-role-list-name">${r.displayName||r.name}</div>
                  <div class="perm-role-list-level">Level ${r.level} · ${r.description?r.description.slice(0,40)+'…':''}</div>
                </div>
              </button>`).join('')}
          </div>
          <div class="perm-role-detail" id="perm-role-detail">
            ${renderRoleDetail(roles[0], visiblePerms, myPerms)}
          </div>
        </div>
      </div>

      <!-- My permissions summary -->
      <div class="perm-my-summary">
        <div class="perm-my-title">Your permissions (${[...myPerms].length} total)</div>
        <div class="perm-my-list">
          ${[...myPerms].map(key => {
            const p = perms[key];
            if (!p) return '';
            return `<span class="perm-my-item" title="${p.desc}">${p.label}</span>`;
          }).join('')}
        </div>
      </div>

    </div>
  `;
}

function renderRoleDetail(role, visiblePerms, myPerms) {
  if (!role) return '';
  const resolved = typeof PSYCHE_ROLES !== 'undefined' ? PSYCHE_ROLES.resolvePermissions(role.id) : new Set();
  const groupOrder = ['Forum','Content','Moderation','Support','Users','Admin'];
  const groups = {};
  visiblePerms.forEach(([key, val]) => {
    if (!groups[val.group]) groups[val.group] = [];
    groups[val.group].push({ key, ...val });
  });
  const sortedGroups = Object.entries(groups).sort(([a],[b]) => (groupOrder.indexOf(a)??99)-(groupOrder.indexOf(b)??99));

  return `
    <div class="perm-role-detail-inner">
      <div class="perm-role-detail-header">
        <span class="perm-matrix-role-dot" style="background:${role.color};width:12px;height:12px"></span>
        <div>
          <div class="perm-role-detail-name">${role.displayName||role.name}</div>
          <div class="perm-role-detail-desc">${role.description||''}</div>
        </div>
        <span class="role-badge-sm" style="background:${role.bg};color:${role.color}">Level ${role.level}</span>
      </div>
      ${role.inherits?.length ? `
        <div class="perm-role-inherits">
          Inherits from:
          ${role.inherits.map(id => {
            const r = PSYCHE_ROLES.get(id);
            return `<span class="role-badge-sm" style="background:${r?.bg};color:${r?.color}">${r?.displayName||id}</span>`;
          }).join(' ')}
        </div>` : ''}
      <div class="perm-role-perm-count">${resolved.size} permissions total (${(role.permissions||[]).length} direct, ${resolved.size-(role.permissions||[]).length} inherited)</div>
      ${sortedGroups.map(([group, groupPerms]) => {
        const groupHas = groupPerms.filter(p => resolved.has(p.key));
        if (!groupHas.length) return '';
        return `
          <div class="perm-role-group">
            <div class="perm-role-group-title">${group} <span class="perm-group-count">${groupHas.length}/${groupPerms.length}</span></div>
            ${groupHas.map(p => {
              const isOwn = (role.permissions||[]).includes(p.key);
              return `<div class="perm-role-perm-item">
                <span class="${isOwn ? 'perm-check--own' : 'perm-check--inherited'}">${isOwn ? '✓' : '↑'}</span>
                <div>
                  <span class="perm-matrix-perm-name">${p.label}</span>
                  <span class="perm-matrix-perm-key">${p.key}</span>
                </div>
              </div>`;
            }).join('')}
          </div>`;
      }).join('')}
    </div>
  `;
}


// ============================================================
// STAFF USER PROFILE VIEW — tiered privacy
// ============================================================
function openStaffUserView(userId) {
  const viewer = PSYCHE.currentUser;
  if (!viewer || !PSYCHE_ROLES.can('users.view', viewer)) return;
  const privLevel = PSYCHE_ROLES.privacyLevel(viewer);
  const u = PSYCHE.users[userId];
  if (!u) { showToast('User not found.'); return; }

  document.querySelector('.staff-user-overlay')?.remove();
  const overlay = document.createElement('div');
  overlay.className = 'staff-user-overlay';
  const role = PSYCHE_ROLES.get(u.role);
  const userPosts = typeof PSYCHE_DATA !== 'undefined'
    ? Object.values(PSYCHE_DATA.posts).filter(p => p.authorId === userId && !p.deleted)
    : [];
  const userTickets = typeof PSYCHE_TICKETS !== 'undefined'
    ? PSYCHE_TICKETS.tickets.filter(t => t.userId === userId)
    : [];

  // Build info sections based on privacy level
  const sections = [];

  // Level 1+ (Support Agent) — basic identity
  if (privLevel >= 1) {
    sections.push(`
      <div class="sview-section">
        <div class="sview-section-title">
          Identity
          <span class="sview-level-badge sview-level-badge--1">Support</span>
        </div>
        <div class="sview-grid">
          <div class="sview-field"><span class="sview-label">Display Name</span><span class="sview-val">${escapeHtml(u.displayName)}</span></div>
          <div class="sview-field"><span class="sview-label">Username</span><span class="sview-val">@${escapeHtml(u.username)}</span></div>
          <div class="sview-field"><span class="sview-label">Email</span><span class="sview-val">${escapeHtml(u.email)}</span></div>
          <div class="sview-field"><span class="sview-label">Joined</span><span class="sview-val">${new Date(u.joinedAt).toLocaleDateString('en-US',{year:'numeric',month:'long',day:'numeric'})}</span></div>
          <div class="sview-field"><span class="sview-label">Role</span><span class="role-badge-sm" style="background:${role.bg};color:${role.color}">${role.displayName||role.name}</span></div>
          <div class="sview-field"><span class="sview-label">Status</span><span class="admin-status-badge ${u.banned?'admin-status-badge--banned':'admin-status-badge--active'}">${u.banned?'Banned':'Active'}</span></div>
        </div>
        ${userTickets.length > 0 ? `
        <div class="sview-sub-title">Support Tickets (${userTickets.length})</div>
        <div class="sview-ticket-list">
          ${userTickets.map(t => `
            <div class="sview-ticket-item">
              <span class="sview-ticket-cat">${t.category}</span>
              <span class="sview-ticket-subject">${escapeHtml(t.subject)}</span>
              <span class="admin-status-badge admin-status-badge--${t.status==='open'?'active':'removed'}">${t.status}</span>
            </div>`).join('')}
        </div>` : '<p class="sview-empty">No support tickets.</p>'}
      </div>
    `);
  }

  // Level 2+ (Moderator) — activity + moderation history
  if (privLevel >= 2) {
    sections.push(`
      <div class="sview-section">
        <div class="sview-section-title">
          Activity & Moderation
          <span class="sview-level-badge sview-level-badge--2">Moderator</span>
        </div>
        <div class="sview-grid">
          <div class="sview-field"><span class="sview-label">Posts</span><span class="sview-val">${u.postCount||0}</span></div>
          <div class="sview-field"><span class="sview-label">Comments</span><span class="sview-val">${u.commentCount||0}</span></div>
          <div class="sview-field"><span class="sview-label">Karma</span><span class="sview-val">${(u.karma||0).toLocaleString()}</span></div>
          <div class="sview-field"><span class="sview-label">Topics</span><span class="sview-val">${(u.followedTopics||[]).slice(0,5).join(', ')||'None'}</span></div>
        </div>
        <div class="sview-sub-title">Recent Posts (${userPosts.length})</div>
        ${userPosts.slice(0,5).map(p => `
          <div class="sview-post-item">
            <span class="sview-post-status sview-post-status--${p.status||'approved'}">${p.status||'approved'}</span>
            <span class="sview-post-title">${escapeHtml(p.title)}</span>
            <span class="sview-post-kind">${p.postKind}</span>
          </div>`).join('') || '<p class="sview-empty">No posts.</p>'}
        ${u.bio ? `<div class="sview-sub-title">Bio</div><p class="sview-bio">${escapeHtml(u.bio)}</p>` : ''}
      </div>
    `);
  }

  // Level 3+ (Admin) — account flags, login history, full order history
  if (privLevel >= 3) {
    const userOrders = typeof PSYCHE_SHOP !== 'undefined' ? (PSYCHE_SHOP.orders[userId] || []) : [];
    sections.push(`
      <div class="sview-section">
        <div class="sview-section-title">
          Account & Orders
          <span class="sview-level-badge sview-level-badge--3">Admin</span>
        </div>
        <div class="sview-grid">
          <div class="sview-field"><span class="sview-label">Account ID</span><span class="sview-val sview-monospace">${u.id}</span></div>
          <div class="sview-field"><span class="sview-label">Checklist</span><span class="sview-val">${u.checklistComplete?'✓ Complete':'Incomplete'}</span></div>
          <div class="sview-field"><span class="sview-label">Location</span><span class="sview-val">${escapeHtml(u.location||'—')}</span></div>
          <div class="sview-field"><span class="sview-label">Website</span><span class="sview-val">${u.website ? `<a href="https://${u.website}" target="_blank" style="color:#58a6ff">${escapeHtml(u.website)}</a>` : '—'}</span></div>
          <div class="sview-field"><span class="sview-label">Credentials</span><span class="sview-val">${escapeHtml(u.credentials||'—')}</span></div>
          <div class="sview-field"><span class="sview-label">Institution</span><span class="sview-val">${escapeHtml(u.institution||'—')}</span></div>
        </div>
        <div class="sview-sub-title">Shop Orders (${userOrders.length})</div>
        ${userOrders.map(o => `
          <div class="sview-ticket-item">
            <span class="sview-ticket-cat">${o.id}</span>
            <span class="sview-ticket-subject">${o.items.map(i => i.name).join(', ')} — $${o.total.toFixed(2)}</span>
            <span class="admin-status-badge admin-status-badge--active">${o.status}</span>
          </div>`).join('') || '<p class="sview-empty">No orders.</p>'}
      </div>
    `);
  }

  // Level 4 (Superadmin) — everything
  if (privLevel >= 4) {
    sections.push(`
      <div class="sview-section sview-section--sa">
        <div class="sview-section-title">
          Full Account Data
          <span class="sview-level-badge sview-level-badge--4">Superadmin</span>
        </div>
        <div class="sview-grid">
          <div class="sview-field"><span class="sview-label">Notifications</span><span class="sview-val">${JSON.stringify(u.settings||{}).slice(0,80)}…</span></div>
          <div class="sview-field"><span class="sview-label">Pronouns</span><span class="sview-val">${escapeHtml(u.pronouns||'—')}</span></div>
          <div class="sview-field"><span class="sview-label">Role Override</span><span class="sview-val">${escapeHtml(u.roleDisplayOverride||'—')}</span></div>
          <div class="sview-field"><span class="sview-label">Pinned Post</span><span class="sview-val">${u.pinnedPost||'—'}</span></div>
        </div>
        <div class="sview-notice">Payment & card details are never stored on this platform.</div>
      </div>
    `);
  }

  overlay.innerHTML = `
    <div class="staff-user-modal">
      <div class="sview-header">
        <div class="sview-hero">
          <div class="nav-avatar nav-avatar--lg" style="background:${u.avatarColor};width:52px;height:52px;font-size:1.1rem;font-weight:800;border:3px solid rgba(255,255,255,0.1)">
            ${initials(u.displayName)}
          </div>
          <div>
            <div class="sview-name">${escapeHtml(u.displayName)}</div>
            <div class="sview-username">@${escapeHtml(u.username)}</div>
            <div style="margin-top:.3rem;display:flex;gap:.4rem;align-items:center">
              <span class="role-badge-sm" style="background:${role.bg};color:${role.color}">${role.displayName||role.name}</span>
              ${u.banned ? '<span class="admin-status-badge admin-status-badge--banned">Banned</span>' : ''}
            </div>
          </div>
        </div>
        <div class="sview-header-right">
          <div class="sview-privacy-indicator">
            <span class="sview-privacy-label">Viewing as:</span>
            <span class="sview-privacy-level">
              ${['—','Support Agent','Moderator','Admin','Superadmin'][privLevel]}
            </span>
          </div>
          <button class="shop-admin-close" id="sview-close">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
      </div>

      <div class="sview-actions">
        ${PSYCHE_ROLES.can('users.roles.assign', viewer) && u.role !== 'superadmin' ? `
          <select class="admin-role-select sview-role-select" id="sview-role-select">
            ${Object.values(PSYCHE_ROLES.roles)
              .filter(r => PSYCHE_ROLES.isSuperAdmin(viewer) || r.level < (PSYCHE_ROLES.roles[viewer.role]?.level || 0))
              .map(r => `<option value="${r.id}" ${u.role===r.id?'selected':''}>${r.displayName||r.name}</option>`).join('')}
          </select>
          <button class="admin-action-btn admin-action-btn--role" id="sview-assign-role">Assign Role</button>` : ''}
        ${PSYCHE_ROLES.can('mod.ban', viewer) && u.role !== 'superadmin' ? `
          <button class="admin-action-btn ${u.banned?'admin-action-btn--unban':'admin-action-btn--ban'}" id="sview-ban-btn">
            ${u.banned ? 'Unban User' : 'Ban User'}
          </button>` : ''}
      </div>

      <div class="sview-body">
        ${sections.join('')}
      </div>
    </div>
  `;

  document.body.appendChild(overlay);
  overlay.querySelector('#sview-close').addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });

  // Assign role
  overlay.querySelector('#sview-assign-role')?.addEventListener('click', () => {
    const newRole = document.getElementById('sview-role-select').value;
    const result = PSYCHE_ROLES.assignRole(userId, newRole);
    if (result.success) { showToast(`Role updated to ${PSYCHE_ROLES.get(newRole).name}.`); overlay.remove(); }
    else showToast(result.error);
  });

  // Ban
  overlay.querySelector('#sview-ban-btn')?.addEventListener('click', () => {
    const result = PSYCHE.setBanned(userId, !u.banned);
    if (result.success) { showToast(u.banned ? 'User unbanned.' : 'User banned.'); overlay.remove(); }
    else showToast(result.error);
  });
}
