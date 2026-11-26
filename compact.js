/**
 * Soul Vibe Space — compact mobile helpers (#79, step 2)
 * 1) Snap ribbons: dots indicator under horizontally scrolling card rows
 *    (the ribbon itself is pure CSS in compact.css).
 * 2) Clamp: long texts collapse to N lines with a “Read more” toggle.
 * Works with content rendered later by other scripts (MutationObserver).
 * No dependencies; does nothing on desktop.
 */
(function () {
  'use strict';

  var MQ = window.matchMedia('(max-width: 768px)');

  /* Must match the ribbon selectors in compact.css */
  var RIBBONS = ['#classes-grid', '.pass-grid', '.vp-bonus-grid', '.room-grid', '.setup-grid',
                 '.rental-gallery', '.values-grid', '.space-gallery', '.team-grid'];

  /* [selector, lines] */
  var CLAMPS = [
    ['.rv-card-text', 4],
    ['#classes-grid .service-card-desc:not([data-short])', 3],
    ['.class-card-desc:not([data-short])', 3],
    ['.intro-text .body-text ~ .body-text', 2],
    ['.dropin-desc:not(#pvPersonalDesc)', 3],
    ['.room-desc', 3],
    ['.setup-desc', 3],
    ['.events-note p', 3]
  ];

  /* [list selector, items visible when collapsed] */
  var LISTS = [
    ['.check-list', 6],
    ['.addon-col ul', 4]
  ];

  var LBL = {
    en: ['Read more', 'Show less'],
    ru: ['Подробнее', 'Свернуть'],
    el: ['Περισσότερα', 'Λιγότερα']
  };
  function lang() {
    var l = '';
    try { l = localStorage.getItem('svs_lang') || ''; } catch (e) {}
    l = (l || document.documentElement.lang || 'en').slice(0, 2).toLowerCase();
    return LBL[l] ? l : 'en';
  }
  function label(open) { return LBL[lang()][open ? 1 : 0]; }

  /* ── Ribbons ─────────────────────────────────────────────────── */
  function cards(row) {
    return Array.prototype.filter.call(row.children, function (c) {
      return c.nodeType === 1 && c.offsetParent !== null && c.tagName !== 'STYLE';
    });
  }

  function setupRibbon(row) {
    var dots = row._svsDots;
    if (!dots) {
      dots = document.createElement('div');
      dots.className = 'snap-dots';
      dots.setAttribute('aria-hidden', 'true');
      row.parentNode.insertBefore(dots, row.nextSibling);
      row._svsDots = dots;
      row.addEventListener('scroll', function () { update(row); }, { passive: true });
    }
    render(row);
  }

  function render(row) {
    var dots = row._svsDots; if (!dots) return;
    var list = cards(row);
    var scrollable = MQ.matches && row.scrollWidth > row.clientWidth + 4 && list.length > 1;
    dots.hidden = !scrollable;
    if (!scrollable) { dots.innerHTML = ''; dots._n = 0; return; }
    if (dots._n !== list.length) {
      dots.innerHTML = '';
      list.forEach(function (card) {
        var b = document.createElement('button');
        b.type = 'button';
        b.tabIndex = -1;
        b.addEventListener('click', function () {
          var l = cards(row);
          row.scrollTo({ left: card.offsetLeft - (l[0] ? l[0].offsetLeft : 0), behavior: 'smooth' });
        });
        dots.appendChild(b);
      });
      dots._n = list.length;
    }
    update(row);
  }

  function update(row) {
    var dots = row._svsDots; if (!dots || !dots._n) return;
    var list = cards(row); if (!list.length) return;
    var x = row.scrollLeft, first = list[0].offsetLeft, idx = 0, best = Infinity;
    if (x + row.clientWidth >= row.scrollWidth - 4) idx = list.length - 1;
    else list.forEach(function (c, i) {
      var d = Math.abs(c.offsetLeft - first - x);
      if (d < best) { best = d; idx = i; }
    });
    Array.prototype.forEach.call(dots.children, function (b, i) {
      b.classList.toggle('is-active', i === idx);
    });
  }

  /* ── Clamp ───────────────────────────────────────────────────── */
  function setupClamp(el, lines) {
    if (el._svsClamp) { measure(el); return; }
    el._svsClamp = true;
    el.classList.add('js-clamp');
    el.style.setProperty('--clamp-lines', lines);
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'clamp-toggle';
    btn.setAttribute('aria-expanded', 'false');
    btn.textContent = label(false);
    btn.addEventListener('click', function (e) {
      e.preventDefault(); e.stopPropagation();
      var open = el.classList.toggle('is-open');
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      btn.textContent = label(open);
    });
    el.parentNode.insertBefore(btn, el.nextSibling);
    el._svsBtn = btn;
    measure(el);
  }

  function measure(el) {
    var btn = el._svsBtn; if (!btn) return;
    if (!MQ.matches) { btn.hidden = true; return; }
    if (el.classList.contains('is-open')) { btn.hidden = false; return; }
    btn.hidden = !(el.scrollHeight > el.clientHeight + 2);
  }

  /* ── Long lists: show first N items ─────────────────────────── */
  function setupList(ul, n) {
    var items = Array.prototype.filter.call(ul.children, function (c) { return c.tagName === 'LI'; });
    if (ul._svsList || items.length <= n + 1) return;
    ul._svsList = true;
    ul.classList.add('js-list-clamp');
    items.forEach(function (li, i) { if (i >= n) li.classList.add('js-list-extra'); });
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'clamp-toggle';
    btn.setAttribute('aria-expanded', 'false');
    btn.textContent = label(false) + ' (+' + (items.length - n) + ')';
    btn._svsExtra = items.length - n;
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      var open = ul.classList.toggle('is-open');
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      btn.textContent = open ? label(true) : label(false) + ' (+' + btn._svsExtra + ')';
    });
    ul.parentNode.insertBefore(btn, ul.nextSibling);
  }

  /* ── Scan ────────────────────────────────────────────────────── */
  var pending = false;
  function scan() {
    pending = false;
    RIBBONS.forEach(function (sel) {
      Array.prototype.forEach.call(document.querySelectorAll(sel), setupRibbon);
    });
    LISTS.forEach(function (pair) {
      Array.prototype.forEach.call(document.querySelectorAll(pair[0]), function (ul) { setupList(ul, pair[1]); });
    });
    CLAMPS.forEach(function (pair) {
      Array.prototype.forEach.call(document.querySelectorAll(pair[0]), function (el) {
        if (el.closest('.clamp-toggle')) return;
        setupClamp(el, pair[1]);
      });
    });
  }
  function schedule() {
    if (pending) return;
    pending = true;
    (window.requestAnimationFrame || setTimeout)(scan);
  }

  function relabel() {
    Array.prototype.forEach.call(document.querySelectorAll('.clamp-toggle'), function (b) {
      var open = b.getAttribute('aria-expanded') === 'true';
      b.textContent = label(open) + (!open && b._svsExtra ? ' (+' + b._svsExtra + ')' : '');
    });
  }

  function init() {
    scan();
    new MutationObserver(function (muts) {
      for (var i = 0; i < muts.length; i++) {
        var t = muts[i].target;
        if (t && t.classList && (t.classList.contains('snap-dots') || t.classList.contains('clamp-toggle'))) continue;
        schedule(); return;
      }
    }).observe(document.body, { childList: true, subtree: true });
    window.addEventListener('resize', schedule, { passive: true });
    if (MQ.addEventListener) MQ.addEventListener('change', schedule);
    window.addEventListener('svs:langchange', function () { relabel(); schedule(); });
    window.addEventListener('load', schedule);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
