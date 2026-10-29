/* Q-Safe Monitor — QSF104 블루투스 줄 조립·해석 (펌웨어 V7.8 / V7.9)
 *
 *  $QSF,선량률,CPM,오차%,경보,누적uSv,배터리,온도,평균,배터리mV[,2초선량률]   2초마다
 *  $QSFI,모델,시리얼,펌웨어,경보값                                           연결 직후, 1분마다
 *  HM-17 은 BLE 알림을 20바이트씩 나눠 보내므로 '\n' 까지 모아서 한 줄로 만든다.
 */
var QS = window.QS || (window.QS = {});

QS.LineAssembler = function (onLine) {
  this.buf = '';
  this.onLine = onLine;
};
QS.LineAssembler.prototype.push = function (bytes) {
  for (var i = 0; i < bytes.length; i++) this.buf += String.fromCharCode(bytes[i]);
  var p;
  while ((p = this.buf.indexOf('\n')) >= 0) {
    var line = this.buf.slice(0, p).replace(/[\r\0]/g, '').trim();
    this.buf = this.buf.slice(p + 1);
    var k = line.search(/[$#]/);              // '$' / '#' 앞의 글자(AT 응답 등)는 버림
    if (k < 0) continue;
    line = line.slice(k);
    if (line) this.onLine(line);
  }
  if (this.buf.length > 512) this.buf = '';  // 줄바꿈 없이 쌓이면 비움
};

QS.parseLine = function (line) {
  var f = line.trim().split(',');
  var n = function (i) { return (i < f.length && f[i] !== '' && isFinite(+f[i])) ? +f[i] : NaN; };
  if (f[0] === '$QSF' && f.length >= 8) {
    var v = [1, 2, 3, 4, 5, 6, 7].map(n);
    if (v.some(isNaN)) return null;
    return {
      type: 'data', rate: v[0], cpm: v[1], err: v[2], alarm: v[3], dose: v[4], bat: v[5], temp: v[6],
      avg: isNaN(n(8)) ? -1 : n(8),          // 0 = 4초, 1 = 20초, 2 = 2분 (-1 = 모름)
      mv: isNaN(n(9)) ? -1 : n(9),           // 배터리 mV (V7.6~)
      rate2: isNaN(n(10)) ? null : n(10)     // 최근 2초 선량률 (V7.9~)
    };
  }
  if (f[0] === '$QSFI' && f.length >= 4) {
    return { type: 'info', model: f[1], serial: f[2], fw: f[3], alarmLv: isNaN(n(4)) ? 0 : n(4) };
  }
  return null;
};
