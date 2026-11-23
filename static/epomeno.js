/* «Επόμενο ελεύθερο ραντεβού»: φορτώνει τον μηχανισμό μόνο όταν χρειαστεί (εισιτήριο ή πρώτη οθόνη),
 * ρωτά το API και γεμίζει το εισιτήριο. Χωρίς απάντηση σε 1,5 s μένει το «Κλείσε online σε 1 λεπτό». */
(function () {
  var D = document, base = (window.SALON || {}).base || '', EN = D.documentElement.lang === 'en', pre = base + (EN ? '/en' : '');
  function T(el, en) { return EN ? en : el; }
  var stoxoi = D.querySelectorAll('[data-eisitirio], [data-epomeno-hero]');
  if (!stoxoi.length) return;
  var IM = T(['Κυριακή', 'Δευτέρα', 'Τρίτη', 'Τετάρτη', 'Πέμπτη', 'Παρασκευή', 'Σάββατο'], ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']);
  function fortose(src) { return new Promise(function (ok, no) { if (src === 'diathesimotita.js' && window.Diathesimotita) return ok(); if (src === 'kratisi-api.js' && window.KratisiApi) return ok();
    var s = D.createElement('script'); s.src = base + '/static/' + src + ((window.SALON || {}).v ? '?v=' + window.SALON.v : ''); s.onload = ok; s.onerror = no; D.head.appendChild(s); }); }
  function mera(iso, tora) {
    if (iso === tora) return T('Σήμερα', 'Today');
    var p = iso.split('-'), d = new Date(+p[0], +p[1] - 1, +p[2]), t = tora.split('-'), td = new Date(+t[0], +t[1] - 1, +t[2]);
    var diff = Math.round((d - td) / 864e5);
    if (diff === 1) return T('Αύριο', 'Tomorrow');
    return IM[d.getDay()] + ' ' + (+p[2]) + '/' + (+p[1]);
  }
  var egine = false;
  function trexe() {
    if (egine) return; egine = true;
    var timeout = new Promise(function (ok) { setTimeout(function () { ok(null); }, 4000); });
    Promise.race([fortose('diathesimotita.js').then(function () { return fortose('kratisi-api.js'); }).then(function () { return KratisiApi.epomeno(); }), timeout])
      .then(function (r) {
        if (!r || !r.ok) return;
        var m = mera(r.imerominia, KratisiApi.toraAthina().imerominia), href = pre + '/kratisi/?y=' + encodeURIComponent(r.ypiresia) + '&k=' + encodeURIComponent(r.kommotis_id) + '&d=' + r.imerominia + '&w=' + r.ora;
        D.querySelectorAll('[data-epomeno-ora]').forEach(function (e) { e.textContent = m + ', ' + r.ora; });
        D.querySelectorAll('[data-epomeno-k]').forEach(function (e) { e.textContent = (r.me || (EN ? r.me_en : r.me_el) || '') + T(' · για κούρεμα', ' · for a haircut'); });
        D.querySelectorAll('[data-epomeno-link]').forEach(function (e) { e.href = href; });
        D.querySelectorAll('[data-epomeno-hero]').forEach(function (e) { e.innerHTML = T('Επόμενο ελεύθερο: ', 'Next available: ') + '<strong>' + m + ', ' + r.ora + '</strong> · <a href="' + href + '">' + T('κράτησέ το ›', 'book it ›') + '</a>'; e.hidden = false; });
      }).catch(function () {});
  }
  if (!('IntersectionObserver' in window)) return trexe();
  var o = new IntersectionObserver(function (en) { if (en.some(function (x) { return x.isIntersecting; })) { o.disconnect(); trexe(); } }, { rootMargin: '300px' });
  stoxoi.forEach(function (s) { o.observe(s); });
})();
