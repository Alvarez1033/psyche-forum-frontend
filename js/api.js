// ─── Psyche Forum — API Client ───────────────────────────────────────────────
const API_BASE = '/api';

const Auth = {
  getToken()   { return localStorage.getItem('psyche_access_token'); },
  getRefresh() { return localStorage.getItem('psyche_refresh_token'); },
  setTokens(access, refresh) {
    localStorage.setItem('psyche_access_token', access);
    if (refresh) localStorage.setItem('psyche_refresh_token', refresh);
  },
  clear() {
    localStorage.removeItem('psyche_access_token');
    localStorage.removeItem('psyche_refresh_token');
    localStorage.removeItem('psyche_api_user');
  },
  getUser()    { try { return JSON.parse(localStorage.getItem('psyche_api_user') || 'null'); } catch { return null; } },
  setUser(u)   { localStorage.setItem('psyche_api_user', JSON.stringify(u)); },
  isLoggedIn() { return !!this.getToken() && !!this.getUser(); }
};

async function apiFetch(method, path, body, retry = true) {
  const headers = { 'Content-Type': 'application/json' };
  const token = Auth.getToken();
  if (token) headers['Authorization'] = 'Bearer ' + token;
  const opts = { method, headers };
  if (body && method !== 'GET') opts.body = JSON.stringify(body);
  const res = await fetch(API_BASE + path, opts);
  if (res.status === 401 && retry && Auth.getRefresh()) {
    const r = await fetch(API_BASE + '/auth/refresh', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: Auth.getRefresh() })
    });
    if (r.ok) {
      const d = await r.json();
      Auth.setTokens(d.accessToken, d.refreshToken);
      if (d.user) Auth.setUser(d.user);
      return apiFetch(method, path, body, false);
    }
    Auth.clear();
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

const PsycheAPI = {
  // Auth
  async signup(username, email, password, name) {
    const d = await apiFetch('POST', '/auth/signup', { username, email, password, name });
    Auth.setTokens(d.accessToken, d.refreshToken);
    Auth.setUser(d.user);
    return d;
  },
  async login(email, password) {
    const d = await apiFetch('POST', '/auth/login', { email, password });
    Auth.setTokens(d.accessToken, d.refreshToken);
    Auth.setUser(d.user);
    return d;
  },
  logout() { Auth.clear(); },
  async me() { return apiFetch('GET', '/users/me'); },

  // Users
  async getUser(username) { return apiFetch('GET', '/users/' + encodeURIComponent(username)); },
  async updateProfile(data) {
    const d = await apiFetch('PATCH', '/users/me', data);
    if (d.user) Auth.setUser(d.user);
    return d;
  },

  // Posts
  async getPosts(params = {}) {
    const qs = Object.entries(params).filter(([,v]) => v).map(([k,v]) => k+'='+encodeURIComponent(v)).join('&');
    return apiFetch('GET', '/posts' + (qs ? '?' + qs : ''));
  },
  async getPost(id) { return apiFetch('GET', '/posts/' + id); },
  async createPost(data) { return apiFetch('POST', '/posts', data); },
  async updatePostStatus(id, status) { return apiFetch('PATCH', '/posts/' + id + '/status', { status }); },
  async vote(postId, voteType) { return apiFetch('POST', '/posts/' + postId + '/vote', { vote_type: voteType }); },
  async deletePost(id) { return apiFetch('DELETE', '/posts/' + id); },
  async getPending() { return apiFetch('GET', '/posts/pending'); },

  // Comments
  async getComments(postId) { return apiFetch('GET', '/comments/post/' + postId); },
  async createComment(postId, body, parentId) { return apiFetch('POST', '/comments', { post_id: postId, body, parent_id: parentId }); },
  async deleteComment(id) { return apiFetch('DELETE', '/comments/' + id); },

  // Topics
  async getTopics() { return apiFetch('GET', '/topics'); },

  // Search
  async search(q) { return apiFetch('GET', '/search?q=' + encodeURIComponent(q)); },

  // Tickets
  async getTickets() { return apiFetch('GET', '/tickets'); },
  async createTicket(data) { return apiFetch('POST', '/tickets', data); },
  async updateTicketStatus(id, status) { return apiFetch('PATCH', '/tickets/' + id + '/status', { status }); },
  async assignTicket(id) { return apiFetch('PATCH', '/tickets/' + id + '/assign'); },
  async getTicketReplies(id) { return apiFetch('GET', '/tickets/' + id + '/replies'); },
  async replyToTicket(id, body, isInternal) { return apiFetch('POST', '/tickets/' + id + '/replies', { body, is_internal: isInternal }); },

  // Admin
  async adminStats() { return apiFetch('GET', '/admin/stats'); },
  async adminUsers(params = {}) {
    const qs = Object.entries(params).filter(([,v]) => v).map(([k,v]) => k+'='+encodeURIComponent(v)).join('&');
    return apiFetch('GET', '/admin/users' + (qs ? '?' + qs : ''));
  },
  async adminSetRole(userId, role, reason) { return apiFetch('PATCH', '/admin/users/' + userId + '/role', { role, reason }); },
  async adminBan(userId, banned, reason) { return apiFetch('PATCH', '/admin/users/' + userId + '/ban', { banned, reason }); },
  async adminModeratePost(postId, action) { return apiFetch('PATCH', '/admin/posts/' + postId + '/moderate', { action }); },
};

console.log('[Psyche] API client loaded. Backend connected.');

// Alias for storage.js compatibility
const API = {
  signup: (data) => PsycheAPI.signup(data.username, data.email, data.password, data.name),
  login: (email, password) => PsycheAPI.login(email, password),
  logout: () => { PsycheAPI.logout(); return Promise.resolve(); },
  me: async () => { const d = await PsycheAPI.me(); return d.user; },
  updateProfile: (data) => PsycheAPI.updateProfile(data),
  setUserRole: (userId, role, reason) => PsycheAPI.adminSetRole(userId, role, reason),
  setUserBan: (userId, banned, reason) => PsycheAPI.adminBan(userId, banned, reason),
  getPosts: (params) => PsycheAPI.getPosts(params),
  getPost: (id) => PsycheAPI.getPost(id),
  createPost: (data) => PsycheAPI.createPost(data),
  vote: (postId, type) => PsycheAPI.vote(postId, type),
  getComments: (postId) => PsycheAPI.getComments(postId),
  createComment: (postId, body, parentId) => PsycheAPI.createComment(postId, body, parentId),
  search: (q) => PsycheAPI.search(q),
  getTopics: () => PsycheAPI.getTopics(),
};
