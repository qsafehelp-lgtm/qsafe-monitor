/* Q-Safe Monitor — 휴대폰 위치(GPS). 측정값이 올 때 그 시각의 위치를 붙인다. */
var QS = window.QS || (window.QS = {});

QS.clockNow = null;                                   // 체험 모드 미리 채우기용 가상 시계
QS.now = function () { return QS.clockNow != null ? QS.clockNow : Date.now(); };

QS.Geo = {
  fixes: [], watchId: null, state: 'off',             // off | waiting | ok | denied | unavailable

  push: function (fx) { this.fixes.push(fx); if (this.fixes.length > 180) this.fixes.shift(); },

  /* tm 시각에 가장 가까운(그 시각보다 늦지 않은) 위치. 5초보다 오래되었거나 정확도 기준을 넘으면 없음 */
  at: function (tm, accLimit) {
    for (var i = this.fixes.length - 1; i >= 0; i--) {
      var f = this.fixes[i];
      if (f.t <= tm + 500) return (tm - f.t <= 5000 && f.acc <= accLimit) ? f : null;
    }
    return null;
  },

  latest: function () { return this.fixes.length ? this.fixes[this.fixes.length - 1] : null; },

  start: function () {
    var self = this;
    if (this.watchId != null) return;
    if (!navigator.geolocation) { this.state = 'unavailable'; return; }
    this.state = 'waiting';
    try {
      this.watchId = navigator.geolocation.watchPosition(function (p) {
        self.state = 'ok';
        self.push({ t: p.timestamp || Date.now(), lat: p.coords.latitude, lon: p.coords.longitude, acc: p.coords.accuracy || 999 });
      }, function (err) {
        self.state = err && err.code === 1 ? 'denied' : 'unavailable';
      }, { enableHighAccuracy: true, maximumAge: 1000, timeout: 15000 });
    } catch (e) { this.state = 'unavailable'; }
  },

  stop: function () {
    if (this.watchId != null) { try { navigator.geolocation.clearWatch(this.watchId); } catch (e) {} }
    this.watchId = null;
    this.state = 'off';
  }
};
