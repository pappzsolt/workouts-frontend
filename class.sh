
import re
from pathlib import Path

# ============================================================
# KONFIGURÁCIÓ – EZEKET ÁLLÍTSD BE A PROJEKTEDHEZ
# ============================================================

# Angular projekt gyökérkönyvtára
PROJECT_DIR = Path("/Users/pappzs/Documents/develop/workouts-frontend")

# Globális CSS fájl relatív útvonala a projekten belül
CSS_FILE = PROJECT_DIR / "src/styles.css"

# Ide kerül a nem használt classok listája
OUTPUT_FILE = PROJECT_DIR / "unused-css-classes.txt"

# Ezeket a könyvtárakat nem vizsgáljuk
EXCLUDED_DIRS = {
    "node_modules",
    "dist",
    ".angular",
    ".git",
    "coverage",
}


# ============================================================
# CSS CLASS NEVEK KINYERÉSE
# ============================================================

def extract_css_classes(css_content: str) -> set[str]:
    # CSS kommentek eltávolítása
    css_content = re.sub(
        r"/\*.*?\*/",
        "",
        css_content,
        flags=re.DOTALL
    )

    classes = set()

    # CSS szabályok szelektorainak kinyerése
    # Példa: .card, .program-card:hover { ... }
    for match in re.finditer(r"([^{}]+)\{", css_content):
        selector = match.group(1).strip()

        # @media, @keyframes stb. nem class szelektorok
        if selector.startswith("@"):
            continue

        # Class szelektorok kinyerése
        found = re.findall(
            r"\.([a-zA-Z_][a-zA-Z0-9_-]*)",
            selector
        )

        classes.update(found)

    return classes


# ============================================================
# HTML FÁJLOK ÖSSZEGYŰJTÉSE
# ============================================================

def get_html_files(project_dir: Path) -> list[Path]:
    html_files = []

    for path in project_dir.rglob("*.html"):
        # Kizárt könyvtárak figyelmen kívül hagyása
        if any(part in EXCLUDED_DIRS for part in path.parts):
            continue

        html_files.append(path)

    return html_files


# ============================================================
# CLASS NEVEK KERESÉSE A HTML FÁJLOKBAN
# ============================================================

def find_unused_classes(
    css_classes: set[str],
    html_files: list[Path]
) -> list[str]:

    # HTML fájlok tartalmának beolvasása
    html_contents = []

    for html_file in html_files:
        try:
            html_contents.append(
                html_file.read_text(encoding="utf-8")
            )
        except (OSError, UnicodeDecodeError) as error:
            print(f"Nem olvasható: {html_file} – {error}")

    # Összefűzzük a HTML-eket a kereséshez
    all_html = "\n".join(html_contents)

    unused_classes = []

    for class_name in sorted(css_classes):
        # Pontos class token keresése.
        # A class név előtt és után ne legyen másik
        # classnév-karakter, így a card nem található meg
        # a program-card részszavaként.
        pattern = (
            r"(?<![a-zA-Z0-9_-])"
            + re.escape(class_name)
            + r"(?![a-zA-Z0-9_-])"
        )

        if not re.search(pattern, all_html):
            unused_classes.append(class_name)

    return unused_classes


# ============================================================
# MAIN
# ============================================================

def main():
    if not CSS_FILE.exists():
        print(f"CSS fájl nem található: {CSS_FILE}")
        return

    css_content = CSS_FILE.read_text(encoding="utf-8")

    css_classes = extract_css_classes(css_content)
    html_files = get_html_files(PROJECT_DIR)

    unused_classes = find_unused_classes(
        css_classes,
        html_files
    )

    # Lista kiírása fájlba
    with OUTPUT_FILE.open("w", encoding="utf-8") as file:
        file.write("NEM TALÁLT CSS CLASSOK\n")
        file.write("======================\n\n")

        for class_name in unused_classes:
            file.write(f".{class_name}\n")

    print("\n========== EREDMÉNY ==========")
    print(f"CSS classok száma: {len(css_classes)}")
    print(f"Átvizsgált HTML fájlok: {len(html_files)}")
    print(f"Nem talált classok: {len(unused_classes)}")
    print(f"\nLista: {OUTPUT_FILE}")


if __name__ == "__main__":
    main()
