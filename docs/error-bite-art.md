# ERROR bite art revision

Four complete RGBA sprites replace the cropped face, masked torso and painted tube neck.

- error-bite-open-v3.png — ground, mouth open
- error-bite-close-v3.png — ground, jaws closed
- error-bite-air-open-v3.png — flight, mouth open
- error-bite-air-close-v3.png — flight, jaws closed

Created with built-in image generation using the existing ERROR sprite as the character reference. Final prompt brief: one complete left-facing ERROR with a horizontally extended richly shaded blue-black chitin neck; preserve the ant abdomen, dangling human arms, brown-haired face and insect legs; open jaw and closed jaw variants; flight variants include four translucent blue-violet insect wings; genuine transparent background with no other creatures, effects, text or detached fragments.

Asset preparation retains the principal alpha silhouette and a transparent gutter. Runtime rendering deforms the continuous original texture through the neck only. Head, legs, abdomen and wings remain part of the complete sprite. Original atlas reads use exclusive integer cell boundaries to avoid neighboring-frame bleed. Summon no longer uses the old atlas containing incidental small faces.

Validation: battle regression suite; 12 rendered samples of windup, extension, bite and withdrawal across ground/flight; poison timing and bite damage timing remain unchanged.
