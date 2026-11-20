# Sunset State Cover Studio

[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/Goatleaf12/makefun-gta6-cover-art-04/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/Goatleaf12/makefun-gta6-cover-art-04/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

An offline cover-art studio that turns your photos into GTA-poster-style
cover art: multi-panel comic collages, sunset and neon colour grades,
magazine lettering, and pixel-exact PNG exports in the three social post
sizes — 1080×1080, 1080×1350 and 1920×1080.

Everything runs locally in the browser. No uploads, no accounts, no
network requests: your photos never leave your machine.

## What it does

- **Layouts** — nine panel layouts per size (Hero, Hero Right, Comic
  Slant, Grid 3×3, Mosaic, Single, Split Duo, Skyline Stack, Poster
  Frame), five to nine panels each, defined separately for landscape,
  portrait and square so every export is composed for its own aspect.
- **Photos** — add your own by file picker or drag-and-drop, or start
  from the ten built-in sample plates. Click a panel to select it, drag
  to pan, scroll to zoom, double-click to re-centre, drag a photo onto
  a panel to replace it, fill every panel from one photo, or spread
  your photos across the panels.
- **Grades** — nine colour grades (Vice Sunset, Neon Night, Golden
  Hour, Duotone Pink/Teal, Comic Ink, Painterly, Noir, Chrome Dusk,
  Natural) with strength, contrast, saturation, grain and vignette
  sliders, plus halftone print dots and a paper-texture finish. The
  grade also recolours the title gradient.
- **Cover recipes** — four one-click presets (Vice Classic, Neon
  Nights, Print Comic, Golden Coast) that set layout, grade, size,
  captions and effects together.
- **Lettering** — gradient display title with outline and hard shadow,
  neon script subtitle, star row with quote line, starburst seal,
  volume and wanted tags, ribbon, a palm-silhouette bottom band with
  tagline, catalog microtext with a drawn barcode, and editable
  per-panel location tags.
- **Export** — one button per size plus EXPORT ALL, rendering the same
  canvas routine used for the live preview at full resolution.

## Run it

```sh
node serve.ts
```

then open <http://localhost:8080>. Or open `app/index.html` through any
static file server. The app is plain HTML, CSS and JavaScript modules —
no build step, no dependencies.

To produce the hand-in bundle (what `main.ts` does):

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

## Fonts and samples

Title, script and tag type are self-hosted Open Font License faces
under `app/fonts/` (Anton, Pacifico, Oswald; licence text in
`app/fonts/OFL.txt`), fetched by `tools/fetch-fonts.py`. The ten sample
plates under `app/samples/` are painted procedurally from code by
`tools/make-samples.py` — layered skies, seas, skylines and palm
silhouettes, no photographs and no third-party artwork. All lettering,
seals, ribbons and barcodes are drawn on the canvas at render time.

An entry for the make.fun bounty
[gta6-cover-art-01](https://make.fun/bounty/gta6-cover-art-01).
Licensed under the MIT License (see `LICENSE`).
