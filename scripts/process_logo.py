from PIL import Image
import math
from pathlib import Path

src = Path(r"e:\DN-Work\DN-Assistants\src-tauri\app-icon-source.png")
im = Image.open(src).convert("RGBA")
w, h = im.size
px = im.load()

samples = [
    im.getpixel(p)
    for p in [(2, 2), (w - 3, 2), (2, h - 3), (w - 3, h - 3), (w // 2, 2), (2, h // 2)]
]
br = sum(s[0] for s in samples) / len(samples)
bg = sum(s[1] for s in samples) / len(samples)
bb = sum(s[2] for s in samples) / len(samples)
print("bg", br, bg, bb)

hard = 28
soft = 55

out = Image.new("RGBA", (w, h), (0, 0, 0, 0))
opx = out.load()
minx, miny, maxx, maxy = w, h, 0, 0

for y in range(h):
    for x in range(w):
        r, g, b, _a = px[x, y]
        dist = math.sqrt((r - br) ** 2 + (g - bg) ** 2 + (b - bb) ** 2)
        if dist <= hard:
            alpha = 0
        elif dist >= soft:
            alpha = 255
        else:
            t = (dist - hard) / (soft - hard)
            alpha = int(255 * t)
        if alpha > 0:
            opx[x, y] = (r, g, b, alpha)
            if alpha > 40:
                if x < minx:
                    minx = x
                if y < miny:
                    miny = y
                if x > maxx:
                    maxx = x
                if y > maxy:
                    maxy = y
        else:
            opx[x, y] = (0, 0, 0, 0)

print("bbox", minx, miny, maxx, maxy)
pad = 8
minx = max(0, minx - pad)
miny = max(0, miny - pad)
maxx = min(w - 1, maxx + pad)
maxy = min(h - 1, maxy + pad)
cropped = out.crop((minx, miny, maxx + 1, maxy + 1))
cw, ch = cropped.size
print("cropped", cw, ch)

canvas = 1024
target = int(canvas * 0.96)
scale = min(target / cw, target / ch)
nw, nh = max(1, int(cw * scale)), max(1, int(ch * scale))
scaled = cropped.resize((nw, nh), Image.Resampling.LANCZOS)
print("scaled", nw, nh)

final = Image.new("RGBA", (canvas, canvas), (0, 0, 0, 0))
ox = (canvas - nw) // 2
oy = (canvas - nh) // 2
final.paste(scaled, (ox, oy), scaled)

for xy in [(0, 0), (10, 10), (1023, 1023), (ox + nw // 2, oy + nh // 2)]:
    print("pixel", xy, final.getpixel(xy))

out_paths = [
    Path(r"e:\DN-Work\DN-Assistants\src-tauri\app-icon-source.png"),
    Path(r"e:\DN-Work\DN-Assistants\src\assets\logo.png"),
    Path(r"e:\DN-Work\DN-Assistants\src\assets\logo-transparent.png"),
]
for p in out_paths:
    final.save(p, "PNG")
    print("saved", p, p.stat().st_size)
