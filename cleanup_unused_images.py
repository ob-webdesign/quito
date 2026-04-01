import os
import re
import sys

def find_used_images(html_file):
    """Findet alle in der HTML-Datei referenzierten Bilder"""
    try:
        with open(html_file, 'r', encoding='utf-8') as f:
            content = f.read()
    except FileNotFoundError:
        print(f"❌ Datei '{html_file}' nicht gefunden!")
        return set()
    
    # Regex-Muster für Bildreferenzen in verschiedenen HTML-Tags
    patterns = [
        r'src=["\']([^"\']+\.(?:jpg|jpeg|png|gif|svg|webp|bmp))["\']',
        r'background=["\']([^"\']+\.(?:jpg|jpeg|png|gif|svg|webp|bmp))["\']',
        r'url\(["\']?([^)"\']+\.(?:jpg|jpeg|png|gif|svg|webp|bmp))["\']?\)'
    ]
    
    used_images = set()
    for pattern in patterns:
        matches = re.findall(pattern, content, re.IGNORECASE)
        for match in matches:
            # Entferne "../", "./" oder Ordnerpfade, behalte nur Dateinamen
            filename = os.path.basename(match)
            used_images.add(filename.lower())  # Kleinbuchstaben für Vergleich
    
    print(f"🔍 Gefundene referenzierte Bilder in {html_file}:")
    for img in sorted(used_images):
        print(f"  - {img}")
    
    return used_images

def find_all_images(folder):
    """Findet alle Bilddateien im angegebenen Ordner"""
    if not os.path.exists(folder):
        print(f"❌ Ordner '{folder}' nicht gefunden!")
        return set()
    
    image_extensions = {'.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp', '.bmp'}
    all_images = set()
    
    for filename in os.listdir(folder):
        file_lower = filename.lower()
        for ext in image_extensions:
            if file_lower.endswith(ext):
                all_images.add(filename.lower())
                break
    
    print(f"\n📁 Alle Bilder im Ordner '{folder}':")
    for img in sorted(all_images):
        print(f"  - {img}")
    
    return all_images

def delete_unused_images(unused_images, folder):
    """Löscht nicht verwendete Bilddateien"""
    if not unused_images:
        print("\n✅ Alle Bilder werden verwendet - nichts zu löschen!")
        return
    
    print(f"\n🗑️  Zu löschende nicht verwendete Bilder ({len(unused_images)}):")
    for img in sorted(unused_images):
        print(f"  - {img}")
    
    # Bestätigung einholen
    response = input(f"\n❓ Möchten Sie diese {len(unused_images)} Bilder wirklich löschen? (j/n): ").lower()
    
    if response == 'j':
        deleted_count = 0
        for img in unused_images:
            img_path = os.path.join(folder, img)
            try:
                os.remove(img_path)
                print(f"  ✅ Gelöscht: {img}")
                deleted_count += 1
            except Exception as e:
                print(f"  ❌ Fehler beim Löschen von {img}: {e}")
        
        print(f"\n📊 Insgesamt {deleted_count} von {len(unused_images)} Bildern gelöscht.")
    else:
        print("\n⚠️  Löschvorgang abgebrochen!")

def main():
    print("=" * 60)
    print("BILD-CLEANUP TOOL")
    print("Analysiert index.html und löscht ungenutzte Bilder")
    print("=" * 60)
    
    html_file = "index.html"
    image_folder = "bilder"
    
    # 1. Referenzierte Bilder finden
    used_images = find_used_images(html_file)
    
    if not used_images:
        print("\n⚠️  Keine Bilder in index.html gefunden! Möchten Sie trotzdem fortfahren?")
        response = input("Möchten Sie alle Bilder im 'bilder' Ordner löschen? (j/n): ").lower()
        if response == 'j':
            all_images = find_all_images(image_folder)
            delete_unused_images(all_images, image_folder)
        return
    
    # 2. Alle Bilder im Ordner finden
    all_images = find_all_images(image_folder)
    
    if not all_images:
        print("\n⚠️  Keine Bilder im 'bilder' Ordner gefunden!")
        return
    
    # 3. Nicht verwendete Bilder berechnen
    unused_images = all_images - used_images
    
    # 4. Löschen
    delete_unused_images(unused_images, image_folder)

if __name__ == "__main__":
    main()