"""Package the edited pixel art as separate title-screen layers.

This script only sizes and encodes finished imagegen artwork. It does not
trace the manga or manufacture pixel shading from its grayscale values.
"""
import argparse
import shutil
from pathlib import Path
from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser(description=__doc__)
for name in ('characters', 'circuit', 'logo'):
    parser.add_argument('--' + name, type=Path, required=True)
args = parser.parse_args()
source_dir = ROOT / 'scripts/art-source'
asset_dir = ROOT / 'dist/assets/home'
source_dir.mkdir(exist_ok=True)
asset_dir.mkdir(exist_ok=True)

for name in ('characters', 'circuit', 'logo'):
    supplied = getattr(args, name)
    label = 'akari' if name == 'characters' else name
    original = source_dir / f'title-{label}-v81.png'
    if supplied.resolve() != original.resolve():
        shutil.copyfile(supplied, original)
    image = Image.open(original).convert('RGB' if name == 'circuit' else 'RGBA')
    if name == 'logo':
        # Ignore nearly transparent outer pixels when finding the logo bounds.
        bounds = image.getchannel('A').point(lambda a: 255 if a > 24 else 0).getbbox()
        if not bounds:
            raise ValueError('Empty logo alpha')
        image = ImageOps.expand(image.crop(bounds), border=12, fill=(0, 0, 0, 0))
        image = ImageOps.contain(image, (960, 440), Image.Resampling.NEAREST)
    else:
        image = image.resize((960, 540), Image.Resampling.NEAREST)
    output = asset_dir / f'title-{label}-v81.webp'
    if name == 'circuit':
        image.save(output, quality=96, method=6)
    else:
        image.save(output, lossless=True, method=6)
    print(f'{output.relative_to(ROOT)}: {image.size}, {output.stat().st_size:,} bytes')
