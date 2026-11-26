/**
 * services-filter.js — client-side visibility filter
 * Uses our own backend proxy to avoid CORS issues with Simplybook.
 * Cache 5 min in memory.
 */
(function (global) {
  'use strict';

  var API_BASE_FILTER = window.SVS_API_BASE || 'https://soul-vibe-api.onrender.com';
  var _catCache = null;
  var _catCacheTime = 0;
  var CAT_TTL = 5 * 60 * 1000;

  async function getVisibleCategoryIds() {
    var now = Date.now();
    if (_catCache && (now - _catCacheTime) < CAT_TTL) return _catCache;
    try {
      var resp = await fetch(API_BASE_FILTER + '/api/visible-category-ids');
      if (!resp.ok) throw new Error('status ' + resp.status);
      var data = await resp.json();
      if (!data.ids) return null; // null = show all (fallback)
      var ids = new Set(data.ids.map(function(id) { return String(id); }));
      _catCache = ids;
      _catCacheTime = now;
      return ids;
    } catch (e) {
      console.warn('[services-filter] fallback (show all):', e.message);
      return null;
    }
  }

  async function filterVisibleServices(services) {
    var visibleIds = await getVisibleCategoryIds();
    if (!visibleIds) return services;
    return services.filter(function(s) {
      var cats = Array.isArray(s.category_ids) ? s.category_ids : [];
      if (cats.length === 0) return true;
      return cats.some(function(c) { return visibleIds.has(String(c)); });
    });
  }


  // ── Группы классов и порядок ─────────────────────────────────────────────
  // Группа нужна только для пилюль-фильтров. Берём поле group из API
  // (/api/booking/services — по имени категории SimplyBook); если его нет —
  // классифицируем здесь по category_names / имени услуги теми же словами.
  // Класс НИКОГДА не скрывается из-за неизвестной категории: идёт в «Другое».
  var API_GROUP = { Yoga: 'yoga', Spiritual: 'spirit', Dance: 'dance', Events: 'events', Other: 'other', Coworking: 'coworking', YogaDay: 'yogaday' };
  var GROUP_ORDER = ['yoga', 'spirit', 'dance', 'events', 'yogaday', 'other'];
  var GROUP_LABELS = {
    yoga:    { en: 'Yoga', ru: 'Йога', el: 'Γιόγκα' },
    spirit:  { en: 'Spiritual & Healing', ru: 'Духовные практики', el: 'Πνευματικές Πρακτικές' },
    dance:   { en: 'Dance & Movement', ru: 'Танец и движение', el: 'Χορός & Κίνηση' },
    events:  { en: 'Events', ru: 'События', el: 'Εκδηλώσεις' },
    yogaday: { en: 'Yoga Day (13.12)', ru: 'Yoga Day (13.12)', el: 'Yoga Day (13.12)' },
    other:   { en: 'Other', ru: 'Другое', el: 'Άλλα' }
  };

  function isYogaDayCategory(names) {
    if (!Array.isArray(names)) return false;
    for (var i = 0; i < names.length; i++) {
      if (/open\s*house|yoga\s*day/i.test(String(names[i] || ''))) return true;
    }
    return false;
  }

  function classifyName(name) {
    var n = String(name || '').toLowerCase();
    if (/coworking|коворкинг|hot\s*desk|day\s*pass/.test(n)) return 'coworking';
    if (/open\s*house|yoga\s*day/.test(n)) return 'yogaday';
    if (/\byoga\b|йог|γιόγκα/.test(n)) return 'yoga';
    if (/dance|hip[-\s]?hop|choreo|ecstatic|movement|танц|движение|χορός/.test(n)) return 'dance';
    if (/sound|healing|meditat|gong|reiki|breath|qigong|chi\s?kung|цигун|звук|целит|медит|дыхан|θεραπεία|διαλογ/.test(n)) return 'spirit';
    if (/kundalini|hatha|vinyasa|aerial|hammock|гамак|spine|therapy|flow|mobility|asana|pranayama|асан/.test(n)) return 'yoga';
    if (/event|workshop|retreat|festival|lila|лила|game|игра|событи|воркшоп|ретрит|εκδήλωσ|σεμινάριο/.test(n)) return 'events';
    return 'other';
  }

  function groupOf(svc) {
    if (!svc) return 'other';
    var names = Array.isArray(svc.category_names) ? svc.category_names : [];
    if (isYogaDayCategory(names)) return 'yogaday';
    if (svc.group && API_GROUP[svc.group]) return API_GROUP[svc.group];
    for (var i = 0; i < names.length; i++) {
      var g = classifyName(names[i]);
      if (g !== 'other') return g;
    }
    return classifyName(svc.name);
  }

  // Порядок = как отдаёт API (порядок услуг SimplyBook). Старый API без поля
  // order сортировал по категориям — тогда сортируем сами: position, затем id.
  function orderServices(services, apiOrder) {
    var list = (services || []).slice();
    if (apiOrder) return list;
    function n(v, d) { var x = parseInt(v, 10); return isFinite(x) ? x : d; }
    return list.sort(function (a, b) {
      return (n(a.position, 9999) - n(b.position, 9999)) || (n(a.id, 0) - n(b.id, 0));
    });
  }

  function groupLabel(key, lang) {
    var l = GROUP_LABELS[key];
    return (l && (l[lang] || l.en)) || key;
  }

  global.SvsGroups = { groupOf: groupOf, classifyName: classifyName, orderServices: orderServices,
                       order: GROUP_ORDER, label: groupLabel };

  global.SvsFilter = { filterVisibleServices: filterVisibleServices };
})(window);
