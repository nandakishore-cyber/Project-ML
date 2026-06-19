<<<<<<< HEAD
/* frontend/js/products.js */

let allProducts = [];
let currentFilters = {
  categories: [],
  sub_categories: [], // Budget, Mid, Premium
  min_rating: 0,
  max_price: 300000,
  in_stock: false
};
let currentSort = 'default';

document.addEventListener("DOMContentLoaded", () => {
  updateNavAuthUI();
  initProductsPage();
});

async function initProductsPage() {
  // Check URL params for category
  const params = new URLSearchParams(window.location.search);
  const initialCategory = params.get('category');
  if (initialCategory) {
    currentFilters.categories.push(initialCategory);
    // check the checkbox if it exists
    const cb = document.querySelector(`input.filter-cat[value="${initialCategory}"]`);
    if (cb) cb.checked = true;
  }

  // Bind filter events
  document.querySelectorAll('.filter-cat').forEach(cb => {
    cb.addEventListener('change', handleFilterChange);
  });
  document.querySelectorAll('.filter-subcat').forEach(cb => {
    cb.addEventListener('change', handleFilterChange);
  });
  const priceSlider = document.getElementById('price-slider');
  if (priceSlider) {
    priceSlider.addEventListener('input', (e) => {
      document.getElementById('price-val').textContent = `₹${e.target.value}`;
    });
    priceSlider.addEventListener('change', (e) => {
      currentFilters.max_price = parseInt(e.target.value);
      applyFiltersAndSort();
    });
  }
  document.querySelectorAll('.star-filter').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.star-filter').forEach(b => b.classList.remove('active'));
      const tgt = e.currentTarget;
      tgt.classList.add('active');
      currentFilters.min_rating = parseFloat(tgt.dataset.val);
      applyFiltersAndSort();
    });
  });
  const stockToggle = document.getElementById('in-stock-toggle');
  if (stockToggle) {
    stockToggle.addEventListener('change', (e) => {
       currentFilters.in_stock = e.target.checked;
       applyFiltersAndSort();
    });
  }

  const sortSelect = document.getElementById('sort-select');
  if (sortSelect) {
    sortSelect.addEventListener('change', (e) => {
      currentSort = e.target.value;
      applyFiltersAndSort();
    });
  }

  await fetchAndRenderProducts();
}

async function fetchAndRenderProducts() {
  const grid = document.getElementById('products-grid');
  grid.innerHTML = `<div class="empty-state" style="grid-column: 1/-1;"><span class="spinner spinner-primary"></span></div>`;
  
  const res = await apiGetProducts();
  if (!res.success) {
    grid.innerHTML = `<div class="empty-state" style="grid-column: 1/-1;">Error loading products: ${res.error}</div>`;
    return;
  }
  
  allProducts = res.data;
  applyFiltersAndSort();
}

function handleFilterChange() {
  const catCbs = document.querySelectorAll('.filter-cat:checked');
  currentFilters.categories = Array.from(catCbs).map(cb => cb.value);

  const subCatCbs = document.querySelectorAll('.filter-subcat:checked');
  currentFilters.sub_categories = Array.from(subCatCbs).map(cb => cb.value);

  applyFiltersAndSort();
}

function applyFiltersAndSort() {
  let filtered = allProducts;

  // Category
  if (currentFilters.categories.length > 0) {
    filtered = filtered.filter(p => currentFilters.categories.includes(p.category));
  }
  
  // Sub-category check logic (Budget/Mid/Premium)
  // Assuming the backend has a `tier` or `competitor_price_tier` field, or we infer from segment
  if (currentFilters.sub_categories.length > 0) {
    filtered = filtered.filter(p => {
       // if backend has product.segment:
       if (p.segment) return currentFilters.sub_categories.includes(p.segment);
       return true; // fallback if no segment data
    });
  }

  // Price
  if (currentFilters.max_price < 300000) {
    filtered = filtered.filter(p => p.current_price <= currentFilters.max_price);
  }

  // Rating
  if (currentFilters.min_rating > 0) {
    filtered = filtered.filter(p => (p.rating || 0) >= currentFilters.min_rating);
  }

  // Stock
  if (currentFilters.in_stock) {
    filtered = filtered.filter(p => p.stock > 0);
  }

  // Sort
  if (currentSort === 'price-asc') {
    filtered.sort((a,b) => a.current_price - b.current_price);
  } else if (currentSort === 'price-desc') {
    filtered.sort((a,b) => b.current_price - a.current_price);
  } else if (currentSort === 'rating') {
    filtered.sort((a,b) => (b.rating || 0) - (a.rating || 0));
  }

  // Update Title + Count
  document.getElementById('product-count').textContent = `${filtered.length} products`;
  let title = "All Products";
  if (currentFilters.categories.length === 1) {
    title = currentFilters.categories[0];
  } else if (currentFilters.categories.length > 1) {
    title = "Multiple Categories";
  }
  const params = new URLSearchParams(window.location.search);
  const qStr = params.get('category');
  if(qStr && currentFilters.categories.length === 1) {
     title = qStr; 
  }
  document.getElementById('page-title-text').textContent = title;

  renderProductGrid(filtered);
}

function renderProductGrid(products) {
  const grid = document.getElementById('products-grid');
  
  if (products.length === 0) {
    grid.innerHTML = `<div class="empty-state" style="grid-column: 1/-1;">No products match your filters.</div>`;
    return;
  }

  grid.innerHTML = products.map(product => {
    const oldPrice = product.base_price ? product.base_price : product.current_price; 
    let strikePriceHtml = '';
    if (product.current_price < oldPrice) {
       strikePriceHtml = `<span class="old-price">₹${Math.round(oldPrice)}</span>`;
    }

    const placeholderImg = "https://placehold.co/400x400/F5F6F8/9CA3AF?text=No+Image";
    const imgUrl = product.image_url || placeholderImg;
    
    let segmentBadgeHtml = '';
    if (product.segment) { // Budget, Mid, Premium
       let colorClass = 'badge-blue';
       if(product.segment==='Premium') colorClass = 'badge-warning';
       if(product.segment==='Budget') colorClass = 'badge-success';
       segmentBadgeHtml = `<span class="badge ${colorClass}" style="position:absolute; top:8px; left:8px; z-index:2;">${product.segment}</span>`;
    }

    return `
      <div class="card product-card">
        <a href="product-detail.html?id=${product.id}" class="product-card-img-zone">
          ${segmentBadgeHtml}
          <img src="${imgUrl}" alt="${product.name}" loading="lazy" onerror="this.src='${placeholderImg}'">
        </a>
        <div style="display:flex; justify-content: space-between; align-items: start;">
           <div class="price-row">
             <span class="current-price">₹${Math.round(product.current_price)}</span>
             ${strikePriceHtml}
           </div>
           <button class="btn-icon" style="width: 32px; height: 32px; border: none;" onclick="alert('Added to wishlist')">♡</button>
        </div>
        
        <div class="star-rating">
          <svg viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
          <span>${product.rating || '4.0'}</span>
        </div>
        
        <a href="product-detail.html?id=${product.id}"><h3 class="product-card-title">${product.name}</h3></a>
        
        <div style="margin-top: auto; display: flex; gap: 8px;">
           <button class="btn btn-primary btn-block" onclick="addToCart(${product.id})">🛒 Add to Cart</button>
        </div>
      </div>
    `;
  }).join('');
}

async function addToCart(productId) {
  if (!isLoggedIn()) {
     window.location.href = "login.html";
     return;
  }
  const res = await apiAddToCart(productId, 1);
  if (res.success) {
     alert("Item added to cart!");
  } else {
     alert(res.error);
=======
// frontend/js/products.js

let allProductsOriginal = []; // Store fetched products to apply client-side filtering if backend doesn't support thorough filtering

window.initProductsPage = () => {
  // Read URL params and set initial filters
  const urlParams = new URLSearchParams(window.location.search);
  const initialCategory = urlParams.get('category');
  
  if (initialCategory) {
    const cb = document.querySelector(`input[name="category"][value="${initialCategory}"]`);
    if (cb) cb.checked = true;
    document.getElementById('page-title').innerText = initialCategory;
  }

  // Attach event listeners to filter inputs
  document.querySelectorAll('.products-sidebar input').forEach(input => {
    input.addEventListener('change', handleFilterChange);
  });
  
  // Custom debounce for price inputs
  let priceTimeout;
  document.getElementById('price-min').addEventListener('input', () => {
    clearTimeout(priceTimeout);
    priceTimeout = setTimeout(handleFilterChange, 500);
  });
  document.getElementById('price-max').addEventListener('input', () => {
    clearTimeout(priceTimeout);
    priceTimeout = setTimeout(handleFilterChange, 500);
  });

  document.getElementById('sort-select').addEventListener('change', handleSortChange);

  // Initial fetch
  fetchAndRenderProducts();
};

window.fetchAndRenderProducts = async () => {
  // Show spinner
  document.getElementById('products-grid').innerHTML = `
    <div style="grid-column: 1 / -1; text-align: center; padding: 40px;">
      <span class="spinner spinner-large"></span>
    </div>
  `;

  // Fetch all products (If backend supports API filters we would pass them here. 
  // Given standard plan specs, we might fetch all and filter in JS, or build query string if supported.
  // We'll build query string for category mostly or fetch all and filter client side for rich UI experience.)
  
  const res = await apiGetProducts();
  
  if (!res.success) {
    document.getElementById('products-grid').innerHTML = `
      <div class="empty-state" style="grid-column: 1/-1;">
        <h3>Error</h3>
        <p class="text-danger">${res.error}</p>
      </div>
    `;
    return;
  }

  let products = res.data;
  if (!Array.isArray(products) && products.data) {
    products = products.data;
  }

  allProductsOriginal = products || [];
  applyFiltersAndSort(); // This will trigger rendering
};

window.applyFiltersAndSort = () => {
  let filtered = [...allProductsOriginal];

  // Get active filters
  const categories = Array.from(document.querySelectorAll('input[name="category"]:checked')).map(el => el.value);
  const segments = Array.from(document.querySelectorAll('input[name="segment"]:checked')).map(el => el.value);
  const minPrice = parseFloat(document.getElementById('price-min').value) || 0;
  const maxPrice = parseFloat(document.getElementById('price-max').value) || Infinity;
  const minRatingEl = document.querySelector('input[name="rating"]:checked');
  const minRating = minRatingEl ? parseInt(minRatingEl.value) : 0;
  const inStockOnly = document.getElementById('in-stock-only').checked;

  // Update Page Title if single category
  if (categories.length === 1) {
    document.getElementById('page-title').innerText = categories[0];
  } else if (categories.length > 1) {
    document.getElementById('page-title').innerText = 'Multiple Categories';
  } else {
    document.getElementById('page-title').innerText = 'All Electronics';
  }

  // Update URL purely for category if one is selected (aesthetic)
  updateURLParams(categories);

  // Apply filters
  if (categories.length > 0) {
    filtered = filtered.filter(p => categories.includes(p.category));
  }
  if (segments.length > 0) {
    filtered = filtered.filter(p => segments.includes(p.segment));
  }
  
  filtered = filtered.filter(p => {
    const price = p.current_price || 0;
    return price >= minPrice && price <= maxPrice;
  });

  if (minRating > 0) {
    filtered = filtered.filter(p => (p.rating || 0) >= minRating);
  }

  if (inStockOnly) {
    filtered = filtered.filter(p => (p.inventory_count || 0) > 0);
  }

  // Apply sort
  const sortMap = {
    'price_asc': (a, b) => (a.current_price || 0) - (b.current_price || 0),
    'price_desc': (a, b) => (b.current_price || 0) - (a.current_price || 0),
    'rating_desc': (a, b) => (b.rating || 0) - (a.rating || 0),
    'recommended': (a, b) => (b.demand_multiplier || 0) - (a.demand_multiplier || 0)
  };

  const sortVal = document.getElementById('sort-select').value;
  if (sortMap[sortVal]) {
    filtered.sort(sortMap[sortVal]);
  }

  // Update count
  document.getElementById('products-count').innerText = `Showing ${filtered.length} products`;

  renderProductGrid(filtered);
};


window.renderProductGrid = (products) => {
  const grid = document.getElementById('products-grid');
  grid.innerHTML = '';

  if (products.length === 0) {
    grid.innerHTML = `
      <div class="empty-state" style="grid-column: 1/-1;">
        <h3>No products found</h3>
        <p>Try adjusting your filters or search criteria.</p>
        <button class="btn btn-outline mt-4" onclick="document.querySelectorAll('.products-sidebar input').forEach(el=>el.checked=el.type=='checkbox'?false:el.checked); document.getElementById('price-min').value=''; document.getElementById('price-max').value=''; handleFilterChange();">Clear Filters</button>
      </div>
    `;
    return;
  }

  products.forEach(p => {
    // Note: createProductCardHTML could be centralized in a utils file, 
    // but we define a local one or re-use logic to match Figma requirements strictly.
    const imageUrl = p.image_url || 'https://placehold.co/400x400/F5F6F8/9CA3AF?text=No+Image';
    const rating = p.rating || 0;
    const reviews = p.review_count || 0;
    
    let badgeHtml = '';
    if (p.season === 'Festive') {
      badgeHtml = `<div class="badge badge-warning" style="position:absolute; top:12px; left:12px; z-index:2;">✨ Festive</div>`;
    } else {
      const tierClass = p.segment === 'Premium' ? 'badge-primary' : (p.segment === 'Budget' ? 'badge-success' : 'badge-info');
      badgeHtml = `<div class="badge ${tierClass}" style="position:absolute; top:12px; left:12px; z-index:2;">${p.segment}</div>`;
    }

    // Price updated tag logic if within 24hrs (assume last_updated exists)
    let updatedTag = '';
    if (p.last_updated) {
      const hoursAgo = Math.round((new Date() - new Date(p.last_updated)) / (1000 * 60 * 60));
      if (hoursAgo < 24) {
         updatedTag = `<div style="font-size:11px; color:var(--color-primary); margin-bottom:4px; font-weight:500;">⚡ Price updated ${hoursAgo}h ago</div>`;
      }
    }

    grid.innerHTML += `
      <div class="card card-hover product-card">
        ${badgeHtml}
        <div class="image-area">
          <a href="product-detail.html?id=${p.id}"><img src="${imageUrl}" alt="${p.name}" loading="lazy"></a>
          <button class="btn-icon wishlist-btn-pos" title="Save to wishlist">♡</button>
        </div>
        
        ${updatedTag}
        <div class="price-row">
          <span class="price">₹${(p.current_price || 0).toLocaleString()}</span>
          ${p.original_price > p.current_price ? `<span class="old-price">₹${p.original_price.toLocaleString()}</span>` : ''}
        </div>
        
        <div class="rating-row">
          ★ ${rating.toFixed(1)} <span class="text-muted" style="font-weight:400; margin-left:4px;">(${reviews})</span>
        </div>
        
        <a href="product-detail.html?id=${p.id}">
          <h3 class="product-name">${p.name}</h3>
        </a>
        
        <div class="card-actions">
          <button class="btn btn-primary" onclick="addToCart(${p.id})">🛒 Add to cart</button>
        </div>
      </div>
    `;
  });
};

window.handleFilterChange = () => {
  applyFiltersAndSort();
};

window.handleSortChange = () => {
  applyFiltersAndSort();
};

window.updateURLParams = (categories) => {
  const url = new URL(window.location);
  url.searchParams.delete('category'); // clear existing
  if (categories.length === 1) {
    url.searchParams.set('category', categories[0]);
  }
  window.history.replaceState({}, '', url);
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

window.addToCart = async function(id) {
  if (!isLoggedIn()) {
    showToast('Please login to add to cart', 'error');
    setTimeout(() => { window.location.href = 'login.html'; }, 1500);
    return;
  }
  
  const res = await apiAddToCart(id, 1);
  if (res.success) {
    showToast('Added to cart successfully!');
    const badge = document.getElementById('cart-badge-count');
    if(badge) badge.innerText = parseInt(badge.innerText || '0') + 1;
  } else {
    showToast(res.error || 'Failed to add item', 'error');
>>>>>>> Web-FE
  }
}
