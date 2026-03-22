/* ============================================================
   PSYCHE — Posts & Comments Data Store (API-backed)
   Fetches from backend API, caches in memory.
   Falls back to local demo data if API is unavailable.
   ============================================================ */

const PSYCHE_DATA = {

  // ---- IN-MEMORY CACHE ----
  posts:    {},   // { [postId]: Post }
  comments: {},   // { [commentId]: Comment }
  _apiReady: false,

  // ---- POST TYPES ----
  postTypes: {
    discussion: { label: 'Discussion', icon: '💬' },
    article:    { label: 'Article',    icon: '📝' },
    question:   { label: 'Question',   icon: '❓' },
    resource:   { label: 'Resource',   icon: '📚' },
    support:    { label: 'Support',    icon: '🤝' },
  },

  // ---- MAP API POST to frontend shape ----
  _mapPost(p) {
    return {
      id:          p.id,
      postKind:    p.post_kind || p.postKind || 'forum',
      title:       p.title,
      body:        p.body || '',
      sections:    p.sections || null,
      coverImage:  p.cover_image || p.coverImage || null,
      topic:       p.topic || '',
      type:        p.post_type || p.type || 'discussion',
      authorId:    p.author_id || p.authorId,
      upvotes:     p.upvotes || 0,
      downvotes:   p.downvotes || 0,
      voters:      p.voters || {},
      commentCount: p.comment_count || p.commentCount || 0,
      pinned:      p.pinned || p.is_pinned || false,
      flagged:     p.flagged || false,
      flagCount:   p.flag_count || p.flagCount || 0,
      status:      p.status || 'approved',
      ghosted:     p.ghosted || false,
      deleted:     p.deleted || false,
      internalComments: p.internalComments || [],
      needsReviewReason: p.needsReviewReason || null,
      createdAt:   p.created_at || p.createdAt || new Date().toISOString(),
      editedAt:    p.edited_at || p.editedAt || null,
      approvedAt:  p.approved_at || p.approvedAt || null,
      // Author info (if joined from API)
      _author: p.author_username ? {
        id:          p.author_id,
        username:    p.author_username,
        displayName: p.author_name || p.author_username,
        avatarColor: p.author_color || '#818cf8',
        role:        p.author_role || 'member',
      } : null,
    };
  },

  // ---- MAP API COMMENT to frontend shape ----
  _mapComment(c) {
    return {
      id:        c.id,
      postId:    c.post_id || c.postId,
      parentId:  c.parent_id || c.parentId || null,
      body:      c.body,
      authorId:  c.author_id || c.authorId,
      upvotes:   c.upvotes || 0,
      downvotes: c.downvotes || 0,
      voters:    c.voters || {},
      removed:   false,
      createdAt: c.created_at || c.createdAt,
      editedAt:  c.edited_at || c.editedAt || null,
      _author: c.author_username ? {
        id:          c.author_id,
        username:    c.author_username,
        displayName: c.author_name || c.author_username,
        avatarColor: c.author_color || '#818cf8',
        role:        c.author_role || 'member',
      } : null,
    };
  },

  // ---- CREATE POST (API) ----
  async createPost({ title, body, topic, type = 'discussion', authorId, sections = null, coverImage = null, postKind = 'blog' }) {
    if (!title?.trim() || !body?.trim()) return { success: false, error: 'Title and body are required.' };
    if (!topic) return { success: false, error: 'Please select a topic.' };
    if (!authorId) return { success: false, error: 'You must be logged in to post.' };

    try {
      const res = await API.createPost({
        title: title.trim(), body: body.trim(), topic, post_type: type,
        post_kind: postKind, sections: sections || undefined,
        cover_image: coverImage || undefined,
      });
      const post = this._mapPost(res.post || res);
      this.posts[post.id] = post;
      if (PSYCHE.users[authorId]) PSYCHE.users[authorId].postCount = (PSYCHE.users[authorId].postCount || 0) + 1;
      return { success: true, post, autoApproved: res.autoApproved !== false };
    } catch(err) {
      return { success: false, error: err.message };
    }
  },

  // ---- CREATE FORUM POST (API) ----
  async createForumPost({ title, body, topic, type = 'discussion', authorId }) {
    return this.createPost({ title, body, topic, type, authorId, postKind: 'forum' });
  },

  // ---- APPROVE POST (API) ----
  async approvePost(postId, actorId) {
    try {
      await API.updatePostStatus(postId, 'approved');
      const post = this.posts[postId];
      if (post) { post.status = 'approved'; post.approvedAt = new Date().toISOString(); }
      return { success: true };
    } catch(err) { return { success: false, error: err.message }; }
  },

  // ---- SET NEEDS REVIEW ----
  async setNeedsReview(postId, reason, actorId) {
    try {
      await API.updatePostStatus(postId, 'needs_review');
      const post = this.posts[postId];
      if (post) { post.status = 'needs_review'; post.needsReviewReason = reason; }
      return { success: true };
    } catch(err) { return { success: false, error: err.message }; }
  },

  // ---- ADD INTERNAL COMMENT ----
  addInternalComment(postId, body, actorId) {
    const post = this.posts[postId];
    if (!post) return { success: false, error: 'Post not found.' };
    if (!post.internalComments) post.internalComments = [];
    post.internalComments.push({ authorId: actorId, body, createdAt: new Date().toISOString() });
    return { success: true };
  },

  // ---- GHOST POST ----
  async ghostPost(postId, ghosted, actorId) {
    try {
      await API.moderatePost(postId, ghosted ? 'ghost' : 'unghost');
      const post = this.posts[postId];
      if (post) post.ghosted = ghosted;
      return { success: true };
    } catch(err) { return { success: false, error: err.message }; }
  },

  // ---- TEMP REMOVE ----
  async tempRemovePost(postId, reason, actorId) {
    try {
      await API.updatePostStatus(postId, 'temp_removed');
      const post = this.posts[postId];
      if (post) { post.status = 'temp_removed'; post.tempRemovedReason = reason; }
      return { success: true };
    } catch(err) { return { success: false, error: err.message }; }
  },

  // ---- SOFT DELETE ----
  async softDeletePost(postId, actorId) {
    try {
      await API.deletePost(postId);
      const post = this.posts[postId];
      if (post) { post.deleted = true; post.status = 'deleted'; }
      return { success: true };
    } catch(err) { return { success: false, error: err.message }; }
  },

  getDeletedPosts() {
    return Object.values(this.posts).filter(p => p.deleted)
      .sort((a,b) => new Date(b.deletedAt || b.createdAt) - new Date(a.deletedAt || a.createdAt));
  },

  // ---- GET PENDING POSTS (API) ----
  async getPendingPosts(kind = null) {
    try {
      const res = await API.getPendingPosts();
      const posts = (res.posts || res || []).map(p => this._mapPost(p));
      posts.forEach(p => { this.posts[p.id] = p; this._cacheAuthor(p); });
      return posts;
    } catch(err) {
      // Fallback to local cache
      return Object.values(this.posts)
        .filter(p => !p.deleted && (p.status === 'pending' || p.status === 'needs_review'))
        .sort((a,b) => new Date(a.createdAt) - new Date(b.createdAt));
    }
  },

  // ---- EDIT POST ----
  editPost(postId, { title, body }, editorId) {
    const post = this.posts[postId];
    if (!post) return { success: false, error: 'Post not found.' };
    if (title) post.title = title.trim();
    if (body)  post.body  = body.trim();
    post.editedAt = new Date().toISOString();
    return { success: true, post };
  },

  // ---- DELETE POST ----
  async deletePost(postId, actorId) {
    return this.softDeletePost(postId, actorId);
  },

  // ---- VOTE ON POST (API) ----
  async votePost(postId, userId, dir) {
    const post = this.posts[postId];
    if (!post) return null;

    // Optimistic local update
    const prev = post.voters ? post.voters[userId] : undefined;
    if (!post.voters) post.voters = {};

    if (prev === dir) {
      delete post.voters[userId];
      if (prev === 'up') post.upvotes--;
      else post.downvotes--;
    } else {
      if (prev === 'up') post.upvotes--;
      else if (prev === 'down') post.downvotes--;
      post.voters[userId] = dir;
      if (dir === 'up') post.upvotes++;
      else post.downvotes++;
    }

    // Fire API call (non-blocking)
    try {
      await API.votePost(postId, dir);
    } catch(err) {
      console.warn('Vote API failed:', err.message);
    }
    return post;
  },

  // ---- FLAG POST ----
  flagPost(postId, userId, reason, category) {
    const post = this.posts[postId];
    if (!post) return { success: false, error: 'Post not found.' };
    if (!post._flaggers) post._flaggers = {};
    if (post._flaggers[userId]) return { success: false, error: 'You already flagged this post.' };
    post._flaggers[userId] = { reason: reason || 'No reason given', category: category || 'other', at: new Date().toISOString() };
    post.flagged = true;
    post.flagCount = (post.flagCount || 0) + 1;
    if (!post.flagReasons) post.flagReasons = [];
    post.flagReasons.push({ userId, reason, category });
    return { success: true };
  },

  // ---- PIN POST ----
  pinPost(postId, pinned) {
    const post = this.posts[postId];
    if (post) post.pinned = pinned;
  },

  // ---- GET POSTS (API-backed) ----
  // Async version that fetches from API
  async fetchPosts({ topic, type, sort = 'new', limit = 20, postKind = null } = {}) {
    try {
      const params = { sort, limit };
      if (topic) params.topic = topic;
      if (type)  params.type = type;
      if (postKind) params.kind = postKind;
      const res = await API.getPosts(params);
      const posts = (res.posts || res || []).map(p => this._mapPost(p));
      posts.forEach(p => { this.posts[p.id] = p; this._cacheAuthor(p); });
      return posts;
    } catch(err) {
      console.warn('API fetch failed, using local cache:', err.message);
      return this.getPosts({ topic, type, sort, limit, postKind });
    }
  },

  // Synchronous version — uses local cache (for backward compat)
  getPosts({ topic, type, sort = 'new', limit = 20, offset = 0, postKind = null, includeAll = false } = {}) {
    let list = Object.values(this.posts).filter(p => {
      if (p.deleted) return false;
      if (p.ghosted) return false;
      if (!includeAll && p.status !== 'approved') return false;
      if (postKind && p.postKind !== postKind) return false;
      return true;
    });
    if (topic) list = list.filter(p => p.topic === topic);
    if (type)  list = list.filter(p => p.type  === type);

    if (sort === 'top')     list.sort((a,b) => (b.upvotes - b.downvotes) - (a.upvotes - a.downvotes));
    else if (sort === 'hot') list.sort((a,b) => hotScore(b) - hotScore(a));
    else                    list.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));

    list.sort((a,b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));
    return list.slice(offset, offset + limit);
  },

  getPost(postId) {
    return this.posts[postId] || null;
  },

  // Async: fetch single post from API
  async fetchPost(postId) {
    try {
      const res = await API.getPost(postId);
      const post = this._mapPost(res.post || res);
      this.posts[post.id] = post;
      this._cacheAuthor(post);
      return post;
    } catch(err) {
      return this.posts[postId] || null;
    }
  },

  // ---- CREATE COMMENT (API) ----
  async createComment({ postId, body, authorId, parentId = null }) {
    if (!body?.trim()) return { success: false, error: 'Comment cannot be empty.' };
    if (!authorId) return { success: false, error: 'You must be logged in to comment.' };

    try {
      const res = await API.createComment({ post_id: postId, body: body.trim(), parent_id: parentId });
      const comment = this._mapComment(res.comment || res);
      this.comments[comment.id] = comment;
      const post = this.posts[postId];
      if (post) post.commentCount = (post.commentCount || 0) + 1;
      if (PSYCHE.currentUser) {
        comment.authorId = PSYCHE.currentUser.id;
        comment._author = {
          id: PSYCHE.currentUser.id,
          username: PSYCHE.currentUser.username,
          displayName: PSYCHE.currentUser.displayName,
          avatarColor: PSYCHE.currentUser.avatarColor,
          role: PSYCHE.currentUser.role,
        };
      }
      return { success: true, comment };
    } catch(err) {
      return { success: false, error: err.message };
    }
  },

  // ---- DELETE COMMENT (API) ----
  async deleteComment(commentId, actorId) {
    try {
      await API.deleteComment(commentId);
      const c = this.comments[commentId];
      if (c) {
        c.removed = true;
        if (this.posts[c.postId]) this.posts[c.postId].commentCount = Math.max(0, (this.posts[c.postId].commentCount||0) - 1);
      }
      return { success: true };
    } catch(err) {
      return { success: false, error: err.message };
    }
  },

  // ---- VOTE ON COMMENT ----
  voteComment(commentId, userId) {
    const c = this.comments[commentId];
    if (!c) return;
    if (!c.voters) c.voters = {};
    if (c.voters[userId]) {
      delete c.voters[userId];
      c.upvotes--;
    } else {
      c.voters[userId] = 'up';
      c.upvotes++;
    }
    return c;
  },

  // ---- GET COMMENTS (API-backed) ----
  async fetchComments(postId, sort = 'top') {
    try {
      const res = await API.getComments(postId);
      const comments = (res.comments || res || []).map(c => this._mapComment(c));
      comments.forEach(c => { this.comments[c.id] = c; this._cacheCommentAuthor(c); });
      return this._buildCommentTree(comments, sort);
    } catch(err) {
      console.warn('Comments API failed:', err.message);
      return this.getComments(postId, sort);
    }
  },

  // Sync version from local cache
  getComments(postId, sort = 'top') {
    let list = Object.values(this.comments).filter(c => c.postId === postId && !c.removed && !c.parentId);
    if (sort === 'top') list.sort((a,b) => (b.upvotes||0) - (a.upvotes||0));
    else list.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));

    return list.map(c => ({
      ...c,
      replies: Object.values(this.comments)
        .filter(r => r.parentId === c.id && !r.removed)
        .sort((a,b) => (b.upvotes||0) - (a.upvotes||0))
    }));
  },

  _buildCommentTree(comments, sort) {
    const roots = comments.filter(c => !c.parentId);
    const replies = comments.filter(c => c.parentId);

    if (sort === 'top') roots.sort((a,b) => (b.upvotes||0) - (a.upvotes||0));
    else roots.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));

    return roots.map(c => ({
      ...c,
      replies: replies.filter(r => r.parentId === c.id).sort((a,b) => (b.upvotes||0) - (a.upvotes||0))
    }));
  },

  // ---- SEARCH (API) ----
  async search(query) {
    const q = (query || '').trim();
    if (!q) return [];
    try {
      const res = await API.search(q);
      return (res.posts || []).map(p => this._mapPost(p));
    } catch(err) {
      // Fallback to local search
      return Object.values(this.posts)
        .filter(p => !p.deleted && (
          (p.title || '').toLowerCase().includes(q.toLowerCase()) ||
          (p.body || '').toLowerCase().includes(q.toLowerCase())
        ))
        .sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 20);
    }
  },

  // ---- CACHE AUTHOR from embedded post data ----
  _cacheAuthor(post) {
    if (post._author && post._author.id) {
      const a = post._author;
      if (!PSYCHE.users[a.id]) {
        PSYCHE.users[a.id] = {
          id: a.id, username: a.username, displayName: a.displayName,
          avatarColor: a.avatarColor, role: a.role, bio: '', karma: 0,
          postCount: 0, commentCount: 0, followedTopics: [],
          joinedAt: new Date().toISOString(),
        };
      }
    }
  },

  _cacheCommentAuthor(comment) {
    if (comment._author && comment._author.id) {
      const a = comment._author;
      if (!PSYCHE.users[a.id]) {
        PSYCHE.users[a.id] = {
          id: a.id, username: a.username, displayName: a.displayName,
          avatarColor: a.avatarColor, role: a.role, bio: '', karma: 0,
          postCount: 0, commentCount: 0, followedTopics: [],
          joinedAt: new Date().toISOString(),
        };
      }
    }
  },

  // ---- PERSISTENCE (no-op, API is source of truth) ----
  _save() {},

  // ---- LOAD from API ----
  async load() {
    try {
      const res = await API.getPosts({ sort: 'new', limit: 30 });
      const posts = (res.posts || res || []).map(p => this._mapPost(p));
      posts.forEach(p => { this.posts[p.id] = p; this._cacheAuthor(p); });
      this._apiReady = true;
      console.log(`[Psyche] Loaded ${posts.length} posts from API.`);
    } catch(err) {
      console.warn('[Psyche] API load failed, seeding demo data:', err.message);
      if (Object.keys(this.posts).length === 0) this._seedDemoPosts();
    }
  },

  // ---- SEED DEMO POSTS (fallback when API unavailable) ----
  _seedDemoPosts() {
    const demoPosts = [
      { title: 'Does anyone else feel physically sick before social events?', body: "I've been dealing with social anxiety for about 3 years now, and one thing nobody talks about is the physical symptoms. Before any social event \u2014 even ones I actually want to go to \u2014 I get nauseous, my heart races, and sometimes I even get a headache the day before.\n\nI've tried deep breathing and it helps a little, but I'm curious if others experience this and what has actually worked for you.", topic: 'Anxiety', type: 'discussion', authorId: 'u_demo1', upvotes: 247, commentCount: 31, createdAt: new Date(Date.now() - 2*3600000).toISOString() },
      { title: 'The Science of Emotional Regulation: What Actually Works', body: "After reviewing about 40 studies on emotional regulation strategies, here's what the evidence actually says:\n\n**1. Cognitive Reappraisal** \u2014 Consistently the most effective long-term strategy.\n\n**2. Mindfulness-Based Approaches** \u2014 Strong evidence for reducing emotional reactivity over time.\n\n**3. Suppression** \u2014 Repeatedly shown to backfire.", topic: 'Neuroscience', type: 'article', authorId: 'u_demo2', upvotes: 891, commentCount: 67, createdAt: new Date(Date.now() - 5*3600000).toISOString() },
      { title: '3 years of therapy \u2014 what I actually learned about attachment', body: "I started therapy at 26 thinking I just had \"some anxiety.\" Three years later I understand that almost everything I struggled with traces back to an anxious attachment style developed in childhood.", topic: 'Relationships', type: 'discussion', authorId: 'u_demo1', upvotes: 1204, commentCount: 89, createdAt: new Date(Date.now() - 2*24*3600000).toISOString(), pinned: true },
      { title: 'New study: 8 weeks of mindfulness changes amygdala volume', body: "A new neuroimaging study (n=89) found measurable reductions in amygdala gray matter density after an 8-week MBSR program.", topic: 'Neuroscience', type: 'resource', authorId: 'u_demo3', upvotes: 445, commentCount: 28, createdAt: new Date(Date.now() - 5*24*3600000).toISOString() },
      { title: 'Grief is not linear \u2014 my experience 2 years after losing my dad', body: "I know everyone says grief isn't linear but I didn't really understand what that meant until month 18.", topic: 'Grief & Loss', type: 'support', authorId: 'u_demo4', upvotes: 2103, commentCount: 114, createdAt: new Date(Date.now() - 6*24*3600000).toISOString() },
    ];

    demoPosts.forEach(p => {
      const id = 'p_seed_' + Math.random().toString(36).slice(2,9);
      this.posts[id] = {
        id, voters: {}, _flaggers: {}, removed: false, flagged: false, flagCount: 0,
        pinned: p.pinned || false, editedAt: null, downvotes: 0,
        status: 'approved', ghosted: false, deleted: false,
        internalComments: [], postKind: 'forum', ...p
      };
    });
  },
};

// ---- HOT SCORE (Reddit-style) ----
function hotScore(post) {
  const score = (post.upvotes || 0) - (post.downvotes || 0);
  const order = Math.log10(Math.max(Math.abs(score), 1));
  const sign  = score > 0 ? 1 : score < 0 ? -1 : 0;
  const seconds = (new Date(post.createdAt).getTime() / 1000) - 1134028003;
  return sign * order + seconds / 45000;
}

// Load on script parse
document.addEventListener('DOMContentLoaded', () => PSYCHE_DATA.load());
