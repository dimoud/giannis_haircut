#!/usr/bin/env python3
"""Γεννήτρια στατικού ιστότοπου «Κομμωτήριο Γιάννης».

    python3 build/build.py                      # → _site/  (τοπικά, βάση "/")
    python3 build/build.py --base /giannis_haircut --tomeas https://expertease.eu/giannis_haircut
    python3 build/build.py --dedomena _dedomena  # περιεχόμενο από τον Πίνακα (Φύλλο), αλλιώς periexomeno/

Μία πηγή για κεφαλίδα/μενού/υποσέλιδο (kelyfos). Όλες οι σελίδες είναι στατικές· μόνο η /kratisi/ μιλά με το API.
"""
import argparse, html, json, re, shutil, sys, unicodedata
from datetime import date
from pathlib import Path

RIZA = Path(__file__).resolve().parent.parent
E = html.escape

# ───────────────────────── βοηθητικά ─────────────────────────

def slugify(s):
    tr = {'α':'a','β':'v','γ':'g','δ':'d','ε':'e','ζ':'z','η':'i','θ':'th','ι':'i','κ':'k','λ':'l','μ':'m','ν':'n',
          'ξ':'x','ο':'o','π':'p','ρ':'r','σ':'s','ς':'s','τ':'t','υ':'y','φ':'f','χ':'x','ψ':'ps','ω':'o'}
    s = unicodedata.normalize('NFD', s.lower())
    s = ''.join(c for c in s if unicodedata.category(c) != 'Mn')
    s = ''.join(tr.get(c, c) for c in s)
    return re.sub(r'[^a-z0-9]+', '-', s).strip('-')[:60]

def lepta(tm):
    return sum(int(x.strip()[1:]) for x in tm.split(',') if x.strip())

def diarkeia_keimeno(tm, c=None):
    m = lepta(tm)
    en = c is not None and c.lang == 'en'
    if m < 60:
        return f'{m} min' if en else f'{m}΄'
    h, r = divmod(m, 60)
    if en:
        return f'{h} h' + (f' {r} min' if r else '')
    return (f'{h} ώρα' if h == 1 else f'{h} ώρες') + (f' {r}΄' if r else '')

class Ctx:
    pass

def t(c, el, en):
    return en if c.lang == 'en' else el

def L(c, o, k):
    """πεδίο στη γλώσσα της σελίδας (κλειδί_en στα αγγλικά, αλλιώς το ελληνικό)"""
    if c.lang == 'en' and o.get(k + '_en') not in (None, '', []):
        return o[k + '_en']
    return o.get(k)

# ───────────────────────── κέλυφος ─────────────────────────

def MENU(c):
    return [
        ('ypiresies', t(c, 'Υπηρεσίες', 'Services'), '/ypiresies/'),
        ('douleies', t(c, 'Δουλειές μας', 'Our work'), '/douleies/'),
        ('omada', t(c, 'Ομάδα', 'Team'), '/omada/'),
        ('epikoinonia', t(c, 'Επικοινωνία', 'Contact'), '/epikoinonia/'),
    ]

def u(c, path):
    """διαδρομή με τη βάση (GitHub Pages σε υποφάκελο ή δικός τομέας) και τη γλώσσα"""
    if path.startswith(('http', '#', 'tel:', 'mailto:')):
        return path
    if path.startswith(('/static/', '/meson/')):
        return c.base + path
    return c.base + ('/en' if c.lang == 'en' else '') + path

def u_glossa(c, path, lang):
    if path == '/404.html':
        path = '/'
    return c.base + ('/en' if lang == 'en' else '') + path

def apolyto(c, path, lang=None):
    lang = lang or c.lang
    return c.tomeas + ('/en' if lang == 'en' else '') + path

def eikona(c, onoma, alt, cls='', sizes='(max-width: 734px) 92vw, 46vw', lazy=True, vt=None, ratio=(4, 5)):
    w, h = ratio[0] * 400, ratio[1] * 400
    src = u(c, f'/meson/eikones/{onoma}-800.webp')
    srcset = f"{u(c, f'/meson/eikones/{onoma}-800.webp')} 800w, {u(c, f'/meson/eikones/{onoma}-1600.webp')} 1600w"
    st = f' style="view-transition-name:{vt}"' if vt else ''
    fort = 'loading="lazy" ' if lazy else 'fetchpriority="high" '
    return (f'<img class="{cls}" src="{src}" srcset="{srcset}" sizes="{sizes}" width="{w}" height="{h}" '
            f'alt="{E(alt)}" {fort}decoding="async"{st}>')

def orario_html(c):
    return ''.join(f'<li><span>{E(L(c, o, "onoma"))}</span><span>{t(c, "Κλειστά", "Closed") if o.get("kleisto") else o["apo"] + "–" + o["eos"]}</span></li>'
                   for o in c.r['orario'])

def dieythynsi(c, br=True):
    r = c.r
    sep = '<br>' if br else ', '
    return f"{E(L(c, r, 'odos'))}, {E(L(c, r, 'perioxi'))}{sep}{E(r['tk'])} {E(L(c, r, 'poli'))}"

def jsonld_epixeirisi(c):
    r = c.r
    days = {2: 'Tuesday', 3: 'Wednesday', 4: 'Thursday', 5: 'Friday', 6: 'Saturday'}
    oh = [{'@type': 'OpeningHoursSpecification', 'dayOfWeek': days[o['imera']], 'opens': o['apo'], 'closes': o['eos']}
          for o in r['orario'] if not o.get('kleisto')]
    return {
        '@context': 'https://schema.org', '@type': 'HairSalon', '@id': c.tomeas + '/#salon',
        'name': r['onoma'], 'alternateName': 'Giannis Hair Salon', 'url': c.tomeas + '/', 'telephone': r['tilefono_e164'], 'email': r['email'],
        'image': c.tomeas + '/meson/eikones/' + ('pm-balayage-meta' if 'salon' in getattr(c, 'prosorines', []) else 'salon') + '-1600.webp',
        'address': {'@type': 'PostalAddress', 'streetAddress': r['odos'], 'addressLocality': 'Πολίχνη',
                    'addressRegion': 'Θεσσαλονίκη', 'postalCode': r['tk'].replace(' ', ''), 'addressCountry': 'GR'},
        'geo': {'@type': 'GeoCoordinates', 'latitude': r['lat'], 'longitude': r['lng']},
        'openingHoursSpecification': oh, 'paymentAccepted': 'Cash, Credit Card, Contactless',
        'knowsLanguage': ['el', 'en'], 'sameAs': [r['instagram']],
        'potentialAction': {'@type': 'ReserveAction', 'target': {'@type': 'EntryPoint', 'urlTemplate': c.tomeas + '/kratisi/',
                            'inLanguage': 'el', 'actionPlatform': ['http://schema.org/DesktopWebPlatform', 'http://schema.org/MobileWebPlatform']}},
    }

def kelyfos(c, path, titlos, perigrafi, soma, energo='', jsonld=None, sxima='skoteino', scripts=(), og_eikona='salon', psixoula=None):
    r = c.r
    if og_eikona in c.prosorines:
        og_eikona = 'pm-balayage-meta'
    en = c.lang == 'en'
    canon = apolyto(c, path)
    ld = [jsonld_epixeirisi(c)] + (jsonld or [])
    if psixoula:
        ld.append({'@context': 'https://schema.org', '@type': 'BreadcrumbList', 'itemListElement': [
            {'@type': 'ListItem', 'position': i + 1, 'name': n, 'item': apolyto(c, p)} for i, (n, p) in enumerate(psixoula)]})
    ld_html = ''.join(f'<script type="application/ld+json">{json.dumps(x, ensure_ascii=False)}</script>' for x in ld)
    AC = ' aria-current="page"'
    nav = ''.join(f'<li><a href="{u(c, p)}"{AC if energo == k else ""}>{E(n)}</a></li>' for k, n, p in MENU(c))
    allo = 'el' if en else 'en'
    glossa = (f'<a class="glossa" href="{u_glossa(c, path, allo)}" hreflang="{allo}" lang="{allo}" '
              f'aria-label="{"Ελληνικά" if en else "English"}">{"ΕΛ" if en else "EN"}</a>')
    robots = '<meta name="robots" content="noindex, nofollow">' if r.get('dokimastiko') else ''
    fonts = ''.join(f'<link rel="preload" href="{u(c, "/static/fonts/" + f)}" as="font" type="font/woff2" crossorigin>'
                    for f in (('noto-serif-display-latin-300-normal.woff2', 'noto-serif-display-latin-300-italic.woff2', 'manrope-latin-400-normal.woff2') if en else
                              ('noto-serif-display-greek-300-normal.woff2', 'noto-serif-display-greek-300-italic.woff2', 'manrope-greek-400-normal.woff2')))
    sc = ''.join(f'<script src="{u(c, "/static/" + s)}?v={c.ekdosi}" defer></script>' for s in scripts)
    cfg = json.dumps({'base': c.base, 'lang': c.lang, 'v': c.ekdosi, 'api': r.get('api_url', ''), 'kleidi': r.get('api_kleidi', ''),
                      'tilefono': r['tilefono'], 'tel': r['tilefono_e164'], 'ga': r.get('ga_id', '')}, ensure_ascii=False)
    psixoula_html = ''
    if psixoula and len(psixoula) > 1:
        psixoula_html = f'<nav class="psixoula wrap" aria-label="{t(c, "Διαδρομή", "Breadcrumb")}"><ol>' + ''.join(
            (f'<li><a href="{u(c, p)}">{E(n)}</a></li>' if i < len(psixoula) - 1 else f'<li aria-current="page">{E(n)}</li>')
            for i, (n, p) in enumerate(psixoula)) + '</ol></nav>'
    yp_links = ''.join(f'<li><a href="{u(c, "/ypiresies/" + g["slug"] + "/")}">{E(L(c, g, "titlos_plires"))}</a></li>' for g in c.yp['omades'])
    return f'''<!doctype html>
<html lang="{c.lang}" data-sxima="{sxima}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{E(titlos)}</title>
<meta name="description" content="{E(perigrafi)}">
{robots}
<link rel="canonical" href="{canon}">
<link rel="alternate" hreflang="el" href="{apolyto(c, path, 'el')}">
<link rel="alternate" hreflang="en" href="{apolyto(c, path, 'en')}">
<link rel="alternate" hreflang="x-default" href="{apolyto(c, path, 'el')}">
<meta property="og:type" content="website"><meta property="og:locale" content="{'en_US' if en else 'el_GR'}"><meta property="og:locale:alternate" content="{'el_GR' if en else 'en_US'}">
<meta property="og:site_name" content="{E(r['onoma'] if not en else 'Giannis Hair Salon')}">
<meta property="og:title" content="{E(titlos)}"><meta property="og:description" content="{E(perigrafi)}">
<meta property="og:url" content="{canon}"><meta property="og:image" content="{c.tomeas}/meson/eikones/{og_eikona}-1600.webp">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#14100b">
<link rel="icon" href="{u(c, '/static/favicon.svg')}" type="image/svg+xml">
{fonts}
<link rel="stylesheet" href="{u(c, '/static/site.css')}?v={c.ekdosi}">
<script>document.documentElement.classList.add('js');window.SALON={cfg};setTimeout(function(){{document.documentElement.classList.add('kinisi-asfaleia')}},2500)</script>
{ld_html}
</head>
<body>
<a class="skip" href="#kyrio">{t(c, 'Μετάβαση στο περιεχόμενο', 'Skip to content')}</a>
<header class="kefalida" data-kefalida>
  <div class="wrap kefalida-in">
    <a class="logo" href="{u(c, '/')}" aria-label="{E(t(c, r['onoma'] + ', αρχική', 'Giannis Hair Salon, home'))}">
      <span class="logo-g">{spira_svg('spira-logo', grammes=False, gid='xg-logo')}{t(c, 'Γιάννης', 'Giannis')}</span><span class="logo-s">{E(L(c, r, 'ypotitlos'))}</span>
    </a>
    <nav class="menou" aria-label="{t(c, 'Κύριο μενού', 'Main menu')}" id="menou">
      <ul>{nav}</ul>
      {glossa}
      <a class="btn btn-mikro" href="{u(c, '/kratisi/')}">{t(c, 'Κλείσε ραντεβού', 'Book now')}</a>
    </nav>
    <button class="menou-btn" aria-expanded="false" aria-controls="menou" aria-label="{t(c, 'Άνοιγμα μενού', 'Open menu')}"><span></span><span></span></button>
  </div>
</header>
<div class="menou-fonto" hidden></div>
{psixoula_html}
<main id="kyrio">
{soma}
</main>
<footer class="ypo">
  <div class="wrap ypo-plegma">
    <div class="ypo-onoma">
      <p class="logo-g">{t(c, 'Γιάννης', 'Giannis')}</p>
      <p>{dieythynsi(c)}</p>
      <p><a href="tel:{r['tilefono_e164']}">{E(r['tilefono'])}</a><br><a href="mailto:{r['email']}">{E(r['email'])}</a></p>
      <p><a href="{r['instagram']}" rel="noopener" target="_blank">Instagram {E(r['instagram_onoma'])}</a></p>
    </div>
    <div><p class="ypo-titlos">{t(c, 'Ωράριο', 'Opening hours')}</p><ul class="orario">{orario_html(c)}</ul></div>
    <div><p class="ypo-titlos">{t(c, 'Υπηρεσίες', 'Services')}</p><ul>{yp_links}<li><a href="{u(c, '/nyfiko-xtenisma/')}">{t(c, 'Νυφικό χτένισμα', 'Bridal hair')}</a></li></ul></div>
    <div><p class="ypo-titlos">{t(c, 'Πληροφορίες', 'Information')}</p><ul>
      <li><a href="{u(c, '/kratisi/')}">{t(c, 'Online κράτηση', 'Online booking')}</a></li>
      <li><a href="{u(c, '/oroi-kratiseon/')}">{t(c, 'Όροι κρατήσεων', 'Booking terms')}</a></li>
      <li><a href="{u(c, '/aporrito/')}">{t(c, 'Απόρρητο και cookies', 'Privacy and cookies')}</a></li>
      <li><a href="{u(c, '/prosvasimotita/')}">{t(c, 'Δήλωση προσβασιμότητας', 'Accessibility statement')}</a></li></ul></div>
  </div>
  <div class="wrap ypo-kato">
    <p>© {date.today().year} {E(t(c, r['onoma'], 'Giannis Hair Salon'))} · <span lang="el">{E(r['nomiko'])}</span></p>
    <p class="expertease">{t(c, 'Σχεδίαση και ανάπτυξη', 'Design and development')} <a href="https://expertease.eu/webdesign/" rel="noopener" target="_blank">Expertease Designs</a></p>
  </div>
</footer>
<nav class="kato-bara" aria-label="{t(c, 'Γρήγορες ενέργειες', 'Quick actions')}">
  <a class="btn" href="{u(c, '/kratisi/')}">{t(c, 'Ραντεβού', 'Book')}</a>
  <a class="btn btn-deyt" href="tel:{r['tilefono_e164']}">{t(c, 'Κλήση', 'Call')}</a>
</nav>
<script src="{u(c, '/static/site.js')}?v={c.ekdosi}" defer></script>
{sc}
</body>
</html>
'''

# ───────────────────────── κοινά κομμάτια ─────────────────────────

def energeies(c, kratisi='/kratisi/', keimeno=None, cls=''):
    r = c.r
    keimeno = keimeno or t(c, 'Κλείσε ραντεβού', 'Book now')
    return (f'<div class="energeies {cls}"><a class="btn" href="{u(c, kratisi)}">{E(keimeno)}</a>'
            f'<a class="syndesmos" href="tel:{r["tilefono_e164"]}">{t(c, "Κάλεσε", "Call")} {E(r["tilefono"])} ›</a></div>')

def etiketa(x):
    return f'<p class="etiketa" data-reveal>{E(x)}</p>'

def sygkrisi(c, a, lazy=True, sizes='(max-width: 734px) 92vw, 46vw'):
    """λεπίδα «Πριν | Μετά»: αριστερά το μετά, δεξιά το πριν· σύρσιμο και πληκτρολόγιο"""
    tl = L(c, a, 'titlos')
    return f'''<figure class="pm" data-pm style="--p:2">
  <div class="pm-fotos">
    {eikona(c, a['prin'], t(c, 'Πριν: ', 'Before: ') + tl, 'pm-prin', sizes=sizes, lazy=lazy)}
    <div class="pm-meta-wrap">{eikona(c, a['meta'], t(c, 'Μετά: ', 'After: ') + tl, 'pm-meta', sizes=sizes, lazy=lazy)}</div>
    <span class="pm-lbl pm-lbl-a">{t(c, 'Πριν', 'Before')}</span><span class="pm-lbl pm-lbl-b">{t(c, 'Μετά', 'After')}</span>
    <div class="pm-lepida" aria-hidden="true"></div>
  </div>
</figure>'''

def ypiresia_by_id(c):
    m = {}
    for g in c.yp['omades']:
        for s in g['ypiresies']:
            m[s['id']] = (g, s)
    m[c.yp['nyfiko']['id']] = (None, c.yp['nyfiko'])
    return m

def to_kommoti(c, k):
    """«με τον Γιάννη» / «with Giannis» — το προσωρινό μέλος χωρίς άρθρο"""
    if c.lang == 'en':
        return 'with ' + L(c, k, 'onoma')
    if k.get('prosorino'):
        return 'με ' + k['onoma'].lower()
    return 'με τον ' + {'Γιάννης': 'Γιάννη', 'Παναγιώτης': 'Παναγιώτη'}.get(k['onoma'], k['onoma'])

def kartela_anartisis(c, a):
    g, s = c.ymap.get(a['ypiresia'], (None, None))
    eik = a.get('meta') or a['fotografies'][0]
    k = next((k for k in c.omada if k['id'] == a.get('kommotis')), None)
    return f'''<a class="douleia" href="{u(c, a['url'])}" data-omada="{g['id'] if g else 'nyfiko'}" data-reveal>
  {eikona(c, eik, L(c, a, 'titlos'), 'douleia-img', sizes='(max-width: 734px) 46vw, 30vw', vt=f"an-{a['slug']}")}
  <span class="douleia-txt"><span class="douleia-yp">{E(L(c, s, 'onoma') if s else '')}</span><span class="douleia-t">{E(L(c, a, 'titlos'))}</span>
  {f'<span class="douleia-k">{E(L(c, k, "onoma"))}</span>' if k else ''}</span>
</a>'''

def kleisimo(c, titlos=None):
    r = c.r
    titlos = titlos or t(c, 'Κλείσε την ώρα σου.', 'Book your time.')
    maps = f'https://www.google.com/maps?q={r["lat"]},{r["lng"]}&z=17&output=embed&hl={c.lang}'
    return f'''<section class="enotita kleisimo" data-sxima="skoteino">
  <div class="wrap kleisimo-plegma">
    <div>
      {etiketa(t(c, 'Ραντεβού', 'Appointments'))}
      <h2 class="dilosi" data-reveal>{E(titlos)}</h2>
      <div class="eisitirio" data-eisitirio aria-live="polite">
        <span class="eis-etik">{t(c, 'Επόμενο ελεύθερο', 'Next available')}</span>
        <span class="eis-ora" data-epomeno-ora>{t(c, 'Κλείσε online σε ένα λεπτό', 'Book online in a minute')}</span>
        <span class="eis-k" data-epomeno-k></span>
        <a class="eis-link" href="{u(c, '/kratisi/')}" data-epomeno-link>{t(c, 'Κράτησε αυτή την ώρα ›', 'Book this time ›')}</a>
      </div>
      {energeies(c)}
    </div>
    <div class="kleisimo-plirof" data-reveal>
      <p class="ypo-titlos">{t(c, 'Ωράριο', 'Opening hours')}</p><ul class="orario">{orario_html(c)}</ul>
      <p class="dieythynsi">{dieythynsi(c)}</p>
      {xartis(c)}
    </div>
  </div>
</section>'''

XARTIS_SVG = ('<svg class="xartis-svg" viewBox="0 0 400 260" aria-hidden="true" preserveAspectRatio="xMidYMid slice">'
  '<g fill="none" stroke="currentColor" stroke-linecap="round">'
  '<path d="M-10 70 L410 40 M-10 150 L410 120 M-10 228 L410 205 M60 -10 L95 270 M170 -10 L190 270 M285 -10 L300 270 M-10 20 L180 270" stroke-width="10" opacity=".16"/>'
  '<path d="M-10 108 L410 82 M-10 190 L410 165 M128 -10 L145 270 M235 -10 L246 270 M345 -10 L352 270" stroke-width="4" opacity=".12"/>'
  '</g><circle cx="200" cy="128" r="46" class="xartis-palmos"/><circle cx="200" cy="128" r="22" class="xartis-palmos x2"/>'
  '<path d="M200 150 C190 132 180 122 180 110 a20 20 0 0 1 40 0 c0 12 -10 22 -20 40z" class="xartis-pin"/><circle cx="200" cy="110" r="7" fill="#14100b"/></svg>')

def xartis(c):
    r = c.r
    maps = f'https://www.google.com/maps?q={r["lat"]},{r["lng"]}&z=17&output=embed&hl={c.lang}'
    odigies = f'https://www.google.com/maps/dir/?api=1&destination={r["lat"]},{r["lng"]}'
    return f'''<div class="xartis-plaisio">
      <div class="xartis" data-xartis data-src="{E(maps)}" data-titlos="{E(t(c, 'Χάρτης: Μαυρομιχάλη 15, Πολίχνη', 'Map: 15 Mavromichali St., Polichni'))}">
        {XARTIS_SVG}
        <p class="xartis-lez">{t(c, 'Μαυρομιχάλη 15 & Ευκλείδη', '15 Mavromichali & Efkleidou St.')}<small>{t(c, 'Άγιος Παντελεήμονας, Πολίχνη', 'Agios Panteleimonas, Polichni')}</small></p>
        <button type="button" class="xartis-btn">{t(c, 'Άνοιξε τον χάρτη Google', 'Open Google map')}</button>
      </div>
      <a class="syndesmos" href="{odigies}" rel="noopener" target="_blank">{t(c, 'Οδηγίες με το Google Maps ›', 'Directions in Google Maps ›')}</a>
    </div>'''

def forma(c):
    return f'''<form class="forma" data-forma novalidate>
      <div class="forma-pedio"><label for="f-onoma">{t(c, 'Όνομα', 'Name')}</label><input id="f-onoma" name="onoma" autocomplete="name" required maxlength="80"></div>
      <div class="forma-dyo">
        <div class="forma-pedio"><label for="f-til">{t(c, 'Τηλέφωνο', 'Phone')}</label><input id="f-til" name="tilefono" type="tel" autocomplete="tel" inputmode="tel" maxlength="30"></div>
        <div class="forma-pedio"><label for="f-email">Email</label><input id="f-email" name="email" type="email" autocomplete="email" maxlength="120"></div>
      </div>
      <div class="forma-pedio"><label for="f-min">{t(c, 'Μήνυμα', 'Message')}</label><textarea id="f-min" name="minima" rows="5" required maxlength="2000"></textarea></div>
      <div class="forma-pagida" aria-hidden="true"><label for="f-web">Website</label><input id="f-web" name="website" tabindex="-1" autocomplete="off"></div>
      <p class="forma-sim">{t(c, 'Χρειαζόμαστε τηλέφωνο ή email για να σου απαντήσουμε. Τα στοιχεία σου χρησιμοποιούνται μόνο για την απάντηση', 'We need a phone number or email to reply. Your details are used only to answer you')} (<a href="{u(c, '/aporrito/')}">{t(c, 'απόρρητο', 'privacy')}</a>).</p>
      <button class="btn" type="submit">{t(c, 'Στείλε το μήνυμα', 'Send message')}</button>
      <p class="forma-katastasi" role="status" aria-live="polite"></p>
    </form>'''

def epafi(c, titlos=None, h='h2'):
    """επικοινωνία: φόρμα αριστερά, χάρτης-ωράριο-τηλέφωνο δεξιά"""
    r = c.r
    titlos = titlos or t(c, 'Γράψε μας ή πέρασε<br class="d"> από το κομμωτήριο.', 'Write to us or drop<br class="d"> by the salon.')
    return f'''<section class="enotita epafi" data-sxima="skoteino" aria-labelledby="ep-t" id="epikoinonia">
  <div class="wrap">
    {etiketa(t(c, 'Επικοινωνία', 'Contact'))}
    <{h} id="ep-t" class="dilosi" data-reveal>{titlos}</{h}>
    <div class="epafi-plegma">
      <div class="epafi-forma" data-reveal>{forma(c)}</div>
      <div class="epafi-plirof" data-reveal>
        {xartis(c)}
        <div class="epafi-stoixeia">
          <div><p class="ypo-titlos">{t(c, 'Τηλέφωνο', 'Phone')}</p><p><a class="epafi-til" href="tel:{r['tilefono_e164']}">{E(r['tilefono'])}</a></p>
          <p><a href="mailto:{r['email']}">{E(r['email'])}</a></p></div>
          <div><p class="ypo-titlos">{t(c, 'Ωράριο', 'Opening hours')}</p><ul class="orario">{orario_html(c)}</ul></div>
        </div>
      </div>
    </div>
  </div>
</section>'''

def _xrysi_spira():
    """πλακόστρωση Fibonacci 89×55 με συνεχή χρυσή σπείρα (τόξα με κέντρο σε γωνία κάθε τετραγώνου)"""
    fib = [1, 1]
    while len(fib) < 10: fib.append(fib[-1] + fib[-2])
    sq = [(0, 0, 1)]; mnx, mny, mxx, mxy = 0, 0, 1, 1
    for k in range(1, 10):
        sd, d = fib[k], 'RDLU'[(k - 1) % 4]
        x, y = {'R': (mxx, mny), 'D': (mnx, mxy), 'L': (mnx - sd, mny), 'U': (mnx, mny - sd)}[d]
        sq.append((x, y, sd)); mnx, mny, mxx, mxy = min(mnx, x), min(mny, y), max(mxx, x + sd), max(mxy, y + sd)
    def gon(x, y, sd): return {(x, y), (x + sd, y), (x, y + sd), (x + sd, y + sd)}
    for P0 in sorted(gon(*sq[0])):
        for C0 in sorted(gon(*sq[0])):
            if C0 == P0 or (C0[0] != P0[0] and C0[1] != P0[1]): continue
            for Q0 in sorted(gon(*sq[0])):
                if Q0 in (P0, C0) or (Q0[0] != C0[0] and Q0[1] != C0[1]): continue
                ch, ok = [(P0, C0, Q0)], True
                for (x, y, sd) in sq[1:]:
                    _, Cp, P = ch[-1]
                    ux, uy = Cp[0] - P[0], Cp[1] - P[1]; n = abs(ux) + abs(uy)
                    C = (P[0] + ux / n * sd, P[1] + uy / n * sd); g = gon(x, y, sd)
                    if P not in g or C not in g: ok = False; break
                    ch.append((P, C, [q for q in g if q not in (P, C) and (q[0] == C[0] or q[1] == C[1])][0]))
                if ok:
                    k, ox, oy = 10, -mnx, -mny
                    rects = ''.join(f'<rect x="{(x + ox) * k:g}" y="{(y + oy) * k:g}" width="{sd * k}" height="{sd * k}"/>' for x, y, sd in sq)
                    d = f'M{(ch[0][0][0] + ox) * k:g} {(ch[0][0][1] + oy) * k:g}'
                    for (P, C, Q), (x, y, sd) in zip(ch, sq):
                        vx, vy, wx, wy = P[0] - C[0], P[1] - C[1], Q[0] - C[0], Q[1] - C[1]
                        d += f' A{sd * k} {sd * k} 0 0 {1 if vx * wy - vy * wx > 0 else 0} {(Q[0] + ox) * k:g} {(Q[1] + oy) * k:g}'
                    return (mxx - mnx) * k, (mxy - mny) * k, rects, d
XS_W, XS_H, XS_RECTS, XS_D = _xrysi_spira()

def spira_svg(cls='', grammes=True, gid='xg'):
    return (f'<svg class="spira {cls}" viewBox="-6 -6 {XS_W + 12} {XS_H + 12}" aria-hidden="true" style="--xg:url(#{gid})">'
            f'<defs><linearGradient id="{gid}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#9c7421"/><stop offset=".35" stop-color="#f5dc8a"/>'
            '<stop offset=".55" stop-color="#c99a2e"/><stop offset=".75" stop-color="#fff3c4"/><stop offset="1" stop-color="#b8862a"/></linearGradient></defs>'
            + (f'<g class="spira-tetr">{XS_RECTS}</g>' if grammes else '') +
            f'<path class="spira-d" d="{XS_D}" pathLength="1"/></svg>')

def sel_hero(c, etik, titlos, lead, extra=''):
    return f'''<section class="sel-hero" data-sxima="skoteino"><canvas class="toufes toufes-mikro" data-toufes data-mikro aria-hidden="true"></canvas>
<div class="wrap"><p class="etiketa xoro">{E(etik)}</p><h1 class="titlos-sel xoro">{titlos}</h1>
<p class="hero-lead xoro">{lead}</p>{extra}</div></section>'''

# ───────────────────────── σελίδες ─────────────────────────

def selida_arxiki(c):
    r = c.r
    pms = [a for a in c.anartiseis if a.get('prin') and a.get('meta')][:3]
    hero = f'''<section class="hero" data-sxima="skoteino" aria-labelledby="hero-t">
  <canvas class="toufes" data-toufes aria-hidden="true"></canvas>
  <div class="hero-fonto" aria-hidden="true"></div>
  <div class="wrap hero-in">
    <p class="hero-onoma">{t(c, 'Κομμωτήριο Γιάννης · Πολίχνη Θεσσαλονίκης', 'Giannis Hair Salon · Polichni, Thessaloniki')}</p>
    <h1 id="hero-t" class="hero-t">{t(c,
        '<span class="gr"><span>Κάθε πρόσωπο</span></span><span class="gr"><span>έχει τη δική του</span></span><span class="gr"><span><em>χρυσή τομή.</em></span></span>',
        '<span class="gr"><span>Every face</span></span><span class="gr"><span>has its own</span></span><span class="gr"><span><em>golden ratio.</em></span></span>')}</h1>
    <p class="hero-lead">{t(c,
        'Κούρεμα, χρώμα και χτένισμα για άνδρες, γυναίκες και παιδιά, στη Μαυρομιχάλη 15 στην Πολίχνη. Ραντεβού online σε ένα λεπτό.',
        'Cuts, colour and styling for men, women and children at 15 Mavromichali St., Polichni, Thessaloniki. Book online in a minute.')}</p>
    {energeies(c, cls='hero-en')}
    <p class="hero-epomeno" data-epomeno-hero hidden></p>
  </div>
  <p class="sx-endeixi" aria-hidden="true">{t(c, 'ΣΧ. 01', 'FIG. 01')} · balayage · <span data-sx-p>12</span>%</p>
  <p class="kyli" aria-hidden="true"><span></span>{t(c, 'Κύλισε', 'Scroll')}</p>
</section>'''
    simantika = f'''<section class="enotita simantika" data-sxima="skoteino">
  <div class="wrap"><ul class="gegonota">
    <li data-reveal><span class="g-ar">{E(r['vathmologia'] if c.lang == 'el' else r['vathmologia'].replace(',', '.'))}<small>/5</small></span><span class="g-t">{t(c, f"από {r['kritikes_plithos']} κριτικές στο Google", f"from {r['kritikes_plithos']} Google reviews")}</span></li>
    <li data-reveal><span class="g-ar">3</span><span class="g-t">{t(c, 'κομμωτές, κλείνεις με όποιον θέλεις', 'stylists, book with the one you like')}</span></li>
    <li data-reveal><span class="g-ar">09–21</span><span class="g-t">{t(c, 'Τρίτη έως Παρασκευή · Σάββατο 09–17', 'Tuesday to Friday · Saturday 09–17')}</span></li>
    <li data-reveal><span class="g-ar">{t(c, 'Όλοι', 'All')}</span><span class="g-t">{t(c, 'άνδρες, γυναίκες και παιδιά', 'men, women and children')}</span></li>
  </ul></div>
</section>'''
    analogies = [
        (t(c, 'Το πρόσωπο', 'Your face'), t(c, 'Σχήμα, χαρακτηριστικά και γραμμή του λαιμού ορίζουν το μήκος και τον όγκο.', 'Shape, features and the line of the neck set the length and volume.')),
        (t(c, 'Η τρίχα', 'Your hair'), t(c, 'Πάχος, πυκνότητα και παλιές βαφές ορίζουν την τεχνική και το προϊόν.', 'Thickness, density and past colour set the technique and the product.')),
        (t(c, 'Η μέρα σου', 'Your day'), t(c, 'Λίγα λεπτά το πρωί αρκούν για να στέκει, και όταν το φτιάχνεις μόνος ή μόνη σου.', 'A few minutes in the morning are enough for it to hold, even when you style it yourself.')),
    ]
    idea = f'''<section class="enotita idea" data-sxima="skoteino" aria-labelledby="id-t">
  <div class="wrap idea-plegma">
    <div class="idea-keim">
      {etiketa(t(c, 'Η ιδέα', 'The idea'))}
      <h2 id="id-t" class="dilosi" data-reveal>{t(c, 'Ένα κούρεμα είναι<br class="d"> <em>θέμα αναλογίας.</em>', 'A haircut is<br class="d"> <em>a matter of proportion.</em>')}</h2>
      <p class="hero-lead" data-reveal>{t(c,
        'Το μήκος που ισορροπεί το σαγόνι, η γραμμή που ανοίγει το βλέμμα, ο τόνος που ζεσταίνει το δέρμα. Πριν πιάσουμε ψαλίδι ή πινέλο, κοιτάμε τρία πράγματα.',
        'The length that balances the jawline, the line that opens up the eyes, the tone that warms the skin. Before we pick up scissors or brush, we look at three things.')}</p>
      <ol class="analogies">{''.join(f'<li data-reveal><h3 class="ypotitlos">{E(h)}</h3><p>{E(x)}</p></li>' for h, x in analogies)}</ol>
    </div>
    <div class="idea-spira" data-spira>{spira_svg('spira-megali', gid='xg-idea')}</div>
  </div>
</section>'''
    # πριν/μετά δίπλα σε κείμενο: γυναικείο → ανδρικό, εναλλάξ αριστερά-δεξιά
    keim_al = {
        'balayage': (t(c, 'Γυναικείο · Χρώμα', 'Women · Colour'), t(c, 'Φως ζωγραφισμένο<br class="d"> με το χέρι.', 'Light painted<br class="d"> by hand.'),
                     t(c, 'Το balayage απλώνεται με πινέλο, τούφα τούφα, εκεί όπου θα έπεφτε ο ήλιος. Η ρίζα μένει φυσική, οπότε μεγαλώνει χωρίς γραμμή και η επόμενη επίσκεψη μπορεί να περιμένει.',
                       'Balayage is applied with a brush, section by section, where the sun would naturally catch. The roots stay natural, so they grow out without a line and your next visit can wait.')),
        'entona': (t(c, 'Γυναικείο · Χρώμα', 'Women · Colour'), t(c, 'Από το ξεθωριασμένο<br class="d"> στο χάλκινο.', 'From faded<br class="d"> to copper.'),
                   t(c, 'Όταν ένα χρώμα έχει ξεθωριάσει, πρώτα ισορροπούμε τη βάση και μετά χτίζουμε τον τόνο σε στρώσεις. Έτσι το χάλκινο μένει ζεστό και στο φως της μέρας, όχι μόνο κάτω από τα φώτα του κομμωτηρίου.',
                     'When colour has faded, we first even out the base, then build the tone in layers. That way the copper stays warm in daylight too, not just under the salon lights.')),
        'fade': (t(c, 'Ανδρικό · Κούρεμα', 'Men · Cut'), t(c, 'Fade που σβήνει<br class="d"> χωρίς σκαλοπάτι.', 'A fade with<br class="d"> no visible step.'),
                 t(c, 'Η μηχανή ανεβαίνει σε διαβαθμίσεις, από το δέρμα ως το μήκος της κορυφής, και η μετάβαση δένει με ψαλίδι και χτένα. Στην κορυφή κρατάμε υφή, για να στέκει και με λίγο προϊόν.',
                   'The clipper works up in grades from skin to the length on top, and the blend is finished with scissors and comb. We keep texture on top so it holds with very little product.')),
    }
    seira_al = sorted(pms, key=lambda a: ['balayage', 'entona', 'fade'].index(a['ypiresia']) if a['ypiresia'] in keim_al else 9)
    def seira(i, a):
        g, y = c.ymap[a['ypiresia']]
        kat, tit, kei = keim_al.get(a['ypiresia'], (L(c, g, 'titlos'), E(L(c, a, 'titlos')), L(c, a, 'keimeno')))
        return f'''<article class="al-seira{' al-antistrofi' if i % 2 else ''}" data-al>
    <div class="al-sticky">
      <div class="al-foto">{sygkrisi(c, a, lazy=True, sizes='(max-width: 1068px) 100vw, 64vw')}</div>
      <div class="al-keim">
        <p class="al-kat"><span class="al-ar">0{i + 1}</span>{E(kat)}</p>
        <h3 class="al-t">{tit}</h3>
        <p class="al-p">{E(kei)}</p>
        <p class="al-meta">{E(L(c, y, 'onoma'))} · {t(c, 'περίπου', 'about')} {diarkeia_keimeno(y['tmimata'], c)}</p>
        <a class="btn" href="{u(c, '/kratisi/?y=' + y['id'])}">{t(c, 'Κλείσε ραντεβού', 'Book this')}</a>
      </div>
    </div>
  </article>'''
    allages = f'''<section class="allages" data-sxima="skoteino" aria-labelledby="al-t">
  <div class="wrap al-kef">
    {etiketa(t(c, 'Πριν και μετά', 'Before and after'))}
    <h2 id="al-t" class="dilosi" data-reveal>{t(c, 'Κύλισε αργά.<br class="d"> <em>Η αλλαγή γίνεται μπροστά σου.</em>', 'Scroll slowly.<br class="d"> <em>Watch the change happen.</em>')}</h2>
  </div>
  {''.join(seira(i, a) for i, a in enumerate(seira_al))}
</section>'''
    kartes = ''.join(f'''<article class="kf-karta" data-reveal>
      <a class="kf-foto" href="{u(c, '/ypiresies/' + g['slug'] + '/')}" tabindex="-1" aria-hidden="true">{eikona(c, g['foto'], L(c, g, 'titlos_plires'), 'kf-img', sizes='(max-width: 734px) 100vw, 44vw', vt='yp-' + g['id'])}</a>
      <div class="kf-keim">
        <p class="kf-kat"><span class="kf-ar">0{i + 1}</span>{E(L(c, g, 'titlos'))}</p>
        <h3 class="kf-t"><a href="{u(c, '/ypiresies/' + g['slug'] + '/')}">{E(L(c, g, 'titlos_plires'))}</a></h3>
        <p class="kf-lead">{E(L(c, g, 'lead'))}</p>
        <div class="energeies"><a class="btn" href="{u(c, '/kratisi/?omada=' + g['id'])}">{t(c, 'Κλείσε ραντεβού', 'Book now')}</a>
        <a class="syndesmos" href="{u(c, '/ypiresies/' + g['slug'] + '/')}">{t(c, 'Δες την υπηρεσία ›', 'See the service ›')}</a></div>
      </div>
    </article>''' for i, g in enumerate(c.yp['omades']))
    ypiresies = f'''<section class="enotita kefalaia" data-sxima="skoteino" aria-labelledby="kf-t">
  <div class="wrap">
    {etiketa(t(c, 'Υπηρεσίες', 'Services'))}
    <h2 id="kf-t" class="dilosi" data-reveal>{t(c, 'Τέσσερα κεφάλαια,<br class="d"> <em>από το ψαλίδι ως τη θεραπεία.</em>', 'Four chapters,<br class="d"> <em>from scissors to treatment.</em>')}</h2>
    <div class="kf-plegma">{kartes}</div>
  </div>
</section>'''
    paleta_xr = [(t(c, 'Φυσικό καστανό', 'Natural brown'), '#4a2e1f'), ('Carrot red', '#c4501e'), (t(c, 'Μωβ', 'Purple'), '#5b2a6e'),
                 (t(c, 'Ροζ', 'Pink'), '#d77a9b'), (t(c, 'Ξανθό balayage', 'Blonde balayage'), '#d9b27c')]
    paleta = f'''<section class="paleta" data-paleta data-xromata='{json.dumps([h for _, h in paleta_xr])}' style="--n:{len(paleta_xr)}" aria-labelledby="pal-t">
  <div class="pal-sticky">
    <div class="wrap pal-in">
      <p class="etiketa">{t(c, 'Η παλέτα', 'The palette')}</p>
      <h2 id="pal-t" class="titlos">{t(c, 'Από το φυσικό<br class="d"> ως το απρόσμενο.', 'From natural<br class="d"> to unexpected.')}</h2>
      <ol class="pal-onomata">{''.join(f'<li data-pal-i="{i}" style="--c:{h}"><span class="pal-delta"></span>{E(n)}</li>' for i, (n, h) in enumerate(paleta_xr))}</ol>
      <p class="pal-keim">{t(c, 'Βαφή, ανταύγειες, balayage, ombré και έντονα χρώματα, με προϊόντα Goldwell, Wella, Fanola και Kyanna.', 'Colour, highlights, balayage, ombré and bold shades, with Goldwell, Wella, Fanola and Kyanna products.')}</p>
      <a class="btn" href="{u(c, '/ypiresies/vafes-balayage/')}">{t(c, 'Βαφές και τεχνικές', 'Colour and techniques')}</a>
    </div>
    <svg class="pal-toufa" viewBox="0 0 220 640" aria-hidden="true"><defs><linearGradient id="pal-g" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" style="stop-color:#2a1a12"/><stop offset=".35" style="stop-color:var(--pal-c)"/><stop offset="1" style="stop-color:var(--pal-c2)"/></linearGradient></defs>
      {''.join(f'<path d="M{70 + i * 9},0 C{40 + i * 13},{160 + i * 7} {150 - i * 6},{320 - i * 5} {60 + i * 12},{620 - (i % 3) * 22}" stroke="url(#pal-g)" stroke-width="{3.2 - (i % 4) * .5}" fill="none" stroke-linecap="round" opacity="{.55 + (i % 3) * .15}"/>' for i in range(9))}
    </svg>
  </div>
</section>'''
    st = [[], [], []]
    for i, a in enumerate(c.anartiseis[:9]):
        st[i % 3].append(kartela_anartisis(c, a))
    douleies = f'''<section class="enotita douleies-en" data-sxima="skoteino" aria-labelledby="dl-t">
  <div class="wrap">
    {etiketa(t(c, 'Δουλειές μας', 'Our work'))}
    <h2 id="dl-t" class="dilosi" data-reveal>{t(c, 'Οι τελευταίες<br class="d"> <em>δουλειές μας.</em>', 'Our latest<br class="d"> <em>work.</em>')}</h2>
    <div class="douleies-plegma dl-arxiki">{''.join(kartela_anartisis(c, a) for a in c.anartiseis[:6])}</div>
    <div class="energeies"><a class="btn" href="{u(c, '/douleies/')}">{t(c, 'Όλες οι δουλειές', 'All our work')}</a><a class="syndesmos" href="{r['instagram']}" rel="noopener" target="_blank">Instagram {E(r['instagram_onoma'])} ›</a></div>
  </div>
</section>'''
    syg = [
        ('Balayage', 'balayage', t(c, 'Φυσική, απαλή μετάβαση από τη ρίζα στις άκρες, ζωγραφισμένη με το πινέλο.', 'A soft, natural blend from root to ends, hand-painted with a brush.'),
         t(c, 'Χαμηλή· η ρίζα μεγαλώνει χωρίς γραμμή', 'Low; roots grow out without a line'), t(c, 'Όσους θέλουν φως χωρίς να φαίνεται η βαφή', 'Light that does not look coloured')),
        ('Foilayage', 'balayage', t(c, 'Ίδια ιδέα με το balayage, με αλουμινόχαρτο για πιο φωτεινούς τόνους.', 'The same idea as balayage, with foils for brighter tones.'),
         t(c, 'Χαμηλή έως μέτρια', 'Low to medium'), t(c, 'Σκούρα μαλλιά που θέλουν να ανοίξουν περισσότερο', 'Dark hair that needs more lift')),
        ('Ombré', 'ombre', t(c, 'Καθαρή αντίθεση: σκούρα ρίζα, ανοιχτές άκρες.', 'Clear contrast: dark roots, light ends.'),
         t(c, 'Χαμηλή', 'Low'), t(c, 'Όσους θέλουν τολμηρό, εμφανές αποτέλεσμα', 'A bold, visible result')),
    ]
    sygkrisi_html = ''.join(f'''<div class="syg-stili" data-reveal>
      <h3 class="syg-t">{x}</h3>
      <dl><dt>{t(c, 'Αποτέλεσμα', 'Result')}</dt><dd>{E(a)}</dd><dt>{t(c, 'Συντήρηση', 'Upkeep')}</dt><dd>{E(s)}</dd>
      <dt>{t(c, 'Διάρκεια', 'Duration')}</dt><dd>{t(c, 'περίπου', 'about')} {diarkeia_keimeno(c.ymap[y][1]['tmimata'], c)}</dd><dt>{t(c, 'Ιδανικό για', 'Best for')}</dt><dd>{E(i)}</dd></dl>
      <a class="btn" href="{u(c, '/kratisi/?y=' + y)}">{t(c, 'Κλείσε', 'Book')} {x}</a>
    </div>''' for x, y, a, s, i in syg)
    poio = f'''<section class="enotita poio" data-sxima="fotino" aria-labelledby="poio-t">
  <div class="wrap">
    {etiketa(t(c, 'Ποιο σου ταιριάζει', 'Which one suits you'))}
    <h2 id="poio-t" class="titlos" data-reveal>{t(c, 'Balayage, foilayage ή ombré;', 'Balayage, foilayage or ombré?')}</h2>
    <div class="syg-plegma">{sygkrisi_html}</div>
    <p class="simeiosi" data-reveal>{t(c, 'Δεν είσαι σίγουρος ή σίγουρη; Κλείσε αυτό που σε τραβά· το συζητάμε μαζί πριν ξεκινήσουμε.', 'Not sure? Book the one you like; we will talk it through together before we start.')}</p>
  </div>
</section>'''
    omada = f'''<section class="enotita omada-kr" data-sxima="skoteino" aria-labelledby="om-t" id="rantevou">
  <div class="omada-fos" aria-hidden="true"></div>
  <div class="wrap">
    {etiketa(t(c, 'Η ομάδα · Ραντεβού', 'The team · Booking'))}
    <h2 id="om-t" class="dilosi" data-reveal>{t(c, 'Διάλεξε κομμωτή.<br class="d"> <em>Κλείσε σε ένα λεπτό.</em>', 'Choose your stylist.<br class="d"> <em>Book in a minute.</em>')}</h2>
    <p class="hero-lead" data-reveal>{t(c, 'Ο καθένας μας έχει το δικό του πρόγραμμα. Βλέπεις τις ελεύθερες ώρες του και κλείνεις online, χωρίς τηλέφωνο, όποια ώρα κι αν είναι.', 'Each of us has their own schedule. See their free times and book online, no phone call needed, at any hour.')}</p>
    <div class="omada-plegma">{''.join(melos(c, k, megalo=True) for k in c.omada)}</div>
    <div class="omada-kato">
      <div class="eisitirio" data-eisitirio aria-live="polite">
        <span class="eis-etik">{t(c, 'Επόμενο ελεύθερο', 'Next available')}</span>
        <span class="eis-ora" data-epomeno-ora>{t(c, 'Κλείσε online σε ένα λεπτό', 'Book online in a minute')}</span>
        <span class="eis-k" data-epomeno-k></span>
        <a class="eis-link" href="{u(c, '/kratisi/')}" data-epomeno-link>{t(c, 'Κράτησε αυτή την ώρα ›', 'Book this time ›')}</a>
      </div>
      <div class="omada-any" data-reveal><p class="ypotitlos">{t(c, 'Δεν σε νοιάζει ποιος;', 'No preference?')}</p>
        <p>{t(c, 'Διάλεξε «Οποιοσδήποτε» και σου δίνουμε την πρώτη ελεύθερη ώρα.', 'Choose “Anyone” and we give you the first free time.')}</p>
        {energeies(c)}</div>
    </div>
  </div>
</section>'''
    kr = c.kritikes
    kritikes_html = ''
    if kr:
        kart = ''.join(f'<li class="kritiki"><span class="asteria" aria-label="{k["asteria"]} {t(c, "αστέρια", "stars")}">{"★" * int(k["asteria"])}</span>'
                       f'<p>«{E(L(c, k, "keimeno"))}»</p><span class="kr-onoma">{E(L(c, k, "onoma"))} · {E(k.get("pigi", "Google"))}</span></li>' for k in kr)
        kart2 = kart.replace('<li ', '<li aria-hidden="true" ')
        kritikes_html = f'<div class="kar" data-kar><ul class="kar-track">{kart}{kart2}</ul></div>'
    vath = r['vathmologia'] if c.lang == 'el' else r['vathmologia'].replace(',', '.')
    empistosyni = f'''<section class="enotita empistosyni" data-sxima="skoteino" aria-labelledby="em-t">
  <div class="wrap">
    <div class="kr-kef" data-reveal>
      <h2 id="em-t" class="kr-titlos"><span class="kr-g">Google</span><span class="kr-ast" aria-hidden="true">★★★★★</span>
        <span class="kr-v">{E(vath)}/5 · {t(c, f"{r['kritikes_plithos']} κριτικές", f"{r['kritikes_plithos']} reviews")}</span></h2>
      <a class="syndesmos" href="{r['google_profil']}" rel="noopener" target="_blank">{t(c, 'Όλες οι κριτικές στο Google ›', 'All reviews on Google ›')}</a>
    </div>
  </div>
  {kritikes_html}
  <div class="marquee" data-marquee role="group" aria-label="{t(c, 'Προϊόντα που χρησιμοποιούμε', 'Products we use')}"><div class="marquee-track">
    {''.join(f'<span>{E(p)}</span>' for p in r['proionta'])}{''.join(f'<span aria-hidden="true">{E(p)}</span>' for p in r['proionta'] * 3)}
  </div></div>
  <div class="wrap xoros{' xoros-xoris' if 'salon' in c.prosorines else ''}">
    {'' if 'salon' in c.prosorines else '<div class="xoros-foto" data-reveal>' + eikona(c, 'salon', t(c, 'Ο χώρος του κομμωτηρίου', 'Inside the salon'), 'xoros-img', sizes='(max-width: 734px) 92vw, 56vw', ratio=(3, 2)) + '</div>'}
    <div class="xoros-keim">
      <h3 class="ypotitlos" data-reveal>{t(c, 'Ο χώρος', 'The salon')}</h3>
      <ul class="paroxes">{''.join(f'<li data-reveal>{E(p)}</li>' for p in L(c, r, 'paroxes'))}</ul>
      <p data-reveal>{E(L(c, r, 'pliromes'))}.</p>
    </div>
  </div>
</section>'''
    soma = hero + simantika + idea + allages + ypiresies + douleies + empistosyni + omada + epafi(c)
    return kelyfos(c, '/', t(c, f"{r['onoma']} · Κομμωτήριο στην Πολίχνη Θεσσαλονίκης", 'Giannis Hair Salon · Hairdresser in Polichni, Thessaloniki'),
                   t(c, 'Κομμωτήριο στην Πολίχνη Θεσσαλονίκης για άνδρες, γυναίκες και παιδιά: κουρέματα, fade, βαφές, balayage, χτενίσματα, κερατίνη. Online ραντεβού.',
                     'Hair salon in Polichni, Thessaloniki, for men, women and children: cuts, fades, colour, balayage, styling, keratin. Book online.'),
                   soma, scripts=('toufes-mixani.js', 'toufes.js', 'skines.js', 'epomeno.js', 'forma.js'))

def melos(c, k, megalo=False):
    on = L(c, k, 'onoma')
    foto = eikona(c, k['foto'], on, 'melos-img', sizes='(max-width: 734px) 92vw, 30vw') if k.get('foto') else \
        f'<span class="melos-mono" aria-hidden="true">{E(on[0])}</span>'
    return f'''<article class="melos" data-melos>
  <div class="melos-foto" style="--k:{k['xroma']}">{foto}</div>
  <h3 class="melos-onoma">{E(on)}</h3>
  <p class="melos-rolos">{E(L(c, k, 'rolos'))} · {E(L(c, k, 'eidikotita'))}</p>
  <a class="{'btn' if megalo else 'syndesmos'}" href="{u(c, '/kratisi/?k=' + k['id'])}">{t(c, 'Ραντεβού', 'Book')} {E(to_kommoti(c, k))}{'' if megalo else ' ›'}</a>
</article>'''

def selida_omadas_ypiresion(c, g):
    r = c.r
    path = f"/ypiresies/{g['slug']}/"
    anart = [a for a in c.anartiseis if c.ymap.get(a['ypiresia'], (None,))[0] is g]
    pm = next((a for a in anart if a.get('prin')), None)
    titl = L(c, g, 'titlos_plires')
    lista = ''.join(f'''<li class="yp-grammi" data-reveal><span class="yp-on">{E(L(c, s, 'onoma'))}</span>
      <span class="yp-di">{t(c, 'περίπου', 'about')} {diarkeia_keimeno(s['tmimata'], c)}{t(c, ' · αίτημα', ' · on request') if s['online'] == 'aitima' else ''}</span>
      <span class="yp-ti">{(t(c, 'από ', 'from ') + E(str(s['timi'])) + ' €') if s.get('timi') else ''}</span>
      <a class="syndesmos" href="{u(c, '/kratisi/?y=' + s['id'])}">{t(c, 'Κλείσε ›', 'Book ›')}</a></li>''' for s in g['ypiresies'])
    vimata = ''.join(f'<li class="vima" data-vima><span class="vima-ar">{i + 1}</span><span class="vima-t">{E(v)}</span></li>'
                     for i, v in enumerate(L(c, g, 'vimata')))
    faq = ''.join(f'<details class="faq" data-reveal><summary>{E(f["q"])}</summary><p>{E(f["a"])}</p></details>' for f in L(c, g, 'faq'))
    soma = f'''<div class="topiki-bara" data-topiki><div class="wrap topiki-in"><span class="topiki-on">{E(titl)}</span>
  <nav aria-label="{t(c, 'Ενότητες σελίδας', 'On this page')}"><a href="#ti">{t(c, 'Τι είναι', 'Overview')}</a><a href="#pos">{t(c, 'Πώς γίνεται', 'How it works')}</a><a href="#times">{t(c, 'Υπηρεσίες', 'Services')}</a><a href="#syxnes">{t(c, 'Ερωτήσεις', 'Questions')}</a></nav>
  <a class="btn btn-mikro" href="{u(c, '/kratisi/?omada=' + g['id'])}">{t(c, 'Κλείσε', 'Book')}</a></div></div>
<section class="yp-hero" data-sxima="skoteino" style="--yc:{g['xroma']}">
  <canvas class="toufes toufes-mikro" data-toufes data-mikro aria-hidden="true"></canvas>
  <div class="wrap yp-hero-plegma">
    <div class="yp-hero-keim" id="ti">
      <p class="etiketa xoro">{E(L(c, g, 'titlos'))}</p>
      <h1 class="titlos-sel xoro">{E(titl)}</h1>
      <p class="hero-lead xoro">{E(L(c, g, 'lead'))}</p>
      <div class="xoro">{energeies(c, '/kratisi/?omada=' + g['id'])}</div>
    </div>
    <div class="yp-hero-foto">{eikona(c, g['foto'], titl, 'yp-hero-img', lazy=False, vt='yp-' + g['id'])}</div>
  </div>
</section>
<section class="enotita" data-sxima="fotino">
  <div class="wrap dyo-st">
    <div>{etiketa(t(c, 'Τι περιλαμβάνει', 'What is included'))}<h2 class="titlos" data-reveal>{t(c, 'Χωρίς εκπλήξεις,<br class="d"> βήμα-βήμα.', 'No surprises,<br class="d"> step by step.')}</h2></div>
    <ul class="perilamvanei">{''.join(f'<li data-reveal>{E(p)}</li>' for p in L(c, g, 'perilamvanei'))}</ul>
  </div>
</section>
<section class="enotita vimata-en" id="pos" data-sxima="skoteino">
  <div class="wrap">{etiketa(t(c, 'Πώς γίνεται', 'How it works'))}<h2 class="titlos" data-reveal>{t(c, 'Τι γίνεται στο ραντεβού.', 'What happens at your appointment.')}</h2>
  <ol class="vimata" data-vimata>{vimata}</ol>
  <ul class="tsips" data-reveal>{''.join(f'<li>{E(x)}</li>' for x in L(c, g, 'texnikes'))}</ul></div>
</section>
{f'<section class="enotita" data-sxima="skoteino"><div class="wrap pm-mono">{etiketa(t(c, "Πριν και μετά", "Before and after"))}<h2 class="titlos" data-reveal>{E(L(c, pm, "titlos"))}</h2>{sygkrisi(c, pm)}</div></section>' if pm else ''}
<section class="enotita" id="times" data-sxima="fotino">
  <div class="wrap">{etiketa(t(c, 'Υπηρεσίες', 'Services'))}<h2 class="titlos" data-reveal>{t(c, 'Διάλεξε και κλείσε.', 'Choose and book.')}</h2>
  <ul class="yp-lista">{lista}</ul>
  <p class="simeiosi" data-reveal>{t(c, 'Οι διάρκειες είναι ενδεικτικές και εξαρτώνται από το μήκος και την πυκνότητα των μαλλιών.', 'Times are approximate and depend on hair length and density.')}</p></div>
</section>
{f'<section class="enotita" data-sxima="skoteino"><div class="wrap">{etiketa(t(c, "Δουλειές μας", "Our work"))}<div class="douleies-plegma">{"".join(kartela_anartisis(c, a) for a in anart)}</div></div></section>' if anart else ''}
<section class="enotita" id="syxnes" data-sxima="fotino">
  <div class="wrap dyo-st"><div>{etiketa(t(c, 'Φροντίδα στο σπίτι', 'Home care'))}<p class="ypotitlos" data-reveal>{E(L(c, g, 'frontida'))}</p></div>
  <div>{etiketa(t(c, 'Συχνές ερωτήσεις', 'Frequently asked'))}{faq}</div></div>
</section>
{kleisimo(c, t(c, 'Κλείσε ραντεβού σε ένα λεπτό.', 'Book in a minute.'))}'''
    ld = [{'@context': 'https://schema.org', '@type': 'Service', 'name': titl, 'serviceType': titl,
           'provider': {'@id': c.tomeas + '/#salon'}, 'areaServed': t(c, 'Πολίχνη, Θεσσαλονίκη', 'Polichni, Thessaloniki'), 'description': L(c, g, 'lead')},
          {'@context': 'https://schema.org', '@type': 'FAQPage', 'mainEntity': [
              {'@type': 'Question', 'name': f['q'], 'acceptedAnswer': {'@type': 'Answer', 'text': f['a']}} for f in L(c, g, 'faq')]}]
    return path, kelyfos(c, path, t(c, f"{titl} στην Πολίχνη | {r['onoma']}", f"{titl} in Polichni, Thessaloniki | Giannis Hair Salon"), L(c, g, 'lead'), soma, 'ypiresies', ld,
                         scripts=('toufes-mixani.js', 'toufes.js', 'skines.js', 'epomeno.js'), og_eikona=g['foto'],
                         psixoula=[(t(c, 'Αρχική', 'Home'), '/'), (t(c, 'Υπηρεσίες', 'Services'), '/ypiresies/'), (titl, path)])

def selida_ypiresies(c):
    r = c.r
    kartes = ''.join(f'''<a class="yp-karta" href="{u(c, '/ypiresies/' + g['slug'] + '/')}" data-reveal>
    {eikona(c, g['foto'], L(c, g, 'titlos_plires'), 'yp-karta-img', sizes='(max-width: 734px) 92vw, 46vw', vt='yp-' + g['id'], ratio=(4, 3))}
    <span class="yp-karta-keim"><span class="ror-ar">0{i + 1}</span><span class="yp-karta-t">{E(L(c, g, 'titlos_plires'))}</span>
    <span class="yp-karta-l">{E(L(c, g, 'lead'))}</span><span class="syndesmos">{t(c, 'Δες την υπηρεσία ›', 'See the service ›')}</span></span></a>''' for i, g in enumerate(c.yp['omades']))
    def grammi(s):
        return (f'<li class="yp-grammi"><span class="yp-on">{E(L(c, s, "onoma"))}</span><span class="yp-di">{t(c, "περίπου", "about")} {diarkeia_keimeno(s["tmimata"], c)}</span>'
                f'<span class="yp-ti">{(t(c, "από ", "from ") + E(str(s["timi"])) + " €") if s.get("timi") else ""}</span>'
                f'<a class="syndesmos" href="{u(c, "/kratisi/?y=" + s["id"])}">{t(c, "Κλείσε ›", "Book ›")}</a></li>')
    oles = ''.join(f'<div class="ol-omada" data-reveal><h3 class="ypotitlos">{E(L(c, g, "titlos_plires"))}</h3><ul class="yp-lista">' + ''.join(grammi(s) for s in g['ypiresies']) + '</ul></div>'
                   for g in c.yp['omades'])
    nyf = (f'<div class="ol-omada" data-reveal><h3 class="ypotitlos">{t(c, "Νυφικό", "Bridal")}</h3><ul class="yp-lista"><li class="yp-grammi"><span class="yp-on">{E(L(c, c.yp["nyfiko"], "onoma"))}</span>'
           f'<span class="yp-di">{t(c, "αίτημα ημερομηνίας", "date request")}</span><span class="yp-ti"></span><a class="syndesmos" href="{u(c, "/nyfiko-xtenisma/")}">{t(c, "Δες ›", "See ›")}</a></li></ul></div>')
    soma = sel_hero(c, t(c, 'Υπηρεσίες', 'Services'), t(c, 'Ό,τι χρειάζονται<br class="d"> τα μαλλιά σου.', 'Everything<br class="d"> your hair needs.'),
                    t(c, 'Κουρέματα, βαφές και τεχνικές, χτενίσματα και θεραπείες, για άνδρες, γυναίκες και παιδιά.', 'Cuts, colour and techniques, styling and treatments, for men, women and children.')) + f'''
<section class="enotita" data-sxima="fotino"><div class="wrap yp-kartes">{kartes}</div></section>
<section class="enotita" data-sxima="fotino"><div class="wrap">{etiketa(t(c, 'Όλες οι υπηρεσίες', 'All services'))}<h2 class="titlos" data-reveal>{t(c, 'Με μια ματιά.', 'At a glance.')}</h2>{oles}{nyf}</div></section>
{kleisimo(c)}'''
    return kelyfos(c, '/ypiresies/', t(c, f"Υπηρεσίες κομμωτηρίου στην Πολίχνη | {r['onoma']}", 'Hair salon services in Polichni, Thessaloniki | Giannis Hair Salon'),
                   t(c, 'Κουρέματα, fade, βαφές, balayage, ombré, χτενίσματα, νυφικό, κερατίνη και Olaplex στην Πολίχνη Θεσσαλονίκης.',
                     'Cuts, fades, colour, balayage, ombré, styling, bridal hair, keratin and Olaplex in Polichni, Thessaloniki.'),
                   soma, 'ypiresies', scripts=('toufes-mixani.js', 'toufes.js', 'skines.js', 'epomeno.js'),
                   psixoula=[(t(c, 'Αρχική', 'Home'), '/'), (t(c, 'Υπηρεσίες', 'Services'), '/ypiresies/')])

def selida_nyfiko(c):
    r = c.r
    vimata = t(c, ['Γνωριμία και ιδέες, με φωτογραφίες από το φόρεμα', 'Δοκιμή χτενίσματος 2–4 εβδομάδες πριν', 'Τελικές λεπτομέρειες: αξεσουάρ, πέπλο, λουλούδια', 'Η μέρα του γάμου, στον χώρο μας ή κατόπιν συνεννόησης'],
                  ['Meeting and ideas, with photos of the dress', 'Hair trial 2–4 weeks before', 'Final details: accessories, veil, flowers', 'The wedding day, at the salon or by arrangement'])
    soma = f'''<section class="yp-hero" data-sxima="skoteino" style="--yc:#2c2430"><canvas class="toufes toufes-mikro" data-toufes data-mikro aria-hidden="true"></canvas>
<div class="wrap yp-hero-plegma"><div class="yp-hero-keim"><p class="etiketa xoro">{t(c, 'Νυφικό', 'Bridal')}</p><h1 class="titlos-sel xoro">{t(c, 'Νυφικό χτένισμα, με δοκιμή.', 'Bridal hair, with a trial.')}</h1>
<p class="hero-lead xoro">{t(c, 'Χτένισμα που ταιριάζει στο φόρεμα, στο πέπλο και στη μέρα, και κρατά από την τελετή ως τον τελευταίο χορό.', 'A style that suits the dress, the veil and the day, and lasts from the ceremony to the last dance.')}</p>
<div class="xoro">{energeies(c, '/kratisi/?y=nyfiko', t(c, 'Στείλε αίτημα ημερομηνίας', 'Request a date'))}</div></div>
<div class="yp-hero-foto">{eikona(c, 'yp-xtenisma', t(c, 'Νυφικό χτένισμα', 'Bridal hair'), 'yp-hero-img', lazy=False)}</div></div></section>
<section class="enotita vimata-en" data-sxima="skoteino"><div class="wrap">{etiketa(t(c, 'Πώς δουλεύουμε', 'How we work'))}<h2 class="titlos" data-reveal>{t(c, 'Τέσσερα βήματα ως τη μέρα σου.', 'Four steps to your day.')}</h2>
<ol class="vimata" data-vimata>{''.join(f'<li class="vima" data-vima><span class="vima-ar">{i + 1}</span><span class="vima-t">{E(v)}</span></li>' for i, v in enumerate(vimata))}</ol></div></section>
<section class="enotita" data-sxima="fotino"><div class="wrap dyo-st"><div>{etiketa(t(c, 'Πώς κλείνεις', 'How to book'))}<h2 class="titlos" data-reveal>{t(c, 'Αίτημα, όχι αυτόματη κράτηση.', 'A request, not an instant booking.')}</h2></div>
<div><p data-reveal>{t(c, 'Το νυφικό χτένισμα θέλει συνεννόηση. Στέλνεις αίτημα με την ημερομηνία που θέλεις και σε καλούμε για να κανονίσουμε τη δοκιμή και τη μέρα.', 'Bridal hair needs a conversation. Send a request with your date and we will call you to arrange the trial and the day.')}</p>
<p data-reveal>{t(c, 'Για καλοκαιρινούς γάμους, καλό είναι να επικοινωνήσεις αρκετούς μήνες νωρίτερα.', 'For summer weddings, get in touch several months ahead.')}</p></div></div></section>
{kleisimo(c, t(c, 'Πες μας την ημερομηνία σου.', 'Tell us your date.'))}'''
    return kelyfos(c, '/nyfiko-xtenisma/', t(c, f"Νυφικό χτένισμα στη Θεσσαλονίκη (Πολίχνη) | {r['onoma']}", 'Bridal hair in Thessaloniki (Polichni) | Giannis Hair Salon'),
                   t(c, 'Νυφικό χτένισμα με δοκιμή στην Πολίχνη Θεσσαλονίκης. Στείλε αίτημα ημερομηνίας online.', 'Bridal hair with a trial in Polichni, Thessaloniki. Request your date online.'), soma, 'ypiresies',
                   [{'@context': 'https://schema.org', '@type': 'Service', 'name': t(c, 'Νυφικό χτένισμα', 'Bridal hair'), 'provider': {'@id': c.tomeas + '/#salon'}}],
                   scripts=('toufes-mixani.js', 'toufes.js', 'skines.js', 'epomeno.js'), og_eikona='yp-xtenisma',
                   psixoula=[(t(c, 'Αρχική', 'Home'), '/'), (t(c, 'Υπηρεσίες', 'Services'), '/ypiresies/'), (t(c, 'Νυφικό χτένισμα', 'Bridal hair'), '/nyfiko-xtenisma/')])

def selida_douleies(c):
    r = c.r
    filtra = f'<button type="button" aria-pressed="true" data-filtro="ola">{t(c, "Όλες", "All")}</button>' + ''.join(
        f'<button type="button" aria-pressed="false" data-filtro="{g["id"]}">{E(L(c, g, "titlos"))}</button>' for g in c.yp['omades'])
    soma = sel_hero(c, t(c, 'Δουλειές μας', 'Our work'), t(c, 'Η δουλειά μας,<br class="d"> πριν και μετά.', 'Our work,<br class="d"> before and after.'),
                    t(c, 'Κουρέματα, χρώματα και χτενίσματα από το κομμωτήριο. Πάτησε μια δουλειά για να τη δεις από κοντά.', 'Cuts, colour and styles from the salon. Tap any piece to see it up close.')) + f'''
<section class="enotita" data-sxima="skoteino"><div class="wrap"><div class="filtra" role="group" aria-label="{t(c, 'Φίλτρο κατηγορίας', 'Filter by category')}" data-filtra>{filtra}</div>
<div class="douleies-plegma" data-filtro-plegma>{''.join(kartela_anartisis(c, a) for a in c.anartiseis)}</div></div></section>
{kleisimo(c)}'''
    return kelyfos(c, '/douleies/', t(c, f"Δουλειές μας: κουρέματα, βαφές, χτενίσματα | {r['onoma']}", 'Our work: cuts, colour, styling | Giannis Hair Salon'),
                   t(c, 'Πριν και μετά από το κομμωτήριο στην Πολίχνη: balayage, fade, χάλκινα χρώματα, βραδινά χτενίσματα.', 'Before and after from our salon in Polichni: balayage, fades, copper shades, evening styles.'), soma, 'douleies',
                   scripts=('toufes-mixani.js', 'toufes.js', 'skines.js', 'epomeno.js'), psixoula=[(t(c, 'Αρχική', 'Home'), '/'), (t(c, 'Δουλειές μας', 'Our work'), '/douleies/')])

def selida_anartisi(c, a):
    r = c.r
    g, s = c.ymap[a['ypiresia']]
    k = next((k for k in c.omada if k['id'] == a.get('kommotis')), None)
    tl = L(c, a, 'titlos')
    kyria = sygkrisi(c, a, lazy=False) if a.get('prin') else eikona(c, a['fotografies'][0], tl, 'an-img', lazy=False, vt=f"an-{a['slug']}")
    alles = ''.join(f'<figure class="an-foto" data-reveal>{eikona(c, f, tl, "an-img")}</figure>' for f in a.get('fotografies', [])[(0 if a.get('prin') else 1):])
    kr = f"/kratisi/?y={s['id']}" + (f"&k={k['id']}" if k else '')
    soma = f'''<section class="an-hero" data-sxima="skoteino"><div class="wrap an-plegma">
<div class="an-keim"><p class="etiketa xoro">{E(L(c, s, 'onoma'))}</p><h1 class="titlos-sel xoro">{E(tl)}</h1>
<p class="hero-lead xoro">{E(L(c, a, 'keimeno') or '')}</p>
<p class="an-meta xoro">{(E(L(c, k, 'onoma')) + ' · ') if k else ''}{t(c, 'περίπου', 'about')} {diarkeia_keimeno(s['tmimata'], c)}</p>
<div class="xoro">{energeies(c, kr, t(c, 'Κλείσε το ίδιο', 'Book the same'))}</div></div>
<div class="an-kyria">{kyria}</div></div>
{f'<div class="wrap an-alles">{alles}</div>' if alles else ''}</section>
{kleisimo(c)}'''
    return kelyfos(c, a['url'], f"{tl} | {t(c, r['onoma'], 'Giannis Hair Salon')}", L(c, a, 'keimeno') or tl, soma, 'douleies',
                   [{'@context': 'https://schema.org', '@type': 'ImageGallery', 'name': tl, 'datePublished': a['imerominia']}],
                   scripts=('skines.js', 'epomeno.js'), og_eikona=a.get('meta') or a['fotografies'][0],
                   psixoula=[(t(c, 'Αρχική', 'Home'), '/'), (t(c, 'Δουλειές μας', 'Our work'), '/douleies/'), (tl, a['url'])])

def selida_omada(c):
    r = c.r
    soma = sel_hero(c, t(c, 'Η ομάδα', 'The team'), t(c, 'Γνώρισε<br class="d"> τους κομμωτές μας.', 'Meet<br class="d"> our stylists.'),
                    t(c, 'Στην online κράτηση διαλέγεις με ποιον θέλεις να κλείσεις, ή αφήνεις το σύστημα να βρει τον πρώτο διαθέσιμο.', 'When you book online, choose your stylist or let the system find the first one available.')) + f'''
<section class="enotita omada-en" data-sxima="fotino"><div class="wrap"><div class="omada-plegma">{''.join(melos(c, k) for k in c.omada)}</div></div></section>
{kleisimo(c)}'''
    return kelyfos(c, '/omada/', t(c, f"Η ομάδα μας | {r['onoma']}", 'Our team | Giannis Hair Salon'),
                   t(c, 'Οι κομμωτές του Κομμωτηρίου Γιάννης στην Πολίχνη. Κλείσε ραντεβού με όποιον θέλεις.', 'The stylists of Giannis Hair Salon in Polichni. Book with the one you like.'),
                   soma, 'omada', scripts=('toufes-mixani.js', 'toufes.js', 'skines.js', 'epomeno.js'), psixoula=[(t(c, 'Αρχική', 'Home'), '/'), (t(c, 'Ομάδα', 'Team'), '/omada/')])

def katalogos(c):
    r = c.r
    def yp(s):
        return {'id': s['id'], 'onoma': L(c, s, 'onoma'), 'tmimata': s['tmimata'], 'timi': s.get('timi'), 'online': s['online']}
    return {'omades': [{'id': g['id'], 'titlos': L(c, g, 'titlos_plires'), 'ypiresies': [yp(s) for s in g['ypiresies']]} for g in c.yp['omades']]
                      + [{'id': 'nyfiko', 'titlos': t(c, 'Νυφικό', 'Bridal'), 'ypiresies': [yp(c.yp['nyfiko'])]}],
            'kommotes': [{'id': k['id'], 'onoma': L(c, k, 'onoma'), 'eidikotita': L(c, k, 'eidikotita'), 'xroma': k['xroma'], 'online': k['online'],
                          'me': to_kommoti(c, k)} for k in c.omada],
            'orario': r['orario'], 'kanones': r['kanones']}

def selida_kratisi(c):
    r = c.r
    soma = f'''<section class="kr-sel" data-sxima="fotino">
<div class="wrap kr-plegma">
  <div class="kr-kefali"><p class="etiketa">{t(c, 'Online κράτηση', 'Online booking')}</p><h1 class="titlos">{t(c, 'Κλείσε το ραντεβού σου.', 'Book your appointment.')}</h1>
  <p class="kr-lead">{t(c, 'Τέσσερα βήματα, ένα λεπτό. Παίρνεις αμέσως email επιβεβαίωσης με σύνδεσμο για αλλαγή ή ακύρωση.', 'Four steps, one minute. You get a confirmation email right away, with a link to change or cancel.')}</p></div>
  <div class="kr-app" data-kratisi aria-live="polite">
    <noscript><p>{t(c, 'Για online κράτηση χρειάζεται JavaScript. Κάλεσέ μας στο', 'Online booking needs JavaScript. Call us on')} <a href="tel:{r['tilefono_e164']}">{E(r['tilefono'])}</a>.</p></noscript>
    <p class="kr-fortosi">{t(c, 'Φόρτωση…', 'Loading…')}</p>
  </div>
  <aside class="kr-synopsi" data-kr-synopsi aria-label="{t(c, 'Σύνοψη κράτησης', 'Booking summary')}"></aside>
</div>
<script type="application/json" id="kr-katalogos">{json.dumps(katalogos(c), ensure_ascii=False)}</script>
</section>'''
    return kelyfos(c, '/kratisi/', t(c, f"Online κράτηση ραντεβού | {r['onoma']}", 'Book an appointment online | Giannis Hair Salon'),
                   t(c, 'Κλείσε online ραντεβού στο Κομμωτήριο Γιάννης στην Πολίχνη: υπηρεσία, κομμωτής, ημέρα και ώρα σε ένα λεπτό.',
                     'Book online at Giannis Hair Salon in Polichni: service, stylist, day and time in one minute.'),
                   soma, 'kratisi', sxima='fotino', scripts=('diathesimotita.js', 'kratisi-api.js', 'kratisi.js'),
                   psixoula=[(t(c, 'Αρχική', 'Home'), '/'), (t(c, 'Κράτηση', 'Booking'), '/kratisi/')])

def selida_allagi(c):
    r = c.r
    soma = f'''<section class="kr-sel" data-sxima="fotino"><div class="wrap steno">
<p class="etiketa">{t(c, 'Η κράτησή μου', 'My booking')}</p><h1 class="titlos">{t(c, 'Αλλαγή ή ακύρωση', 'Change or cancel')}</h1>
<div class="kr-app" data-allagi aria-live="polite"><p class="kr-fortosi">{t(c, 'Φόρτωση…', 'Loading…')}</p></div>
<script type="application/json" id="kr-katalogos">{json.dumps(katalogos(c), ensure_ascii=False)}</script>
<p class="simeiosi">{t(c, f"Αλλαγή ή ακύρωση online γίνεται έως {r['kanones']['akyrosi_ores']} ώρες πριν από το ραντεβού. Αργότερα, κάλεσέ μας στο", f"You can change or cancel online up to {r['kanones']['akyrosi_ores']} hours before your appointment. After that, call us on")} <a href="tel:{r['tilefono_e164']}">{E(r['tilefono'])}</a>.</p>
</div></section>'''
    return kelyfos(c, '/kratisi/allagi/', t(c, f"Αλλαγή ή ακύρωση κράτησης | {r['onoma']}", 'Change or cancel a booking | Giannis Hair Salon'),
                   t(c, 'Αλλαγή ή ακύρωση online κράτησης.', 'Change or cancel an online booking.'), soma,
                   'kratisi', sxima='fotino', scripts=('diathesimotita.js', 'kratisi-api.js', 'kratisi.js'))

def selida_epikoinonia(c):
    r = c.r
    soma = sel_hero(c, t(c, 'Επικοινωνία', 'Contact'), t(c, 'Μαυρομιχάλη 15,<br class="d"> Πολίχνη.', '15 Mavromichali St.,<br class="d"> Polichni.'),
                    t(c, 'Στη γωνία με την Ευκλείδη, στον Άγιο Παντελεήμονα. Τηλέφωνο', 'On the corner of Efkleidou St., in Agios Panteleimonas. Phone') +
                    f' <a href="tel:{r["tilefono_e164"]}">{E(r["tilefono"])}</a>.') + f'''
<section class="enotita" data-sxima="fotino"><div class="wrap dyo-st">
<div>{etiketa(t(c, 'Πρόσβαση', 'Access'))}<p data-reveal>{E(L(c, r, 'prosvasi_simeiosi'))}</p>{etiketa(t(c, 'Πληρωμές', 'Payment'))}<p data-reveal>{E(L(c, r, 'pliromes'))}.</p></div>
<div>{etiketa(t(c, 'Παροχές', 'Amenities'))}<ul class="paroxes">{''.join(f'<li data-reveal>{E(p)}</li>' for p in L(c, r, 'paroxes'))}</ul></div></div></section>'''
    soma = soma.replace('<section class="enotita" data-sxima="fotino">', epafi(c) + '\n<section class="enotita" data-sxima="fotino">', 1)
    return kelyfos(c, '/epikoinonia/', t(c, f"Επικοινωνία, ωράριο, χάρτης | {r['onoma']}", 'Contact, opening hours, map | Giannis Hair Salon'),
                   t(c, f"Κομμωτήριο Γιάννης, {r['odos']}, {r['perioxi']}. Τηλέφωνο {r['tilefono']}. Τρίτη–Παρασκευή 09:00–21:00, Σάββατο 09:00–17:00.",
                     f"Giannis Hair Salon, {r['odos_en']}, {r['perioxi_en']}. Phone {r['tilefono']}. Tuesday–Friday 09:00–21:00, Saturday 09:00–17:00."),
                   soma, 'epikoinonia', scripts=('toufes-mixani.js', 'toufes.js', 'skines.js', 'epomeno.js', 'forma.js'),
                   psixoula=[(t(c, 'Αρχική', 'Home'), '/'), (t(c, 'Επικοινωνία', 'Contact'), '/epikoinonia/')])

def selida_keimenou(c, path, titlos, perigrafi, enotites):
    r = c.r
    s = ''.join(f'<h2 class="ypotitlos">{E(h)}</h2>' + ''.join(f'<p>{p}</p>' for p in ps) for h, ps in enotites)
    soma = f'''<section class="enotita keimeno-sel" data-sxima="fotino"><div class="wrap steno"><p class="etiketa">{E(t(c, r['onoma'], 'Giannis Hair Salon'))}</p>
<h1 class="titlos">{E(titlos)}</h1>{s}<p class="simeiosi">{t(c, 'Τελευταία ενημέρωση', 'Last updated')}: {date.today().strftime('%d/%m/%Y')}</p></div></section>'''
    return kelyfos(c, path, f"{titlos} | {t(c, r['onoma'], 'Giannis Hair Salon')}", perigrafi, soma, sxima='fotino',
                   psixoula=[(t(c, 'Αρχική', 'Home'), '/'), (titlos, path)])

def selides_nomikes(c):
    r = c.r; k = r['kanones']
    tel = f'<a href="tel:{r["tilefono_e164"]}">{E(r["tilefono"])}</a>'
    mail = f'<a href="mailto:{r["email"]}">{E(r["email"])}</a>'
    nom = f'<span lang="el">{E(r["nomiko"])}</span>'
    oroi = t(c, [
        ('Κράτηση', [f'Η online κράτηση επιβεβαιώνεται αμέσως με email. Το νυφικό, το βραδινό χτένισμα και οι υπηρεσίες άνω των {k["aitima_pano_apo_lepta"] // 60} ωρών είναι αίτημα που επιβεβαιώνει το κομμωτήριο.',
                     f'Κάθε κινητό μπορεί να έχει έως {k["energes_ana_kinito"]} ενεργές κρατήσεις. Online κλείνεις έως {k["orizontas_imeres"]} ημέρες μπροστά και τουλάχιστον {k["proeidopoiisi_lepta"] // 60} ώρες πριν.']),
        ('Αλλαγή και ακύρωση', [f'Αλλαγή ή ακύρωση από τον σύνδεσμο του email, έως {k["akyrosi_ores"]} ώρες πριν. Αργότερα, τηλεφωνικά στο {tel}.']),
        ('Διάρκεια και τιμή', ['Οι διάρκειες είναι ενδεικτικές. Η τελική τιμή εξαρτάται από το μήκος, την πυκνότητα και την κατάσταση των μαλλιών και συζητιέται πριν ξεκινήσει η εργασία.']),
        ('Μη εμφάνιση', ['Αν δεν μπορείς να έρθεις, ακύρωσε ώστε να δοθεί η ώρα σε άλλον. Μετά από δύο μη εμφανίσεις, οι νέες κρατήσεις γίνονται αίτημα.']),
    ], [
        ('Booking', [f'Online bookings are confirmed by email straight away. Bridal hair, evening styles and services longer than {k["aitima_pano_apo_lepta"] // 60} hours are requests that the salon confirms.',
                     f'Each mobile number can hold up to {k["energes_ana_kinito"]} active bookings. You can book online up to {k["orizontas_imeres"]} days ahead and at least {k["proeidopoiisi_lepta"] // 60} hours before.']),
        ('Changes and cancellations', [f'Use the link in your email to change or cancel, up to {k["akyrosi_ores"]} hours before. After that, please call {tel}.']),
        ('Time and price', ['Times are approximate. The final price depends on the length, density and condition of the hair and is agreed before we start.']),
        ('No-shows', ['If you cannot make it, please cancel so the slot can go to someone else. After two no-shows, new bookings become requests.']),
    ])
    aporrito = t(c, [
        ('Υπεύθυνος επεξεργασίας', [f'{E(r["onoma"])} ({nom}), {dieythynsi(c, False)}. Επικοινωνία: {tel}, {mail}.']),
        ('Τι συλλέγουμε και γιατί', ['Για την κράτηση: ονοματεπώνυμο, κινητό, email, την υπηρεσία, την ώρα και ό,τι γράψεις στη σημείωση. Τα χρησιμοποιούμε μόνο για να κλείσουμε, να επιβεβαιώσουμε, να υπενθυμίσουμε ή να αλλάξουμε το ραντεβού σου.',
                                     'Μηνύματα για προσφορές στέλνουμε μόνο αν το επιλέξεις χωριστά, και ανακαλείς όποτε θέλεις.']),
        ('Πού φυλάσσονται και για πόσο', ['Στον λογαριασμό Google του κομμωτηρίου (Google Drive, Google Calendar). Διατηρούνται 24 μήνες από την τελευταία επίσκεψη και μετά διαγράφονται.']),
        ('Τα δικαιώματά σου', [f'Πρόσβαση, διόρθωση, διαγραφή, περιορισμός, φορητότητα και εναντίωση: στείλε μας στο {mail}. Μπορείς επίσης να απευθυνθείς στην Αρχή Προστασίας Δεδομένων Προσωπικού Χαρακτήρα (dpa.gr).']),
        ('Cookies', ['Ο ιστότοπος δεν χρησιμοποιεί cookies παρακολούθησης. Ο χάρτης Google φορτώνει μόνο αν τον ανοίξεις εσύ.']),
    ], [
        ('Data controller', [f'Giannis Hair Salon ({nom}), {dieythynsi(c, False)}. Contact: {tel}, {mail}.']),
        ('What we collect and why', ['For a booking: name, mobile number, email, the service, the time and anything you write in the note. We use them only to book, confirm, remind you of or change your appointment.',
                                     'We only send offers if you opt in separately, and you can withdraw at any time.']),
        ('Where it is kept and for how long', ["In the salon's Google account (Google Drive, Google Calendar). It is kept for 24 months after your last visit and then deleted."]),
        ('Your rights', [f'Access, rectification, erasure, restriction, portability and objection: write to {mail}. You can also contact the Hellenic Data Protection Authority (dpa.gr).']),
        ('Cookies', ['This website uses no tracking cookies. The Google map only loads if you open it.']),
    ])
    prosv = t(c, [
        ('Δέσμευση', ['Επιδιώκουμε συμμόρφωση με το πρότυπο WCAG 2.1 επιπέδου ΑΑ: αντίθεση χρωμάτων, πλοήγηση με πληκτρολόγιο, εναλλακτικά κείμενα, σεβασμό της ρύθμισης «λιγότερη κίνηση».']),
        ('Κίνηση', ['Με το κουμπί «Παύση κινήσεων» στο κάτω μέρος κάθε σελίδας σταματούν όλες οι κινήσεις. Αν η συσκευή σου έχει ενεργή τη ρύθμιση «λιγότερη κίνηση», το περιεχόμενο εμφανίζεται εξαρχής στατικά.']),
        ('Επικοινωνία', [f'Αν κάτι δεν λειτουργεί για σένα, πες μας στο {tel} ή στο {mail} και θα το διορθώσουμε.']),
    ], [
        ('Commitment', ['We aim to meet WCAG 2.1 level AA: colour contrast, keyboard navigation, text alternatives and respect for the “reduce motion” setting.']),
        ('Motion', ['The “Pause animations” button at the bottom of every page stops all motion. If your device has “reduce motion” turned on, content is static from the start.']),
        ('Contact', [f'If something does not work for you, tell us on {tel} or at {mail} and we will fix it.']),
    ])
    return [
        ('/oroi-kratiseon/', selida_keimenou(c, '/oroi-kratiseon/', t(c, 'Όροι κρατήσεων', 'Booking terms'), t(c, 'Όροι online κρατήσεων, αλλαγών και ακυρώσεων.', 'Terms for online bookings, changes and cancellations.'), oroi)),
        ('/aporrito/', selida_keimenou(c, '/aporrito/', t(c, 'Απόρρητο και cookies', 'Privacy and cookies'), t(c, 'Πώς χρησιμοποιούμε τα στοιχεία της κράτησής σου.', 'How we use your booking details.'), aporrito)),
        ('/prosvasimotita/', selida_keimenou(c, '/prosvasimotita/', t(c, 'Δήλωση προσβασιμότητας', 'Accessibility statement'), t(c, 'Δήλωση προσβασιμότητας του ιστότοπου.', 'Accessibility statement for this website.'), prosv)),
    ]

def selida_404(c):
    soma = sel_hero(c, '404', t(c, 'Αυτή η σελίδα<br class="d"> πήγε για κούρεμα.', 'This page<br class="d"> went for a haircut.'),
                    t(c, 'Δεν τη βρήκαμε. Δοκίμασε την αρχική ή κλείσε απευθείας ραντεβού.', 'We could not find it. Try the home page or book directly.'),
                    f'<div class="energeies"><a class="btn" href="{u(c, "/kratisi/")}">{t(c, "Κλείσε ραντεβού", "Book now")}</a><a class="syndesmos" href="{u(c, "/")}">{t(c, "Αρχική ›", "Home ›")}</a></div>')
    return kelyfos(c, '/404.html', t(c, 'Η σελίδα δεν βρέθηκε | Κομμωτήριο Γιάννης', 'Page not found | Giannis Hair Salon'), t(c, 'Η σελίδα δεν βρέθηκε.', 'Page not found.'), soma, scripts=('toufes-mixani.js', 'toufes.js'))

# ───────────────────────── κύρια ροή ─────────────────────────

def selides_glossas(c):
    sel = [('/', selida_arxiki(c)), ('/ypiresies/', selida_ypiresies(c)), ('/nyfiko-xtenisma/', selida_nyfiko(c)),
           ('/douleies/', selida_douleies(c)), ('/omada/', selida_omada(c)), ('/kratisi/', selida_kratisi(c)),
           ('/kratisi/allagi/', selida_allagi(c)), ('/epikoinonia/', selida_epikoinonia(c))]
    sel += [selida_omadas_ypiresion(c, g) for g in c.yp['omades']]
    sel += [(x['url'], selida_anartisi(c, x)) for x in c.anartiseis]
    sel += selides_nomikes(c)
    return sel

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--out', default=str(RIZA / '_site'))
    ap.add_argument('--base', default='')
    ap.add_argument('--tomeas', default='')
    ap.add_argument('--dedomena', default='')
    ap.add_argument('--meson', default='')
    a = ap.parse_args()
    pigi = Path(a.dedomena) if a.dedomena else RIZA / 'periexomeno'
    def fortose(f):
        p = pigi / f
        if not p.exists():
            p = RIZA / 'periexomeno' / f
        return json.loads(p.read_text(encoding='utf-8'))
    c = Ctx()
    c.r = fortose('rythmiseis.json')
    c.yp = fortose('ypiresies.json')
    c.omada = fortose('omada.json')
    c.kritikes = [k for k in fortose('kritikes.json') if k.get('emfanisi', True)]
    c.base = a.base.rstrip('/')
    c.tomeas = (a.tomeas or (('https://' + c.r['tomeas']) if c.r.get('tomeas') else 'http://localhost:8000')).rstrip('/')
    if c.tomeas.startswith('http://') and 'localhost' not in c.tomeas: c.tomeas = 'https://' + c.tomeas[7:]   # το Pages δίνει http· σερβίρει https
    # έκδοση αρχείων = αποτύπωμα περιεχομένου: κάθε αλλαγή σε CSS/JS παίρνει νέα διεύθυνση, άρα όχι παλιό CSS από την κρυφή μνήμη
    import hashlib
    hs = hashlib.sha1()
    for f in sorted((RIZA / 'static').rglob('*')):
        if f.is_file() and f.suffix in ('.css', '.js', '.json', '.svg'): hs.update(f.read_bytes())
    c.ekdosi = hs.hexdigest()[:10]
    c.ymap = ypiresia_by_id(c)
    pr = RIZA / 'meson' / 'eikones' / 'prosorines.json'
    c.prosorines = json.loads(pr.read_text()) if pr.exists() else []
    an = [x for x in fortose('anartiseis.json') if x.get('katastasi', 'Δημοσιευμένη') == 'Δημοσιευμένη' and x.get('synainesi', True)]
    an.sort(key=lambda x: x['imerominia'], reverse=True)
    for x in an:
        x['slug'] = x.get('slug') or slugify(x.get('titlos_en') or x['titlos'])
        x['url'] = f"/douleies/{x['imerominia'][:4]}/{x['slug']}/"
        if x['ypiresia'] not in c.ymap:
            sys.exit(f"Ανάρτηση «{x['titlos']}»: άγνωστη υπηρεσία {x['ypiresia']}")
    c.anartiseis = an

    out = Path(a.out)
    if out.exists():
        shutil.rmtree(out)
    out.mkdir(parents=True)
    oles = {}
    for lang in ('el', 'en'):
        c.lang = lang
        sel = selides_glossas(c)
        oles[lang] = [p for p, _ in sel]
        riza = out / 'en' if lang == 'en' else out
        for p, h in sel:
            d = riza / p.strip('/') if p != '/' else riza
            d.mkdir(parents=True, exist_ok=True)
            (d / 'index.html').write_text(h, encoding='utf-8')
        if lang == 'el':
            (out / '404.html').write_text(selida_404(c), encoding='utf-8')
    shutil.copytree(RIZA / 'static', out / 'static')
    for lang in ('el', 'en'):
        c.lang = lang
        (out / 'static' / f"katalogos{'-en' if lang == 'en' else ''}.json").write_text(json.dumps(katalogos(c), ensure_ascii=False), encoding='utf-8')
    shutil.copytree(RIZA / 'meson', out / 'meson')
    if a.meson and Path(a.meson).exists():
        shutil.copytree(a.meson, out / 'meson', dirs_exist_ok=True)
    simera = date.today().isoformat()
    xml = ''
    for p in oles['el']:
        if p.startswith('/kratisi/allagi'):
            continue
        alt = f'<xhtml:link rel="alternate" hreflang="el" href="{c.tomeas}{p}"/><xhtml:link rel="alternate" hreflang="en" href="{c.tomeas}/en{p}"/>'
        xml += f'<url><loc>{c.tomeas}{p}</loc><lastmod>{simera}</lastmod>{alt}</url><url><loc>{c.tomeas}/en{p}</loc><lastmod>{simera}</lastmod>{alt}</url>'
    (out / 'sitemap.xml').write_text('<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" '
                                     f'xmlns:xhtml="http://www.w3.org/1999/xhtml">{xml}</urlset>', encoding='utf-8')
    robots = 'User-agent: *\nDisallow: /\n' if c.r.get('dokimastiko') else \
        f'User-agent: *\nAllow: /\nDisallow: /kratisi/allagi/\nDisallow: /en/kratisi/allagi/\n\nSitemap: {c.tomeas}/sitemap.xml\n'
    (out / 'robots.txt').write_text(robots, encoding='utf-8')
    if c.r.get('tomeas'):
        (out / 'CNAME').write_text(c.r['tomeas'] + '\n', encoding='utf-8')
    (out / '.nojekyll').write_text('', encoding='utf-8')
    print(f"Σελίδες: {len(oles['el'])} × 2 γλώσσες + 404 · αναρτήσεις: {len(an)} · έξοδος: {out}")
    prosorina = [x['titlos'] for x in an if x.get('prosorini')] + [k['onoma'] for k in c.omada if k.get('prosorino')]
    if prosorina:
        print('ΠΡΟΣΟΧΗ: προσωρινό περιεχόμενο, αντικαθίσταται πριν από τη δημόσια έκδοση:', ', '.join(prosorina))

if __name__ == '__main__':
    main()
