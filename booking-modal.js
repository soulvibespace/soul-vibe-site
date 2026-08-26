/**
 * Soul Vibe Space — Custom Booking Modal
 * Full booking flow: service → date/slot → confirm
 * No Simplybook widget dependency
 */

var API_BASE = window.SVS_API_BASE
  || (location.hostname === 'localhost' || location.hostname === '127.0.0.1'
      ? 'http://localhost:3001'
      : 'https://soul-vibe-api.onrender.com');

// ── BookingModal ───────────────────────────────────────────────────
const BookingModal = (() => {
  // How many months of availability to request in one go. SimplyBook classes
  // often run out of slots late in the current month, so a single-month window
  // made the calendar look completely empty. Always look ahead.
  const HORIZON_MONTHS = 3;
  // SimplyBook rejects long ranges outright ("Period too long", ~31 days max) and
  // starts timing out around 30 days, so the horizon is fetched as several short
  // chunks in parallel instead of one long request.
  const CHUNK_DAYS = 21;

  const MONTH_NAMES = {
    en: ['January','February','March','April','May','June','July','August','September','October','November','December'],
    ru: ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'],
    el: ['Ιανουάριος','Φεβρουάριος','Μάρτιος','Απρίλιος','Μάιος','Ιούνιος','Ιούλιος','Αύγουστος','Σεπτέμβριος','Οκτώβριος','Νοέμβριος','Δεκέμβριος']
  };
  const MONTH_NAMES_IN = {
    en: ['January','February','March','April','May','June','July','August','September','October','November','December'],
    ru: ['январе','феврале','марте','апреле','мае','июне','июле','августе','сентябре','октябре','ноябре','декабре'],
    el: ['Ιανουάριο','Φεβρουάριο','Μάρτιο','Απρίλιο','Μάιο','Ιούνιο','Ιούλιο','Αύγουστο','Σεπτέμβριο','Οκτώβριο','Νοέμβριο','Δεκέμβριο']
  };
  const DAY_NAMES = {
    en: ['Mo','Tu','We','Th','Fr','Sa','Su'],
    ru: ['Пн','Вт','Ср','Чт','Пт','Сб','Вс'],
    el: ['Δε','Τρ','Τε','Πε','Πα','Σα','Κυ']
  };

  // State
  let _services = null;
  let _selectedService = null;
  let _selectedDate = null;
  let _selectedSlot = null;
  let _slots = {};
  let _currentMonth = new Date();
  let _loading = false;
  // Availability-loading state
  let _slotsError = false;
  let _slotsLoading = false;
  let _loadedFrom = null;   // ISO date string of the currently cached window
  let _loadedTo = null;

  // DOM refs
  let _modal, _backdrop;

  function _el(id) { return document.getElementById(id); }

  function _lang() { return document.documentElement.lang || 'en'; }

  function _t(dict) {
    const l = _lang();
    return dict[l] || dict.en;
  }

  function _fmtISO(d) {
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }

  function _todayMidnight() {
    const t = new Date(); t.setHours(0,0,0,0); return t;
  }

  function _resetSlotState() {
    _slots = {};
    _slotsError = false;
    _slotsLoading = false;
    _loadedFrom = null;
    _loadedTo = null;
  }

  // All future dates (today onwards) that actually have slots, sorted ascending
  function _futureSlotDates() {
    const today = _todayMidnight();
    return Object.keys(_slots)
      .filter(k => _slots[k] && _slots[k].length > 0 && new Date(k + 'T00:00:00') >= today)
      .sort();
  }

  function _monthPrefix(date) {
    return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}`;
  }

  // Split [start, end] into consecutive chunks of at most CHUNK_DAYS days.
  function _splitRange(start, end) {
    const chunks = [];
    let cur = new Date(start);
    while (cur <= end) {
      const chunkEnd = new Date(cur);
      chunkEnd.setDate(chunkEnd.getDate() + CHUNK_DAYS - 1);
      if (chunkEnd > end) chunkEnd.setTime(end.getTime());
      chunks.push([_fmtISO(cur), _fmtISO(chunkEnd)]);
      cur = new Date(chunkEnd);
      cur.setDate(cur.getDate() + 1);
    }
    return chunks;
  }

  // ── Open / Close ──────────────────────────────────────────────
  async function open(serviceId = null, date = null, time = null) {
    _modal = _el('bookingModal');
    if (!_modal) return;

    // Reset state
    _selectedService = serviceId;
    _selectedDate = date || null;
    _selectedSlot = time || null;
    _currentMonth = date ? new Date(date + 'T00:00:00') : new Date();
    _resetSlotState();

    _modal.hidden = false;
    document.body.style.overflow = 'hidden';

    // Set up backdrop
    _backdrop = _el('bookingModalBackdrop');
    if (_backdrop) _backdrop.onclick = close;

    // Close button
    const closeBtn = _el('bookingModalClose');
    if (closeBtn) closeBtn.onclick = close;

    // ESC key
    document.addEventListener('keydown', _onEsc);

    // If all params provided — jump straight to confirm (or auth gate if not logged in)
    if (serviceId && date && time) {
      // Ensure services are loaded for name lookup
      if (!_services) {
        try {
          const token = _getToken();
          const res = await fetch(`${API_BASE}/api/booking/services`, {
            headers: token ? { 'Authorization': `Bearer ${token}` } : {}
          });
          const data = await res.json();
          _services = data.services || [];
        } catch(e) { _services = []; }
      }
      _selectedService = serviceId;

      // If not logged in — show auth gate immediately, no silent confirm step
      if (!_getToken()) {
        try {
          localStorage.setItem('svs_pending_booking', JSON.stringify({
            service_id: serviceId, date, time
          }));
        } catch(_) {}
        await _renderAuthGate();
        return;
      }

      await _renderStep('confirm');
      return;
    }

    // Load and render
    await _renderStep('services');
    if (serviceId) {
      await _selectService(serviceId);
    }
  }

  function close() {
    if (!_modal) return;
    _modal.hidden = true;
    document.body.style.overflow = '';
    document.removeEventListener('keydown', _onEsc);
  }

  function _onEsc(e) {
    if (e.key === 'Escape') close();
  }

  // ── Step renderer ─────────────────────────────────────────────
  async function _renderStep(step) {
    const body = _el('bookingModalBody');
    if (!body) return;

    if (step === 'services') {
      await _renderServices(body);
    } else if (step === 'schedule') {
      _renderSchedule(body);
    } else if (step === 'confirm') {
      _renderConfirm(body);
    } else if (step === 'success') {
      _renderSuccess(body);
    }
  }

  // ── Services list ─────────────────────────────────────────────
  async function _renderServices(body) {
    body.innerHTML = `<div class="bm-loading"><div class="bm-spinner"></div></div>`;

    if (!_services) {
      try {
        const token = _getToken();
        const res = await fetch(`${API_BASE}/api/booking/services`, {
          headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        });
        const data = await res.json();
        const rawServices = data.services || [];
        // Filter by Simplybook CRM visibility (eye toggle = category visibility)
        _services = (typeof SvsFilter !== 'undefined')
          ? await SvsFilter.filterVisibleServices(rawServices)
          : rawServices;
      } catch {
        body.innerHTML = `<div class="bm-error">Failed to load classes. Please try again.</div>`;
        return;
      }
    }

    const lang = document.documentElement.lang || 'en';
    const catLabels = {
      yoga:      { en: 'Yoga', ru: 'Йога', el: 'Γιόγκα' },
      spiritual: { en: 'Spiritual & Healing', ru: 'Духовные практики', el: 'Πνευματικές' },
      dance:     { en: 'Dance & Movement', ru: 'Танцы', el: 'Χορός' },
      events:    { en: 'Events', ru: 'События', el: 'Εκδηλώσεις' },
      other:     { en: 'Other', ru: 'Другое', el: 'Άλλα' }
    };

    // Group services by category
    const groups = {};
    for (const s of _services) {
      const cat = s.category || 'other';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(s);
    }

    const SB_CDN = 'https://simplybook.me';
    function _svcImg(s) {
      const p = s.picture_path || s.picture || '';
      if (!p) return '';
      return p.startsWith('http') ? p : `${SB_CDN}${p}`;
    }

    const catOrder = ['yoga', 'spiritual', 'dance', 'events', 'other'];
    let html = `<div class="bm-services-header">
      <h2 class="bm-title" data-i18n="book_choose_class">Choose a class</h2>
    </div>`;

    for (const cat of catOrder) {
      if (!groups[cat]) continue;
      const catName = catLabels[cat]?.[lang] || catLabels[cat]?.en || cat;
      html += `<div class="bm-category">
        <div class="bm-category-label">${catName}</div>
        <div class="bm-services-grid">`;
      for (const s of groups[cat]) {
        const duration = s.duration ? `${s.duration} min` : '';
        const price    = s.price > 0 ? `€${s.price.toFixed(0)}` : `€20<sup style="font-size:.65em;vertical-align:super;color:var(--color-primary,#7c5cbf)">*</sup>`;
        const imgUrl   = _svcImg(s);
        // Strip HTML + decode entities for clean display
        const rawDesc  = s.description
          ? s.description.replace(/<[^>]*>/g,'').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&nbsp;/g,' ').trim()
          : '';
        const desc = rawDesc;
        const instructor = s.instructor_name ? `<span class="bm-instructor-tag">👤 ${_esc(s.instructor_name)}</span>` : '';
        html += `<div class="bm-service-card" data-id="${s.id}" onclick="BookingModal._pickService('${s.id}')">
          ${imgUrl ? `<div class="bm-service-img-wrap"><img class="bm-service-img" src="${imgUrl}" alt="${_esc(s.name)}" loading="lazy" onerror="this.parentElement.style.display='none'"></div>` : ''}
          <div class="bm-service-info">
            <div class="bm-service-name">${_esc(s.name)}</div>
            ${desc ? (() => {
              const BM_LIMIT = 180;
              const lMore = lang === 'ru' ? 'Читать далее ↓' : lang === 'el' ? 'Διαβάστε ↓' : 'Read more ↓';
              const lLess = lang === 'ru' ? 'Свернуть ↑' : lang === 'el' ? 'Λιγότερα ↑' : 'Show less ↑';
              const bmShort = desc.length > BM_LIMIT ? desc.slice(0, BM_LIMIT).trimEnd() + '…' : desc;
              const bmId = 'bmd-' + s.id;
              return desc.length > BM_LIMIT
                ? `<div class="bm-service-desc-wrap">
                    <div class="bm-service-desc" id="${bmId}" data-full="${_esc(desc)}" data-short="${_esc(bmShort)}">${_esc(bmShort)}</div>
                    <button class="bm-read-more-btn" onclick="(function(b){var d=document.getElementById('${bmId}');var ex=d.dataset.expanded==='1';d.textContent=ex?d.dataset.short:d.dataset.full;d.dataset.expanded=ex?'0':'1';b.textContent=ex?'${lMore}':'${lLess}';})  (this)">${lMore}</button>
                  </div>`
                : `<div class="bm-service-desc">${_esc(desc)}</div>`;
            })() : ''}
            <div class="bm-service-meta">
              ${duration ? `<span class="bm-badge">${duration}</span>` : ''}
              <span class="bm-badge bm-badge-price">${price}</span>
              ${instructor}
            </div>
          </div>
        </div>`;
      }
      html += `</div></div>`;
    }

    body.innerHTML = html;
  }

  async function _pickService(serviceId) {
    _selectedService = serviceId;
    await _selectService(serviceId);
  }

  async function _selectService(serviceId) {
    const body = _el('bookingModalBody');
    if (!body) return;
    _selectedService = serviceId;
    _selectedDate = null;
    _selectedSlot = null;
    _currentMonth = new Date();
    _resetSlotState();
    _renderStep('schedule');
  }

  // ── Schedule (calendar + slots) ───────────────────────────────
  function _renderSchedule(body) {
    const service = _services?.find(s => String(s.id) === String(_selectedService));
    const serviceName = service ? _esc(service.name) : '';
    const lang = document.documentElement.lang || 'en';

    const backLabel = lang === 'ru' ? '← Назад' : lang === 'el' ? '← Πίσω' : '← Back';
    const chooseLabel = lang === 'ru' ? 'Выбери дату' : lang === 'el' ? 'Επέλεξε ημέρα' : 'Choose a date';
    const slotsLabel = lang === 'ru' ? 'Доступное время' : lang === 'el' ? 'Διαθέσιμες ώρες' : 'Available times';

    body.innerHTML = `
      <div class="bm-schedule-header">
        <button class="bm-back-btn" onclick="BookingModal._goBack()">${backLabel}</button>
        <div class="bm-selected-service">${serviceName}</div>
      </div>
      <div class="bm-schedule-body">
        <div class="bm-calendar-section">
          <div class="bm-calendar-title">${chooseLabel}</div>
          <div id="bmCalendar" class="bm-calendar"></div>
        </div>
        <div class="bm-slots-section">
          <div class="bm-slots-title">${slotsLabel}</div>
          <div id="bmSlots" class="bm-slots"><div class="bm-slots-placeholder">←</div></div>
        </div>
      </div>`;

    _renderCalendar();
    // Allow auto-advance here: if the current month has no availability we jump
    // straight to the first month that does, instead of showing an all-grey grid.
    _loadSlotsForMonth(true);
  }

  function _renderCalendar() {
    const cal = _el('bmCalendar');
    if (!cal) return;

    const year  = _currentMonth.getFullYear();
    const month = _currentMonth.getMonth();
    const lang  = _lang();

    const mNames = MONTH_NAMES[lang] || MONTH_NAMES.en;
    const dNames = DAY_NAMES[lang] || DAY_NAMES.en;

    const firstDay  = new Date(year, month, 1);
    const lastDay   = new Date(year, month + 1, 0);
    const today     = new Date(); today.setHours(0,0,0,0);

    // Day of week of first day (Mon=0)
    let startDow = firstDay.getDay() - 1;
    if (startDow < 0) startDow = 6;

    let html = `<div class="bm-cal-nav">
      <button class="bm-cal-prev" onclick="BookingModal._prevMonth()">‹</button>
      <div class="bm-cal-month">${mNames[month]} ${year}</div>
      <button class="bm-cal-next" onclick="BookingModal._nextMonth()">›</button>
    </div>
    <div class="bm-cal-grid">`;

    for (const d of dNames) {
      html += `<div class="bm-cal-dow">${d}</div>`;
    }

    // Empty cells before first day
    for (let i = 0; i < startDow; i++) {
      html += `<div class="bm-cal-cell bm-cal-empty"></div>`;
    }

    for (let d = 1; d <= lastDay.getDate(); d++) {
      const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      const cellDate = new Date(year, month, d);
      const isPast   = cellDate < today;
      const hasSlots = _slots[dateStr] && _slots[dateStr].length > 0;
      const isSelected = _selectedDate === dateStr;

      let cls = 'bm-cal-cell';
      if (isPast)      cls += ' bm-cal-past';
      else if (hasSlots) cls += ' bm-cal-available';
      else             cls += ' bm-cal-unavailable';
      if (isSelected)  cls += ' bm-cal-selected';

      const onclick = (!isPast && hasSlots)
        ? `onclick="BookingModal._pickDate('${dateStr}')"`
        : '';

      html += `<div class="${cls}" ${onclick}>${d}</div>`;
    }

    html += `</div>`;
    cal.innerHTML = html;
  }

  // Fetch one availability window, retrying on transient failures (Render cold
  // start can take ~30s on the first request after idle).
  async function _fetchSlotsRange(from, to, retries = 3, delayMs = 4000) {
    let lastErr;
    for (let i = 0; i < retries; i++) {
      try {
        const url = `${API_BASE}/api/booking/slots`
          + `?service_id=${encodeURIComponent(_selectedService)}`
          + `&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (data && data.error) throw new Error(String(data.error));
        if (!data || !Array.isArray(data.slots)) throw new Error('Malformed response: no slots array');
        return data.slots;
      } catch (e) {
        lastErr = e;
        if (i < retries - 1) await new Promise(r => setTimeout(r, delayMs));
      }
    }
    throw lastErr;
  }

  // Loads a rolling HORIZON_MONTHS window anchored on the displayed month.
  // Previously this requested a single calendar month, so a class whose next
  // session was in the following month rendered an entirely grey calendar.
  async function _loadSlotsForMonth(allowAutoAdvance = false) {
    const anchor = new Date(_currentMonth.getFullYear(), _currentMonth.getMonth(), 1);
    const today  = _todayMidnight();
    const start  = anchor < today ? today : anchor;
    // Last day of (anchor month + HORIZON_MONTHS - 1)
    const end    = new Date(anchor.getFullYear(), anchor.getMonth() + HORIZON_MONTHS, 0);

    const from = _fmtISO(start);
    const to   = _fmtISO(end);

    // Already covered by the cached window? Just re-render.
    if (!_slotsError && _loadedFrom && _loadedTo && from >= _loadedFrom && to <= _loadedTo) {
      _renderCalendar();
      _refreshSlotsPanel();
      return;
    }

    _slotsError = false;
    _slotsLoading = true;

    const slotEl = _el('bmSlots');
    if (slotEl) {
      const loadingLabel = _t({
        ru: 'Загружаем расписание…',
        el: 'Φόρτωση διαθεσιμότητας…',
        en: 'Loading availability…'
      });
      slotEl.innerHTML = `<div class="bm-loading-small">`
        + `<div class="bm-spinner bm-spinner-sm"></div>`
        + `<div class="bm-slots-placeholder">${loadingLabel}</div></div>`;
    }

    const chunks = _splitRange(start, end);
    const results = await Promise.all(chunks.map(async ([f, t]) => {
      try {
        return { from: f, to: t, slots: await _fetchSlotsRange(f, t) };
      } catch (e) {
        console.error('[BookingModal] Availability chunk failed',
          { service_id: _selectedService, from: f, to: t }, e);
        return { from: f, to: t, slots: null };
      }
    }));

    const ok = results.filter(r => r.slots !== null);

    if (!ok.length) {
      _slotsError = true;
      _loadedFrom = null;
      _loadedTo   = null;
    } else {
      // Replace the whole cache — the new window fully defines what we know.
      _slots = {};
      for (const r of ok) {
        for (const slot of r.slots) {
          if (!slot || !slot.date || !slot.time) continue;
          if (!_slots[slot.date]) _slots[slot.date] = [];
          if (!_slots[slot.date].includes(slot.time)) _slots[slot.date].push(slot.time);
        }
      }
      // Only cache the contiguous span that actually loaded, so a failed chunk
      // never gets remembered as "no availability".
      let coveredTo = null;
      for (const r of results) {
        if (r.slots === null) break;
        coveredTo = r.to;
      }
      _loadedFrom = coveredTo ? from : null;
      _loadedTo   = coveredTo;
    }

    _slotsLoading = false;

    // If the displayed month has nothing but a later month does, go there.
    if (!_slotsError && allowAutoAdvance && !_selectedDate) {
      const prefix = _monthPrefix(_currentMonth);
      const future = _futureSlotDates();
      if (future.length && !future.some(k => k.startsWith(prefix))) {
        const first = new Date(future[0] + 'T00:00:00');
        _currentMonth = new Date(first.getFullYear(), first.getMonth(), 1);
      }
    }

    _renderCalendar();
    _refreshSlotsPanel();
  }

  // Renders the right-hand panel based on the current availability state.
  // Replaces the old unconditional "Pick a date" placeholder, which gave users
  // no way to tell "no classes this month" apart from "loading failed".
  function _refreshSlotsPanel() {
    const slotEl = _el('bmSlots');
    if (!slotEl) return;

    if (_selectedDate && _slots[_selectedDate] && _slots[_selectedDate].length) {
      _renderSlots(_selectedDate);
      return;
    }

    if (_slotsError) {
      const msg = _t({
        ru: 'Не удалось загрузить расписание',
        el: 'Αποτυχία φόρτωσης διαθεσιμότητας',
        en: "Couldn't load availability"
      });
      const retry = _t({ ru: 'Попробовать снова', el: 'Δοκιμάστε ξανά', en: 'Try again' });
      slotEl.innerHTML = `<div class="bm-slots-error">${msg}</div>`
        + `<button class="bm-continue-btn" onclick="BookingModal._retryLoadSlots()">${retry}</button>`;
      return;
    }

    const future = _futureSlotDates();

    if (!future.length) {
      slotEl.innerHTML = `<div class="bm-slots-empty">${_t({
        ru: 'Для этого класса пока нет запланированных занятий. Напишите нам — подскажем ближайшую дату.',
        el: 'Δεν υπάρχουν προγραμματισμένα μαθήματα ακόμα. Επικοινωνήστε μαζί μας.',
        en: 'No classes scheduled for this class yet. Contact us and we\u2019ll tell you the next date.'
      })}</div>`;
      return;
    }

    // Availability exists, just not in the month currently on screen.
    const prefix = _monthPrefix(_currentMonth);
    if (!future.some(k => k.startsWith(prefix))) {
      const first  = new Date(future[0] + 'T00:00:00');
      const lang   = _lang();
      const mIn    = (MONTH_NAMES_IN[lang] || MONTH_NAMES_IN.en)[first.getMonth()];
      const msg    = _t({
        ru: `В этом месяце занятий нет. Ближайшие — в ${mIn}.`,
        el: `Δεν υπάρχουν μαθήματα αυτόν τον μήνα. Τα επόμενα — Τον ${mIn}.`,
        en: `No classes this month. The next ones are in ${mIn}.`
      });
      const go = _t({ ru: 'Показать →', el: 'Εμφάνιση →', en: 'Show →' });
      slotEl.innerHTML = `<div class="bm-slots-empty">${msg}</div>`
        + `<button class="bm-continue-btn" onclick="BookingModal._jumpToFirstAvailable()">${go}</button>`;
      return;
    }

    slotEl.innerHTML = `<div class="bm-slots-placeholder">${_t({
      ru: 'Выбери дату в календаре',
      el: 'Επέλεξε ημέρα',
      en: 'Pick a date'
    })}</div>`;
  }

  function _retryLoadSlots() {
    _resetSlotState();
    _renderCalendar();
    _loadSlotsForMonth(true);
  }

  function _jumpToFirstAvailable() {
    const future = _futureSlotDates();
    if (!future.length) return;
    const first = new Date(future[0] + 'T00:00:00');
    _currentMonth = new Date(first.getFullYear(), first.getMonth(), 1);
    _selectedDate = null;
    _selectedSlot = null;
    _renderCalendar();
    _loadSlotsForMonth(false);
  }

  function _pickDate(dateStr) {
    _selectedDate = dateStr;
    _selectedSlot = null;
    _renderCalendar();
    _renderSlots(dateStr);
  }

  function _renderSlots(dateStr) {
    const slotEl = _el('bmSlots');
    if (!slotEl) return;

    const times = _slots[dateStr] || [];
    const lang  = document.documentElement.lang || 'en';

    if (times.length === 0) {
      slotEl.innerHTML = `<div class="bm-slots-empty">${lang === 'ru' ? 'Нет свободного времени' : lang === 'el' ? 'Δεν υπάρχουν θέσεις' : 'No slots available'}</div>`;
      return;
    }

    // Format date nicely
    const d = new Date(dateStr + 'T00:00:00');
    const options = { weekday: 'long', day: 'numeric', month: 'long' };
    const locale  = lang === 'ru' ? 'ru-RU' : lang === 'el' ? 'el-GR' : 'en-GB';
    const dateLabel = d.toLocaleDateString(locale, options);

    let html = `<div class="bm-slots-date">${dateLabel}</div><div class="bm-slots-grid">`;
    for (const t of times.sort()) {
      const label = t.slice(0,5); // "19:00"
      const isSelected = _selectedSlot === t;
      const cls = 'bm-slot' + (isSelected ? ' bm-slot-selected' : '');
      html += `<button class="${cls}" onclick="BookingModal._pickSlot('${t}')">${label}</button>`;
    }
    html += `</div>`;

    // Continue button
    if (_selectedSlot) {
      const contLabel = lang === 'ru' ? 'Продолжить' : lang === 'el' ? 'Συνέχεια' : 'Continue';
      html += `<button class="bm-continue-btn" onclick="BookingModal._goToConfirm()">${contLabel}</button>`;
    }

    slotEl.innerHTML = html;
  }

  function _pickSlot(time) {
    _selectedSlot = time;
    _renderSlots(_selectedDate);
  }

  function _prevMonth() {
    _currentMonth.setMonth(_currentMonth.getMonth() - 1);
    _selectedDate = null;
    _selectedSlot = null;
    _renderCalendar();
    _loadSlotsForMonth();
  }

  function _nextMonth() {
    _currentMonth.setMonth(_currentMonth.getMonth() + 1);
    _selectedDate = null;
    _selectedSlot = null;
    _renderCalendar();
    _loadSlotsForMonth();
  }

  // ── Confirm step ──────────────────────────────────────────────
  function _renderConfirm(body) {
    const service = _services?.find(s => String(s.id) === String(_selectedService));
    const lang    = document.documentElement.lang || 'en';
    const locale  = lang === 'ru' ? 'ru-RU' : lang === 'el' ? 'el-GR' : 'en-GB';

    const d = new Date(_selectedDate + 'T00:00:00');
    const dateStr = d.toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    const timeStr = _selectedSlot?.slice(0,5);

    const labels = {
      confirm: { en: 'Confirm booking', ru: 'Подтвердить', el: 'Επιβεβαίωση' },
      back:    { en: '← Back', ru: '← Назад', el: '← Πίσω' },
      booking: { en: 'Your booking', ru: 'Ваше бронирование', el: 'Η κράτησή σας' },
      class:   { en: 'Class', ru: 'Занятие', el: 'Μάθημα' },
      date:    { en: 'Date', ru: 'Дата', el: 'Ημερομηνία' },
      time:    { en: 'Time', ru: 'Время', el: 'Ώρα' },
    };
    const L = (k) => labels[k]?.[lang] || labels[k]?.en;

    body.innerHTML = `
      <div class="bm-confirm-header">
        <button class="bm-back-btn" onclick="BookingModal._goToSchedule()">${L('back')}</button>
        <h2 class="bm-title">${L('booking')}</h2>
      </div>
      <div class="bm-confirm-card">
        <div class="bm-confirm-row">
          <span class="bm-confirm-label">${L('class')}</span>
          <span class="bm-confirm-value">${_esc(service?.name || '')}</span>
        </div>
        <div class="bm-confirm-row">
          <span class="bm-confirm-label">${L('date')}</span>
          <span class="bm-confirm-value">${dateStr}</span>
        </div>
        <div class="bm-confirm-row">
          <span class="bm-confirm-label">${L('time')}</span>
          <span class="bm-confirm-value">${timeStr}</span>
        </div>
        ${service?.duration ? `<div class="bm-confirm-row">
          <span class="bm-confirm-label">Duration</span>
          <span class="bm-confirm-value">${service.duration} min</span>
        </div>` : ''}
        ${service?.price > 0 ? `<div class="bm-confirm-row">
          <span class="bm-confirm-label">Price</span>
          <span class="bm-confirm-value">€${service.price.toFixed(0)}</span>
        </div>` : ''}
      </div>
      <div id="bmConfirmError" class="bm-error-msg" style="display:none"></div>
      <button class="bm-confirm-btn" id="bmConfirmBtn" onclick="BookingModal._submitBooking()">
        ${L('confirm')}
      </button>`;
  }

  async function _submitBooking() {
    const token = _getToken();
    if (!token) {
      // Save booking context so we can resume after login
      try {
        localStorage.setItem('svs_pending_booking', JSON.stringify({
          service_id: _selectedService,
          date:       _selectedDate,
          time:       _selectedSlot
        }));
      } catch (_) {}
      await _renderAuthGate();
      return;
    }

    const btn = _el('bmConfirmBtn');
    const errEl = _el('bmConfirmError');
    if (btn) { btn.disabled = true; btn.textContent = '...'; }
    if (errEl) errEl.style.display = 'none';

    // Ensure services loaded so we can resolve unit_id
    if (!_services) {
      try {
        const r = await fetch(`${API_BASE}/api/booking/services`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const d = await r.json();
        _services = d.services || [];
      } catch(e) { _services = []; }
    }

    const service = _services?.find(s => String(s.id) === String(_selectedService));
    const unit_id = service?.unit_ids?.[0] ? parseInt(service.unit_ids[0]) : null;

    try {
      const res = await fetch(`${API_BASE}/api/booking/book`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          service_id: _selectedService,
          unit_id,
          date: _selectedDate,
          time: _selectedSlot
        })
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || 'Booking failed');

      _lastBooking = data.booking;
      _renderStep('success');
    } catch (err) {
      if (btn) { btn.disabled = false; btn.textContent = (document.documentElement.lang === 'ru' ? 'Подтвердить' : 'Confirm booking'); }
      if (errEl) {
        // Show human-friendly error message
        const rawMsg = err.message || 'Booking failed';
        const lang = document.documentElement.lang || 'en';
        let friendlyMsg = rawMsg;
        if (rawMsg.toLowerCase().includes('unexpected') || rawMsg.toLowerCase().includes('error')) {
          friendlyMsg = lang === 'ru'
            ? '⚠️ Не удалось забронировать. Попробуйте снова или напишите нам.'
            : lang === 'el'
            ? '⚠️ Αδύνατη η κράτηση. Δοκιμάστε ξανά ή επικοινωνήστε μαζί μας.'
            : '⚠️ Booking failed. Please try again or contact us.';
        }
        errEl.textContent = friendlyMsg;
        errEl.style.display = '';
        errEl.style.animation = 'none';
        errEl.offsetHeight; // reflow
        errEl.style.animation = '';
      }
    }
  }

  // ── Success step ──────────────────────────────────────────────
  let _lastBooking = null;

  function _renderSuccess(body) {
    const lang = document.documentElement.lang || 'en';
    const labels = {
      title:   { en: 'Booking confirmed!', ru: 'Бронирование подтверждено!', el: 'Η κράτηση επιβεβαιώθηκε!' },
      sub:     { en: 'See you at Soul Vibe Space', ru: 'Ждём вас в Soul Vibe Space', el: 'Σας περιμένουμε' },
      close:   { en: 'Done', ru: 'Готово', el: 'Τέλος' },
      another: { en: 'Book another class', ru: 'Забронировать ещё', el: 'Νέα κράτηση' },
    };
    const L = (k) => labels[k]?.[lang] || labels[k]?.en;

    const service = _services?.find(s => String(s.id) === String(_selectedService));
    const timeStr = _selectedSlot?.slice(0,5);
    const d = new Date(_selectedDate + 'T00:00:00');
    const locale = lang === 'ru' ? 'ru-RU' : lang === 'el' ? 'el-GR' : 'en-GB';
    const dateStr = d.toLocaleDateString(locale, { day: 'numeric', month: 'long' });

    body.innerHTML = `
      <div class="bm-success">
        <div class="bm-success-icon">✓</div>
        <h2 class="bm-success-title">${L('title')}</h2>
        <div class="bm-success-detail">${_esc(service?.name || '')}</div>
        <div class="bm-success-detail">${dateStr} · ${timeStr}</div>
        <p class="bm-success-sub">${L('sub')}</p>
        <div class="bm-success-actions">
          <button class="bm-confirm-btn" onclick="BookingModal.close()">${L('close')}</button>
          <button class="bm-back-btn" onclick="BookingModal._goToServices()">${L('another')}</button>
        </div>
      </div>`;
  }

  // ── Navigation ────────────────────────────────────────────────
  function _goBack() {
    _selectedService = null;
    _selectedDate = null;
    _selectedSlot = null;
    _renderStep('services');
  }

  function _goToServices() {
    _selectedService = null;
    _selectedDate = null;
    _selectedSlot = null;
    _renderStep('services');
  }

  function _goToSchedule() {
    _selectedDate = null;
    _selectedSlot = null;
    _renderStep('schedule');
  }

  function _goToScheduleOrServices() {
    // If we have a selected service, go back to schedule; otherwise services list
    if (_selectedService && _services) {
      _goToSchedule();
    } else {
      _goToServices();
    }
  }

  function _goToConfirm() {
    if (!_selectedDate || !_selectedSlot) return;
    // Check auth before showing confirm
    if (!_getToken()) {
      try {
        localStorage.setItem('svs_pending_booking', JSON.stringify({
          service_id: _selectedService, date: _selectedDate, time: _selectedSlot
        }));
      } catch(_) {}
      _renderAuthGate();
      return;
    }
    _renderStep('confirm');
  }

  async function _renderAuthGate(defaultTab) {
    const body = _el('bookingModalBody');
    if (!body) return;
    const lang = document.documentElement.lang || 'en';
    const tab  = defaultTab || 'login';

    const L = {
      en: {
        back: '← Back',
        title_login: 'Sign in to book',
        title_reg: 'Create account',
        tab_login: 'Sign In',
        tab_reg: 'Register',
        google: 'Continue with Google',
        or: 'or',
        email: 'Email',
        pw: 'Password',
        name: 'Full Name',
        phone: 'Phone',
        login_btn: 'Sign In',
        reg_btn: 'Create Account',
        wa: 'Contact admin via WhatsApp',
        terms_text: 'I agree with Soul Vibe Space',
        terms_link: 'Terms & Conditions',
        newsletter_text: 'Subscribe to receive our promotions, offers and relevant information.',
      },
      ru: {
        back: '← Назад',
        title_login: 'Войдите для записи',
        title_reg: 'Создать аккаунт',
        tab_login: 'Войти',
        tab_reg: 'Регистрация',
        google: 'Войти через Google',
        or: 'или',
        email: 'Email',
        pw: 'Пароль',
        name: 'Имя и фамилия',
        phone: 'Телефон',
        login_btn: 'Войти',
        reg_btn: 'Создать аккаунт',
        wa: 'Написать администратору',
        terms_text: 'Я принимаю',
        terms_link: 'Условия использования',
        newsletter_text: 'Подписаться на акции, предложения и новости студии.',
      },
      el: {
        back: '← Πίσω',
        title_login: 'Σύνδεση για κράτηση',
        title_reg: 'Δημιουργία λογαριασμού',
        tab_login: 'Σύνδεση',
        tab_reg: 'Εγγραφή',
        google: 'Συνέχεια με Google',
        or: 'ή',
        email: 'Email',
        pw: 'Κωδικός',
        name: 'Ονοματεπώνυμο',
        phone: 'Τηλέφωνο',
        login_btn: 'Σύνδεση',
        reg_btn: 'Δημιουργία',
        wa: 'Επικοινωνία με διαχειριστή',
        terms_text: 'Συμφωνώ με τους',
        terms_link: 'Όρους & Προϋποθέσεις',
        newsletter_text: 'Εγγραφή για προσφορές και νέα του στούντιο.',
      }
    };
    const m = L[lang] || L.en;

    body.innerHTML = `
      <div class="bm-inline-auth">
        <button class="bm-back-btn" onclick="BookingModal._goToScheduleOrServices()" style="margin-bottom:16px">${m.back}</button>
        <div class="bm-inline-auth-tabs">
          <button class="bm-ia-tab${tab==='login'?' bm-ia-tab-active':''}" id="bmIaTabLogin" onclick="BookingModal._switchAuthTab('login')">${m.tab_login}</button>
          <button class="bm-ia-tab${tab==='register'?' bm-ia-tab-active':''}" id="bmIaTabReg" onclick="BookingModal._switchAuthTab('register')">${m.tab_reg}</button>
        </div>

        <!-- Google -->
        <button class="bm-google-btn" onclick="BookingModal._bmGoogleSignIn()">
          <svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
          ${m.google}
        </button>

        <div class="bm-ia-divider"><span>${m.or}</span></div>

        <!-- Login form -->
        <form id="bmIaLoginForm" class="bm-ia-form${tab==='login'?'':' bm-ia-hidden'}" onsubmit="event.preventDefault();BookingModal._bmLogin()">
          <div class="bm-ia-field">
            <label class="bm-ia-label">${m.email}</label>
            <input class="bm-ia-input" id="bmIaEmail" type="email" autocomplete="email" required placeholder="your@email.com" />
          </div>
          <div class="bm-ia-field">
            <label class="bm-ia-label">${m.pw}</label>
            <input class="bm-ia-input" id="bmIaPassword" type="password" autocomplete="current-password" required placeholder="••••••••" />
          </div>
          <div id="bmIaLoginErr" class="bm-ia-error"></div>
          <button type="submit" class="bm-confirm-btn" id="bmIaLoginBtn">${m.login_btn}</button>
        </form>

        <!-- Register form -->
        <form id="bmIaRegForm" class="bm-ia-form${tab==='register'?'':' bm-ia-hidden'}" onsubmit="event.preventDefault();BookingModal._bmRegister()">
          <div class="bm-ia-field">
            <label class="bm-ia-label">${m.name}</label>
            <input class="bm-ia-input" id="bmIaName" type="text" autocomplete="name" required placeholder="Anna Smith" />
          </div>
          <div class="bm-ia-field">
            <label class="bm-ia-label">${m.email}</label>
            <input class="bm-ia-input" id="bmIaRegEmail" type="email" autocomplete="email" required placeholder="your@email.com" />
          </div>
          <div class="bm-ia-field">
            <label class="bm-ia-label">${m.phone}</label>
            <input class="bm-ia-input" id="bmIaPhone" type="tel" autocomplete="tel" required placeholder="+357..." />
          </div>
          <div class="bm-ia-field">
            <label class="bm-ia-label">${m.pw}</label>
            <input class="bm-ia-input" id="bmIaRegPassword" type="password" autocomplete="new-password" placeholder="••••••••" />
          </div>
          <div class="bm-ia-consent">
            <label class="bm-ia-consent-label">
              <input type="checkbox" id="bmIaTerms" required class="bm-ia-checkbox" />
              <span>${m.terms_text} <a href="/terms.html" target="_blank" class="bm-ia-link">${m.terms_link}</a> <span class="bm-ia-required">*</span></span>
            </label>
            <label class="bm-ia-consent-label" style="margin-top:8px">
              <input type="checkbox" id="bmIaNewsletter" class="bm-ia-checkbox" />
              <span>${m.newsletter_text}</span>
            </label>
          </div>
          <div id="bmIaRegErr" class="bm-ia-error"></div>
          <button type="submit" class="bm-confirm-btn" id="bmIaRegBtn">${m.reg_btn}</button>
        </form>

        <a class="bm-wa-btn" href="https://wa.me/35795642888" target="_blank" rel="noopener" style="margin-top:12px">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/></svg>
          ${m.wa}
        </a>
      </div>`;
  }

  function _switchAuthTab(tab) {
    const loginForm = document.getElementById('bmIaLoginForm');
    const regForm   = document.getElementById('bmIaRegForm');
    const tabLogin  = document.getElementById('bmIaTabLogin');
    const tabReg    = document.getElementById('bmIaTabReg');
    if (!loginForm) return;
    if (tab === 'login') {
      loginForm.classList.remove('bm-ia-hidden');
      regForm.classList.add('bm-ia-hidden');
      tabLogin.classList.add('bm-ia-tab-active');
      tabReg.classList.remove('bm-ia-tab-active');
    } else {
      loginForm.classList.add('bm-ia-hidden');
      regForm.classList.remove('bm-ia-hidden');
      tabLogin.classList.remove('bm-ia-tab-active');
      tabReg.classList.add('bm-ia-tab-active');
    }
  }

  async function _bmLogin() {
    const email = document.getElementById('bmIaEmail')?.value.trim();
    const pw    = document.getElementById('bmIaPassword')?.value;
    const btn   = document.getElementById('bmIaLoginBtn');
    const errEl = document.getElementById('bmIaLoginErr');
    if (!email || !pw) { if(errEl) errEl.textContent = 'Please enter email and password'; return; }
    if (btn) { btn.disabled = true; btn.textContent = '...'; }
    if (errEl) errEl.textContent = '';
    try {
      const res  = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: pw })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');
      _bmOnAuthSuccess(data.token, data.client);
    } catch(err) {
      if (errEl) errEl.textContent = err.message;
      if (btn) { btn.disabled = false; btn.textContent = 'Sign In'; }
    }
  }

  async function _bmRegister() {
    const name       = document.getElementById('bmIaName')?.value.trim();
    const email      = document.getElementById('bmIaRegEmail')?.value.trim();
    const phone      = document.getElementById('bmIaPhone')?.value.trim();
    const pw         = document.getElementById('bmIaRegPassword')?.value;
    const termsEl    = document.getElementById('bmIaTerms');
    const newsletterEl = document.getElementById('bmIaNewsletter');
    const btn        = document.getElementById('bmIaRegBtn');
    const errEl      = document.getElementById('bmIaRegErr');

    if (!name || !email || !phone) { if(errEl) errEl.textContent = 'Please fill in all fields'; return; }
    if (termsEl && !termsEl.checked) {
      if(errEl) errEl.textContent = 'Please agree to the Terms & Conditions';
      return;
    }

    const newsletter_consent = newsletterEl ? newsletterEl.checked : false;

    if (btn) { btn.disabled = true; btn.textContent = '...'; }
    if (errEl) errEl.textContent = '';
    try {
      const res  = await fetch(`${API_BASE}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, phone, password: pw, newsletter_consent, terms_accepted: true })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Registration failed');
      _bmOnAuthSuccess(data.token, data.client);
    } catch(err) {
      if (errEl) errEl.textContent = err.message;
      if (btn) { btn.disabled = false; btn.textContent = 'Create Account'; }
    }
  }

  async function _bmGoogleSignIn() {
    // Trigger Google OAuth — reuse existing GSI flow via auth-modal callback
    // Save pending booking first, then open Google via hidden GSI button if available
    try {
      if (_selectedService && _selectedDate && _selectedSlot) {
        localStorage.setItem('svs_pending_booking', JSON.stringify({
          service_id: _selectedService, date: _selectedDate, time: _selectedSlot
        }));
      }
    } catch(_) {}
    // Try to click the hidden Google button from authModal GSI if it exists
    const gsiBtn = document.querySelector('.g_id_signin div[role="button"]');
    if (gsiBtn) { gsiBtn.click(); return; }
    // Fallback: open authModal on Google tab
    if (typeof AuthModal !== 'undefined') AuthModal.open('login');
  }

  async function _bmOnAuthSuccess(token, client) {
    try { window['local'+'Storage'].setItem('svs_token', token); } catch(_) {}
    // Update header button
    if (typeof _updateHeaderBtn === 'function') {
      const firstName = (client?.name || '').split(' ')[0] || 'User';
      _updateHeaderBtn(firstName, true);
    }
    // Clear pending booking from storage (we already have state)
    try { localStorage.removeItem('svs_pending_booking'); } catch(_) {}
    // Go straight to confirm
    if (_selectedService && _selectedDate && _selectedSlot) {
      if (!_services) {
        try {
          const res = await fetch(`${API_BASE}/api/booking/services`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          const d = await res.json();
          _services = d.services || [];
        } catch(_) { _services = []; }
      }
      _renderStep('confirm');
    } else if (_selectedService) {
      _renderStep('schedule');
    } else {
      _renderStep('services');
    }
  }

  // ── Helpers ───────────────────────────────────────────────────
  function _getToken() {
    try { return window['local'+'Storage'].getItem('svs_token'); } catch { return null; }
  }

  function _esc(str) {
    return String(str)
      .replace(/&/g,'&amp;')
      .replace(/</g,'&lt;')
      .replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;');
  }

  // Called by auth-modal after successful login/register
  async function resumePendingBooking() {
    try {
      const raw = localStorage.getItem('svs_pending_booking');
      if (!raw) return false;
      const pending = JSON.parse(raw);
      localStorage.removeItem('svs_pending_booking');
      if (pending.service_id && pending.date && pending.time) {
        _selectedService = pending.service_id;
        _selectedDate    = pending.date;
        _selectedSlot    = pending.time;
        // Show modal
        const modal = document.getElementById('bookingModal');
        if (modal) modal.hidden = false;
        document.body.style.overflow = 'hidden';
        // If services not loaded yet, load them first then show confirm
        if (!_services) {
          try {
            const token = _getToken();
            const res = await fetch(`${API_BASE}/api/booking/services`, {
              headers: token ? { 'Authorization': `Bearer ${token}` } : {}
            });
            const data = await res.json();
            _services = data.services || [];
          } catch(e) { _services = []; }
        }
        _renderStep('confirm');
        return true;
      }
    } catch (_) {}
    return false;
  }

  return { open, close, resumePendingBooking, _pickService, _pickDate, _pickSlot, _prevMonth, _nextMonth, _retryLoadSlots, _jumpToFirstAvailable, _goBack, _goToServices, _goToSchedule, _goToScheduleOrServices, _goToConfirm, _submitBooking, _switchAuthTab, _bmLogin, _bmRegister, _bmGoogleSignIn };
})();

// Expose as ClassModal alias for backward compatibility
window.ClassModal = { open: (serviceId, date, time) => BookingModal.open(serviceId, date || null, time || null) };
