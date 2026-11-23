/* «Τούφες» — υπογραφή πρώτης οθόνης (πλευρά σελίδας).
 * Η προσομοίωση και η σχεδίαση γίνονται σε Worker με OffscreenCanvas, ώστε η κύλιση να μένει στα 60 καρέ
 * ακόμη κι αν ο καμβάς είναι βαρύς· όπου δεν υποστηρίζεται, η ίδια μηχανή (toufes-mixani.js) τρέχει εδώ.
 * Τρέχει μόνο όταν ο καμβάς φαίνεται· «λιγότερη κίνηση» → μία στατική, ισορροπημένη εικόνα. */
(function () {
  var MESH = matchMedia('(prefers-reduced-motion: reduce)').matches, S = window.SALON || {};

  function Toufes(cv) {
    var mikro = cv.hasAttribute('data-mikro'), hero = cv.closest('.hero, .yp-hero, .sel-hero');
    var ind = document.querySelector('[data-sx-p]'), tint = null, W = 0, H = 0, visible = false, worker = null, eng = null;
    if (hero) {
      var yc = getComputedStyle(hero).getPropertyValue('--yc').trim();
      if (/^#([0-9a-f]{6})$/i.test(yc)) { var n = parseInt(yc.slice(1), 16); tint = [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
    }
    var r = cv.getBoundingClientRect(); W = r.width; H = r.height;
    if (!W || !H) return;
    function dprFor(w) { return Math.min(window.devicePixelRatio || 1, w < 735 ? 1.25 : 1.5); }
    var opt = { mikro: mikro, mesh: MESH, tint: tint, dokimi: /[?&]gl=1/.test(location.search) };

    var canWorker = !MESH && 'transferControlToOffscreen' in cv && typeof Worker !== 'undefined';
    if (canWorker) {
      try {
        worker = new Worker((S.base || '') + '/static/toufes-worker.js' + (S.v ? '?v=' + S.v : ''));
        var off = cv.transferControlToOffscreen();
        worker.postMessage({ t: 'init', canvas: off, W: W, H: H, dpr: dprFor(W), opt: opt }, [off]);
      } catch (e) { worker = null; }
    }
    if (!worker) {
      if (!window.ToufesMixani) return;
      eng = ToufesMixani(ToufesCtx(cv, opt.dokimi), opt); eng.build(W, H, dprFor(W));
    }
    function send(m) { if (worker) worker.postMessage(m); }

    // εναλλακτική στο κύριο νήμα
    var running = false, raf = 0, last = 0, t0 = performance.now();
    function loop(now) {
      raf = 0; if (!running) return;
      var dt = Math.min(0.033, (now - last) / 1000); last = now;
      eng.frame(dt, (now - t0) / 1000);
      raf = requestAnimationFrame(loop);
    }
    function trexei(on) {
      if (MESH) return;
      if (worker) { send({ t: 'run', on: on }); return; }
      if (on && !running) { running = true; last = performance.now(); raf = requestAnimationFrame(loop); }
      else if (!on) { running = false; if (raf) cancelAnimationFrame(raf); raf = 0; }
    }

    // κύλιση → χρώμα balayage (μία ανάγνωση ανά καρέ)
    var sRaf = 0, hh = hero ? hero.offsetHeight : 1;
    function onScroll() {
      sRaf = 0; if (!hero || mikro) return;
      var p = Math.max(0.12, Math.min(1, scrollY / (hh * 0.65)));
      if (ind) ind.textContent = Math.round(p * 100);
      if (worker) send({ t: 'p', p: p, amesa: MESH }); else eng.setP(p, MESH);
    }
    addEventListener('scroll', function () { if (!sRaf) sRaf = requestAnimationFrame(onScroll); }, { passive: true });

    // δείκτης = χτένα (μόνο ποντίκι· στην αφή η σελίδα κυλά ελεύθερα)
    var target = hero || cv, rect = null;
    function pos(e) { rect = rect || cv.getBoundingClientRect(); return [e.clientX - rect.left, e.clientY - rect.top]; }
    addEventListener('scroll', function () { rect = null; }, { passive: true });
    target.addEventListener('pointermove', function (e) {
      if (e.pointerType !== 'mouse') return;
      var q = pos(e); if (worker) send({ t: 'ptr', x: q[0], y: q[1], on: true }); else eng.pointer(q[0], q[1], true);
    }, { passive: true });
    target.addEventListener('pointerleave', function () { if (worker) send({ t: 'ptr', on: false }); else eng.pointer(0, 0, false); }, { passive: true });

    new IntersectionObserver(function (en) { visible = en[0].isIntersecting; trexei(visible && !document.hidden); }, { rootMargin: '80px' }).observe(cv);
    document.addEventListener('visibilitychange', function () { trexei(visible && !document.hidden); });
    var rt; addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(function () {
      var r2 = cv.getBoundingClientRect(); rect = null; if (hero) hh = hero.offsetHeight;
      if (Math.abs(r2.width - W) > 40 || Math.abs(r2.height - H) > 120) {
        W = r2.width; H = r2.height;
        if (worker) send({ t: 'size', W: W, H: H, dpr: dprFor(W) }); else eng.build(W, H, dprFor(W));
      }
    }, 200); });
    onScroll();
  }
  function init() { document.querySelectorAll('canvas[data-toufes]').forEach(function (c) { try { Toufes(c); } catch (e) { console.warn('toufes', e); } }); }
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', init) : init();
})();
