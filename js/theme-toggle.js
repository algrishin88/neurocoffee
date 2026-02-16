/**
 * Theme toggle — dark/light mode via data-theme attribute and CSS variables.
 * Persists choice in localStorage.
 */
(function() {
  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    try { localStorage.setItem('theme', theme); } catch (e) {}

    // Update toggle checkbox if present
    var toggle = document.getElementById('theme-toggle-checkbox');
    if (toggle) toggle.checked = (theme === 'dark');

    // Update toggle button icon if present
    var btn = document.getElementById('themeToggleBtn');
    if (btn) {
      btn.innerHTML = theme === 'dark'
        ? '<i class="fas fa-sun"></i>'
        : '<i class="fas fa-moon"></i>';
      btn.title = theme === 'dark' ? 'Светлая тема' : 'Тёмная тема';
    }
  }

  function getInitialTheme() {
    try { var stored = localStorage.getItem('theme'); if (stored) return stored; } catch (e) {}
    try { if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark'; } catch (e) {}
    return 'light';
  }

  function init() {
    applyTheme(getInitialTheme());

    // Checkbox toggle
    var toggle = document.getElementById('theme-toggle-checkbox');
    if (toggle) {
      toggle.addEventListener('change', function(e) {
        applyTheme(e.target.checked ? 'dark' : 'light');
      });
    }

    // Button toggle (injected by shared-ui or manually placed)
    var btn = document.getElementById('themeToggleBtn');
    if (btn) {
      btn.addEventListener('click', function() {
        var current = document.documentElement.getAttribute('data-theme') || 'light';
        applyTheme(current === 'dark' ? 'light' : 'dark');
      });
    }

    // OS preference change
    try {
      var mq = window.matchMedia('(prefers-color-scheme: dark)');
      if (mq && mq.addEventListener) {
        mq.addEventListener('change', function(ev) {
          if (!localStorage.getItem('theme')) {
            applyTheme(ev.matches ? 'dark' : 'light');
          }
        });
      }
    } catch (e) {}
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Expose for dynamic use
  window.toggleTheme = function() {
    var current = document.documentElement.getAttribute('data-theme') || 'light';
    applyTheme(current === 'dark' ? 'light' : 'dark');
  };
})();
