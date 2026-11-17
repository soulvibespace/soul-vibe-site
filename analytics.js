/**
 * Soul Vibe Space — GA4 via Google Tag Manager
 * Single shared file, included identically on every page.
 * Loads GTM only after cookie consent = 'all' (see cookie-banner.js),
 * then tracks key CTA clicks, language switches, and social clicks
 * through the dataLayer. Actual GA4 tag/trigger wiring happens inside
 * the GTM container UI — this file only pushes events and loads the
 * container script.
 */
(function () {
  'use strict';

  // TODO: replace with the real GTM container ID before this goes live.
  var GTM_ID = 'GTM-XXXXXXX';

  var CONSENT_KEY = 'svs_cookie_consent';
  window.dataLayer = window.dataLayer || [];

  function push(obj) {
    window.dataLayer.push(obj);
  }

  function hasConsent() {
    try {
      return window.localStorage.getItem(CONSENT_KEY) === 'all';
    } catch (e) {
      return false;
    }
  }

  function loadGTM() {
    if (window.__svsGtmLoaded || GTM_ID.indexOf('XXXXXXX') !== -1) return;
    window.__svsGtmLoaded = true;
    push({ 'gtm.start': new Date().getTime(), event: 'gtm.js' });
    var f = document.getElementsByTagName('script')[0];
    var j = document.createElement('script');
    j.async = true;
    j.src = 'https://www.googletagmanager.com/gtm.js?id=' + GTM_ID;
    f.parentNode.insertBefore(j, f);
  }

  if (hasConsent()) loadGTM();

  // cookie-banner.js dispatches this the moment the visitor accepts/rejects.
  window.addEventListener('svs:consent', function (e) {
    if (e && e.detail === 'all') loadGTM();
  });

  // Cross-tab: consent changed in another tab.
  window.addEventListener('storage', function (e) {
    if (e.key === CONSENT_KEY && e.newValue === 'all') loadGTM();
  });

  // ── CTA click tracking ────────────────────────────────────────────
  // Curated allow-list of data-i18n keys that mark real conversion actions
  // (booking, sign-in, gift certificates, CTA bands) — kept small on purpose
  // so the funnel stays readable instead of drowning in nav clicks.
  var TRACKED_I18N_KEYS = [
    'btn_book_now', 'btn_book_float', 'contact_book_btn', 'footer_book',
    'gift_cta', 'classes_cta', 'about_cta', 'home_reviews_cta',
    'nav_signin', 'acc_action_bookclass'
  ];

  function labelFor(el) {
    var key = el.getAttribute('data-i18n');
    if (key) return key;
    if (el.classList.contains('lang-btn')) return 'lang_switch_' + (el.getAttribute('data-lang-btn') || '?');
    var href = el.getAttribute('href') || '';
    if (href.indexOf('instagram.com') !== -1) return 'social_instagram';
    if (href.indexOf('tiktok.com') !== -1) return 'social_tiktok';
    if (href.indexOf('wa.me') !== -1) return 'social_whatsapp';
    return null;
  }

  document.addEventListener('click', function (e) {
    var el = e.target.closest('a, button');
    if (!el) return;

    var i18nKey = el.getAttribute('data-i18n');
    if (i18nKey && TRACKED_I18N_KEYS.indexOf(i18nKey) === -1) {
      // Not on the CTA allow-list (e.g. a nav link) — ignore, keep funnel focused.
      if (!el.classList.contains('lang-btn')) return;
    }

    var label = labelFor(el);
    if (!label) return;

    push({
      event: 'cta_click',
      cta_label: label,
      cta_href: el.getAttribute('href') || '',
      page_path: window.location.pathname
    });
  }, true);

  // Exposed so booking-modal.js can report funnel steps without a hard
  // dependency on GTM being loaded yet (events queue in dataLayer either way).
  window.svsTrack = function (eventName, params) {
    push(Object.assign({ event: eventName, page_path: window.location.pathname }, params || {}));
  };
})();
