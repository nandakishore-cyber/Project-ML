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
      </div>
    `;
    return;
  }

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
  let statusClass = 'status-placed';
  let statusText = order.status || 'Placed';
  
  if (statusText.toLowerCase() === 'completed' || statusText.toLowerCase() === 'paid' || statusText.toLowerCase() === 'delivered') {
    statusClass = 'status-delivered';
  } else if (statusText.toLowerCase() === 'cancelled') {
    statusClass = 'status-cancelled';
  } else if (statusText.toLowerCase() === 'shipped') {
    statusClass = 'status-shipped';
  } else {
    statusClass = 'status-placed';
  }

  const dateObj = new Date(order.created_at);
  const dateStr = isNaN(dateObj) ? 'Unknown Date' : dateObj.toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric'
  });

  let itemsHtml = '';
  const items = order.items || [];
  let totalCalculated = 0;

  items.forEach(item => {
    // using price_at_purchase to lock in dynamic price
    const pricePaid = item.price_at_purchase || 0;
    const qty = item.quantity || 1;
    totalCalculated += pricePaid * qty;
    
    const pName = item.product ? item.product.name : `Product #${item.product_id}`;

    itemsHtml += `
      <div class="order-item-row">
        <div class="order-item-name">${qty}x ${pName}<span class="order-item-qty">×${qty}</span></div>
        <div class="order-item-price">₹${(pricePaid * qty).toLocaleString()}</div>
      </div>
    `;
  });

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
        <span class="order-total-value">₹${finalTotal.toLocaleString()}</span>
      </div>
    </div>
  `;
};
