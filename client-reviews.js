// Approved client reviews from soul-vibe-api, merged with the curated
// data/reviews.json on /reviews and in the homepage preview.
// Client-submitted text is untrusted: always render it through SVS_CLIENT_REVIEWS.esc().
(function () {
  var API_BASE = window.SVS_API_BASE
    || (location.hostname === 'localhost' || location.hostname === '127.0.0.1'
        ? 'http://localhost:3001'
        : 'https://soul-vibe-api.onrender.com');

  var _promise = null;

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  // Normalise to the data/reviews.json shape: text becomes a string (shown in
  // the language it was written in), subject is empty, flagged client:true.
  function normalise(r) {
    return {
      name: r.name, rating: Math.max(1, Math.min(5, Number(r.rating) || 0)),
      date: r.date, text: r.text, subject: null, client: true
    };
  }

  // Never rejects: if the API is down, the curated reviews still render.
  function fetchApproved() {
    if (_promise) return _promise;
    var ctrl = ('AbortController' in window) ? new AbortController() : null;
    var timer = ctrl ? setTimeout(function () { ctrl.abort(); }, 8000) : null;
    _promise = fetch(API_BASE + '/api/reviews', ctrl ? { signal: ctrl.signal } : {})
      .then(function (r) { return r.ok ? r.json() : { reviews: [] }; })
      .then(function (d) { return (d.reviews || []).map(normalise); })
      .catch(function () { return []; })
      .then(function (list) { if (timer) clearTimeout(timer); return list; });
    return _promise;
  }

  // Combined rating across curated + client reviews.
  function combinedMeta(meta, clientList) {
    var baseCount = Number(meta.count) || 0;
    var baseAvg = Number(meta.avg_rating) || 0;
    var sum = baseAvg * baseCount;
    clientList.forEach(function (r) { sum += r.rating; });
    var count = baseCount + clientList.length;
    return { count: count, avg_rating: count ? sum / count : 0 };
  }

  window.SVS_CLIENT_REVIEWS = { fetchApproved: fetchApproved, combinedMeta: combinedMeta, esc: esc };
})();
