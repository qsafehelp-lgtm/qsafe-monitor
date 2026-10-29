/* Q-Safe Monitor — Web Bluetooth 연결 (HM-17 투명 UART : 서비스 FFE0, 특성 FFE1)
 *  읽기 전용 : 알림(Notify)만 켜고, 기기로는 아무것도 쓰지 않는다.
 *  연결이 끊기면 사용자가 [연결 끊기] 를 누를 때까지 2~15초 간격으로 다시 연결한다.
 */
var QS = window.QS || (window.QS = {});

QS.Ble = {
  SERVICE: 0xffe0,
  CHAR: 0xffe1,
  dev: null, ch: null, want: false, timer: null, delay: 2000, asm: null,
  onLine: function () {}, onState: function () {},

  supported: function () { return !!(navigator.bluetooth && navigator.bluetooth.requestDevice); },

  request: function (showAll) {
    var self = this;
    var opts = showAll
      ? { acceptAllDevices: true, optionalServices: [this.SERVICE] }
      : { filters: [{ namePrefix: 'QSF' }, { services: [this.SERVICE] }], optionalServices: [this.SERVICE] };
    return navigator.bluetooth.requestDevice(opts).then(function (dev) {
      self.dev = dev;
      self.want = true;
      self.asm = new QS.LineAssembler(function (l) { self.onLine(l); });
      dev.addEventListener('gattserverdisconnected', function () { self._lost(); });
      return self._connect();
    });
  },

  _connect: function () {
    var self = this;
    this.onState('connecting');
    return this.dev.gatt.connect()
      .then(function (server) { return server.getPrimaryService(self.SERVICE); })
      .then(function (svc) { return svc.getCharacteristic(self.CHAR); })
      .then(function (ch) {
        self.ch = ch;
        ch.addEventListener('characteristicvaluechanged', function (e) {
          var dv = e.target.value;
          self.asm.push(new Uint8Array(dv.buffer, dv.byteOffset, dv.byteLength));
        });
        return ch.startNotifications();
      })
      .then(function () { self.delay = 2000; self.onState('connected', self.dev.name || 'QSF104'); });
  },

  _lost: function () {
    this.ch = null;
    if (!this.want) return;
    this.onState('reconnecting');
    this._retry();
  },

  _retry: function () {
    var self = this;
    clearTimeout(this.timer);
    this.timer = setTimeout(function () {
      if (!self.want || !self.dev) return;
      self._connect().catch(function () {
        self.delay = Math.min(15000, Math.round(self.delay * 1.5));
        self.onState('reconnecting');
        self._retry();
      });
    }, this.delay);
  },

  disconnect: function () {
    this.want = false;
    clearTimeout(this.timer);
    try { if (this.dev && this.dev.gatt.connected) this.dev.gatt.disconnect(); } catch (e) {}
    this.dev = null;
    this.ch = null;
  }
};
