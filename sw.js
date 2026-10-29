/* Q-Safe Monitor — 서비스 워커 : 앱 파일을 저장해 두어 인터넷이 없어도 열리게 함.
 *  파일을 고쳐 올릴 때는 아래 VERSION 을 올릴 것 (그래야 휴대폰이 새 파일을 받음).
 *  지도 타일(OpenStreetMap)은 여기서 저장하지 않고 브라우저 캐시에 맡긴다 (OSM 사용 조건).
 */
var VERSION = 'qsm-0.1.0f';
var FILES = [
  './', 'index.html', 'manifest.webmanifest', 'app.css',
  'i18n.js', 'protocol.js', 'store.js', 'ble.js', 'geo.js', 'demo.js', 'sound.js',
  'chart.js', 'tilemap.js', 'export.js', 'app.js',
  'icon-192.png', 'icon-512.png', 'icon-maskable-512.png', 'apple-touch-icon.png'
];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(VERSION).then(function (c) { return c.addAll(FILES); }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== VERSION; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

/* 같은 주소의 파일 : 저장본을 먼저 보여 주고, 뒤에서 새 파일로 바꿔 둠 */
self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  e.respondWith(caches.open(VERSION).then(function (c) {
    return c.match(req, { ignoreSearch: true }).then(function (hit) {
      var net = fetch(req).then(function (res) { if (res && res.ok) c.put(req, res.clone()); return res; }).catch(function () { return hit; });
      return hit || net;
    });
  }));
});
