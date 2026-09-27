/**
 * Soul Vibe Space — contact forms (home #contact and /contact).
 *
 * Sends the form to Netlify Forms (POST / as x-www-form-urlencoded). Success is
 * shown ONLY when Netlify accepted the submission; on any failure the visitor
 * sees an error with direct WhatsApp / e-mail links, so a message is never
 * silently lost. Requires "Form detection" enabled in Netlify → Forms and an
 * e-mail notification set for the forms "contact" and "contact-home".
 */
(function () {
  'use strict';
  var EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/;
  var FALLBACK = {
    en: 'Sorry, the message could not be sent. Please write to us on <a href="https://wa.me/35795642888" target="_blank" rel="noopener">WhatsApp</a> or <a href="mailto:soulvibespace@gmail.com">soulvibespace@gmail.com</a>.',
    ru: 'Не удалось отправить сообщение. Напишите нам в <a href="https://wa.me/35795642888" target="_blank" rel="noopener">WhatsApp</a> или на <a href="mailto:soulvibespace@gmail.com">soulvibespace@gmail.com</a>.',
    el: 'Δεν ήταν δυνατή η αποστολή. Γράψτε μας στο <a href="https://wa.me/35795642888" target="_blank" rel="noopener">WhatsApp</a> ή στο <a href="mailto:soulvibespace@gmail.com">soulvibespace@gmail.com</a>.'
  };
  var MSG = {
    required: { en: 'Please fill in all required fields.', ru: 'Заполните все обязательные поля.', el: 'Συμπληρώστε όλα τα υποχρεωτικά πεδία.' },
    email:    { en: 'Please enter a valid email address.', ru: 'Введите корректный email.', el: 'Εισαγάγετε έγκυρο email.' },
    sending:  { en: 'Sending…', ru: 'Отправка…', el: 'Αποστολή…' },
    sent:     { en: 'Message sent ✓', ru: 'Сообщение отправлено ✓', el: 'Το μήνυμα εστάλη ✓' }
  };
  function lang() {
    var l = (document.documentElement.lang || 'en').slice(0, 2);
    return l === 'ru' || l === 'el' ? l : 'en';
  }
  function m(k) { return MSG[k][lang()]; }

  function errorBox(form) {
    var box = form.querySelector('.contact-form-error');
    if (!box) {
      box = document.createElement('div');
      box.className = 'contact-form-error';
      box.setAttribute('role', 'alert');
      box.style.cssText = 'display:none;margin:12px 0 0;padding:10px 14px;border-radius:8px;background:rgba(192,57,43,.1);color:#c0392b;font-size:14px;line-height:1.5';
      var btn = form.querySelector('[type="submit"]');
      (btn && btn.parentNode === form ? form : (btn ? btn.parentNode : form)).appendChild(box);
    }
    return box;
  }
  function showError(form, html) {
    var box = errorBox(form);
    box.innerHTML = html;
    box.style.display = 'block';
  }
  function hideError(form) {
    var box = form.querySelector('.contact-form-error');
    if (box) box.style.display = 'none';
  }

  function init(form) {
    form.addEventListener('submit', async function (e) {
      e.preventDefault();
      hideError(form);
      var fields = form.querySelectorAll('input[required], textarea[required]');
      for (var i = 0; i < fields.length; i++) {
        if (!fields[i].value.trim()) { fields[i].focus(); return showError(form, m('required')); }
      }
      var emailEl = form.querySelector('input[type="email"]');
      if (emailEl && !EMAIL_RE.test(emailEl.value.trim())) { emailEl.focus(); return showError(form, m('email')); }

      var btn = form.querySelector('[type="submit"]');
      var label = btn && (btn.querySelector('span') || btn);
      var original = label ? label.textContent : '';
      if (btn) btn.disabled = true;
      if (label) label.textContent = m('sending');

      var ok = false;
      try {
        var res = await fetch('/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams(new FormData(form)).toString()
        });
        ok = res.ok;
      } catch (_) { ok = false; }

      if (btn) btn.disabled = false;
      if (label) label.textContent = original;

      if (!ok) return showError(form, FALLBACK[lang()]);

      var success = form.getAttribute('data-success') && document.getElementById(form.getAttribute('data-success'));
      if (success) {
        form.style.display = 'none';
        success.classList.add('visible');
      } else if (label) {
        form.reset();
        label.textContent = m('sent');
        setTimeout(function () { label.textContent = original; }, 5000);
      }
    });
  }

  function start() {
    document.querySelectorAll('form[data-contact-form]').forEach(init);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
