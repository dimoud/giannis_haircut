/* Σκηνές κίνησης με την κύλιση: πριν/μετά (η γραμμή ακολουθεί μόνο την κύλιση), χρυσή σπείρα,
 * βήματα που φωτίζονται, εισιτήριο με ελατήριο.
 * Κάθε καρέ γίνεται σε δύο φάσεις: πρώτα ΟΛΕΣ οι αναγνώσεις διάταξης, μετά ΟΛΕΣ οι εγγραφές
 * (μόνο transform/μεταβλητές CSS), ώστε να μην αναγκάζεται ο φυλλομετρητής σε επαναυπολογισμό στη μέση. */
(function () {
  var D = document, MESH = matchMedia('(prefers-reduced-motion: reduce)').matches;
  function cl(x, a, b) { return Math.max(a, Math.min(b, x)); }
  function eio(t) { return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  var skines = [], vh = innerHeight, desktop = innerWidth > 1068;
  addEventListener('resize', function () { vh = innerHeight; desktop = innerWidth > 1068; req(); });

  /* ── πριν / μετά ──
   * στις σειρές της αρχικής (υπολογιστής): η σειρά είναι ψηλή και καρφιτσωμένη· η πρόοδός της οδηγεί τη γραμμή.
   * αλλού και στο κινητό: η γραμμή προχωρά όσο η φωτογραφία περνά από τη μέση της οθόνης. */
  D.querySelectorAll('[data-pm]').forEach(function (pm) {
    var row = pm.closest('[data-al]'), fotos = pm.querySelector('.pm-fotos'), last = -1, r = null, rr = null;
    skines.push({
      read: function () { r = pm.getBoundingClientRect(); rr = row && desktop ? row.getBoundingClientRect() : null; },
      write: function () {
        if (r.bottom < -vh * .3 || r.top > vh * 1.3) return;
        if (row && !row.classList.contains('al-on') && r.top < vh * .75) row.classList.add('al-on');
        var t;
        if (rr) { var d = rr.height - vh; t = cl((d > 0 ? -rr.top / d : 0) - .06, 0, .74) / .74; }
        else t = cl((vh * .88 - (r.top + r.height / 2)) / (vh * .6), 0, 1);
        var v = Math.round((2 + 96 * eio(t)) * 10) / 10;
        if (v === last) return; last = v;
        fotos.style.setProperty('--p', v);
        if (row) row.classList.toggle('al-meta-on', v > 60);
      }
    });
  });

  /* ── χρυσή σπείρα: σχεδιάζεται όσο διαβάζεις την ενότητα και ολοκληρώνεται πριν φύγει από την οθόνη ──
   * υπολογιστής: η σπείρα μένει καρφιτσωμένη στη μέση· η πρόοδος μετριέται στη στήλη του κειμένου.
   * κινητό: ολοκληρώνεται όταν το κέντρο της φτάσει στη μέση της οθόνης. */
  D.querySelectorAll('[data-spira]').forEach(function (el) {
    if (MESH) { el.style.setProperty('--sp', '1'); return; }
    var r = null, last = -1;
    skines.push({
      read: function () { r = el.getBoundingClientRect(); },
      write: function () {
        if (r.bottom < 0 || r.top > vh) return;
        // ολοκληρώνεται όταν το κέντρο της φτάσει λίγο κάτω από τη μέση της οθόνης: πάντα ολόκληρη όσο φαίνεται
        var t = Math.round(eio(cl((vh - r.top) / (vh * .45 + r.height * .5), 0, 1)) * 1000) / 1000;
        if (t !== last) { last = t; el.style.setProperty('--sp', t); }
      }
    });
  });

  /* ── βήματα (υποσελίδες υπηρεσιών) ── */
  D.querySelectorAll('[data-vimata]').forEach(function (ol) {
    var v = ol.querySelectorAll('[data-vima]'), n = v.length, r = null, last = -1; ol.style.setProperty('--n', n);
    skines.push({
      read: function () { r = ol.getBoundingClientRect(); },
      write: function () {
        if (r.bottom < 0 || r.top > vh) return;
        var p = Math.round(cl((vh * .85 - r.top) / (vh * .5), 0, 1) * 1000) / 1000;
        if (p === last) return; last = p;
        ol.style.setProperty('--vp', p);
        v.forEach(function (x, i) { x.classList.toggle('energo', p >= (n > 1 ? i / (n - 1) : 0) - .02); });
      }
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

  var tick = false, i;
  function run() { tick = false; for (i = 0; i < skines.length; i++) skines[i].read(); for (i = 0; i < skines.length; i++) skines[i].write(); }
  function req() { if (!tick) { tick = true; requestAnimationFrame(run); } }
  addEventListener('scroll', req, { passive: true }); run();
})();
