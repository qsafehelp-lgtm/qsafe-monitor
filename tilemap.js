/* Q-Safe Monitor — 가벼운 지도 (OpenStreetMap 타일을 캔버스에 그림, 외부 라이브러리 없음)
 *  끌기 = 이동, 두 손가락 = 확대·축소, 휠·두 번 누르기 = 확대.  타일 주소만 바꾸면 다른 지도도 쓸 수 있다.
 *  OSM 타일 사용 조건 : 화면에 "© OpenStreetMap contributors" 표시, 대량 내려받기 금지.
 */
var QS = window.QS || (window.QS = {});

QS.TileMap = function (canvas, opts) {
  opts = opts || {};
  this.cv = canvas;
  this.url = opts.url || 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
  this.minZ = 3; this.maxZ = 19;
  this.lat = 37.4; this.lon = 127.1; this.z = 16;
  this.tiles = new Map();
  this.ok = 0; this.bad = 0;
  this.onDraw = opts.onDraw || function () {};
  this.onTap = opts.onTap || function () {};
  this.onUserMove = opts.onUserMove || function () {};
  this.dark = false;
  this.ptrs = new Map(); this.gesture = null; this.raf = null;
  this.w = 1; this.h = 1;
  this._bind();
};

(function (P) {
  var TS = 256;
  function clampLat(l) { return Math.max(-85.0511, Math.min(85.0511, l)); }

  P.world = function (lat, lon, z) {
    var s = TS * Math.pow(2, z), r = clampLat(lat) * Math.PI / 180;
    return { x: (lon + 180) / 360 * s, y: (1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2 * s };
  };
  P.unworld = function (x, y, z) {
    var s = TS * Math.pow(2, z), n = Math.PI - 2 * Math.PI * y / s;
    return { lat: 180 / Math.PI * Math.atan(Math.sinh(n)), lon: x / s * 360 - 180 };
  };
  P.project = function (lat, lon) {
    var c = this.world(this.lat, this.lon, this.z), p = this.world(lat, lon, this.z);
    return { x: p.x - c.x + this.w / 2, y: p.y - c.y + this.h / 2 };
  };
  P.unproject = function (sx, sy) {
    var c = this.world(this.lat, this.lon, this.z);
    return this.unworld(c.x + sx - this.w / 2, c.y + sy - this.h / 2, this.z);
  };
  P.metersPerPixel = function () { return 156543.03392 * Math.cos(this.lat * Math.PI / 180) / Math.pow(2, this.z); };

  P.setView = function (lat, lon, z) {
    this.lat = clampLat(lat); this.lon = lon;
    if (z != null) this.z = Math.max(this.minZ, Math.min(this.maxZ, z));
    this.requestRender();
  };
  P.fit = function (s, w, n, e, padX, padY) {
    var a = this.world(n, w, 0), b = this.world(s, e, 0);
    var dx = Math.max(1e-9, Math.abs(b.x - a.x)), dy = Math.max(1e-9, Math.abs(b.y - a.y));
    var z = Math.log2(Math.min((this.w - padX) / dx, (this.h - padY) / dy));
    this.setView((s + n) / 2, (w + e) / 2, Math.min(18, z));
  };
  P.panBy = function (dx, dy) {
    var c = this.world(this.lat, this.lon, this.z), p = this.unworld(c.x - dx, c.y - dy, this.z);
    this.lat = clampLat(p.lat); this.lon = p.lon; this.requestRender();
  };
  P.zoomAt = function (dz, sx, sy) {
    var g = this.unproject(sx, sy);
    var nz = Math.max(this.minZ, Math.min(this.maxZ, this.z + dz));
    var p = this.world(g.lat, g.lon, nz), c = this.unworld(p.x - (sx - this.w / 2), p.y - (sy - this.h / 2), nz);
    this.z = nz; this.lat = clampLat(c.lat); this.lon = c.lon; this.requestRender();
  };

  P._tile = function (z, x, y) {
    var key = z + '/' + x + '/' + y, t = this.tiles.get(key), self = this;
    if (t) { this.tiles.delete(key); this.tiles.set(key, t); return t; }
    t = { img: new Image(), state: 0 };
    t.img.decoding = 'async';
    t.img.onload = function () { t.state = 1; self.ok++; self.requestRender(); };
    t.img.onerror = function () { t.state = -1; self.bad++; self.requestRender(); };
    t.img.src = this.url.replace('{z}', z).replace('{x}', x).replace('{y}', y);
    this.tiles.set(key, t);
    if (this.tiles.size > 400) this.tiles.delete(this.tiles.keys().next().value);
    return t;
  };
  P._peek = function (z, x, y) { var t = this.tiles.get(z + '/' + x + '/' + y); return t && t.state === 1 ? t : null; };

  P.requestRender = function () {
    var self = this;
    if (this.raf) return;
    this.raf = requestAnimationFrame(function () { self.raf = null; self.render(); });
  };

  P.render = function () {
    var cv = this.cv, r = cv.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.w = Math.max(1, Math.round(r.width)); this.h = Math.max(1, Math.round(r.height));
    if (cv.width !== this.w * dpr || cv.height !== this.h * dpr) { cv.width = this.w * dpr; cv.height = this.h * dpr; }
    var c = cv.getContext('2d');
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.fillStyle = getComputedStyle(cv).getPropertyValue('--map-land').trim() || '#eef0ec';
    c.fillRect(0, 0, this.w, this.h);

    var tz = Math.max(0, Math.min(this.maxZ, Math.round(this.z))), sc = Math.pow(2, this.z - tz), n = Math.pow(2, tz);
    var ctr = this.world(this.lat, this.lon, tz);
    var i0 = Math.floor((ctr.x - this.w / 2 / sc) / TS), i1 = Math.floor((ctr.x + this.w / 2 / sc) / TS);
    var j0 = Math.max(0, Math.floor((ctr.y - this.h / 2 / sc) / TS)), j1 = Math.min(n - 1, Math.floor((ctr.y + this.h / 2 / sc) / TS));
    var size = TS * sc, shown = 0, failed = 0;
    var useFilter = this.dark && ('filter' in c);
    if (useFilter) c.filter = 'invert(1) hue-rotate(180deg) brightness(0.92) contrast(0.88) saturate(0.6)';
    for (var j = j0; j <= j1; j++) for (var i = i0; i <= i1; i++) {
      var x = ((i % n) + n) % n, sx = (i * TS - ctr.x) * sc + this.w / 2, sy = (j * TS - ctr.y) * sc + this.h / 2;
      var t = this._tile(tz, x, j);
      if (t.state === 1) { c.drawImage(t.img, sx, sy, size + 0.5, size + 0.5); shown++; continue; }
      if (t.state === -1) failed++;
      var pt = tz > 0 ? this._peek(tz - 1, x >> 1, j >> 1) : null;              // 위 단계 타일을 늘려서 임시로
      if (pt) c.drawImage(pt.img, (x & 1) * 128, (j & 1) * 128, 128, 128, sx, sy, size + 0.5, size + 0.5);
    }
    if (useFilter) c.filter = 'none';
    if (this.dark && !useFilter) { c.fillStyle = 'rgba(10,14,22,0.45)'; c.fillRect(0, 0, this.w, this.h); }
    this.offline = shown === 0 && failed > 0;
    var self = this;
    this.onDraw(c, function (lat, lon) { return self.project(lat, lon); }, this.w, this.h);
  };

  P._bind = function () {
    var cv = this.cv, self = this;
    var pos = function (e) { var r = cv.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
    cv.addEventListener('pointerdown', function (e) {
      try { cv.setPointerCapture(e.pointerId); } catch (er) {}
      self.ptrs.set(e.pointerId, pos(e));
      self._startGesture();
    });
    cv.addEventListener('pointermove', function (e) {
      if (!self.ptrs.has(e.pointerId)) return;
      self.ptrs.set(e.pointerId, pos(e));
      var g = self.gesture; if (!g) return;
      var pts = Array.from(self.ptrs.values());
      if (pts.length === 1 && g.n === 1) {
        var dx = pts[0].x - g.last.x, dy = pts[0].y - g.last.y;
        g.travel += Math.abs(dx) + Math.abs(dy);
        if (g.travel > 6) { if (!g.moved) { g.moved = true; self.onUserMove(); } self.panBy(dx, dy); }
        g.last = pts[0];
      } else if (pts.length >= 2) {
        var m = { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 }, d = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
        if (!g.moved) { g.moved = true; self.onUserMove(); }
        self.panBy(m.x - g.mid.x, m.y - g.mid.y);
        if (g.dist > 0 && d > 0) self.zoomAt(Math.log2(d / g.dist), m.x, m.y);
        g.mid = m; g.dist = d;
      }
    });
    var end = function (e) {
      var g = self.gesture, p = self.ptrs.get(e.pointerId);
      self.ptrs.delete(e.pointerId);
      if (g && g.n === 1 && !g.moved && p && e.type === 'pointerup') self.onTap(p.x, p.y);
      self._startGesture();
    };
    cv.addEventListener('pointerup', end);
    cv.addEventListener('pointercancel', end);
    cv.addEventListener('wheel', function (e) { e.preventDefault(); var p = pos(e); self.onUserMove(); self.zoomAt(-e.deltaY * 0.0025, p.x, p.y); }, { passive: false });
    cv.addEventListener('dblclick', function (e) { var p = pos(e); self.onUserMove(); self.zoomAt(1, p.x, p.y); });
  };
  P._startGesture = function () {
    var pts = Array.from(this.ptrs.values());
    if (!pts.length) { this.gesture = null; return; }
    var prevMoved = this.gesture && this.gesture.moved;
    this.gesture = pts.length === 1
      ? { n: 1, last: pts[0], travel: 0, moved: !!prevMoved }
      : { n: 2, mid: { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 }, dist: Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y), moved: true };
  };
})(QS.TileMap.prototype);
