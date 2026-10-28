/* 在样式加载前恢复主题；切换只更新样式，不重载页面或案例。 */
(function (global) {
  'use strict';
  var KEY = 'atlas.theme';
  var current = 'light';
  try { if (localStorage.getItem(KEY) === 'dark') current = 'dark'; } catch (e) { }

  function syncButtons(root) {
    var label = current === 'dark' ? '切换到亮色' : '切换到暗色';
    if (global.I18N && global.I18N.lang === 'en') label = global.I18N.t(label) || label;
    (root || document).querySelectorAll('[data-theme-toggle]').forEach(function (button) {
      button.setAttribute('aria-label', label);
      button.setAttribute('title', label);
      button.setAttribute('aria-pressed', String(current === 'dark'));
    });
  }

  function apply() {
    document.documentElement.dataset.theme = current;
    document.documentElement.style.colorScheme = current;
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', current === 'dark' ? '#081a27' : '#f2f6fb');
    syncButtons();
  }

  function set(theme, persist) {
    var next = theme === 'dark' ? 'dark' : 'light';
    var changed = current !== next;
    current = next;
    if (persist !== false) {
      try { localStorage.setItem(KEY, current); } catch (e) { }
    }
    apply();
    if (changed) global.dispatchEvent(new CustomEvent('tiangong-theme-change', { detail: { theme: current } }));
  }

  global.Theme = {
    get: function () { return current; },
    set: set,
    toggle: function () { set(current === 'dark' ? 'light' : 'dark'); },
    syncButtons: syncButtons
  };
  apply();
  global.addEventListener('storage', function (event) {
    if (event.key === KEY || event.key === null) set(event.newValue, false);
  });
})(window);
