#!/usr/bin/env python3
import os
import re

def update_links(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    updated_content = content
    
    # Interne Links anpassen (außer index.html selbst)
    if "index.html" not in filepath:
        # Links zu index.html von anderen Dateien aus müssen auf ../index.html zeigen
        updated_content = re.sub(r'(href=")index.html', r'\1../index.html', updated_content)
        updated_content = re.sub(r"(href=')index.html", r"\1../index.html", updated_content)
    
    # Alle anderen HTML-Links, die nicht mit ../ beginnen, müssen ../ vorangestellt bekommen
    # Aber nur wenn sie nicht schon ../ haben
    # Wir müssen vorsichtig sein, um keine externen Links zu zerstören
    def fix_link(match):
        link = match.group(1)
        # Wenn Link schon mit ../ beginnt oder ein externer Link ist, nicht ändern
        if link.startswith('../') or '://' in link or link.startswith('#') or link.startswith('mailto:') or link.startswith('tel:'):
            return f'href="{link}"'
        # Wenn es eine HTML-Datei ist (außer index.html, das wir schon behandelt haben)
        if link.endswith('.html') and not link.startswith('http'):
            return f'href="../{link}"'
        return f'href="{link}"'
    
    updated_content = re.sub(r'href="([^"]*)"', fix_link, updated_content)
    
    if updated_content != content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(updated_content)
        print(f"✓ Links in {filepath} aktualisiert")
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
        if update_links(filepath):
            updated_count += 1
    else:
        print(f"⚠ Datei nicht gefunden: {filepath}")

print(f"\n✅ Fertig! {updated_count} Dateien aktualisiert.")