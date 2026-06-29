// frontend/js/admin/products.js

window.initAdminProducts = () => {
  fetchAndRenderAdminProducts();
};

window.allAdminProducts = [];

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

  window.allAdminProducts = products;

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
        <td>${p.stock || 0}</td>
        <td>
          <button class="btn btn-outline" style="padding:4px 8px; font-size:12px;" onclick="openEditProductModal(${p.id})">Edit</button>
          <button class="btn btn-outline text-danger" style="padding:4px 8px; font-size:12px; margin-left:4px;" onclick="deleteProduct(${p.id})">Del</button>
        </td>
      </tr>
    `;
  });
};

window.openAddProductModal = () => {
  document.getElementById('modal-title-text').innerText = 'Add New Product';
  document.getElementById('prod-id').value = '';
  document.getElementById('product-form').reset();
  document.getElementById('product-modal').classList.add('active');
};

window.openEditProductModal = (id) => {
  const p = window.allAdminProducts.find(item => item.id === id);
  if (!p) return;
  document.getElementById('modal-title-text').innerText = 'Edit Product';
  document.getElementById('prod-id').value = p.id;
  document.getElementById('prod-name').value = p.name || '';
  document.getElementById('prod-category').value = p.category || 'Mobile Phone';
  document.getElementById('prod-segment').value = p.sub_category || 'Budget';
  document.getElementById('prod-base-price').value = p.base_price || 0;
  document.getElementById('prod-comp-price').value = p.competitor_price || 0;
  document.getElementById('prod-stock').value = p.stock || 0;
  document.getElementById('prod-demand').value = p.demand || 0;
  document.getElementById('prod-rating').value = p.rating || 4.0;
  document.getElementById('prod-reviews').value = p.reviews || 0;
  document.getElementById('prod-discount').value = p.discount || 0;
  document.getElementById('prod-season').value = p.season || 'Normal';
  document.getElementById('prod-image').value = p.image_url || '';
  document.getElementById('product-modal').classList.add('active');
};

window.closeProductModal = () => {
  document.getElementById('product-modal').classList.remove('active');
};

window.saveProduct = async (e) => {
  e.preventDefault();
  const id = document.getElementById('prod-id').value;
  const btn = document.getElementById('btn-save-product');
  btn.disabled = true;
  btn.innerText = 'Saving...';

  const payload = {
    name: document.getElementById('prod-name').value,
    category: document.getElementById('prod-category').value,
    sub_category: document.getElementById('prod-segment').value,
    base_price: parseFloat(document.getElementById('prod-base-price').value) || 0.0,
    current_price: parseFloat(document.getElementById('prod-base-price').value) || 0.0,
    competitor_price: parseFloat(document.getElementById('prod-comp-price').value) || 0.0,
    stock: parseInt(document.getElementById('prod-stock').value) || 0,
    demand: parseInt(document.getElementById('prod-demand').value) || 0,
    rating: parseFloat(document.getElementById('prod-rating').value) || 4.0,
    reviews: parseInt(document.getElementById('prod-reviews').value) || 0,
    discount: parseFloat(document.getElementById('prod-discount').value) || 0.0,
    season: document.getElementById('prod-season').value,
    image_url: document.getElementById('prod-image').value || null,
    spec: {}
  };

  let res;
  if (id) {
    res = await apiAdminUpdateProduct(id, payload);
  } else {
    res = await apiAdminAddProduct(payload);
  }

  btn.disabled = false;
  btn.innerText = 'Save Product';

  if (res.success) {
    showToast(id ? 'Product updated successfully!' : 'Product added successfully!');
    closeProductModal();
    fetchAndRenderAdminProducts();
  } else {
    showToast(res.error || 'Failed to save product', 'error');
  }
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
}
