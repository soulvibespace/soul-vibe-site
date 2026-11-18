/**
 * Soul Vibe Space — the site is light-only.
 *
 * The dark theme and its toggle were removed. This tiny script stays so that
 * visitors who once picked the dark theme (saved as `svs_theme` in
 * localStorage) get the light site:
 *   - forgets the old saved choice;
 *   - pins <html data-theme="light"> even if an old inline script on a page
 *     still tries to set "dark" from a stale value.
 *
 * Included in <head> of every page; pages without the tag get it via i18n.js.
 */
(function () {
  'use strict';
  if (window.SVS_THEME) return;

  var root = document.documentElement;

  try { localStorage.removeItem('svs_theme'); } catch (e) {}

  function pinLight() {
    if (root.getAttribute('data-theme') !== 'light') root.setAttribute('data-theme', 'light');
    root.classList.remove('dark');
  }
  pinLight();

  if (window.MutationObserver) {
    new MutationObserver(pinLight).observe(root, { attributes: true, attributeFilter: ['data-theme', 'class'] });
  }

  window.SVS_THEME = { get: function () { return 'light'; } };
})();
