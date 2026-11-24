/**
 * Soul Vibe Space — GA4 + Google Consent Mode v2.
 *
 * Подключается в <head> всех страниц при сборке (tools/seo.py), до любых тегов Google.
 * Пока GA4_ID пустой — ничего не загружается и никуда не отправляется.
 *
 * Как включить: вписать ID потока GA4 (вида G-XXXXXXXXXX) в CONFIG.ga4 ниже.
 *
 * Согласие берётся из cookie-баннера (cookie-banner.js, localStorage 'svs_cookie_consent'):
 *   'all'        → analytics_storage = granted, GA4 загружается;
 *   'essential'  → всё denied, GA4 не загружается (mode 'basic');
 *   нет ответа   → всё denied, ждём выбора в баннере.
 * Рекламные сигналы (ad_storage, ad_user_data, ad_personalization) всегда denied —
 * рекламы Google на сайте нет. Если появится, это отдельное решение владельца.
 *
 * mode 'basic'    — Google не получает ничего до согласия (самый осторожный вариант для ЕС);
 * mode 'advanced' — gtag загружается сразу и шлёт обезличенные пинги без cookie до согласия
 *                   (больше данных в отчётах за счёт моделирования; решает владелец).
 *
 * События: window.svsTrack('booking_start', { class_name: '…' }) — безопасно вызывать
 * где угодно; без согласия/ID это no-op. Клики по WhatsApp/Instagram/TikTok/телефону/
 * почте отслеживаются автоматически (contact_click). Отладка: ?ga_debug=1 в адресе.
 */
(function () {
  'use strict';
  var CONFIG = {
    ga4: '',          // TODO(владелец): ID потока GA4, напр. 'G-XXXXXXXXXX'
    mode: 'basic',    // 'basic' | 'advanced'
  };
  var CONSENT_KEY = 'svs_cookie_consent';
  var LANG_KEY = 'svs_lang';

  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }
  window.gtag = window.gtag || gtag;

  function read(key) { try { return localStorage.getItem(key); } catch (e) { return null; } }

  // Consent Mode v2: значения по умолчанию — до загрузки gtag.js.
  gtag('consent', 'default', {
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
    analytics_storage: 'denied',
    functionality_storage: 'granted',
    security_storage: 'granted',
    wait_for_update: 500,
  });
  gtag('set', 'ads_data_redaction', true);

  var loaded = false, granted = false;
  var debug = /[?&]ga_debug=1\b/.test(location.search);

  function load() {
    if (loaded || !CONFIG.ga4) return;
    loaded = true;
    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(CONFIG.ga4);
    (document.head || document.documentElement).appendChild(s);
    gtag('js', new Date());
    gtag('set', 'user_properties', { site_language: (read(LANG_KEY) || 'en').toLowerCase() });
    var cfg = {};
    if (debug) cfg.debug_mode = true;
    gtag('config', CONFIG.ga4, cfg);
  }

  function apply(value) {
    granted = value === 'all';
    gtag('consent', 'update', { analytics_storage: granted ? 'granted' : 'denied' });
    if (granted) load();
  }

  if (CONFIG.ga4) {
    var saved = read(CONSENT_KEY);
    if (saved) apply(saved);
    if (CONFIG.mode === 'advanced') load();
    // cookie-banner.js сообщает о выборе событием svs:consent (detail: 'all' | 'essential').
    window.addEventListener('svs:consent', function (e) { apply(e && e.detail); });
    window.addEventListener('svs:langchange', function (e) {
      if (loaded && e && e.detail && e.detail.lang) gtag('set', 'user_properties', { site_language: e.detail.lang });
    });
  }

  // Событие GA4. В режиме basic без согласия ничего не копится и не отправляется.
  window.svsTrack = function (name, params) {
    if (!CONFIG.ga4 || !name) return;
    if (CONFIG.mode === 'basic' && !granted) return;
    gtag('event', name, params || {});
  };

  // Автоматически: клики по способам связи (лиды для студии).
  document.addEventListener('click', function (e) {
    var a = e.target && e.target.closest ? e.target.closest('a[href]') : null;
    if (!a) return;
    var h = a.getAttribute('href') || '', method = null;
    if (/wa\.me|whatsapp/i.test(h)) method = 'whatsapp';
    else if (/instagram\.com/i.test(h)) method = 'instagram';
    else if (/tiktok\.com/i.test(h)) method = 'tiktok';
    else if (/^tel:/i.test(h)) method = 'phone';
    else if (/^mailto:/i.test(h)) method = 'email';
    else if (/google\.[a-z.]+\/maps|maps\.app\.goo\.gl/i.test(h)) method = 'maps';
    if (method) window.svsTrack('contact_click', { method: method, link_url: h, page_path: location.pathname });
  }, true);
})();
