// frontend/js/admin/dashboard.js

// All products cached for the simulator loader
let _allProducts = [];
let _lastPredictedPrice = null;
let _simDebounceTimer = null;

window.initDashboard = () => {
  fetchStats();
  renderRecentOrders();
  loadSimulatorProducts();
};

window.fetchStats = async () => {
  try {
    const [productsRes, ordersRes] = await Promise.all([
      apiAdminGetProducts(),
      apiAdminGetOrders()
    ]);

    if (productsRes.success) {
      let count = Array.isArray(productsRes.data) ? productsRes.data.length : (productsRes.data.data ? productsRes.data.data.length : 0);
      document.getElementById('stat-products').innerText = count;
    }

    if (ordersRes.success) {
      let count = Array.isArray(ordersRes.data) ? ordersRes.data.length : (ordersRes.data.data ? ordersRes.data.data.length : 0);
      document.getElementById('stat-orders').innerText = count;
    }
  } catch (error) {
    console.error("Failed to load some stats", error);
  }
};

window.renderRecentOrders = async () => {
  const tbody = document.getElementById('admin-recent-orders');

  const res = await apiAdminGetOrders();
  if (!res.success) {
    tbody.innerHTML = `<tr><td colspan="4" class="text-danger center">Failed to load orders</td></tr>`;
    return;
  }

  let orders = res.data;
  if (!Array.isArray(orders)) orders = orders.data || [];

  orders.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  const recent = orders.slice(0, 5);

  if (recent.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;">No orders found</td></tr>`;
    return;
  }

  tbody.innerHTML = '';
  recent.forEach(o => {
    let statusClass = 'status-pending';
    let statusText = o.status || 'Pending';
    if (statusText.toLowerCase() === 'completed' || statusText.toLowerCase() === 'paid') statusClass = 'status-completed';
    else if (statusText.toLowerCase() === 'cancelled') statusClass = 'status-cancelled';

    const dateStr = new Date(o.created_at).toLocaleDateString();
    const total = o.total_amount || 0;

    let itemsHtml = '';
    if (o.items && o.items.length > 0) {
      itemsHtml = `<div style="background-color: rgba(148, 163, 184, 0.1); padding: 12px 16px; border-radius: 6px; margin-top: 10px; border: 1px solid rgba(148, 163, 184, 0.2);">
        <div style="font-size: 12px; font-weight: bold; color: #64748b; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px;">Order Details</div>
        <div style="display: flex; flex-direction: column; gap: 6px;">`;
      
      o.items.forEach(item => {
        const pName = item.product ? item.product.name : 'Unknown Product';
        const pCat = item.product ? item.product.category : 'N/A';
        const itemTotal = (item.quantity * item.price_at_purchase).toLocaleString();
        const price = item.price_at_purchase.toLocaleString();
        
        itemsHtml += `
          <div style="display: flex; justify-content: space-between; font-size: 13px; border-bottom: 1px solid rgba(148, 163, 184, 0.1); padding-bottom: 6px;">
            <div>
              <span style="font-weight: 600; color: var(--color-navy);">${pName}</span>
              <span style="color: #64748b; font-size: 12px; margin-left: 6px;">(${pCat})</span>
            </div>
            <div style="color: #475569;">
              ${item.quantity} x ₹${price} <strong style="margin-left: 12px; color: var(--color-navy);">₹${itemTotal}</strong>
            </div>
          </div>
        `;
      });
      itemsHtml += `</div></div>`;
    }

    tbody.innerHTML += `
      <tr>
        <td class="fw-medium" style="vertical-align: top; padding-top: 16px;">#${o.id}</td>
        <td style="vertical-align: top; padding-top: 16px;">${dateStr}</td>
        <td class="fw-bold" style="vertical-align: top; padding-top: 16px;">₹${Number(total).toLocaleString()}</td>
        <td style="vertical-align: top; padding-top: 16px;"><span class="order-status ${statusClass}">${statusText}</span></td>
      </tr>
      <tr style="background: transparent;">
        <td colspan="4" style="padding: 0 16px 16px 16px; border-top: none;">
          ${itemsHtml}
        </td>
      </tr>
    `;
  });
};

window.handleTriggerPricing = async () => {
  const btn = document.getElementById('btn-trigger-pricing');
  const statusEl = document.getElementById('pricing-status');

  btn.disabled = true;
  btn.innerHTML = '<span class="spinner" style="width:14px;height:14px;margin-right:8px;border-color:rgba(255,255,255,0.3);border-top-color:#fff;"></span> Running...';
  if (statusEl) statusEl.innerText = 'Status: Executing XGBoost Model prediction...';

  const res = await apiTriggerPricing();

  btn.disabled = false;
  btn.innerHTML = '⚡ Run Price Update Now';

  if (res.success) {
    if (statusEl) statusEl.innerText = `Status: Success — Prices updated at ${new Date().toLocaleTimeString()}`;
    showToast('Pricing updated successfully!');
  } else {
    if (statusEl) statusEl.innerText = `Status: Failed — ${res.error}`;
    showToast(res.error || 'Failed to trigger pricing update', 'error');
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// ML PRICE SIMULATOR
// ─────────────────────────────────────────────────────────────────────────────

window.loadSimulatorProducts = async () => {
  const res = await apiAdminGetProducts();
  if (!res.success) return;
  _allProducts = Array.isArray(res.data) ? res.data : (res.data.data || []);

  const loader = document.getElementById('sim-product-loader');
  const applySelect = document.getElementById('sim-apply-product');
  if (!loader) return;

  _allProducts.forEach(p => {
    const opt = `<option value="${p.id}">${p.name} (${p.category} | ${p.sub_category})</option>`;
    loader.innerHTML += opt;
    if (applySelect) applySelect.innerHTML += opt;
  });
};

window.loadProductIntoSimulator = (productId) => {
  if (!productId) return;
  const p = _allProducts.find(x => String(x.id) === String(productId));
  if (!p) return;

  const setSlider = (id, val, lblId, fmt) => {
    const el = document.getElementById(id);
    if (el) el.value = val;
    const lbl = lblId ? document.getElementById(lblId) : null;
    if (lbl) lbl.textContent = fmt(val);
  };

  document.getElementById('sim-category').value = p.category;
  document.getElementById('sim-sub-category').value = p.sub_category;

  setSlider('sim-base-price',       p.base_price,       'lbl-base',     v => Number(v).toLocaleString());
  setSlider('sim-competitor-price', p.competitor_price, 'lbl-comp',     v => Number(v).toLocaleString());
  setSlider('sim-demand',           p.demand,           'lbl-demand',   v => v);
  setSlider('sim-stock',            p.stock,            'lbl-stock',    v => v);
  setSlider('sim-rating',           p.rating,           'lbl-rating',   v => parseFloat(v).toFixed(1) + ' ★');
  setSlider('sim-reviews',          p.reviews,          'lbl-reviews',  v => Number(v).toLocaleString());
  setSlider('sim-discount',         p.discount,         'lbl-discount', v => v + '%');

  // Sync the "apply to" dropdown
  const applySelect = document.getElementById('sim-apply-product');
  if (applySelect) applySelect.value = productId;

  runSimulator();
};

window.runSimulator = () => {
  // Debounce to avoid hammering the API on every slider tick
  clearTimeout(_simDebounceTimer);
  _simDebounceTimer = setTimeout(async () => {
    const params = {
      category:         document.getElementById('sim-category').value,
      sub_category:     document.getElementById('sim-sub-category').value,
      base_price:       parseFloat(document.getElementById('sim-base-price').value),
      competitor_price: parseFloat(document.getElementById('sim-competitor-price').value),
      demand:           parseInt(document.getElementById('sim-demand').value),
      stock:            parseInt(document.getElementById('sim-stock').value),
      rating:           parseFloat(document.getElementById('sim-rating').value),
      reviews:          parseInt(document.getElementById('sim-reviews').value),
      discount:         parseFloat(document.getElementById('sim-discount').value),
    };

    const resultBox = document.getElementById('sim-result');
    resultBox.innerHTML = `<div style="color:#94a3b8;"><span class="spinner" style="width:20px;height:20px;border-top-color:#8b5cf6;display:inline-block;vertical-align:middle;"></span> &nbsp;Predicting with XGBoost...</div>`;

    const res = await apiPredictPrice(params);

    if (!res.success) {
      resultBox.innerHTML = `<div style="color:#f87171; font-size:14px;">❌ ${res.error}</div>`;
      return;
    }

    const d = res.data;
    _lastPredictedPrice = d.optimized_price;

    const base = params.base_price;
    const diff = d.optimized_price - base;
    const pct  = ((Math.abs(diff) / base) * 100).toFixed(1);
    const arrow = diff > 0 ? '📈' : diff < 0 ? '📉' : '⚖️';
    const color = diff > 0 ? '#f87171' : diff < 0 ? '#34d399' : '#94a3b8';
    const sign  = diff > 0 ? '+' : diff < 0 ? '-' : '';

    resultBox.innerHTML = `
      <div style="width:100%;">
        <div style="font-size:12px; color:#64748b; text-transform:uppercase; letter-spacing:1px; margin-bottom:14px; text-align:center;">
          Segment: <strong style="color:#a5b4fc">${d.segment}</strong>
          &nbsp;|&nbsp; Season: <strong style="color:#a5b4fc">${d.season_detected}</strong>
          &nbsp;|&nbsp; Day: <strong style="color:#a5b4fc">${d.day_detected}</strong>
        </div>
        <div style="display:flex; align-items:center; justify-content:center; gap:32px; flex-wrap:wrap;">
          <div style="text-align:center;">
            <div style="font-size:12px; color:#64748b; margin-bottom:4px;">Base Price</div>
            <div style="font-size:24px; font-weight:700; color:#e2e8f0;">₹${base.toLocaleString()}</div>
          </div>
          <div style="font-size:36px;">${arrow}</div>
          <div style="text-align:center;">
            <div style="font-size:12px; color:#64748b; margin-bottom:4px;">XGBoost Optimized Price</div>
            <div style="font-size:36px; font-weight:800; color:#a5b4fc; letter-spacing:-1px;">₹${d.optimized_price.toLocaleString()}</div>
            <div style="font-size:14px; color:${color}; font-weight:700; margin-top:4px;">${sign}₹${Math.abs(diff).toLocaleString()} (${sign}${pct}%)</div>
          </div>
          <div style="text-align:center; border-left:1px solid rgba(255,255,255,0.08); padding-left:32px;">
            <div style="font-size:12px; color:#64748b; margin-bottom:4px;">Raw ML Output</div>
            <div style="font-size:18px; color:#94a3b8;">₹${d.raw_prediction.toLocaleString()}</div>
            <div style="font-size:11px; color:#475569; margin-top:4px;">Price Cap: ₹${d.price_cap.toLocaleString()}</div>
          </div>
        </div>
      </div>
    `;

    document.getElementById('sim-apply-area').style.display = 'block';
  }, 400);
};

window.applyPredictedPrice = async () => {
  const productId = document.getElementById('sim-apply-product').value;
  if (!productId) { showToast('Select a product to apply the price to', 'error'); return; }
  if (!_lastPredictedPrice) { showToast('Run the simulator first to get a prediction', 'error'); return; }

  const res = await apiAdminUpdateProduct(productId, { current_price: _lastPredictedPrice });
  if (res.success) {
    showToast(`✅ ₹${_lastPredictedPrice.toLocaleString()} applied to product #${productId} and saved!`);
  } else {
    showToast(res.error || 'Failed to apply price', 'error');
  }
};

// ─── Toast ────────────────────────────────────────────────────────────────────
function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const id = Date.now();
  container.insertAdjacentHTML('beforeend', `<div id="toast-${id}" class="toast toast-${type}">${message}</div>`);
  setTimeout(() => {
    const t = document.getElementById(`toast-${id}`);
    if (t) { t.style.animation = 'fadeOut 0.3s ease forwards'; setTimeout(() => t.remove(), 300); }
  }, 3000);
}
