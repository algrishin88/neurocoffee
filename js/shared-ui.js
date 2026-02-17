/**
 * shared-ui.js — Shared authentication UI, user menu, logout, toast notifications.
 * Include AFTER js/api.js on every page.
 */

// Toast notification system with stacking, icons, and slide-in animation
(function () {
  var toastContainer = null;
  var styleInjected = false;

  function injectStyles() {
    if (styleInjected) return;
    styleInjected = true;
    var style = document.createElement('style');
    style.textContent = [
      '#neuro-toast-container{position:fixed;top:20px;right:20px;z-index:99999;display:flex;flex-direction:column;gap:10px;pointer-events:none;max-width:400px;}',
      '.neuro-toast{pointer-events:auto;display:flex;align-items:center;gap:10px;padding:14px 20px;border-radius:12px;color:#fff;font-size:14px;font-family:Inter,sans-serif;box-shadow:0 8px 32px rgba(0,0,0,.25);transform:translateX(120%);opacity:0;transition:transform .35s cubic-bezier(.4,0,.2,1),opacity .35s ease;max-width:100%;word-break:break-word;backdrop-filter:blur(12px);}',
      '.neuro-toast.show{transform:translateX(0);opacity:1;}',
      '.neuro-toast.hide{transform:translateX(120%);opacity:0;}',
      '.neuro-toast-icon{font-size:18px;flex-shrink:0;}',
      '.neuro-toast-msg{flex:1;line-height:1.4;}',
      '.neuro-toast-close{cursor:pointer;opacity:.7;font-size:16px;flex-shrink:0;background:none;border:none;color:inherit;padding:0 0 0 8px;}',
      '.neuro-toast-close:hover{opacity:1;}',
      '.neuro-toast--success{background:linear-gradient(135deg,#22c55e,#16a34a);}',
      '.neuro-toast--error{background:linear-gradient(135deg,#ef4444,#dc2626);}',
      '.neuro-toast--info{background:linear-gradient(135deg,#3b82f6,#2563eb);}',
      '.neuro-toast--warning{background:linear-gradient(135deg,#f59e0b,#d97706);}',
    ].join('\n');
    document.head.appendChild(style);
  }

  function getContainer() {
    if (toastContainer && document.body.contains(toastContainer)) return toastContainer;
    toastContainer = document.createElement('div');
    toastContainer.id = 'neuro-toast-container';
    document.body.appendChild(toastContainer);
    return toastContainer;
  }

  var ICONS = {
    success: '<i class="fas fa-check-circle"></i>',
    error: '<i class="fas fa-exclamation-circle"></i>',
    info: '<i class="fas fa-info-circle"></i>',
    warning: '<i class="fas fa-exclamation-triangle"></i>',
  };

  window.showToast = function (message, type, duration) {
    type = type || 'info';
    duration = duration || 4000;
    injectStyles();

    var container = getContainer();
    var toast = document.createElement('div');
    toast.className = 'neuro-toast neuro-toast--' + type;
    toast.innerHTML =
      '<span class="neuro-toast-icon">' + (ICONS[type] || ICONS.info) + '</span>' +
      '<span class="neuro-toast-msg">' + message + '</span>' +
      '<button class="neuro-toast-close" aria-label="Закрыть">&times;</button>';

    toast.querySelector('.neuro-toast-close').addEventListener('click', function () {
      dismissToast(toast);
    });

    container.appendChild(toast);

    // Limit to 5 visible toasts
    var toasts = container.querySelectorAll('.neuro-toast');
    if (toasts.length > 5) dismissToast(toasts[0]);

    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        toast.classList.add('show');
      });
    });

    var timer = setTimeout(function () { dismissToast(toast); }, duration);
    toast._timer = timer;
  };

  function dismissToast(toast) {
    if (!toast || !toast.parentNode) return;
    clearTimeout(toast._timer);
    toast.classList.remove('show');
    toast.classList.add('hide');
    setTimeout(function () { if (toast.parentNode) toast.remove(); }, 400);
  }
})();

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
