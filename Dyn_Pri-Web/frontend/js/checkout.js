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
    const payBtn = document.getElementById('btn-pay');
    if (payBtn) payBtn.disabled = true;
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
      <div class="summary-item-row">
        <img src="${imgStr}" alt="" class="summary-item-img">
        <div class="summary-item-name">
          ${item.quantity || 1}x ${p.name || 'Product'}
        </div>
        <div class="summary-item-price">₹${(price * (item.quantity||1)).toLocaleString()}</div>
      </div>
    `;
  });

  const tax = Math.round(subtotal * 0.05);
  checkoutTotal = subtotal + tax;

  const chkSubtotal = document.getElementById('chk-subtotal');
  const chkTax = document.getElementById('chk-tax');
  const chkTotal = document.getElementById('chk-total');
  
  if (chkSubtotal) chkSubtotal.innerText = `₹${subtotal.toLocaleString()}`;
  if (chkTax) chkTax.innerText = `₹${tax.toLocaleString()}`;
  if (chkTotal) chkTotal.innerText = `₹${checkoutTotal.toLocaleString()}`;
};

window.handlePayment = async () => {
  const btn = document.getElementById('btn-pay');
  try {
    btn.innerHTML = '<span class="spinner spinner-small"></span> Processing Secure Payment...';
    btn.disabled = true;

    // Simulate network delay for payment processing
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Place order with address directly
    const orderData = {
      shipping_address: [
        document.getElementById('addr-name')?.value,
        document.getElementById('addr-street')?.value,
        document.getElementById('addr-city')?.value,
        document.getElementById('addr-state')?.value,
        document.getElementById('addr-zip')?.value
      ].filter(Boolean).join(', '),
      total_amount: checkoutTotal,
    };

    btn.innerHTML = 'Verifying Order...';

    // Call the backend to save the order with a mock payment ID
    const placeRes = await apiPlaceOrder(orderData, { payment_id: "mock_pay_" + Date.now() });
    
    if (!placeRes.success) {
      throw new Error(placeRes.error || "Failed to place order after payment.");
    }

    btn.innerHTML = '✓ Order Successful!';
    btn.classList.add('btn-success');
    showToast('Payment successful! Order placed.', 'success');
    
    setTimeout(() => {
      window.location.href = 'orders.html';
    }, 1500);

  } catch (e) {
    showToast(e.message, 'error');
    btn.textContent = 'Pay with Razorpay';
    btn.disabled = false;
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
