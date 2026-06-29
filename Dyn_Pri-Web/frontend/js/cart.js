// frontend/js/cart.js — Fixed & Professional

let currentCartData = null;
let cartItems = [];

window.initCartPage = () => {
  fetchAndRenderCart();
};

window.fetchAndRenderCart = async () => {
  const loading = document.getElementById('cart-loading');
  const empty   = document.getElementById('cart-empty');
  const content = document.getElementById('cart-content');
  const footer  = document.getElementById('cart-sticky-footer');

  loading.style.display = 'block';
  empty.style.display   = 'none';
  content.style.display = 'none';
  if (footer) footer.style.display = 'none';

  const res = await apiGetCart();
  loading.style.display = 'none';

  if (!res.success) {
    showCartToast(res.error || 'Failed to load cart', 'error');
    empty.style.display = 'block';
    return;
  }

  const data = res.data || {};
  let items = data.items || [];
  if (!Array.isArray(items)) items = [];

  currentCartData = data;
  cartItems = items;

  if (items.length === 0) {
    empty.style.display = 'block';
    updateBadge(0);
  } else {
    content.style.display = 'block';
    renderCartItems(items);
    renderOrderSummary(items);
  }
};

function updateBadge(count) {
  const badge = document.getElementById('cart-badge-count');
  const tab   = document.getElementById('tab-count');
  if (badge) badge.innerText = count.toString();
  if (tab)   tab.innerText   = count.toString();
}

window.renderCartItems = (items) => {
  const list = document.getElementById('cart-items-list');
  list.innerHTML = '';

  let totalQty = 0;

  items.forEach((item, idx) => {
    const p            = item.product || {};
    const imgStr       = p.image_url || 'https://placehold.co/100x100/1e293b/94a3b8?text=Item';
    const currentPrice = parseFloat(p.current_price) || 0;
    const basePrice    = parseFloat(p.base_price)    || currentPrice;
    const qty          = item.quantity || 1;
    const discPct      = basePrice > currentPrice
      ? Math.round(((basePrice - currentPrice) / basePrice) * 100) : 0;

    totalQty += qty;

    const deliveryDate = new Date();
    deliveryDate.setDate(deliveryDate.getDate() + 7);
    const parts = deliveryDate.toDateString().split(' ');
    const deliveryStr = `${parts[1]} ${parseInt(parts[2], 10)}, ${parts[0]}`;

    const card = document.createElement('div');
    card.className = 'cart-item-card';
    card.id = `cart-row-${item.id}`;
    card.innerHTML = `
      <div class="cic-img-col">
        <img src="${imgStr}" alt="${p.name || 'Product'}" class="cic-img">
        <div class="cic-qty-ctrl">
          <button class="cic-qty-btn" onclick="changeQty(${item.id}, ${idx}, -1)">−</button>
          <span class="cic-qty-val" id="qty-display-${item.id}">${qty}</span>
          <button class="cic-qty-btn" onclick="changeQty(${item.id}, ${idx}, 1)">+</button>
        </div>
      </div>

      <div class="cic-details">
        <div class="cic-name">${p.name || 'Unknown Product'}</div>
        <div class="cic-category">${p.category || 'Electronics'}</div>

        <div class="cic-price-row">
          <span class="cic-price">₹${currentPrice.toLocaleString()}</span>
          ${discPct > 0 ? `<span class="cic-old-price">₹${basePrice.toLocaleString()}</span>
          <span class="cic-disc-badge">↓${discPct}% OFF</span>` : ''}
        </div>

        <div class="cic-dynamic">
          <span class="cic-live-dot"></span>
          ⚡ Live AI Price — ${discPct > 0 ? `Saved ₹${(basePrice - currentPrice).toLocaleString()}` : 'Stable Price'}
        </div>

        <div class="cic-delivery">🚚 Free Delivery by <strong>${deliveryStr}</strong></div>

        <div class="cic-actions">
          <button class="cic-action-btn cic-remove" onclick="removeItem(${item.id})">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
            Remove
          </button>
          <button class="cic-action-btn cic-save" onclick="showCartToast('Saved for later!')">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/></svg>
            Save for later
          </button>
          <button class="cic-action-btn cic-buy" onclick="window.location.href='checkout.html'">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
            Buy now
          </button>
        </div>
      </div>

      <div class="cic-subtotal">
        <div class="cic-subtotal-label">Subtotal</div>
        <div class="cic-subtotal-val" id="subtotal-${item.id}">₹${(currentPrice * qty).toLocaleString()}</div>
      </div>
    `;
    list.appendChild(card);
  });

  updateBadge(totalQty);
};

// Change quantity — uses in-memory cartItems array to track live quantity
window.changeQty = async (itemId, idx, delta) => {
  const item  = cartItems[idx];
  if (!item)  return;

  let newQty = (item.quantity || 1) + delta;
  if (newQty < 1) newQty = 1;
  if (newQty === item.quantity) return;

  // Optimistic UI update
  item.quantity = newQty;
  const display = document.getElementById(`qty-display-${itemId}`);
  if (display) display.innerText = newQty;

  const price = parseFloat((item.product || {}).current_price) || 0;
  const subEl = document.getElementById(`subtotal-${itemId}`);
  if (subEl) subEl.innerText = `₹${(price * newQty).toLocaleString()}`;

  renderOrderSummary(cartItems);

  const res = await apiUpdateCart(itemId, newQty);
  if (!res.success) {
    showCartToast(res.error || 'Update failed — please retry', 'error');
    fetchAndRenderCart(); // revert on error
  }
};

window.renderOrderSummary = (items) => {
  let subtotal  = 0;
  let baseTotal = 0;

  items.forEach(item => {
    const price = parseFloat((item.product || {}).current_price) || 0;
    const base  = parseFloat((item.product || {}).base_price)    || price;
    const qty   = item.quantity || 1;
    subtotal  += price * qty;
    baseTotal += base  * qty;
  });

  const savings = baseTotal > subtotal ? baseTotal - subtotal : 0;
  const tax     = Math.round(subtotal * 0.05);
  const total   = subtotal + tax;

  // Sticky footer
  const footer = document.getElementById('cart-sticky-footer');
  if (footer) footer.style.display = 'flex';

  const newTotalEl = document.getElementById('sticky-new-total');
  const oldTotalEl = document.getElementById('sticky-old-total');
  if (newTotalEl) newTotalEl.innerText = `₹${total.toLocaleString()}`;
  if (oldTotalEl) oldTotalEl.innerText = baseTotal > subtotal ? `₹${baseTotal.toLocaleString()}` : '';

  // Savings banner
  const banner = document.getElementById('cart-savings-banner');
  if (banner) {
    if (savings > 0) {
      banner.style.display = 'block';
      const sa = document.getElementById('savings-amount');
      if (sa) sa.innerText = savings.toLocaleString();
    } else {
      banner.style.display = 'none';
    }
  }

  // Summary panel
  const setEl = (id, val) => { const e = document.getElementById(id); if (e) e.innerText = val; };
  setEl('summary-items-count', items.reduce((a, i) => a + (i.quantity || 1), 0));
  setEl('summary-subtotal',   `₹${subtotal.toLocaleString()}`);
  setEl('summary-tax',        `₹${tax.toLocaleString()}`);
  setEl('summary-total',      `₹${total.toLocaleString()}`);
};

window.removeItem = async (itemId) => {
  if (!confirm('Remove this item from your cart?')) return;
  const row = document.getElementById(`cart-row-${itemId}`);
  if (row) { row.style.opacity = '0.4'; row.style.pointerEvents = 'none'; }

  const res = await apiRemoveFromCart(itemId);
  if (res.success) {
    showCartToast('Item removed from cart');
    fetchAndRenderCart();
  } else {
    showCartToast(res.error || 'Failed to remove item', 'error');
    if (row) { row.style.opacity = '1'; row.style.pointerEvents = 'auto'; }
  }
};

// Toast notification
function showCartToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const id   = Date.now();
  const html = `<div id="toast-${id}" class="toast toast-${type}">${message}</div>`;
  container.insertAdjacentHTML('beforeend', html);
  setTimeout(() => {
    const t = document.getElementById(`toast-${id}`);
    if (t) { t.style.animation = 'fadeOut 0.3s ease forwards'; setTimeout(() => t.remove(), 300); }
  }, 3000);
}
// alias for backward compat
window.showToast = showCartToast;
