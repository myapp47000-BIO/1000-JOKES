"""Generate PNG icons for the jokes PWA."""
from PIL import Image, ImageDraw
import os

OUT = os.path.join(os.path.dirname(__file__), "icons")


def make_icon(size):
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    s = size / 512.0

    def sc(v):
        return int(v * s)

    # rounded gradient background
    grad = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    gd = ImageDraw.Draw(grad)
    c1 = (251, 191, 36, 255)   # amber
    c2 = (234, 88, 12, 255)    # orange-600
    for y in range(size):
        f = y / max(size - 1, 1)
        col = tuple(int(c1[i] + (c2[i] - c1[i]) * f) for i in range(3)) + (255,)
        gd.line([(0, y), (size, y)], fill=col)
    mask = Image.new("L", (size, size), 0)
    md = ImageDraw.Draw(mask)
    md.rounded_rectangle([0, 0, size - 1, size - 1], radius=sc(112), fill=255)
    img.paste(grad, (0, 0), mask)

    d = ImageDraw.Draw(img)
    # white face circle
    cx, cy, r = sc(256), sc(250), sc(170)
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(255, 255, 255, 255))
    # open mouth
    mx, my, mr = sc(256), sc(250), sc(116)
    d.chord([mx - mr, my - mr, mx + mr, my + mr], start=0, end=180, fill=(31, 36, 48, 255))
    tr = sc(86)
    d.chord([mx - tr, my - tr, mx + tr, my + tr], start=0, end=180, fill=(239, 68, 68, 255))
    # eyes
    for ex in (196, 316):
        d.ellipse([sc(ex) - sc(20), sc(200) - sc(28), sc(ex) + sc(20), sc(200) + sc(28)], fill=(31, 36, 48, 255))
    # tears
    d.line([(sc(120), sc(210)), (sc(74), sc(152))], fill=(125, 211, 252, 255), width=sc(18))
    d.line([(sc(392), sc(210)), (sc(438), sc(152))], fill=(125, 211, 252, 255), width=sc(18))
    return img


for sz in (192, 512):
    make_icon(sz).save(os.path.join(OUT, f"icon-{sz}.png"))
    print(f"icon-{sz}.png OK")
