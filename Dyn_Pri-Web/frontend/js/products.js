// frontend/js/products.js

let allProductsOriginal = []; // Store fetched products for client-side filtering

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
  applyFiltersAndSort();
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

  // Update URL purely for category if one is selected
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
    const imageUrl = p.image_url || 'https://placehold.co/400x400/F5F6F8/9CA3AF?text=No+Image';
    const rating = p.rating || 0;
    const reviews = p.review_count || 0;
    
    // Price dynamic calculation
    const base = p.base_price || p.current_price;
    const current = p.current_price;
    let badgeHtml = '';
    let dynamicText = '⚖️ Price Remains Same';
    let dynamicColor = 'var(--color-muted)';

    if (current > base) {
      const incPercent = Math.round(((current - base) / base) * 100);
      badgeHtml = `<div class="badge badge-danger" style="position:absolute; top:12px; left:12px; z-index:2; box-shadow: 0 4px 10px rgba(239, 68, 68, 0.3);">📈 High Demand</div>`;
      dynamicText = `📈 Price will be high soon!`;
      dynamicColor = 'var(--color-danger)';
    } else if (current < base) {
      const dropPercent = Math.round(((base - current) / base) * 100);
      badgeHtml = `<div class="badge badge-success" style="position:absolute; top:12px; left:12px; z-index:2; box-shadow: 0 4px 10px rgba(16, 185, 129, 0.3);">📉 Price Dropped</div>`;
      dynamicText = `📉 Price dropped by ${dropPercent}%`;
      dynamicColor = 'var(--color-success)';
    } else {
      if (p.season === 'Festive') {
        badgeHtml = `<div class="badge badge-warning" style="position:absolute; top:12px; left:12px; z-index:2;">✨ Festive</div>`;
      } else {
        const tierClass = p.sub_category === 'Premium' ? 'badge-primary' : (p.sub_category === 'Budget' ? 'badge-success' : 'badge-info');
        badgeHtml = `<div class="badge ${tierClass}" style="position:absolute; top:12px; left:12px; z-index:2;">${p.sub_category}</div>`;
      }
    }

    // Price updated tag logic if within 24hrs
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
          ${(p.base_price && p.base_price > p.current_price) ? `<span class="old-price">₹${p.base_price.toLocaleString()}</span>` : ''}
        </div>
        <div style="font-size: 11px; color: ${dynamicColor}; margin-bottom: 6px; display: flex; align-items: center; gap: 4px; font-weight: 600;">
          <span title="This price is dynamically adjusted based on real-time market demand and may change.">⚡ ${dynamicText}</span>
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
  }
}
