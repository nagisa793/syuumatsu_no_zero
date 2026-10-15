# ERROR neck sweep

Production asset: `dist/assets/animation/error-neck-sweep-v1.png` (6 × 6 cels, 440 × 300 pixels per cel).

Twelve complete painted poses: four anticipation/extension poses, six physical strike poses covering two forward air columns across all three rows, and two withdrawal poses. Three fully rendered row variants keep the torso in its actual panel while the head reaches the same six attack panels. Runtime uses one cropped image draw per frame; it does not build an attacker from a static body, detached face, tube neck, or slash effects.

The original fixed flying sprite / generic slash overlay has been removed from this attack. Each of the six panel contacts now deals the existing 30 damage only when that panel's physical head-sweep frame passes it; a single attack hits Zero at most once. Ground targets and panels outside the two forward columns remain unaffected.

## Art creation

Built-in image generation, using the existing ERROR flight and complete extended-neck artwork as identity references. Final strike prompt: six complete horror pixel-art ERROR cels, two columns by three rows in a landscape sheet; glossy segmented blue-black neck physically connects the brown-haired human/insect face to the same right-side ant torso; four violet-blue wings, dangling pale human arms and insect legs preserved; head sweeps upper-left, upper-right, middle-left, middle-right, lower-left, lower-right; true RGBA transparency, no detached fragments, grid, text, shadow, guide shapes or energy slash. An exact head/torso placement guide was supplied so the six painted poses already have the required long neck and attack direction.

Source artwork is in `scripts/art-source/`. Only anticipation poses 0–3 and withdrawal poses 10–11 are selected from the windup source. All six active strike poses use the revised complete long-neck source, not the rejected neighboring-cel / wing-distortion versions. `node scripts/build-error-swing.cjs` registers and packs the whole painted poses for the three body rows. The temporary geometry and component-mask experiments are absent from the game runtime and production assets.

## Validation

All 36 finished cels are distinct. The battle regression suite tests all six strike panels at all three boss rows and all three legal flight columns, delayed contact in the proper pose, no repeated damage, ground / out-of-range misses, and one image draw for the finished sprite. All 36 states were rendered and visually inspected; clipping / cell bleed and neck gaps were checked. `error-swing-preview.gif` shows the finished in-game motion. Browser/device QA was unavailable in this environment; native canvas rendering and game simulation were used.
