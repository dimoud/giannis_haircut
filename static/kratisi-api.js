/* API κρατήσεων. Αν υπάρχει SALON.api (διεύθυνση /exec του Apps Script) → πραγματικό API.
 * Αλλιώς → λειτουργία επίδειξης: ίδιος μηχανισμός διαθεσιμότητας (diathesimotita.js), κρατήσεις στο localStorage.
 * Διεπαφή (Promise): katalogos · diathesimotita · kratisi · fere · allagi · akyrosi · epomeno */
var KratisiApi = (function () {
  var S = window.SALON || {}, base = S.base || '';

  function toraAthina() {
    var parts = {}; new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Athens', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
      .formatToParts(new Date()).forEach(function (p) { parts[p.type] = p.value; });
    return { imerominia: parts.year + '-' + parts.month + '-' + parts.day, lepta: (+parts.hour) * 60 + (+parts.minute) };
  }
  var katPromise = null;
  function katalogos() {
    if (katPromise) return katPromise;
    var el = document.getElementById('kr-katalogos');
    katPromise = el ? Promise.resolve(JSON.parse(el.textContent))
                    : fetch(base + '/static/katalogos' + (S.lang === 'en' ? '-en' : '') + '.json', { cache: 'no-cache' }).then(function (r) { return r.json(); });
    return katPromise;
  }
  function ypMap(kat) { var m = {}; kat.omades.forEach(function (g) { g.ypiresies.forEach(function (y) { m[y.id] = y; }); }); return m; }
  function tmimataApo(kat, ids) { var m = ypMap(kat); return ids.map(function (i) { return m[i] && m[i].tmimata; }).filter(Boolean).join(','); }

  /* ───────── πραγματικό API (Apps Script) ───────── */
  function pragmatiko() {
    function get(f, q) {
      var u = new URL(S.api); u.searchParams.set('f', f); u.searchParams.set('k', S.kleidi || '');
      Object.keys(q || {}).forEach(function (k) { u.searchParams.set(k, Array.isArray(q[k]) ? q[k].join(',') : q[k]); });
      return fetch(u.toString(), { redirect: 'follow' }).then(function (r) { return r.json(); });
    }
    function post(f, body) {
      body.f = f; body._key = S.kleidi || '';
      return fetch(S.api, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(body), redirect: 'follow' })
        .then(function (r) { return r.json(); });
    }
    return {
      epideixi: false, katalogos: katalogos,
      diathesimotita: function (ids, kommotis, apo, imeres) { return get('diathesimotita', { y: ids, kommotis: kommotis, apo: apo, imeres: imeres }); },
      kratisi: function (d) { return post('kratisi', d); },
      fere: function (t) { return get('kratisi', { t: t }); },
      allagi: function (t, imerominia, ora) { return post('allagi', { t: t, imerominia: imerominia, ora: ora }); },
      akyrosi: function (t) { return post('akyrosi', { t: t }); },
      epomeno: function () { return get('epomeno', {}); }
    };
  }

  /* ───────── επίδειξη ───────── */
  function epideixi() {
    var KEY = 'giannis-epideixi-kratiseis';
    function fortose() { try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch (e) { return []; } }
    function apothikeyse(l) { try { localStorage.setItem(KEY, JSON.stringify(l)); } catch (e) {} }
    function orarioKommoti(kat) {
      var o = {}; kat.orario.forEach(function (d) { o[d.imera] = d.kleisto ? [] : [[d.apo, d.eos]]; }); return o;
    }
    // ψεύτικα υπάρχοντα ραντεβού, ίδια για την ίδια μέρα, ώστε η επίδειξη να μοιάζει αληθινή
    function sporos(imer, kat) {
      var out = [], h = 0; for (var i = 0; i < imer.length; i++) h = (h * 31 + imer.charCodeAt(i)) >>> 0;
      kat.kommotes.forEach(function (k, ki) {
        for (var j = 0; j < 4; j++) {
          h = (h * 1103515245 + 12345) >>> 0;
          var m = 9 * 60 + ((h >>> 8) % 40) * 15, d = [30, 45, 60, 90][(h >>> 4) % 4];
          out.push({ kommotis: k.id, imerominia: imer, ora: Diathesimotita.wra(m), tmimata: 'E' + d, katastasi: 'Επιβεβαιωμένο' });
        }
      });
      return out;
    }
    function ola(kat, imer) { return sporos(imer, kat).concat(fortose().filter(function (r) { return r.imerominia === imer; })); }
    function imeraWres(kat, ids, kommotis, imer) {
      var tm = tmimataApo(kat, ids), kom = kat.kommotes.filter(function (k) { return k.online && (kommotis === 'any' || k.id === kommotis); })
        .map(function (k) { return { id: k.id, orario: orarioKommoti(kat) }; });
      var rv = ola(kat, imer), res = Diathesimotita.elefthera({ imerominia: imer, kommotes: kom, rantevou: rv, tmimata: tm, vima: kat.kanones.vima,
        tora: toraAthina(), proeidopoiisi: kat.kanones.proeidopoiisi_lepta });
      if (kommotis === 'any') return Diathesimotita.opoiosdipote(res, rv, imer);
      return (res[kommotis] || []).map(function (h) { return { ora: h, kommotis: kommotis }; });
    }
    function tokenNeo() { var a = new Uint8Array(16); crypto.getRandomValues(a); return [].map.call(a, function (b) { return (b < 16 ? '0' : '') + b.toString(16); }).join(''); }
    function synopsi(kat, r) {
      var m = ypMap(kat), k = kat.kommotes.filter(function (x) { return x.id === r.kommotis; })[0];
      return { imerominia: r.imerominia, ora: r.ora, kommotis: k ? k.onoma : '', ypiresies: r.ypiresies.map(function (i) { return m[i] ? m[i].onoma : i; }), katastasi: r.katastasi,
               diarkeia: Diathesimotita.synoliki(Diathesimotita.synthesi([r.tmimata])) };
    }
    var api = {
      epideixi: true, katalogos: katalogos,
      diathesimotita: function (ids, kommotis, apo, imeres) {
        return katalogos().then(function (kat) {
          var out = [], max = Diathesimotita.prosthesiImeron(toraAthina().imerominia, kat.kanones.orizontas_imeres);
          for (var i = 0; i < imeres; i++) {
            var d = Diathesimotita.prosthesiImeron(apo, i);
            out.push({ imerominia: d, wres: d > max ? [] : imeraWres(kat, ids, kommotis, d) });
          }
          return new Promise(function (ok) { setTimeout(function () { ok({ ok: true, imeres: out }); }, 260); });
        });
      },
      kratisi: function (d) {
        return katalogos().then(function (kat) {
          if (d._hp) return { ok: true, id: 'x', token: 'x', katastasi: 'Επιβεβαιωμένο' };
          var wres = imeraWres(kat, d.ypiresies, d.kommotis === 'any' ? 'any' : d.kommotis, d.imerominia), h = wres.filter(function (w) { return w.ora === d.ora; })[0];
          if (!h) return { ok: false, logos: 'piasmeno', enallaktikes: wres.slice(0, 3) };
          var tm = tmimataApo(kat, d.ypiresies), m = ypMap(kat);
          var aitima = d.ypiresies.some(function (i) { return m[i] && m[i].online === 'aitima'; }) || Diathesimotita.synoliki(Diathesimotita.synthesi([tm])) > kat.kanones.aitima_pano_apo_lepta;
          var l = fortose(), tok = tokenNeo();
          var r = { id: 'R' + Date.now().toString(36).toUpperCase(), token: tok, imerominia: d.imerominia, ora: d.ora, kommotis: h.kommotis, ypiresies: d.ypiresies,
                    tmimata: tm, onoma: d.onoma, kinito: d.kinito, email: d.email, katastasi: aitima ? 'Αίτημα' : 'Επιβεβαιωμένο' };
          l.push(r); apothikeyse(l);
          return new Promise(function (ok) { setTimeout(function () { ok({ ok: true, id: r.id, token: tok, katastasi: r.katastasi, synopsi: synopsi(kat, r) }); }, 500); });
        });
      },
      fere: function (t) {
        return katalogos().then(function (kat) {
          var r = fortose().filter(function (x) { return x.token === t; })[0];
          return r ? { ok: true, kratisi: Object.assign(synopsi(kat, r), { ypiresies_id: r.ypiresies, kommotis_id: r.kommotis }) } : { ok: false };
        });
      },
      allagi: function (t, imer, ora) {
        var l = fortose(), r = l.filter(function (x) { return x.token === t; })[0];
        if (!r) return Promise.resolve({ ok: false });
        r.imerominia = imer; r.ora = ora; apothikeyse(l); return Promise.resolve({ ok: true });
      },
      akyrosi: function (t) {
        var l = fortose(), r = l.filter(function (x) { return x.token === t; })[0];
        if (!r) return Promise.resolve({ ok: false });
        r.katastasi = 'Ακυρώθηκε'; apothikeyse(l); return Promise.resolve({ ok: true });
      },
      epomeno: function () {
        return katalogos().then(function (kat) {
          var any = 'andriko', d = toraAthina().imerominia;
          for (var i = 0; i < 14; i++) {
            var x = Diathesimotita.prosthesiImeron(d, i), w = imeraWres(kat, [any], 'any', x);
            if (w.length) { var k = kat.kommotes.filter(function (q) { return q.id === w[0].kommotis; })[0]; return { ok: true, imerominia: x, ora: w[0].ora, kommotis: k ? k.onoma : '', me: k ? k.me : '', kommotis_id: w[0].kommotis, ypiresia: any }; }
          }
          return { ok: false };
        });
      }
    };
    return api;
  }
  var api = S.api ? pragmatiko() : epideixi();
  api.toraAthina = toraAthina;
  return api;
})();
