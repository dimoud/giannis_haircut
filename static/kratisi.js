/* Εφαρμογή κράτησης: Υπηρεσία → Κομμωτής → Ημέρα/ώρα → Στοιχεία → Επιβεβαίωση. Και σελίδα αλλαγής/ακύρωσης. */
(function () {
  var D = document, S = window.SALON || {}, base = S.base || '', EN = D.documentElement.lang === 'en', pre = base + (EN ? '/en' : '');
  function T(el, en) { return EN ? en : el; }
  var IM = T(['Κυρ', 'Δευ', 'Τρι', 'Τετ', 'Πεμ', 'Παρ', 'Σαβ'], ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']);
  var IMP = T(['Κυριακή', 'Δευτέρα', 'Τρίτη', 'Τετάρτη', 'Πέμπτη', 'Παρασκευή', 'Σάββατο'], ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']);
  var MHN = T(['Ιαν', 'Φεβ', 'Μαρ', 'Απρ', 'Μαΐ', 'Ιουν', 'Ιουλ', 'Αυγ', 'Σεπ', 'Οκτ', 'Νοε', 'Δεκ'], ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']);
  function h(t, a, c) { var e = D.createElement(t); if (a) Object.keys(a).forEach(function (k) { if (k === 'text') e.textContent = a[k]; else if (k === 'html') e.innerHTML = a[k]; else if (k.slice(0, 2) === 'on') e.addEventListener(k.slice(2), a[k]); else if (a[k] !== false && a[k] != null) e.setAttribute(k, a[k]); }); (c || []).forEach(function (x) { if (x) e.appendChild(typeof x === 'string' ? D.createTextNode(x) : x); }); return e; }
  function dt(iso) { var p = iso.split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function meraPlires(iso) { var d = dt(iso); return IMP[d.getDay()] + ' ' + d.getDate() + ' ' + MHN[d.getMonth()]; }
  function diarkeia(m) {
    var hh = Math.floor(m / 60), r = m % 60;
    if (EN) return m < 60 ? m + ' min' : hh + ' h' + (r ? ' ' + r + ' min' : '');
    if (m < 60) return m + '΄'; return hh + (hh === 1 ? ' ώρα' : ' ώρες') + (r ? ' ' + r + '΄' : '');
  }
  function q(k) { return new URLSearchParams(location.search).get(k); }
  function track(ev, p) { if (window.gtag) gtag('event', ev, p || {}); }

  var rizaK = D.querySelector('[data-kratisi]'), rizaA = D.querySelector('[data-allagi]');
  if (!rizaK && !rizaA) return;
  KratisiApi.katalogos().then(function (kat) { rizaK ? efarmogi(kat) : allagi(kat); });

  function ymap(kat) { var m = {}; kat.omades.forEach(function (g) { g.ypiresies.forEach(function (y) { m[y.id] = y; }); }); return m; }
  function synolo(kat, ids) { var m = ymap(kat); return ids.reduce(function (a, i) { return a + (m[i] ? Diathesimotita.synoliki(Diathesimotita.tmimata(m[i].tmimata)) : 0); }, 0); }

  /* ── επιλογή ημέρας/ώρας (κοινή για κράτηση και αλλαγή) ── */
  function epilogiOras(kat, ids, kommotis, arxiki, onPick) {
    var wrap = h('div'), tora = KratisiApi.toraAthina().imerominia, apo = tora, cache = {}, epil = arxiki || {};
    var max = Diathesimotita.prosthesiImeron(tora, kat.kanones.orizontas_imeres);
    var nav = h('div', { class: 'kr-meres-nav' }), meres = h('div', { class: 'kr-meres', role: 'group', 'aria-label': T('Ημέρα', 'Day') }), wres = h('div', { class: 'kr-zones' });
    var piso = h('button', { type: 'button', 'aria-label': T('Προηγούμενες ημέρες', 'Previous days'), text: '‹' }), mpros = h('button', { type: 'button', 'aria-label': T('Επόμενες ημέρες', 'Next days'), text: '›' });
    var lbl = h('span', { class: 'kr-bima-ypo' });
    nav.appendChild(piso); nav.appendChild(lbl); nav.appendChild(mpros);
    wrap.appendChild(nav); wrap.appendChild(meres); wrap.appendChild(wres);
    piso.onclick = function () { if (apo > tora) { apo = Diathesimotita.prosthesiImeron(apo, -7); if (apo < tora) apo = tora; fortose(); } };
    mpros.onclick = function () { var n = Diathesimotita.prosthesiImeron(apo, 7); if (n <= max) { apo = n; fortose(); } };
    function fortose() {
      piso.disabled = apo <= tora; mpros.disabled = Diathesimotita.prosthesiImeron(apo, 7) > max;
      var d0 = dt(apo), d1 = dt(Diathesimotita.prosthesiImeron(apo, 6));
      lbl.textContent = d0.getDate() + ' ' + MHN[d0.getMonth()] + ' – ' + d1.getDate() + ' ' + MHN[d1.getMonth()];
      meres.innerHTML = ''; wres.innerHTML = '<p class="kr-fortosi">' + T('Ψάχνω ελεύθερες ώρες…', 'Finding free times…') + '</p>';
      var key = apo;
      (cache[key] ? Promise.resolve(cache[key]) : KratisiApi.diathesimotita(ids, kommotis, apo, 7)).then(function (r) {
        cache[key] = r;
        if (!r.ok) { wres.innerHTML = ''; wres.appendChild(h('p', { class: 'kr-sfalma', text: r.minima || T('Δεν μπόρεσα να φέρω τις ώρες. Κάλεσέ μας στο ', 'Could not load times. Call us on ') + S.tilefono + '.' })); return; }
        var proti = null;
        r.imeres.forEach(function (m) {
          var d = dt(m.imerominia), keni = !m.wres.length;
          var b = h('button', { type: 'button', class: 'kr-mera', 'aria-pressed': epil.imerominia === m.imerominia ? 'true' : 'false', disabled: keni ? '' : false,
            'aria-label': meraPlires(m.imerominia) + (keni ? T(', χωρίς ελεύθερες ώρες', ', no free times') : ', ' + m.wres.length + T(' ελεύθερες ώρες', ' free times')) },
            [h('small', { text: IM[d.getDay()] }), h('b', { text: String(d.getDate()) }), h('small', { text: MHN[d.getMonth()] })]);
          b.onclick = function () { epil = { imerominia: m.imerominia }; meres.querySelectorAll('.kr-mera').forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); }); deixe(m); onPick(null); };
          meres.appendChild(b);
          if (!keni && !proti) proti = m;
        });
        var trexousa = r.imeres.filter(function (m) { return m.imerominia === epil.imerominia && m.wres.length; })[0];
        if (trexousa) { deixe(trexousa); }
        else if (proti) { epil = { imerominia: proti.imerominia }; meres.querySelectorAll('.kr-mera')[r.imeres.indexOf(proti)].setAttribute('aria-pressed', 'true'); deixe(proti); }
        else { wres.innerHTML = ''; wres.appendChild(h('p', { class: 'kr-keno', text: T('Δεν υπάρχουν ελεύθερες ώρες αυτές τις ημέρες. Δοκίμασε την επόμενη εβδομάδα ή άλλον κομμωτή.', 'No free times on these days. Try next week or another stylist.') })); }
      });
    }
    function deixe(m) {
      wres.innerHTML = '';
      var zones = [[T('Πρωί', 'Morning'), 0, 12 * 60], [T('Μεσημέρι', 'Midday'), 12 * 60, 16 * 60], [T('Απόγευμα', 'Afternoon and evening'), 16 * 60, 24 * 60]], i = 0;
      zones.forEach(function (z) {
        var lista = m.wres.filter(function (w) { var l = Diathesimotita.lepta(w.ora); return l >= z[1] && l < z[2]; });
        if (!lista.length) return;
        var g = h('div', { class: 'kr-wres', role: 'group', 'aria-label': z[0] });
        lista.forEach(function (w) {
          var b = h('button', { type: 'button', class: 'kr-wra', style: '--i:' + (i++), 'aria-pressed': (epil.ora === w.ora) ? 'true' : 'false', text: w.ora });
          b.onclick = function () { wres.querySelectorAll('.kr-wra').forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); }); epil = { imerominia: m.imerominia, ora: w.ora, kommotis: w.kommotis }; onPick(epil); };
          g.appendChild(b);
        });
        wres.appendChild(h('div', { class: 'kr-zoni' }, [h('h3', { text: z[0] }), g]));
      });
      if (epil.ora) { var w0 = m.wres.filter(function (w) { return w.ora === epil.ora; })[0]; onPick(w0 ? { imerominia: m.imerominia, ora: w0.ora, kommotis: w0.kommotis } : null); }
    }
    if (epil.imerominia && epil.imerominia >= tora) { var dd = dt(epil.imerominia), off = Math.floor((dd - dt(tora)) / 864e5 / 7) * 7; apo = Diathesimotita.prosthesiImeron(tora, off); }
    fortose();
    return wrap;
  }

  /* ── κράτηση ── */
  function efarmogi(kat) {
    var m = ymap(kat), kom = {}; kat.kommotes.forEach(function (k) { kom[k.id] = k; });
    var st = { vima: 1, ypiresies: [], kommotis: null, ora: null };
    var y0 = q('y'); if (y0 && m[y0]) st.ypiresies = [y0];
    var k0 = q('k'); if (k0 && kom[k0]) st.kommotis = k0;
    if (q('d') && q('w')) st.arxiki = { imerominia: q('d'), ora: q('w') };
    if (st.ypiresies.length) st.vima = st.kommotis ? 3 : 2;
    var synopsi = D.querySelector('[data-kr-synopsi]');
    track('kratisi_enarxi');

    function zografise() {
      rizaK.innerHTML = '';
      if (KratisiApi.epideixi) rizaK.appendChild(h('p', { class: 'kr-epideixi', html: T('<strong>Λειτουργία επίδειξης.</strong> Η κράτηση δοκιμάζεται εδώ, στον περιηγητή σου, και δεν φτάνει στο κομμωτήριο. Για ραντεβού, κάλεσε στο ', '<strong>Demo mode.</strong> This booking stays in your browser and does not reach the salon. To book, call ') + '<a href="tel:' + S.tel + '">' + S.tilefono + '</a>.' }));
      var vm = h('ol', { class: 'kr-vimata', 'aria-label': T('Βήμα ', 'Step ') + st.vima + T(' από 4', ' of 4') });
      for (var i = 1; i <= 4; i++) vm.appendChild(h('li', { class: i < st.vima ? 'egine' : (i === st.vima ? 'energo' : '') }));
      rizaK.appendChild(vm);
      var sk = h('div', { class: 'kr-skini' });
      rizaK.appendChild(sk);
      [null, vima1, vima2, vima3, vima4][st.vima](sk);
      zografiseSynopsi();
      var t = sk.querySelector('h2'); if (t && zografise.ksekinise) { t.setAttribute('tabindex', '-1'); t.focus({ preventScroll: true }); rizaK.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
      zografise.ksekinise = true;
    }
    function plo(sk, epomeno, keimeno, energo) {
      var b = h('button', { type: 'button', class: 'btn', text: keimeno || T('Συνέχεια', 'Continue'), disabled: energo ? false : '' });
      b.onclick = epomeno;
      var row = h('div', { class: 'kr-plo' }, [b]);
      if (st.vima > 1) row.appendChild(h('button', { type: 'button', class: 'kr-piso', text: T('‹ Πίσω', '‹ Back'), onclick: function () { st.vima--; zografise(); } }));
      sk.appendChild(row); return b;
    }
    function vima1(sk) {
      sk.appendChild(h('h2', { class: 'kr-bima-t', text: T('Τι θα κάνουμε;', 'What can we do for you?') }));
      sk.appendChild(h('p', { class: 'kr-bima-ypo', text: T('Διάλεξε έως 3 υπηρεσίες. Γίνονται στη σειρά, στο ίδιο ραντεβού.', 'Choose up to 3 services. They are done one after the other, in the same appointment.') }));
      var anoixti = q('omada') || (st.ypiresies[0] && kat.omades.filter(function (g) { return g.ypiresies.some(function (y) { return y.id === st.ypiresies[0]; }); })[0].id) || kat.omades[0].id;
      var btn;
      kat.omades.forEach(function (g) {
        var lista = h('div', { class: 'kr-ypiresies', id: 'kr-o-' + g.id, hidden: g.id === anoixti ? false : '' });
        var epil = g.ypiresies.filter(function (y) { return st.ypiresies.indexOf(y.id) !== -1; }).length;
        var t = h('button', { type: 'button', 'aria-expanded': g.id === anoixti ? 'true' : 'false', 'aria-controls': 'kr-o-' + g.id },
          [h('span', { text: g.titlos }), h('span', { text: epil ? epil + T(' επιλογή' + (epil > 1 ? 'ές' : ''), ' selected') : g.ypiresies.length + T(' υπηρεσίες', ' services') })]);
        t.onclick = function () { var a = t.getAttribute('aria-expanded') === 'true'; t.setAttribute('aria-expanded', a ? 'false' : 'true'); lista.hidden = a; };
        g.ypiresies.forEach(function (y) {
          var cb = h('input', { type: 'checkbox', value: y.id });
          cb.checked = st.ypiresies.indexOf(y.id) !== -1;
          cb.onchange = function () {
            if (cb.checked) { if (st.ypiresies.length >= 3) { cb.checked = false; return; } st.ypiresies.push(y.id); }
            else st.ypiresies = st.ypiresies.filter(function (x) { return x !== y.id; });
            btn.disabled = !st.ypiresies.length; st.ora = null; zografiseSynopsi();
            track('kratisi_ypiresia', { ypiresia: y.id });
          };
          lista.appendChild(h('label', { class: 'kr-yp' }, [cb, h('span', { class: 'kr-yp-on', text: y.onoma }),
            h('span', { class: 'kr-yp-di', text: [y.online === 'aitima' ? T('με αίτημα', 'on request') : '', y.timi ? T('από ', 'from ') + y.timi + ' €' : ''].filter(String).join(' · ') })]));
        });
        sk.appendChild(h('div', { class: 'kr-omada' }, [t, lista]));
      });
      btn = plo(sk, function () { st.vima = 2; zografise(); }, null, st.ypiresies.length > 0);
    }
    function vima2(sk) {
      sk.appendChild(h('h2', { class: 'kr-bima-t', text: T('Με ποιον;', 'Who with?') }));
      sk.appendChild(h('p', { class: 'kr-bima-ypo', text: T('Διάλεξε κομμωτή ή άφησέ μας να βρούμε τον πρώτο διαθέσιμο.', 'Choose a stylist, or let us find the first one available.') }));
      var g = h('div', { class: 'kr-kommotes', role: 'group', 'aria-label': T('Κομμωτής', 'Stylist') }), btn;
      var epiloges = [{ id: 'any', onoma: T('Οποιοσδήποτε', 'Anyone'), eidikotita: T('Ο πρώτος διαθέσιμος', 'First available'), xroma: '#5a5146' }].concat(kat.kommotes.filter(function (k) { return k.online; }));
      epiloges.forEach(function (k) {
        var b = h('button', { type: 'button', class: 'kr-kom', 'aria-pressed': st.kommotis === k.id ? 'true' : 'false', style: '--k:' + k.xroma },
          [h('span', { class: 'kr-kom-m', 'aria-hidden': 'true', text: k.id === 'any' ? '✦' : k.onoma.charAt(0) }), h('span', { class: 'kr-kom-o', text: k.onoma }), h('span', { class: 'kr-kom-e', text: k.eidikotita })]);
        b.onclick = function () { st.kommotis = k.id; st.ora = null; g.querySelectorAll('.kr-kom').forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); }); btn.disabled = false; zografiseSynopsi(); };
        g.appendChild(b);
      });
      sk.appendChild(g);
      btn = plo(sk, function () { st.vima = 3; zografise(); }, null, !!st.kommotis);
    }
    function vima3(sk) {
      sk.appendChild(h('h2', { class: 'kr-bima-t', text: T('Πότε;', 'When?') }));
      sk.appendChild(h('p', { class: 'kr-bima-ypo', text: T('Δείχνουμε μόνο ώρες που χωρά ολόκληρο το ραντεβού.', 'We only show times when the whole appointment fits.') }));
      var btn;
      sk.appendChild(epilogiOras(kat, st.ypiresies, st.kommotis || 'any', st.ora || st.arxiki, function (w) { st.ora = w; if (w) st.arxiki = null; btn.disabled = !w; zografiseSynopsi(); if (w) track('kratisi_ora'); }));
      btn = plo(sk, function () { st.vima = 4; zografise(); }, null, !!st.ora);
    }
    function vima4(sk) {
      sk.appendChild(h('h2', { class: 'kr-bima-t', text: T('Τα στοιχεία σου', 'Your details') }));
      sk.appendChild(h('p', { class: 'kr-bima-ypo', text: T('Για να σου στείλουμε επιβεβαίωση και υπενθύμιση. Δεν τα δίνουμε σε κανέναν.', 'So we can send you a confirmation and a reminder. We never share them.') }));
      var f = h('form', { class: 'kr-forma', novalidate: '' });
      function pedio(id, lab, type, auto, extra) {
        var i = h(type === 'textarea' ? 'textarea' : 'input', Object.assign({ id: id, name: id, autocomplete: auto || 'off' }, type === 'textarea' ? {} : { type: type }, extra || {}));
        var l = h('p', { class: 'lathos', id: id + '-l', 'aria-live': 'polite' }); i.setAttribute('aria-describedby', id + '-l');
        f.appendChild(h('div', { class: 'kr-pedio' }, [h('label', { for: id, text: lab }), i, l])); return i;
      }
      var on = pedio('onoma', T('Ονοματεπώνυμο', 'Full name'), 'text', 'name', { required: '' }), kin = pedio('kinito', T('Κινητό', 'Mobile'), 'tel', 'tel', { required: '', inputmode: 'tel', placeholder: '69…' }),
          em = pedio('email', 'Email', 'email', 'email', { required: '' }), sim = pedio('simeiosi', T('Σημείωση (προαιρετικά)', 'Note (optional)'), 'textarea');
      var proti = h('input', { type: 'checkbox', id: 'proti' }), prosf = h('input', { type: 'checkbox', id: 'prosfores' }), oroi = h('input', { type: 'checkbox', id: 'oroi', required: '' });
      f.appendChild(h('label', { class: 'kr-check', for: 'proti' }, [proti, h('span', { text: T('Έρχομαι πρώτη φορά στο κομμωτήριο', 'This is my first visit') })]));
      f.appendChild(h('label', { class: 'kr-check', for: 'oroi' }, [oroi, h('span', { html: T('Αποδέχομαι τους <a href="' + pre + '/oroi-kratiseon/" target="_blank">όρους κρατήσεων</a> και έχω διαβάσει το <a href="' + pre + '/aporrito/" target="_blank">απόρρητο</a>.', 'I accept the <a href="' + pre + '/oroi-kratiseon/" target="_blank">booking terms</a> and have read the <a href="' + pre + '/aporrito/" target="_blank">privacy notice</a>.') })]));
      f.appendChild(h('label', { class: 'kr-check', for: 'prosfores' }, [prosf, h('span', { text: T('Θέλω να μαθαίνω για προσφορές (προαιρετικό, ανακαλείται όποτε θέλω).', 'Send me offers (optional, I can opt out at any time).') })]));
      // προαιρετικά: θυμάται όνομα, κινητό και email σε αυτή τη συσκευή, για την επόμενη κράτηση
      var thim = h('input', { type: 'checkbox', id: 'thimisou' }), apoth = null;
      try { apoth = JSON.parse(localStorage.getItem('giannis-pelatis') || 'null'); } catch (e) {}
      if (apoth) { on.value = apoth.onoma || ''; kin.value = apoth.kinito || ''; em.value = apoth.email || ''; thim.checked = true; }
      f.appendChild(h('label', { class: 'kr-check', for: 'thimisou' }, [thim, h('span', { text: T('Να θυμάται τα στοιχεία μου σε αυτή τη συσκευή', 'Remember my details on this device') })]));
      var hp = h('input', { type: 'text', name: 'website', tabindex: '-1', autocomplete: 'off' }); f.appendChild(h('div', { class: 'kr-hp', 'aria-hidden': 'true' }, [hp]));
      var lathos = h('div', { 'aria-live': 'assertive' }); f.appendChild(lathos);
      sk.appendChild(f);
      var btn = plo(sk, ypovoli, T('Κλείσε το ραντεβού', 'Confirm booking'), true);
      function elegxos() {
        var ok = true;
        function err(i, t) { D.getElementById(i.id + '-l').textContent = t || ''; i.setAttribute('aria-invalid', t ? 'true' : 'false'); if (t && ok) { i.focus(); ok = false; } }
        err(on, on.value.trim().length >= 3 ? '' : T('Γράψε ονοματεπώνυμο.', 'Please enter your full name.'));
        var k = kin.value.replace(/[\s\-().]/g, '').replace(/^(\+30|0030)/, '');
        err(kin, /^69\d{8}$/.test(k) ? '' : T('Γράψε ελληνικό κινητό, 10 ψηφία που ξεκινούν από 69.', 'Please enter a Greek mobile number: 10 digits starting with 69.'));
        err(em, /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(em.value.trim()) ? '' : T('Γράψε έγκυρο email.', 'Please enter a valid email.'));
        if (!oroi.checked) { lathos.innerHTML = ''; lathos.appendChild(h('p', { class: 'kr-sfalma', text: T('Χρειάζεται να αποδεχτείς τους όρους.', 'Please accept the terms.') })); if (ok) oroi.focus(); ok = false; } else lathos.innerHTML = '';
        return ok ? k : null;
      }
      function ypovoli() {
        var k = elegxos(); if (!k) return;
        try { if (thim.checked) localStorage.setItem('giannis-pelatis', JSON.stringify({ onoma: on.value.trim(), kinito: kin.value.trim(), email: em.value.trim() })); else localStorage.removeItem('giannis-pelatis'); } catch (e) {}
        btn.disabled = true; btn.textContent = T('Κλείνω…', 'Booking…');
        KratisiApi.kratisi({ ypiresies: st.ypiresies, kommotis: st.kommotis === 'any' ? 'any' : st.ora.kommotis, imerominia: st.ora.imerominia, ora: st.ora.ora,
          onoma: on.value.trim(), kinito: k, email: em.value.trim(), simeiosi: sim.value.trim(), proti: proti.checked, prosfores: prosf.checked, glossa: EN ? 'en' : 'el', _hp: hp.value })
        .then(function (r) {
          if (r.ok) { track('kratisi_oloklirosi', { katastasi: r.katastasi }); telos(r); return; }
          btn.disabled = false; btn.textContent = T('Κλείσε το ραντεβού', 'Confirm booking');
          lathos.innerHTML = ''; lathos.appendChild(h('p', { class: 'kr-sfalma', text: (r.logos === 'piasmeno' ? T('Η ώρα μόλις κλείστηκε. Διάλεξε άλλη ώρα.', 'That time was just taken. Please choose another.') : (r.minima || T('Κάτι πήγε στραβά.', 'Something went wrong.'))) }));
          if (r.logos === 'piasmeno') { st.ora = null; setTimeout(function () { st.vima = 3; zografise(); }, 1600); }
        }).catch(function () {
          btn.disabled = false; btn.textContent = T('Κλείσε το ραντεβού', 'Confirm booking');
          lathos.innerHTML = ''; lathos.appendChild(h('p', { class: 'kr-sfalma', html: T('Δεν συνδέθηκα με το κομμωτήριο. Δοκίμασε ξανά ή κάλεσε στο ', 'Could not reach the salon. Try again or call ') + '<a href="tel:' + S.tel + '">' + S.tilefono + '</a>.' }));
        });
      }
    }
    function telos(r) {
      var aitima = r.katastasi === 'Αίτημα', s = r.synopsi || {};
      rizaK.innerHTML = ''; synopsi.innerHTML = '';
      var svg = '<svg viewBox="0 0 120 120" aria-hidden="true"><circle class="t-kyklos" cx="60" cy="60" r="54" fill="none" stroke="#7a5a12" stroke-width="2"/>' +
        '<path class="t-check" d="M38 62l15 15 30-34" fill="none" stroke="#14100b" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>' +
        '<path class="t-toufa" d="M86 18c-14 18 10 34-4 58s-30 22-34 40" fill="none" stroke="#d9b44a" stroke-width="1.5" stroke-linecap="round"/></svg>';
      var link = pre + '/kratisi/allagi/?t=' + encodeURIComponent(r.token);
      rizaK.appendChild(h('div', { class: 'kr-telos' }, [h('div', { html: svg }),
        h('h2', { text: aitima ? T('Λάβαμε το αίτημά σου.', 'Request received.') : T('Κλείστηκε!', 'You are booked!') }),
        h('p', { text: aitima ? T('Θα σε καλέσουμε ή θα σου στείλουμε email για να επιβεβαιώσουμε την ώρα.', 'We will call or email you to confirm the time.') : T('Σου στείλαμε email επιβεβαίωσης. Θα λάβεις και υπενθύμιση μία μέρα πριν.', 'We have emailed your confirmation. You will also get a reminder the day before.') }),
        h('p', { html: '<strong>' + meraPlires(s.imerominia) + ', ' + s.ora + '</strong>' + (s.kommotis ? ' ' + ((kat.kommotes.filter(function (x) { return x.onoma === s.kommotis; })[0] || {}).me || T('με ', 'with ') + s.kommotis) : '') + '<br>' + (s.ypiresies || []).join(' + ') }),
        h('div', { class: 'energeies' }, [h('a', { class: 'btn', href: ics(s), download: 'rantevou-giannis.ics', text: T('Προσθήκη στο ημερολόγιο', 'Add to calendar') }), h('a', { class: 'syndesmos', href: link, text: T('Αλλαγή ή ακύρωση ›', 'Change or cancel ›') })]),
        KratisiApi.epideixi ? h('p', { class: 'kr-epideixi', text: T('Επίδειξη: η κράτηση έμεινε μόνο σε αυτόν τον περιηγητή.', 'Demo: this booking only exists in this browser.') }) : null]));
      rizaK.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    function ics(s) {
      var p = s.imerominia.replace(/-/g, ''), t = s.ora.replace(':', '') + '00', m = Diathesimotita.lepta(s.ora) + (s.diarkeia || 60), e = Diathesimotita.wra(m).replace(':', '') + '00';
      var txt = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Kommotirio Giannis//EL', 'BEGIN:VEVENT', 'UID:' + Date.now() + '@giannis', 'DTSTAMP:' + new Date().toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z',
        'DTSTART;TZID=Europe/Athens:' + p + 'T' + t, 'DTEND;TZID=Europe/Athens:' + p + 'T' + e, T('SUMMARY:Κομμωτήριο Γιάννης · ', 'SUMMARY:Giannis Hair Salon · ') + (s.ypiresies || []).join(' + '),
        T('LOCATION:Μαυρομιχάλη 15\\, Πολίχνη', 'LOCATION:15 Mavromichali St.\\, Polichni'), T('DESCRIPTION:Τηλέφωνο ', 'DESCRIPTION:Phone ') + S.tilefono, 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
      return 'data:text/calendar;charset=utf-8,' + encodeURIComponent(txt);
    }
    function zografiseSynopsi() {
      if (!synopsi) return;
      synopsi.innerHTML = '';
      if (!st.ypiresies.length) return;
      var dl = h('dl');
      function g(t, v) { dl.appendChild(h('dt', { text: t })); dl.appendChild(h('dd', { text: v })); }
      g(T('Υπηρεσίες', 'Services'), st.ypiresies.map(function (i) { return m[i].onoma; }).join(' + '));
      if (st.kommotis) g(T('Κομμωτής', 'Stylist'), st.kommotis === 'any' ? (st.ora && kom[st.ora.kommotis] ? kom[st.ora.kommotis].onoma + T(' (πρώτος διαθέσιμος)', ' (first available)') : T('Οποιοσδήποτε', 'Anyone')) : kom[st.kommotis].onoma);
      if (st.ora) g(T('Πότε', 'When'), meraPlires(st.ora.imerominia) + ', ' + st.ora.ora);
      synopsi.appendChild(h('h2', { text: T('Το ραντεβού σου', 'Your appointment') })); synopsi.appendChild(dl);
    }
    zografise();
  }

  /* ── αλλαγή / ακύρωση ── */
  function allagi(kat) {
    var t = q('t');
    if (!t) { rizaA.innerHTML = '<p class="kr-keno">' + T('Άνοιξε τον σύνδεσμο από το email επιβεβαίωσης.', 'Open the link in your confirmation email.') + '</p>'; return; }
    KratisiApi.fere(t).then(function (r) {
      rizaA.innerHTML = '';
      if (!r.ok) { rizaA.appendChild(h('p', { class: 'kr-sfalma', text: r.minima || T('Δεν βρέθηκε η κράτηση.', 'Booking not found.') })); return; }
      var k = r.kratisi, akyro = k.katastasi === 'Ακυρώθηκε';
      var tora = KratisiApi.toraAthina(), orio = kat.kanones.akyrosi_ores * 60;
      var lepta = Math.round((dt(k.imerominia) - dt(tora.imerominia)) / 6e4) + Diathesimotita.lepta(k.ora) - tora.lepta;
      var mporei = !akyro && lepta >= orio;
      rizaA.appendChild(h('div', { class: 'kr-synopsi', style: 'position:static;margin:24px 0' }, [h('h2', { text: akyro ? T('Ακυρωμένο ραντεβού', 'Cancelled appointment') : T('Το ραντεβού σου', 'Your appointment') }),
        h('dl', {}, [h('dt', { text: T('Πότε', 'When') }), h('dd', { text: meraPlires(k.imerominia) + ', ' + k.ora }), h('dt', { text: T('Υπηρεσίες', 'Services') }), h('dd', { text: k.ypiresies.join(' + ') }),
          h('dt', { text: T('Κομμωτής', 'Stylist') }), h('dd', { text: k.kommotis }), h('dt', { text: T('Κατάσταση', 'Status') }), h('dd', { text: T(k.katastasi, { 'Επιβεβαιωμένο': 'Confirmed', 'Αίτημα': 'Requested', 'Ακυρώθηκε': 'Cancelled' }[k.katastasi] || k.katastasi) })])]));
      if (!mporei) { if (!akyro) rizaA.appendChild(h('p', { class: 'kr-keno', html: T('Λιγότερο από ' + kat.kanones.akyrosi_ores + ' ώρες πριν, η αλλαγή γίνεται τηλεφωνικά: ', 'Less than ' + kat.kanones.akyrosi_ores + ' hours before, changes are by phone: ') + '<a href="tel:' + S.tel + '">' + S.tilefono + '</a>.' })); return; }
      var perioxi = h('div');
      var b1 = h('button', { type: 'button', class: 'btn', text: T('Αλλαγή ώρας', 'Change time') }), b2 = h('button', { type: 'button', class: 'kr-piso', text: T('Ακύρωση ραντεβού', 'Cancel appointment') });
      rizaA.appendChild(h('div', { class: 'kr-plo' }, [b1, b2])); rizaA.appendChild(perioxi);
      b1.onclick = function () {
        perioxi.innerHTML = ''; var epil = null, ok = h('button', { type: 'button', class: 'btn', text: T('Επιβεβαίωση νέας ώρας', 'Confirm new time'), disabled: '' });
        perioxi.appendChild(epilogiOras(kat, k.ypiresies_id || [], k.kommotis_id || 'any', { imerominia: k.imerominia }, function (w) { epil = w; ok.disabled = !w; }));
        perioxi.appendChild(h('div', { class: 'kr-plo' }, [ok]));
        ok.onclick = function () { ok.disabled = true; KratisiApi.allagi(t, epil.imerominia, epil.ora).then(function (x) {
          perioxi.innerHTML = ''; perioxi.appendChild(h('p', { class: x.ok ? 'kr-keno' : 'kr-sfalma', text: x.ok ? T('Έγινε. Νέα ώρα: ', 'Done. New time: ') + meraPlires(epil.imerominia) + ', ' + epil.ora + T('. Σου στείλαμε email.', '. We have emailed you.') : (x.minima || T('Δεν έγινε η αλλαγή.', 'The change did not go through.')) })); }); };
      };
      b2.onclick = function () {
        perioxi.innerHTML = '';
        var nai = h('button', { type: 'button', class: 'btn', text: T('Ναι, ακύρωσέ το', 'Yes, cancel it') });
        perioxi.appendChild(h('div', { class: 'kr-keno' }, [h('p', { text: T('Σίγουρα; Η ώρα θα δοθεί σε άλλον.', 'Are you sure? The time will go to someone else.') }), h('div', { class: 'kr-plo' }, [nai])]));
        nai.onclick = function () { nai.disabled = true; KratisiApi.akyrosi(t).then(function (x) {
          rizaA.innerHTML = ''; rizaA.appendChild(h('p', { class: x.ok ? 'kr-keno' : 'kr-sfalma', text: x.ok ? T('Το ραντεβού ακυρώθηκε. Σε περιμένουμε άλλη φορά.', 'Your appointment is cancelled. We hope to see you another time.') : (x.minima || T('Δεν έγινε η ακύρωση.', 'The cancellation did not go through.')) })); }); };
      };
    });
  }
})();
