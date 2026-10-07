/* ============ Jokes PWA - App ============ */
(function () {
    'use strict';

    // ---------- State ----------
    const LS = {
        lang: 'jokes_lang',
        fav: 'jokes_fav',
        rate: 'jokes_rate',
        gate: 'jokes_gate18',
        theme: 'jokes_theme'
    };
    let lang = localStorage.getItem(LS.lang) || 'ar';
    let favs = JSON.parse(localStorage.getItem(LS.fav) || '[]');
    let myRates = JSON.parse(localStorage.getItem(LS.rate) || '{}');
    let view = 'home';
    let filter = { cat: 'all', sub: '', q: '', sort: 'hot', page: 1 };
    let topPage = 1;
    let modalQueue = [];
    let modalIdx = 0;
    let gateTarget = null;

    const PER = 12;
    const $ = (s) => document.querySelector(s);
    const $$ = (s) => document.querySelectorAll(s);
    const t = (k) => (I18N[lang] && I18N[lang][k]) || I18N.ar[k] || k;
    const txt = (o) => (lang === 'fr' && o.fr ? o.fr : o.ar);

    // ---------- Persist ----------
    const saveFav = () => localStorage.setItem(LS.fav, JSON.stringify(favs));
    const saveRates = () => localStorage.setItem(LS.rate, JSON.stringify(myRates));

    // ---------- Effective rating ----------
    function effRating(j) {
        const m = myRates[j.id];
        if (m) return (j.r * 3 + m) / 4;
        return j.r;
    }

    // ---------- i18n apply ----------
    function applyLang() {
        const c = I18N[lang];
        document.documentElement.lang = c.lang;
        document.documentElement.dir = c.dir;
        $('#langBtn').textContent = c.lang_btn;
        $$('[data-i18n]').forEach((el) => { el.textContent = c[el.dataset.i18n] || el.textContent; });
        $$('[data-i18n-ph]').forEach((el) => { el.placeholder = c[el.dataset.i18nPh] || el.placeholder; });
        $('#gateText').textContent = t('kids_confirm');
        $('#disclaimerBox').textContent = t('disclaimer');
        document.title = (lang === 'fr' ? '1400 Blagues — ' : 'نكت 1400 — ') + (lang === 'fr' ? c.tagline : '1400 نكتة مضحكة');
        buildHomeCards();
        buildChips();
        renderCurrent(true);
        renderVideos();
        renderSources();
        $('#statTotal').textContent = JOKES.length;
    }

    // ---------- Sidebar ----------
    function openSidebar(open) {
        $('#sidebar').classList.toggle('open', open);
        $('#overlay').classList.toggle('show', open);
    }
    $('#menuBtn').addEventListener('click', () => openSidebar(!$('#sidebar').classList.contains('open')));
    $('#overlay').addEventListener('click', () => openSidebar(false));

    // ---------- Views ----------
    function setView(v) {
        if (v === 'daily') { showDaily(); v = 'home'; }
        if (v === 'random') { openRandom(); return; }
        view = v;
        $$('.view').forEach((s) => s.classList.remove('active'));
        const el = $('#view-' + v);
        if (el) el.classList.add('active');
        $$('.nav-item').forEach((n) => n.classList.toggle('active', n.dataset.view === v));
        openSidebar(false);
        window.scrollTo({ top: 0 });
        renderCurrent();
    }
    $$('.nav-item').forEach((n) => n.addEventListener('click', () => setView(n.dataset.view)));
    $('#logoHome').addEventListener('click', () => setView('home'));

    function renderCurrent() {
        if (view === 'browse') renderBrowse();
        else if (view === 'top') renderTop();
        else if (view === 'fav') renderFav();
    }

    // ---------- Home cards ----------
    function buildHomeCards() {
        const wrap = $('#homeCards');
        wrap.innerHTML = '';
        HOME_GROUPS.forEach((g) => {
            const meta = CATS[g.cat];
            const n = JOKES.filter((j) => j.cat === g.cat).length;
            const d = document.createElement('div');
            d.className = 'card';
            d.innerHTML = '<div class="card-icon">' + meta.icon + '</div><h3>' +
                (lang === 'fr' ? meta.fr : meta.ar) + '</h3><p>' + n + ' ' + t('jokes_count') + '</p>';
            d.addEventListener('click', () => { filter = { cat: g.cat, sub: '', q: '', sort: 'hot', page: 1 }; $('#searchInput').value = ''; setView('browse'); });
            wrap.appendChild(d);
        });

        const ages = [
            { cat: 'kids', label: t('age_kids'), icon: '🧸' },
            { cat: 'married', label: t('age_married'), icon: '💍' },
            { cat: 'adult', label: t('age_adult'), icon: '🔞' }
        ];
        const aw = $('#ageCards');
        aw.innerHTML = '';
        ages.forEach((a) => {
            const n = JOKES.filter((j) => j.cat === a.cat).length;
            const d = document.createElement('div');
            d.className = 'card';
            d.innerHTML = '<div class="card-icon">' + a.icon + '</div><h3>' + a.label + '</h3><p>' + n + ' ' + t('jokes_count') + '</p>';
            d.addEventListener('click', () => {
                if (a.cat === 'adult' && localStorage.getItem(LS.gate) !== 'ok') { openGate(a.cat); return; }
                filter = { cat: a.cat, sub: '', q: '', sort: 'hot', page: 1 };
                $('#searchInput').value = '';
                setView('browse');
            });
            aw.appendChild(d);
        });
    }

    // ---------- Chips ----------
    function buildChips() {
        const row = $('#catChips');
        row.innerHTML = '';
        const mk = (key, label, icon) => {
            const b = document.createElement('button');
            b.className = 'chip' + (filter.cat === key ? ' active' : '');
            b.innerHTML = (icon ? icon + ' ' : '') + label;
            b.addEventListener('click', () => {
                filter.cat = key; filter.sub = ''; filter.page = 1;
                if (key === 'adult' && localStorage.getItem(LS.gate) !== 'ok') { openGate('adult'); return; }
                buildChips(); renderBrowse();
            });
            row.appendChild(b);
        };
        mk('all', t('cat_all'), '✨');
        Object.keys(CATS).forEach((k) => mk(k, lang === 'fr' ? CATS[k].fr : CATS[k].ar, CATS[k].icon));

        // sub chips (countries / continents)
        const sub = $('#subChips');
        sub.innerHTML = '';
        let opts = [];
        if (filter.cat === 'arab') opts = Object.keys(COUNTRIES).map((c) => ({ v: c, label: (lang === 'fr' ? COUNTRIES[c].fr : COUNTRIES[c].ar), flag: COUNTRIES[c].flag }));
        else if (filter.cat === 'world') opts = Object.keys(CONTINENTS).map((c) => ({ v: c, label: (lang === 'fr' ? CONTINENTS[c].fr : CONTINENTS[c].ar), flag: CONTINENTS[c].icon }));
        if (opts.length) {
            sub.classList.remove('hidden');
            const all = document.createElement('button');
            all.className = 'chip' + (!filter.sub ? ' active' : '');
            all.textContent = lang === 'fr' ? 'Tous' : 'الكل';
            all.addEventListener('click', () => { filter.sub = ''; filter.page = 1; buildChips(); renderBrowse(); });
            sub.appendChild(all);
            opts.forEach((o) => {
                const b = document.createElement('button');
                b.className = 'chip' + (filter.sub === o.v ? ' active' : '');
                b.innerHTML = o.flag + ' ' + o.label;
                b.addEventListener('click', () => { filter.sub = o.v; filter.page = 1; buildChips(); renderBrowse(); });
                sub.appendChild(b);
            });
        } else sub.classList.add('hidden');
    }

    // ---------- Search ----------
    $('#searchInput').addEventListener('input', (e) => {
        filter.q = e.target.value.trim().toLowerCase();
        filter.page = 1;
        renderBrowse();
    });
    $('#sortSelect').addEventListener('change', (e) => { filter.sort = e.target.value; renderBrowse(); });
    $('#moreBtn').addEventListener('click', () => { filter.page++; renderBrowse(true); });

    function queryList(list) {
        if (filter.cat !== 'all') list = list.filter((j) => j.cat === filter.cat);
        if (filter.sub) list = list.filter((j) => j.sub === filter.sub || j.co === filter.sub);
        if (filter.q) {
            list = list.filter((j) =>
                j.ar.toLowerCase().indexOf(filter.q) > -1 ||
                j.fr.toLowerCase().indexOf(filter.q) > -1);
        }
        if (filter.sort === 'hot') list = list.slice().sort((a, b) => effRating(b) - effRating(a));
        else if (filter.sort === 'az') list = list.slice().sort((a, b) => a.ar.localeCompare(b.ar, 'ar'));
        else list = list.slice().reverse();
        return list;
    }

    // ---------- Joke card HTML ----------
    function badgeFor(j) {
        let h = '';
        const meta = CATS[j.cat];
        h += '<span class="badge">' + meta.icon + ' ' + (lang === 'fr' ? meta.fr : meta.ar) + '</span>';
        if (j.cat === 'arab' && COUNTRIES[j.sub]) h += '<span class="badge">' + COUNTRIES[j.sub].flag + ' ' + (lang === 'fr' ? COUNTRIES[j.sub].fr : COUNTRIES[j.sub].ar) + '</span>';
        if (j.cat === 'world' && CONTINENTS[j.sub]) h += '<span class="badge">' + CONTINENTS[j.sub].icon + ' ' + (lang === 'fr' ? CONTINENTS[j.sub].fr : CONTINENTS[j.sub].ar) + '</span>';
        if (j.co && FOREIGN_COUNTRIES[j.co]) h += '<span class="badge">' + FOREIGN_COUNTRIES[j.co].flag + ' ' + (lang === 'fr' ? FOREIGN_COUNTRIES[j.co].fr : FOREIGN_COUNTRIES[j.co].ar) + '</span>';
        if (j.cat === 'adult') h += '<span class="badge b18">18+</span>';
        return h;
    }

    function starsHtml(val) {
        let h = '<div class="stars">';
        for (let i = 1; i <= 5; i++) h += '<span class="star' + (val >= i - 0.25 ? ' on' : '') + '">★</span>';
        return h + '</div>';
    }

    function jokeCard(j, idx) {
        const isFav = favs.indexOf(j.id) > -1;
        const my = myRates[j.id] || 0;
        const el = document.createElement('article');
        el.className = 'joke';
        el.style.animationDelay = Math.min(idx * 40, 320) + 'ms';
        el.innerHTML =
            '<div class="joke-head"><div class="joke-badges">' + badgeFor(j) + '</div>' +
            '<span class="joke-num">#' + j.id + '</span></div>' +
            '<div class="joke-text">' + txt(j) + '</div>' +
            '<div class="joke-foot">' + starsHtml(effRating(j)) +
            '<div class="joke-tools">' +
            '<button class="tool js-fav' + (isFav ? ' fav-on' : '') + '" title="' + t('favorite') + '">' + (isFav ? '❤️' : '🤍') + '</button>' +
            '<button class="tool js-share" title="' + t('share') + '">📤</button>' +
            '<button class="tool js-open" title="' + t('show') + '">🔍</button>' +
            '</div></div>' +
            '<div class="joke-rate-me"><span>' + t('your_rating') + ':</span><span class="mystars"></span></div>';

        // my rating stars
        const ms = el.querySelector('.mystars');
        for (let i = 1; i <= 5; i++) {
            const s = document.createElement('span');
            s.className = 'mystar' + (my >= i ? ' on' : '');
            s.textContent = '★';
            s.addEventListener('click', (e) => { e.stopPropagation(); setMyRate(j.id, i); });
            ms.appendChild(s);
        }
        el.querySelector('.js-fav').addEventListener('click', (e) => { e.stopPropagation(); toggleFav(j.id); });
        el.querySelector('.js-share').addEventListener('click', (e) => { e.stopPropagation(); shareJoke(j); });
        el.querySelector('.js-open').addEventListener('click', (e) => { e.stopPropagation(); openModal([j], 0); });
        el.addEventListener('click', () => openModal([j], 0));
        return el;
    }

    // ---------- Render lists ----------
    function renderBrowse(append) {
        const list = queryList(JOKES);
        const shown = filter.page * PER;
        $('#resultCount').textContent = list.length + ' ' + t('results');
        const wrap = $('#jokeList');
        if (!append) { wrap.innerHTML = ''; filter.page = 1; }
        const start = append ? (filter.page - 1) * PER : 0;
        const slice = append ? list.slice((filter.page - 1) * PER, filter.page * PER) : list.slice(0, PER);
        if (!append) wrap.innerHTML = '';
        slice.forEach((j, i) => wrap.appendChild(jokeCard(j, i)));
        $('#emptyState').classList.toggle('hidden', list.length > 0);
        $('#moreBtn').classList.toggle('hidden', shown >= list.length);
    }

    function topList() {
        return JOKES.slice().sort((a, b) => effRating(b) - effRating(a) || b.id - a.id);
    }
    function renderTop() {
        const list = topList();
        const wrap = $('#topList');
        wrap.innerHTML = '';
        list.slice(0, topPage * PER).forEach((j, i) => wrap.appendChild(jokeCard(j, i)));
        $('#topMoreBtn').classList.toggle('hidden', topPage * PER >= list.length);
    }
    $('#topMoreBtn').addEventListener('click', () => { topPage++; renderTop(); });

    function renderFav() {
        const wrap = $('#favList');
        wrap.innerHTML = '';
        const list = JOKES.filter((j) => favs.indexOf(j.id) > -1);
        list.forEach((j, i) => wrap.appendChild(jokeCard(j, i)));
        $('#favEmpty').classList.toggle('hidden', list.length > 0);
        $('#statFav').textContent = list.length;
    }

    // ---------- Fav / rate / share ----------
    function toggleFav(id) {
        const i = favs.indexOf(id);
        if (i > -1) { favs.splice(i, 1); toast(lang === 'fr' ? 'Retiré des favoris' : 'أُزيلت من المفضّلة'); }
        else { favs.push(id); toast(lang === 'fr' ? 'Ajoutée aux favoris ❤️' : 'أُضيفت للمفضّلة ❤️'); }
        saveFav();
        $('#statFav').textContent = favs.length;
        renderCurrent();
        syncModalFav();
    }
    function setMyRate(id, v) {
        myRates[id] = (myRates[id] === v) ? 0 : v;
        if (!myRates[id]) delete myRates[id];
        saveRates();
        renderCurrent();
        renderTop();
        toast(lang === 'fr' ? 'Merci pour votre note !' : 'شكراً لتقييمك!');
    }
    function shareJoke(j) {
        const text = t('share_text') + '\n\n' + txt(j) + '\n\n— ' + t('app_name') + ' 😂';
        if (navigator.share) {
            navigator.share({ title: t('app_name'), text: text }).catch(() => copyText(text));
        } else copyText(text);
    }
    function copyText(text) {
        (navigator.clipboard ? navigator.clipboard.writeText(text) : Promise.reject())
            .then(() => toast(t('copied')))
            .catch(() => {
                const ta = document.createElement('textarea');
                ta.value = text; document.body.appendChild(ta); ta.select();
                try { document.execCommand('copy'); toast(t('copied')); } catch (e) { toast(t('share_api_error')); }
                document.body.removeChild(ta);
            });
    }

    // ---------- Modal ----------
    function openModal(queue, idx) {
        modalQueue = queue; modalIdx = idx || 0;
        renderModal();
        $('#jokeModal').classList.add('open');
    }
    function renderModal() {
        const j = modalQueue[modalIdx];
        if (!j) return closeModal();
        $('#modalLabel').textContent = CATS[j.cat].icon;
        $('#modalText').textContent = txt(j);
        $('#modalTags').innerHTML = badgeFor(j);
        const r = effRating(j);
        let sh = '';
        for (let i = 1; i <= 5; i++) sh += '<span style="color:' + (r >= i - 0.25 ? 'var(--pri)' : '#ddd') + '">★</span>';
        $('#modalRating').innerHTML = '<span class="big-stars">' + sh + '</span>' +
            t('rating') + ': ' + r.toFixed(1) + ' / 5 · ' + (lang === 'fr' ? 'Votre note' : 'تقييمك') + ' ★'.repeat(myRates[j.id] || 0);
        syncModalFav();
    }
    function syncModalFav() {
        const j = modalQueue[modalIdx];
        if (!j) return;
        const on = favs.indexOf(j.id) > -1;
        $('#mFav').classList.toggle('fav-on', on);
        $('#mFav').textContent = on ? '❤️' : '🤍';
    }
    function closeModal() { $('#jokeModal').classList.remove('open'); }
    $('#modalClose').addEventListener('click', closeModal);
    $('#jokeModal').addEventListener('click', (e) => { if (e.target === $('#jokeModal')) closeModal(); });
    $('#mNext').addEventListener('click', () => { modalIdx = (modalIdx + 1) % modalQueue.length; renderModal(); });
    $('#mFav').addEventListener('click', () => { const j = modalQueue[modalIdx]; if (j) toggleFav(j.id); });
    $('#mShare').addEventListener('click', () => { const j = modalQueue[modalIdx]; if (j) shareJoke(j); });
    $('#mCopy').addEventListener('click', () => { const j = modalQueue[modalIdx]; if (j) copyText(txt(j)); });

    // ---------- Random / daily ----------
    function openRandom() {
        const j = JOKES[Math.floor(Math.random() * JOKES.length)];
        openModal([j], 0);
    }
    $('#randomBtn').addEventListener('click', openRandom);
    $('#heroRandom').addEventListener('click', openRandom);

    function showDaily() {
        const day = Math.floor(Date.now() / 86400000);
        const j = JOKES[day % JOKES.length];
        const box = $('#dailyBox');
        box.classList.remove('hidden');
        const w = $('#dailyJoke');
        w.innerHTML = '';
        w.appendChild(jokeCard(j, 0));
        box.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    $('#heroDaily').addEventListener('click', showDaily);

    // ---------- 18+ gate ----------
    function openGate(target) {
        gateTarget = target;
        $('#gateModal').classList.add('open');
    }
    $('#gateYes').addEventListener('click', () => {
        localStorage.setItem(LS.gate, 'ok');
        $('#gateModal').classList.remove('open');
        filter = { cat: gateTarget, sub: '', q: '', sort: 'hot', page: 1 };
        $('#searchInput').value = '';
        buildChips();
        setView('browse');
    });
    $('#gateNo').addEventListener('click', () => { $('#gateModal').classList.remove('open'); });

    // ---------- Videos & sources ----------
    function renderVideos() {
        const w = $('#videoList');
        w.innerHTML = '';
        VIDEOS.forEach((v) => {
            const a = document.createElement('a');
            a.className = 'video-card';
            a.href = v.url; a.target = '_blank'; a.rel = 'noopener';
            a.innerHTML = '<div class="video-thumb">▶</div><b>' + v.icon + ' ' + (lang === 'fr' ? v.fr : v.ar) + '</b><span>YouTube</span>';
            w.appendChild(a);
        });
    }
    function renderSources() {
        const w = $('#sourceList');
        w.innerHTML = '';
        SOURCES.forEach((s) => {
            const d = document.createElement('div');
            d.className = 'source-card';
            d.innerHTML = '<div class="source-icon">' + s.icon + '</div><div class="source-body">' +
                '<b>' + (lang === 'fr' ? s.title_fr : s.title_ar) + '</b>' +
                '<p>' + (lang === 'fr' ? s.desc_fr : s.desc_ar) + '</p>' +
                '<a class="source-link" href="' + s.url + '" target="_blank" rel="noopener">🔗 ' + t('open') + ' ↗</a></div>';
            w.appendChild(d);
        });
    }

    // ---------- Toast ----------
    let toastTimer;
    function toast(msg) {
        const el = $('#toast');
        el.textContent = msg;
        el.classList.add('show');
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
    }

    // ---------- Language toggle ----------
    $('#langBtn').addEventListener('click', () => {
        lang = (lang === 'ar') ? 'fr' : 'ar';
        localStorage.setItem(LS.lang, lang);
        applyLang();
        toast(lang === 'fr' ? 'Langue : Français 🇫🇷' : 'اللغة: العربية 🌍');
    });

    // ---------- PWA install ----------
    let deferredPrompt = null;
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        $('#installBtn').hidden = false;
    });
    $('#installBtn').addEventListener('click', async () => {
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        await deferredPrompt.userChoice;
        deferredPrompt = null;
        $('#installBtn').hidden = true;
    });

    // ---------- Service worker ----------
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('sw.js').catch(() => {});
        });
    }

    // ---------- Keyboard ----------
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') { closeModal(); openSidebar(false); }
        if ($('#jokeModal').classList.contains('open') && e.key === 'ArrowLeft') { modalIdx = (modalIdx + 1) % modalQueue.length; renderModal(); }
        if ($('#jokeModal').classList.contains('open') && e.key === 'ArrowRight') { modalIdx = (modalIdx - 1 + modalQueue.length) % modalQueue.length; renderModal(); }
    });

    // ---------- Init ----------
    $('#statTotal').textContent = JOKES.length;
    $('#statFav').textContent = favs.length;
    applyLang();

    const params = new URLSearchParams(location.search);
    const v = params.get('view');
    if (v === 'random') openRandom();
    else if (v === 'daily') showDaily();
    else if (v === 'top') setView('top');
})();
