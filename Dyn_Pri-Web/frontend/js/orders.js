<<<<<<< HEAD
/* frontend/js/orders.js */

document.addEventListener("DOMContentLoaded", () => {
  requireLogin();
  updateNavAuthUI();
  initOrders();
});

async function initOrders() {
  await fetchAndRenderOrders();
}

async function fetchAndRenderOrders() {
  const container = document.getElementById('orders-container');
  container.innerHTML = `<span class="spinner spinner-primary"></span> Loading orders...`;

  const res = await apiGetOrders();
  if (!res.success) {
    container.innerHTML = `<div class="empty-state text-danger">${res.error}</div>`;
    return;
  }

  const orders = res.data;
  renderOrders(orders);
}

function renderOrders(orders) {
  const container = document.getElementById('orders-container');
  
  if (!orders || orders.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <h3 style="margin-bottom: 8px;">No orders found</h3>
        <p class="text-muted" style="margin-bottom: 24px;">You haven't placed any orders yet.</p>
        <a href="products.html" class="btn btn-primary">Start Shopping</a>
=======
// frontend/js/orders.js

window.initOrdersPage = () => {
  fetchAndRenderOrders();
};

window.fetchAndRenderOrders = async () => {
  const container = document.getElementById('orders-list');
  
  const res = await apiGetOrders();
  if (!res.success) {
    container.innerHTML = `
      <div class="no-orders-state">
        <h3>Error loading orders</h3>
        <p class="text-danger">${res.error}</p>
>>>>>>> Web-FE
      </div>
    `;
    return;
  }

<<<<<<< HEAD
  // Sort newest first
  orders.sort((a,b) => new Date(b.created_at) - new Date(a.created_at));

  const placeholderImg = "https://placehold.co/400x400/F5F6F8/9CA3AF?text=No+Image";
  let html = '';

  orders.forEach(order => {
    const dateStr = new Date(order.created_at).toLocaleDateString('en-IN', {
      year: 'numeric', month: 'short', day: 'numeric'
    });
    
    let statusBadge = `<span class="badge badge-warning">Processing</span>`;
    if (order.status === 'SHIPPED') statusBadge = `<span class="badge badge-blue">Shipped</span>`;
    if (order.status === 'DELIVERED') statusBadge = `<span class="badge badge-success">Delivered</span>`;
    if (order.status === 'CANCELLED') statusBadge = `<span class="badge badge-danger">Cancelled</span>`;
    // For this generic setup:
    if (order.status && order.status.toLowerCase() !== 'processing') {
       statusBadge = `<span class="badge badge-blue">${order.status}</span>`;
    }

    let itemsHtml = '';
    const items = order.items || [];
    
    items.forEach(item => {
      // "price_at_purchase" should be shown as requested
      const price = item.price_at_purchase || 0;
      const product = item.product || {};
      const imgUrl = product.image_url || placeholderImg;
      const name = product.name || "Product";

      itemsHtml += `
        <div class="order-item">
          <div class="order-item-img"><img src="${imgUrl}" alt="${name}" onerror="this.src='${placeholderImg}'"></div>
          <div class="order-item-info">
            <a href="product-detail.html?id=${item.product_id}" class="order-item-title">${name}</a>
            <div class="order-item-meta">Qty: ${item.quantity}</div>
            <div class="order-item-price">₹${Math.round(price)}</div>
          </div>
          <div>
            <button class="btn btn-outline" style="padding: 6px 12px; font-size: 13px;" onclick="location.href='product-detail.html?id=${item.product_id}'">Buy Again</button>
          </div>
        </div>
      `;
    });

    html += `
      <div class="order-card">
        <div class="order-header">
          <div class="order-header-info">
            <div>
              <div class="order-meta-label">Order Placed</div>
              <div class="order-meta-value">${dateStr}</div>
            </div>
            <div>
              <div class="order-meta-label">Total</div>
              <div class="order-meta-value">₹${Math.round(order.total_amount)}</div>
            </div>
            <div>
              <div class="order-meta-label">Order #</div>
              <div class="order-meta-value">${order.id || order.razorpay_order_id}</div>
            </div>
          </div>
          <div>
            ${statusBadge}
          </div>
        </div>
        
        <div class="order-body">
          ${itemsHtml}
        </div>
=======
  let orders = res.data;
  if (!Array.isArray(orders)) { // handle pagination wrapper if present
    orders = orders.data || [];
  }

  // Sort newest first
  orders.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));

  if (orders.length === 0) {
    container.innerHTML = `
      <div class="no-orders-state">
        <h3>No orders yet</h3>
        <p>You haven't placed any orders yet. Start exploring our dynamic deals!</p>
        <a href="products.html" class="btn btn-primary">Browse Products</a>
      </div>
    `;
    return;
  }

  container.innerHTML = '';
  orders.forEach(order => {
    container.innerHTML += renderOrderCard(order);
  });
};

window.renderOrderCard = (order) => {
  let statusClass = 'status-pending';
  let statusText = order.status || 'Pending';
  
  if (statusText.toLowerCase() === 'completed' || statusText.toLowerCase() === 'paid') {
    statusClass = 'status-completed';
  } else if (statusText.toLowerCase() === 'cancelled') {
    statusClass = 'status-cancelled';
  }

  const dateObj = new Date(order.created_at);
  const dateStr = isNaN(dateObj) ? 'Unknown Date' : dateObj.toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric'
  });

  let itemsHtml = '';
  // Handling robust extraction since order items might not contain full product
  const items = order.items || [];
  let totalCalculated = 0;

  items.forEach(item => {
    // using price_at_purchase to lock in dynamic price
    const pricePaid = item.price_at_purchase || 0;
    const qty = item.quantity || 1;
    totalCalculated += pricePaid * qty;
    
    // Some backend APIs return nested product, some return just product_id.
    const pName = item.product ? item.product.name : `Product #${item.product_id}`;

    itemsHtml += `
      <div class="order-item-row">
        <div class="order-item-name">${qty}x ${pName}</div>
        <div class="fw-medium text-navy">₹${(pricePaid * qty).toLocaleString()}</div>
>>>>>>> Web-FE
      </div>
    `;
  });

<<<<<<< HEAD
  container.innerHTML = html;
}
=======
  // fallback to totalCalculated if order.total_amount doesn't exist
  const finalTotal = order.total_amount || totalCalculated;

  return `
    <div class="order-card">
      <div class="order-header">
        <div class="order-meta">
          <span class="order-id">Order #${order.id}</span>
          <span class="order-date">Placed on ${dateStr}</span>
        </div>
        <div class="order-status ${statusClass}">${statusText.toUpperCase()}</div>
      </div>
      
      <div class="order-items">
        ${itemsHtml}
      </div>
      
      <div class="order-footer">
        <span class="order-total-label">Total Amount</span>
        <span class="order-total-amount">₹${finalTotal.toLocaleString()}</span>
      </div>
    </div>
  `;
};
>>>>>>> Web-FE
