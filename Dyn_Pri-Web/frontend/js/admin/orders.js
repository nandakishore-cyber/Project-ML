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

  // Sort newest first
  orders.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  tbody.innerHTML = '';
  orders.forEach(o => {
    let statusClass = 'status-pending';
    let statusText = o.status || 'Pending';
    if (statusText.toLowerCase() === 'completed' || statusText.toLowerCase() === 'paid') statusClass = 'status-completed';
    else if (statusText.toLowerCase() === 'cancelled') statusClass = 'status-cancelled';

    const dateStr = new Date(o.created_at).toLocaleDateString();
    const customerName = o.user ? (o.user.name || o.user.email) : `User #${o.user_id}`;
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
        <td class="text-muted" style="vertical-align: top; padding-top: 16px;">#${o.id}</td>
        <td style="vertical-align: top; padding-top: 16px;">${dateStr}</td>
        <td style="vertical-align: top; padding-top: 16px;">${customerName}</td>
        <td class="fw-bold" style="vertical-align: top; padding-top: 16px;">₹${total.toLocaleString()}</td>
        <td style="vertical-align: top; padding-top: 16px;"><span class="order-status ${statusClass}" style="padding:4px 8px; font-size:12px;">${statusText}</span></td>
        <td style="vertical-align: top; padding-top: 16px;">
          <button class="btn btn-outline" style="padding:4px 8px; font-size:12px;" onclick="this.parentElement.parentElement.nextElementSibling.style.display = this.parentElement.parentElement.nextElementSibling.style.display === 'none' ? 'table-row' : 'none'">Toggle</button>
        </td>
      </tr>
      <tr style="display: table-row; background: transparent;">
        <td colspan="6" style="padding: 0 16px 16px 16px; border-top: none;">
          ${itemsHtml}
        </td>
      </tr>
    `;
  });
};
