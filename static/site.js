/* Κοινή συμπεριφορά: κεφαλίδα, μενού κινητού, εμφανίσεις, πρώτη οθόνη, λεπίδες πριν/μετά, χάρτης, φίλτρα. */
(function () {
  var D = document, H = D.documentElement, MESH = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var EN = H.lang === 'en'; function T(el, en) { return EN ? en : el; }
  H.setAttribute('data-kinisi', 'ok');
  window.Pafsi = function () { return MESH; };

  /* ελατήριο: προϋπολογισμένα καρέ για Web Animations (ζ, ω σε rad/s) */
  window.Elatirio = function (zeta, omega, n) {
    n = n || 60; var out = [], wd = omega * Math.sqrt(1 - zeta * zeta), T = 0;
    for (var i = 0; i <= n; i++) {
      var t = i / n * (4.6 / (zeta * omega));
      out.push(1 - Math.exp(-zeta * omega * t) * (Math.cos(wd * t) + (zeta * omega / wd) * Math.sin(wd * t)));
      T = t;
    }
    return { x: out, T: T * 1000 };
  };

  function ready(fn) { D.readyState === 'loading' ? D.addEventListener('DOMContentLoaded', fn) : fn(); }
  ready(function () {
    if (location.pathname.indexOf('/kratisi') !== -1) D.body.classList.add('selida-kratisis');

    /* κεφαλίδα + κάτω μπάρα */
    var kef = D.querySelector('[data-kefalida]'), hero = D.querySelector('.hero, .yp-hero, .sel-hero, .an-hero');
    var topiki = D.querySelector('[data-topiki]');
    function onScroll() {
      var y = scrollY, hh = hero ? hero.offsetHeight : 0;
      kef.classList.toggle('gemati', y > 24 || !hero);
      D.body.classList.toggle('bara-orati', y > Math.max(hh * 0.7, 300));
      if (topiki) topiki.classList.toggle('orati', y > hh - 80);
    }
    var kefRaf = 0;
    addEventListener('scroll', function () { if (!kefRaf) kefRaf = requestAnimationFrame(function () { kefRaf = 0; onScroll(); }); }, { passive: true }); onScroll();

    /* χρυσή λάμψη: παίζει δύο φορές μόλις φανεί το στοιχείο (όχι συνεχώς) */
    var lio = new IntersectionObserver(function (en) { en.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('lampei'); lio.unobserve(e.target); } }); }, { threshold: .4 });
    D.querySelectorAll('.hero-t em').forEach(function (e) { lio.observe(e); });

    /* μενού κινητού: Χ, φόντο, Esc, σάρωση δεξιά */
    var hr = D.querySelector('.hero');
    if (hr) new IntersectionObserver(function (en) { hr.classList.toggle('orato', en[0].isIntersecting); }).observe(hr);

    var btn = D.querySelector('.menou-btn'), men = D.getElementById('menou'), fonto = D.querySelector('.menou-fonto');
    function kleise() { btn.setAttribute('aria-expanded', 'false'); btn.setAttribute('aria-label', T('Άνοιγμα μενού', 'Open menu')); men.classList.remove('anoixto'); fonto.hidden = true; }
    function anoixe() { btn.setAttribute('aria-expanded', 'true'); btn.setAttribute('aria-label', T('Κλείσιμο μενού', 'Close menu')); men.classList.add('anoixto'); fonto.hidden = false; }
    if (btn) {
      btn.addEventListener('click', function () { btn.getAttribute('aria-expanded') === 'true' ? kleise() : anoixe(); });
      fonto.addEventListener('click', kleise);
      fonto.addEventListener('wheel', kleise, { passive: true }); fonto.addEventListener('touchmove', kleise, { passive: true });
      D.addEventListener('keydown', function (e) { if (e.key === 'Escape') kleise(); });
      var sx = 0; men.addEventListener('touchstart', function (e) { sx = e.touches[0].clientX; }, { passive: true });
      men.addEventListener('touchend', function (e) { if (Math.abs(e.changedTouches[0].clientX - sx) > 60) kleise(); }, { passive: true });
      men.querySelectorAll('a').forEach(function (a) { a.addEventListener('click', kleise); });
    }

    /* εμφανίσεις: μόνο όταν το στοιχείο μπαίνει πραγματικά στην οθόνη, διαδοχικά */
    var rev = D.querySelectorAll('[data-reveal], .xoro, [data-melos]');
    if (MESH || !('IntersectionObserver' in window)) { rev.forEach(function (e) { e.classList.add('vis'); }); }
    else {
      var oura = [], timer = 0;
      function adeiase() { timer = 0; oura.splice(0).forEach(function (e, i) { e.style.setProperty('--d', (i * 0.09) + 's'); e.classList.add('vis'); }); }
      // οι τίτλοι κρύβονται με clip-path, που το IntersectionObserver μετρά ως «αόρατο»· παρακολουθείται ο γονέας τους
      var stoxos = new Map();
      var io = new IntersectionObserver(function (en) {
        en.forEach(function (x) { if (x.isIntersecting) { (stoxos.get(x.target) || [x.target]).forEach(function (e) { oura.push(e); }); stoxos.delete(x.target); io.unobserve(x.target); } });
        if (oura.length && !timer) timer = setTimeout(adeiase, 40);
      }, { rootMargin: '0px 0px -12% 0px', threshold: 0 });
      rev.forEach(function (e) {
        var t = e.classList.contains('titlos') ? e.parentElement : e;
        if (t !== e) { if (!stoxos.has(t)) stoxos.set(t, []); stoxos.get(t).push(e); }
        io.observe(t);
      });
    }

    /* πρώτη οθόνη: γραμμές τίτλου διαδοχικά */
    var h = D.querySelector('.hero');
    if (h) {
      if (MESH) h.classList.add('vis');
      else {
        var gr = h.querySelectorAll('.hero-t .gr > span'), seira = [h.querySelector('.hero-onoma')].concat([].slice.call(gr), [h.querySelector('.hero-lead'), h.querySelector('.hero-en')]);
        seira.forEach(function (e, i) { if (e) e.style.transitionDelay = (0.08 + i * 0.11) + 's'; });
        requestAnimationFrame(function () { h.classList.add('paizei'); requestAnimationFrame(function () { h.classList.add('vis'); }); });
      }
    }

    /* οι λεπίδες πριν/μετά κινούνται μόνο με την κύλιση: skines.js */

    /* χάρτης μόνο με πάτημα */
    D.querySelectorAll('[data-xartis]').forEach(function (x) {
      x.querySelector('button').addEventListener('click', function () {
        var f = D.createElement('iframe'); f.src = x.dataset.src; f.title = x.dataset.titlos || 'Map'; f.loading = 'lazy';
        f.referrerPolicy = 'no-referrer-when-downgrade'; x.innerHTML = ''; x.classList.add('anoixtos'); x.appendChild(f);
      });
    });

    /* φίλτρα δουλειών */
    var fl = D.querySelector('[data-filtra]'), pl = D.querySelector('[data-filtro-plegma]');
    if (fl && pl) fl.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      fl.querySelectorAll('button').forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
      var f = b.dataset.filtro, go = function () { pl.querySelectorAll('.douleia').forEach(function (d) { d.hidden = f !== 'ola' && d.dataset.omada !== f; }); };
      D.startViewTransition && !MESH ? D.startViewTransition(go) : go();
    });

    /* κινήσεις σε βρόχο: μόνο όταν φαίνονται */
    D.querySelectorAll('[data-marquee], [data-kar]').forEach(function (m) {
      new IntersectionObserver(function (en) { m.classList.toggle('orato', en[0].isIntersecting); }).observe(m);
    });
  });
})();
