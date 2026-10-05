'use strict';
/* Japanese N4 app: static SPA, hash routing, data loaded with fetch() */
const view = document.getElementById('view');
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
// Clean a value: never show null/undefined/empty; arrays are joined
const val = v => {
  if (v == null) return '';
  if (Array.isArray(v)) return v.map(val).filter(Boolean).join(' / ');
  const s = String(v).trim();
  return /^(null|undefined)$/i.test(s) ? '' : s;
};
const dash = v => esc(val(v) || '—');
const lines = v => (Array.isArray(v) ? v : [v]).map(val).filter(Boolean);
const lineHtml = v => lines(v).map(esc).join('<br>') || '—';

let KOTOBA = [], KANJI = [], loadError = false;
const kState = { q: '', bab: '' }, jState = { q: '' };

const POSTERS = {
  kotoba:  { t: 'KOTOBA',  jp: 'ことば', d: 'Japanese Vocabulary', go: '#/kotoba/list' },
  kanji:   { t: 'KANJI',   jp: '漢字',   d: 'Browse every Kanji',  go: '#/kanji/list' },
  cards:   { t: 'KANJI CARDS', jp: '漢字カード', d: 'Swipe through Kanji flashcards', go: '#/cards/play' },
  grammar: { t: 'GRAMMAR', jp: '文法',   d: 'Grammar Lessons', soon: 1 },
  quiz:    { t: 'QUIZ',    jp: 'クイズ', d: 'Test your Japanese', soon: 1 }
};

async function load() {
  try {
    const [a, b] = await Promise.all(['./ALL_KOSAKATA_N4.json', './ALL_KANJI_N4.json'].map(async u => {
      const r = await fetch(u);
      if (!r.ok) throw new Error(u);
      return r.json();
    }));
    // Files wrap their arrays in an object; accept bare arrays too
    KOTOBA = Array.isArray(a) ? a : a.kosakata;
    KANJI = Array.isArray(b) ? b : b.kanji;
    if (!Array.isArray(KOTOBA) || !Array.isArray(KANJI)) throw new Error('format');
  } catch (e) { loadError = true; }
  route();
}

/* ---------- Views ---------- */
function posterView(key) {
  const p = POSTERS[key];
  view.innerHTML = `<section class="page poster">
    <h1>${p.t}</h1><div class="jp">${p.jp}</div><p>${p.d}</p>
    ${p.soon
      ? `<span class="play" aria-disabled="true" aria-label="Coming soon">▶</span><span class="soon">COMING SOON</span>`
      : `<a class="play" href="${p.go}" aria-label="Play ${p.t}">▶</a><span class="hint">Tap play to start</span>`}
  </section>`;
}

function homeView() {
  const c = loadError ? '' : `${KOTOBA.length} kotoba · ${KANJI.length} kanji`;
  view.innerHTML = `<section class="page poster">
    <p>Summer language adventure</p><h1>Japanese N4</h1>
    <div class="jp">言葉と漢字を学ぼう</div><p>Learn Japanese vocabulary and Kanji</p>
    <a class="play" href="#/kotoba/list" aria-label="Start learning">▶</a><span class="hint">${esc(c)}</span>
    <div class="tiles">
      <a class="tile" href="#/kotoba"><b>言葉</b><strong>KOTOBA</strong><small>Vocabulary</small></a>
      <a class="tile" href="#/kanji"><b>漢字</b><strong>KANJI</strong><small>Readings &amp; words</small></a>
      <a class="tile" href="#/cards"><b>札</b><strong>KANJI CARDS</strong><small>Swipe to study</small></a>
      <a class="tile" href="#/grammar"><b>文法</b><strong>GRAMMAR</strong><small>Coming soon</small></a>
      <a class="tile" href="#/quiz"><b>クイズ</b><strong>QUIZ</strong><small>Coming soon</small></a>
    </div></section>`;
}

const errorView = () => view.innerHTML = `<section class="page"><div class="msg"><h2>Learning data could not be loaded.</h2><p>Check that ALL_KOSAKATA_N4.json and ALL_KANJI_N4.json sit next to index.html, and open the site over http(s), for example GitHub Pages.</p></div></section>`;

// Kotoba list: search by hiragana, kanji, meaning, bab; filter by bab
function kotobaList() {
  const babs = [...new Set(KOTOBA.map(w => val(w.bab)).filter(Boolean))];
  view.innerHTML = `<section class="page">
    <div class="head"><h2>Kotoba</h2><a class="btn" href="#/kotoba/cards">Flashcards</a></div>
    <div class="tools"><input id="q" type="search" placeholder="Search hiragana, kanji, meaning, bab" aria-label="Search vocabulary" value="${esc(kState.q)}">
    <select id="bab" aria-label="Filter by bab"><option value="">All bab</option>${babs.map(b => `<option ${b === kState.bab ? 'selected' : ''} value="${esc(b)}">${esc(b)}</option>`).join('')}</select></div>
    <p class="count" id="n"></p><div class="grid" id="list"></div></section>`;
  const draw = () => {
    const q = kState.q.trim().toLowerCase();
    const out = KOTOBA.map((w, i) => [w, i]).filter(([w]) =>
      (!kState.bab || val(w.bab) === kState.bab) &&
      (!q || [w.hiragana, w.kanji, w.arti, w.bab].some(x => val(x).toLowerCase().includes(q))));
    document.getElementById('n').textContent = `${out.length} of ${KOTOBA.length} words`;
    document.getElementById('list').innerHTML = out.map(([w, i]) => `<a class="item" href="#/kotoba/word/${i}">
      <div class="h">${esc(val(w.hiragana))}</div>${val(w.kanji) ? `<div class="k">${esc(val(w.kanji))}</div>` : ''}<div class="m">${dash(w.arti)}</div></a>`).join('')
      || '<div class="msg" style="grid-column:1/-1">No words match your search.</div>';
  };
  document.getElementById('q').oninput = e => { kState.q = e.target.value; draw(); };
  document.getElementById('bab').onchange = e => { kState.bab = e.target.value; draw(); };
  draw();
}

const wordCard = w => `<div class="h">${esc(val(w.hiragana))}</div>
  ${val(w.kanji) ? `<div class="k w">${esc(val(w.kanji))}</div>` : ''}<div class="m">${dash(w.arti)}</div>`;

function kotobaDetail(i) {
  const w = KOTOBA[i];
  if (!w) return location.hash = '#/kotoba/list';
  view.innerHTML = `<section class="page"><div class="head"><a class="btn ghost" href="#/kotoba/list">← Back</a></div>
    <article class="detail">${wordCard(w)}<span class="tag">${dash(w.bab)}</span></article></section>`;
}

function kanjiList() {
  view.innerHTML = `<section class="page">
    <div class="head"><h2>Kanji</h2><a class="btn" href="#/cards/play">Swipe cards</a></div>
    <div class="tools"><input id="q" type="search" placeholder="Search kanji, reading, meaning, example" aria-label="Search kanji" value="${esc(jState.q)}"></div>
    <p class="count" id="n"></p><div class="grid kgrid" id="list"></div></section>`;
  const draw = () => {
    const q = jState.q.trim().toLowerCase();
    const hay = k => [k.kanji, k.onyomi, val(k.kunyomi), k.arti, ...(k.kotoba || []).flatMap(o => [o.kata, o.bacaan, o.arti])].map(val).join(' ').toLowerCase();
    const out = KANJI.map((k, i) => [k, i]).filter(([k]) => !q || hay(k).includes(q));
    document.getElementById('n').textContent = `${out.length} of ${KANJI.length} kanji`;
    document.getElementById('list').innerHTML = out.map(([k, i]) => `<a class="item" href="#/kanji/item/${i}">
      <div class="big">${esc(val(k.kanji))}</div><div class="m">${dash(k.arti)}</div>
      <div class="rd"><b>ON</b> ${dash(k.onyomi)}<br><b>KUN</b> ${lineHtml(k.kunyomi)}</div></a>`).join('')
      || '<div class="msg" style="grid-column:1/-1">No kanji match your search.</div>';
  };
  document.getElementById('q').oninput = e => { jState.q = e.target.value; draw(); };
  draw();
}

const kanjiCard = k => `<div class="k">${esc(val(k.kanji))}</div><div class="m">${dash(k.arti)}</div>
  <span class="lbl">ONYOMI</span><div class="rv">${dash(k.onyomi)}</div>
  <span class="lbl">KUNYOMI</span><div class="rv">${lineHtml(k.kunyomi)}</div>`;

function kanjiDetail(i) {
  const k = KANJI[i];
  if (!k) return location.hash = '#/kanji/list';
  const ex = (k.kotoba || []).map(o => `<div class="ex"><b>${dash(o.kata)}</b><span>${dash(o.bacaan)}</span><span>${dash(o.arti)}</span></div>`).join('');
  view.innerHTML = `<section class="page"><div class="head"><a class="btn ghost" href="#/kanji/list">← Back</a></div>
    <article class="detail">${kanjiCard(k)}
    <span class="lbl">EXAMPLE KOTOBA</span>${ex || '<div class="rv">—</div>'}
    ${val(k.halaman) ? `<span class="tag">Source page: ${esc(val(k.halaman))}</span>` : ''}</article></section>`;
}

/* Flashcard deck with touch swipe, buttons, keyboard, shuffle and reset */
function deckView(items, cardFn, backHref, title) {
  let order = items.map((_, i) => i), pos = 0, busy = false;
  view.innerHTML = `<section class="page"><div class="head"><a class="btn ghost" href="${backHref}">← Back</a>
    <h2>${title}</h2><span class="cnt" id="cnt"></span></div>
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
  const shuffle = () => { for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; } pos = 0; show(0); };
  document.getElementById('prev').onclick = () => go(-1);
  document.getElementById('next').onclick = () => go(1);
  document.getElementById('shuf').onclick = shuffle;
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
  const [, sec = 'home', a, b] = (location.hash || '#/home').split('/');
  document.querySelectorAll('#nav a').forEach(l => l.classList.toggle('on', l.dataset.r === sec));
  if (loadError && !POSTERS[sec]?.soon) return errorView();
  if (!KOTOBA.length && !loadError && sec !== 'grammar' && sec !== 'quiz') { view.innerHTML = '<section class="page"><div class="msg">Loading…</div></section>'; return; }
  if (sec === 'kotoba') {
    if (a === 'list') kotobaList();
    else if (a === 'word') kotobaDetail(+b);
    else if (a === 'cards') deckView(KOTOBA, wordCard, '#/kotoba/list', 'Kotoba cards');
    else posterView('kotoba');
  } else if (sec === 'kanji') {
    if (a === 'list') kanjiList();
    else if (a === 'item') kanjiDetail(+b);
    else posterView('kanji');
  } else if (sec === 'cards') {
    if (a === 'play') deckView(KANJI, kanjiCard, '#/cards', 'Kanji cards');
    else posterView('cards');
  } else if (sec === 'grammar' || sec === 'quiz') posterView(sec);
  else homeView();
  scrollTo(0, 0);
}
addEventListener('hashchange', route);
load();
