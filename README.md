# Κομμωτήριο Γιάννης · ιστότοπος με online κρατήσεις

Στατικός δίγλωσσος ιστότοπος (ελληνικά `/`, αγγλικά `/en/`), GitHub Pages, με δική του εφαρμογή κράτησης και
Πίνακα διαχείρισης σε Google Apps Script. Σχεδίαση και ανάπτυξη: Expertease Designs.
Πλάνο: `../PLANO.md` · Σχεδιαστική κατεύθυνση: `../KATEYTHYNSI.md`

## Δομή

```
istotopos/                         ← το αποθετήριο GitHub
├── build/
│   ├── build.py                   γεννήτρια: όλες οι σελίδες σε ΕΛ και ΕΝ, JSON-LD, sitemap με hreflang
│   ├── fere_apo_fyllo.py          περιεχόμενο και φωτογραφίες από τον Πίνακα (Φύλλο/Drive)
│   └── elegxos.py                 έλεγχος πριν ανέβει (h1, γλώσσα, hreflang, σύνδεσμοι, εικόνες, τίτλοι)
├── static/
│   ├── site.css                   ταυτότητα, κλίμακα, σκηνές, εφαρμογή κράτησης
│   ├── site.js                    κεφαλίδα, μενού, εμφανίσεις, λεπίδες πριν/μετά, παύση κινήσεων
│   ├── toufes.js                  υπογραφή «Τούφες» (καμβάς, Verlet, χτένα, balayage με την κύλιση)
│   ├── skines.js                  μεταμόρφωση, οριζόντια ροή, παλέτα (OKLab), παράλλαξη, βήματα, εισιτήριο
│   ├── diathesimotita.js          μηχανισμός διαθεσιμότητας (ίδιος με diaxeirisi/Diathesimotita.gs)
│   ├── kratisi-api.js             API: πραγματικό (Apps Script) ή επίδειξη (localStorage)
│   ├── kratisi.js · epomeno.js    εφαρμογή κράτησης, αλλαγή/ακύρωση, «επόμενο ελεύθερο»
│   └── fonts/                     Noto Serif Display, Manrope (τοπικά, ελληνικά + λατινικά)
├── periexomeno/                   rythmiseis · ypiresies · omada · anartiseis · kritikes (.json, με πεδία _en)
├── meson/eikones/                 WebP 800/1600 (ergaleia/eikones.py)
├── diaxeirisi/                    Apps Script: Code.gs · Diathesimotita.gs · Index.html · ODIGOS-STISIMATOS.md
├── ergaleia/                      eikones.py · dokimes/dokimi_apps_script.js (32 σενάρια)
└── .github/workflows/dimosieusi.yml
```

## Τοπικά

```
python3 ergaleia/eikones.py --pigi ../ylika/images   # μία φορά, ή όταν αλλάξουν οι φωτογραφίες
python3 build/build.py && python3 build/elegxos.py _site
cd _site && python3 -m http.server 8000               # http://localhost:8000
node ergaleia/dokimes/dokimi_apps_script.js           # δοκιμή του Apps Script εκτός Google
```

Χωρίς `api_url` στο `periexomeno/rythmiseis.json` η κράτηση τρέχει σε **λειτουργία επίδειξης** (φαίνεται ένδειξη).
Με `"dokimastiko": true` ο ιστότοπος έχει `noindex` και `robots.txt` που αποκλείει τα πάντα.

## Πριν από τη δημόσια έκδοση

1. Αληθινές φωτογραφίες στη θέση των προσωρινών (αναρτήσεις με `"prosorini": true`, φωτογραφία χώρου).
2. Όνομα και ειδικότητα του τρίτου κομμωτή (`omada.json`, `"prosorino": true`).
3. Διάρκειες και τιμές από το κομμωτήριο (`ypiresies.json` ή καρτέλα «Υπηρεσίες» του Φύλλου).
4. Στήσιμο του Apps Script (`diaxeirisi/ODIGOS-STISIMATOS.md`), `api_url` και `api_kleidi` στο `rythmiseis.json`.
5. Τομέας στο `"tomeas"`, `"dokimastiko": false`.
