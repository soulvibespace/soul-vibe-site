/* Soul Vibe Space — приложение на экране телефона (PWA, #104 / #105).
 *
 *  1) Регистрирует service worker /sw.js (кэш только статики, см. комментарий в sw.js).
 *  2) В установленном приложении (display-mode: standalone или iOS navigator.standalone)
 *     добавляет нижнее меню: Расписание · Мои записи · VIBES · Профиль. На обычном сайте меню нет.
 *  3) На телефоне предлагает установить приложение: всплывашка внизу экрана (через ~3 с, не поверх
 *     баннера cookie), инструкция в нижнем листе (iPhone Safari / iPhone в другом браузере / Android),
 *     подсказка в кабинете и ссылка «Установить приложение» в мобильном меню и подвале.
 *     Android/Chrome — сразу системное окно (beforeinstallprompt). Закрыли — 14 дней тишины.
 *  Тексты — ключи pwa_* в i18n.js (RU/EN/EL).
 */
(function () {
  'use strict';
  var W = window, D = document;
  var HINT_KEY = 'svs_pwa_hint_closed';
  var HINT_DAYS = 14;

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

  // Иконки: одна сетка 24×24, линия 1.75, скругления; лотос строго симметричен относительно x = 12.
  var SVG = '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">';
  var ICONS = {
    schedule: SVG + '<rect x="3.5" y="4.5" width="17" height="16" rx="2.5"/><path d="M8 2.75v3.5M16 2.75v3.5M3.5 9.5h17M8.5 13.5h.01M12 13.5h.01M15.5 13.5h.01M8.5 17h.01M12 17h.01"/></svg>',
    classes: SVG + '<circle cx="12" cy="5" r="2.25"/><path d="M8.25 15.25V13a3.75 3.75 0 0 1 7.5 0v2.25M3.5 18.25c2.1-1.85 5.1-2.85 8.5-2.85s6.4 1 8.5 2.85c-2.1 1.4-5.1 2.25-8.5 2.25s-6.4-.85-8.5-2.25z"/></svg>',
    pricing: SVG + '<rect x="3" y="6" width="18" height="12" rx="2.5"/><path d="M3 10.25h18M7 14.5h4"/></svg>',
    vibes: SVG + '<path d="M12 4.5C9.4 7.8 8.8 12.2 12 19.5c3.2-7.3 2.6-11.7 0-15Z"/><path d="M12 19.5c-4.6-.3-8-3.4-8.5-8.2 3.2-.3 5.8 1.2 7.3 3.9"/><path d="M12 19.5c4.6-.3 8-3.4 8.5-8.2-3.2-.3-5.8 1.2-7.3 3.9"/></svg>',
    profile: SVG + '<circle cx="12" cy="8.25" r="3.75"/><path d="M4.5 20c1.1-3.5 3.9-5.25 7.5-5.25s6.4 1.75 7.5 5.25"/></svg>'
  };
  var TABS = [
    { id: 'schedule', href: '/schedule', key: 'pwa_tab_schedule', fb: 'Schedule' },
    { id: 'classes', href: '/classes', key: 'pwa_tab_classes', fb: 'Classes' },
    { id: 'pricing', href: '/pricing', key: 'pwa_tab_passes', fb: 'Passes' },
    { id: 'vibes', href: '/vibes', key: 'pwa_tab_vibes', fb: 'VIBES' },
    { id: 'profile', href: '/account', key: 'pwa_tab_profile', fb: 'Profile' }
  ];

  // Языковые адреса /ru/…, /el/… (S2): префикс не влияет на вкладки, ссылки меню его сохраняют.
  function langPrefix() { var m = location.pathname.match(/^\/(ru|el)(?=\/|$)/); return m ? '/' + m[1] : ''; }
  function path() { return location.pathname.replace(/^\/(ru|el)(?=\/|$)/, '').replace(/\.html$/, '').replace(/\/+$/, '') || '/'; }

  function activeTab() {
    var p = path();
    for (var i = 0; i < TABS.length; i++) if (p === TABS[i].href) return TABS[i].id;
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
    nav.setAttribute('aria-label', t('pwa_tabs_label', 'Quick menu'));
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

  // Нижнее меню: на всех страницах, кроме оплаты, входа и админки. Видно только на ширине ≤ 900px (style.css).
  function tabsAllowed() { return !/^\/(payment|auth-callback|admin)(\/|$)/.test(path()); }

  function mountTabs() {
    if (D.querySelector('.svs-tabbar') || !tabsAllowed()) return;
    D.documentElement.classList.add('svs-tabs');
    if (standalone()) D.documentElement.classList.add('svs-standalone');
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

  // ── 3. Установка приложения: всплывашка, инструкция, подсказка в кабинете ──
  // Режимы (installMode):
  //   'prompt'    — Android/Chrome прислал beforeinstallprompt: «Установить» вызывает системное окно;
  //   'android'   — Android без beforeinstallprompt: инструкция «Меню ⋮ → На главный экран → Установить»;
  //   'ios'       — iPhone/iPad в Safari: «Поделиться → На экран „Домой“ → Добавить»;
  //   'ios-other' — iPhone/iPad в Chrome, Instagram, Telegram и т. п.: сначала открыть страницу в Safari.
  // Закрыли всплывашку или подсказку — не показываем 14 дней (svs_pwa_hint_closed).
  // Установили — больше никогда (svs_pwa_installed). Ссылка «Установить приложение» в мобильном меню
  // и подвале открывает инструкцию всегда (кроме самого приложения).
  var INSTALLED_KEY = 'svs_pwa_installed';
  var POP_DELAY = 2800;
  var POP_PAGES = ['/', '/schedule', '/classes', '/pricing', '/vibes', '/account'];
  var deferred = null;

  W.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    deferred = e;
    refresh();
  });
  W.addEventListener('appinstalled', function () {
    deferred = null; store(INSTALLED_KEY, '1'); removeHint(); removePopup(); closeSheet(); removeLinks();
  });

  function ua() { return navigator.userAgent || ''; }
  function isIOS() {
    var iPadOS = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
    return /iPhone|iPad|iPod/.test(ua()) || iPadOS;
  }
  // Настоящий Safari: не Chrome/Firefox/Edge/Opera/Яндекс/Google и не встроенный браузер соцсетей.
  var IOS_NOT_SAFARI = /CriOS|FxiOS|EdgiOS|OPiOS|OPT\/|YaBrowser|GSA\/|DuckDuckGo|Instagram|FBAN|FBAV|FBIOS|Line\/|Telegram|TwitterAndroid|Snapchat|Pinterest|MicroMessenger/;
  function isIOSSafari() { return isIOS() && /Safari\//.test(ua()) && !IOS_NOT_SAFARI.test(ua()); }
  function isMobile() {
    try { return W.matchMedia('(max-width: 900px)').matches || W.matchMedia('(pointer: coarse)').matches; } catch (e) { return false; }
  }
  function installMode() {
    if (deferred) return 'prompt';
    if (isIOS()) return isIOSSafari() ? 'ios' : 'ios-other';
    return 'android';
  }
  function installed() { return store(INSTALLED_KEY) === '1'; }
  function closedRecently() {
    var v = Number(store(HINT_KEY) || 0);
    return !!v && (Date.now() - v) < HINT_DAYS * 864e5;
  }
  function snooze() { store(HINT_KEY, String(Date.now())); }
  function cookieBannerVisible() { return !!D.getElementById('svs-cookie-banner'); }
  function popupAllowed() {
    return !standalone() && !installed() && !closedRecently() && isMobile() && POP_PAGES.indexOf(path()) !== -1;
  }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

  var IC = {
    share: '<svg class="svs-pi" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.5v11M8.2 7.2 12 3.5l3.8 3.7"/><path d="M8 10.5H6.5A1.5 1.5 0 0 0 5 12v7a1.5 1.5 0 0 0 1.5 1.5h11A1.5 1.5 0 0 0 19 19v-7a1.5 1.5 0 0 0-1.5-1.5H16"/></svg>',
    add: '<svg class="svs-pi" viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="4"/><path d="M12 8.5v7M8.5 12h7"/></svg>',
    menu: '<svg class="svs-pi" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="5.5" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="12" cy="18.5" r="1.4"/></svg>',
    safari: '<svg class="svs-pi" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><path d="m15.5 8.5-2.2 4.8-4.8 2.2 2.2-4.8z"/></svg>',
    close: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>',
    copy: '<svg class="svs-pi" viewBox="0 0 24 24" aria-hidden="true"><rect x="8.5" y="8.5" width="11" height="11" rx="2.5"/><path d="M15.5 8.5V6A1.5 1.5 0 0 0 14 4.5H6A1.5 1.5 0 0 0 4.5 6v8A1.5 1.5 0 0 0 6 15.5h2.5"/></svg>'
  };
  function fill(s) { return esc(s).replace('{share}', IC.share).replace('{add}', IC.add).replace('{menu}', IC.menu); }
  function ctaLabel(mode) { return mode === 'prompt' ? t('pwa_install_btn', 'Install') : t('pwa_how_btn', 'How to install'); }

  // Главная кнопка: системное окно установки (Android/Chrome) или инструкция.
  function act(from) {
    if (deferred) {
      var ev = deferred; deferred = null;
      ev.prompt();
      (ev.userChoice || Promise.resolve({})).then(function (c) {
        if (c && c.outcome === 'accepted') store(INSTALLED_KEY, '1');
        else if (from !== 'link') snooze();
        removePopup(); removeHint(); refresh();
      });
      return;
    }
    openSheet(installMode());
  }

  // ── 3a. Всплывашка внизу экрана ──
  var popTimer = null, popWaiting = false;
  function removePopup() {
    var p = D.getElementById('svsInstallPop');
    if (!p) return;
    p.classList.remove('is-in');
    setTimeout(function () { if (p.parentNode) p.parentNode.removeChild(p); }, 250);
  }
  function renderPopup(p) {
    var mode = installMode();
    p.setAttribute('data-mode', mode);
    p.setAttribute('aria-label', t('pwa_install_title', 'Install the Soul Vibe Space app'));
    p.innerHTML =
      '<img class="svs-pop-icon" src="/images/app/icon-192.png" alt="" width="48" height="48" />' +
      '<div class="svs-pop-body">' +
        '<p class="svs-pop-title">' + esc(t('pwa_install_title', 'Install the Soul Vibe Space app')) + '</p>' +
        '<p class="svs-pop-text">' + esc(t('pwa_pop_text', 'Schedule, bookings and VIBES, one tap from your home screen.')) + '</p>' +
        '<button type="button" class="svs-pop-btn" data-act="go">' + esc(ctaLabel(mode)) + '</button>' +
      '</div>' +
      '<button type="button" class="svs-pop-close" data-act="close" aria-label="' + esc(t('pwa_install_close', 'Not now')) + '">' + IC.close + '</button>';
  }
  function showPopup() {
    popTimer = null;
    if (!popupAllowed() || D.getElementById('svsInstallPop') || D.getElementById('svsInstallHint') || D.getElementById('svsInstallSheet')) return;
    if (cookieBannerVisible()) { waitCookie(); return; }
    var p = D.createElement('aside');
    p.id = 'svsInstallPop';
    p.className = 'svs-pop';
    p.setAttribute('role', 'dialog');
    renderPopup(p);
    p.addEventListener('click', function (e) {
      var b = e.target.closest && e.target.closest('[data-act]');
      if (!b) return;
      if (b.getAttribute('data-act') === 'close') { snooze(); removePopup(); return; }
      act('popup');
    });
    D.body.appendChild(p);
    requestAnimationFrame(function () { requestAnimationFrame(function () { p.classList.add('is-in'); }); });
  }
  // Баннер cookie на экране — ждём, пока его закроют, и показываемся чуть позже.
  function waitCookie() {
    if (popWaiting) return;
    popWaiting = true;
    var done = function () {
      if (cookieBannerVisible()) return;
      popWaiting = false;
      W.removeEventListener('svs:consent', done);
      if (obs) obs.disconnect();
      schedulePopup(1200);
    };
    var obs = null;
    W.addEventListener('svs:consent', done);
    try { obs = new MutationObserver(done); obs.observe(D.body, { childList: true }); } catch (e) {}
  }
  function schedulePopup(ms) {
    if (popTimer || !popupAllowed()) return;
    popTimer = setTimeout(showPopup, ms);
  }

  // ── 3b. Инструкция (нижний лист) ──
  var lastFocus = null;
  function steps(mode) {
    if (mode === 'ios') return [t('pwa_ios_s1', 'Tap Share {share} at the bottom of Safari'), t('pwa_ios_s2', 'Scroll down and choose “Add to Home Screen” {add}'), t('pwa_ios_s3', 'Tap “Add”: the Soul Vibe Space icon appears on your home screen')];
    if (mode === 'ios-other') return [t('pwa_iosx_s1', 'Open this page in Safari: copy the link and paste it into the address bar'), t('pwa_iosx_s2', 'In Safari, tap Share {share} and choose “Add to Home Screen” {add}'), t('pwa_ios_s3', 'Tap “Add”: the Soul Vibe Space icon appears on your home screen')];
    return [t('pwa_and_s1', 'Open the browser menu {menu} in the top right corner'), t('pwa_and_s2', 'Choose “Add to Home screen” or “Install app”'), t('pwa_and_s3', 'Tap “Install”: the Soul Vibe Space icon appears on your home screen')];
  }
  function shareUrl() { return location.origin + location.pathname + location.search; }
  function copyLink(btn) {
    var url = shareUrl();
    var ok = function () {
      btn.classList.add('is-done');
      btn.querySelector('span').textContent = t('pwa_copied', 'Link copied');
      setTimeout(function () { if (btn.isConnected) { btn.classList.remove('is-done'); btn.querySelector('span').textContent = t('pwa_copy_link', 'Copy link'); } }, 2500);
    };
    var legacy = function () {
      try {
        var ta = D.createElement('textarea'); ta.value = url; ta.setAttribute('readonly', ''); ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0';
        D.body.appendChild(ta); ta.select(); ta.setSelectionRange(0, url.length); D.execCommand('copy'); D.body.removeChild(ta); ok();
      } catch (e) {}
    };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(ok, legacy); else legacy();
  }
  function closeSheet() {
    var s = D.getElementById('svsInstallSheet');
    if (!s) return;
    s.classList.remove('is-in');
    D.documentElement.classList.remove('svs-sheet-open');
    D.removeEventListener('keydown', onKey);
    setTimeout(function () { if (s.parentNode) s.parentNode.removeChild(s); }, 250);
    if (lastFocus && lastFocus.focus) try { lastFocus.focus(); } catch (e) {}
  }
  function onKey(e) {
    var s = D.getElementById('svsInstallSheet');
    if (!s) return;
    if (e.key === 'Escape') { closeSheet(); return; }
    if (e.key !== 'Tab') return;
    var f = s.querySelectorAll('button, a[href]');
    if (!f.length) return;
    var first = f[0], last = f[f.length - 1];
    if (e.shiftKey && D.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && D.activeElement === last) { e.preventDefault(); first.focus(); }
  }
  function openSheet(mode) {
    if (D.getElementById('svsInstallSheet')) return;
    removePopup();
    lastFocus = D.activeElement;
    var ios = mode === 'ios' || mode === 'ios-other';
    var list = steps(mode);
    var s = D.createElement('div');
    s.id = 'svsInstallSheet';
    s.className = 'svs-sheet';
    s.setAttribute('data-mode', mode);
    s.innerHTML =
      '<div class="svs-sheet-backdrop" data-act="close"></div>' +
      '<div class="svs-sheet-card" role="dialog" aria-modal="true" aria-labelledby="svsSheetTitle">' +
        '<button type="button" class="svs-sheet-x" data-act="close" aria-label="' + esc(t('pwa_sheet_close', 'Close')) + '">' + IC.close + '</button>' +
        '<div class="svs-sheet-head">' +
          '<img class="svs-pop-icon" src="/images/app/icon-192.png" alt="" width="48" height="48" />' +
          '<div><h2 class="svs-sheet-title" id="svsSheetTitle">' + esc(t(ios ? 'pwa_sheet_title_ios' : 'pwa_sheet_title_android', ios ? 'Install on iPhone or iPad' : 'Install on Android')) + '</h2>' +
          '<p class="svs-sheet-lead">' + esc(t('pwa_sheet_lead', 'Three steps, and Soul Vibe Space sits on your home screen like any other app.')) + '</p></div>' +
        '</div>' +
        '<ol class="svs-steps">' + list.map(function (txt, i) {
          var extra = (mode === 'ios-other' && i === 0)
            ? '<button type="button" class="svs-copy" data-act="copy">' + IC.copy + '<span>' + esc(t('pwa_copy_link', 'Copy link')) + '</span></button>'
            : '';
          var lead = (mode === 'ios-other' && i === 0) ? '<span class="svs-step-ic">' + IC.safari + '</span>' : '';
          return '<li class="svs-step"><span class="svs-step-n">' + (i + 1) + '</span><div class="svs-step-body"><p>' + lead + fill(txt) + '</p>' + extra + '</div></li>';
        }).join('') + '</ol>' +
        '<button type="button" class="svs-sheet-done" data-act="close">' + esc(t('pwa_sheet_done', 'Got it')) + '</button>' +
      '</div>';
    s.addEventListener('click', function (e) {
      var b = e.target.closest && e.target.closest('[data-act]');
      if (!b) return;
      var a = b.getAttribute('data-act');
      if (a === 'close') closeSheet();
      else if (a === 'copy') copyLink(b);
    });
    D.body.appendChild(s);
    D.documentElement.classList.add('svs-sheet-open');
    D.addEventListener('keydown', onKey);
    requestAnimationFrame(function () { requestAnimationFrame(function () { s.classList.add('is-in'); var x = s.querySelector('.svs-sheet-done'); if (x) x.focus({ preventScroll: true }); }); });
  }

  // ── 3c. Подсказка в кабинете (/account): та же кнопка и та же инструкция, всплывашки там нет ──
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
  function renderHint() {
    if (path() !== '/account' || standalone() || installed() || closedRecently() || !isMobile()) return;
    var place = hintPlace();
    if (!place) return;
    var mode = installMode();
    var box = D.getElementById('svsInstallHint');
    if (box && box.offsetParent === null) { box.remove(); box = null; } // гость вошёл — переносим в кабинет
    if (!box) {
      box = D.createElement('aside');
      box.id = 'svsInstallHint';
      box.className = 'svs-ih';
      place.parent.insertBefore(box, place.before);
      box.onclick = function (e) {
        var b = e.target.closest && e.target.closest('[data-act]');
        if (!b) return;
        if (b.getAttribute('data-act') === 'close') { snooze(); removeHint(); return; }
        act('hint');
      };
    }
    removePopup();
    box.setAttribute('data-mode', mode);
    box.innerHTML =
      '<img class="svs-ih-icon" src="/images/app/icon-192.png" alt="" width="40" height="40" />' +
      '<div class="svs-ih-body">' +
        '<p class="svs-ih-title">' + esc(t('pwa_install_title', 'Install the Soul Vibe Space app')) + '</p>' +
        '<p class="svs-ih-text">' + esc(t('pwa_pop_text', 'Schedule, bookings and VIBES, one tap from your home screen.')) + '</p>' +
        '<button type="button" class="svs-ih-btn" data-act="go">' + esc(ctaLabel(mode)) + '</button>' +
      '</div>' +
      '<button type="button" class="svs-ih-close" data-act="close" aria-label="' + esc(t('pwa_install_close', 'Not now')) + '">' + IC.close + '</button>';
  }

  // ── 3d. Ссылка «Установить приложение»: мобильное меню и подвал ──
  function removeLinks() { Array.prototype.forEach.call(D.querySelectorAll('.svs-install-link'), function (a) { a.remove(); }); }
  function mountLinks() {
    if (standalone() || installed()) return;
    var label = t('pwa_footer_link', 'Install the app');
    var nav = D.getElementById('mobileNav');
    if (nav && !nav.querySelector('.svs-install-link')) {
      var a = D.createElement('a');
      a.href = '#install-app'; a.className = 'mobile-nav-install svs-install-link'; a.textContent = label;
      var soc = nav.querySelector('.mobile-nav-social');
      nav.insertBefore(a, soc ? soc.nextSibling : null);
      a.addEventListener('click', function (e) {
        e.preventDefault();
        nav.classList.remove('is-open'); nav.setAttribute('aria-hidden', 'true');
        var btn = D.getElementById('mobileMenuBtn'); if (btn) btn.setAttribute('aria-expanded', 'false');
        act('link');
      });
    }
    var fnav = D.querySelector('.footer-links nav');
    if (fnav && !fnav.querySelector('.svs-install-link')) {
      var f = D.createElement('a');
      f.href = '#install-app'; f.className = 'svs-install-link'; f.textContent = label;
      fnav.appendChild(f);
      f.addEventListener('click', function (e) { e.preventDefault(); act('link'); });
    }
  }
  function relabel() {
    Array.prototype.forEach.call(D.querySelectorAll('.svs-install-link'), function (a) { a.textContent = t('pwa_footer_link', 'Install the app'); });
    var p = D.getElementById('svsInstallPop'); if (p) renderPopup(p);
    if (D.getElementById('svsInstallHint')) renderHint();
    var s = D.getElementById('svsInstallSheet');
    if (s) { var m = s.getAttribute('data-mode'); s.remove(); D.documentElement.classList.remove('svs-sheet-open'); openSheet(m); }
  }
  // Режим поменялся (пришёл beforeinstallprompt) — обновляем подписи кнопок.
  function refresh() {
    var p = D.getElementById('svsInstallPop'); if (p) renderPopup(p);
    if (D.getElementById('svsInstallHint')) renderHint();
  }

  // ── 4. WhatsApp: «Связаться с администратором» ──────────────────────────────
  // Круглая кнопка справа внизу; на телефоне — над нижним меню. Прячется, пока открыто
  // окно (запись, вход, инструкция установки), мобильное меню или плашка cookie.
  var WA_NUMBER = '35795642888';
  var WA_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" d="M20.5 11.75a8.5 8.5 0 0 1-12.4 7.55L3.5 20.5l1.25-4.4A8.5 8.5 0 1 1 20.5 11.75z"/>' +
    '<path fill="currentColor" d="M9.1 7.9c.2-.35.45-.4.75-.4h.5c.2 0 .4.1.5.35l.75 1.75c.1.25.05.5-.1.65l-.6.65c-.15.15-.15.35-.05.5.65 1.1 1.55 2 2.65 2.6.15.1.35.1.5-.05l.65-.6c.15-.15.4-.2.65-.1l1.7.75c.25.1.35.3.35.5v.5c0 .3-.05.55-.4.75-.55.3-1.25.45-1.95.35-3-.45-5.7-3.15-6.1-6.15-.1-.7.05-1.4.35-1.95z"/></svg>';
  function waAllowed() { return !/^\/(auth-callback|admin)(\/|$)/.test(path()); }
  function waHref() { return 'https://wa.me/' + WA_NUMBER + '?text=' + encodeURIComponent(t('wa_text', 'Hello! I am writing from the Soul Vibe Space website and have a question.')); }
  // Что-то открыто поверх страницы — кнопку убираем.
  function waBlocked() {
    var nav = D.getElementById('mobileNav');
    return !!((nav && nav.classList.contains('is-open')) ||
      D.documentElement.classList.contains('svs-sheet-open') ||
      D.getElementById('svsInstallPop') || D.getElementById('svsInstallSheet') ||
      (D.body && D.body.style && D.body.style.overflow === 'hidden') ||
      cookieBannerVisible());
  }
  function waPaint(a) {
    a.href = waHref();
    var label = t('wa_aria', 'Chat with us on WhatsApp');
    a.setAttribute('aria-label', label);
    a.setAttribute('title', label);
    var tip = a.querySelector('.svs-wa-tip'); if (tip) tip.textContent = t('wa_tip', 'Chat with us');
  }
  function waSync() {
    var a = D.getElementById('svsWa'); if (!a) return;
    var hide = waBlocked();
    a.classList.toggle('is-hidden', hide);
    if (hide) a.setAttribute('tabindex', '-1'); else a.removeAttribute('tabindex');
  }
  function mountWa() {
    if (!waAllowed() || D.getElementById('svsWa') || !D.body) return;
    var a = D.createElement('a');
    a.id = 'svsWa'; a.className = 'svs-wa'; a.target = '_blank'; a.rel = 'noopener';
    a.innerHTML = WA_ICON + '<span class="svs-wa-tip" aria-hidden="true"></span>';
    waPaint(a);
    D.body.appendChild(a);
    waSync();
    if (W.MutationObserver) {
      var mo = new MutationObserver(waSync);
      mo.observe(D.body, { childList: true, attributes: true, attributeFilter: ['style', 'class'] });
      mo.observe(D.documentElement, { attributes: true, attributeFilter: ['class'] });
      var nav = D.getElementById('mobileNav');
      if (nav) mo.observe(nav, { attributes: true, attributeFilter: ['class'] });
    }
    W.addEventListener('svs:consent', function () { waSync(); if (W.requestAnimationFrame) W.requestAnimationFrame(waSync); });
    W.addEventListener('svs:langchange', function () { waPaint(a); });
  }

  // Любая кнопка с data-svs-install (например, в «Частых вопросах» на /contact) открывает установку.
  function bindInstallButtons() {
    D.addEventListener('click', function (e) {
      var b = e.target && e.target.closest && e.target.closest('[data-svs-install]');
      if (!b) return;
      e.preventDefault();
      act('link');
    });
  }

  function init() {
    mountTabs();
    mountWa();
    bindInstallButtons();
    if (standalone()) { scrollToHash(); return; }
    mountLinks();
    W.addEventListener('svs:langchange', relabel);
    if (path() === '/account') {
      // Кабинет или форма входа появляются после проверки сессии — пробуем несколько раз.
      var n = 0;
      (function wait() { renderHint(); if (!D.getElementById('svsInstallHint') && ++n < 20) setTimeout(wait, 300); })();
    }
    schedulePopup(POP_DELAY);
  }

  if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', init); else init();

  // Для тестов (node tests/pwa.test.js)
  W.SVS_PWA = { standalone: standalone, activeTab: activeTab, tabsAllowed: tabsAllowed, tabs: TABS, waAllowed: waAllowed, waHref: waHref, waBlocked: waBlocked, isIOS: isIOS, isIOSSafari: isIOSSafari, installMode: installMode,
    popupAllowed: popupAllowed, cookieBannerVisible: cookieBannerVisible, openSheet: openSheet, showPopup: showPopup, steps: steps,
    install: function () { act('link'); } };
})();
