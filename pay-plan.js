/*
 * pay-plan.js — how a class will be paid, for display only (nothing is charged here).
 *
 * The studio debits VIBES at the visit (1 class = 20 VIBES, 1 € = 1 VIBE).
 * We estimate what the debit will look like:
 *   - lots = active Class Passes / Starter Packs / bonus VIBES from /api/me/vibes;
 *   - every future confirmed booking of the client takes 20 VIBES, in time order,
 *     from the lot that expires first (FIFO by expiry) among lots still valid on that date;
 *   - the class being booked is placed among them by its date/time.
 *
 * planPayment(...) returns one of the cases:
 *   'none'    — no usable lots at all (or never had a pass)  → pay at the studio €20
 *   'full'    — 20 VIBES are covered                         → paid with the pass
 *   'partial' — some VIBES are covered                       → pay the difference at the studio
 *   'used'    — VIBES exist but are already taken by other bookings
 *   'expired' — lots exist but none is valid on the class date
 *   'unknown' — VIBES could not be read (error / email not verified)
 *
 * Works in the browser (window.SVSPayPlan) and in Node (module.exports) for tests.
 */
(function (root) {
  'use strict';

  // 1 class = SVS_PRICES.class_vibes (i18n.js loads first); 20 is only a fallback for tests.
  var G = typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : {});
  var CLASS_VIBES = (G.SVS_PRICES && Number(G.SVS_PRICES.class_vibes)) || 20;
  var TZ = 'Asia/Nicosia';

  // Studio-local calendar date "YYYY-MM-DD" of an ISO timestamp or a plain date.
  function localDate(v) {
    if (!v) return null;
    var s = String(v);
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    var d = new Date(s);
    if (isNaN(d)) return s.slice(0, 10);
    try {
      return new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
    } catch (_) { return d.toISOString().slice(0, 10); }
  }

  // A lot is valid for a class on `date` if it does not expire before that day.
  function validOn(lot, date) {
    return !lot.expiry || lot.expiry >= date;
  }

  function slotKey(date, time) { return String(date) + 'T' + String(time || '00:00').slice(0, 5); }

  function isPassLot(l) { return l && (l.source_type === 'membership' || l.source_type === 'starter_pack'); }

  // Ever had a Class Pass or a Starter Pack (any status, or in the history).
  function hadPass(vibes) {
    if (!vibes || !vibes.linked) return false;
    if ((vibes.lots || []).some(isPassLot)) return true;
    return (vibes.transactions || []).some(function (t) { return t.category === 'membership' || t.category === 'starter_pack'; });
  }

  /**
   * @param vibes     response of /api/me/vibes (or null on error)
   * @param bookings  response list of /api/client/bookings (future ones are used)
   * @param cls       { date:'YYYY-MM-DD', time:'HH:MM[:SS]', service_id, booking_id? } — the class being booked
   * @param now       Date (optional, for tests)
   */
  function planPayment(vibes, bookings, cls, now) {
    var price = CLASS_VIBES;
    if (!vibes) return { kind: 'unknown', price: price };
    if (!vibes.linked) {
      return { kind: (vibes.reason === 'not_found' || vibes.reason === 'no_email') ? 'none' : 'unknown', price: price };
    }

    var lots = (vibes.lots || [])
      .filter(function (l) { return l.status === 'active' && Number(l.remaining_vibes) > 0; })
      .map(function (l) {
        return { src: l, left: Number(l.remaining_vibes), expiry: localDate(l.expires_at) };
      })
      .sort(function (a, b) {
        if (a.expiry === b.expiry) return 0;
        if (!a.expiry) return 1;
        if (!b.expiry) return -1;
        return a.expiry < b.expiry ? -1 : 1;
      });

    if (!lots.length) return { kind: 'none', price: price, hadPass: hadPass(vibes) };

    var nowKey = (function () {
      var n = now || new Date();
      var d = localDate(n.toISOString());
      var hm;
      try {
        hm = new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hourCycle: 'h23', hour: '2-digit', minute: '2-digit' }).format(n);
      } catch (_) { hm = n.toISOString().slice(11, 16); }
      return d + 'T' + hm;
    })();
    var target = slotKey(cls.date, cls.time);
    var sameAsTarget = function (b) {
      if (cls.booking_id && String(b.id) === String(cls.booking_id)) return true;
      return String(b.date) === String(cls.date) && String(b.time || '').slice(0, 5) === String(cls.time || '').slice(0, 5)
        && (!cls.service_id || String(b.service_id) === String(cls.service_id));
    };

    // Other future confirmed bookings + the class being booked, in time order.
    var queue = (bookings || [])
      .filter(function (b) { return b && b.status !== 'cancelled' && b.date && slotKey(b.date, b.time) >= nowKey && !sameAsTarget(b); })
      .map(function (b) { return { key: slotKey(b.date, b.time), date: String(b.date), target: false }; });
    var others = queue.length;
    queue.push({ key: target, date: String(cls.date), target: true });
    queue.sort(function (a, b) { return a.key < b.key ? -1 : a.key > b.key ? 1 : (a.target ? 1 : -1); });

    var result = null;
    queue.forEach(function (item) {
      var need = CLASS_VIBES, used = [];
      for (var i = 0; i < lots.length && need > 0; i++) {
        var l = lots[i];
        if (l.left <= 0 || !validOn(l, item.date)) continue;
        var take = Math.min(l.left, need);
        l.left -= take; need -= take;
        used.push({ lot: l, take: take });
      }
      if (item.target) result = { covered: CLASS_VIBES - need, used: used };
    });

    var valid = lots.filter(function (l) { return validOn(l, cls.date); });
    var leftAfter = valid.reduce(function (s, l) { return s + l.left; }, 0);
    var main = result.used.length ? result.used[0].lot : (valid[0] || lots[lots.length - 1]);
    var out = {
      price: price,
      covered: result.covered,
      due: CLASS_VIBES - result.covered,
      left: leftAfter,
      withBookings: others > 0,
      lot: main.src,
      expiry: main.expiry,
      hadPass: hadPass(vibes),
    };

    if (result.covered >= CLASS_VIBES) out.kind = 'full';
    else if (result.covered > 0) out.kind = 'partial';
    else if (!valid.length) {
      // Every lot ends before the class date: show the one that lasts longest.
      out.kind = 'expired';
      out.lot = lots[lots.length - 1].src;
      out.expiry = lots[lots.length - 1].expiry;
    } else out.kind = 'used';
    return out;
  }

  var api = { planPayment: planPayment, hadPass: hadPass, localDate: localDate, CLASS_VIBES: CLASS_VIBES };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.SVSPayPlan = api;
})(typeof window !== 'undefined' ? window : this);
