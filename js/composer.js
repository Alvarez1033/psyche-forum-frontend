/* ============================================================
   PSYCHE — Blog Post Composer
   Rich structured post creation for contributor+ roles.
   Forum Discussion Composer for all registered users.
   ============================================================ */

// ---- OPEN CORRECT COMPOSER ----
function openComposer(kind = 'blog') {
  if (!PSYCHE.currentUser) { openAuthModal('signin'); return; }

  if (kind === 'blog') {
    if (!PSYCHE_ROLES.canPost()) {
      showToast('Contributor role or higher required to publish blog posts.');
      return;
    }
    openBlogComposer();
  } else {
    openForumComposer();
  }
}

// ============================================================
// BLOG POST COMPOSER
// ============================================================
function openBlogComposer(existingPost = null) {
  document.querySelector('.composer-overlay')?.remove();
  const overlay = document.createElement('div');
  overlay.className = 'composer-overlay';
  const isEdit = !!existingPost;
  const u = PSYCHE.currentUser;

  overlay.innerHTML = `
    <div class="composer-modal">
      <div class="composer-topbar">
        <div class="composer-topbar-left">
          <button class="composer-back-btn" id="composer-back">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
            Discard
          </button>
          <span class="composer-title">${isEdit ? 'Edit Post' : 'New Blog Post'}</span>
        </div>
        <div class="composer-topbar-right">
          <button class="composer-btn composer-btn--secondary" id="composer-preview-btn">Preview</button>
          <button class="composer-btn composer-btn--primary" id="composer-publish-btn">
            ${isEdit ? 'Save Changes' : (PSYCHE_ROLES.canAutoApprovePost() ? 'Publish' : 'Submit for Review')}
          </button>
        </div>
      </div>

      <div class="composer-body">
        <!-- Left: Editor -->
        <div class="composer-editor" id="composer-editor">

          <!-- Cover image -->
          <div class="composer-cover-wrap" id="cover-wrap">
            <div class="composer-cover-placeholder" id="cover-placeholder">
              <button class="composer-add-cover" id="add-cover-btn">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                Add cover image
              </button>
            </div>
            <input type="text" class="composer-cover-input" id="cover-url" placeholder="Paste image URL…" style="display:none">
          </div>

          <!-- Meta -->
          <div class="composer-meta-row">
            <select class="composer-select" id="comp-topic">
              <option value="">Select topic…</option>
              ${PSYCHE.topics.map(t => `<option value="${t}" ${existingPost?.topic===t?'selected':''}>${t}</option>`).join('')}
            </select>
            <select class="composer-select" id="comp-type">
              ${Object.entries(PSYCHE_DATA.postTypes)
                .filter(([k]) => ['article','resource'].includes(k) || PSYCHE_ROLES.isSuperAdmin())
                .map(([k,v]) => `<option value="${k}" ${existingPost?.type===k?'selected':''}>${v.icon} ${v.label}</option>`).join('')}
            </select>
          </div>

          <!-- Title -->
          <textarea class="composer-title-input" id="comp-title" placeholder="Post title…" rows="2" maxlength="150">${existingPost?.title||''}</textarea>
          <div class="composer-char-hint"><span id="title-chars">0</span>/150</div>

          <!-- Subtitle -->
          <input class="composer-subtitle-input" id="comp-subtitle" type="text" placeholder="Subtitle or summary (optional)" maxlength="200" value="${existingPost?.subtitle||''}">

          <!-- Toolbar -->
          <div class="composer-toolbar">
            <button class="ct-btn" data-action="bold" title="Bold"><strong>B</strong></button>
            <button class="ct-btn" data-action="italic" title="Italic"><em>I</em></button>
            <div class="ct-sep"></div>
            <button class="ct-btn" data-action="h2" title="Heading 2">H2</button>
            <button class="ct-btn" data-action="h3" title="Heading 3">H3</button>
            <div class="ct-sep"></div>
            <button class="ct-btn" data-action="bullet" title="Bullet list">• List</button>
            <button class="ct-btn" data-action="numbered" title="Numbered list">1. List</button>
            <div class="ct-sep"></div>
            <button class="ct-btn" data-action="quote" title="Blockquote">" Quote</button>
            <button class="ct-btn" data-action="divider" title="Section divider">— Divider</button>
            <div class="ct-sep"></div>
            <button class="ct-btn" data-action="image" title="Image">🖼 Image</button>
          </div>

          <!-- Body -->
          <textarea class="composer-body-input" id="comp-body" placeholder="Write your post…&#10;&#10;Use **bold**, *italic*, ## Heading, > blockquote, ---  for dividers&#10;For images: ![alt](url)">${existingPost?.body||''}</textarea>

          <!-- Tags / Keywords -->
          <div class="composer-tags-row">
            <input class="composer-tags-input" id="comp-tags" type="text" placeholder="Tags (comma separated, optional)" value="${(existingPost?.tags||[]).join(', ')}">
          </div>

          <!-- Error -->
          <div class="composer-error" id="comp-error" hidden></div>

          <!-- Approval notice -->
          ${!PSYCHE_ROLES.canAutoApprovePost() ? `
          <div class="composer-notice">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            Your post will be submitted for editorial review before publishing.
          </div>` : ''}
        </div>

        <!-- Right: Guidelines -->
        <aside class="composer-guide">
          <div class="composer-guide-title">Post Guidelines</div>
          <div class="composer-guide-section">
            <div class="composer-guide-label">Format</div>
            <ul class="composer-guide-list">
              <li>Start with a clear, specific title</li>
              <li>Add a subtitle summarising your key point</li>
              <li>Use <code>## Heading</code> to break sections</li>
              <li>Keep paragraphs to 3–5 sentences</li>
              <li>End with a conclusion or call to action</li>
            </ul>
          </div>
          <div class="composer-guide-section">
            <div class="composer-guide-label">Markdown quick ref</div>
            <div class="composer-guide-code">**bold text**</div>
            <div class="composer-guide-code">*italic text*</div>
            <div class="composer-guide-code">## Section Heading</div>
            <div class="composer-guide-code">### Sub-Heading</div>
            <div class="composer-guide-code">> Blockquote</div>
            <div class="composer-guide-code">- Bullet item</div>
            <div class="composer-guide-code">1. Numbered item</div>
            <div class="composer-guide-code">---  (section divider)</div>
            <div class="composer-guide-code">![alt](image-url)</div>
          </div>
          <div class="composer-guide-section">
            <div class="composer-guide-label">Content rules</div>
            <ul class="composer-guide-list">
              <li>Evidence-based claims only</li>
              <li>Cite sources where relevant</li>
              <li>Add [TW] for sensitive content</li>
              <li>No medical advice or diagnoses</li>
            </ul>
          </div>
        </aside>
      </div>

      <!-- Preview panel (hidden by default) -->
      <div class="composer-preview-panel" id="composer-preview-panel" style="display:none">
        <div class="preview-scroll">
          <div class="preview-inner" id="preview-content"></div>
        </div>
        <button class="composer-btn composer-btn--secondary" id="close-preview-btn" style="position:absolute;top:1rem;right:1rem">← Back to editing</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  // ---- Wire ----
  const titleInput = document.getElementById('comp-title');
  const bodyInput  = document.getElementById('comp-body');

  // Char count
  const updateChars = () => {
    document.getElementById('title-chars').textContent = titleInput.value.length;
  };
  titleInput.addEventListener('input', updateChars);
  updateChars();

  // Back / discard
  document.getElementById('composer-back').addEventListener('click', () => {
    if (bodyInput.value.length > 20) {
      if (!confirm('Discard this post?')) return;
    }
    overlay.remove();
  });

  // Cover image
  document.getElementById('add-cover-btn')?.addEventListener('click', () => {
    document.getElementById('cover-placeholder').style.display = 'none';
    const inp = document.getElementById('cover-url');
    inp.style.display = 'block';
    inp.focus();
    inp.addEventListener('blur', () => {
      if (inp.value.trim()) {
        document.getElementById('cover-wrap').style.backgroundImage = `url(${inp.value.trim()})`;
        document.getElementById('cover-wrap').classList.add('has-cover');
      }
    });
  });

  // Toolbar actions
  overlay.querySelectorAll('.ct-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const action = btn.dataset.action;
      const textarea = document.getElementById('comp-body');
      const start = textarea.selectionStart;
      const end   = textarea.selectionEnd;
      const sel   = textarea.value.slice(start, end);
      const before = textarea.value.slice(0, start);
      const after  = textarea.value.slice(end);

      const insertMap = {
        bold:     `**${sel||'bold text'}**`,
        italic:   `*${sel||'italic text'}*`,
        h2:       `\n## ${sel||'Heading'}`,
        h3:       `\n### ${sel||'Sub-heading'}`,
        bullet:   `\n- ${sel||'Item'}`,
        numbered: `\n1. ${sel||'Item'}`,
        quote:    `\n> ${sel||'Blockquote text'}`,
        divider:  '\n\n---\n\n',
        image:    `\n![Image description](paste-url-here)\n`,
      };

      if (insertMap[action]) {
        textarea.value = before + insertMap[action] + after;
        textarea.focus();
      }
    });
  });

  // Preview
  document.getElementById('composer-preview-btn')?.addEventListener('click', () => {
    const previewPanel = document.getElementById('composer-preview-panel');
    const editorPanel  = document.querySelector('.composer-body');
    previewPanel.style.display = 'block';
    editorPanel.style.display  = 'none';

    const title    = document.getElementById('comp-title').value || 'Untitled';
    const subtitle = document.getElementById('comp-subtitle').value;
    const body     = document.getElementById('comp-body').value;
    const topic    = document.getElementById('comp-topic').value;
    const coverUrl = document.getElementById('cover-url').value;

    document.getElementById('preview-content').innerHTML = `
      ${coverUrl ? `<div class="preview-cover" style="background-image:url(${escapeHtml(coverUrl)})"></div>` : ''}
      <div class="preview-meta">
        ${topic ? `<span class="preview-topic">${escapeHtml(topic)}</span>` : ''}
        <span class="preview-date">${new Date().toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'})}</span>
      </div>
      <h1 class="preview-title">${escapeHtml(title)}</h1>
      ${subtitle ? `<p class="preview-subtitle">${escapeHtml(subtitle)}</p>` : ''}
      <div class="preview-author">
        <div class="composer-avatar-sm" style="background:${u.avatarColor}">${initials(u.displayName)}</div>
        <span>${escapeHtml(u.displayName)}</span>
      </div>
      <div class="preview-body">${renderBlogMarkdown(body)}</div>
    `;
  });

  document.getElementById('close-preview-btn')?.addEventListener('click', () => {
    document.getElementById('composer-preview-panel').style.display = 'none';
    document.querySelector('.composer-body').style.display = 'grid';
  });

  // Publish
  document.getElementById('composer-publish-btn')?.addEventListener('click', () => {
    const errEl = document.getElementById('comp-error');
    const title   = document.getElementById('comp-title').value.trim();
    const body    = document.getElementById('comp-body').value.trim();
    const topic   = document.getElementById('comp-topic').value;
    const type    = document.getElementById('comp-type').value;
    const subtitle = document.getElementById('comp-subtitle').value.trim();
    const tags    = document.getElementById('comp-tags').value.split(',').map(t=>t.trim()).filter(Boolean);
    const coverUrl = document.getElementById('cover-url').value.trim();

    if (!title) { errEl.textContent = 'Please add a title.'; errEl.hidden = false; return; }
    if (title.length < 10) { errEl.textContent = 'Title must be at least 10 characters.'; errEl.hidden = false; return; }
    if (!body) { errEl.textContent = 'Post body cannot be empty.'; errEl.hidden = false; return; }
    if (body.length < 50) { errEl.textContent = 'Post body must be at least 50 characters.'; errEl.hidden = false; return; }
    if (!topic) { errEl.textContent = 'Please select a topic.'; errEl.hidden = false; return; }

    if (isEdit) {
      const result = PSYCHE_DATA.editPost(existingPost.id, { title, body, subtitle, tags, coverImage: coverUrl || null }, u.id);
      if (result.success) {
        overlay.remove();
        showToast('Post updated.');
        if (typeof renderPostDetailPage === 'function') renderPostDetailPage();
      } else { errEl.textContent = result.error; errEl.hidden = false; }
    } else {
      const result = PSYCHE_DATA.createPost({ title, body, topic, type, authorId: u.id, postKind: 'blog', subtitle, tags, coverImage: coverUrl || null });
      if (result.success) {
        overlay.remove();
        if (result.autoApproved) {
          showToast('Post published!');
        } else {
          showToast('Post submitted for review. You\'ll be notified when it\'s approved.');
        }
        PSYCHE_VIEW.currentPostId = result.post.id;
        navigateTo('page-post');
      } else { errEl.textContent = result.error; errEl.hidden = false; }
    }
  });
}

// ============================================================
// FORUM DISCUSSION COMPOSER
// ============================================================
function openForumComposer(prefillTopic = '') {
  if (!PSYCHE.currentUser) { openAuthModal('signin'); return; }

  document.querySelector('.forum-composer-overlay')?.remove();
  const overlay = document.createElement('div');
  overlay.className = 'forum-composer-overlay';
  const u = PSYCHE.currentUser;
  const mode = PSYCHE_ROLES.getForumPostApprovalMode(u);

  const modeNotice = {
    auto:     null,
    timer:    `<div class="composer-notice composer-notice--timer">⏱ Your post will go live after a short review period (10 minutes).</div>`,
    approval: `<div class="composer-notice composer-notice--approval">👋 As a new member, your first posts need staff approval before going live.</div>`,
  }[mode];

  overlay.innerHTML = `
    <div class="auth-modal" style="max-width:560px">
      <button class="auth-modal-close" id="forum-composer-close">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>

      <div class="auth-logo">
        <svg width="24" height="24" viewBox="0 0 32 32" fill="none"><circle cx="16" cy="16" r="14" stroke="var(--color-primary)" stroke-width="1.5"/><text x="16" y="21.5" text-anchor="middle" font-size="17" fill="var(--color-primary)" font-family="Georgia,serif" font-style="italic">ψ</text></svg>
        <span class="auth-logo-name">Start a Discussion</span>
      </div>

      <div class="auth-form active">
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Topic <span class="form-required">*</span></label>
            <select class="form-select" id="fc-topic">
              <option value="">Select topic…</option>
              ${PSYCHE.topics.map(t => `<option value="${t}" ${prefillTopic===t?'selected':''}>${t}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Type</label>
            <select class="form-select" id="fc-type">
              ${Object.entries(PSYCHE_DATA.postTypes).map(([k,v]) => `<option value="${k}">${v.icon} ${v.label}</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Title <span class="form-required">*</span></label>
          <input class="form-input" id="fc-title" type="text" placeholder="What's your question or topic?" maxlength="150">
        </div>
        <div class="form-group">
          <label class="form-label">Body <span class="form-required">*</span></label>
          <textarea class="form-textarea" id="fc-body" rows="6" placeholder="Share your thoughts, experiences, or questions…&#10;Supports **bold** and *italic*" style="min-height:120px"></textarea>
        </div>
        ${modeNotice || ''}
        <div class="form-error" id="fc-error" hidden></div>
        <div style="display:flex;gap:.5rem;justify-content:flex-end;margin-top:.25rem">
          <button class="compose-cancel-btn" id="fc-cancel">Cancel</button>
          <button class="form-submit" id="fc-submit" style="width:auto;padding:.6rem 1.5rem">Post Discussion</button>
        </div>
      </div>
    </div>
  `;

  // Wrap in overlay
  const wrap = document.createElement('div');
  wrap.className = 'auth-modal-overlay';
  wrap.style.cssText = 'opacity:1';
  wrap.appendChild(overlay.querySelector('.auth-modal'));
  overlay.appendChild(wrap);
  document.body.appendChild(overlay);

  overlay.querySelector('#forum-composer-close')?.addEventListener('click', () => overlay.remove());
  overlay.querySelector('#fc-cancel')?.addEventListener('click', () => overlay.remove());
  wrap.addEventListener('click', e => { if (e.target === wrap) overlay.remove(); });

  overlay.querySelector('#fc-submit')?.addEventListener('click', () => {
    const errEl = document.getElementById('fc-error');
    const title = document.getElementById('fc-title').value.trim();
    const body  = document.getElementById('fc-body').value.trim();
    const topic = document.getElementById('fc-topic').value;
    const type  = document.getElementById('fc-type').value;

    if (!title) { errEl.textContent = 'Please add a title.'; errEl.hidden = false; return; }
    if (!body)  { errEl.textContent = 'Please write something.'; errEl.hidden = false; return; }
    if (!topic) { errEl.textContent = 'Please select a topic.'; errEl.hidden = false; return; }

    const result = PSYCHE_DATA.createForumPost({ title, body, topic, type, authorId: u.id });
    if (result.success) {
      overlay.remove();
      const msgs = {
        auto:     'Discussion posted!',
        timer:    'Discussion submitted — it will go live in a few minutes.',
        approval: 'Discussion submitted for approval. You\'ll be notified when it goes live.',
      };
      showToast(msgs[result.approvalMode] || 'Posted!');
      PSYCHE_VIEW.forumTopic = topic;
      navigateTo('page-forum');
    } else { errEl.textContent = result.error; errEl.hidden = false; }
  });
}

// ============================================================
// BLOG MARKDOWN RENDERER (richer than basic)
// ============================================================
function renderBlogMarkdown(text) {
  if (!text) return '';
  let html = escapeHtml(text);

  // Images: ![alt](url)
  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g,
    '<figure class="post-figure"><img class="post-img" src="$2" alt="$1" loading="lazy"><figcaption>$1</figcaption></figure>');

  // Headings
  html = html.replace(/^## (.+)$/gm, '<h2 class="post-h2">$1</h2>');
  html = html.replace(/^### (.+)$/gm, '<h3 class="post-h3">$1</h3>');
  html = html.replace(/^#### (.+)$/gm, '<h4 class="post-h4">$1</h4>');

  // Blockquote
  html = html.replace(/^&gt; (.+)$/gm, '<blockquote class="post-blockquote">$1</blockquote>');

  // Horizontal rule / section divider
  html = html.replace(/^---+$/gm, '<hr class="post-divider">');

  // Numbered list
  html = html.replace(/((?:^\d+\. .+\n?)+)/gm, (match) => {
    const items = match.trim().split('\n').map(l => `<li>${l.replace(/^\d+\. /,'')}</li>`).join('');
    return `<ol class="post-ol">${items}</ol>`;
  });

  // Bullet list
  html = html.replace(/((?:^- .+\n?)+)/gm, (match) => {
    const items = match.trim().split('\n').map(l => `<li>${l.replace(/^- /,'')}</li>`).join('');
    return `<ul class="post-ul">${items}</ul>`;
  });

  // Inline: bold, italic, code
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
  html = html.replace(/`(.+?)`/g, '<code class="post-code">$1</code>');

  // Paragraphs
  html = html.split('\n\n').map(block => {
    if (block.match(/^<(h[2-4]|blockquote|hr|ul|ol|figure)/)) return block;
    const trimmed = block.trim();
    if (!trimmed) return '';
    return `<p>${trimmed.replace(/\n/g, '<br>')}</p>`;
  }).join('\n');

  return html;
}

// ============================================================
// WIRE — Update nav button + openComposeModal references
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  // Patch openComposeModal to route to correct composer
  window.openComposeModal = function(prefillTopic) {
    openComposer('blog');
  };

  // Re-wire the Post button in header
  const postBtn = document.querySelector('.btn-post');
  if (postBtn) {
    // Remove old handlers by cloning
    const newBtn = postBtn.cloneNode(true);
    postBtn.parentNode.replaceChild(newBtn, postBtn);
    newBtn.addEventListener('click', () => {
      if (!PSYCHE.currentUser) { openAuthModal('signin'); return; }
      if (PSYCHE_ROLES.canPost()) {
        openBlogComposer();
      } else {
        openForumComposer();
      }
    });
    // Update label based on role
    const updateBtnLabel = () => {
      newBtn.textContent = PSYCHE.currentUser && PSYCHE_ROLES.canPost() ? '+ Post' : '+ Discuss';
    };
    updateBtnLabel();
    // Re-update on login/logout
    const origUpdateNav = PSYCHE._updateNav.bind(PSYCHE);
    PSYCHE._updateNav = function() { origUpdateNav(); updateBtnLabel(); };
  }
});
