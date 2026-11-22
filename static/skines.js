/* Σκηνές κίνησης με την κύλιση: μεταμόρφωση (καρφιτσωμένη λεπίδα), οριζόντια ροή υπηρεσιών, παλέτα (OKLab),
 * παράλλαξη στηλών, βήματα που φωτίζονται, εισιτήριο με ελατήριο. Όλα μετρούν μόνο όταν η σκηνή είναι κοντά στην οθόνη. */
(function () {
  var D = document, MESH = matchMedia('(prefers-reduced-motion: reduce)').matches;
  function cl(x, a, b) { return Math.max(a, Math.min(b, x)); }
  function eio(t) { return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  function proodos(el) { var r = el.getBoundingClientRect(), d = r.height - innerHeight; return d > 0 ? cl(-r.top / d, 0, 1) : (r.top < 0 ? 1 : 0); }
  function konta(el) { var r = el.getBoundingClientRect(); return r.bottom > -innerHeight * .5 && r.top < innerHeight * 1.5; }
  var desktop = function () { return innerWidth > 734; };
  var skines = [];

  /* ── μεταμόρφωση ── */
  D.querySelectorAll('[data-metamorfosi]').forEach(function (sec) {
    var zeygi = [].slice.call(sec.querySelectorAll('.met-zeygos')), ar = sec.querySelector('[data-met-ar]'), n = zeygi.length;
    if (!n) return;
    zeygi[0].classList.add('energo');
    skines.push(function () {
      if (!desktop() || !konta(sec)) return;
      var p = proodos(sec), f = p * n, i = cl(Math.floor(f), 0, n - 1), loc = cl((f - i) * 1.18, 0, 1);
      zeygi.forEach(function (z, k) {
        z.classList.toggle('energo', k === i);
        var v = k < i ? 100 : (k > i ? 0 : 3 + 94 * eio(loc));
        z.querySelector('.pm').style.setProperty('--p', v.toFixed(2));
      });
      if (ar) ar.textContent = '0' + (i + 1);
    });
  });

  /* ── οριζόντια ροή ── */
  D.querySelectorAll('[data-ror]').forEach(function (sec) {
    var tr = sec.querySelector('[data-ror-track]'), bara = sec.querySelector('[data-ror-bara]'), imgs = sec.querySelectorAll('.ror-img');
    function megethos() { sec.style.height = desktop() ? (tr.scrollWidth - innerWidth + innerHeight) + 'px' : ''; if (!desktop()) tr.style.transform = ''; }
    megethos(); addEventListener('resize', megethos);
    skines.push(function () {
      if (!desktop() || !konta(sec)) return;
      var p = proodos(sec), dx = (tr.scrollWidth - innerWidth) * p;
      tr.style.transform = 'translate3d(' + (-dx).toFixed(1) + 'px,0,0)';
      if (bara) bara.style.setProperty('--rp', p.toFixed(4));
      imgs.forEach(function (im) { var r = im.parentNode.getBoundingClientRect(), c = (r.left + r.width / 2 - innerWidth / 2) / innerWidth; im.style.setProperty('--px', (c * -6).toFixed(2) + '%'); });
    });
  });

  /* ── παλέτα: παρεμβολή στο OKLab ── */
  function hex2lin(h) { var n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(function (v) { v /= 255; return v <= .04045 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }); }
  function lin2oklab(c) {
    var l = Math.cbrt(.4122214708 * c[0] + .5363325363 * c[1] + .0514459929 * c[2]), m = Math.cbrt(.2119034982 * c[0] + .6806995451 * c[1] + .1073969566 * c[2]), s = Math.cbrt(.0883024619 * c[0] + .2817188376 * c[1] + .6299787005 * c[2]);
    return [.2104542553 * l + .793617785 * m - .0040720468 * s, 1.9779984951 * l - 2.428592205 * m + .4505937099 * s, .0259040371 * l + .7827717662 * m - .808675766 * s];
  }
  function oklab2hex(L) {
    var l = Math.pow(L[0] + .3963377774 * L[1] + .2158037573 * L[2], 3), m = Math.pow(L[0] - .1055613458 * L[1] - .0638541728 * L[2], 3), s = Math.pow(L[0] - .0894841775 * L[1] - 1.291485548 * L[2], 3);
    var rgb = [4.0767416621 * l - 3.3077115913 * m + .2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - .3413193965 * s, -.0041960863 * l - .7034186147 * m + 1.707614701 * s];
    return '#' + rgb.map(function (v) { v = v <= .0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - .055; v = Math.round(cl(v, 0, 1) * 255); return (v < 16 ? '0' : '') + v.toString(16); }).join('');
  }
  D.querySelectorAll('[data-paleta]').forEach(function (sec) {
    var xr = JSON.parse(sec.dataset.xromata).map(function (h) { return lin2oklab(hex2lin(h)); }), li = sec.querySelectorAll('[data-pal-i]'), n = xr.length;
    skines.push(function () {
      if (!desktop() || !konta(sec)) return;
      var p = proodos(sec), f = cl(p * (n - 1) * 1.08 - .04, 0, n - 1), i = Math.floor(f), t = eio(f - i), j = Math.min(n - 1, i + 1);
      var L = [0, 1, 2].map(function (k) { return xr[i][k] + (xr[j][k] - xr[i][k]) * t; });
      // ανοιχτά χρώματα → σκούρο κείμενο· σκούρα → φόντο το πολύ L 0,46 ώστε το κρέμ να έχει ≥ 4,5:1
      var light = L[0] > .74, bg = light ? [Math.max(.8, L[0] * .98), L[1] * .9, L[2] * .9] : [Math.min(.46, L[0] * .8), L[1] * .95, L[2] * .95];
      var strand = [Math.min(.9, L[0] * 1.1), L[1], L[2]], tip = [Math.min(.95, L[0] * 1.3), L[1] * .75, L[2] * .75];
      if (light) { strand = [L[0] * .62, L[1], L[2]]; tip = [L[0] * .8, L[1], L[2]]; }
      sec.style.setProperty('--pal-bg', oklab2hex(bg));
      sec.style.setProperty('--pal-c', oklab2hex(strand));
      sec.style.setProperty('--pal-c2', oklab2hex(tip));
      sec.style.setProperty('--pal-fg', light ? '#14100b' : '#f1ece2');
      var a = Math.round(f); li.forEach(function (x, k) { x.classList.toggle('energo', k === a); });
    });
  });

  /* ── παράλλαξη στηλών ── */
  D.querySelectorAll('[data-parallaxi]').forEach(function (sec) {
    var st = sec.querySelectorAll('[data-par]');
    skines.push(function () {
      if (!desktop() || !konta(sec)) { st.forEach(function (s) { s.style.transform = ''; }); return; }
      var r = sec.getBoundingClientRect(), c = (r.top + r.height / 2 - innerHeight / 2);
      st.forEach(function (s) { s.style.transform = 'translate3d(0,' + (c * parseFloat(s.dataset.par)).toFixed(1) + 'px,0)'; });
    });
  });

  /* ── βήματα ── */
  D.querySelectorAll('[data-vimata]').forEach(function (ol) {
    var v = ol.querySelectorAll('[data-vima]'), n = v.length; ol.style.setProperty('--n', n);
    skines.push(function () {
      if (!konta(ol)) return;
      var r = ol.getBoundingClientRect(), p = cl((innerHeight * .85 - r.top) / (innerHeight * .5), 0, 1);
      ol.style.setProperty('--vp', p.toFixed(3));
      v.forEach(function (x, i) { x.classList.toggle('energo', p >= (n > 1 ? i / (n - 1) : 0) - .02); });
    });
  });

  /* ── εισιτήριο: πέφτει και κουμπώνει με ελατήριο, μόλις φανεί ── */
  D.querySelectorAll('[data-eisitirio]').forEach(function (e) {
    if (MESH) { e.classList.add('vis'); return; }
    var o = new IntersectionObserver(function (en) {
      if (!en[0].isIntersecting) return; o.disconnect();
      var sp = window.Elatirio ? Elatirio(0.48, 10, 50) : { x: [0, 1], T: 900 };
      var kf = sp.x.map(function (x) { return { transform: 'translateY(' + (-60 * (1 - x)).toFixed(2) + 'px) rotate(' + (-3 * (1 - x)).toFixed(3) + 'deg)', opacity: Math.min(1, x * 2.2) }; });
      e.classList.add('vis');
      if (e.animate) e.animate(kf, { duration: sp.T, easing: 'linear' });
    }, { threshold: .5 });
    o.observe(e);
  });

  if (MESH) { skines.forEach(function (f) { try { f(); } catch (e) {} }); return; }
  var tick = false;
  function run() { tick = false; for (var i = 0; i < skines.length; i++) skines[i](); }
  function req() { if (!tick) { tick = true; requestAnimationFrame(run); } }
  addEventListener('scroll', req, { passive: true }); addEventListener('resize', req); run();
})();
