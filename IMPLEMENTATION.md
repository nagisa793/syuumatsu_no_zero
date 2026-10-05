# 終末のゼロ — v9

- Voice instructions are parsed into independent technique, target, count, duration, delay, condition, and cancellation fields. They are not complete-utterance string matches. This is a deterministic game-domain interpreter, not an unrestricted language model. Unknown conditions ask for clarification rather than being discarded.
- `orders.js` owns instruction lifecycle: queued → transforming → ready → recover → complete. Default is one successful use. Counted/conditional repetition must be requested. Battery is deducted only on execution.
- `equipment.js` owns temporary weapon art and ongoing wing/shield effects separately. The free shot always uses Zero's original hand.
- `controller.js` checks altitude/range again after transformation, fires before repositioning, and leaves unsupported altitude requests pending with a reason. A wing request can unblock a queued air attack.
- `bugs.js` defines six insects and their committed attack tells. Non-flying insects cannot enter the air layer. Ownership and holes remain authoritative for movement.
- `intro.js` plays black → distortion/noise → music → DEBUG → TARGET. Music has an independent clock and fixed user-selected volume, unaffected by target selection or speech.
- `scripts/compose-battle.py` synthesizes an original 172 BPM score with five opening stabs and four stems. Master: ffmpeg loudnorm I=-14, TP=-1.5, LRA=4, 192k MP3.
- v9 sprites were generated with built-in ImageGen from the supplied Zero design and prior sprite sheets, then mechanically keyed/cropped by connected component. Brief: shorter mascot proportions, forward/right hair, original gold hands; four idle/shoot/transform/flight states; mantis scythes, beetle horn, moth wings. No borrowed game sprites or music.

Run `node tests/battle.cjs` for real fixed-step engine + canvas regression tests. These test recognized text and recognition-event delivery; they do not certify microphone quality on the user's device.

## Arena rendering

- Orthographic 76 × 38 panel spacing, no row shear. Character pixel sizes and all logical coordinates/rules are unchanged.

## Midboss encounter

- After skirmish victory, Next Enemy opens the 150 HP grenade-weevil encounter. Zero has 200 max HP. Remaining HP and battery carry into the boss and form its retry checkpoint. Boss victory offers a full skirmish restart or checkpoint boss retry. Boss art loads independently so base battle startup is never held by it.
- The boss occupies two adjacent X cells. Movement, ownership, holes, sword/bullet/gravity collisions all use this footprint; one attack cannot deal duplicate damage just because it overlaps both cells.
- HP < 75 causes a permanent flight phase, open-wing cels and poison on ground only. Poison costs 1 HP every 1/3 second of active simulation, ignores armor, and freezes in TARGET, pause, intro and results. The boss is immune.
- Committed forward-row explosion: 30 damage, 1.15-second telegraph, every column strictly left of the boss footprint on its own row and altitude. Suction: 0.8-second tell, 2.4-second pull on all rows and both layers toward the rightmost usable Zero panel on the current row. Facing the boss at that edge initiates a 3-second snout bind with three 10 HP / hurt-SE pulses. An eight-cel whole-scene atlas replaces both characters during binding. There are no stitched character / snout draws. Commands cannot bypass the bind; TARGET/pause freeze its clock. Blast stays at the boss altitude; suction can target ground or air.
- Direct hits interrupt charge/transformation and impose a 0.5-second stagger with recoil cels, body lean and legal backward movement. Poison does not stagger; Wing remains an escape.
- Ground-only repeated orders clear on boss takeoff. New encounter and retry clear previous attacks, poison, voice fragments, orders and equipment.

## v33 battle corrections

- All bug locomotion samples uniformly among legal neighbouring panels; native RNG is never reset on retry. Boss can use all three rows and both legal X positions. Attack selection is random.
- Below 75 HP, boss travel and movement wait clocks accelerate by exactly 1.25. Poison, bind damage cadence and attack warnings retain their real-time durations.
- Area 001–003 resolve the leftmost enemy-owned column before occupancy filtering and steal up to their count there only. Partial ownership/occupancy cannot redirect the operation to a rear column.
- Nine integrated full-body gun cels replace the forearm and remove the floating weapon overlay. Deleted obsolete busters and bound-Zero-only atlases.
- Result transition preserves the final pose, appearance, equipment and transformation until the next battle reset.

## v34 tactics and readability

- Auto techniques use contextual eligibility and weighted family variety rather than maximum damage/cost. Wing has priority for poison, holes and airborne targets. Safe landing supports ground attacks; legal front-column Area, shield and reachable swords join guns/gravity. Manual commands still exit auto mode.
- Boss locomotion clocks: normal 1.25, phase 2 1.4375 (1.15 times normal). Cross-layer explosion snapshots every Zero-owned cell on the player altitude; same-layer remains forward row.
- Removed location/link labels, altitude badges, enemy HP bars and boss header. Large outlined enemy HP numerals; command receipt is rendered top-left before actors.
- Air top positions account for sprite height with constant 38px row spacing.
- Generated local gotcha voice cue using installed Flite kal16; Web Audio shares the SFX volume and does not alter music gain or microphone lifecycle.
