"""Reframe the supplied manga without generating or redrawing either character.

The final image has 240 x 135 actual pixels, the same horizontal resolution
as a GBA screen. All linework comes from the unmodified source JPEG.
"""
import argparse
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'scripts/art-source/home-manga-original.jpg'
OUT = ROOT / 'dist/assets/home/manga-home-v80.png'

source = Image.open(SOURCE).convert('RGB')
gray = source.convert('L')
boundary = gray.point(lambda v: 0 if v < 160 else 255).filter(ImageFilter.MinFilter(3))

# Flood only exterior paper. Enclosed white parts of the original drawing
# remain intact; the printed outlines, facial features and posture are retained.
exterior = boundary.copy()
for point in [(0, 0), (1417, 0), (0, 2047), (1417, 2047),
              (1417, 600), (1417, 1500), (700, 2047)]:
    if exterior.getpixel(point) == 255:
        ImageDraw.floodfill(exterior, point, 128)
alpha = np.where(np.array(exterior) == 128, 0, 255).astype('uint8')

# Flat ink/paper colors are applied underneath the source luminance. This is
# coloring the supplied art, never a replacement illustration.
paper = Image.new('RGB', source.size, '#d7e3dc')
paint = ImageDraw.Draw(paper)
paint.polygon([(240, 590), (425, 680), (390, 880), (315, 1010),
               (260, 1160), (190, 1300), (350, 1200), (475, 955),
               (600, 825), (700, 730), (555, 825), (390, 900)], fill='#a65463')
paint.polygon([(540, 1425), (650, 1400), (705, 1660), (632, 1890),
               (490, 1810), (465, 1550)], fill='#a5b8c6')

def fill_original_region(seed, color):
    region = boundary.copy()
    ImageDraw.floodfill(region, seed, 128)
    mask = region.point(lambda v: 255 if v == 128 else 0)
    paper.paste(color, mask=mask)

fill_original_region((470, 340), '#f1d5ba')
fill_original_region((510, 700), '#e4bea5')
fill_original_region((1170, 1200), '#c6d3df')
fill_original_region((1160, 1350), '#edd0b3')
paint = ImageDraw.Draw(paper)
paint.polygon([(1018, 1270), (1306, 1290), (1284, 1347),
               (1191, 1354), (1140, 1335), (1040, 1334)], fill='#d8b951')

luma = np.array(gray, dtype='float32') / 255
ink = np.array([13, 20, 32], dtype='float32')
colors = np.array(paper, dtype='float32')
# Retain halftone values from the original rather than inventing new shading.
rgb = ink + (colors - ink) * luma[..., None]
colored = Image.fromarray(np.dstack((rgb.astype('uint8'), alpha)), 'RGBA')

# Cut out the already drawn terminal as its own layer so Zero can stay visible
# in a wide battle viewport while Akari remains the main figure.
terminal = Image.new('L', source.size)
ImageDraw.Draw(terminal).polygon([(1052, 838), (1417, 960), (1417, 1530),
                                  (1252, 1997), (719, 1816)], fill=255)
terminal_mask = np.minimum(alpha, np.array(terminal))
akari_mask = np.where(np.array(terminal), 0, alpha).astype('uint8')
akari = colored.copy(); akari.putalpha(Image.fromarray(akari_mask))
zero = colored.copy(); zero.putalpha(Image.fromarray(terminal_mask))

composition = Image.new('RGBA', (960, 540))
# Coordinates below are on the 480 x 270 game canvas; working at 2x avoids
# a second crop/scale before the single final downsampling step.
def place(image, box, scale, xy):
    crop = image.crop(box)
    size = (round(crop.width * scale * 2), round(crop.height * scale * 2))
    composition.alpha_composite(crop.resize(size, Image.Resampling.LANCZOS),
                                (round(xy[0] * 2), round(xy[1] * 2)))

place(akari, (0, 80, 1418, 1850), .265, (-38, -8))
place(zero, (710, 830, 1418, 2005), .19, (326, 77))

pixels = composition.resize((240, 135), Image.Resampling.BOX)
rgba = np.array(pixels)
# Crisp, discrete pixels and a restrained 5-bit-per-channel handheld palette.
rgba[..., :3] = ((rgba[..., :3].astype('uint16') * 31 + 127) // 255 * 255 // 31).astype('uint8')
rgba[..., 3] = np.where(rgba[..., 3] >= 120, 255, 0)
pixels = Image.fromarray(rgba, 'RGBA')
OUT.parent.mkdir(parents=True, exist_ok=True)
pixels.save(OUT, optimize=True)
print(f'{OUT.relative_to(ROOT)}: {pixels.size}, {OUT.stat().st_size:,} bytes')

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--preview', type=Path, help='Optional large nearest-neighbor preview PNG')
args = parser.parse_args()
if args.preview:
    preview = Image.new('RGBA', pixels.size, '#071522')
    preview.alpha_composite(pixels)
    preview.resize((960, 540), Image.Resampling.NEAREST).save(args.preview)
