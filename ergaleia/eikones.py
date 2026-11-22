#!/usr/bin/env python3
"""Εικόνες: ylika/images/*.png → meson/eikones/<όνομα>-800.webp / -1600.webp (χωρίς EXIF).

  pm-*.png      σύνθεση «πριν | μετά» 2:1 → κόβεται στη μέση: <όνομα>-prin, <όνομα>-meta (4:5)
  salon*.png    3:2 οριζόντια
  υπόλοιπα      4:5 κάθετα (κοπή στο κέντρο)
Όποια λείπει: εφεδρεία από άλλη πραγματική (ΕΦΕΔΡΕΙΑ), αλλιώς προσωρινή σκούρα εικόνα με τούφες.
Γράφει meson/eikones/prosorines.json με όσες είναι προσωρινές (η γεννήτρια κρύβει τη φωτογραφία χώρου αν είναι προσωρινή).

  python3 ergaleia/eikones.py --pigi ../ylika/images
"""
import argparse, math, random
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter

RIZA = Path(__file__).resolve().parent.parent
XREIAZONTAI = {
    'pm-balayage': 'pm', 'pm-fade': 'pm', 'pm-copper': 'pm',
    'yp-kourema': 'kath', 'yp-xroma': 'kath', 'yp-xtenisma': 'kath', 'yp-therapeies': 'kath',
    'salon': 'oriz',
}

ΕΦΕΔΡΕΙΑ = {'yp-xtenisma': ('pm-balayage', 'meta'), 'yp-therapeies': ('pm-copper', 'meta'), 'yp-kourema': ('pm-fade', 'meta'), 'yp-xroma': ('pm-balayage', 'meta')}

def kopse(im, ar):
    w, h = im.size
    if w / h > ar:
        nw = int(h * ar); x = (w - nw) // 2; return im.crop((x, 0, x + nw, h))
    nh = int(w / ar); y = (h - nh) // 2; return im.crop((0, y, w, y + nh))

def grapse(im, onoma, out, ar):
    im = kopse(im.convert('RGB'), ar)
    for w in (800, 1600):
        h = round(w / ar)
        im.resize((w, h), Image.LANCZOS).save(out / f'{onoma}-{w}.webp', 'WEBP', quality=80 if w == 800 else 76, method=6)

def prosorini(seed, ar, tonos):
    random.seed(seed); W = 1600; H = round(W / ar)
    im = Image.new('RGB', (W, H), (20, 16, 11)); d = ImageDraw.Draw(im)
    for i in range(240):
        x0 = random.uniform(-.1, 1.1) * W; L = H * random.uniform(.7, 1.1); ph = random.uniform(0, 6.28)
        c = [int(a + (b - a) * random.random() * .8) for a, b in zip((44, 28, 18), tonos)]
        pts = [(x0 + math.sin(ph + t * 2.2) * 40 * t + t * 60, -20 + L * t) for t in [k / 24 for k in range(25)]]
        d.line(pts, fill=tuple(c), width=random.choice((2, 3, 4)))
    return im.filter(ImageFilter.GaussianBlur(.6))

def main():
    ap = argparse.ArgumentParser(); ap.add_argument('--pigi', default=str(RIZA.parent / 'ylika' / 'images')); a = ap.parse_args()
    pigi = Path(a.pigi); out = RIZA / 'meson' / 'eikones'; out.mkdir(parents=True, exist_ok=True)
    prosorines = []
    tonoi = {'balayage': (210, 170, 115), 'copper': (196, 90, 40), 'fade': (90, 70, 55)}
    for onoma, eidos in XREIAZONTAI.items():
        f = next((p for p in [pigi / f'{onoma}.png', pigi / f'{onoma}-interior.png'] if p.exists()), None)
        ok = False
        if f:
            try:
                im = Image.open(f); im.load(); ok = True
            except Exception as e:
                print('σφάλμα', f, e)
        if eidos == 'pm':
            if ok:
                w, h = im.size
                grapse(im.crop((0, 0, w // 2, h)), onoma + '-prin', out, 4 / 5)
                grapse(im.crop((w - w // 2, 0, w, h)), onoma + '-meta', out, 4 / 5)
            else:
                t = tonoi.get(onoma.split('-')[1], (150, 110, 80))
                prosorines.append(onoma)
                grapse(prosorini(onoma + 'a', 4 / 5, (70, 50, 35)), onoma + '-prin', out, 4 / 5)
                grapse(prosorini(onoma + 'b', 4 / 5, t), onoma + '-meta', out, 4 / 5)
        else:
            ar = 3 / 2 if eidos == 'oriz' else 4 / 5
            if not ok and onoma in ΕΦΕΔΡΕΙΑ:
                f2 = pigi / (ΕΦΕΔΡΕΙΑ[onoma][0] + '.png')
                if f2.exists():
                    im2 = Image.open(f2); w, h = im2.size
                    im = im2.crop((w - w // 2, 0, w, h)); ok = True; print('↺ εφεδρεία', onoma, '←', f2.name)
            grapse(im if ok else prosorini(onoma, ar, (170, 120, 80)), onoma, out, ar)
            if not ok: prosorines.append(onoma)
        print(('✓ ' if ok else '· προσωρινή ') + onoma)
    import json
    (out / 'prosorines.json').write_text(json.dumps(prosorines), encoding='utf-8')

def _():
    pass

if __name__ == '__main__':
    main()
