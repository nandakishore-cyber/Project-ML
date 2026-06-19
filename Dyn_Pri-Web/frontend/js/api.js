<<<<<<< HEAD
/* 
  frontend/js/api.js
  Centralized API fetching utility
*/

const BASE_URL = "http://localhost:8000";

// --- Internal Fetch Wrapper ---
async function _fetchBase(endpoint, options = {}) {
  try {
    const headers = {
      "Content-Type": "application/json",
      ...options.headers,
    };

    // If we have a token, inject it
    const token = localStorage.getItem("token");
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const config = {
      ...options,
      headers,
    };

    const response = await fetch(`${BASE_URL}${endpoint}`, config);

    // Handle 401 Unauthorized globally
    if (response.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "login.html";
      return { success: false, error: "Session expired. Please log in again." };
    }

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      // Typically FastAPI throws {"detail": "..." }
      const errorMsg = data?.detail || data?.message || `API Error: ${response.status} ${response.statusText}`;
      return { success: false, error: errorMsg };
    }

    return { success: true, data };
  } catch (error) {
    console.error(`Fetch error on ${endpoint}:`, error);
    return { success: false, error: "Network error or server is unreachable." };
=======
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

    if (response.status === 401) {
      // Unauthorized, redirect to login
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/frontend/login.html';
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
>>>>>>> Web-FE
  }
}

// --- Auth ---
<<<<<<< HEAD
async function apiLogin(email, password) {
  return _fetchBase("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

async function apiSignup(name, email, password) {
  return _fetchBase("/auth/signup", {
    method: "POST",
    body: JSON.stringify({ name, email, password }),
  });
}

// --- Products ---
async function apiGetProducts(filters = {}) {
  // Build query string from filters object
  const queryParams = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== "") {
      queryParams.append(key, value);
    }
  }
  const queryString = queryParams.toString();
  const endpoint = queryString ? `/products?${queryString}` : "/products";
  return _fetchBase(endpoint, { method: "GET" });
}

async function apiGetProduct(id) {
  return _fetchBase(`/products/${id}`, { method: "GET" });
}

async function apiGetByCategory(category) {
  return _fetchBase(`/products?category=${encodeURIComponent(category)}`, { method: "GET" });
}

// --- Cart ---
async function apiGetCart() {
  return _fetchBase("/cart", { method: "GET" });
}

async function apiAddToCart(productId, quantity) {
  return _fetchBase("/cart/add", {
    method: "POST",
    body: JSON.stringify({ product_id: productId, quantity }),
  });
}

async function apiUpdateCart(itemId, quantity) {
  return _fetchBase(`/cart/update/${itemId}`, {
    method: "PUT",
    body: JSON.stringify({ quantity }),
  });
}

async function apiRemoveFromCart(itemId) {
  return _fetchBase(`/cart/remove/${itemId}`, { method: "DELETE" });
}

// --- Orders & Payment ---
async function apiCreatePayment(amountCent) {
  return _fetchBase("/payment/create", {
    method: "POST",
    body: JSON.stringify({ amount: amountCent }),
  });
}

async function apiVerifyPayment(paymentId, orderId, signature) {
  return _fetchBase("/payment/verify", {
    method: "POST",
    body: JSON.stringify({ payment_id: paymentId, order_id: orderId, signature }),
  });
}

async function apiPlaceOrder(orderData, paymentData = null) {
  return _fetchBase("/orders/place", {
    method: "POST",
    body: JSON.stringify({ order_data: orderData, payment_data: paymentData }),
  });
}

async function apiGetOrders() {
  return _fetchBase("/orders", { method: "GET" });
}

async function apiGetOrder(id) {
  return _fetchBase(`/orders/${id}`, { method: "GET" });
}

// --- Admin ---
async function apiTriggerPricing() {
  return _fetchBase("/admin/trigger-pricing", {
    method: "POST",
    // Admin ops typically require token which _fetchBase handles
  });
}

async function apiGetPricingStatus() {
  return _fetchBase("/admin/pricing-status", { method: "GET" });
}

async function apiAdminGetProducts() {
  return _fetchBase("/admin/products", { method: "GET" });
}

async function apiAdminAddProduct(data) {
  return _fetchBase("/admin/products", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

async function apiAdminUpdateProduct(id, data) {
  return _fetchBase(`/admin/products/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

async function apiAdminDeleteProduct(id) {
  return _fetchBase(`/admin/products/${id}`, { method: "DELETE" });
}

async function apiAdminGetOrders() {
  return _fetchBase("/admin/orders", { method: "GET" });
}
=======
window.apiLogin = async (email, password) => {
  // FastAPI uses form-encoded for OAuth2 by default in some setups, but let's assume JSON first or standard form data.
  // Actually, standard OAuth2PasswordRequestForm expects URL-encoded form data.
  // We'll use URL-encoded for login if it's standard FastAPI OAuth2.
  try {
    const formData = new URLSearchParams();
    formData.append('username', email); // OAuth2 expects 'username'
    formData.append('password', password);

    const response = await fetch(`${BASE_URL}/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: formData.toString()
    });
    
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return { success: false, error: data.detail || "Invalid credentials." };
    }
    return { success: true, data };
  } catch (err) {
    return { success: false, error: "Failed to connect." };
  }
};

window.apiSignup = async (userData) => {
  return await apiRequest('/users', 'POST', userData, false);
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
  return await apiRequest('/cart/items', 'POST', { product_id: productId, quantity });
};

window.apiGetCart = async () => {
  return await apiRequest('/cart', 'GET');
};

window.apiUpdateCart = async (itemId, quantity) => {
  return await apiRequest(`/cart/items/${itemId}`, 'PUT', { quantity });
};

window.apiRemoveFromCart = async (itemId) => {
  return await apiRequest(`/cart/items/${itemId}`, 'DELETE');
};

// --- Orders ---
window.apiPlaceOrder = async (orderData) => {
  return await apiRequest('/orders', 'POST', orderData);
};

window.apiGetOrders = async () => {
  return await apiRequest('/orders', 'GET');
};

window.apiGetOrder = async (id) => {
  return await apiRequest(`/orders/${id}`, 'GET');
};

// --- Payment ---
window.apiCreatePayment = async (amount) => {
  return await apiRequest('/payments/create', 'POST', { amount });
};

window.apiVerifyPayment = async (paymentDetails) => {
  return await apiRequest('/payments/verify', 'POST', paymentDetails);
};

// --- Admin ---
window.apiTriggerPricing = async () => {
  return await apiRequest('/admin/pricing/trigger', 'POST');
};

window.apiGetPricingStatus = async () => {
  return await apiRequest('/admin/pricing/status', 'GET');
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
>>>>>>> Web-FE
