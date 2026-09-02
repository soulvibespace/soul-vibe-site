// Homepage reviews preview: data-driven, editable via /admin (data/reviews.json)
(function () {
  let RV_DATA = null;
  const RV_STAR = '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>';

  function rvLang() {
    return (typeof SVS_I18N !== 'undefined' && SVS_I18N.getLang) ? SVS_I18N.getLang() : 'en';
  }
  function rvTr(field) {
    if (!field) return '';
    const l = rvLang();
    return field[l] || field.en || '';
  }
  function rvStars(n) {
    return Array.from({ length: 5 }).map(function (_, i) {
      return '<span style="opacity:' + (i < n ? 1 : .25) + '">' + RV_STAR + '</span>';
    }).join('');
  }
  function rvFormatDate(iso) {
    const d = new Date(iso + 'T00:00:00');
    const l = rvLang();
    const locale = l === 'ru' ? 'ru-RU' : (l === 'el' ? 'el-GR' : 'en-GB');
    return d.toLocaleDateString(locale, { year: 'numeric', month: 'short' });
  }

  function rvRender() {
    const track = document.getElementById('reviewsPreviewGrid');
    if (!RV_DATA || !track) return;
    const featured = RV_DATA.reviews.slice(0, 8);
    track.innerHTML = featured.map(function (r) {
      return [
        '<div class="reviews-preview-card">',
        '<div class="reviews-preview-stars">' + rvStars(r.rating) + '</div>',
        '<p class="reviews-preview-subject">' + rvTr(r.subject) + '</p>',
        '<p class="reviews-preview-text">' + rvTr(r.text) + '</p>',
        '<div class="reviews-preview-footer">',
        '<span class="reviews-preview-name">' + r.name + '</span>',
        '<span class="reviews-preview-date">' + rvFormatDate(r.date) + '</span>',
        '</div>',
        '</div>'
      ].join('');
    }).join('');
    rvInitCarousel(track);
  }

  // Horizontal scroll-snap carousel: arrow buttons step by one card width
  // (card + gap), and disable themselves at either end.
  function rvInitCarousel(track) {
    const wrap = track.closest('.reviews-preview-carousel');
    if (!wrap) return;
    const prevBtn = wrap.querySelector('.reviews-preview-arrow-prev');
    const nextBtn = wrap.querySelector('.reviews-preview-arrow-next');
    if (!prevBtn || !nextBtn) return;

    function step() {
      const card = track.querySelector('.reviews-preview-card');
      if (!card) return track.clientWidth;
      const gap = parseFloat(getComputedStyle(track).gap) || 0;
      return card.getBoundingClientRect().width + gap;
    }
    function updateArrows() {
      const max = track.scrollWidth - track.clientWidth - 2;
      prevBtn.disabled = track.scrollLeft <= 2;
      nextBtn.disabled = track.scrollLeft >= max;
    }
    prevBtn.onclick = function () { track.scrollBy({ left: -step(), behavior: 'smooth' }); };
    nextBtn.onclick = function () { track.scrollBy({ left: step(), behavior: 'smooth' }); };
    track.addEventListener('scroll', updateArrows, { passive: true });
    window.addEventListener('resize', updateArrows);
    updateArrows();
  }

  fetch('/data/reviews.json', { cache: 'no-store' })
    .then(function (r) { return r.json(); })
    .then(function (json) { RV_DATA = json; rvRender(); })
    .catch(function () {
      const track = document.getElementById('reviewsPreviewGrid');
      if (track) track.innerHTML = '';
    });

  window.addEventListener('svs:langchange', rvRender);
})();
