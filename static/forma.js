/* Φόρμα επικοινωνίας: έλεγχος στο πρόγραμμα περιήγησης, αποστολή στο Apps Script (f=minima).
 * Χωρίς api_url (δοκιμαστική έκδοση) δείχνει την επιτυχία χωρίς να στείλει τίποτα. */
(function () {
  var D = document, S = window.SALON || {}, EN = D.documentElement.lang === 'en';
  function T(el, en) { return EN ? en : el; }
  D.querySelectorAll('[data-forma]').forEach(function (f) {
    var kat = f.querySelector('.forma-katastasi'), btn = f.querySelector('[type=submit]');
    function lathos(name, msg) {
      var el = f.elements[name], id = el.id + '-l', p = D.getElementById(id);
      if (!msg) { el.removeAttribute('aria-invalid'); el.removeAttribute('aria-describedby'); if (p) p.remove(); return; }
      el.setAttribute('aria-invalid', 'true'); el.setAttribute('aria-describedby', id);
      if (!p) { p = D.createElement('p'); p.id = id; p.className = 'forma-lathos'; el.parentNode.appendChild(p); }
      p.textContent = msg;
    }
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var v = {}; ['onoma', 'tilefono', 'email', 'minima', 'website'].forEach(function (k) { v[k] = (f.elements[k].value || '').trim(); });
      var ok = true, proto = null;
      function chk(name, msg) { lathos(name, msg); if (msg) { ok = false; proto = proto || name; } }
      chk('onoma', v.onoma ? '' : T('Γράψε το όνομά σου.', 'Please enter your name.'));
      var tilOk = v.tilefono.replace(/\D/g, '').length >= 10, emOk = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v.email);
      chk('tilefono', v.tilefono && !tilOk ? T('Το τηλέφωνο θέλει 10 ψηφία.', 'The phone number needs 10 digits.') : (!v.tilefono && !v.email ? T('Δώσε τηλέφωνο ή email.', 'Give a phone number or an email.') : ''));
      chk('email', v.email && !emOk ? T('Το email δεν φαίνεται σωστό.', 'The email does not look right.') : '');
      chk('minima', v.minima ? '' : T('Γράψε το μήνυμά σου.', 'Please write your message.'));
      if (!ok) { f.elements[proto].focus(); return; }
      btn.disabled = true; kat.className = 'forma-katastasi'; kat.textContent = T('Αποστολή…', 'Sending…');
      var body = { f: 'minima', _key: S.kleidi || '', onoma: v.onoma, tilefono: v.tilefono, email: v.email, minima: v.minima, website: v.website, glossa: EN ? 'en' : 'el' };
      var req = S.api
        ? fetch(S.api, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(body), redirect: 'follow' }).then(function (r) { return r.json(); })
        : new Promise(function (res) { setTimeout(function () { res({ ok: true, epideixi: true }); }, 700); });
      req.then(function (r) {
        btn.disabled = false;
        if (!r || !r.ok) { kat.className = 'forma-katastasi lathos'; kat.textContent = (r && r.minima) || T('Δεν στάλθηκε. Κάλεσέ μας στο τηλέφωνο.', 'Not sent. Please call us.'); return; }
        f.reset(); f.classList.add('stalthike');
        kat.className = 'forma-katastasi epitychia';
        kat.textContent = T('Ευχαριστούμε! Λάβαμε το μήνυμά σου και θα σου απαντήσουμε σύντομα.', 'Thank you! We received your message and will reply soon.') +
          (r.epideixi ? T(' (Δοκιμαστική έκδοση: το μήνυμα δεν στάλθηκε.)', ' (Test version: the message was not sent.)') : '');
      }).catch(function () {
        btn.disabled = false; kat.className = 'forma-katastasi lathos';
        kat.textContent = T('Δεν στάλθηκε. Έλεγξε τη σύνδεση ή κάλεσέ μας.', 'Not sent. Check your connection or call us.');
      });
    });
  });
})();
