/* Soul Vibe Space — приложение на экране телефона (PWA, #104 / #105).
 *
 *  1) Регистрирует service worker /sw.js (кэш только статики, см. комментарий в sw.js).
 *  2) В установленном приложении (display-mode: standalone или iOS navigator.standalone)
 *     добавляет нижнее меню: Расписание · Мои записи · VIBES · Профиль. На обычном сайте меню нет.
 *  3) На /account ненавязчиво предлагает установить приложение:
 *     Android/Chrome — кнопка (событие beforeinstallprompt), iPhone/iPad Safari — инструкция
 *     «Поделиться → На экран „Домой“». Закрыли — не показываем 30 дней.
 *  Тексты — ключи pwa_* в i18n.js (RU/EN/EL).
 */
(function () {
  'use strict';
  var W = window, D = document;
  var HINT_KEY = 'svs_pwa_hint_closed';
  var HINT_DAYS = 30;

  function t(key, fb) {
    try { var v = W.SVS_I18N && W.SVS_I18N.t(key); return v && v !== key ? v : fb; } catch (e) { return fb; }
  }
  function store(k, v) {
    try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; }
  }

  // ── 1. Service worker ──────────────────────────────────────────────────────
  var secure = location.protocol === 'https:' || /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
  if ('serviceWorker' in navigator && secure) {
    W.addEventListener('load', function () {
      navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(function () {});
    });
  }

  // ── 2. Standalone: нижнее меню ─────────────────────────────────────────────
  function standalone() {
    try {
      if (W.matchMedia && (W.matchMedia('(display-mode: standalone)').matches || W.matchMedia('(display-mode: fullscreen)').matches)) return true;
    } catch (e) {}
    return W.navigator.standalone === true;
  }

  var ICONS = {
    schedule: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="4.5" width="17" height="16" rx="3"/><path d="M8 2.75v3.5M16 2.75v3.5M3.5 9.5h17M8 13.5h2M14 13.5h2M8 17h2"/></svg>',
    bookings: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 4.5h8M6.5 3h11A1.5 1.5 0 0 1 19 4.5v15a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 5 19.5v-15A1.5 1.5 0 0 1 6.5 3z"/><path d="M8.5 11.5l2.2 2.2 4.8-4.7M8.5 17h7"/></svg>',
    vibes: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20.5c-4.3-1.8-7.5-5.3-7.5-9.3 0-.6.1-1.2.2-1.7 2.7.2 5.5 1.7 7.3 4.2 1.8-2.5 4.6-4 7.3-4.2.1.5.2 1.1.2 1.7 0 4-3.2 7.5-7.5 9.3z"/><path d="M12 13.7c-1-2.4-1-5.6 0-9.2 1 3.6 1 6.8 0 9.2z"/></svg>',
    profile: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8.5" r="4"/><path d="M4.5 20.5c1.1-3.6 4-5.5 7.5-5.5s6.4 1.9 7.5 5.5"/></svg>'
  };
  var TABS = [
    { id: 'schedule', href: '/schedule', key: 'pwa_tab_schedule', fb: 'Schedule' },
    { id: 'bookings', href: '/account#bookings', key: 'pwa_tab_bookings', fb: 'My bookings' },
    { id: 'vibes', href: '/account#vibes', key: 'pwa_tab_vibes', fb: 'VIBES' },
    { id: 'profile', href: '/account', key: 'pwa_tab_profile', fb: 'Profile' }
  ];

  // Языковые адреса /ru/…, /el/… (S2): префикс не влияет на вкладки, ссылки меню его сохраняют.
  function langPrefix() { var m = location.pathname.match(/^\/(ru|el)(?=\/|$)/); return m ? '/' + m[1] : ''; }
  function path() { return location.pathname.replace(/^\/(ru|el)(?=\/|$)/, '').replace(/\.html$/, '').replace(/\/+$/, '') || '/'; }

  function activeTab() {
    var p = path();
    if (p === '/schedule') return 'schedule';
    if (p === '/account') return location.hash === '#bookings' ? 'bookings' : location.hash === '#vibes' ? 'vibes' : 'profile';
    return '';
  }

  function paintTabs(nav) {
    var cur = activeTab();
    TABS.forEach(function (tab) {
      var a = nav.querySelector('[data-tab="' + tab.id + '"]');
      if (!a) return;
      a.querySelector('.svs-tab-label').textContent = t(tab.key, tab.fb);
      if (tab.id === cur) { a.classList.add('is-active'); a.setAttribute('aria-current', 'page'); }
      else { a.classList.remove('is-active'); a.removeAttribute('aria-current'); }
    });
    nav.setAttribute('aria-label', t('pwa_tabs_label', 'App menu'));
  }

  // /account#vibes и #bookings: прокрутка к разделу (раздел VIBES появляется после загрузки).
  function scrollToHash() {
    if (path() !== '/account') return;
    var id = location.hash === '#vibes' ? 'vibesSection' : location.hash === '#bookings' ? 'bookings' : '';
    if (!id) { if (location.hash === '' && D.activeElement && D.activeElement.closest && D.activeElement.closest('.svs-tabbar')) W.scrollTo({ top: 0, behavior: 'smooth' }); return; }
    var tries = 0;
    (function go() {
      var el = D.getElementById(id);
      if (el && !el.hidden && el.offsetParent !== null) { el.scrollIntoView({ block: 'start', behavior: tries ? 'smooth' : 'auto' }); return; }
      if (++tries < 40) setTimeout(go, 150);
    })();
  }

  function mountTabs() {
    if (D.querySelector('.svs-tabbar')) return;
    D.documentElement.classList.add('svs-standalone');
    var nav = D.createElement('nav');
    nav.className = 'svs-tabbar';
    nav.innerHTML = TABS.map(function (tab) {
      return '<a class="svs-tab" data-tab="' + tab.id + '" href="' + langPrefix() + tab.href + '">' + ICONS[tab.id] +
        '<span class="svs-tab-label"></span></a>';
    }).join('');
    // Профиль на /account: просто наверх, без перезагрузки.
    nav.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('.svs-tab');
      if (!a || path() !== '/account') return;
      var tab = a.getAttribute('data-tab');
      if (tab === 'profile') {
        e.preventDefault();
        if (location.hash) history.pushState(null, '', langPrefix() + '/account' + location.search);
        W.scrollTo({ top: 0, behavior: 'smooth' });
        paintTabs(nav);
      }
    });
    D.body.appendChild(nav);
    paintTabs(nav);
    W.addEventListener('hashchange', function () { paintTabs(nav); scrollToHash(); });
    W.addEventListener('popstate', function () { paintTabs(nav); });
    W.addEventListener('svs:langchange', function () { paintTabs(nav); });
  }

  // ── 3. Подсказка «Установить приложение» (/account) ───────────────────────
  var deferred = null;
  W.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    deferred = e;
    renderHint();
  });
  W.addEventListener('appinstalled', function () { deferred = null; removeHint(); store(HINT_KEY, String(Date.now())); });

  function isIOS() {
    var ua = navigator.userAgent || '';
    var iPadOS = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
    return /iPhone|iPad|iPod/.test(ua) || iPadOS;
  }
  function isIOSSafari() {
    var ua = navigator.userAgent || '';
    return isIOS() && /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS|YaBrowser|GSA\//.test(ua);
  }
  function closedRecently() {
    var v = Number(store(HINT_KEY) || 0);
    return v && (Date.now() - v) < HINT_DAYS * 864e5;
  }
  function hintPlace() {
    // В кабинете — под строкой профиля; для гостя — под формой входа.
    var dash = D.getElementById('accDashboard');
    if (dash && dash.offsetParent !== null) {
      var prof = dash.querySelector('.dash-profile');
      return { parent: dash, before: prof ? prof.nextSibling : dash.firstChild };
    }
    var auth = D.getElementById('accAuth');
    if (auth && auth.offsetParent !== null) return { parent: auth, before: null };
    return null;
  }
  function removeHint() { var h = D.getElementById('svsInstallHint'); if (h) h.remove(); }

  var SHARE_ICON = '<svg class="svs-ih-share" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.5v11M8.2 7.2 12 3.5l3.8 3.7"/><path d="M8 10.5H6.5A1.5 1.5 0 0 0 5 12v7a1.5 1.5 0 0 0 1.5 1.5h11A1.5 1.5 0 0 0 19 19v-7a1.5 1.5 0 0 0-1.5-1.5H16"/></svg>';

  function renderHint() {
    if (path() !== '/account' || standalone() || closedRecently()) return;
    var mode = deferred ? 'android' : (isIOSSafari() ? 'ios' : '');
    if (!mode) return;
    var place = hintPlace();
    if (!place) return;
    var box = D.getElementById('svsInstallHint');
    if (box && box.offsetParent === null) { box.remove(); box = null; } // гость вошёл — переносим в кабинет
    if (!box) {
      box = D.createElement('aside');
      box.id = 'svsInstallHint';
      box.className = 'svs-ih';
      place.parent.insertBefore(box, place.before);
    }
    box.setAttribute('data-mode', mode);
    var text = mode === 'ios'
      ? t('pwa_ios_steps', 'Tap Share {share} at the bottom of the screen, then “Add to Home Screen”.')
      : t('pwa_install_text', 'Schedule, your bookings and VIBES in one tap from your home screen.');
    var esc = function (s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); };
    box.innerHTML =
      '<img class="svs-ih-icon" src="/images/app/icon-192.png" alt="" width="40" height="40" />' +
      '<div class="svs-ih-body">' +
        '<p class="svs-ih-title">' + esc(t(mode === 'ios' ? 'pwa_ios_title' : 'pwa_install_title', 'Install the Soul Vibe Space app')) + '</p>' +
        '<p class="svs-ih-text">' + esc(text).replace('{share}', SHARE_ICON) + '</p>' +
        (mode === 'android' ? '<button type="button" class="svs-ih-btn" data-act="install">' + esc(t('pwa_install_btn', 'Install')) + '</button>' : '') +
      '</div>' +
      '<button type="button" class="svs-ih-close" data-act="close" aria-label="' + esc(t('pwa_install_close', 'Not now')) + '">' +
        '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg></button>';
    box.onclick = function (e) {
      var b = e.target.closest && e.target.closest('[data-act]');
      if (!b) return;
      if (b.getAttribute('data-act') === 'close') { store(HINT_KEY, String(Date.now())); removeHint(); return; }
      if (deferred) {
        var ev = deferred; deferred = null;
        ev.prompt();
        (ev.userChoice || Promise.resolve({})).then(function (c) {
          if (c && c.outcome === 'dismissed') store(HINT_KEY, String(Date.now()));
          removeHint();
        });
      }
    };
  }

  function init() {
    if (standalone()) { mountTabs(); scrollToHash(); }
    if (path() === '/account') {
      // Кабинет или форма входа появляются после проверки сессии — пробуем несколько раз.
      var n = 0;
      (function wait() { renderHint(); if (!D.getElementById('svsInstallHint') && ++n < 20) setTimeout(wait, 300); })();
      W.addEventListener('svs:langchange', function () { if (D.getElementById('svsInstallHint')) renderHint(); });
    }
  }

  if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', init); else init();

  // Для тестов (node tests/pwa.test.js)
  W.SVS_PWA = { standalone: standalone, activeTab: activeTab, isIOSSafari: isIOSSafari };
})();
