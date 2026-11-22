#!/usr/bin/env python3
"""Φέρνει το περιεχόμενο από τον Πίνακα διαχείρισης (Φύλλο Google) για τη γεννήτρια.

    python3 build/fere_apo_fyllo.py --url <…/exec> --kleidi <DEDOMENA_KLEIDI> --dedomena _dedomena --meson .cache/meson

Γράφει στο --dedomena: omada.json, ypiresies.json, anartiseis.json, kritikes.json (συγχωνευμένα με τα αρχεία
του αποθετηρίου: τα κείμενα σελίδων και τα αγγλικά των υπηρεσιών μένουν από το αποθετήριο).
Φωτογραφίες αναρτήσεων: από το Drive → <meson>/eikones/d-<id>-800.webp / -1600.webp (χωρίς EXIF, κρυφή μνήμη).
Αν το Φύλλο δεν έχει αναρτήσεις, κρατά τις αναρτήσεις του αποθετηρίου (ο ιστότοπος δεν αδειάζει ποτέ).
"""
import argparse, base64, io, json, sys, urllib.parse, urllib.request
from pathlib import Path
from PIL import Image, ImageOps

RIZA = Path(__file__).resolve().parent.parent

def get(url, **q):
    u = url + ('&' if '?' in url else '?') + urllib.parse.urlencode(q)
    with urllib.request.urlopen(u, timeout=90) as r:
        return json.loads(r.read().decode('utf-8'))

def foto(url, kleidi, fid, meson):
    out = meson / 'eikones'; out.mkdir(parents=True, exist_ok=True)
    onoma = 'd-' + fid
    if (out / f'{onoma}-1600.webp').exists():
        return onoma
    r = get(url, f='foto', id=fid, k=kleidi)
    if not r.get('ok'):
        raise RuntimeError(f'φωτογραφία {fid}: δεν δόθηκε')
    im = ImageOps.exif_transpose(Image.open(io.BytesIO(base64.b64decode(r['data'])))).convert('RGB')
    w, h = im.size; ar = 4 / 5
    if w / h > ar:
        nw = int(h * ar); im = im.crop(((w - nw) // 2, 0, (w - nw) // 2 + nw, h))
    else:
        nh = int(w / ar); im = im.crop((0, (h - nh) // 2, w, (h - nh) // 2 + nh))
    for W in (800, 1600):
        im.resize((W, round(W / ar)), Image.LANCZOS).save(out / f'{onoma}-{W}.webp', 'WEBP', quality=80, method=6)
    return onoma

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--url', required=True); ap.add_argument('--kleidi', required=True)
    ap.add_argument('--dedomena', default='_dedomena'); ap.add_argument('--meson', default='.cache/meson')
    a = ap.parse_args()
    d = get(a.url, f='dedomena', k=a.kleidi)
    if not d.get('ok'):
        sys.exit('Το Φύλλο δεν απάντησε σωστά: ' + json.dumps(d, ensure_ascii=False)[:200])
    out = Path(a.dedomena); out.mkdir(parents=True, exist_ok=True); meson = Path(a.meson)
    repo = lambda f: json.loads((RIZA / 'periexomeno' / f).read_text(encoding='utf-8'))

    # ομάδα: τα στοιχεία του Φύλλου πάνω στα αρχεία του αποθετηρίου (κρατούνται τα αγγλικά)
    omada = {k['id']: k for k in repo('omada.json')}
    for k in d.get('omada', []):
        omada[k['id']] = {**omada.get(k['id'], {}), **{x: k[x] for x in ('id', 'onoma', 'eidikotita', 'xroma', 'online') if x in k}}
    ids = [k['id'] for k in d.get('omada', [])] or list(omada)
    (out / 'omada.json').write_text(json.dumps([omada[i] for i in ids], ensure_ascii=False, indent=1), encoding='utf-8')

    # υπηρεσίες: ονόματα, διάρκειες, τιμές από το Φύλλο· κείμενα ομάδων από το αποθετήριο
    yp = repo('ypiresies.json'); rows = d.get('ypiresies', [])
    if rows:
        for g in yp['omades']:
            g['ypiresies'] = [{'id': r['id'], 'onoma': r['onoma'], 'onoma_en': r.get('onoma_en', ''), 'tmimata': r['tmimata'],
                               'timi': float(r['timi']) if r.get('timi') else None, 'online': r.get('online') or 'nai'}
                              for r in sorted(rows, key=lambda r: int(r.get('seira') or 0)) if r['omada'] == g['id']] or g['ypiresies']
        nyf = next((r for r in rows if r['omada'] == 'nyfiko'), None)
        if nyf:
            yp['nyfiko'].update({'onoma': nyf['onoma'], 'tmimata': nyf['tmimata'], 'timi': float(nyf['timi']) if nyf.get('timi') else None})
    (out / 'ypiresies.json').write_text(json.dumps(yp, ensure_ascii=False, indent=1), encoding='utf-8')

    # αναρτήσεις με φωτογραφίες από το Drive
    an = []
    for x in d.get('anartiseis', []):
        try:
            prin = foto(a.url, a.kleidi, x['prin'], meson) if x.get('prin') else ''
            meta = foto(a.url, a.kleidi, x['meta'], meson) if x.get('meta') else ''
            fot = [foto(a.url, a.kleidi, f, meson) for f in x.get('fotografies', '').split(',') if f.strip()]
        except Exception as e:
            print(f"::warning::Ανάρτηση «{x.get('titlos')}» χωρίς φωτογραφίες: {e}"); continue
        if not (meta or fot):
            continue
        an.append({'id': x['id'], 'imerominia': x['imerominia'], 'titlos': x['titlos'], 'keimeno': x.get('keimeno', ''),
                   'titlos_en': x.get('titlos_en', ''), 'keimeno_en': x.get('keimeno_en', ''), 'ypiresia': x['ypiresia'], 'kommotis': x.get('kommotis', ''),
                   'prin': prin if prin and meta else '', 'meta': meta if prin and meta else '', 'fotografies': fot or ([meta] if meta and not prin else []),
                   'synainesi': True, 'katastasi': 'Δημοσιευμένη'})
    if not an:
        an = repo('anartiseis.json'); print('Το Φύλλο δεν έχει αναρτήσεις· κρατώ του αποθετηρίου.')
    (out / 'anartiseis.json').write_text(json.dumps(an, ensure_ascii=False, indent=1), encoding='utf-8')
    (out / 'kritikes.json').write_text(json.dumps(d.get('kritikes') or repo('kritikes.json'), ensure_ascii=False, indent=1), encoding='utf-8')
    print(f"Από το Φύλλο: {len(ids)} κομμωτές, {len(rows)} υπηρεσίες, {len(an)} αναρτήσεις, {len(d.get('kritikes', []))} κριτικές")

if __name__ == '__main__':
    main()
