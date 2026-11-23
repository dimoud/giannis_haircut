/* Πίνακας κομμωτηρίου — λειτουργία επίδειξης.
 * Υλοποιεί τις ίδιες κλήσεις με το Apps Script (Code.gs: syndesi, p_*), με δεδομένα στον περιηγητή (localStorage).
 * Χρησιμοποιείται μόνο όσο ο ιστότοπος δεν έχει api_url. Δεν στέλνει τίποτα πουθενά.
 * Συνδέεται με την επίδειξη της ιστοσελίδας: οι δοκιμαστικές κρατήσεις και τα μηνύματα της φόρμας εμφανίζονται εδώ. */
(function () {
  var KEY = 'giannis-epideixi-pinakas', KR = 'giannis-epideixi-kratiseis', MN = 'giannis-epideixi-minimata';
  var P = window.PINAKAS || {}, D = window.Diathesimotita, kat = null;
  function lsGet(k, d) { try { return JSON.parse(localStorage.getItem(k) || 'null') || d; } catch (e) { return d; } }
  function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function toraAthina() {
    var f = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Athens', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date());
    var o = {}; f.forEach(function (x) { o[x.type] = x.value; });
    return { imerominia: o.year + '-' + o.month + '-' + o.day, lepta: (+o.hour) * 60 + (+o.minute) };
  }
  function ymap() { var m = {}; kat.omades.forEach(function (g) { g.ypiresies.forEach(function (y) { m[y.id] = y; }); }); return m; }
  function tmimataApo(ids) { var m = ymap(); return ids.map(function (i) { return m[i] && m[i].tmimata; }).filter(Boolean).join(','); }
  function lixi(ora, tm) { return D.wra(D.lepta(ora) + D.synoliki(D.synthesi([tm]))); }
  function orario() {
    var o = {}; kat.kommotes.forEach(function (k) { o[k.id] = {}; kat.orario.forEach(function (d) { o[k.id][d.imera] = d.kleisto ? [] : [[d.apo, d.eos]]; }); });
    return o;
  }
  function id(p) { return p + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 5); }

  /* ── αρχικά δεδομένα: 3 εβδομάδες γύρω από σήμερα, ίδια κάθε φορά που ξεκινά η επίδειξη ── */
  var ONOMATA = ['Μαρία Κ.', 'Ελένη Π.', 'Γιώργος Δ.', 'Κατερίνα Μ.', 'Νίκος Σ.', 'Σοφία Α.', 'Δημήτρης Λ.', 'Άννα Τ.', 'Χρήστος Β.', 'Βασιλική Ρ.', 'Παναγιώτης Ζ.', 'Ιωάννα Ν.'];
  function sporos() {
    var st = { rantevou: [], kleisimata: [], pelates: [], anartiseis: [], minimata: [], eisagmena: {}, kanones: Object.assign({}, kat.kanones, { mi_emfaniseis_aitima: 2, email: 'gianniskalaitzidis1970@gmail.com' }) };
    var h = 7, ids = Object.keys(ymap()).filter(function (i) { return ymap()[i].online === 'nai' || ymap()[i].online === true; });
    function rnd() { h = (h * 1103515245 + 12345) >>> 0; return h >>> 8; }
    ONOMATA.forEach(function (o, i) { st.pelates.push({ id: 'P' + (i + 1), onoma: o, kinito: '69' + (40000000 + i * 731177).toString().slice(0, 8), email: i % 3 ? '' : 'pelatis' + (i + 1) + '@example.com', episkepseis: 1 + (i % 6), mi_emfaniseis: i === 4 ? '1' : '0', texniki_simeiosi: i === 0 ? 'Ξανθό balayage, τόνος 9.1, 30 vol' : '' }); });
    var simera = toraAthina().imerominia, orr = orario();
    for (var dd = -7; dd <= 14; dd++) {
      var x = D.prosthesiImeron(simera, dd), w = D.imeraEvdomadas(x);
      kat.kommotes.forEach(function (k) {
        var zones = orr[k.id][w] || []; if (!zones.length) return;
        var t = D.lepta(zones[0][0]) + (rnd() % 4) * 15, telos = D.lepta(zones[0][1]);
        while (t < telos - 60) {
          if (rnd() % 10 < 3) { t += 45; continue; }
          var y = ids[rnd() % ids.length], tm = ymap()[y].tmimata, dur = D.synoliki(D.synthesi([tm]));
          if (t + dur > telos) break;
          var p = st.pelates[rnd() % st.pelates.length], ora = D.wra(t);
          var kst = x < simera ? (rnd() % 12 === 0 ? 'Δεν ήρθε' : 'Ήρθε') : 'Επιβεβαιωμένο';
          st.rantevou.push({ id: 'R' + x.replace(/-/g, '') + k.id.slice(0, 2) + t, dimiourgia: '', pigi: ['online', 'τηλέφωνο', 'online', 'περαστικός'][rnd() % 4], kommotis: k.id, ypiresies: y, tmimata: tm,
            imerominia: x, ora: ora, lixi: lixi(ora, tm), pelatis: p.id, onoma: p.onoma, kinito: p.kinito, email: p.email, katastasi: kst, simeiosi: '', proti: rnd() % 8 === 0 });
          t = Math.ceil((t + dur) / 15) * 15 + (rnd() % 3) * 15;
        }
      });
    }
    // δύο αιτήματα προς έγκριση (νυφικό, μεγάλη βαφή)
    var a1 = D.prosthesiImeron(simera, 5), a2 = D.prosthesiImeron(simera, 9);
    st.rantevou.push({ id: 'RA1', pigi: 'online', kommotis: kat.kommotes[0].id, ypiresies: 'nyfiko', tmimata: (ymap().nyfiko || {}).tmimata || 'E120', imerominia: a1, ora: '10:00', lixi: '12:00', pelatis: 'P2', onoma: 'Ελένη Π.', kinito: st.pelates[1].kinito, email: 'eleni@example.com', katastasi: 'Αίτημα', simeiosi: 'Γάμος το Σάββατο, θέλω δοκιμή' });
    st.rantevou.push({ id: 'RA2', pigi: 'online', kommotis: kat.kommotes[1].id, ypiresies: 'balayage,olaplex', tmimata: tmimataApo(['balayage', 'olaplex']), imerominia: a2, ora: '11:00', lixi: lixi('11:00', tmimataApo(['balayage', 'olaplex'])), pelatis: 'P4', onoma: 'Κατερίνα Μ.', kinito: st.pelates[3].kinito, email: '', katastasi: 'Αίτημα', simeiosi: '' });
    st.kleisimata.push({ id: 'K1', kommotis: kat.kommotes[2].id, imerominia: D.prosthesiImeron(simera, 3), apo: '14:00', eos: '17:00', logos: 'Σεμινάριο' });
    st.anartiseis = (P.anartiseis || []).map(function (a) { return Object.assign({}, a); });
    st.minimata.push({ id: 'M1', xronos: new Date(Date.now() - 3 * 3600e3).toISOString(), onoma: 'Σταυρούλα Γ.', tilefono: '6977000000', email: 'stavroula@example.com', minima: 'Καλησπέρα, κάνετε και περμανάντ; Ενδιαφέρομαι για τον επόμενο μήνα.', glossa: 'el', katastasi: 'νέο' });
    return st;
  }
  function store() {
    var st = lsGet(KEY, null); if (!st) st = sporos();
    // ό,τι έκλεισε κάποιος από τη δοκιμαστική ιστοσελίδα, εμφανίζεται εδώ
    lsGet(KR, []).forEach(function (r) {
      if (st.eisagmena[r.id]) return; st.eisagmena[r.id] = 1;
      var ids = Array.isArray(r.ypiresies) ? r.ypiresies : String(r.ypiresies).split(',');
      st.rantevou.push({ id: r.id, pigi: 'online', kommotis: r.kommotis, ypiresies: ids.join(','), tmimata: r.tmimata, imerominia: r.imerominia, ora: r.ora, lixi: lixi(r.ora, r.tmimata),
        pelatis: '', onoma: r.onoma, kinito: r.kinito, email: r.email || '', katastasi: r.katastasi, simeiosi: '', proti: true });
    });
    lsGet(MN, []).forEach(function (m) { if (st.eisagmena[m.id]) return; st.eisagmena[m.id] = 1; st.minimata.push(m); });
    lsSet(KEY, st); return st;
  }
  function save(st) { lsSet(KEY, st); }
  function tokenOk(t) { if (t !== 'epideixi') throw new Error('Η σύνδεση έληξε. Μπες ξανά.'); }
  function wres(st, ids, kommotis, imer, exairesi) {
    var tm = tmimataApo(ids), orr = orario();
    var kom = kat.kommotes.filter(function (k) { return kommotis === 'any' || k.id === kommotis; }).map(function (k) { return { id: k.id, orario: orr[k.id] }; });
    var rv = st.rantevou.filter(function (r) { return r.id !== exairesi; });
    var res = D.elefthera({ imerominia: imer, kommotes: kom, rantevou: rv, kleisimata: st.kleisimata, tmimata: tm, vima: st.kanones.vima || 15, tora: toraAthina(), proeidopoiisi: 0 });
    if (kommotis === 'any') return D.opoiosdipote(res, rv, imer);
    return (res[kommotis] || []).map(function (h) { return { ora: h, kommotis: kommotis }; });
  }

  var F = {
    syndesi: function (kod) {
      if (String(kod || '').trim() !== '1234') return { ok: false, minima: 'Λάθος κωδικός. Στη δοκιμαστική λειτουργία ο κωδικός είναι 1234.' };
      return { ok: true, token: 'epideixi', rolos: 'idioktitis' };
    },
    p_arxika: function (t) {
      tokenOk(t); var st = store();
      return { rolos: 'idioktitis', katalogos: kat, orario: orario(), simera: toraAthina().imerominia, email: 100, epideixi: true,
               minimata: st.minimata.filter(function (m) { return m.katastasi === 'νέο'; }).length };
    },
    p_imeres: function (t, apo, n) {
      tokenOk(t); var st = store(), eos = D.prosthesiImeron(apo, (n || 1) - 1), sim = toraAthina().imerominia;
      return { rantevou: st.rantevou.filter(function (r) { return r.imerominia >= apo && r.imerominia <= eos; }),
               kleisimata: st.kleisimata.filter(function (c) { return c.imerominia >= apo && c.imerominia <= eos; }),
               aitimata: st.rantevou.filter(function (r) { return r.katastasi === 'Αίτημα' && r.imerominia >= sim; }).length };
    },
    p_aitimata: function (t) { tokenOk(t); var sim = toraAthina().imerominia; return store().rantevou.filter(function (r) { return r.katastasi === 'Αίτημα' && r.imerominia >= sim; }); },
    p_elefthera: function (t, ids, kommotis, imer, exairesi) { tokenOk(t); return wres(store(), ids, kommotis, imer, exairesi); },
    p_neo: function (t, d) {
      tokenOk(t); var st = store(), tm = tmimataApo(d.ypiresies);
      if (!d.epivoli && !wres(st, d.ypiresies, d.kommotis, d.imerominia).some(function (w) { return w.ora === d.ora && w.kommotis === d.kommotis; })) return { ok: false, minima: 'Η ώρα μόλις πιάστηκε. Διάλεξε άλλη.' };
      var p = st.pelates.filter(function (x) { return x.kinito === d.kinito; })[0];
      if (!p && d.kinito) { p = { id: id('P'), onoma: d.onoma, kinito: d.kinito, email: d.email || '', episkepseis: 0, mi_emfaniseis: '0', texniki_simeiosi: '' }; st.pelates.push(p); }
      st.rantevou.push({ id: id('R'), pigi: d.pigi || 'τηλέφωνο', kommotis: d.kommotis, ypiresies: d.ypiresies.join(','), tmimata: tm, imerominia: d.imerominia, ora: d.ora, lixi: lixi(d.ora, tm),
        pelatis: p ? p.id : '', onoma: d.onoma, kinito: d.kinito, email: d.email || '', katastasi: 'Επιβεβαιωμένο', simeiosi: d.simeiosi || '', proti: !p || !p.episkepseis });
      save(st); return { ok: true };
    },
    p_metakinisi: function (t, rid, imer, ora, kommotis, epivoli) {
      tokenOk(t); var st = store(), r = st.rantevou.filter(function (x) { return x.id === rid; })[0]; if (!r) return { ok: false, minima: 'Δεν βρέθηκε.' };
      if (!epivoli && !wres(st, r.ypiresies.split(','), kommotis, imer, rid).some(function (w) { return w.ora === ora; })) return { ok: false, minima: 'Η ώρα δεν είναι ελεύθερη.' };
      r.imerominia = imer; r.ora = ora; r.kommotis = kommotis; r.lixi = lixi(ora, r.tmimata); save(st); return { ok: true };
    },
    p_katastasi: function (t, rid, k) { tokenOk(t); var st = store(), r = st.rantevou.filter(function (x) { return x.id === rid; })[0]; if (r) { r.katastasi = k; save(st); } return { ok: !!r }; },
    p_simeiosi: function (t, rid, s) { tokenOk(t); var st = store(), r = st.rantevou.filter(function (x) { return x.id === rid; })[0]; if (r) { r.simeiosi = String(s || '').slice(0, 500); save(st); } return { ok: true }; },
    p_kleisimo: function (t, d) {
      tokenOk(t); var st = store();
      for (var x = d.apo_imerominia, n = 0; x <= (d.eos_imerominia || d.apo_imerominia) && n < 120; x = D.prosthesiImeron(x, 1), n++)
        st.kleisimata.push({ id: id('K'), kommotis: d.kommotis || 'oloi', imerominia: x, apo: d.apo || '00:00', eos: d.eos || '24:00', logos: d.logos || '' });
      save(st); return { ok: true };
    },
    p_sviseKleisimo: function (t, kid) { tokenOk(t); var st = store(); st.kleisimata = st.kleisimata.filter(function (c) { return c.id !== kid; }); save(st); return { ok: true }; },
    p_pelates: function (t, q) {
      tokenOk(t); q = String(q || '').toLowerCase().replace(/\s/g, '');
      return store().pelates.filter(function (p) { return !q || (p.onoma + p.kinito + p.email).toLowerCase().replace(/\s/g, '').indexOf(q) !== -1; }).slice(0, 30);
    },
    p_pelatis: function (t, pid, d) {
      tokenOk(t); var st = store(), p = st.pelates.filter(function (x) { return x.id === pid; })[0]; if (!p) return { ok: false };
      ['onoma', 'email', 'texniki_simeiosi'].forEach(function (k) { if (d[k] != null) p[k] = String(d[k]).slice(0, 500); }); save(st); return { ok: true };
    },
    p_istorikoPelati: function (t, pid) { tokenOk(t); return store().rantevou.filter(function (r) { return r.pelatis === pid; }).sort(function (a, b) { return (b.imerominia + b.ora).localeCompare(a.imerominia + a.ora); }).slice(0, 30); },
    p_sviPelati: function (t, pid) {
      tokenOk(t); var st = store();
      st.rantevou.forEach(function (r) { if (r.pelatis === pid) { r.onoma = '—'; r.kinito = ''; r.email = ''; r.simeiosi = ''; r.pelatis = ''; } });
      st.pelates = st.pelates.filter(function (p) { return p.id !== pid; }); save(st); return { ok: true };
    },
    p_kanones: function (t, d) {
      tokenOk(t); var st = store();
      if (d) { Object.keys(d).forEach(function (k) { if (k === 'email') st.kanones.email = d.email; else if (!isNaN(+d[k])) st.kanones[k] = +d[k]; }); save(st); }
      return st.kanones;
    },
    p_anartiseis: function (t) { tokenOk(t); return store().anartiseis.slice().reverse(); },
    p_apothikeysiAnartisis: function (t, a, nees) {
      tokenOk(t); var st = store();
      if (!a.synainesi) return { ok: false, minima: 'Χρειάζεται η συναίνεση του εικονιζόμενου.' };
      var yp = st.anartiseis.filter(function (x) { return x.id === a.id; })[0];
      var r = Object.assign(yp || {}, a, { id: a.id || id('A') });
      // στην επίδειξη οι φωτογραφίες δεν ανεβαίνουν· κρατάμε μόνο ότι υπάρχουν
      if (nees && (nees.prin || nees.meta || nees.fotografies)) r.nees_fotografies = true;
      if (!yp) st.anartiseis.push(r); save(st); return { ok: true, id: r.id };
    },
    p_sviseAnartisi: function (t, aid) { tokenOk(t); var st = store(); st.anartiseis = st.anartiseis.filter(function (a) { return a.id !== aid; }); save(st); return { ok: true }; },
    p_dimosieusi: function (t) { tokenOk(t); return { ok: false, minima: 'Δοκιμαστική λειτουργία: η δημοσίευση ενεργοποιείται μόλις συνδεθεί το Φύλλο Google και το κλειδί GitHub.' }; },
    p_minimata: function (t) { tokenOk(t); return store().minimata.slice().sort(function (a, b) { return String(b.xronos).localeCompare(String(a.xronos)); }); },
    p_minimaKatastasi: function (t, mid, k) { tokenOk(t); var st = store(), m = st.minimata.filter(function (x) { return x.id === mid; })[0]; if (m) { m.katastasi = k; save(st); } return { ok: !!m }; },
    p_katastasiIstotopou: function (t) {
      tokenOk(t); var st = store(), sim = toraAthina().imerominia;
      return { epideixi: true, email: 100, istotopos: location.origin + (P.base || ''),
        aitimata: st.rantevou.filter(function (r) { return r.katastasi === 'Αίτημα' && r.imerominia >= sim; }).length,
        minimata: st.minimata.filter(function (m) { return m.katastasi === 'νέο'; }).length,
        rantevou_simera: st.rantevou.filter(function (r) { return r.imerominia === sim && !/Ακυρώθηκε|Απορρίφθηκε/.test(r.katastasi); }).length,
        anartiseis: st.anartiseis.length, dimosieusi: null };
    },
    p_epanafora: function (t) { tokenOk(t); localStorage.removeItem(KEY); return { ok: true }; }
  };

  window.PinakasEpideixi = {
    call: function (fn, args) {
      var arxi = kat ? Promise.resolve() : fetch((P.base || '') + '/static/katalogos.json' + (P.v ? '?v=' + P.v : '')).then(function (r) { return r.json(); }).then(function (k) { kat = k; });
      return arxi.then(function () {
        if (!F[fn]) throw new Error('Άγνωστη λειτουργία: ' + fn);
        return new Promise(function (ok) { setTimeout(function () { ok(F[fn].apply(null, args)); }, 120); });
      });
    }
  };
})();
