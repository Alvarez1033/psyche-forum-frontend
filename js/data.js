/* ============================================================
   PSYCHE — Posts & Comments Data Store
   All posts, comments, votes stored here.
   Persisted to localStorage via storage.js
   ============================================================ */

const PSYCHE_DATA = {

  // ---- STORAGE ----
  posts:    {},   // { [postId]: Post }
  comments: {},   // { [commentId]: Comment }

  // ---- POST TYPES ----
  postTypes: {
    discussion: { label: 'Discussion', icon: '💬' },
    article:    { label: 'Article',    icon: '📝' },
    question:   { label: 'Question',   icon: '❓' },
    resource:   { label: 'Resource',   icon: '📚' },
    support:    { label: 'Support',    icon: '🤝' },
  },

  // ---- CREATE POST ----
  // ---- POST STATUS CONSTANTS ----
  // Blog post statuses:
  // 'pending'      - awaiting editor/admin approval
  // 'approved'     - live and visible
  // 'needs_review' - editor flagged an issue, invisible to public
  // 'ghosted'      - hidden from public, author doesn't know (mod+)
  // 'temp_removed' - temporarily removed, author notified (admin+)
  // 'deleted'      - soft deleted, in deleted_posts archive (admin+)
  // Forum post statuses:
  // 'pending'      - guest: awaiting manual approval
  // 'timer'        - member: auto-approves after timer
  // 'approved'     - live
  // 'removed'      - removed by mod

  createPost({ title, body, topic, type = 'discussion', authorId, sections = null, coverImage = null, postKind = 'blog' }) {
    if (!title?.trim() || !body?.trim()) return { success: false, error: 'Title and body are required.' };
    if (!topic) return { success: false, error: 'Please select a topic.' };
    if (!authorId) return { success: false, error: 'You must be logged in to post.' };

    // Determine approval status
    const autoApprove = typeof PSYCHE_ROLES !== 'undefined'
      ? PSYCHE_ROLES.canAutoApprovePost(PSYCHE.users[authorId])
      : false;

    const id = 'p_' + Date.now() + '_' + Math.random().toString(36).slice(2,7);
    const post = {
      id,
      postKind,           // 'blog' | 'forum'
      title:     title.trim(),
      body:      body.trim(),
      sections:  sections || null,   // structured sections for blog posts
      coverImage: coverImage || null,
      topic,
      type,
      authorId,
      upvotes:   0,
      downvotes: 0,
      voters:    {},
      commentCount: 0,
      pinned:    false,
      flagged:   false,
      flagCount: 0,
      // Status workflow
      status:    autoApprove ? 'approved' : 'pending',
      ghosted:   false,
      deleted:   false,
      deletedAt: null,
      deletedBy: null,
      tempRemovedAt: null,
      tempRemovedBy: null,
      tempRemovedReason: null,
      // Editor review
      internalComments: [],   // { authorId, body, createdAt } — invisible to poster
      needsReviewReason: null,
      reviewedBy: null,
      // Approval timer for forum member posts
      approvalTimerEnd: null,
      // Metadata
      createdAt: new Date().toISOString(),
      editedAt:  null,
      approvedAt: autoApprove ? new Date().toISOString() : null,
      approvedBy: autoApprove ? authorId : null,
    };
    this.posts[id] = post;
    if (PSYCHE.users[authorId]) PSYCHE.users[authorId].postCount = (PSYCHE.users[authorId].postCount || 0) + 1;
    this._save();
    return { success: true, post, autoApproved: autoApprove };
  },

  createForumPost({ title, body, topic, type = 'discussion', authorId }) {
    if (!title?.trim() || !body?.trim()) return { success: false, error: 'Title and body are required.' };
    if (!topic) return { success: false, error: 'Please select a topic.' };
    if (!authorId) return { success: false, error: 'You must be logged in.' };

    const mode = typeof PSYCHE_ROLES !== 'undefined'
      ? PSYCHE_ROLES.getForumPostApprovalMode(PSYCHE.users[authorId])
      : 'approval';

    const id = 'f_' + Date.now() + '_' + Math.random().toString(36).slice(2,7);
    let status = 'approved';
    let approvalTimerEnd = null;

    if (mode === 'approval') status = 'pending';
    else if (mode === 'timer') {
      status = 'timer';
      approvalTimerEnd = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 min
    }

    const post = {
      id, postKind: 'forum',
      title: title.trim(), body: body.trim(),
      topic, type, authorId,
      upvotes: 0, downvotes: 0, voters: {},
      commentCount: 0, pinned: false, flagged: false, flagCount: 0,
      status, approvalTimerEnd,
      ghosted: false, deleted: false,
      internalComments: [],
      createdAt: new Date().toISOString(), editedAt: null,
    };
    this.posts[id] = post;
    if (PSYCHE.users[authorId]) PSYCHE.users[authorId].postCount = (PSYCHE.users[authorId].postCount || 0) + 1;
    this._save();
    return { success: true, post, approvalMode: mode };
  },

  // ---- APPROVE POST ----
  approvePost(postId, actorId) {
    const post = this.posts[postId];
    if (!post) return { success: false, error: 'Post not found.' };
    post.status = 'approved';
    post.approvedAt = new Date().toISOString();
    post.approvedBy = actorId;
    this._save();
    return { success: true };
  },

  // ---- SET NEEDS REVIEW (editor) ----
  setNeedsReview(postId, reason, actorId) {
    const post = this.posts[postId];
    if (!post) return { success: false, error: 'Post not found.' };
    post.status = 'needs_review';
    post.needsReviewReason = reason;
    post.reviewedBy = actorId;
    this._save();
    return { success: true };
  },

  // ---- ADD INTERNAL COMMENT (editor+) ----
  addInternalComment(postId, body, actorId) {
    const post = this.posts[postId];
    if (!post) return { success: false, error: 'Post not found.' };
    if (!post.internalComments) post.internalComments = [];
    post.internalComments.push({ authorId: actorId, body, createdAt: new Date().toISOString() });
    this._save();
    return { success: true };
  },

  // ---- GHOST POST (moderator+) ----
  ghostPost(postId, ghosted, actorId) {
    const post = this.posts[postId];
    if (!post) return { success: false, error: 'Post not found.' };
    post.ghosted = ghosted;
    this._save();
    return { success: true };
  },

  // ---- TEMP REMOVE (admin+) ----
  tempRemovePost(postId, reason, actorId) {
    const post = this.posts[postId];
    if (!post) return { success: false, error: 'Post not found.' };
    post.status = 'temp_removed';
    post.tempRemovedAt = new Date().toISOString();
    post.tempRemovedBy = actorId;
    post.tempRemovedReason = reason || 'Violation of community guidelines.';
    this._save();
    return { success: true };
  },

  // ---- SOFT DELETE (admin+) ----
  softDeletePost(postId, actorId) {
    const post = this.posts[postId];
    if (!post) return { success: false, error: 'Post not found.' };
    post.deleted = true;
    post.deletedAt = new Date().toISOString();
    post.deletedBy = actorId;
    post.status = 'deleted';
    this._save();
    return { success: true };
  },

  // ---- GET DELETED POSTS (admin+) ----
  getDeletedPosts() {
    return Object.values(this.posts).filter(p => p.deleted)
      .sort((a,b) => new Date(b.deletedAt) - new Date(a.deletedAt));
  },

  // ---- GET PENDING POSTS (for admin queue) ----
  getPendingPosts(kind = null) {
    return Object.values(this.posts)
      .filter(p => !p.deleted && (p.status === 'pending' || p.status === 'needs_review' || p.status === 'timer') && (!kind || p.postKind === kind))
      .sort((a,b) => new Date(a.createdAt) - new Date(b.createdAt));
  },

  // ---- EDIT POST ----
  editPost(postId, { title, body }, editorId) {
    const post = this.posts[postId];
    if (!post) return { success: false, error: 'Post not found.' };
    if (post.authorId !== editorId && !PSYCHE.isMod()) return { success: false, error: 'Not authorized.' };
    if (title) post.title = title.trim();
    if (body)  post.body  = body.trim();
    post.editedAt = new Date().toISOString();
    this._save();
    return { success: true, post };
  },

  // ---- DELETE POST (own posts) ----
  deletePost(postId, actorId) {
    const post = this.posts[postId];
    if (!post) return { success: false, error: 'Post not found.' };
    if (post.authorId !== actorId && !PSYCHE.isMod()) return { success: false, error: 'Not authorized.' };
    return this.softDeletePost(postId, actorId);
  },

  // ---- VOTE ON POST ----
  votePost(postId, userId, dir) { // dir: 'up' | 'down' | null
    const post = this.posts[postId];
    if (!post) return;
    const prev = post.voters[userId];
    if (prev === dir) {
      // Toggle off
      delete post.voters[userId];
      if (prev === 'up') post.upvotes--;
      else post.downvotes--;
    } else {
      // Remove old vote
      if (prev === 'up') post.upvotes--;
      else if (prev === 'down') post.downvotes--;
      // Add new vote
      post.voters[userId] = dir;
      if (dir === 'up') {
        post.upvotes++;
        // Karma reward
        if (PSYCHE.users[post.authorId]) PSYCHE.users[post.authorId].karma = (PSYCHE.users[post.authorId].karma || 0) + 1;
      } else {
        post.downvotes++;
      }
    }
    this._save();
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
    // Track the most common reason
    if (!post.flagReasons) post.flagReasons = [];
    post.flagReasons.push({ userId, reason, category });
    this._save();
    return { success: true };
  },

  // ---- PIN POST (mod+) ----
  pinPost(postId, pinned) {
    const post = this.posts[postId];
    if (post) { post.pinned = pinned; this._save(); }
  },

  // ---- GET POSTS ----
  getPosts({ topic, type, sort = 'new', limit = 20, offset = 0, postKind = null, includeAll = false } = {}) {
    let list = Object.values(this.posts).filter(p => {
      if (p.deleted) return false;
      if (p.ghosted) return false;
      if (!includeAll && p.status !== 'approved') return false;
      // Timer posts — auto-approve if timer expired
      if (p.status === 'timer' && p.approvalTimerEnd && new Date() > new Date(p.approvalTimerEnd)) {
        p.status = 'approved'; this._save();
      }
      if (postKind && p.postKind !== postKind) return false;
      return true;
    });
    if (topic) list = list.filter(p => p.topic === topic);
    if (type)  list = list.filter(p => p.type  === type);

    // Sort
    if (sort === 'top')     list.sort((a,b) => (b.upvotes - b.downvotes) - (a.upvotes - a.downvotes));
    else if (sort === 'hot') list.sort((a,b) => hotScore(b) - hotScore(a));
    else                    list.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt)); // new

    // Pinned always first
    list.sort((a,b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));

    return list.slice(offset, offset + limit);
  },

  getPost(postId) {
    return this.posts[postId] || null;
  },

  // ---- CREATE COMMENT ----
  createComment({ postId, body, authorId, parentId = null }) {
    if (!body?.trim()) return { success: false, error: 'Comment cannot be empty.' };
    if (!authorId) return { success: false, error: 'You must be logged in to comment.' };
    const post = this.posts[postId];
    if (!post) return { success: false, error: 'Post not found.' };

    const id = 'c_' + Date.now() + '_' + Math.random().toString(36).slice(2,7);
    const comment = {
      id,
      postId,
      parentId,
      body:      body.trim(),
      authorId,
      upvotes:   0,
      voters:    {},
      removed:   false,
      createdAt: new Date().toISOString(),
      editedAt:  null,
    };
    this.comments[id] = comment;
    post.commentCount = (post.commentCount || 0) + 1;
    // Karma
    if (PSYCHE.users[authorId]) PSYCHE.users[authorId].commentCount = (PSYCHE.users[authorId].commentCount || 0) + 1;
    this._save();
    return { success: true, comment };
  },

  // ---- DELETE COMMENT ----
  deleteComment(commentId, actorId) {
    const c = this.comments[commentId];
    if (!c) return { success: false, error: 'Comment not found.' };
    if (c.authorId !== actorId && !PSYCHE.isMod()) return { success: false, error: 'Not authorized.' };
    c.removed = true;
    if (this.posts[c.postId]) this.posts[c.postId].commentCount = Math.max(0, (this.posts[c.postId].commentCount||0) - 1);
    this._save();
    return { success: true };
  },

  // ---- VOTE ON COMMENT ----
  voteComment(commentId, userId) {
    const c = this.comments[commentId];
    if (!c) return;
    if (c.voters[userId]) {
      delete c.voters[userId];
      c.upvotes--;
    } else {
      c.voters[userId] = 'up';
      c.upvotes++;
      if (PSYCHE.users[c.authorId]) PSYCHE.users[c.authorId].karma = (PSYCHE.users[c.authorId].karma || 0) + 1;
    }
    this._save();
    return c;
  },

  // ---- GET COMMENTS for a post ----
  getComments(postId, sort = 'top') {
    let list = Object.values(this.comments).filter(c => c.postId === postId && !c.removed && !c.parentId);
    if (sort === 'top') list.sort((a,b) => b.upvotes - a.upvotes);
    else list.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));

    // Attach replies
    return list.map(c => ({
      ...c,
      replies: Object.values(this.comments)
        .filter(r => r.parentId === c.id && !r.removed)
        .sort((a,b) => b.upvotes - a.upvotes)
    }));
  },

  // ---- SEARCH ----
  search(query) {
    const q = query.toLowerCase().trim();
    if (!q) return [];
    return Object.values(this.posts)
      .filter(p => !p.removed && (
        p.title.toLowerCase().includes(q) ||
        p.body.toLowerCase().includes(q) ||
        p.topic.toLowerCase().includes(q)
      ))
      .sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 20);
  },

  // ---- PERSISTENCE ----
  _save() {
    try {
      localStorage.setItem('psyche_posts',    JSON.stringify(this.posts));
      localStorage.setItem('psyche_comments', JSON.stringify(this.comments));
    } catch(e) { console.warn('PSYCHE_DATA save error', e); }
  },

  load() {
    try {
      const p = localStorage.getItem('psyche_posts');
      const c = localStorage.getItem('psyche_comments');
      if (p) this.posts    = JSON.parse(p);
      if (c) this.comments = JSON.parse(c);
    } catch(e) { console.warn('PSYCHE_DATA load error', e); }

    // Seed demo posts if empty
    if (Object.keys(this.posts).length === 0) this._seedDemoPosts();
  },

  // ---- SEED DEMO POSTS ----
  _seedDemoPosts() {
    const demoPosts = [
      { title: 'Does anyone else feel physically sick before social events?', body: `I've been dealing with social anxiety for about 3 years now, and one thing nobody talks about is the physical symptoms. Before any social event — even ones I actually want to go to — I get nauseous, my heart races, and sometimes I even get a headache the day before.\n\nI've tried deep breathing and it helps a little, but I'm curious if others experience this and what has actually worked for you. My therapist mentioned interoceptive exposure therapy but I haven't started yet.`, topic: 'Anxiety', type: 'discussion', authorId: 'u_demo1', upvotes: 247, commentCount: 31, createdAt: new Date(Date.now() - 2*3600000).toISOString() },
      { title: 'The Science of Emotional Regulation: What Actually Works', body: `After reviewing about 40 studies on emotional regulation strategies, here's what the evidence actually says:\n\n**1. Cognitive Reappraisal** — Consistently the most effective long-term strategy. Changing *how you think* about a situation, not suppressing the emotion.\n\n**2. Mindfulness-Based Approaches** — Strong evidence for reducing emotional reactivity over time. Requires consistent practice (8+ weeks).\n\n**3. Distraction** — Works short-term but doesn't address the root. Fine as a temporary tool.\n\n**4. Suppression** — Repeatedly shown to backfire. Increases physiological arousal and often leads to emotional "rebound."\n\nThe key takeaway: interventions that change cognitive appraisal show the most durable results. Happy to discuss any of these in depth.`, topic: 'Neuroscience', type: 'article', authorId: 'u_demo2', upvotes: 891, commentCount: 67, createdAt: new Date(Date.now() - 5*3600000).toISOString() },
      { title: '3 years of therapy — what I actually learned about attachment', body: `I started therapy at 26 thinking I just had "some anxiety." Three years later I understand that almost everything I struggled with — relationships, self-worth, work stress — traces back to an anxious attachment style developed in childhood.\n\nSome things that genuinely shifted for me:\n- Learning to sit with discomfort instead of seeking reassurance immediately\n- Understanding that my nervous system was responding to *perceived* threats, not real ones\n- Recognizing my "stories" — the narratives I tell myself about what others think\n\nNot posting this as advice, just sharing because I wish someone had told me therapy could be this transformative.`, topic: 'Relationships', type: 'discussion', authorId: 'u_demo1', upvotes: 1204, commentCount: 89, createdAt: new Date(Date.now() - 2*24*3600000).toISOString(), pinned: true },
      { title: 'New study: 8 weeks of mindfulness changes amygdala volume', body: `A new neuroimaging study (n=89) found measurable reductions in amygdala gray matter density after an 8-week MBSR program, correlating with self-reported reductions in stress.\n\nThis adds to the growing body of evidence that mindfulness practice produces *structural* brain changes, not just psychological ones. The effect size was moderate (Cohen's d = 0.41) but statistically robust.\n\nLink to the paper in comments. Would love to discuss methodological limitations — the lack of active control group is a concern.`, topic: 'Neuroscience', type: 'resource', authorId: 'u_demo3', upvotes: 445, commentCount: 28, createdAt: new Date(Date.now() - 5*24*3600000).toISOString() },
      { title: 'CBT helped my OCD but I feel like a robot now?', body: `Six months into ERP (exposure and response prevention) and my compulsions are down about 70%. Objectively huge success. But I feel emotionally flat? Like I've learned to "override" my anxiety responses and now I'm overriding everything.\n\nHas anyone else experienced this? My therapist says it's normal and will pass, but it's unsettling. I almost miss feeling things intensely — even the bad things felt *real*.`, topic: 'OCD', type: 'question', authorId: 'u_demo4', upvotes: 178, commentCount: 42, createdAt: new Date(Date.now() - 3*24*3600000).toISOString() },
      { title: 'Resources for understanding childhood trauma and the nervous system', body: `Compiled this list after years of reading. These are the resources I actually recommend:\n\n**Books:**\n- *The Body Keeps the Score* — Bessel van der Kolk\n- *Waking the Tiger* — Peter Levine\n- *Adult Children of Emotionally Immature Parents* — Lindsay Gibson\n\n**Research:**\n- ACE (Adverse Childhood Experiences) study findings\n- Polyvagal Theory — Stephen Porges\n\n**For therapists looking for tools:**\n- EMDR Institute resources\n- Sensorimotor Psychotherapy training materials\n\nFeel free to add your own in the comments.`, topic: 'Trauma & PTSD', type: 'resource', authorId: 'u_demo2', upvotes: 672, commentCount: 55, createdAt: new Date(Date.now() - 7*24*3600000).toISOString() },
      { title: 'Is "quiet BPD" a real thing or just a label?', body: `I keep seeing "quiet BPD" discussed online as a distinct presentation of borderline personality disorder where rage is turned inward rather than outward. But I can't find much peer-reviewed literature on it as a formal subtype.\n\nFrom a clinical standpoint — is this a useful construct? My concern is that people are self-diagnosing with something that doesn't have a strong evidence base, which could delay them getting the right treatment (DBT, schema therapy).`, topic: 'Personality', type: 'question', authorId: 'u_demo2', upvotes: 334, commentCount: 61, createdAt: new Date(Date.now() - 4*24*3600000).toISOString() },
      { title: 'Grief is not linear — my experience 2 years after losing my dad', body: `I know everyone says grief isn't linear but I didn't really understand what that meant until month 18. I thought I was "done" — I'd done the crying, the anger, the acceptance. Then one random Tuesday I heard his ringtone on someone else's phone and completely fell apart.\n\nI'm not writing this for advice. I just want others who are earlier in grief to know: the unexpected waves don't mean you're going backwards. They mean you loved someone.`, topic: 'Grief & Loss', type: 'support', authorId: 'u_demo4', upvotes: 2103, commentCount: 114, createdAt: new Date(Date.now() - 6*24*3600000).toISOString() },
    ];

    demoPosts.forEach(p => {
      const id = 'p_seed_' + Math.random().toString(36).slice(2,9);
      const postIndex = Object.keys(this.posts).length;
      this.posts[id] = {
        id, voters: {}, _flaggers: {}, removed: false, flagged: false, flagCount: 0,
        pinned: p.pinned || false, editedAt: null, downvotes: 0,
        status: 'approved', ghosted: false, deleted: false,
        internalComments: [], needsReviewReason: null,
        postKind: postIndex < 4 ? 'blog' : 'forum',
        ...p
      };
    });

    // Seed some demo comments
    const postIds = Object.keys(this.posts);
    const demoComments = [
      { postId: postIds[0], body: 'Yes! The nausea is real. I always thought it was just me being dramatic. What helped me was starting to distinguish between "excitement anxiety" and "dread anxiety" — they feel similar physiologically but respond differently to treatment.', authorId: 'u_demo2', upvotes: 47 },
      { postId: postIds[0], body: 'Same. My therapist called it "anticipatory anxiety" and said it\'s often worse than the event itself because your imagination fills in the worst-case scenario. We worked on reality-testing the feared outcomes.', authorId: 'u_demo4', upvotes: 31 },
      { postId: postIds[1], body: 'The point about suppression is so important and so underappreciated. I see so many clients who\'ve been told to "just push through it" — which is essentially suppression — and it reliably makes things worse medium-term.', authorId: 'u_demo2', upvotes: 89 },
      { postId: postIds[2], body: 'This resonates deeply. The "stories" piece especially — I spent years not realizing I was narrating my relationships through an anxious lens, which basically guaranteed I\'d find evidence for my worst fears.', authorId: 'u_demo3', upvotes: 156 },
    ];

    demoComments.forEach(c => {
      const id = 'c_seed_' + Math.random().toString(36).slice(2,9);
      this.comments[id] = {
        id, voters: {}, removed: false, parentId: null,
        createdAt: new Date(Date.now() - Math.random()*48*3600000).toISOString(),
        editedAt: null, ...c
      };
    });

    this._save();
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
