from PIL import Image, ImageDraw, ImageFont
import math

W, H = 1024, 500
img = Image.new("RGB", (W, H), (8, 8, 8))
draw = ImageDraw.Draw(img)

# Purple radial glow in center-right
for radius in range(300, 0, -1):
    alpha = int(60 * (1 - radius / 300))
    color = (109, 40, 217, alpha)
    cx, cy = 720, 250
    draw.ellipse([cx - radius, cy - radius, cx + radius, cy + radius],
                 fill=(max(8, 8 + int(40 * (1 - radius/300))),
                       max(8, 8 + int(15 * (1 - radius/300))),
                       max(8, 8 + int(60 * (1 - radius/300)))))

# Reset background outside glow
for y in range(H):
    for x in range(W):
        px = img.getpixel((x, y))
        dist = math.sqrt((x - 720)**2 + (y - 250)**2)
        if dist > 300:
            img.putpixel((x, y), (8, 8, 8))

# Ghost body on right side
gcx, gcy, gr = 750, 260, 160
ghost_pts = []
for angle in range(180, 361):
    rad = math.radians(angle)
    ghost_pts.append((gcx + gr * math.cos(rad), gcy + gr * math.sin(rad)))
ghost_pts.append((gcx + gr, gcy + 160))
steps = 90
for i in range(steps + 1):
    t = i / steps
    x = (gcx + gr) - t * (2 * gr)
    y = (gcy + 160) + 42 * math.sin(t * 3 * math.pi)
    ghost_pts.append((x, y))
draw.polygon(ghost_pts, fill=(255, 255, 255))

# Ghost eyes
draw.ellipse([gcx - 90, gcy - 52, gcx - 90 + 42, gcy - 52 + 42], fill=(8, 8, 8))
draw.ellipse([gcx + 48, gcy - 52, gcx + 48 + 42, gcy - 52 + 42], fill=(8, 8, 8))
draw.ellipse([gcx - 82, gcy - 44, gcx - 82 + 14, gcy - 44 + 14], fill=(255, 255, 255))
draw.ellipse([gcx + 56, gcy - 44, gcx + 56 + 14, gcy - 44 + 14], fill=(255, 255, 255))

# EKG line across full width
ekg_y = 265
ekg = [
    (0, ekg_y), (200, ekg_y), (220, ekg_y - 18), (238, ekg_y),
    (260, ekg_y), (272, ekg_y + 16), (292, ekg_y - 200),
    (310, ekg_y + 26), (326, ekg_y - 12), (344, ekg_y),
    (362, ekg_y), (374, ekg_y - 44), (388, ekg_y), (1024, ekg_y)
]
draw.line(ekg, fill=(91, 33, 182), width=22)
draw.line(ekg, fill=(168, 85, 247), width=11)
draw.line(ekg, fill=(243, 232, 255), width=4)

# Text "FELCIN" on left
try:
    font_big = ImageFont.truetype("C:/Windows/Fonts/ariblk.ttf", 110)
    font_small = ImageFont.truetype("C:/Windows/Fonts/arial.ttf", 32)
except:
    font_big = ImageFont.load_default()
    font_small = ImageFont.load_default()

draw.text((60, 130), "FELCIN", fill=(242, 242, 242), font=font_big)
draw.text((64, 255), "Train. Connect. Grow.", fill=(167, 139, 250), font=font_small)

img.save("resources/feature-graphic.png", "PNG")
print("Saved: resources/feature-graphic.png  (1024x500)")
