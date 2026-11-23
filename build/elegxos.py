#!/usr/bin/env python3
"""Έλεγχος του _site πριν ανέβει. Κωδικός εξόδου 1 αν βρεθεί σφάλμα· τότε μένει online η προηγούμενη έκδοση.

  E1  ένα <h1> ανά σελίδα                       E5  εικόνα που δεν υπάρχει
  E2  <html lang> ≠ γλώσσα διαδρομής (G4)       E6  ίδιος <title> σε δύο σελίδες (ΜΗ-08)
  E3  ελληνικό κείμενο σε αγγλική σελίδα (G1)   E7  hreflang/og:locale λείπει ή λάθος (ΜΗ-06, ΜΗ-16)
  E4  εσωτερικός σύνδεσμος που δεν υπάρχει      E8  Diathesimotita.gs ≠ static/diathesimotita.js
  G7  ίδιος τίτλος σε ΕΛ και ΕΝ (προειδοποίηση)
"""
import re, sys
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlparse, unquote

GR = re.compile(r'[Ͱ-Ͽἀ-῿]')

class P(HTMLParser):
    def handle_startendtag(self, tag, a):
        self.handle_starttag(tag, a)
        if tag not in ('meta', 'link', 'img', 'input', 'br', 'source', 'hr', 'stop', 'path') and self.stack: self.stack.pop()
    def __init__(self):
        super().__init__(); self.h1 = 0; self.lang = ''; self.title = ''; self._t = False; self.links = []; self.imgs = []
        self.text = []; self.skip = 0; self.stack = []; self.hreflang = set(); self.locale = ''
    def handle_starttag(self, tag, a):
        a = dict(a)
        if tag == 'html': self.lang = a.get('lang', '')
        if tag == 'h1': self.h1 += 1
        if tag == 'title': self._t = True
        if tag == 'a' and a.get('href'): self.links.append(a['href'])
        if tag == 'img': self.imgs += [a.get('src', '')] + [s.strip().split(' ')[0] for s in (a.get('srcset') or '').split(',') if s.strip()]
        if tag == 'link' and a.get('rel') == 'alternate' and a.get('hreflang'): self.hreflang.add(a['hreflang'])
        if tag == 'meta' and a.get('property') == 'og:locale': self.locale = a.get('content', '')
        if tag in ('script', 'style'): self.skip += 1
        void = tag in ('meta', 'link', 'img', 'input', 'br', 'source', 'hr', 'stop', 'path')
        if not void: self.stack.append(None if tag == 'html' else a.get('lang'))
        for k in ('alt', 'aria-label', 'title', 'placeholder'):
            if a.get(k) and not any(x for x in self.stack if x) and a.get('lang') is None: self.text.append(a[k])
    def handle_endtag(self, tag):
        if tag == 'title': self._t = False
        if tag in ('script', 'style'): self.skip -= 1
        if self.stack and tag not in ('meta', 'link', 'img', 'input', 'br', 'source', 'hr', 'stop', 'path'): self.stack.pop()
    def handle_data(self, d):
        if self._t: self.title += d
        if self.skip or not d.strip(): return
        if any(x for x in self.stack if x): return          # περιοχή με lang="…" (π.χ. ονόματα στα ελληνικά)
        self.text.append(d.strip())

def main():
    site = Path(sys.argv[1] if len(sys.argv) > 1 else '_site'); err = []; warn = []; titloi = {}
    riza = Path(__file__).resolve().parent.parent
    for f in sorted(site.rglob('*.html')):
        rel = '/' + str(f.relative_to(site)).replace('index.html', '')
        if rel == '/diaxeirisi/': continue   # εφαρμογή διαχείρισης, εκτός ευρετηρίου
        p = P(); p.feed(f.read_text(encoding='utf-8'))
        en = rel.startswith('/en/')
        if p.h1 != 1: err.append(f'E1 {rel}: {p.h1} h1')
        if p.lang != ('en' if en else 'el'): err.append(f'E2 {rel}: lang={p.lang}')
        if rel != '/404.html':
            if not {'el', 'en', 'x-default'} <= p.hreflang: err.append(f'E7 {rel}: hreflang {sorted(p.hreflang)}')
            if p.locale != ('en_US' if en else 'el_GR'): err.append(f'E7 {rel}: og:locale {p.locale}')
        if en:
            for t in p.text:
                if GR.search(t): err.append(f'E3 {rel}: «{t[:70]}»')
        for h in p.links:
            u = urlparse(h)
            if u.scheme or h.startswith(('#', 'tel:', 'mailto:')): continue
            path = unquote(u.path)
            for base in ('/' + site.name, ''):
                pass
            cand = site / path.lstrip('/')
            if not (cand.exists() or (cand / 'index.html').exists()):
                # βάση GitHub Pages (υποφάκελος): δοκίμασε χωρίς το πρώτο τμήμα
                parts = path.lstrip('/').split('/', 1)
                alt = site / (parts[1] if len(parts) > 1 else '')
                if not (alt.exists() or (alt / 'index.html').exists()): err.append(f'E4 {rel}: {h}')
        for s in p.imgs:
            if not s or s.startswith('data:'): continue
            path = unquote(urlparse(s).path).lstrip('/')
            if not (site / path).exists() and not (site / path.split('/', 1)[-1]).exists(): err.append(f'E5 {rel}: {s}')
        titloi.setdefault(p.title.strip(), []).append(rel)
    for t, l in titloi.items():
        if len(l) > 1: err.append(f'E6 ίδιος τίτλος «{t}»: {", ".join(l)}')
    el = {}
    for t, l in titloi.items():
        for r in l: el[r] = t
    for r, t in el.items():
        if not r.startswith('/en/') and el.get('/en' + r) == t and r != '/404.html': warn.append(f'G7 {r}: ίδιος τίτλος ΕΛ/ΕΝ «{t}»')
    a, b = riza / 'static' / 'diathesimotita.js', riza / 'diaxeirisi' / 'Diathesimotita.gs'
    if a.exists() and b.exists() and a.read_text() != b.read_text(): err.append('E8 Diathesimotita.gs διαφέρει από static/diathesimotita.js (cp static/diathesimotita.js diaxeirisi/Diathesimotita.gs)')
    for w in warn: print('προειδοποίηση', w)
    for e in err: print('ΣΦΑΛΜΑ', e)
    n = len(list(site.rglob('*.html')))
    print(f'{n} σελίδες · {len(err)} σφάλματα · {len(warn)} προειδοποιήσεις')
    sys.exit(1 if err else 0)

if __name__ == '__main__':
    main()
