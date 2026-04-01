#!/usr/bin/env python3
import os
import re

# Pfade aktualisieren
def update_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Alle "bilder/" durch "../bilder/" ersetzen
    updated_content = re.sub(r'(src=")bilder/', r'\1../bilder/', content)
    updated_content = re.sub(r"(src=')bilder/", r"\1../bilder/", updated_content)
    
    # Im JavaScript-Array ebenfalls ersetzen
    updated_content = re.sub(r'(\{ src: \')bilder/', r"\1../bilder/", updated_content)
    updated_content = re.sub(r'(\{ src: ")bilder/', r'\1../bilder/', updated_content)
    
    if updated_content != content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(updated_content)
        print(f"✓ {filepath} aktualisiert")
        return True
    return False

# Alle HTML-Dateien im html/ Ordner
html_dir = "html"
html_files = [
    "index.html",
    "galerie.html", 
    "speisekarte.html",
    "impressum.html",
    "_rezensionen-statisch.html"
]

updated_count = 0
for filename in html_files:
    filepath = os.path.join(html_dir, filename)
    if os.path.exists(filepath):
        if update_file(filepath):
            updated_count += 1
    else:
        print(f"⚠ Datei nicht gefunden: {filepath}")

print(f"\n✅ Fertig! {updated_count} Dateien aktualisiert.")