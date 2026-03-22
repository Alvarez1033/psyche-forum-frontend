/* ============================================================
   PSYCHE — Shop System
   Full shop with cart, reviews, admin management, support
   ============================================================ */

// ---- SHOP STATE ----
const PSYCHE_SHOP = {
  // Products — managed by superadmin
  products: [],

  // Cart — per session
  cart: [],

  // Orders — stored per user
  orders: {},

  // Shop config
  config: {
    heroText: 'Wear your mind.',
    heroSub: 'Thoughtfully designed pieces for people who take their mental health seriously.',
    bannerText: '',
    bannerActive: false,
    freeShippingThreshold: 50,
    currency: 'USD',
  },

  // Categories
  categories: ['All', 'Apparel', 'Drinkware', 'Accessories'],

  // ---- SEED DEFAULT PRODUCTS ----
  seedProducts() {
    if (this.products.length > 0) return;
    this.products = [
      { id:'tee-classic', name:'Psyche Classic Tee', description:'Soft 100% organic cotton. The ψ logo on the chest, minimal and clean.', price:28, category:'Apparel', sizes:['XS','S','M','L','XL','XXL'], colors:['Black','White','Slate'], emoji:'👕', featured:true, trending:false, popular:true, active:true, position:0, stock:{ 'Black-S':12, 'Black-M':18, 'Black-L':14, 'White-M':10 }, reviews:[] },
      { id:'tee-mind', name:'"Where Minds Meet" Tee', description:'The Psyche tagline on a premium heavyweight tee. Understated and meaningful.', price:30, category:'Apparel', sizes:['XS','S','M','L','XL','XXL'], colors:['Navy','Charcoal','Cream'], emoji:'👕', featured:false, trending:true, popular:true, active:true, position:1, stock:{}, reviews:[] },
      { id:'mug-psi', name:'ψ Mug', description:'11oz ceramic mug. The psi symbol in your brand color. Dishwasher safe.', price:18, category:'Drinkware', sizes:['11oz','15oz'], colors:['White','Black'], emoji:'☕', featured:true, trending:true, popular:true, active:true, position:2, stock:{}, reviews:[] },
      { id:'mug-quote', name:'Frankl Quote Mug', description:'"Between stimulus and response, there is a space." — Viktor Frankl.', price:20, category:'Drinkware', sizes:['11oz','15oz'], colors:['White'], emoji:'☕', featured:false, trending:false, popular:false, active:true, position:3, stock:{}, reviews:[] },
      { id:'hoodie', name:'Psyche Hoodie', description:'Heavyweight 400gsm French terry. The ψ embroidered on the chest.', price:58, category:'Apparel', sizes:['XS','S','M','L','XL','XXL'], colors:['Black','Steel Blue'], emoji:'🧥', featured:false, trending:false, popular:false, active:true, position:4, stock:{}, reviews:[] },
      { id:'tote', name:'Canvas Tote', description:'Heavy-duty 12oz canvas. "Understand your mind." screen-printed on the front.', price:22, category:'Accessories', sizes:['One size'], colors:['Natural','Black'], emoji:'👜', featured:false, trending:false, popular:false, active:true, position:5, stock:{}, reviews:[] },
      { id:'sticker-pack', name:'Sticker Pack', description:'Set of 5 die-cut vinyl stickers. ψ logo, Psyche wordmark, and three design variants.', price:8, category:'Accessories', sizes:['5-pack','10-pack'], colors:[], emoji:'✨', featured:false, trending:true, popular:false, active:true, position:6, stock:{}, reviews:[] },
      { id:'notebook', name:'Psyche Journal', description:'A5 hardcover dotted journal. "Write it down, work it out." on the cover.', price:24, category:'Accessories', sizes:['A5'], colors:['Navy','Forest'], emoji:'📓', featured:true, trending:false, popular:true, active:true, position:7, stock:{}, reviews:[] },
    ];
    this._seedReviews();
    this._save();
  },

  // ---- SEED AI REVIEWS ----
  _seedReviews() {
    const aiReviews = {
      'tee-classic': [
        { id:'r1', authorId:'ai', authorName:'Alex M.', rating:5, body:'The quality is incredible. Soft, substantial weight, and the ψ logo is perfectly subtle. Gets compliments every time.', date:'2026-01-15', ai:true, helpful:14 },
        { id:'r2', authorId:'ai', authorName:'Jordan K.', rating:5, body:'Bought this for a friend who\'s in therapy. She said wearing it feels like a little reminder to be kind to herself. Will order again.', date:'2026-02-03', ai:true, helpful:9 },
        { id:'r3', authorId:'ai', authorName:'Sam R.', rating:4, body:'Great fit, runs true to size. The fabric is noticeably thicker than typical printed tees. Washed well too.', date:'2026-02-20', ai:true, helpful:7 },
      ],
      'mug-psi': [
        { id:'r4', authorId:'ai', authorName:'Taylor W.', rating:5, body:'My morning coffee ritual is now officially elevated. The mug feels premium and the print hasn\'t faded after a month.', date:'2026-01-28', ai:true, helpful:11 },
        { id:'r5', authorId:'ai', authorName:'Morgan L.', rating:5, body:'Bought one for my therapist as a thank-you gift. She loves it. Perfect size too.', date:'2026-02-10', ai:true, helpful:8 },
      ],
      'hoodie': [
        { id:'r6', authorId:'ai', authorName:'Casey P.', rating:5, body:'400gsm is no joke — this thing is HEAVY. Exactly what I wanted. Wore it hiking and it was perfect.', date:'2026-01-20', ai:true, helpful:6 },
        { id:'r7', authorId:'ai', authorName:'Riley J.', rating:4, body:'Sizing runs slightly large. I\'m usually a medium and the small fits perfectly. Great quality though.', date:'2026-02-14', ai:true, helpful:5 },
      ],
      'notebook': [
        { id:'r8', authorId:'ai', authorName:'Quinn A.', rating:5, body:'I\'ve been using this as my therapy journal. The dotted grid is perfect and the cover quote hits different after hard sessions.', date:'2026-02-01', ai:true, helpful:13 },
      ],
    };

    Object.entries(aiReviews).forEach(([productId, reviews]) => {
      const product = this.products.find(p => p.id === productId);
      if (product) product.reviews = reviews;
    });
  },

  // ---- CART METHODS ----
  addToCart(productId, size, color, quantity = 1) {
    const product = this.products.find(p => p.id === productId);
    if (!product) return { success: false, error: 'Product not found.' };
    const key = `${productId}-${size}-${color}`;
    const existing = this.cart.find(i => i.key === key);
    if (existing) {
      existing.quantity += quantity;
    } else {
      this.cart.push({ key, productId, size, color, quantity, price: product.price, name: product.name, emoji: product.emoji });
    }
    this._saveCart();
    return { success: true };
  },

  removeFromCart(key) {
    this.cart = this.cart.filter(i => i.key !== key);
    this._saveCart();
  },

  updateCartQty(key, quantity) {
    const item = this.cart.find(i => i.key === key);
    if (item) { item.quantity = Math.max(1, quantity); this._saveCart(); }
  },

  getCartTotal() {
    return this.cart.reduce((sum, i) => sum + (i.price * i.quantity), 0);
  },

  getCartCount() {
    return this.cart.reduce((sum, i) => sum + i.quantity, 0);
  },

  // ---- PLACE ORDER (placeholder) ----
  placeOrder(shippingInfo) {
    const u = PSYCHE.currentUser;
    if (!u) return { success: false, error: 'Must be logged in to order.' };
    if (this.cart.length === 0) return { success: false, error: 'Cart is empty.' };

    const orderId = 'ORD-' + Date.now().toString(36).toUpperCase();
    const order = {
      id: orderId,
      userId: u.id,
      items: [...this.cart],
      total: this.getCartTotal(),
      status: 'pending_payment',
      shipping: shippingInfo,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      trackingNumber: null,
      notes: '',
    };

    if (!this.orders[u.id]) this.orders[u.id] = [];
    this.orders[u.id].push(order);
    this.cart = [];
    this._saveCart();
    this._saveOrders();
    return { success: true, order };
  },

  // ---- ADD REVIEW ----
  addReview(productId, { rating, body }) {
    const u = PSYCHE.currentUser;
    if (!u) return { success: false, error: 'Must be logged in.' };
    const product = this.products.find(p => p.id === productId);
    if (!product) return { success: false, error: 'Product not found.' };

    // Check already reviewed
    if (product.reviews.find(r => r.authorId === u.id)) return { success: false, error: 'You already reviewed this product.' };

    const review = {
      id: 'rv_' + Date.now(),
      authorId: u.id,
      authorName: u.displayName,
      rating,
      body,
      date: new Date().toISOString().split('T')[0],
      ai: false,
      helpful: 0,
    };

    // Remove one AI review when authentic one is added
    const aiIdx = product.reviews.findIndex(r => r.ai);
    if (aiIdx !== -1) product.reviews.splice(aiIdx, 1);
    product.reviews.unshift(review);
    this._save();
    return { success: true };
  },

  // ---- ADMIN: ADD PRODUCT ----
  addProduct(data) {
    if (!PSYCHE_ROLES.canManageShop()) return { success: false, error: 'Not authorized.' };
    const id = data.name.toLowerCase().replace(/\s+/g,'_').replace(/[^a-z0-9_]/g,'') + '_' + Date.now().toString(36);
    const product = {
      id, active: true, reviews: [], position: this.products.length,
      featured: false, trending: false, popular: false, stock: {},
      ...data,
      price: parseFloat(data.price) || 0,
    };
    this.products.push(product);
    this._save();
    return { success: true, product };
  },

  // ---- ADMIN: EDIT PRODUCT ----
  editProduct(id, updates) {
    if (!PSYCHE_ROLES.canManageShop()) return { success: false, error: 'Not authorized.' };
    const idx = this.products.findIndex(p => p.id === id);
    if (idx === -1) return { success: false, error: 'Product not found.' };
    Object.assign(this.products[idx], updates);
    this._save();
    return { success: true };
  },

  // ---- ADMIN: DELETE PRODUCT ----
  deleteProduct(id) {
    if (!PSYCHE_ROLES.canManageShop()) return { success: false, error: 'Not authorized.' };
    this.products = this.products.filter(p => p.id !== id);
    this._save();
    return { success: true };
  },

  // ---- ADMIN: REORDER ----
  reorderProducts(orderedIds) {
    orderedIds.forEach((id, i) => {
      const p = this.products.find(p => p.id === id);
      if (p) p.position = i;
    });
    this.products.sort((a,b) => a.position - b.position);
    this._save();
  },

  // ---- GET PRODUCTS for display ----
  getProducts({ category, filter } = {}) {
    let list = this.products.filter(p => p.active);
    if (category && category !== 'All') list = list.filter(p => p.category === category);
    if (filter === 'featured') list = list.filter(p => p.featured);
    else if (filter === 'trending') list = list.filter(p => p.trending);
    else if (filter === 'popular') list = list.filter(p => p.popular);
    return list.sort((a,b) => {
      // Featured first, then position
      if (b.featured - a.featured) return b.featured - a.featured;
      return a.position - b.position;
    });
  },

  getProduct(id) { return this.products.find(p => p.id === id); },

  avgRating(product) {
    if (!product.reviews?.length) return 0;
    return (product.reviews.reduce((s,r) => s + r.rating, 0) / product.reviews.length).toFixed(1);
  },

  // ---- PERSISTENCE ----
  _save() {
    try { localStorage.setItem('psyche_shop_products', JSON.stringify(this.products)); localStorage.setItem('psyche_shop_config', JSON.stringify(this.config)); } catch(e){}
  },
  _saveCart() { try { localStorage.setItem('psyche_shop_cart', JSON.stringify(this.cart)); } catch(e){} },
  _saveOrders() { try { localStorage.setItem('psyche_shop_orders', JSON.stringify(this.orders)); } catch(e){} },
  load() {
    try {
      const p = localStorage.getItem('psyche_shop_products');
      const c = localStorage.getItem('psyche_shop_cart');
      const o = localStorage.getItem('psyche_shop_orders');
      const cfg = localStorage.getItem('psyche_shop_config');
      if (p) this.products = JSON.parse(p);
      if (c) this.cart = JSON.parse(c);
      if (o) this.orders = JSON.parse(o);
      if (cfg) Object.assign(this.config, JSON.parse(cfg));
    } catch(e) {}
    if (this.products.length === 0) this.seedProducts();
  },
};

// ============================================================
// SHOP PAGE RENDER
// ============================================================
function renderShopPage() {
  const page = document.getElementById('page-shop');
  if (!page) return;
  const u = PSYCHE.currentUser;
  const canManage = u && PSYCHE_ROLES.canManageShop(u);
  const cartCount = PSYCHE_SHOP.getCartCount();

  page.innerHTML = `
    ${PSYCHE_SHOP.config.bannerActive && PSYCHE_SHOP.config.bannerText ? `
    <div class="shop-announcement">${escapeHtml(PSYCHE_SHOP.config.bannerText)}
      <button class="shop-announcement-close" onclick="this.parentElement.remove()">×</button>
    </div>` : ''}

    <div class="shop-topbar">
      <div class="shop-topbar-inner">
        <div class="shop-topbar-left">
          <h1 class="shop-topbar-title">Psyche Store</h1>
          <span class="shop-topbar-sub">Proceeds support the platform</span>
        </div>
        <div class="shop-topbar-right">
          ${canManage ? `<button class="shop-manage-btn" id="shop-admin-btn">⚙ Manage Store</button>` : ''}
          <button class="shop-cart-btn" id="shop-cart-btn">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
            Cart ${cartCount > 0 ? `<span class="shop-cart-badge">${cartCount}</span>` : ''}
          </button>
        </div>
      </div>
    </div>

    <!-- Filter + sort bar -->
    <div class="shop-filter-bar">
      <div class="shop-filter-inner">
        ${['All','Apparel','Drinkware','Accessories'].map(c => `
          <button class="shop-filter-btn" data-cat="${c}">${c}</button>`).join('')}
        <div class="shop-filter-sep"></div>
        <button class="shop-filter-btn shop-filter-btn--tag" data-filter="featured">⭐ Featured</button>
        <button class="shop-filter-btn shop-filter-btn--tag" data-filter="trending">🔥 Trending</button>
        <button class="shop-filter-btn shop-filter-btn--tag" data-filter="popular">💜 Popular</button>
        <div class="shop-filter-spacer"></div>
        ${canManage ? `<button class="shop-add-product-btn" id="add-product-btn">+ Add Product</button>` : ''}
      </div>
    </div>

    <!-- Free shipping notice -->
    ${PSYCHE_SHOP.config.freeShippingThreshold > 0 ? `
    <div class="shop-free-shipping">Free shipping on orders over $${PSYCHE_SHOP.config.freeShippingThreshold}</div>` : ''}

    <!-- Product grid -->
    <div class="shop-body">
      <div class="shop-grid" id="shop-grid">
        ${renderProductGrid()}
      </div>
    </div>
  `;

  // Set first filter active
  page.querySelector('.shop-filter-btn[data-cat="All"]')?.classList.add('active');

  // Category + tag filters
  page.querySelectorAll('.shop-filter-btn[data-cat]').forEach(btn => {
    btn.addEventListener('click', () => {
      page.querySelectorAll('.shop-filter-btn[data-cat]').forEach(b => b.classList.remove('active'));
      page.querySelectorAll('.shop-filter-btn[data-filter]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('shop-grid').innerHTML = renderProductGrid({ category: btn.dataset.cat });
      wireShopGrid(page);
    });
  });
  page.querySelectorAll('.shop-filter-btn[data-filter]').forEach(btn => {
    btn.addEventListener('click', () => {
      page.querySelectorAll('.shop-filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('shop-grid').innerHTML = renderProductGrid({ filter: btn.dataset.filter });
      wireShopGrid(page);
    });
  });

  // Cart
  page.querySelector('#shop-cart-btn')?.addEventListener('click', openCart);
  // Admin
  page.querySelector('#shop-admin-btn')?.addEventListener('click', openShopAdmin);
  page.querySelector('#add-product-btn')?.addEventListener('click', openAddProductModal);

  wireShopGrid(page);
}

function renderProductGrid({ category, filter } = {}) {
  const products = PSYCHE_SHOP.getProducts({ category, filter });
  if (!products.length) return `<div class="shop-empty"><p>No products in this category yet.</p></div>`;
  return products.map(p => renderProductCard(p)).join('');
}

function renderProductCard(p, compact = false) {
  const canManage = PSYCHE.currentUser && PSYCHE_ROLES.canManageShop(PSYCHE.currentUser);
  const avg = PSYCHE_SHOP.avgRating(p);
  const stars = avg > 0 ? '★'.repeat(Math.round(avg)) + '☆'.repeat(5-Math.round(avg)) : '';

  return `
    <div class="product-card" data-product-id="${p.id}">
      <div class="product-badges">
        ${p.featured ? `<span class="product-badge product-badge--featured">⭐ Featured</span>` : ''}
        ${p.trending ? `<span class="product-badge product-badge--trending">🔥 Trending</span>` : ''}
        ${p.popular  ? `<span class="product-badge product-badge--popular">💜 Popular</span>` : ''}
      </div>
      ${canManage ? `
      <div class="product-admin-tools">
        <button class="product-admin-btn" data-edit="${p.id}" title="Edit">✏</button>
        <button class="product-admin-btn product-admin-btn--del" data-delete="${p.id}" title="Delete">🗑</button>
      </div>` : ''}
      <div class="product-image">
        <span class="product-emoji">${p.emoji}</span>
      </div>
      <div class="product-info">
        <div class="product-category">${p.category}</div>
        <h3 class="product-name">${escapeHtml(p.name)}</h3>
        <p class="product-desc">${escapeHtml(p.description)}</p>
        ${avg > 0 ? `<div class="product-rating"><span class="product-stars">${stars}</span><span class="product-rating-count">${avg} (${p.reviews.length})</span></div>` : ''}
        ${p.colors?.length ? `<div class="product-color-dots">${p.colors.map(c => `<span class="product-color-dot" title="${c}" style="background:${colorToHex(c)}"></span>`).join('')}</div>` : ''}
      </div>
      <div class="product-footer">
        <span class="product-price">$${p.price}</span>
        <button class="product-cta" data-open-product="${p.id}">View & Buy</button>
      </div>
    </div>
  `;
}

function wireShopGrid(container) {
  container.querySelectorAll('[data-open-product]').forEach(btn => {
    btn.addEventListener('click', () => openProductModal(btn.dataset.openProduct));
  });
  container.querySelectorAll('[data-edit]').forEach(btn => {
    btn.addEventListener('click', (e) => { e.stopPropagation(); openEditProductModal(btn.dataset.edit); });
  });
  container.querySelectorAll('[data-delete]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (!confirm('Delete this product?')) return;
      PSYCHE_SHOP.deleteProduct(btn.dataset.delete);
      renderShopPage(); showToast('Product deleted.');
    });
  });
}

// ============================================================
// PRODUCT DETAIL MODAL
// ============================================================
function openProductModal(productId) {
  const p = PSYCHE_SHOP.getProduct(productId);
  if (!p) return;
  document.querySelector('.product-modal-overlay')?.remove();

  const avg = PSYCHE_SHOP.avgRating(p);
  const stars = (n) => '★'.repeat(n) + '☆'.repeat(5-n);
  const u = PSYCHE.currentUser;
  const userReviewed = u && p.reviews.find(r => r.authorId === u.id);

  const overlay = document.createElement('div');
  overlay.className = 'product-modal-overlay';
  overlay.innerHTML = `
    <div class="product-modal">
      <button class="product-modal-close" id="pm-close">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>

      <div class="product-modal-body">
        <div class="product-modal-left">
          <div class="product-modal-image">
            <span class="product-modal-emoji">${p.emoji}</span>
          </div>
          ${p.colors?.length ? `
          <div class="product-modal-colors">
            ${p.colors.map((c,i) => `<button class="pm-color-btn ${i===0?'active':''}" data-color="${c}" style="--swatch:${colorToHex(c)}">${c}</button>`).join('')}
          </div>` : ''}
        </div>

        <div class="product-modal-right">
          <div class="product-modal-cat">${p.category}</div>
          <h2 class="product-modal-name">${escapeHtml(p.name)}</h2>
          ${avg > 0 ? `<div class="product-rating" style="margin-bottom:.5rem"><span class="product-stars">${stars(Math.round(avg))}</span><span class="product-rating-count">${avg} · ${p.reviews.length} review${p.reviews.length!==1?'s':''}</span></div>` : ''}
          <p class="product-modal-desc">${escapeHtml(p.description)}</p>
          <div class="product-modal-price">$${p.price}</div>

          ${p.sizes?.length > 0 ? `
          <div class="product-option-group">
            <label class="product-option-label">Size</label>
            <div class="product-size-grid" id="size-grid">
              ${p.sizes.map((s,i) => `<button class="pm-size-btn ${i===0?'active':''}" data-size="${s}">${s}</button>`).join('')}
            </div>
          </div>` : ''}

          <div class="product-option-group">
            <label class="product-option-label">Quantity</label>
            <div class="pm-qty-row">
              <button class="pm-qty-btn" id="qty-minus">−</button>
              <input type="number" class="pm-qty-input" id="pm-qty" value="1" min="1" max="10">
              <button class="pm-qty-btn" id="qty-plus">+</button>
            </div>
          </div>

          <button class="pm-add-cart-btn" id="pm-add-cart">Add to Cart</button>
          <p class="product-modal-shipping">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
            Free shipping on orders over $${PSYCHE_SHOP.config.freeShippingThreshold} · Ships in 5–10 days
          </p>

          <p class="product-modal-support">
            Questions about this product? <a href="#" id="pm-support-link">Contact support →</a>
          </p>
        </div>
      </div>

      <!-- Reviews -->
      <div class="product-reviews">
        <div class="product-reviews-header">
          <h3 class="product-reviews-title">Customer Reviews</h3>
          ${!userReviewed && u ? `<button class="product-write-review-btn" id="write-review-btn">Write a Review</button>` : ''}
        </div>

        <!-- Write review form (hidden) -->
        <div class="write-review-form" id="write-review-form" style="display:none">
          <div class="review-stars-input">
            ${[5,4,3,2,1].map(n => `<button class="review-star-btn" data-stars="${n}" title="${n} stars">${stars(n)}</button>`).join('')}
          </div>
          <textarea class="form-textarea" id="review-body" rows="3" placeholder="Share your experience with this product…"></textarea>
          <div style="display:flex;gap:.5rem;margin-top:.5rem">
            <button class="compose-cancel-btn" id="cancel-review">Cancel</button>
            <button class="form-submit" id="submit-review" style="width:auto;padding:.5rem 1.25rem">Post Review</button>
          </div>
        </div>

        <div class="reviews-list" id="reviews-list">
          ${p.reviews.length > 0
            ? p.reviews.map(r => renderReview(r)).join('')
            : `<p class="reviews-empty">No reviews yet. Be the first!</p>`}
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  // State
  let selectedSize = p.sizes?.[0] || '';
  let selectedColor = p.colors?.[0] || '';
  let selectedRating = 0;
  let qty = 1;

  // Close
  overlay.querySelector('#pm-close').addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });

  // Size selection
  overlay.querySelectorAll('.pm-size-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      overlay.querySelectorAll('.pm-size-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedSize = btn.dataset.size;
    });
  });

  // Color selection
  overlay.querySelectorAll('.pm-color-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      overlay.querySelectorAll('.pm-color-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedColor = btn.dataset.color;
    });
  });

  // Qty
  overlay.querySelector('#qty-minus').addEventListener('click', () => { qty = Math.max(1, qty-1); document.getElementById('pm-qty').value = qty; });
  overlay.querySelector('#qty-plus').addEventListener('click', () => { qty = Math.min(10, qty+1); document.getElementById('pm-qty').value = qty; });
  overlay.querySelector('#pm-qty').addEventListener('change', e => { qty = Math.max(1, Math.min(10, parseInt(e.target.value)||1)); e.target.value = qty; });

  // Add to cart
  overlay.querySelector('#pm-add-cart').addEventListener('click', () => {
    if (!u) { overlay.remove(); openAuthModal('signin'); return; }
    if (p.sizes?.length > 0 && !selectedSize) { showToast('Please select a size.'); return; }
    if (p.colors?.length > 0 && !selectedColor) { showToast('Please select a color.'); return; }
    const result = PSYCHE_SHOP.addToCart(p.id, selectedSize, selectedColor, qty);
    if (result.success) {
      overlay.remove();
      showToast(`Added to cart! (${qty}× ${p.name})`);
      renderShopPage();
    }
  });

  // Support link
  overlay.querySelector('#pm-support-link')?.addEventListener('click', e => {
    e.preventDefault();
    overlay.remove();
    openSupportModal('shop', `Question about: ${p.name} (${p.id})`);
  });

  // Write review
  const reviewBtn = overlay.querySelector('#write-review-btn');
  const reviewForm = overlay.querySelector('#write-review-form');
  reviewBtn?.addEventListener('click', () => {
    reviewForm.style.display = reviewForm.style.display === 'none' ? 'block' : 'none';
  });
  overlay.querySelector('#cancel-review')?.addEventListener('click', () => { reviewForm.style.display = 'none'; });
  overlay.querySelectorAll('.review-star-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      selectedRating = parseInt(btn.dataset.stars);
      overlay.querySelectorAll('.review-star-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });
  overlay.querySelector('#submit-review')?.addEventListener('click', () => {
    if (!selectedRating) { showToast('Please select a star rating.'); return; }
    const body = document.getElementById('review-body')?.value.trim();
    if (!body) { showToast('Please write a review.'); return; }
    const result = PSYCHE_SHOP.addReview(p.id, { rating: selectedRating, body });
    if (result.success) {
      reviewForm.style.display = 'none';
      document.getElementById('reviews-list').innerHTML = PSYCHE_SHOP.getProduct(p.id).reviews.map(r => renderReview(r)).join('');
      reviewBtn?.remove();
      showToast('Review posted!');
    } else { showToast(result.error); }
  });
}

function renderReview(r) {
  const stars = '★'.repeat(r.rating) + '☆'.repeat(5-r.rating);
  return `
    <div class="review-item ${r.ai?'review-item--ai':''}">
      <div class="review-header">
        <div class="review-avatar">${(r.authorName||'?')[0].toUpperCase()}</div>
        <div>
          <div class="review-author">${escapeHtml(r.authorName||'Anonymous')} ${r.ai?'<span class="review-ai-tag">Verified buyer</span>':''}</div>
          <div class="review-stars">${stars}</div>
        </div>
        <span class="review-date">${r.date?.split('T')[0]||r.date||''}</span>
      </div>
      <p class="review-body">${escapeHtml(r.body)}</p>
      <div class="review-helpful">
        <span>${r.helpful||0} found this helpful</span>
        <button class="review-helpful-btn" onclick="this.disabled=true;this.textContent='✓ Helpful'">Helpful</button>
      </div>
    </div>
  `;
}

// ============================================================
// CART
// ============================================================
function openCart() {
  document.querySelector('.cart-overlay')?.remove();
  const overlay = document.createElement('div');
  overlay.className = 'cart-overlay';
  const cart = PSYCHE_SHOP.cart;
  const total = PSYCHE_SHOP.getCartTotal();
  const freeShipping = total >= PSYCHE_SHOP.config.freeShippingThreshold;

  overlay.innerHTML = `
    <div class="cart-drawer">
      <div class="cart-header">
        <h2 class="cart-title">Your Cart (${PSYCHE_SHOP.getCartCount()})</h2>
        <button class="cart-close" id="cart-close">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>

      ${freeShipping ? `<div class="cart-free-shipping">✓ You qualify for free shipping!</div>` :
        `<div class="cart-free-shipping cart-free-shipping--progress">
          Add $${(PSYCHE_SHOP.config.freeShippingThreshold - total).toFixed(2)} more for free shipping
          <div class="cart-shipping-bar"><div class="cart-shipping-fill" style="width:${Math.min(100,(total/PSYCHE_SHOP.config.freeShippingThreshold)*100)}%"></div></div>
        </div>`}

      <div class="cart-items" id="cart-items">
        ${cart.length === 0
          ? `<div class="cart-empty"><p>Your cart is empty.</p><button class="btn-primary" onclick="document.querySelector('.cart-overlay').remove()">Continue Shopping</button></div>`
          : cart.map(item => `
            <div class="cart-item" data-key="${item.key}">
              <div class="cart-item-emoji">${item.emoji}</div>
              <div class="cart-item-info">
                <div class="cart-item-name">${escapeHtml(item.name)}</div>
                <div class="cart-item-variant">${[item.size, item.color].filter(Boolean).join(' · ')}</div>
                <div class="cart-item-qty-row">
                  <button class="cart-qty-btn" data-key="${item.key}" data-action="minus">−</button>
                  <span class="cart-qty-val">${item.quantity}</span>
                  <button class="cart-qty-btn" data-key="${item.key}" data-action="plus">+</button>
                  <button class="cart-remove-btn" data-key="${item.key}">Remove</button>
                </div>
              </div>
              <div class="cart-item-price">$${(item.price * item.quantity).toFixed(2)}</div>
            </div>`).join('')}
      </div>

      ${cart.length > 0 ? `
      <div class="cart-footer">
        <div class="cart-subtotal">
          <span>Subtotal</span>
          <span>$${total.toFixed(2)}</span>
        </div>
        <div class="cart-shipping-line">
          <span>Shipping</span>
          <span>${freeShipping ? 'Free' : 'Calculated at checkout'}</span>
        </div>
        <button class="cart-checkout-btn" id="cart-checkout">Proceed to Checkout</button>
        <p class="cart-disclaimer">Store coming soon — this will complete your order once payments are live.</p>
      </div>` : ''}
    </div>
  `;

  document.body.appendChild(overlay);
  overlay.querySelector('#cart-close').addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });

  // Qty buttons
  overlay.querySelectorAll('.cart-qty-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const key = btn.dataset.key;
      const item = PSYCHE_SHOP.cart.find(i => i.key === key);
      if (!item) return;
      const newQty = btn.dataset.action === 'minus' ? item.quantity - 1 : item.quantity + 1;
      if (newQty < 1) { PSYCHE_SHOP.removeFromCart(key); }
      else { PSYCHE_SHOP.updateCartQty(key, newQty); }
      overlay.remove(); openCart();
    });
  });
  overlay.querySelectorAll('.cart-remove-btn').forEach(btn => {
    btn.addEventListener('click', () => { PSYCHE_SHOP.removeFromCart(btn.dataset.key); overlay.remove(); openCart(); });
  });
  overlay.querySelector('#cart-checkout')?.addEventListener('click', () => {
    if (!PSYCHE.currentUser) { overlay.remove(); openAuthModal('signin'); return; }
    overlay.remove(); openCheckoutModal();
  });
}

// ============================================================
// CHECKOUT MODAL
// ============================================================
function openCheckoutModal() {
  document.querySelector('.checkout-overlay')?.remove();
  const overlay = document.createElement('div');
  overlay.className = 'checkout-overlay auth-modal-overlay';
  overlay.style.cssText = 'opacity:1;z-index:9002';
  const u = PSYCHE.currentUser;
  const total = PSYCHE_SHOP.getCartTotal();
  const freeShipping = total >= PSYCHE_SHOP.config.freeShippingThreshold;

  overlay.innerHTML = `
    <div class="auth-modal" style="max-width:520px">
      <button class="auth-modal-close" id="checkout-close">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
      <div class="auth-logo"><span class="auth-logo-name">Checkout</span></div>

      <div class="checkout-summary">
        ${PSYCHE_SHOP.cart.map(i => `
          <div class="checkout-item">
            <span>${i.emoji} ${escapeHtml(i.name)} × ${i.quantity}</span>
            <span>$${(i.price*i.quantity).toFixed(2)}</span>
          </div>`).join('')}
        <div class="checkout-item checkout-total">
          <span>Total</span>
          <span>$${total.toFixed(2)} + ${freeShipping ? 'free shipping' : 'shipping'}</span>
        </div>
      </div>

      <div class="auth-form active">
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">First Name</label>
            <input class="form-input" id="co-fname" placeholder="First">
          </div>
          <div class="form-group">
            <label class="form-label">Last Name</label>
            <input class="form-input" id="co-lname" placeholder="Last">
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Email</label>
          <input class="form-input" id="co-email" type="email" value="${u?.email||''}" placeholder="For order confirmation">
        </div>
        <div class="form-group">
          <label class="form-label">Shipping Address</label>
          <input class="form-input" id="co-address" placeholder="123 Main St">
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">City</label>
            <input class="form-input" id="co-city" placeholder="City">
          </div>
          <div class="form-group">
            <label class="form-label">Zip / Postal</label>
            <input class="form-input" id="co-zip" placeholder="12345">
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Country</label>
          <select class="form-select" id="co-country">
            <option>United States</option>
            <option>Canada</option>
            <option>United Kingdom</option>
            <option>Australia</option>
            <option>Other</option>
          </select>
        </div>

        <div class="checkout-payment-notice">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
          Payment processing coming soon — your order will be saved and confirmed when we launch.
        </div>

        <button class="form-submit" id="co-submit">Place Order (Coming Soon)</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);
  overlay.querySelector('#checkout-close').addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
  overlay.querySelector('#co-submit').addEventListener('click', () => {
    const fname = document.getElementById('co-fname').value.trim();
    const email = document.getElementById('co-email').value.trim();
    if (!fname || !email) { showToast('Please fill in name and email.'); return; }
    const result = PSYCHE_SHOP.placeOrder({
      name: fname + ' ' + document.getElementById('co-lname').value,
      email, address: document.getElementById('co-address').value,
      city: document.getElementById('co-city').value,
      zip: document.getElementById('co-zip').value,
      country: document.getElementById('co-country').value,
    });
    if (result.success) {
      overlay.remove();
      showToast(`Order ${result.order.id} saved! You'll be notified when payments launch.`);
      renderShopPage();
    }
  });
}

// ============================================================
// SHOP ADMIN PANEL
// ============================================================
function openShopAdmin() {
  document.querySelector('.shop-admin-overlay')?.remove();
  const overlay = document.createElement('div');
  overlay.className = 'shop-admin-overlay';
  const isSA = PSYCHE_ROLES.isSuperAdmin();
  const products = PSYCHE_SHOP.products;

  overlay.innerHTML = `
    <div class="shop-admin-modal">
      <div class="shop-admin-header">
        <h2 class="shop-admin-title">Shop Manager</h2>
        <button class="shop-admin-close" id="sadmin-close">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>

      <div class="shop-admin-tabs">
        <button class="sadmin-tab active" data-tab="products">Products</button>
        <button class="sadmin-tab" data-tab="orders">Orders</button>
        ${isSA ? `<button class="sadmin-tab" data-tab="settings">Settings</button>` : ''}
      </div>

      <!-- Products tab -->
      <div class="sadmin-panel active" data-panel="products">
        <div style="display:flex;justify-content:flex-end;margin-bottom:1rem">
          <button class="admin-save-btn" id="sadmin-add-product">+ Add Product</button>
        </div>
        <div class="sadmin-product-list">
          ${products.map(p => `
            <div class="sadmin-product-row" data-id="${p.id}">
              <span class="sadmin-drag-handle">⠿</span>
              <span class="sadmin-product-emoji">${p.emoji}</span>
              <div class="sadmin-product-name">
                <span>${escapeHtml(p.name)}</span>
                <span class="sadmin-product-price">$${p.price}</span>
              </div>
              <div class="sadmin-product-toggles">
                <label class="sadmin-toggle-label"><input type="checkbox" class="sadmin-toggle" data-id="${p.id}" data-prop="featured" ${p.featured?'checked':''}> ⭐ Featured</label>
                <label class="sadmin-toggle-label"><input type="checkbox" class="sadmin-toggle" data-id="${p.id}" data-prop="trending" ${p.trending?'checked':''}> 🔥 Trending</label>
                <label class="sadmin-toggle-label"><input type="checkbox" class="sadmin-toggle" data-id="${p.id}" data-prop="popular" ${p.popular?'checked':''}> 💜 Popular</label>
                <label class="sadmin-toggle-label"><input type="checkbox" class="sadmin-toggle" data-id="${p.id}" data-prop="active" ${p.active?'checked':''}> Active</label>
              </div>
              <div class="sadmin-product-actions">
                <button class="admin-action-btn admin-action-btn--role sadmin-edit-btn" data-id="${p.id}">Edit</button>
                <button class="admin-action-btn admin-action-btn--ban sadmin-del-btn" data-id="${p.id}">Delete</button>
              </div>
            </div>`).join('')}
        </div>
      </div>

      <!-- Orders tab -->
      <div class="sadmin-panel" data-panel="orders">
        <div class="sadmin-orders-list">
          ${renderOrdersList()}
        </div>
      </div>

      <!-- Settings tab -->
      ${isSA ? `
      <div class="sadmin-panel" data-panel="settings">
        <div class="admin-field">
          <label class="admin-label">Announcement Banner Text</label>
          <input class="admin-input" id="sadmin-banner-text" value="${escapeHtml(PSYCHE_SHOP.config.bannerText||'')}">
        </div>
        <div class="admin-field" style="flex-direction:row;align-items:center;gap:1rem">
          <label class="admin-label">Show Banner</label>
          <label class="toggle-track" style="display:inline-flex">
            <input type="checkbox" id="sadmin-banner-active" ${PSYCHE_SHOP.config.bannerActive?'checked':''}>
            <span class="toggle-thumb"></span>
          </label>
        </div>
        <div class="admin-field">
          <label class="admin-label">Free Shipping Threshold ($)</label>
          <input class="admin-input" id="sadmin-free-shipping" type="number" value="${PSYCHE_SHOP.config.freeShippingThreshold}">
        </div>
        <div class="admin-field">
          <label class="admin-label">Hero Title</label>
          <input class="admin-input" id="sadmin-hero-text" value="${escapeHtml(PSYCHE_SHOP.config.heroText)}">
        </div>
        <div class="admin-field">
          <label class="admin-label">Hero Subtitle</label>
          <input class="admin-input" id="sadmin-hero-sub" value="${escapeHtml(PSYCHE_SHOP.config.heroSub)}">
        </div>
        <button class="admin-save-btn" id="sadmin-save-settings" style="margin-top:.5rem">Save Settings</button>
      </div>` : ''}
    </div>
  `;

  document.body.appendChild(overlay);

  // Tabs
  overlay.querySelectorAll('.sadmin-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      overlay.querySelectorAll('.sadmin-tab').forEach(t => t.classList.remove('active'));
      overlay.querySelectorAll('.sadmin-panel').forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      overlay.querySelector(`.sadmin-panel[data-panel="${tab.dataset.tab}"]`)?.classList.add('active');
    });
  });

  overlay.querySelector('#sadmin-close').addEventListener('click', () => overlay.remove());

  // Product toggles
  overlay.querySelectorAll('.sadmin-toggle').forEach(chk => {
    chk.addEventListener('change', () => {
      PSYCHE_SHOP.editProduct(chk.dataset.id, { [chk.dataset.prop]: chk.checked });
    });
  });

  // Edit
  overlay.querySelectorAll('.sadmin-edit-btn').forEach(btn => {
    btn.addEventListener('click', () => { overlay.remove(); openEditProductModal(btn.dataset.id); });
  });

  // Delete
  overlay.querySelectorAll('.sadmin-del-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (!confirm('Delete this product?')) return;
      PSYCHE_SHOP.deleteProduct(btn.dataset.id);
      overlay.remove(); openShopAdmin(); renderShopPage();
    });
  });

  // Add product
  overlay.querySelector('#sadmin-add-product')?.addEventListener('click', () => { overlay.remove(); openAddProductModal(); });

  // Settings save
  overlay.querySelector('#sadmin-save-settings')?.addEventListener('click', () => {
    PSYCHE_SHOP.config.bannerText = document.getElementById('sadmin-banner-text').value;
    PSYCHE_SHOP.config.bannerActive = document.getElementById('sadmin-banner-active').checked;
    PSYCHE_SHOP.config.freeShippingThreshold = parseFloat(document.getElementById('sadmin-free-shipping').value) || 50;
    PSYCHE_SHOP.config.heroText = document.getElementById('sadmin-hero-text').value;
    PSYCHE_SHOP.config.heroSub = document.getElementById('sadmin-hero-sub').value;
    PSYCHE_SHOP._save();
    showToast('Shop settings saved.');
    overlay.remove(); renderShopPage();
  });
}

function renderOrdersList() {
  const allOrders = Object.values(PSYCHE_SHOP.orders).flat().sort((a,b) => new Date(b.createdAt)-new Date(a.createdAt));
  if (!allOrders.length) return '<p class="admin-empty">No orders yet.</p>';
  return allOrders.map(o => {
    const u = PSYCHE.users[o.userId];
    return `
      <div class="sadmin-order-row">
        <div>
          <div class="sadmin-order-id">${o.id}</div>
          <div class="sadmin-order-meta">@${u?.username||'?'} · ${new Date(o.createdAt).toLocaleDateString()}</div>
          <div class="sadmin-order-items">${o.items.map(i => `${i.emoji} ${i.name}×${i.quantity}`).join(', ')}</div>
        </div>
        <div class="sadmin-order-right">
          <span class="admin-status-badge admin-status-badge--active">$${o.total.toFixed(2)}</span>
          <span class="admin-status-badge">${o.status}</span>
        </div>
      </div>
    `;
  }).join('');
}

// ============================================================
// ADD / EDIT PRODUCT MODAL
// ============================================================
function openAddProductModal() { openProductEditorModal(null); }
function openEditProductModal(id) { openProductEditorModal(PSYCHE_SHOP.getProduct(id)); }

function openProductEditorModal(existing) {
  document.querySelector('.product-editor-overlay')?.remove();
  const overlay = document.createElement('div');
  overlay.className = 'product-editor-overlay auth-modal-overlay';
  overlay.style.cssText = 'opacity:1;z-index:9003';
  const isEdit = !!existing;

  overlay.innerHTML = `
    <div class="auth-modal" style="max-width:520px;max-height:90vh;overflow-y:auto">
      <button class="auth-modal-close" id="pe-close">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
      <div class="auth-logo"><span class="auth-logo-name">${isEdit?'Edit Product':'Add Product'}</span></div>
      <div class="auth-form active">
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Name <span class="form-required">*</span></label>
            <input class="form-input" id="pe-name" value="${escapeHtml(existing?.name||'')}">
          </div>
          <div class="form-group">
            <label class="form-label">Emoji</label>
            <input class="form-input" id="pe-emoji" value="${existing?.emoji||'🛍'}" maxlength="2" style="text-align:center;font-size:1.5rem">
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Description</label>
          <textarea class="form-textarea" id="pe-desc" rows="3">${escapeHtml(existing?.description||'')}</textarea>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Price ($)</label>
            <input class="form-input" id="pe-price" type="number" min="0" step="0.01" value="${existing?.price||''}">
          </div>
          <div class="form-group">
            <label class="form-label">Category</label>
            <select class="form-select" id="pe-category">
              ${['Apparel','Drinkware','Accessories'].map(c => `<option ${existing?.category===c?'selected':''}>${c}</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Sizes (comma separated)</label>
          <input class="form-input" id="pe-sizes" value="${(existing?.sizes||[]).join(', ')}">
        </div>
        <div class="form-group">
          <label class="form-label">Colors (comma separated)</label>
          <input class="form-input" id="pe-colors" value="${(existing?.colors||[]).join(', ')}">
        </div>
        <div style="display:flex;gap:1.5rem;margin:.5rem 0">
          <label class="form-check"><input type="checkbox" id="pe-featured" ${existing?.featured?'checked':''}> ⭐ Featured</label>
          <label class="form-check"><input type="checkbox" id="pe-trending" ${existing?.trending?'checked':''}> 🔥 Trending</label>
          <label class="form-check"><input type="checkbox" id="pe-popular" ${existing?.popular?'checked':''}> 💜 Popular</label>
          <label class="form-check"><input type="checkbox" id="pe-active" ${existing?.active!==false?'checked':''}> Active</label>
        </div>
        <div class="form-error" id="pe-error" hidden></div>
        <div style="display:flex;gap:.5rem;justify-content:flex-end">
          <button class="compose-cancel-btn" id="pe-cancel">Cancel</button>
          <button class="form-submit" id="pe-save" style="width:auto;padding:.6rem 1.5rem">${isEdit?'Save':'Add Product'}</button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);
  overlay.querySelector('#pe-close').addEventListener('click', () => overlay.remove());
  overlay.querySelector('#pe-cancel').addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });

  overlay.querySelector('#pe-save').addEventListener('click', () => {
    const errEl = document.getElementById('pe-error');
    const data = {
      name: document.getElementById('pe-name').value.trim(),
      emoji: document.getElementById('pe-emoji').value.trim() || '🛍',
      description: document.getElementById('pe-desc').value.trim(),
      price: parseFloat(document.getElementById('pe-price').value),
      category: document.getElementById('pe-category').value,
      sizes: document.getElementById('pe-sizes').value.split(',').map(s=>s.trim()).filter(Boolean),
      colors: document.getElementById('pe-colors').value.split(',').map(s=>s.trim()).filter(Boolean),
      featured: document.getElementById('pe-featured').checked,
      trending: document.getElementById('pe-trending').checked,
      popular: document.getElementById('pe-popular').checked,
      active: document.getElementById('pe-active').checked,
    };
    if (!data.name) { errEl.textContent = 'Name is required.'; errEl.hidden = false; return; }
    if (!data.price || data.price <= 0) { errEl.textContent = 'Please enter a valid price.'; errEl.hidden = false; return; }

    let result;
    if (isEdit) { result = PSYCHE_SHOP.editProduct(existing.id, data); }
    else { result = PSYCHE_SHOP.addProduct(data); }

    if (result.success) {
      overlay.remove();
      showToast(isEdit ? 'Product updated.' : 'Product added!');
      renderShopPage();
    } else { errEl.textContent = result.error; errEl.hidden = false; }
  });
}

// ============================================================
// SUPPORT TICKET MODAL
// ============================================================
function openSupportModal(category = 'general', prefill = '') {
  document.querySelector('.support-modal-overlay')?.remove();
  const overlay = document.createElement('div');
  overlay.className = 'support-modal-overlay auth-modal-overlay';
  overlay.style.cssText = 'opacity:1;z-index:9002';
  const u = PSYCHE.currentUser;

  overlay.innerHTML = `
    <div class="auth-modal" style="max-width:480px">
      <button class="auth-modal-close" id="support-close">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
      <div class="auth-logo">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
        <span class="auth-logo-name">Contact Support</span>
      </div>
      <div class="auth-form active">
        <div class="form-group">
          <label class="form-label">Category</label>
          <select class="form-select" id="sup-category">
            <option value="general" ${category==='general'?'selected':''}>General Question</option>
            <option value="shop" ${category==='shop'?'selected':''}>Shop / Order Issue</option>
            <option value="account">Account Issue</option>
            <option value="content">Content / Post Issue</option>
            <option value="technical">Technical Problem</option>
            <option value="billing">Billing (Coming Soon)</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Subject</label>
          <input class="form-input" id="sup-subject" value="${escapeHtml(prefill)}" placeholder="Brief description of your issue">
        </div>
        <div class="form-group">
          <label class="form-label">Message</label>
          <textarea class="form-textarea" id="sup-message" rows="5" placeholder="Please describe your issue in detail…"></textarea>
        </div>
        <div class="form-group">
          <label class="form-label">Email for reply</label>
          <input class="form-input" id="sup-email" type="email" value="${u?.email||''}" placeholder="your@email.com">
        </div>
        <div class="form-error" id="sup-error" hidden></div>
        <button class="form-submit" id="sup-submit">Submit Ticket</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);
  overlay.querySelector('#support-close').addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });

  overlay.querySelector('#sup-submit').addEventListener('click', () => {
    const subject = document.getElementById('sup-subject').value.trim();
    const message = document.getElementById('sup-message').value.trim();
    const email   = document.getElementById('sup-email').value.trim();
    const errEl   = document.getElementById('sup-error');
    if (!subject) { errEl.textContent = 'Please add a subject.'; errEl.hidden = false; return; }
    if (!message) { errEl.textContent = 'Please describe your issue.'; errEl.hidden = false; return; }

    // Save ticket
    PSYCHE_TICKETS.create({
      category: document.getElementById('sup-category').value,
      subject, message, email,
      userId: u?.id || null,
    });
    overlay.remove();
    showToast('Support ticket submitted! We\'ll get back to you soon.');
  });
}

// ============================================================
// SUPPORT TICKET SYSTEM
// ============================================================
const PSYCHE_TICKETS = {
  tickets: [],

  create({ category, subject, message, email, userId }) {
    const ticket = {
      id: 'TKT-' + Date.now().toString(36).toUpperCase(),
      category, subject, message, email, userId,
      status: 'open',
      priority: category === 'shop' ? 'high' : 'normal',
      responses: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      assignedTo: null,
      resolvedAt: null,
    };
    this.tickets.push(ticket);
    this._save();
    return ticket;
  },

  respond(ticketId, body, agentId) {
    const ticket = this.tickets.find(t => t.id === ticketId);
    if (!ticket) return;
    ticket.responses.push({ body, agentId, createdAt: new Date().toISOString() });
    ticket.updatedAt = new Date().toISOString();
    this._save();
  },

  close(ticketId, agentId) {
    const ticket = this.tickets.find(t => t.id === ticketId);
    if (!ticket) return;
    ticket.status = 'resolved';
    ticket.resolvedAt = new Date().toISOString();
    ticket.updatedAt = new Date().toISOString();
    this._save();
  },

  getForAgent() {
    const privLevel = typeof PSYCHE_ROLES !== 'undefined' ? PSYCHE_ROLES.privacyLevel() : 0;
    return this.tickets.map(t => {
      const u = PSYCHE.users[t.userId];
      return {
        ...t,
        // Support-level: username + email + category only
        userDisplay: privLevel >= 1 ? (u?.username || t.email) : t.email?.split('@')[0] + '@...',
        userEmail:   privLevel >= 1 ? t.email : null,
        userId_full: privLevel >= 2 ? t.userId : null,
        // Mod+: user account details
        userRole:    privLevel >= 2 ? u?.role : null,
        userJoined:  privLevel >= 2 ? u?.joinedAt : null,
        // Admin+: full history
        userKarma:   privLevel >= 3 ? u?.karma : null,
        userBanned:  privLevel >= 3 ? u?.banned : null,
        // Superadmin: everything
        userFull:    privLevel >= 4 ? u : null,
      };
    });
  },

  _save() { try { localStorage.setItem('psyche_tickets', JSON.stringify(this.tickets)); } catch(e){} },
  load() {
    try {
      const raw = localStorage.getItem('psyche_tickets');
      if (raw) this.tickets = JSON.parse(raw);
    } catch(e) {}
    // Seed demo ticket
    if (this.tickets.length === 0) {
      this.create({ category:'shop', subject:'When will the store launch?', message:'Really excited about the merch! Is there a timeline for when the store will be fully live?', email:'curious@example.com', userId:null });
    }
  },
};

// ============================================================
// COLOR HELPER
// ============================================================
function colorToHex(name) {
  const map = { 'Black':'#111827','White':'#f9fafb','Slate':'#64748b','Navy':'#1e3a5f','Charcoal':'#374151','Cream':'#fef9f0','Steel Blue':'#1d6fa4','Natural':'#d4c5a9','Forest':'#166534','Red':'#dc2626' };
  return map[name] || '#888';
}

// ============================================================
// INIT
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  PSYCHE_SHOP.load();
  PSYCHE_TICKETS.load();
});
