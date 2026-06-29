// frontend/js/product-detail.js

let currentProductId = null;
let currentProduct = null;

window.initProductDetailPage = async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const id = urlParams.get('id');
  
  if (!id) {
    document.getElementById('product-container').innerHTML = `
      <div class="empty-state" style="margin-top:40px;">
        <h3>Product Not Found</h3>
        <p>No product ID provided in the URL.</p>
        <a href="products.html" class="btn btn-primary mt-4">Go to Products</a>
      </div>
    `;
    return;
  }
  
  currentProductId = id;
  await fetchProductDetails(id);
};

window.fetchProductDetails = async (id) => {
  const res = await apiGetProduct(id);
  
  if (!res.success) {
    document.getElementById('product-container').innerHTML = `
      <div class="empty-state" style="margin-top:40px;">
        <h3>Error Loading Product</h3>
        <p class="text-danger">${res.error}</p>
        <a href="products.html" class="btn btn-primary mt-4">Go Back</a>
      </div>
    `;
    return;
  }
  
  currentProduct = res.data;
  renderProduct(currentProduct);
};

window.renderProduct = (product) => {
  const templateEl = document.getElementById('product-template');
  const container = document.getElementById('product-container');
  
  // If no template exists, use a simpler fallback rendering
  if (!templateEl) {
    renderProductSimple(product, container);
    return;
  }
  
  const template = templateEl.content.cloneNode(true);
  container.innerHTML = ''; // clear loading state
  
  // Breadcrumb
  const cat = product.category || 'Category';
  const bcCategory = template.getElementById('bc-category');
  const bcName = template.getElementById('bc-name');
  if (bcCategory) {
    bcCategory.textContent = cat;
    bcCategory.href = `products.html?category=${encodeURIComponent(cat)}`;
  }
  if (bcName) bcName.textContent = product.name;
  
  // Title
  const pTitle = template.getElementById('p-title');
  if (pTitle) pTitle.textContent = product.name;
  
  // Rating 
  const rating = product.rating || 4.0;
  const pRating = template.getElementById('p-rating');
  const pReviews = template.getElementById('p-reviews');
  const pOrders = template.getElementById('p-orders');
  if (pRating) pRating.textContent = rating.toFixed(1);
  if (pReviews) pReviews.textContent = product.review_count || 0;
  if (pOrders) pOrders.textContent = Math.floor(Math.random() * 500) + 100;
  
  // Features
  const featuresBox = template.getElementById('p-features');
  if (featuresBox) {
    const baseFeatures = ['1 Year Warranty', 'Free Returns'];
    if(product.segment === 'Premium') baseFeatures.push('Priority Support', 'Premium Build Quality');
    if(product.segment === 'Budget') baseFeatures.push('Value for Money');
    
    baseFeatures.forEach(f => {
      featuresBox.innerHTML += `
        <div class="feature-item">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
          ${f}
        </div>
      `;
    });
  }

  // Pricing
  const pPrice = template.getElementById('p-price');
  const pOldPrice = template.getElementById('p-old-price');
  if (pPrice) pPrice.textContent = `₹${(product.current_price || 0).toLocaleString()}`;
  if (pOldPrice) {
    if (product.original_price > product.current_price) {
      pOldPrice.textContent = `₹${product.original_price.toLocaleString()}`;
    } else {
      pOldPrice.style.display = 'none';
    }
  }

  if (product.last_updated) {
    const hoursAgo = Math.round((new Date() - new Date(product.last_updated)) / (1000 * 60 * 60));
    if (hoursAgo < 48) {
      const up = template.getElementById('p-price-updated');
      if (up) {
        up.textContent = `Last updated ${hoursAgo} hours ago`;
        up.style.display = 'block';
      }
    }
  }

  // Attach elements to DOM
  container.appendChild(template);
  
  // Gallery
  const imgStr = product.image_url || 'https://placehold.co/800x600/F5F6F8/9CA3AF?text=No+Image';
  const imgArr = [imgStr, imgStr, imgStr]; 
  renderGallery(imgArr);
  
  // Specs
  const specs = [
    { label: 'Brand', value: product.brand || 'Generic' },
    { label: 'Category', value: product.category },
    { label: 'Segment', value: product.segment },
    { label: 'Inventory Count', value: `${product.inventory_count} units available` },
    { label: 'Base Price', value: `₹${(product.base_price || 0).toLocaleString()}` },
    { label: 'Competitor Price', value: `₹${(product.competitor_price || 0).toLocaleString()}` }
  ];
  renderSpecsTable(specs);
  renderReviews();
};

// Fallback simple render if no template element exists
function renderProductSimple(product, container) {
  const placeholderImg = "https://placehold.co/400x400/F5F6F8/9CA3AF?text=No+Image";
  const imgUrl = product.image_url || placeholderImg;
  const oldPrice = product.base_price ? product.base_price : product.current_price * 1.2;
  
  container.innerHTML = `
    <div style="display:flex; gap:40px; flex-wrap:wrap;">
      <div style="flex:1; min-width:300px;">
        <img src="${imgUrl}" alt="${product.name}" style="width:100%; border-radius:8px;">
      </div>
      <div style="flex:1; min-width:300px;">
        <h1>${product.name}</h1>
        <div style="font-size:28px; font-weight:700; color:var(--color-primary, #2B6BE6); margin:16px 0;">
          ₹${Math.round(product.current_price)}
          ${product.current_price < oldPrice ? `<span style="text-decoration:line-through; color:#999; font-size:18px; margin-left:8px;">₹${Math.round(oldPrice)}</span>` : ''}
        </div>
        <p>Category: ${product.category || 'N/A'}</p>
        <p>Stock: ${product.stock > 0 || product.inventory_count > 0 ? (product.inventory_count || product.stock) + ' units' : 'Out of Stock'}</p>
        <div style="margin-top:24px; display:flex; gap:12px; align-items:center;">
          <button class="btn-stepper" onclick="updateQuantity(-1)">−</button>
          <input type="text" id="qty-input" value="1" readonly style="width:40px; text-align:center;">
          <button class="btn-stepper" onclick="updateQuantity(1)">+</button>
        </div>
        <button class="btn btn-primary" id="btn-add-cart" style="margin-top:16px;" onclick="handleAddToCart()">🛒 Add to Cart</button>
      </div>
    </div>
  `;
}

window.renderGallery = (images) => {
  const thumbStrip = document.getElementById('thumb-strip');
  const mainImage = document.getElementById('main-product-img');
  
  if (!thumbStrip || !mainImage) return;
  
  mainImage.src = images[0];
  
  images.forEach((img, idx) => {
    const btn = document.createElement('button');
    btn.className = `thumb-btn ${idx === 0 ? 'active' : ''}`;
    btn.innerHTML = `<img src="${img}" alt="Thumbnail ${idx}">`;
    btn.onclick = () => {
      document.querySelectorAll('.thumb-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      mainImage.src = img;
    };
    thumbStrip.appendChild(btn);
  });
};

window.updateQuantity = (change) => {
  const input = document.getElementById('qty-input');
  let val = parseInt(input.value) || 1;
  val += change;
  if (val < 1) val = 1;

  // Enforce max inventory limit if available
  if (currentProduct && currentProduct.inventory_count && val > currentProduct.inventory_count) {
    showToast(`Only ${currentProduct.inventory_count} units in stock.`, 'warning');
    val = currentProduct.inventory_count;
  }
  
  input.value = val;
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
}

window.handleAddToCart = async () => {
  if (!isLoggedIn()) {
    showToast('Please log in to add items to your cart', 'error');
    setTimeout(() => { window.location.href = 'login.html'; }, 1500);
    return;
  }
  
  const qty = parseInt(document.getElementById('qty-input').value) || 1;
  const btn = document.getElementById('btn-add-cart');
  btn.classList.add('btn-disabled');
  btn.textContent = 'Adding...';
  
  const res = await apiAddToCart(currentProductId, qty);
  
  btn.classList.remove('btn-disabled');
  btn.textContent = '🛒 Add to cart';
  
  if (res.success) {
    showToast('Added to cart successfully!');
    const badge = document.getElementById('cart-badge-count');
    if(badge) badge.innerText = parseInt(badge.innerText || '0') + qty;
  } else {
    showToast(res.error || 'Failed to add item', 'error');
  }
};

window.renderSpecsTable = (specs) => {
  const tbody = document.querySelector('#specs-table tbody');
  if (!tbody) return;
  
  tbody.innerHTML = '';
  specs.forEach(s => {
    tbody.innerHTML += `
      <tr>
        <td>${s.label}</td>
        <td>${s.value}</td>
      </tr>
    `;
  });
};

window.renderReviews = () => {
  const grid = document.getElementById('review-grid');
  if (!grid) return;
  
  // Sample reviews for UI demonstration
  const reviews = [
    { name: "Rahul S.", rating: 5, date: "2 days ago", text: "Excellent product! Great value for money. The dynamic price drop was a nice surprise." },
    { name: "Priya M.", rating: 4, date: "1 week ago", text: "Good quality, matches the description completely. Delivery was fast too." }
  ];
  
  grid.innerHTML = '';
  reviews.forEach(r => {
    grid.innerHTML += `
      <div class="review-card">
        <div class="review-header">
          <div class="review-avatar">${r.name.charAt(0)}</div>
          <div>
            <div class="fw-medium text-navy">${r.name}</div>
            <div class="text-muted" style="font-size:12px;">${r.date}</div>
          </div>
          <div style="margin-left:auto; color:var(--color-star); font-size:14px;">
            ${'★'.repeat(r.rating)}${'☆'.repeat(5-r.rating)}
          </div>
        </div>
        <p style="font-size:14px; color:var(--color-text); line-height:1.5;">"${r.text}"</p>
      </div>
    `;
  });
};
