/**
 * Soul Vibe Space — i18n
 * Languages: en (English), ru (Russian), el (Greek)
 *
 * Usage: add data-i18n="key" to any element.
 * For placeholders: data-i18n-placeholder="key"
 * For aria-label: data-i18n-aria="key"
 */

// Pages that do not include /theme.js in <head> still get the shared, saved
// light/dark theme: load it from here.
(function () {
  if (window.SVS_THEME || document.querySelector('script[src$="theme.js"]')) return;
  var s = document.createElement('script');
  s.src = '/theme.js';
  (document.head || document.documentElement).appendChild(s);
})();

// ── Термины: единый словарь ──────────────────────────────────────────────────
// Названия продуктов студии живут ТОЛЬКО здесь. В переводах ниже вместо слов
// пишем плейсхолдеры, а движок подставляет нужную форму на языке страницы:
//   {{pass}}          → абонемент / Class Pass       (MP4, MP8, MP12, MP20)
//   {{pass:gen}}      → абонемента (падеж; формы — см. ниже)
//   {{Pass:pl}}       → Абонементы (заглавная первая буква — пишем ключ с заглавной)
//   {{starter}}       → Стартер пак / Starter Pack   (SP1, SP2, SP4 — только для новых клиентов, один раз)
//   {{pass_line}}     → название рядом с кодом: «Абонемент MP8», «Class Pass MP8»
//   {{starter_line}}  → «Стартер пак SP2», «Starter Pack SP2»
// Формы: nom gen dat acc ins prep, pl pl_gen pl_dat pl_ins pl_prep. Если формы нет,
// берётся nom. Чтобы переименовать продукт (например, при новой коммуникации VIBES),
// достаточно поменять значения здесь — тексты сайта, кабинета и окна записи обновятся.
// EL — предварительно латиницей (как бренд), ждёт подтверждения владелицы.
const SVS_TERMS = {
  ru: {
    pass:    { nom: 'абонемент', gen: 'абонемента', dat: 'абонементу', acc: 'абонемент', ins: 'абонементом', prep: 'абонементе',
               pl: 'абонементы', pl_gen: 'абонементов', pl_dat: 'абонементам', pl_ins: 'абонементами', pl_prep: 'абонементах' },
    starter: { nom: 'Стартер пак', gen: 'Стартер пака', dat: 'Стартер паку', acc: 'Стартер пак', ins: 'Стартер паком', prep: 'Стартер паке',
               pl: 'Стартер паки', pl_gen: 'Стартер паков', pl_dat: 'Стартер пакам', pl_ins: 'Стартер паками', pl_prep: 'Стартер паках' },
    pass_line:    { nom: 'Абонемент' },
    starter_line: { nom: 'Стартер пак' },
  },
  en: {
    pass:    { nom: 'Class Pass', pl: 'Class Passes' },
    starter: { nom: 'Starter Pack', pl: 'Starter Packs' },
    pass_line:    { nom: 'Class Pass' },
    starter_line: { nom: 'Starter Pack' },
  },
  el: {
    // Согласовано владелицей: в греческой версии — латиницей, как бренд (средний род: «το Class Pass»).
    pass:    { nom: 'Class Pass', pl: 'Class Pass' },
    starter: { nom: 'Starter Pack', pl: 'Starter Pack' },
    pass_line:    { nom: 'Class Pass' },
    starter_line: { nom: 'Starter Pack' },
  },
};
window.SVS_TERMS = SVS_TERMS;

// ── Цены и VIBES: единый источник цифр ───────────────────────────────────────
// Все цены, VIBES, сроки и бонусы — ТОЛЬКО здесь. В текстах (переводы ниже, HTML
// страниц /vibes и /pricing, meta, JSON-LD) вместо цифр стоят токены %%…%%:
//   %%class%%        → 20 (VIBES за обычное занятие)    %%dropin%%  → €20 (разовое)
//   %%MP8.price%%    → €130 (%%MP8.price_n%% → 130, для <sup>€</sup>; так же %%dropin_n%%, %%topup_n%%)   %%MP8.vibes%% → 160   %%MP8.days%% → 60   %%MP8.classes%% → 8
//   %%MP8.per%%      → €16,25 (цена одного занятия)  %%MP8.save%% → 19% (выгода к разовому)
//   %%MP8.save_eur%% → €30 (экономия в евро к разовым)
//   %%MP8.full%%     → €160 (те же занятия по разовой цене)
//   %%min_per%% / %%max_save%% — лучшая цена занятия / выгода по абонементам (MP)
//   %%bonus.friend%% / %%bonus.birthday%% — VIBES в подарок
//   %%ex.plan%% %%ex.price%% %%ex.base%% %%ex.bonus%% %%ex.total%% %%ex.classes%% %%ex.classes_word%% %%ex.per%% — пример на /vibes
//   %%topup%% → €1 (за 1 VIBE)  %%refund%% → €0,75  %%freeze%% → 90 (дней заморозки)
// В HTML токены раскрывает tools/prices.py при сборке (build.sh), в переводах — svsExpandPrices().
// Дробные цифры в HTML вне переводов оборачивайте в <span data-price="MP8.per">%%MP8.per%%</span> —
// i18n.js перепишет их на языке страницы (€16.25 → €16,25).
// Выгода округляется до целого процента, ровно половина — вниз (не завышаем: 12,5% → 12%).
// Блок между маркерами — строгий JSON (его читает tools/prices.py).
const SVS_PRICES = /*prices:start*/{
  "class_vibes": 20,
  "dropin_eur": 20,
  "topup_eur_per_vibe": 1,
  "refund_eur_per_vibe": 0.75,
  "freeze_max_days": 90,
  "plans": {
    "MP4":  { "kind": "pass",    "price": 70,  "vibes": 80,  "days": 30 },
    "MP8":  { "kind": "pass",    "price": 130, "vibes": 160, "days": 60 },
    "MP12": { "kind": "pass",    "price": 190, "vibes": 240, "days": 90 },
    "MP20": { "kind": "pass",    "price": 300, "vibes": 400, "days": 120 },
    "SP1":  { "kind": "starter", "price": 15,  "vibes": 20,  "days": 30 },
    "SP2":  { "kind": "starter", "price": 20,  "vibes": 40,  "days": 30 },
    "SP4":  { "kind": "starter", "price": 40,  "vibes": 80,  "days": 30 }
  },
  "bonus": { "friend": 7, "birthday": 10 },
  "example": { "plan": "MP20", "bonuses": ["friend", "birthday"] }
}/*prices:end*/;
window.SVS_PRICES = SVS_PRICES;

// «21 занятие», «22 занятия», «25 занятий» — слово после числа занятий.
function svsClassWord(n, lang) {
  if (lang === 'ru') {
    var m10 = n % 10, m100 = n % 100;
    return (m10 === 1 && m100 !== 11) ? 'занятие' : (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) ? 'занятия' : 'занятий';
  }
  if (lang === 'el') return n === 1 ? 'μάθημα' : 'μαθήματα';
  return n === 1 ? 'class' : 'classes';
}

// Значения токенов %%…%% для языка lang (ru/el — десятичная запятая).
function svsPriceValues(lang) {
  var P = SVS_PRICES, dec = lang === 'en' ? '.' : ',';
  function eur(x) {
    var r = Math.round(x * 100) / 100;
    return '€' + (r % 1 === 0 ? String(r) : r.toFixed(2).replace('.', dec));
  }
  function pct(x) { return Math.ceil(x - 0.5) + '%'; }
  function num(x) { return eur(x).slice(1); }
  var v = { 'class': P.class_vibes, dropin: eur(P.dropin_eur), dropin_n: num(P.dropin_eur),
            topup: eur(P.topup_eur_per_vibe), topup_n: num(P.topup_eur_per_vibe),
            refund: eur(P.refund_eur_per_vibe), freeze: P.freeze_max_days };
  var minPer = Infinity, maxSave = 0;
  Object.keys(P.plans).forEach(function (code) {
    var p = P.plans[code], classes = p.vibes / P.class_vibes, full = classes * P.dropin_eur;
    var per = p.price / classes, save = (full - p.price) / full * 100;
    v[code + '.price'] = eur(p.price); v[code + '.price_n'] = num(p.price); v[code + '.vibes'] = p.vibes; v[code + '.days'] = p.days;
    v[code + '.classes'] = classes; v[code + '.per'] = eur(per); v[code + '.save'] = pct(save);
    v[code + '.save_eur'] = eur(full - p.price);
    v[code + '.full'] = eur(full);
    // Для сравнения «абонемент vs обычное пополнение той же суммы» (/vibes, главная).
    var tv = Math.floor(p.price / P.topup_eur_per_vibe);
    v[code + '.topup_vibes'] = tv; v[code + '.topup_classes'] = Math.floor(tv / P.class_vibes);
    if (p.kind === 'pass') { minPer = Math.min(minPer, per); maxSave = Math.max(maxSave, save); }
  });
  v.min_per = eur(minPer); v.max_save = pct(maxSave);
  Object.keys(P.bonus).forEach(function (k) { v['bonus.' + k] = P.bonus[k]; });
  var ex = P.plans[P.example.plan], bonus = 0;
  P.example.bonuses.forEach(function (k) { bonus += P.bonus[k]; });
  var total = ex.vibes + bonus;
  v['ex.plan'] = P.example.plan; v['ex.price'] = eur(ex.price); v['ex.base'] = ex.vibes;
  v['ex.bonus'] = bonus; v['ex.total'] = total; v['ex.classes'] = Math.floor(total / P.class_vibes);
  v['ex.per'] = eur(Math.round(ex.price / (total / P.class_vibes) * 10) / 10);
  v['ex.classes_word'] = svsClassWord(v['ex.classes'], lang);
  return v;
}
window.svsPriceValues = svsPriceValues;
window.svsClassWord = svsClassWord;

// Подставляет цифры в строку: '%%MP20.per%%' → '€15'. Неизвестный токен остаётся как есть.
function svsExpandPrices(str, lang) {
  if (typeof str !== 'string' || str.indexOf('%%') < 0) return str;
  var v = svsPriceValues(lang);
  return str.replace(/%%([A-Za-z0-9_.]+)%%/g, function (m, k) { return v[k] !== undefined ? String(v[k]) : m; });
}
window.svsExpandPrices = svsExpandPrices;

// Подставляет термины в строку: '{{pass:gen}}' → 'абонемента'.
function svsExpandTerms(str, lang) {
  if (typeof str !== 'string' || str.indexOf('{{') < 0) return str;
  return str.replace(/\{\{([A-Za-z_]+)(?::([a-z_]+))?\}\}/g, function (m, key, form) {
    var k = key.toLowerCase();
    var e = (SVS_TERMS[lang] && SVS_TERMS[lang][k]) || SVS_TERMS.en[k];
    if (!e) return m;
    var v = e[form || 'nom'] || e.nom;
    return key.charAt(0) !== key.charAt(0).toLowerCase() ? v.charAt(0).toUpperCase() + v.slice(1) : v;
  });
}
window.svsExpandTerms = svsExpandTerms;

const SVS_TRANSLATIONS = {
  en: {
    // ── Nav ──
    nav_home:       'Home',
    nav_about:      'About',
    nav_schedule:   'Schedule',
    nav_classes:    'Classes',
    nav_space:      'Space',
    nav_contact:    'Contact',
    nav_account:    'My Account',
    nav_signin:     'Sign In',
    btn_book_now:   'Book a class',
    btn_book_float: 'Book now',

    // ── Hero ──
    hero_eyebrow:   'Yoga Studio in Limassol, Cyprus',
    hero_title:     'Yoga &amp;<br>Co-working',
    hero_subtitle:  'Movement, mindfulness and community — in one conscious space.',
    hero_cta1:      'Explore practices',
    hero_cta2:      'Book a class',

    // ── About ──
    about_eyebrow:      'Who we are',
    about_title:        'Looking for a yoga studio in Limassol?',
    about_title_full:   'About Soul Vibe Space',
    about_story_title:  'A space born from intention',
    about_story_p1:     'We created Soul Vibe Space as a response to the need for a truly multifunctional wellness space in Limassol — a place that brings together diverse practices, teachers, and communities under one roof.',
    about_story_p2:     'From gentle morning yoga to ecstatic dance, from sound healing sessions to mindful co-working — everything at Soul Vibe Space is designed to help you feel more present, connected, and alive.',
    about_story_p3:     'Located at 50 Agias Zonis, Limassol, our studio holds classes every day from 8 am to 10 pm. We welcome beginners and experienced practitioners alike.',
    stat_practitioners: 'Happy practitioners',
    stat_classes_num:   '7',
    stat_classes_label: 'Days a week',
    stat_teachers_num:  '19',
    stat_teachers_label:'Teachers',
    stat_since_num:     '2022',
    stat_since_label:   'Founded',
    about_values_title: 'What we stand for',
    value1_title:       'Daily practice',
    value1_text:        'We believe wellness is a daily commitment, not a weekend luxury. That\'s why we\'re open 7 days a week with a rich schedule of classes for every level.',
    value2_title:       'Community first',
    value2_text:        'A studio is only as vibrant as its people. We cultivate a warm, inclusive community where every practitioner feels at home.',
    value3_title:       'Intentional space',
    value3_text:        'Every detail of our studio is designed to support your practice, creativity, and inner calm.',
    team_eyebrow:       'Our teachers',
    team_title:         'Meet the instructors',
    team_lead:          'Our team of experienced practitioners brings heart, expertise and dedication to every class.',
    about_cta_band_title: 'Ready to join us?',
    about_cta_band_sub:   'Book your first class today — no experience needed.',
    // ── Contact page extra ──
    contact_block_address: 'Address',
    contact_hours_title:   'Opening hours',
    contact_hours_days:    'Monday – Sunday',
    contact_open_maps:     'Open in Google Maps',
    form_intro_p:          'Have a question about a class, pricing, or anything else? Fill in the form and we\'ll get back to you within 24 hours.',
    form_success_msg:      'Your message has been sent. We\'ll be in touch soon!',
    about_p1:           'Soul Vibe Space is a yoga and wellness studio in Limassol offering yoga classes, meditation, ecstatic dance and sound healing.',
    about_p2:           'We\'ve created a multifunctional space for movement, mindfulness and community connection — a place where people feel inspired, connected, and at home.',
    about_badge_num:    '700+',
    about_badge_label:  'Happy practitioners',
    feature1_title:     'Daily Classes',
    feature1_text:      'Yoga, meditation, sound healing and more — 7 days a week',
    feature2_title:     'All Levels Welcome',
    feature2_text:      'Beginners and experienced practitioners alike',
    feature3_title:     '50 Agias Zonis, Limassol',
    feature3_text:      'Classes daily, 8am–10pm',
    about_cta:          'Learn more',

    // ── Schedule ──
    schedule_eyebrow:   'Live schedule',
    schedule_title:     'Upcoming classes',
    schedule_lead:      'Real-time schedule straight from our booking system — updated automatically.',
    schedule_subtitle:  'Real-time from the studio — updated automatically.',
    schedule_today:     'Today',
    schedule_filter_cat:  'Category',
    schedule_filter_inst: 'Instructor',
    schedule_week_title: 'Weekly classes',
    schedule_view_week:  'Week',
    schedule_view_month: 'Month',
    schedule_view_aria:  'Schedule view',
    schedule_prev_week:  'Previous week',
    schedule_next_week:  'Next week',
    schedule_prev_month: 'Previous month',
    schedule_next_month: 'Next month',
    schedule_more:       '+{n} more',
    schedule_no_classes_day:   'No classes on this day',
    schedule_no_classes_month: 'No classes this month. Try changing the filters or pick another month.',
    schedule_all_instructors:  'All instructors',

    // ── Classes ──
    classes_eyebrow:    'What we offer',
    classes_title:      'Classes at Soul Vibe Space',
    classes_lead:       'Yoga, sound healing, ecstatic dance and more — all classes come directly from our studio schedule.',
    classes_cta:        'View all classes & book →',
    home_vibes_prices:     'See prices',
    home_vibes_cta:        'How VIBES work',
    home_vibes_text:       'Every guest has a VIBES balance. A {{pass}} tops it up at a better rate: %%MP20.vibes%% VIBES instead of %%MP20.topup_vibes%% for the same amount. And regular visits earn you gift VIBES.',
    home_vibes_title:      'Make more room for practice',
    home_vibes_eyebrow:    'VIBES · your balance for classes',
    classes_cat_all:    'All',

    // ── Quote ──
    visual_quote:       '"A place where people feel inspired, connected, and at home."',

    // ── Space ──
    space_eyebrow:      'More than yoga',
    space_title:        'A space for<br>work & creativity',
    space_studio_eyebrow: 'The studio',
    space_studio_title: 'Where practice comes alive',
    space_studio_p1:    'Our main studio space is designed to support a wide range of movement and mindfulness practices — from quiet morning yoga to energetic ecstatic dance and immersive sound baths.',
    space_studio_p2:    'High ceilings, natural light, and quality flooring create the perfect environment for your practice.',
    space_cowork_eyebrow: 'Co-working',
    space_cowork_title: 'Work mindfully',
    space_cowork_p1:    'Between classes, our co-working area offers a calm, inspiring environment to focus, create, or connect with others in the community.',
    space_cowork_p2:    'With a coffee point, SMART TV, and fast Wi-Fi, it\'s everything you need to be productive — in a space that feels completely different from a regular office.',
    amenities_title:    'Facilities & amenities',
    space_feat5_title:  'Yoga Props',
    space_feat5_text:   'Mats, blocks and straps provided',
    space_feat6_title:  'Free Wi-Fi',
    space_feat6_text:   'High-speed internet throughout',
    space_feat7_title:  'Open Daily',
    space_feat8_title:  'Central Location',
    space_feat8_text:   '50 Agias Zonis, Limassol',
    space_hours_detail: 'Classes daily · 8:00 am – 10:00 pm · Administrator 2:00 pm – 10:00 pm',
    space_cta_title:    'Ready to experience it yourself?',
    space_cta_sub:      'Book a class and come see the space for yourself.',
    space_p:            'Soul Vibe Space also includes a creative co-working area where guests can work, relax and connect with a mindful community.',
    space_feat1_title:  'Coffee Point',
    space_feat1_text:   'Self-service coffee and tea',
    space_feat2_title:  'SMART TV',
    space_feat2_text:   'For presentations or group sessions',
    space_feat3_title:  'Changing Rooms & Showers',
    space_feat3_text:   'Refresh after your practice',
    space_feat4_title:  'Premises for Rent',
    space_feat4_text:   'Workshops, meetings and events',
    space_hours:        'Classes every day, 8:00 am – 10:00 pm',

    // ── Gift ──
    gift_title:         'Give the gift of wellness',
    gift_text:          'Treat someone special to a yoga class, sound healing session or wellness experience at Soul Vibe Space.',
    gift_cta:           'Gift Certificates',

    // ── Contact ──
    contact_eyebrow:    'Get in touch',
    contact_title:      'Ready to begin?',
    contact_p:          "Book a class, ask a question, or just say hello. We'd love to hear from you.",
    contact_address:    '50 Agias Zonis, Limassol 3090, Cyprus',
    contact_whatsapp:   'WhatsApp',
    contact_book_p:     'Book directly via our booking platform:',
    contact_book_btn:   'Book a class →',
    form_title:         'Send us a message',
    form_firstname:     'First Name',
    form_lastname:      'Last Name',
    form_email:         'Email',
    form_message:       'Message',
    form_submit:        'Send message',
    ph_firstname:       'Anna',
    ph_lastname:        'Smith',
    ph_email:           'anna@example.com',
    ph_message:         "I'd like to join a yoga class...",

    // ── Footer ──
    footer_tagline:     'Movement, mindfulness and community in Limassol, Cyprus.',
    footer_studio:      'Studio',
    footer_about:       'About',
    footer_practices:   'Practices',
    footer_coworking:   'Co-working',
    footer_gift:        'Gift Certificates',
    footer_book:        'Book a class',
    footer_visit:       'Visit us',
    footer_hours:       'Classes: daily 8:00 am – 10:00 pm',
    footer_copy:        '© 2026 Soul Vibe Space LTD',

    // ── Account page ──
    acc_tab_login:      'Sign In',
    acc_tab_register:   'Create Account',
    auth_name:          'Full Name',
    auth_password:      'Password',
    auth_phone:         'Phone',
    auth_or:            'or',
    acc_login_title:    'Welcome back',
    acc_login_sub:      'Sign in to your Soul Vibe Space account',
    acc_reg_title:      'Join Soul Vibe Space',
    acc_reg_sub:        'Create your account to manage bookings',
    acc_label_email:    'Email',
    acc_label_password: 'Password',
    acc_label_name:     'Full Name',
    acc_label_phone:    'Phone',
    acc_btn_login:      'Sign In',
    acc_btn_register:   'Create Account',
    consent_terms:      'I have read and agree to the <a class="auth-consent-link" href="/terms" target="_blank" rel="noopener">Terms &amp; Conditions</a> and acknowledge the <a class="auth-consent-link" href="/privacy" target="_blank" rel="noopener">Privacy Policy</a>. <span class="req">*</span>',
    consent_newsletter: 'I agree to receive news, offers and updates from Soul Vibe Space by email.',
    err_fill_required:  'Please fill in all required fields.',
    err_terms_required: 'Please agree to the Terms & Conditions and Privacy Policy to continue.',
    err_required:        'This field is required.',
    err_invalid_email:   'Please enter a valid email address.',
    err_invalid_phone:   'Please enter a valid phone number.',
    err_password_length: 'Password must be at least 6 characters.',
    acc_register_success: 'Account created! Welcome to Soul Vibe Space.',
    err_register_failed: 'Registration failed. Please try again or write to us on WhatsApp.',
    err_network:         'No connection to the server. Check your internet and try again.',
    err_reg_exists:      'This email is already in our system. Try signing in on the Sign In tab, or write to us and we will help.',
    err_reg_phone_mismatch: 'You are already in our studio records. Enter the phone number the studio has on file and we will link this email to your existing card — or sign in with your existing password.',
    err_password_mismatch: 'Passwords do not match.',
    acc_label_password_confirm: 'Confirm Password',
    acc_ph_password_confirm:    'Repeat your password',
    acc_forgot_link:    'Forgot password?',
    acc_forgot_title:   'Reset your password',
    acc_forgot_sub:     "Enter your email and we'll send you a link to reset your password",
    acc_forgot_info:    'Enter the email associated with your account.',
    acc_btn_forgot:      'Send reset link',
    acc_back_to_login:  '← Back to sign in',
    acc_forgot_success: "If an account exists for that email, we've sent password reset instructions.",
    acc_ph_email:       'your@email.com',
    acc_ph_password:    'Your password',
    acc_ph_newpassword: 'Create a password',
    acc_ph_name:        'Your name',
    acc_ph_phone:       '+357 ...',
    acc_upcoming:       'Upcoming',
    bday_title: 'Date of birth',
    bday_intro: 'Add your date of birth — on your birthday we will add 10 VIBES as a gift. They arrive automatically once a year, if the date is entered in advance.',
    bday_once: 'The date can be set only once.',
    bday_save: 'Save',
    bday_confirm_q: 'Save {d}? After that, only the studio administrator can change the date.',
    bday_confirm: 'Yes, save',
    bday_edit: 'Change',
    bday_bonus_hint: 'On your birthday you get 10 VIBES as a gift — automatically, once a year.',
    bday_locked: 'To change the date, please contact the studio administrator.',
    bday_saved: 'Date of birth saved.',
    bday_err_invalid: 'Please enter a valid date of birth.',
    bday_err_age: 'Please check the date: age must be between 10 and 100.',
    bday_err_already: 'Your date of birth is already set. To change it, please contact the studio administrator.',
    bday_err_fail: 'Could not save. Please try again later.',
    vibes_title: 'My VIBES',
    vibes_classes_left: '≈ {n} classes',
    vibes_classes_left_one: '≈ {n} class',
    vibes_classes_left_other: '≈ {n} classes',
    vibes_rate: '1 class = %%class%% VIBES',
    vibes_active: 'Active {{pass:pl}} and {{starter:pl}}',
    vibes_no_active: 'No active {{pass}} or {{starter}}.',
    vibes_until: 'valid until {d}',
    vibes_no_expiry: 'no expiry date',
    vibes_first_visit: 'term: {days} from the first visit',
    vibes_multipass: '{{pass_line}}',
    vibes_starter: '{{starter_line}}',
    vibes_src_bonus: 'Gift VIBES',
    vibes_src_manual: 'Gift VIBES',
    vibes_src_reward_friend: 'Referral bonus',
    vibes_src_birthday: 'Birthday bonus',
    vibes_src_activity_bonus: 'Gift VIBES for regular practice',
    act_title: 'Regular practice',
    act_months_in: 'January,February,March,April,May,June,July,August,September,October,November,December',
    act_months: 'January,February,March,April,May,June,July,August,September,October,November,December',
    act_visits: 'In {in} you have been to class {n} {times}.',
    act_visits_zero: 'In {in} you have not been to class yet.',
    act_times_one: 'time',
    act_times_other: 'times',
    act_visit_one: 'visit',
    act_visit_other: 'visits',
    act_next_first: '{r} more and you get +{v} VIBES.',
    act_next_zero: '{r} {visits} and you get +{v} VIBES.',
    act_next_more: '+{e} VIBES secured, {r} more to +{v}.',
    act_max: 'You’ll get the maximum: +{v} VIBES for {mon}.',
    act_credit: 'VIBES will be credited automatically on {date}.',
    act_rule: '{a}–{b} visits a month — +{x} VIBES, {c} or more — +{y} VIBES in total. Gift VIBES never expire.',
    act_history: 'Previous months',
    act_bar_label: 'Visits this month: {n} of {max}',
    vibes_src_visit_refund: 'VIBES returned for a cancelled visit',
    vibes_tx_visit: 'Class visit',
    vibes_tx_expiry: 'Expired',
    vibes_tx_refund: 'Refund',
    vibes_tx_deposit: 'Top-up',
    vibes_freezes: 'Freeze',
    vibes_freeze_active: 'active now',
    vibes_freeze_scheduled: 'scheduled',
    vibes_days: 'days',
    vibes_history: 'History',
    vibes_no_history: 'No operations yet.',
    vibes_show_all: 'Show all',
    vibes_show_less: 'Show less',
    vibes_visits: 'Recent visits',
    vibes_unavailable: 'VIBES are temporarily unavailable. Please try again later.',
    vibes_verify_email: 'To see your VIBES, sign in with Google using the email you gave the studio.',
    vibes_ambiguous: 'We found more than one studio card with your email. Please contact the studio so we can link the right one.',
    vibes_not_found: 'You have no VIBES yet. Buy a {{pass}} at the studio (new clients can start with a one-time {{starter}}) — your balance will appear here.',
    vibes_ev_intro: 'Confirm your email to see your VIBES. We will send a 6-digit code to {email}.',
    vibes_ev_send: 'Send code',
    vibes_ev_code: 'Code from the email',
    vibes_ev_confirm: 'Confirm',
    vibes_ev_resend: 'Send the code again',
    vibes_ev_resend_in: 'Send again in {s} s',
    vibes_ev_sent: 'Code sent. Check your inbox (and the Spam folder).',
    vibes_ev_too_many: 'Too many codes requested. Please try again in an hour.',
    vibes_ev_send_fail: 'Could not send the email. Please try again later.',
    vibes_ev_6digits: 'Enter the 6 digits from the email.',
    vibes_ev_wrong: 'Wrong code. Please check and try again.',
    vibes_ev_expired: 'The code has expired. Please request a new one.',
    fz_title: 'Freeze request',
    fz_open: 'Freeze Class Pass',
    fz_status_pending: 'Under review',
    fz_status_approved: 'Approved',
    fz_status_rejected: 'Declined',
    fz_sent_on: 'sent {d}',
    fz_dates_changed: 'The studio adjusted the dates you asked for ({d}).',
    fz_pending_note: 'We will email you when an administrator reviews it.',
    fz_admin_comment: 'Comment from the studio',
    fz_modal_title: 'Freeze your Class Pass',
    fz_close: 'Close',
    fz_period: 'Period',
    fz_preset_days: '{n} days',
    fz_preset_custom: 'Custom dates',
    fz_start: 'Start',
    fz_end: 'End',
    fz_summary: '{n} days: {from} – {to}',
    fz_reason: 'Reason',
    fz_reason_illness: 'Illness or injury',
    fz_reason_travel: 'Travel',
    fz_reason_other: 'Other',
    fz_comment: 'Comment (optional)',
    fz_comment_ph: 'Anything the studio should know',
    fz_rule_1: 'Your active Class Passes are extended by the number of freeze days; your VIBES balance does not change.',
    fz_rule_2: 'The freeze starts today at the earliest and lasts up to {n} days.',
    fz_rule_3: 'An administrator reviews the request and you get the decision by email. Only one request can be under review at a time.',
    fz_cancel: 'Cancel',
    fz_submit: 'Send request',
    fz_sending: 'Sending…',
    fz_sent: 'Request sent. We have emailed you a confirmation.',
    fz_err_dates: 'Check the dates: the end cannot be before the start.',
    fz_err_past: 'The freeze cannot start in the past.',
    fz_err_far: 'The start date can be at most {n} days from today.',
    fz_err_long: 'A freeze can last at most {n} days.',
    fz_err_reason: 'Choose a reason.',
    fz_err_pending: 'You already have a request under review.',
    fz_err_generic: 'Could not send the request. Please try again later.',
    acc_all:            'All bookings',
    acc_book_class:     'Book a Class',
    acc_contact:        'Contact Us',
    acc_all_classes:    'All Classes',
    acc_signout:        'Sign Out',
    acc_no_upcoming:    'No upcoming bookings',
    acc_no_all:         'No bookings yet',
    acc_book_first:     'Book your first class →',
    acc_section_bookings: 'My Bookings',
    acc_action_bookclass: 'Book a Class',
    acc_action_contact:   'Contact Us',
    acc_action_classes:   'All Classes',
  },

  ru: {
    // ── Nav ──
    nav_home:       'Главная',
    nav_about:      'О нас',
    nav_schedule:   'Расписание',
    nav_classes:    'Занятия',
    nav_space:      'Пространство',
    nav_contact:    'Контакты',
    nav_account:    'Мой кабинет',
    nav_signin:     'Войти',
    btn_book_now:   'Записаться',
    btn_book_float: 'Записаться',

    // ── Hero ──
    hero_eyebrow:   'Йога-студия в Лимасоле, Кипр',
    hero_title:     'Йога &amp;<br>Коворкинг',
    hero_subtitle:  'Движение, осознанность и сообщество — в одном пространстве.',
    hero_cta1:      'Наши практики',
    hero_cta2:      'Записаться',

    // ── About ──
    about_eyebrow:      'Кто мы',
    about_title:        'Ищете йога-студию в Лимасоле?',
    about_title_full:   'O Soul Vibe Space',
    about_story_title:  'Пространство, рождённое с намерением',
    about_story_p1:     'Мы создали Soul Vibe Space как ответ на потребность в полноценном велнес-пространстве в Лимасоле — месте, где собираются разные практики, преподаватели и сообщества.',
    about_story_p2:     'От утренней йоги до экстатического танца, от звукотерапии до осознанного коворкинга — всё в Soul Vibe Space создано, чтобы вы чувствовали себя живыми и связанными.',
    about_story_p3:     'Студия находится по адресу: ул. Агиас Зонис, 50, Лимасол. Занятия проходят ежедневно с 8:00 до 22:00.',
    stat_practitioners: 'Счастливых практиков',
    stat_classes_num:   '7',
    stat_classes_label: 'Дней в неделю',
    stat_teachers_num:  '19',
    stat_teachers_label:'Преподавателей',
    stat_since_num:     '2022',
    stat_since_label:   'Год основания',
    about_values_title: 'Наши ценности',
    value1_title:       'Ежедневная практика',
    value1_text:        'Мы верим, что велнес — это ежедневная практика, а не роскошь на выходных. Поэтому мы работаем 7 дней в неделю с богатым расписанием для любого уровня.',
    value2_title:       'Сообщество на первом месте',
    value2_text:        'Студия — это люди. Мы создаём тёплое, включающее сообщество, где каждый — от начинающего до опытного — чувствует себя дома.',
    value3_title:       'Осознанное пространство',
    value3_text:        'Каждая деталь нашей студии создана, чтобы поддерживать вашу практику, творчество и внутреннее спокойствие.',
    team_eyebrow:       'Наши преподаватели',
    team_title:         'Познакомьтесь с инструкторами',
    team_lead:          'Наша команда опытных практиков несёт душу, экспертизу и преданность в каждое занятие.',
    about_cta_band_title: 'Готовы присоединиться?',
    about_cta_band_sub:   'Запишитесь на первое занятие сегодня — опыт не нужен.',
    // ── Contact page extra ──
    contact_block_address: 'Адрес',
    contact_hours_title:   'Часы работы',
    contact_hours_days:    'Понедельник – Воскресенье',
    contact_open_maps:     'Открыть в Google Maps',
    form_intro_p:          'Есть вопрос о занятии, ценах или чём-то ещё? Заполните форму — мы ответим в течение 24 часов.',
    form_success_msg:      'Ваше сообщение отправлено. Мы свяжемся с вами в ближайшее время!',
    about_p1:           'Soul Vibe Space — это студия йоги и велнеса в Лимасоле: занятия йогой, медитация, экстатический танец и звукотерапия.',
    about_p2:           'Мы создали многофункциональное пространство для движения, осознанности и общения — место, где люди чувствуют вдохновение, связь и уют.',
    about_badge_num:    '700+',
    about_badge_label:  'Счастливых практиков',
    feature1_title:     'Ежедневные занятия',
    feature1_text:      'Йога, медитация, звукотерапия и многое другое — 7 дней в неделю',
    feature2_title:     'Для любого уровня',
    feature2_text:      'Начинающие и опытные практики одинаково приветствуются',
    feature3_title:     'ул. Агиас Зонис, 50, Лимасол',
    feature3_text:      'Занятия ежедневно, 8:00–22:00',
    about_cta:          'Узнать больше',

    // ── Schedule ──
    schedule_eyebrow:   'Живое расписание',
    schedule_title:     'Ближайшие занятия',
    schedule_lead:      'Актуальное расписание прямо из нашей системы записи — обновляется автоматически.',
    schedule_subtitle:  'В реальном времени из студии — обновляется автоматически.',
    schedule_today:     'Сегодня',
    schedule_filter_cat:  'Категория',
    schedule_filter_inst: 'Инструктор',
    schedule_week_title: 'Недельное расписание',
    schedule_view_week:  'Неделя',
    schedule_view_month: 'Месяц',
    schedule_view_aria:  'Вид расписания',
    schedule_prev_week:  'Предыдущая неделя',
    schedule_next_week:  'Следующая неделя',
    schedule_prev_month: 'Предыдущий месяц',
    schedule_next_month: 'Следующий месяц',
    schedule_more:       'ещё {n}',
    schedule_no_classes_day:   'В этот день занятий нет',
    schedule_no_classes_month: 'В этом месяце занятий нет. Попробуйте сменить фильтр или выбрать другой месяц.',
    schedule_all_instructors:  'Все преподаватели',

    // ── Classes ──
    classes_eyebrow:    'Что мы предлагаем',
    classes_title:      'Занятия в Soul Vibe Space',
    classes_lead:       'Йога, звукотерапия, экстатический танец и многое другое — все занятия из реального расписания студии.',
    classes_cta:        'Все занятия и запись →',
    home_vibes_prices:     'Посмотреть цены',
    home_vibes_cta:        'Как работают VIBES',
    home_vibes_text:       'У каждого гостя есть баланс VIBES. С {{pass:ins}} он пополняется выгоднее: %%MP20.vibes%% VIBES вместо %%MP20.topup_vibes%% за ту же сумму. А за регулярные посещения студия дарит VIBES.',
    home_vibes_title:      'Больше практики в вашей жизни',
    home_vibes_eyebrow:    'VIBES · ваш баланс для занятий',
    classes_cat_all:    'Все',

    // ── Quote ──
    visual_quote:       '«Место, где люди чувствуют вдохновение, связь и уют.»',

    // ── Space ──
    space_eyebrow:      'Больше, чем йога',
    space_title:        'Пространство для<br>работы и творчества',
    space_studio_eyebrow: 'Студия',
    space_studio_title: 'Где практика оживает',
    space_studio_p1:    'Наш зал создан для широкого спектра практик — от утренней йоги до экстатического танца и звуковых ванн.',
    space_studio_p2:    'Высокие потолки, естественный свет и качественное покрытие — идеальная среда для практики.',
    space_cowork_eyebrow: 'Коворкинг',
    space_cowork_title: 'Работа в осознанном пространстве',
    space_cowork_p1:    'Между занятиями наш коворкинг даёт спокойную вдохновляющую среду для фокуса, творчества и общения.',
    space_cowork_p2:    'Кофе-пойнт, SMART TV и быстрый Wi-Fi — всё для продуктивной работы в уникальном пространстве.',
    amenities_title:    'Удобства и сервисы',
    space_feat5_title:  'Инвентарь йоги',
    space_feat5_text:   'Коврики, блоки и ремни',
    space_feat6_title:  'Бесплатный Wi-Fi',
    space_feat6_text:   'Быстрый интернет по всей студии',
    space_feat7_title:  'Открыто ежедневно',
    space_feat8_title:  'Центральное расположение',
    space_feat8_text:   'ул. Агиас Зонис, 50, Лимасол',
    space_hours_detail: 'Занятия ежедневно · 8:00–22:00 · Администратор 14:00–22:00',
    space_cta_title:    'Готовы почувствовать это сами?',
    space_cta_sub:      'Запишитесь на занятие и приходите посмотреть.',
    space_p:            'Soul Vibe Space включает творческую зону коворкинга, где гости могут работать, отдыхать и общаться в осознанном сообществе.',
    space_feat1_title:  'Кофе-пойнт',
    space_feat1_text:   'Кофе и чай — самообслуживание',
    space_feat2_title:  'SMART TV',
    space_feat2_text:   'Для презентаций и групповых занятий',
    space_feat3_title:  'Раздевалки и душевые',
    space_feat3_text:   'Освежитесь после практики',
    space_feat4_title:  'Аренда помещений',
    space_feat4_text:   'Воркшопы, встречи и мероприятия',
    space_hours:        'Занятия ежедневно, 8:00–22:00',

    // ── Gift ──
    gift_title:         'Подарите велнес',
    gift_text:          'Порадуйте близкого йога-занятием, сеансом звукотерапии или велнес-опытом в Soul Vibe Space.',
    gift_cta:           'Подарочные сертификаты',

    // ── Contact ──
    contact_eyebrow:    'Свяжитесь с нами',
    contact_title:      'Готовы начать?',
    contact_p:          'Запишитесь на занятие, задайте вопрос или просто поздоровайтесь. Будем рады вас видеть!',
    contact_address:    'ул. Агиас Зонис, 50, Лимасол 3090, Кипр',
    contact_whatsapp:   'WhatsApp',
    contact_book_p:     'Записывайтесь напрямую через нашу платформу:',
    contact_book_btn:   'Записаться на занятие →',
    form_title:         'Напишите нам',
    form_firstname:     'Имя',
    form_lastname:      'Фамилия',
    form_email:         'Email',
    form_message:       'Сообщение',
    form_submit:        'Отправить',
    ph_firstname:       'Анна',
    ph_lastname:        'Иванова',
    ph_email:           'anna@example.com',
    ph_message:         'Хочу записаться на занятие...',

    // ── Footer ──
    footer_tagline:     'Движение, осознанность и сообщество в Лимасоле, Кипр.',
    footer_studio:      'Студия',
    footer_about:       'О нас',
    footer_practices:   'Практики',
    footer_coworking:   'Коворкинг',
    footer_gift:        'Подарочные сертификаты',
    footer_book:        'Записаться на занятие',
    footer_visit:       'Адрес и контакты',
    footer_hours:       'Занятия: ежедневно 8:00–22:00',
    footer_copy:        '© 2026 Soul Vibe Space LTD',

    // ── Account page ──
    acc_tab_login:      'Войти',
    acc_tab_register:   'Регистрация',
    auth_name:          'Имя',
    auth_password:      'Пароль',
    auth_phone:         'Телефон',
    auth_or:            'или',
    acc_login_title:    'С возвращением',
    acc_login_sub:      'Войдите в ваш аккаунт Soul Vibe Space',
    acc_reg_title:      'Присоединяйтесь к Soul Vibe Space',
    acc_reg_sub:        'Создайте аккаунт для управления бронированиями',
    acc_label_email:    'Email',
    acc_label_password: 'Пароль',
    acc_label_name:     'Полное имя',
    acc_label_phone:    'Телефон',
    acc_btn_login:      'Войти',
    acc_btn_register:   'Создать аккаунт',
    consent_terms:      'Я ознакомлен(а) и согласен(на) с <a class="auth-consent-link" href="/terms" target="_blank" rel="noopener">Условиями</a> и подтверждаю ознакомление с <a class="auth-consent-link" href="/privacy" target="_blank" rel="noopener">Политикой конфиденциальности</a>. <span class="req">*</span>',
    consent_newsletter: 'Я согласен(на) получать новости, специальные предложения и анонсы Soul Vibe Space по email.',
    err_fill_required:  'Пожалуйста, заполните все обязательные поля.',
    err_terms_required: 'Чтобы продолжить, отметьте согласие с Условиями и Политикой конфиденциальности.',
    err_required:        'Это поле обязательно.',
    err_invalid_email:   'Пожалуйста, введите корректный email.',
    err_invalid_phone:   'Пожалуйста, введите корректный номер телефона.',
    err_password_length: 'Пароль должен содержать не менее 6 символов.',
    acc_register_success: 'Аккаунт создан! Добро пожаловать в Soul Vibe Space.',
    err_register_failed: 'Не удалось зарегистрироваться. Попробуйте ещё раз или напишите нам в WhatsApp.',
    err_network:         'Нет связи с сервером. Проверьте интернет и попробуйте ещё раз.',
    err_reg_exists:      'Этот email уже есть в нашей системе. Попробуйте войти на вкладке «Вход» или напишите нам — поможем.',
    err_reg_phone_mismatch: 'Вы уже есть в базе студии. Введите телефон, который указан у нас в карточке, — и мы свяжем этот email с вашей карточкой. Или войдите со своим паролем.',
    err_password_mismatch: 'Пароли не совпадают.',
    acc_label_password_confirm: 'Подтвердите пароль',
    acc_ph_password_confirm:    'Повторите пароль',
    acc_forgot_link:    'Восстановить пароль',
    acc_forgot_title:   'Восстановление пароля',
    acc_forgot_sub:     'Введите email — мы отправим ссылку для восстановления пароля',
    acc_forgot_info:    'Введите email, привязанный к вашему аккаунту.',
    acc_btn_forgot:      'Отправить ссылку',
    acc_back_to_login:  '← Назад к входу',
    acc_forgot_success: 'Если аккаунт с таким email существует, мы отправили инструкции по восстановлению пароля.',
    acc_ph_email:       'your@email.com',
    acc_ph_password:    'Ваш пароль',
    acc_ph_newpassword: 'Создайте пароль',
    acc_ph_name:        'Ваше имя',
    acc_ph_phone:       '+357 ...',
    acc_upcoming:       'Предстоящие',
    bday_title: 'Дата рождения',
    bday_intro: 'Укажите дату рождения — в ваш день рождения мы начислим 10 VIBES в подарок. Они приходят раз в год автоматически, если дата указана заранее.',
    bday_once: 'Дату можно указать только один раз.',
    bday_save: 'Сохранить',
    bday_confirm_q: 'Сохранить дату {d}? Изменить её потом можно только через администратора студии.',
    bday_confirm: 'Да, сохранить',
    bday_edit: 'Изменить',
    bday_bonus_hint: 'В день рождения — 10 VIBES в подарок, раз в год автоматически.',
    bday_locked: 'Изменить дату можно через администратора студии.',
    bday_saved: 'Дата рождения сохранена.',
    bday_err_invalid: 'Укажите корректную дату рождения.',
    bday_err_age: 'Проверьте дату: возраст должен быть от 10 до 100 лет.',
    bday_err_already: 'Дата рождения уже указана. Изменить её можно через администратора студии.',
    bday_err_fail: 'Не удалось сохранить. Попробуйте позже.',
    vibes_title: 'Мои VIBES',
    vibes_classes_left: '≈ {n} занятий',
    vibes_classes_left_one: '≈ {n} занятие',
    vibes_classes_left_few: '≈ {n} занятия',
    vibes_classes_left_many: '≈ {n} занятий',
    vibes_classes_left_other: '≈ {n} занятия',
    vibes_rate: '1 занятие = %%class%% VIBES',
    vibes_active: 'Активные {{pass:pl}} и {{starter:pl}}',
    vibes_no_active: 'Активных {{pass:pl_gen}} и {{starter:pl_gen}} нет.',
    vibes_until: 'действует до {d}',
    vibes_no_expiry: 'без срока',
    vibes_first_visit: 'срок {days} с первого посещения',
    vibes_multipass: '{{pass_line}}',
    vibes_starter: '{{starter_line}}',
    vibes_src_bonus: 'VIBES в подарок',
    vibes_src_manual: 'VIBES в подарок',
    vibes_src_reward_friend: 'Бонус за друга',
    vibes_src_birthday: 'Бонус ко дню рождения',
    vibes_src_activity_bonus: 'VIBES в подарок за регулярную практику',
    act_title: 'Регулярная практика',
    act_months_in: 'январе,феврале,марте,апреле,мае,июне,июле,августе,сентябре,октябре,ноябре,декабре',
    act_months: 'январь,февраль,март,апрель,май,июнь,июль,август,сентябрь,октябрь,ноябрь,декабрь',
    act_visits: 'В {in} вы были на занятиях {n} {times}.',
    act_visits_zero: 'В {in} вы пока не были на занятиях.',
    act_times_one: 'раз',
    act_times_few: 'раза',
    act_times_many: 'раз',
    act_times_other: 'раза',
    act_visit_one: 'посещение',
    act_visit_few: 'посещения',
    act_visit_many: 'посещений',
    act_visit_other: 'посещения',
    act_next_first: 'Ещё {r} — и получите +{v} VIBES.',
    act_next_zero: '{r} {visits} — и получите +{v} VIBES.',
    act_next_more: '+{e} VIBES уже обеспечены, ещё {r} до +{v}.',
    act_max: 'Вы получите максимум: +{v} VIBES за {mon}.',
    act_credit: 'VIBES начислятся автоматически {date}.',
    act_rule: '{a}–{b} посещений за месяц — +{x} VIBES, {c} и больше — всего +{y} VIBES. VIBES в подарок не сгорают.',
    act_history: 'Прошлые месяцы',
    act_bar_label: 'Посещений в этом месяце: {n} из {max}',
    vibes_src_visit_refund: 'Возврат VIBES за отменённое посещение',
    vibes_tx_visit: 'Посещение занятия',
    vibes_tx_expiry: 'Сгорание',
    vibes_tx_refund: 'Возврат',
    vibes_tx_deposit: 'Пополнение',
    vibes_freezes: 'Заморозка',
    vibes_freeze_active: 'действует сейчас',
    vibes_freeze_scheduled: 'запланирована',
    vibes_days: 'дн.',
    vibes_history: 'История',
    vibes_no_history: 'Операций пока нет.',
    vibes_show_all: 'Показать все',
    vibes_show_less: 'Свернуть',
    vibes_visits: 'Последние посещения',
    vibes_unavailable: 'VIBES временно недоступны. Попробуйте позже.',
    vibes_verify_email: 'Чтобы увидеть VIBES, войдите через Google с той почтой, которую вы оставили в студии.',
    vibes_ambiguous: 'С вашей почтой найдено несколько карточек. Напишите в студию — мы привяжем нужную.',
    vibes_not_found: 'У вас пока нет VIBES. Купите {{pass}} в студии (новым клиентам — разовый {{starter}}), и баланс появится здесь.',
    vibes_ev_intro: 'Подтвердите почту, чтобы увидеть свои VIBES. Мы отправим 6-значный код на {email}.',
    vibes_ev_send: 'Отправить код',
    vibes_ev_code: 'Код из письма',
    vibes_ev_confirm: 'Подтвердить',
    vibes_ev_resend: 'Отправить код ещё раз',
    vibes_ev_resend_in: 'Отправить снова через {s} с',
    vibes_ev_sent: 'Код отправлен. Проверьте почту (и папку «Спам»).',
    vibes_ev_too_many: 'Слишком много запросов кода. Попробуйте через час.',
    vibes_ev_send_fail: 'Не удалось отправить письмо. Попробуйте позже.',
    vibes_ev_6digits: 'Введите 6 цифр из письма.',
    vibes_ev_wrong: 'Неверный код. Проверьте и попробуйте ещё раз.',
    vibes_ev_expired: 'Срок кода истёк. Запросите новый.',
    fz_title: 'Заявление на заморозку',
    fz_open: 'Заморозить абонемент',
    fz_status_pending: 'На рассмотрении',
    fz_status_approved: 'Одобрено',
    fz_status_rejected: 'Отклонено',
    fz_sent_on: 'отправлено {d}',
    fz_dates_changed: 'Студия скорректировала запрошенные даты ({d}).',
    fz_pending_note: 'Мы пришлём письмо, когда администратор рассмотрит заявление.',
    fz_admin_comment: 'Комментарий студии',
    fz_modal_title: 'Заморозка абонемента',
    fz_close: 'Закрыть',
    fz_period: 'Период',
    fz_preset_days: '{n} дней',
    fz_preset_custom: 'Свои даты',
    fz_start: 'Начало',
    fz_end: 'Окончание',
    fz_summary: '{n} дн.: {from} – {to}',
    fz_reason: 'Причина',
    fz_reason_illness: 'Болезнь или травма',
    fz_reason_travel: 'Поездка',
    fz_reason_other: 'Другое',
    fz_comment: 'Комментарий (необязательно)',
    fz_comment_ph: 'Что студии стоит знать',
    fz_rule_1: 'Срок действия активных абонементов продлится на число дней заморозки, баланс VIBES не меняется.',
    fz_rule_2: 'Начало — не раньше сегодняшнего дня, длительность — до {n} дней.',
    fz_rule_3: 'Заявление рассматривает администратор, решение придёт на почту. Одновременно на рассмотрении может быть только одно заявление.',
    fz_cancel: 'Отмена',
    fz_submit: 'Отправить заявление',
    fz_sending: 'Отправляем…',
    fz_sent: 'Заявление отправлено. Мы прислали подтверждение на почту.',
    fz_err_dates: 'Проверьте даты: окончание не может быть раньше начала.',
    fz_err_past: 'Заморозка не может начинаться в прошлом.',
    fz_err_far: 'Дата начала — не позже чем через {n} дней от сегодня.',
    fz_err_long: 'Заморозка может длиться не более {n} дней.',
    fz_err_reason: 'Выберите причину.',
    fz_err_pending: 'У вас уже есть заявление на рассмотрении.',
    fz_err_generic: 'Не удалось отправить заявление. Попробуйте позже.',
    acc_all:            'Все бронирования',
    acc_book_class:     'Записаться',
    acc_contact:        'Написать нам',
    acc_all_classes:    'Все занятия',
    acc_signout:        'Выйти',
    acc_no_upcoming:    'Предстоящих бронирований нет',
    acc_no_all:         'Бронирований пока нет',
    acc_book_first:     'Записаться на первое занятие →',
    acc_section_bookings: 'Мои бронирования',
    acc_action_bookclass: 'Записаться',
    acc_action_contact:   'Написать нам',
    acc_action_classes:   'Все занятия',
  },

  el: {
    // ── Nav ──
    nav_home:       'Αρχική',
    nav_about:      'Σχετικά',
    nav_schedule:   'Πρόγραμμα',
    nav_classes:    'Μαθήματα',
    nav_space:      'Χώρος',
    nav_contact:    'Επικοινωνία',
    nav_account:    'Ο λογαριασμός μου',
    nav_signin:     'Σύνδεση',
    btn_book_now:   'Κράτηση',
    btn_book_float: 'Κράτηση',

    // ── Hero ──
    hero_eyebrow:   'Στούντιο Yoga στη Λεμεσό, Κύπρος',
    hero_title:     'Yoga &amp;<br>Co-working Space',
    hero_subtitle:  'Κίνηση, επίγνωση και κοινότητα — σε έναν συνειδητό χώρο.',
    hero_cta1:      'Εξερευνήστε τις πρακτικές',
    hero_cta2:      'Κλείστε μάθημα',

    // ── About ──
    about_eyebrow:      'Ποιοι είμαστε',
    about_title:        'Ψάχνετε στούντιο yoga στη Λεμεσό;',
    about_title_full:   'Σχετικά με Soul Vibe Space',
    about_story_title:  'Χώρος που γεννήθηκε με πρόθεση',
    about_story_p1:     'Δημιουργήσαμε το Soul Vibe Space ως απάντηση στην ανάγκη για έναν πλήρη χώρο ευεξίας στη Λεμεσό.',
    about_story_p2:     'Από πρωινή yoga έως εκστατικό χορό, από ηχοθεραπεία έως co-working — όλα σχεδιάστηκαν για να νιώθετε πιο ζωντανοί και συνδεδεμένοι.',
    about_story_p3:     'Το στούντιο βρίσκεται στην οδό Αγίας Ζώνης 50, Λεμεσός. Τα μαθήματα γίνονται κάθε μέρα από 8:00 έως 22:00.',
    stat_practitioners: 'Ευχαριστημένοι ασκούμενοι',
    stat_classes_num:   '7',
    stat_classes_label: 'Ημέρες την εβδομάδα',
    stat_teachers_num:  '19',
    stat_teachers_label:'Εκπαιδευτές',
    stat_since_num:     '2022',
    stat_since_label:   'Έτος ίδρυσης',
    about_values_title: 'Τι πρεσβεύουμε',
    value1_title:       'Καθημερινή άσκηση',
    value1_text:        'Πιστεύουμε ότι η ευεξία είναι καθημερινή δεσμεύση. Για αυτό είμαστε ανοιχτοί 7 ημέρες την εβδομάδα με πλούσιο πρόγραμμα.',
    value2_title:       'Κοινότητα πρώτα',
    value2_text:        'Το στούντιο είναι οι άνθρωποί του. Καλλιεργούμε μια ζεστή, συμπεριληπτική κοινότητα όπου όλοι νιώθουν σπίτι.',
    value3_title:       'Συνειδητός χώρος',
    value3_text:        'Κάθε λεπτομέρεια του στούντιού μας είναι σχεδιασμένη για να υποστηρίζει την άσκησή σας και την εσωτερική γαλήνη.',
    team_eyebrow:       'Οι εκπαιδευτές μας',
    team_title:         'Γνωρίστε τους εκπαιδευτές',
    team_lead:          'Η ομάδα μας φέρνει καρδιά, εμπειρία και αφοσίωση σε κάθε μάθημα.',
    about_cta_band_title: 'Είστε έτοιμοι να ενταχθείτε;',
    about_cta_band_sub:   'Κλείστε το πρώτο σας μάθημα σήμερα — δεν απαιτείται εμπειρία.',
    // ── Contact page extra ──
    contact_block_address: 'Διεύθυνση',
    contact_hours_title:   'Ώρες λειτουργίας',
    contact_hours_days:    'Δευτέρα – Κυριακή',
    contact_open_maps:     'Ανοίξτε στο Google Maps',
    form_intro_p:          'Έχετε ερώτηση για κάποιο μάθημα ή τιμές; Συμπληρώστε τη φόρμα και θα επικοινωνήσουμε μαζί σας εντός 24 ωρών.',
    form_success_msg:      'Το μήνυμά σας εστάλη. Θα επικοινωνήσουμε μαζί σας σύντομα!',
    about_p1:           'Το Soul Vibe Space είναι στούντιο yoga και ευεξίας στη Λεμεσό: μαθήματα yoga, διαλογισμός, εκστατικός χορός και ηχοθεραπεία.',
    about_p2:           'Δημιουργήσαμε έναν πολυλειτουργικό χώρο για κίνηση, επίγνωση και σύνδεση κοινότητας — ένα μέρος όπου οι άνθρωποι νιώθουν έμπνευση, σύνδεση και σπίτι.',
    about_badge_num:    '700+',
    about_badge_label:  'Ευχαριστημένοι ασκούμενοι',
    feature1_title:     'Καθημερινά μαθήματα',
    feature1_text:      'Yoga, διαλογισμός, ηχοθεραπεία και άλλα — 7 ημέρες την εβδομάδα',
    feature2_title:     'Για όλα τα επίπεδα',
    feature2_text:      'Αρχάριοι και έμπειροι ασκούμενοι είναι ευπρόσδεκτοι',
    feature3_title:     'Αγίας Ζώνης 50, Λεμεσός',
    feature3_text:      'Μαθήματα καθημερινά, 8:00–22:00',
    about_cta:          'Μάθετε περισσότερα',

    // ── Schedule ──
    schedule_eyebrow:   'Ζωντανό πρόγραμμα',
    schedule_title:     'Επερχόμενα μαθήματα',
    schedule_lead:      'Πρόγραμμα σε πραγματικό χρόνο από το σύστημα κρατήσεών μας — ενημερώνεται αυτόματα.',
    schedule_subtitle:  'Σε πραγματικό χρόνο από το στούντιο — ενημερώνεται αυτόματα.',
    schedule_today:     'Σήμερα',
    schedule_filter_cat:  'Κατηγορία',
    schedule_filter_inst: 'Εκπαιδευτής',
    schedule_week_title: 'Εβδομαδιαία μαθήματα',
    schedule_view_week:  'Εβδομάδα',
    schedule_view_month: 'Μήνας',
    schedule_view_aria:  'Προβολή προγράμματος',
    schedule_prev_week:  'Προηγούμενη εβδομάδα',
    schedule_next_week:  'Επόμενη εβδομάδα',
    schedule_prev_month: 'Προηγούμενος μήνας',
    schedule_next_month: 'Επόμενος μήνας',
    schedule_more:       '+{n} ακόμη',
    schedule_no_classes_day:   'Δεν υπάρχουν μαθήματα αυτή την ημέρα',
    schedule_no_classes_month: 'Δεν υπάρχουν μαθήματα αυτόν τον μήνα. Δοκιμάστε άλλα φίλτρα ή άλλον μήνα.',
    schedule_all_instructors:  'Όλοι οι εκπαιδευτές',

    // ── Classes ──
    classes_eyebrow:    'Τι προσφέρουμε',
    classes_title:      'Μαθήματα στο Soul Vibe Space',
    classes_lead:       'Yoga, ηχοθεραπεία, εκστατικός χορός και άλλα — όλα τα μαθήματα απευθείας από το πρόγραμμα του στούντιο.',
    classes_cta:        'Όλα τα μαθήματα & κράτηση →',
    home_vibes_prices:     'Δείτε τις τιμές',
    home_vibes_cta:        'Πώς λειτουργούν τα VIBES',
    home_vibes_text:       'Κάθε επισκέπτης έχει υπόλοιπο VIBES. Με το {{pass}} το ανανεώνετε με καλύτερους όρους: %%MP20.vibes%% VIBES αντί για %%MP20.topup_vibes%% με το ίδιο ποσό. Και για τις τακτικές επισκέψεις το στούντιο σας χαρίζει VIBES.',
    home_vibes_title:      'Περισσότερος χώρος για γιόγκα στη ζωή σας',
    home_vibes_eyebrow:    'VIBES · το υπόλοιπό σας για μαθήματα',
    classes_cat_all:    'Όλα',

    // ── Quote ──
    visual_quote:       '«Ένα μέρος όπου οι άνθρωποι νιώθουν έμπνευση, σύνδεση και σπίτι.»',

    // ── Space ──
    space_eyebrow:      'Περισσότερα από yoga',
    space_title:        'Χώρος για<br>εργασία & δημιουργία',
    space_studio_eyebrow: 'Το στούντιο',
    space_studio_title: 'Όπου η άσκηση ζωντανεύει',
    space_studio_p1:    'Ο κύριος χώρος μας είναι σχεδιασμένος για πλήθος πρακτικών — από πρωινή yoga έως εκστατικό χορό και ηχοθεραπεία.',
    space_studio_p2:    'Υψηλές οροφές, φυσικό φως και ποιοτικά δάπεδα — ιδανικό περιβάλλον για την άσκησή σας.',
    space_cowork_eyebrow: 'Co-working',
    space_cowork_title: 'Εργαστείτε συνειδητά',
    space_cowork_p1:    'Μεταξύ των μαθημάτων, η ζώνη co-working προσφέρει ήρεμο, εμπνευστικό περιβάλλον.',
    space_cowork_p2:    'Με σημείο καφέ, SMART TV και γρήγορο Wi-Fi — ό,τι χρειάζεστε για να είστε αποδοτικοί.',
    amenities_title:    'Εγκαταστάσεις & ανέσεις',
    space_feat5_title:  'Εξοπλισμός Yoga',
    space_feat5_text:   'Στρώματα, βοηθήματα και ταινίες',
    space_feat6_title:  'Δωρεάν Wi-Fi',
    space_feat6_text:   'Γρήγορο ιντερνετ σε όλο το χώρο',
    space_feat7_title:  'Ανοιχτό καθημερινά',
    space_feat8_title:  'Κεντρική τοποθεσία',
    space_feat8_text:   'Αγίας Ζώνης 50, Λεμεσός',
    space_hours_detail: 'Μαθήματα καθημερινά · 8:00–22:00 · Διαχειριστής 14:00–22:00',
    space_cta_title:    'Έτοιμοι να το ζήσετε ο ίδιοι;',
    space_cta_sub:      'Κλείστε ένα μάθημα και ελάτε να δείτε τον χώρο.',
    space_p:            'Το Soul Vibe Space διαθέτει επίσης μια δημιουργική ζώνη co-working όπου οι επισκέπτες μπορούν να εργαστούν, να χαλαρώσουν και να συνδεθούν με μια ενσυνείδητη κοινότητα.',
    space_feat1_title:  'Σημείο καφέ',
    space_feat1_text:   'Καφές και τσάι αυτοεξυπηρέτησης',
    space_feat2_title:  'SMART TV',
    space_feat2_text:   'Για παρουσιάσεις ή ομαδικές συνεδρίες',
    space_feat3_title:  'Αποδυτήρια & Ντους',
    space_feat3_text:   'Χαλαρώστε μετά την άσκηση',
    space_feat4_title:  'Ενοικίαση χώρου',
    space_feat4_text:   'Εργαστήρια, συναντήσεις και εκδηλώσεις',
    space_hours:        'Μαθήματα καθημερινά, 8:00–22:00',

    // ── Gift ──
    gift_title:         'Δώστε το δώρο της ευεξίας',
    gift_text:          'Κάντε δώρο ένα μάθημα yoga, μια συνεδρία ηχοθεραπείας ή μια εμπειρία ευεξίας στο Soul Vibe Space.',
    gift_cta:           'Δωροκάρτες',

    // ── Contact ──
    contact_eyebrow:    'Επικοινωνήστε μαζί μας',
    contact_title:      'Έτοιμοι να ξεκινήσετε;',
    contact_p:          'Κλείστε μάθημα, κάντε μια ερώτηση ή απλά πείτε γεια. Θα χαρούμε να σας ακούσουμε.',
    contact_address:    'Αγίας Ζώνης 50, Λεμεσός 3090, Κύπρος',
    contact_whatsapp:   'WhatsApp',
    contact_book_p:     'Κλείστε απευθείας μέσω της πλατφόρμας κρατήσεών μας:',
    contact_book_btn:   'Κλείστε μάθημα →',
    form_title:         'Στείλτε μας μήνυμα',
    form_firstname:     'Όνομα',
    form_lastname:      'Επώνυμο',
    form_email:         'Email',
    form_message:       'Μήνυμα',
    form_submit:        'Αποστολή',
    ph_firstname:       'Άννα',
    ph_lastname:        'Παπαδοπούλου',
    ph_email:           'anna@example.com',
    ph_message:         'Θέλω να κάνω εγγραφή σε μάθημα yoga...',

    // ── Footer ──
    footer_tagline:     'Κίνηση, επίγνωση και κοινότητα στη Λεμεσό, Κύπρος.',
    footer_studio:      'Στούντιο',
    footer_about:       'Σχετικά',
    footer_practices:   'Πρακτικές',
    footer_coworking:   'Χώρος Συνεργασίας',
    footer_gift:        'Δωροκάρτες',
    footer_book:        'Κλείστε μάθημα',
    footer_visit:       'Επισκεφθείτε μας',
    footer_hours:       'Μαθήματα: καθημερινά 8:00–22:00',
    footer_copy:        '© 2026 Soul Vibe Space LTD',

    // ── Account page ──
    acc_tab_login:      'Σύνδεση',
    acc_tab_register:   'Εγγραφή',
    auth_name:          'Όνομα',
    auth_password:      'Κωδικός',
    auth_phone:         'Τηλέφωνο',
    auth_or:            'ή',
    acc_login_title:    'Καλώς ήρθατε ξανά',
    acc_login_sub:      'Συνδεθείτε στον λογαριασμό σας Soul Vibe Space',
    acc_reg_title:      'Εγγραφείτε στο Soul Vibe Space',
    acc_reg_sub:        'Δημιουργήστε λογαριασμό για διαχείριση κρατήσεων',
    acc_label_email:    'Email',
    acc_label_password: 'Κωδικός',
    acc_label_name:     'Ονοματεπώνυμο',
    acc_label_phone:    'Τηλέφωνο',
    acc_btn_login:      'Σύνδεση',
    acc_btn_register:   'Δημιουργία λογαριασμού',
    consent_terms:      'Έχω διαβάσει και αποδέχομαι τους <a class="auth-consent-link" href="/terms" target="_blank" rel="noopener">Όρους &amp; Προϋποθέσεις</a> και επιβεβαιώνω ότι έλαβα γνώση της <a class="auth-consent-link" href="/privacy" target="_blank" rel="noopener">Πολιτικής Απορρήτου</a>. <span class="req">*</span>',
    consent_newsletter: 'Συμφωνώ να λαμβάνω νέα, προσφορές και ενημερώσεις από το Soul Vibe Space μέσω email.',
    err_fill_required:  'Συμπληρώστε όλα τα υποχρεωτικά πεδία.',
    err_terms_required: 'Παρακαλώ αποδεχτείτε τους Όρους & Προϋποθέσεις και την Πολιτική Απορρήτου για να συνεχίσετε.',
    err_required:        'Αυτό το πεδίο είναι υποχρεωτικό.',
    err_invalid_email:   'Παρακαλώ εισάγετε έγκυρη διεύθυνση email.',
    err_invalid_phone:   'Παρακαλώ εισάγετε έγκυρο αριθμό τηλεφώνου.',
    err_password_length: 'Ο κωδικός πρέπει να έχει τουλάχιστον 6 χαρακτήρες.',
    acc_register_success: 'Ο λογαριασμός δημιουργήθηκε! Καλώς ήρθατε στο Soul Vibe Space.',
    err_register_failed: 'Η εγγραφή απέτυχε. Δοκιμάστε ξανά ή γράψτε μας στο WhatsApp.',
    err_network:         'Δεν υπάρχει σύνδεση με τον διακομιστή. Ελέγξτε το internet και δοκιμάστε ξανά.',
    err_reg_exists:      'Αυτό το email υπάρχει ήδη στο σύστημά μας. Δοκιμάστε σύνδεση στην καρτέλα «Σύνδεση» ή γράψτε μας.',
    err_reg_phone_mismatch: 'Βρίσκεστε ήδη στα αρχεία του στούντιο. Συμπληρώστε το τηλέφωνο που έχουμε καταγεγραμμένο και θα συνδέσουμε αυτό το email με την καρτέλα σας.',
    err_password_mismatch: 'Οι κωδικοί δεν ταιριάζουν.',
    acc_label_password_confirm: 'Επιβεβαίωση κωδικού',
    acc_ph_password_confirm:    'Επαναλάβετε τον κωδικό',
    acc_forgot_link:    'Ξεχάσατε τον κωδικό;',
    acc_forgot_title:   'Επαναφορά κωδικού',
    acc_forgot_sub:     'Εισάγετε το email σας και θα σας στείλουμε σύνδεσμο επαναφοράς κωδικού',
    acc_forgot_info:    'Εισάγετε το email που σχετίζεται με τον λογαριασμό σας.',
    acc_btn_forgot:      'Αποστολή συνδέσμου',
    acc_back_to_login:  '← Πίσω στη σύνδεση',
    acc_forgot_success: 'Εάν υπάρχει λογαριασμός με αυτό το email, έχουμε στείλει οδηγίες επαναφοράς κωδικού.',
    acc_ph_email:       'your@email.com',
    acc_ph_password:    'Ο κωδικός σας',
    acc_ph_newpassword: 'Δημιουργήστε κωδικό',
    acc_ph_name:        'Το όνομά σας',
    acc_ph_phone:       '+357 ...',
    acc_upcoming:       'Επερχόμενες',
    bday_title: 'Ημερομηνία γέννησης',
    bday_intro: 'Συμπληρώστε την ημερομηνία γέννησής σας — στα γενέθλιά σας θα σας χαρίσουμε 10 VIBES. Προστίθενται αυτόματα μία φορά τον χρόνο, εφόσον η ημερομηνία έχει συμπληρωθεί εκ των προτέρων.',
    bday_once: 'Η ημερομηνία μπορεί να οριστεί μόνο μία φορά.',
    bday_save: 'Αποθήκευση',
    bday_confirm_q: 'Αποθήκευση της ημερομηνίας {d}; Στη συνέχεια μόνο ο διαχειριστής του στούντιο μπορεί να την αλλάξει.',
    bday_confirm: 'Ναι, αποθήκευση',
    bday_edit: 'Αλλαγή',
    bday_bonus_hint: 'Στα γενέθλιά σας — 10 VIBES δώρο, αυτόματα μία φορά τον χρόνο.',
    bday_locked: 'Για αλλαγή της ημερομηνίας επικοινωνήστε με τον διαχειριστή του στούντιο.',
    bday_saved: 'Η ημερομηνία γέννησης αποθηκεύτηκε.',
    bday_err_invalid: 'Συμπληρώστε έγκυρη ημερομηνία γέννησης.',
    bday_err_age: 'Ελέγξτε την ημερομηνία: η ηλικία πρέπει να είναι από 10 έως 100 ετών.',
    bday_err_already: 'Η ημερομηνία γέννησης έχει ήδη οριστεί. Για αλλαγή επικοινωνήστε με τον διαχειριστή του στούντιο.',
    bday_err_fail: 'Δεν ήταν δυνατή η αποθήκευση. Δοκιμάστε ξανά αργότερα.',
    vibes_title: 'Τα VIBES μου',
    vibes_classes_left: '≈ {n} μαθήματα',
    vibes_classes_left_one: '≈ {n} μάθημα',
    vibes_classes_left_other: '≈ {n} μαθήματα',
    vibes_rate: '1 μάθημα = %%class%% VIBES',
    vibes_active: 'Ενεργά {{pass:pl}} και {{starter:pl}}',
    vibes_no_active: 'Δεν υπάρχει ενεργό {{pass}} ή {{starter}}.',
    vibes_until: 'ισχύει έως {d}',
    vibes_no_expiry: 'χωρίς λήξη',
    vibes_first_visit: 'διάρκεια {days} από την πρώτη επίσκεψη',
    vibes_multipass: '{{pass_line}}',
    vibes_starter: '{{starter_line}}',
    vibes_src_bonus: 'VIBES δώρο',
    vibes_src_manual: 'VIBES δώρο',
    vibes_src_reward_friend: 'Μπόνους σύστασης',
    vibes_src_birthday: 'Μπόνους γενεθλίων',
    vibes_src_activity_bonus: 'VIBES δώρο για τακτική εξάσκηση',
    act_title: 'Τακτική εξάσκηση',
    act_months_in: 'Ιανουάριο,Φεβρουάριο,Μάρτιο,Απρίλιο,Μάιο,Ιούνιο,Ιούλιο,Αύγουστο,Σεπτέμβριο,Οκτώβριο,Νοέμβριο,Δεκέμβριο',
    act_months: 'Ιανουάριος,Φεβρουάριος,Μάρτιος,Απρίλιος,Μάιος,Ιούνιος,Ιούλιος,Αύγουστος,Σεπτέμβριος,Οκτώβριος,Νοέμβριος,Δεκέμβριος',
    act_visits: 'Τον {in} ήρθατε σε μαθήματα {n} {times}.',
    act_visits_zero: 'Τον {in} δεν έχετε έρθει ακόμη σε μάθημα.',
    act_times_one: 'φορά',
    act_times_other: 'φορές',
    act_visit_one: 'επίσκεψη',
    act_visit_other: 'επισκέψεις',
    act_next_first: 'Ακόμη {r} και παίρνετε +{v} VIBES.',
    act_next_zero: '{r} {visits} και παίρνετε +{v} VIBES.',
    act_next_more: 'Τα +{e} VIBES είναι εξασφαλισμένα, ακόμη {r} για +{v}.',
    act_max: 'Θα πάρετε το μέγιστο: +{v} VIBES για τον {in}.',
    act_credit: 'Τα VIBES πιστώνονται αυτόματα την {date}.',
    act_rule: '{a}–{b} επισκέψεις τον μήνα — +{x} VIBES, {c} και περισσότερες — +{y} VIBES συνολικά. Τα VIBES δώρο δεν λήγουν.',
    act_history: 'Προηγούμενοι μήνες',
    act_bar_label: 'Επισκέψεις αυτόν τον μήνα: {n} από {max}',
    vibes_src_visit_refund: 'Επιστροφή VIBES για ακυρωμένη επίσκεψη',
    vibes_tx_visit: 'Επίσκεψη μαθήματος',
    vibes_tx_expiry: 'Λήξη',
    vibes_tx_refund: 'Επιστροφή χρημάτων',
    vibes_tx_deposit: 'Ανανέωση υπολοίπου',
    vibes_freezes: 'Πάγωμα',
    vibes_freeze_active: 'ενεργό τώρα',
    vibes_freeze_scheduled: 'προγραμματισμένο',
    vibes_days: 'ημέρες',
    vibes_history: 'Ιστορικό',
    vibes_no_history: 'Δεν υπάρχουν ακόμη κινήσεις.',
    vibes_show_all: 'Εμφάνιση όλων',
    vibes_show_less: 'Λιγότερα',
    vibes_visits: 'Πρόσφατες επισκέψεις',
    vibes_unavailable: 'Τα VIBES δεν είναι διαθέσιμα προσωρινά. Δοκιμάστε ξανά αργότερα.',
    vibes_verify_email: 'Για να δείτε τα VIBES σας, συνδεθείτε με Google με το email που δώσατε στο στούντιο.',
    vibes_ambiguous: 'Βρέθηκαν περισσότερες από μία κάρτες με το email σας. Επικοινωνήστε με το στούντιο για να συνδέσουμε τη σωστή.',
    vibes_not_found: 'Δεν έχετε ακόμη VIBES. Αγοράστε ένα {{pass}} στο στούντιο (οι νέοι πελάτες μπορούν να ξεκινήσουν με ένα εφάπαξ {{starter}}) — το υπόλοιπο θα εμφανιστεί εδώ.',
    vibes_ev_intro: 'Επιβεβαιώστε το email σας για να δείτε τα VIBES σας. Θα στείλουμε έναν 6ψήφιο κωδικό στο {email}.',
    vibes_ev_send: 'Αποστολή κωδικού',
    vibes_ev_code: 'Κωδικός από το email',
    vibes_ev_confirm: 'Επιβεβαίωση',
    vibes_ev_resend: 'Νέα αποστολή κωδικού',
    vibes_ev_resend_in: 'Νέα αποστολή σε {s} δευτ.',
    vibes_ev_sent: 'Ο κωδικός στάλθηκε. Ελέγξτε τα εισερχόμενα (και τα ανεπιθύμητα).',
    vibes_ev_too_many: 'Πάρα πολλά αιτήματα κωδικού. Δοκιμάστε ξανά σε μία ώρα.',
    vibes_ev_send_fail: 'Δεν ήταν δυνατή η αποστολή του email. Δοκιμάστε αργότερα.',
    vibes_ev_6digits: 'Εισαγάγετε τα 6 ψηφία από το email.',
    vibes_ev_wrong: 'Λάθος κωδικός. Ελέγξτε και δοκιμάστε ξανά.',
    vibes_ev_expired: 'Ο κωδικός έληξε. Ζητήστε νέο.',
    fz_title: 'Αίτημα παγώματος',
    fz_open: 'Πάγωμα Class Pass',
    fz_status_pending: 'Υπό εξέταση',
    fz_status_approved: 'Εγκρίθηκε',
    fz_status_rejected: 'Απορρίφθηκε',
    fz_sent_on: 'στάλθηκε {d}',
    fz_dates_changed: 'Το στούντιο προσάρμοσε τις ημερομηνίες που ζητήσατε ({d}).',
    fz_pending_note: 'Θα σας στείλουμε email μόλις το εξετάσει ένας διαχειριστής.',
    fz_admin_comment: 'Σχόλιο του στούντιο',
    fz_modal_title: 'Πάγωμα Class Pass',
    fz_close: 'Κλείσιμο',
    fz_period: 'Περίοδος',
    fz_preset_days: '{n} ημέρες',
    fz_preset_custom: 'Άλλες ημερομηνίες',
    fz_start: 'Έναρξη',
    fz_end: 'Λήξη',
    fz_summary: '{n} ημέρες: {from} – {to}',
    fz_reason: 'Λόγος',
    fz_reason_illness: 'Ασθένεια ή τραυματισμός',
    fz_reason_travel: 'Ταξίδι',
    fz_reason_other: 'Άλλο',
    fz_comment: 'Σχόλιο (προαιρετικό)',
    fz_comment_ph: 'Ό,τι πρέπει να γνωρίζει το στούντιο',
    fz_rule_1: 'Η ισχύς των ενεργών Class Pass παρατείνεται κατά τις ημέρες του παγώματος· το υπόλοιπο VIBES δεν αλλάζει.',
    fz_rule_2: 'Το πάγωμα ξεκινά το νωρίτερο σήμερα και διαρκεί έως {n} ημέρες.',
    fz_rule_3: 'Ένας διαχειριστής εξετάζει το αίτημα και λαμβάνετε την απόφαση με email. Μόνο ένα αίτημα μπορεί να είναι υπό εξέταση κάθε φορά.',
    fz_cancel: 'Ακύρωση',
    fz_submit: 'Αποστολή αιτήματος',
    fz_sending: 'Αποστολή…',
    fz_sent: 'Το αίτημα στάλθηκε. Σας στείλαμε επιβεβαίωση με email.',
    fz_err_dates: 'Ελέγξτε τις ημερομηνίες: η λήξη δεν μπορεί να είναι πριν από την έναρξη.',
    fz_err_past: 'Το πάγωμα δεν μπορεί να ξεκινά στο παρελθόν.',
    fz_err_far: 'Η έναρξη μπορεί να είναι το αργότερο σε {n} ημέρες από σήμερα.',
    fz_err_long: 'Το πάγωμα μπορεί να διαρκεί έως {n} ημέρες.',
    fz_err_reason: 'Επιλέξτε λόγο.',
    fz_err_pending: 'Έχετε ήδη ένα αίτημα υπό εξέταση.',
    fz_err_generic: 'Δεν ήταν δυνατή η αποστολή. Δοκιμάστε ξανά αργότερα.',
    acc_all:            'Όλες οι κρατήσεις',
    acc_book_class:     'Κράτηση μαθήματος',
    acc_contact:        'Επικοινωνία',
    acc_all_classes:    'Όλα τα μαθήματα',
    acc_signout:        'Αποσύνδεση',
    acc_no_upcoming:    'Δεν υπάρχουν επερχόμενες κρατήσεις',
    acc_no_all:         'Δεν υπάρχουν κρατήσεις ακόμα',
    acc_book_first:     'Κλείστε το πρώτο σας μάθημα →',
    acc_section_bookings: 'Οι κρατήσεις μου',
    acc_action_bookclass: 'Κράτηση',
    acc_action_contact:   'Επικοινωνία',
    acc_action_classes:   'Μαθήματα',
  }
};

// ── Language engine ───────────────────────────────────────────────────────────

const SVS_I18N = (function() {
  const STORE_KEY = 'svs_lang';
  let current = 'en';

  // Persistent storage with fallback
  const _store = (function() {
    try {
      var s = window['local' + 'Storage'];
      s.setItem('_svs_l','1'); s.removeItem('_svs_l');
      return s;
    } catch(e) { return null; }
  })();

  function getLang() {
    if (_store) return _store.getItem(STORE_KEY) || 'en';
    return current;
  }

  function setLang(lang) {
    if (!SVS_TRANSLATIONS[lang]) return;
    current = lang;
    if (_store) _store.setItem(STORE_KEY, lang);
    applyLang(lang);
    updateLangButtons(lang);
    // Update html lang attribute
    document.documentElement.lang = lang === 'el' ? 'el' : lang === 'ru' ? 'ru' : 'en';
    // Signal language change to other modules (schedule re-render)
    window.dispatchEvent(new CustomEvent('svs:langchange', { detail: { lang } }));
  }

  function t(key) {
    const dict = SVS_TRANSLATIONS[current] || SVS_TRANSLATIONS.en;
    const raw = dict[key] !== undefined ? dict[key] : (SVS_TRANSLATIONS.en[key] || key);
    const lang = SVS_TRANSLATIONS[current] ? current : 'en';
    return svsExpandPrices(svsExpandTerms(raw, lang), lang);
  }

  // Термин из словаря SVS_TERMS на текущем языке: term('pass', 'dat') → 'абонементу'.
  function term(key, form) {
    return svsExpandTerms('{{' + key + (form ? ':' + form : '') + '}}', current);
  }

  function applyLang(lang) {
    current = lang;
    // Text content
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      const val = t(key);
      // Allow HTML content (for tags like <br>)
      if (val.includes('<')) {
        el.innerHTML = val;
      } else {
        el.textContent = val;
      }
    });
    // Цифры вне переводов: <span data-price="MP8.per">…</span> → значение на языке страницы (десятичная запятая и т. п.)
    var pv = svsPriceValues(lang);
    document.querySelectorAll('[data-price]').forEach(el => {
      const v = pv[el.getAttribute('data-price')];
      if (v !== undefined) el.textContent = String(v);
    });
    // Placeholders
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      const key = el.getAttribute('data-i18n-placeholder');
      el.placeholder = t(key);
    });
    // Aria labels
    document.querySelectorAll('[data-i18n-aria]').forEach(el => {
      const key = el.getAttribute('data-i18n-aria');
      el.setAttribute('aria-label', t(key));
    });
  }

  function updateLangButtons(lang) {
    document.querySelectorAll('[data-lang-btn]').forEach(btn => {
      const isActive = btn.getAttribute('data-lang-btn') === lang;
      btn.classList.toggle('lang-active', isActive);
      btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });
  }

  function init() {
    const saved = getLang();
    // Detect browser language as fallback
    const detected = navigator.language ? navigator.language.slice(0, 2) : 'en';
    const lang = saved || (['en','ru','el'].includes(detected) ? detected : 'en');
    setLang(lang);
  }

  return { init, setLang, t, term, getLang };
})();

// Expose on window: this is a top-level `const`, so without this assignment
// `window.SVS_I18N` is undefined everywhere it's referenced from other
// scripts (account.js, classes.html, schedule.html), silently forcing the
// English fallback regardless of the selected language.
window.SVS_I18N = SVS_I18N;

// Shared registration helpers for /account, the sign-in modal and the booking
// modal, so all three forms validate the same way and show translated errors.
window.SVS_REG = {
  validate: function (d) {
    var t = SVS_I18N.t;
    if (!d.name || !d.email || !d.phone || !d.password) return t('err_fill_required');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email)) return t('err_invalid_email');
    if (String(d.phone).replace(/\D/g, '').length < 8) return t('err_invalid_phone');
    if (String(d.password).length < 6) return t('err_password_length');
    return '';
  },
  // Maps an API error (or a network failure) to a translated message.
  serverError: function (data, networkError) {
    var t = SVS_I18N.t;
    if (networkError) return t('err_network');
    data = data || {};
    if (data.code === 'exists') return t('err_reg_exists');
    if (data.code === 'exists_phone_mismatch') return t('err_reg_phone_mismatch');
    if (data.code === 'terms_required') return t('err_terms_required');
    if (data.code === 'password') return t('err_password_length');
    var e = String(data.error || '');
    if (/phone/i.test(e)) return t('err_invalid_phone');
    if (/email address/i.test(e)) return t('err_invalid_email');
    if (/at least 6/i.test(e)) return t('err_password_length');
    if (/required/i.test(e)) return t('err_fill_required');
    return t('err_register_failed');
  }
};

// (auto-init moved to end of file)

// ── Service name translations by Simplybook service ID ────────────────────────
// Source names (EN) come live from Simplybook API.
// RU and EL translations are applied client-side by language.

const SVS_SERVICE_NAMES = {
  // 12 | Vinyasa yoga (Eng.)
  12: { en: 'Vinyasa Yoga', ru: 'Виньяса йога', el: 'Vinyasa Yoga' },
  // 31 | Kundalini yoga class, 90 min
  31: { en: 'Kundalini Yoga, 90 min', ru: 'Кундалини йога, 90 мин', el: 'Kundalini Yoga, 90 λεπτά' },
  // 59 | Sunday Kundalini Yoga & Gong meditation, 120 min
  59: { en: 'Sunday Kundalini Yoga & Gong Meditation', ru: 'Кундалини йога и гонг-медитация (воскресенье)', el: 'Kundalini Yoga & Διαλογισμός με Γκονγκ (Κυριακή)' },
  // 61 | Hatha Yoga (eng.)
  61: { en: 'Hatha Yoga', ru: 'Хатха йога', el: 'Hatha Yoga' },
  // 62 | Prenatal Yoga (eng.)
  62: { en: 'Prenatal Yoga', ru: 'Йога для беременных', el: 'Yoga Εγκυμοσύνης' },
  // 64 | Therapy Yoga | Healthy Back
  64: { en: 'Therapy Yoga — Healthy Back', ru: 'Терапевтическая йога — Здоровая спина', el: 'Θεραπευτική Yoga — Υγιής Πλάτη' },
  // 65 | Sound Healing
  65: { en: 'Sound Healing', ru: 'Звукотерапия', el: 'Ηχοθεραπεία' },
  // 68 | Yoga Nidra with Live Music and Voice
  68: { en: 'Yoga Nidra with Live Music & Voice', ru: 'Йога-нидра с живой музыкой и голосом', el: 'Yoga Nidra με Ζωντανή Μουσική & Φωνή' },
  // 70 | Black Lotus Yoga (Vinyasa) (rus)
  70: { en: 'Black Lotus Yoga (Vinyasa)', ru: 'Йога Чёрный Лотос (Виньяса)', el: 'Black Lotus Yoga (Vinyasa)' },
  // 71 | Yin Yoga (rus)
  71: { en: 'Yin Yoga', ru: 'Инь йога', el: 'Yin Yoga' },
  // 72 | Functional Hatha Yoga (rus/eng)
  72: { en: 'Functional Hatha Yoga', ru: 'Функциональная Хатха йога', el: 'Λειτουργική Hatha Yoga' },
  // 73 | Sleep Well Yoga
  73: { en: 'Sleep Well Yoga', ru: 'Йога для хорошего сна', el: 'Yoga για Καλό Ύπνο' },
  // 76 | Mindful Meditation
  76: { en: 'Mindful Meditation', ru: 'Медитация осознанности', el: 'Ενσυνείδητος Διαλογισμός' },
  // 94 | Hip Hop Freestyle (7-12 y.o.)
  94: { en: 'Hip Hop Freestyle (7–12 y.o.)', ru: 'Хип-хоп фристайл (7–12 лет)', el: 'Hip Hop Freestyle (7–12 ετών)' },
  // 95 | Hip-Hop Choreo Class
  95: { en: 'Hip-Hop Choreography', ru: 'Хип-хоп хореография', el: 'Χορογραφία Hip-Hop' },
  // 96 | DJ Time | Dance & Juice
  96: { en: 'DJ Time — Dance & Juice', ru: 'DJ Time — Танцы и напитки', el: 'DJ Time — Χορός & Χυμοί' },
  // 97 | Ecstatic Dance
  97: { en: 'Ecstatic Dance & Sound Healing', ru: 'Экстатический танец и звукотерапия', el: 'Εκστατικός Χορός & Ηχοθεραπεία' },
  // 99 | Hatha Yoga (rus)
  99: { en: 'Hatha Yoga', ru: 'Хатха йога', el: 'Hatha Yoga' },
  // 103 | Energy Breathing Workshop
  103: { en: 'Energy Breathing Workshop', ru: 'Воркшоп по энергетическому дыханию', el: 'Εργαστήριο Ενεργειακής Αναπνοής' },
  // 105 | Qigong Class
  105: { en: 'Qigong', ru: 'Цигун', el: 'Qigong' },
  // 107 | English Speaking Club
  107: { en: 'English Speaking Club', ru: 'Разговорный клуб английского', el: 'Ομιλητικός Όμιλος Αγγλικών' },
  // 108 | Tea & Live Music Ceremony
  108: { en: 'Tea & Live Music Ceremony', ru: 'Чайная церемония с живой музыкой', el: 'Τελετή Τσαγιού & Ζωντανή Μουσική' },
  // 109 | Family Dance Time
  109: { en: 'Family Dance Time', ru: 'Семейный танцевальный класс', el: 'Οικογενειακός Χορός' },
  // 110 | Women's Gathering JOY.FULL
  110: { en: "Women's Gathering JOY.FULL", ru: 'Женский круг JOY.FULL', el: "Γυναικεία Συγκέντρωση JOY.FULL" },
};

// ── Schedule UI strings ───────────────────────────────────────────────────────
// Extend translations with schedule-specific UI keys

Object.assign(SVS_TRANSLATIONS.en, {
  modal_instructor:   'Instructor',
  modal_book_for:     'Book for',
  sched_today:        'Today',
  sched_no_today:     'No classes today',
  sched_no_day:       'No classes scheduled',
  sched_full:         'Full schedule →',
  sched_book_spot:    'Book spot',
  sched_see_all:      'Full schedule →',
  sched_free:         '%%dropin%%*',
  sched_aria_days:    'Select day',
  // Classes section
  class_book:         'Book',
  // Category labels
  cat_yoga:           'Yoga',
  cat_spiritual:      'Spiritual & Energy',
  cat_dance:          'Dance & Music',
  cat_events:         'Workshops & Events',
  // Duration format
  dur_h:              'h',
  dur_min:            'min',
});

Object.assign(SVS_TRANSLATIONS.ru, {
  modal_instructor:   'Преподаватель',
  modal_book_for:     'Записаться',
  sched_today:        'Сегодня',
  sched_no_today:     'Занятий сегодня нет',
  sched_no_day:       'В этот день занятий нет',
  sched_full:         'Полное расписание →',
  sched_book_spot:    'Записаться',
  sched_see_all:      'Полное расписание →',
  sched_free:         '%%dropin%%*',
  sched_aria_days:    'Выберите день',
  class_book:         'Записаться',
  cat_yoga:           'Йога',
  cat_spiritual:      'Духовные практики',
  cat_dance:          'Танцы и музыка',
  cat_events:         'Воркшопы и события',
  dur_h:              'ч',
  dur_min:            'мин',
});

Object.assign(SVS_TRANSLATIONS.el, {
  modal_instructor:   'Εκπαιδευτής',
  modal_book_for:     'Κράτηση',
  sched_today:        'Σήμερα',
  sched_no_today:     'Δεν υπάρχουν μαθήματα σήμερα',
  sched_no_day:       'Δεν υπάρχουν μαθήματα αυτή την ημέρα',
  sched_full:         'Πλήρες πρόγραμμα →',
  sched_book_spot:    'Κράτηση',
  sched_see_all:      'Πλήρες πρόγραμμα →',
  sched_free:         '%%dropin%%*',
  sched_aria_days:    'Επιλέξτε ημέρα',
  class_book:         'Κράτηση',
  cat_yoga:           'Yoga',
  cat_spiritual:      'Πνευματικές & Ενέργεια',
  cat_dance:          'Χορός & Μουσική',
  cat_events:         'Εργαστήρια & Εκδηλώσεις',
  dur_h:              'ώ',
  dur_min:            'λεπτ',
});

// Helper: get translated service name by ID and current language
function getSvcName(serviceId, fallbackName) {
  const lang = window.SVS_I18N ? window.SVS_I18N.getLang() : 'en';
  const map = SVS_SERVICE_NAMES[serviceId];
  if (!map) return fallbackName;
  return map[lang] || map.en || fallbackName;
}

// Helper: get schedule UI string
function schedT(key) {
  return window.SVS_I18N ? window.SVS_I18N.t(key) : (SVS_TRANSLATIONS.en[key] || key);
}

// ── Pricing page strings ──────────────────────────────────────────────────────
Object.assign(SVS_TRANSLATIONS.en, {
  nav_pricing:          'Pricing',

  pricing_eyebrow:      'Pricing',
  pricing_h1:           'Classes and prices',
  pricing_lead:         'Drop in for a class or choose a {{pass}} for regular practice. New here? You can also choose a {{Starter}}. When you buy any {{pass}} or {{Starter}}, VIBES are added to your balance automatically.',
  pv_path_drop:          'Drop-in class',
  pv_path_new_val:       '{{Starter}}',
  pv_path_new:           'New to the studio',
  pv_path_pass_val:      'For regular practice',
  pv_path_pass:          '{{Pass:pl}}',

  // Drop-in
  pricing_drop_label:   'DROP-IN',
  pricing_drop_name:    'Single Class',
  pricing_drop_desc:    'Try any class without commitment. Perfect for visitors or a spontaneous practice.',

  // Starter Pack ({{starter}})
  pricing_starter_badge:'NEW STUDENTS ONLY',
  pricing_starter_label:'{{starter}}',
  pricing_starter_title:'Begin Your Journey',
  pricing_starter_sub:  'One-time offer for new clients only, purchased once. Choose the {{starter}} that fits your start.',
  pricing_s1_name:      '1 Class',
  pricing_s1_saving:    '%%SP1.per%% per class instead of %%dropin%% for a drop-in',
  pricing_s2_name:      '2 Classes',
  pricing_s2_saving:    '%%SP2.per%% per class instead of %%dropin%% for a drop-in',
  pricing_s4_name:      '4 Classes',
  pricing_s4_saving:    '%%SP4.per%% per class instead of %%dropin%% for a drop-in',

  // Class Pass ({{pass}})
  pricing_multi_badge:  'Best price among passes',
  pricing_multi_label:  '{{pass}}',
  pricing_multi_title:  'Commit to Your Practice',
  pricing_multi_sub:    'The more you practice, the more you save. Valid for all regular classes.',
  pricing_m4_name:      '4 Classes',
  pricing_m4_saving:    '%%MP4.per%% per class instead of %%dropin%% for a drop-in',
  pricing_m8_name:      '8 Classes',
  pricing_m8_saving:    '%%MP8.per%% per class instead of %%dropin%% for a drop-in',
  pricing_m12_name:     '12 Classes',
  pricing_m12_saving:   '%%MP12.per%% per class instead of %%dropin%% for a drop-in',
  pricing_m20_name:     '20 Classes',
  pricing_m20_saving:   '%%MP20.per%% per class instead of %%dropin%% for a drop-in',

  // Events
  pricing_events_title: 'Workshops & Special Events',
  pricing_events_desc:  'Workshops, sound healing and other special classes have their own price in VIBES, set separately for each event. Check the schedule or contact us for details.',

  // Studio & space rental teaser

  // Coworking teaser
  pricing_coworking_title: 'Coworking',
  pricing_coworking_desc:  'Open workspace on the ground floor — Wi-Fi, tea & coffee included.',
  pricing_coworking_from:  'Free between classes with more than %%class%% VIBES on your balance. Otherwise, co-working rates apply.',
  pricing_coworking_link:  'View rates',

  // Extra services / rental cross-link
  pricing_extras_title: 'Looking for something else?',
  pricing_extras_desc:  'Individual programs and special events are priced separately.',
  pricing_extras_link:  'See Extra Services & Pricing',

  // How to book
  pricing_how_title:    'How It Works',
  pricing_how1_title:   'Choose a Class',
  pricing_how1_desc:    'Browse the schedule and pick a session that speaks to you.',
  pricing_how2_title:   'Book a class',
  pricing_how2_desc:    'Sign in and book your place in a few taps — no extra steps.',
  pricing_how3_title:   'Show Up & Practice',
  pricing_how3_desc:    'Arrive 5–10 min early. Your mat is waiting.',
  pricing_class_word:   'class',
  pricing_classes_word: 'classes',
  btn_view_schedule:    'View Schedule',
});

Object.assign(SVS_TRANSLATIONS.ru, {
  nav_pricing:          'Цены',

  pricing_eyebrow:      'Цены',
  pricing_h1:           'Занятия и цены',
  pricing_lead:         'Приходите разово или выберите {{pass}} для регулярной практики. Впервые у нас? Вам доступен и {{starter}}. При покупке любого {{pass:gen}} или {{starter:gen}} VIBES начисляются на ваш баланс автоматически.',
  pv_path_drop:          'Разовое занятие',
  pv_path_new_val:       '{{starter}}',
  pv_path_new:           'Впервые в студии',
  pv_path_pass_val:      'Для регулярной практики',
  pv_path_pass:          '{{Pass:pl}}',

  pricing_drop_label:   'РАЗОВОЕ ЗАНЯТИЕ',
  pricing_drop_name:    'Один класс',
  pricing_drop_desc:    'Попробуйте любой класс без обязательств. Подойдёт гостям города и для спонтанной практики.',

  pricing_starter_badge:'ТОЛЬКО ДЛЯ НОВЫХ',
  pricing_starter_label:'{{starter}}',
  pricing_starter_title:'Начните свой путь',
  pricing_starter_sub:  'Разовое предложение только для новых клиентов: купить можно один раз. Выберите {{starter}}, который подходит вам.',
  pricing_s1_name:      '1 занятие',
  pricing_s1_saving:    '%%SP1.per%% за занятие вместо %%dropin%% при разовой оплате',
  pricing_s2_name:      '2 занятия',
  pricing_s2_saving:    '%%SP2.per%% за занятие вместо %%dropin%% при разовой оплате',
  pricing_s4_name:      '4 занятия',
  pricing_s4_saving:    '%%SP4.per%% за занятие вместо %%dropin%% при разовой оплате',

  pricing_multi_badge:  'Лучшая цена среди абонементов',
  pricing_multi_label:  '{{Pass}}',
  pricing_multi_title:  'Полная практика',
  pricing_multi_sub:    'Чем больше вы практикуете, тем выгоднее. Действует на все регулярные классы.',
  pricing_m4_name:      '4 занятия',
  pricing_m4_saving:    '%%MP4.per%% за занятие вместо %%dropin%% при разовой оплате',
  pricing_m8_name:      '8 занятий',
  pricing_m8_saving:    '%%MP8.per%% за занятие вместо %%dropin%% при разовой оплате',
  pricing_m12_name:     '12 занятий',
  pricing_m12_saving:   '%%MP12.per%% за занятие вместо %%dropin%% при разовой оплате',
  pricing_m20_name:     '20 занятий',
  pricing_m20_saving:   '%%MP20.per%% за занятие вместо %%dropin%% при разовой оплате',

  pricing_events_title: 'Воркшопы и события',
  pricing_events_desc:  'У воркшопов, звуковых практик и других специальных занятий своя цена в VIBES — она задаётся отдельно для каждого события. Смотрите афишу или напишите нам.',


  pricing_coworking_title: 'Коворкинг',
  pricing_coworking_desc:  'Открытое рабочее пространство на первом этаже — Wi-Fi, чай и кофе включены.',
  pricing_coworking_from:  'Между занятиями коворкинг бесплатен, если на балансе больше %%class%% VIBES. В остальных случаях действуют тарифы коворкинга.',
  pricing_coworking_link:  'Посмотреть тарифы',

  pricing_extras_title: 'Ищете что-то другое?',
  pricing_extras_desc:  'Индивидуальные программы и специальные события оплачиваются отдельно.',
  pricing_extras_link:  'Смотреть доп. услуги и цены',

  pricing_how_title:    'Как это работает',
  pricing_how1_title:   'Выберите класс',
  pricing_how1_desc:    'Посмотрите расписание и выберите занятие, которое вам откликается.',
  pricing_how2_title:   'Запишитесь',
  pricing_how2_desc:    'Войдите в аккаунт и запишитесь в пару нажатий — без лишних шагов.',
  pricing_how3_title:   'Приходите и практикуйте',
  pricing_how3_desc:    'Приходите за 5–10 минут до начала. Коврик уже ждёт вас.',
  pricing_class_word:   'занятие',
  pricing_classes_word: 'занятия',
  btn_view_schedule:    'Расписание',
});

Object.assign(SVS_TRANSLATIONS.el, {
  nav_pricing:          'Τιμές',

  pricing_eyebrow:      'Τιμές',
  pricing_h1:           'Μαθήματα και τιμές',
  pricing_lead:         'Ελάτε για ένα μάθημα ή επιλέξτε {{pass}} για τακτική εξάσκηση. Πρώτη φορά στο στούντιο; Μπορείτε επίσης να επιλέξετε {{Starter}}. Με την αγορά οποιουδήποτε {{pass}} ή {{Starter}}, τα VIBES προστίθενται αυτόματα στο υπόλοιπό σας.',
  pv_path_drop:          'Μεμονωμένο μάθημα',
  pv_path_new_val:       '{{Starter}}',
  pv_path_new:           'Πρώτη φορά στο στούντιο',
  pv_path_pass_val:      'Για τακτική εξάσκηση',
  pv_path_pass:          '{{pass}}',

  pricing_drop_label:   'ΜΕΜΟΝΩΜΕΝΟ',
  pricing_drop_name:    'Ένα Μάθημα',
  pricing_drop_desc:    'Δοκιμάστε οποιοδήποτε μάθημα χωρίς δέσμευση. Ιδανικό για επισκέπτες ή αυθόρμητη πρακτική.',

  pricing_starter_badge:'ΜΟΝΟ ΓΙΑ ΝΕΟΥΣ',
  pricing_starter_label:'{{starter}}',
  pricing_starter_title:'Ξεκινήστε το Ταξίδι σας',
  pricing_starter_sub:  'Εφάπαξ προσφορά μόνο για νέους πελάτες, αγοράζεται μία φορά. Επιλέξτε το {{starter}} που σας ταιριάζει.',
  pricing_s1_name:      '1 Μάθημα',
  pricing_s1_saving:    '%%SP1.per%% ανά μάθημα αντί για %%dropin%% με μεμονωμένη πληρωμή',
  pricing_s2_name:      '2 Μαθήματα',
  pricing_s2_saving:    '%%SP2.per%% ανά μάθημα αντί για %%dropin%% με μεμονωμένη πληρωμή',
  pricing_s4_name:      '4 Μαθήματα',
  pricing_s4_saving:    '%%SP4.per%% ανά μάθημα αντί για %%dropin%% με μεμονωμένη πληρωμή',

  pricing_multi_badge:  'Καλύτερη τιμή στα Class Pass',
  pricing_multi_label:  '{{pass}}',
  pricing_multi_title:  'Αφοσιωθείτε στην Πρακτική',
  pricing_multi_sub:    'Όσο περισσότερο εξασκείστε, τόσο περισσότερο εξοικονομείτε.',
  pricing_m4_name:      '4 Μαθήματα',
  pricing_m4_saving:    '%%MP4.per%% ανά μάθημα αντί για %%dropin%% με μεμονωμένη πληρωμή',
  pricing_m8_name:      '8 Μαθήματα',
  pricing_m8_saving:    '%%MP8.per%% ανά μάθημα αντί για %%dropin%% με μεμονωμένη πληρωμή',
  pricing_m12_name:     '12 Μαθήματα',
  pricing_m12_saving:   '%%MP12.per%% ανά μάθημα αντί για %%dropin%% με μεμονωμένη πληρωμή',
  pricing_m20_name:     '20 Μαθήματα',
  pricing_m20_saving:   '%%MP20.per%% ανά μάθημα αντί για %%dropin%% με μεμονωμένη πληρωμή',

  pricing_events_title: 'Εργαστήρια & Ειδικές Εκδηλώσεις',
  pricing_events_desc:  'Τα εργαστήρια και τα άλλα ειδικά μαθήματα έχουν δική τους τιμή σε VIBES, που ορίζεται ξεχωριστά για κάθε εκδήλωση. Δείτε το πρόγραμμα ή επικοινωνήστε μαζί μας.',


  pricing_coworking_title: 'Coworking',
  pricing_coworking_desc:  'Ανοιχτός χώρος εργασίας στο ισόγειο — Wi-Fi, τσάι & καφές περιλαμβάνονται.',
  pricing_coworking_from:  'Δωρεάν ανάμεσα στα μαθήματα με υπόλοιπο πάνω από %%class%% VIBES. Σε κάθε άλλη περίπτωση ισχύουν οι τιμές co-working.',
  pricing_coworking_link:  'Δείτε τις τιμές',

  pricing_extras_title: 'Ψάχνετε κάτι άλλο;',
  pricing_extras_desc:  'Ατομικά προγράμματα και ειδικές εκδηλώσεις τιμολογούνται ξεχωριστά.',
  pricing_extras_link:  'Δείτε Πρόσθετες Υπηρεσίες & Τιμές',

  pricing_how_title:    'Πώς Λειτουργεί',
  pricing_how1_title:   'Επιλέξτε Μάθημα',
  pricing_how1_desc:    'Περιηγηθείτε στο πρόγραμμα και επιλέξτε ένα μάθημα που σας εκφράζει.',
  pricing_how2_title:   'Κλείστε Θέση',
  pricing_how2_desc:    'Συνδεθείτε και κλείστε τη θέση σας με λίγα κλικ — χωρίς περιττά βήματα.',
  pricing_how3_title:   'Ελάτε & Εξασκηθείτε',
  pricing_how3_desc:    'Ελάτε 5–10 λεπτά νωρίτερα. Το χαλάκι σας περιμένει.',
  pricing_class_word:   'μάθημα',
  pricing_classes_word: 'μαθήματα',
  btn_view_schedule:    'Πρόγραμμα',
});

// ── Extra Services / Venue Rental page strings ─────────────────────────────────
Object.assign(SVS_TRANSLATIONS.en, {
  nav_pricelist:            'Extra Services',
  nav_rental:               'Venue Rental',
  nav_rent:                 'Rental',
  pricelist_page_title:     'Extra Services & Pricing | Soul Vibe Space Limassol',

  rental_rooms_title:       'Rooms & Rates',
  rental_rooms_sub:         'Clear hourly rates for a studio, a floor or the whole building.',
  rental_setups_title:      'Choose the Setup for Your Event',
  rental_setups_sub:        'Six ready-made layouts, or ask us to build a custom one.',
  rental_included_title:    'Everything You Need — Already Included',
  rental_included_sub:      'No hidden add-ons for the basics. Everything below comes with the room.',
  rental_addons_title:      'Optional Add-Ons',
  rental_addons_sub:        'Extras that make your event even more comfortable — available at additional charge, please pre-order.',
  rental_addons_onrequest:  'On Request',
  rental_addons_equipment:  'Equipment',
  rental_addons_food:       'Food',
});

// ── Reviews page + homepage preview strings ────────────────────────────────────
Object.assign(SVS_TRANSLATIONS.en, {
  nav_reviews:          'Reviews',
  footer_reviews:       'Reviews',
  reviews_page_title:   'Client Reviews | Soul Vibe Space Limassol',
  reviews_hero_eyebrow: 'CLIENT VOICES',
  reviews_hero_title:   'What People Say About Us',
  reviews_hero_lead:    'Real reviews from our students and guests, collected through our booking platform and Google.',
  reviews_avg_of5:      'out of 5',
  reviews_count_suffix: 'reviews',
  reviews_source_note:  'Ratings and reviews are verified through our booking platform and Google Business Profile.',
  home_reviews_eyebrow: 'CLIENT VOICES',
  home_reviews_title:   'What Our Clients Say',
  home_reviews_sub:     'Real reviews from students and guests of Soul Vibe Space.',
  home_reviews_cta:     'See all reviews',
});

Object.assign(SVS_TRANSLATIONS.ru, {
  nav_pricelist:            'Доп. услуги',
  nav_rental:               'Аренда',
  nav_rent:                 'Аренда',
  pricelist_page_title:     'Дополнительные услуги и цены | Soul Vibe Space Лимасол',

  rental_rooms_title:       'Залы и тарифы',
  rental_rooms_sub:         'Чёткие почасовые тарифы на студию, этаж или всё здание.',
  rental_setups_title:      'Выберите расстановку для вашего события',
  rental_setups_sub:        'Шесть готовых вариантов расстановки — или закажите индивидуальную.',
  rental_included_title:    'Всё необходимое уже включено',
  rental_included_sub:      'Никаких скрытых доплат за базовые вещи. Всё ниже входит в стоимость аренды.',
  rental_addons_title:      'Дополнительные опции',
  rental_addons_sub:        'Опции, которые сделают ваше событие ещё комфортнее — за дополнительную плату, по предзаказу.',
  rental_addons_onrequest:  'По запросу',
  rental_addons_equipment:  'Оборудование',
  rental_addons_food:       'Еда и напитки',
});

Object.assign(SVS_TRANSLATIONS.ru, {
  nav_reviews:          'Отзывы',
  footer_reviews:       'Отзывы',
  reviews_page_title:   'Отзывы клиентов | Soul Vibe Space Лимасол',
  reviews_hero_eyebrow: 'ОТЗЫВЫ КЛИЕНТОВ',
  reviews_hero_title:   'Что говорят о нас клиенты',
  reviews_hero_lead:    'Настоящие отзывы наших учеников и гостей, собранные через платформу онлайн-записи и Google.',
  reviews_avg_of5:      'из 5',
  reviews_count_suffix: 'отзывов',
  reviews_source_note:  'Оценки и отзывы проверены через платформу онлайн-записи и профиль Google Business.',
  home_reviews_eyebrow: 'ОТЗЫВЫ КЛИЕНТОВ',
  home_reviews_title:   'Что говорят наши клиенты',
  home_reviews_sub:     'Настоящие отзывы учеников и гостей Soul Vibe Space.',
  home_reviews_cta:     'Смотреть все отзывы',
});

Object.assign(SVS_TRANSLATIONS.el, {
  nav_pricelist:            'Πρόσθετες Υπηρεσίες',
  nav_rental:               'Ενοικίαση',
  nav_rent:                 'Ενοικίαση',
  pricelist_page_title:     'Πρόσθετες Υπηρεσίες & Τιμές | Soul Vibe Space Λεμεσός',

  rental_rooms_title:       'Αίθουσες & Τιμές',
  rental_rooms_sub:         'Ξεκάθαρες ωριαίες τιμές για studio, όροφο ή όλο το κτίριο.',
  rental_setups_title:      'Επιλέξτε τη Διάταξη για την Εκδήλωσή σας',
  rental_setups_sub:        'Έξι έτοιμες διατάξεις ή ζητήστε μας μια προσαρμοσμένη.',
  rental_included_title:    'Όλα Όσα Χρειάζεστε — Ήδη Περιλαμβάνονται',
  rental_included_sub:      'Χωρίς κρυφές χρεώσεις για τα βασικά. Όλα τα παρακάτω περιλαμβάνονται στην αίθουσα.',
  rental_addons_title:      'Προαιρετικές Προσθήκες',
  rental_addons_sub:        'Επιλογές που κάνουν την εκδήλωσή σας πιο άνετη — με επιπλέον χρέωση, κατόπιν παραγγελίας.',
  rental_addons_onrequest:  'Κατόπιν Αιτήματος',
  rental_addons_equipment:  'Εξοπλισμός',
  rental_addons_food:       'Φαγητό',
});

Object.assign(SVS_TRANSLATIONS.el, {
  nav_reviews:          'Αξιολογήσεις',
  footer_reviews:       'Αξιολογήσεις',
  reviews_page_title:   'Αξιολογήσεις Πελατών | Soul Vibe Space Λεμεσός',
  reviews_hero_eyebrow: 'ΦΩΝΕΣ ΠΕΛΑΤΩΝ',
  reviews_hero_title:   'Τι Λένε οι Πελάτες μας',
  reviews_hero_lead:    'Πραγματικές αξιολογήσεις από τους μαθητές και τους επισκέπτες μας, μέσω της πλατφόρμας κρατήσεων και του Google.',
  reviews_avg_of5:      'από 5',
  reviews_count_suffix: 'αξιολογήσεις',
  reviews_source_note:  'Οι βαθμολογίες και οι αξιολογήσεις επαληθεύονται μέσω της πλατφόρμας κρατήσεων και του προφίλ Google Business.',
  home_reviews_eyebrow: 'ΦΩΝΕΣ ΠΕΛΑΤΩΝ',
  home_reviews_title:   'Τι Λένε οι Πελάτες μας',
  home_reviews_sub:     'Πραγματικές αξιολογήσεις μαθητών και επισκεπτών του Soul Vibe Space.',
  home_reviews_cta:     'Δείτε όλες τις αξιολογήσεις',
});

// ── Pricing page: VIBES programme (Class Pass / Starter Pack, rules, bonuses, FAQ) + /rental ─────
Object.assign(SVS_TRANSLATIONS.en, {
  pricing_page_title:   'Prices: Class Passes, Starter Pack and drop-in | Soul Vibe Space Limassol',
  rental_page_title:    'Studio & Venue Rental | Soul Vibe Space Limassol',



  pv_mp_title:          '{{Pass}}',
  pv_mp_sub:            'For regular practice. The more classes in a {{pass}}, the lower the price per class. The price per class assumes you use all classes.',
  pv_badge_popular:     'Popular',
  pv_sp_title:          '{{Starter}}',
  pv_sp_badge:          'New clients · once',
  pv_sp_sub:            'For new guests only: choose one of the three options, once. VIBES are added to your balance automatically after your payment is confirmed.',

  pv_eq_1:              'on your balance · 1 class',
  pv_eq_2:              'on your balance · 2 classes',
  pv_eq_4:              'on your balance · 4 classes',
  pv_eq_8:              'on your balance · 8 classes',
  pv_eq_12:             'on your balance · 12 classes',
  pv_eq_20:             'on your balance · 20 classes',

  pv_topup_label:       'TOP-UP',
  pv_topup_name:        'Any amount',
  pv_topup_desc:        'Not enough VIBES? Top up your balance at the studio by any amount. With this top-up, %%topup%% gives 1 VIBE.',
  pv_drop_name:         'Single visit',
  pv_drop_desc:         'One regular class. You can pay at the studio without using VIBES.',

  pv_pay_title:         'Payment at the studio',
  pv_pay_text:          'Online payment is not available yet. {{Pass:pl}}, {{starter:pl}}, top-ups and drop-in classes are paid at the studio. Once the administrator confirms payment for a {{pass}}, {{starter}} or top-up, VIBES are added to your balance.',


  pv_faq_title:         'Questions & Answers',
  pv_faq_sub:           'Everything about VIBES, {{pass:pl}} and payment.',
  pv_faq4_q:            'Can I buy a {{starter}} more than once?',
  pv_faq4_a:            'No. A {{starter}} is for new clients and can be purchased only once — choose SP1, SP2 or SP4. After that, {{pass:pl}} and top-ups are available.',
  pv_faq5_q:            'Can I top up a small amount?',
  pv_faq5_a:            'Yes — any amount, at the rate %%topup%% = 1 VIBE.',
  pv_faq6_q:            'How much is a special class?',
  pv_faq6_a:            'Special classes, workshops and events have their own price in VIBES, set separately for each one. Check the schedule or ask the administrator.',
  pv_faq7_q:            'Can I come without a {{pass}}?',
  pv_faq7_a:            'Of course. A drop-in regular class costs %%dropin%%. You can pay at the studio without using VIBES.',
  pv_faq8_q:            'Can I pay online?',
  pv_faq8_a:            'Not yet. Payment is made at the studio. Once the administrator confirms payment for a {{pass}}, {{starter}} or top-up, VIBES appear on your balance.',
  pv_faq11_q:           'Can I get a refund for unused VIBES?',
  pv_faq11_a:           'At the studio’s discretion, the cost of unused purchased VIBES may be refunded at %%refund%% per VIBE. Gift VIBES are not refundable.',

  pv_rental_title:      'Studio & Space Rental',
  pv_rental_desc:       'Rooms, hourly rates, event setups and what’s included — on a separate page.',
  pv_rental_go:         'Space rental →',
});

Object.assign(SVS_TRANSLATIONS.ru, {
  pricing_page_title:   'Цены: абонементы, Стартер пак и разовые занятия | Soul Vibe Space Лимасол',
  rental_page_title:    'Аренда студии и пространства | Soul Vibe Space Лимасол',



  pv_mp_title:          '{{Pass:pl}}',
  pv_mp_sub:            'Для регулярной практики. Чем больше занятий в {{pass:prep}}, тем ниже цена одного занятия. Цена занятия указана при использовании всех занятий.',
  pv_badge_popular:     'Популярный',
  pv_sp_title:          '{{Starter}}',
  pv_sp_badge:          'Для новых · один раз',
  pv_sp_sub:            'Только новым гостям. Можно выбрать один из трёх вариантов один раз. VIBES начисляются на баланс автоматически после подтверждения оплаты.',

  pv_eq_1:              'на баланс · 1 занятие',
  pv_eq_2:              'на баланс · 2 занятия',
  pv_eq_4:              'на баланс · 4 занятия',
  pv_eq_8:              'на баланс · 8 занятий',
  pv_eq_12:             'на баланс · 12 занятий',
  pv_eq_20:             'на баланс · 20 занятий',

  pv_topup_label:       'ПОПОЛНЕНИЕ',
  pv_topup_name:        'На любую сумму',
  pv_topup_desc:        'Не хватает VIBES? Пополните баланс в студии на любую сумму. При таком пополнении %%topup%% даёт 1 VIBE.',
  pv_drop_name:         'Разовое занятие',
  pv_drop_desc:         'Одно обычное занятие. Можно оплатить в студии, не используя VIBES.',

  pv_pay_title:         'Оплата в студии',
  pv_pay_text:          'Онлайн-оплата пока недоступна. {{Pass:pl}}, {{starter:pl}}, пополнения и разовые занятия оплачиваются в студии. Когда администратор подтвердит оплату {{pass:gen}}, {{starter:gen}} или пополнения, VIBES поступят на баланс.',


  pv_faq_title:         'Вопросы и ответы',
  pv_faq_sub:           'Всё о VIBES, {{pass:pl_prep}} и оплате.',
  pv_faq4_q:            'Можно купить {{starter}} ещё раз?',
  pv_faq4_a:            'Нет. {{Starter}} — для новых клиентов, купить его можно только один раз: выберите SP1, SP2 или SP4. Дальше доступны {{pass:pl}} и пополнение баланса.',
  pv_faq5_q:            'Можно пополнить баланс на небольшую сумму?',
  pv_faq5_a:            'Да — на любую сумму по курсу %%topup%% = 1 VIBE.',
  pv_faq6_q:            'Сколько стоит специальное занятие?',
  pv_faq6_a:            'У специальных занятий, воркшопов и событий своя цена в VIBES, она задаётся отдельно для каждого. Смотрите расписание или уточните у администратора.',
  pv_faq7_q:            'Можно прийти без {{pass:gen}}?',
  pv_faq7_a:            'Конечно. Разовое обычное занятие стоит %%dropin%%. Его можно оплатить в студии, не используя VIBES.',
  pv_faq8_q:            'Можно оплатить онлайн?',
  pv_faq8_a:            'Пока нет. Оплата проходит в студии. Когда администратор подтвердит оплату {{pass:gen}}, {{starter:gen}} или пополнения, VIBES появятся на балансе.',
  pv_faq11_q:           'Можно ли вернуть деньги за неиспользованные VIBES?',
  pv_faq11_a:           'По решению студии стоимость неиспользованных купленных VIBES может быть возвращена из расчёта %%refund%% за VIBE. Подаренные VIBES не подлежат возврату.',

  pv_rental_title:      'Аренда пространства',
  pv_rental_desc:       'Залы, почасовые тарифы, варианты расстановки и что включено — на отдельной странице.',
  pv_rental_go:         'Аренда пространства →',
});

Object.assign(SVS_TRANSLATIONS.el, {
  pricing_page_title:   'Τιμές: Class Pass, Starter Pack και μεμονωμένα μαθήματα | Soul Vibe Space Λεμεσός',
  rental_page_title:    'Ενοικίαση Studio & Χώρου | Soul Vibe Space Λεμεσός',



  pv_mp_title:          '{{Pass}}',
  pv_mp_sub:            'Για τακτική εξάσκηση. Όσο περισσότερα μαθήματα έχει το {{pass}}, τόσο χαμηλότερη η τιμή ανά μάθημα. Η τιμή ανά μάθημα ισχύει όταν χρησιμοποιήσετε όλα τα μαθήματα.',
  pv_badge_popular:     'Δημοφιλές',
  pv_sp_title:          '{{Starter}}',
  pv_sp_badge:          'Νέοι πελάτες · μία φορά',
  pv_sp_sub:            'Μόνο για νέους επισκέπτες: επιλέξτε μία από τις τρεις επιλογές, μία φορά. Τα VIBES προστίθενται αυτόματα στο υπόλοιπό σας μετά την επιβεβαίωση της πληρωμής.',

  pv_eq_1:              'στο υπόλοιπο · 1 μάθημα',
  pv_eq_2:              'στο υπόλοιπο · 2 μαθήματα',
  pv_eq_4:              'στο υπόλοιπο · 4 μαθήματα',
  pv_eq_8:              'στο υπόλοιπο · 8 μαθήματα',
  pv_eq_12:             'στο υπόλοιπο · 12 μαθήματα',
  pv_eq_20:             'στο υπόλοιπο · 20 μαθήματα',

  pv_topup_label:       'ΦΟΡΤΙΣΗ',
  pv_topup_name:        'Οποιοδήποτε ποσό',
  pv_topup_desc:        'Δεν σας φτάνουν τα VIBES; Ανανεώστε το υπόλοιπό σας στο στούντιο με οποιοδήποτε ποσό. Με αυτή την ανανέωση, %%topup%% δίνει 1 VIBE.',
  pv_drop_name:         'Μεμονωμένη επίσκεψη',
  pv_drop_desc:         'Ένα τακτικό μάθημα. Μπορείτε να πληρώσετε στο στούντιο χωρίς να χρησιμοποιήσετε VIBES.',

  pv_pay_title:         'Πληρωμή στο studio',
  pv_pay_text:          'Η online πληρωμή δεν είναι ακόμη διαθέσιμη. Τα {{pass}}, τα {{starter}}, οι ανανεώσεις υπολοίπου και τα μεμονωμένα μαθήματα πληρώνονται στο στούντιο. Όταν ο διαχειριστής επιβεβαιώσει την πληρωμή για {{pass}}, {{starter}} ή ανανέωση, τα VIBES προστίθενται στο υπόλοιπό σας.',


  pv_faq_title:         'Ερωτήσεις & Απαντήσεις',
  pv_faq_sub:           'Όλα για τα VIBES, τα {{pass}} και την πληρωμή.',
  pv_faq4_q:            'Μπορώ να αγοράσω {{starter}} ξανά;',
  pv_faq4_a:            'Όχι. Το {{starter}} είναι για νέους πελάτες και αγοράζεται μόνο μία φορά — επιλέξτε SP1, SP2 ή SP4. Στη συνέχεια είναι διαθέσιμα τα {{pass}} και οι φορτίσεις.',
  pv_faq5_q:            'Μπορώ να φορτίσω μικρό ποσό;',
  pv_faq5_a:            'Ναι — οποιοδήποτε ποσό, με ισοτιμία %%topup%% = 1 VIBE.',
  pv_faq6_q:            'Πόσο κοστίζει ένα ειδικό μάθημα;',
  pv_faq6_a:            'Τα ειδικά μαθήματα, τα εργαστήρια και οι εκδηλώσεις έχουν δική τους τιμή σε VIBES, που ορίζεται ξεχωριστά για το καθένα. Δείτε το πρόγραμμα ή ρωτήστε τον διαχειριστή.',
  pv_faq7_q:            'Μπορώ να έρθω χωρίς {{pass}};',
  pv_faq7_a:            'Φυσικά. Ένα μεμονωμένο τακτικό μάθημα κοστίζει %%dropin%%. Μπορείτε να πληρώσετε στο στούντιο χωρίς να χρησιμοποιήσετε VIBES.',
  pv_faq8_q:            'Μπορώ να πληρώσω online;',
  pv_faq8_a:            'Όχι ακόμη. Η πληρωμή γίνεται στο στούντιο. Όταν ο διαχειριστής επιβεβαιώσει την πληρωμή για {{pass}}, {{starter}} ή ανανέωση, τα VIBES εμφανίζονται στο υπόλοιπό σας.',
  pv_faq11_q:           'Μπορώ να πάρω πίσω χρήματα για αχρησιμοποίητα VIBES;',
  pv_faq11_a:           'Κατά την κρίση του στούντιο, η αξία των αχρησιμοποίητων αγορασμένων VIBES μπορεί να επιστραφεί με %%refund%% ανά VIBE. Τα VIBES δώρο δεν επιστρέφονται.',

  pv_rental_title:      'Ενοικίαση Χώρου',
  pv_rental_desc:       'Αίθουσες, ωριαίες τιμές, διατάξεις εκδηλώσεων και τι περιλαμβάνεται — σε ξεχωριστή σελίδα.',
  pv_rental_go:         'Ενοικίαση χώρου →',
});

// ── Footer: legal links (единый подвал, tools/footer.html) ──
Object.assign(SVS_TRANSLATIONS.en, {
  footer_hours_admin: 'Administrator at the studio: 2:00 pm – 10:00 pm',
  contact_hours_classes: 'Classes: daily',
  contact_hours_admin: 'Administrator at the studio',
  footer_terms:   'Terms & Conditions',
  footer_privacy: 'Privacy Policy',
  footer_cookies: 'Cookies',
});
Object.assign(SVS_TRANSLATIONS.ru, {
  footer_hours_admin: 'Администратор в студии: 14:00–22:00',
  contact_hours_classes: 'Занятия: ежедневно',
  contact_hours_admin: 'Администратор в студии',
  footer_terms:   'Условия использования',
  footer_privacy: 'Политика конфиденциальности',
  footer_cookies: 'Cookies',
});
Object.assign(SVS_TRANSLATIONS.el, {
  footer_hours_admin: 'Διαχειριστής στο στούντιο: 14:00–22:00',
  contact_hours_classes: 'Μαθήματα: καθημερινά',
  contact_hours_admin: 'Διαχειριστής στο στούντιο',
  footer_terms:   'Όροι & Προϋποθέσεις',
  footer_privacy: 'Πολιτική Απορρήτου',
  footer_cookies: 'Cookies',
});

// ── Запись на занятие и кабинет: тексты (RU — «запись», на «вы») ─────────────
// Строки окна записи, экрана «Готово», списка записей и отмены в кабинете.
Object.assign(SVS_TRANSLATIONS.en, {
  bk_status_confirmed: 'Confirmed',
  bk_status_past:      'Past',
  bk_status_cancelled: 'Cancelled',
  bk_cancel_btn:       'Cancel booking',
  bk_cancel_title:     'Cancel this booking?',
  bk_cancel_text:      'Your place will be freed up for someone else. Please cancel in advance — no penalty while there’s no online payment.',
  bk_cancel_yes:       'Cancel booking',
  bk_cancel_no:        'Keep booking',
  bk_cancel_fail:      'Could not cancel the booking. Please try again or message us.',
  bk_cancel_done:      'Booking cancelled.',
  bk_showing:          'Showing {n} of {total}',
  bk_load_more:        'Show more ({n})',
  bk_load_error:       'Could not load your bookings. Please try again.',
  bk_retry:            'Try again',
  bk_class:            'Class',
  bk_at:               '{date} at {time}',
  acc_hero_tagline:    'Your Wellness Journey',
  acc_hero_title:      'Move. Breathe.<br><em>Come back.</em>',
  acc_hero_desc:       'Sign in to see your bookings, cancel when plans change and book your next class — all in one place.',
  acc_hero_perk1:      'Your upcoming bookings in one list',
  acc_hero_perk2:      'Cancel a booking in two taps',
  acc_hero_perk3:      'Quick access to the schedule',
  // booking window
  bm_confirm_btn:      'Confirm booking',
  bm_your_booking:     'Your booking',
  bm_booking_for:      'You are booking',
  bm_login_title:      'Sign in to book',
  bm_forgot:           'Forgot password?',
  bm_forgot_title:     'Reset password',
  bm_forgot_info:      'Enter the email of your account — we will send you a link to set a new password.',
  bm_forgot_btn:       'Send link',
  bm_forgot_sent:      'If an account with this email exists, we have sent a link to reset the password. Check your inbox (and the Spam folder).',
  bm_forgot_fail:      'Could not send the email. Please try again later or message us.',
  bm_back_to_login:    '← Back to sign in',
  bm_forgot_need_email: 'Enter your email.',
  bm_cancel_rule:      'Plans changed? Cancel in your account: My bookings → Cancel booking. Please cancel in advance — no penalty while there’s no online payment.',
  bm_success_title:    'You’re booked!',
  bm_success_sub:      'See you at Soul Vibe Space',
  bm_arrive:           'Please arrive 5–10 minutes before the start.',
  bm_address_label:    'Address',
  bm_address:          '50 Agias Zonis, Limassol 3090',
  bm_map:              'Open in Maps',
  bm_add_cal:          'Add to calendar',
  bm_cal_google:       'Google Calendar',
  bm_cal_ics:          'Apple / Outlook (.ics)',
  bm_my_bookings:      'My bookings',
  bm_how_cancel:       'To cancel, open My bookings and press “Cancel booking”. Please cancel in advance — no penalty while there’s no online payment.',
  bm_done:             'Done',
  bm_another:          'Book another class',
  bm_failed:           'Booking failed. Please try again or message us.',
  // schedule price
  sched_price_dropin:  '%%dropin%% drop-in',
  sched_price_hint:    'cheaper with a {{pass}}',
  sched_book_aria:     'Book {name}, {date} at {time}',
});
Object.assign(SVS_TRANSLATIONS.ru, {
  bk_status_confirmed: 'Подтверждена',
  bk_status_past:      'Прошло',
  bk_status_cancelled: 'Отменена',
  bk_cancel_btn:       'Отменить запись',
  bk_cancel_title:     'Отменить запись?',
  bk_cancel_text:      'Место освободится для других. Просим отменять заранее — без штрафа, пока нет онлайн-оплаты.',
  bk_cancel_yes:       'Отменить запись',
  bk_cancel_no:        'Оставить',
  bk_cancel_fail:      'Не удалось отменить запись. Попробуйте ещё раз или напишите нам.',
  bk_cancel_done:      'Запись отменена.',
  bk_showing:          'Показано {n} из {total}',
  bk_load_more:        'Показать ещё ({n})',
  bk_load_error:       'Не удалось загрузить записи. Попробуйте ещё раз.',
  bk_retry:            'Попробовать снова',
  bk_class:            'Занятие',
  bk_at:               '{date} в {time}',
  acc_hero_tagline:    'Ваша практика',
  acc_hero_title:      'Двигайтесь. Дышите.<br><em>Возвращайтесь.</em>',
  acc_hero_desc:       'Войдите, чтобы видеть свои записи, отменять их, если планы изменились, и записываться на следующее занятие — всё в одном месте.',
  acc_hero_perk1:      'Все ваши записи в одном списке',
  acc_hero_perk2:      'Отмена записи в два нажатия',
  acc_hero_perk3:      'Быстрый переход к расписанию',
  acc_reg_sub:         'Создайте аккаунт, чтобы управлять записями',
  acc_all:             'Все записи',
  acc_no_upcoming:     'Предстоящих записей нет',
  acc_no_all:          'Записей пока нет',
  acc_section_bookings:'Мои записи',
  bm_confirm_btn:      'Подтвердить запись',
  bm_your_booking:     'Ваша запись',
  bm_booking_for:      'Вы записываетесь',
  bm_login_title:      'Войдите, чтобы записаться',
  bm_forgot:           'Забыли пароль?',
  bm_forgot_title:     'Восстановление пароля',
  bm_forgot_info:      'Введите email вашего аккаунта — мы пришлём ссылку, чтобы задать новый пароль.',
  bm_forgot_btn:       'Отправить ссылку',
  bm_forgot_sent:      'Если аккаунт с таким email есть, мы отправили ссылку для смены пароля. Проверьте почту (и папку «Спам»).',
  bm_forgot_fail:      'Не удалось отправить письмо. Попробуйте позже или напишите нам.',
  bm_back_to_login:    '← Назад ко входу',
  bm_forgot_need_email: 'Введите email.',
  bm_cancel_rule:      'Планы изменились? Отменить запись можно в кабинете: «Мои записи» → «Отменить запись». Просим отменять заранее — без штрафа, пока нет онлайн-оплаты.',
  bm_success_title:    'Вы записаны!',
  bm_success_sub:      'Ждём вас в Soul Vibe Space',
  bm_arrive:           'Приходите за 5–10 минут до начала.',
  bm_address_label:    'Адрес',
  bm_address:          '50 Agias Zonis, Limassol 3090',
  bm_map:              'Открыть на карте',
  bm_add_cal:          'Добавить в календарь',
  bm_cal_google:       'Google Календарь',
  bm_cal_ics:          'Apple / Outlook (.ics)',
  bm_my_bookings:      'Мои записи',
  bm_how_cancel:       'Чтобы отменить, откройте «Мои записи» и нажмите «Отменить запись». Просим отменять заранее — без штрафа, пока нет онлайн-оплаты.',
  bm_done:             'Готово',
  bm_another:          'Записаться ещё',
  bm_failed:           'Не удалось записаться. Попробуйте ещё раз или напишите нам.',
  sched_price_dropin:  'Разово %%dropin%%',
  sched_price_hint:    'с {{pass:ins}} дешевле',
  sched_book_aria:     'Записаться: {name}, {date} в {time}',
});
Object.assign(SVS_TRANSLATIONS.el, {
  bk_status_confirmed: 'Επιβεβαιωμένη',
  bk_status_past:      'Πέρασε',
  bk_status_cancelled: 'Ακυρώθηκε',
  bk_cancel_btn:       'Ακύρωση κράτησης',
  bk_cancel_title:     'Ακύρωση της κράτησης;',
  bk_cancel_text:      'Η θέση σας θα ελευθερωθεί για κάποιον άλλο. Παρακαλούμε ακυρώνετε έγκαιρα — χωρίς χρέωση, όσο δεν υπάρχουν online πληρωμές.',
  bk_cancel_yes:       'Ακύρωση κράτησης',
  bk_cancel_no:        'Διατήρηση',
  bk_cancel_fail:      'Η ακύρωση δεν ήταν δυνατή. Δοκιμάστε ξανά ή στείλτε μας μήνυμα.',
  bk_cancel_done:      'Η κράτηση ακυρώθηκε.',
  bk_showing:          'Εμφανίζονται {n} από {total}',
  bk_load_more:        'Περισσότερα ({n})',
  bk_load_error:       'Δεν ήταν δυνατή η φόρτωση των κρατήσεων. Δοκιμάστε ξανά.',
  bk_retry:            'Δοκιμάστε ξανά',
  bk_class:            'Μάθημα',
  bk_at:               '{date} στις {time}',
  acc_hero_tagline:    'Η πρακτική σας',
  acc_hero_title:      'Κινηθείτε. Αναπνεύστε.<br><em>Ελάτε ξανά.</em>',
  acc_hero_desc:       'Συνδεθείτε για να βλέπετε τις κρατήσεις σας, να τις ακυρώνετε αν αλλάξουν τα σχέδια και να κλείνετε το επόμενο μάθημα — όλα σε ένα μέρος.',
  acc_hero_perk1:      'Όλες οι κρατήσεις σας σε μία λίστα',
  acc_hero_perk2:      'Ακύρωση με δύο πατήματα',
  acc_hero_perk3:      'Γρήγορη πρόσβαση στο πρόγραμμα',
  bm_confirm_btn:      'Επιβεβαίωση κράτησης',
  bm_your_booking:     'Η κράτησή σας',
  bm_booking_for:      'Κάνετε κράτηση για',
  bm_login_title:      'Συνδεθείτε για να κάνετε κράτηση',
  bm_forgot:           'Ξεχάσατε τον κωδικό;',
  bm_forgot_title:     'Επαναφορά κωδικού',
  bm_forgot_info:      'Γράψτε το email του λογαριασμού σας — θα σας στείλουμε σύνδεσμο για νέο κωδικό.',
  bm_forgot_btn:       'Αποστολή συνδέσμου',
  bm_forgot_sent:      'Αν υπάρχει λογαριασμός με αυτό το email, στείλαμε σύνδεσμο επαναφοράς. Ελέγξτε τα εισερχόμενα (και τα Ανεπιθύμητα).',
  bm_forgot_fail:      'Η αποστολή απέτυχε. Δοκιμάστε αργότερα ή στείλτε μας μήνυμα.',
  bm_back_to_login:    '← Πίσω στη σύνδεση',
  bm_forgot_need_email: 'Συμπληρώστε το email σας.',
  bm_cancel_rule:      'Άλλαξαν τα σχέδια; Ακυρώστε από τον λογαριασμό σας: Οι κρατήσεις μου → Ακύρωση κράτησης. Παρακαλούμε ακυρώνετε έγκαιρα — χωρίς χρέωση, όσο δεν υπάρχουν online πληρωμές.',
  bm_success_title:    'Η κράτησή σας έγινε!',
  bm_success_sub:      'Σας περιμένουμε στο Soul Vibe Space',
  bm_arrive:           'Ελάτε 5–10 λεπτά πριν την έναρξη.',
  bm_address_label:    'Διεύθυνση',
  bm_address:          'Αγίας Ζώνης 50, Λεμεσός 3090',
  bm_map:              'Άνοιγμα στον χάρτη',
  bm_add_cal:          'Προσθήκη στο ημερολόγιο',
  bm_cal_google:       'Google Calendar',
  bm_cal_ics:          'Apple / Outlook (.ics)',
  bm_my_bookings:      'Οι κρατήσεις μου',
  bm_how_cancel:       'Για ακύρωση ανοίξτε «Οι κρατήσεις μου» και πατήστε «Ακύρωση κράτησης». Παρακαλούμε ακυρώνετε έγκαιρα — χωρίς χρέωση, όσο δεν υπάρχουν online πληρωμές.',
  bm_done:             'Τέλος',
  bm_another:          'Νέα κράτηση',
  bm_failed:           'Η κράτηση απέτυχε. Δοκιμάστε ξανά ή στείλτε μας μήνυμα.',
  sched_price_dropin:  '%%dropin%% μεμονωμένα',
  sched_price_hint:    'φθηνότερα με {{pass}}',
  sched_book_aria:     'Κράτηση: {name}, {date} στις {time}',
});
// EN: единый призыв «Book a class» (на карточках расписания — короткое «Book»)
Object.assign(SVS_TRANSLATIONS.en, { acc_book_class: 'Book a class', acc_action_bookclass: 'Book a class', acc_section_bookings: 'My bookings', acc_all: 'All bookings' });
Object.assign(SVS_TRANSLATIONS.el, { acc_section_bookings: 'Οι κρατήσεις μου' });

// ── Названия классов: перевод без потери языка класса и преподавателя ───────
// В SimplyBook язык класса пишется в скобках: (rus), (Eng.), (rus/eng), (Eng/Rus),
// преподаватель — после «with». При переводе названия по SVS_SERVICE_NAMES язык
// и имя добавляются обратно: «Виньяса йога (англ.) · Стефани».
Object.assign(SVS_SERVICE_NAMES, {
  97:  { en: 'Ecstatic Dance at the Rancho', ru: 'Экстатический танец на Ранчо', el: 'Ecstatic Dance στο Rancho' },
  138: { en: 'Aerial Yoga', ru: 'Аэройога', el: 'Aerial Yoga' },
  142: { en: 'Kundalini Yoga, 90 min', ru: 'Кундалини йога, 90 мин', el: 'Kundalini Yoga, 90 λεπτά' },
  145: { en: 'Yin Yoga', ru: 'Инь йога', el: 'Yin Yoga' },
  146: { en: 'Low Hammock: Healthy Spine', ru: 'Низкий гамак: здоровая спина', el: 'Χαμηλή αιώρα: Υγιής σπονδυλική στήλη' },
  147: { en: 'Lila – Transformation Game', ru: 'Лила — игра трансформации', el: 'Lila — Παιχνίδι μεταμόρφωσης' },
  148: { en: 'Morning Hatha Yoga', ru: 'Утренняя хатха йога', el: 'Πρωινή Hatha Yoga' },
});
const SVS_CLASS_LANG = {
  en: { ru: 'Russian', en: 'English', sep: '/' },
  ru: { ru: 'рус.', en: 'англ.', sep: '/' },
  el: { ru: 'ρωσικά', en: 'αγγλικά', sep: '/' },
};
// Имена преподавателей на русском (остальные языки — латиницей, как в SimplyBook).
const SVS_TEACHER_RU = { Stephanie: 'Стефани', Elena: 'Елена', Tati: 'Тати', Larisa: 'Лариса' };
const SVS_LANG_TAG_RX = /\s*\(\s*(rus|eng|ru|en)\.?\s*(?:\/\s*(rus|eng|ru|en)\.?\s*)?\)/i;
const SVS_WITH_RX = /\s+(?:class\s+)?with\s+([A-ZА-Я][\p{L}-]+)(?=[\s,(|]|$)/u;
const SVS_WITH_STOP = { Live: 1 };

function svsClassInfo(serviceId, rawName, lang) {
  lang = lang || (window.SVS_I18N ? window.SVS_I18N.getLang() : 'en');
  const raw = String(rawName || '').trim();
  const tag = raw.match(SVS_LANG_TAG_RX);
  const langs = tag ? [tag[1], tag[2]].filter(Boolean).map(x => x.toLowerCase().slice(0, 2) === 'ru' ? 'ru' : 'en') : [];
  const w = raw.match(SVS_WITH_RX);
  const teacher = (w && !SVS_WITH_STOP[w[1]]) ? w[1] : '';
  const map = SVS_SERVICE_NAMES[serviceId];
  let base = map ? (map[lang] || map.en) : raw;
  if (!map) {
    base = base.replace(SVS_LANG_TAG_RX, '');
    if (teacher) base = base.replace(SVS_WITH_RX, '');
    base = base.replace(/\s+,/g, ',').replace(/\s{2,}/g, ' ').trim() || raw;
  }
  const L = SVS_CLASS_LANG[lang] || SVS_CLASS_LANG.en;
  const langLabel = langs.length ? '(' + langs.map(x => L[x]).join(L.sep) + ')' : '';
  const t = teacher && lang === 'ru' ? (SVS_TEACHER_RU[teacher] || teacher) : teacher;
  return { title: base + (langLabel ? ' ' + langLabel : ''), teacher: t, langs: langs };
}
// Полное название для мест без отдельной строки преподавателя: «Инь йога (рус.) · Елена».
function svsClassName(serviceId, rawName, lang) {
  const i = svsClassInfo(serviceId, rawName, lang);
  return i.teacher ? i.title + ' · ' + i.teacher : i.title;
}
// Провайдер SimplyBook — человек? «Hatha Yoga (rus)», «Soul Vibe Space LTD», «Vinyasa instructor»
// и т. п. — служебные названия ресурсов, на сайте их не показываем.
function svsIsPersonName(name) {
  const n = String(name || '').trim();
  if (!n || n.split(/\s+/).length > 3) return false;
  return !/instructor|teacher|yoga|ltd|soul\s*vibe|qigong|hatha|vinyasa|kundalini|pilates|aerial|hip\s*-?hop|\bdj\b|\bHE\b|[()&\d]|morning|class|studio/i.test(n);
}
// Преподаватель для показа: человек-провайдер или имя из названия класса.
function svsTeacherName(serviceId, rawName, unitName, lang) {
  if (svsIsPersonName(unitName)) return lang === 'ru' || (!lang && window.SVS_I18N && window.SVS_I18N.getLang() === 'ru') ? (SVS_TEACHER_RU[unitName] || unitName) : unitName;
  return svsClassInfo(serviceId, rawName, lang).teacher;
}
window.svsClassInfo = svsClassInfo;
window.svsClassName = svsClassName;
window.svsIsPersonName = svsIsPersonName;
window.svsTeacherName = svsTeacherName;

// ── Оплата при записи: только показ, ничего не списывается ──────────────────
// Плейсхолдеры: {lot} — название абонемента/Стартер пака с кодом (MP8, SP2) в нужном падеже,
// {n}/{left}/{have}/{miss} — VIBES, {d}/{c} — даты. 1 класс = 20 VIBES, 1 € = 1 VIBE.
// Слово VIBES показываем только тем, у кого есть абонемент или Стартер пак.
Object.assign(SVS_TRANSLATIONS.en, {
  pay_title:        'Payment',
  pay_guest:        'Drop-in class %%dropin%%, pay at the studio',
  pay_guest_login:  'Have a {{pass}}? Sign in to book with it',
  pay_studio:       'Pay at the studio: %%dropin%%',
  pay_studio_hint:  'Classes are cheaper with a {{pass}}',
  pay_full:         'Paid with {lot}: {n} VIBES will be used, {left} left{note}.',
  pay_with_bookings:' (including your other bookings)',
  pay_until:        'Valid until {d}.',
  pay_or_studio:    'Prefer to pay at the studio? %%dropin%% — just tell the front desk.',
  pay_partial:      'Your {lot} has {have} VIBES{note} — {miss} short. Pay the difference at the studio: €{miss}',
  pay_partial_note: ' left after your other bookings',
  pay_used:         'The VIBES on your {lot} are already reserved for your other bookings. Pay at the studio: %%dropin%%',
  pay_expired:      'Your {lot} is valid until {d}, and the class is on {c}. Pay %%dropin%% at the studio or {action}.',
  pay_renew:        'renew your {{pass}}',
  pay_buy:          'get a {{pass}}',
  pay_unknown:      'Payment: with your {{pass}} or %%dropin%% at the studio',
  pay_success_full: '{n} VIBES from your {lot} will be used at the visit.',
  pay_bonus:        'Gift VIBES',
  pay_full_bonus:   'Paid with gift VIBES: {n} VIBES will be used, {left} left{note}.',
  pay_partial_bonus:'Bonus VIBES: {have}{note} — {miss} short. Pay the difference at the studio: €{miss}',
  pay_used_bonus:   'Your gift VIBES are already reserved for your other bookings. Pay at the studio: %%dropin%%',
  pay_expired_bonus:'Your bonus VIBES are valid until {d}, and the class is on {c}. Pay at the studio: %%dropin%%.',
  pay_success_full_bonus:'{n} bonus VIBES will be used at the visit.',
  vibes_see_passes: 'See Class Passes',
  vibes_active_mixed: 'Active VIBES',
  vibes_none_lead:  'Classes are cheaper with a {{pass}}.',
});
Object.assign(SVS_TRANSLATIONS.ru, {
  pay_title:        'Оплата',
  pay_guest:        'Разовое занятие %%dropin%%, оплата в студии',
  pay_guest_login:  'Есть {{pass}}? Войдите, чтобы записаться по нему',
  pay_studio:       'Оплата в студии: %%dropin%%',
  pay_studio_hint:  'С {{pass:ins}} занятие дешевле',
  pay_full:         'Оплата по {lot:dat}: спишется {n} VIBES, останется {left}{note}.',
  pay_with_bookings:' — с учётом ваших записей',
  pay_until:        'Действует до {d}.',
  pay_or_studio:    'Оплачу в студии: %%dropin%% — просто скажите администратору.',
  pay_partial:      'На {lot:prep} {have} VIBES{note} — не хватает {miss}. Доплата в студии: €{miss}',
  pay_partial_note: ' с учётом ваших записей',
  pay_used:         'VIBES на {lot:prep} уже учтены в ваших записях. Оплата в студии: %%dropin%%',
  pay_expired:      '{Lot} действует до {d}, а занятие {c}. Оплата в студии %%dropin%% или {action}.',
  pay_renew:        'продлите {{pass:acc}}',
  pay_buy:          'выберите {{pass:acc}}',
  pay_unknown:      'Оплата: по {{pass:dat}} или %%dropin%% в студии',
  pay_success_full: 'При посещении с {lot:gen} спишется {n} VIBES.',
  pay_bonus:        'VIBES в подарок',
  pay_full_bonus:   'Оплата подаренными VIBES: спишется {n} VIBES, останется {left}{note}.',
  pay_partial_bonus:'Бонусных VIBES: {have}{note} — не хватает {miss}. Доплата в студии: €{miss}',
  pay_used_bonus:   'Подаренные VIBES уже учтены в ваших записях. Оплата в студии: %%dropin%%',
  pay_expired_bonus:'Бонусные VIBES действуют до {d}, а занятие {c}. Оплата в студии: %%dropin%%.',
  pay_success_full_bonus:'При посещении спишется {n} бонусных VIBES.',
  vibes_see_passes: 'Посмотреть {{pass:pl}}',
  vibes_active_mixed: 'Активные VIBES',
  vibes_none_lead:  'С {{pass:ins}} занятия дешевле.',
});
// EL: вежливая форма («εσείς»/σας), как и на остальном сайте.
Object.assign(SVS_TRANSLATIONS.el, {
  pay_title:        'Πληρωμή',
  pay_guest:        'Μεμονωμένο μάθημα %%dropin%%, πληρωμή στο στούντιο',
  pay_guest_login:  'Έχετε {{pass}}; Συνδεθείτε για να κλείσετε με αυτό',
  pay_studio:       'Πληρωμή στο στούντιο: %%dropin%%',
  pay_studio_hint:  'Με {{pass}} το μάθημα κοστίζει λιγότερο',
  pay_full:         'Πληρωμή με {lot}: θα χρησιμοποιηθούν {n} VIBES, θα μείνουν {left}{note}.',
  pay_with_bookings:' (μαζί με τις άλλες κρατήσεις σας)',
  pay_until:        'Ισχύει έως {d}.',
  pay_or_studio:    'Θα πληρώσω στο στούντιο: %%dropin%% — απλώς ενημερώστε τη ρεσεψιόν.',
  pay_partial:      'Στο {lot} έχετε {have} VIBES{note} — λείπουν {miss}. Συμπλήρωση στο στούντιο: €{miss}',
  pay_partial_note: ' μετά τις άλλες κρατήσεις σας',
  pay_used:         'Τα VIBES του {lot} έχουν ήδη δεσμευτεί για τις άλλες κρατήσεις σας. Πληρωμή στο στούντιο: %%dropin%%',
  pay_expired:      'Το {lot} ισχύει έως {d}, ενώ το μάθημα είναι στις {c}. Πληρώστε %%dropin%% στο στούντιο ή {action}.',
  pay_renew:        'ανανεώστε το {{pass}}',
  pay_buy:          'αποκτήστε ένα {{pass}}',
  pay_unknown:      'Πληρωμή: με {{pass}} ή %%dropin%% στο στούντιο',
  pay_success_full: 'Στην επίσκεψη θα χρησιμοποιηθούν {n} VIBES από το {lot}.',
  pay_bonus:        'VIBES δώρο',
  pay_full_bonus:   'Πληρωμή με VIBES δώρο: θα χρησιμοποιηθούν {n} VIBES, θα μείνουν {left}{note}.',
  pay_partial_bonus:'Bonus VIBES: {have}{note} — λείπουν {miss}. Συμπλήρωση στο στούντιο: €{miss}',
  pay_used_bonus:   'Τα VIBES δώρο σας έχουν ήδη δεσμευτεί για τις άλλες κρατήσεις σας. Πληρωμή στο στούντιο: %%dropin%%',
  pay_expired_bonus:'Τα bonus VIBES σας ισχύουν έως {d}, ενώ το μάθημα είναι στις {c}. Πληρωμή στο στούντιο: %%dropin%%.',
  pay_success_full_bonus:'Στην επίσκεψη θα χρησιμοποιηθούν {n} bonus VIBES.',
  vibes_see_passes: 'Δείτε τα {{pass:pl}}',
  vibes_active_mixed: 'Ενεργά VIBES',
  vibes_none_lead:  'Με {{pass}} τα μαθήματα κοστίζουν λιγότερο.',
});

// ── /vibes: программа лояльности VIBES (+ ссылки в шапке, подвале, /pricing, кабинете) ──
// Цифры — только токены %%…%% (SVS_PRICES выше), термины — {{pass}} / {{starter}}.
Object.assign(SVS_TRANSLATIONS.en, {
  nav_vibes:            'VIBES',
  footer_vibes:         'VIBES',
  vibes_how_link:       'How VIBES work →',
  vb_page_title:         'VIBES — your balance for classes | Soul Vibe Space Limassol',
  vb_eyebrow:            'VIBES · your balance for classes',
  vb_h1:                 'Make more room for practice',
  vb_lead:               'Every studio guest has a VIBES balance. When you buy any {{pass}} or {{Starter}}, VIBES are added to it automatically. With a {{pass}}, you get more VIBES than with a standard top-up for the same amount.',
  vb_more_cowork_a:      'Between classes, co-working is free if you have more than %%class%% VIBES on your balance. Otherwise, <a href="/price-list#coworking">co-working rates</a> apply.',
  vb_more_cowork_q:      'Co-working',
  vb_more_gifts_a:       'Bring a friend who is new to the studio and get %%bonus.friend%% gift VIBES: just tell the administrator. On your birthday we add %%bonus.birthday%% gift VIBES automatically if your date of birth is in your <a href="/account">personal account</a>.',
  vb_more_gifts_q:       'Gifts for a friend and your birthday',
  vb_cta_find:           'Find a class',
  vb_cta_balance:        'View my balance',
  vb_use_text:           'Book as usual. We deduct %%class%% VIBES for a regular class when you attend, not when you book. Special events are priced separately.',
  vb_use_title:          'Using your balance',
  vb_gift_b_desc:        '20 gift VIBES in total for the month. That’s enough for one more regular class.',
  vb_gift_b_title:       '10 or more visits',
  vb_gift_a_desc:        '10 gift VIBES.',
  vb_gift_a_title:       '4–9 visits',
  vb_new_note:           'This one-time offer for new guests also adds VIBES to your balance automatically.',
  vb_new_q:              'New here?',
  vb_reg_q:              'Already practise with us?',
  vb_ex_text:            'That’s what you get with a %%MP20.classes%%-class pass. A standard top-up would cover %%MP20.topup_classes%% regular classes; the pass covers %%MP20.classes%%.',
  vb_ex_title:           '%%MP20.vibes%% VIBES instead of %%MP20.topup_vibes%% for the same amount',
  vb_cta_pass:          'Choose a {{pass}}',
  vb_cta_starter:        'Explore the {{Starter}}',
  vb_rules_title:       'All VIBES rules',
  vb_rule1:             '<strong>Validity</strong> of a {{pass}} starts from your first visit, not from the purchase date.',
  vb_rule2:             '<strong>Order of use:</strong> VIBES are taken from the earliest purchase first.',
  vb_rule3:             '<strong>Top-up:</strong> any amount at the studio, %%topup%%\u00a0=\u00a01\u00a0VIBE.',
  vb_rule4:             '<strong>Freeze:</strong> on request in your <a href="/account">personal account</a>, up to %%freeze%% days.',
  vb_rule5:             '<strong>Personal:</strong> a {{pass}} is not intended to be transferred to other people. To give a class as a present, choose a <a href="/gift-certificates">gift certificate</a>.',
  vb_rule6:             '<strong>Cancellation:</strong> please cancel your booking in advance. No penalty while online payment is not available.',
  vb_rules_terms:       'Full terms — in the <a href="/terms#booking">Terms &amp; Conditions</a>.',
  vb_faq_title:         'More about VIBES',
  vb_faq3_q:            'Do VIBES expire?',
  vb_faq3_a:             'VIBES from a {{pass}} or {{Starter}} are valid for its period, which starts from your first visit. Gift VIBES never expire.',
  vb_faq5_q:            'What if I don’t have enough VIBES?',
  vb_faq5_a:             'Top up your balance at the studio by any amount, or pay for the class at the studio without using VIBES.',
  vb_faq6_q:            'Where can I see my balance?',
  vb_faq6_a:             'In your <a href="/account">personal account</a>: current VIBES balance, your {{pass:pl}} with expiry dates and the history of credits and visits.',
  vb_gift_title:         'Your practice earns you gift VIBES',
  vb_gift_sub:           'What counts here is how many times you come to class in a calendar month, not which pass you buy.',
  vb_gift_how:           'Your gift appears automatically on the first day of the following month. Gift VIBES never expire.',
  pv_sum_title:         'VIBES in brief',
  pv_sum_text:           'With a {{pass}}, you get more VIBES than with a standard top-up for the same amount. Regular visits earn gift VIBES separately.',
  pv_vibes_link:        'How VIBES work →',
  pv_days_from_first:   'days from your first visit',
  pv_rules_note:        'Validity, order of use, freezing, gift VIBES and other rules — on the <a href="/vibes#rules">VIBES</a> page.',
});
Object.assign(SVS_TRANSLATIONS.ru, {
  nav_vibes:            'VIBES',
  footer_vibes:         'VIBES',
  vibes_how_link:       'Как работают VIBES →',
  vb_page_title:         'VIBES — ваш баланс для занятий | Soul Vibe Space Лимасол',
  vb_eyebrow:            'VIBES · ваш баланс для занятий',
  vb_h1:                 'Больше практики в вашей жизни',
  vb_lead:               'У каждого гостя студии есть баланс VIBES. При покупке любого {{pass:gen}} или {{starter:gen}} VIBES начисляются на него автоматически. С {{pass:ins}} пополнять баланс выгоднее, чем при обычном пополнении.',
  vb_more_cowork_a:      'Между занятиями коворкинг бесплатен, если на балансе больше %%class%% VIBES. В остальных случаях действуют <a href="/price-list#coworking">тарифы коворкинга</a>.',
  vb_more_cowork_q:      'Коворкинг',
  vb_more_gifts_a:       'Приведите друга, который впервые в студии, и получите %%bonus.friend%% VIBES в подарок: просто скажите администратору. В день рождения мы начислим %%bonus.birthday%% VIBES в подарок автоматически, если дата рождения указана в <a href="/account">личном кабинете</a>.',
  vb_more_gifts_q:       'Подарки за друга и на день рождения',
  vb_cta_find:           'Выбрать практику',
  vb_cta_balance:        'Посмотреть мой баланс',
  vb_use_text:           'Запишитесь на практику как обычно. Когда вы придёте, с баланса спишутся %%class%% VIBES за обычное занятие. При записи VIBES не списываются. У специальных событий своя стоимость.',
  vb_use_title:          'Как пользоваться балансом',
  vb_gift_b_desc:        'Всего 20 VIBES в подарок за месяц. Этого хватит ещё на одно обычное занятие.',
  vb_gift_b_title:       '10 посещений и больше',
  vb_gift_a_desc:        '10 VIBES в подарок.',
  vb_gift_a_title:       '4–9 посещений',
  vb_new_note:           'Это разовое предложение для новых гостей: VIBES тоже поступят на баланс автоматически.',
  vb_new_q:              'Впервые у нас?',
  vb_reg_q:              'Уже ходите к нам?',
  vb_ex_text:            'Столько вы получите с {{pass:ins}} на %%MP20.classes%% занятий. При обычном пополнении этой суммы хватило бы на %%MP20.topup_classes%% занятий, а с {{pass:ins}} хватит на %%MP20.classes%%.',
  vb_ex_title:           '%%MP20.vibes%% VIBES вместо %%MP20.topup_vibes%% за ту же сумму',
  vb_cta_pass:          'Выбрать {{pass}}',
  vb_cta_starter:        'Посмотреть {{starter}}',
  vb_rules_title:       'Все правила VIBES',
  vb_rule1:             '<strong>Срок {{pass:gen}}</strong> отсчитывается с первого посещения, а не с даты покупки.',
  vb_rule2:             '<strong>Порядок списания:</strong> сначала из более ранней покупки.',
  vb_rule3:             '<strong>Пополнение:</strong> на любую сумму в студии, %%topup%%\u00a0=\u00a01\u00a0VIBE.',
  vb_rule4:             '<strong>Заморозка:</strong> по заявлению в <a href="/account">личном кабинете</a>, до %%freeze%% дней.',
  vb_rule5:             '<strong>Именной:</strong> {{pass}} не предназначен для передачи третьим лицам. Чтобы подарить занятие, выберите <a href="/gift-certificates">сертификат</a>.',
  vb_rule6:             '<strong>Отмена записи:</strong> пожалуйста, отменяйте заранее. Без штрафа, пока нет онлайн-оплаты.',
  vb_rules_terms:       'Полные условия — в <a href="/terms#booking">Правилах и условиях</a>.',
  vb_faq_title:         'Ещё о VIBES',
  vb_faq3_q:            'Сгорают ли VIBES?',
  vb_faq3_a:             'VIBES из {{pass:gen}} или {{Starter:gen}} действуют в его срок, который отсчитывается с первого посещения. VIBES в подарок не сгорают.',
  vb_faq5_q:            'Что если не хватает VIBES?',
  vb_faq5_a:             'Пополните баланс в студии на любую сумму или оплатите занятие в студии, не используя VIBES.',
  vb_faq6_q:            'Где посмотреть баланс?',
  vb_faq6_a:             'В <a href="/account">личном кабинете</a>: текущий баланс VIBES, ваши {{pass:pl}} со сроками и история начислений и посещений.',
  vb_gift_title:         'Регулярная практика приносит VIBES в подарок',
  vb_gift_sub:           'Здесь важна не покупка, а то, сколько раз вы пришли на практику за календарный месяц.',
  vb_gift_how:           'Подарок появится на балансе автоматически первого числа следующего месяца. Подаренные VIBES не сгорают.',
  pv_sum_title:         'VIBES коротко',
  pv_sum_text:           'С {{pass:ins}} вы получаете больше VIBES, чем при обычном пополнении на ту же сумму. За регулярные посещения студия дарит VIBES отдельно.',
  pv_vibes_link:        'Как работают VIBES →',
  pv_days_from_first:   'дней с первого посещения',
  pv_rules_note:        'Срок действия, порядок списания, заморозка, VIBES в подарок и другие правила — на странице <a href="/vibes#rules">VIBES</a>.',
});
Object.assign(SVS_TRANSLATIONS.el, {
  nav_vibes:            'VIBES',
  footer_vibes:         'VIBES',
  vibes_how_link:       'Πώς λειτουργούν τα VIBES →',
  vb_page_title:         'VIBES — το υπόλοιπό σας για μαθήματα | Soul Vibe Space Λεμεσός',
  vb_eyebrow:            'VIBES · το υπόλοιπό σας για μαθήματα',
  vb_h1:                 'Περισσότερος χώρος για γιόγκα στη ζωή σας',
  vb_lead:               'Κάθε επισκέπτης του στούντιο έχει το δικό του υπόλοιπο VIBES. Με την αγορά οποιουδήποτε {{pass}} ή {{Starter}}, τα VIBES προστίθενται αυτόματα στο υπόλοιπό σας. Με το {{pass}} παίρνετε περισσότερα VIBES από ό,τι με μια απλή ανανέωση για το ίδιο ποσό.',
  vb_more_cowork_a:      'Ανάμεσα στα μαθήματα το co-working είναι δωρεάν, αν έχετε υπόλοιπο πάνω από %%class%% VIBES. Σε κάθε άλλη περίπτωση ισχύουν οι <a href="/price-list#coworking">τιμές co-working</a>.',
  vb_more_cowork_q:      'Co-working',
  vb_more_gifts_a:       'Φέρτε έναν φίλο που έρχεται για πρώτη φορά στο στούντιο και πάρτε %%bonus.friend%% VIBES δώρο: απλώς ενημερώστε τη ρεσεψιόν. Στα γενέθλιά σας προσθέτουμε αυτόματα %%bonus.birthday%% VIBES δώρο, αν η ημερομηνία γέννησής σας είναι στον <a href="/account">προσωπικό σας λογαριασμό</a>.',
  vb_more_gifts_q:       'Δώρα για φίλο και για τα γενέθλιά σας',
  vb_cta_find:           'Βρείτε μάθημα',
  vb_cta_balance:        'Δείτε το υπόλοιπό σας',
  vb_use_text:           'Κάντε την κράτησή σας όπως συνήθως. Για κάθε τακτικό μάθημα αφαιρούνται %%class%% VIBES όταν έρχεστε στο στούντιο, όχι όταν κάνετε κράτηση. Οι ειδικές εκδηλώσεις έχουν ξεχωριστή τιμή.',
  vb_use_title:          'Πώς χρησιμοποιείτε το υπόλοιπό σας',
  vb_gift_b_desc:        'Συνολικά 20 VIBES δώρο για τον μήνα. Αρκούν για ένα ακόμη τακτικό μάθημα.',
  vb_gift_b_title:       '10 ή περισσότερες επισκέψεις',
  vb_gift_a_desc:        '10 VIBES δώρο.',
  vb_gift_a_title:       '4–9 επισκέψεις',
  vb_new_note:           'Είναι διαθέσιμο μία φορά για κάθε νέο επισκέπτη και τα VIBES προστίθενται αυτόματα στο υπόλοιπό σας.',
  vb_new_q:              'Πρώτη φορά εδώ;',
  vb_reg_q:              'Έρχεστε ήδη στο στούντιο;',
  vb_ex_text:            'Τόσα VIBES παίρνετε με το {{pass}} των %%MP20.classes%% μαθημάτων. Με μια απλή ανανέωση το ίδιο ποσό αρκεί για %%MP20.topup_classes%% τακτικά μαθήματα· με το {{pass}} αρκεί για %%MP20.classes%%.',
  vb_ex_title:           '%%MP20.vibes%% VIBES αντί για %%MP20.topup_vibes%% με το ίδιο ποσό',
  vb_cta_pass:          'Επιλέξτε {{pass}}',
  vb_cta_starter:        'Δείτε το {{Starter}}',
  vb_rules_title:       'Όλοι οι κανόνες VIBES',
  vb_rule1:             '<strong>Η ισχύς</strong> ενός {{pass}} μετρά από την πρώτη επίσκεψη, όχι από την ημερομηνία αγοράς.',
  vb_rule2:             '<strong>Σειρά χρέωσης:</strong> πρώτα από την παλαιότερη αγορά.',
  vb_rule3:             '<strong>Φόρτιση:</strong> οποιοδήποτε ποσό στο στούντιο, %%topup%%\u00a0=\u00a01\u00a0VIBE.',
  vb_rule4:             '<strong>Πάγωμα:</strong> με αίτημα στον <a href="/account">προσωπικό σας λογαριασμό</a>, έως %%freeze%% ημέρες.',
  vb_rule5:             '<strong>Προσωπικό:</strong> το {{pass}} δεν προορίζεται για μεταβίβαση σε τρίτους. Για να χαρίσετε ένα μάθημα, επιλέξτε μια <a href="/gift-certificates">δωροκάρτα</a>.',
  vb_rule6:             '<strong>Ακύρωση:</strong> παρακαλούμε ακυρώνετε την κράτηση εκ των προτέρων. Χωρίς χρέωση, όσο δεν υπάρχουν online πληρωμές.',
  vb_rules_terms:       'Πλήρεις όροι — στους <a href="/terms#booking">Όρους &amp; Προϋποθέσεις</a>.',
  vb_faq_title:         'Περισσότερα για τα VIBES',
  vb_faq3_q:            'Λήγουν τα VIBES;',
  vb_faq3_a:             'Τα VIBES από ένα {{pass}} ή {{Starter}} ισχύουν για τη διάρκειά του, που ξεκινά από την πρώτη σας επίσκεψη. Τα VIBES δώρο δεν λήγουν.',
  vb_faq5_q:            'Τι γίνεται αν δεν μου φτάνουν τα VIBES;',
  vb_faq5_a:             'Ανανεώστε το υπόλοιπό σας στο στούντιο με οποιοδήποτε ποσό ή πληρώστε το μάθημα στο στούντιο χωρίς να χρησιμοποιήσετε VIBES.',
  vb_faq6_q:            'Πού βλέπω το υπόλοιπό μου;',
  vb_faq6_a:             'Στον <a href="/account">προσωπικό σας λογαριασμό</a>: τρέχον υπόλοιπο VIBES, τα {{pass:pl}} σας με τις ημερομηνίες λήξης και το ιστορικό πιστώσεων και επισκέψεων.',
  vb_gift_title:         'Η τακτική εξάσκηση σας χαρίζει VIBES',
  vb_gift_sub:           'Εδώ μετράει πόσες φορές ήρθατε για μάθημα μέσα στον ημερολογιακό μήνα, όχι ποιο {{pass}} αγοράσατε.',
  vb_gift_how:           'Τα VIBES αυτά προστίθενται αυτόματα την πρώτη ημέρα του επόμενου μήνα και δεν λήγουν.',
  pv_sum_title:         'Τα VIBES με λίγα λόγια',
  pv_sum_text:           'Με το {{pass}} παίρνετε περισσότερα VIBES από ό,τι με μια απλή ανανέωση για το ίδιο ποσό. Για τις τακτικές επισκέψεις το στούντιο χαρίζει VIBES ξεχωριστά.',
  pv_vibes_link:        'Πώς λειτουργούν τα VIBES →',
  pv_days_from_first:   'ημέρες από την πρώτη επίσκεψη',
  pv_rules_note:        'Ισχύς, σειρά χρέωσης, πάγωμα, VIBES δώρο και άλλοι κανόνες — στη σελίδα <a href="/vibes#rules">VIBES</a>.',
});

// ── Вход по коду из письма (email-login.js) ─────────────────────────────────
Object.assign(SVS_TRANSLATIONS.en, {
  ec_hint:            'No password needed — we will email you a 6-digit code to sign in.',
  ec_email_label:     'Email',
  ec_get_code:        'Get a code by email',
  ec_sent_to:         'We have sent a 6-digit code to {email}',
  ec_code_label:      'Code from the email',
  ec_sign_in:         'Sign in',
  ec_resend_in:       'Send again in {s} s',
  ec_resend:          'Send the code again',
  ec_resent:          'We have sent you a new code.',
  ec_change_email:    'Change email',
  ec_spam:            'No email? It may take a minute — please also check your Spam folder.',
  ec_profile_title:   'Welcome to Soul Vibe Space!',
  ec_profile_sub:     'This is your first visit to the website — please tell us your name and phone number so the studio knows how to reach you.',
  ec_name:            'Full name',
  ec_phone:           'Phone',
  ec_continue:        'Continue',
  ec_password_link:   'Sign in with a password',
  ec_back_to_code:    '← Sign in with an email code',
  ec_err_email:       'Please enter a valid email address.',
  ec_err_code:        'Please enter the 6 digits from the email.',
  ec_err_wrong:       'The code is not correct. Attempts left: {n}.',
  ec_err_expired:     'This code has expired. Please request a new one.',
  ec_err_attempts:    'Too many attempts. Please request a new code.',
  ec_err_too_many:    'Too many requests. Please try again a little later.',
  ec_err_wait:        'You can request a new code in {s} s.',
  ec_err_send:        'We could not send the email. Please try again later or message us.',
  ec_err_unavailable: 'Sign-in is temporarily unavailable. Please try again in a few minutes.',
  ec_err_network:     'Could not reach the studio server. Please check your connection and try again.',
  ec_err_name:        'Please enter your name.',
  ec_err_phone:       'Please enter your phone number.',
  ec_err_generic:     'Something went wrong. Please try again.',
});
Object.assign(SVS_TRANSLATIONS.ru, {
  ec_hint:            'Без пароля: пришлём на вашу почту 6-значный код для входа.',
  ec_email_label:     'Email',
  ec_get_code:        'Получить код на email',
  ec_sent_to:         'Мы отправили 6-значный код на {email}',
  ec_code_label:      'Код из письма',
  ec_sign_in:         'Войти',
  ec_resend_in:       'Отправить ещё раз через {s} с',
  ec_resend:          'Отправить код ещё раз',
  ec_resent:          'Мы отправили вам новый код.',
  ec_change_email:    'Изменить email',
  ec_spam:            'Письма нет? Оно может идти около минуты — проверьте также папку «Спам».',
  ec_profile_title:   'Добро пожаловать в Soul Vibe Space!',
  ec_profile_sub:     'Вы входите на сайт впервые — укажите, пожалуйста, имя и телефон, чтобы студия могла с вами связаться.',
  ec_name:            'Имя и фамилия',
  ec_phone:           'Телефон',
  ec_continue:        'Продолжить',
  ec_password_link:   'Войти по паролю',
  ec_back_to_code:    '← Войти по коду из письма',
  ec_err_email:       'Введите корректный email.',
  ec_err_code:        'Введите 6 цифр из письма.',
  ec_err_wrong:       'Код неверный. Осталось попыток: {n}.',
  ec_err_expired:     'Срок действия кода истёк. Запросите новый код.',
  ec_err_attempts:    'Слишком много попыток. Запросите новый код.',
  ec_err_too_many:    'Слишком много запросов. Попробуйте чуть позже.',
  ec_err_wait:        'Новый код можно запросить через {s} с.',
  ec_err_send:        'Не удалось отправить письмо. Попробуйте позже или напишите нам.',
  ec_err_unavailable: 'Вход временно недоступен. Попробуйте через несколько минут.',
  ec_err_network:     'Не удалось связаться с сервером студии. Проверьте интернет и попробуйте снова.',
  ec_err_name:        'Укажите ваше имя.',
  ec_err_phone:       'Укажите номер телефона.',
  ec_err_generic:     'Что-то пошло не так. Попробуйте ещё раз.',
});
Object.assign(SVS_TRANSLATIONS.el, {
  ec_hint:            'Χωρίς κωδικό πρόσβασης: θα σας στείλουμε με email έναν 6ψήφιο κωδικό σύνδεσης.',
  ec_email_label:     'Email',
  ec_get_code:        'Λήψη κωδικού με email',
  ec_sent_to:         'Στείλαμε έναν 6ψήφιο κωδικό στο {email}',
  ec_code_label:      'Κωδικός από το email',
  ec_sign_in:         'Σύνδεση',
  ec_resend_in:       'Νέα αποστολή σε {s} δευτ.',
  ec_resend:          'Αποστολή του κωδικού ξανά',
  ec_resent:          'Σας στείλαμε νέο κωδικό.',
  ec_change_email:    'Αλλαγή email',
  ec_spam:            'Δεν λάβατε email; Μπορεί να χρειαστεί ένα λεπτό — ελέγξτε και τον φάκελο ανεπιθύμητης αλληλογραφίας.',
  ec_profile_title:   'Καλώς ήρθατε στο Soul Vibe Space!',
  ec_profile_sub:     'Συνδέεστε για πρώτη φορά — συμπληρώστε το όνομα και το τηλέφωνό σας, ώστε το στούντιο να μπορεί να επικοινωνήσει μαζί σας.',
  ec_name:            'Ονοματεπώνυμο',
  ec_phone:           'Τηλέφωνο',
  ec_continue:        'Συνέχεια',
  ec_password_link:   'Σύνδεση με κωδικό πρόσβασης',
  ec_back_to_code:    '← Σύνδεση με κωδικό από email',
  ec_err_email:       'Συμπληρώστε ένα έγκυρο email.',
  ec_err_code:        'Συμπληρώστε τα 6 ψηφία από το email.',
  ec_err_wrong:       'Ο κωδικός δεν είναι σωστός. Απομένουν προσπάθειες: {n}.',
  ec_err_expired:     'Ο κωδικός έληξε. Ζητήστε νέο κωδικό.',
  ec_err_attempts:    'Πάρα πολλές προσπάθειες. Ζητήστε νέο κωδικό.',
  ec_err_too_many:    'Πάρα πολλά αιτήματα. Δοκιμάστε ξανά λίγο αργότερα.',
  ec_err_wait:        'Μπορείτε να ζητήσετε νέο κωδικό σε {s} δευτ.',
  ec_err_send:        'Δεν ήταν δυνατή η αποστολή του email. Δοκιμάστε αργότερα ή γράψτε μας.',
  ec_err_unavailable: 'Η σύνδεση δεν είναι διαθέσιμη προσωρινά. Δοκιμάστε ξανά σε λίγα λεπτά.',
  ec_err_network:     'Δεν ήταν δυνατή η σύνδεση με τον διακομιστή του στούντιο. Ελέγξτε τη σύνδεσή σας και δοκιμάστε ξανά.',
  ec_err_name:        'Συμπληρώστε το όνομά σας.',
  ec_err_phone:       'Συμπληρώστε τον αριθμό τηλεφώνου σας.',
  ec_err_generic:     'Κάτι πήγε στραβά. Δοκιμάστε ξανά.',
});

// Extra translations registered by page-specific scripts loaded BEFORE i18n.js
// (e.g. i18n-legal.js on /terms and /privacy): window.SVS_I18N_EXTRA = { en:{}, ru:{}, el:{} }.
if (window.SVS_I18N_EXTRA) {
  Object.keys(window.SVS_I18N_EXTRA).forEach(function (lang) {
    if (SVS_TRANSLATIONS[lang]) Object.assign(SVS_TRANSLATIONS[lang], window.SVS_I18N_EXTRA[lang]);
  });
}

// Auto-init after DOM ready — must run after all Object.assign blocks
// ── Страница /gift-certificates: подарочный сертификат (оформление через администратора) ──
// GR — машинный перевод, нужна вычитка носителем.
Object.assign(SVS_TRANSLATIONS.en, {
  gc_fmt_valid:  'Valid for 6 months from the date of purchase.',
  gc_fmt_eyebrow:       'Amounts and formats',
  gc_fmt_title:         'Choose the amount and format',
  gc_fmt_amounts_label: 'Amounts',
  gc_fmt_amounts:       '€20 · €40 · €60 · €120 · €180 · €240',
  gc_fmt_hint:          '%%dropin%% covers one drop-in class. The higher the amount, the more practices they can choose.',
  gc_fmt_e_title:       'Digital',
  gc_fmt_e_desc:        'Sent to your email. Perfect when you need a gift today.',
  gc_fmt_p_title:       'Printed',
  gc_fmt_p_desc:        'A beautifully designed certificate to hand over in person. Pick it up at the studio while the administrator is in: 2:00 pm – 10:00 pm.',
  gc_eyebrow:      'Gift certificates',
  gc_title:        'Give the gift of time',
  gc_lead:         'A moment to slow down, move and enjoy a practice they love.',
  gc_hero_wa:      'Message us on WhatsApp',
  gc_hero_ig:      'DM us on Instagram',
  gc_what_eyebrow: 'For classes and practices',
  gc_what_title:   'What is a gift certificate',
  gc_what_p1:      'With a Soul Vibe Space gift certificate, they can choose a class from our regular schedule — and make a little time for themselves.',
  gc_what_p2:      'Any class or practice they like, whenever it suits them.',
  gc_what_link:    'See the schedule',
  gc_how_eyebrow:  'WhatsApp · Instagram',
  gc_how_title:    'How to arrange a gift certificate',
  gc_how_p:        'DM us or message us on WhatsApp to arrange your gift certificate. Our administrator will take care of the rest.',
  gc_how_phone:    'Or call us:',
  gc_cap1:         'For a birthday. Or just because.',
  gc_cap2:         'A thoughtful gift for someone you care about.',
  gc_cap3:         'Their practice. Their choice.',
  gc_gallery_title:'Soul Vibe Space gift certificates',
});
Object.assign(SVS_TRANSLATIONS.ru, {
  gc_fmt_valid:  'Сертификат действует 6 месяцев с даты покупки.',
  gc_fmt_eyebrow:       'Номиналы и форматы',
  gc_fmt_title:         'Выберите сумму и формат',
  gc_fmt_amounts_label: 'Номиналы',
  gc_fmt_amounts:       '€20 · €40 · €60 · €120 · €180 · €240',
  gc_fmt_hint:          '%%dropin%% — это одно разовое занятие. Чем больше номинал, тем больше практик сможет выбрать тот, кого вы радуете.',
  gc_fmt_e_title:       'Электронный',
  gc_fmt_e_desc:        'Пришлём на email. Подходит, если подарок нужен сегодня.',
  gc_fmt_p_title:       'Печатный',
  gc_fmt_p_desc:        'Оформленный сертификат, который приятно вручить лично. Забрать можно в студии, когда там администратор: с 14:00 до 22:00.',
  gc_eyebrow:      'Подарочные сертификаты',
  gc_title:        'Подарите близким время для себя',
  gc_lead:         'Возможность выдохнуть, размяться и сходить на любимую практику.',
  gc_hero_wa:      'Написать в WhatsApp',
  gc_hero_ig:      'Написать в директ',
  gc_what_eyebrow: 'На занятия и практики',
  gc_what_title:   'Что такое подарочный сертификат',
  gc_what_p1:      'С подарочным сертификатом Soul Vibe Space можно выбрать занятие из регулярного расписания студии — по настроению и в удобное время.',
  gc_what_p2:      'Подойдут любые занятия и практики из расписания.',
  gc_what_link:    'Посмотреть расписание',
  gc_how_eyebrow:  'WhatsApp · Instagram',
  gc_how_title:    'Как оформить сертификат',
  gc_how_p:        'Чтобы оформить сертификат, напишите нам в директ или WhatsApp. Администратор всё оформит.',
  gc_how_phone:    'Или позвоните:',
  gc_cap1:         'На день рождения. Или просто так.',
  gc_cap2:         'Для тех, о ком хочется позаботиться.',
  gc_cap3:         'Пусть выберут любимую практику.',
  gc_gallery_title:'Подарочные сертификаты Soul Vibe Space',
});
Object.assign(SVS_TRANSLATIONS.el, {
  gc_fmt_valid:  'Ισχύει για 6 μήνες από την ημερομηνία αγοράς.',
  gc_fmt_eyebrow:       'Ποσά και μορφές',
  gc_fmt_title:         'Επιλέξτε ποσό και μορφή',
  gc_fmt_amounts_label: 'Ποσά',
  gc_fmt_amounts:       '€20 · €40 · €60 · €120 · €180 · €240',
  gc_fmt_hint:          'Τα %%dropin%% αντιστοιχούν σε ένα μεμονωμένο μάθημα. Όσο μεγαλύτερο το ποσό, τόσο περισσότερες πρακτικές μπορούν να επιλέξουν.',
  gc_fmt_e_title:       'Ηλεκτρονική',
  gc_fmt_e_desc:        'Τη στέλνουμε με email. Ιδανική όταν χρειάζεστε δώρο σήμερα.',
  gc_fmt_p_title:       'Έντυπη',
  gc_fmt_p_desc:        'Μια όμορφα σχεδιασμένη δωροκάρτα για να τη δώσετε προσωπικά. Την παραλαμβάνετε από το στούντιο όσο είναι εκεί ο διαχειριστής: 14:00–22:00.',
  gc_eyebrow:      'Δωροκάρτες',
  gc_title:        'Χαρίστε το δώρο του χρόνου',
  gc_lead:         'Μια στιγμή για να χαλαρώσουν, να κινηθούν και να απολαύσουν μια πρακτική που αγαπούν.',
  gc_hero_wa:      'Γράψτε μας στο WhatsApp',
  gc_hero_ig:      'Στείλτε μας μήνυμα στο Instagram',
  gc_what_eyebrow: 'Για μαθήματα και πρακτικές',
  gc_what_title:   'Τι είναι η δωροκάρτα',
  gc_what_p1:      'Με μια δωροκάρτα Soul Vibe Space μπορούν να επιλέξουν ένα μάθημα από το τακτικό πρόγραμμα του στούντιο — και να βρουν λίγο χρόνο για τον εαυτό τους.',
  gc_what_p2:      'Όποιο μάθημα ή πρακτική θέλουν, όποτε τους βολεύει.',
  gc_what_link:    'Δείτε το πρόγραμμα',
  gc_how_eyebrow:  'WhatsApp · Instagram',
  gc_how_title:    'Πώς να αποκτήσετε μια δωροκάρτα',
  gc_how_p:        'Στείλτε μας μήνυμα στο Instagram ή στο WhatsApp για να κανονίσουμε τη δωροκάρτα σας. Ο διαχειριστής μας θα φροντίσει για τα υπόλοιπα.',
  gc_how_phone:    'Ή καλέστε μας:',
  gc_cap1:         'Για γενέθλια. Ή απλώς έτσι.',
  gc_cap2:         'Ένα δώρο με νόημα για κάποιον που αγαπάτε.',
  gc_cap3:         'Η πρακτική τους. Η επιλογή τους.',
  gc_gallery_title:'Δωροκάρτες Soul Vibe Space',
});

// ── Онлайн-покупка {{pass}} / {{starter}} на /pricing и страница результата /payment (#119) ──
// Показываются только когда API включил онлайн-оплату (PAYMENTS_ENABLED). Тексты ждут вычитки
// контент-маркетолога; GR — машинный перевод, нужна вычитка носителем.
Object.assign(SVS_TRANSLATIONS.en, {
  pay_buy:              'Buy online',
  pay_buy_wait:         'Opening payment…',
  pay_see_passes:       'Choose a {{pass}}',
  pv_pay_title_online:  'Online or at the studio',
  pv_pay_text_online:   'Buy a {{pass}} or a {{starter}} online by card — VIBES are credited to your balance after the payment is confirmed. Prices include VAT, the receipt comes to your email. Top-ups and drop-ins are paid at the studio.',
  pv_faq8_a_online:     'Yes, {{pass:pl}} and {{starter:pl}} — with the «Buy online» button on this page. Sign in, pay by card, and VIBES appear on your balance after the payment is confirmed. Top-ups and drop-ins are paid at the studio.',
  pay_err_verify:       'To buy online, confirm your email: sign in with a code from your email or with Google.',
  pay_err_starter:      'A {{starter}} can be purchased only once, by new clients.',
  pay_err_card:         'We could not find your studio card. Write to us — the administrator will help.',
  pay_err_generic:      'Payment is temporarily unavailable. Please try again later or pay at the studio.',
  pay_cancelled:        'Payment cancelled — nothing was charged.',
  payr_eyebrow:         'Online payment',
  payr_ok_title:        'Thank you, payment received',
  payr_ok_text:         '{vibes} VIBES are on your balance. Term: {days} from the first visit.',
  payr_ok_text_nodays:  '{vibes} VIBES are on your balance.',
  payr_balance:         'Balance now: {balance} VIBES.',
  payr_receipt:         'The receipt is in your email.',
  payr_wait_title:      'Confirming your payment',
  payr_wait_text:       'This usually takes a few seconds. The page updates by itself.',
  payr_slow_text:       'It is taking longer than usual. VIBES will appear on your balance as soon as the payment is confirmed — no need to pay again.',
  payr_review_title:    'Payment received',
  payr_review_text:     'We could not credit VIBES automatically. The administrator has been notified and will credit them shortly — no need to pay again.',
  payr_open_title:      'Payment not completed',
  payr_open_text:       'Nothing was charged. You can try again on the pricing page.',
  payr_err_title:       'Could not load the payment status',
  payr_err_text:        'If you paid, VIBES will appear on your balance. Check your account a little later or write to us.',
  payr_signin_title:    'Sign in to see your payment',
  payr_signin_text:     'Use the same account you paid from.',
  payr_btn_pricing:     'Back to pricing',
});
Object.assign(SVS_TRANSLATIONS.ru, {
  pay_buy:              'Купить онлайн',
  pay_buy_wait:         'Открываем оплату…',
  pay_see_passes:       'Выбрать {{pass:acc}}',
  pv_pay_title_online:  'Онлайн или в студии',
  pv_pay_text_online:   '{{Pass}} или {{starter}} можно купить онлайн картой — VIBES начисляются на баланс после подтверждения платежа. Цены с НДС, чек придёт на почту. Пополнения и разовые занятия оплачиваются в студии.',
  pv_faq8_a_online:     'Да, {{pass:pl}} и {{starter:pl}} — кнопкой «Купить онлайн» на этой странице. Войдите, оплатите картой, и VIBES появятся на балансе после подтверждения платежа. Пополнения и разовые занятия оплачиваются в студии.',
  pay_err_verify:       'Чтобы купить онлайн, подтвердите почту: войдите по коду из письма или через Google.',
  pay_err_starter:      '{{Starter}} можно купить только один раз — новым клиентам.',
  pay_err_card:         'Не нашли вашу карточку клиента студии. Напишите нам — администратор поможет.',
  pay_err_generic:      'Оплата временно недоступна. Попробуйте позже или оплатите в студии.',
  pay_cancelled:        'Оплата отменена, деньги не списаны.',
  payr_eyebrow:         'Онлайн-оплата',
  payr_ok_title:        'Спасибо, оплата прошла',
  payr_ok_text:         '{vibes} VIBES уже на балансе. Срок\u00a0— {days} с первого посещения.',
  payr_ok_text_nodays:  '{vibes} VIBES уже на балансе.',
  payr_balance:         'Баланс сейчас: {balance} VIBES.',
  payr_receipt:         'Чек придёт на вашу почту.',
  payr_wait_title:      'Подтверждаем оплату',
  payr_wait_text:       'Обычно это несколько секунд. Страница обновится сама.',
  payr_slow_text:       'Подтверждение задерживается. VIBES появятся на балансе, как только оплата подтвердится, — платить повторно не нужно.',
  payr_review_title:    'Оплата получена',
  payr_review_text:     'Не получилось начислить VIBES автоматически. Администратор уже получил уведомление и скоро начислит их — платить повторно не нужно.',
  payr_open_title:      'Оплата не завершена',
  payr_open_text:       'Деньги не списаны. Можно попробовать ещё раз на странице цен.',
  payr_err_title:       'Не удалось получить статус оплаты',
  payr_err_text:        'Если вы оплатили, VIBES появятся на балансе. Загляните в кабинет чуть позже или напишите нам.',
  payr_signin_title:    'Войдите, чтобы увидеть оплату',
  payr_signin_text:     'Используйте тот же аккаунт, с которого оплачивали.',
  payr_btn_pricing:     'К ценам',
});
Object.assign(SVS_TRANSLATIONS.el, {
  pay_buy:              'Αγορά online',
  pay_buy_wait:         'Άνοιγμα πληρωμής…',
  pay_see_passes:       'Επιλέξτε {{pass}}',
  pv_pay_title_online:  'Online ή στο studio',
  pv_pay_text_online:   'Αγοράστε {{pass}} ή {{starter}} online με κάρτα — τα VIBES πιστώνονται στο υπόλοιπό σας μετά την επιβεβαίωση της πληρωμής. Οι τιμές περιλαμβάνουν ΦΠΑ, η απόδειξη έρχεται στο email σας. Οι φορτίσεις και τα μεμονωμένα μαθήματα πληρώνονται στο studio.',
  pv_faq8_a_online:     'Ναι, {{pass}} και {{starter}} — με το κουμπί «Αγορά online» σε αυτή τη σελίδα. Συνδεθείτε, πληρώστε με κάρτα και τα VIBES εμφανίζονται στο υπόλοιπό σας μετά την επιβεβαίωση της πληρωμής. Οι φορτίσεις και τα μεμονωμένα μαθήματα πληρώνονται στο studio.',
  pay_err_verify:       'Για αγορά online, επιβεβαιώστε το email σας: συνδεθείτε με κωδικό από το email ή με Google.',
  pay_err_starter:      'Το {{starter}} αγοράζεται μόνο μία φορά, από νέους πελάτες.',
  pay_err_card:         'Δεν βρήκαμε την κάρτα πελάτη σας στο studio. Γράψτε μας — ο διαχειριστής θα σας βοηθήσει.',
  pay_err_generic:      'Η πληρωμή δεν είναι προσωρινά διαθέσιμη. Δοκιμάστε αργότερα ή πληρώστε στο studio.',
  pay_cancelled:        'Η πληρωμή ακυρώθηκε — δεν έγινε χρέωση.',
  payr_eyebrow:         'Online πληρωμή',
  payr_ok_title:        'Ευχαριστούμε, η πληρωμή ολοκληρώθηκε',
  payr_ok_text:         'Τα {vibes} VIBES είναι ήδη στο υπόλοιπό σας. Διάρκεια: {days} από την πρώτη επίσκεψη.',
  payr_ok_text_nodays:  'Τα {vibes} VIBES είναι ήδη στο υπόλοιπό σας.',
  payr_balance:         'Υπόλοιπο τώρα: {balance} VIBES.',
  payr_receipt:         'Η απόδειξη είναι στο email σας.',
  payr_wait_title:      'Επιβεβαιώνουμε την πληρωμή',
  payr_wait_text:       'Συνήθως διαρκεί λίγα δευτερόλεπτα. Η σελίδα ενημερώνεται μόνη της.',
  payr_slow_text:       'Η επιβεβαίωση αργεί. Τα VIBES θα εμφανιστούν στο υπόλοιπό σας μόλις επιβεβαιωθεί η πληρωμή — δεν χρειάζεται να πληρώσετε ξανά.',
  payr_review_title:    'Η πληρωμή ελήφθη',
  payr_review_text:     'Δεν ήταν δυνατή η αυτόματη πίστωση των VIBES. Ο διαχειριστής ενημερώθηκε και θα τα πιστώσει σύντομα — δεν χρειάζεται να πληρώσετε ξανά.',
  payr_open_title:      'Η πληρωμή δεν ολοκληρώθηκε',
  payr_open_text:       'Δεν έγινε χρέωση. Μπορείτε να δοκιμάσετε ξανά στη σελίδα τιμών.',
  payr_err_title:       'Δεν ήταν δυνατή η φόρτωση της κατάστασης πληρωμής',
  payr_err_text:        'Αν πληρώσατε, τα VIBES θα εμφανιστούν στο υπόλοιπό σας. Ελέγξτε τον λογαριασμό σας λίγο αργότερα ή γράψτε μας.',
  payr_signin_title:    'Συνδεθείτε για να δείτε την πληρωμή σας',
  payr_signin_text:     'Χρησιμοποιήστε τον ίδιο λογαριασμό με τον οποίο πληρώσατε.',
  payr_btn_pricing:     'Πίσω στις τιμές',
});

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', SVS_I18N.init);
} else {
  SVS_I18N.init();
}
