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

python3 - "$BILDER_DIR" "$GALERIE_JSON" <<'EOF'
import json, sys, subprocess, os, glob

bilder_dir   = sys.argv[1]
galerie_path = sys.argv[2]

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
    if fname in ('logo.png',) or fname in existing:
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
    sys.exit(0)

# galerie.json sauber zurückschreiben
with open(galerie_path, 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)
    f.write('\n')

print('  galerie.json aktualisiert.')

# Inline-Daten in galerie.html aktualisieren
import re

galerie_html = os.path.normpath(os.path.join(os.path.dirname(galerie_path), '..', 'html', 'galerie.html'))
if os.path.exists(galerie_html):
    with open(galerie_html, encoding='utf-8') as f:
        html = f.read()

    lines = ['window.GALERIE_DATA = [']
    for i, entry in enumerate(data):
        comma = '' if i == len(data) - 1 else ','
        lines.append('  ' + json.dumps(entry, ensure_ascii=False) + comma)
    lines.append('];')
    new_block = '<script id="galerie-data">\n' + '\n'.join(lines) + '\n</script>'

    html_new = re.sub(
        r'<script id="galerie-data">.*?</script>',
        new_block,
        html,
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
