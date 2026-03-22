/* ============================================================
   PSYCHE — Help Desk System v2
   Full ticket lifecycle: create, claim, reply, escalate, resolve
   Notification bell, post review panel, staff tools
   ============================================================ */

// ============================================================
// NOTIFICATIONS SYSTEM
// ============================================================
const PSYCHE_NOTIFICATIONS = {
  items: [], // { id, userId, type, title, body, link, read, createdAt }

  add({ userId, type, title, body, link = null }) {
    const note = {
      id: 'n_' + Date.now() + '_' + Math.random().toString(36).slice(2,5),
      userId, type, title, body, link,
      read: false,
      createdAt: new Date().toISOString(),
    };
    this.items.unshift(note);
    if (this.items.length > 200) this.items = this.items.slice(0, 200);
    this._save();
    this._updateBell();
    return note;
  },

  // Notify all staff of a given minimum level
  notifyStaff(minLevel, { type, title, body, link }) {
    Object.values(PSYCHE.users).forEach(u => {
      const level = typeof PSYCHE_ROLES !== 'undefined' ? PSYCHE_ROLES.roles[u.role]?.level || 0 : 0;
      if (level >= minLevel && !u.banned) {
        this.add({ userId: u.id, type, title, body, link });
      }
    });
    this._updateBell();
  },

  getForUser(userId) {
    return this.items.filter(n => n.userId === userId);
  },

  getUnreadCount(userId) {
    return this.items.filter(n => n.userId === userId && !n.read).length;
  },

  markRead(id) {
    const n = this.items.find(i => i.id === id);
    if (n) { n.read = true; this._save(); this._updateBell(); }
  },

  markAllRead(userId) {
    this.items.filter(n => n.userId === userId).forEach(n => n.read = true);
    this._save(); this._updateBell();
  },

  _updateBell() {
    const u = PSYCHE.currentUser;
    if (!u) return;
    const count = this.getUnreadCount(u.id);
    const bell = document.getElementById('notif-bell');
    const badge = document.getElementById('notif-badge');
    if (badge) {
      badge.textContent = count > 9 ? '9+' : count;
      badge.style.display = count > 0 ? 'flex' : 'none';
    }
  },

  _save() { try { localStorage.setItem('psyche_notifications', JSON.stringify(this.items)); } catch(e) {} },
  load() {
    try {
      const raw = localStorage.getItem('psyche_notifications');
      if (raw) this.items = JSON.parse(raw);
    } catch(e) {}
  },
};

// ============================================================
// TICKET SYSTEM v2 — Full lifecycle
// ============================================================
const PSYCHE_HD = {
  tickets: [],

  // Ticket statuses: open | claimed | in_progress | escalated | resolved | closed
  STATUS_LABELS: {
    open:        { label: 'Open',        color: '#60a5fa', icon: '🟢' },
    claimed:     { label: 'Claimed',     color: '#a78bfa', icon: '🔵' },
    in_progress: { label: 'In Progress', color: '#f59e0b', icon: '🟡' },
    escalated:   { label: 'ESCALATED',   color: '#ef4444', icon: '🔴' },
    resolved:    { label: 'Resolved',    color: '#22c55e', icon: '✅' },
    closed:      { label: 'Closed',      color: '#6b7280', icon: '⚫' },
  },

  PRIORITY_COLORS: {
    low:    '#6b7280',
    normal: '#60a5fa',
    high:   '#f97316',
    urgent: '#ef4444',
  },

  create({ category, subject, message, email, userId, priority = 'normal', meta = {} }) {
    const id = 'TKT-' + Date.now().toString(36).toUpperCase().slice(-6);
    const ticket = {
      id,
      category, subject, message, email,
      userId: userId || null,
      priority,
      status: 'open',
      claimedBy: null,
      claimedAt: null,
      escalatedBy: null,
      escalatedAt: null,
      escalationNote: '',
      resolvedBy: null,
      resolvedAt: null,
      resolutionNote: '',
      thread: [  // Full message thread
        {
          id: 'msg_0',
          authorId: userId || null,
          authorName: userId ? (PSYCHE.users[userId]?.displayName || 'User') : (email?.split('@')[0] || 'Guest'),
          isStaff: false,
          body: message,
          internal: false,  // internal = only visible to staff
          createdAt: new Date().toISOString(),
        }
      ],
      tags: [],
      meta,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      history: [
        { action: 'created', by: userId || 'guest', at: new Date().toISOString(), note: 'Ticket created' }
      ],
    };

    this.tickets.unshift(ticket);
    this._save();

    // Notify support staff
    PSYCHE_NOTIFICATIONS.notifyStaff(5, { // support_agent level
      type: 'ticket_new',
      title: `New Ticket: ${subject.slice(0,50)}`,
      body: `[${category}] ${priority === 'urgent' || priority === 'high' ? '⚠ ' : ''}From: ${email}`,
      link: 'ticket:' + id,
    });

    if (typeof PSYCHE_AUDIT !== 'undefined') {
      PSYCHE_AUDIT.log('ticket.created', { targetId: id, targetType: 'ticket', detail: `Ticket created: "${subject}" [${category}]` });
    }

    return ticket;
  },

  get(id) { return this.tickets.find(t => t.id === id); },

  getForUser(userId) { return this.tickets.filter(t => t.userId === userId); },

  getOpen()     { return this.tickets.filter(t => !['resolved','closed'].includes(t.status)); },
  getResolved() { return this.tickets.filter(t => ['resolved','closed'].includes(t.status)); },
  getEscalated(){ return this.tickets.filter(t => t.status === 'escalated'); },

  // Claim ticket (staff)
  claim(ticketId, staffId) {
    const t = this.get(ticketId);
    if (!t) return { success: false, error: 'Ticket not found.' };
    if (t.claimedBy && t.claimedBy !== staffId) {
      const other = PSYCHE.users[t.claimedBy];
      return { success: false, error: `Already claimed by ${other?.displayName || 'another agent'}.` };
    }
    const staff = PSYCHE.users[staffId];
    t.claimedBy = staffId;
    t.claimedAt = new Date().toISOString();
    t.status = 'claimed';
    t.updatedAt = new Date().toISOString();
    t.history.push({ action: 'claimed', by: staffId, at: new Date().toISOString(), note: `Claimed by ${staff?.displayName}` });
    this._save();

    // Notify the user
    if (t.userId) {
      PSYCHE_NOTIFICATIONS.add({
        userId: t.userId, type: 'ticket_claimed',
        title: `Your ticket is being handled`,
        body: `${staff?.displayName || 'A support agent'} is now looking into "${t.subject.slice(0,40)}…"`,
        link: 'ticket:' + ticketId,
      });
    }
    PSYCHE_AUDIT.log?.('ticket.claimed', { targetId: ticketId, detail: `Claimed by @${staff?.username}` });
    return { success: true };
  },

  // Release claim
  unclaim(ticketId, staffId) {
    const t = this.get(ticketId);
    if (!t || t.claimedBy !== staffId) return { success: false, error: 'Not your ticket.' };
    t.claimedBy = null; t.claimedAt = null;
    t.status = 'open'; t.updatedAt = new Date().toISOString();
    t.history.push({ action: 'unclaimed', by: staffId, at: new Date().toISOString(), note: 'Released back to queue' });
    this._save();
    return { success: true };
  },

  // Reply to ticket
  reply(ticketId, { body, authorId, internal = false }) {
    const t = this.get(ticketId);
    if (!t) return { success: false, error: 'Ticket not found.' };
    const author = PSYCHE.users[authorId];
    const isStaff = author ? (typeof PSYCHE_ROLES !== 'undefined' ? PSYCHE_ROLES.can('support.respond', author) : false) : false;

    const msg = {
      id: 'msg_' + Date.now(),
      authorId,
      authorName: author?.displayName || 'Unknown',
      isStaff,
      body,
      internal,
      createdAt: new Date().toISOString(),
    };
    t.thread.push(msg);
    if (t.status === 'claimed' || t.status === 'open') t.status = 'in_progress';
    t.updatedAt = new Date().toISOString();
    t.history.push({ action: 'replied', by: authorId, at: new Date().toISOString(), note: internal ? 'Internal note added' : 'Reply sent' });
    this._save();

    // Notify the other party
    if (isStaff && t.userId && !internal) {
      PSYCHE_NOTIFICATIONS.add({
        userId: t.userId, type: 'ticket_reply',
        title: `New reply on your ticket`,
        body: `"${t.subject.slice(0,40)}" — ${body.slice(0,80)}`,
        link: 'ticket:' + ticketId,
      });
    } else if (!isStaff) {
      // User replied — notify claimed staff or all support
      const notifyId = t.claimedBy;
      if (notifyId) {
        PSYCHE_NOTIFICATIONS.add({
          userId: notifyId, type: 'ticket_user_reply',
          title: `User replied on ticket ${ticketId}`,
          body: `"${t.subject.slice(0,40)}" — ${body.slice(0,80)}`,
          link: 'ticket:' + ticketId,
        });
      }
    }
    PSYCHE_AUDIT.log?.('ticket.responded', { targetId: ticketId, detail: `${internal?'Internal note':'Reply'} by @${author?.username}` });
    return { success: true, message: msg };
  },

  // Escalate
  escalate(ticketId, staffId, note) {
    const t = this.get(ticketId);
    if (!t) return { success: false, error: 'Ticket not found.' };
    const staff = PSYCHE.users[staffId];
    t.status = 'escalated';
    t.escalatedBy = staffId;
    t.escalatedAt = new Date().toISOString();
    t.escalationNote = note || '';
    t.updatedAt = new Date().toISOString();
    t.history.push({ action: 'escalated', by: staffId, at: new Date().toISOString(), note: note || 'Escalated' });
    t.thread.push({
      id: 'msg_esc_' + Date.now(),
      authorId: staffId,
      authorName: staff?.displayName || 'Staff',
      isStaff: true,
      body: `⚠️ **Escalated** by ${staff?.displayName}: ${note || 'Needs senior review.'}`,
      internal: true,
      createdAt: new Date().toISOString(),
    });
    this._save();

    // Notify admins and above (level 9+)
    PSYCHE_NOTIFICATIONS.notifyStaff(9, {
      type: 'ticket_escalated',
      title: `🔴 ESCALATED: ${t.subject.slice(0,40)}`,
      body: `Ticket ${ticketId} needs senior review. ${note || ''}`,
      link: 'ticket:' + ticketId,
    });

    // Notify the user
    if (t.userId) {
      PSYCHE_NOTIFICATIONS.add({
        userId: t.userId, type: 'ticket_escalated',
        title: 'Your ticket has been escalated',
        body: `"${t.subject.slice(0,40)}" has been escalated to senior staff for review.`,
        link: 'ticket:' + ticketId,
      });
    }
    PSYCHE_AUDIT.log?.('ticket.escalated', { targetId: ticketId, detail: `Escalated by @${staff?.username}: ${note}` });
    return { success: true };
  },

  // Resolve
  resolve(ticketId, staffId, note) {
    const t = this.get(ticketId);
    if (!t) return { success: false, error: 'Ticket not found.' };
    const staff = PSYCHE.users[staffId];
    t.status = 'resolved';
    t.resolvedBy = staffId;
    t.resolvedAt = new Date().toISOString();
    t.resolutionNote = note || '';
    t.updatedAt = new Date().toISOString();
    t.history.push({ action: 'resolved', by: staffId, at: new Date().toISOString(), note: note || 'Resolved' });
    this._save();

    if (t.userId) {
      PSYCHE_NOTIFICATIONS.add({
        userId: t.userId, type: 'ticket_resolved',
        title: '✅ Your ticket has been resolved',
        body: `"${t.subject.slice(0,40)}" — ${note || 'Issue resolved by support.'}`,
        link: 'ticket:' + ticketId,
      });
    }
    PSYCHE_AUDIT.log?.('ticket.resolved', { targetId: ticketId, detail: `Resolved by @${staff?.username}: ${note}` });
    return { success: true };
  },

  _save() {
    try { localStorage.setItem('psyche_hd_tickets', JSON.stringify(this.tickets)); } catch(e) {}
  },
  load() {
    try {
      const raw = localStorage.getItem('psyche_hd_tickets');
      if (raw) this.tickets = JSON.parse(raw);
    } catch(e) {}
    if (this.tickets.length === 0) this._seedDemo();
  },

  _seedDemo() {
    this.create({ category:'shop', subject:'When does the store fully launch?', message:'Super excited about the merch! Is there a timeline for when payments will be enabled?', email:'sarah@example.com', userId:'u_demo1', priority:'normal' });
    this.create({ category:'account', subject:'How do I upgrade to Pro?', message:'I want to upgrade my account to Pro but I don\'t see a payment option. Can you help?', email:'maya@example.com', userId:'u_demo4', priority:'normal' });
    this.create({ category:'technical', subject:'Post not showing after submission', message:'I submitted a discussion post 2 hours ago and it\'s still not visible in the forum. My username is anxious_q. Is there a delay?', email:'aq@example.com', userId:'u_demo5', priority:'high' });
  },
};

// ============================================================
// TICKET PORTAL (user-facing full page)
// ============================================================
function renderTicketPortal() {
  const page = document.getElementById('page-tickets');
  if (!page) return;
  const u = PSYCHE.currentUser;
  if (!u) { openAuthModal('signin'); return; }

  const myTickets = PSYCHE_HD.getForUser(u.id);
  const open     = myTickets.filter(t => !['resolved','closed'].includes(t.status));
  const resolved = myTickets.filter(t => ['resolved','closed'].includes(t.status));
  const PSYCHE_HD_STATUS = PSYCHE_HD.STATUS_LABELS;

  page.innerHTML = `
    <div class="ticket-portal">
      <div class="ticket-portal-header">
        <div>
          <h1 class="ticket-portal-title">My Support Tickets</h1>
          <p class="ticket-portal-sub">Track your open requests and view responses from our team.</p>
        </div>
        <button class="btn-primary" id="tp-new-ticket">+ New Ticket</button>
      </div>

      <div class="ticket-portal-tabs">
        <button class="tp-tab active" data-tab="open">
          Open <span class="tp-tab-count">${open.length}</span>
        </button>
        <button class="tp-tab" data-tab="resolved">
          Resolved <span class="tp-tab-count">${resolved.length}</span>
        </button>
      </div>

      <!-- Open tickets -->
      <div class="tp-panel active" data-panel="open">
        ${open.length === 0
          ? `<div class="ticket-portal-empty">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" opacity=".3"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
              <p>No open tickets. Things are looking good!</p>
              <button class="btn-primary" id="tp-new-ticket-2">Create a ticket</button>
            </div>`
          : open.map(t => renderTicketCard(t, u.id, false)).join('')}
      </div>

      <!-- Resolved tickets -->
      <div class="tp-panel" data-panel="resolved">
        ${resolved.length === 0
          ? `<div class="ticket-portal-empty"><p>No resolved tickets yet.</p></div>`
          : resolved.map(t => renderTicketCard(t, u.id, true)).join('')}
      </div>
    </div>
  `;

  // Tabs
  page.querySelectorAll('.tp-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      page.querySelectorAll('.tp-tab').forEach(t => t.classList.remove('active'));
      page.querySelectorAll('.tp-panel').forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      page.querySelector(`.tp-panel[data-panel="${tab.dataset.tab}"]`)?.classList.add('active');
    });
  });

  page.querySelectorAll('#tp-new-ticket, #tp-new-ticket-2').forEach(btn => {
    btn.addEventListener('click', () => openNewTicketModal());
  });

  // Open ticket on click
  page.querySelectorAll('[data-open-ticket]').forEach(el => {
    el.addEventListener('click', () => openTicketThread(el.dataset.openTicket, false));
  });
}

function renderTicketCard(t, viewerId, isResolved) {
  const status = PSYCHE_HD.STATUS_LABELS[t.status] || PSYCHE_HD.STATUS_LABELS.open;
  const claimed = t.claimedBy ? PSYCHE.users[t.claimedBy] : null;
  const lastMsg = t.thread.filter(m => !m.internal).at(-1);
  const unread  = t.thread.filter(m => m.isStaff && !m.internal).length > 0;
  const isEscalated = t.status === 'escalated';

  return `
    <div class="ticket-card ${isEscalated ? 'ticket-card--escalated' : ''}" data-open-ticket="${t.id}">
      ${isEscalated ? `<div class="ticket-escalation-banner">🔴 ESCALATED — Under senior review</div>` : ''}
      <div class="ticket-card-top">
        <div class="ticket-card-left">
          <div class="ticket-card-id">${t.id}</div>
          <h3 class="ticket-card-subject ticket-card-subject--link" data-open-ticket="${t.id}">${escapeHtml(t.subject)}</h3>
          <div class="ticket-card-meta">
            <span class="ticket-cat-badge">${t.category}</span>
            <span class="ticket-priority-dot" style="background:${PSYCHE_HD.PRIORITY_COLORS[t.priority]}" title="${t.priority} priority"></span>
            <span>${t.priority} priority</span>
            <span>·</span>
            <span>${timeAgo ? timeAgo(t.createdAt) : new Date(t.createdAt).toLocaleDateString()}</span>
            <span>·</span>
            <span>${t.thread.filter(m=>!m.internal).length} message${t.thread.filter(m=>!m.internal).length!==1?'s':''}</span>
          </div>
        </div>
        <div class="ticket-card-right">
          <span class="ticket-status-badge" style="background:${status.color}22;color:${status.color};border:1px solid ${status.color}44">
            ${status.icon} ${status.label}
          </span>
          ${claimed ? `<div class="ticket-claimed-by">Handled by ${escapeHtml(claimed.displayName)}</div>` : ''}
          ${unread && !isResolved ? `<span class="ticket-unread-dot" title="New response"></span>` : ''}
        </div>
      </div>
      ${lastMsg ? `
      <div class="ticket-last-msg">
        <span class="ticket-msg-author ${lastMsg.isStaff?'ticket-msg-author--staff':''}">${escapeHtml(lastMsg.authorName)}${lastMsg.isStaff?' (Support)':''}</span>
        <span class="ticket-msg-preview">${escapeHtml(lastMsg.body.slice(0,100))}${lastMsg.body.length>100?'…':''}</span>
      </div>` : ''}
      ${t.resolutionNote && isResolved ? `<div class="ticket-resolution">✅ ${escapeHtml(t.resolutionNote)}</div>` : ''}
    </div>
  `;
}

// ============================================================
// TICKET THREAD VIEW
// ============================================================
function openTicketThread(ticketId, isStaffView = false) {
  const t = PSYCHE_HD.get(ticketId);
  if (!t) { showToast('Ticket not found.'); return; }
  const u = PSYCHE.currentUser;
  const isStaff = u && typeof PSYCHE_ROLES !== 'undefined' && PSYCHE_ROLES.can('support.view_tickets', u);
  const status = PSYCHE_HD.STATUS_LABELS[t.status] || PSYCHE_HD.STATUS_LABELS.open;
  const claimed = t.claimedBy ? PSYCHE.users[t.claimedBy] : null;
  const isEscalated = t.status === 'escalated';
  const isMyClaim = t.claimedBy === u?.id;
  const privLevel = typeof PSYCHE_ROLES !== 'undefined' ? PSYCHE_ROLES.privacyLevel() : 0;

  document.querySelector('.thread-overlay')?.remove();
  const overlay = document.createElement('div');
  overlay.className = 'thread-overlay';

  overlay.innerHTML = `
    <div class="thread-modal">
      <!-- Header -->
      <div class="thread-header ${isEscalated ? 'thread-header--escalated' : ''}">
        <div class="thread-header-left">
          <button class="thread-back-btn" id="thread-close">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
          </button>
          <div>
            <div class="thread-ticket-id">${t.id} ${isEscalated ? '<span class="thread-escalated-tag">🔴 ESCALATED</span>' : ''}</div>
            <h2 class="thread-subject">${escapeHtml(t.subject)}</h2>
            <div class="thread-meta">
              <span class="ticket-cat-badge">${t.category}</span>
              <span class="ticket-status-badge" style="background:${status.color}22;color:${status.color};border:1px solid ${status.color}44">${status.icon} ${status.label}</span>
              <span style="font-size:.75rem;color:var(--color-text-muted)">
                ${t.priority} priority · ${timeAgo ? timeAgo(t.createdAt) : new Date(t.createdAt).toLocaleDateString()}
              </span>
              ${claimed ? `<span class="thread-claimed-badge">👤 ${escapeHtml(claimed.displayName)}</span>` : ''}
            </div>
          </div>
        </div>
        <div class="thread-header-actions">
          ${isStaff ? `
            ${!t.claimedBy ? `<button class="thread-action-btn thread-action-btn--claim" id="thread-claim">Claim Ticket</button>` : ''}
            ${isMyClaim ? `<button class="thread-action-btn" id="thread-unclaim">Release</button>` : ''}
            ${isStaff && !['resolved','closed','escalated'].includes(t.status) ? `
              <button class="thread-action-btn thread-action-btn--escalate" id="thread-escalate">⚠ Escalate</button>
            ` : ''}
            ${isStaff && !['resolved','closed'].includes(t.status) ? `
              <button class="thread-action-btn thread-action-btn--resolve" id="thread-resolve">✓ Resolve</button>
            ` : ''}
          ` : ''}
        </div>
      </div>

      <!-- Staff sidebar (only for staff) -->
      ${isStaff ? `
      <div class="thread-staff-bar">
        ${privLevel >= 1 ? `
          <div class="thread-info-item"><span class="thread-info-label">From</span><span class="thread-info-val">${escapeHtml(t.email || '—')}</span></div>
          <div class="thread-info-item"><span class="thread-info-label">Category</span><span class="thread-info-val">${t.category}</span></div>
        ` : ''}
        ${privLevel >= 2 ? `
          <div class="thread-info-item"><span class="thread-info-label">User</span><span class="thread-info-val">${t.userId ? `@${escapeHtml(PSYCHE.users[t.userId]?.username||'?')}` : 'Guest'}</span></div>
          <div class="thread-info-item"><span class="thread-info-label">Role</span><span class="thread-info-val">${t.userId ? (PSYCHE.users[t.userId]?.role||'?') : '—'}</span></div>
        ` : ''}
        ${privLevel >= 3 ? `
          <div class="thread-info-item"><span class="thread-info-label">History</span><span class="thread-info-val">${t.history.length} events</span></div>
          <div class="thread-info-item"><span class="thread-info-label">Updated</span><span class="thread-info-val">${timeAgo ? timeAgo(t.updatedAt) : 'recently'}</span></div>
        ` : ''}
        ${t.escalationNote ? `<div class="thread-info-item thread-info-item--warn"><span class="thread-info-label">Escalation Note</span><span class="thread-info-val">${escapeHtml(t.escalationNote)}</span></div>` : ''}
      </div>` : ''}

      <!-- Message thread -->
      <div class="thread-messages" id="thread-messages">
        ${t.thread.filter(m => isStaff || !m.internal).map(m => renderThreadMessage(m, isStaff)).join('')}
        ${t.claimedBy && t.claimedAt ? `
        <div class="thread-system-msg">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          <span><strong>${escapeHtml(PSYCHE.users[t.claimedBy]?.displayName||'A support agent')}</strong> claimed this ticket and is working on it · ${typeof timeAgo === 'function' ? timeAgo(t.claimedAt) : ''}</span>
        </div>` : ''}
      </div>

      <!-- Reply box -->
      ${!['closed'].includes(t.status) && u ? `
      <div class="thread-reply-box">
        <div class="thread-reply-avatar" style="background:${u.avatarColor}">${initials(u.displayName)}</div>
        <div class="thread-reply-input-wrap">
          <textarea class="thread-reply-input" id="thread-reply-input" placeholder="${isStaff ? 'Reply to user…' : 'Reply to support…'}" rows="3"></textarea>
          <div class="thread-reply-footer">
            ${isStaff ? `
              <label class="thread-internal-toggle">
                <input type="checkbox" id="thread-internal-check">
                <span>Internal note (not visible to user)</span>
              </label>` : '<span></span>'}
            <button class="compose-submit" id="thread-send-reply">Send</button>
          </div>
        </div>
      </div>` : `<div class="thread-closed-notice">${t.status === 'closed' ? 'This ticket is closed.' : ''}</div>`}

      <!-- History (staff only) -->
      ${isStaff && privLevel >= 2 ? `
      <div class="thread-history">
        <div class="thread-history-title">Ticket History</div>
        ${t.history.map(h => `
          <div class="thread-history-item">
            <span class="thread-history-action">${h.action}</span>
            <span class="thread-history-note">${escapeHtml(h.note||'')}</span>
            <span class="thread-history-time">${timeAgo ? timeAgo(h.at) : h.at}</span>
          </div>`).join('')}
      </div>` : ''}
    </div>
  `;

  document.body.appendChild(overlay);

  // Close
  overlay.querySelector('#thread-close').addEventListener('click', () => {
    overlay.remove();
    // Re-render whatever page was open
    if (isStaffView) renderAdminPage();
    else renderTicketPortal();
  });

  // Claim
  overlay.querySelector('#thread-claim')?.addEventListener('click', () => {
    const result = PSYCHE_HD.claim(ticketId, u.id);
    if (result.success) { showToast('Ticket claimed.'); overlay.remove(); openTicketThread(ticketId, isStaffView); }
    else showToast(result.error);
  });

  // Unclaim
  overlay.querySelector('#thread-unclaim')?.addEventListener('click', () => {
    PSYCHE_HD.unclaim(ticketId, u.id);
    showToast('Ticket released.'); overlay.remove(); openTicketThread(ticketId, isStaffView);
  });

  // Escalate
  overlay.querySelector('#thread-escalate')?.addEventListener('click', () => {
    const note = prompt('Escalation note (what needs senior review?):');
    if (note === null) return;
    const result = PSYCHE_HD.escalate(ticketId, u.id, note);
    if (result.success) { showToast('Ticket escalated. Admins have been notified.'); overlay.remove(); openTicketThread(ticketId, isStaffView); }
    else showToast(result.error);
  });

  // Resolve
  overlay.querySelector('#thread-resolve')?.addEventListener('click', () => {
    const note = prompt('Resolution note (brief summary of how it was resolved):');
    if (note === null) return;
    const result = PSYCHE_HD.resolve(ticketId, u.id, note);
    if (result.success) { showToast('Ticket resolved.'); overlay.remove(); if(isStaffView) renderAdminPage(); else renderTicketPortal(); }
    else showToast(result.error);
  });

  // Send reply
  overlay.querySelector('#thread-send-reply')?.addEventListener('click', () => {
    const body = document.getElementById('thread-reply-input').value.trim();
    if (!body) { showToast('Please write a reply.'); return; }
    const internal = document.getElementById('thread-internal-check')?.checked || false;
    const result = PSYCHE_HD.reply(ticketId, { body, authorId: u.id, internal });
    if (result.success) {
      document.getElementById('thread-reply-input').value = '';
      const msgs = document.getElementById('thread-messages');
      const isStaffView_ = isStaff;
      msgs.insertAdjacentHTML('beforeend', renderThreadMessage(result.message, isStaff));
      msgs.scrollTop = msgs.scrollHeight;
    } else showToast(result.error);
  });
}

function renderThreadMessage(msg, isStaff) {
  const isInternal = msg.internal;
  if (isInternal && !isStaff) return ''; // hide internal notes from users
  return `
    <div class="thread-msg ${msg.isStaff ? 'thread-msg--staff' : 'thread-msg--user'} ${isInternal ? 'thread-msg--internal' : ''}">
      <div class="thread-msg-avatar">${(msg.authorName||'?')[0].toUpperCase()}</div>
      <div class="thread-msg-content">
        <div class="thread-msg-header">
          <span class="thread-msg-author">${escapeHtml(msg.authorName)}</span>
          ${msg.isStaff ? '<span class="thread-staff-badge">Support</span>' : ''}
          ${isInternal ? '<span class="thread-internal-badge">Internal Note</span>' : ''}
          <span class="thread-msg-time">${timeAgo ? timeAgo(msg.createdAt) : msg.createdAt}</span>
        </div>
        <div class="thread-msg-body">${escapeHtml(msg.body).replace(/\n/g,'<br>').replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>')}</div>
      </div>
    </div>
  `;
}

// ============================================================
// NEW TICKET MODAL (clean, user-facing)
// ============================================================
function openNewTicketModal(prefillCategory = 'general') {
  document.querySelector('.new-ticket-overlay')?.remove();
  const u = PSYCHE.currentUser;
  const overlay = document.createElement('div');
  overlay.className = 'new-ticket-overlay auth-modal-overlay';
  overlay.style.cssText = 'opacity:1;z-index:9010';

  const categories = [
    { id:'general',    label:'General Question',    icon:'💬' },
    { id:'account',    label:'Account Issue',        icon:'👤' },
    { id:'shop',       label:'Shop / Order',         icon:'🛍' },
    { id:'content',    label:'Content / Post Issue', icon:'📝' },
    { id:'technical',  label:'Technical Problem',    icon:'⚙️' },
    { id:'billing',    label:'Billing',              icon:'💳' },
  ];

  overlay.innerHTML = `
    <div class="auth-modal" style="max-width:500px">
      <button class="auth-modal-close" id="nt-close">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
      <div class="auth-logo">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
        <span class="auth-logo-name">Submit a Support Ticket</span>
      </div>
      <div class="auth-form active">
        <div class="form-group">
          <label class="form-label">What do you need help with?</label>
          <div class="nt-category-grid">
            ${categories.map(c => `
              <button type="button" class="nt-cat-btn ${prefillCategory===c.id?'active':''}" data-cat="${c.id}">
                <span class="nt-cat-icon">${c.icon}</span>
                <span>${c.label}</span>
              </button>`).join('')}
          </div>
          <input type="hidden" id="nt-category-val" value="${prefillCategory}">
        </div>
        <div class="form-group">
          <label class="form-label">Priority</label>
          <div style="display:flex;gap:.5rem">
            ${['normal','high','urgent'].map(p => `
              <label class="nt-priority-btn ${p==='normal'?'active':''}">
                <input type="radio" name="nt-priority" value="${p}" ${p==='normal'?'checked':''} style="display:none">
                <span style="color:${PSYCHE_HD.PRIORITY_COLORS[p]}">${p === 'urgent' ? '🔴' : p === 'high' ? '🟠' : '⚪'} ${p}</span>
              </label>`).join('')}
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Subject <span class="form-required">*</span></label>
          <input class="form-input" id="nt-subject" placeholder="Brief description of your issue">
        </div>
        <div class="form-group">
          <label class="form-label">Message <span class="form-required">*</span></label>
          <textarea class="form-textarea" id="nt-message" rows="5" placeholder="The more detail you provide, the faster we can help…"></textarea>
        </div>
        ${!u ? `
        <div class="form-group">
          <label class="form-label">Email <span class="form-required">*</span></label>
          <input class="form-input" id="nt-email" type="email" placeholder="For reply notifications">
        </div>` : ''}
        <div class="form-error" id="nt-error" hidden></div>
        <button class="form-submit" id="nt-submit">Submit Ticket</button>
        <p style="font-size:.72rem;color:var(--color-text-faint);text-align:center;margin-top:.5rem">
          We respond within 24 hours. You can track your ticket from your account.
        </p>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);
  overlay.querySelector('#nt-close').addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });

  // Category selection
  overlay.querySelectorAll('.nt-cat-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      overlay.querySelectorAll('.nt-cat-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('nt-category-val').value = btn.dataset.cat;
    });
  });

  // Priority selection
  overlay.querySelectorAll('.nt-priority-btn').forEach(lbl => {
    lbl.querySelector('input').addEventListener('change', () => {
      overlay.querySelectorAll('.nt-priority-btn').forEach(l => l.classList.remove('active'));
      lbl.classList.add('active');
    });
  });

  overlay.querySelector('#nt-submit').addEventListener('click', () => {
    const subject  = document.getElementById('nt-subject').value.trim();
    const message  = document.getElementById('nt-message').value.trim();
    const category = document.getElementById('nt-category-val').value || 'general';
    const priority = overlay.querySelector('input[name="nt-priority"]:checked')?.value || 'normal';
    const email    = u?.email || document.getElementById('nt-email')?.value.trim();
    const errEl    = document.getElementById('nt-error');

    if (!subject) { errEl.textContent = 'Please add a subject.'; errEl.hidden = false; return; }
    if (!message) { errEl.textContent = 'Please describe your issue.'; errEl.hidden = false; return; }
    if (!email)   { errEl.textContent = 'Please enter your email.';   errEl.hidden = false; return; }

    const ticket = PSYCHE_HD.create({ category, subject, message, email, userId: u?.id, priority });
    overlay.remove();
    showToast(`Ticket ${ticket.id} submitted!`);

    // Navigate to ticket portal if logged in
    if (u) { navigateTo('page-tickets'); }
  });
}

// ============================================================
// STAFF TICKET DASHBOARD (admin panel section)
// ============================================================
function renderStaffTicketDashboard(privLevel) {
  const open      = PSYCHE_HD.getOpen();
  const escalated = PSYCHE_HD.getEscalated();
  const resolved  = PSYCHE_HD.getResolved();
  const u         = PSYCHE.currentUser;

  return `
    <div class="staff-ticket-dashboard">
      <!-- Stats row -->
      <div class="std-stats-row">
        <div class="std-stat"><span class="std-stat-num">${open.length}</span><span class="std-stat-label">Open</span></div>
        <div class="std-stat std-stat--escalated"><span class="std-stat-num">${escalated.length}</span><span class="std-stat-label">Escalated</span></div>
        <div class="std-stat"><span class="std-stat-num">${open.filter(t=>t.claimedBy===u?.id).length}</span><span class="std-stat-label">My Tickets</span></div>
        <div class="std-stat"><span class="std-stat-num">${resolved.length}</span><span class="std-stat-label">Resolved</span></div>
      </div>

      <!-- Filter bar -->
      <div class="std-filter-bar">
        <input class="admin-search" id="std-search" placeholder="Search tickets…" style="max-width:220px">
        <select class="admin-filter-select" id="std-status-filter">
          <option value="">All Status</option>
          ${Object.keys(PSYCHE_HD.STATUS_LABELS).map(s => `<option value="${s}">${PSYCHE_HD.STATUS_LABELS[s].label}</option>`).join('')}
        </select>
        <select class="admin-filter-select" id="std-priority-filter">
          <option value="">All Priority</option>
          <option value="urgent">Urgent</option>
          <option value="high">High</option>
          <option value="normal">Normal</option>
        </select>
        <select class="admin-filter-select" id="std-claimed-filter">
          <option value="">All Tickets</option>
          <option value="mine">My Tickets</option>
          <option value="unclaimed">Unclaimed</option>
        </select>
      </div>

      <!-- Ticket list -->
      <div class="std-ticket-list" id="std-ticket-list">
        ${renderStaffTicketList([...escalated, ...open.filter(t=>t.status!=='escalated'), ...resolved], u, privLevel)}
      </div>
    </div>
  `;
}

function renderStaffTicketList(tickets, u, privLevel) {
  if (!tickets.length) return '<div class="admin-empty">No tickets found.</div>';
  return tickets.map(t => {
    const status  = PSYCHE_HD.STATUS_LABELS[t.status] || PSYCHE_HD.STATUS_LABELS.open;
    const claimed = t.claimedBy ? PSYCHE.users[t.claimedBy] : null;
    const isEsc   = t.status === 'escalated';
    const isMine  = t.claimedBy === u?.id;
    const user    = t.userId ? PSYCHE.users[t.userId] : null;
    const unreplied = t.thread.every(m => !m.isStaff || m.internal);

    return `
      <div class="std-ticket-row ${isEsc?'std-ticket-row--escalated':''} ${isMine?'std-ticket-row--mine':''}" data-tid="${t.id}">
        ${isEsc ? `<div class="std-escalation-flag">🔴 ESCALATED${t.escalationNote ? ': ' + escapeHtml(t.escalationNote.slice(0,50)) : ''}</div>` : ''}
        <div class="std-ticket-main">
          <div class="std-ticket-left">
            <div class="std-ticket-id-row">
              <span class="ticket-list-id">${t.id}</span>
              <span class="ticket-status-badge" style="background:${status.color}22;color:${status.color};border:1px solid ${status.color}44">${status.icon} ${status.label}</span>
              <span class="ticket-cat-badge">${t.category}</span>
              <span class="ticket-priority-dot" style="background:${PSYCHE_HD.PRIORITY_COLORS[t.priority]}" title="${t.priority}"></span>
              ${unreplied ? '<span class="std-awaiting-badge">Awaiting reply</span>' : ''}
            </div>
            <div class="std-ticket-subject" data-view-ticket="${t.id}" style="cursor:pointer;text-decoration:underline;text-decoration-color:rgba(255,255,255,0.2)" title="Click to view ticket">${escapeHtml(t.subject)}</div>
            <div class="std-ticket-meta">
              ${privLevel >= 1 ? `<span>${escapeHtml(t.email||'—')}</span>` : ''}
              ${privLevel >= 2 && user ? `<span>@${escapeHtml(user.username)}</span>` : ''}
              <span>${timeAgo ? timeAgo(t.createdAt) : new Date(t.createdAt).toLocaleDateString()}</span>
              <span>${t.thread.filter(m=>!m.internal).length} messages</span>
            </div>
          </div>
          <div class="std-ticket-right">
            ${claimed
              ? `<div style="text-align:right">
                  <span class="std-claimed-badge ${isMine?'std-claimed-badge--mine':''}">
                    👤 ${isMine ? 'You' : escapeHtml(claimed.displayName)}
                  </span>
                  ${t.claimedAt ? '<div style="font-size:.65rem;color:#6e7681;margin-top:.15rem">' + (typeof timeAgo==='function'?timeAgo(t.claimedAt):'') + '</div>' : ''}
                </div>`
              : `<span class="std-unclaimed-badge">Unclaimed</span>`}
            <div class="std-ticket-actions">
              <button class="admin-action-btn admin-action-btn--role" data-view-ticket="${t.id}">View</button>
              ${!t.claimedBy ? `<button class="admin-action-btn admin-action-btn--approve" data-claim-ticket="${t.id}">Claim</button>` : ''}
            </div>
          </div>
        </div>
      </div>`;
  }).join('');
}

// ============================================================
// POST REVIEW PANEL (admin panel)
// ============================================================
function renderPostQueue(kind, isAdm, isSA) {
  if (typeof PSYCHE_DATA === 'undefined') return '<p class="admin-empty">Loading...</p>';
  const posts = PSYCHE_DATA.getPendingPosts(kind);
  if (!posts.length) return '<p class="admin-empty">No pending posts.</p>';

  return posts.map(p => {
    const author = PSYCHE.users[p.authorId];
    const statusColors = { pending:'#f59e0b', needs_review:'#ef4444', timer:'#60a5fa' };
    const statusLabel  = { pending:'Pending Review', needs_review:'⚠ Needs Review', timer:'⏱ Auto-approve timer' };
    const color = statusColors[p.status] || '#6b7280';
    const internalCount = p.internalComments?.length || 0;

    return `
      <div class="post-review-row ${p.status==='needs_review'?'post-review-row--needs-review':''}" data-pid="${p.id}">
        <div class="prr-left">
          <div class="prr-top">
            <span class="admin-flag-type admin-flag-type--${kind==='blog'?'post':'comment'}">${kind==='blog'?'📝 Blog':'💬 Forum'}</span>
            <span class="prr-status-badge" style="background:${color}22;color:${color};border:1px solid ${color}44">${statusLabel[p.status]||p.status}</span>
            ${internalCount > 0 ? `<span class="prr-internal-count" title="${internalCount} internal note${internalCount!==1?'s':''}">📋 ${internalCount} note${internalCount!==1?'s':''}</span>` : ''}
          </div>
          <div class="prr-title prr-title--link" data-review-post="${p.id}" style="cursor:pointer" title="Click to review post">${escapeHtml(p.title)}</div>
          ${p.needsReviewReason ? `<div class="prr-review-reason">⚠ Editor note: "${escapeHtml(p.needsReviewReason)}"</div>` : ''}
          <div class="prr-meta">
            <span>by @${escapeHtml(author?.username||'?')}</span>
            <span>${escapeHtml(p.topic||'')}</span>
            <span>${new Date(p.createdAt).toLocaleDateString()}</span>
            <span>${p.postKind}</span>
          </div>
        </div>
        <div class="prr-actions">
          <button class="admin-action-btn admin-action-btn--role" data-review-post="${p.id}">📖 Review</button>
          ${isAdm ? `
            <button class="admin-action-btn admin-action-btn--approve" data-action="approve" data-pid="${p.id}">✓ Approve</button>
            <button class="admin-action-btn admin-action-btn--ban" data-action="temp_remove" data-pid="${p.id}">⛔ Remove</button>
          ` : ''}
          ${isSA ? `<button class="admin-action-btn admin-action-btn--ban" data-action="delete" data-pid="${p.id}" style="background:rgba(127,29,29,.2);color:#f87171">🗑 Delete</button>` : ''}
        </div>
      </div>`;
  }).join('');
}

function openPostReviewPanel(postId) {
  const p = PSYCHE_DATA.getPost(postId);
  if (!p) return;
  const u = PSYCHE.currentUser;
  const author = PSYCHE.users[p.authorId];
  const isSA   = PSYCHE_ROLES.isSuperAdmin();
  const isAdm  = PSYCHE_ROLES.isAdmin();

  document.querySelector('.post-review-overlay')?.remove();
  const overlay = document.createElement('div');
  overlay.className = 'post-review-overlay';

  overlay.innerHTML = `
    <div class="post-review-modal">
      <div class="prm-header">
        <div>
          <div class="prm-title">Post Review</div>
          <div class="prm-status">
            <span class="ticket-cat-badge">${p.postKind}</span>
            <span class="ticket-cat-badge">${p.topic||'—'}</span>
            <span class="ticket-status-badge" style="background:${p.status==='needs_review'?'#ef444422':'#f59e0b22'};color:${p.status==='needs_review'?'#ef4444':'#f59e0b'}">
              ${p.status==='needs_review'?'⚠ Needs Review':'Pending Approval'}
            </span>
          </div>
        </div>
        <button class="shop-admin-close" id="prm-close">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>

      <div class="prm-body">
        <!-- Post content -->
        <div class="prm-post">
          <div class="prm-post-meta">
            <div class="prm-author">
              <div class="nav-avatar" style="background:${author?.avatarColor||'#4f5d6e'};width:28px;height:28px;font-size:.7rem;font-weight:800">
                ${initials(author?.displayName||'?')}
              </div>
              <div>
                <span class="prm-author-name">${escapeHtml(author?.displayName||'[deleted]')}</span>
                <span class="prm-author-role">${author?.role||'—'}</span>
              </div>
              <span class="prm-post-date">${new Date(p.createdAt).toLocaleDateString()}</span>
            </div>
          </div>
          <h2 class="prm-post-title">${escapeHtml(p.title)}</h2>
          ${p.subtitle ? `<p class="prm-post-subtitle">${escapeHtml(p.subtitle)}</p>` : ''}
          <div class="prm-post-body">${typeof renderBlogMarkdown === 'function' ? renderBlogMarkdown(p.body) : escapeHtml(p.body).replace(/\n/g,'<br>')}</div>
        </div>

        <!-- Review panel -->
        <div class="prm-review-panel">
          <!-- Internal notes -->
          <div class="prm-section-title">Internal Notes ${p.internalComments?.length ? `(${p.internalComments.length})` : ''}</div>
          <div class="prm-notes-list">
            ${(p.internalComments||[]).map(c => {
              const noteAuthor = PSYCHE.users[c.authorId];
              return `<div class="prm-note">
                <div class="prm-note-header">
                  <span class="prm-note-author">${escapeHtml(noteAuthor?.displayName||'Staff')}</span>
                  <span class="prm-note-time">${timeAgo ? timeAgo(c.createdAt) : c.createdAt}</span>
                </div>
                <div class="prm-note-body">${escapeHtml(c.body)}</div>
              </div>`;
            }).join('') || '<div class="prm-no-notes">No internal notes yet.</div>'}
          </div>
          <textarea class="form-textarea prm-note-input" id="prm-note-input" rows="2" placeholder="Add an internal note (only staff can see this)…" style="margin-top:.5rem;font-size:.82rem"></textarea>
          <button class="admin-action-btn admin-action-btn--role" id="prm-add-note" style="margin-top:.4rem;width:100%">Add Note</button>

          <!-- Request co-review -->
          <div class="prm-section-title" style="margin-top:1rem">Request Co-Review</div>
          <select class="admin-filter-select" id="prm-coreview-select" style="width:100%;margin-bottom:.4rem">
            <option value="">Select a staff member…</option>
            ${Object.values(PSYCHE.users)
              .filter(su => PSYCHE_ROLES.can('post.review', su) && su.id !== u?.id)
              .map(su => `<option value="${su.id}">@${su.username} (${su.role})</option>`)
              .join('')}
          </select>
          <button class="admin-action-btn admin-action-btn--role" id="prm-request-review" style="width:100%">Request Review</button>

          <div class="prm-section-divider"></div>

          <!-- Actions -->
          <div class="prm-section-title">Decision</div>
          ${isAdm ? `
          <button class="prm-action-btn prm-action-btn--approve" id="prm-approve">✓ Approve & Publish</button>
          <button class="prm-action-btn prm-action-btn--review" id="prm-needs-review">⚠ Flag: Needs Review</button>
          <button class="prm-action-btn prm-action-btn--remove" id="prm-remove">⛔ Temporarily Remove</button>
          ` : `
          <button class="prm-action-btn prm-action-btn--review" id="prm-needs-review">⚠ Flag: Needs Review</button>
          `}
          ${isSA ? `<button class="prm-action-btn prm-action-btn--delete" id="prm-delete">🗑 Delete Permanently</button>` : ''}
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  overlay.querySelector('#prm-close').addEventListener('click', () => overlay.remove());

  // Add note
  overlay.querySelector('#prm-add-note').addEventListener('click', () => {
    const note = document.getElementById('prm-note-input').value.trim();
    if (!note) return;
    PSYCHE_DATA.addInternalComment(postId, note, u.id);
    PSYCHE_AUDIT.log?.('post.needs_review', { targetId: postId, detail: `Internal note added by @${u.username}` });
    overlay.remove(); openPostReviewPanel(postId);
    showToast('Internal note added.');
  });

  // Request co-review
  overlay.querySelector('#prm-request-review').addEventListener('click', () => {
    const targetId = document.getElementById('prm-coreview-select').value;
    if (!targetId) { showToast('Select a staff member first.'); return; }
    const target = PSYCHE.users[targetId];
    PSYCHE_NOTIFICATIONS.add({
      userId: targetId, type: 'post_review_request',
      title: `Review requested: "${p.title.slice(0,40)}"`,
      body: `@${u.username} is requesting your review on a pending post.`,
      link: 'post_review:' + postId,
    });
    showToast(`Review requested from @${target?.username}.`);
  });

  // Flag needs review
  overlay.querySelector('#prm-needs-review').addEventListener('click', () => {
    const reason = prompt('What needs to be fixed?');
    if (reason === null) return;
    PSYCHE_DATA.setNeedsReview(postId, reason, u.id);
    // Notify the author
    if (p.authorId) {
      PSYCHE_NOTIFICATIONS.add({
        userId: p.authorId, type: 'post_needs_review',
        title: 'Your post needs revision',
        body: `"${p.title.slice(0,40)}" — ${reason}`,
        link: 'post:' + postId,
      });
    }
    showToast('Post flagged for review. Author notified.'); overlay.remove(); renderAdminPage();
  });

  // Approve
  overlay.querySelector('#prm-approve')?.addEventListener('click', () => {
    PSYCHE_DATA.approvePost(postId, u.id);
    if (p.authorId) {
      PSYCHE_NOTIFICATIONS.add({ userId: p.authorId, type: 'post_approved', title: 'Your post has been published! 🎉', body: `"${p.title.slice(0,40)}" is now live.`, link: 'post:' + postId });
    }
    PSYCHE_AUDIT.log?.('post.approved', { targetId: postId, detail: `Approved by @${u.username}` });
    showToast('Post approved and published!'); overlay.remove(); renderAdminPage();
  });

  // Remove
  overlay.querySelector('#prm-remove')?.addEventListener('click', () => {
    const reason = prompt('Reason for temporary removal:');
    if (reason === null) return;
    PSYCHE_DATA.tempRemovePost(postId, reason, u.id);
    if (p.authorId) {
      PSYCHE_NOTIFICATIONS.add({ userId: p.authorId, type: 'post_removed', title: 'Your post has been removed', body: reason, link: 'post:' + postId });
    }
    showToast('Post removed. Author notified.'); overlay.remove(); renderAdminPage();
  });

  // Delete
  overlay.querySelector('#prm-delete')?.addEventListener('click', () => {
    if (!confirm('Permanently delete this post? It will be archived.')) return;
    PSYCHE_DATA.softDeletePost(postId, u.id);
    PSYCHE_AUDIT.log?.('post.deleted', { targetId: postId, detail: `Deleted by @${u.username}` });
    showToast('Post deleted.'); overlay.remove(); renderAdminPage();
  });
}

// ============================================================
// NOTIFICATION BELL PANEL
// ============================================================
function initNotificationBell() {
  // Bell is injected into nav by profile.js _updateNav, but we add it here too
  // We patch _updateNav to include the bell
  const origNav = PSYCHE._updateNav.bind(PSYCHE);
  PSYCHE._updateNav = function() {
    origNav();
    setTimeout(addNotifBellToNav, 50);
    PSYCHE_NOTIFICATIONS._updateBell();
  };
}

function addNotifBellToNav() {
  if (document.getElementById('notif-bell')) return;
  const navRight = document.querySelector('.nav-right');
  if (!navRight || !PSYCHE.currentUser) return;

  const bell = document.createElement('div');
  bell.className = 'notif-bell-wrap';
  bell.id = 'notif-bell';
  bell.innerHTML = `
    <button class="notif-bell-btn" id="notif-bell-btn" aria-label="Notifications">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
      <span class="notif-badge" id="notif-badge" style="display:none">0</span>
    </button>
  `;

  // Insert before theme toggle
  const themeToggle = navRight.querySelector('[data-theme-toggle]');
  if (themeToggle) navRight.insertBefore(bell, themeToggle);
  else navRight.insertBefore(bell, navRight.firstChild);

  bell.querySelector('#notif-bell-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    toggleNotifPanel();
  });

  PSYCHE_NOTIFICATIONS._updateBell();
}

function toggleNotifPanel() {
  const existing = document.getElementById('notif-panel');
  if (existing) { existing.remove(); return; }

  const u = PSYCHE.currentUser;
  if (!u) return;
  const notes = PSYCHE_NOTIFICATIONS.getForUser(u.id).slice(0, 30);

  const panel = document.createElement('div');
  panel.id = 'notif-panel';
  panel.className = 'notif-panel';

  panel.innerHTML = `
    <div class="notif-panel-header">
      <span class="notif-panel-title">Notifications</span>
      ${notes.some(n => !n.read) ? `<button class="notif-mark-all" id="notif-mark-all">Mark all read</button>` : ''}
    </div>
    <div class="notif-panel-body">
      ${notes.length === 0
        ? `<div class="notif-empty">No notifications yet.</div>`
        : notes.map(n => `
          <div class="notif-item ${n.read?'notif-item--read':''} notif-item--${n.type}" data-notif-id="${n.id}" data-link="${n.link||''}">
            <div class="notif-icon">${getNotifIcon(n.type)}</div>
            <div class="notif-content">
              <div class="notif-title">${escapeHtml(n.title)}</div>
              <div class="notif-body">${escapeHtml(n.body||'')}</div>
              <div class="notif-time">${timeAgo ? timeAgo(n.createdAt) : n.createdAt}</div>
            </div>
            ${!n.read ? '<div class="notif-dot"></div>' : ''}
          </div>`).join('')}
    </div>
  `;

  // Position below bell
  const bellBtn = document.getElementById('notif-bell-btn');
  const rect = bellBtn?.getBoundingClientRect();
  if (rect) {
    panel.style.position = 'fixed';
    panel.style.top = (rect.bottom + 8) + 'px';
    panel.style.right = (window.innerWidth - rect.right) + 'px';
  }

  document.body.appendChild(panel);

  // Click outside to close
  setTimeout(() => {
    document.addEventListener('click', function closeFn(e) {
      if (!panel.contains(e.target) && e.target.id !== 'notif-bell-btn') {
        panel.remove();
        document.removeEventListener('click', closeFn);
      }
    });
  }, 50);

  // Mark all read
  panel.querySelector('#notif-mark-all')?.addEventListener('click', () => {
    PSYCHE_NOTIFICATIONS.markAllRead(u.id);
    panel.remove(); toggleNotifPanel();
  });

  // Click notification
  panel.querySelectorAll('.notif-item').forEach(item => {
    item.addEventListener('click', () => {
      PSYCHE_NOTIFICATIONS.markRead(item.dataset.notifId);
      const link = item.dataset.link;
      panel.remove();
      handleNotifLink(link);
    });
  });
}

function getNotifIcon(type) {
  const icons = {
    ticket_new:       '🎫', ticket_claimed: '👤', ticket_reply: '💬',
    ticket_resolved:  '✅', ticket_escalated: '🔴', ticket_user_reply: '↩',
    post_approved:    '🎉', post_needs_review: '⚠', post_removed: '⛔',
    post_review_request: '📋', 'user.reported': '⚑',
  };
  return icons[type] || '🔔';
}

function handleNotifLink(link) {
  if (!link) return;
  if (link.startsWith('ticket:')) {
    const ticketId = link.replace('ticket:', '');
    const isStaff = PSYCHE.currentUser && PSYCHE_ROLES.can('support.view_tickets', PSYCHE.currentUser);
    if (isStaff) { navigateTo('page-admin'); setTimeout(() => openTicketThread(ticketId, true), 500); }
    else { navigateTo('page-tickets'); setTimeout(() => openTicketThread(ticketId, false), 500); }
  } else if (link.startsWith('post_review:')) {
    const postId = link.replace('post_review:', '');
    navigateTo('page-admin');
    setTimeout(() => openPostReviewPanel(postId), 500);
  } else if (link.startsWith('post:')) {
    const postId = link.replace('post:', '');
    PSYCHE_VIEW.currentPostId = postId;
    navigateTo('page-post');
  }
}

// ============================================================
// WIRE EVERYTHING
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  PSYCHE_HD.load();
  PSYCHE_NOTIFICATIONS.load();

  // Remove old help widget (replaced by footer helpdesk bar)
  document.getElementById('help-widget')?.remove();

  // Init notification bell
  initNotificationBell();

  // Handle ticket link navigation from notif
  document.addEventListener('click', e => {
    // Staff: view ticket from dashboard
    const viewBtn = e.target.closest('[data-view-ticket]');
    if (viewBtn) openTicketThread(viewBtn.dataset.viewTicket, true);

    // Staff: claim from dashboard
    const claimBtn = e.target.closest('[data-claim-ticket]');
    if (claimBtn) {
      const result = PSYCHE_HD.claim(claimBtn.dataset.claimTicket, PSYCHE.currentUser?.id);
      if (result.success) { showToast('Ticket claimed.'); renderAdminPage(); }
      else showToast(result.error);
    }

    // Post review
    const reviewBtn = e.target.closest('[data-review-post]');
    if (reviewBtn) openPostReviewPanel(reviewBtn.dataset.reviewPost);
  });
});
