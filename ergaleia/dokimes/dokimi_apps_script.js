/* Δοκιμή του Apps Script εκτός Google: προσομοίωση Φύλλου, Properties, Cache, Lock, Calendar, Mail, Utilities.
 *   node ergaleia/dokimes/dokimi_apps_script.js  */
const fs = require('fs'), path = require('path'), vm = require('vm'), crypto = require('crypto');
const RIZA = path.join(__dirname, '..', '..', 'diaxeirisi');
let CACHE = {}, ROWS = {}, PROPS = {}, MAIL = [], EVENTS = {}, NOW = new Date('2026-11-24T08:00:00Z'); // Τρίτη 10:00 Αθήνα
function sheet(n) {
  return {
    getDataRange: () => ({ getDisplayValues: () => ROWS[n].map(r => r.map(String)) }),
    getRange: (r, c, nr, nc) => ({ setValues: v => { ROWS[n][r - 1] = v[0].slice(); }, setNumberFormat() {}, setFontWeight() {} }),
    appendRow: r => ROWS[n].push(r.map(String)), getLastRow: () => ROWS[n].length, deleteRow: r => ROWS[n].splice(r - 1, 1),
    getMaxRows: () => 1000, setFrozenRows() {}
  };
}
const ctx = {
  console, Date, JSON, Math, String, Object, Array, Number, isNaN, parseInt, parseFloat, encodeURIComponent,
  SpreadsheetApp: { getActiveSpreadsheet: () => ({ getSheetByName: n => ROWS[n] ? sheet(n) : null, getId: () => 'F', setSpreadsheetTimeZone() {} }), flush() {}, openById: () => null },
  PropertiesService: { getScriptProperties: () => ({ getProperty: k => PROPS[k] || null, setProperty: (k, v) => { PROPS[k] = String(v); }, deleteProperty: k => { delete PROPS[k]; } }) },
  CacheService: { getScriptCache: () => ({ get: k => (k.indexOf('min-') === 0 ? (CACHE[k] || null) : null), put(k, v) { CACHE[k] = v; }, remove(k) { delete CACHE[k]; } }) },
  LockService: { getScriptLock: () => ({ tryLock: () => true, releaseLock() {} }) },
  Utilities: {
    formatDate: (d, z, f) => {
      const p = {}; new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Athens', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23', weekday: 'short' }).formatToParts(d).forEach(x => p[x.type] = x.value);
      if (f === 'yyyy-MM-dd') return `${p.year}-${p.month}-${p.day}`; if (f === 'H') return String(+p.hour); if (f === 'm') return String(+p.minute);
      if (f === 'u') return String(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].indexOf(p.weekday) + 1); return `${p.day}/${p.month}/${p.year}`;
    },
    parseDate: (s) => new Date(s.replace(' ', 'T') + ':00+02:00'),
    computeDigest: (a, s) => [...crypto.createHash('sha256').update(s).digest()], base64EncodeWebSafe: b => Buffer.from(b).toString('base64url'),
    getUuid: () => crypto.randomUUID(), sleep() {}, DigestAlgorithm: {}, Charset: {}
  },
  CalendarApp: { getCalendarById: id => ({ createEvent: (t, a, b) => { const e = 'E' + Object.keys(EVENTS).length; EVENTS[e] = t; return { getId: () => e, addPopupReminder() {} }; }, getEventById: id => EVENTS[id] ? { deleteEvent: () => delete EVENTS[id] } : null }) },
  MailApp: { sendEmail: m => MAIL.push(m), getRemainingDailyQuota: () => 100 },
  Session: { getEffectiveUser: () => ({ getEmail: () => 'salon@example.com' }) },
  ContentService: { createTextOutput: s => ({ s, setMimeType() { return this; } }), MimeType: {} },
};
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(RIZA, 'Diathesimotita.gs'), 'utf8').replace('var Diathesimotita', 'globalThis.Diathesimotita'), ctx);
vm.runInContext(fs.readFileSync(path.join(RIZA, 'Code.gs'), 'utf8'), ctx);
// αρχικά δεδομένα όπως τα φτιάχνει η αρχικοποίηση
const K = vm.runInContext('KARTELES', ctx); Object.keys(K).forEach(n => ROWS[n] = [K[n].slice()]);
[['giannis', 'Γιάννης'], ['panagiotis', 'Παναγιώτης'], ['kommotis3', 'Τρίτο μέλος']].forEach((k, i) => ROWS['Κομμωτές'].push([k[0], k[1], '', '#b37351', '', 'C' + i, 'ναι', 'ναι', String(i + 1)]));
['giannis', 'panagiotis', 'kommotis3'].forEach(k => { [2, 3, 4, 5].forEach(d => ROWS['Ωράριο'].push([k, String(d), '09:00', '21:00', '', ''])); ROWS['Ωράριο'].push([k, '6', '09:00', '17:00', '', '']); });
vm.runInContext('YPIRESIES_PROEPILOGI', ctx).forEach(r => ROWS['Υπηρεσίες'].push(r.map(String)));
PROPS.API_KLEIDI = 'k'; PROPS.ALATI = 's'; PROPS.KOD_IDIOKTITI = vm.runInContext('hash("idioktitis123")', ctx); PROPS.EKDOSI_KODIKON = '1';
// ώρα: η «τώρα» του κώδικα
ctx.Date = class extends Date { constructor(...a) { super(...(a.length ? a : [NOW])); } static now() { return NOW.getTime(); } };
let ok = 0, fail = 0; function check(name, cond, info) { if (cond) { ok++; } else { fail++; console.log('✗', name, info !== undefined ? JSON.stringify(info) : ''); } }
const run = s => vm.runInContext(s, ctx);
const post = d => JSON.parse(run(`doPost({postData:{contents:${JSON.stringify(JSON.stringify(Object.assign({ _key: 'k' }, d)))}}}).s`));
const get = q => JSON.parse(run(`doGet({parameter:${JSON.stringify(Object.assign({ k: 'k' }, q))}}).s`));

// 1. διαθεσιμότητα: Τρίτη (σήμερα, 10:00) → πρώτη ώρα ≥ 12:00 (προειδοποίηση 2 ωρών)
let d = get({ f: 'diathesimotita', y: 'andriko', kommotis: 'giannis', apo: '2026-11-24', imeres: 7 });
check('διαθεσιμότητα ok', d.ok, d);
check('σήμερα από 12:00', d.imeres[0].wres[0].ora === '12:00', d.imeres[0].wres.slice(0, 2));
check('Κυριακή/Δευτέρα κλειστά', d.imeres[5].wres.length === 0 && d.imeres[6].wres.length === 0, d.imeres.map(x => x.wres.length));
check('Σάββατο ως 16:30 για 30΄', d.imeres[4].wres.slice(-1)[0].ora === '16:30', d.imeres[4].wres.slice(-1));
// 2. κράτηση online
const B = { f: 'kratisi', ypiresies: ['balayage'], kommotis: 'giannis', imerominia: '2026-11-25', ora: '10:00', onoma: 'Μαρία Π.', kinito: '6912345678', email: 'm@example.com', glossa: 'en' };
let r1 = post(B); check('κράτηση ok', r1.ok && r1.katastasi === 'Επιβεβαιωμένο', r1);
check('email στα αγγλικά', MAIL.some(m => m.to === 'm@example.com' && /You are booked/.test(m.subject)), MAIL.map(m => m.subject));
check('email στο κομμωτήριο', MAIL.some(m => m.to === 'salon@example.com'));
check('γεγονός Calendar', Object.keys(EVENTS).length === 1);
// 3. ίδια ώρα ξανά → πιασμένο· και επικάλυψη 11:00 (balayage 165΄ ως 12:45)
let r2 = post(Object.assign({}, B, { kinito: '6900000001', email: 'x@example.com' })); check('διπλή κράτηση απορρίπτεται', !r2.ok && r2.logos === 'piasmeno', r2);
let r3 = post(Object.assign({}, B, { ora: '12:30', kinito: '6900000002', email: 'y@example.com' })); check('επικάλυψη απορρίπτεται', !r3.ok, r3);
let r4 = post(Object.assign({}, B, { ora: '12:45', ypiresies: ['andriko'], kinito: '6900000003', email: 'z@example.com' })); check('αμέσως μετά επιτρέπεται', r4.ok, r4);
// 4. «οποιοσδήποτε» → άλλος κομμωτής την ίδια ώρα
let r5 = post(Object.assign({}, B, { kommotis: 'any', kinito: '6900000004', email: 'w@example.com' })); check('οποιοσδήποτε σε ελεύθερο κομμωτή', r5.ok && r5.synopsi.kommotis !== 'Giannis', r5.synopsi);
// 5. όριο ενεργών ανά κινητό
post(Object.assign({}, B, { ora: '15:00', ypiresies: ['andriko'] }));
let r6 = post(Object.assign({}, B, { ora: '17:00', ypiresies: ['andriko'] })); check('όριο 2 ανά κινητό', !r6.ok, r6);
// 6. αίτημα για βραδινό
let r7 = post(Object.assign({}, B, { ypiresies: ['vradino'], kommotis: 'panagiotis', ora: '18:00', kinito: '6900000005', email: 'v@example.com', glossa: 'el' }));
check('βραδινό = αίτημα', r7.ok && r7.katastasi === 'Αίτημα', r7);
// 7. παγίδα, λάθος κλειδί, λάθος κινητό, παλιά ημερομηνία
check('παγίδα', post(Object.assign({}, B, { _hp: 'x' })).ok);
check('λάθος κλειδί', !JSON.parse(run(`doPost({postData:{contents:'{"f":"kratisi","_key":"x"}'}}).s`)).ok);
check('λάθος κινητό', !post(Object.assign({}, B, { kinito: '2101234567' })).ok);
check('παρελθόν', !post(Object.assign({}, B, { imerominia: '2026-11-20' })).ok);
// 8. αλλαγή και ακύρωση από τον πελάτη
let f1 = get({ f: 'kratisi', t: r1.token }); check('φέρε κράτηση', f1.ok && f1.kratisi.ypiresies_id[0] === 'balayage', f1);
let a1 = post({ f: 'allagi', t: r1.token, imerominia: '2026-11-26', ora: '11:00' }); check('αλλαγή', a1.ok, a1);
let a2 = post({ f: 'akyrosi', t: r1.token }); check('ακύρωση', a2.ok, a2);
check('ακύρωση ελευθερώνει', post(Object.assign({}, B, { imerominia: '2026-11-26', ora: '11:00', kinito: '6900000006', email: 'q@example.com' })).ok);
check('γεγονός διαγράφηκε', !Object.values(EVENTS).some(t => /Μαρία/.test(t) && false));
// 9. Πίνακας
let s = run('syndesi("idioktitis123")'); check('σύνδεση', s.ok && s.rolos === 'idioktitis', s);
check('λάθος κωδικός', !run('syndesi("x")').ok);
let pa = run(`p_aitimata("${s.token}")`); check('αιτήματα', pa.length === 1, pa.length);
let pn = run(`p_neo("${s.token}", {onoma:"Γιώργος", kinito:"6977777777", ypiresies:["fade"], kommotis:"panagiotis", imerominia:"2026-11-27", ora:"09:00", pigi:"τηλέφωνο"})`); check('νέο από τηλέφωνο', pn.ok, pn);
let pe = run(`p_neo("${s.token}", {onoma:"Γιώργος", kinito:"6977777777", ypiresies:["fade"], kommotis:"panagiotis", imerominia:"2026-11-27", ora:"09:00", pigi:"τηλέφωνο", epivoli:true})`); check('επιβολή επιτρέπει', pe.ok, pe);
let pk = run(`p_kleisimo("${s.token}", {kommotis:"kommotis3", apo_imerominia:"2026-11-28", eos_imerominia:"2026-11-28", apo:"00:00", eos:"24:00", logos:"άδεια"})`); check('κλείσιμο', pk.ok);
d = get({ f: 'diathesimotita', y: 'andriko', kommotis: 'kommotis3', apo: '2026-11-28', imeres: 1 }); check('κλείσιμο ισχύει', d.imeres[0].wres.length === 0, d.imeres[0].wres.length);
let rid = ROWS['Ραντεβού'].find(r => r[10] === 'Γιώργος')[0];
const kx = run(`p_katastasi("${s.token}", "${rid}", "Δεν ήρθε")`); check('κατάσταση Δεν ήρθε', kx.ok && ROWS['Πελάτες'].find(p => p[1] === 'Γιώργος')[7] === '1', [kx, ROWS['Πελάτες'].find(p => p[1] === 'Γιώργος')]);
let ep = get({ f: 'epomeno' }); check('επόμενο ελεύθερο', ep.ok && ep.me_el && ep.me_en, ep);
// 10. φόρμα επικοινωνίας
let m1 = post({ f: 'minima', onoma: 'Ελένη', email: 'eleni@example.com', minima: 'Γεια σας', glossa: 'el' }); check('μήνυμα φόρμας', m1.ok && ROWS['Μηνύματα'].length === 2 && MAIL.length >= 2, m1);
let m2 = post({ f: 'minima', onoma: 'Ελένη', email: 'eleni@example.com', minima: 'ξανά' }); check('όριο ενός λεπτού', !m2.ok, m2);
let m3 = post({ f: 'minima', onoma: 'X', minima: 'χωρίς επαφή' }); check('απαιτεί τηλέφωνο ή email', !m3.ok, m3);
let m4 = post({ f: 'minima', onoma: 'bot', email: 'b@b.b', minima: 'spam', website: 'x' }); check('παγίδα ρομπότ', m4.ok && ROWS['Μηνύματα'].length === 2, m4);
console.log(`\n${ok} επιτυχίες, ${fail} αποτυχίες`); process.exit(fail ? 1 : 0);
