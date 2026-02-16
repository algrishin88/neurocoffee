/**
 * shared-ui.js — Shared authentication UI, user menu, logout, toast notifications.
 * Include AFTER js/api.js on every page.
 */

// Toast notification system (replaces alert() calls)
function showToast(message, type) {
  type = type || 'info';
  var existing = document.getElementById('neuro-toast');
  if (existing) existing.remove();

  var toast = document.createElement('div');
  toast.id = 'neuro-toast';
  var bg = type === 'success' ? '#22c55e' : type === 'error' ? '#ef4444' : '#3b82f6';
  toast.style.cssText = 'position:fixed;top:24px;right:24px;padding:14px 28px;border-radius:12px;color:#fff;font-size:14px;font-family:Inter,sans-serif;z-index:99999;transition:opacity .4s;max-width:380px;box-shadow:0 8px 32px rgba(0,0,0,.25);background:' + bg;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(function () { toast.style.opacity = '0'; }, 3500);
  setTimeout(function () { toast.remove(); }, 4000);
}

// Check authentication and update header UI
async function checkAuthAndUpdateUI() {
  try {
    var token = localStorage.getItem('neuro-cafe-token') || sessionStorage.getItem('neuro-cafe-token');
    var userStr = localStorage.getItem('neuro-cafe-current-user') || sessionStorage.getItem('neuro-cafe-current-user');
    var currentUser = userStr ? JSON.parse(userStr) : null;

    if (token && !currentUser && window.API) {
      try {
        var response = await window.API.auth.getCurrentUser();
        if (response.success && response.user) {
          currentUser = response.user;
          localStorage.setItem('neuro-cafe-current-user', JSON.stringify(currentUser));
        }
      } catch (e) {
        console.error('Error getting user from API:', e);
      }
    }

    var cartIconContainer = document.getElementById('cartIconContainer');
    var authButtons = document.querySelector('.auth-buttons');

    if (currentUser && currentUser !== 'null' && token) {
      if (cartIconContainer) cartIconContainer.style.display = 'block';
      if (authButtons) {
        authButtons.innerHTML =
          '<div class="user-menu">' +
            '<button class="user-btn" onclick="toggleUserMenu()">' +
              '<i class="fas fa-user"></i> ' +
              (currentUser.firstName || 'Пользователь') +
              ' <i class="fas fa-chevron-down"></i>' +
            '</button>' +
            '<div class="user-dropdown" id="user-dropdown">' +
              '<a href="profile.html"><i class="fas fa-user-circle"></i> Профиль</a>' +
              '<a href="#" onclick="logout()"><i class="fas fa-sign-out-alt"></i> Выйти</a>' +
            '</div>' +
          '</div>';
      }
    } else {
      if (cartIconContainer) cartIconContainer.style.display = 'none';
    }
  } catch (e) {
    console.error('Error checking auth:', e);
  }
}

function toggleUserMenu() {
  var dropdown = document.getElementById('user-dropdown');
  if (dropdown) dropdown.classList.toggle('show');
}

function logout() {
  localStorage.removeItem('neuro-cafe-current-user');
  localStorage.removeItem('neuro-cafe-token');
  sessionStorage.removeItem('neuro-cafe-current-user');
  sessionStorage.removeItem('neuro-cafe-token');
  if (window.API && window.API.auth) window.API.auth.logout();
  window.location.reload();
}

// Close user dropdown when clicking outside
document.addEventListener('click', function (e) {
  var dropdown = document.getElementById('user-dropdown');
  if (dropdown && dropdown.classList.contains('show')) {
    if (!e.target.closest('.user-menu')) {
      dropdown.classList.remove('show');
    }
  }
});

// Auto-init on DOM ready
document.addEventListener('DOMContentLoaded', function () {
  checkAuthAndUpdateUI();
});
