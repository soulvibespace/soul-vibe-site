/**
 * Soul Vibe Space — тексты страницы /about (EN / RU / EL).
 *
 * Подключается только на about.html ПЕРЕД i18n.js: складывает переводы в
 * window.SVS_I18N_EXTRA, i18n.js добавляет их в словари до первого применения языка.
 * Термины — плейсхолдеры {{starter}} и т. п. (словарь SVS_TERMS в i18n.js),
 * цифры цен — токены %%…%% (SVS_PRICES). Обращение — на «вы».
 * Команда — data/instructors.json (не SimplyBook).
 */
(function () {
  var X = window.SVS_I18N_EXTRA = window.SVS_I18N_EXTRA || {};
  ['en', 'ru', 'el'].forEach(function (l) { X[l] = X[l] || {}; });

  /* ═══════════════════════════════ EN ═══════════════════════════════ */
  Object.assign(X.en, {
    ab_eyebrow:       'About us',
    ab_h1:            'A home for practice, sound and community in Limassol',
    ab_lead:          'We created Soul Vibe Space as a truly multifunctional wellness space in Limassol — one home for many practices, teachers and communities.',
    ab_story_p1:      'From gentle morning yoga to Ecstatic Dance, from sound healing and qigong to mindful co-working — every class here is designed to help you feel more present, connected and alive.',
    ab_story_p2:      'The studio is open every day from 8:00 to 22:00. Beginners and experienced practitioners are equally welcome — we will help you find a practice that suits you.',
    ab_btn_book:      'Book a class',
    ab_btn_team:      'Meet the team',
    ab_photo_caption: '50 Agias Zonis, Limassol',

    ab_stat1_num:     '170 m²',
    ab_stat1_label:   'over two floors',
    ab_stat2_num:     '8:00–22:00',
    ab_stat2_label:   'classes every day',
    ab_stat3_num:     'RU · EN · EL',
    ab_stat3_label:   '3 languages of our community',
    ab_stat4_one:     'teacher in the team',
    ab_stat4_few:     'teachers in the team',
    ab_stat4_many:    'teachers in the team',

    ab_team_eyebrow:  'Our team',
    ab_team_title:    'The teachers of Soul Vibe Space',
    ab_team_lead:     'Each teacher brings their own path and practice. Find the one that resonates with you — and see when they teach in the schedule.',
    ab_founder_badge: 'Founder',
    ab_team_schedule: 'Schedule →',
    ab_team_langs:    'Languages',
    ab_team_error:    'Could not load the team. Please refresh the page.',

    ab_diff_eyebrow:  'What makes us different',
    ab_diff_title:    'More than a yoga studio',
    ab_diff1_title:   'Multilingual community',
    ab_diff1_text:    'Russian, English and Greek speakers practise side by side. The language of each class is shown in the schedule.',
    ab_diff2_title:   'Ecstatic Dance',
    ab_diff2_text:    'Free movement to a live DJ set — no steps to learn, just you, the music and the people around you.',
    ab_diff3_title:   'Classes in nature',
    ab_diff3_text:    'Yoga, meditation and Ecstatic Dance under the open sky at Rancho Meadow Paradise.',
    ab_diff4_title:   'VIBES programme',
    ab_diff4_text:    'Our studio currency: pay for classes with VIBES and collect bonus VIBES for bringing a friend, a review and your birthday.',
    ab_diff4_link:    'How VIBES work →',
    ab_diff_sched:    'See the schedule →',

    ab_rev_eyebrow:   'Reviews',
    ab_rev_title:     'What our guests say',
    ab_rev_all:       'All reviews →',

    ab_fv_eyebrow:    'Your first visit',
    ab_fv_title:      'Coming for the first time?',
    ab_fv1_title:     'What to bring',
    ab_fv1_text:      'Comfortable clothes and a bottle of water. Mats, blocks and straps are provided at the studio.',
    ab_fv2_title:     'Arrive 5–10 minutes early',
    ab_fv2_text:      'Time to meet the teacher, change and settle in calmly before the class begins.',
    ab_fv3_title:     '{{starter}} for new clients',
    ab_fv3_text:      'A one-time offer for your first classes — from %%SP1.price%%.',
    ab_fv3_link:      'See prices →',
    ab_fv4_title:     'Where to find us',
    ab_fv4_text:      '50 Agias Zonis, Limassol 3090, Cyprus.',
    ab_fv4_link:      'Open in maps →',
    ab_cta_title:     'Ready for your first class?',
    ab_cta_sub:       'Choose a class in the schedule and book your place in a few taps.'
  });

  /* ═══════════════════════════════ RU ═══════════════════════════════ */
  Object.assign(X.ru, {
    ab_eyebrow:       'О нас',
    ab_h1:            'Пространство для практики, звука и сообщества в Лимасоле',
    ab_lead:          'Мы создали Soul Vibe Space как полноценное велнес-пространство в Лимасоле — один дом для разных практик, преподавателей и сообществ.',
    ab_story_p1:      'От мягкой утренней йоги до Ecstatic Dance, от звукотерапии и цигуна до осознанного коворкинга — каждое занятие здесь помогает почувствовать себя живее, спокойнее и ближе к себе и другим.',
    ab_story_p2:      'Студия открыта каждый день с 8:00 до 22:00. Мы одинаково рады и новичкам, и опытным практикам — поможем подобрать практику, которая подойдёт именно вам.',
    ab_btn_book:      'Записаться',
    ab_btn_team:      'Познакомиться с командой',
    ab_photo_caption: 'ул. Агиас Зонис, 50, Лимасол',

    ab_stat1_num:     '170 м²',
    ab_stat1_label:   'на двух этажах',
    ab_stat2_num:     '8:00–22:00',
    ab_stat2_label:   'занятия ежедневно',
    ab_stat3_num:     'RU · EN · EL',
    ab_stat3_label:   '3 языка нашего сообщества',
    ab_stat4_one:     'преподаватель в команде',
    ab_stat4_few:     'преподавателя в команде',
    ab_stat4_many:    'преподавателей в команде',

    ab_team_eyebrow:  'Наша команда',
    ab_team_title:    'Преподаватели Soul Vibe Space',
    ab_team_lead:     'Каждый преподаватель приносит свой путь и свою практику. Выберите ту, что откликается вам, — и посмотрите время занятий в расписании.',
    ab_founder_badge: 'Основательница',
    ab_team_schedule: 'Расписание →',
    ab_team_langs:    'Языки',
    ab_team_error:    'Не удалось загрузить команду. Обновите страницу.',

    ab_diff_eyebrow:  'Чем мы отличаемся',
    ab_diff_title:    'Больше, чем студия йоги',
    ab_diff1_title:   'Многоязычное сообщество',
    ab_diff1_text:    'Здесь рядом практикуют русско-, англо- и грекоговорящие гости. Язык каждого занятия указан в расписании.',
    ab_diff2_title:   'Ecstatic Dance',
    ab_diff2_text:    'Свободное движение под живой диджей-сет — без шагов и правил: только вы, музыка и люди вокруг.',
    ab_diff3_title:   'Занятия на природе',
    ab_diff3_text:    'Йога, медитация и Ecstatic Dance под открытым небом на Rancho Meadow Paradise.',
    ab_diff4_title:   'Программа VIBES',
    ab_diff4_text:    'Валюта студии: вы оплачиваете занятия в VIBES и получаете бонусные VIBES за приведённого друга, отзыв и в день рождения.',
    ab_diff4_link:    'Как работают VIBES →',
    ab_diff_sched:    'Смотреть расписание →',

    ab_rev_eyebrow:   'Отзывы',
    ab_rev_title:     'Что говорят наши гости',
    ab_rev_all:       'Все отзывы →',

    ab_fv_eyebrow:    'Первый визит',
    ab_fv_title:      'Впервые у нас?',
    ab_fv1_title:     'Что взять с собой',
    ab_fv1_text:      'Удобную одежду и бутылку воды. Коврики, блоки и ремни есть в студии.',
    ab_fv2_title:     'Приходите за 5–10 минут',
    ab_fv2_text:      'Чтобы спокойно переодеться, познакомиться с преподавателем и настроиться на практику.',
    ab_fv3_title:     '{{starter}} для новых клиентов',
    ab_fv3_text:      'Разовое предложение для первых занятий — от %%SP1.price%%.',
    ab_fv3_link:      'Смотреть цены →',
    ab_fv4_title:     'Как нас найти',
    ab_fv4_text:      'ул. Агиас Зонис, 50, Лимасол 3090, Кипр.',
    ab_fv4_link:      'Открыть на карте →',
    ab_cta_title:     'Готовы к первому занятию?',
    ab_cta_sub:       'Выберите занятие в расписании и запишитесь в пару касаний.'
  });

  /* ═══════════════════════════════ EL ═══════════════════════════════ */
  Object.assign(X.el, {
    ab_eyebrow:       'Σχετικά με εμάς',
    ab_h1:            'Ένας χώρος για πρακτική, ήχο και κοινότητα στη Λεμεσό',
    ab_lead:          'Δημιουργήσαμε το Soul Vibe Space ως έναν πραγματικά πολυλειτουργικό χώρο ευεξίας στη Λεμεσό — ένα σπίτι για πολλές πρακτικές, δασκάλους και κοινότητες.',
    ab_story_p1:      'Από ήπια πρωινή yoga έως Ecstatic Dance, από ηχοθεραπεία και qigong έως co-working με επίγνωση — κάθε μάθημα εδώ σας βοηθά να νιώσετε πιο παρόντες, συνδεδεμένοι και ζωντανοί.',
    ab_story_p2:      'Το στούντιο είναι ανοιχτό κάθε μέρα από 8:00 έως 22:00. Καλωσορίζουμε εξίσου αρχάριους και έμπειρους ασκούμενους — θα σας βοηθήσουμε να βρείτε την πρακτική που σας ταιριάζει.',
    ab_btn_book:      'Κράτηση',
    ab_btn_team:      'Γνωρίστε την ομάδα',
    ab_photo_caption: 'Αγίας Ζώνης 50, Λεμεσός',

    ab_stat1_num:     '170 m²',
    ab_stat1_label:   'σε δύο ορόφους',
    ab_stat2_num:     '8:00–22:00',
    ab_stat2_label:   'μαθήματα καθημερινά',
    ab_stat3_num:     'RU · EN · EL',
    ab_stat3_label:   '3 γλώσσες της κοινότητάς μας',
    ab_stat4_one:     'δάσκαλος στην ομάδα',
    ab_stat4_few:     'δάσκαλοι στην ομάδα',
    ab_stat4_many:    'δάσκαλοι στην ομάδα',

    ab_team_eyebrow:  'Η ομάδα μας',
    ab_team_title:    'Οι δάσκαλοι του Soul Vibe Space',
    ab_team_lead:     'Κάθε δάσκαλος φέρνει τη δική του διαδρομή και πρακτική. Βρείτε αυτή που σας ταιριάζει — και δείτε πότε διδάσκει στο πρόγραμμα.',
    ab_founder_badge: 'Ιδρύτρια',
    ab_team_schedule: 'Πρόγραμμα →',
    ab_team_langs:    'Γλώσσες',
    ab_team_error:    'Δεν ήταν δυνατή η φόρτωση της ομάδας. Ανανεώστε τη σελίδα.',

    ab_diff_eyebrow:  'Τι μας κάνει διαφορετικούς',
    ab_diff_title:    'Κάτι περισσότερο από στούντιο yoga',
    ab_diff1_title:   'Πολύγλωσση κοινότητα',
    ab_diff1_text:    'Ρωσόφωνοι, αγγλόφωνοι και ελληνόφωνοι ασκούνται δίπλα δίπλα. Η γλώσσα κάθε μαθήματος αναγράφεται στο πρόγραμμα.',
    ab_diff2_title:   'Ecstatic Dance',
    ab_diff2_text:    'Ελεύθερη κίνηση με ζωντανό DJ set — χωρίς βήματα και κανόνες: μόνο εσείς, η μουσική και οι άνθρωποι γύρω σας.',
    ab_diff3_title:   'Μαθήματα στη φύση',
    ab_diff3_text:    'Yoga, διαλογισμός και Ecstatic Dance στην ύπαιθρο, στο Rancho Meadow Paradise.',
    ab_diff4_title:   'Πρόγραμμα VIBES',
    ab_diff4_text:    'Το νόμισμα του στούντιο: πληρώνετε τα μαθήματα με VIBES και κερδίζετε bonus VIBES για έναν φίλο που φέρνετε, μια κριτική και τα γενέθλιά σας.',
    ab_diff4_link:    'Πώς λειτουργούν τα VIBES →',
    ab_diff_sched:    'Δείτε το πρόγραμμα →',

    ab_rev_eyebrow:   'Κριτικές',
    ab_rev_title:     'Τι λένε οι επισκέπτες μας',
    ab_rev_all:       'Όλες οι κριτικές →',

    ab_fv_eyebrow:    'Η πρώτη σας επίσκεψη',
    ab_fv_title:      'Έρχεστε για πρώτη φορά;',
    ab_fv1_title:     'Τι να φέρετε',
    ab_fv1_text:      'Άνετα ρούχα και ένα μπουκάλι νερό. Στρώματα, τουβλάκια και ιμάντες υπάρχουν στο στούντιο.',
    ab_fv2_title:     'Ελάτε 5–10 λεπτά νωρίτερα',
    ab_fv2_text:      'Για να αλλάξετε με την ησυχία σας, να γνωρίσετε τον δάσκαλο και να προετοιμαστείτε για την πρακτική.',
    ab_fv3_title:     '{{starter}} για νέους πελάτες',
    ab_fv3_text:      'Εφάπαξ προσφορά για τα πρώτα σας μαθήματα — από %%SP1.price%%.',
    ab_fv3_link:      'Δείτε τις τιμές →',
    ab_fv4_title:     'Πού θα μας βρείτε',
    ab_fv4_text:      'Αγίας Ζώνης 50, Λεμεσός 3090, Κύπρος.',
    ab_fv4_link:      'Άνοιγμα στον χάρτη →',
    ab_cta_title:     'Έτοιμοι για το πρώτο σας μάθημα;',
    ab_cta_sub:       'Επιλέξτε μάθημα στο πρόγραμμα και κλείστε τη θέση σας με λίγα κλικ.'
  });
})();
