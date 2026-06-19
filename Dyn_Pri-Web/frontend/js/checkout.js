<<<<<<< HEAD
/* frontend/js/checkout.js */

let orderSubtotal = 0;
let checkoutCartItems = [];
let finalTotal = 0;

document.addEventListener("DOMContentLoaded", () => {
  requireLogin();
  updateNavAuthUI();
  initCheckout();
});

async function initCheckout() {
  const container = document.getElementById('checkout-items-preview');
  
  const res = await apiGetCart();
  if (!res.success || !res.data || res.data.items.length === 0) {
    alert("Your cart is empty. Redirecting to home.");
    window.location.href = "index.html";
    return;
  }

  checkoutCartItems = res.data.items;
  renderOrderSummary();

  const checkoutForm = document.getElementById('checkout-form');
  checkoutForm.addEventListener('submit', handlePayment);
}

function renderOrderSummary() {
  const container = document.getElementById('checkout-items-preview');
  let html = '';
  orderSubtotal = 0;

  const placeholderImg = "https://placehold.co/400x400/F5F6F8/9CA3AF?text=No+Image";

  checkoutCartItems.forEach(item => {
    const product = item.product || {};
    const price = Math.round(product.current_price || item.price_at_addition || 0);
    orderSubtotal += (price * item.quantity);
    
    const imgUrl = product.image_url || placeholderImg;

    html += `
      <div class="summary-item">
        <div class="summary-item-img"><img src="${imgUrl}" alt="${product.name}"></div>
        <div class="summary-item-info">
          <div class="summary-item-title">${product.name || "Unknown"}</div>
          <div class="summary-item-meta">
            <span>Qty: ${item.quantity}</span>
            <span class="fw-medium text-navy">₹${price}</span>
          </div>
        </div>
=======
// frontend/js/checkout.js

let currentCheckoutCart = null;
let checkoutTotal = 0;

window.initCheckoutPage = () => {
  renderCheckoutSummary();
};

window.renderCheckoutSummary = async () => {
  const res = await apiGetCart();
  if (!res.success) {
    showToast(res.error || 'Failed to load cart for checkout', 'error');
    document.getElementById('checkout-items').innerHTML = `<p class="text-danger">Failed to load order</p>`;
    document.getElementById('btn-pay').disabled = true;
    return;
  }

  currentCheckoutCart = res.data || {};
  let items = currentCheckoutCart.items || [];
  
  if (!Array.isArray(items) || items.length === 0) {
    window.location.href = 'cart.html';
    return; // nothing to checkout
  }

  const list = document.getElementById('checkout-items');
  list.innerHTML = '';
  let subtotal = 0;

  items.forEach(item => {
    const p = item.product || {};
    const price = p.current_price || 0;
    subtotal += price * (item.quantity || 1);
    const imgStr = p.image_url || 'https://placehold.co/100x100/F5F6F8/9CA3AF?text=No+Image';
    
    list.innerHTML += `
      <div class="summary-item">
        <div class="summary-item-img"><img src="${imgStr}" alt=""></div>
        <div class="summary-item-info">
          <div class="summary-item-title">${p.name || 'Product'}</div>
          <div class="summary-item-meta">Qty: ${item.quantity || 1}</div>
        </div>
        <div class="summary-item-price">₹${(price * (item.quantity||1)).toLocaleString()}</div>
>>>>>>> Web-FE
      </div>
    `;
  });

<<<<<<< HEAD
  container.innerHTML = html;

  const shipping = orderSubtotal > 50000 ? 0 : 500;
  finalTotal = orderSubtotal + shipping;

  document.getElementById('co-subtotal').textContent = `₹${orderSubtotal}`;
  document.getElementById('co-shipping').textContent = shipping === 0 ? "Free" : `₹${shipping}`;
  document.getElementById('co-total').textContent = `₹${finalTotal}`;
  document.getElementById('btn-pay-text').textContent = `Pay ₹${finalTotal}`;
}

async function handlePayment(e) {
  e.preventDefault();
  
  if (finalTotal <= 0) return;

  const btn = document.getElementById('btn-submit-order');
  const orgBtnHTML = btn.innerHTML;
  btn.innerHTML = `<span class="spinner"></span> Processing...`;
  btn.disabled = true;

  // 1. Create order on server or create payment intent
  // Convert finalTotal to paise (Cents equivalent in INR)
  const amountPaise = finalTotal * 100;
  
  const paymentRes = await apiCreatePayment(amountPaise);
  
  if (!paymentRes.success) {
     alert("Error initializing payment: " + paymentRes.error);
     btn.innerHTML = orgBtnHTML;
     btn.disabled = false;
     return;
  }

  const { razorpay_order_id, amount, currency } = paymentRes.data;

  // 2. Open Razorpay Checkbox
  const user = getUser() || {};
  const options = {
      key: "rzp_test_YourTestKeyHere", // Would usually be fetched from backend or env
      amount: amount, 
      currency: currency,
      name: "DynPrice",
      description: "Order Payment",
      order_id: razorpay_order_id,
      handler: async function (response) {
          // 3. Verify Payment & Place Order
          btn.innerHTML = `<span class="spinner"></span> Placing Order...`;
          
          const verifyRes = await apiVerifyPayment(
             response.razorpay_payment_id,
             response.razorpay_order_id,
             response.razorpay_signature
          );

          if (verifyRes.success) {
             // Place final order in DB mapped to cart
             const address = document.getElementById('co-address').value + ", " + 
                             document.getElementById('co-city').value + " - " + 
                             document.getElementById('co-pin').value;
                             
             const orderData = {
                shipping_address: address,
                total_amount: finalTotal,
             };
             
             const placeRes = await apiPlaceOrder(orderData, { payment_id: response.razorpay_payment_id });
             
             if (placeRes.success) {
                alert("Order placed successfully!");
                window.location.href = "orders.html";
             } else {
                alert("Payment verified but order failed: " + placeRes.error);
                btn.innerHTML = orgBtnHTML;
                btn.disabled = false;
             }
          } else {
             alert("Payment verification failed.");
             btn.innerHTML = orgBtnHTML;
             btn.disabled = false;
          }
      },
      prefill: {
          name: document.getElementById('co-name').value || user.name,
          email: document.getElementById('co-email').value || user.email,
          contact: document.getElementById('co-phone').value
      },
      theme: {
          color: "#2B6BE6"
      }
  };
  
  const rzp = new window.Razorpay(options);
  rzp.on('payment.failed', function (response){
      alert("Payment failed! Reason: " + response.error.description);
      btn.innerHTML = orgBtnHTML;
      btn.disabled = false;
  });
  rzp.open();
=======
  const tax = Math.round(subtotal * 0.05);
  checkoutTotal = subtotal + tax;

  document.getElementById('chk-subtotal').innerText = `₹${subtotal.toLocaleString()}`;
  document.getElementById('chk-tax').innerText = `₹${tax.toLocaleString()}`;
  document.getElementById('chk-total').innerText = `₹${checkoutTotal.toLocaleString()}`;
};

window.handlePayment = async () => {
  const btn = document.getElementById('btn-pay');
  try {
    btn.textContent = 'Processing...';
    btn.disabled = true;

    // 1. Create Payment Order on backend
    // Razorpay expects amount in paise (total * 100) but usually backend handles this.
    // If our api just takes amount, let's pass it. Assuming backend knows to convert or we pass amount in base currency.
    // According to instructions: "apiCreatePayment(total * 100)"
    const amountInPaise = checkoutTotal * 100;
    const paymentRes = await apiCreatePayment(amountInPaise);

    if (!paymentRes.success) {
      throw new Error(paymentRes.error || "Failed to initiate payment");
    }

    const { razorpay_order_id, key_id } = paymentRes.data;

    // 2. Open Razorpay modal
    const options = {
      key: key_id || "rzp_test_stub", // Your Razorpay test key if backend doesn't send it
      amount: amountInPaise,
      currency: "INR",
      name: "DynPrice",
      description: "Order Checkout",
      order_id: razorpay_order_id,
      handler: function (response) {
        // 3. On success verify and place order
        onPaymentSuccess(response, razorpay_order_id);
      },
      prefill: {
        name: document.getElementById('addr-name').value,
        contact: document.getElementById('addr-phone').value
      },
      theme: {
        color: "#02042C"
      },
      modal: {
        ondismiss: function() {
          btn.textContent = 'Pay with Razorpay';
          btn.disabled = false;
        }
      }
    };

    const rzp = new Razorpay(options);
    rzp.open();

  } catch (e) {
    showToast(e.message, 'error');
    btn.textContent = 'Pay with Razorpay';
    btn.disabled = false;
  }
};

window.onPaymentSuccess = async (rzpResponse, order_id) => {
  // rzpResponse: { razorpay_payment_id, razorpay_order_id, razorpay_signature }
  try {
    const btn = document.getElementById('btn-pay');
    btn.textContent = 'Verifying...';

    const verifyRes = await apiVerifyPayment({
      razorpay_order_id: rzpResponse.razorpay_order_id,
      razorpay_payment_id: rzpResponse.razorpay_payment_id,
      razorpay_signature: rzpResponse.razorpay_signature
    });

    if (!verifyRes.success) {
      throw new Error(verifyRes.error || "Payment verification failed.");
    }

    // 4. Place order with address
    const orderData = {
      payment_id: rzpResponse.razorpay_payment_id,
      address: {
        name: document.getElementById('addr-name').value,
        street: document.getElementById('addr-street').value,
        city: document.getElementById('addr-city').value,
        state: document.getElementById('addr-state').value,
        zip: document.getElementById('addr-zip').value,
        phone: document.getElementById('addr-phone').value
      }
    };

    const placeRes = await apiPlaceOrder(orderData);
    
    if (!placeRes.success) {
      throw new Error(placeRes.error || "Failed to place order after payment.");
    }

    showToast('Order placed successfully!');
    setTimeout(() => {
      window.location.href = 'orders.html';
    }, 1500);

  } catch (e) {
    showToast(e.message, 'error');
    document.getElementById('btn-pay').textContent = 'Pay with Razorpay';
    document.getElementById('btn-pay').disabled = false;
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
