/* Μηχανισμός διαθεσιμότητας — ΙΔΙΟΣ κώδικας στον περιηγητή (λειτουργία επίδειξης) και στο Apps Script.
 * Χωρίς ζώνες ώρας: όλα σε τοπική ημερομηνία "YYYY-MM-DD" και λεπτά από τα μεσάνυχτα (ώρα Ελλάδας).
 * Τμήματα υπηρεσίας: "E30,A35,E25" (Ε = εργασία, δεσμεύει τον κομμωτή· Α = αναμονή).
 */
var Diathesimotita = (function () {
  function tmimata(s) {
    return String(s || '').split(',').map(function (x) {
      x = x.trim(); if (!x) return null;
      var t = x.charAt(0).toUpperCase(); if (t === 'Ε') t = 'E'; if (t === 'Α') t = 'A';
      return { t: t === 'A' ? 'A' : 'E', d: parseInt(x.slice(1), 10) || 0 };
    }).filter(Boolean);
  }
  function synthesi(lista) {           // πολλές υπηρεσίες στη σειρά
    var out = []; (lista || []).forEach(function (s) { out = out.concat(tmimata(s)); });
    return out;
  }
  function synoliki(tm) { return tm.reduce(function (a, b) { return a + b.d; }, 0); }
  function lepta(hhmm) { var p = String(hhmm).split(':'); return (+p[0]) * 60 + (+p[1] || 0); }
  function wra(m) { var h = Math.floor(m / 60), mm = m % 60; return (h < 10 ? '0' : '') + h + ':' + (mm < 10 ? '0' : '') + mm; }
  function imeraEvdomadas(iso) {        // 1 = Δευτέρα … 7 = Κυριακή
    var p = iso.split('-'); var d = new Date(Date.UTC(+p[0], +p[1] - 1, +p[2]));
    var w = d.getUTCDay(); return w === 0 ? 7 : w;
  }
  function prosthesiImeron(iso, n) {
    var p = iso.split('-'); var d = new Date(Date.UTC(+p[0], +p[1] - 1, +p[2] + n));
    return d.toISOString().slice(0, 10);
  }
  /* Δεσμευμένα διαστήματα ενός ραντεβού: [[από, έως], …] σε λεπτά */
  function desmeusi(enarxi, tm, anamoniEleftheri) {
    var t = enarxi, out = [];
    tm.forEach(function (s) {
      if (s.t === 'E' || !anamoniEleftheri) out.push([t, t + s.d]);
      t += s.d;
    });
    return out;
  }
  function epikalyptei(a, b) { return a[0] < b[1] && b[0] < a[1]; }

  /* p: { imerominia, kommotes:[{id, orario:{1..7:[[apo,eos],…]}}], kleisimata:[{kommotis|'oloi', imerominia, apo, eos}],
   *      rantevou:[{kommotis, imerominia, ora, tmimata, katastasi}], tmimata:"E30,A35,E25"|[…],
   *      vima, tora:{imerominia, lepta}, proeidopoiisi, anamoniEleftheri }
   * Επιστρέφει { <kommotis_id>: ["09:00", …] } */
  function elefthera(p) {
    var tm = Array.isArray(p.tmimata) ? p.tmimata : synthesi([p.tmimata]);
    var diarkeia = synoliki(tm); if (!diarkeia) return {};
    var vima = p.vima || 15, w = imeraEvdomadas(p.imerominia), res = {};
    var orio = -1;
    if (p.tora) {
      if (p.imerominia < p.tora.imerominia) return {};
      if (p.imerominia === p.tora.imerominia) orio = p.tora.lepta + (p.proeidopoiisi || 0);
    }
    (p.kommotes || []).forEach(function (k) {
      var zones = (k.orario && k.orario[w]) || [];
      if (!zones.length) { res[k.id] = []; return; }
      var piasmena = [];
      (p.kleisimata || []).forEach(function (c) {
        if (c.imerominia !== p.imerominia) return;
        if (c.kommotis !== 'oloi' && c.kommotis !== k.id) return;
        piasmena.push([lepta(c.apo || '00:00'), lepta(c.eos || '24:00')]);
      });
      (p.rantevou || []).forEach(function (r) {
        if (r.kommotis !== k.id || r.imerominia !== p.imerominia) return;
        if (r.katastasi === 'Ακυρώθηκε' || r.katastasi === 'Απορρίφθηκε') return;
        piasmena = piasmena.concat(desmeusi(lepta(r.ora), synthesi([r.tmimata]), p.anamoniEleftheri));
      });
      var wres = [];
      zones.forEach(function (z) {
        var a = lepta(z[0]), b = lepta(z[1]);
        for (var t = a; t + diarkeia <= b; t += vima) {
          if (t < orio) continue;
          var d = desmeusi(t, tm, p.anamoniEleftheri), ok = true;
          for (var i = 0; i < d.length && ok; i++)
            for (var j = 0; j < piasmena.length; j++) if (epikalyptei(d[i], piasmena[j])) { ok = false; break; }
          if (ok) wres.push(wra(t));
        }
      });
      res[k.id] = wres;
    });
    return res;
  }
  /* «Οποιοσδήποτε»: για κάθε ώρα, ο κομμωτής με τον λιγότερο φόρτο εκείνη την ημέρα */
  function opoiosdipote(anaKommoti, rantevou, imerominia) {
    var fortos = {};
    Object.keys(anaKommoti).forEach(function (k) { fortos[k] = 0; });
    (rantevou || []).forEach(function (r) {
      if (r.imerominia === imerominia && fortos[r.kommotis] !== undefined && r.katastasi !== 'Ακυρώθηκε')
        fortos[r.kommotis] += synoliki(synthesi([r.tmimata]));
    });
    var out = {};
    Object.keys(anaKommoti).sort(function (a, b) { return fortos[a] - fortos[b]; }).forEach(function (k) {
      anaKommoti[k].forEach(function (h) { if (!out[h]) out[h] = k; });
    });
    return Object.keys(out).sort().map(function (h) { return { ora: h, kommotis: out[h] }; });
  }
  return { tmimata: tmimata, synthesi: synthesi, synoliki: synoliki, lepta: lepta, wra: wra,
           imeraEvdomadas: imeraEvdomadas, prosthesiImeron: prosthesiImeron, desmeusi: desmeusi,
           elefthera: elefthera, opoiosdipote: opoiosdipote };
})();
if (typeof module !== 'undefined') module.exports = Diathesimotita;
