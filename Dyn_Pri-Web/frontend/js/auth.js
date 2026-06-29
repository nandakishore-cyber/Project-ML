// frontend/js/auth.js - Authentication & Session Management

const TOKEN_KEY = "token";
const USER_KEY = "user";

window.saveToken = (token) => {
  localStorage.setItem(TOKEN_KEY, token);
};

window.getToken = () => {
  return localStorage.getItem(TOKEN_KEY);
};

window.saveUser = (user) => {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
};

window.getUser = () => {
  const user = localStorage.getItem(USER_KEY);
  try {
    return user ? JSON.parse(user) : null;
  } catch (e) {
    return null;
  }
};

window.isLoggedIn = () => {
  return !!window.getToken();
};

window.isAdmin = () => {
  const user = window.getUser();
  // Only trust is_admin from the database — no hardcoded email overrides
  return user && user.is_admin === true;
};

window.logout = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  const path = window.location.pathname;
  if (path.includes('/admin/')) {
    window.location.href = '../login.html';
  } else {
    window.location.href = 'login.html';
  }
};

window.requireLogin = () => {
  if (!window.isLoggedIn()) {
    // Save current URL to redirect back after login
    localStorage.setItem('redirectUrl', window.location.href);
    const path = window.location.pathname;
    if (path.includes('/admin/')) {
      window.location.href = '../login.html';
    } else {
      window.location.href = 'login.html';
    }
  }
};

window.requireAdmin = () => {
  if (!window.isLoggedIn()) {
    const path = window.location.pathname;
    if (path.includes('/admin/')) {
      window.location.href = '../login.html';
    } else {
      window.location.href = 'login.html';
    }
  } else if (!window.isAdmin()) {
    alert("Access Denied: Admin privileges required.");
    const path = window.location.pathname;
    if (path.includes('/admin/')) {
      window.location.href = '../index.html';
    } else {
      window.location.href = 'index.html';
    }
  }
};

// Utility: update nav UI based on auth state
window.updateNavAuthUI = () => {
  const user = getUser();
  const loginLink = document.getElementById("nav-login-link");
  const userProfile = document.getElementById("nav-user-profile");

  if (isLoggedIn() && user) {
    if (loginLink) loginLink.style.display = "none";
    if (userProfile) {
      userProfile.style.display = "flex";
      const nameSpan = userProfile.querySelector(".user-name");
      if (nameSpan) nameSpan.textContent = user.name || "User";

      const adminLink = document.getElementById("nav-admin-link");
      if (adminLink) {
        adminLink.style.display = isAdmin() ? "block" : "none";
      }
    }
  } else {
    if (loginLink) loginLink.style.display = "block";
    if (userProfile) userProfile.style.display = "none";
  }
};

// Ensure logout links work automatically if they have the specific class
document.addEventListener("DOMContentLoaded", () => {
  // Sync navigation UI on load
  updateNavAuthUI();

  // Async update user profile to check if status (like is_admin) has changed in database
  if (isLoggedIn() && window.apiGetMe) {
    window.apiGetMe().then(res => {
      if (res.success && res.data) {
        saveUser(res.data);
        updateNavAuthUI();
      }
    }).catch(err => console.error("Error syncing profile:", err));
  }

  const logoutBtns = document.querySelectorAll(".btn-logout");
  logoutBtns.forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      logout();
    });
  });
});
