"""Size/encode the finished transparent phone sprite, without repainting it."""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
source = ROOT / 'scripts/art-source/title-iphone-v83.png'
image = Image.open(source).convert('RGBA')
# Transparent export margins are not part of the device's screen aspect ratio.
bounds = image.getchannel('A').point(lambda a: 255 if a > 24 else 0).getbbox()
assert bounds, 'Empty phone alpha'
image = image.crop(bounds)
image.thumbnail((256, 512), Image.Resampling.NEAREST)
dest = ROOT / 'dist/assets/home/title-iphone-v83.webp'
image.save(dest, lossless=True, method=6)
print(f'{dest.relative_to(ROOT)}: {image.size}, {dest.stat().st_size:,} bytes')
