<<<<<<< HEAD
/* 
  frontend/js/auth.js
  Authentication state and utility functions
*/

const TOKEN_KEY = "token";
const USER_KEY = "user";

function saveToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

function saveUser(user) {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

function getUser() {
  const userStr = localStorage.getItem(USER_KEY);
  if (!userStr) return null;
  try {
    return JSON.parse(userStr);
  } catch (e) {
    return null;
  }
}

function isLoggedIn() {
  return !!getToken();
}

function isAdmin() {
  const user = getUser();
  // We assume the user object includes an 'is_admin' boolean or role string.
  return user && (user.is_admin === true || user.role === 'admin');
}

function logout() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  window.location.href = "login.html";
}

function requireLogin() {
  if (!isLoggedIn()) {
    // Save intended url to redirect back after login if desired, standard practice
    sessionStorage.setItem("redirect_url", window.location.href);
    window.location.href = "login.html";
  }
}

function requireAdmin() {
  requireLogin();
  if (!isAdmin()) {
    // Option: show modal or alert, then redirect to home
    alert("Access Denied: Admin privileges required.");
    window.location.href = "../index.html"; 
    // note: if called from admin/dashboard.html, ../index.html goes up to frontend/index.html
  }
}

// Utility: update nav UI based on auth state (we can call this from page scripts)
function updateNavAuthUI() {
  const user = getUser();
  const loginLink = document.getElementById("nav-login-link");
  const userProfile = document.getElementById("nav-user-profile"); // wrapper for username / logout

  if (isLoggedIn() && user) {
    if (loginLink) loginLink.style.display = "none";
    if (userProfile) {
      userProfile.style.display = "flex";
      const nameSpan = userProfile.querySelector(".user-name");
      if (nameSpan) nameSpan.textContent = user.name || "User";
      
      // If admin, maybe show admin panel link
      const adminLink = document.getElementById("nav-admin-link");
      if (adminLink) {
        adminLink.style.display = isAdmin() ? "block" : "none";
      }
    }
  } else {
    if (loginLink) loginLink.style.display = "block";
    if (userProfile) userProfile.style.display = "none";
  }
}

// Ensure logout links work automatically if they have the specific class/id
document.addEventListener("DOMContentLoaded", () => {
  const logoutBtns = document.querySelectorAll(".btn-logout");
  logoutBtns.forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      logout();
    });
  });
});
=======
// frontend/js/auth.js - Authentication & Session Management

window.saveToken = (token) => {
  localStorage.setItem('token', token);
};

window.getToken = () => {
  return localStorage.getItem('token');
};

window.saveUser = (user) => {
  localStorage.setItem('user', JSON.stringify(user));
};

window.getUser = () => {
  const user = localStorage.getItem('user');
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
  return user && user.is_admin === true;
};

window.logout = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = '/frontend/login.html';
};

window.requireLogin = () => {
  if (!window.isLoggedIn()) {
    // Save current URL to redirect back after login
    localStorage.setItem('redirectUrl', window.location.href);
    window.location.href = '/frontend/login.html';
  }
};

window.requireAdmin = () => {
  if (!window.isLoggedIn()) {
    window.location.href = '/frontend/login.html';
  } else if (!window.isAdmin()) {
    // Not an admin, redirect to home page
    window.location.href = '/frontend/index.html';
  }
};
>>>>>>> Web-FE
