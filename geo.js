/* Q-Safe Monitor — 휴대폰 위치(GPS). 측정값이 올 때 그 시각의 위치를 붙인다.
 *  v0.1.1 : 가만히 있으면 안드로이드가 위치를 새로 주지 않으므로 10초마다 한 번 더 물어봄,
 *           오래된 위치도 30초까지는 사용, 정확도가 나빠도 버리지 않고 정확도와 함께 저장.
 */
var QS = window.QS || (window.QS = {});

QS.clockNow = null;                                   // 체험 모드 미리 채우기용 가상 시계
QS.now = function () { return QS.clockNow != null ? QS.clockNow : Date.now(); };

QS.Geo = {
  fixes: [], watchId: null, pollTimer: null,
  state: 'off',                                      // off | waiting | ok | denied | nosignal | unsupported | insecure
  err: '', lastAt: 0, onChange: null,
  OPTS: { enableHighAccuracy: true, maximumAge: 3000, timeout: 20000 },

  push: function (fx) { this.fixes.push(fx); if (this.fixes.length > 300) this.fixes.shift(); },

  /* tm 시각의 위치 : tm 보다 늦지 않은 가장 최근 위치 (maxAge 안에 있을 때). 모두 tm 보다 늦으면 가장 이른 것(3초 안) */
  at: function (tm, maxAge) {
    maxAge = maxAge || 30000;
    for (var i = this.fixes.length - 1; i >= 0; i--) {
      var f = this.fixes[i];
      if (f.t <= tm + 1000) return (tm - f.t <= maxAge) ? f : null;
    }
    var first = this.fixes[0];
    return first && first.t - tm <= 3000 ? first : null;
  },

  latest: function () { return this.fixes.length ? this.fixes[this.fixes.length - 1] : null; },
  age: function () { var f = this.latest(); return f ? Date.now() - f.t : Infinity; },

  _ok: function (p) {
    var now = Date.now(), ts = p.timestamp || now;
    if (ts > now) ts = now;                            // 휴대폰 시계와 GPS 시각 차이 보정
    this.push({ t: ts, lat: p.coords.latitude, lon: p.coords.longitude, acc: p.coords.accuracy || 9999 });
    this.lastAt = now; this.err = '';
    this._set('ok');
  },
  _fail: function (e) {
    this.err = (e && e.message) || '';
    if (e && e.code === 1) this._set('denied');
    else if (this.state !== 'ok' || this.age() > 30000) this._set('nosignal');   // 2 = 위치 없음, 3 = 시간 초과
  },
  _set: function (s) { var ch = s !== this.state; this.state = s; if (ch && this.onChange) this.onChange(s); },

  start: function () {
    var self = this;
    if (this.watchId != null) return;
    if (!window.isSecureContext) { this._set('insecure'); return; }
    if (!navigator.geolocation) { this._set('unsupported'); return; }
    this._set('waiting');
    try {
      this.watchId = navigator.geolocation.watchPosition(function (p) { self._ok(p); }, function (e) { self._fail(e); }, this.OPTS);
    } catch (e) { this._set('unsupported'); return; }
    clearInterval(this.pollTimer);
    this.pollTimer = setInterval(function () {        // 멈춰 있으면 위치가 안 오므로 직접 한 번 더 물어봄
      if (self.state === 'denied') return;
      if (Date.now() - self.lastAt > 10000) {
        try { navigator.geolocation.getCurrentPosition(function (p) { self._ok(p); }, function (e) { self._fail(e); }, self.OPTS); } catch (e) {}
      }
    }, 10000);
  },

  /* 사용자가 버튼을 눌렀을 때 : 멈췄다가 다시 시작 (권한 창이 다시 뜰 수 있음) */
  restart: function () { this.stop(); this.start(); },

  stop: function () {
    if (this.watchId != null) { try { navigator.geolocation.clearWatch(this.watchId); } catch (e) {} }
    clearInterval(this.pollTimer);
    this.watchId = null; this.pollTimer = null;
    this._set('off');
  }
};
