<<<<<<< HEAD
/* frontend/js/admin/products.js */

document.addEventListener("DOMContentLoaded", () => {
  requireAdmin();
  updateNavAuthUI();
  initAdminProducts();
});

async function initAdminProducts() {
  await fetchAndRenderAdminProducts();
}

async function fetchAndRenderAdminProducts() {
  const tbody = document.getElementById('admin-products-tbody');
  tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;"><span class="spinner spinner-primary"></span></td></tr>`;
  
  const res = await apiAdminGetProducts();
  if (!res.success) {
     tbody.innerHTML = `<tr><td colspan="6" class="text-danger">Error: ${res.error}</td></tr>`;
     return;
  }
  
  const products = res.data;
  
  if (products.length === 0) {
     tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;">No products found in DB.</td></tr>`;
     return;
  }

  tbody.innerHTML = products.map(p => {
     const price = Math.round(p.current_price || 0);
     const stockHtml = p.stock > 10 
         ? `<span class="text-success">${p.stock}</span>` 
         : `<span class="text-danger fw-bold">${p.stock} (Low)</span>`;
     
     return `
       <tr>
         <td>${p.id}</td>
         <td>
           <div style="display:flex; align-items:center; gap:12px;">
             <img src="${p.image_url || 'https://placehold.co/80'}" style="width:40px; height:40px; border-radius:4px; object-fit:contain; background:var(--bg-image);">
             <span style="font-weight:500; color:var(--color-navy);">${p.name}</span>
           </div>
         </td>
         <td>${p.category}</td>
         <td>₹${price}</td>
         <td>${stockHtml}</td>
         <td>
           <div style="display:flex; gap:8px;">
             <button class="btn btn-outline" style="padding:4px 8px; font-size:12px;" onclick="editProduct(${p.id})">Edit</button>
             <button class="btn btn-outline text-danger" style="padding:4px 8px; font-size:12px; border-color:var(--color-danger);" onclick="deleteProduct(${p.id})">Del</button>
           </div>
         </td>
       </tr>
     `;
  }).join('');
}

function editProduct(id) {
  alert(`Edit mode for Product ID ${id} not fully implemented in this demo layout.`);
}

async function deleteProduct(id) {
  if (confirm(`Are you sure you want to delete Product #${id}?`)) {
     const res = await apiAdminDeleteProduct(id);
     if (res.success) {
        fetchAndRenderAdminProducts();
     } else {
        alert("Failed to delete product: " + res.error);
     }
  }
=======
// frontend/js/admin/products.js

window.initAdminProducts = () => {
  fetchAndRenderAdminProducts();
};

window.fetchAndRenderAdminProducts = async () => {
  const tbody = document.getElementById('admin-products-table');
  const res = await apiAdminGetProducts();
  
  if (!res.success) {
    tbody.innerHTML = `<tr><td colspan="7" class="text-danger center">Failed to load products</td></tr>`;
    return;
  }

  let products = res.data;
  if (!Array.isArray(products)) {
    products = products.data || [];
  }

  if (products.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;">No products found.</td></tr>`;
    return;
  }

  tbody.innerHTML = '';
  products.forEach(p => {
    tbody.innerHTML += `
      <tr>
        <td class="text-muted">#${p.id}</td>
        <td class="fw-medium">${p.name}</td>
        <td>${p.category}</td>
        <td>₹${(p.base_price || 0).toLocaleString()}</td>
        <td class="text-primary fw-bold">₹${(p.current_price || 0).toLocaleString()}</td>
        <td>${p.inventory_count || 0}</td>
        <td>
          <button class="btn btn-outline" style="padding:4px 8px; font-size:12px;">Edit</button>
          <button class="btn btn-outline text-danger" style="padding:4px 8px; font-size:12px; margin-left:4px;" onclick="deleteProduct(${p.id})">Del</button>
        </td>
      </tr>
    `;
  });
};

window.deleteProduct = async (id) => {
  if (confirm('Are you sure you want to delete this product?')) {
    const res = await apiAdminDeleteProduct(id);
    if(res.success) {
      showToast('Product deleted');
      fetchAndRenderAdminProducts();
    } else {
      showToast(res.error || 'Failed to delete product', 'error');
    }
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
