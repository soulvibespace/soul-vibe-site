/* Soul Vibe Space — service worker приложения (PWA, #104).
 *
 * Правила (намеренно простые и безопасные):
 *  - Работаем только с GET-запросами своего сайта. Чужие адреса (API на Render, Stripe,
 *    Google, шрифты, аналитика) не трогаем вообще — браузер обрабатывает их сам.
 *  - /api/…, /admin/…, страницы оплаты и входа (/payment, /auth-callback) — никогда не кэшируем
 *    и не перехватываем.
 *  - HTML (переходы между страницами) — всегда из сети, в кэш не кладём. Без сети —
 *    офлайн-заглушка /app/offline.html (RU/EN/EL).
 *  - Статика: файлы с версией ?v=<md5> (tools/assetver.py) и картинки неизменны → «сначала кэш».
 *    js/css без версии → «сначала сеть», кэш только если сети нет.
 *  - VERSION подставляет tools/pwa.py при сборке (хеш сайта): новая версия → старые кэши удаляются.
 */
'use strict';

var VERSION = '__SVS_SW_VERSION__';
var SHELL = 'svs-shell-' + VERSION;      // офлайн-заглушка и иконки, обновляется с каждой сборкой
var STATIC = 'svs-static-v1';            // неизменная статика (адреса с ?v= и картинки)
var OFFLINE_URL = '/app/offline.html';
var SHELL_FILES = [OFFLINE_URL, '/images/app/icon-192.png', '/images/logo-icon.png'];
var STATIC_LIMIT = 150;

// Пути, которые service worker пропускает мимо себя.
var BYPASS = /^\/(?:api|admin|\.netlify|netlify)(?:\/|$)|^\/(?:payment|auth-callback)(?:\.html)?\/?$|^\/sw\.js$/;
var IMMUTABLE_EXT = /\.(?:png|jpe?g|webp|avif|gif|svg|ico|woff2?)$/i;
var CODE_EXT = /\.(?:js|css)$/i;

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(SHELL)
      .then(function (c) { return c.addAll(SHELL_FILES.map(function (u) { return new Request(u, { cache: 'reload' }); })); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) {
        if (k.indexOf('svs-') === 0 && k !== SHELL && k !== STATIC) return caches.delete(k);
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

function cacheable(res) {
  return res && res.ok && res.status === 200 && res.type === 'basic' && !res.redirected;
}

function trim(cache) {
  return cache.keys().then(function (keys) {
    if (keys.length <= STATIC_LIMIT) return;
    return Promise.all(keys.slice(0, keys.length - STATIC_LIMIT).map(function (k) { return cache.delete(k); }));
  });
}

function put(req, res) {
  if (!cacheable(res)) return;
  var copy = res.clone();
  caches.open(STATIC).then(function (c) { return c.put(req, copy).then(function () { return trim(c); }); }).catch(function () {});
}

function cacheFirst(req) {
  return caches.match(req).then(function (hit) {
    if (hit) return hit;
    return fetch(req).then(function (res) { put(req, res); return res; });
  });
}

function networkFirst(req) {
  return fetch(req).then(function (res) { put(req, res); return res; })
    .catch(function () { return caches.match(req).then(function (hit) { return hit || Response.error(); }); });
}

function page(req) {
  return fetch(req).catch(function () {
    return caches.match(OFFLINE_URL).then(function (hit) {
      return hit || new Response('Offline', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
    });
  });
}

self.addEventListener('fetch', function (event) {
  var req = event.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (BYPASS.test(url.pathname)) return;
  if (req.headers.get('range')) return;

  if (req.mode === 'navigate') { event.respondWith(page(req)); return; }
  if (url.pathname === OFFLINE_URL) { event.respondWith(caches.match(req).then(function (h) { return h || fetch(req); })); return; }

  var versioned = /(?:^|&)v=[0-9a-f]{6,}/.test(url.search.slice(1));
  if (IMMUTABLE_EXT.test(url.pathname) || (versioned && CODE_EXT.test(url.pathname))) { event.respondWith(cacheFirst(req)); return; }
  if (CODE_EXT.test(url.pathname) || url.pathname === '/manifest.webmanifest') { event.respondWith(networkFirst(req)); return; }
  // Всё остальное (json-данные, txt, xml) — как обычно, без кэша.
});
