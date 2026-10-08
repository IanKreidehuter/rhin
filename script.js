'use strict';
/* Japanese N4 app: static SPA, hash routing, data loaded with fetch() */
const view = document.getElementById('view');
// Content protection: block context menu / long-press menu, selection, copy and dragging (search inputs stay usable)
['contextmenu', 'dragstart', 'selectstart', 'copy', 'cut'].forEach(t =>
  document.addEventListener(t, e => { if (!(e.target.closest && e.target.closest('input,textarea'))) e.preventDefault(); }));
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
// Clean a value: never show null/undefined/empty; arrays are joined
const val = v => {
  if (v == null) return '';
  if (Array.isArray(v)) return v.map(val).filter(Boolean).join(' / ');
  const s = String(v).trim();
  return /^(null|undefined)$/i.test(s) ? '' : s;
};
const dash = v => esc(val(v) || '—');
const lineHtml = v => (Array.isArray(v) ? v : [v]).map(val).filter(Boolean).map(esc).join('<br>') || '—';
const kj = w => (val(w.kanji) && val(w.kanji) !== val(w.hiragana)) ? val(w.kanji) : '';
const rb = w => kj(w) ? `<ruby>${esc(kj(w))}<rt>${esc(val(w.hiragana))}</rt></ruby>` : esc(val(w.hiragana));
const typeLabel = t => val(t).replace('/', ' / ');
const debounce = (f, ms = 120) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => f(...a), ms); }; };

/* ---- settings + progress, saved in localStorage (guarded) ---- */
const store = { get(k, d) { try { return JSON.parse(localStorage.getItem('n4_' + k)) ?? d; } catch (e) { return d; } }, set(k, v) { try { localStorage.setItem('n4_' + k, JSON.stringify(v)); } catch (e) { /* storage blocked */ } } };
const cfg = Object.assign({ lang: 'id', theme: 'light', glass: 'frosted' }, store.get('cfg', {}));
const applyCfg = () => { document.documentElement.lang = cfg.lang; document.documentElement.dataset.theme = cfg.theme; document.documentElement.dataset.glass = cfg.glass; store.set('cfg', cfg); };
applyCfg();
const wkey = w => val(w.hiragana) + '|' + val(w.kanji);
/* ---- i18n: UI source text is English. Indonesian (default) is applied by translating the DOM; English is selectable in Settings ---- */
const ID = {
'Home':'Beranda','Search':'Cari','Settings':'Pengaturan','Back':'Kembali','Back to home':'Kembali ke beranda','Main navigation':'Navigasi utama','Kanji cards':'Kartu kanji','Saved':'Tersimpan','Flip card':'Balik kartu','Swap direction':'Tukar arah','Pronounce':'Ucapkan','Save':'Simpan','Again':'Ulangi','Flashcards':'Kartu','Guess cards':'Kartu tebak','Swipe cards':'Kartu geser','Loading':'Memuat','Search everything':'Cari semua',
'Cards':'Kartu','Grammar':'Tata Bahasa','Quiz':'Kuis','Kanji Cards':'Kartu Kanji','Guess Cards':'Kartu Tebak','Memorize':'Hafalkan',
'Japanese Vocabulary':'Kosakata Bahasa Jepang','Readings and example words':'Bacaan dan contoh kata','Swipe through every Kanji':'Geser semua kanji','Flip, guess and memorize by lesson':'Balik, tebak, dan hafalkan per pelajaran','Grammar Lessons':'Pelajaran Tata Bahasa','Test your Japanese':'Uji bahasa Jepangmu','COMING SOON':'SEGERA HADIR','Show More ⌄':'Lihat lebih ⌄',
'nice to see you!':'senang bertemu denganmu!','Word of the day':'Kata hari ini','Kanji of the day':'Kanji hari ini','Details':'Detail','Practice ›››':'Latihan ›››','Lessons':'Pelajaran','Kotoba by lesson / bab':'Kotoba per pelajaran / bab','Kanji by lesson':'Kanji per pelajaran','See all':'Lihat semua',
'Learning data could not be loaded.':'Data belajar tidak dapat dimuat.','Make sure ALL_KOSAKATA_N4_FORMS.json and kanji_lessonfileN4.json sit next to index.html, and open the site over http(s), for example GitHub Pages.':'Pastikan ALL_KOSAKATA_N4_FORMS.json dan kanji_lessonfileN4.json berada di samping index.html, dan buka situs lewat http(s), misalnya GitHub Pages.','Loading…':'Memuat…',
'Search hiragana, kanji, meaning, bab':'Cari hiragana, kanji, arti, bab','All bab':'Semua bab','All types':'Semua jenis','No words match your search.':'Tidak ada kata yang cocok.','Dictionary form:':'Bentuk kamus:',
'verb':'kata kerja','noun / expression':'kata benda / ungkapan','adjective':'kata sifat','i-adjective':'kata sifat-i','na-adjective':'kata sifat-na',
'DICTIONARY FORM':'BENTUK KAMUS','MASU FORM':'BENTUK MASU','SOURCE FORM':'BENTUK ASLI','EXAMPLES':'CONTOH',
'Search kanji, reading, meaning, example':'Cari kanji, bacaan, arti, contoh','All lessons':'Semua pelajaran','No kanji match your search.':'Tidak ada kanji yang cocok.',
'Kotoba or Kanji':'Kotoba atau Kanji','No kotoba found.':'Kotoba tidak ditemukan.','No kanji found.':'Kanji tidak ditemukan.',
'Practice saved words':'Latih kata tersimpan','Tap ☆ on a word to save it here.':'Ketuk ☆ pada kata untuk menyimpannya di sini.','Tap ☆ on a kanji to save it here.':'Ketuk ☆ pada kanji untuk menyimpannya di sini.',
'LANGUAGE':'BAHASA','THEME':'TEMA','Light':'Terang','Dark':'Gelap','GLASS STYLE':'GAYA KACA','PROGRESS':'KEMAJUAN','Reset learned progress':'Atur ulang kemajuan','Reset all learned progress?':'Atur ulang semua kemajuan belajar?',
'Grammar data could not be loaded.':'Data tata bahasa tidak dapat dimuat.',
'Choose a section':'Pilih bagian','See the Japanese word, guess the Indonesian meaning':'Lihat kata Jepang, tebak artinya dalam bahasa Indonesia','See the Indonesian meaning, guess the Japanese word':'Lihat arti bahasa Indonesia, tebak kata Jepangnya','Choose a lesson / bab to memorize':'Pilih pelajaran / bab untuk dihafal','★ Saved words':'★ Kata tersimpan','Saved words':'Kata tersimpan',
'Tap to reveal the meaning':'Ketuk untuk melihat arti','Tap to reveal the Japanese':'Ketuk untuk melihat bahasa Jepangnya','Reveal, then drag the slider (or swipe right) = known · ✗ or swipe left = again':'Balik kartu, lalu geser slider (atau geser kanan) = hafal · ✗ atau geser kiri = ulangi','Drag to mark as known':'Geser untuk tandai hafal',
'Keep practicing!':'Terus berlatih!','Perfect! すごい！':'Sempurna! すごい！','Review missed':'Ulangi yang salah','Restart':'Mulai ulang',
'Kotoba cards':'Kartu kotoba','Kanji cards ':'Kartu kanji','← Previous':'← Sebelumnya','Next →':'Berikutnya →','Shuffle':'Acak','Reset':'Atur ulang'
};
ID['Kanji cards'] = 'Kartu kanji';
Object.assign(ID, { 'Post': 'Postingan', 'Refresh': 'Muat ulang', 'No posts yet.': 'Belum ada postingan.', 'Load more': 'Muat lebih banyak', 'Could not load posts.': 'Postingan tidak dapat dimuat.', 'Retry': 'Coba lagi',
  'Post feed is not connected yet. Paste your Apps Script URL in config.js.': 'Feed postingan belum terhubung. Tempel URL Apps Script di config.js.', 'Showing saved posts (offline).': 'Menampilkan postingan tersimpan (offline).' });
const RULES = [
[/^Lesson (\d+)/, 'Pelajaran $1'], [/^🔥 (\d+) day streak$/, '🔥 $1 hari beruntun'], [/^✓ (\d+) learned$/, '✓ $1 dikuasai'], [/^★ (\d+) saved$/, '★ $1 tersimpan'],
[/^(\d+) of (\d+) words$/, '$1 dari $2 kata'], [/^(\d+) of (\d+) kanji$/, '$1 dari $2 kanji'], [/^(\d+) words · (\d+)% learned$/, '$1 kata · $2% dikuasai'], [/^(\d+) words$/, '$1 kata'],
[/^(\d+) words \| N4$/, '$1 kata | N4'], [/^(\d+) kanji \| (\d+) lessons$/, '$1 kanji | $2 pelajaran'], [/^(\d+) cards \| Swipe$/, '$1 kartu | Geser'], [/^(\d+) words \| by lesson$/, '$1 kata | per pelajaran'],
[/^(\d+) lessons \| N4$/, '$1 pelajaran | N4'], [/^(\d+) lessons$/, '$1 pelajaran'], [/^TO REVIEW \((\d+)\)$/, 'UNTUK DIULANG ($1)'],
[/^(\d+) learned · (\d+) saved · (\d+) day streak$/, '$1 dikuasai · $2 tersimpan · $3 hari beruntun']
];
// translate one string (keeps surrounding whitespace); unknown strings (Japanese, data) pass through unchanged
const trs = s => {
  const m = s.match(/^(\s*)([\s\S]*?)(\s*)$/), k = m[2];
  if (!k) return s;
  let r = ID[k];
  if (r === undefined) for (const [re, to] of RULES) if (re.test(k)) { r = k.replace(re, to); break; }
  return r === undefined ? s : m[1] + r + m[3];
};
const T = s => cfg.lang === 'id' ? trs(s) : s;
const TR_ATTRS = ['placeholder', 'aria-label', 'title'];
function tr(root) {          // originals are remembered (_o), so switching back to English is lossless
  const one = n => {
    if (n.nodeType === 3) { const o = n._o ?? (n._o = n.nodeValue), v = T(o); if (n.nodeValue !== v) n.nodeValue = v; }
    else for (const a of TR_ATTRS) if (n.hasAttribute && n.hasAttribute(a)) { n._oa = n._oa || {}; const o = n._oa[a] ?? (n._oa[a] = n.getAttribute(a)), v = T(o); if (n.getAttribute(a) !== v) n.setAttribute(a, v); }
  };
  one(root);
  if (root.nodeType === 1) { const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT); while (w.nextNode()) one(w.currentNode); }
}
new MutationObserver(ms => ms.forEach(m => m.addedNodes.forEach(tr))).observe(document.body, { childList: true, subtree: true });
tr(document.body);

const KNOWN = new Set(store.get('known', [])), FAVS = new Set(store.get('favs', []));
const saveSet = (n, set) => store.set(n, [...set]);
const isFav = k => FAVS.has(k);
function touchStreak() {                       // counts a study day each time a card is rated
  const today = new Date().toDateString(), s = store.get('streak', { last: '', n: 0 });
  if (s.last === today) return;
  s.n = new Date(Date.now() - 864e5).toDateString() === s.last ? s.n + 1 : 1; s.last = today; store.set('streak', s);
}
const streak = () => { const s = store.get('streak', { last: '', n: 0 }); return [new Date().toDateString(), new Date(Date.now() - 864e5).toDateString()].includes(s.last) ? s.n : 0; };
// Text-to-speech (browser voice, Japanese)
function say(t) {
  if (!('speechSynthesis' in window) || !t) return;
  const u = new SpeechSynthesisUtterance(t); u.lang = 'ja-JP'; u.rate = .85;
  speechSynthesis.cancel(); speechSynthesis.speak(u);
}
const sayBtn = (t, cls = '') => `<button class="say ${cls}" data-say="${esc(t)}" aria-label="Pronounce">🔊</button>`;
const favBtn = key => `<button class="circ fav ${isFav(key) ? 'on' : ''}" data-fav="${esc(key)}" aria-label="Save">${isFav(key) ? '★' : '☆'}</button>`;
// one delegated listener (capture phase so buttons inside flip cards don't flip them)
document.addEventListener('click', e => {
  const s = e.target.closest('[data-say]'), f = e.target.closest('[data-fav]');
  if (s) { e.preventDefault(); e.stopPropagation(); say(s.dataset.say); }
  if (f) { e.preventDefault(); e.stopPropagation(); const k = f.dataset.fav; isFav(k) ? FAVS.delete(k) : FAVS.add(k); saveSet('favs', FAVS); f.classList.toggle('on', isFav(k)); f.textContent = isFav(k) ? '★' : '☆'; }
}, true);

let KOTOBA = [], KANJI = [], GRAMMAR = [], loadError = false;
const kState = { q: '', bab: '', type: '' }, jState = { q: '', lesson: '' };
let LESSONS = [];
// "住所（じゅうしょ）= alamat" -> word / reading / meaning
const parseEx = e => {
  const j = val(e.japanese), m = val(e.meaning);
  const r = j.match(/^(.*?)[（(](.*?)[）)]\s*=\s*(.*)$/);
  if (r) return { w: r[1].trim(), r: r[2].trim(), m: r[3].trim() };
  const q = j.split('=');
  if (q.length > 1) return { w: q[0].trim(), r: '', m: q.slice(1).join('=').trim() };
  return { w: j, r: '', m };
};
// Flatten kanji_lessonfileN4.json (lessons -> kanji), keeping lesson + category on each kanji
function buildKanji(d) {
  LESSONS = d.lessons || [];
  return LESSONS.flatMap(l => (l.kanji || []).map(k => ({
    kanji: val(k.kanji), on: (k.onyomi || []).map(val).filter(Boolean), kun: (k.kunyomi || []).map(val).filter(Boolean),
    arti: val(k.meaning), lesson: l.lesson, cat: val(l.category), ex: (k.examples || []).map(parseEx)
  })));
}
const kanjiMatch = (k, q) => k._s.includes(q);   // _s is built once at load

async function load() {
  try {
    const [a, b] = await Promise.all(['./ALL_KOSAKATA_N4_FORMS.json', './kanji_lessonfileN4.json'].map(async u => {
      const r = await fetch(u);
      if (!r.ok) throw new Error(u);
      return r.json();
    }));
    // Files wrap their arrays in an object; accept bare arrays too
    KOTOBA = Array.isArray(a) ? a : a.kosakata;
    KANJI = buildKanji(b);
    if (!Array.isArray(KOTOBA) || !KANJI.length) throw new Error('format');
  } catch (e) { loadError = true; }
  if (!loadError) try {
    const kl = await (await fetch('./kotoba_lesson_26-35.json')).json();
    // each lesson becomes a bab named "Lesson N"; lessons come first, thematic bab after
    const les = (kl.lessons || []).flatMap(l => (l.kotoba || []).map(w => ({ hiragana: w.hiragana, kanji: w.kanji, arti: w.arti, bab: 'Lesson ' + l.lesson })));
    KOTOBA = les.concat(KOTOBA);
  } catch (e) { /* lesson file optional: thematic vocabulary still works */ }
  const hay = (...a) => a.flat(Infinity).map(val).join(' ').toLowerCase();
  KANJI.forEach(k => k._s = hay(k.kanji, k.arti, k.cat, 'lesson ' + k.lesson, k.on, k.kun, k.ex.map(e => [e.w, e.r, e.m])));
  KOTOBA.forEach(w => w._s = hay(w.hiragana, w.kanji, w.arti, w.bab, w.type, w.dictionary_form, w.masu_form, w.masu_form_hiragana));
  try { const g = await (await fetch('./ALL_GRAMMAR_N4.json')).json(); GRAMMAR = g.pelajaran || []; } catch (e) { GRAMMAR = []; }
  route();
}

/* ---------- Views ---------- */
// Quiz is not built yet: plain page, no poster
function soonView(t) {
  view.innerHTML = `<section class="page"><div class="head"><a class="circ" href="#/home" aria-label="Back">←</a><h2>${t}</h2></div>
    <div class="msg"><h2>COMING SOON</h2><p class="count">${t}</p></div></section>`;
}

const GRADS = [['#1ea7ff', '#0a3f9c'], ['#19d3c5', '#0a8fb5'], ['#f6b96b', '#e8825a'], ['#5aa8ff', '#6a5cff']];
let homeTimer = null;
function initHero() {
  const hc = document.getElementById('hc'), cards = [...hc.children], dots = [...document.querySelectorAll('#hd i')], hp = document.getElementById('hp'), n = cards.length;
  let idx = 0, busy = false, x0 = null, dx = 0, drag = false;
  const layout = () => cards.forEach((c, i) => {     // p = depth in the stack (0 = top)
    const p = (i - idx + n) % n, q = Math.min(p, 3);
    c.style.zIndex = n - p; c.style.pointerEvents = p ? 'none' : 'auto'; c.style.opacity = p > 2 ? 0 : [1, .6, .3][p];
    c.style.transform = `translateY(${-14 * q}px) scale(${1 - .05 * q})`; dots[i].classList.toggle('on', i === idx);
  });
  const restart = () => {                            // progress bar + 7 second auto swipe
    clearInterval(homeTimer); hp.style.animation = 'none'; hp.offsetWidth; hp.style.animation = '';
    if (!matchMedia('(prefers-reduced-motion: reduce)').matches) homeTimer = setInterval(() => go(-1), 7000);
  };
  const go = dir => {                                // top card flies off (dir -1 left, 1 right), next card rises
    if (busy) return; busy = true;
    const top = cards[idx];
    top.style.transform = `translateX(${dir * 120}%) rotate(${dir * 10}deg)`; top.style.opacity = 0;
    setTimeout(() => { top.style.transition = 'none'; idx = (idx + 1) % n; layout(); top.offsetWidth; top.style.transition = ''; busy = false; }, 320);
    restart();
  };
  dots.forEach((d, i) => d.onclick = () => { if (busy || i === idx) return; idx = i; layout(); restart(); });
  hc.onpointerdown = e => { x0 = e.clientX; dx = 0; drag = false; };
  hc.onpointermove = e => {
    if (x0 === null || busy) return;
    dx = e.clientX - x0;
    if (!drag && Math.abs(dx) > 8) { drag = true; hc.setPointerCapture(e.pointerId); clearInterval(homeTimer); hp.style.animationPlayState = 'paused'; }
    if (drag) { const t = cards[idx]; t.style.transition = 'none'; t.style.transform = `translateX(${dx}px) rotate(${dx / 25}deg)`; }
  };
  const end = () => {
    if (x0 === null) return; x0 = null;
    if (!drag) return; drag = false; hp.style.animationPlayState = '';
    cards[idx].style.transition = '';
    if (Math.abs(dx) > 70) go(dx < 0 ? -1 : 1); else { layout(); restart(); }
  };
  hc.onpointerup = end; hc.onpointercancel = end;
  hc.onmouseenter = () => { clearInterval(homeTimer); hp.style.animationPlayState = 'paused'; };   // desktop: pause on hover
  hc.onmouseleave = () => { hp.style.animationPlayState = ''; restart(); };
  layout(); restart();
}
const hello = () => { const h = new Date().getHours(); return h < 11 ? 'おはよう' : h < 18 ? 'こんにちは' : 'こんばんは'; };
function homeView() {
  const babs = [...new Set(KOTOBA.map(w => val(w.bab)).filter(Boolean))];
  const thumbs = babs.map((b, i) => {
    const words = KOTOBA.filter(w => val(w.bab) === b), glyph = (words.map(w => val(w.kanji)).join('').match(/[\u4e00-\u9fff]/) || ['言'])[0];
    const g = GRADS[i % GRADS.length];
    return `<a class="thumb" href="#/kotoba/list/${encodeURIComponent(b)}" style="--c1:${g[0]};--c2:${g[1]}">
      <div class="pic">${esc(glyph)}</div><strong>${esc(b)}</strong>
      <div class="meta"><span>${words.length} words</span><span class="play-s">▶</span></div></a>`;
  }).join('');
  const kcs = LESSONS.map((l, i) => {
    const g = GRADS[(i + 1) % GRADS.length], f = (l.kanji || [])[0];
    return `<a class="thumb" href="#/kanji/list/${esc(l.lesson)}" style="--c1:${g[0]};--c2:${g[1]}"><div class="pic">${esc(f ? val(f.kanji) : '字')}</div>
      <strong>Lesson ${esc(l.lesson)} · ${esc(val(l.category))}</strong><div class="meta"><span>${(l.kanji || []).length} kanji</span><span class="play-s">▶</span></div></a>`;
  }).join('');
  // paper stack: today's word, today's kanji, then more of each (swipe, tap the dots, or wait 7 s)
  const day = Math.floor(Date.now() / 864e5), deck = [];
  for (let i = 0; i < 5; i++) { deck.push(['w', (day + i * 37) % KOTOBA.length]); deck.push(['k', (day + i * 13) % KANJI.length]); }
  const hcard = ([t, ix], i) => {
    const tag = i === 0 ? 'Word of the day' : i === 1 ? 'Kanji of the day' : t === 'w' ? 'Kotoba' : 'Kanji';
    if (t === 'w') { const w = KOTOBA[ix]; return `<article class="hcard"><div class="r2"><span class="tag">${tag}</span>${sayBtn(val(w.hiragana), 'w')}</div>
      <div class="wd">${rb(w)}</div><div class="wm">${dash(w.arti)}</div>
      <div class="hb"><a class="btn white" href="#/kotoba/word/${ix}">Details</a><a class="btn line" href="#/memo/pick/jp">Practice ›››</a></div></article>`; }
    const k = KANJI[ix]; return `<article class="hcard kc2"><div class="r2"><span class="tag">${tag}</span></div>
      <div class="wd kk">${esc(k.kanji)}</div><div class="wm">${dash(k.arti)}</div><div class="kr"><b>ON</b> ${dash(k.on)} &nbsp; <b>KUN</b> ${dash(k.kun)}</div>
      <div class="hb"><a class="btn white" href="#/kanji/item/${ix}">Details</a><a class="btn line" href="#/cards/play/${esc(k.lesson)}">Practice ›››</a></div></article>`;
  };
  view.innerHTML = `<section class="page">
    <header class="top"><a class="brand" href="#/home" aria-label="Home"><img src="./logo-long.png" alt="Learning Archive Japanese Lesson N4"></a>
      <span class="tools"><a class="circ" href="#/fav" aria-label="Saved">★</a><a class="circ" href="#/settings" aria-label="Settings">⚙</a></span></header>
    <h1 class="hi">${hello()}, <span>nice to see you!</span></h1>
    <div class="pills"><span class="pill on">🔥 ${streak()} day streak</span><span class="pill">✓ ${KNOWN.size} learned</span><a class="pill" href="#/fav">★ ${FAVS.size} saved</a></div>
    <div class="hero"><div class="hcards" id="hc">${deck.map(hcard).join('')}</div><div class="hdots" id="hd">${deck.map((_, i) => `<i data-j="${i}"></i>`).join('')}</div><div class="hprog"><i id="hp"></i></div></div>
    <div class="row"><h3>Lessons</h3></div>
    <div class="hs">
      <a class="chan" href="#/kotoba"><b>言葉</b>Kotoba</a><a class="chan" href="#/kanji"><b>漢字</b>Kanji</a>
      <a class="chan" href="#/cards"><b>札</b>Cards</a><a class="chan" href="#/memo/pick/jp"><b>暗記</b>Kotoba→Arti</a><a class="chan" href="#/memo/pick/id"><b>逆</b>Arti→Kotoba</a><a class="chan" href="#/grammar"><b>文法</b>Grammar</a><a class="chan off" href="#/quiz"><b>問</b>Quiz</a></div>
    <div class="row"><h3>Kotoba by lesson / bab</h3><a href="#/kotoba/list">See all</a></div><div class="hs">${thumbs}</div>
    <div class="row"><h3>Kanji by lesson</h3><a href="#/kanji/list">See all</a></div><div class="hs">${kcs}</div></section>`;
  initHero();
}

const errorView = () => view.innerHTML = `<section class="page"><div class="msg"><h2>Learning data could not be loaded.</h2><p style="margin-top:8px">Make sure ALL_KOSAKATA_N4_FORMS.json and kanji_lessonfileN4.json sit next to index.html, and open the site over http(s), for example GitHub Pages.</p></div></section>`;

const wordMatch = (w, q) => w._s.includes(q);
const wordRow = ([w, i]) => { const k = wkey(w), mk = (isFav('w:' + k) ? '★' : '') + (KNOWN.has(k) ? '✓' : '');
  return `<a class="item" href="#/kotoba/word/${i}"><div class="t">
  <div class="h">${esc(val(w.hiragana))}</div>${kj(w) ? `<div class="k">${esc(kj(w))}</div>` : ''}
  <div class="m">${dash(w.arti)}</div>${val(w.dictionary_form) ? `<div class="df">Dictionary form: <b>${esc(val(w.dictionary_form))}</b></div>` : ''}${val(w.type) ? `<span class="badge">${esc(typeLabel(w.type))}</span>` : ''}</div>${mk ? `<span class="mk">${mk}</span>` : ''}<span class="play-s">▶</span></a>`; };

// Kotoba list: search + bab chips + type chips (all built from the JSON)
function kotobaList(babParam) {
  if (babParam !== undefined) kState.bab = decodeURIComponent(babParam);
  const babs = [...new Set(KOTOBA.map(w => val(w.bab)).filter(Boolean))];
  const types = [...new Set(KOTOBA.map(w => val(w.type)).filter(Boolean))];
  view.innerHTML = `<section class="page">
    <div class="head"><a class="circ" href="#/home" aria-label="Back">←</a><h2>Kotoba</h2><a class="circ" href="#/kotoba/cards" aria-label="Flashcards">札</a><a class="circ" id="gl" href="#/memo/pick" aria-label="Guess cards">暗</a></div>
    <input class="search" id="q" type="search" placeholder="Search hiragana, kanji, meaning, bab" aria-label="Search vocabulary" value="${esc(kState.q)}">
    <div class="chips" id="babs"></div><div class="chips" id="types"></div>
    <p class="count" id="n"></p><div class="list" id="list"></div></section>`;
  const chips = (id, all, items, key) => {
    const el = document.getElementById(id);
    el.innerHTML = [''].concat(items).map(v => `<button class="chip ${kState[key] === v ? 'on' : ''}" data-v="${esc(v)}">${esc(v ? (key === 'type' ? typeLabel(v) : v) : all)}</button>`).join('');
    el.onclick = e => { const b = e.target.closest('button'); if (!b) return; kState[key] = b.dataset.v; chips(id, all, items, key); draw(); };
  };
  let io = null;
  // Renders 60 rows at a time; more are added as you scroll (keeps 800 words fast)
  const draw = () => {
    io && io.disconnect();
    const q = kState.q.trim().toLowerCase();
    const out = KOTOBA.map((w, i) => [w, i]).filter(([w]) => (!kState.bab || val(w.bab) === kState.bab) && (!kState.type || val(w.type) === kState.type) && (!q || wordMatch(w, q)));
    document.getElementById('n').textContent = `${out.length} of ${KOTOBA.length} words`;
    const cnt = {}; out.forEach(([w]) => { const b = val(w.bab); cnt[b] = (cnt[b] || 0) + 1; });
    const list = document.getElementById('list'); list.innerHTML = '';
    let i = 0, last = null;
    const more = () => {
      const end = Math.min(i + 60, out.length); let h = '';
      for (; i < end; i++) { const b = val(out[i][0].bab); if (b !== last) { last = b; h += `<h3 class="grp">${esc(b)}<span>${cnt[b]}</span></h3>`; } h += wordRow(out[i]); }
      const s = list.querySelector('.sentinel'); if (s) s.remove();
      list.insertAdjacentHTML('beforeend', h + (i < out.length ? '<div class="sentinel"></div>' : ''));
      if (i < out.length) { io = new IntersectionObserver(e => { if (e[0].isIntersecting) { io.disconnect(); more(); } }, { rootMargin: '700px' }); io.observe(list.querySelector('.sentinel')); }
    };
    if (out.length) more(); else list.innerHTML = '<div class="msg">No words match your search.</div>';
  };
  chips('babs', 'All bab', babs, 'bab'); chips('types', 'All types', types, 'type');
  document.getElementById('q').oninput = debounce(e => { kState.q = e.target.value; draw(); });
  draw();
}

const wordCard = w => `<div class="h">${esc(val(w.hiragana))}</div>
  ${kj(w) ? `<div class="k w">${esc(kj(w))}</div>` : ''}<div class="m">${dash(w.arti)}</div>
  ${val(w.type) ? `<span class="badge">${esc(typeLabel(w.type))}</span>` : ''}${formsHtml(w)}`;

// Dictionary / masu forms come straight from the JSON; masu is null for non-verbs and then hidden
function formsHtml(w) {
  const shown = [val(w.kanji), val(w.hiragana)];
  const cells = [['DICTIONARY FORM', w.dictionary_form], ['MASU FORM', w.masu_form], ['MASU (KANA)', w.masu_form_hiragana], ['SOURCE FORM', w.source_form]]
    .filter(([l, v]) => val(v) && (l !== 'SOURCE FORM' || !shown.includes(val(v))));
  return cells.length ? `<div class="forms">${cells.map(([l, v]) => `<div><span class="lbl" style="margin:0">${l}</span><div class="rv">${esc(val(v))}</div></div>`).join('')}</div>` : '';
}

function kotobaDetail(i) {
  const w = KOTOBA[i];
  if (!w) return location.hash = '#/kotoba/list';
  view.innerHTML = `<section class="page"><div class="head"><a class="circ" href="#/kotoba/list" aria-label="Back">←</a><h2>Kotoba</h2>${sayBtn(val(w.hiragana), 'circ')}${favBtn('w:' + wkey(w))}</div>
    <article class="detail">${wordCard(w)}<span class="lbl">BAB</span><div class="rv">${dash(w.bab)}</div></article></section>`;
}

function kanjiList(lp) {
  if (lp !== undefined) jState.lesson = lp;
  view.innerHTML = `<section class="page">
    <div class="head"><a class="circ" href="#/home" aria-label="Back">←</a><h2>Kanji</h2><a class="circ" id="cl" href="#/cards/play" aria-label="Swipe cards">札</a></div>
    <input class="search" id="q" type="search" placeholder="Search kanji, reading, meaning, example" aria-label="Search kanji" value="${esc(jState.q)}">
    <div class="chips" id="les"></div><p class="count" id="n"></p><div id="list"></div></section>`;
  const chips = () => {
    const el = document.getElementById('les');
    el.innerHTML = `<button class="chip ${jState.lesson === '' ? 'on' : ''}" data-v="">All lessons</button>` + LESSONS.map(l =>
      `<button class="chip ${jState.lesson === String(l.lesson) ? 'on' : ''}" data-v="${esc(l.lesson)}">L${esc(l.lesson)} ${esc(val(l.category))}</button>`).join('');
    el.onclick = e => { const b = e.target.closest('button'); if (!b) return; jState.lesson = b.dataset.v; chips(); draw(); };
  };
  const draw = () => {
    const q = jState.q.trim().toLowerCase();
    const out = KANJI.map((k, i) => [k, i]).filter(([k]) => (!jState.lesson || String(k.lesson) === jState.lesson) && (!q || kanjiMatch(k, q)));
    document.getElementById('n').textContent = `${out.length} of ${KANJI.length} kanji`;
    document.getElementById('cl').href = '#/cards/play' + (jState.lesson ? '/' + jState.lesson : '');
    // Group by lesson, showing the lesson number and its category
    document.getElementById('list').innerHTML = LESSONS.map(l => {
      const g = out.filter(([k]) => k.lesson === l.lesson);
      return g.length ? `<h3 class="grp">Lesson ${esc(l.lesson)} · ${esc(val(l.category))}<span>${g.length}</span></h3><div class="kgrid">${g.map(([k, i]) => `<a class="kitem" href="#/kanji/item/${i}">
        <div class="big">${esc(k.kanji)}</div><div class="m">${dash(k.arti)}</div>
        <div class="rd"><b>ON</b> ${dash(k.on)}<br><b>KUN</b> ${lineHtml(k.kun)}</div></a>`).join('')}</div>` : '';
    }).join('') || '<div class="msg">No kanji match your search.</div>';
  };
  document.getElementById('q').oninput = debounce(e => { jState.q = e.target.value; draw(); });
  chips(); draw();
}

const kanjiCard = k => `<span class="badge">Lesson ${esc(k.lesson)} · ${esc(k.cat)}</span><div class="k">${esc(k.kanji)}</div><div class="m">${dash(k.arti)}</div>
  <span class="lbl">ONYOMI</span><div class="rv">${dash(k.on)}</div>
  <span class="lbl">KUNYOMI</span><div class="rv">${lineHtml(k.kun)}</div>`;

function kanjiDetail(i) {
  const k = KANJI[i];
  if (!k) return location.hash = '#/kanji/list';
  const ex = k.ex.map(o => `<div class="ex"><b>${dash(o.w)}</b>${o.r ? `<span>${esc(o.r)}</span>` : ''}<span>${dash(o.m)}</span>${sayBtn(o.r || o.w, 'sm')}</div>`).join('');
  view.innerHTML = `<section class="page"><div class="head"><a class="circ" href="#/kanji/list" aria-label="Back">←</a><h2>Kanji</h2>${favBtn('k:' + k.kanji)}</div>
    <article class="detail">${kanjiCard(k)}<span class="lbl">EXAMPLES</span>${ex || '<div class="rv">—</div>'}</article></section>`;
}

// Search tab: one box for kotoba and kanji
function searchView() {
  view.innerHTML = `<section class="page"><div class="head"><h2>Search</h2></div>
    <input class="search" id="q" type="search" placeholder="Kotoba or Kanji" aria-label="Search everything" autofocus><div id="res"></div></section>`;
  const q$ = document.getElementById('q'), res = document.getElementById('res');
  q$.oninput = debounce(() => {
    const q = q$.value.trim().toLowerCase();
    if (!q) return res.innerHTML = '';
    const w = KOTOBA.map((x, i) => [x, i]).filter(([x]) => wordMatch(x, q)), k = KANJI.map((x, i) => [x, i]).filter(([x]) => kanjiMatch(x, q));
    res.innerHTML = `<h3 class="sub">Kotoba (${w.length})</h3><div class="list">${w.slice(0, 30).map(wordRow).join('') || '<div class="msg">No kotoba found.</div>'}</div>
      <h3 class="sub">Kanji (${k.length})</h3><div class="kgrid">${k.slice(0, 30).map(([x, i]) => `<a class="kitem" href="#/kanji/item/${i}"><div class="big">${esc(x.kanji)}</div><div class="m">${dash(x.arti)}</div></a>`).join('') || '<div class="msg" style="grid-column:1/-1">No kanji found.</div>'}</div>`;
  });
}



/* ---- Post: a feed read from Google Sheets + Drive through the Apps Script web app (URL in config.js) ---- */
const API = (window.N4_API || '').trim();
const fmtDate = iso => { try { return new Intl.DateTimeFormat(cfg.lang === 'id' ? 'id-ID' : 'en-GB', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso)); } catch (e) { return ''; } };
const driveImg = (id, w) => `https://drive.google.com/thumbnail?id=${encodeURIComponent(id)}&sz=w${w}`;
const linkify = t => esc(t).replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>');
const postCard = p => `<article class="post"><header class="ph">
  ${p.avatarId ? `<img class="av2" src="${driveImg(p.avatarId, 160)}" alt="" loading="lazy" referrerpolicy="no-referrer">` : '<span class="av2 ph0">言</span>'}
  <div><b>${esc(p.username || 'Admin')}</b><time>${esc(fmtDate(p.timestamp))}</time></div></header>
  ${p.caption ? `<p class="cap">${linkify(p.caption)}</p>` : ''}
  ${p.mediaId ? (p.mediaType === 'video'
    ? `<div class="vid"><iframe src="https://drive.google.com/file/d/${encodeURIComponent(p.mediaId)}/preview" allow="autoplay; fullscreen" allowfullscreen loading="lazy"></iframe></div>`
    : `<a href="https://drive.google.com/file/d/${encodeURIComponent(p.mediaId)}/view" target="_blank" rel="noopener noreferrer"><img class="pm" src="${driveImg(p.mediaId, 1200)}" alt="" loading="lazy" referrerpolicy="no-referrer"></a>`) : ''}</article>`;
async function fetchPosts(offset) {
  const r = await fetch(`${API}?action=list&limit=15&offset=${offset}`), j = await r.json();
  if (!j.ok) throw new Error(j.error || 'Error');
  return j;
}
function postView() {
  view.innerHTML = `<section class="page"><div class="head"><h2>Post</h2><button class="circ" id="rf" aria-label="Refresh">↻</button></div>
    <div id="feed"></div><div id="fm"></div></section>`;
  const feed = document.getElementById('feed'), fm = document.getElementById('fm');
  if (!API) { feed.innerHTML = '<div class="msg">Post feed is not connected yet. Paste your Apps Script URL in config.js.</div>'; return; }
  let items = store.get('feed', []), more = false, busy = false;
  const alive = () => document.body.contains(feed);                    // user may have left the page while loading
  const paint = note => {
    feed.innerHTML = (note ? `<p class="count">${note}</p>` : '') + (items.map(postCard).join('') || '<div class="msg">No posts yet.</div>');
    fm.innerHTML = more ? '<button class="btn ghost" id="lm" style="display:flex;margin:14px auto">Load more</button>' : '';
    const lm = document.getElementById('lm'); if (lm) lm.onclick = () => load(true);
  };
  const load = async append => {
    if (busy) return; busy = true;
    if (!items.length) feed.innerHTML = '<article class="post sk"></article><article class="post sk"></article>';
    try {
      const j = await fetchPosts(append ? items.length : 0);
      if (!alive()) return;
      items = append ? items.concat(j.posts) : j.posts; more = j.hasMore;
      if (!append) store.set('feed', items.slice(0, 15));              // cached copy shows instantly next time / offline
      paint();
    } catch (e) {
      if (!alive()) return;
      if (items.length) paint('Showing saved posts (offline).');
      else { feed.innerHTML = '<div class="msg">Could not load posts.<br><button class="btn" id="rt" style="margin-top:12px">Retry</button></div>'; document.getElementById('rt').onclick = () => load(false); }
    }
    busy = false;
  };
  if (items.length) paint();
  document.getElementById('rf').onclick = () => load(false);
  load(false);
}

/* Settings button lives in the top panel of every page */
new MutationObserver(() => {
  const h = view.querySelector('.head');
  if (h && !h.querySelector('.gear') && !/settings/.test(location.hash)) h.insertAdjacentHTML('beforeend', '<a class="circ gear" href="#/settings" aria-label="Settings">⚙</a>');
}).observe(view, { childList: true });

function favView() {
  const w = KOTOBA.map((x, i) => [x, i]).filter(([x]) => isFav('w:' + wkey(x))), k = KANJI.map((x, i) => [x, i]).filter(([x]) => isFav('k:' + x.kanji));
  view.innerHTML = `<section class="page"><div class="head"><a class="circ" href="#/home" aria-label="Back">←</a><h2>Saved</h2></div>
    ${w.length ? '<a class="btn" style="display:flex;margin-bottom:6px" href="#/memo/play/__fav/jp">Practice saved words</a>' : ''}
    <h3 class="sub">Kotoba (${w.length})</h3><div class="list">${w.map(wordRow).join('') || '<div class="msg">Tap ☆ on a word to save it here.</div>'}</div>
    <h3 class="sub">Kanji (${k.length})</h3><div class="kgrid">${k.map(([x, i]) => `<a class="kitem" href="#/kanji/item/${i}"><div class="big">${esc(x.kanji)}</div><div class="m">${dash(x.arti)}</div></a>`).join('') || '<div class="msg" style="grid-column:1/-1">Tap ☆ on a kanji to save it here.</div>'}</div></section>`;
}
function settingsView() {
  const seg = (key, opts) => `<div class="seg" data-k="${key}">${opts.map(([v, l]) => `<button class="${cfg[key] === v ? 'on' : ''}" data-v="${v}">${l}</button>`).join('')}</div>`;
  view.innerHTML = `<section class="page"><div class="head"><a class="circ" href="#/home" aria-label="Back">←</a><h2>Settings</h2></div>
    <article class="detail set"><span class="lbl">LANGUAGE</span>${seg('lang', [['id', 'Bahasa Indonesia'], ['en', 'English']])}
    <span class="lbl">THEME</span>${seg('theme', [['light', 'Light'], ['dark', 'Dark']])}
    <span class="lbl">GLASS STYLE</span>${seg('glass', [['frosted', 'Frosted'], ['clear', 'Clear'], ['blur', 'Blur']])}
    <span class="lbl">PROGRESS</span><div class="rv">${KNOWN.size} learned · ${FAVS.size} saved · ${streak()} day streak</div>
    <button class="btn ghost" id="rp" style="margin-top:12px">Reset learned progress</button></article></section>`;
  view.querySelectorAll('.seg').forEach(g => g.onclick = e => {
    const b = e.target.closest('button'); if (!b) return;
    cfg[g.dataset.k] = b.dataset.v; applyCfg(); tr(document.body); g.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b));
  });
  document.getElementById('rp').onclick = () => { if (confirm(T('Reset all learned progress?'))) { KNOWN.clear(); saveSet('known', KNOWN); store.set('streak', { last: '', n: 0 }); settingsView(); } };
}

/* Grammar: each pelajaran in ALL_GRAMMAR_N4.json is one category */
function grammarList() {
  view.innerHTML = `<section class="page"><div class="head"><a class="circ" href="#/home" aria-label="Back">←</a><h2>Grammar</h2></div>
    <p class="count">${GRAMMAR.length} lessons</p><div class="list">${GRAMMAR.map((l, i) => `<a class="item" href="#/grammar/lesson/${i}"><div class="t">
    <div class="h">Pelajaran ${esc(val(l.nomor))}</div><div class="k" style="font-size:1.15rem">${esc(val(l.judul))}</div>
    <div class="m">${(l.poin || []).length} pola tata bahasa</div></div><span class="play-s">▶</span></a>`).join('') || '<div class="msg">Grammar data could not be loaded.</div>'}</div></section>`;
}
function grammarLesson(i) {
  const l = GRAMMAR[i];
  if (!l) return location.hash = '#/grammar/list';
  const ex = c => `<div class="gx"><b>${esc(val(c.no))}</b><div><div class="gj">${esc(val(c.jp))}</div><div class="gi">${esc(val(c.id))}</div></div></div>`;
  const part = p => `<article class="detail gp"><h3>${esc(val(p.judul))}</h3>
    ${(p.pola || []).map(x => `<div class="pola">${esc(x)}</div>`).join('')}${(p.catatan || []).map(x => `<p>${esc(x)}</p>`).join('')}
    ${(p.bagian || []).map(b => `${val(b.judul) ? `<h4>${esc(b.judul)}</h4>` : ''}${val(b.keterangan) ? `<p>${esc(b.keterangan)}</p>` : ''}${(b.contoh || []).map(ex).join('')}`).join('')}</article>`;
  view.innerHTML = `<section class="page"><div class="head"><a class="circ" href="#/grammar/list" aria-label="Back">←</a><h2>Pelajaran ${esc(val(l.nomor))}</h2></div>
    <p class="count">${esc(val(l.judul))}</p>${(l.poin || []).map(part).join('')}</section>`;
}

/* Memorize mode: guess the card, flip to reveal, then mark "Got it" or "Again" (per lesson / bab) */
const mState = { mode: 'jp' };   // 'jp' = Kotoba → Arti, 'id' = Arti → Kotoba
const MODES = { jp: ['Kotoba → Arti', 'See the Japanese word, guess the Indonesian meaning'], id: ['Arti → Kotoba', 'See the Indonesian meaning, guess the Japanese word'] };
// Step 1: choose the section (Kotoba → Arti or Arti → Kotoba). Step 2: choose a lesson / bab.
function memoPick(mode) {
  if (!MODES[mode]) {
    view.innerHTML = `<section class="page"><div class="head"><a class="circ" href="#/home" aria-label="Back">←</a><h2>Memorize</h2></div>
      <p class="count">Choose a section</p><div class="list">${Object.entries(MODES).map(([k, [t, d]]) => `<a class="item" href="#/memo/pick/${k}"><div class="t">
      <div class="k" style="font-size:1.25rem">${t}</div><div class="m">${d}</div></div><span class="play-s">▶</span></a>`).join('')}</div></section>`;
    return;
  }
  mState.mode = mode;
  const babs = [...new Set(KOTOBA.map(w => val(w.bab)).filter(Boolean))];
  const st = {};
  KOTOBA.forEach(w => { const b = val(w.bab), x = st[b] = st[b] || { n: 0, k: 0 }; x.n++; if (KNOWN.has(wkey(w))) x.k++; });
  const fv = KOTOBA.filter(w => isFav('w:' + wkey(w)));
  st.__all = { n: KOTOBA.length, k: KOTOBA.filter(w => KNOWN.has(wkey(w))).length }; st.__fav = { n: fv.length, k: fv.filter(w => KNOWN.has(wkey(w))).length };
  const row = (b, label) => { const s = st[b], p = Math.round(s.k / s.n * 100);
    return `<a class="item" href="#/memo/play/${encodeURIComponent(b)}/${mode}"><div class="t"><div class="k" style="font-size:1.05rem">${esc(label)}</div><div class="m">${s.n} words · ${p}% learned</div><div class="mbar"><i style="width:${p}%"></i></div></div><span class="play-s">▶</span></a>`; };
  view.innerHTML = `<section class="page"><div class="head"><a class="circ" href="#/memo/pick" aria-label="Back">←</a><h2>${MODES[mode][0]}</h2></div>
    <p class="count">Choose a lesson / bab to memorize</p>
    <div class="list">${row('__all', 'All lessons')}${fv.length ? row('__fav', '★ Saved words') : ''}${babs.map(b => row(b, b)).join('')}</div></section>`;
}

function memoPlay(bp, mode) {
  if (MODES[mode]) mState.mode = mode;
  const bab = decodeURIComponent(bp || '__all');
  const pool = KOTOBA.filter(w => bab === '__all' || (bab === '__fav' ? isFav('w:' + wkey(w)) : val(w.bab) === bab));
  if (!pool.length) return location.hash = '#/memo/pick';
  const title = bab === '__all' ? 'All lessons' : bab === '__fav' ? 'Saved words' : bab;
  let queue = [], total = 0, known = 0, missed = [], flipped = false, busy = false;
  const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const start = list => { queue = shuffle(list); total = queue.length; known = 0; missed = []; draw(); };
  const front = w => mState.mode === 'jp' ? `<div class="fq">${rb(w)}</div>` : `<div class="fq id">${dash(w.arti)}</div>`;

  function draw() {
    if (!queue.length) return finish();
    flipped = false; busy = false;
    const w = queue[0], n = total - queue.length;
    view.innerHTML = `<section class="page"><div class="head"><a class="circ" href="#/memo/pick/${mState.mode}" aria-label="Back">←</a><h2>${esc(title)}</h2><span class="cnt">${n} / ${total}</span></div>
      <div class="bar"><i style="width:${n / total * 100}%"></i></div>
      <button class="btn ghost swap" id="sw" aria-label="Swap direction">⇄ ${mState.mode === 'jp' ? 'Kotoba → Arti' : 'Arti → Kotoba'}</button>
      <div class="scene" id="scene"><div class="mcard" id="mc"><div class="flip" id="fl" role="button" tabindex="0" aria-label="Flip card">
        <div class="face">${front(w)}<span class="tap">${mState.mode === 'jp' ? 'Tap to reveal the meaning' : 'Tap to reveal the Japanese'}</span></div>
        <div class="face back"><div class="fq sm">${rb(w)}</div>${sayBtn(val(w.hiragana))}<div class="m">${dash(w.arti)}</div>${val(w.type) ? `<span class="badge">${esc(typeLabel(w.type))}</span>` : ''}${formsHtml(w)}</div></div></div></div>
      <p class="count" style="text-align:center">Reveal, then drag the slider (or swipe right) = known · ✗ or swipe left = again</p>
      <div class="act"><div class="slide dis" id="sl"><span class="knob" id="kn">✓</span><span class="st">Drag to mark as known</span><span class="chev">›››</span></div><button class="btn bad" id="no" disabled aria-label="Again">✗</button></div>
      <p class="count" style="text-align:center">✓ ${known} &nbsp; ✗ ${missed.length}</p></section>`;
    const scene = document.getElementById('scene'), card = document.getElementById('mc'), fl = document.getElementById('fl');
    const no = document.getElementById('no'), sl = document.getElementById('sl'), kn = document.getElementById('kn');
    // Swap direction on the current card: Kotoba → Arti <-> Arti → Kotoba
    document.getElementById('sw').onclick = () => { if (busy) return; mState.mode = mState.mode === 'jp' ? 'id' : 'jp'; draw(); };
    let x0 = null, dx = 0, moved = false;
    const toggle = () => { flipped = !flipped; fl.classList.toggle('on', flipped); no.disabled = !flipped; sl.classList.toggle('dis', !flipped); };
    const rate = good => {
      if (!flipped || busy) return;
      busy = true;
      card.style.transition = 'transform .22s ease, opacity .22s ease';
      card.style.transform = `translateX(${good ? 130 : -130}%) rotate(${good ? 14 : -14}deg)`; card.style.opacity = 0;
      setTimeout(() => { const k = wkey(queue[0]); if (good) { known++; KNOWN.add(k); } else { missed.push(queue[0]); KNOWN.delete(k); } saveSet('known', KNOWN); touchStreak(); queue.shift(); draw(); }, 220);
    };
    fl.onclick = () => { if (moved) { moved = false; return; } toggle(); };
    no.onclick = () => rate(false);
    // "drag to mark done" slider
    let sx = null;
    const maxX = () => sl.clientWidth - kn.offsetWidth - 8;
    kn.onpointerdown = e => { if (!flipped || busy) return; sx = e.clientX; kn.setPointerCapture(e.pointerId); kn.style.transition = 'none'; };
    kn.onpointermove = e => { if (sx !== null) kn.style.transform = `translateX(${Math.max(0, Math.min(maxX(), e.clientX - sx))}px)`; };
    kn.onpointerup = kn.onpointercancel = e => { if (sx === null) return; const d = e.clientX - sx; sx = null; kn.style.transition = ''; if (d > maxX() * .85) rate(true); else kn.style.transform = ''; };
    scene.addEventListener('touchstart', e => { x0 = e.touches[0].clientX; dx = 0; moved = false; }, { passive: true });
    scene.addEventListener('touchmove', e => {
      if (x0 === null || !flipped) return;
      dx = e.touches[0].clientX - x0;
      if (Math.abs(dx) > 10) { moved = true; card.style.transition = 'none'; card.style.transform = `translateX(${dx}px) rotate(${dx / 20}deg)`; card.classList.toggle('ok', dx > 0); card.classList.toggle('no', dx < 0); }
    }, { passive: true });
    scene.addEventListener('touchend', () => {
      if (x0 === null) return;
      x0 = null;
      if (flipped && Math.abs(dx) > 80) rate(dx > 0);
      else { card.style.transition = ''; card.style.transform = ''; card.classList.remove('ok', 'no'); }
    });
    deckKey = e => {
      if ((e.key === ' ' || e.key === 'Enter') && !/BUTTON|A/.test(e.target.tagName)) { e.preventDefault(); toggle(); }
      if (e.key === 'ArrowRight') rate(true);
      if (e.key === 'ArrowLeft') rate(false);
    };
  }

  function finish() {
    deckKey = null;
    const rows = missed.map(w => `<div class="ex"><b>${esc(kj(w) || val(w.hiragana))}</b><span>${esc(val(w.hiragana))}</span><span>${dash(w.arti)}</span></div>`).join('');
    view.innerHTML = `<section class="page"><div class="head"><a class="circ" href="#/memo/pick/${mState.mode}" aria-label="Back">←</a><h2>${esc(title)}</h2></div>
      <article class="detail"><div class="k w">${known} / ${total}</div><div class="m">${missed.length ? 'Keep practicing!' : 'Perfect! すごい！'}</div>
      ${missed.length ? `<span class="lbl">TO REVIEW (${missed.length})</span>${rows}` : ''}</article>
      <div class="ctrl">${missed.length ? '<button class="btn" id="rv">Review missed</button>' : ''}<button class="btn ghost" id="rs">Restart</button></div></section>`;
    const rv = document.getElementById('rv');
    if (rv) rv.onclick = () => start(missed);
    document.getElementById('rs').onclick = () => start(pool);
  }
  start(pool);
}

/* Flashcard deck: touch swipe, buttons, arrow keys, shuffle, reset */
function deckView(items, cardFn, backHref, title) {
  let order = items.map((_, i) => i), pos = 0, busy = false;
  view.innerHTML = `<section class="page"><div class="head"><a class="circ" href="${backHref}" aria-label="Back">←</a><h2>${title}</h2><span class="cnt" id="cnt"></span></div>
    <div class="bar"><i id="bar"></i></div><div class="stage" id="stage"></div>
    <div class="ctrl"><button class="btn" id="prev">← Previous</button><button class="btn" id="next">Next →</button>
    <button class="btn ghost" id="shuf">Shuffle</button><button class="btn ghost" id="rst">Reset</button></div></section>`;
  const stage = document.getElementById('stage');
  const show = dir => {
    stage.innerHTML = `<article class="fc ${dir < 0 ? 'l' : ''}">${cardFn(items[order[pos]])}</article>`;
    document.getElementById('cnt').textContent = `${pos + 1} / ${items.length}`;
    document.getElementById('bar').style.width = `${(pos + 1) / items.length * 100}%`;
    document.getElementById('prev').disabled = pos === 0;
    document.getElementById('next').disabled = pos === items.length - 1;
  };
  // busy lock prevents double-fires from skipping cards
  const go = d => {
    const n = pos + d;
    if (busy || n < 0 || n >= items.length) return show(0);
    busy = true; pos = n; show(d); setTimeout(() => busy = false, 280);
  };
  document.getElementById('prev').onclick = () => go(-1);
  document.getElementById('next').onclick = () => go(1);
  document.getElementById('shuf').onclick = () => { for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; } pos = 0; show(0); };
  document.getElementById('rst').onclick = () => { order = items.map((_, i) => i); pos = 0; show(0); };
  let x0 = null, y0 = 0, dx = 0;
  stage.addEventListener('touchstart', e => { x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; dx = 0; }, { passive: true });
  stage.addEventListener('touchmove', e => {
    if (x0 === null) return;
    dx = e.touches[0].clientX - x0;
    const c = stage.firstElementChild;
    if (c && Math.abs(dx) > Math.abs(e.touches[0].clientY - y0)) { c.style.animation = 'none'; c.style.transform = `translateX(${dx * .6}px)`; }
  }, { passive: true });
  stage.addEventListener('touchend', () => {
    if (x0 === null) return;
    x0 = null;
    if (Math.abs(dx) > 60) go(dx < 0 ? 1 : -1); else if (stage.firstElementChild) stage.firstElementChild.style.transform = '';
  });
  deckKey = e => { if (e.key === 'ArrowRight') go(1); if (e.key === 'ArrowLeft') go(-1); };
  show(0);
}
let deckKey = null;
addEventListener('keydown', e => { if (deckKey && !/INPUT|SELECT/.test(e.target.tagName)) deckKey(e); });

/* ---------- Router ---------- */
function route() {
  deckKey = null; clearInterval(homeTimer);
  const [, sec = 'home', a, b, c] = (location.hash || '#/home').split('/');
  document.querySelectorAll('#nav a').forEach(l => l.classList.toggle('on', l.dataset.r === sec));
  const soon = sec === 'quiz';
  if (loadError && !soon) return errorView();
  if (!KOTOBA.length && !soon) { view.innerHTML = '<section class="page"><div class="msg">Loading…</div></section>'; return; }
  if (sec === 'kotoba') {
    if (a === 'word') kotobaDetail(+b);
    else if (a === 'cards') deckView(KOTOBA, wordCard, '#/kotoba/list', 'Kotoba cards');
    else kotobaList(a === 'list' ? b : undefined);
  } else if (sec === 'kanji') a === 'item' ? kanjiDetail(+b) : kanjiList(a === 'list' ? b : undefined);
  else if (sec === 'cards') { const les = b ? KANJI.filter(k => String(k.lesson) === b) : KANJI; deckView(les.length ? les : KANJI, kanjiCard, '#/kanji/list', b ? `Lesson ${esc(b)}` : 'Kanji cards'); }
  else if (sec === 'grammar') a === 'lesson' ? grammarLesson(+b) : grammarList();
  else if (sec === 'memo') a === 'play' ? memoPlay(b, c) : memoPick(b);
  else if (sec === 'post') postView();
  else if (sec === 'fav') favView();
  else if (sec === 'settings') settingsView();
  else if (sec === 'search') searchView();
  else if (soon) soonView('Quiz');
  else homeView();
  scrollTo(0, 0);
}
addEventListener('hashchange', route);
// Splash (bannerlogo.png): shown for 5 seconds on every load (time spent loading data counts), then fades out
const splashStart = Date.now();
function hideSplash() {
  const el = document.getElementById('splash');
  if (!el) return;
  const wait = Math.max(0, 5000 - (Date.now() - splashStart));
  setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 500); }, wait);
}
load().then(hideSplash);

// Offline support (PWA): installable, works without network after the first visit
if ('serviceWorker' in navigator) addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
