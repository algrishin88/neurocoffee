(function() {
  function applyTheme(theme) {
    var light = document.getElementById('light-theme');
    var dark = document.getElementById('dark-theme');
    var toggle = document.getElementById('theme-toggle-checkbox');

    if (theme === 'dark') {
      if (dark) dark.disabled = false;
      if (light) light.disabled = true;
      document.documentElement.setAttribute('data-theme', 'dark');
      if (toggle) toggle.checked = true;
    } else {
      if (dark) dark.disabled = true;
      if (light) light.disabled = false;
      document.documentElement.setAttribute('data-theme', 'light');
      if (toggle) toggle.checked = false;
    }
    try { localStorage.setItem('theme', theme); } catch (e) {}
  }

  function init() {
    var stored = null;
    try { stored = localStorage.getItem('theme'); } catch (e) {}
    var prefersDark = false;
    try { prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches; } catch(e) {}
    var theme = stored || (prefersDark ? 'dark' : 'light');
    applyTheme(theme);

    var toggle = document.getElementById('theme-toggle-checkbox');
    if (toggle) {
      toggle.addEventListener('change', function(e) {
        applyTheme(e.target.checked ? 'dark' : 'light');
      });
    }

    if (!stored && window.matchMedia) {
      try {
        var mq = window.matchMedia('(prefers-color-scheme: dark)');
        if (mq && mq.addEventListener) {
          mq.addEventListener('change', function(ev) {
            applyTheme(ev.matches ? 'dark' : 'light');
          });
        }
      } catch (e) {}
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})(); 