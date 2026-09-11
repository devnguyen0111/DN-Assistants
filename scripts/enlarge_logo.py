from PIL import Image
from pathlib import Path

src = Path(r"e:\DN-Work\DN-Assistants\src-tauri\app-icon-source.png")
im = Image.open(src).convert("RGBA")

# Alpha channel bbox (ignore near-transparent fringe)
alpha = im.split()[3]
mask = alpha.point(lambda a: 255 if a > 20 else 0)
bbox = mask.getbbox()
print("alpha bbox", bbox, "canvas", im.size)

if not bbox:
    raise SystemExit("no opaque pixels")

cropped = im.crop(bbox)
cw, ch = cropped.size
print("cropped", cw, ch)

canvas = 1024
# Fill nearly entire canvas; keep ~2% margin for icon safe area
target = int(canvas * 0.98)
scale = min(target / cw, target / ch)
nw = max(1, int(cw * scale))
nh = max(1, int(ch * scale))
scaled = cropped.resize((nw, nh), Image.Resampling.LANCZOS)

final = Image.new("RGBA", (canvas, canvas), (0, 0, 0, 0))
ox = (canvas - nw) // 2
oy = (canvas - nh) // 2
final.paste(scaled, (ox, oy), scaled)

# Stats
opaque = 0
for a in final.split()[3].getdata():
    if a > 20:
        opaque += 1
print("opaque ratio", round(opaque / (canvas * canvas), 3), "size", nw, nh, "offset", ox, oy)
print("corners", final.getpixel((0, 0)), final.getpixel((1023, 1023)))
print("center", final.getpixel((512, 512)))

out_paths = [
    Path(r"e:\DN-Work\DN-Assistants\src-tauri\app-icon-source.png"),
    Path(r"e:\DN-Work\DN-Assistants\src\assets\logo.png"),
    Path(r"e:\DN-Work\DN-Assistants\src\assets\logo-transparent.png"),
]
for p in out_paths:
    final.save(p, "PNG")
    print("saved", p)
