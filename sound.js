/* Q-Safe Monitor — 경보음 (파일 없이 Web Audio 로 만듦) · 진동
 *  아이폰은 사용자가 화면을 누른 뒤에만 소리를 낼 수 있어 첫 터치 때 소리를 켠다.
 */
var QS = window.QS || (window.QS = {});

QS.Snd = {
  ctx: null,
  unlock: function () {
    if (!this.ctx) { try { var C = window.AudioContext || window.webkitAudioContext; if (C) this.ctx = new C(); } catch (e) {} }
    if (this.ctx && this.ctx.state === 'suspended') { try { this.ctx.resume(); } catch (e) {} }
  },
  tone: function (f, t0, dur, vol, type) {
    var c = this.ctx, o = c.createOscillator(), g = c.createGain();
    o.type = type || 'sine'; o.frequency.value = f;
    g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(vol, t0 + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(c.destination); o.start(t0); o.stop(t0 + dur + 0.02);
  },
  /* 기기 소리와 같은 모양 : 주의 띵-동, 위험 3+2 펄스 */
  play: function (kind) {
    this.unlock();
    if (!this.ctx || this.ctx.state !== 'running') return;
    var t0 = this.ctx.currentTime + 0.03, i;
    if (kind === 'caution') { this.tone(880, t0, 0.4, 0.22); this.tone(660, t0 + 0.42, 0.55, 0.22); }
    else if (kind === 'danger') { for (i = 0; i < 3; i++) this.tone(1320, t0 + i * 0.16, 0.1, 0.18, 'square'); for (i = 0; i < 2; i++) this.tone(1320, t0 + 0.7 + i * 0.16, 0.1, 0.18, 'square'); }
    else if (kind === 'rise') { this.tone(1040, t0, 0.12, 0.22); this.tone(1040, t0 + 0.2, 0.12, 0.22); }
    else if (kind === 'lost') { this.tone(440, t0, 0.25, 0.22); this.tone(330, t0 + 0.3, 0.4, 0.22); }
  },
  vibrate: function (kind) {
    try { if (navigator.vibrate) navigator.vibrate(kind === 'danger' ? [300, 120, 300, 120, 300] : [200]); } catch (e) {}
  }
};
document.addEventListener('pointerdown', function () { QS.Snd.unlock(); }, { passive: true });
