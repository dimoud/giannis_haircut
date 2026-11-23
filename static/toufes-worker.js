/* Worker των τουφών: σχεδιάζει σε OffscreenCanvas, εκτός κύριου νήματος. */
var v = (self.location.search.match(/v=([^&]+)/) || [])[1];
importScripts('toufes-mixani.js' + (v ? '?v=' + v : ''));
var eng = null, running = false, last = 0, t0 = 0, timer = 0;
var raf = self.requestAnimationFrame ? function (f) { return self.requestAnimationFrame(f); } : function (f) { return setTimeout(function () { f(performance.now()); }, 16); };
var caf = self.cancelAnimationFrame ? function (h) { self.cancelAnimationFrame(h); } : function (h) { clearTimeout(h); };
function loop(now) {
  timer = 0; if (!running) return;
  var dt = Math.min(0.033, (now - last) / 1000); last = now;
  eng.frame(dt, (now - t0) / 1000);
  timer = raf(loop);
}
self.onmessage = function (e) {
  var m = e.data;
  if (m.t === 'init') {
    var ctx = ToufesCtx(m.canvas, m.opt.dokimi);
    eng = ToufesMixani(ctx, m.opt); t0 = performance.now();
    eng.build(m.W, m.H, m.dpr);
  } else if (!eng) return;
  else if (m.t === 'size') eng.build(m.W, m.H, m.dpr);
  else if (m.t === 'p') eng.setP(m.p, m.amesa);
  else if (m.t === 'ptr') eng.pointer(m.x, m.y, m.on);
  else if (m.t === 'run') {
    if (m.on && !running) { running = true; last = performance.now(); timer = raf(loop); }
    else if (!m.on) { running = false; if (timer) caf(timer); timer = 0; }
  }
};
