// frontend/js/api.js - Centralized API Service

const BASE_URL = "http://localhost:8000";

/**
 * Internal utility to handle fetch requests, authentication formatting, and error handling.
 */
async function apiRequest(endpoint, method = 'GET', body = null, isProtected = true) {
  try {
    const headers = {
      'Content-Type': 'application/json'
    };

    if (isProtected) {
      const token = localStorage.getItem('token');
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }

    const options = {
      method,
      headers
    };

    if (body && method !== 'GET') {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(`${BASE_URL}${endpoint}`, options);

    if (response.status === 401 && !endpoint.includes('/auth/login')) {
      // Unauthorized, redirect to login
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = 'login.html';
      return { success: false, error: "Session expired. Please log in again." };
    }

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      return { success: false, error: data.detail || data.message || "An error occurred." };
    }

    return { success: true, data };
  } catch (err) {
    console.error(`API Error (${endpoint}):`, err);
    return { success: false, error: "Failed to connect to the server. Please try again later." };
  }
}

// --- Auth ---
window.apiLogin = async (email, password) => {
  return apiRequest("/auth/login", "POST", { email, password }, false);
};

window.apiSignup = async (userData) => {
  return await apiRequest('/auth/signup', 'POST', userData, false);
};

window.apiGetMe = async () => {
  return await apiRequest('/auth/me', 'GET');
};

// --- Products ---
window.apiGetProducts = async (filters = {}) => {
  const params = new URLSearchParams(filters);
  const qs = params.toString();
  return await apiRequest(`/products${qs ? '?'+qs : ''}`, 'GET', null, false);
};

window.apiGetProduct = async (id) => {
  return await apiRequest(`/products/${id}`, 'GET', null, false);
};

window.apiGetByCategory = async (category) => {
  return await apiRequest(`/products?category=${encodeURIComponent(category)}`, 'GET', null, false);
};

// --- Cart ---
window.apiAddToCart = async (productId, quantity = 1) => {
  return await apiRequest('/cart/add', 'POST', { product_id: productId, quantity });
};

window.apiGetCart = async () => {
  return await apiRequest('/cart', 'GET');
};

window.apiUpdateCart = async (itemId, quantity) => {
  return await apiRequest(`/cart/update/${itemId}`, 'PUT', { quantity });
};

window.apiRemoveFromCart = async (itemId) => {
  return await apiRequest(`/cart/remove/${itemId}`, 'DELETE');
};

// --- Orders ---
window.apiPlaceOrder = async (orderData, paymentData = null) => {
  return await apiRequest('/orders/place', 'POST', { delivery_address: orderData.shipping_address || "No address provided" });
};

window.apiGetOrders = async () => {
  return await apiRequest('/orders', 'GET');
};

window.apiGetOrder = async (id) => {
  return await apiRequest(`/orders/${id}`, 'GET');
};

// --- Payment ---
window.apiCreatePayment = async (amount) => {
  return await apiRequest('/payment/create', 'POST', { amount });
};

window.apiVerifyPayment = async (paymentId, orderId, signature) => {
  return await apiRequest('/payment/verify', 'POST', { payment_id: paymentId, order_id: orderId, signature });
};

// --- Admin ---
window.apiTriggerPricing = async () => {
  return await apiRequest('/admin/trigger-pricing', 'POST');
};

window.apiPredictPrice = async (params) => {
  return await apiRequest('/admin/predict-price', 'POST', params);
};

window.apiGetPricingStatus = async () => {
  return await apiRequest('/admin/pricing-status', 'GET');
};

window.apiAdminGetProducts = async () => {
  return await apiRequest('/admin/products', 'GET');
};

window.apiAdminAddProduct = async (data) => {
  return await apiRequest('/admin/products', 'POST', data);
};

window.apiAdminUpdateProduct = async (id, data) => {
  return await apiRequest(`/admin/products/${id}`, 'PUT', data);
};

window.apiAdminDeleteProduct = async (id) => {
  return await apiRequest(`/admin/products/${id}`, 'DELETE');
};

window.apiAdminGetOrders = async () => {
  return await apiRequest('/admin/orders', 'GET');
};
