// "My review" block in the /account dashboard.
// One review per client, allowed after the first attended class; every
// create/edit goes to moderation (see soul-vibe-api README → «Отзывы клиентов»).
// Depends on account.js globals: API_BASE, getToken, t, escHtml.
(function () {
  var MIN = 10, MAX = 2000;
  var state = { loaded: false, eligible: false, review: null, editing: false, rating: 0, sending: false, error: '' };

  var STAR = '<svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>';

  function tr(k, fb) { return (typeof t === 'function') ? t(k, fb) : fb; }
  function root() { return document.getElementById('reviewFormRoot'); }
  function lang() { return (window.SVS_I18N && SVS_I18N.getLang) ? SVS_I18N.getLang() : 'en'; }

  function publicName() {
    try {
      var p = JSON.parse(atob(getToken().split('.')[1]));
      var parts = String(p.name || '').trim().split(/\s+/).filter(Boolean);
      if (!parts.length) return '';
      return parts.length === 1 ? parts[0] : parts[0] + ' ' + parts[parts.length - 1][0].toUpperCase() + '.';
    } catch (e) { return ''; }
  }

  async function call(path, opts) {
    var res = await fetch(API_BASE + path, Object.assign({}, opts, {
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + getToken() }
    }));
    var data = {};
    try { data = await res.json(); } catch (e) {}
    if (!res.ok) { var err = new Error(data.error || 'request_failed'); err.status = res.status; throw err; }
    return data;
  }

  function starsInput(value) {
    var html = '<div class="rvf-stars" role="radiogroup" aria-label="' + escHtml(tr('rvf_rating_label', 'Your rating')) + '">';
    for (var i = 1; i <= 5; i++) {
      html += '<button type="button" class="rvf-star' + (i <= value ? ' on' : '') + '" role="radio" aria-checked="' + (i === value) +
        '" aria-label="' + i + '/5" data-star="' + i + '">' + STAR + '</button>';
    }
    return html + '</div>';
  }

  function starsStatic(value) {
    var html = '<div class="rvf-stars rvf-stars-static" aria-label="' + value + '/5">';
    for (var i = 1; i <= 5; i++) html += '<span class="rvf-star' + (i <= value ? ' on' : '') + '">' + STAR + '</span>';
    return html + '</div>';
  }

  function render() {
    var el = root();
    if (!el) return;
    var h = '<p class="dash-section-title" style="margin-bottom:.75rem">' + escHtml(tr('rvf_title', 'My Review')) + '</p><div class="rvf-card">';

    if (!state.loaded) {
      h += '<p class="rvf-muted">' + escHtml(state.error || tr('rvf_loading', 'Loading…')) + '</p>';
    } else if (!state.eligible) {
      h += '<p class="rvf-muted">' + escHtml(tr('rvf_not_eligible', 'You can leave a review after your first class.')) + '</p>';
    } else if (state.review && !state.editing) {
      var r = state.review;
      var cls = r.status === 'approved' ? 'ok' : (r.status === 'rejected' ? 'bad' : 'wait');
      var msg = r.status === 'approved' ? tr('rvf_status_approved', 'Your review is published. Thank you!')
              : r.status === 'rejected' ? tr('rvf_status_rejected', 'Your review was not published.')
              : tr('rvf_status_pending', 'Your review is being moderated.');
      h += '<div class="rvf-status rvf-status-' + cls + '">' + escHtml(msg) +
           (r.status === 'rejected' && r.moderation_note ? '<br><span class="rvf-note">' + escHtml(r.moderation_note) + '</span>' : '') + '</div>';
      h += starsStatic(r.rating) + '<p class="rvf-text">' + escHtml(r.text) + '</p>';
      h += '<button type="button" class="dash-filter-btn" data-act="edit">' + escHtml(tr('rvf_edit', 'Edit review')) + '</button>';
    } else {
      var isEdit = !!state.review;
      var text = isEdit ? state.review.text : '';
      h += '<p class="rvf-muted" style="margin-top:0">' + escHtml(isEdit ? tr('rvf_edit_note', 'After editing, the review goes through moderation again.') : tr('rvf_intro', 'How was your experience?')) + '</p>';
      h += '<form id="rvfForm" novalidate>';
      h += '<label class="acc-label">' + escHtml(tr('rvf_rating_label', 'Your rating')) + '</label>' + starsInput(state.rating);
      h += '<label class="acc-label" for="rvfText">' + escHtml(tr('rvf_text_label', 'Your review')) + '</label>';
      h += '<textarea class="acc-input rvf-textarea" id="rvfText" maxlength="' + MAX + '" rows="5" placeholder="' + escHtml(tr('rvf_text_ph', '')) + '">' + escHtml(text) + '</textarea>';
      h += '<div class="rvf-meta"><span>' + escHtml(tr('rvf_published_name', 'Shown on the site as')) + ': <b>' + escHtml(publicName()) + '</b></span><span id="rvfCount">0/' + MAX + '</span></div>';
      if (state.error) h += '<div class="acc-msg-error" style="display:block;margin-top:.75rem">' + escHtml(state.error) + '</div>';
      h += '<div class="rvf-actions"><button type="submit" class="acc-btn-submit" id="rvfSubmit"' + (state.sending ? ' disabled' : '') + '>' +
           (state.sending ? '<span class="acc-spinner"></span>' : escHtml(isEdit ? tr('rvf_update', 'Save changes') : tr('rvf_submit', 'Send for moderation'))) + '</button>';
      if (isEdit) h += '<button type="button" class="dash-filter-btn" data-act="cancel">' + escHtml(tr('rvf_cancel', 'Cancel')) + '</button>';
      h += '</div></form>';
    }
    h += '</div>';

    // Preserve typed text across re-renders (star clicks, language switch).
    var prev = document.getElementById('rvfText');
    var prevVal = prev ? prev.value : null;
    el.innerHTML = h;
    var ta = document.getElementById('rvfText');
    if (ta && prevVal !== null) ta.value = prevVal;
    updateCount();
  }

  function updateCount() {
    var ta = document.getElementById('rvfText'), c = document.getElementById('rvfCount');
    if (ta && c) c.textContent = ta.value.trim().length + '/' + MAX;
  }

  async function submit() {
    var ta = document.getElementById('rvfText');
    var text = ta ? ta.value.trim() : '';
    if (state.rating < 1) { state.error = tr('rvf_err_rating', 'Please choose a rating.'); return render(); }
    if (text.length < MIN) { state.error = tr('rvf_err_text', 'Please write at least 10 characters.'); return render(); }
    state.error = ''; state.sending = true; render();
    try {
      var d = await call('/api/reviews', { method: 'POST', body: JSON.stringify({ rating: state.rating, text: text, lang: lang() }) });
      state.review = d.review; state.editing = false;
      if (window.svsTrack) window.svsTrack('review_submitted', { rating: state.rating });
    } catch (e) {
      state.error = e.message === 'no_past_class' ? tr('rvf_not_eligible', '') : tr('rvf_err_generic', 'Could not send your review.');
    }
    state.sending = false; render();
  }

  function bind() {
    var el = root();
    if (!el || el._rvfBound) return;
    el._rvfBound = true;
    el.addEventListener('click', function (e) {
      var star = e.target.closest('[data-star]');
      if (star && !star.closest('.rvf-stars-static')) { state.rating = Number(star.getAttribute('data-star')); state.error = ''; return render(); }
      var act = e.target.closest('[data-act]');
      if (!act) return;
      if (act.getAttribute('data-act') === 'edit') { state.editing = true; state.rating = state.review.rating; state.error = ''; render(); }
      if (act.getAttribute('data-act') === 'cancel') { state.editing = false; state.error = ''; render(); }
    });
    el.addEventListener('submit', function (e) { e.preventDefault(); submit(); });
    el.addEventListener('input', function (e) { if (e.target.id === 'rvfText') updateCount(); });
  }

  async function load() {
    bind();
    state = { loaded: false, eligible: false, review: null, editing: false, rating: 0, sending: false, error: '' };
    render();
    try {
      var d = await call('/api/reviews/mine', { method: 'GET' });
      state.eligible = !!d.eligible; state.review = d.review || null;
      state.loaded = true;
    } catch (e) {
      state.error = tr('rvf_err_load', 'Could not load your review status.');
    }
    render();
    if (location.hash === '#review' && root()) root().scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  window.SVS_REVIEW_FORM = { load: load };
  // account.js may have shown the dashboard before this file loaded.
  var dash = document.getElementById('accDashboard');
  if (dash && dash.classList.contains('visible') && typeof getToken === 'function' && getToken()) load();
  window.addEventListener('svs:langchange', render);
})();
