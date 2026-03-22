/* ============================================================
   PSYCHE — Internal Operations Systems
   - Ticket System (full UI, user-facing + staff)
   - Report User (forum)
   - Report Issue (blog/post)
   - Audit Log (compartmentalized by role)
   - Update Log + Next Update (superadmin)
   - Confidential Announcements
   - Staff-configurable report reasons
   ============================================================ */

// ============================================================
// CONFIGURABLE REPORT REASONS (staff can edit in admin panel)
// ============================================================
const PSYCHE_REPORT_CONFIG = {
  // User report reasons (forum context)
  userReasons: [
    { id: 'harassment',      label: 'Harassment or Bullying',     desc: 'Directly targeting or intimidating a user' },
    { id: 'impersonation',   label: 'Impersonation',              desc: 'Pretending to be someone else' },
    { id: 'spam_account',    label: 'Spam Account',               desc: 'Bot or repeated promotional behavior' },
    { id: 'hate_speech',     label: 'Hate Speech',                desc: 'Content targeting identity or orientation' },
    { id: 'threats',         label: 'Threats or Violence',        desc: 'Direct or implied threats against a user' },
    { id: 'doxxing',         label: 'Sharing Personal Info',      desc: 'Posting someone\'s private information' },
    { id: 'other_user',      label: 'Other',                      desc: 'Something else not listed above' },
  ],

  // Post/blog issue reasons (content context)
  postReasons: [
    { id: 'misinformation',  label: 'Misinformation',             desc: 'False or misleading claims' },
    { id: 'medical_advice',  label: 'Harmful Medical Advice',     desc: 'Could cause harm if followed' },
    { id: 'copyright',       label: 'Copyright / Plagiarism',     desc: 'Content taken without attribution' },
    { id: 'off_topic',       label: 'Off Topic',                  desc: 'Does not belong in this community' },
    { id: 'duplicate',       label: 'Duplicate Post',             desc: 'Already posted elsewhere on the platform' },
    { id: 'spam_post',       label: 'Spam',                       desc: 'Promotional or repetitive content' },
    { id: 'sensitive',       label: 'Needs Content Warning',      desc: 'Sensitive topic without proper warning' },
    { id: 'other_post',      label: 'Other',                      desc: 'Something else' },
  ],

  _save() {
    try { localStorage.setItem('psyche_report_config', JSON.stringify({ userReasons: this.userReasons, postReasons: this.postReasons })); } catch(e) {}
  },
  load() {
    try {
      const raw = localStorage.getItem('psyche_report_config');
      if (raw) { const d = JSON.parse(raw); if (d.userReasons) this.userReasons = d.userReasons; if (d.postReasons) this.postReasons = d.postReasons; }
    } catch(e) {}
  },
};

// ============================================================
// AUDIT LOG — compartmentalized by permission level
// ============================================================
const PSYCHE_AUDIT = {
  // Event visibility levels:
  // 1 = Support Agent can see
  // 2 = Moderator can see
  // 3 = Admin can see
  // 4 = Superadmin only
  EVENT_VISIBILITY: {
    // Public-facing actions (support level)
    'ticket.created':      1,
    'ticket.responded':    1,
    'ticket.closed':       1,
    'user.reported':       1,
    'post.flagged':        1,
    // Moderation actions (mod level)
    'post.approved':       2,
    'post.removed':        2,
    'post.ghosted':        2,
    'post.needs_review':   2,
    'comment.removed':     2,
    'user.warned':         2,
    'user.banned':         2,
    'user.unbanned':       2,
    'forum.post.approved': 2,
    // Admin actions (admin level)
    'post.temp_removed':   3,
    'post.deleted':        3,
    'user.role_changed':   3,
    'user.edited':         3,
    'shop.product.added':  3,
    'shop.product.edited': 3,
    'shop.order.updated':  3,
    'site.announcement':   3,
    // Superadmin only
    'user.deleted':        4,
    'role.created':        4,
    'role.edited':         4,
    'role.deleted':        4,
    'update_log.created':  4,
    'config.changed':      4,
    'audit.exported':      4,
  },

  events: [],

  log(action, { actorId, targetId, targetType, detail, meta = {} } = {}) {
    const visibility = this.EVENT_VISIBILITY[action] || 3;
    const entry = {
      id: 'audit_' + Date.now() + '_' + Math.random().toString(36).slice(2,6),
      action,
      actorId: actorId || PSYCHE.currentUser?.id || 'system',
      actorName: actorId
        ? (PSYCHE.users[actorId]?.username || actorId)
        : (PSYCHE.currentUser?.username || 'system'),
      targetId:   targetId   || null,
      targetType: targetType || null,
      detail:     detail     || '',
      meta,
      visibility,
      timestamp: new Date().toISOString(),
    };
    this.events.unshift(entry); // newest first
    if (this.events.length > 1000) this.events = this.events.slice(0, 1000);
    this._save();
    return entry;
  },

  // Get events visible to the current viewer
  getVisible(privLevel = null) {
    const level = privLevel ?? (typeof PSYCHE_ROLES !== 'undefined' ? PSYCHE_ROLES.privacyLevel() : 0);
    return this.events.filter(e => e.visibility <= level);
  },

  // Filter events
  filter({ action, actorId, targetId, from, to, search } = {}) {
    const level = typeof PSYCHE_ROLES !== 'undefined' ? PSYCHE_ROLES.privacyLevel() : 0;
    return this.events.filter(e => {
      if (e.visibility > level) return false;
      if (action && !e.action.includes(action)) return false;
      if (actorId && e.actorId !== actorId) return false;
      if (targetId && e.targetId !== targetId) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!e.action.includes(q) && !e.detail.toLowerCase().includes(q) && !e.actorName.toLowerCase().includes(q)) return false;
      }
      if (from && new Date(e.timestamp) < new Date(from)) return false;
      if (to   && new Date(e.timestamp) > new Date(to))   return false;
      return true;
    });
  },

  _save() { try { localStorage.setItem('psyche_audit', JSON.stringify(this.events)); } catch(e) {} },
  load() {
    try {
      const raw = localStorage.getItem('psyche_audit');
      if (raw) this.events = JSON.parse(raw);
    } catch(e) {}
    // Seed demo audit events if empty
    if (this.events.length === 0) this._seedDemo();
  },

  _seedDemo() {
    const now = Date.now();
    const seeds = [
      { action:'user.banned',        actorId:'u_superadmin', targetId:'u_demo6', targetType:'user', detail:'User banned_user banned for hate speech.', visibility:2, timestamp: new Date(now - 3*3600000).toISOString() },
      { action:'post.approved',      actorId:'u_superadmin', targetId:'p_seed_1', targetType:'post', detail:'Blog post approved: "The Science of Emotional Regulation"', visibility:2, timestamp: new Date(now - 2*3600000).toISOString() },
      { action:'ticket.created',     actorId:'u_demo1',      targetId:'TKT-001', targetType:'ticket', detail:'New support ticket: "When will the store launch?"', visibility:1, timestamp: new Date(now - 1*3600000).toISOString() },
      { action:'user.role_changed',  actorId:'u_superadmin', targetId:'u_demo2', targetType:'user', detail:'Role changed: member → author', visibility:3, timestamp: new Date(now - 30*60000).toISOString() },
      { action:'role.created',       actorId:'u_superadmin', targetId:'support_agent', targetType:'role', detail:'New role created: Support Agent (level 5)', visibility:4, timestamp: new Date(now - 20*60000).toISOString() },
      { action:'shop.product.added', actorId:'u_superadmin', targetId:'tee-classic', targetType:'product', detail:'Product added: Psyche Classic Tee ($28)', visibility:3, timestamp: new Date(now - 15*60000).toISOString() },
    ];
    seeds.forEach((s, i) => {
      this.events.push({ id: `audit_seed_${i}`, actorName: PSYCHE.users[s.actorId]?.username || s.actorId, meta: {}, ...s });
    });
    this._save();
  },
};

// ============================================================
// UPDATE LOG + NEXT UPDATE + CONFIDENTIAL ANNOUNCEMENTS
// ============================================================
const PSYCHE_UPDATES = {
  // Visibility: 'all' | 'staff' | 'admin' | 'superadmin'
  changelogs: [],
  nextUpdates: [],
  confidentialAnnouncements: [],

  // ---- CHANGELOGS ----
  createChangelog({ title, version, body, visibility = 'all', publishedAt = null }) {
    const entry = {
      id: 'cl_' + Date.now(),
      title, version, body,
      visibility, // 'all' = public, 'staff' = mod+, 'admin' = admin+, 'superadmin' = SA only
      publishedAt: publishedAt || new Date().toISOString(),
      createdAt: new Date().toISOString(),
      createdBy: PSYCHE.currentUser?.id,
      pinned: false,
    };
    this.changelogs.unshift(entry);
    PSYCHE_AUDIT.log('update_log.created', { detail: `Changelog created: ${title} (${version})` });
    this._save();
    return entry;
  },

  editChangelog(id, updates) {
    const cl = this.changelogs.find(c => c.id === id);
    if (cl) { Object.assign(cl, updates); this._save(); }
  },

  deleteChangelog(id) {
    this.changelogs = this.changelogs.filter(c => c.id !== id);
    this._save();
  },

  // ---- NEXT UPDATES ----
  createNextUpdate({ title, body, targetDate, visibility = 'admin', status = 'planned' }) {
    const entry = {
      id: 'nu_' + Date.now(),
      title, body,
      targetDate: targetDate || null,
      visibility,
      status, // 'planned' | 'in_progress' | 'delayed' | 'cancelled'
      createdAt: new Date().toISOString(),
      createdBy: PSYCHE.currentUser?.id,
    };
    this.nextUpdates.unshift(entry);
    this._save();
    return entry;
  },

  editNextUpdate(id, updates) {
    const nu = this.nextUpdates.find(n => n.id === id);
    if (nu) { Object.assign(nu, updates); this._save(); }
  },

  deleteNextUpdate(id) {
    this.nextUpdates = this.nextUpdates.filter(n => n.id !== id);
    this._save();
  },

  // ---- CONFIDENTIAL ANNOUNCEMENTS ----
  createAnnouncement({ title, body, visibility = 'admin', pinned = false }) {
    const entry = {
      id: 'ann_' + Date.now(),
      title, body, visibility, pinned,
      createdAt: new Date().toISOString(),
      createdBy: PSYCHE.currentUser?.id,
      readBy: [],
    };
    this.confidentialAnnouncements.unshift(entry);
    this._save();
    return entry;
  },

  markRead(id) {
    const ann = this.confidentialAnnouncements.find(a => a.id === id);
    const uid = PSYCHE.currentUser?.id;
    if (ann && uid && !ann.readBy.includes(uid)) { ann.readBy.push(uid); this._save(); }
  },

  deleteAnnouncement(id) {
    this.confidentialAnnouncements = this.confidentialAnnouncements.filter(a => a.id !== id);
    this._save();
  },

  // ---- VISIBILITY CHECK ----
  canSee(entry) {
    const privLevel = typeof PSYCHE_ROLES !== 'undefined' ? PSYCHE_ROLES.privacyLevel() : 0;
    const levelMap = { all: 0, staff: 1, mod: 2, admin: 3, superadmin: 4 };
    return privLevel >= (levelMap[entry.visibility] ?? 3);
  },

  getVisibleChangelogs()     { return this.changelogs.filter(c => this.canSee(c)); },
  getVisibleNextUpdates()    { return this.nextUpdates.filter(n => this.canSee(n)); },
  getVisibleAnnouncements()  { return this.confidentialAnnouncements.filter(a => this.canSee(a)); },

  _save() {
    try {
      localStorage.setItem('psyche_changelogs',    JSON.stringify(this.changelogs));
      localStorage.setItem('psyche_next_updates',  JSON.stringify(this.nextUpdates));
      localStorage.setItem('psyche_announcements', JSON.stringify(this.confidentialAnnouncements));
    } catch(e) {}
  },
  load() {
    try {
      const cl  = localStorage.getItem('psyche_changelogs');
      const nu  = localStorage.getItem('psyche_next_updates');
      const ann = localStorage.getItem('psyche_announcements');
      if (cl)  this.changelogs                = JSON.parse(cl);
      if (nu)  this.nextUpdates               = JSON.parse(nu);
      if (ann) this.confidentialAnnouncements = JSON.parse(ann);
    } catch(e) {}
    if (this.changelogs.length === 0) this._seedDemo();
  },

  _seedDemo() {
    this.createChangelog({
      title: 'Initial Platform Launch',
      version: 'v1.0.0',
      body: `## What's New\n\n**Blog System**\n- Rich post composer with markdown support\n- Contributor+ can publish articles\n- Editorial review workflow\n\n**Forum**\n- Community discussions with approval tiers\n- Upvoting and nested comments\n\n**Profile System**\n- Full user profiles with role badges\n- Settings page with notification controls\n\n**Admin Panel**\n- User management with role assignment\n- Support ticket queue\n- Moderation tools`,
      visibility: 'all',
      publishedAt: new Date(Date.now() - 7*24*3600000).toISOString(),
    });
    this.createNextUpdate({
      title: 'Backend Database Migration',
      body: '- Migrate from localStorage to Neon/Supabase PostgreSQL\n- Real authentication with JWT\n- Persistent data across all devices and users',
      targetDate: '2026-04-15',
      visibility: 'admin',
      status: 'planned',
    });
    this.createNextUpdate({
      title: 'Stripe Payment Integration',
      body: '- Enable Pro/Premium membership upgrades\n- Shop checkout with real payments\n- Order fulfillment workflow',
      targetDate: '2026-05-01',
      visibility: 'admin',
      status: 'planned',
    });
    this.createAnnouncement({
      title: 'Staff Guidelines Update',
      body: 'All moderators: please review the updated content policy, specifically around sensitive mental health content and trigger warnings. The new guidelines are in effect immediately.',
      visibility: 'staff',
      pinned: true,
    });
    this.createAnnouncement({
      title: 'Q2 Roadmap — Confidential',
      body: '**Internal only. Do not share publicly.**\n\nQ2 priorities:\n1. Database launch (April)\n2. Stripe payments (May)\n3. Mobile app exploration (June)\n\nBudget allocation TBD pending investor discussions.',
      visibility: 'superadmin',
    });
  },
};

// ============================================================
// REPORT USER MODAL (forum context)
// ============================================================
function openReportUserModal(targetUserId, targetUsername) {
  const u = PSYCHE.currentUser;
  if (!u) { openAuthModal('signin'); return; }
  if (u.id === targetUserId) { showToast('You cannot report yourself.'); return; }

  document.querySelector('.report-modal-overlay')?.remove();
  const overlay = document.createElement('div');
  overlay.className = 'report-modal-overlay auth-modal-overlay';
  overlay.style.cssText = 'opacity:1;z-index:9010';
  const reasons = PSYCHE_REPORT_CONFIG.userReasons;

  overlay.innerHTML = `
    <div class="auth-modal" style="max-width:440px">
      <button class="auth-modal-close" id="report-close">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
      <div class="auth-logo">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
        <span class="auth-logo-name">Report @${escapeHtml(targetUsername||'user')}</span>
      </div>
      <p style="font-size:.84rem;color:var(--color-text-muted);margin-bottom:1.1rem;line-height:1.5">
        Reports are reviewed by our moderation team. False reports may result in action against your account.
      </p>
      <div class="flag-category-list" id="report-reasons">
        ${reasons.map(r => `
          <label class="flag-category-item">
            <input type="radio" name="report-reason" value="${r.id}" class="flag-cat-radio">
            <div class="flag-category-body">
              <div class="flag-category-label">${r.label}</div>
              <div class="flag-category-desc">${r.desc}</div>
            </div>
          </label>`).join('')}
      </div>
      <div class="form-group" style="margin-top:.85rem">
        <label class="form-label">Additional context <span style="font-weight:400;color:var(--color-text-faint)">(optional)</span></label>
        <textarea class="form-textarea" id="report-detail" rows="2" placeholder="Any other details that would help our team…"></textarea>
      </div>
      <div class="form-error" id="report-error" hidden>Please select a reason.</div>
      <div style="display:flex;gap:.5rem;justify-content:flex-end;margin-top:.75rem">
        <button class="compose-cancel-btn" id="report-cancel">Cancel</button>
        <button class="form-submit" id="report-submit" style="width:auto;padding:.55rem 1.25rem;background:#dc2626">Submit Report</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);
  overlay.querySelector('#report-close').addEventListener('click', () => overlay.remove());
  overlay.querySelector('#report-cancel').addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });

  overlay.querySelector('#report-submit').addEventListener('click', () => {
    const selected = overlay.querySelector('input[name="report-reason"]:checked');
    const errEl = document.getElementById('report-error');
    if (!selected) { errEl.hidden = false; return; }
    const detail = document.getElementById('report-detail').value.trim();
    const reason = reasons.find(r => r.id === selected.value);

    // Create support ticket of type 'user_report'
    const ticket = PSYCHE_TICKETS.create({
      category: 'user_report',
      subject: `User Report: @${targetUsername} — ${reason?.label}`,
      message: detail || reason?.label || 'No details provided.',
      email: u.email,
      userId: u.id,
      meta: { targetUserId, targetUsername, reportReason: selected.value },
    });

    PSYCHE_AUDIT.log('user.reported', {
      targetId: targetUserId, targetType: 'user',
      detail: `@${u.username} reported @${targetUsername} for: ${reason?.label}`,
    });

    overlay.remove();
    showToast('Report submitted. Our moderation team will review it.');
  });
}

// ============================================================
// REPORT POST/ISSUE MODAL (blog/post context)
// ============================================================
function openReportPostModal(postId, postTitle) {
  const u = PSYCHE.currentUser;
  if (!u) { openAuthModal('signin'); return; }

  document.querySelector('.report-modal-overlay')?.remove();
  const overlay = document.createElement('div');
  overlay.className = 'report-modal-overlay auth-modal-overlay';
  overlay.style.cssText = 'opacity:1;z-index:9010';
  const reasons = PSYCHE_REPORT_CONFIG.postReasons;

  overlay.innerHTML = `
    <div class="auth-modal" style="max-width:440px">
      <button class="auth-modal-close" id="rp-close">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
      <div class="auth-logo">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>
        <span class="auth-logo-name">Report Issue</span>
      </div>
      <p style="font-size:.82rem;color:var(--color-text-muted);margin-bottom:.5rem">
        <strong style="color:var(--color-text)">"${escapeHtml((postTitle||'').slice(0,60))}${postTitle?.length>60?'…':''}"</strong>
      </p>
      <p style="font-size:.82rem;color:var(--color-text-muted);margin-bottom:1rem;line-height:1.5">
        Select the issue that best describes your concern.
      </p>
      <div class="flag-category-list">
        ${reasons.map(r => `
          <label class="flag-category-item">
            <input type="radio" name="rp-reason" value="${r.id}" class="flag-cat-radio">
            <div class="flag-category-body">
              <div class="flag-category-label">${r.label}</div>
              <div class="flag-category-desc">${r.desc}</div>
            </div>
          </label>`).join('')}
      </div>
      <div class="form-group" style="margin-top:.85rem">
        <label class="form-label">Details <span style="font-weight:400;color:var(--color-text-faint)">(optional)</span></label>
        <textarea class="form-textarea" id="rp-detail" rows="2" placeholder="Specific passage, claim, or context…"></textarea>
      </div>
      <div class="form-error" id="rp-error" hidden>Please select a reason.</div>
      <div style="display:flex;gap:.5rem;justify-content:flex-end;margin-top:.75rem">
        <button class="compose-cancel-btn" id="rp-cancel">Cancel</button>
        <button class="form-submit" id="rp-submit" style="width:auto;padding:.55rem 1.25rem;background:#dc2626">Submit Report</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);
  overlay.querySelector('#rp-close').addEventListener('click', () => overlay.remove());
  overlay.querySelector('#rp-cancel').addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });

  overlay.querySelector('#rp-submit').addEventListener('click', () => {
    const selected = overlay.querySelector('input[name="rp-reason"]:checked');
    const errEl = document.getElementById('rp-error');
    if (!selected) { errEl.hidden = false; return; }
    const detail = document.getElementById('rp-detail').value.trim();
    const reason = reasons.find(r => r.id === selected.value);

    PSYCHE_DATA.flagPost(postId, u.id, reason?.label || 'Reported', selected.value);
    PSYCHE_TICKETS.create({
      category: 'post_report',
      subject: `Post Report: "${(postTitle||'').slice(0,50)}" — ${reason?.label}`,
      message: detail || reason?.label,
      email: u.email,
      userId: u.id,
      meta: { postId, reportReason: selected.value },
    });
    PSYCHE_AUDIT.log('post.flagged', {
      targetId: postId, targetType: 'post',
      detail: `@${u.username} reported post for: ${reason?.label}`,
    });

    overlay.remove();
    const flagBtn = document.getElementById('flag-btn');
    if (flagBtn) { flagBtn.disabled = true; flagBtn.textContent = 'Reported'; }
    showToast('Issue reported. Thank you for helping keep Psyche safe.');
  });
}

// ============================================================
// FLOATING HELP WIDGET (visible to all users / guests)
// ============================================================
function initHelpWidget() {
  if (document.getElementById('help-widget')) return;

  const widget = document.createElement('div');
  widget.id = 'help-widget';
  widget.className = 'help-widget';
  widget.innerHTML = `
    <button class="help-widget-btn" id="help-widget-btn" aria-label="Help & Support">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
    </button>
    <div class="help-widget-panel" id="help-panel" style="display:none">
      <div class="help-panel-header">
        <span class="help-panel-title">Help & Support</span>
        <button class="help-panel-close" id="help-panel-close">×</button>
      </div>
      <div class="help-panel-body">
        <div class="help-option" id="hw-ticket">
          <div class="help-option-icon">🎫</div>
          <div>
            <div class="help-option-label">Submit a Ticket</div>
            <div class="help-option-desc">Get help with your account, orders, or technical issues</div>
          </div>
        </div>
        <div class="help-option" id="hw-forum-question">
          <div class="help-option-icon">💬</div>
          <div>
            <div class="help-option-label">Ask the Community</div>
            <div class="help-option-desc">Post a question in the forum discussions</div>
          </div>
        </div>
        <div class="help-option" id="hw-updates">
          <div class="help-option-icon">📋</div>
          <div>
            <div class="help-option-label">What's New</div>
            <div class="help-option-desc">See the latest platform updates and changelogs</div>
          </div>
        </div>
        <div class="help-option" id="hw-guidelines">
          <div class="help-option-icon">📖</div>
          <div>
            <div class="help-option-label">Community Guidelines</div>
            <div class="help-option-desc">Review our rules and community standards</div>
          </div>
        </div>
      </div>
      <div class="help-panel-footer">
        <span>Psyche Support · Usually responds in 24h</span>
      </div>
    </div>
  `;

  document.body.appendChild(widget);

  const btn   = widget.querySelector('#help-widget-btn');
  const panel = widget.querySelector('#help-panel');
  const close = widget.querySelector('#help-panel-close');

  btn.addEventListener('click', () => {
    panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
    btn.classList.toggle('active');
  });
  close.addEventListener('click', () => { panel.style.display = 'none'; btn.classList.remove('active'); });

  widget.querySelector('#hw-ticket').addEventListener('click', () => {
    panel.style.display = 'none'; btn.classList.remove('active');
    openTicketModal();
  });
  widget.querySelector('#hw-forum-question').addEventListener('click', () => {
    panel.style.display = 'none'; btn.classList.remove('active');
    if (typeof openForumComposer === 'function') openForumComposer();
    else navigateTo('page-forum');
  });
  widget.querySelector('#hw-updates').addEventListener('click', () => {
    panel.style.display = 'none'; btn.classList.remove('active');
    openChangelogModal();
  });
  widget.querySelector('#hw-guidelines').addEventListener('click', () => {
    panel.style.display = 'none'; btn.classList.remove('active');
    showToast('Community guidelines coming soon.');
  });
}

// ============================================================
// TICKET MODAL (user-facing, full create + view own tickets)
// ============================================================
function openTicketModal(prefillCategory = 'general', prefillSubject = '') {
  document.querySelector('.ticket-modal-overlay')?.remove();
  const overlay = document.createElement('div');
  overlay.className = 'ticket-modal-overlay auth-modal-overlay';
  overlay.style.cssText = 'opacity:1;z-index:9010';
  const u = PSYCHE.currentUser;
  const myTickets = u ? PSYCHE_TICKETS.tickets.filter(t => t.userId === u.id) : [];

  const categories = [
    { id:'general',    label:'General Question' },
    { id:'account',    label:'Account Issue' },
    { id:'shop',       label:'Shop / Order Issue' },
    { id:'content',    label:'Content / Post Issue' },
    { id:'technical',  label:'Technical Problem' },
    { id:'billing',    label:'Billing (Coming Soon)' },
  ];

  overlay.innerHTML = `
    <div class="auth-modal" style="max-width:520px;max-height:90vh;overflow-y:auto">
      <button class="auth-modal-close" id="ticket-close">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
      <div class="auth-logo">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
        <span class="auth-logo-name">Support Center</span>
      </div>

      <div class="ticket-modal-tabs">
        <button class="ticket-tab active" data-ttab="new">New Ticket</button>
        ${u ? `<button class="ticket-tab" data-ttab="mine">My Tickets (${myTickets.length})</button>` : ''}
      </div>

      <!-- New ticket form -->
      <div class="ticket-tab-panel active" data-tpanel="new">
        <div class="auth-form active">
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Category</label>
              <select class="form-select" id="tkt-category">
                ${categories.map(c => `<option value="${c.id}" ${prefillCategory===c.id?'selected':''}>${c.label}</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Priority</label>
              <select class="form-select" id="tkt-priority">
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Subject <span class="form-required">*</span></label>
            <input class="form-input" id="tkt-subject" value="${escapeHtml(prefillSubject)}" placeholder="Brief description of your issue">
          </div>
          <div class="form-group">
            <label class="form-label">Message <span class="form-required">*</span></label>
            <textarea class="form-textarea" id="tkt-message" rows="5" placeholder="Describe your issue in detail. The more context you provide, the faster we can help."></textarea>
          </div>
          ${!u ? `
          <div class="form-group">
            <label class="form-label">Your Email <span class="form-required">*</span></label>
            <input class="form-input" id="tkt-email" type="email" placeholder="For reply notifications">
          </div>` : ''}
          <div class="form-error" id="tkt-error" hidden></div>
          <button class="form-submit" id="tkt-submit">Submit Ticket</button>
          <p style="font-size:.72rem;color:var(--color-text-faint);text-align:center;margin-top:.5rem">
            We typically respond within 24 hours. You'll receive a reply at your registered email.
          </p>
        </div>
      </div>

      <!-- My tickets view -->
      ${u ? `
      <div class="ticket-tab-panel" data-tpanel="mine">
        ${myTickets.length === 0
          ? `<div style="text-align:center;padding:2rem;color:var(--color-text-muted)">No tickets yet.</div>`
          : myTickets.map(t => `
            <div class="ticket-list-item">
              <div class="ticket-list-top">
                <span class="ticket-list-id">${t.id}</span>
                <span class="ticket-list-cat">${t.category}</span>
                <span class="admin-status-badge admin-status-badge--${t.status==='open'?'active':'removed'}">${t.status}</span>
                <span class="ticket-list-priority ticket-list-priority--${t.priority||'normal'}">${t.priority||'normal'}</span>
              </div>
              <div class="ticket-list-subject">${escapeHtml(t.subject)}</div>
              <div class="ticket-list-meta">${new Date(t.createdAt).toLocaleDateString()} · ${t.responses?.length||0} response${(t.responses?.length||0)!==1?'s':''}</div>
              ${t.responses?.length ? `
                <div class="ticket-response-preview">
                  <span class="ticket-response-label">Latest response:</span>
                  <span>${escapeHtml(t.responses[t.responses.length-1].body?.slice(0,100)||'')}…</span>
                </div>` : ''}
            </div>`).join('')}
      </div>` : ''}
    </div>
  `;

  document.body.appendChild(overlay);
  overlay.querySelector('#ticket-close').addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });

  overlay.querySelectorAll('.ticket-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      overlay.querySelectorAll('.ticket-tab').forEach(t => t.classList.remove('active'));
      overlay.querySelectorAll('.ticket-tab-panel').forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      overlay.querySelector(`.ticket-tab-panel[data-tpanel="${tab.dataset.ttab}"]`)?.classList.add('active');
    });
  });

  overlay.querySelector('#tkt-submit').addEventListener('click', () => {
    const subject  = document.getElementById('tkt-subject').value.trim();
    const message  = document.getElementById('tkt-message').value.trim();
    const category = document.getElementById('tkt-category').value;
    const priority = document.getElementById('tkt-priority').value;
    const email    = u?.email || document.getElementById('tkt-email')?.value.trim();
    const errEl    = document.getElementById('tkt-error');

    if (!subject) { errEl.textContent = 'Please add a subject.'; errEl.hidden = false; return; }
    if (!message) { errEl.textContent = 'Please describe your issue.'; errEl.hidden = false; return; }
    if (!email)   { errEl.textContent = 'Please enter your email.';   errEl.hidden = false; return; }

    const ticket = PSYCHE_TICKETS.create({ category, subject, message, email, userId: u?.id || null, priority });
    PSYCHE_AUDIT.log('ticket.created', {
      targetId: ticket.id, targetType: 'ticket',
      detail: `Ticket created: "${subject}" [${category}]`,
    });
    overlay.remove();
    showToast(`Ticket ${ticket.id} submitted! We'll respond to ${email}.`);
  });
}

// ============================================================
// CHANGELOG MODAL (public-facing, shows visible changelogs)
// ============================================================
function openChangelogModal() {
  document.querySelector('.changelog-modal-overlay')?.remove();
  const overlay = document.createElement('div');
  overlay.className = 'changelog-modal-overlay auth-modal-overlay';
  overlay.style.cssText = 'opacity:1;z-index:9010';

  const changelogs = typeof PSYCHE_UPDATES !== 'undefined' ? PSYCHE_UPDATES.getVisibleChangelogs() : [];
  const isSA = typeof PSYCHE_ROLES !== 'undefined' ? PSYCHE_ROLES.isSuperAdmin() : false;

  overlay.innerHTML = `
    <div class="auth-modal" style="max-width:580px;max-height:90vh;overflow-y:auto">
      <button class="auth-modal-close" id="cl-close">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
      <div class="auth-logo">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
        <span class="auth-logo-name">What's New</span>
      </div>
      ${changelogs.length === 0
        ? `<p style="color:var(--color-text-muted);text-align:center;padding:2rem">No updates posted yet.</p>`
        : changelogs.map(cl => `
          <div class="changelog-entry">
            <div class="changelog-header">
              <div>
                <span class="changelog-version">${escapeHtml(cl.version)}</span>
                <span class="changelog-title">${escapeHtml(cl.title)}</span>
              </div>
              <div style="display:flex;align-items:center;gap:.5rem">
                <span class="changelog-date">${new Date(cl.publishedAt).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}</span>
                ${cl.visibility !== 'all' ? `<span class="changelog-visibility">${cl.visibility}</span>` : ''}
              </div>
            </div>
            <div class="changelog-body">${renderBlogMarkdown ? renderBlogMarkdown(cl.body) : escapeHtml(cl.body)}</div>
          </div>`).join('')}
    </div>
  `;

  document.body.appendChild(overlay);
  overlay.querySelector('#cl-close').addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
}

// ============================================================
// ADMIN: AUDIT LOG SECTION
// ============================================================
function renderAuditLogSection(privLevel) {
  const events = PSYCHE_AUDIT.getVisible(privLevel);
  const actionTypes = [...new Set(events.map(e => e.action))].sort();
  const visibleLabels = { 1:'Support', 2:'Moderator', 3:'Admin', 4:'Superadmin' };

  return `
    <div class="audit-section">
      <div class="audit-controls">
        <input class="admin-search" id="audit-search" type="search" placeholder="Search action, actor, detail…" style="max-width:260px">
        <select class="admin-filter-select" id="audit-action-filter">
          <option value="">All Actions</option>
          ${actionTypes.map(a => `<option value="${a}">${a}</option>`).join('')}
        </select>
        <select class="admin-filter-select" id="audit-level-filter">
          <option value="">All Visibility</option>
          ${Object.entries(visibleLabels).map(([k,v]) => `<option value="${k}">${v}</option>`).join('')}
        </select>
        <span class="audit-count" id="audit-count">${events.length} events</span>
      </div>

      <div class="audit-log-table" id="audit-log-table">
        ${renderAuditRows(events, privLevel)}
      </div>
    </div>
  `;
}

function renderAuditRows(events, privLevel) {
  if (!events.length) return '<div class="admin-empty">No audit events visible at your access level.</div>';

  const actionColors = {
    'user.banned':       '#ef4444', 'user.unbanned':    '#22c55e', 'post.removed':    '#ef4444',
    'post.approved':     '#22c55e', 'ticket.created':   '#60a5fa', 'ticket.closed':   '#8b949e',
    'user.role_changed': '#f97316', 'role.created':     '#a78bfa', 'shop.product':    '#2dd4bf',
    'post.flagged':      '#fb923c', 'user.reported':    '#fb923c', 'update_log':      '#c084fc',
  };
  const getColor = (action) => {
    for (const [prefix, color] of Object.entries(actionColors)) {
      if (action.startsWith(prefix)) return color;
    }
    return '#6b7280';
  };

  return `
    <table class="admin-table">
      <thead>
        <tr>
          <th style="width:140px">Time</th>
          <th style="width:200px">Action</th>
          <th style="width:120px">Actor</th>
          <th>Detail</th>
          <th style="width:80px">Level</th>
        </tr>
      </thead>
      <tbody>
        ${events.map(e => `
          <tr class="audit-row" data-action="${e.action}" data-level="${e.visibility}">
            <td class="admin-td-muted" style="font-size:.72rem;white-space:nowrap">
              ${new Date(e.timestamp).toLocaleString('en-US',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'})}
            </td>
            <td>
              <span class="audit-action-badge" style="background:${getColor(e.action)}22;color:${getColor(e.action)};border:1px solid ${getColor(e.action)}44">
                ${e.action}
              </span>
            </td>
            <td>
              <span class="audit-actor">@${escapeHtml(e.actorName||'system')}</span>
            </td>
            <td class="admin-td-muted" style="font-size:.78rem">${escapeHtml(e.detail||'')}</td>
            <td>
              <span class="audit-level-tag audit-level-${e.visibility}">
                ${{1:'Support',2:'Mod',3:'Admin',4:'SA'}[e.visibility]||'?'}
              </span>
            </td>
          </tr>`).join('')}
      </tbody>
    </table>
  `;
}

// ============================================================
// ADMIN: UPDATE LOG SECTION (Admin+)
// ============================================================
function renderUpdateLogSection(isSA, isAdm) {
  const changelogs  = PSYCHE_UPDATES.getVisibleChangelogs();
  const nextUpdates = PSYCHE_UPDATES.getVisibleNextUpdates();
  const announcements = PSYCHE_UPDATES.getVisibleAnnouncements();
  const privLevel   = PSYCHE_ROLES.privacyLevel();

  const statusColors = { planned:'#60a5fa', in_progress:'#4ade80', delayed:'#fb923c', cancelled:'#f87171' };
  const visibilityLabel = { all:'Public', staff:'Staff', mod:'Mod+', admin:'Admin+', superadmin:'SA Only' };

  return `
    <div style="display:flex;flex-direction:column;gap:1.5rem">

      ${announcements.length > 0 ? `
      <!-- Pinned Announcements -->
      <div class="admin-card" style="border-color:rgba(249,115,22,.3);background:rgba(249,115,22,.05)">
        <div class="admin-card-title" style="color:#fb923c">
          📌 Staff Announcements
        </div>
        ${announcements.map(ann => `
          <div class="update-ann-item ${ann.pinned?'update-ann-item--pinned':''}">
            <div class="update-ann-header">
              <span class="update-ann-title">${escapeHtml(ann.title)}</span>
              <span class="changelog-visibility">${visibilityLabel[ann.visibility]||ann.visibility}</span>
              ${isSA ? `<button class="admin-action-btn admin-action-btn--ban" onclick="PSYCHE_UPDATES.deleteAnnouncement('${ann.id}');renderAdminPage()">Delete</button>` : ''}
            </div>
            <div class="update-ann-body">${renderBlogMarkdown ? renderBlogMarkdown(ann.body) : escapeHtml(ann.body)}</div>
            <div class="update-ann-meta">Posted ${new Date(ann.createdAt).toLocaleDateString()} · Read by ${ann.readBy?.length||0} staff</div>
          </div>`).join('')}
      </div>` : ''}

      <!-- Next Updates -->
      <div class="admin-card">
        <div class="admin-card-title" style="display:flex;align-items:center;justify-content:space-between">
          🚀 Upcoming Updates
          ${isSA ? `<button class="admin-save-btn" id="add-next-update-btn" style="margin:0">+ Add</button>` : ''}
        </div>
        ${nextUpdates.length === 0 ? '<div class="admin-empty">No upcoming updates.</div>' :
          nextUpdates.map(nu => `
            <div class="update-next-item">
              <div class="update-next-header">
                <span class="update-next-title">${escapeHtml(nu.title)}</span>
                <div style="display:flex;gap:.4rem;align-items:center">
                  <span class="update-status-badge" style="background:${statusColors[nu.status]||'#6b7280'}22;color:${statusColors[nu.status]||'#6b7280'}">${nu.status}</span>
                  <span class="changelog-visibility">${visibilityLabel[nu.visibility]||nu.visibility}</span>
                  ${nu.targetDate ? `<span style="font-size:.72rem;color:#8b949e">Target: ${new Date(nu.targetDate).toLocaleDateString()}</span>` : ''}
                  ${isSA ? `
                    <button class="admin-action-btn admin-action-btn--role" onclick="openEditNextUpdateModal('${nu.id}')">Edit</button>
                    <button class="admin-action-btn admin-action-btn--ban" onclick="PSYCHE_UPDATES.deleteNextUpdate('${nu.id}');renderAdminPage()">Del</button>` : ''}
                </div>
              </div>
              <div class="update-next-body">${escapeHtml(nu.body)}</div>
            </div>`).join('')}
      </div>

      <!-- Changelog -->
      <div class="admin-card">
        <div class="admin-card-title" style="display:flex;align-items:center;justify-content:space-between">
          📋 Changelog
          ${isSA ? `<button class="admin-save-btn" id="add-changelog-btn" style="margin:0">+ New Entry</button>` : ''}
        </div>
        ${changelogs.length === 0 ? '<div class="admin-empty">No changelogs yet.</div>' :
          changelogs.map(cl => `
            <div class="update-changelog-item">
              <div class="update-cl-header">
                <span class="changelog-version">${escapeHtml(cl.version)}</span>
                <span class="changelog-title">${escapeHtml(cl.title)}</span>
                <span class="changelog-date">${new Date(cl.publishedAt).toLocaleDateString()}</span>
                <span class="changelog-visibility">${visibilityLabel[cl.visibility]||cl.visibility}</span>
                ${isSA ? `
                  <button class="admin-action-btn admin-action-btn--role" onclick="openEditChangelogModal('${cl.id}')">Edit</button>
                  <button class="admin-action-btn admin-action-btn--ban" onclick="PSYCHE_UPDATES.deleteChangelog('${cl.id}');renderAdminPage()">Del</button>` : ''}
              </div>
              <div class="update-cl-body">${renderBlogMarkdown ? renderBlogMarkdown(cl.body.slice(0,300)) + (cl.body.length>300?'…':'') : escapeHtml(cl.body.slice(0,200))}</div>
            </div>`).join('')}
      </div>

    </div>
  `;
}

// ---- Modals for creating changelog / next update ----
function openAddChangelogModal() { openChangelogEditor(null); }
function openEditChangelogModal(id) { openChangelogEditor(PSYCHE_UPDATES.changelogs.find(c=>c.id===id)); }

function openChangelogEditor(existing) {
  document.querySelector('.cl-editor-overlay')?.remove();
  const overlay = document.createElement('div');
  overlay.className = 'cl-editor-overlay auth-modal-overlay';
  overlay.style.cssText = 'opacity:1;z-index:9015';
  const isEdit = !!existing;
  const visibilityOptions = ['all','staff','mod','admin','superadmin'];

  overlay.innerHTML = `
    <div class="auth-modal" style="max-width:560px;max-height:90vh;overflow-y:auto">
      <button class="auth-modal-close" id="cle-close"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
      <div class="auth-logo"><span class="auth-logo-name">${isEdit?'Edit Changelog':'New Changelog Entry'}</span></div>
      <div class="auth-form active">
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Version <span class="form-required">*</span></label>
            <input class="form-input" id="cle-version" value="${escapeHtml(existing?.version||'v1.0.')}" placeholder="v1.2.0">
          </div>
          <div class="form-group">
            <label class="form-label">Visibility</label>
            <select class="form-select" id="cle-visibility">
              ${visibilityOptions.map(v => `<option value="${v}" ${existing?.visibility===v?'selected':''}>${v}</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Title <span class="form-required">*</span></label>
          <input class="form-input" id="cle-title" value="${escapeHtml(existing?.title||'')}">
        </div>
        <div class="form-group">
          <label class="form-label">Publish Date</label>
          <input class="form-input" id="cle-date" type="date" value="${existing?.publishedAt?.split('T')[0]||new Date().toISOString().split('T')[0]}">
        </div>
        <div class="form-group">
          <label class="form-label">Body (Markdown supported)</label>
          <textarea class="form-textarea" id="cle-body" rows="8" placeholder="## What's New\n- Feature A\n- Bug fix B">${escapeHtml(existing?.body||'')}</textarea>
        </div>
        <div class="form-error" id="cle-error" hidden></div>
        <div style="display:flex;gap:.5rem;justify-content:flex-end">
          <button class="compose-cancel-btn" id="cle-cancel">Cancel</button>
          <button class="form-submit" id="cle-save" style="width:auto;padding:.55rem 1.5rem">${isEdit?'Save':'Publish'}</button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);
  overlay.querySelector('#cle-close').addEventListener('click', () => overlay.remove());
  overlay.querySelector('#cle-cancel').addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });

  overlay.querySelector('#cle-save').addEventListener('click', () => {
    const errEl = document.getElementById('cle-error');
    const data = {
      version:     document.getElementById('cle-version').value.trim(),
      title:       document.getElementById('cle-title').value.trim(),
      body:        document.getElementById('cle-body').value.trim(),
      visibility:  document.getElementById('cle-visibility').value,
      publishedAt: document.getElementById('cle-date').value,
    };
    if (!data.version || !data.title || !data.body) { errEl.textContent = 'Version, title and body are required.'; errEl.hidden = false; return; }
    if (isEdit) PSYCHE_UPDATES.editChangelog(existing.id, data);
    else PSYCHE_UPDATES.createChangelog(data);
    overlay.remove();
    showToast(isEdit ? 'Changelog updated.' : 'Changelog entry published.');
    renderAdminPage();
  });
}

function openEditNextUpdateModal(id) { openNextUpdateEditor(PSYCHE_UPDATES.nextUpdates.find(n=>n.id===id)); }
function openAddNextUpdateModal() { openNextUpdateEditor(null); }

function openNextUpdateEditor(existing) {
  document.querySelector('.nu-editor-overlay')?.remove();
  const overlay = document.createElement('div');
  overlay.className = 'nu-editor-overlay auth-modal-overlay';
  overlay.style.cssText = 'opacity:1;z-index:9015';
  const isEdit = !!existing;

  overlay.innerHTML = `
    <div class="auth-modal" style="max-width:500px">
      <button class="auth-modal-close" id="nue-close"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
      <div class="auth-logo"><span class="auth-logo-name">${isEdit?'Edit Update':'New Upcoming Update'}</span></div>
      <div class="auth-form active">
        <div class="form-group">
          <label class="form-label">Title <span class="form-required">*</span></label>
          <input class="form-input" id="nue-title" value="${escapeHtml(existing?.title||'')}">
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Target Date</label>
            <input class="form-input" type="date" id="nue-date" value="${existing?.targetDate||''}">
          </div>
          <div class="form-group">
            <label class="form-label">Status</label>
            <select class="form-select" id="nue-status">
              ${['planned','in_progress','delayed','cancelled'].map(s=>`<option value="${s}" ${existing?.status===s?'selected':''}>${s}</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Visibility</label>
            <select class="form-select" id="nue-visibility">
              ${['all','staff','mod','admin','superadmin'].map(v=>`<option value="${v}" ${existing?.visibility===v?'selected':''}>${v}</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Description</label>
          <textarea class="form-textarea" id="nue-body" rows="4">${escapeHtml(existing?.body||'')}</textarea>
        </div>
        <div style="display:flex;gap:.5rem;justify-content:flex-end">
          <button class="compose-cancel-btn" id="nue-cancel">Cancel</button>
          <button class="form-submit" id="nue-save" style="width:auto;padding:.55rem 1.5rem">${isEdit?'Save':'Add'}</button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);
  overlay.querySelector('#nue-close').addEventListener('click', () => overlay.remove());
  overlay.querySelector('#nue-cancel').addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
  overlay.querySelector('#nue-save').addEventListener('click', () => {
    const data = {
      title:      document.getElementById('nue-title').value.trim(),
      targetDate: document.getElementById('nue-date').value || null,
      status:     document.getElementById('nue-status').value,
      visibility: document.getElementById('nue-visibility').value,
      body:       document.getElementById('nue-body').value.trim(),
    };
    if (!data.title) { showToast('Title is required.'); return; }
    if (isEdit) PSYCHE_UPDATES.editNextUpdate(existing.id, data);
    else PSYCHE_UPDATES.createNextUpdate(data);
    overlay.remove();
    showToast(isEdit ? 'Updated.' : 'Upcoming update added.');
    renderAdminPage();
  });
}

// ---- Confidential announcement creator ----
function openCreateAnnouncementModal() {
  document.querySelector('.ann-editor-overlay')?.remove();
  const overlay = document.createElement('div');
  overlay.className = 'ann-editor-overlay auth-modal-overlay';
  overlay.style.cssText = 'opacity:1;z-index:9015';

  overlay.innerHTML = `
    <div class="auth-modal" style="max-width:500px">
      <button class="auth-modal-close" id="ann-close"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
      <div class="auth-logo"><span class="auth-logo-name">Staff Announcement</span></div>
      <div class="auth-form active">
        <div class="form-group">
          <label class="form-label">Title</label>
          <input class="form-input" id="ann-title" placeholder="e.g. Policy Update, Team Notice">
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Visible to</label>
            <select class="form-select" id="ann-visibility">
              <option value="staff">Staff (Mod+)</option>
              <option value="admin">Admin+</option>
              <option value="superadmin">Superadmin only</option>
            </select>
          </div>
          <div class="form-group" style="justify-content:flex-end;padding-top:1.5rem">
            <label class="form-check">
              <input type="checkbox" id="ann-pinned"> Pin to top
            </label>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Message (Markdown supported)</label>
          <textarea class="form-textarea" id="ann-body" rows="5" placeholder="Internal note for staff…"></textarea>
        </div>
        <div style="display:flex;gap:.5rem;justify-content:flex-end">
          <button class="compose-cancel-btn" id="ann-cancel">Cancel</button>
          <button class="form-submit" id="ann-save" style="width:auto;padding:.55rem 1.5rem">Post Announcement</button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);
  overlay.querySelector('#ann-close').addEventListener('click', () => overlay.remove());
  overlay.querySelector('#ann-cancel').addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
  overlay.querySelector('#ann-save').addEventListener('click', () => {
    const title = document.getElementById('ann-title').value.trim();
    const body  = document.getElementById('ann-body').value.trim();
    if (!title || !body) { showToast('Title and message required.'); return; }
    PSYCHE_UPDATES.createAnnouncement({
      title, body,
      visibility: document.getElementById('ann-visibility').value,
      pinned: document.getElementById('ann-pinned').checked,
    });
    overlay.remove();
    showToast('Staff announcement posted.');
    renderAdminPage();
  });
}

// ============================================================
// INIT
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  PSYCHE_REPORT_CONFIG.load();
  PSYCHE_AUDIT.load();
  PSYCHE_UPDATES.load();
  initHelpWidget();
});
