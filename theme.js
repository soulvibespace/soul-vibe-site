/**
 * Soul Vibe Space — light / dark theme, shared by every page.
 *
 * Loaded synchronously in <head> so the saved theme is applied before the page
 * paints (no flash of the wrong theme). Pages that do not include it directly
 * get it through i18n.js, which loads this file on demand.
 *
 * - The choice is stored in localStorage under `svs_theme` ('light' | 'dark')
 *   and applied on every page; without a saved choice the site stays light.
 * - Every [data-theme-toggle] button is handled here. The click is caught in
 *   the capture phase and stopped, so older per-page handlers can never toggle
 *   a second time and cancel the change.
 * - Other open tabs follow the change through the `storage` event.
 */
(function () {
  'use strict';
  if (window.SVS_THEME) return;

  var KEY = 'svs_theme';
  var root = document.documentElement;

  var LABELS = {
    en: { toLight: 'Switch to light mode', toDark: 'Switch to dark mode' },
    ru: { toLight: 'Включить светлую тему', toDark: 'Включить тёмную тему' },
    el: { toLight: 'Φωτεινό θέμα', toDark: 'Σκοτεινό θέμα' }
  };

  var ICON_SUN = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>';
  var ICON_MOON = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';

  function read() {
    try {
      var v = localStorage.getItem(KEY);
      return (v === 'dark' || v === 'light') ? v : null;
    } catch (e) { return null; }
  }

  function write(v) {
    try { localStorage.setItem(KEY, v); } catch (e) {}
  }

  function lang() {
    var l = '';
    try { l = localStorage.getItem('svs_lang') || ''; } catch (e) {}
    l = (l || root.lang || 'en').slice(0, 2);
    return LABELS[l] ? l : 'en';
  }

  function current() {
    return root.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
  }

  // Sun while dark (click → light), moon while light (click → dark).
  function updateToggles() {
    var dark = current() === 'dark';
    var L = LABELS[lang()];
    var btns = document.querySelectorAll('[data-theme-toggle]');
    for (var i = 0; i < btns.length; i++) {
      btns[i].innerHTML = dark ? ICON_SUN : ICON_MOON;
      btns[i].setAttribute('aria-label', dark ? L.toLight : L.toDark);
      btns[i].setAttribute('title', dark ? L.toLight : L.toDark);
      btns[i].setAttribute('aria-pressed', dark ? 'true' : 'false');
    }
  }

  function apply(theme) {
    root.setAttribute('data-theme', theme === 'dark' ? 'dark' : 'light');
    updateToggles();
  }

  function set(theme) {
    apply(theme);
    write(current());
  }

  function toggle() {
    set(current() === 'dark' ? 'light' : 'dark');
  }

  // 1. Apply the saved theme right away.
  apply(read() || 'light');

  // 2. One click handler for every toggle on the page.
  document.addEventListener('click', function (e) {
    var t = e.target && e.target.closest ? e.target.closest('[data-theme-toggle]') : null;
    if (!t) return;
    e.preventDefault();
    e.stopPropagation();
    toggle();
  }, true);

  // 3. Buttons exist only after parsing; refresh their icon/label then and on
  //    language change.
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { apply(read() || current()); });
  } else {
    updateToggles();
  }
  window.addEventListener('svs:langchange', updateToggles);

  // 4. Keep other open tabs in sync.
  window.addEventListener('storage', function (e) {
    if (e.key === KEY && (e.newValue === 'dark' || e.newValue === 'light')) apply(e.newValue);
  });

  // 5. Back/forward cache restores an old DOM — re-apply the stored value.
  window.addEventListener('pageshow', function () { var v = read(); if (v) apply(v); });

  window.SVS_THEME = { get: current, set: set, toggle: toggle };
})();
