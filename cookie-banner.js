/**
 * Soul Vibe Space — GDPR Cookie Banner
 * Lightweight, no dependencies, EN/RU/EL, localStorage
 */
(function () {
  'use strict';
  var STORE_KEY = 'svs_cookie_consent';
  var LANG_KEY  = 'svs_lang';

  if (localStorage.getItem(STORE_KEY)) return; // already accepted/rejected

  var T = {
    en: {
      text: 'We use cookies to enable booking functionality and improve your experience.',
      accept: 'Accept all',
      reject: 'Reject optional',
      link: 'Learn more',
    },
    ru: {
      text: 'Мы используем cookie для работы бронирования и улучшения вашего опыта.',
      accept: 'Принять все',
      reject: 'Только обязательные',
      link: 'Подробнее',
    },
    el: {
      text: 'Χρησιμοποιούμε cookies για τη λειτουργία κρατήσεων και τη βελτίωση της εμπειρίας σας.',
      accept: 'Αποδοχή',
      reject: 'Μόνο απαραίτητα',
      link: 'Μάθετε περισσότερα',
    },
  };

  function getLang() {
    try { return (localStorage.getItem(LANG_KEY) || 'en').toLowerCase(); } catch(e) { return 'en'; }
  }

  function render() {
    var lang = getLang();
    var t = T[lang] || T.en;

    var banner = document.createElement('div');
    banner.id = 'svs-cookie-banner';
    banner.setAttribute('role', 'dialog');
    banner.setAttribute('aria-label', 'Cookie consent');
    banner.style.cssText = [
      'position:fixed', 'bottom:0', 'left:0', 'right:0', 'z-index:99999',
      'background:var(--surface, #1a1a2e)', 'color:var(--text, #f0f0f0)',
      'border-top:1px solid var(--border, rgba(255,255,255,.1))',
      'padding:16px 24px', 'display:flex', 'align-items:center',
      'gap:16px', 'flex-wrap:wrap',
      'font-family:inherit', 'font-size:14px', 'line-height:1.5',
      'box-shadow:0 -4px 24px rgba(0,0,0,.3)',
    ].join(';');

    var msg = document.createElement('p');
    msg.style.cssText = 'margin:0;flex:1;min-width:200px';
    msg.innerHTML = t.text + ' <a href="/contact.html" style="color:var(--accent,#9b7ab8);text-decoration:underline">' + t.link + '</a>.';

    var btnWrap = document.createElement('div');
    btnWrap.style.cssText = 'display:flex;gap:8px;flex-shrink:0';

    var btnAccept = document.createElement('button');
    btnAccept.textContent = t.accept;
    btnAccept.style.cssText = [
      'background:var(--accent,#6b4fa0)', 'color:#fff', 'border:none',
      'padding:8px 16px', 'border-radius:6px', 'cursor:pointer',
      'font-size:13px', 'font-weight:600', 'white-space:nowrap',
    ].join(';');

    var btnReject = document.createElement('button');
    btnReject.textContent = t.reject;
    btnReject.style.cssText = [
      'background:transparent', 'color:var(--text-secondary,#aaa)',
      'border:1px solid var(--border,rgba(255,255,255,.15))',
      'padding:8px 16px', 'border-radius:6px', 'cursor:pointer',
      'font-size:13px', 'white-space:nowrap',
    ].join(';');

    function dismiss(value) {
      try { localStorage.setItem(STORE_KEY, value); } catch(e) {}
      document.body.removeChild(banner);
    }

    btnAccept.addEventListener('click', function () { dismiss('all'); });
    btnReject.addEventListener('click', function () { dismiss('essential'); });

    btnWrap.appendChild(btnReject);
    btnWrap.appendChild(btnAccept);
    banner.appendChild(msg);
    banner.appendChild(btnWrap);
    document.body.appendChild(banner);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', render);
  } else {
    render();
  }
})();
