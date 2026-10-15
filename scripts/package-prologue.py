"""Package generated cinematic cels and the approved insect animation sheets.

Only resize and encode finished artwork; preserve the original generated images.
"""
from pathlib import Path
import shutil
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'scripts/art-source'
OUT = ROOT / 'dist/assets/prologue'
OUT.mkdir(parents=True, exist_ok=True)
generated = ROOT.parent / 'generated_images'
assets = {
    'city': ('exec-f0889c62-7d00-4d12-be01-362034c81124.png', (960, 540)),
    'akari': ('exec-b75eacf2-625d-4f3a-9dd2-7279e5949814.png', (960, 540)),
}
for key, (name, size) in assets.items():
    version = 'v86'
    original = SOURCE / f'prologue-{key}-{version}.png'
    if (generated / name).exists():
        shutil.copyfile(generated / name, original)
    image = Image.open(original)
    image = image.resize(size, Image.Resampling.NEAREST)
    image.save(OUT / f'{key}-v86.webp', lossless=True, method=6)
for name,source,size in [('zero-original','zero-sword-long-v4',(768,512)),
                         ('wing-original','wings-3-v1',(1024,352))]:
    image=Image.open(ROOT/f'dist/assets/animation/{source}.png')
    image.resize(size,Image.Resampling.NEAREST).save(OUT/f'{name}-v87.png',optimize=True)
for name, source in [('wasp','bug-wasp-v2'), ('dragonfly','bug-dragonfly-v2'),
                     ('spider','bug-spider-v3'), ('centipede','bug-centipede-v3')]:
    image = Image.open(ROOT / f'dist/assets/animation/{source}.png')
    image.resize((768,512), Image.Resampling.NEAREST).save(
        OUT / f'{name}-v86.webp', lossless=True, method=6)
for path in sorted(OUT.glob('*.webp')):
    print(path.relative_to(ROOT), path.stat().st_size)
