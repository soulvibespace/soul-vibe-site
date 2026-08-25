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

  global.SvsFilter = { filterVisibleServices: filterVisibleServices };
})(window);
