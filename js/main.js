/* ============================================================
   PSYCHE — Main JS
   ============================================================ */

// ---- THEME TOGGLE ----
(function () {
  const html = document.documentElement;
  let theme = matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  html.setAttribute('data-theme', theme);

  function updateToggleIcon(btn, t) {
    if (!btn) return;
    if (t === 'dark') {
      btn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>`;
      btn.setAttribute('aria-label', 'Switch to light mode');
    } else {
      btn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`;
      btn.setAttribute('aria-label', 'Switch to dark mode');
    }
  }

  window.initThemeToggle = function () {
    const btn = document.querySelector('[data-theme-toggle]');
    updateToggleIcon(btn, theme);
    if (btn) {
      btn.addEventListener('click', () => {
        theme = theme === 'dark' ? 'light' : 'dark';
        html.setAttribute('data-theme', theme);
        updateToggleIcon(btn, theme);
      });
    }
  };
})();

// ---- HEADER SCROLL BEHAVIOR ----
function initHeader() {
  const header = document.querySelector('.site-header');
  if (!header) return;
  let lastY = 0;
  window.addEventListener('scroll', () => {
    const y = window.scrollY;
    if (y > 20) header.classList.add('site-header--scrolled');
    else header.classList.remove('site-header--scrolled');
    lastY = y;
  }, { passive: true });
}

// ---- SCROLL FADE-IN ANIMATIONS ----
function initScrollAnimations() {
  const els = document.querySelectorAll('.fade-in');
  if (!els.length) return;
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('visible');
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.05, rootMargin: '0px 0px 0px 0px' });
  els.forEach(el => {
    const rect = el.getBoundingClientRect();
    // Immediately show elements already in viewport
    if (rect.top < window.innerHeight && rect.bottom > 0) {
      el.classList.add('visible');
    } else {
      io.observe(el);
    }
  });
}

// ---- UPVOTE TOGGLE ----
function initUpvotes() {
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-upvote]');
    if (!btn) return;
    const isVoted = btn.classList.contains('post-action-btn--upvoted');
    const countEl = btn.querySelector('[data-vote-count]');
    let count = parseInt(countEl?.textContent || '0');
    if (isVoted) {
      btn.classList.remove('post-action-btn--upvoted');
      count--;
    } else {
      btn.classList.add('post-action-btn--upvoted');
      count++;
      showToast('Post upvoted');
    }
    if (countEl) countEl.textContent = count;
  });
}

// ---- TOPIC PILLS FILTER ----
function initTopicPills() {
  document.querySelectorAll('.topic-pills').forEach(container => {
    container.querySelectorAll('.topic-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        container.querySelectorAll('.topic-pill').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
      });
    });
  });
}

// ---- SORT BUTTONS ----
function initSortButtons() {
  document.querySelectorAll('.comments-sort').forEach(container => {
    container.querySelectorAll('.sort-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        container.querySelectorAll('.sort-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      });
    });
  });
}

// ---- COMMUNITY JOIN BUTTONS ----
function initJoinButtons() {
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.community-join-btn');
    if (!btn) return;
    if (btn.textContent.trim() === 'Join') {
      btn.textContent = 'Joined';
      btn.style.background = 'var(--color-primary)';
      btn.style.color = 'white';
      showToast('Joined community!');
    } else {
      btn.textContent = 'Join';
      btn.style.background = '';
      btn.style.color = '';
    }
  });
}

// ---- COMMENT COMPOSE ----
function initCommentCompose() {
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.compose-submit');
    if (!btn) return;
    const form = btn.closest('.comment-compose');
    if (!form) return;
    const textarea = form.querySelector('.compose-input');
    const text = textarea?.value.trim();
    if (!text) {
      showToast('Please write something first');
      return;
    }
    textarea.value = '';
    showToast('Comment posted!');
    // Inject new comment at top of thread
    const thread = document.querySelector('.comment-thread');
    if (thread) {
      const newComment = document.createElement('div');
      newComment.className = 'comment fade-in';
      newComment.innerHTML = `
        <div class="comment-avatar" style="background:var(--color-primary-highlight);color:var(--color-primary);">Y</div>
        <div class="comment-content">
          <div class="comment-header">
            <span class="comment-author">You</span>
            <span class="comment-time">just now</span>
          </div>
          <p class="comment-body">${escapeHtml(text)}</p>
          <div class="comment-actions">
            <button class="comment-action" data-upvote>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 19V5M5 12l7-7 7 7"/></svg>
              <span data-vote-count>0</span>
            </button>
            <button class="comment-action">Reply</button>
          </div>
        </div>`;
      thread.insertBefore(newComment, thread.firstChild);
      setTimeout(() => newComment.classList.add('visible'), 10);
    }
  });
}

// ---- TOAST ----
function showToast(msg) {
  let toast = document.querySelector('.toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => toast.classList.remove('show'), 2500);
}

// ---- MOBILE NAV ----
function initMobileNav() {
  const toggle = document.querySelector('.nav-mobile-toggle');
  const nav = document.querySelector('.mobile-nav');
  const overlay = nav?.querySelector('.mobile-nav-overlay');
  const closeBtn = nav?.querySelector('.mobile-nav-close');

  if (!toggle || !nav) return;

  toggle.addEventListener('click', () => nav.classList.add('open'));
  overlay?.addEventListener('click', () => nav.classList.remove('open'));
  closeBtn?.addEventListener('click', () => nav.classList.remove('open'));
  nav.querySelectorAll('a').forEach(a => a.addEventListener('click', () => nav.classList.remove('open')));
}

// ---- PAGE NAVIGATION ----
function initPageNavigation() {
  // Handle all navigation links
  document.addEventListener('click', (e) => {
    const link = e.target.closest('[data-page]');
    if (!link) return;
    e.preventDefault();
    const target = link.dataset.page;
    navigateTo(target);
  });
}

function navigateTo(pageId) {
  // Hide all pages
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  // Show target
  const page = document.getElementById(pageId);
  if (page) {
    page.classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    // Re-run animations for new page
    setTimeout(initScrollAnimations, 50);
  }
  // Update active nav link
  document.querySelectorAll('.nav-links a, .mobile-nav-links a').forEach(a => {
    a.classList.toggle('active', a.dataset.page === pageId);
  });
  // Render profile/settings pages if navigating to them (profile.js handles these)
  // Dynamic forum pages only — home/topics/article stay as original static HTML
  if (pageId === 'page-forum'    && typeof renderForumPage      === 'function') renderForumPage();
  if (pageId === 'page-post'     && typeof renderPostDetailPage === 'function') renderPostDetailPage();
  if (pageId === 'page-profile'  && typeof renderProfilePage    === 'function') renderProfilePage();
  if (pageId === 'page-settings' && typeof renderSettingsPage   === 'function') renderSettingsPage();
  if (pageId === 'page-admin'    && typeof renderAdminPage      === 'function') renderAdminPage();
  if (pageId === 'page-shop'     && typeof renderShopPage       === 'function') renderShopPage();
  if (pageId === 'page-tickets'  && typeof renderTicketPortal  === 'function') renderTicketPortal();
}

// ---- SEARCH HERO ----
function initHeroSearch() {
  const form = document.querySelector('.hero-search');
  if (!form) return;
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const val = form.querySelector('input')?.value.trim();
    if (val) showToast(`Searching for "${val}"…`);
  });
  const btn = form.querySelector('button');
  btn?.addEventListener('click', () => {
    const val = form.querySelector('input')?.value.trim();
    if (val) showToast(`Searching for "${val}"…`);
  });
}

// ---- ARTICLE READ MORE ----
function initArticleLinks() {
  document.addEventListener('click', (e) => {
    const card = e.target.closest('[data-go-article]');
    if (!card) return;
    navigateTo('page-article');
  });
}

// ---- ESCAPE HTML ----
function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ---- INIT ALL ----
document.addEventListener('DOMContentLoaded', () => {
  initThemeToggle();
  initHeader();
  initScrollAnimations();
  initUpvotes();
  initTopicPills();
  initSortButtons();
  initJoinButtons();
  initCommentCompose();
  initMobileNav();
  initPageNavigation();
  initHeroSearch();
  initArticleLinks();

  // Helpdesk bar
  document.getElementById('hd-submit-ticket')?.addEventListener('click', () => {
    if (typeof openNewTicketModal === 'function') openNewTicketModal();
  });
  document.getElementById('hd-my-tickets')?.addEventListener('click', () => {
    navigateTo('page-tickets');
  });
  document.getElementById('hd-whats-new')?.addEventListener('click', () => {
    if (typeof openChangelogModal === 'function') openChangelogModal();
  });
  document.getElementById('footer-submit-ticket')?.addEventListener('click', e => {
    e.preventDefault();
    if (typeof openNewTicketModal === 'function') openNewTicketModal();
  });

  // Show home page by default
  navigateTo('page-home');

});
