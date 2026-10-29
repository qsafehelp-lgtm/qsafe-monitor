/* Q-Safe Monitor — 화면·데이터 흐름·웹 알람·기록
 *  기기(QSF104) → HM-17 → Web Bluetooth → QS.LineAssembler → QS.parseLine → onReading()
 *  웹앱은 읽기 전용 : 기기 설정을 바꾸는 명령은 이 코드 어디에도 없다.
 */
(function () {
'use strict';
var APP_VERSION = '0.1.0';
var t = QS.t;
var $ = function (s, r) { return (r || document).querySelector(s); };
var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
var f2 = function (v) { return (+v).toFixed(2); }, f3 = function (v) { return (+v).toFixed(3); };
var nf = function (v) { return Number(v).toLocaleString('en-US'); };
var M_LAT = 111320;

/* ===================== 설정 ===================== */
function loadJSON(k, d) { try { var v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } }
function saveJSON(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
var DEF = { caution: 0.5, danger: 1.0, rise: true, riseSigma: 4, loss: true, sessOn: false, sessLimit: 1.0, sound: true, vibrate: true, flash: true,
  autoRec: true, wake: true, useGps: true, gpsAcc: 30, mapType: 'osm', mapScale: 'fixed' };
var S = Object.assign({}, DEF, loadJSON('qsm.settings', {}));
function saveS() { saveJSON('qsm.settings', S); }

/* ===================== 상태 ===================== */
var A = {
  view: 'connect', prevView: 'live', connected: false, src: null, link: 'none',
  btName: '—', info: { model: '—', serial: '—', fw: '—', alarmLv: 0 },
  readings: [], session: null, recording: false, autoRestart: false, lastRx: 0, pendingNote: null, raw: [],
  alarm: null, events: [], trendRange: 600, seeding: false,
  sessions: [], selSess: null, viewSess: null, writeBuf: [], lastPersist: 0,
  map: { follow: true, grid: false, sel: null, fitted: false, tm: null }
};
function resetAlarm() {
  A.alarm = { level: 0, upC: 0, upD: 0, dnC: 0, dnD: 0, ackLevel: 0, lastDanger: 0, lastRise: 0, riseUntil: 0, riseMsg: '', riseAck: false,
    lostActive: false, lostAck: false, sessFired: false, sessAck: false, batAck: false };
}
resetAlarm();
var lastR = function () { return A.readings.length ? A.readings[A.readings.length - 1] : null; };
var lagMs = function (avg) { return (avg === 1 ? 20000 : avg === 2 ? 120000 : 4000) / 2; };

/* ===================== 세션(기록) ===================== */
function newSession() {
  var st = QS.now();
  A.session = { id: 's' + st, start: st, end: st, open: true, demo: A.src === 'demo', device: A.btName, model: A.info.model, serial: A.info.serial, fw: A.info.fw,
    n: 0, max: 0, sum: 0, dose: 0, gpsN: 0, alarms: [], readings: [] };
  persistSession(true);
}
function sessMeta(s) {
  return { id: s.id, start: s.start, end: s.end, open: !!s.open, demo: !!s.demo, device: s.device, model: s.model, serial: s.serial, fw: s.fw,
    n: s.n, max: s.max, sum: s.sum, dose: s.dose, gpsN: s.gpsN, alarms: s.alarms.slice(-200) };
}
function persistSession(force) {
  if (!A.session || A.session.demo || !QS.Store.ok) return;
  var tm = Date.now();
  if (!force && tm - A.lastPersist < 10000) return;
  A.lastPersist = tm;
  if (A.writeBuf.length) { QS.Store.addReadings(A.writeBuf.splice(0)); }
  QS.Store.putSession(sessMeta(A.session));
}
function addToSession(r) {
  var s = A.session, prev = s.readings.length ? s.readings[s.readings.length - 1] : null;
  if (prev) { var dt = (r.t - prev.t) / 1000; if (dt > 0 && dt <= 30) s.dose += (r.rate + prev.rate) / 2 * dt / 3600; }
  s.readings.push(r); if (s.readings.length > 43200) s.readings.shift();
  s.n++; s.sum += r.rate; if (r.rate > s.max) s.max = r.rate; if (r.lat != null) s.gpsN++;
  s.end = r.t; s.model = A.info.model; s.serial = A.info.serial; s.fw = A.info.fw; s.device = A.btName;
  if (!s.demo && QS.Store.ok) { A.writeBuf.push(storeRow(r, s.id)); persistSession(false); }
}
function storeRow(r, sid) {
  var o = { sid: sid, t: r.t, rate: r.rate, cpm: r.cpm, err: r.err, alarm: r.alarm, dose: r.dose, bat: r.bat, temp: r.temp, avg: r.avg, mv: r.mv, rate2: r.rate2, mrate: r.mrate };
  if (r.lat != null) { o.lat = r.lat; o.lon = r.lon; o.acc = r.acc; }
  if (r.marker) o.marker = r.marker;
  return o;
}
function startRecording() { newSession(); A.recording = true; A.alarm.sessFired = false; keepAwake(true); }
function stopRecording() {
  if (!A.recording) return;
  A.recording = false;
  if (A.session) { A.session.open = false; persistSession(true); }
  keepAwake(false);
}

/* ===================== 수신 → 측정값 ===================== */
function onLine(line) {
  A.raw.push(QS.hms(QS.now()) + '  ' + line); if (A.raw.length > 80) A.raw.shift();
  var m = QS.parseLine(line);
  if (!m) return;
  if (m.type === 'info') {
    A.info = { model: m.model, serial: m.serial, fw: m.fw, alarmLv: m.alarmLv };
    if (A.btName === '—' || A.btName === 'QSF104') A.btName = m.model + '-' + String(m.serial).slice(-4);
    return;
  }
  onReading(m);
}
function onReading(r) {
  r.t = QS.now();
  var prev = lastR();
  if (r.rate2 != null) { r.mrate = prev && prev.rate2 != null && r.t - prev.t < 5000 ? (r.rate2 + prev.rate2) / 2 : r.rate2; r.lag = 2000; }
  else { r.mrate = r.rate; r.lag = lagMs(r.avg); }
  var fx = (S.useGps || A.src === 'demo') ? QS.Geo.at(r.t - r.lag, S.gpsAcc) : null;
  if (fx) { r.lat = fx.lat; r.lon = fx.lon; r.acc = fx.acc; } else r.lat = null;
  r.marker = A.pendingNote || ''; A.pendingNote = null;
  A.readings.push(r);
  if (A.readings.length > 11000 || (A.readings.length > 100 && A.readings[0].t < r.t - 6 * 3600e3)) A.readings.shift();
  if (A.autoRestart && S.autoRec && !A.recording) { A.autoRestart = false; startRecording(); }
  if (A.recording && A.session) addToSession(r);
  A.lastRx = r.t;
  if (A.alarm.lostActive) { A.alarm.lostActive = false; logEvent('back', r.rate); }
  checkAlarms(r);
  if (A.seeding) return;
  renderTop(); renderBanner();
  if (A.view === 'live') renderLive();
  else if (A.view === 'trend' && !A.viewSess) renderTrend();
  else if (A.view === 'map' && !A.viewSess) renderMap();
}

/* ===================== 웹 전용 알람 ===================== */
function logEvent(kind, v) { var e = { t: QS.now(), kind: kind, v: v }; A.events.push(e); if (A.events.length > 500) A.events.shift(); if (A.session && A.recording) A.session.alarms.push(e); }
function checkAlarms(r) {
  var al = A.alarm, c = S.caution, d = S.danger, before = al.level;
  al.upD = r.rate >= d ? al.upD + 1 : 0;
  al.upC = r.rate >= c ? al.upC + 1 : 0;
  al.dnD = r.rate < d * 0.9 ? al.dnD + 1 : 0;
  al.dnC = r.rate < c * 0.9 ? al.dnC + 1 : 0;
  if (al.level < 2 && al.upD >= 2) al.level = 2;
  else if (al.level < 1 && al.upC >= 2) al.level = 1;
  if (al.level === 2 && al.dnD >= 3) al.level = r.rate >= c ? 1 : 0;
  if (al.level === 1 && al.dnC >= 3) al.level = 0;
  if (al.level > before) { al.ackLevel = 0; logEvent(al.level === 2 ? 'danger' : 'caution', r.rate); fire(al.level === 2 ? 'danger' : 'caution'); }
  else if (al.level < before) { logEvent('back', r.rate); if (al.level === 0) al.ackLevel = 0; }

  if (S.rise && al.level === 0 && QS.now() - al.lastRise > 60000) {            // 급상승 : 최근 5분(마지막 30초 제외) 평균보다 kσ
    var base = 0, nb = 0;
    for (var i = A.readings.length - 1; i >= 0; i--) { var x = A.readings[i]; if (x.t < r.t - 300000) break; if (x.t < r.t - 30000) { base += x.rate; nb++; } }
    if (nb >= 60) {
      var b = base / nb, sig = r.rate * Math.max(1, r.err) / 100;
      if (sig > 0 && (r.rate - b) / sig >= S.riseSigma) { al.lastRise = QS.now(); al.riseUntil = QS.now() + 20000; al.riseAck = false; al.riseMsg = t('aRiseMsg', { v: f3(r.rate), b: f3(b) }); logEvent('rise', r.rate); fire('rise'); }
    }
  }
  if (S.sessOn && A.session && A.recording && !al.sessFired && A.session.dose >= S.sessLimit) { al.sessFired = true; al.sessAck = false; logEvent('sess', r.rate); fire('rise'); }
}
function fire(kind) {
  if (A.seeding) return;
  if (S.sound) QS.Snd.play(kind);
  if (S.vibrate) QS.Snd.vibrate(kind);
  if (kind === 'danger') A.alarm.lastDanger = Date.now();
}
function tick1s() {
  if (!A.connected) return;
  var al = A.alarm, tm = QS.now();
  if (S.loss && A.lastRx && !al.lostActive && tm - A.lastRx > 15000) { al.lostActive = true; al.lostAck = false; logEvent('lost', 0); fire('lost'); renderBanner(); }
  if (A.recording && A.lastRx && tm - A.lastRx > 300000) { stopRecording(); A.autoRestart = true; }   // 5분 넘게 끊기면 세션을 닫음
  if (al.level === 2 && al.ackLevel < 2 && Date.now() - al.lastDanger > 3000) fire('danger');
  if (al.riseUntil && al.riseUntil < tm) { al.riseUntil = 0; renderBanner(); }
  if (A.recording) persistSession(false);
  renderTop();
}

/* ===================== 위쪽 줄 · 알림 띠 ===================== */
var GEAR = '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>';
function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
function renderTop() {
  var tb = $('#topbar');
  if (!A.connected) {
    tb.innerHTML = '<div class="who"><div class="name">Q-Safe Monitor</div><div class="link"><span class="dot"></span>' + t('noDevice') + '</div></div><button class="iconbtn" id="btnSettings" aria-label="settings">' + GEAR + '</button>';
  } else {
    var r = lastR(), age = A.lastRx ? Math.max(0, Math.round((QS.now() - A.lastRx) / 1000)) : 0;
    var st = A.alarm.lostActive ? 'lost' : (A.link === 'reconnecting' || age > 5) ? 'slow' : 'ok';
    var label = A.link === 'reconnecting' ? t('reconnecting') : st === 'lost' ? t('lost') : t('receiving');
    var bars = r ? r.bat : 0, recMs = A.recording && A.session ? QS.now() - A.session.start : 0;
    var mm = Math.floor(recMs / 60000), recTxt = mm >= 60 ? Math.floor(mm / 60) + ':' + QS.pad(mm % 60) + ':' + QS.pad(Math.floor(recMs / 1000) % 60) : QS.pad(mm) + ':' + QS.pad(Math.floor(recMs / 1000) % 60);
    tb.innerHTML = '<div class="who"><div class="name">' + esc(A.btName) + (A.src === 'demo' ? ' <span class="badge">' + t('demoBadge') + '</span>' : '') + '</div>' +
      '<div class="link"><span class="dot ' + st + '"></span>' + label + (A.lastRx ? ' · ' + t('ago', { n: age }) : '') + '</div></div>' +
      (A.recording ? '<span class="rec num">' + recTxt + '</span>' : '') +
      '<span class="bat' + (r && bars <= 1 ? ' low' : '') + '"><i>' + [1, 2, 3, 4].map(function (k) { return '<b class="' + (k <= bars ? 'on' : '') + '"></b>'; }).join('') + '</i><span class="num">' + (r && r.mv > 0 ? (r.mv / 1000).toFixed(2) + ' V' : '') + '</span></span>' +
      '<button class="iconbtn" id="btnSettings" aria-label="settings">' + GEAR + '</button>';
  }
  $('#btnSettings').onclick = function () { show('settings'); };
}
function currentBanner() {
  var al = A.alarm, r = lastR();
  if (al.level === 2) return { cls: 'danger', title: t('aDanger'), msg: t('aLvMsg', { v: r ? f3(r.rate) : '-', t: f2(S.danger) }), ack: al.ackLevel < 2 ? 'lv' : null };
  if (al.level === 1) return { cls: 'caution', title: t('aCaution'), msg: t('aLvMsg', { v: r ? f3(r.rate) : '-', t: f2(S.caution) }), ack: al.ackLevel < 1 ? 'lv' : null };
  if (al.lostActive && !al.lostAck) return { cls: 'caution', title: t('aLost'), msg: t('aLostMsg'), ack: 'lost' };
  if (al.riseUntil > QS.now() && !al.riseAck) return { cls: 'caution', title: t('aRise'), msg: al.riseMsg, ack: 'rise' };
  if (al.sessFired && !al.sessAck && A.session) return { cls: 'info', title: t('aSess'), msg: t('aSessMsg', { v: f3(A.session.dose), t: f2(S.sessLimit) }), ack: 'sess' };
  if (r && r.bat <= 1 && !al.batAck) return { cls: 'info', title: t('aBat'), msg: t('aBatMsg'), ack: 'bat' };
  return null;
}
function renderBanner() {
  var b = A.connected ? currentBanner() : null, el = $('#banner');
  $('#app').classList.toggle('flash', !!(b && b.cls === 'danger' && b.ack && S.flash));
  if (!b) { el.hidden = true; return; }
  el.hidden = false; el.className = 'banner ' + b.cls;
  el.innerHTML = '<div class="bx"><div class="bt">' + b.title + '</div><div class="bm num">' + esc(b.msg) + '</div></div>' + (b.ack ? '<button id="btnAck">' + t('ack') + '</button>' : '<span class="bm">' + t('ackDone') + '</span>');
  var ab = $('#btnAck');
  if (ab) ab.onclick = function () {
    var al = A.alarm;
    if (b.ack === 'lv') al.ackLevel = al.level; else if (b.ack === 'lost') al.lostAck = true; else if (b.ack === 'rise') al.riseAck = true;
    else if (b.ack === 'sess') al.sessAck = true; else if (b.ack === 'bat') al.batAck = true;
    renderBanner();
  };
}

/* ===================== 측정 화면 ===================== */
var lvKey = function (l) { return l === 2 ? 'danger' : l === 1 ? 'caution' : 'safe'; };
var avgKey = function (a) { return a === 1 ? 'avg1' : a === 2 ? 'avg2' : 'avg0'; };
function renderLive() {
  var r = lastR(), lv = r ? A.alarm.level : -1;
  $('#panel').dataset.lv = lv;
  $('#lvPill').textContent = lv < 0 ? t('waiting') : t(lvKey(lv));
  $('#thrText').textContent = t('thr', { c: f2(S.caution), d: f2(S.danger) });
  $('#rateV').textContent = r ? f3(r.rate) : '-.---';
  $('#errV').textContent = r ? '±' + r.err : '±-';
  $('#avgV').textContent = r && r.avg >= 0 ? t(avgKey(r.avg)) : '';
  var devS = r ? (r.alarm === 0 ? t('off') : r.alarm === 1 ? t('safe') : r.alarm === 2 ? t('caution') : t('danger')) : '-';
  $('#devAlarmV').textContent = t('devAlarm', { s: devS });
  var s = A.recording ? A.session : null;
  $('#tCpm').textContent = r ? nf(r.cpm) : '-';
  $('#tMax').innerHTML = s ? f3(s.max) + '<small>µSv/h</small>' : '-';
  $('#tSess').innerHTML = s ? f3(s.dose) + '<small>µSv</small>' : '-';
  $('#tDev').innerHTML = r ? (+r.dose).toFixed(2) + '<small>µSv</small>' : '-';
  $('#tTemp').innerHTML = r ? (+r.temp).toFixed(1) + '<small>°C</small>' : '-';
  $('#tGps').innerHTML = r && r.lat != null ? '±' + Math.round(r.acc) + '<small>m</small>' : (QS.Geo.state === 'denied' && A.src !== 'demo' ? '<small>' + t('gpsDenied') + '</small>' : '—');
  var br = $('#btnRec');
  br.className = 'btn ' + (A.recording ? 'recording' : 'primary');
  br.innerHTML = A.recording ? t('recOn') + ' <small>' + nf(A.session.n) + '</small>' : t('recStart');
  var tm = QS.now(), rs = [];
  for (var i = A.readings.length - 1; i >= 0 && A.readings[i].t >= tm - 120000; i--) rs.unshift(A.readings[i]);
  var vm = QS.drawSpark($('#spark'), rs, tm, S.caution);
  $('#sparkMax').textContent = vm != null ? 'max ' + f3(vm) : '';
}

/* ===================== 그래프 ===================== */
function trendSource() {
  if (A.viewSess) return { rs: A.viewSess.readings, ev: A.viewSess.meta.alarms || [], end: A.viewSess.meta.end };
  return { rs: A.readings, ev: A.events, end: QS.now() };
}
function stats(rs) {
  if (!rs.length) return null;
  var n = rs.length, sum = 0, mn = Infinity, mx = -Infinity, dose = 0;
  for (var i = 0; i < n; i++) { var v = rs[i].rate; sum += v; if (v < mn) mn = v; if (v > mx) mx = v; if (i) { var dt = (rs[i].t - rs[i - 1].t) / 1000; if (dt > 0 && dt <= 30) dose += (v + rs[i - 1].rate) / 2 * dt / 3600; } }
  var mean = sum / n, ss = 0;
  for (i = 0; i < n; i++) ss += (rs[i].rate - mean) * (rs[i].rate - mean);
  return { n: n, mean: mean, min: mn, max: mx, sd: n > 1 ? Math.sqrt(ss / (n - 1)) : 0, dose: dose, from: rs[0].t, to: rs[n - 1].t };
}
function renderViewing(el) {
  if (!A.viewSess) { el.hidden = true; return; }
  el.hidden = false;
  el.innerHTML = '<span>' + t('viewing', { d: QS.ymd(A.viewSess.meta.start) + ' ' + QS.hm(A.viewSess.meta.start) }) + '</span>' + (A.connected ? '<button>' + t('backLive') + '</button>' : '');
  var b = $('button', el); if (b) b.onclick = function () { A.viewSess = null; A.map.fitted = false; show(A.view); };
}
function renderTrend() {
  renderViewing($('#viewingT'));
  $$('#rangeSeg button').forEach(function (b) { b.setAttribute('aria-pressed', String(+b.dataset.r === A.trendRange)); });
  var src = trendSource(), rs = src.rs;
  if (A.trendRange) { var cut = src.end - A.trendRange * 1000; rs = rs.filter(function (x) { return x.t >= cut; }); }
  var t0 = A.trendRange ? src.end - A.trendRange * 1000 : (rs.length ? rs[0].t : src.end - 60000);
  QS.drawChart($('#chart'), rs, t0, src.end, src.ev, { caution: S.caution, danger: S.danger });
  var st = stats(rs);
  var cell = function (k, v, u) { return '<div class="tile"><span>' + t(k) + '</span><b>' + v + (u ? '<small>' + u + '</small>' : '') + '</b></div>'; };
  $('#stats').innerHTML = st ? cell('mean', st.mean.toFixed(4), 'µSv/h') + cell('min', f3(st.min)) + cell('max', f3(st.max)) + cell('sd', st.sd.toFixed(4)) + cell('rangeDose', st.dose.toFixed(4), 'µSv') + cell('samples', nf(st.n)) : '';
  $('#annual').textContent = st ? t('annual', { v: (st.mean * 8760 / 1000).toFixed(2) }) : '';
}

/* ===================== 지도 ===================== */
function mapPoints() {
  var rs = A.viewSess ? A.viewSess.readings : (A.recording && A.session && A.session.readings.length ? A.session.readings : A.readings);
  return rs.filter(function (r) { return r.lat != null; });
}
function doseColor(v, lo, hi) {
  if (S.mapScale === 'auto' && hi > lo) return QS.css('--dose' + (Math.min(4, Math.max(0, Math.floor((v - lo) / (hi - lo) * 5))) + 1));
  return QS.css(v >= S.danger ? '--dose5' : v >= S.caution ? '--dose4' : v >= 0.30 ? '--dose3' : v >= 0.15 ? '--dose2' : '--dose1');
}
function ensureMap() {
  if (A.map.tm) return A.map.tm;
  var tm = new QS.TileMap($('#map'), {
    onDraw: drawMapOverlay,
    onUserMove: function () { A.map.follow = false; $('#mFollow').setAttribute('aria-pressed', 'false'); },
    onTap: function (x, y) {
      var best = null, bd = 18;
      mapPoints().forEach(function (p) { var s = tm.project(p.lat, p.lon), d = Math.hypot(s.x - x, s.y - y); if (d < bd) { bd = d; best = p; } });
      A.map.sel = best; tm.requestRender(); renderMapInfo();
    }
  });
  tm.setView(36.4, 127.8, 7);
  A.map.tm = tm;
  return tm;
}
function drawMapOverlay(c, P, w, h) {
  var pts = mapPoints(), M = A.map, tm = M.tm;
  if (pts.length) {
    c.strokeStyle = QS.css('--map-track'); c.lineWidth = 1.4; c.globalAlpha = 0.55; c.beginPath();
    pts.forEach(function (p, i) { var s = P(p.lat, p.lon); if (i && p.t - pts[i - 1].t <= 10000) c.lineTo(s.x, s.y); else c.moveTo(s.x, s.y); });
    c.stroke(); c.globalAlpha = 1;
    var lo = Infinity, hi = -Infinity; pts.forEach(function (p) { if (p.mrate < lo) lo = p.mrate; if (p.mrate > hi) hi = p.mrate; });
    var screen = QS.css('--screen');
    if (M.grid) {
      var M_LON = M_LAT * Math.cos(pts[0].lat * Math.PI / 180), cells = {};
      pts.forEach(function (p) { var k = Math.floor(p.lat * M_LAT / 10) + ',' + Math.floor(p.lon * M_LON / 10); (cells[k] = cells[k] || []).push(p.mrate); });
      c.globalAlpha = 0.85;
      Object.keys(cells).forEach(function (k) {
        var a = k.split(',').map(Number), v = cells[k].reduce(function (s, x) { return s + x; }, 0) / cells[k].length;
        var p1 = P((a[0] + 1) * 10 / M_LAT, a[1] * 10 / M_LON), p2 = P(a[0] * 10 / M_LAT, (a[1] + 1) * 10 / M_LON);
        c.fillStyle = doseColor(v, lo, hi); c.fillRect(p1.x, p1.y, Math.max(2, p2.x - p1.x), Math.max(2, p2.y - p1.y));
      });
      c.globalAlpha = 1;
    } else {
      var rad = Math.max(3, Math.min(7, (tm.z - 12) * 0.9));
      var step = pts.length > 8000 ? Math.ceil(pts.length / 8000) : 1;
      for (var i = 0; i < pts.length; i += step) {
        var p = pts[i], s = P(p.lat, p.lon);
        if (s.x < -10 || s.y < -10 || s.x > w + 10 || s.y > h + 10) continue;
        c.beginPath(); c.arc(s.x, s.y, rad, 0, 7); c.fillStyle = doseColor(p.mrate, lo, hi); c.fill(); c.lineWidth = 1; c.strokeStyle = screen; c.stroke();
      }
    }
    if (M.sel) { var q = P(M.sel.lat, M.sel.lon); c.beginPath(); c.arc(q.x, q.y, 10, 0, 7); c.lineWidth = 2.2; c.strokeStyle = QS.css('--ink'); c.stroke(); }
  }
  var me = QS.Geo.latest();
  if (me && A.connected && !A.viewSess) {
    var m = P(me.lat, me.lon), ar = me.acc / tm.metersPerPixel();
    c.beginPath(); c.arc(m.x, m.y, Math.max(8, ar), 0, 7); c.fillStyle = QS.css('--accent'); c.globalAlpha = 0.14; c.fill(); c.globalAlpha = 1;
    c.beginPath(); c.arc(m.x, m.y, 6.5, 0, 7); c.fill(); c.lineWidth = 2.5; c.strokeStyle = QS.css('--screen'); c.stroke();
  }
  var msg = $('#mapMsg');
  if (tm.offline) { msg.hidden = false; msg.textContent = t('mapOffline'); }
  else if (!pts.length && !A.viewSess) { msg.hidden = false; msg.textContent = t('noPoints'); }
  else msg.hidden = true;
}
function fitMap() {
  var tm = ensureMap(), pts = mapPoints();
  if (pts.length > 1) {
    var s = 90, n = -90, w = 180, e = -180;
    pts.forEach(function (p) { if (p.lat < s) s = p.lat; if (p.lat > n) n = p.lat; if (p.lon < w) w = p.lon; if (p.lon > e) e = p.lon; });
    var padLat = Math.max(0.0004, (n - s) * 0.05), padLon = Math.max(0.0005, (e - w) * 0.05);
    tm.render();
    tm.fit(s - padLat, w - padLon, n + padLat, e + padLon, 48, 210);
  } else {
    var me = QS.Geo.latest();
    if (me) tm.setView(me.lat, me.lon, 17);
  }
}
function renderMap() {
  var tm = ensureMap(), M = A.map;
  tm.dark = !!(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
  if (!M.fitted) { var pts = mapPoints(); if (pts.length > 1 || QS.Geo.latest()) { fitMap(); M.fitted = true; if (A.viewSess || pts.length > 20) M.follow = false; } }
  var me = QS.Geo.latest();
  if (M.follow && me && !A.viewSess) tm.setView(me.lat, me.lon);
  $('#mFollow').setAttribute('aria-pressed', String(M.follow));
  $('#mGrid').setAttribute('aria-pressed', String(M.grid));
  tm.requestRender();
  var r = A.viewSess ? null : lastR(), chips = '';
  if (A.viewSess) chips += '<span>' + t('viewing', { d: QS.ymd(A.viewSess.meta.start) + ' ' + QS.hm(A.viewSess.meta.start) }) + '</span>';
  else {
    var gtxt = A.src === 'demo' || QS.Geo.state === 'ok' ? (me ? t('gpsAcc2', { n: Math.round(me.acc) }) : t('gpsNone')) : QS.Geo.state === 'denied' ? t('gpsDenied') : t('gpsNone');
    chips += '<span class="num">' + gtxt + ' · ' + t('points', { n: nf(mapPoints().length) }) + '</span>';
    if (r) chips += '<span>' + (r.rate2 != null ? t('fromRate2') + ' · ' : '') + t('lag', { s: r.lag / 1000 }) + '</span>';
    if (r && r.avg > 0) chips += r.rate2 != null ? '<span>' + t('devAvgNote', { a: t(avgKey(r.avg)) }) + '</span>' : '<span class="warn">' + t('mapAvgWarn', { a: t(avgKey(r.avg)) }) + '</span>';
  }
  $('#mapChips').innerHTML = chips;
  var pts2 = mapPoints(), lo = Infinity, hi = -Infinity; pts2.forEach(function (p) { if (p.mrate < lo) lo = p.mrate; if (p.mrate > hi) hi = p.mrate; });
  var ticks = S.mapScale === 'auto' && hi > lo ? [1, 2, 3, 4].map(function (k) { return (lo + (hi - lo) * k / 5).toFixed(2); }) : ['0.15', '0.30', f2(S.caution), f2(S.danger)];
  $('#mapLegend').innerHTML = t('legend') + '<div class="bar">' + [1, 2, 3, 4, 5].map(function (k) { return '<i style="background:var(--dose' + k + ')"></i>'; }).join('') + '</div><div class="ticks">' + ticks.map(function (x) { return '<span>' + x + '</span>'; }).join('') + '</div>';
  renderMapInfo();
}
function renderMapInfo() {
  var s = A.map.sel || (A.viewSess ? null : lastR());
  $('#mapInfo').innerHTML = s ? '<div class="hint num">' + QS.hms(s.t) + (A.map.sel ? '' : ' · ' + t('nowLbl')) + '</div><b>' + f3(s.mrate != null ? s.mrate : s.rate) + '</b> <span class="hint">µSv/h</span><div class="hint num">' + nf(s.cpm) + ' CPM · ±' + s.err + '%</div>' : '<span class="hint">' + t('tapPoint') + '</span>';
}

/* ===================== 기록 목록 · 상세 ===================== */
function sessionLabel(m) { return QS.ymd(m.start) + ' ' + QS.hm(m.start); }
function renderLog() {
  var list = $('#slist'), html = '';
  var cur = A.recording && A.session ? A.session : null;
  var all = (cur ? [cur] : []).concat(A.sessions.filter(function (s) { return !cur || s.id !== cur.id; }));
  all.forEach(function (s) {
    var live = cur && s.id === cur.id, mins = Math.max(0, Math.round((s.end - s.start) / 60000));
    html += '<button class="scard" data-s="' + s.id + '"><div><span class="st">' + sessionLabel(s) + '</span>' + (live ? '<span class="tag live">' + t('inProgress') + '</span>' : '') + (s.demo ? '<span class="tag">' + t('demoBadge') + '</span>' : '') + '</div>' +
      '<div class="sv">' + f3(s.max || 0) + '</div><div class="sm">' + esc(s.device || '') + ' · ' + t('minutes', { n: mins }) + ' · ' + t('samplesN', { n: nf(s.n || 0) }) + (s.gpsN ? ' · GPS ' + nf(s.gpsN) : '') + '</div><div class="sm" style="text-align:right">max µSv/h</div></button>';
  });
  list.innerHTML = html || '<div class="empty">' + t('noSessions') + '</div>';
  $('#logNote').textContent = QS.Store.ok ? t('logNote') : t('memOnly');
  $$('.scard', list).forEach(function (b) { b.onclick = function () { A.selSess = b.dataset.s; show('session'); }; });
}
function refreshSessions() { return QS.Store.listSessions().then(function (a) { A.sessions = a; if (A.view === 'log') renderLog(); }); }
function findSess(id) { if (A.session && A.session.id === id) return A.session; for (var i = 0; i < A.sessions.length; i++) if (A.sessions[i].id === id) return A.sessions[i]; return null; }
function sessReadings(id) {
  if (A.session && A.session.id === id) return Promise.resolve(A.session.readings.slice());
  return QS.Store.getReadings(id);
}
var delArmed = 0;
function renderSession() {
  var s = findSess(A.selSess); if (!s) { show('log'); return; }
  var live = A.recording && A.session && s.id === A.session.id;
  $('#sTitle').textContent = sessionLabel(s) + (live ? ' · ' + t('inProgress') : '');
  var kv = [['kvDevice', s.device], ['kvStart', QS.ymd(s.start) + ' ' + QS.hms(s.start)], ['kvLen', t('minutes', { n: Math.round((s.end - s.start) / 60000) })], ['kvN', nf(s.n)],
    ['kvMean', (s.n ? s.sum / s.n : 0).toFixed(4) + ' µSv/h'], ['kvMax', f3(s.max) + ' µSv/h'], ['kvDose', (+s.dose).toFixed(4) + ' µSv'], ['kvGps', nf(s.gpsN)],
    ['kvAlarms', (s.alarms || []).filter(function (e) { return e.kind !== 'back'; }).length], ['fw', s.fw || '—']];
  $('#sKv').innerHTML = kv.map(function (a) { return '<dt>' + t(a[0]) + '</dt><dd>' + esc(a[1]) + '</dd>'; }).join('');
  $('#sDelete').hidden = !!live;
  $('#sDelete').textContent = t('deleteSession'); delArmed = 0;
}
function openSessionView(target) {
  var s = findSess(A.selSess); if (!s) return;
  var live = A.recording && A.session && s.id === A.session.id;
  if (live) { A.viewSess = null; A.map.fitted = false; show(target); return; }
  sessReadings(s.id).then(function (rs) { A.viewSess = { meta: s, readings: rs }; A.trendRange = 0; A.map.fitted = false; A.map.sel = null; show(target); });
}
function exportSession(kind) {
  var s = findSess(A.selSess); if (!s) return;
  sessReadings(s.id).then(function (rs) {
    var text = QS.Export.make(kind, rs, s.device || 'QSF104', { caution: S.caution, danger: S.danger });
    var base = 'QSF104_' + QS.ymd(s.start).replace(/-/g, '') + '_' + QS.hm(s.start).replace(':', '');
    return QS.Export.save(kind, text, base);
  }).then(function (res) { if (res === 'shared') toast(t('shared')); else if (res === 'saved') toast(t('saved')); })
    .catch(function () { toast(t('exportFail')); });
}

/* ===================== 설정 ===================== */
function renderSettings() {
  $('#sCaution').value = S.caution; $('#sDanger').value = S.danger; $('#sRise').checked = S.rise; $('#sRiseSigma').value = S.riseSigma;
  $('#sLoss').checked = S.loss; $('#sSessOn').checked = S.sessOn; $('#sSessLimit').value = S.sessLimit;
  $('#sSound').checked = S.sound; $('#sVibrate').checked = S.vibrate; $('#sFlash').checked = S.flash;
  $('#sLang').value = QS.lang; $('#sAutoRec').checked = S.autoRec; $('#sWake').checked = S.wake; $('#sUseGps').checked = S.useGps;
  $('#sMapType').value = S.mapType; $('#sMapScale').value = S.mapScale; $('#sGpsAcc').value = S.gpsAcc;
  $('#dModel').textContent = A.info.model; $('#dSerial').textContent = A.info.serial; $('#dFw').textContent = A.info.fw;
  $('#dAlarm').textContent = A.info.alarmLv > 0 ? f2(A.info.alarmLv) + ' µSv/h' : t('off'); $('#dBt').textContent = A.btName;
  $('#demoGroup').hidden = A.src !== 'demo';
  $('#btnDisconnect').hidden = !A.connected;
  $('#appVer').textContent = APP_VERSION;
}
function bindSettings() {
  var num = function (id, key, lo, hi) { $(id).addEventListener('change', function (e) { var v = parseFloat(e.target.value); if (isFinite(v) && v >= lo && (hi == null || v <= hi)) { S[key] = v; saveS(); } else e.target.value = S[key]; refresh(); }); };
  var chk = function (id, key, after) { $(id).addEventListener('change', function (e) { S[key] = e.target.checked; saveS(); if (after) after(); refresh(); }); };
  num('#sCaution', 'caution', 0.01); num('#sDanger', 'danger', 0.01); num('#sRiseSigma', 'riseSigma', 2, 10); num('#sSessLimit', 'sessLimit', 0.1); num('#sGpsAcc', 'gpsAcc', 5, 500);
  chk('#sRise', 'rise'); chk('#sLoss', 'loss'); chk('#sSessOn', 'sessOn'); chk('#sSound', 'sound'); chk('#sVibrate', 'vibrate'); chk('#sFlash', 'flash'); chk('#sAutoRec', 'autoRec');
  chk('#sWake', 'wake', function () { keepAwake(A.recording); });
  chk('#sUseGps', 'useGps', function () { if (A.src === 'ble') { if (S.useGps) QS.Geo.start(); else QS.Geo.stop(); } });
  $('#sMapType').addEventListener('change', function (e) { S.mapType = e.target.value; saveS(); });
  $('#sMapScale').addEventListener('change', function (e) { S.mapScale = e.target.value; saveS(); });
  $('#sLang').addEventListener('change', function (e) { setLang(e.target.value); });
  $('#btnTestSound').onclick = function () { QS.Snd.unlock(); setTimeout(function () { QS.Snd.play('caution'); }, 60); };
  $('#btnRaw').onclick = function () {
    openSheet('<div class="sh"><b>' + t('rawT') + '</b><button class="btn" id="shClose">' + t('close') + '</button></div><pre>' + esc(A.raw.slice(-40).join('\n') || '—') + '</pre>', function () { $('#shClose').onclick = closeSheet; });
  };
  $$('#demoScen button').forEach(function (b) {
    b.onclick = function () {
      var sc = b.dataset.sc, D = QS.Demo;
      if (sc === 'avg20') D.avgMode = D.avgMode === 1 ? 0 : 1;
      else if (sc === 'lost') { D.scen = 'normal'; D.lostUntil = Date.now() + 19000; }
      else { D.scen = sc; D.lostUntil = 0; }
      toast(b.textContent);
    };
  });
}
function setLang(l) { QS.lang = l; try { localStorage.setItem('qsm.lang', l); } catch (e) {} QS.applyText(); refresh(); }

/* ===================== 시트 · 알림 ===================== */
function openSheet(html, bind) { $('#sheet').innerHTML = html; $('#sheetbg').hidden = false; if (bind) bind(); }
function closeSheet() { $('#sheetbg').hidden = true; }
var toastTimer = null;
function toast(msg) { var el = $('#toast'); el.textContent = msg; el.hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(function () { el.hidden = true; }, 2200); }
function showNote() {
  openSheet('<div class="sh"><b>' + t('noteT') + '</b><button class="btn" id="shClose">' + t('close') + '</button></div><textarea id="noteText" rows="2" maxlength="40" placeholder="' + t('notePh') + '"></textarea><button class="btn primary" id="noteSave">' + t('noteSave') + '</button>', function () {
    $('#shClose').onclick = closeSheet;
    $('#noteSave').onclick = function () { var v = $('#noteText').value.trim(); if (v) { A.pendingNote = v.slice(0, 40); toast(t('noteSet')); } closeSheet(); };
    setTimeout(function () { $('#noteText').focus(); }, 50);
  });
}

/* ===================== 화면 이동 ===================== */
function show(v) {
  if (!A.connected && !A.viewSess && (v === 'live' || v === 'trend' || v === 'map')) v = 'connect';
  if (v !== 'settings' && v !== 'session') A.prevView = v;
  if ((v === 'live' || v === 'log' || v === 'connect') && A.viewSess) { A.viewSess = null; A.map.fitted = false; }
  A.view = v;
  $$('.view').forEach(function (s) { s.hidden = s.dataset.view !== v; });
  $('#tabbar').hidden = v === 'connect';
  $$('#tabbar button').forEach(function (b) { b.removeAttribute('aria-current'); });
  var tb = $('#tabbar button[data-tab="' + (v === 'session' ? 'log' : v) + '"]'); if (tb) tb.setAttribute('aria-current', 'page');
  $('#views').scrollTop = 0;
  if (v === 'log') refreshSessions();
  refresh();
}
function refresh() {
  renderTop(); renderBanner();
  if (A.view === 'live') renderLive();
  else if (A.view === 'trend') renderTrend();
  else if (A.view === 'map') renderMap();
  else if (A.view === 'log') renderLog();
  else if (A.view === 'session') renderSession();
  else if (A.view === 'settings') renderSettings();
  else if (A.view === 'connect') renderConnect();
}
function renderConnect() {
  var ios = /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  var ok = QS.Ble.supported() && window.isSecureContext;
  $('#btnConnect').disabled = !ok;
  $('#btnConnectAll').hidden = !ok;
  $('#iphoneCard').hidden = !ios && ok;
  var msg = $('#connectMsg');
  if (!ok && !msg.dataset.keep) { msg.hidden = false; msg.textContent = !window.isSecureContext ? t('cHttps') : t('cNoBt'); }
}

/* ===================== 연결 · 끊기 ===================== */
var wakeLock = null;
function keepAwake(on) {
  try {
    if (on && S.wake && navigator.wakeLock && !wakeLock) navigator.wakeLock.request('screen').then(function (w) { wakeLock = w; w.addEventListener('release', function () { wakeLock = null; }); }).catch(function () {});
    if (!on && wakeLock) { wakeLock.release().catch(function () {}); wakeLock = null; }
  } catch (e) { wakeLock = null; }
}
function beginSession(src, name) {
  A.src = src; A.connected = true; A.link = 'connected'; A.btName = name;
  A.readings = []; A.events = []; A.raw = []; A.lastRx = 0; A.viewSess = null; resetAlarm();
  A.map.fitted = false; A.map.follow = true; A.map.sel = null;
  if (S.autoRec) startRecording();
}
function connectBle(all) {
  var msg = $('#connectMsg'); msg.hidden = true; delete msg.dataset.keep;
  QS.Snd.unlock();
  A.info = { model: '—', serial: '—', fw: '—', alarmLv: 0 };
  QS.Ble.onLine = onLine;
  QS.Ble.onState = function (st, name) {
    if (st === 'connected') {
      if (!A.connected || A.src !== 'ble') { beginSession('ble', name || 'QSF104'); if (S.useGps) QS.Geo.start(); show('live'); }
      else { A.link = 'connected'; renderTop(); }
    } else if (st === 'reconnecting') { A.link = 'reconnecting'; renderTop(); }
    else if (st === 'connecting' && !A.connected) { msg.hidden = false; msg.dataset.keep = '1'; msg.textContent = t('cConnect') + ' …'; }
  };
  QS.Ble.request(all).catch(function (e) {
    var name = e && e.name, text = (e && e.message) || String(e);
    msg.hidden = false; msg.dataset.keep = '1';
    if (name === 'NotFoundError' && /service/i.test(text)) msg.textContent = t('btNoService');
    else if (name === 'NotFoundError') msg.textContent = t('btCancel');
    else if (name === 'SecurityError' || name === 'NotAllowedError') msg.textContent = t('cHttps') + ' ' + t('btFail', { e: text });
    else msg.textContent = t('btFail', { e: text });
    QS.Ble.disconnect();
  });
}
function startDemo() {
  QS.Snd.unlock();
  QS.Geo.stop(); QS.Geo.fixes = [];
  A.info = { model: '—', serial: '—', fw: '—', alarmLv: 0 };
  beginSession('demo', 'QSF104B-0123');
  QS.Demo.start(onLine);
  A.seeding = true;                                      // 10분 치를 가상 시계로 미리 채움 (소리 없이)
  var real = Date.now(), n = 300;
  if (A.session) A.session.start = real - n * 2000;
  for (var i = n; i >= 1; i--) { QS.clockNow = real - i * 2000; QS.Demo.tick(); }
  QS.clockNow = null; A.seeding = false;
  var peak = null; A.readings.forEach(function (r) { if (!peak || r.rate > peak.rate) peak = r; });
  if (peak) peak.marker = t('parkNote');
  show('live');
}
function disconnect() {
  stopRecording(); QS.Demo.stop(); QS.Ble.disconnect(); if (A.src !== 'demo') QS.Geo.stop();
  A.connected = false; A.src = null; A.link = 'none'; A.lastRx = 0; A.session = null; resetAlarm(); A.viewSess = null;
  $('#app').classList.remove('flash');
  refreshSessions();
  show('connect');
}

/* ===================== 연결(버튼) ===================== */
$$('#tabbar button').forEach(function (b) { b.onclick = function () { if (A.viewSess && b.dataset.tab !== 'trend' && b.dataset.tab !== 'map') { A.viewSess = null; A.map.fitted = false; } show(b.dataset.tab); }; });
$$('[data-back]').forEach(function (b) { b.onclick = function () { show(b.dataset.back === 'prev' ? (A.prevView || 'live') : b.dataset.back); }; });
$$('[data-x]').forEach(function (b) { b.onclick = function () { exportSession(b.dataset.x); }; });
$$('#rangeSeg button').forEach(function (b) { b.onclick = function () { A.trendRange = +b.dataset.r; renderTrend(); }; });
$('#btnRec').onclick = function () { if (A.recording) stopRecording(); else startRecording(); refresh(); };
$('#btnNote').onclick = showNote;
$('#btnGoMap').onclick = function () { show('map'); };
$('#btnConnect').onclick = function () { connectBle(false); };
$('#btnConnectAll').onclick = function () { connectBle(true); };
$('#btnDemo').onclick = startDemo;
$('#btnOpenLogs').onclick = function () { show('log'); };
$('#btnDisconnect').onclick = disconnect;
$('#sTrend').onclick = function () { openSessionView('trend'); };
$('#sMap').onclick = function () { openSessionView('map'); };
$('#sDelete').onclick = function () {
  var b = $('#sDelete');
  if (Date.now() - delArmed > 4000) { delArmed = Date.now(); b.textContent = t('confirmDelete'); return; }
  QS.Store.deleteSession(A.selSess).then(function () { toast(t('deleted')); return refreshSessions(); }).then(function () { show('log'); });
};
$('#sheetbg').addEventListener('click', function (e) { if (e.target.id === 'sheetbg') closeSheet(); });
$('#mFollow').onclick = function () { A.map.follow = !A.map.follow; renderMap(); };
$('#mFit').onclick = function () { A.map.follow = false; fitMap(); renderMap(); };
$('#mGrid').onclick = function () { A.map.grid = !A.map.grid; renderMap(); };
$('#mIn').onclick = function () { var tm = ensureMap(); tm.zoomAt(1, tm.w / 2, tm.h / 2); };
$('#mOut').onclick = function () { var tm = ensureMap(); tm.zoomAt(-1, tm.w / 2, tm.h / 2); };
bindSettings();

setInterval(tick1s, 1000);
document.addEventListener('visibilitychange', function () {
  if (document.hidden) persistSession(true);
  else if (A.recording) { wakeLock = null; keepAwake(true); }
});
window.addEventListener('pagehide', function () { persistSession(true); });
if ('ResizeObserver' in window) new ResizeObserver(function () { if (A.view === 'map' && A.map.tm) A.map.tm.requestRender(); else if (A.view === 'trend') renderTrend(); else if (A.view === 'live') renderLive(); }).observe($('#views'));
try { window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', refresh); } catch (e) {}

/* ===================== 시작 ===================== */
QS.applyText();
QS.Store.open().then(function (ok) {
  if (ok) {
    QS.Store.persist();
    return QS.Store.listSessions().then(function (list) {          // 앱이 갑자기 닫혀 열린 채 남은 세션 정리
      list.forEach(function (s) { if (s.open) { s.open = false; QS.Store.putSession(s); } });
      A.sessions = list;
    });
  }
}).then(function () { if (A.view === 'log') renderLog(); });
if ('serviceWorker' in navigator && location.protocol === 'https:') { navigator.serviceWorker.register('sw.js').catch(function () {}); }
var startParam = (location.hash || '').replace('#', '');
show('connect');
if (startParam === 'demo') startDemo();

window.__qsm = { A: A, S: S, startDemo: startDemo, show: show };   // 개발용
})();
