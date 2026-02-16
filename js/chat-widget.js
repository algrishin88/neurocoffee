/**
 * Мини-чат с YaGPT — справа снизу, без входа.
 * Темы: программирование, кофе, по душам.
 */
(function () {
  const STORAGE_KEY = 'neuro-cafe-yagpt-chat';
  const MAX_HISTORY = 6;

  function getHistory() {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (_) {
      return [];
    }
  }

  function saveHistory(history) {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(history.slice(-MAX_HISTORY * 2)));
    } catch (_) {}
  }

  function createButton() {
    const btn = document.createElement('button');
    btn.className = 'nc-chat-trigger';
    btn.type = 'button';
    btn.setAttribute('aria-label', 'Открыть чат с YaGPT');
    btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>';
    return btn;
  }

  function createPanel() {
    const panel = document.createElement('div');
    panel.className = 'nc-chat-panel hidden';
    panel.innerHTML = `
      <div class="nc-chat-header">
        <span>Чат с YaGPT</span>
        <button type="button" class="nc-chat-close" aria-label="Закрыть"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
      </div>
      <div class="nc-chat-messages"></div>
      <form class="nc-chat-form">
        <textarea class="nc-chat-input" rows="1" placeholder="Напиши что-нибудь…" maxlength="2000"></textarea>
        <button type="submit" class="nc-chat-send" aria-label="Отправить"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg></button>
      </form>
    `;
    return panel;
  }

  function scrollToBottom(container) {
    if (container) container.scrollTop = container.scrollHeight;
  }

  function appendMessage(container, role, text, isTyping) {
    const div = document.createElement('div');
    div.className = 'nc-chat-msg ' + (role === 'user' ? 'user' : 'bot') + (isTyping ? ' typing' : '');
    div.textContent = text || '';
    container.appendChild(div);
    scrollToBottom(container);
    return div;
  }

  function updateTyping(el, text) {
    if (!el) return;
    el.classList.remove('typing');
    el.textContent = text || '';
  }

  function injectStyles() {
    if (document.getElementById('nc-chat-widget-styles')) return;
    const link = document.createElement('link');
    link.id = 'nc-chat-widget-styles';
    link.rel = 'stylesheet';
    link.href = 'css/chat-widget.css';
    document.head.appendChild(link);
  }

  function init() {
    injectStyles();
    const root = document.createElement('div');
    root.className = 'nc-chat-root';
    const trigger = createButton();
    const panel = createPanel();
    const messagesEl = panel.querySelector('.nc-chat-messages');
    const form = panel.querySelector('.nc-chat-form');
    const input = panel.querySelector('.nc-chat-input');
    const sendBtn = panel.querySelector('.nc-chat-send');
    const closeBtn = panel.querySelector('.nc-chat-close');

    root.appendChild(trigger);
    root.appendChild(panel);
    document.body.appendChild(root);

    var welcomeShown = false;
    trigger.addEventListener('click', function () {
      panel.classList.toggle('hidden');
      if (!panel.classList.contains('hidden')) {
        input.focus();
        if (!welcomeShown && messagesEl.children.length === 0) {
          welcomeShown = true;
          appendMessage(messagesEl, 'bot', 'Привет! Можешь спросить про проект НейроКофейни, про кофе или программирование — или просто поболтать по душам. Отвечу коротко и по-человечески.');
        }
      }
    });
    closeBtn.addEventListener('click', function () {
      panel.classList.add('hidden');
    });

    form.addEventListener('submit', async function (e) {
      e.preventDefault();
      const text = (input.value || '').trim();
      if (!text || sendBtn.disabled) return;

      input.value = '';
      sendBtn.disabled = true;
      const history = getHistory();
      appendMessage(messagesEl, 'user', text);
      const typingEl = appendMessage(messagesEl, 'bot', '', true);

      const payload = { message: text };
      if (history.length) {
        payload.history = history.slice(-MAX_HISTORY);
      }

      try {
        const res = await fetch('/api/ai/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await res.json().catch(function () { return {}; });
        const reply = (data.reply != null ? data.reply : data.message) || 'Не удалось ответить. Попробуй ещё раз.';
        updateTyping(typingEl, reply);
        saveHistory([...history, { role: 'user', text }, { role: 'assistant', text: reply }]);
      } catch (err) {
        updateTyping(typingEl, 'Ошибка связи. Проверь интернет и попробуй снова.');
      }
      sendBtn.disabled = false;
      scrollToBottom(messagesEl);
    });

    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        form.requestSubmit();
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
