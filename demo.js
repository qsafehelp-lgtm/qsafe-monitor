/* Q-Safe Monitor — 체험 모드 : 가상의 QSF104B 가 실제 기기와 같은 줄을 20바이트 조각으로 보낸다.
 *  공원 둘레를 걷는 경로, 공원 동쪽 길에 선량이 조금 높은 곳이 있다. 위치는 가상 좌표.
 */
var QS = window.QS || (window.QS = {});

QS.Demo = (function () {
  var ORIGIN = { lat: 37.4000, lon: 127.1000 };
  var M_LAT = 111320, M_LON = 111320 * Math.cos(ORIGIN.lat * Math.PI / 180);
  var PATH = [[0, 0], [180, 0], [180, 130], [320, 130], [320, 260], [100, 260], [100, 130], [0, 130], [0, 0]];
  var SEG = [], LEN = 0;
  for (var i = 1; i < PATH.length; i++) {
    var a = PATH[i - 1], b = PATH[i], L = Math.hypot(b[0] - a[0], b[1] - a[1]);
    SEG.push({ a: a, b: b, L: L, s0: LEN }); LEN += L;
  }
  function pathAt(s) {
    s = ((s % LEN) + LEN) % LEN;
    for (var k = 0; k < SEG.length; k++) { var g = SEG[k]; if (s <= g.s0 + g.L) { var u = (s - g.s0) / g.L; return [g.a[0] + (g.b[0] - g.a[0]) * u, g.a[1] + (g.b[1] - g.a[1]) * u]; } }
    return PATH[0];
  }
  var seed = 20261029;
  function rnd() { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }
  function gauss() { var u = 0, v = 0; while (u === 0) u = rnd(); while (v === 0) v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
  function poisson(l) { if (l > 30) return Math.max(0, Math.round(l + Math.sqrt(l) * gauss())); var Lm = Math.exp(-l), k = 0, p = 1; do { k++; p *= rnd(); } while (p > Lm); return k - 1; }
  var HOT = { x: 320, y: 195, a: 0.55, s: 16 }, SENS = 2000;       // CPM per µSv/h (QSF104B)
  var INFO = '$QSFI,QSF104B,26100123,FW V7.9,0.00\n';

  var D = {
    timer: null, s: 0, counts: [], dose: 15.320, mv: 3992, scen: 'normal', avgMode: 0, lostUntil: 0, asm: null, last: '',
    origin: ORIGIN,
    trueRate: function (x, y) {
      var d2 = (x - HOT.x) * (x - HOT.x) + (y - HOT.y) * (y - HOT.y);
      var r = 0.11 + HOT.a * Math.exp(-d2 / (2 * HOT.s * HOT.s));
      if (this.scen === 'caution') r += 0.48;
      if (this.scen === 'danger') r += 1.25;
      return r;
    },
    start: function (onLine) {
      this.asm = new QS.LineAssembler(onLine);
      this.s = 0; this.counts = []; this.scen = 'normal'; this.avgMode = 0; this.lostUntil = 0;
      this.send(INFO);
      var self = this;
      clearInterval(this.timer);
      this.timer = setInterval(function () { self.tick(); }, 2000);
    },
    stop: function () { clearInterval(this.timer); this.timer = null; },
    running: function () { return !!this.timer; },
    send: function (str) {
      this.last = str.trim();
      for (var i = 0; i < str.length; i += 20) {
        var part = str.slice(i, i + 20), b = new Uint8Array(part.length);
        for (var j = 0; j < part.length; j++) b[j] = part.charCodeAt(j);
        this.asm.push(b);
      }
    },
    tick: function () {
      var tm = QS.now();
      if (tm < this.lostUntil) { this.s += 2.6; return; }
      for (var k = 1; k <= 2; k++) {
        this.s += 1.3 + 0.15 * gauss();
        var p0 = pathAt(this.s), x = p0[0] + gauss() * 1.6, y = p0[1] + gauss() * 1.6;
        QS.Geo.push({ t: tm - (2 - k) * 1000, lat: ORIGIN.lat + y / M_LAT, lon: ORIGIN.lon + x / M_LON, acc: 4 + Math.abs(gauss()) * 2.5 });
      }
      var p = pathAt(this.s);
      this.counts.push(poisson(this.trueRate(p[0], p[1]) * SENS / 30));
      if (this.counts.length > 120) this.counts.shift();
      var n = this.avgMode === 1 ? 10 : this.avgMode === 2 ? 60 : 2;
      var w = this.counts.slice(-n), sum = w.reduce(function (s, c) { return s + c; }, 0), mean = sum / w.length;
      var rate = mean * 30 / SENS, cpm = Math.round(mean * 30);
      var err = sum > 0 ? Math.max(1, Math.min(99, Math.round(100 / Math.sqrt(sum)))) : 0;
      this.dose += rate * 2 / 3600;
      if (rnd() < 0.02) this.mv -= 1;
      var temp = 25.3 + 0.2 * Math.sin(tm / 90000);
      var r2 = this.counts[this.counts.length - 1] * 30 / SENS;
      this.send('$QSF,' + rate.toFixed(3) + ',' + cpm + ',' + err + ',0,' + this.dose.toFixed(3) + ',' + (this.mv > 3800 ? 4 : 3) + ',' + temp.toFixed(1) + ',' + this.avgMode + ',' + this.mv + ',' + r2.toFixed(3) + '\n');
      if (Math.floor(tm / 60000) !== Math.floor((tm - 2000) / 60000)) this.send(INFO);
    }
  };
  return D;
})();
