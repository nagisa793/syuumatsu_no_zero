"""Compose the bright battle section, preserving the existing dark opening.

Run: python scripts/compose-clear-battle.py
Requires numpy, scipy and ffmpeg. All instruments are synthesized here.
"""

from pathlib import Path
import subprocess
import numpy as np
from scipy.signal import butter, sosfilt

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "dist/assets/music/zero-debug-battle-v14.mp3"
OUTPUT = ROOT / "dist/assets/music/zero-debug-battle-v17.mp3"
SR = 44100
BPM = 172
BEAT = 60 / BPM
DROP = 30 * BEAT  # 10.465 seconds: the clear chord announces the battle.
rng = np.random.default_rng(945)

decode = subprocess.run(
    ["ffmpeg", "-v", "error", "-i", str(SOURCE), "-f", "f32le", "-ac", "2", "-ar", str(SR), "pipe:1"],
    capture_output=True, check=True,
)
opening = np.frombuffer(decode.stdout, dtype="<f4").reshape(-1, 2).copy()
# The 10-second dark intro plays once per two-minute musical cycle.
# Eighty four-beat bars give the bright section room to develop.
N = round((DROP + 80 * 4 * BEAT) * SR)
opening = np.pad(opening[:min(len(opening), N)], ((0, max(0, N - len(opening))), (0, 0)))
stems = {name: np.zeros((N, 2), dtype=np.float32) for name in ("chord", "melody", "bass", "drums", "sweep")}


def hz(note):
    return 440 * 2 ** ((note - 69) / 12)


def envelope(n, attack=.009, release=.09):
    a = np.minimum(1, np.arange(n) / max(1, round(attack * SR)))
    r = np.minimum(1, np.arange(n)[::-1] / max(1, round(release * SR)))
    return (a * r).astype(np.float32)


def add(stem, t, signal, gain=1, pan=0):
    start = int(t * SR)
    if start < 0 or start >= N:
        return
    samples = np.asarray(signal, dtype=np.float32)
    if samples.ndim == 1:
        samples = samples[:, None] * np.array(
            [np.sqrt((1 - pan) / 2), np.sqrt((1 + pan) / 2)], dtype=np.float32
        )
    length = min(len(samples), N - start)
    stems[stem][start : start + length] += gain * samples[:length]


def lowpass(samples, cutoff):
    return sosfilt(butter(2, cutoff, fs=SR, output="sos"), samples).astype(np.float32)


def glass(note, length, lead=False):
    """FM attack, steady pure upper harmonics and gently detuned stereo sustain."""
    n = max(2, round(length * SR))
    t = np.arange(n, dtype=np.float64) / SR
    f = hz(note)
    result = []
    for side in (-1, 1):
        phase = 2 * np.pi * f * t * (1 + side * .0026)
        fm = np.sin(phase + (1.25 if lead else 1.65) * np.exp(-t * 3) * np.sin(phase * 2.013))
        body = .55 * np.sin(phase) + .30 * np.sin(phase * 2) + .18 * np.sin(phase * 3)
        air = .21 * np.sin(phase * 4.02) * np.exp(-t * 3.4)
        sound = .68 * body + .32 * fm + air
        result.append(lowpass(sound, 7600))
    out = np.column_stack(result)
    out *= envelope(n, .008 if lead else .003, .10 if lead else .36)[:, None]
    # The long release reads as a clear electronic chord, rather than a short key press.
    if not lead:
        out *= (.63 + .37 * np.exp(-t * .72))[:, None]
    return out


def shimmer(note, length):
    n = max(2, round(length * SR))
    t = np.arange(n) / SR
    f = hz(note)
    x = np.sin(2 * np.pi * f * t + 2.1 * np.exp(-t * 7) * np.sin(2 * np.pi * 2.37 * f * t))
    x += .37 * np.sin(2 * np.pi * 3.97 * f * t) * np.exp(-t * 5)
    return lowpass(x, 10000) * envelope(n, .001, min(.23, length * .37)) * np.exp(-t * 2.0)


def sub_bass(note, length):
    n = max(2, round(length * SR))
    t = np.arange(n) / SR
    f = hz(note)
    wave = np.sin(2 * np.pi * f * t) * .8 + np.sin(4 * np.pi * f * t) * .23
    wave += np.sin(6 * np.pi * f * t) * .09
    return np.tanh(wave * 1.3) * envelope(n, .002, .065)


def kick():
    n = round(.30 * SR)
    t = np.arange(n) / SR
    f = 48 + 125 * np.exp(-t * 35)
    wave = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 14)
    noise = rng.standard_normal(n) * np.exp(-t * 160) * .18
    return (wave + noise) * envelope(n, .001, .025)


def snare(soft=False):
    n = round(.24 * SR)
    t = np.arange(n) / SR
    noise = rng.standard_normal(n)
    noise = sosfilt(butter(2, [720, 8000], fs=SR, btype="bandpass", output="sos"), noise)
    clap = .53 * np.exp(-t * 20) + .23 * np.exp(-np.maximum(0, t - .017) * 35) * (t >= .017)
    body = np.sin(2 * np.pi * 190 * t) * np.exp(-t * 28) * .35
    return (noise * clap + body) * envelope(n, .001, .025) * (.53 if soft else 1)


def hat(opened=False):
    n = round((.18 if opened else .068) * SR)
    t = np.arange(n) / SR
    noise = rng.standard_normal(n)
    noise = sosfilt(butter(2, 6600, fs=SR, btype="highpass", output="sos"), noise)
    return noise * np.exp(-t * (24 if opened else 73)) * envelope(n, .0008, .012)


def noise_rise(length):
    n = round(length * SR)
    t = np.arange(n) / SR
    noise = rng.standard_normal(n)
    noise = sosfilt(butter(2, [2200, 9000], fs=SR, btype="bandpass", output="sos"), noise)
    return (noise * (t / length) ** 2 * envelope(n, .03, .013)).astype(np.float32)


def bright_crash():
    n = round(1.15 * SR)
    t = np.arange(n) / SR
    noise = rng.standard_normal(n)
    noise = sosfilt(butter(2, [3600, 11200], fs=SR, btype="bandpass", output="sos"), noise)
    return (noise * np.exp(-t * 3.5) * envelope(n, .004, .21)).astype(np.float32)


# A restrained fill ends the existing muted passage. The old accompaniment will
# stop completely at DROP; the bright section is composed as its own arrangement.
add("sweep", DROP - .48, noise_rise(.48), .14)
for i in range(5):
    add("drums", DROP - (5 - i) * BEAT / 4, snare(True), .12 + i * .055, -.3 if i % 2 else .3)

bright_chords = [
    (74, 77, 81, 88),  # D minor add 9
    (70, 74, 77, 84),  # B flat major add 9
    (77, 81, 84, 91),  # F major add 9
    (72, 76, 79, 86),  # C major add 9
]
roots = (38, 34, 41, 36)
melody = (
    (74, 77, 81, 86, 84, 81, 79, 77),
    (70, 74, 77, 82, 81, 77, 74, 72),
    (77, 81, 84, 89, 88, 84, 81, 79),
    (72, 76, 79, 84, 86, 84, 79, 76),
)

# Instant high, clean electronic chord at the exact drop. Its FM transient gives
# the chord a glassy attack while the sustained notes fill the next two beats.
for j, note in enumerate((74, 77, 81, 86, 88)):
    add("chord", DROP, glass(note, 2.0), .24 if j < 4 else .17, (j - 2) * .22)
    add("chord", DROP, shimmer(note, 1.1), .10, (2 - j) * .20)
for j, note in enumerate((86, 89, 93, 100)):
    add("chord", DROP, glass(note, 1.2), .14 if j < 3 else .11, (j - 1.5) * .28)
    add("chord", DROP, shimmer(note, .85), .09, (1.5 - j) * .28)
add("bass", DROP, sub_bass(38, .95), .45)
add("drums", DROP, kick(), 1.28)
add("drums", DROP, hat(True), .40)
add("drums", DROP, bright_crash(), .44, -.36)
add("drums", DROP + .012, bright_crash(), .33, .36)
add("sweep", DROP, noise_rise(.35)[::-1], .10)

bar_duration = 4 * BEAT
bar = 0
while DROP + bar * bar_duration < N / SR:
    t0 = DROP + bar * bar_duration
    chord_index = (bar // 2) % 4
    chord = bright_chords[chord_index]
    root = roots[chord_index]

    # Clear, high stereo chords. The bass and kick are ducked beneath the chord
    # attack so the brightness is unmistakable at the change of section.
    if bar > 0:
        for j, note in enumerate(chord):
            add("chord", t0, glass(note, 1.35), .12 if j < 3 else .09, (j - 1.5) * .26)
        for j, note in enumerate((chord[0] + 12, chord[1] + 12, chord[2] + 12)):
            add("chord", t0, glass(note, .72), .045, (j - 1) * .48)
    for beat_pos in (1.5, 3.5):
        for j, note in enumerate(chord[:3]):
            add("chord", t0 + beat_pos * BEAT, glass(note, .43), .06, (j - 1) * .30)

    # Hook arrives immediately after the initial chord bloom; the second half
    # varies every four bars to keep the fast section moving.
    for j, note in enumerate(melody[chord_index]):
        if bar == 0 and j < 3:
            continue
        if bar % 4 == 3 and j in (2, 5):
            continue
        if bar % 4 == 1 and j == 5:
            continue
        if bar % 4 == 3 and j == 7:
            note -= 2
        at = t0 + j * BEAT / 2
        length = .31 if j in (0, 3) else .22
        add("melody", at, glass(note, length, lead=True), .28 if j in (0, 3) else .22, -.20)
        add("melody", at + .016, glass(note - 12, length * .86, lead=True), .09, .32)
        if j == 3:
            add("melody", at, glass(note + 12, .20, lead=True), .065, .45)

    # Sixteenth-note answers sit between the melody notes and use a delicate
    # FM pluck, giving speed without continuous shrill chiptune notes.
    for j in range(16):
        if j % 2 == 0 or (bar == 0 and j < 6):
            continue
        note = chord[(j // 2) % 4] + (12 if j % 4 == 3 else 0)
        at = t0 + j * BEAT / 4
        add("chord", at, shimmer(note, .29), .085, .42 if j % 4 == 1 else -.42)

    for beat_pos in (0, .5, 1.5, 2, 2.5, 3.5):
        note = root + (12 if beat_pos == 3.5 else 0)
        add("bass", t0 + beat_pos * BEAT, sub_bass(note, BEAT * .42), .38)
    for b in range(4):
        t = t0 + b * BEAT
        if not (bar == 0 and b == 0):
            add("drums", t, kick(), .77 if b else 1)
        if b in (1, 3):
            add("drums", t, snare(), .38, -.25)
            add("drums", t + .015, snare(True), .18, .35)
        add("drums", t + BEAT / 2, hat(True), .16, .32 if b % 2 else -.32)
    for j in range(16):
        if j % 2 == 0 or j in (7, 15):
            add("drums", t0 + j * BEAT / 4, hat(), .105 if j % 4 == 0 else .067, -.35 if j % 2 else .35)
    if bar % 4 == 3:
        for j in range(4):
            add("drums", t0 + (3 + j / 4) * BEAT, snare(True), .11 + j * .035)
    bar += 1

# Echo only harmonic voices; the rhythm section stays dry and punchy.
for stem, amount in (("chord", .13), ("melody", .17)):
    dry = stems[stem].copy()
    for delay, gain in ((.17, amount), (.35, amount * .55), (.54, amount * .27)):
        d = round(delay * SR)
        stems[stem][d:] += dry[:-d, ::-1] * gain

# The clean section is mastered independently of the dark opening. This
# preserves the abrupt timbral switch instead of letting its old pad bleed in.
section = sum(stems.values())
section_start = round(DROP * SR)
section_rms = np.sqrt(np.mean(section[section_start + SR : min(N, section_start + 10 * SR)] ** 2))
section *= .39 / max(section_rms, 1e-8)
# Keep the clear entrance prominent by timbre, without an RMS jump.
first = round(.55 * SR)
section[section_start : section_start + first] *= .55
ramp = round(.28 * SR)
section[section_start + first : section_start + first + ramp] *= np.linspace(.55, 1, ramp)[:, None]
combined = opening.copy()
combined[:section_start] *= 1.18
combined[section_start:] = 0
pre_drop = round((DROP - .085) * SR)
for i in range(pre_drop, section_start):
    combined[i] *= (section_start - i) / (section_start - pre_drop)
combined += section
combined[section_start:] = np.tanh(combined[section_start:] * 1.12) / 1.12

# Avoid a click at the loop point without an audible volume fade.
tail = min(round(.009 * SR), N - section_start)
combined[-tail:] *= np.linspace(1, 0, tail)[:, None]
combined = np.clip(combined, -.99, .99).astype("<f4")
encoded = subprocess.run(
    ["ffmpeg", "-v", "error", "-y", "-f", "f32le", "-ac", "2", "-ar", str(SR), "-i", "pipe:0", "-codec:a", "libmp3lame", "-b:a", "256k", str(OUTPUT)],
    input=combined.tobytes(), capture_output=True, check=True,
)
for start, end in ((0, 10), (10.465, 11), (11, 20), (20, 30), (60, 70), (110, 120)):
    part = combined[round(start * SR) : min(N, round(end * SR))]
    rms = np.sqrt(np.mean(part ** 2))
    print(f"{start:2}-{end:2}s: {20 * np.log10(rms + 1e-12):.1f} dBFS")
print(f"{OUTPUT} | drop at {DROP:.3f}s | {N / SR:.2f}s | 172 BPM")
