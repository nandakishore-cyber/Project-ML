<<<<<<< HEAD
/* frontend/js/admin/orders.js */

document.addEventListener("DOMContentLoaded", () => {
  requireAdmin();
  updateNavAuthUI();
  initAdminOrders();
});

async function initAdminOrders() {
  await fetchAndRenderAdminOrders();
}

async function fetchAndRenderAdminOrders() {
  const tbody = document.getElementById('admin-orders-tbody');
  tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;"><span class="spinner spinner-primary"></span></td></tr>`;
  
  const res = await apiAdminGetOrders();
  if (!res.success) {
     tbody.innerHTML = `<tr><td colspan="6" class="text-danger">Error: ${res.error}</td></tr>`;
     return;
  }
  
  const orders = res.data;
  
  if (orders.length === 0) {
     tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;">No orders found.</td></tr>`;
     return;
  }

  // Sort newest first
  orders.sort((a,b) => new Date(b.created_at) - new Date(a.created_at));

  tbody.innerHTML = orders.map(o => {
     const dateStr = new Date(o.created_at).toLocaleString();
     const total = Math.round(o.total_amount);
     
     let statusBadge = `<span class="badge badge-warning">Processing</span>`;
     if (o.status === 'SHIPPED') statusBadge = `<span class="badge badge-blue">Shipped</span>`;
     if (o.status === 'DELIVERED') statusBadge = `<span class="badge badge-success">Delivered</span>`;
     if (o.status === 'CANCELLED') statusBadge = `<span class="badge badge-danger">Cancelled</span>`;
     // fallback
     if(o.status && o.status.toLowerCase() !== 'processing') {
       statusBadge = `<span class="badge badge-blue">${o.status}</span>`;
     }

     return `
       <tr>
         <td>#${o.id || o.razorpay_order_id}</td>
         <td>${dateStr}</td>
         <td>
           <div style="font-weight:500;">User #${o.user_id}</div>
           <div class="fs-small text-muted">${o.shipping_address ? o.shipping_address.split(',')[0] : ''}</div>
         </td>
         <td>₹${total}</td>
         <td>${statusBadge}</td>
         <td>
           <select class="sort-select" style="padding:4px 8px; font-size:12px;" onchange="updateOrderStatus(${o.id}, this)">
             <option value="">Update Status</option>
             <option value="PROCESSING">Processing</option>
             <option value="SHIPPED">Shipped</option>
             <option value="DELIVERED">Delivered</option>
             <option value="CANCELLED">Cancelled</option>
           </select>
         </td>
       </tr>
     `;
  }).join('');
}

function updateOrderStatus(id, selectElement) {
  const newStatus = selectElement.value;
  if (!newStatus) return;
  alert(`Updating order ${id} to ${newStatus} is not hooked up to a backend route in this strict setup, but UI action registered.`);
  selectElement.value = ''; // reset
}
=======
// frontend/js/admin/orders.js

window.initAdminOrders = () => {
  fetchAndRenderAdminOrders();
};

window.fetchAndRenderAdminOrders = async () => {
  const tbody = document.getElementById('admin-orders-table');
  const res = await apiAdminGetOrders();
  
  if (!res.success) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-danger center">Failed to load orders</td></tr>`;
    return;
  }

  let orders = res.data;
  if (!Array.isArray(orders)) {
    orders = orders.data || [];
  }

  if (orders.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;">No orders found.</td></tr>`;
    return;
  }

  tbody.innerHTML = '';
  orders.forEach(o => {
    let statusClass = 'status-pending';
    let statusText = o.status || 'Pending';
    if (statusText.toLowerCase() === 'completed' || statusText.toLowerCase() === 'paid') statusClass = 'status-completed';
    else if (statusText.toLowerCase() === 'cancelled') statusClass = 'status-cancelled';

    const dateStr = new Date(o.created_at).toLocaleDateString();
    const customerName = o.user ? (o.user.name || o.user.email) : `User #${o.user_id}`;
    const total = o.total_amount || 0;

    tbody.innerHTML += `
      <tr>
        <td class="text-muted">#${o.id}</td>
        <td>${dateStr}</td>
        <td>${customerName}</td>
        <td class="fw-bold">₹${total.toLocaleString()}</td>
        <td><span class="order-status ${statusClass}" style="padding:4px 8px; font-size:12px;">${statusText}</span></td>
        <td>
          <button class="btn btn-outline" style="padding:4px 8px; font-size:12px;">View</button>
        </td>
      </tr>
    `;
  });
};
>>>>>>> Web-FE
