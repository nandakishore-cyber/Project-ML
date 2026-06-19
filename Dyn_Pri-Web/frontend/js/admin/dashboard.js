<<<<<<< HEAD
/* frontend/js/admin/dashboard.js */

document.addEventListener("DOMContentLoaded", () => {
  requireAdmin();
  updateNavAuthUI();
  initDashboard();
});

async function initDashboard() {
  await fetchStats();
  
  // Quick status poll on init
  const statusRes = await apiGetPricingStatus();
  if (statusRes.success && statusRes.data.is_running) {
     pollPricingStatus(); // Resume polling if already running
  }
}

async function fetchStats() {
  // In a real app, there'd be an /admin/stats endpoint.
  // We'll approximate by fetching products and orders.
  const pRes = await apiAdminGetProducts();
  const oRes = await apiAdminGetOrders();
  
  if (pRes.success) {
     document.getElementById('stat-products').textContent = pRes.data.length;
  }
  if (oRes.success) {
     document.getElementById('stat-orders').textContent = oRes.data.length;
     renderRecentOrders(oRes.data.slice(0, 5));
     
     // Quick stat for users: we'll just mock it or infer from unique user_ids if available
     const usersCount = new Set(oRes.data.map(o => o.user_id)).size;
     document.getElementById('stat-users').textContent = Math.max(usersCount, 1); // Mock 1 if no orders
  }

  // Fetch last update time from pricing status
  const ptRes = await apiGetPricingStatus();
  if (ptRes.success) {
     const lastRun = ptRes.data.last_run 
        ? new Date(ptRes.data.last_run).toLocaleString() 
        : 'Never';
     document.getElementById('stat-last-update').textContent = lastRun;
  }
}

async function handleTriggerPricing() {
  const btn = document.getElementById('btn-run-pricing');
  const orgHtml = btn.innerHTML;
  
  btn.innerHTML = `<span class="spinner"></span> Initiating ML Pipeline...`;
  btn.disabled = true;

  const res = await apiTriggerPricing();
  if (res.success) {
     document.getElementById('pricing-status-text').textContent = 'Pipeline is currently running...';
     pollPricingStatus();
  } else {
     alert("Failed to start pricing pipeline: " + res.error);
     btn.innerHTML = orgHtml;
     btn.disabled = false;
  }
}

async function pollPricingStatus() {
  const btn = document.getElementById('btn-run-pricing');
  const statusText = document.getElementById('pricing-status-text');
  
  btn.innerHTML = `<span class="spinner"></span> Running...`;
  btn.disabled = true;

  const interval = setInterval(async () => {
     const res = await apiGetPricingStatus();
     if (res.success) {
        if (!res.data.is_running) {
           clearInterval(interval);
           statusText.innerHTML = `<span class="text-success">✅ Pipeline completed successfully</span>`;
           btn.innerHTML = 'Run ML Pricing Now';
           btn.disabled = false;
           // refresh stats for last run time
           fetchStats();
        }
     }
  }, 2000); // Check every 2 seconds
}

function renderRecentOrders(orders) {
  const tb = document.getElementById('recent-orders-tbody');
  if (!orders || orders.length === 0) {
     tb.innerHTML = `<tr><td colspan="5" style="text-align:center;">No recent orders.</td></tr>`;
     return;
  }

  tb.innerHTML = orders.map(o => {
     const dateStr = new Date(o.created_at).toLocaleDateString();
     return `
       <tr>
         <td>#${o.id}</td>
         <td>${dateStr}</td>
         <td>${o.shipping_address ? o.shipping_address.split(',')[0] : 'N/A'}</td>
         <td>₹${Math.round(o.total_amount)}</td>
         <td><span class="badge badge-blue">${o.status}</span></td>
       </tr>
     `;
  }).join('');
=======
// frontend/js/admin/dashboard.js

window.initDashboard = () => {
  fetchStats();
  renderRecentOrders();
};

window.fetchStats = async () => {
  // Typical dashboard would call an aggregated stats endpoint.
  // The plan didn't define a specific total stats endpoint, so we can aggregate or if available use apiAdminGetProducts / Orders
  
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
  if (!Array.isArray(orders)) {
    orders = orders.data || [];
  }

  orders.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  const recent = orders.slice(0, 5); // top 5

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
    
    // Total fallback
    const total = o.total_amount || 0;

    tbody.innerHTML += `
      <tr>
        <td class="fw-medium">#${o.id}</td>
        <td>${dateStr}</td>
        <td class="fw-bold">₹${total.toLocaleString()}</td>
        <td><span class="order-status ${statusClass}">${statusText}</span></td>
      </tr>
    `;
  });
};

window.handleTriggerPricing = async () => {
  const btn = document.getElementById('btn-trigger-pricing');
  const status = document.getElementById('pricing-status');
  
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner" style="width:14px;height:14px;margin-right:8px;border-color:rgba(255,255,255,0.3);border-top-color:#fff;"></span> Running...';
  status.innerText = 'Status: Executing XGBoost Model prediction...';

  const res = await apiTriggerPricing();
  
  btn.disabled = false;
  btn.innerHTML = '⚡ Run Price Update Now';

  if (res.success) {
    status.innerText = `Status: Success - Prices updated at ${new Date().toLocaleTimeString()}`;
    showToast('Pricing updated successfully!');
  } else {
    status.innerText = `Status: Failed - ${res.error}`;
    showToast(res.error || 'Failed to trigger pricing update', 'error');
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
