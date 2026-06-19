<<<<<<< HEAD
/* frontend/js/product-detail.js */

let currentProduct = null;
let selectedQuantity = 1;

document.addEventListener("DOMContentLoaded", () => {
  updateNavAuthUI();
  initProductDetail();
});

async function initProductDetail() {
  const params = new URLSearchParams(window.location.search);
  const productId = params.get('id');

  if (!productId) {
    document.getElementById('main-container').innerHTML = `
      <div class="empty-state">Product not found. <a href="products.html" class="text-primary">Go to Products</a></div>
    `;
    return;
  }

  await fetchProductData(productId);
}

async function fetchProductData(id) {
  const res = await apiGetProduct(id);

  if (!res.success) {
    document.getElementById('main-container').innerHTML = `
      <div class="empty-state">Error loading product: ${res.error}</div>
    `;
    return;
  }

  currentProduct = res.data;
  renderProduct(currentProduct);
}

function renderProduct(product) {
  // Breadcrumb
  document.getElementById('bc-category').textContent = product.category || 'Category';
  document.getElementById('bc-category').href = `products.html?category=${product.category || ''}`;
  document.getElementById('bc-product-name').textContent = product.name;

  // Header Info
  document.getElementById('pd-title').textContent = product.name;
  
  // Pricing
  const oldPrice = product.base_price ? product.base_price : product.current_price * 1.2;
  document.getElementById('pd-current-price').textContent = `₹${Math.round(product.current_price)}`;
  
  const strikeEl = document.getElementById('pd-old-price');
  if (product.current_price < oldPrice) {
    strikeEl.textContent = `₹${Math.round(oldPrice)}`;
    strikeEl.style.display = 'inline-block';
  } else {
    strikeEl.style.display = 'none';
  }

  // Images
  const placeholderImg = "https://placehold.co/400x400/F5F6F8/9CA3AF?text=No+Image";
  const mainUrl = product.image_url || placeholderImg;
  document.getElementById('pd-main-img').src = mainUrl;
  
  // Set first thumbnail
  const thumb1 = document.getElementById('pd-thumb-1');
  if(thumb1) {
    thumb1.src = mainUrl;
    thumb1.parentElement.classList.add('active'); // assuming structural setup
  }

  // Specs
  const specsTbody = document.getElementById('pd-specs-tbody');
  
  // Try to parse specs if it's a JSON string, otherwise array
  let specsHTML = '';
  if (product.specs) {
     let specsObj = product.specs;
     if (typeof specsObj === 'string') {
        try { specsObj = JSON.parse(specsObj); } catch(e){}
     }
     
     if(typeof specsObj === 'object' && !Array.isArray(specsObj)) {
        for(let key in specsObj) {
           specsHTML += `<tr><td>${key}</td><td>${specsObj[key]}</td></tr>`;
        }
     } else if (Array.isArray(specsObj)) {
        specsObj.forEach(s => {
           specsHTML += `<tr><td>${s.name || s.key || 'Spec'}</td><td>${s.value}</td></tr>`;
        });
     }
  } else {
     specsHTML = `<tr><td>Category</td><td>${product.category}</td></tr>
                  <tr><td>Stock</td><td>${product.stock > 0 ? product.stock + ' units' : 'Out of Stock'}</td></tr>`;
  }
  specsTbody.innerHTML = specsHTML;
}

function updateQuantity(change) {
  let newQty = selectedQuantity + change;
  if (newQty < 1) newQty = 1;
  // if (currentProduct && newQty > currentProduct.stock) newQty = currentProduct.stock;
  
  selectedQuantity = newQty;
  document.getElementById('qty-input').value = selectedQuantity;
}

async function addToCartHandler() {
  if (!isLoggedIn()) {
     window.location.href = "login.html";
     return;
  }
  
  if (!currentProduct) return;

  const btn = document.getElementById('btn-add-cart');
  const orgText = btn.innerHTML;
  btn.innerHTML = `<span class="spinner spinner-primary"></span>`;
  btn.disabled = true;

  const res = await apiAddToCart(currentProduct.id, selectedQuantity);
  
  btn.innerHTML = orgText;
  btn.disabled = false;

  if (res.success) {
     alert("Item added to cart successfully!");
     // Update nav badge
     const cartRes = await apiGetCart();
     if (cartRes.success) {
        const qty = cartRes.data.items.reduce((acc, sum) => acc + sum.quantity, 0);
        document.getElementById('nav-cart-badge').textContent = qty;
     }
  } else {
     alert(res.error);
  }
}

function changeMainImage(url, el) {
  document.getElementById('pd-main-img').src = url;
  
  // Highlight thumbnail
  document.querySelectorAll('.thumbnail-box').forEach(box => box.classList.remove('active'));
  el.classList.add('active');
}
=======
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
  // Grab template
  const template = document.getElementById('product-template').content.cloneNode(true);
  const container = document.getElementById('product-container');
  container.innerHTML = ''; // clear loading state
  
  // Breadcrumb
  const cat = product.category || 'Category';
  template.getElementById('bc-category').textContent = cat;
  template.getElementById('bc-category').href = `products.html?category=${encodeURIComponent(cat)}`;
  template.getElementById('bc-name').textContent = product.name;
  
  // Title
  template.getElementById('p-title').textContent = product.name;
  
  // Rating 
  const rating = product.rating || 4.0;
  template.getElementById('p-rating').textContent = rating.toFixed(1);
  template.getElementById('p-reviews').textContent = product.review_count || 0;
  // Synthetic order count
  template.getElementById('p-orders').textContent = Math.floor(Math.random() * 500) + 100;
  
  // Features
  // Just stub some features based on segment
  const featuresBox = template.getElementById('p-features');
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

  // Pricing
  template.getElementById('p-price').textContent = `₹${(product.current_price || 0).toLocaleString()}`;
  if (product.original_price > product.current_price) {
    template.getElementById('p-old-price').textContent = `₹${product.original_price.toLocaleString()}`;
  } else {
    template.getElementById('p-old-price').style.display = 'none';
  }

  if (product.last_updated) {
    const hoursAgo = Math.round((new Date() - new Date(product.last_updated)) / (1000 * 60 * 60));
    if (hoursAgo < 48) {
      const up = template.getElementById('p-price-updated');
      up.textContent = `Last updated ${hoursAgo} hours ago`;
      up.style.display = 'block';
    }
  }

  // Attach elements to DOM so we can do gallery setup and add event listeners
  container.appendChild(template);
  
  // Call sub-renders
  // Pass an array of images (if backend doesn't support multiple, fake it by re-using the main image x3)
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

window.renderGallery = (images) => {
  const thumbStrip = document.getElementById('thumb-strip');
  const mainImage = document.getElementById('main-product-img');
  
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
  if (currentProduct && val > currentProduct.inventory_count) {
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
    // Simple DOM update for badge
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
  
  // Fake reviews for look and feel mapping as requested in Figma template
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
>>>>>>> Web-FE
