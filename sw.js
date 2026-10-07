/* Network-first service worker: always fresh when online, works offline after the first visit */
const C = 'n4-v2', SHELL = ['./', './index.html', './style.css', './script.js', './logo-long.png', './logo-icon.png', './bannerlogo.png', './ALL_KOSAKATA_N4_FORMS.json', './kanji_lessonfileN4.json', './kotoba_lesson_26-35.json', './ALL_GRAMMAR_N4.json'];
self.addEventListener('install', e => e.waitUntil(caches.open(C).then(c => Promise.all(SHELL.map(u => c.add(u).catch(() => {})))).then(() => self.skipWaiting())));
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(k => Promise.all(k.filter(x => x !== C).map(x => caches.delete(x)))).then(() => self.clients.claim())));
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(fetch(e.request).then(r => { const cp = r.clone(); caches.open(C).then(c => c.put(e.request, cp)); return r; }).catch(() => caches.match(e.request, { ignoreSearch: true })));
});
