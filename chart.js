/* Q-Safe Monitor — 선량률 그래프 (캔버스) */
var QS = window.QS || (window.QS = {});

QS.css = function (n) { return getComputedStyle(document.documentElement).getPropertyValue(n).trim(); };
QS.pad = function (n) { return String(n).padStart(2, '0'); };
QS.hm = function (ms) { var d = new Date(ms); return QS.pad(d.getHours()) + ':' + QS.pad(d.getMinutes()); };
QS.hms = function (ms) { var d = new Date(ms); return QS.hm(ms) + ':' + QS.pad(d.getSeconds()); };
QS.ymd = function (ms) { var d = new Date(ms); return d.getFullYear() + '-' + QS.pad(d.getMonth() + 1) + '-' + QS.pad(d.getDate()); };

QS.canvasCtx = function (cv) {
  var r = cv.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 2);
  var w = Math.max(1, Math.round(r.width)), h = Math.max(1, Math.round(r.height));
  if (cv.width !== w * dpr || cv.height !== h * dpr) { cv.width = w * dpr; cv.height = h * dpr; }
  var c = cv.getContext('2d'); c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, w, h);
  return { c: c, w: w, h: h };
};

QS.drawSpark = function (cv, rs, tm, caution) {
  var o = QS.canvasCtx(cv), c = o.c, w = o.w, h = o.h;
  if (rs.length < 2) return null;
  var vmax = Math.max.apply(null, rs.map(function (x) { return x.rate; })), mx = Math.max(0.2, vmax) * 1.2;
  var X = function (tt) { return (tt - (tm - 120000)) / 120000 * (w - 6) + 2; }, Y = function (v) { return h - 4 - v / mx * (h - 10); };
  c.strokeStyle = QS.css('--line'); c.lineWidth = 1; c.beginPath(); c.moveTo(0, h - 3.5); c.lineTo(w, h - 3.5); c.stroke();
  if (caution < mx) { c.setLineDash([4, 4]); c.strokeStyle = QS.css('--caution'); c.beginPath(); c.moveTo(0, Y(caution)); c.lineTo(w, Y(caution)); c.stroke(); c.setLineDash([]); }
  var acc = QS.css('--accent');
  var path = function () { c.beginPath(); rs.forEach(function (x, i) { if (i) c.lineTo(X(x.t), Y(x.rate)); else c.moveTo(X(x.t), Y(x.rate)); }); };
  path(); c.lineTo(X(rs[rs.length - 1].t), h - 4); c.lineTo(X(rs[0].t), h - 4); c.closePath();
  c.globalAlpha = 0.12; c.fillStyle = acc; c.fill(); c.globalAlpha = 1;
  path(); c.strokeStyle = acc; c.lineWidth = 1.6; c.stroke();
  var e = rs[rs.length - 1]; c.fillStyle = acc; c.beginPath(); c.arc(X(e.t), Y(e.rate), 3.2, 0, 7); c.fill();
  return vmax;
};

QS.niceStep = function (span, n) { var raw = span / n, p = Math.pow(10, Math.floor(Math.log10(raw))), m = raw / p; return (m < 1.5 ? 1 : m < 3 ? 2 : m < 7 ? 5 : 10) * p; };

/* rs : 측정값(시간순), t0..t1 : 가로축 범위, events : 알람 기록, lv : {caution, danger} */
QS.drawChart = function (cv, rs, t0, t1, events, lv) {
  var o = QS.canvasCtx(cv), c = o.c, w = o.w, h = o.h;
  if (rs.length < 2) return;
  var L = 44, R = 10, T = 16, B = 24;
  if (t1 - t0 < 10000) t0 = t1 - 10000;
  var vmax = Math.max.apply(null, rs.map(function (x) { return x.rate; }));
  var span = Math.max(vmax * 1.25, 0.2), step = QS.niceStep(span, 4), top = Math.ceil(span / step) * step;
  var X = function (tt) { return L + (tt - t0) / (t1 - t0) * (w - L - R); }, Y = function (v) { return T + (1 - v / top) * (h - T - B); };
  var ink2 = QS.css('--ink-2');
  c.font = '11px ' + QS.css('--f-num'); c.fillStyle = ink2; c.strokeStyle = QS.css('--line'); c.lineWidth = 1;
  c.textAlign = 'right'; c.textBaseline = 'middle';
  for (var v = 0; v <= top + 1e-9; v += step) { c.beginPath(); c.moveTo(L, Math.round(Y(v)) + 0.5); c.lineTo(w - R, Math.round(Y(v)) + 0.5); c.stroke(); c.fillText(v.toFixed(step < 0.1 ? 2 : 1), L - 6, Y(v)); }
  var steps = [15e3, 30e3, 60e3, 120e3, 300e3, 600e3, 900e3, 1800e3, 3600e3, 7200e3, 14400e3, 21600e3, 43200e3];
  var ts = steps.find(function (s) { return (t1 - t0) / s <= 5; }) || 86400e3;
  c.textAlign = 'center'; c.textBaseline = 'top';
  var tzo = new Date().getTimezoneOffset() * 60000;
  for (var tt = Math.ceil((t0 - tzo) / ts) * ts + tzo; tt <= t1; tt += ts) c.fillText(ts < 60e3 ? QS.hms(tt) : QS.hm(tt), X(tt), h - B + 6);
  [[lv.caution, '--caution'], [lv.danger, '--danger']].forEach(function (a) {
    if (a[0] <= top) { c.setLineDash([5, 4]); c.strokeStyle = QS.css(a[1]); c.lineWidth = 1.2; c.beginPath(); c.moveTo(L, Y(a[0])); c.lineTo(w - R, Y(a[0])); c.stroke(); c.setLineDash([]); }
  });
  var acc = QS.css('--accent');
  c.beginPath();
  for (var i = 0, pen = false; i < rs.length; i++) {
    var x = rs[i];
    if (i && x.t - rs[i - 1].t > 10000) pen = false;
    if (pen) c.lineTo(X(x.t), Y(x.rate)); else c.moveTo(X(x.t), Y(x.rate));
    pen = true;
  }
  c.strokeStyle = acc; c.lineWidth = 1.5; c.stroke();
  c.strokeStyle = ink2; c.setLineDash([2, 3]); c.lineWidth = 1; c.textAlign = 'left'; c.textBaseline = 'top'; c.fillStyle = ink2;
  rs.forEach(function (x) { if (x.marker) { c.beginPath(); c.moveTo(X(x.t), T); c.lineTo(X(x.t), h - B); c.stroke(); c.fillText(x.marker, Math.min(X(x.t) + 4, w - R - c.measureText(x.marker).width), T + 14); } });
  c.setLineDash([]);
  (events || []).forEach(function (e) {
    if (e.t < t0 || e.t > t1 || e.kind === 'back') return;
    c.fillStyle = QS.css(e.kind === 'danger' ? '--danger' : e.kind === 'caution' ? '--caution' : '--ink-2');
    var ex = X(e.t); c.beginPath(); c.moveTo(ex, T - 2); c.lineTo(ex - 5, T - 11); c.lineTo(ex + 5, T - 11); c.closePath(); c.fill();
  });
  var en = rs[rs.length - 1]; c.fillStyle = acc; c.beginPath(); c.arc(X(en.t), Y(en.rate), 3.4, 0, 7); c.fill();
};
