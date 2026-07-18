from PIL import Image, ImageDraw
import math

SIZE = 1024
img = Image.new("RGB", (SIZE, SIZE), (8, 8, 8))
draw = ImageDraw.Draw(img)

cx, cy, r = 512, 480, 210

# Ghost body — top semicircle + smooth bottom scallops
points = []
for angle in range(180, 361):
    rad = math.radians(angle)
    x = cx + r * math.cos(rad)
    y = cy + r * math.sin(rad)
    points.append((x, y))

# Right side down to scallop level
points.append((cx + r, cy + 210))

# Smooth scallops using sine wave approximation
scallop_y_base = cy + 210
scallop_depth = 55
scallop_count = 3
left_x = cx - r
right_x = cx + r
width = right_x - left_x
steps = 120
for i in range(steps + 1):
    t = i / steps
    x = right_x - t * width
    y = scallop_y_base + scallop_depth * math.sin(t * scallop_count * math.pi)
    points.append((x, y))

draw.polygon(points, fill=(255, 255, 255))

# Eyes
eye_y = cy - 30
eye_r = 52
draw.ellipse([cx - 120 - eye_r, eye_y - eye_r, cx - 120 + eye_r, eye_y + eye_r], fill=(8, 8, 8))
draw.ellipse([cx + 68 - eye_r, eye_y - eye_r, cx + 68 + eye_r, eye_y + eye_r], fill=(8, 8, 8))
# Eye shine
draw.ellipse([cx - 118, eye_y - 28, cx - 98, eye_y - 8], fill=(255, 255, 255))
draw.ellipse([cx + 70, eye_y - 28, cx + 90, eye_y - 8], fill=(255, 255, 255))

# EKG line
ekg_y = cy + 82
ekg = [
    (20, ekg_y), (295, ekg_y), (318, ekg_y - 22), (340, ekg_y),
    (372, ekg_y), (392, ekg_y + 20), (424, ekg_y - 330),
    (454, ekg_y + 40), (478, ekg_y - 18), (508, ekg_y),
    (530, ekg_y), (548, ekg_y - 66), (568, ekg_y), (1004, ekg_y)
]
draw.line(ekg, fill=(91, 33, 182), width=30)
draw.line(ekg, fill=(168, 85, 247), width=15)
draw.line(ekg, fill=(243, 232, 255), width=5)

img.save("resources/icon-square.png", "PNG")
print("Saved: resources/icon-square.png")
