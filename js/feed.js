/* ============================================================
   PSYCHE — Dynamic Feed, Post Detail, Compose
   Renders all pages dynamically from PSYCHE_DATA
   ============================================================ */

// ---- CURRENT VIEW STATE ----
const PSYCHE_VIEW = {
  currentPostId: null,
  homeSortBy:    'hot',
  forumSortBy:   'new',
  forumTopic:    '',
  forumType:     '',
  searchQuery:   '',
};

// ============================================================
// HOME PAGE
// ============================================================
function renderHomePage() {
  const page = document.getElementById('page-home');
  if (!page) return;

  const posts    = PSYCHE_DATA.getPosts({ sort: PSYCHE_VIEW.homeSortBy, limit: 8 });
  const featured = posts.find(p => p.pinned) || posts[0];
  const rest     = posts.filter(p => p !== featured).slice(0, 6);
  const u        = PSYCHE.currentUser;

  page.innerHTML = `
    <!-- Hero -->
    <section class="hero">
      <div class="hero-inner">
        <div class="hero-content fade-in">
          <div class="hero-eyebrow">Where minds meet</div>
          <h1 class="hero-title">Understand your<br>mind. Together.</h1>
          <p class="hero-subtitle">Evidence-based discussions, personal stories, and professional insights — all in one place.</p>
          <form class="hero-search" id="hero-search-form">
            <input type="search" placeholder="Search discussions, topics, research…" class="hero-search-input" id="hero-search-input" value="${escapeHtml(PSYCHE_VIEW.searchQuery)}">
            <button type="submit" class="hero-search-btn">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
            </button>
          </form>
          <div class="hero-topics">
            ${PSYCHE.topics.slice(0,6).map(t => `<button class="hero-topic-pill" data-topic="${t}">${t}</button>`).join('')}
          </div>
        </div>
        <div class="hero-visual fade-in" style="transition-delay:.1s">
          <div class="hero-stats-card">
            <div class="hero-stat"><span class="hero-stat-num">${Object.keys(PSYCHE.users).length}</span><span class="hero-stat-label">Members</span></div>
            <div class="hero-stat"><span class="hero-stat-num">${Object.keys(PSYCHE_DATA.posts).length}</span><span class="hero-stat-label">Posts</span></div>
            <div class="hero-stat"><span class="hero-stat-num">${Object.keys(PSYCHE_DATA.comments).length}</span><span class="hero-stat-label">Comments</span></div>
          </div>
          <div class="hero-wave"></div>
        </div>
      </div>
    </section>

    <!-- Sort bar -->
    <div class="dyn-feed-sortbar">
      <div class="dyn-feed-sortbar-inner">
        <div class="dyn-sort-pills">
          <button class="dyn-sort-pill ${PSYCHE_VIEW.homeSortBy==='hot'?'active':''}" data-sort="hot">🔥 Hot</button>
          <button class="dyn-sort-pill ${PSYCHE_VIEW.homeSortBy==='new'?'active':''}" data-sort="new">✨ New</button>
          <button class="dyn-sort-pill ${PSYCHE_VIEW.homeSortBy==='top'?'active':''}" data-sort="top">⬆ Top</button>
        </div>
        ${u ? `<button class="btn-compose-inline" id="home-compose-btn">+ New Post</button>` : ''}
      </div>
    </div>

    <!-- Main content -->
    <div class="dyn-feed-layout">
      <div class="dyn-feed-main">
        ${featured ? renderPostCard(featured, true) : ''}
        <div class="dyn-post-list" id="home-post-list">
          ${rest.map(p => renderPostCard(p)).join('')}
        </div>
        ${posts.length === 0 ? `<div class="dyn-feed-empty">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" opacity=".3"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
          <p>No posts yet. Be the first to share something.</p>
          ${u ? `<button class="btn-compose-inline" id="empty-compose-btn">Write a post</button>` : `<button class="btn-signin-inline" onclick="openAuthModal('signup')">Join to post</button>`}
        </div>` : ''}
      </div>
      <aside class="dyn-feed-sidebar">
        ${renderSidebar()}
      </aside>
    </div>
  `;

  // Wire home interactions
  page.querySelectorAll('.dyn-sort-pill').forEach(btn => {
    btn.addEventListener('click', () => {
      PSYCHE_VIEW.homeSortBy = btn.dataset.sort;
      renderHomePage();
    });
  });
  page.querySelector('#home-compose-btn')?.addEventListener('click', openComposeModal);
  page.querySelector('#empty-compose-btn')?.addEventListener('click', openComposeModal);
  page.querySelectorAll('[data-post-id]').forEach(wirePostCard);
  page.querySelectorAll('.hero-topic-pill').forEach(btn => {
    btn.addEventListener('click', () => {
      PSYCHE_VIEW.forumTopic = btn.dataset.topic;
      navigateTo('page-forum');
    });
  });
  document.getElementById('hero-search-form')?.addEventListener('submit', e => {
    e.preventDefault();
    const q = document.getElementById('hero-search-input').value.trim();
    if (q) { PSYCHE_VIEW.searchQuery = q; renderSearchResults(q); }
  });
  setTimeout(initScrollAnimations, 50);
}

// ============================================================
// FORUM / DISCUSS PAGE
// ============================================================
function renderForumPage() {
  const page = document.getElementById('page-forum');
  if (!page) return;

  const posts = PSYCHE_DATA.getPosts({
    sort:  PSYCHE_VIEW.forumSortBy,
    topic: PSYCHE_VIEW.forumTopic || undefined,
    type:  PSYCHE_VIEW.forumType  || undefined,
    limit: 30,
    postKind: 'forum',
  });
  const u = PSYCHE.currentUser;

  page.innerHTML = `
    <div class="forum-layout">
      <div class="forum-main">
        <!-- Forum header -->
        <div class="forum-header">
          <h1 class="forum-title">${PSYCHE_VIEW.forumTopic ? escapeHtml(PSYCHE_VIEW.forumTopic) : 'All Discussions'}</h1>
          ${PSYCHE_VIEW.forumTopic ? `<button class="forum-clear-topic" id="clear-topic">← All topics</button>` : ''}
        </div>

        <!-- Toolbar -->
        <div class="forum-toolbar">
          <div class="dyn-sort-pills">
            <button class="dyn-sort-pill ${PSYCHE_VIEW.forumSortBy==='new'?'active':''}" data-sort="new">New</button>
            <button class="dyn-sort-pill ${PSYCHE_VIEW.forumSortBy==='hot'?'active':''}" data-sort="hot">Hot</button>
            <button class="dyn-sort-pill ${PSYCHE_VIEW.forumSortBy==='top'?'active':''}" data-sort="top">Top</button>
          </div>
          <div class="forum-toolbar-right">
            <select class="forum-type-select" id="forum-type-filter">
              <option value="">All Types</option>
              ${Object.entries(PSYCHE_DATA.postTypes).map(([k,v]) => `<option value="${k}" ${PSYCHE_VIEW.forumType===k?'selected':''}>${v.icon} ${v.label}</option>`).join('')}
            </select>
            ${!u
              ? `<button class="btn-primary" onclick="openAuthModal('signin')">Sign in to post</button>`
              : PSYCHE.canPost()
                ? `<button class="btn-primary" id="forum-compose-btn">+ New Discussion</button>`
                : `<span class="forum-role-hint">Contributor+ can post</span>`}
          </div>
        </div>

        <!-- Post list -->
        <div class="dyn-post-list" id="forum-post-list">
          ${posts.length > 0
            ? posts.map(p => renderPostCard(p)).join('')
            : `<div class="dyn-feed-empty">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" opacity=".3"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                <p>No posts in ${PSYCHE_VIEW.forumTopic || 'this category'} yet.</p>
                ${u ? `<button class="btn-compose-inline" id="empty-forum-btn">Be the first to post</button>` : ''}
              </div>`}
        </div>
      </div>

      <aside class="dyn-feed-sidebar">
        <!-- Topic filter -->
        <div class="dyn-sidebar-card">
          <div class="dyn-sidebar-card-title">Topics</div>
          <div class="dyn-sidebar-topics">
            <button class="dyn-sidebar-topic-btn ${!PSYCHE_VIEW.forumTopic?'active':''}" data-topic="">All</button>
            ${PSYCHE.topics.map(t => `<button class="dyn-sidebar-topic-btn ${PSYCHE_VIEW.forumTopic===t?'active':''}" data-topic="${t}">${t}</button>`).join('')}
          </div>
        </div>
        ${renderSidebar(false)}
      </aside>
    </div>
  `;

  // Wire
  page.querySelectorAll('.dyn-sort-pill').forEach(btn => {
    btn.addEventListener('click', () => { PSYCHE_VIEW.forumSortBy = btn.dataset.sort; renderForumPage(); });
  });
  page.querySelector('#forum-type-filter')?.addEventListener('change', e => {
    PSYCHE_VIEW.forumType = e.target.value; renderForumPage();
  });
  page.querySelector('#forum-compose-btn')?.addEventListener('click', () => typeof openForumComposer === 'function' ? openForumComposer(PSYCHE_VIEW.forumTopic||'') : openComposeModal());
  page.querySelector('#empty-forum-btn')?.addEventListener('click', () => typeof openForumComposer === 'function' ? openForumComposer() : openComposeModal());
  page.querySelector('#clear-topic')?.addEventListener('click', () => { PSYCHE_VIEW.forumTopic = ''; renderForumPage(); });
  page.querySelectorAll('.dyn-sidebar-topic-btn').forEach(btn => {
    btn.addEventListener('click', () => { PSYCHE_VIEW.forumTopic = btn.dataset.topic; renderForumPage(); });
  });
  page.querySelectorAll('[data-post-id]').forEach(wirePostCard);
  setTimeout(initScrollAnimations, 50);
}

// ============================================================
// TOPICS PAGE
// ============================================================
function renderTopicsPage() {
  const page = document.getElementById('page-topics');
  if (!page) return;

  const postsByTopic = {};
  PSYCHE.topics.forEach(t => {
    postsByTopic[t] = PSYCHE_DATA.getPosts({ topic: t, sort: 'hot', limit: 3 });
  });

  page.innerHTML = `
    <div class="topics-page">
      <div class="topics-header fade-in">
        <h1 class="topics-title">Explore Topics</h1>
        <p class="topics-subtitle">Find conversations about what matters to you.</p>
      </div>
      <div class="topics-grid">
        ${PSYCHE.topics.map(t => {
          const tPosts = postsByTopic[t];
          const count  = PSYCHE_DATA.getPosts({ topic: t, limit: 999 }).length;
          return `
            <div class="topic-card fade-in" data-topic="${t}">
              <div class="topic-card-header">
                <div class="topic-card-name">${t}</div>
                <div class="topic-card-count">${count} post${count !== 1 ? 's' : ''}</div>
              </div>
              ${tPosts.length > 0 ? `
                <div class="topic-card-previews">
                  ${tPosts.slice(0,2).map(p => `
                    <div class="topic-preview-item" data-post-id="${p.id}">
                      <span class="topic-preview-votes">↑${p.upvotes}</span>
                      <span class="topic-preview-title">${escapeHtml(p.title)}</span>
                    </div>`).join('')}
                </div>
              ` : `<div class="topic-card-empty">No posts yet — be the first!</div>`}
              <button class="topic-card-btn" data-topic="${t}">Browse ${t} →</button>
            </div>`;
        }).join('')}
      </div>
    </div>
  `;

  page.querySelectorAll('.topic-card-btn, .topic-card').forEach(el => {
    el.addEventListener('click', (e) => {
      if (e.target.closest('.topic-preview-item')) return;
      PSYCHE_VIEW.forumTopic = el.dataset.topic;
      navigateTo('page-forum');
    });
  });
  page.querySelectorAll('.topic-preview-item').forEach(el => {
    el.addEventListener('click', () => openPostDetail(el.dataset.postId));
  });
  setTimeout(initScrollAnimations, 50);
}

// ============================================================
// POST DETAIL PAGE
// ============================================================
function openPostDetail(postId) {
  const post = PSYCHE_DATA.getPost(postId);
  if (!post) return;
  PSYCHE_VIEW.currentPostId = postId;
  navigateTo('page-post');
}

function renderPostDetailPage() {
  const page = document.getElementById('page-post');
  if (!page) return;

  const postId = PSYCHE_VIEW.currentPostId;
  if (!postId) { navigateTo('page-forum'); return; }

  const post    = PSYCHE_DATA.getPost(postId);
  if (!post || post.removed) { navigateTo('page-forum'); return; }

  const author  = PSYCHE.users[post.authorId];
  const u       = PSYCHE.currentUser;
  const role    = PSYCHE.roles[author?.role] || PSYCHE.roles.member;
  const myVote  = u ? (post.voters[u.id] || null) : null;
  const netVotes = (post.upvotes || 0) - (post.downvotes || 0);
  const isOwn   = u?.id === post.authorId;
  const isMod   = PSYCHE.isMod();
  const comments = PSYCHE_DATA.getComments(postId, 'top');
  const typeInfo = PSYCHE_DATA.postTypes[post.type] || PSYCHE_DATA.postTypes.discussion;

  page.innerHTML = `
    <div class="dyn-post-detail-layout">
      <div class="dyn-post-detail-main">

        <!-- Back -->
        <button class="post-back-btn" id="post-back-btn">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
          Back to discussions
        </button>

        <!-- Post -->
        <article class="post-detail">
          <!-- Vote column -->
          <div class="post-vote-col">
            <button class="vote-btn vote-btn--up ${myVote==='up'?'active':''}" data-vote="up" data-post-id="${postId}" title="Upvote">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 19V5M5 12l7-7 7 7"/></svg>
            </button>
            <span class="vote-count ${netVotes>0?'vote-count--pos':netVotes<0?'vote-count--neg':''}" id="post-vote-count">${netVotes}</span>
            <button class="vote-btn vote-btn--down ${myVote==='down'?'active':''}" data-vote="down" data-post-id="${postId}" title="Downvote">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 5v14M5 12l7 7 7-7"/></svg>
            </button>
          </div>

          <!-- Content -->
          <div class="post-detail-content">
            <div class="post-detail-meta">
              <span class="post-type-badge" style="background:${typeInfo.color||'var(--color-primary-highlight)'};color:${typeInfo.textColor||'var(--color-primary)'}">${typeInfo.icon} ${typeInfo.label}</span>
              <button class="post-topic-link" data-topic="${post.topic}">${escapeHtml(post.topic)}</button>
              ${post.pinned ? `<span class="post-pinned-badge">📌 Pinned</span>` : ''}
            </div>

            <h1 class="post-detail-title">${escapeHtml(post.title)}</h1>

            <div class="post-detail-author-row">
              <div class="post-author-avatar" style="background:${author?.avatarColor||'#4f5d6e'}">${initials(author?.displayName||'?')}</div>
              <div>
                <span class="post-author-name">${escapeHtml(author?.displayName||'[deleted]')}</span>
                ${author ? `<span class="post-author-role" style="background:${role.bg};color:${role.color}">${role.label}</span>` : ''}
                <span class="post-author-sep">·</span>
                <span class="post-time">${timeAgo(post.createdAt)}</span>
                ${post.editedAt ? `<span class="post-edited">(edited)</span>` : ''}
              </div>
            </div>

            <div class="post-detail-body">${renderMarkdown(post.body)}</div>

            <div class="post-detail-actions">
              <button class="post-action-sm" id="share-btn">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
                Share
              </button>
              ${!isOwn && u ? `
              <button class="post-action-sm post-action-sm--flag" data-post-id="${postId}" id="flag-btn">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>
                Flag
              </button>` : ''}
              ${isOwn ? `
              <button class="post-action-sm post-action-sm--edit" id="edit-post-btn">Edit</button>
              <button class="post-action-sm post-action-sm--delete" id="delete-post-btn">Delete</button>
              ` : ''}
              ${isMod && !isOwn ? `
              <button class="post-action-sm post-action-sm--delete" id="mod-remove-btn">Remove</button>
              <button class="post-action-sm" id="mod-pin-btn">${post.pinned ? 'Unpin' : 'Pin'}</button>
              ` : ''}
            </div>
          </div>
        </article>

        <!-- Comment compose -->
        <div class="comment-compose-section">
          <h3 class="comments-heading">${post.commentCount} Comment${post.commentCount !== 1 ? 's' : ''}</h3>
          ${u ? `
          <div class="comment-compose">
            <div class="compose-avatar" style="background:${u.avatarColor}">${initials(u.displayName)}</div>
            <div class="compose-input-area">
              <textarea class="compose-input" id="comment-input" placeholder="Share your thoughts…" rows="3"></textarea>
              <div class="compose-footer">
                <span class="compose-hint">Be respectful and constructive.</span>
                <button class="compose-submit" id="submit-comment">Comment</button>
              </div>
            </div>
          </div>` : `
          <div class="comment-signin-prompt">
            <button class="btn-primary" onclick="openAuthModal('signin')">Sign in to comment</button>
          </div>`}
        </div>

        <!-- Comments -->
        <div class="comment-thread" id="comment-thread">
          ${comments.length > 0
            ? comments.map(c => renderComment(c)).join('')
            : `<div class="comments-empty">No comments yet. Start the conversation.</div>`}
        </div>

      </div>

      <!-- Sidebar -->
      <aside class="dyn-feed-sidebar dyn-post-detail-sidebar">
        <div class="dyn-sidebar-card">
          <div class="dyn-sidebar-card-title">About this post</div>
          <div class="dyn-sidebar-meta-list">
            <div class="dyn-sidebar-meta-item"><span>Topic</span><button class="dyn-sidebar-topic-link" data-topic="${post.topic}">${escapeHtml(post.topic)}</button></div>
            <div class="dyn-sidebar-meta-item"><span>Type</span><span>${typeInfo.icon} ${typeInfo.label}</span></div>
            <div class="dyn-sidebar-meta-item"><span>Posted</span><span>${new Date(post.createdAt).toLocaleDateString()}</span></div>
            <div class="dyn-sidebar-meta-item"><span>Votes</span><span>${netVotes >= 0 ? '+' : ''}${netVotes}</span></div>
            <div class="dyn-sidebar-meta-item"><span>Comments</span><span>${post.commentCount}</span></div>
          </div>
        </div>
        ${author ? `
        <div class="dyn-sidebar-card">
          <div class="dyn-sidebar-card-title">Author</div>
          <div class="dyn-sidebar-author">
            <div class="dyn-sidebar-author-avatar" style="background:${author.avatarColor}">${initials(author.displayName)}</div>
            <div>
              <div class="dyn-sidebar-author-name">${escapeHtml(author.displayName)}</div>
              <div class="dyn-sidebar-author-role" style="color:${role.color}">${role.label}</div>
              ${author.bio ? `<div class="dyn-sidebar-author-bio">${escapeHtml(author.bio.slice(0,100))}${author.bio.length>100?'…':''}</div>` : ''}
            </div>
          </div>
        </div>` : ''}
        ${renderSidebar(false)}
      </aside>
    </div>
  `;

  // Wire post detail interactions
  page.querySelector('#post-back-btn')?.addEventListener('click', () => history.back ? navigateTo('page-forum') : navigateTo('page-forum'));

  // Voting
  page.querySelectorAll('.vote-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (!PSYCHE.currentUser) { openAuthModal('signin'); return; }
      const dir = btn.dataset.vote;
      const updated = PSYCHE_DATA.votePost(postId, PSYCHE.currentUser.id, dir);
      if (updated) {
        const net = (updated.upvotes||0) - (updated.downvotes||0);
        document.getElementById('post-vote-count').textContent = net;
        page.querySelectorAll('.vote-btn').forEach(b => b.classList.remove('active'));
        if (updated.voters[PSYCHE.currentUser.id]) {
          page.querySelector(`.vote-btn[data-vote="${updated.voters[PSYCHE.currentUser.id]}"]`)?.classList.add('active');
        }
      }
    });
  });

  // Topic link
  page.querySelectorAll('[data-topic]').forEach(el => {
    el.addEventListener('click', () => { PSYCHE_VIEW.forumTopic = el.dataset.topic; navigateTo('page-forum'); });
  });

  // Comment submit
  page.querySelector('#submit-comment')?.addEventListener('click', () => {
    const body = document.getElementById('comment-input').value;
    const result = PSYCHE_DATA.createComment({ postId, body, authorId: PSYCHE.currentUser?.id });
    if (result.success) {
      document.getElementById('comment-input').value = '';
      const thread = document.getElementById('comment-thread');
      const el = document.createElement('div');
      el.innerHTML = renderComment(result.comment);
      thread.insertBefore(el.firstElementChild, thread.firstChild);
      document.querySelector('.comments-heading').textContent = `${PSYCHE_DATA.getPost(postId)?.commentCount} Comments`;
      showToast('Comment posted!');
      wireCommentActions(thread);
    } else { showToast(result.error); }
  });

  // Reply buttons
  wireCommentActions(page.querySelector('#comment-thread'));

  // Share
  page.querySelector('#share-btn')?.addEventListener('click', () => {
    navigator.clipboard?.writeText(window.location.href).then(() => showToast('Link copied!')).catch(() => showToast('Share link copied!'));
    showToast('Link copied!');
  });

  // Report/Flag — use ops.js report modal if available, fallback to flag modal
  page.querySelector('#flag-btn')?.addEventListener('click', () => {
    const title = PSYCHE_DATA.getPost(postId)?.title || '';
    if (typeof openReportPostModal === 'function') openReportPostModal(postId, title);
    else openFlagModal(postId, 'post');
  });

  // Edit post
  page.querySelector('#edit-post-btn')?.addEventListener('click', () => openEditPostModal(post));

  // Delete post
  page.querySelector('#delete-post-btn')?.addEventListener('click', () => {
    if (!confirm('Delete this post? This cannot be undone.')) return;
    PSYCHE_DATA.deletePost(postId, PSYCHE.currentUser?.id);
    showToast('Post deleted.');
    navigateTo('page-forum');
  });

  // Mod: remove + pin
  page.querySelector('#mod-remove-btn')?.addEventListener('click', () => {
    if (!confirm('Remove this post?')) return;
    PSYCHE_DATA.deletePost(postId, PSYCHE.currentUser?.id);
    showToast('Post removed.');
    navigateTo('page-forum');
  });
  page.querySelector('#mod-pin-btn')?.addEventListener('click', () => {
    PSYCHE_DATA.pinPost(postId, !post.pinned);
    showToast(post.pinned ? 'Post unpinned.' : 'Post pinned to top.');
    renderPostDetailPage();
  });
}

// ============================================================
// SEARCH RESULTS
// ============================================================
function renderSearchResults(query) {
  PSYCHE_VIEW.searchQuery = query;
  const page = document.getElementById('page-forum');
  if (!page) return;
  navigateTo('page-forum');

  const results = PSYCHE_DATA.search(query);
  const forumToolbar = page.querySelector('.forum-toolbar');

  // Insert search results at top
  const searchBanner = document.createElement('div');
  searchBanner.className = 'search-results-header';
  searchBanner.innerHTML = `
    <div class="search-results-meta">
      <span>Search results for <strong>"${escapeHtml(query)}"</strong> — ${results.length} post${results.length!==1?'s':''}</span>
      <button class="search-clear-btn" id="search-clear">Clear search</button>
    </div>
  `;
  const postList = page.querySelector('#forum-post-list');
  if (postList) {
    postList.innerHTML = results.length > 0
      ? results.map(p => renderPostCard(p)).join('')
      : `<div class="dyn-feed-empty"><p>No results for "${escapeHtml(query)}"</p></div>`;
    page.querySelectorAll('[data-post-id]').forEach(wirePostCard);
  }
  page.querySelector('.forum-header')?.after(searchBanner);
  page.querySelector('#search-clear')?.addEventListener('click', () => {
    PSYCHE_VIEW.searchQuery = '';
    renderForumPage();
  });
}

// ============================================================
// HELPERS — POST CARD
// ============================================================
function renderPostCard(post, featured = false) {
  if (!post) return '';
  const author  = PSYCHE.users[post.authorId];
  const role    = PSYCHE.roles[author?.role] || PSYCHE.roles.member;
  const netVotes = (post.upvotes||0) - (post.downvotes||0);
  const typeInfo = PSYCHE_DATA.postTypes[post.type] || PSYCHE_DATA.postTypes.discussion;
  const preview  = post.body.replace(/#{1,6}\s/g,'').replace(/\*\*/g,'').replace(/\n/g,' ').slice(0, 140) + (post.body.length > 140 ? '…' : '');

  return `
    <article class="dyn-post-card ${featured?'post-card--featured':''} fade-in" data-post-id="${post.id}">
      <div class="dyn-post-card-vote">
        <button class="dyn-vote-btn-sm vote-btn-sm--up" data-vote="up" data-post-id="${post.id}">↑</button>
        <span class="dyn-vote-sm-count">${netVotes}</span>
        <button class="dyn-vote-btn-sm vote-btn-sm--down" data-vote="down" data-post-id="${post.id}">↓</button>
      </div>
      <div class="dyn-post-card-body">
        <div class="dyn-post-card-top">
          <div class="dyn-post-card-meta">
            <span class="post-type-pill">${typeInfo.icon} ${typeInfo.label}</span>
            <button class="post-topic-pill active" data-topic="${post.topic}">${escapeHtml(post.topic)}</button>
            ${post.pinned ? `<span class="post-pinned-sm">📌</span>` : ''}
          </div>
        </div>
        <h2 class="dyn-post-card-title">${escapeHtml(post.title)}</h2>
        <p class="dyn-post-card-preview">${escapeHtml(preview)}</p>
        <div class="dyn-post-card-footer">
          <div class="dyn-post-card-author">
            <div class="dyn-post-mini-avatar" style="background:${author?.avatarColor||'#4f5d6e'}">${initials(author?.displayName||'?')}</div>
            <span class="dyn-post-author-display">${escapeHtml(author?.displayName||'[deleted]')}</span>
            ${author?.role && author.role !== 'member' ? `<span class="dyn-post-author-role-badge" style="background:${role.bg};color:${role.color}">${role.label}</span>` : ''}
            <span class="dyn-post-time-sm">${timeAgo(post.createdAt)}</span>
          </div>
          <div class="dyn-post-card-stats">
            <span class="dyn-post-stat">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
              ${post.commentCount||0}
            </span>
          </div>
        </div>
      </div>
    </article>
  `;
}

function wirePostCard(el) {
  const postId = el.dataset.postId;
  // Click card → open post detail
  el.addEventListener('click', (e) => {
    if (e.target.closest('.dyn-vote-btn-sm') || e.target.closest('.post-topic-pill')) return;
    openPostDetail(postId);
  });
  // Topic pill
  el.querySelectorAll('.post-topic-pill').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      PSYCHE_VIEW.forumTopic = btn.dataset.topic;
      navigateTo('page-forum');
    });
  });
  // Inline votes
  el.querySelectorAll('.dyn-vote-btn-sm').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (!PSYCHE.currentUser) { openAuthModal('signin'); return; }
      const dir = btn.dataset.vote;
      const updated = PSYCHE_DATA.votePost(postId, PSYCHE.currentUser.id, dir);
      if (updated) {
        const net = (updated.upvotes||0)-(updated.downvotes||0);
        el.querySelector('.dyn-vote-sm-count').textContent = net;
      }
    });
  });
}

// ============================================================
// HELPERS — COMMENT
// ============================================================
function renderComment(comment, depth = 0) {
  const author = PSYCHE.users[comment.authorId];
  const role   = PSYCHE.roles[author?.role] || PSYCHE.roles.member;
  const u      = PSYCHE.currentUser;
  const isOwn  = u?.id === comment.authorId;

  return `
    <div class="comment ${depth>0?'comment--reply':''}" data-comment-id="${comment.id}">
      <div class="comment-avatar" style="background:${author?.avatarColor||'#4f5d6e'}">${initials(author?.displayName||'?')}</div>
      <div class="comment-content">
        <div class="comment-header">
          <span class="comment-author">${escapeHtml(author?.displayName||'[deleted]')}</span>
          ${author?.role && author.role !== 'member' ? `<span class="comment-role" style="background:${role.bg};color:${role.color}">${role.label}</span>` : ''}
          <span class="comment-time">${timeAgo(comment.createdAt)}</span>
          ${comment.editedAt ? `<span class="comment-edited">(edited)</span>` : ''}
        </div>
        <div class="comment-body">${renderMarkdown(comment.body)}</div>
        <div class="comment-actions">
          ${u && u.id !== comment.authorId ? `<button class="comment-action comment-report-user-btn" data-author-id="${comment.authorId}" data-author-name="${escapeHtml(author?.username||'user')}" title="Report user">⚑ Report</button>` : ''}
          <button class="comment-action comment-vote-btn" data-comment-id="${comment.id}">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 19V5M5 12l7-7 7 7"/></svg>
            <span class="comment-vote-count">${comment.upvotes||0}</span>
          </button>
          ${u ? `<button class="comment-action comment-reply-btn" data-comment-id="${comment.id}">Reply</button>` : ''}
          ${isOwn ? `<button class="comment-action comment-delete-btn" data-comment-id="${comment.id}">Delete</button>` : ''}
        </div>
        <!-- Reply box placeholder -->
        <div class="reply-box-wrap" id="reply-box-${comment.id}"></div>
        <!-- Nested replies -->
        ${comment.replies?.length > 0 ? `<div class="comment-replies">${comment.replies.map(r => renderComment(r, depth+1)).join('')}</div>` : ''}
      </div>
    </div>
  `;
}

function wireCommentActions(container) {
  if (!container) return;
  // Vote
  container.querySelectorAll('.comment-vote-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (!PSYCHE.currentUser) { openAuthModal('signin'); return; }
      const cid = btn.dataset.commentId;
      const updated = PSYCHE_DATA.voteComment(cid, PSYCHE.currentUser.id);
      if (updated) btn.querySelector('.comment-vote-count').textContent = updated.upvotes||0;
    });
  });
  // Reply
  container.querySelectorAll('.comment-reply-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const cid = btn.dataset.commentId;
      const wrap = document.getElementById(`reply-box-${cid}`);
      if (!wrap || wrap.querySelector('.compose-input')) return;
      const u = PSYCHE.currentUser;
      wrap.innerHTML = `
        <div class="comment-compose comment-compose--reply">
          <div class="compose-avatar compose-avatar--sm" style="background:${u.avatarColor}">${initials(u.displayName)}</div>
          <div class="compose-input-area">
            <textarea class="compose-input" placeholder="Write a reply…" rows="2"></textarea>
            <div class="compose-footer">
              <button class="compose-cancel">Cancel</button>
              <button class="compose-submit compose-submit--reply" data-parent="${cid}">Reply</button>
            </div>
          </div>
        </div>`;
      wrap.querySelector('.compose-cancel').addEventListener('click', () => wrap.innerHTML = '');
      wrap.querySelector('.compose-submit--reply').addEventListener('click', () => {
        const body = wrap.querySelector('.compose-input').value;
        const result = PSYCHE_DATA.createComment({
          postId: PSYCHE_VIEW.currentPostId,
          body, authorId: u.id, parentId: cid
        });
        if (result.success) {
          wrap.innerHTML = '';
          const repliesEl = wrap.closest('.comment-content')?.querySelector('.comment-replies');
          if (repliesEl) {
            repliesEl.insertAdjacentHTML('beforeend', renderComment(result.comment, 1));
          } else {
            const newReplies = document.createElement('div');
            newReplies.className = 'comment-replies';
            newReplies.innerHTML = renderComment(result.comment, 1);
            wrap.after(newReplies);
          }
          wireCommentActions(container);
          showToast('Reply posted!');
        } else { showToast(result.error); }
      });
    });
  });
  // Report user from comment
  container.querySelectorAll('.comment-report-user-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (typeof openReportUserModal === 'function') openReportUserModal(btn.dataset.authorId, btn.dataset.authorName);
      else showToast('Report submitted.');
    });
  });
  // Delete comment
  container.querySelectorAll('.comment-delete-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (!confirm('Delete this comment?')) return;
      const result = PSYCHE_DATA.deleteComment(btn.dataset.commentId, PSYCHE.currentUser?.id);
      if (result.success) {
        btn.closest('.comment')?.remove();
        showToast('Comment deleted.');
      }
    });
  });
}

// ============================================================
// COMPOSE MODAL
// ============================================================
function openComposeModal(prefillTopic) {
  if (!PSYCHE.currentUser) { openAuthModal('signin'); return; }

  document.querySelector('.compose-modal-overlay')?.remove();
  const overlay = document.createElement('div');
  overlay.className = 'compose-modal-overlay';
  const topic = typeof prefillTopic === 'string' ? prefillTopic : (PSYCHE_VIEW.forumTopic || '');

  overlay.innerHTML = `
    <div class="compose-modal">
      <div class="compose-modal-header">
        <h2 class="compose-modal-title">Create Post</h2>
        <button class="compose-modal-close" aria-label="Close">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>

      <div class="compose-modal-row">
        <div class="compose-field compose-field--half">
          <label class="compose-label">Topic <span class="form-required">*</span></label>
          <select class="compose-select" id="compose-topic">
            <option value="">Select a topic…</option>
            ${PSYCHE.topics.map(t => `<option value="${t}" ${topic===t?'selected':''}>${t}</option>`).join('')}
          </select>
        </div>
        <div class="compose-field compose-field--half">
          <label class="compose-label">Post Type</label>
          <select class="compose-select" id="compose-type">
            ${Object.entries(PSYCHE_DATA.postTypes)
              .filter(([k]) => PSYCHE.canPost() || k === 'discussion' || k === 'question' || k === 'support')
              .map(([k,v]) => `<option value="${k}">${v.icon} ${v.label}</option>`).join('')}
          </select>
        </div>
      </div>

      <div class="compose-field">
        <label class="compose-label">Title <span class="form-required">*</span></label>
        <input class="compose-input-field" id="compose-title" type="text" placeholder="What's on your mind?" maxlength="200">
        <span class="compose-char-count" id="title-count">0 / 200</span>
      </div>

      <div class="compose-field">
        <label class="compose-label">Body <span class="form-required">*</span></label>
        <textarea class="compose-textarea" id="compose-body" placeholder="Share your thoughts, experiences, or questions…" rows="8"></textarea>
        <div class="compose-hint">Supports **bold**, *italic*, and line breaks.</div>
      </div>

      <div class="compose-error" id="compose-error" hidden></div>

      <div class="compose-modal-footer">
        <button class="compose-cancel-btn" id="compose-cancel">Cancel</button>
        <button class="btn-primary compose-submit-btn" id="compose-submit">Publish Post</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  // Char count
  const titleInput = document.getElementById('compose-title');
  titleInput.addEventListener('input', () => {
    document.getElementById('title-count').textContent = `${titleInput.value.length} / 200`;
  });

  // Close
  overlay.querySelector('.compose-modal-close').addEventListener('click', () => overlay.remove());
  overlay.querySelector('#compose-cancel').addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });

  // Submit
  overlay.querySelector('#compose-submit').addEventListener('click', () => {
    const title = document.getElementById('compose-title').value;
    const body  = document.getElementById('compose-body').value;
    const topic = document.getElementById('compose-topic').value;
    const type  = document.getElementById('compose-type').value;
    const errEl = document.getElementById('compose-error');

    const result = PSYCHE_DATA.createPost({ title, body, topic, type, authorId: PSYCHE.currentUser.id });
    if (result.success) {
      overlay.remove();
      showToast('Post published!');
      PSYCHE_VIEW.currentPostId = result.post.id;
      navigateTo('page-post');
    } else {
      errEl.textContent = result.error;
      errEl.hidden = false;
    }
  });

  setTimeout(() => titleInput.focus(), 100);
}

// ============================================================
// EDIT POST MODAL
// ============================================================
function openEditPostModal(post) {
  document.querySelector('.compose-modal-overlay')?.remove();
  const overlay = document.createElement('div');
  overlay.className = 'compose-modal-overlay';

  overlay.innerHTML = `
    <div class="compose-modal">
      <div class="compose-modal-header">
        <h2 class="compose-modal-title">Edit Post</h2>
        <button class="compose-modal-close">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
      <div class="compose-field">
        <label class="compose-label">Title</label>
        <input class="compose-input-field" id="edit-title" value="${escapeHtml(post.title)}" maxlength="200">
      </div>
      <div class="compose-field">
        <label class="compose-label">Body</label>
        <textarea class="compose-textarea" id="edit-body" rows="8">${escapeHtml(post.body)}</textarea>
      </div>
      <div class="compose-modal-footer">
        <button class="compose-cancel-btn" id="edit-cancel">Cancel</button>
        <button class="btn-primary" id="edit-save">Save Changes</button>
      </div>
    </div>`;

  document.body.appendChild(overlay);
  overlay.querySelector('.compose-modal-close').addEventListener('click', () => overlay.remove());
  overlay.querySelector('#edit-cancel').addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
  overlay.querySelector('#edit-save').addEventListener('click', () => {
    const result = PSYCHE_DATA.editPost(post.id, {
      title: document.getElementById('edit-title').value,
      body:  document.getElementById('edit-body').value,
    }, PSYCHE.currentUser?.id);
    if (result.success) {
      overlay.remove();
      showToast('Post updated.');
      renderPostDetailPage();
    }
  });
}

// ============================================================
// SIDEBAR
// ============================================================
function renderSidebar(showTopics = true) {
  const topPosts = PSYCHE_DATA.getPosts({ sort: 'top', limit: 5 });
  const u = PSYCHE.currentUser;
  return `
    ${!u ? `
    <div class="dyn-sidebar-card dyn-sidebar-card--cta">
      <div class="dyn-sidebar-cta-title">Join the conversation</div>
      <p class="dyn-sidebar-cta-desc">Create an account to post, comment, and connect with others.</p>
      <button class="btn-primary dyn-sidebar-cta-btn" onclick="openAuthModal('signup')">Sign Up Free</button>
      <button class="dyn-sidebar-cta-signin" onclick="openAuthModal('signin')">Already a member? Sign in</button>
    </div>` : ''}

    <div class="dyn-sidebar-card">
      <div class="dyn-sidebar-card-title">Trending Posts</div>
      ${topPosts.length > 0 ? topPosts.map((p,i) => `
        <div class="dyn-sidebar-trending-item" data-post-id="${p.id}">
          <span class="dyn-sidebar-trending-num">${i+1}</span>
          <div class="dyn-sidebar-trending-title">${escapeHtml(p.title)}</div>
        </div>`).join('')
      : `<div class="dyn-sidebar-empty">No posts yet.</div>`}
    </div>

    ${showTopics ? `
    <div class="dyn-sidebar-card">
      <div class="dyn-sidebar-card-title">Browse Topics</div>
      <div class="dyn-sidebar-topics-wrap">
        ${PSYCHE.topics.slice(0,10).map(t => `
          <button class="dyn-sidebar-topic-chip" data-topic="${t}">${t}</button>`).join('')}
      </div>
    </div>` : ''}
  `;
}

// ============================================================
// MARKDOWN (simple)
// ============================================================
function renderMarkdown(text) {
  if (!text) return '';
  return escapeHtml(text)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code>$1</code>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>')
    .replace(/^/, '<p>')
    .replace(/$/, '</p>');
}

// ============================================================
// TIME AGO
// ============================================================
function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff/1000);
  if (s < 60)   return 'just now';
  const m = Math.floor(s/60);
  if (m < 60)   return `${m}m ago`;
  const h = Math.floor(m/60);
  if (h < 24)   return `${h}h ago`;
  const d = Math.floor(h/24);
  if (d < 7)    return `${d}d ago`;
  const w = Math.floor(d/7);
  if (w < 5)    return `${w}w ago`;
  return new Date(iso).toLocaleDateString();
}

// ============================================================
// FLAG MODAL — reason + category selection
// ============================================================
function openFlagModal(contentId, contentType) {
  const u = PSYCHE.currentUser;
  if (!u) { openAuthModal('signin'); return; }

  document.querySelector('.flag-modal-overlay')?.remove();
  const overlay = document.createElement('div');
  overlay.className = 'flag-modal-overlay auth-modal-overlay';
  overlay.style.cssText = 'opacity:1;z-index:9010';

  const categories = typeof FLAG_CATEGORIES !== 'undefined' ? FLAG_CATEGORIES : [
    { id:'spam', label:'Spam', desc:'Promotional or repetitive content' },
    { id:'misinformation', label:'Misinformation', desc:'False or misleading info' },
    { id:'medical_misinformation', label:'Dangerous Medical Advice', desc:'Could cause harm' },
    { id:'harassment', label:'Harassment or Bullying', desc:'Targeting or demeaning someone' },
    { id:'hate_speech', label:'Hate Speech', desc:'Targeting identity, religion, or orientation' },
    { id:'sensitive_content', label:'Sensitive Content', desc:'Needs a content warning' },
    { id:'off_topic', label:'Off Topic', desc:'Does not belong here' },
    { id:'other', label:'Other', desc:'Something else' },
  ];

  overlay.innerHTML = `
    <div class="auth-modal" style="max-width:440px">
      <button class="auth-modal-close" id="flag-modal-close">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
      <div class="auth-logo">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>
        <span class="auth-logo-name">Report Content</span>
      </div>
      <p style="font-size:.84rem;color:var(--color-text-muted);margin-bottom:1.25rem;line-height:1.5">
        Help us understand what's wrong with this content. Reports are reviewed by our moderation team.
      </p>
      <div class="flag-category-list" id="flag-category-list">
        ${categories.map(c => `
          <label class="flag-category-item">
            <input type="radio" name="flag-cat" value="${c.id}" class="flag-cat-radio">
            <div class="flag-category-body">
              <div class="flag-category-label">${c.label}</div>
              <div class="flag-category-desc">${c.desc}</div>
            </div>
          </label>`).join('')}
      </div>
      <div class="form-group" style="margin-top:.85rem">
        <label class="form-label">Additional context <span style="font-weight:400;color:var(--color-text-faint)">(optional)</span></label>
        <textarea class="form-textarea" id="flag-detail" rows="2" placeholder="Anything else we should know…"></textarea>
      </div>
      <div class="form-error" id="flag-error" hidden>Please select a reason.</div>
      <div style="display:flex;gap:.5rem;justify-content:flex-end;margin-top:.75rem">
        <button class="compose-cancel-btn" id="flag-cancel">Cancel</button>
        <button class="form-submit" id="flag-submit" style="width:auto;padding:.55rem 1.25rem;background:#dc2626">Submit Report</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);
  overlay.querySelector('#flag-modal-close').addEventListener('click', () => overlay.remove());
  overlay.querySelector('#flag-cancel').addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });

  overlay.querySelector('#flag-submit').addEventListener('click', () => {
    const selected = overlay.querySelector('.flag-cat-radio:checked');
    const errEl = document.getElementById('flag-error');
    if (!selected) { errEl.hidden = false; return; }
    const detail = document.getElementById('flag-detail').value.trim();
    const cat = categories.find(c => c.id === selected.value);
    const reason = detail || cat?.label || 'Flagged';
    PSYCHE_DATA.flagPost(contentId, u.id, reason, selected.value);
    overlay.remove();
    // Disable the flag button on the post detail
    const flagBtn = document.getElementById('flag-btn');
    if (flagBtn) { flagBtn.disabled = true; flagBtn.textContent = 'Flagged'; }
    showToast('Report submitted. Our moderation team will review it.');
  });
}

// ============================================================
// WIRE navigateTo for dynamic pages + sidebar clicks
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  // Sidebar trending clicks (delegated)
  document.addEventListener('click', e => {
    const trending = e.target.closest('.dyn-sidebar-trending-item');
    if (trending) openPostDetail(trending.dataset.postId);

    const chip = e.target.closest('.dyn-sidebar-topic-chip, .dyn-sidebar-topic-link');
    if (chip) {
      PSYCHE_VIEW.forumTopic = chip.dataset.topic;
      navigateTo('page-forum');
    }

    const composeBtn = e.target.closest('.btn-post');
    if (composeBtn) {
      e.preventDefault();
      openComposeModal();
    }
  });

  // Hero search
  document.addEventListener('submit', e => {
    if (e.target.id === 'hero-search-form') {
      e.preventDefault();
      const q = document.getElementById('hero-search-input')?.value.trim();
      if (q) renderSearchResults(q);
    }
  });
});
