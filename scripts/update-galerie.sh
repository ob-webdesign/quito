#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# update-galerie.sh
# Scannt den bilder/-Ordner und aktualisiert bilder/galerie.json.
#
# Neue Bilder werden automatisch hinzugefügt:
#   - orient wird per sips aus den Bildabmessungen erkannt
#   - title = Dateiname ohne Endung (anpassbar in galerie.json)
#   - cat   = "Neu"                 (anpassbar in galerie.json)
#
# Bestehende Einträge in galerie.json bleiben unverändert.
#
# Verwendung:
#   cd "/Users/dominikorth/Documents/Website Quito"
#   bash scripts/update-galerie.sh
# ─────────────────────────────────────────────────────────────────────────────

BILDER_DIR="$(dirname "$0")/../bilder"
GALERIE_JSON="$BILDER_DIR/galerie.json"
ALBEN_JSON="$BILDER_DIR/alben.json"

python3 - "$BILDER_DIR" "$GALERIE_JSON" "$ALBEN_JSON" <<'EOF'
import json, sys, subprocess, os, glob

bilder_dir   = sys.argv[1]
galerie_path = sys.argv[2]
alben_path   = sys.argv[3]

# Vorhandene Einträge laden
with open(galerie_path, encoding='utf-8') as f:
    data = json.load(f)

existing = {entry['src'] for entry in data}

# Alle Bilddateien im Ordner finden
exts = ['jpg','jpeg','JPG','JPEG','png','PNG','webp','WEBP','gif','GIF']
files = []
for ext in exts:
    files.extend(glob.glob(os.path.join(bilder_dir, f'*.{ext}')))

added = 0
for filepath in sorted(files):
    fname = os.path.basename(filepath)
    if fname in ('logo.png', 'hero-alt.WEBP', 'hero-desktop.WEBP') or fname in existing:
        continue

    # Abmessungen per sips ermitteln
    result = subprocess.run(
        ['sips', '-g', 'pixelWidth', '-g', 'pixelHeight', filepath],
        capture_output=True, text=True
    )
    width = height = 0
    for line in result.stdout.splitlines():
        if 'pixelWidth'  in line: width  = int(line.split()[-1])
        if 'pixelHeight' in line: height = int(line.split()[-1])

    orient = 'landscape' if width > height else 'portrait'
    title  = os.path.splitext(fname)[0].replace('-', ' ').replace('_', ' ')

    data.append({'src': fname, 'title': title, 'cat': 'Neu', 'orient': orient})
    print(f'  ✓ Neu: {fname} (orient: {orient})')
    added += 1

if added == 0:
    print('  Keine neuen Bilder gefunden.')
else:
    # galerie.json sauber zurückschreiben
    with open(galerie_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write('\n')
    print('  galerie.json aktualisiert.')

# alben.json laden (falls vorhanden) — Album-Metadaten werden hier redaktionell gepflegt
alben = {}
if os.path.exists(alben_path):
    with open(alben_path, encoding='utf-8') as f:
        alben = json.load(f)

# Inline-Daten in galerie.html aktualisieren (immer, auch ohne neue Fotos,
# damit manuelle Änderungen an galerie.json/alben.json übernommen werden)
import re

galerie_html = os.path.normpath(os.path.join(os.path.dirname(galerie_path), '..', 'galerie.html'))
if os.path.exists(galerie_html):
    with open(galerie_html, encoding='utf-8') as f:
        html = f.read()

    lines = ['window.GALERIE_DATA = [']
    for i, entry in enumerate(data):
        comma = '' if i == len(data) - 1 else ','
        lines.append('  ' + json.dumps(entry, ensure_ascii=False) + comma)
    lines.append('];')
    new_galerie_block = '<script id="galerie-data">\n' + '\n'.join(lines) + '\n</script>'

    new_alben_block = ('<script id="alben-data">\nwindow.ALBEN_DATA = '
                        + json.dumps(alben, ensure_ascii=False, indent=2) + ';\n</script>')

    html_new = re.sub(
        r'<script id="galerie-data">.*?</script>',
        new_galerie_block,
        html,
        flags=re.DOTALL
    )
    html_new = re.sub(
        r'<script id="alben-data">.*?</script>',
        new_alben_block,
        html_new,
        flags=re.DOTALL
    )

    if html_new != html:
        with open(galerie_html, 'w', encoding='utf-8') as f:
            f.write(html_new)
        print('  galerie.html Inline-Daten aktualisiert.')
    else:
        print('  galerie.html bereits aktuell.')
else:
    print('  Warnung: galerie.html nicht gefunden, HTML nicht aktualisiert.')
EOF
