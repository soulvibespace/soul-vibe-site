/* Soul Vibe Space — App JS */

(function () {
  'use strict';

  // ── THEME TOGGLE ──────────────────────────────────────────────────
  const toggle = document.querySelector('[data-theme-toggle]');
  const root   = document.documentElement;
  let theme    = matchMedia('(prefers-color-scheme:dark)').matches ? 'dark' : 'light';

  root.setAttribute('data-theme', theme);
  updateToggleIcon();

  if (toggle) {
    toggle.addEventListener('click', () => {
      theme = theme === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-theme', theme);
      updateToggleIcon();
    });
  }

  function updateToggleIcon() {
    if (!toggle) return;
    if (theme === 'dark') {
      toggle.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>';
      toggle.setAttribute('aria-label', 'Switch to light mode');
    } else {
      toggle.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
      toggle.setAttribute('aria-label', 'Switch to dark mode');
    }
  }

  // ── HEADER SCROLL ────────────────────────────────────────────────
  const header = document.getElementById('header');
  if (header) {
    window.addEventListener('scroll', () => {
      header.classList.toggle('header--scrolled', window.scrollY > 20);
    }, { passive: true });
  }

  // ── MOBILE MENU ──────────────────────────────────────────────────
  const menuBtn  = document.getElementById('mobileMenuBtn');
  const mobileNav = document.getElementById('mobileNav');

  if (menuBtn && mobileNav) {
    menuBtn.addEventListener('click', () => {
      const isOpen = mobileNav.classList.toggle('is-open');
      menuBtn.setAttribute('aria-expanded', isOpen);
      mobileNav.setAttribute('aria-hidden', !isOpen);
    });

    // Close on link click
    mobileNav.querySelectorAll('.mobile-nav-link').forEach(link => {
      link.addEventListener('click', () => {
        mobileNav.classList.remove('is-open');
        menuBtn.setAttribute('aria-expanded', 'false');
        mobileNav.setAttribute('aria-hidden', 'true');
      });
    });
  }

  // ── ACTIVE NAV LINK (scroll spy) ─────────────────────────────────
  const sections = document.querySelectorAll('section[id]');
  const navLinks  = document.querySelectorAll('.nav-link');

  if (sections.length && navLinks.length) {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          navLinks.forEach(link => {
            link.classList.toggle(
              'nav-link--active',
              link.getAttribute('href') === '#' + entry.target.id
            );
          });
        }
      });
    }, { rootMargin: '-30% 0px -60% 0px' });

    sections.forEach(s => observer.observe(s));
  }

  // ── CONTACT FORM (prevent default, show success) ──────────────────
  const contactForm = document.querySelector('.contact-form');
  if (contactForm) {
    contactForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const btn = contactForm.querySelector('button[type="submit"]');
      const original = btn.textContent;
      btn.textContent = 'Message sent ✓';
      btn.disabled = true;
      btn.style.background = '#437a22';
      contactForm.reset();
      setTimeout(() => {
        btn.textContent = original;
        btn.disabled = false;
        btn.style.background = '';
      }, 4000);
    });
  }

  // ── SCROLL REVEAL ────────────────────────────────────────────────
  const revealEls = document.querySelectorAll('.practice-card, .feature-item, .space-feature, .contact-item');

  if ('IntersectionObserver' in window) {
    revealEls.forEach(el => {
      el.style.opacity = '0';
      el.style.transform = 'translateY(20px)';
      el.style.transition = 'opacity 0.55s ease, transform 0.55s ease';
    });

    const revealObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.style.opacity = '1';
          entry.target.style.transform = 'translateY(0)';
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });

    revealEls.forEach(el => revealObserver.observe(el));
  }


  // == UPCOMING CLASSES ON HOMEPAGE ==================================
  var scheduleDaysWrap = document.getElementById('schedule-days');
  var classesGridWrap  = document.getElementById('classes-grid');

  var API_BASE_HOME = window.SVS_API_BASE || 'https://soul-vibe-api.onrender.com';
  var SB_CDN_HOME   = 'https://simplybook.me';

  var CAT_MAP_HOME = {
    2:'yoga',4:'yoga',16:'yoga',17:'yoga',19:'yoga',22:'yoga',23:'yoga',24:'yoga',
    25:'yoga',26:'yoga',31:'yoga',38:'yoga',
    20:'spirit',30:'spirit',41:'spirit',42:'spirit',
    34:'dance',35:'dance',36:'dance',45:'dance',
    43:'events',44:'events',46:'events'
  };
  var CAT_COLORS_HOME = { yoga:'#7a9e6e', spirit:'#9b7ab8', dance:'#d4884a', events:'#5a8fb5', default:'#8a7a6e' };

  function svcPhotoHome(svc) {
    var p = svc.picture_path || svc.picture || '';
    if (!p) return null;
    if (p.indexOf('http') === 0) return p;
    return SB_CDN_HOME + '/uploads/soulvibespace/image_files/preview/' + p.replace(/^\/.*\//g, '').replace(/^.*\//, '');
  }

  function escH(s) {
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function getHomeLang() { try { return localStorage.getItem('svs_lang') || 'en'; } catch(e) { return 'en'; } }

  if (scheduleDaysWrap) {
    scheduleDaysWrap.innerHTML = '<style>@keyframes svspulse{0%,100%{opacity:1}50%{opacity:.45}}</style>'
      + [1,2,3,4,5].map(function() {
          return '<div style="height:72px;border-radius:12px;background:var(--border);animation:svspulse 1.5s infinite;margin-bottom:8px"></div>';
        }).join('');

    (function() {
      var today = new Date();
      var tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
      var from = today.toISOString().slice(0,10);
      var to   = tomorrow.toISOString().slice(0,10);

      function fetchRetry(url, n) {
        return fetch(url).then(function(r) { if (!r.ok) throw r.status; return r.json(); })
          .catch(function(e) { return n > 0 ? new Promise(function(res) { setTimeout(function(){ res(fetchRetry(url, n-1)); }, 7000); }) : Promise.reject(e); });
      }

      fetchRetry(API_BASE_HOME + '/api/schedule?from=' + from + '&to=' + to, 2)
        .then(function(data) {
          var slots = Array.isArray(data) ? data : (data.schedule || data.slots || []);
          var now = new Date();
          var upcoming = slots.filter(function(s) {
            var dt = new Date(s.date + 'T' + (s.start_time || s.time || '00:00'));
            return dt > now;
          }).slice(0, 8);

          scheduleDaysWrap.innerHTML = '';

          if (!upcoming.length) {
            scheduleDaysWrap.innerHTML = '<p style="color:var(--text-secondary);font-size:.9rem;padding:16px 0 0"><a href="schedule.html" style="color:var(--accent)">View full schedule</a></p>';
            return;
          }

          var byDay = {};
          upcoming.forEach(function(s) {
            if (!byDay[s.date]) byDay[s.date] = [];
            byDay[s.date].push(s);
          });

          Object.keys(byDay).forEach(function(date) {
            var daySlots = byDay[date];
            var dt = new Date(date + 'T12:00:00');
            var isToday = dt.toDateString() === now.toDateString();
            var isTomorrow = dt.toDateString() === tomorrow.toDateString();
            var lang = getHomeLang();
            var dayLabel = isToday ? (lang==='ru'?'\u0421\u0435\u0433\u043e\u0434\u043d\u044f':lang==='el'?'\u03a3\u03ae\u03bc\u03b5\u03c1\u03b1':'Today')
                         : isTomorrow ? (lang==='ru'?'\u0417\u0430\u0432\u0442\u0440\u0430':lang==='el'?'\u0391\u03cd\u03c1\u03b9\u03bf':'Tomorrow')
                         : dt.toLocaleDateString(lang==='ru'?'ru-RU':lang==='el'?'el-GR':'en-GB', {weekday:'long',day:'numeric',month:'short'});

            var dayEl = document.createElement('div');
            dayEl.style.cssText = 'margin-bottom:24px';
            dayEl.innerHTML = '<p style="font-size:.78rem;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:var(--accent);margin-bottom:10px">' + escH(dayLabel) + '</p>';

            var list = document.createElement('div');
            list.style.cssText = 'display:flex;flex-direction:column;gap:8px';

            daySlots.forEach(function(slot) {
              var catId = slot.category_id ? Number(slot.category_id) : null;
              var group = catId ? CAT_MAP_HOME[catId] : null;
              var color = (CAT_COLORS_HOME[group] || CAT_COLORS_HOME['default']);
              var time = (slot.start_time || slot.time || '').slice(0,5);
              var instructor = slot.instructor_name || slot.unit_name || '';
              var isPast = new Date(slot.date + 'T' + (slot.start_time || slot.time || '00:00')) <= now;
              var bookLabel = isPast ? (lang==='ru'?'\u041f\u0440\u043e\u0448\u043b\u043e':lang==='el'?'\u03a0\u03ad\u03c1\u03b1\u03c3\u03b5':'Done')
                                     : (lang==='ru'?'\u0417\u0430\u043f\u0438\u0441\u0430\u0442\u044c\u0441\u044f':lang==='el'?'\u039a\u03c1\u03ac\u03c4\u03b7\u03c3\u03b7':'Book');

              var card = document.createElement('div');
              card.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px 16px;background:var(--surface);border:1px solid var(--border);border-radius:12px';
              var sid = slot.service_id || '';
              var sdate = slot.date || '';
              var stime = slot.start_time || slot.time || '';
              card.innerHTML =
                '<div style="display:flex;align-items:center;gap:12px;min-width:0;flex:1">'
                + '<span style="width:3px;height:36px;background:' + color + ';border-radius:2px;flex-shrink:0"></span>'
                + '<div style="min-width:0">'
                  + '<p style="font-family:var(--font-serif);font-size:.97rem;color:var(--text-primary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + escH(slot.service_name || slot.name || '') + '</p>'
                  + '<p style="font-size:.78rem;color:var(--text-secondary);margin-top:2px">' + time + (instructor ? ' \u00b7 ' + escH(instructor) : '') + '</p>'
                + '</div></div>'
                + '<button style="padding:8px 16px;border-radius:100px;background:' + (isPast ? 'var(--border)' : 'var(--accent)') + ';color:' + (isPast ? 'var(--text-secondary)' : '#fff') + ';border:none;font-family:var(--font-sans);font-size:.78rem;font-weight:600;cursor:' + (isPast ? 'default' : 'pointer') + ';white-space:nowrap;flex-shrink:0"'
                + (isPast ? ' disabled' : ' onclick="ClassModal.open(\'' + sid + '\',\'' + sdate + '\',\'' + stime + '\')"') + '>' + bookLabel + '</button>';

              list.appendChild(card);
            });

            dayEl.appendChild(list);
            scheduleDaysWrap.appendChild(dayEl);
          });

          var lang = getHomeLang();
          var more = document.createElement('div');
          more.style.cssText = 'text-align:center;margin-top:20px';
          more.innerHTML = '<a href="schedule.html" class="btn btn-outline" style="display:inline-flex">'
            + (lang==='ru'?'\u041f\u043e\u043b\u043d\u043e\u0435 \u0440\u0430\u0441\u043f\u0438\u0441\u0430\u043d\u0438\u0435 \u2192':lang==='el'?'\u03a0\u03bb\u03ae\u03c1\u03b5\u03c2 \u03c0\u03c1\u03cc\u03b3\u03c1\u03b1\u03bc\u03bc\u03b1 \u2192':'View full schedule \u2192')
            + '</a>';
          scheduleDaysWrap.appendChild(more);
        })
        .catch(function(err) {
          scheduleDaysWrap.innerHTML = '<p style="color:var(--text-secondary);font-size:.9rem;padding:16px 0 0"><a href="schedule.html" style="color:var(--accent)">View full schedule</a></p>';
          console.error('Homepage schedule:', err);
        });
    })();
  }

  if (classesGridWrap) {
    classesGridWrap.innerHTML = [1,2,3,4].map(function() {
      return '<div style="background:var(--surface);border:1px solid var(--border);border-radius:20px;overflow:hidden">'
        + '<div style="aspect-ratio:3/2;background:var(--border);animation:svspulse 1.5s infinite"></div>'
        + '<div style="padding:16px 18px">'
        + '<div style="height:11px;width:40%;border-radius:6px;background:var(--border);animation:svspulse 1.5s infinite;margin-bottom:8px"></div>'
        + '<div style="height:14px;width:75%;border-radius:6px;background:var(--border);animation:svspulse 1.5s infinite"></div>'
        + '</div></div>';
    }).join('');

    (function() {
      var CAT_LABELS_H = {
        yoga:   { en:'Yoga', ru:'\u0419\u043e\u0433\u0430', el:'Yoga' },
        spirit: { en:'Spiritual & Healing', ru:'\u0414\u0443\u0445\u043e\u0432\u043d\u044b\u0435', el:'\u03a0\u03bd\u03b5\u03c5\u03bc\u03b1\u03c4\u03b9\u03ba\u03ad\u03c2' },
        dance:  { en:'Dance', ru:'\u0422\u0430\u043d\u0435\u0446', el:'\u03a7\u03bf\u03c1\u03cc\u03c2' },
        events: { en:'Events', ru:'\u0421\u043e\u0431\u044b\u0442\u0438\u044f', el:'\u0395\u03ba\u03b4\u03b7\u03bb\u03ce\u03c3\u03b5\u03b9\u03c2' }
      };

      fetch(API_BASE_HOME + '/api/booking/services')
        .then(function(r) { if (!r.ok) throw r.status; return r.json(); })
        .then(async function(data) {
          var services = Array.isArray(data) ? data : (data.services || []);
          // Filter by Simplybook CRM visibility (eye toggle)
          if (typeof SvsFilter !== 'undefined') {
            services = await SvsFilter.filterVisibleServices(services);
          }
          var lang = getHomeLang();
          var visible = services.filter(function(s) {
            return (s.category_ids || []).some(function(cid) { return !!CAT_MAP_HOME[Number(cid)]; });
          }).slice(0, 8);

          if (!visible.length) {
            classesGridWrap.innerHTML = '<p style="color:var(--text-secondary)"><a href="classes.html" style="color:var(--accent)">View all classes \u2192</a></p>';
            return;
          }

          classesGridWrap.innerHTML = visible.map(function(svc) {
            var catId = (svc.category_ids || [])[0];
            var group = catId ? CAT_MAP_HOME[Number(catId)] : null;
            var catLbl = group ? ((CAT_LABELS_H[group] || {})[lang] || group) : '';
            var color = (CAT_COLORS_HOME[group] || CAT_COLORS_HOME['default']);
            var photo = svcPhotoHome(svc);
            // Strip HTML tags + decode entities for clean display
            var rawD = (svc.description || '').replace(/<[^>]+>/g,'').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&nbsp;/g,' ').trim();
            var HLIMIT = 180;
            var desc = rawD;
            var descShort = rawD.length > HLIMIT ? rawD.slice(0, HLIMIT).trimRight() + '\u2026' : rawD;
            var descId = 'hdesc-' + svc.id;
            var instructor = svc.instructor_name || '';

            return '<div class="service-card" onclick="ClassModal.open(\'' + svc.id + '\',null,null)" style="cursor:pointer">'
              + '<div class="service-card-img-wrap">'
              + (photo
                ? '<img class="service-card-img" src="' + photo + '" alt="' + escH(svc.name) + '" loading="lazy" onerror="this.parentNode.style.background=\'var(--surface-2)\';this.style.display=\'none\'" />'
                : '<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;opacity:.2"><svg width=48 height=48 viewBox=\'0 0 24 24\' fill=none stroke=currentColor stroke-width=1.2><path d=\'M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z\'/></svg></div>')
              + (catLbl ? '<span class="service-badge" style="--badge-color:' + color + '">' + escH(catLbl) + '</span>' : '')
              + '</div><div class="service-card-body">'
              + '<h3 class="service-card-name">' + escH(svc.name) + '</h3>'
              + (instructor ? '<p class="service-card-instructor">' + escH(instructor) + '</p>' : '')
              + (rawD ? (
                rawD.length > HLIMIT
                  ? '<div class="service-card-desc-wrap">'
                    + '<p class="service-card-desc" id="' + descId + '" data-full="' + escH(rawD) + '" data-short="' + escH(descShort) + '">' + escH(descShort) + '</p>'
                    + '<button class="service-read-more-btn" onclick="event.stopPropagation();(function(b){var p=document.getElementById(\'' + descId + '\');var ex=p.dataset.expanded===\'1\';p.textContent=ex?p.dataset.short:p.dataset.full;p.dataset.expanded=ex?\'0\':\'1\';b.textContent=ex?(\''
                    + (lang==='ru'?'Читать далее ↓':lang==='el'?'Διαβάστε ↓':'Read more ↓')
                    + '\'):(\''
                    + (lang==='ru'?'Свернуть ↑':lang==='el'?'Λιγότερα ↑':'Show less ↑')
                    + '\')})(this)">' + (lang==='ru'?'Читать далее ↓':lang==='el'?'Διαβάστε ↓':'Read more ↓') + '</button>'
                    + '</div>'
                  : '<p class="service-card-desc">' + escH(rawD) + '</p>'
              ) : '')
              + '<button class="service-card-book-btn" onclick="event.stopPropagation();ClassModal.open(\'' + svc.id + '\',null,null)">'
              + (lang==='ru'?'Записаться':lang==='el'?'Κράτηση':'Book a spot')
              + '</button>'
              + '</div></div>';
          }).join('');
        })
        .catch(function(err) {
          classesGridWrap.innerHTML = '<p style="color:var(--text-secondary)"><a href="classes.html" style="color:var(--accent)">View all classes \u2192</a></p>';
          console.error('Homepage classes:', err);
        });
    })();
  }

  // Keep Render awake — silent ping every 4 min while any page is open
  setInterval(function() {
    fetch(API_BASE_HOME + '/api/categories').catch(function(){});
  }, 4 * 60 * 1000);

})();
