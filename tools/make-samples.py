#!/usr/bin/env python3
"""Paint the studio's ten sample plates procedurally with PIL.

Every plate is drawn from code — layered gradient skies, sun and moon
glows (screen-blended, never black pastes), cloud bands, sparkling seas,
skylines with lit windows, palm silhouettes whose fronds are segmented
drooping curves, boats, cars, neon signage and boardwalk perspective —
then finished with film grain and a soft vignette. No photographs, no
third-party artwork: these plates exist so the app opens with a finished
cover already composed.

Run:  python3 tools/make-samples.py
"""
import math
import pathlib
import random

from PIL import Image, ImageChops, ImageDraw, ImageFilter

OUT_DIR = pathlib.Path(__file__).resolve().parent.parent / "app" / "samples"
SS = 2  # supersample factor; plates are painted large and shrunk for smoothness


# ---------------------------------------------------------------- helpers

def lerp(a, b, t):
    return a + (b - a) * t


def mix(c1, c2, t):
    return tuple(int(lerp(c1[i], c2[i], t)) for i in range(3))


def vgrad(w, h, stops):
    """Vertical gradient image from [(pos0..1, (r,g,b)), ...]."""
    strip = Image.new("RGB", (1, h))
    px = strip.load()
    for y in range(h):
        t = y / max(1, h - 1)
        for i in range(len(stops) - 1):
            p0, c0 = stops[i]
            p1, c1 = stops[i + 1]
            if p0 <= t <= p1:
                px[0, y] = mix(c0, c1, (t - p0) / max(1e-6, p1 - p0))
                break
        else:
            px[0, y] = stops[-1][1]
    return strip.resize((w, h))


def glow_sprite(size, color, peak=255):
    """Radial glow: concentric discs of rising alpha, blurred smooth."""
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    steps = 48
    for i in range(steps, 0, -1):
        r = size / 2 * i / steps
        a = int(peak * (1 - i / steps) ** 1.6)
        d.ellipse([size / 2 - r, size / 2 - r, size / 2 + r, size / 2 + r],
                  fill=color + (a,))
    return img.filter(ImageFilter.GaussianBlur(size / 12))


def screen_paste(base, sprite, cx, cy):
    """Composite an RGBA glow sprite onto base with screen blending.

    The sprite box is clipped against the image bounds first, so glows
    centred near an edge still land.
    """
    x, y = int(cx - sprite.width / 2), int(cy - sprite.height / 2)
    sx0, sy0 = max(0, -x), max(0, -y)
    bx0, by0 = max(0, x), max(0, y)
    bx1 = min(base.width, x + sprite.width)
    by1 = min(base.height, y + sprite.height)
    if bx1 <= bx0 or by1 <= by0:
        return base
    sub = sprite.crop((sx0, sy0, sx0 + (bx1 - bx0), sy0 + (by1 - by0)))
    region = base.crop((bx0, by0, bx1, by1)).convert("RGB")
    screened = ImageChops.screen(region, sub.convert("RGB"))
    base.paste(screened, (bx0, by0), sub.split()[3])
    return base


def sun(base, cx, cy, radius, core, halo, rng):
    screen_paste(base, glow_sprite(radius * 7, halo, 200), cx, cy)
    d = ImageDraw.Draw(base, "RGBA")
    d.ellipse([cx - radius, cy - radius, cx + radius, cy + radius], fill=core + (255,))
    d.ellipse([cx - radius, cy - radius, cx + radius, cy + radius],
              outline=(255, 255, 255, 160), width=max(2, radius // 22))
    return base


def cloud_band(base, y, w, tint, rng, alpha=110, scale=1.0):
    """Soft horizontal cloud band: overlapping ellipses, blurred, warm-lit."""
    layer = Image.new("RGBA", base.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    n = rng.randint(7, 12)
    for _ in range(n):
        cx = rng.uniform(-0.05, 1.05) * base.width
        cy = y + rng.uniform(-14, 14) * scale
        rx = rng.uniform(90, 260) * scale
        ry = rx * rng.uniform(0.16, 0.26)
        shade = mix(tint, (255, 255, 255), rng.uniform(0.0, 0.35))
        d.ellipse([cx - rx, cy - ry, cx + rx, cy + ry], fill=shade + (alpha,))
    layer = layer.filter(ImageFilter.GaussianBlur(18 * scale))
    base.alpha_composite(layer)
    return base


def sea(base, top, bottom_color, horizon_glow, sun_x, rng, sparkle=900):
    """Sparkle field over the lower part of the image."""
    d = ImageDraw.Draw(base, "RGBA")
    h = base.height - top
    for _ in range(sparkle):
        t = rng.random() ** 1.6
        y = top + t * h
        spread = 0.06 + 0.5 * t
        x = sun_x + rng.gauss(0, spread * base.width / 3)
        if not (0 <= x < base.width):
            continue
        length = rng.uniform(4, 26) * (0.4 + t)
        a = int(rng.uniform(30, 150) * (1 - abs(x - sun_x) / base.width))
        col = mix(bottom_color, horizon_glow, rng.uniform(0.4, 1.0))
        d.line([x, y, x + length, y], fill=col + (max(0, a),),
               width=max(1, int(2 * t)))
    return base


def skyline(base, base_y, h_min, h_max, fill, rng, windows=True, win_col=(255, 214, 130)):
    d = ImageDraw.Draw(base, "RGBA")
    x = -10
    while x < base.width + 10:
        bw = rng.uniform(46, 130)
        bh = rng.uniform(h_min, h_max)
        d.rectangle([x, base_y - bh, x + bw, base_y], fill=fill + (255,))
        if rng.random() < 0.5:  # rooftop block / antenna
            d.rectangle([x + bw * 0.3, base_y - bh - 12, x + bw * 0.55, base_y - bh],
                        fill=fill + (255,))
        if windows:
            cols = max(2, int(bw // 16))
            rows = max(2, int(bh // 22))
            for cx in range(cols):
                for cy in range(rows):
                    if rng.random() < 0.34:
                        wx = x + 6 + cx * (bw - 12) / cols
                        wy = base_y - bh + 8 + cy * (bh - 16) / rows
                        a = rng.randint(90, 230)
                        d.rectangle([wx, wy, wx + 5, wy + 7], fill=win_col + (a,))
        x += bw + rng.uniform(2, 14)
    return base


def palm_points(x, y, height, lean):
    """Trunk curve points (quadratic) from base to crown."""
    pts = []
    cx, cy = x + lean * 0.25, y - height * 0.55
    tx, ty = x + lean, y - height
    for i in range(25):
        t = i / 24
        px = (1 - t) ** 2 * x + 2 * (1 - t) * t * cx + t ** 2 * tx
        py = (1 - t) ** 2 * y + 2 * (1 - t) * t * cy + t ** 2 * ty
        pts.append((px, py))
    return pts


def draw_palm(base, x, y, height, lean, color, rng, fronds=9):
    """Palm silhouette: tapering trunk of discs + segmented drooping fronds."""
    layer = Image.new("RGBA", base.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    pts = palm_points(x, y, height, lean)
    for i in range(len(pts) - 1):  # continuous tapered trunk, not beads
        t = i / (len(pts) - 1)
        wdt = max(2, int(height * lerp(0.058, 0.020, t)))
        a = 255 if i % 3 else 205  # faint ring banding along the trunk
        d.line([pts[i], pts[i + 1]], fill=color + (a,), width=wdt)
    tx, ty = pts[-1]
    for k in range(fronds):
        ang = math.radians(lerp(-168, -12, k / max(1, fronds - 1)) + rng.uniform(-7, 7))
        length = height * rng.uniform(0.34, 0.48)
        droop = length * rng.uniform(0.55, 0.95)
        prev = (tx, ty)
        segs = 11
        for s in range(1, segs + 1):
            t = s / segs
            px = tx + math.cos(ang) * length * t
            py = ty + math.sin(ang) * length * t + droop * t * t
            wdt = max(1, int(lerp(height * 0.016, 1.2, t)))
            d.line([prev, (px, py)], fill=color + (255,), width=wdt)
            # leaflet ticks on the lower half of the frond
            if s > 3:
                la = ang + 0.9
                lx = px + math.cos(la) * height * 0.045
                ly = py + math.sin(la) * height * 0.045
                d.line([(px, py), (lx, ly)], fill=color + (220,), width=1)
            prev = (px, py)
    # coconut cluster
    for dx, dy in ((-6, 4), (5, 6), (0, 9)):
        r = height * 0.016
        d.ellipse([tx + dx - r, ty + dy - r, tx + dx + r, ty + dy + r], fill=color + (255,))
    base.alpha_composite(layer)
    return base


def finish(img, rng, grain_sigma=26, grain_amt=0.5, vig=0.34):
    """Film grain (overlay noise, tamed) + soft vignette."""
    noise = Image.effect_noise(img.size, grain_sigma).convert("L")
    over = ImageChops.overlay(img.convert("RGB"), noise.convert("RGB"))
    img = Image.blend(img.convert("RGB"), over, grain_amt)
    w, h = img.size
    mask = Image.new("L", (w, h), 0)
    md = ImageDraw.Draw(mask)
    md.ellipse([-w * 0.28, -h * 0.28, w * 1.28, h * 1.28], fill=255)
    mask = mask.filter(ImageFilter.GaussianBlur(w // 6))
    dark = Image.new("RGB", (w, h), (0, 0, 0))
    img = Image.composite(img, Image.blend(img, dark, vig), mask)
    return img


def save(img, name, size):
    img = img.convert("RGB").resize(size, Image.LANCZOS)
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    img.save(OUT_DIR / name, quality=88)
    print(name, img.size)


# ---------------------------------------------------------------- plates

def plate_sunset_beach():
    rng = random.Random(101)
    W, H = 1200 * SS, 900 * SS
    img = vgrad(W, H, [(0, (58, 30, 92)), (0.34, (166, 52, 110)),
                       (0.55, (238, 106, 74)), (0.68, (255, 176, 92)),
                       (1, (255, 205, 130))]).convert("RGBA")
    sea_img = vgrad(W, H - int(H * 0.70), [(0, (255, 196, 124)), (0.14, (219, 124, 108)),
                                           (0.5, (74, 84, 142)), (1, (24, 40, 84))])
    img.paste(sea_img, (0, int(H * 0.70)))  # the sea gets its own gradient
    sun(img, W * 0.5, H * 0.70, 54 * SS, (255, 236, 180), (255, 140, 70), rng)
    cloud_band(img, H * 0.16, W, (240, 120, 130), rng, 90, SS)
    cloud_band(img, H * 0.34, W, (255, 160, 110), rng, 80, SS)
    sea(img, int(H * 0.715), (30, 60, 120), (255, 190, 110), W * 0.5, rng, 1500)
    d = ImageDraw.Draw(img, "RGBA")
    d.polygon([(0, H), (0, H * 0.90), (W * 0.4, H * 0.845), (W, H * 0.88), (W, H)],
              fill=(238, 196, 140, 255))  # beach
    d.polygon([(0, H), (0, H * 0.90), (W * 0.4, H * 0.845), (W, H * 0.88), (W, H * 0.93),
               (W * 0.35, H * 0.90), (0, H * 0.955)], fill=(250, 220, 165, 255))
    draw_palm(img, W * 0.10, H * 1.0, H * 0.52, 60 * SS, (26, 14, 34), rng)
    draw_palm(img, W * 0.93, H * 1.0, H * 0.60, -80 * SS, (26, 14, 34), rng)
    draw_palm(img, W * 0.80, H * 0.97, H * 0.34, -30 * SS, (40, 22, 44), rng)
    return finish(img, rng)


def plate_neon_strip():
    rng = random.Random(202)
    W, H = 1200 * SS, 900 * SS
    img = vgrad(W, H, [(0, (8, 10, 38)), (0.5, (20, 22, 66)),
                       (0.78, (44, 26, 84)), (1, (10, 10, 24))]).convert("RGBA")
    skyline(img, int(H * 0.78), H * 0.30, H * 0.62, (10, 12, 30), rng)
    d = ImageDraw.Draw(img, "RGBA")
    d.rectangle([0, H * 0.78, W, H], fill=(14, 14, 26, 255))  # street
    for i in range(46):  # wet reflections
        x = rng.uniform(0, W)
        y = rng.uniform(H * 0.80, H * 0.99)
        col = rng.choice([(255, 80, 190), (70, 220, 255), (255, 190, 90)])
        d.line([x, y, x + rng.uniform(-3, 3), y + rng.uniform(8, 42)],
               fill=col + (rng.randint(40, 120),), width=3)
    # neon signs: glow pass then bright cores
    signs = [(W * 0.13, H * 0.30, (255, 64, 170)), (W * 0.40, H * 0.22, (64, 220, 255)),
             (W * 0.66, H * 0.34, (255, 170, 40)), (W * 0.86, H * 0.26, (150, 90, 255))]
    for sx, sy, col in signs:
        screen_paste(img, glow_sprite(int(300 * SS), col, 170), sx, sy)
    d = ImageDraw.Draw(img, "RGBA")
    for sx, sy, col in signs:
        wdt, hgt = rng.uniform(120, 190) * SS, rng.uniform(44, 64) * SS
        d.rounded_rectangle([sx - wdt / 2, sy - hgt / 2, sx + wdt / 2, sy + hgt / 2],
                            radius=10 * SS, outline=col + (255,), width=4)
        d.rounded_rectangle([sx - wdt / 2, sy - hgt / 2, sx + wdt / 2, sy + hgt / 2],
                            radius=10 * SS, outline=(255, 255, 255, 200), width=1)
        bx = sx - wdt * 0.32
        while bx < sx + wdt * 0.30:  # lettering bars
            bl = rng.uniform(14, 40) * SS
            d.line([bx, sy, bx + bl, sy], fill=(255, 255, 255, 235), width=5)
            bx += bl + rng.uniform(8, 16) * SS
    # car silhouette, low centre
    cx, cy, s = W * 0.52, H * 0.86, SS
    d.polygon([(cx - 190 * s, cy), (cx - 170 * s, cy - 34 * s), (cx - 80 * s, cy - 44 * s),
               (cx - 40 * s, cy - 78 * s), (cx + 70 * s, cy - 78 * s), (cx + 120 * s, cy - 42 * s),
               (cx + 185 * s, cy - 30 * s), (cx + 195 * s, cy)], fill=(6, 6, 12, 255))
    for wx in (cx - 120 * s, cx + 118 * s):
        d.ellipse([wx - 26 * s, cy - 26 * s, wx + 26 * s, cy + 26 * s], fill=(4, 4, 8, 255))
        d.ellipse([wx - 11 * s, cy - 11 * s, wx + 11 * s, cy + 11 * s], fill=(120, 130, 150, 255))
    d.line([cx - 188 * s, cy - 16 * s, cx - 160 * s, cy - 16 * s], fill=(255, 90, 90, 255), width=5)
    d.line([cx + 168 * s, cy - 14 * s, cx + 192 * s, cy - 14 * s], fill=(255, 240, 200, 255), width=5)
    return finish(img, rng)


def plate_marina_speedboat():
    rng = random.Random(303)
    W, H = 1200 * SS, 900 * SS
    img = vgrad(W, H, [(0, (70, 90, 160)), (0.4, (240, 160, 100)),
                       (0.62, (255, 196, 120)), (0.68, (250, 180, 110)),
                       (1, (26, 70, 120))]).convert("RGBA")
    sun(img, W * 0.72, H * 0.62, 44 * SS, (255, 240, 190), (255, 170, 90), rng)
    cloud_band(img, H * 0.14, W, (255, 200, 160), rng, 80, SS)
    cloud_band(img, H * 0.30, W, (250, 170, 140), rng, 70, SS)
    skyline(img, int(H * 0.665), H * 0.05, H * 0.16, (70, 60, 96), rng, windows=False)
    sea(img, int(H * 0.67), (30, 90, 140), (255, 205, 130), W * 0.72, rng, 1100)
    d = ImageDraw.Draw(img, "RGBA")
    bx, by, s = W * 0.38, H * 0.80, SS  # speedboat + wake
    for i in range(26):  # foam wake fan
        t = i / 25
        x0 = bx - 30 * s - t * 330 * s
        y0 = by + 16 * s + (t - 0.5) * 90 * s * t
        d.line([bx - 30 * s, by + 14 * s, x0, y0], fill=(255, 255, 255, int(120 * (1 - t))),
               width=max(1, int(5 * (1 - t))))
    d.polygon([(bx - 60 * s, by), (bx + 150 * s, by - 6 * s), (bx + 196 * s, by - 30 * s),
               (bx + 120 * s, by - 26 * s), (bx - 20 * s, by - 20 * s)], fill=(245, 245, 248, 255))
    d.polygon([(bx + 20 * s, by - 22 * s), (bx + 60 * s, by - 52 * s), (bx + 118 * s, by - 50 * s),
               (bx + 128 * s, by - 26 * s)], fill=(30, 90, 140, 255))
    d.rectangle([bx + 138 * s, by - 44 * s, bx + 148 * s, by - 24 * s], fill=(40, 40, 48, 255))
    d.line([bx - 60 * s, by, bx + 150 * s, by - 6 * s], fill=(230, 60, 90, 255), width=4)
    return finish(img, rng)


def plate_rooftop_pool():
    rng = random.Random(404)
    W, H = 1200 * SS, 900 * SS
    img = vgrad(W, H, [(0, (36, 30, 84)), (0.36, (128, 58, 120)),
                       (0.55, (232, 110, 96)), (0.62, (250, 170, 110)),
                       (1, (30, 26, 54))]).convert("RGBA")
    cloud_band(img, H * 0.18, W, (250, 150, 130), rng, 75, SS)
    skyline(img, int(H * 0.60), H * 0.10, H * 0.30, (24, 20, 44), rng)
    d = ImageDraw.Draw(img, "RGBA")
    d.rectangle([0, H * 0.60, W, H], fill=(38, 30, 46, 255))  # roof deck
    d.polygon([(W * 0.16, H * 0.70), (W * 0.86, H * 0.70), (W * 0.97, H * 0.94),
               (W * 0.05, H * 0.94)], fill=(64, 205, 215, 255))  # pool
    d.polygon([(W * 0.16, H * 0.70), (W * 0.86, H * 0.70), (W * 0.90, H * 0.76),
               (W * 0.12, H * 0.76)], fill=(150, 235, 240, 255))
    for _ in range(240):  # pool sparkle
        x = rng.uniform(W * 0.10, W * 0.93)
        y = rng.uniform(H * 0.72, H * 0.92)
        d.line([x, y, x + rng.uniform(6, 22), y], fill=(255, 255, 255, rng.randint(50, 150)), width=2)
    d.rectangle([0, H * 0.585, W, H * 0.60], fill=(16, 14, 28, 255))  # parapet
    for i in range(9):  # deck lanterns
        x = W * (0.06 + i * 0.11)
        screen_paste(img, glow_sprite(int(90 * SS), (255, 180, 90), 170), x, H * 0.635)
        d.ellipse([x - 4, H * 0.635 - 4, x + 4, H * 0.635 + 4], fill=(255, 230, 180, 255))
    draw_palm(img, W * 0.06, H * 0.72, H * 0.30, 26 * SS, (18, 14, 28), rng)
    draw_palm(img, W * 0.965, H * 0.74, H * 0.34, -30 * SS, (18, 14, 28), rng)
    return finish(img, rng)


def plate_desert_highway():
    rng = random.Random(505)
    W, H = 1200 * SS, 900 * SS
    img = vgrad(W, H, [(0, (86, 120, 190)), (0.42, (200, 170, 130)),
                       (0.60, (250, 205, 140)), (1, (196, 130, 84))]).convert("RGBA")
    sun(img, W * 0.30, H * 0.34, 58 * SS, (255, 244, 200), (255, 200, 110), rng)
    cloud_band(img, H * 0.12, W, (255, 230, 200), rng, 65, SS)
    d = ImageDraw.Draw(img, "RGBA")
    d.polygon([(0, H * 0.60), (W * 0.24, H * 0.52), (W * 0.46, H * 0.585), (W * 0.66, H * 0.53),
               (W, H * 0.60), (W, H * 0.64), (0, H * 0.64)], fill=(150, 96, 92, 255))  # mesas
    d.rectangle([0, H * 0.62, W, H], fill=(216, 156, 102, 255))  # sand
    d.polygon([(W * 0.465, H), (W * 0.535, H), (W * 0.508, H * 0.635), (W * 0.492, H * 0.635)],
              fill=(52, 50, 58, 255))  # road
    for i in range(9):  # centre dashes in perspective
        t = i / 9
        y0 = lerp(H * 0.65, H * 0.995, t ** 1.7)
        y1 = y0 + lerp(3, 44, t ** 1.7)
        d.line([W * 0.5, y0, W * 0.5, y1], fill=(255, 226, 150, 255), width=max(1, int(lerp(1, 9, t))))
    for sx, sy, sh in ((0.16, 0.80, 0.20), (0.85, 0.86, 0.26), (0.70, 0.72, 0.12)):  # cacti
        x, y, h = W * sx, H * sy, H * sh
        col = (44, 84, 52, 255)
        d.rounded_rectangle([x - 7 * SS, y - h, x + 7 * SS, y], radius=7 * SS, fill=col)
        d.rounded_rectangle([x - 26 * SS, y - h * 0.72, x - 14 * SS, y - h * 0.40], radius=6 * SS, fill=col)
        d.rectangle([x - 26 * SS, y - h * 0.72, x - 6 * SS, y - h * 0.64], fill=col)
        d.rounded_rectangle([x + 14 * SS, y - h * 0.82, x + 26 * SS, y - h * 0.48], radius=6 * SS, fill=col)
        d.rectangle([x + 6 * SS, y - h * 0.76, x + 26 * SS, y - h * 0.68], fill=col)
    for _ in range(500):  # sand texture
        x, y = rng.uniform(0, W), rng.uniform(H * 0.64, H)
        d.point((x, y), fill=(170, 110, 70, 120))
    return finish(img, rng)


def plate_boardwalk_dusk():
    rng = random.Random(606)
    W, H = 1200 * SS, 900 * SS
    img = vgrad(W, H, [(0, (44, 40, 100)), (0.4, (150, 70, 130)),
                       (0.60, (244, 130, 96)), (0.68, (255, 190, 120)),
                       (1, (30, 60, 110))]).convert("RGBA")
    sun(img, W * 0.80, H * 0.64, 40 * SS, (255, 238, 190), (255, 160, 90), rng)
    cloud_band(img, H * 0.20, W, (250, 160, 140), rng, 80, SS)
    sea(img, int(H * 0.68), (36, 84, 140), (255, 200, 130), W * 0.80, rng, 800)
    d = ImageDraw.Draw(img, "RGBA")
    # ferris wheel silhouette on the pier
    fx, fy, fr = W * 0.20, H * 0.46, H * 0.21
    d.ellipse([fx - fr, fy - fr, fx + fr, fy + fr], outline=(30, 22, 44, 255), width=6)
    d.ellipse([fx - fr * 0.72, fy - fr * 0.72, fx + fr * 0.72, fy + fr * 0.72],
              outline=(30, 22, 44, 255), width=3)
    for k in range(8):
        a = k * math.pi / 4
        gx, gy = fx + math.cos(a) * fr, fy + math.sin(a) * fr
        d.line([fx, fy, gx, gy], fill=(30, 22, 44, 255), width=3)
        screen_paste(img, glow_sprite(int(46 * SS), (255, 190, 110), 200), gx, gy)
        d.ellipse([gx - 5, gy - 5, gx + 5, gy + 5], fill=(255, 226, 170, 255))
    d.polygon([(fx - 8 * SS, fy), (fx + 8 * SS, fy), (fx + 26 * SS, H * 0.70), (fx - 26 * SS, H * 0.70)],
              fill=(30, 22, 44, 255))
    # boardwalk planks in perspective (left foreground)
    vx, vy = W * 0.46, H * 0.685
    d.polygon([(0, H), (W * 0.62, H), (vx + 30 * SS, vy), (vx - 130 * SS, vy)], fill=(120, 84, 60, 255))
    for i in range(11):
        t = i / 10
        x0 = lerp(-40, vx - 130 * SS, t)
        x1 = lerp(W * 0.66, vx + 30 * SS, t)
        y = lerp(H * 1.0, vy, t ** 1.6)
        d.line([x0, y, x1, y], fill=(84, 56, 40, 255), width=max(1, int(lerp(6, 1, t))))
    for i in range(6):  # railing posts + lamp glows
        t = i / 5
        x = lerp(W * 0.60, vx + 16 * SS, t)
        y = lerp(H * 0.97, vy + 4, t ** 1.4)
        d.line([x, y, x, y - lerp(64, 16, t) * SS], fill=(40, 30, 34, 255), width=max(2, int(lerp(6, 2, t))))
        screen_paste(img, glow_sprite(int(lerp(110, 44, t) * SS), (255, 200, 120), 180), x, y - lerp(70, 18, t) * SS)
    return finish(img, rng)


def plate_skyline_neon():
    rng = random.Random(707)
    W, H = 1200 * SS, 900 * SS
    img = vgrad(W, H, [(0, (6, 8, 34)), (0.55, (16, 18, 58)),
                       (0.8, (30, 22, 74)), (1, (8, 10, 26))]).convert("RGBA")
    d = ImageDraw.Draw(img, "RGBA")
    d.ellipse([W * 0.80, H * 0.08, W * 0.80 + 54 * SS, H * 0.08 + 54 * SS], fill=(232, 236, 255, 255))
    d.ellipse([W * 0.80 + 8 * SS, H * 0.08 + 6 * SS, W * 0.80 + 40 * SS, H * 0.08 + 38 * SS],
              fill=(200, 206, 235, 255))
    for _ in range(130):  # stars
        x, y = rng.uniform(0, W), rng.uniform(0, H * 0.5)
        d.point((x, y), fill=(255, 255, 255, rng.randint(60, 200)))
    skyline(img, int(H * 0.82), H * 0.34, H * 0.66, (8, 10, 24), rng)
    signs = [(W * 0.22, H * 0.30, (255, 64, 170)), (W * 0.55, H * 0.20, (64, 220, 255)),
             (W * 0.78, H * 0.38, (255, 170, 40))]
    for sx, sy, col in signs:
        screen_paste(img, glow_sprite(int(260 * SS), col, 160), sx, sy)
    d = ImageDraw.Draw(img, "RGBA")
    for sx, sy, col in signs:
        d.rounded_rectangle([sx - 52 * SS, sy - 20 * SS, sx + 52 * SS, sy + 20 * SS],
                            radius=8 * SS, outline=col + (255,), width=4)
        d.line([sx - 34 * SS, sy, sx + 34 * SS, sy], fill=(255, 255, 255, 230), width=4)
    d.rectangle([0, H * 0.82, W, H], fill=(10, 14, 34, 255))  # water
    for _ in range(420):  # reflected window shimmer
        x = rng.uniform(0, W)
        y = rng.uniform(H * 0.83, H * 0.99)
        col = rng.choice([(255, 214, 130), (120, 200, 255), (255, 120, 200)])
        d.line([x, y, x + rng.uniform(4, 18), y], fill=col + (rng.randint(30, 110),), width=2)
    return finish(img, rng)


def plate_palm_avenue():
    rng = random.Random(808)
    W, H = 1200 * SS, 900 * SS
    img = vgrad(W, H, [(0, (60, 34, 96)), (0.38, (180, 62, 112)),
                       (0.60, (250, 130, 80)), (0.70, (255, 196, 120)),
                       (1, (60, 34, 60))]).convert("RGBA")
    sun(img, W * 0.5, H * 0.68, 50 * SS, (255, 240, 195), (255, 150, 80), rng)
    cloud_band(img, H * 0.15, W, (250, 150, 130), rng, 85, SS)
    d = ImageDraw.Draw(img, "RGBA")
    d.rectangle([0, H * 0.70, W, H], fill=(70, 40, 62, 255))  # avenue ground
    d.polygon([(W * 0.44, H), (W * 0.56, H), (W * 0.515, H * 0.70), (W * 0.485, H * 0.70)],
              fill=(40, 32, 48, 255))
    for i, t in enumerate((0.0, 0.25, 0.5, 0.75, 1.0)):  # palm rows converging
        for side in (-1, 1):
            x = W * 0.5 + side * lerp(W * 0.055, W * 0.46, t)
            base_y = lerp(H * 0.71, H * 1.0, t)
            h = lerp(H * 0.10, H * 0.52, t)
            # shadow streak anchored at the trunk base, raking toward the viewer
            d.polygon([(x - 5 * SS * t, base_y), (x + 5 * SS * t, base_y),
                       (x - h * 0.85, base_y + h * 0.38), (x - h * 0.85 - 9 * SS * t, base_y + h * 0.38)],
                      fill=(30, 18, 36, 90))
            draw_palm(img, x, base_y, h, side * -30 * SS * t,
                      (24, 14, 32), rng, fronds=8)
    # car driving into the sunset
    cx, cy, s = W * 0.5, H * 0.735, SS * 0.55
    d = ImageDraw.Draw(img, "RGBA")
    d.polygon([(cx - 90 * s, cy), (cx - 80 * s, cy - 18 * s), (cx - 34 * s, cy - 24 * s),
               (cx - 18 * s, cy - 40 * s), (cx + 30 * s, cy - 40 * s), (cx + 52 * s, cy - 22 * s),
               (cx + 88 * s, cy - 14 * s), (cx + 92 * s, cy)], fill=(16, 10, 22, 255))
    d.line([cx - 84 * s, cy - 8 * s, cx - 66 * s, cy - 8 * s], fill=(255, 100, 90, 255), width=3)
    d.line([cx + 70 * s, cy - 8 * s, cx + 88 * s, cy - 8 * s], fill=(255, 100, 90, 255), width=3)
    return finish(img, rng)


def plate_island_aerial():
    rng = random.Random(909)
    W, H = 1200 * SS, 900 * SS
    img = vgrad(W, H, [(0, (16, 90, 130)), (0.5, (20, 140, 165)),
                       (1, (30, 110, 150))]).convert("RGBA")
    d = ImageDraw.Draw(img, "RGBA")
    for _ in range(700):  # water mottling
        x, y = rng.uniform(0, W), rng.uniform(0, H)
        r = rng.uniform(8, 42)
        col = rng.choice([(24, 160, 185), (14, 80, 120), (40, 180, 190)])
        d.ellipse([x - r, y - r * 0.4, x + r, y + r * 0.4], fill=col + (36,))
    # island: layered blobs, sand rim then green heart
    cx, cy = W * 0.52, H * 0.52
    blob = [(cx + math.cos(a) * (300 + 60 * math.sin(a * 3)) * SS,
             cy + math.sin(a) * (190 + 44 * math.cos(a * 2)) * SS)
            for a in [i * math.pi / 24 for i in range(48)]]
    d.polygon(blob, fill=(240, 214, 150, 255))
    inner = [(cx + math.cos(a) * (238 + 44 * math.sin(a * 3)) * SS,
              cy + math.sin(a) * (140 + 30 * math.cos(a * 2)) * SS)
             for a in [i * math.pi / 24 for i in range(48)]]
    d.polygon(inner, fill=(86, 156, 92, 255))
    for _ in range(26):  # palm dots with shadows
        x = cx + rng.uniform(-200, 200) * SS
        y = cy + rng.uniform(-105, 105) * SS
        d.ellipse([x + 8, y + 6, x + 26, y + 14], fill=(20, 70, 60, 110))
        for k in range(6):
            a = k * math.pi / 3 + rng.uniform(-0.3, 0.3)
            d.line([x, y, x + math.cos(a) * 15 * SS, y + math.sin(a) * 10 * SS],
                   fill=(30, 100, 54, 255), width=3)
    # boat + wake arc
    bx, by = W * 0.20, H * 0.24
    for i in range(20):
        t = i / 19
        d.arc([bx - 30 * SS - t * 190 * SS, by - 20 * SS - t * 60 * SS,
               bx + 30 * SS + t * 60 * SS, by + 26 * SS + t * 90 * SS],
              start=300, end=60, fill=(255, 255, 255, int(130 * (1 - t))), width=3)
    d.polygon([(bx - 22 * SS, by), (bx + 26 * SS, by - 6 * SS), (bx + 34 * SS, by - 14 * SS),
               (bx - 8 * SS, by - 12 * SS)], fill=(250, 250, 252, 255))
    d.polygon([(bx, by - 12 * SS), (bx + 10 * SS, by - 26 * SS), (bx + 22 * SS, by - 13 * SS)],
              fill=(36, 100, 150, 255))
    return finish(img, rng)


def plate_storm_neon():
    rng = random.Random(111)
    W, H = 1200 * SS, 900 * SS
    img = vgrad(W, H, [(0, (10, 26, 34)), (0.5, (16, 44, 54)),
                       (0.8, (24, 54, 62)), (1, (8, 16, 22))]).convert("RGBA")
    cloud_band(img, H * 0.10, W, (52, 84, 92), rng, 150, SS)
    cloud_band(img, H * 0.24, W, (40, 70, 80), rng, 130, SS)
    skyline(img, int(H * 0.84), H * 0.24, H * 0.5, (8, 16, 20), rng,
            windows=True, win_col=(170, 230, 235))
    for sx, sy, col in ((W * 0.30, H * 0.44, (255, 64, 170)), (W * 0.70, H * 0.36, (64, 220, 255))):
        screen_paste(img, glow_sprite(int(320 * SS), col, 190), sx, sy)
    d = ImageDraw.Draw(img, "RGBA")
    for sx, sy, col in ((W * 0.30, H * 0.44, (255, 64, 170)), (W * 0.70, H * 0.36, (64, 220, 255))):
        d.rounded_rectangle([sx - 58 * SS, sy - 22 * SS, sx + 58 * SS, sy + 22 * SS],
                            radius=9 * SS, outline=col + (255,), width=4)
        d.line([sx - 36 * SS, sy, sx + 36 * SS, sy], fill=(255, 255, 255, 235), width=4)
    d.rectangle([0, H * 0.84, W, H], fill=(8, 14, 18, 255))  # flooded street
    for _ in range(300):  # neon shimmer on wet ground
        x = rng.uniform(0, W)
        y = rng.uniform(H * 0.85, H * 0.99)
        col = rng.choice([(255, 64, 170), (64, 220, 255), (200, 235, 240)])
        d.line([x, y, x + rng.uniform(6, 26), y], fill=col + (rng.randint(30, 100),), width=2)
    for _ in range(650):  # rain streaks
        x, y = rng.uniform(-40, W), rng.uniform(0, H)
        ln = rng.uniform(16, 44)
        d.line([x, y, x - ln * 0.22, y + ln], fill=(210, 235, 245, rng.randint(28, 80)), width=1)
    draw_palm(img, W * 0.90, H * 0.92, H * 0.40, -130 * SS, (6, 12, 14), rng)  # wind-bent palm
    return finish(img, rng)


PLATES = [
    (plate_sunset_beach, "sunset-beach.jpg", (1200, 900)),
    (plate_neon_strip, "neon-strip.jpg", (1200, 900)),
    (plate_marina_speedboat, "marina-speedboat.jpg", (1200, 900)),
    (plate_rooftop_pool, "rooftop-pool.jpg", (1200, 900)),
    (plate_desert_highway, "desert-highway.jpg", (1200, 900)),
    (plate_boardwalk_dusk, "boardwalk-dusk.jpg", (1200, 900)),
    (plate_skyline_neon, "skyline-neon.jpg", (1200, 900)),
    (plate_palm_avenue, "palm-avenue.jpg", (1200, 900)),
    (plate_island_aerial, "island-aerial.jpg", (1200, 900)),
    (plate_storm_neon, "storm-neon.jpg", (1200, 900)),
]


def main() -> None:
    for fn, name, size in PLATES:
        save(fn(), name, size)


if __name__ == "__main__":
    main()
