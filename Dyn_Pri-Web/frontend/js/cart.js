<<<<<<< HEAD
/* frontend/js/cart.js */

let cartData = null;

document.addEventListener("DOMContentLoaded", () => {
  requireLogin(); // Must be logged in to view cart
  updateNavAuthUI();
  initCart();
});

async function initCart() {
  await fetchAndRenderCart();
}

async function fetchAndRenderCart() {
  const container = document.getElementById('cart-items-container');
  container.innerHTML = `<span class="spinner spinner-primary"></span> Loading cart...`;

  const res = await apiGetCart();
  if (!res.success) {
    container.innerHTML = `<div class="empty-state text-danger">${res.error}</div>`;
    return;
  }

  cartData = res.data;
  renderCart();
}

function renderCart() {
  const container = document.getElementById('cart-items-container');
  
  if (!cartData || !cartData.items || cartData.items.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div style="font-size: 48px; margin-bottom: 16px;">🛒</div>
        <h3 style="margin-bottom: 8px;">Your cart is empty</h3>
        <p class="text-muted" style="margin-bottom: 24px;">Looks like you haven't added anything to your cart yet.</p>
        <a href="products.html" class="btn btn-primary">Start Shopping</a>
      </div>
    `;
    
    document.getElementById('nav-cart-badge').textContent = '0';
    updateOrderSummary(0);
    return;
  }

  const placeholderImg = "https://placehold.co/400x400/F5F6F8/9CA3AF?text=No+Image";
  let html = '';
  let subtotal = 0;
  let totalQty = 0;

  cartData.items.forEach(item => {
    // We assume backend cart route includes product details inside the item or we have current_price directly.
    // The design says "always fetch LIVE prices", so cart GET should be returning current prices from DB.
    
    // Safety fallback for structure
    const product = item.product || {};
    const imgUrl = product.image_url || placeholderImg;
    const name = product.name || "Unknown Product";
    const price = Math.round(item.price_at_addition || product.current_price || 0); // Cart items often store price
    
    // We strictly want CURRENT price for dynamic pricing reality:
    const livePrice = Math.round(product.current_price || price);
    
    subtotal += (livePrice * item.quantity);
    totalQty += item.quantity;

    html += `
      <div class="cart-item" id="cart-row-${item.id}">
        <a href="product-detail.html?id=${item.product_id}" class="cart-item-img">
          <img src="${imgUrl}" alt="${name}" onerror="this.src='${placeholderImg}'">
        </a>
        <div class="cart-item-info">
          <a href="product-detail.html?id=${item.product_id}" class="cart-item-title">${name}</a>
          <div class="cart-item-price">₹${livePrice}</div>
          <div class="cart-item-actions">
            <div class="quantity-stepper stepper-sm">
              <button class="btn-stepper" onclick="updateItemQuantity(${item.id}, ${item.quantity - 1})" ${item.quantity <= 1 ? 'disabled style="opacity:0.5"' : ''}>−</button>
              <input type="text" class="qty-input" value="${item.quantity}" readonly>
              <button class="btn-stepper" onclick="updateItemQuantity(${item.id}, ${item.quantity + 1})">+</button>
            </div>
            <span class="btn-remove" onclick="removeItem(${item.id})">Remove</span>
          </div>
        </div>
=======
// frontend/js/cart.js

let currentCartData = null;

window.initCartPage = () => {
  fetchAndRenderCart();
};

window.fetchAndRenderCart = async () => {
  const loading = document.getElementById('cart-loading');
  const empty = document.getElementById('cart-empty');
  const content = document.getElementById('cart-content');
  
  // Show only loading initially
  loading.style.display = 'block';
  empty.style.display = 'none';
  content.style.display = 'none';

  const res = await apiGetCart();
  loading.style.display = 'none';

  if (!res.success) {
    showToast(res.error || 'Failed to load cart', 'error');
    empty.style.display = 'block';
    return;
  }

  const data = res.data || {};
  let items = data.items || [];
  
  if (!Array.isArray(items)) {
    items = [];
  }

  currentCartData = data;

  if (items.length === 0) {
    empty.style.display = 'block';
    // Update badge to 0
    const badge = document.getElementById('cart-badge-count');
    if(badge) badge.innerText = "0";
  } else {
    content.style.display = 'flex';
    renderCartItems(items);
    renderOrderSummary(items);
  }
};

window.renderCartItems = (items) => {
  const list = document.getElementById('cart-items-list');
  list.innerHTML = '';

  let totalQty = 0;

  items.forEach(item => {
    // Handling schema mapping. 
    // Assuming backend cart items structure: { id, cart_id, product_id, quantity, product: { ... } }
    // We use the live price from `product.current_price` 
    const p = item.product || {};
    const imgStr = p.image_url || 'https://placehold.co/200x200/F5F6F8/9CA3AF?text=No+Image';
    const price = p.current_price || 0;
    const subtotal = price * (item.quantity || 1);
    
    totalQty += (item.quantity || 1);

    list.innerHTML += `
      <div class="cart-item" id="cart-item-row-${item.id}">
        <div class="cart-item-img">
          <img src="${imgStr}" alt="${p.name}">
        </div>
        <div class="cart-item-details">
          <div class="dynamic-tag">Live Price</div>
          <a href="product-detail.html?id=${p.id}" class="cart-item-title">${p.name || 'Unknown Product'}</a>
          <div class="cart-item-price">₹${price.toLocaleString()}</div>
        </div>
        
        <div class="cart-qty-ctrl">
          <button onclick="updateItemQuantity(${item.id}, -1)">−</button>
          <input type="number" id="qty-${item.id}" value="${item.quantity}" readonly>
          <button onclick="updateItemQuantity(${item.id}, 1)">+</button>
        </div>
        
        <div class="cart-item-subtotal">
          ₹${subtotal.toLocaleString()}
        </div>
        
        <button class="btn-remove" onclick="removeItem(${item.id})" title="Remove item">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
          </svg>
        </button>
>>>>>>> Web-FE
      </div>
    `;
  });

<<<<<<< HEAD
  container.innerHTML = html;
  document.getElementById('nav-cart-badge').textContent = totalQty;
  updateOrderSummary(subtotal, totalQty);
}

async function updateItemQuantity(itemId, newQty) {
  if (newQty < 1) return;
  const res = await apiUpdateCart(itemId, newQty);
  if (res.success) {
    await fetchAndRenderCart();
  } else {
    alert("Could not update quantity. " + res.error);
  }
}

async function removeItem(itemId) {
  const row = document.getElementById(`cart-row-${itemId}`);
  if(row) row.style.opacity = '0.5';

  const res = await apiRemoveFromCart(itemId);
  if (res.success) {
    await fetchAndRenderCart();
  } else {
    alert("Could not remove item. " + res.error);
    if(row) row.style.opacity = '1';
  }
}

function updateOrderSummary(subtotal, totalQty=0) {
  const btnCheckout = document.getElementById('btn-checkout');
  
  if (subtotal === 0) {
    document.getElementById('summary-subtotal').textContent = '₹0';
    document.getElementById('summary-total').textContent = '₹0';
    btnCheckout.disabled = true;
    return;
  }

  btnCheckout.disabled = false;
  document.getElementById('summary-subtotal').textContent = `₹${subtotal}`;
  
  // Example tax logic or free shipping
  const shipping = subtotal > 50000 ? 0 : 500;
  // Let's assume shipping is handled, to keep it simple we'll just show total
  
  document.getElementById('summary-total').textContent = `₹${subtotal + shipping}`;
  const sfEl = document.getElementById('summary-shipping');
  if(sfEl) sfEl.textContent = shipping === 0 ? 'Free' : `₹${shipping}`;
}

function proceedToCheckout() {
  window.location.href = "checkout.html";
=======
  const badge = document.getElementById('cart-badge-count');
  if(badge) badge.innerText = totalQty.toString();
};

window.renderOrderSummary = (items) => {
  let subtotal = 0;
  let totalItems = 0;
  
  items.forEach(item => {
    const price = (item.product && item.product.current_price) ? item.product.current_price : 0;
    subtotal += price * (item.quantity || 1);
    totalItems += (item.quantity || 1);
  });

  // Calculate generic tax if standard, say 5%
  const tax = Math.round(subtotal * 0.05);
  const total = subtotal + tax;

  document.getElementById('summary-items-count').innerText = totalItems;
  document.getElementById('summary-subtotal').innerText = `₹${subtotal.toLocaleString()}`;
  document.getElementById('summary-tax').innerText = `₹${tax.toLocaleString()}`;
  document.getElementById('summary-total').innerText = `₹${total.toLocaleString()}`;
};

window.updateItemQuantity = async (itemId, change) => {
  const input = document.getElementById(`qty-${itemId}`);
  if(!input) return;
  
  let newQty = parseInt(input.value) + change;
  if(newQty < 1) {
    // Optional: prompt to remove or just do nothing, let's limit to 1 minimum
    newQty = 1;
    if(parseInt(input.value) === 1) return; // no change
  }
  
  // Optimistically disable buttons during fetch if desired or show loading
  showToast('Updating cart...');
  
  const res = await apiUpdateCart(itemId, newQty);
  if(res.success) {
    fetchAndRenderCart(); // Re-fetch to get accurate live prices just in case
  } else {
    showToast(res.error || 'Failed to update quantity', 'error');
  }
};

window.removeItem = async (itemId) => {
  if (confirm("Remove this item from your cart?")) {
    const res = await apiRemoveFromCart(itemId);
    if(res.success) {
      showToast('Item removed');
      fetchAndRenderCart();
    } else {
      showToast(res.error || 'Failed to remove item', 'error');
    }
  }
};

// Common UI Toast
function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  if(!container) return;
  const id = Date.now();
  const html = `<div id="toast-${id}" class="toast toast-${type}">${message}</div>`;
  container.insertAdjacentHTML('beforeend', html);
  setTimeout(() => {
    const t = document.getElementById(`toast-${id}`);
    if(t) {
      t.style.animation = 'fadeOut 0.3s ease forwards';
      setTimeout(() => t.remove(), 300);
    }
  }, 3000);
>>>>>>> Web-FE
}
