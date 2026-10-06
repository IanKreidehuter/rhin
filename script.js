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
const kanjiMatch = (k, q) => [k.kanji, k.arti, k.cat, 'lesson ' + k.lesson, ...k.on, ...k.kun, ...k.ex.flatMap(e => [e.w, e.r, e.m])].join(' ').toLowerCase().includes(q);

const POSTERS = {
  kotoba:  { t: 'Kotoba',  jp: 'ことば', d: 'Japanese Vocabulary', go: '#/kotoba/list', n: () => `${KOTOBA.length} words | N4` },
  kanji:   { t: 'Kanji',   jp: '漢字',   d: 'Readings and example words', go: '#/kanji/list', n: () => `${KANJI.length} kanji | ${LESSONS.length} lessons` },
  cards:   { t: 'Kanji Cards', jp: '漢字カード', d: 'Swipe through every Kanji', go: '#/cards/play', n: () => `${KANJI.length} cards | Swipe` },
  memo:    { t: 'Guess Cards', jp: '暗記カード', d: 'Flip, guess and memorize by lesson', go: '#/memo/pick', n: () => `${KOTOBA.length} words | by lesson` },
  grammar: { t: 'Grammar', jp: '文法',   d: 'Grammar Lessons', go: '#/grammar/list', n: () => `${GRAMMAR.length} lessons | N4` },
  quiz:    { t: 'Quiz',    jp: 'クイズ', d: 'Test your Japanese', soon: 1, n: () => 'N4' }
};

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
  try { const g = await (await fetch('./ALL_GRAMMAR_N4.json')).json(); GRAMMAR = g.pelajaran || []; } catch (e) { GRAMMAR = []; }
  route();
}

/* ---------- Views ---------- */
// Poster screen: shown only when a lesson section starts
function posterView(key) {
  const p = POSTERS[key], meta = loadError ? '' : p.n();
  view.innerHTML = `<section class="poster"><a class="back" href="#/home" aria-label="Back to home">←</a>
    <h1>${p.t}</h1><div class="jp">${p.jp}</div><div class="meta">${esc(meta)}</div><div class="desc">${p.d}</div>
    ${p.soon
      ? `<span class="play" aria-disabled="true" aria-label="Coming soon">▶</span><span class="soon">COMING SOON</span>`
      : `<a class="play" href="${p.go}" aria-label="Play ${esc(p.t)}">▶</a><a class="more" href="${p.go}">Show More ⌄</a>`}
  </section>`;
}

const GRADS = [['#1ea7ff', '#0a3f9c'], ['#19d3c5', '#0a8fb5'], ['#f6b96b', '#e8825a'], ['#5aa8ff', '#6a5cff']];
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
  view.innerHTML = `<section class="page">
    <header class="top"><a class="av" href="#/home" aria-label="Home">言</a><span class="logo">Japanese N4</span><a class="rnd" href="#/cards" aria-label="Kanji cards">札</a></header>
    <a class="banner" href="#/kotoba"><div><small>言葉と漢字を学ぼう</small><h1>Japanese N4</h1><p>${KOTOBA.length} kotoba · ${KANJI.length} kanji</p></div><span class="mini">▶</span></a>
    <div class="row"><h3>Lessons</h3><a href="#/kotoba/list">See all</a></div>
    <div class="hs">
      <a class="chan" href="#/kotoba"><b>言葉</b>Kotoba</a><a class="chan" href="#/kanji"><b>漢字</b>Kanji</a>
      <a class="chan" href="#/cards"><b>札</b>Cards</a><a class="chan" href="#/memo/pick/jp"><b>暗記</b>Kotoba→Arti</a><a class="chan" href="#/memo/pick/id"><b>逆</b>Arti→Kotoba</a><a class="chan" href="#/grammar"><b>文法</b>Grammar</a><a class="chan off" href="#/quiz"><b>問</b>Quiz</a></div>
    <div class="row"><h3>Kotoba by lesson / bab</h3><a href="#/kotoba/list">See all</a></div><div class="hs">${thumbs}</div>
    <div class="row"><h3>Kanji by lesson</h3><a href="#/kanji/list">See all</a></div><div class="hs">${kcs}</div></section>`;
}

const errorView = () => view.innerHTML = `<section class="page"><div class="msg"><h2>Learning data could not be loaded.</h2><p style="margin-top:8px">Make sure ALL_KOSAKATA_N4_FORMS.json and kanji_lessonfileN4.json sit next to index.html, and open the site over http(s), for example GitHub Pages.</p></div></section>`;

const wordMatch = (w, q) => [w.hiragana, w.kanji, w.arti, w.bab, w.type, w.dictionary_form, w.masu_form, w.masu_form_hiragana].some(x => val(x).toLowerCase().includes(q));
const wordRow = ([w, i]) => `<a class="item" href="#/kotoba/word/${i}"><div class="t">
  <div class="h">${esc(val(w.hiragana))}</div>${kj(w) ? `<div class="k">${esc(kj(w))}</div>` : ''}
  <div class="m">${dash(w.arti)}</div>${val(w.dictionary_form) ? `<div class="df">Dictionary form: <b>${esc(val(w.dictionary_form))}</b></div>` : ''}${val(w.type) ? `<span class="badge">${esc(typeLabel(w.type))}</span>` : ''}</div><span class="play-s">▶</span></a>`;

// Kotoba list: search + bab chips + type chips (all built from the JSON)
function kotobaList(babParam) {
  if (babParam !== undefined) kState.bab = decodeURIComponent(babParam);
  const babs = [...new Set(KOTOBA.map(w => val(w.bab)).filter(Boolean))];
  const types = [...new Set(KOTOBA.map(w => val(w.type)).filter(Boolean))];
  view.innerHTML = `<section class="page">
    <div class="head"><a class="circ" href="#/kotoba" aria-label="Back">←</a><h2>Kotoba</h2><a class="circ" href="#/kotoba/cards" aria-label="Flashcards">札</a><a class="circ" id="gl" href="#/memo/pick" aria-label="Guess cards">暗</a></div>
    <input class="search" id="q" type="search" placeholder="Search hiragana, kanji, meaning, bab" aria-label="Search vocabulary" value="${esc(kState.q)}">
    <div class="chips" id="babs"></div><div class="chips" id="types"></div>
    <p class="count" id="n"></p><div id="list"></div></section>`;
  const chips = (id, all, items, key) => {
    const el = document.getElementById(id);
    el.innerHTML = [''].concat(items).map(v => `<button class="chip ${kState[key] === v ? 'on' : ''}" data-v="${esc(v)}">${esc(v ? (key === 'type' ? typeLabel(v) : v) : all)}</button>`).join('');
    el.onclick = e => { const b = e.target.closest('button'); if (!b) return; kState[key] = b.dataset.v; chips(id, all, items, key); draw(); };
  };
  const draw = () => {
    const q = kState.q.trim().toLowerCase();
    const out = KOTOBA.map((w, i) => [w, i]).filter(([w]) => (!kState.bab || val(w.bab) === kState.bab) && (!kState.type || val(w.type) === kState.type) && (!q || wordMatch(w, q)));
    document.getElementById('n').textContent = `${out.length} of ${KOTOBA.length} words`;
    // Group the results by lesson (bab), keeping the JSON order
    document.getElementById('list').innerHTML = babs.map(b => {
      const g = out.filter(([w]) => val(w.bab) === b);
      return g.length ? `<h3 class="grp">${esc(b)}<span>${g.length}</span></h3><div class="list">${g.map(wordRow).join('')}</div>` : '';
    }).join('') || '<div class="msg">No words match your search.</div>';
  };
  chips('babs', 'All bab', babs, 'bab'); chips('types', 'All types', types, 'type');
  document.getElementById('q').oninput = e => { kState.q = e.target.value; draw(); };
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
  view.innerHTML = `<section class="page"><div class="head"><a class="circ" href="#/kotoba/list" aria-label="Back">←</a><h2>Kotoba</h2></div>
    <article class="detail">${wordCard(w)}<span class="lbl">BAB</span><div class="rv">${dash(w.bab)}</div></article></section>`;
}

function kanjiList(lp) {
  if (lp !== undefined) jState.lesson = lp;
  view.innerHTML = `<section class="page">
    <div class="head"><a class="circ" href="#/kanji" aria-label="Back">←</a><h2>Kanji</h2><a class="circ" id="cl" href="#/cards/play" aria-label="Swipe cards">札</a></div>
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
  document.getElementById('q').oninput = e => { jState.q = e.target.value; draw(); };
  chips(); draw();
}

const kanjiCard = k => `<span class="badge">Lesson ${esc(k.lesson)} · ${esc(k.cat)}</span><div class="k">${esc(k.kanji)}</div><div class="m">${dash(k.arti)}</div>
  <span class="lbl">ONYOMI</span><div class="rv">${dash(k.on)}</div>
  <span class="lbl">KUNYOMI</span><div class="rv">${lineHtml(k.kun)}</div>`;

function kanjiDetail(i) {
  const k = KANJI[i];
  if (!k) return location.hash = '#/kanji/list';
  const ex = k.ex.map(o => `<div class="ex"><b>${dash(o.w)}</b>${o.r ? `<span>${esc(o.r)}</span>` : ''}<span>${dash(o.m)}</span></div>`).join('');
  view.innerHTML = `<section class="page"><div class="head"><a class="circ" href="#/kanji/list" aria-label="Back">←</a><h2>Kanji</h2></div>
    <article class="detail">${kanjiCard(k)}<span class="lbl">EXAMPLES</span>${ex || '<div class="rv">—</div>'}</article></section>`;
}

// Search tab: one box for kotoba and kanji
function searchView() {
  view.innerHTML = `<section class="page"><div class="head"><h2>Search</h2></div>
    <input class="search" id="q" type="search" placeholder="Kotoba or Kanji" aria-label="Search everything" autofocus><div id="res"></div></section>`;
  const q$ = document.getElementById('q'), res = document.getElementById('res');
  q$.oninput = () => {
    const q = q$.value.trim().toLowerCase();
    if (!q) return res.innerHTML = '';
    const w = KOTOBA.map((x, i) => [x, i]).filter(([x]) => wordMatch(x, q)), k = KANJI.map((x, i) => [x, i]).filter(([x]) => kanjiMatch(x, q));
    res.innerHTML = `<h3 class="sub">Kotoba (${w.length})</h3><div class="list">${w.slice(0, 30).map(wordRow).join('') || '<div class="msg">No kotoba found.</div>'}</div>
      <h3 class="sub">Kanji (${k.length})</h3><div class="kgrid">${k.slice(0, 30).map(([x, i]) => `<a class="kitem" href="#/kanji/item/${i}"><div class="big">${esc(x.kanji)}</div><div class="m">${dash(x.arti)}</div></a>`).join('') || '<div class="msg" style="grid-column:1/-1">No kanji found.</div>'}</div>`;
  };
}


/* Grammar: each pelajaran in ALL_GRAMMAR_N4.json is one category */
function grammarList() {
  view.innerHTML = `<section class="page"><div class="head"><a class="circ" href="#/grammar" aria-label="Back">←</a><h2>Grammar</h2></div>
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
    view.innerHTML = `<section class="page"><div class="head"><a class="circ" href="#/memo" aria-label="Back">←</a><h2>Memorize</h2></div>
      <p class="count">Choose a section</p><div class="list">${Object.entries(MODES).map(([k, [t, d]]) => `<a class="item" href="#/memo/pick/${k}"><div class="t">
      <div class="k" style="font-size:1.25rem">${t}</div><div class="m">${d}</div></div><span class="play-s">▶</span></a>`).join('')}</div></section>`;
    return;
  }
  mState.mode = mode;
  const babs = [...new Set(KOTOBA.map(w => val(w.bab)).filter(Boolean))];
  const row = (b, label) => { const n = KOTOBA.filter(w => b === '__all' || val(w.bab) === b).length;
    return `<a class="item" href="#/memo/play/${encodeURIComponent(b)}/${mode}"><div class="t"><div class="k" style="font-size:1.05rem">${esc(label)}</div><div class="m">${n} words</div></div><span class="play-s">▶</span></a>`; };
  view.innerHTML = `<section class="page"><div class="head"><a class="circ" href="#/memo/pick" aria-label="Back">←</a><h2>${MODES[mode][0]}</h2></div>
    <p class="count">Choose a lesson / bab to memorize</p>
    <div class="list">${row('__all', 'All lessons')}${babs.map(b => row(b, b)).join('')}</div></section>`;
}

function memoPlay(bp, mode) {
  if (MODES[mode]) mState.mode = mode;
  const bab = decodeURIComponent(bp || '__all');
  const pool = KOTOBA.filter(w => bab === '__all' || val(w.bab) === bab);
  if (!pool.length) return location.hash = '#/memo/pick';
  const title = bab === '__all' ? 'All lessons' : bab;
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
      <button class="btn ghost swap" id="sw" aria-label="Swap direction">⇄ ${mState.mode === 'jp' ? 'Kotoba → Arti' : 'Arti → Kotoba'} (tap to swap)</button>
      <div class="scene" id="scene"><div class="mcard" id="mc"><div class="flip" id="fl" role="button" tabindex="0" aria-label="Flip card">
        <div class="face">${front(w)}<span class="tap">${mState.mode === 'jp' ? 'Tap to reveal the meaning' : 'Tap to reveal the Japanese'}</span></div>
        <div class="face back"><div class="fq sm">${rb(w)}</div><div class="m">${dash(w.arti)}</div>${val(w.type) ? `<span class="badge">${esc(typeLabel(w.type))}</span>` : ''}${formsHtml(w)}</div></div></div></div>
      <p class="count" style="text-align:center">Swipe right = got it · swipe left = again</p>
      <div class="ctrl"><button class="btn bad" id="no" disabled>✗ Again</button><button class="btn good" id="ok" disabled>✓ Got it</button></div>
      <p class="count" style="text-align:center">✓ ${known} &nbsp; ✗ ${missed.length}</p></section>`;
    const scene = document.getElementById('scene'), card = document.getElementById('mc'), fl = document.getElementById('fl');
    const ok = document.getElementById('ok'), no = document.getElementById('no');
    // Swap direction on the current card: Kotoba → Arti <-> Arti → Kotoba
    document.getElementById('sw').onclick = () => { if (busy) return; mState.mode = mState.mode === 'jp' ? 'id' : 'jp'; draw(); };
    let x0 = null, dx = 0, moved = false;
    const toggle = () => { flipped = !flipped; fl.classList.toggle('on', flipped); ok.disabled = no.disabled = !flipped; };
    const rate = good => {
      if (!flipped || busy) return;
      busy = true;
      card.style.transition = 'transform .22s ease, opacity .22s ease';
      card.style.transform = `translateX(${good ? 130 : -130}%) rotate(${good ? 14 : -14}deg)`; card.style.opacity = 0;
      setTimeout(() => { if (good) known++; else missed.push(queue[0]); queue.shift(); draw(); }, 220);
    };
    fl.onclick = () => { if (moved) { moved = false; return; } toggle(); };
    ok.onclick = () => rate(true); no.onclick = () => rate(false);
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
  deckKey = null;
  const [, sec = 'home', a, b, c] = (location.hash || '#/home').split('/');
  document.querySelectorAll('#nav a').forEach(l => l.classList.toggle('on', l.dataset.r === sec));
  const poster = POSTERS[sec] && !a;           // poster only at the start of a lesson section
  document.body.classList.toggle('poster-mode', !!poster);
  if (loadError && !(POSTERS[sec] && POSTERS[sec].soon)) return errorView();
  if (!KOTOBA.length && !(POSTERS[sec] && POSTERS[sec].soon)) { view.innerHTML = '<section class="page"><div class="msg">Loading…</div></section>'; return; }
  if (poster) posterView(sec);
  else if (sec === 'kotoba') {
    if (a === 'list') kotobaList(b);
    else if (a === 'word') kotobaDetail(+b);
    else deckView(KOTOBA, wordCard, '#/kotoba/list', 'Kotoba cards');
  } else if (sec === 'kanji') a === 'list' ? kanjiList(b) : kanjiDetail(+b);
  else if (sec === 'cards') { const les = b ? KANJI.filter(k => String(k.lesson) === b) : KANJI; deckView(les.length ? les : KANJI, kanjiCard, '#/kanji/list', b ? `Lesson ${esc(b)}` : 'Kanji cards'); }
  else if (sec === 'grammar') a === 'lesson' ? grammarLesson(+b) : grammarList();
  else if (sec === 'memo') a === 'play' ? memoPlay(b, c) : memoPick(b);
  else if (sec === 'search') searchView();
  else homeView();
  scrollTo(0, 0);
}
addEventListener('hashchange', route);
load();
