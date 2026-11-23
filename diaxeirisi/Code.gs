/**
 * Κομμωτήριο Γιάννης — Apps Script (λογαριασμός Google του κομμωτηρίου)
 *  · API κρατήσεων για τον ιστότοπο (doGet/doPost, κλειδί + διακριτικά κρατήσεων)
 *  · Πίνακας διαχείρισης (Index.html): ραντεβού, αιτήματα, κλεισίματα, πελάτες, αναρτήσεις, δημοσίευση
 *  · Χρονοδιακόπτες: υπενθυμίσεις (ανά ώρα), αντίγραφο (ανά εβδομάδα), διαγραφή παλιών (ανά μήνα)
 * Ο μηχανισμός διαθεσιμότητας είναι στο Diathesimotita.gs (ίδιος με static/diathesimotita.js του ιστότοπου).
 * Οδηγός στησίματος: ODIGOS-STISIMATOS.md
 */

var ZONI = 'Europe/Athens';
var KARTELES = {
  'Κομμωτές':   ['id', 'onoma', 'eidikotita', 'xroma', 'email', 'calendar_id', 'online', 'energos', 'seira'],
  'Ωράριο':     ['kommotis', 'imera', 'apo', 'eos', 'dialeimma_apo', 'dialeimma_eos'],
  'Κλεισίματα': ['id', 'kommotis', 'imerominia', 'apo', 'eos', 'logos'],
  'Υπηρεσίες':  ['omada', 'id', 'onoma', 'tmimata', 'timi', 'online', 'kommotes', 'seira', 'onoma_en'],
  'Ραντεβού':   ['id', 'dimiourgia', 'pigi', 'kommotis', 'ypiresies', 'tmimata', 'imerominia', 'ora', 'lixi', 'pelatis', 'onoma', 'kinito', 'email',
                 'katastasi', 'simeiosi', 'token_hash', 'event_id', 'ypenthymisi', 'apo_poion', 'proti', 'prosfores', 'glossa'],
  'Πελάτες':    ['id', 'onoma', 'kinito', 'email', 'proti_episkepsi', 'teleftaia_episkepsi', 'episkepseis', 'mi_emfaniseis', 'texniki_simeiosi', 'prosfores', 'imerominia_synainesis'],
  'Αναρτήσεις': ['id', 'imerominia', 'titlos', 'keimeno', 'ypiresia', 'kommotis', 'fotografies', 'prin', 'meta', 'synainesi', 'katastasi', 'titlos_en', 'keimeno_en'],
  'Κριτικές':   ['onoma', 'asteria', 'keimeno', 'imerominia', 'emfanisi', 'onoma_en', 'keimeno_en'],
  'Μηνύματα':   ['id', 'xronos', 'onoma', 'tilefono', 'email', 'minima', 'glossa', 'katastasi'],
  'Ιστορικό':   ['xronos', 'rolos', 'energeia', 'eggrafi']
};
var KANONES_PROEPILOGI = { vima: 15, proeidopoiisi_lepta: 120, orizontas_imeres: 60, akyrosi_ores: 12, energes_ana_kinito: 2, aitima_pano_apo_lepta: 180, mi_emfaniseis_aitima: 2 };

/* ───────────────────────── μενού Φύλλου (στήσιμο) ───────────────────────── */
function onOpen() {
  SpreadsheetApp.getUi().createMenu('Ιστοσελίδα')
    .addItem('1. Αρχικοποίηση', 'arxikopoiisi')
    .addItem('2. Ορισμός κωδικών Πίνακα', 'orismosKodikon')
    .addItem('3. Κλειδί GitHub (δημοσίευση)', 'kleidiGithub')
    .addItem('Εμφάνιση κλειδιών API', 'emfanisiKleidion')
    .addToUi();
}
function props() { return PropertiesService.getScriptProperties(); }
function fyllo() { return SpreadsheetApp.getActiveSpreadsheet() || SpreadsheetApp.openById(props().getProperty('FYLLO_ID')); }

function arxikopoiisi() {
  var ss = SpreadsheetApp.getActiveSpreadsheet(); props().setProperty('FYLLO_ID', ss.getId());
  ss.setSpreadsheetTimeZone(ZONI);
  Object.keys(KARTELES).forEach(function (n) {
    var sh = ss.getSheetByName(n) || ss.insertSheet(n);
    sh.getRange(1, 1, sh.getMaxRows(), KARTELES[n].length).setNumberFormat('@');   // όλα κείμενο: όχι αυτόματες ημερομηνίες
    if (sh.getLastRow() === 0) { sh.appendRow(KARTELES[n]); sh.setFrozenRows(1); sh.getRange(1, 1, 1, KARTELES[n].length).setFontWeight('bold'); }
  });
  // αρχικά δεδομένα (μόνο αν οι καρτέλες είναι άδειες)
  var kom = [['giannis', 'Γιάννης', 'Χρώμα, κουρέματα, χτενίσματα', '#b8912e'], ['panagiotis', 'Παναγιώτης', 'Ανδρικά κουρέματα, fade, χρώμα', '#8f9a6b'], ['kommotis3', 'Τρίτο μέλος', 'Κουρέματα, χτενίσματα, θεραπείες', '#a8879c']];
  var shK = ss.getSheetByName('Κομμωτές');
  if (shK.getLastRow() === 1) kom.forEach(function (k, i) {
    var cal = CalendarApp.createCalendar('Ραντεβού · ' + k[1], { timeZone: ZONI, color: CalendarApp.Color.BROWN });
    shK.appendRow([k[0], k[1], k[2], k[3], '', cal.getId(), 'ναι', 'ναι', String(i + 1)]);
  });
  var shO = ss.getSheetByName('Ωράριο');
  if (shO.getLastRow() === 1) kom.forEach(function (k) {
    [2, 3, 4, 5].forEach(function (d) { shO.appendRow([k[0], String(d), '09:00', '21:00', '', '']); });
    shO.appendRow([k[0], '6', '09:00', '17:00', '', '']);
  });
  var shY = ss.getSheetByName('Υπηρεσίες');
  if (shY.getLastRow() === 1) YPIRESIES_PROEPILOGI.forEach(function (r) { shY.appendRow(r); });
  if (!props().getProperty('API_KLEIDI')) props().setProperty('API_KLEIDI', tyxaio(12));
  if (!props().getProperty('DEDOMENA_KLEIDI')) props().setProperty('DEDOMENA_KLEIDI', tyxaio(24));
  if (!props().getProperty('ALATI')) props().setProperty('ALATI', tyxaio(16));
  var fak = DriveApp.getFoldersByName('Ιστοσελίδα κομμωτηρίου · Φωτογραφίες');
  props().setProperty('FAKELOS_ID', (fak.hasNext() ? fak.next() : DriveApp.createFolder('Ιστοσελίδα κομμωτηρίου · Φωτογραφίες')).getId());
  ScriptApp.getProjectTriggers().forEach(function (t) { ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('ypenthymiseis').timeBased().everyHours(1).create();
  ScriptApp.newTrigger('antigrafo').timeBased().onWeekDay(ScriptApp.WeekDay.MONDAY).atHour(4).create();
  ScriptApp.newTrigger('diagrafiPalion').timeBased().onMonthDay(1).atHour(5).create();
  SpreadsheetApp.getUi().alert('Έτοιμο. Καρτέλες, 3 ημερολόγια Google, φάκελος φωτογραφιών και χρονοδιακόπτες δημιουργήθηκαν.\nΕπόμενο: «2. Ορισμός κωδικών Πίνακα».');
}
var YPIRESIES_PROEPILOGI = [
  ['kourema', 'gynaikeio', 'Γυναικείο κούρεμα', 'E45', '', 'nai', '', '1', 'Women\'s cut'], ['kourema', 'texniki', 'Κούρεμα με τεχνική (bob, razor, butterfly)', 'E60', '', 'nai', '', '2', 'Technical cut (bob, razor, butterfly)'],
  ['kourema', 'andriko', 'Ανδρικό κούρεμα', 'E30', '', 'nai', '', '3', 'Men\'s cut'], ['kourema', 'fade', 'Ανδρικό fade', 'E40', '', 'nai', '', '4', 'Men\'s fade'], ['kourema', 'paidiko', 'Παιδικό κούρεμα', 'E25', '', 'nai', '', '5', 'Kids\' cut'],
  ['xroma', 'riza', 'Βαφή ρίζας', 'E30,A35,E25', '', 'nai', '', '6', 'Root colour'], ['xroma', 'oliki', 'Ολική βαφή', 'E40,A35,E30', '', 'nai', '', '7', 'Full colour'],
  ['xroma', 'antaygeies', 'Ανταύγειες / babylights', 'E75,A30,E30', '', 'nai', '', '8', 'Highlights / babylights'], ['xroma', 'balayage', 'Balayage / foilayage', 'E90,A35,E40', '', 'nai', '', '9', 'Balayage / foilayage'],
  ['xroma', 'ombre', 'Ombré', 'E80,A30,E35', '', 'nai', '', '10', 'Ombré'], ['xroma', 'entona', 'Έντονα χρώματα (carrot red, μωβ, ροζ)', 'E60,A30,E40', '', 'nai', '', '11', 'Bold colours (carrot red, purple, pink)'],
  ['xtenisma', 'formarisma', 'Φορμάρισμα / styling', 'E40', '', 'nai', '', '12', 'Blow-dry / styling'], ['xtenisma', 'vradino', 'Βραδινό χτένισμα', 'E60', '', 'aitima', '', '13', 'Evening style'],
  ['therapeies', 'keratini', 'Θεραπεία κερατίνης', 'E60,A30,E60', '', 'nai', '', '14', 'Keratin treatment'], ['therapeies', 'olaplex', 'Olaplex', 'E20,A20,E20', '', 'nai', '', '15', 'Olaplex'],
  ['therapeies', 'anadomisi', 'Θεραπεία αναδόμησης', 'E30,A15,E15', '', 'nai', '', '16', 'Reconstruction treatment'], ['nyfiko', 'nyfiko', 'Νυφικό χτένισμα (με δοκιμή)', 'E120', '', 'aitima', '', '17', 'Bridal hair (with trial)']
];
function orismosKodikon() {
  var ui = SpreadsheetApp.getUi();
  var a = ui.prompt('Κωδικός Ιδιοκτήτη (τουλάχιστον 10 χαρακτήρες)'); if (a.getSelectedButton() !== ui.Button.OK) return;
  var b = ui.prompt('Κωδικός Συνεργάτη (τουλάχιστον 8 χαρακτήρες, διαφορετικός)'); if (b.getSelectedButton() !== ui.Button.OK) return;
  var x = a.getResponseText().trim(), y = b.getResponseText().trim();
  if (x.length < 10 || y.length < 8 || x === y) { ui.alert('Οι κωδικοί δεν πληρούν τους κανόνες. Ξαναδοκίμασε.'); return; }
  props().setProperty('KOD_IDIOKTITI', hash(x)); props().setProperty('KOD_SYNERGATI', hash(y));
  props().setProperty('EKDOSI_KODIKON', String(Date.now()));        // αποσυνδέει όλες τις συσκευές
  ui.alert('Οι κωδικοί αποθηκεύτηκαν.');
}
function kleidiGithub() {
  var ui = SpreadsheetApp.getUi(), r = ui.prompt('Κλειδί GitHub (fine-grained, μόνο Actions: Read and write στο αποθετήριο). Μορφή: λογαριασμός/αποθετήριο|κλειδί');
  if (r.getSelectedButton() !== ui.Button.OK) return;
  var p = r.getResponseText().split('|'); if (p.length !== 2) { ui.alert('Μορφή: dimoud/giannis_haircut|github_pat_…'); return; }
  props().setProperty('GITHUB_REPO', p[0].trim()); props().setProperty('GITHUB_TOKEN', p[1].trim()); props().setProperty('GITHUB_TOKEN_IMEROMINIA', simera());
  ui.alert('Αποθηκεύτηκε.');
}
function emfanisiKleidion() {
  SpreadsheetApp.getUi().alert('API_KLEIDI (στο rythmiseis.json → api_kleidi): ' + props().getProperty('API_KLEIDI') +
    '\n\nDEDOMENA_KLEIDI (μυστικό GitHub DEDOMENA_KLEIDI): ' + props().getProperty('DEDOMENA_KLEIDI'));
}

/* ───────────────────────── βοηθητικά ───────────────────────── */
function tyxaio(n) { var c = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789', s = ''; for (var i = 0; i < n; i++) s += c.charAt(Math.floor(Math.random() * c.length)); return s; }
function hash(s) { return Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, (props().getProperty('ALATI') || '') + s, Utilities.Charset.UTF_8)); }
function token128() { return Utilities.getUuid().replace(/-/g, '') ; }
function simera() { return Utilities.formatDate(new Date(), ZONI, 'yyyy-MM-dd'); }
function tora() { var d = new Date(); return { imerominia: Utilities.formatDate(d, ZONI, 'yyyy-MM-dd'), lepta: (+Utilities.formatDate(d, ZONI, 'H')) * 60 + (+Utilities.formatDate(d, ZONI, 'm')) }; }
function json(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
function diavase(n) {
  var sh = fyllo().getSheetByName(n), v = sh.getDataRange().getDisplayValues(), h = v.shift();
  return v.filter(function (r) { return r.join('') !== ''; }).map(function (r, i) { var o = { _row: i + 2 }; h.forEach(function (k, j) { o[k] = r[j]; }); return o; });
}
function grapse(n, obj) {
  var sh = fyllo().getSheetByName(n), h = KARTELES[n], row = h.map(function (k) { return obj[k] == null ? '' : String(obj[k]); });
  if (obj._row) sh.getRange(obj._row, 1, 1, h.length).setValues([row]); else { sh.appendRow(row); obj._row = sh.getLastRow(); }
  return obj;
}
function sviseGrammi(n, row) { fyllo().getSheetByName(n).deleteRow(row); }
function istoriko(rolos, energeia, eggrafi) { try { fyllo().getSheetByName('Ιστορικό').appendRow([new Date().toISOString(), rolos, energeia, String(eggrafi || '').slice(0, 300)]); } catch (e) {} }
function kanones() { var k = {}; Object.keys(KANONES_PROEPILOGI).forEach(function (x) { k[x] = +(props().getProperty('KANONAS_' + x) || KANONES_PROEPILOGI[x]); }); return k; }
function nai(v) { return /^(ναι|nai|yes|true|1)$/i.test(String(v).trim()); }

/* ───────────────────────── κατάλογος και διαθεσιμότητα ───────────────────────── */
function katalogos() {
  var kom = diavase('Κομμωτές').filter(function (k) { return nai(k.energos); }).sort(function (a, b) { return a.seira - b.seira; });
  var yp = diavase('Υπηρεσίες').sort(function (a, b) { return a.seira - b.seira; });
  var omades = {}, seira = [];
  yp.forEach(function (y) { if (!omades[y.omada]) { omades[y.omada] = []; seira.push(y.omada); } omades[y.omada].push({ id: y.id, onoma: y.onoma, tmimata: y.tmimata, timi: y.timi ? +y.timi : null, online: y.online || 'nai', kommotes: y.kommotes ? y.kommotes.split(',').map(function (s) { return s.trim(); }) : null }); });
  var TITLOI = { kourema: 'Κουρέματα', xroma: 'Βαφές και τεχνικές', xtenisma: 'Χτενίσματα', therapeies: 'Θεραπείες μαλλιών', nyfiko: 'Νυφικό' };
  return {
    omades: seira.map(function (o) { return { id: o, titlos: TITLOI[o] || o, ypiresies: omades[o] }; }),
    kommotes: kom.map(function (k) { return { id: k.id, onoma: k.onoma, eidikotita: k.eidikotita, xroma: k.xroma, online: nai(k.online) }; }),
    kanones: kanones()
  };
}
function orariaKommoton() {
  var out = {};
  diavase('Ωράριο').forEach(function (o) {
    var d = +o.imera; out[o.kommotis] = out[o.kommotis] || {}; out[o.kommotis][d] = out[o.kommotis][d] || [];
    if (o.dialeimma_apo && o.dialeimma_eos) { out[o.kommotis][d].push([o.apo, o.dialeimma_apo]); out[o.kommotis][d].push([o.dialeimma_eos, o.eos]); }
    else out[o.kommotis][d].push([o.apo, o.eos]);
  });
  return out;
}
function ypiresiesMap() { var m = {}; diavase('Υπηρεσίες').forEach(function (y) { m[y.id] = y; }); return m; }
function tmimataGia(ids, ym) { return ids.map(function (i) { if (!ym[i]) throw new Error('Άγνωστη υπηρεσία'); return ym[i].tmimata; }).join(','); }

/** ελεύθερες ώρες για μία ημέρα. kommotis: id ή 'any' */
function wresImeras(ids, kommotis, imer, ctx) {
  ctx = ctx || {};
  var ym = ctx.ym || ypiresiesMap(), kom = ctx.kom || diavase('Κομμωτές'), or = ctx.or || orariaKommoton(), rv = ctx.rv || diavase('Ραντεβού'), kl = ctx.kl || diavase('Κλεισίματα');
  var tm = tmimataGia(ids, ym), kan = ctx.kan || kanones();
  var dynatoi = kom.filter(function (k) {
    if (!nai(k.energos) || !nai(k.online)) return false;
    if (kommotis !== 'any' && k.id !== kommotis) return false;
    return ids.every(function (i) { var l = ym[i].kommotes; return !l || l.split(',').map(function (s) { return s.trim(); }).indexOf(k.id) !== -1; });
  }).map(function (k) { return { id: k.id, orario: or[k.id] || {} }; });
  var rvD = rv.filter(function (r) { return r.imerominia === imer; });
  var res = Diathesimotita.elefthera({ imerominia: imer, kommotes: dynatoi, rantevou: rvD,
    kleisimata: kl.map(function (c) { return { kommotis: c.kommotis || 'oloi', imerominia: c.imerominia, apo: c.apo, eos: c.eos }; }),
    tmimata: tm, vima: kan.vima, tora: tora(), proeidopoiisi: kan.proeidopoiisi_lepta });
  if (kommotis === 'any') return Diathesimotita.opoiosdipote(res, rvD, imer);
  return (res[kommotis] || []).map(function (h) { return { ora: h, kommotis: kommotis }; });
}

/* ───────────────────────── API ιστότοπου ───────────────────────── */
function doGet(e) {
  var p = (e && e.parameter) || {};
  if (!p.f) {
    return HtmlService.createTemplateFromFile('Index').evaluate().setTitle('Πίνακας · Κομμωτήριο Γιάννης')
      .addMetaTag('viewport', 'width=device-width, initial-scale=1').setFaviconUrl('https://fonts.gstatic.com/s/i/short-term/release/materialsymbolsrounded/content_cut/default/24px.svg');
  }
  try {
    if (p.f === 'dedomena' || p.f === 'foto') {
      if (p.k !== props().getProperty('DEDOMENA_KLEIDI')) return json({ ok: false, minima: 'κλειδί' });
      return p.f === 'dedomena' ? json(dedomenaGiaIstotopo()) : json(fotoBase64(p.id));
    }
    if (p.k !== props().getProperty('API_KLEIDI')) return json({ ok: false, minima: 'Μη έγκυρο αίτημα.' });
    if (p.f === 'katalogos') return json(Object.assign({ ok: true }, katalogos()));
    if (p.f === 'diathesimotita') {
      var ids = String(p.y || '').split(',').filter(String), n = Math.min(7, +p.imeres || 7), kan = kanones();
      var max = Diathesimotita.prosthesiImeron(simera(), kan.orizontas_imeres);
      var ctx = { ym: ypiresiesMap(), kom: diavase('Κομμωτές'), or: orariaKommoton(), rv: diavase('Ραντεβού'), kl: diavase('Κλεισίματα'), kan: kan };
      var imeres = [];
      for (var i = 0; i < n; i++) { var d = Diathesimotita.prosthesiImeron(p.apo || simera(), i); imeres.push({ imerominia: d, wres: d > max ? [] : wresImeras(ids, p.kommotis || 'any', d, ctx) }); }
      return json({ ok: true, imeres: imeres });
    }
    if (p.f === 'epomeno') return json(epomeno());
    if (p.f === 'kratisi') return json(fereKratisi(p.t));
    return json({ ok: false, minima: 'Άγνωστη κλήση.' });
  } catch (err) { console.error(err); return json({ ok: false, minima: 'Σφάλμα διακομιστή.' }); }
}
function doPost(e) {
  try {
    var d = JSON.parse(e.postData.contents || '{}');
    if (d._key !== props().getProperty('API_KLEIDI')) return json({ ok: false, minima: 'Μη έγκυρο αίτημα.' });
    if (d.f === 'kratisi') return json(neaKratisiOnline(d));
    if (d.f === 'allagi') return json(allagiPelati(d.t, d.imerominia, d.ora));
    if (d.f === 'akyrosi') return json(akyrosiPelati(d.t));
    if (d.f === 'minima') return json(neoMinima(d));
    return json({ ok: false, minima: 'Άγνωστη κλήση.' });
  } catch (err) { console.error(err); return json({ ok: false, minima: 'Σφάλμα διακομιστή. Κάλεσέ μας στο τηλέφωνο.' }); }
}
function epomeno() {
  var cache = CacheService.getScriptCache(), c = cache.get('epomeno'); if (c) return JSON.parse(c);
  var ctx = { ym: ypiresiesMap(), kom: diavase('Κομμωτές'), or: orariaKommoton(), rv: diavase('Ραντεβού'), kl: diavase('Κλεισίματα'), kan: kanones() };
  var y = 'andriko'; if (!ctx.ym[y]) y = Object.keys(ctx.ym)[0];
  var out = { ok: false };
  for (var i = 0; i < 14 && !out.ok; i++) {
    var d = Diathesimotita.prosthesiImeron(simera(), i), w = wresImeras([y], 'any', d, ctx);
    if (w.length) { var k = ctx.kom.filter(function (x) { return x.id === w[0].kommotis; })[0]; out = { ok: true, imerominia: d, ora: w[0].ora, kommotis: k ? k.onoma : '', me_el: k ? meTon(k.onoma) : '', me_en: k ? 'with ' + (k.onoma_en || latin(k.onoma)) : '', kommotis_id: w[0].kommotis, ypiresia: y }; }
  }
  cache.put('epomeno', JSON.stringify(out), 60);
  return out;
}

function meTon(o) { var gen = { 'Γιάννης': 'Γιάννη', 'Παναγιώτης': 'Παναγιώτη' }; return gen[o] ? 'με τον ' + gen[o] : 'με ' + o; }
function latin(o) { return { 'Γιάννης': 'Giannis', 'Παναγιώτης': 'Panagiotis' }[o] || o; }
function katharoKinito(k) { k = String(k || '').replace(/[\s\-().]/g, '').replace(/^(\+30|0030)/, ''); return /^69\d{8}$/.test(k) ? k : null; }
function kataxorisi(d, pigi, rolos, epivoli) {
  var ym = ypiresiesMap(), ids = (d.ypiresies || []).slice(0, 3);
  if (!ids.length) return { ok: false, minima: 'Διάλεξε υπηρεσία.' };
  var tm = tmimataGia(ids, ym), kan = kanones();
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(20000)) return { ok: false, minima: 'Πολλά αιτήματα ταυτόχρονα. Δοκίμασε ξανά σε λίγα δευτερόλεπτα.' };
  try {
    var rv = diavase('Ραντεβού'), kommotis = d.kommotis || 'any';
    var wres = wresImeras(ids, kommotis, d.imerominia, { ym: ym, rv: rv, kan: kan });
    var h = wres.filter(function (w) { return w.ora === d.ora; })[0];
    if (!h && !epivoli) return { ok: false, logos: 'piasmeno', minima: 'Η ώρα μόλις κλείστηκε.', enallaktikes: wres.slice(0, 3) };
    if (!h) h = { ora: d.ora, kommotis: kommotis };
    var pel = vresPelati(d);
    var aitima = pigi === 'online' && (ids.some(function (i) { return ym[i].online === 'aitima'; }) || Diathesimotita.synoliki(Diathesimotita.synthesi([tm])) > kan.aitima_pano_apo_lepta ||
                 (+pel.mi_emfaniseis || 0) >= kan.mi_emfaniseis_aitima);
    var tok = token128();
    var r = { id: 'R' + Date.now().toString(36).toUpperCase() + tyxaio(3), dimiourgia: new Date().toISOString(), pigi: pigi, kommotis: h.kommotis, ypiresies: ids.join(','), tmimata: tm,
      imerominia: d.imerominia, ora: d.ora, lixi: Diathesimotita.wra(Diathesimotita.lepta(d.ora) + Diathesimotita.synoliki(Diathesimotita.synthesi([tm]))),
      pelatis: pel.id, onoma: pel.onoma, kinito: pel.kinito, email: pel.email, katastasi: aitima ? 'Αίτημα' : 'Επιβεβαιωμένο', simeiosi: (d.simeiosi || '').slice(0, 500),
      token_hash: hash(tok), event_id: '', ypenthymisi: '', apo_poion: rolos, proti: d.proti ? 'ναι' : '', prosfores: d.prosfores ? 'ναι' : '', glossa: d.glossa === 'en' ? 'en' : 'el' };
    grapse('Ραντεβού', r);
    SpreadsheetApp.flush();
    CacheService.getScriptCache().remove('epomeno');
    try { r.event_id = imerologio(r); grapse('Ραντεβού', r); } catch (e) { console.warn('calendar', e); }
    istoriko(rolos, 'νέο ραντεβού ' + pigi, r.id + ' ' + r.imerominia + ' ' + r.ora);
    return { ok: true, r: r, token: tok };
  } finally { lock.releaseLock(); }
}
function neaKratisiOnline(d) {
  if (d._hp) return { ok: true, id: 'x', token: 'x', katastasi: 'Επιβεβαιωμένο' };          // παγίδα για ρομπότ
  var kin = katharoKinito(d.kinito);
  if (!kin || String(d.onoma || '').trim().length < 3 || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(d.email || '').trim()))
    return { ok: false, minima: 'Έλεγξε όνομα, κινητό και email.' };
  var kan = kanones(), t = tora(), max = Diathesimotita.prosthesiImeron(t.imerominia, kan.orizontas_imeres);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d.imerominia) || d.imerominia < t.imerominia || d.imerominia > max) return { ok: false, minima: 'Μη έγκυρη ημερομηνία.' };
  var energes = diavase('Ραντεβού').filter(function (r) { return r.kinito === kin && r.imerominia >= t.imerominia && /Επιβεβαιωμένο|Αίτημα/.test(r.katastasi); }).length;
  if (energes >= kan.energes_ana_kinito) return { ok: false, minima: 'Υπάρχουν ήδη ' + energes + ' ενεργά ραντεβού με αυτό το κινητό. Για περισσότερα, κάλεσέ μας.' };
  d.kinito = kin;
  var x = kataxorisi(d, 'online', 'πελάτης', false);
  if (!x.ok) return x;
  try { emailPelati(x.r, x.token, x.r.katastasi === 'Αίτημα' ? 'aitima' : 'epivevaiosi'); emailKommotirio(x.r, 'Νέα online κράτηση'); } catch (e) { console.warn('email', e); }
  return { ok: true, id: x.r.id, token: x.token, katastasi: x.r.katastasi, synopsi: synopsi(x.r) };
}
function synopsi(r) {
  var ym = ypiresiesMap(), k = diavase('Κομμωτές').filter(function (x) { return x.id === r.kommotis; })[0], en = r.glossa === 'en';
  return { imerominia: r.imerominia, ora: r.ora, kommotis: k ? (en ? latin(k.onoma) : k.onoma) : '', ypiresies: r.ypiresies.split(',').map(function (i) { return ym[i] ? ((en && ym[i].onoma_en) || ym[i].onoma) : i; }),
           katastasi: r.katastasi, diarkeia: Diathesimotita.synoliki(Diathesimotita.synthesi([r.tmimata])) };
}
function vresKratisiToken(t) { if (!t) return null; var h = hash(t); return diavase('Ραντεβού').filter(function (r) { return r.token_hash === h; })[0] || null; }
function fereKratisi(t) {
  var r = vresKratisiToken(t); if (!r) return { ok: false, minima: 'Δεν βρέθηκε η κράτηση.' };
  return { ok: true, kratisi: Object.assign(synopsi(r), { ypiresies_id: r.ypiresies.split(','), kommotis_id: r.kommotis }) };
}
function mporeiPelatis(r) {
  var t = tora(), kan = kanones();
  var p = r.imerominia.split('-'), q = t.imerominia.split('-');
  var meres = (Date.UTC(+p[0], +p[1] - 1, +p[2]) - Date.UTC(+q[0], +q[1] - 1, +q[2])) / 864e5;
  return meres * 1440 + Diathesimotita.lepta(r.ora) - t.lepta >= kan.akyrosi_ores * 60 && /Επιβεβαιωμένο|Αίτημα/.test(r.katastasi);
}
function allagiPelati(t, imer, ora) {
  var r = vresKratisiToken(t); if (!r) return { ok: false, minima: 'Δεν βρέθηκε η κράτηση.' };
  if (!mporeiPelatis(r)) return { ok: false, minima: 'Η αλλαγή online δεν είναι πια δυνατή. Κάλεσέ μας.' };
  var x = metakinisiEsoteriki(r, imer, ora, r.kommotis, false, 'πελάτης'); if (!x.ok) return x;
  try { emailPelati(x.r, null, 'allagi'); emailKommotirio(x.r, 'Αλλαγή ώρας από πελάτη'); } catch (e) {}
  return { ok: true };
}
function akyrosiPelati(t) {
  var r = vresKratisiToken(t); if (!r) return { ok: false, minima: 'Δεν βρέθηκε η κράτηση.' };
  if (!mporeiPelatis(r)) return { ok: false, minima: 'Η ακύρωση online δεν είναι πια δυνατή. Κάλεσέ μας.' };
  allaxeKatastasi(r, 'Ακυρώθηκε', 'πελάτης');
  try { emailPelati(r, null, 'akyrosi'); emailKommotirio(r, 'Ακύρωση από πελάτη'); } catch (e) {}
  return { ok: true };
}
function metakinisiEsoteriki(r, imer, ora, kommotis, epivoli, rolos) {
  var lock = LockService.getScriptLock(); if (!lock.tryLock(20000)) return { ok: false, minima: 'Δοκίμασε ξανά σε λίγο.' };
  try {
    var rv = diavase('Ραντεβού').filter(function (x) { return x.id !== r.id; });
    var w = wresImeras(r.ypiresies.split(','), kommotis, imer, { rv: rv }), h = w.filter(function (x) { return x.ora === ora; })[0];
    if (!h && !epivoli) return { ok: false, minima: 'Η ώρα δεν είναι ελεύθερη.' };
    r.imerominia = imer; r.ora = ora; r.kommotis = h ? h.kommotis : kommotis; r.ypenthymisi = '';
    r.lixi = Diathesimotita.wra(Diathesimotita.lepta(ora) + Diathesimotita.synoliki(Diathesimotita.synthesi([r.tmimata])));
    grapse('Ραντεβού', r);
    try { svisteGegonos(r); r.event_id = imerologio(r); grapse('Ραντεβού', r); } catch (e) {}
    CacheService.getScriptCache().remove('epomeno');
    istoriko(rolos, 'μετακίνηση', r.id + ' → ' + imer + ' ' + ora);
    return { ok: true, r: r };
  } finally { lock.releaseLock(); }
}
function allaxeKatastasi(r, k, rolos) {
  r.katastasi = k; grapse('Ραντεβού', r);
  if (k === 'Ακυρώθηκε' || k === 'Απορρίφθηκε') { try { svisteGegonos(r); r.event_id = ''; grapse('Ραντεβού', r); } catch (e) {} }
  if (k === 'Δεν ήρθε' || k === 'Ήρθε') {
    var p = diavase('Πελάτες').filter(function (x) { return x.id === r.pelatis; })[0];
    if (p) { if (k === 'Δεν ήρθε') p.mi_emfaniseis = (+p.mi_emfaniseis || 0) + 1; else { p.episkepseis = (+p.episkepseis || 0) + 1; p.teleftaia_episkepsi = r.imerominia; if (!p.proti_episkepsi) p.proti_episkepsi = r.imerominia; } grapse('Πελάτες', p); }
  }
  CacheService.getScriptCache().remove('epomeno');
  istoriko(rolos, 'κατάσταση ' + k, r.id);
}
function vresPelati(d) {
  var kin = katharoKinito(d.kinito) || String(d.kinito || '').trim(), l = diavase('Πελάτες'), p = kin ? l.filter(function (x) { return x.kinito === kin; })[0] : null;
  if (!p) p = { id: 'P' + Date.now().toString(36).toUpperCase() + tyxaio(3), onoma: String(d.onoma || '').trim(), kinito: kin, email: String(d.email || '').trim(), episkepseis: '0', mi_emfaniseis: '0' };
  if (d.onoma) p.onoma = String(d.onoma).trim(); if (d.email) p.email = String(d.email).trim();
  if (d.prosfores) { p.prosfores = 'ναι'; p.imerominia_synainesis = simera(); }
  return grapse('Πελάτες', p);
}

/* ───────────────────────── Calendar ───────────────────────── */
function imerologio(r) {
  var k = diavase('Κομμωτές').filter(function (x) { return x.id === r.kommotis; })[0]; if (!k || !k.calendar_id) return '';
  var cal = CalendarApp.getCalendarById(k.calendar_id); if (!cal) return '';
  var s = synopsi(r), a = imerominiaWra(r.imerominia, r.ora), b = imerominiaWra(r.imerominia, r.lixi);
  var ev = cal.createEvent((r.katastasi === 'Αίτημα' ? '[ΑΙΤΗΜΑ] ' : '') + r.onoma + ' · ' + s.ypiresies.join(' + '), a, b,
    { description: 'Κινητό: ' + r.kinito + '\nEmail: ' + r.email + (r.simeiosi ? '\nΣημείωση: ' + r.simeiosi : '') + '\nΠηγή: ' + r.pigi + '\nΚωδικός: ' + r.id });
  ev.addPopupReminder(30);
  return ev.getId();
}
function svisteGegonos(r) {
  if (!r.event_id) return;
  var k = diavase('Κομμωτές').filter(function (x) { return x.id === r.kommotis; })[0];
  diavase('Κομμωτές').forEach(function (kk) { try { var c = CalendarApp.getCalendarById(kk.calendar_id), ev = c && c.getEventById(r.event_id); if (ev) ev.deleteEvent(); } catch (e) {} });
}
function imerominiaWra(imer, ora) { return Utilities.parseDate(imer + ' ' + ora, ZONI, 'yyyy-MM-dd HH:mm'); }

/* ───────────────────────── email ───────────────────────── */
var IMERES = ['Κυριακή', 'Δευτέρα', 'Τρίτη', 'Τετάρτη', 'Πέμπτη', 'Παρασκευή', 'Σάββατο'];
function meraPlires(imer) { var d = imerominiaWra(imer, '12:00'); return IMERES[+Utilities.formatDate(d, ZONI, 'u') % 7] + ' ' + Utilities.formatDate(d, ZONI, 'd/M/yyyy'); }
function istotopos() { return props().getProperty('ISTOTOPOS') || 'https://dimoud.github.io/giannis_haircut'; }
function protypo(titlos, soma, en) {
  return '<div style="background:#f1ece2;padding:32px 16px;font-family:Arial,Helvetica,sans-serif;color:#14100b">' +
    '<div style="max-width:520px;margin:0 auto;background:#fff;border-radius:18px;overflow:hidden">' +
    '<div style="background:#14100b;color:#f1ece2;padding:28px 32px"><div style="font:italic 28px Georgia,serif">' + (en ? 'Giannis' : 'Γιάννης') + '</div><div style="font-size:12px;color:#d4af37;letter-spacing:.06em">HAIR SALON · ΠΟΛΙΧΝΗ</div></div>' +
    '<div style="padding:28px 32px;font-size:15px;line-height:1.6"><h1 style="font:300 26px Georgia,serif;margin:0 0 16px">' + titlos + '</h1>' + soma + '</div>' +
    '<div style="padding:20px 32px;background:#f7f3ec;font-size:13px;color:#4a4238">' + (en ? 'Giannis Hair Salon · 15 Mavromichali & Efkleidou St., Polichni' : 'Κομμωτήριο Γιάννης · Μαυρομιχάλη 15 & Ευκλείδη, Πολίχνη') + ' · <a href="tel:+302310602285" style="color:#7a5a12">2310 602285</a></div></div></div>';
}
function emailPelati(r, tok, eidos) {
  if (!r.email) return;
  var en = r.glossa === 'en', s = synopsi(r), pre = istotopos() + (en ? '/en' : '');
  var pote = (en ? dayEn(r.imerominia) : meraPlires(r.imerominia)) + ', ' + r.ora, link = tok ? pre + '/kratisi/allagi/?t=' + tok : '';
  var stoixeia = '<p style="background:#f1ece2;border-radius:12px;padding:16px 18px"><b>' + pote + '</b><br>' + s.ypiresies.join(' + ') + (s.kommotis ? '<br>' + (en ? 'with ' : 'με ') + s.kommotis : '') + '</p>';
  var T = en ? { epivevaiosi: ['You are booked', 'See you soon!'], aitima: ['Request received', 'We will call or email you to confirm the time.'],
            egkrisi: ['Your appointment is confirmed', 'See you soon!'], aporripsi: ['We cannot make that time', 'Please call us to find another time that suits you.'],
            allagi: ['New time for your appointment', 'The change is done.'], akyrosi: ['Appointment cancelled', 'We hope to see you soon.'],
            ypenthymisi: ['See you tomorrow', 'A reminder about your appointment.'] }[eidos]
          : { epivevaiosi: ['Το ραντεβού σου κλείστηκε', 'Σε περιμένουμε!'], aitima: ['Λάβαμε το αίτημά σου', 'Θα σε καλέσουμε ή θα σου στείλουμε email για να επιβεβαιώσουμε την ώρα.'],
            egkrisi: ['Το ραντεβού σου επιβεβαιώθηκε', 'Σε περιμένουμε!'], aporripsi: ['Δεν μπορούμε εκείνη την ώρα', 'Κάλεσέ μας να βρούμε άλλη ώρα που σε βολεύει.'],
            allagi: ['Νέα ώρα για το ραντεβού σου', 'Η αλλαγή έγινε.'], akyrosi: ['Το ραντεβού ακυρώθηκε', 'Ελπίζουμε να σε δούμε σύντομα.'],
            ypenthymisi: ['Αύριο σε περιμένουμε', 'Μια υπενθύμιση για το ραντεβού σου.'] }[eidos];
  var ores = kanones().akyrosi_ores;
  var soma = '<p>' + T[1] + '</p>' + stoixeia + (link ? '<p><a href="' + link + '" style="color:#7a5a12;font-weight:bold">' + (en ? 'Change or cancel ›' : 'Αλλαγή ή ακύρωση ›') + '</a> (' + (en ? 'up to ' + ores + ' hours before' : 'έως ' + ores + ' ώρες πριν') + ')</p>' : '');
  MailApp.sendEmail({ to: r.email, subject: T[0] + (en ? ' · Giannis Hair Salon' : ' · Κομμωτήριο Γιάννης'), htmlBody: protypo(T[0], soma, en),
    name: en ? 'Giannis Hair Salon' : 'Κομμωτήριο Γιάννης', replyTo: props().getProperty('EMAIL_KOMMOTIRIOU') || Session.getEffectiveUser().getEmail() });
}
function dayEn(imer) { var d = imerominiaWra(imer, '12:00'); return Utilities.formatDate(d, ZONI, 'EEEE d MMMM yyyy'); }
function emailKommotirio(r, thema) {
  var to = props().getProperty('EMAIL_KOMMOTIRIOU') || Session.getEffectiveUser().getEmail(), s = synopsi(r);
  MailApp.sendEmail({ to: to, subject: thema + ': ' + meraPlires(r.imerominia) + ' ' + r.ora + ' · ' + r.onoma,
    htmlBody: protypo(thema, '<p><b>' + meraPlires(r.imerominia) + ', ' + r.ora + '</b> με ' + s.kommotis + '<br>' + s.ypiresies.join(' + ') + '</p><p>' + r.onoma + ' · ' + r.kinito + ' · ' + r.email +
      (r.simeiosi ? '<br>Σημείωση: ' + r.simeiosi : '') + '</p><p>Κατάσταση: <b>' + r.katastasi + '</b></p>'), name: 'Ιστοσελίδα κομμωτηρίου' });
}
/* ───────────────────────── φόρμα επικοινωνίας ─────────────────────────
 * Γράφει στην καρτέλα «Μηνύματα», στέλνει email στο κομμωτήριο (replyTo ο αποστολέας) και αντίγραφο στον αποστολέα. */
function neoMinima(d) {
  var onoma = String(d.onoma || '').trim().slice(0, 80), email = String(d.email || '').trim().slice(0, 120),
      til = String(d.tilefono || '').trim().slice(0, 30), min = String(d.minima || '').trim().slice(0, 2000), en = d.glossa === 'en';
  if (d.website) return { ok: true };                                   // παγίδα για ρομπότ
  if (!onoma || !min || (!email && !til)) return { ok: false, minima: en ? 'Please fill in your name, a phone or email, and your message.' : 'Συμπλήρωσε όνομα, τηλέφωνο ή email και το μήνυμά σου.' };
  if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { ok: false, minima: en ? 'The email address does not look right.' : 'Το email δεν φαίνεται σωστό.' };
  var cache = CacheService.getScriptCache(), kl = 'min-' + (email || til);
  if (cache.get(kl)) return { ok: false, minima: en ? 'You just sent us a message. Please wait a minute.' : 'Μόλις μας έστειλες μήνυμα. Περίμενε ένα λεπτό.' };
  cache.put(kl, '1', 60);
  var id = 'M' + Utilities.formatDate(new Date(), ZONI, 'yyMMddHHmmss') + tyxaio(3);
  grapse('Μηνύματα', { id: id, xronos: new Date().toISOString(), onoma: onoma, tilefono: til, email: email, minima: min, glossa: en ? 'en' : 'el', katastasi: 'νέο' });
  var esc = function (x) { return String(x).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var to = props().getProperty('EMAIL_KOMMOTIRIOU') || Session.getEffectiveUser().getEmail();
  var soma = '<p><b>' + esc(onoma) + '</b>' + (til ? ' · ' + esc(til) : '') + (email ? ' · ' + esc(email) : '') + '</p><p style="white-space:pre-wrap">' + esc(min) + '</p>';
  var opt = { to: to, subject: 'Μήνυμα από την ιστοσελίδα · ' + onoma, htmlBody: protypo('Νέο μήνυμα', soma), name: 'Ιστοσελίδα κομμωτηρίου' };
  if (email) opt.replyTo = email;
  MailApp.sendEmail(opt);
  if (email) MailApp.sendEmail({ to: email, subject: en ? 'We received your message · Giannis Hair Salon' : 'Λάβαμε το μήνυμά σου · Κομμωτήριο Γιάννης',
    htmlBody: protypo(en ? 'Thank you, we received your message' : 'Ευχαριστούμε, λάβαμε το μήνυμά σου',
      '<p>' + (en ? 'We will reply as soon as we can. A copy of your message:' : 'Θα σου απαντήσουμε το συντομότερο. Αντίγραφο του μηνύματός σου:') + '</p>' +
      '<p style="background:#f1ece2;border-radius:12px;padding:16px 18px;white-space:pre-wrap">' + esc(min) + '</p>', en),
    name: en ? 'Giannis Hair Salon' : 'Κομμωτήριο Γιάννης', replyTo: to });
  istoriko('ιστοσελίδα', 'μήνυμα', id + ' ' + onoma);
  return { ok: true };
}
function ypoloipoEmail() { return MailApp.getRemainingDailyQuota(); }

/* ───────────────────────── χρονοδιακόπτες ───────────────────────── */
function ypenthymiseis() {
  var t = tora(), ayrio = Diathesimotita.prosthesiImeron(t.imerominia, 1);
  diavase('Ραντεβού').forEach(function (r) {
    if (r.katastasi !== 'Επιβεβαιωμένο' || r.ypenthymisi || !r.email) return;
    var lepta = (r.imerominia === ayrio ? 1440 : (r.imerominia === t.imerominia ? 0 : 99999)) + Diathesimotita.lepta(r.ora) - t.lepta;
    if (lepta <= 25 * 60 && lepta > 2 * 60) {
      if (ypoloipoEmail() < 10) return;
      try { emailPelati(r, null, 'ypenthymisi'); r.ypenthymisi = new Date().toISOString(); grapse('Ραντεβού', r); } catch (e) { console.warn(e); }
    }
  });
}
function antigrafo() {
  var ss = fyllo(), fak = DriveApp.getFolderById(props().getProperty('FAKELOS_ID'));
  DriveApp.getFileById(ss.getId()).makeCopy('Αντίγραφο ' + simera() + ' · ' + ss.getName(), fak);
  var l = [], it = fak.getFiles(); while (it.hasNext()) { var f = it.next(); if (/^Αντίγραφο /.test(f.getName())) l.push(f); }
  l.sort(function (a, b) { return b.getDateCreated() - a.getDateCreated(); }).slice(12).forEach(function (f) { f.setTrashed(true); });
}
function diagrafiPalion() {
  var orio = Diathesimotita.prosthesiImeron(simera(), -730);
  diavase('Πελάτες').filter(function (p) { return (p.teleftaia_episkepsi || p.proti_episkepsi || '9999') < orio; }).reverse().forEach(function (p) { sviseGrammi('Πελάτες', p._row); });
  diavase('Ραντεβού').filter(function (r) { return r.imerominia < orio; }).reverse().forEach(function (r) { sviseGrammi('Ραντεβού', r._row); });
  istoriko('σύστημα', 'διαγραφή δεδομένων > 24 μηνών', orio);
}

/* ───────────────────────── Πίνακας: σύνδεση ───────────────────────── */
function syndesi(kodikos) {
  var h = hash(String(kodikos || '').trim()), rolos = h === props().getProperty('KOD_IDIOKTITI') ? 'idioktitis' : (h === props().getProperty('KOD_SYNERGATI') ? 'synergatis' : null);
  if (!rolos) { Utilities.sleep(1200); return { ok: false, minima: 'Λάθος κωδικός.' }; }
  var t = tyxaio(32); props().setProperty('SYN_' + t, JSON.stringify({ rolos: rolos, lixi: Date.now() + 30 * 864e5, ekdosi: props().getProperty('EKDOSI_KODIKON') }));
  return { ok: true, token: t, rolos: rolos };
}
function rolos_(t, apaitei) {
  var s = props().getProperty('SYN_' + t); if (!s) throw new Error('Η σύνδεση έληξε. Μπες ξανά.');
  s = JSON.parse(s);
  if (s.lixi < Date.now() || s.ekdosi !== props().getProperty('EKDOSI_KODIKON')) { props().deleteProperty('SYN_' + t); throw new Error('Η σύνδεση έληξε. Μπες ξανά.'); }
  if (apaitei === 'idioktitis' && s.rolos !== 'idioktitis') throw new Error('Μόνο ο ιδιοκτήτης.');
  return s.rolos;
}

/* ───────────────────────── Πίνακας: ραντεβού ───────────────────────── */
function p_arxika(t) {
  var rolos = rolos_(t);
  return { rolos: rolos, katalogos: katalogos(), orario: orariaKommoton(), simera: simera(), email: ypoloipoEmail(),
           github_lixi: props().getProperty('GITHUB_TOKEN_IMEROMINIA') ? Diathesimotita.prosthesiImeron(props().getProperty('GITHUB_TOKEN_IMEROMINIA'), 365) : '' };
}
function p_imeres(t, apo, n) {
  rolos_(t);
  var eos = Diathesimotita.prosthesiImeron(apo, (n || 1) - 1);
  var rv = diavase('Ραντεβού').filter(function (r) { return r.imerominia >= apo && r.imerominia <= eos; }).map(function (r) { delete r.token_hash; return r; });
  var kl = diavase('Κλεισίματα').filter(function (c) { return c.imerominia >= apo && c.imerominia <= eos; });
  var aitimata = diavase('Ραντεβού').filter(function (r) { return r.katastasi === 'Αίτημα' && r.imerominia >= simera(); }).length;
  return { rantevou: rv, kleisimata: kl, aitimata: aitimata };
}
function p_aitimata(t) { rolos_(t); return diavase('Ραντεβού').filter(function (r) { return r.katastasi === 'Αίτημα' && r.imerominia >= simera(); }).map(function (r) { delete r.token_hash; return r; }); }
function p_elefthera(t, ids, kommotis, imer, exairesi) {
  rolos_(t);
  var rv = diavase('Ραντεβού').filter(function (r) { return r.id !== exairesi; });
  var ctx = { rv: rv, kan: Object.assign(kanones(), { proeidopoiisi_lepta: 0 }) };
  return wresImeras(ids, kommotis, imer, ctx);
}
function p_neo(t, d) {
  var rolos = rolos_(t);
  var x = kataxorisi(d, d.pigi || 'τηλέφωνο', rolos, !!d.epivoli);
  if (!x.ok) return x;
  if (d.email && d.eidopoiisi) try { emailPelati(x.r, x.token, 'epivevaiosi'); } catch (e) {}
  return { ok: true, id: x.r.id };
}
function vresId(id) { return diavase('Ραντεβού').filter(function (r) { return r.id === id; })[0]; }
function p_metakinisi(t, id, imer, ora, kommotis, epivoli) {
  var rolos = rolos_(t), r = vresId(id); if (!r) return { ok: false, minima: 'Δεν βρέθηκε.' };
  var x = metakinisiEsoteriki(r, imer, ora, kommotis || r.kommotis, epivoli, rolos); if (!x.ok) return x;
  try { emailPelati(x.r, null, 'allagi'); } catch (e) {}
  return { ok: true };
}
function p_katastasi(t, id, k) {
  var rolos = rolos_(t), r = vresId(id); if (!r) return { ok: false, minima: 'Δεν βρέθηκε.' };
  var proigoumeni = r.katastasi; allaxeKatastasi(r, k, rolos);
  try {
    if (k === 'Ακυρώθηκε') emailPelati(r, null, 'akyrosi');
    if (k === 'Επιβεβαιωμένο' && proigoumeni === 'Αίτημα') emailPelati(r, null, 'egkrisi');
    if (k === 'Απορρίφθηκε') emailPelati(r, null, 'aporripsi');
  } catch (e) {}
  return { ok: true };
}
function p_simeiosi(t, id, s) { rolos_(t); var r = vresId(id); r.simeiosi = String(s || '').slice(0, 500); grapse('Ραντεβού', r); return { ok: true }; }
function p_kleisimo(t, d) {
  var rolos = rolos_(t);
  var apo = d.apo_imerominia, eos = d.eos_imerominia || d.apo_imerominia, n = 0;
  for (var x = apo; x <= eos && n < 120; x = Diathesimotita.prosthesiImeron(x, 1), n++)
    grapse('Κλεισίματα', { id: 'K' + Date.now().toString(36) + n, kommotis: d.kommotis || 'oloi', imerominia: x, apo: d.apo || '00:00', eos: d.eos || '24:00', logos: d.logos || '' });
  CacheService.getScriptCache().remove('epomeno'); istoriko(rolos, 'κλείσιμο χρόνου', apo + '–' + eos + ' ' + (d.kommotis || 'oloi'));
  return { ok: true };
}
function p_sviseKleisimo(t, id) { rolos_(t); var c = diavase('Κλεισίματα').filter(function (x) { return x.id === id; })[0]; if (c) sviseGrammi('Κλεισίματα', c._row); return { ok: true }; }
function p_pelates(t, q) {
  rolos_(t); q = String(q || '').toLowerCase().replace(/\s/g, '');
  return diavase('Πελάτες').filter(function (p) { return !q || (p.onoma + p.kinito + p.email).toLowerCase().replace(/\s/g, '').indexOf(q) !== -1; }).slice(0, 30);
}
function p_pelatis(t, id, d) {
  rolos_(t); var p = diavase('Πελάτες').filter(function (x) { return x.id === id; })[0]; if (!p) return { ok: false };
  ['onoma', 'email', 'texniki_simeiosi'].forEach(function (k) { if (d[k] != null) p[k] = String(d[k]).slice(0, 500); });
  if (d.prosfores === false) p.prosfores = ''; grapse('Πελάτες', p); return { ok: true };
}
function p_istorikoPelati(t, id) { rolos_(t); return diavase('Ραντεβού').filter(function (r) { return r.pelatis === id; }).map(function (r) { delete r.token_hash; return r; }).reverse().slice(0, 30); }
function p_sviPelati(t, id) {
  var rolos = rolos_(t, 'idioktitis'), p = diavase('Πελάτες').filter(function (x) { return x.id === id; })[0]; if (!p) return { ok: false };
  diavase('Ραντεβού').filter(function (r) { return r.pelatis === id; }).forEach(function (r) { r.onoma = '—'; r.kinito = ''; r.email = ''; r.simeiosi = ''; r.pelatis = ''; grapse('Ραντεβού', r); });
  sviseGrammi('Πελάτες', p._row); istoriko(rolos, 'διαγραφή πελάτη (ΓΚΠΔ)', id); return { ok: true };
}
function p_kanones(t, d) {
  rolos_(t, 'idioktitis');
  if (d) { Object.keys(KANONES_PROEPILOGI).forEach(function (k) { if (d[k] != null && !isNaN(+d[k])) props().setProperty('KANONAS_' + k, String(+d[k])); }); if (d.email) props().setProperty('EMAIL_KOMMOTIRIOU', d.email); }
  return Object.assign(kanones(), { email: props().getProperty('EMAIL_KOMMOTIRIOU') || Session.getEffectiveUser().getEmail() });
}

/* ───────────────────────── Πίνακας: αναρτήσεις ───────────────────────── */
function p_anartiseis(t) { rolos_(t); return diavase('Αναρτήσεις').reverse(); }
function p_apothikeysiAnartisis(t, a, nees) {
  var rolos = rolos_(t);
  if (!a.synainesi) return { ok: false, minima: 'Χρειάζεται η συναίνεση του εικονιζόμενου.' };
  var fak = DriveApp.getFolderById(props().getProperty('FAKELOS_ID'));
  function anevase(f) { var b = Utilities.newBlob(Utilities.base64Decode(f.data.split(',')[1]), f.type || 'image/jpeg', (f.onoma || 'foto') + '.jpg'); return fak.createFile(b).getId(); }
  ['prin', 'meta'].forEach(function (k) { if (nees && nees[k]) a[k] = anevase(nees[k]); });
  if (nees && nees.fotografies) a.fotografies = (a.fotografies ? a.fotografies.split(',') : []).concat(nees.fotografies.map(anevase)).join(',');
  var yp = diavase('Αναρτήσεις').filter(function (x) { return x.id === a.id; })[0];
  var r = Object.assign(yp || {}, { id: a.id || ('A' + Date.now().toString(36) + tyxaio(3)), imerominia: a.imerominia || simera(), titlos: a.titlos, keimeno: a.keimeno, titlos_en: a.titlos_en || '', keimeno_en: a.keimeno_en || '', ypiresia: a.ypiresia,
    kommotis: a.kommotis, fotografies: a.fotografies || '', prin: a.prin || '', meta: a.meta || '', synainesi: 'ναι', katastasi: a.katastasi || 'Δημοσιευμένη' });
  if (!r.prin && !r.meta && !r.fotografies) return { ok: false, minima: 'Πρόσθεσε τουλάχιστον μία φωτογραφία.' };
  grapse('Αναρτήσεις', r); istoriko(rolos, yp ? 'διόρθωση ανάρτησης' : 'νέα ανάρτηση', r.id + ' ' + r.titlos);
  return { ok: true, id: r.id };
}
function p_sviseAnartisi(t, id) {
  var rolos = rolos_(t), a = diavase('Αναρτήσεις').filter(function (x) { return x.id === id; })[0]; if (!a) return { ok: false };
  [a.prin, a.meta].concat(a.fotografies.split(',')).filter(String).forEach(function (f) { try { DriveApp.getFileById(f).setTrashed(true); } catch (e) {} });
  sviseGrammi('Αναρτήσεις', a._row); istoriko(rolos, 'διαγραφή ανάρτησης', id); return { ok: true };
}
function p_dimosieusi(t) {
  var rolos = rolos_(t), repo = props().getProperty('GITHUB_REPO'), tok = props().getProperty('GITHUB_TOKEN');
  if (!repo || !tok) return { ok: false, minima: 'Δεν έχει οριστεί κλειδί GitHub (μενού Ιστοσελίδα → 3).' };
  var r = UrlFetchApp.fetch('https://api.github.com/repos/' + repo + '/actions/workflows/dimosieusi.yml/dispatches', {
    method: 'post', muteHttpExceptions: true, contentType: 'application/json',
    headers: { Authorization: 'Bearer ' + tok, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' },
    payload: JSON.stringify({ ref: 'main' }) });
  istoriko(rolos, 'δημοσίευση', r.getResponseCode());
  return r.getResponseCode() === 204 ? { ok: true } : { ok: false, minima: 'Το GitHub απάντησε ' + r.getResponseCode() + '. Ίσως έληξε το κλειδί.' };
}

/* ───────────────────────── δεδομένα για τη γεννήτρια (GitHub Actions) ───────────────────────── */
function dedomenaGiaIstotopo() {
  return { ok: true,
    omada: diavase('Κομμωτές').filter(function (k) { return nai(k.energos); }).map(function (k) { return { id: k.id, onoma: k.onoma, eidikotita: k.eidikotita, xroma: k.xroma, online: nai(k.online) }; }),
    ypiresies: diavase('Υπηρεσίες').map(function (y) { delete y._row; return y; }),
    anartiseis: diavase('Αναρτήσεις').filter(function (a) { return a.katastasi === 'Δημοσιευμένη' && nai(a.synainesi); }).map(function (a) { delete a._row; return a; }),
    kritikes: diavase('Κριτικές').filter(function (k) { return k.emfanisi === '' || nai(k.emfanisi); }).map(function (k) { return { onoma: k.onoma, onoma_en: k.onoma_en || k.onoma, asteria: +k.asteria || 5, keimeno: k.keimeno, keimeno_en: k.keimeno_en || '', glossa: 'el', pigi: 'Google' }; }) };
}
function fotoBase64(id) {
  var f = DriveApp.getFileById(id), b = f.getBlob();
  if (f.getParents().next().getId() !== props().getProperty('FAKELOS_ID')) return { ok: false };
  return { ok: true, type: b.getContentType(), data: Utilities.base64Encode(b.getBytes()) };
}
function include(n) { return HtmlService.createHtmlOutputFromFile(n).getContent(); }
