#!/usr/bin/env python3
"""Fetch the three OFL display fonts the studio self-hosts under app/fonts/.

The fonts ship inside app/ so the app itself never touches the network;
this script is build tooling only, run once by hand. Sources are the
canonical files in the google/fonts GitHub repository.
"""
import pathlib
import urllib.request

FONTS = [
    (
        "https://github.com/google/fonts/raw/main/ofl/anton/Anton-Regular.ttf",
        "Anton-Regular.ttf",
    ),
    (
        "https://github.com/google/fonts/raw/main/ofl/pacifico/Pacifico-Regular.ttf",
        "Pacifico-Regular.ttf",
    ),
    (
        "https://github.com/google/fonts/raw/main/ofl/oswald/Oswald%5Bwght%5D.ttf",
        "Oswald.ttf",
    ),
]

OUT_DIR = pathlib.Path(__file__).resolve().parent.parent / "app" / "fonts"


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    for url, name in FONTS:
        target = OUT_DIR / name
        request = urllib.request.Request(url, headers={"User-Agent": "fetch-fonts"})
        with urllib.request.urlopen(request) as response:
            data = response.read()
        target.write_bytes(data)
        print(f"{name}: {len(data)} bytes")


if __name__ == "__main__":
    main()
