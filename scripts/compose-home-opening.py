"""Render the title's original opening theme and dedicated launch sound.

No synthesizer/model runs on a player's device. The 64-bar score is circular:
releases and the stereo delay wrap into its first bar, with no fade-out/restart.
Run: python scripts/compose-home-opening.py (numpy, scipy, ffmpeg).
"""
from pathlib import Path
import json
import subprocess
import wave

import numpy as np
from scipy.signal import butter, sosfilt

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'dist/assets/music'
SR, BPM, BARS = 32000, 164, 64
BEAT = 60 / BPM
N = round(BARS * 4 * BEAT * SR)
rng = np.random.default_rng(82015)
mix = np.zeros((N, 2), np.float32)


def hz(note):
    return 440 * 2 ** ((note - 69) / 12)


def env(n, attack=.008, release=.08):
    return np.minimum(1, np.arange(n) / max(1, attack * SR)) * np.minimum(1, np.arange(n)[::-1] / max(1, release * SR))


def lp(x, cutoff):
    return sosfilt(butter(2, cutoff, fs=SR, output='sos'), x)


def add(beat, x, gain=1, pan=0):
    x = np.asarray(x, np.float32)
    if x.ndim == 1:
        x = x[:, None] * np.sqrt([(1-pan)/2, (1+pan)/2])
    start = round(beat * BEAT * SR) % N
    count = min(len(x), N - start)
    mix[start:start+count] += x[:count] * gain
    if count < len(x):
        mix[:len(x)-count] += x[count:] * gain


def synth(note, length, kind='lead'):
    n = round(length * SR)
    t = np.arange(n) / SR
    f = hz(note)
    p = 2 * np.pi * f * t
    if kind == 'bass':
        x = .82*np.sin(p) + .28*np.sin(p*2) + .12*np.sin(p*3)
        return np.tanh(x*1.4)*env(n, .004, .055)
    if kind == 'glass':
        x = np.sin(p + 1.5*np.exp(-t*9)*np.sin(p*2.006)) + .17*np.sin(p*4.01)*np.exp(-t*7)
        return lp(x, 5600)*np.exp(-t*3.4)*env(n, .002, .18)
    result = []
    for side in (-1, 1):
        phase = p*(1 + side*.0016)
        # Band-limited additive oscillators avoid a harsh, cheap square tone.
        if kind == 'pad':
            x = np.sin(phase) + .24*np.sin(phase*2) + .10*np.sin(phase*3)
            x = lp(x, 3000)*env(n, .045, .19)
        else:
            # Firm bright attack and a band-limited synth body, rather than
            # the soft keyboard-like sustained tone of the previous opening.
            x = .62*np.sin(phase) + .24*np.sin(phase*2)
            for harmonic in range(3, 9):
                x += .38/harmonic*np.sin(phase*harmonic)
            x += .17*np.sin(phase + 1.1*np.exp(-t*12)*np.sin(phase*2))
            x = lp(x, 6500)*env(n, .003, .055)*(.78+.22*np.exp(-t*14))
        result.append(x)
    return np.column_stack(result)


def drum(kind):
    length = {'kick':.29, 'snare':.22, 'hat':.065, 'open':.18, 'crash':1.2}[kind]
    n = round(length*SR)
    t = np.arange(n)/SR
    noise = rng.standard_normal(n)
    if kind == 'kick':
        p = 2*np.pi*np.cumsum(47+115*np.exp(-t*32))/SR
        x = np.sin(p)*np.exp(-t*15) + .1*noise*np.exp(-t*180)
    elif kind == 'snare':
        high = noise-lp(noise, 1500)
        x = high*np.exp(-t*23)*.42 + .3*np.sin(2*np.pi*185*t)*np.exp(-t*30)
    else:
        high = noise-lp(noise, 6400)
        decay = 55 if kind == 'hat' else 20 if kind == 'open' else 4.3
        x = high*np.exp(-t*decay)*(.15 if kind != 'crash' else .19)
    return x*env(n, .001, .018)


# Em(add9) -> Cmaj7 -> G(add9) -> D/F#, with a B7 turnaround.
chords = [(40,[55,59,64,66]), (36,[55,59,60,64]), (43,[55,59,62,69]), (38,[54,57,62,66])]
verse = [
    [(0,64,.65),(.75,67,.5),(1.5,71,.8),(2.5,69,.45),(3.25,67,.6)],
    [(0,64,.9),(1.5,62,.45),(2.25,64,.6),(3,67,.75)],
    [(0,71,.8),(1,74,.6),(2,71,.6),(3,69,.8)],
    [(0,66,1.2),(1.5,69,.6),(2.5,67,.45),(3.25,66,.6)],
    [(0,64,.65),(1,67,.5),(1.75,71,.6),(2.5,76,.8)],
    [(0,74,.6),(.75,72,.6),(1.5,71,.7),(2.5,67,1.1)],
    [(0,69,.7),(1,71,.7),(2,74,.6),(3,71,.65)],
    [(0,69,.7),(1,66,.6),(2,63,.65),(3,66,.8)],
]
hook = [
    [(0,76,.7),(.75,74,.4),(1.5,71,.6),(2.25,74,.45),(3,76,.8)],
    [(0,79,1.2),(1.5,76,.6),(2.5,74,.45),(3.25,72,.6)],
    [(0,74,.65),(.75,76,.4),(1.5,79,.7),(2.5,78,.5),(3.25,74,.6)],
    [(0,76,.9),(1.25,74,.45),(2,71,.7),(3,69,.75)],
    [(0,76,.6),(.75,79,.45),(1.5,83,.7),(2.5,81,.55),(3.25,79,.6)],
    [(0,76,1),(1.25,74,.5),(2,72,.7),(3,71,.7)],
    [(0,74,.6),(.75,76,.45),(1.5,79,.6),(2.25,78,.4),(3,76,.75)],
    [(0,75,.9),(1.25,71,.5),(2,69,.6),(3,66,.8)],
]

for bar in range(BARS):
    start = bar*4
    root, notes = chords[(bar//2)%4]
    if bar%8 == 7:
        root, notes = 35, [54,57,63,66]  # B7, resolving cleanly into Em.
    refrain = bar < 4 or 20 <= bar < 36 or 44 <= bar < 60
    bridge = 36 <= bar < 44
    for i, note in enumerate(notes):
        add(start, synth(note, 4*BEAT+.22, 'pad'), .038, (i-1.5)*.25)
        # Short syncopated chords keep momentum from the first bar.
        for at in [0, 1.5, 2.5, 3.5]:
            add(start+at, synth(note, BEAT*.42, 'glass'), .052 if refrain else .038, (i-1.5)*.19)
    for at, offset, dur in [(0,0,.42),(.5,0,.32),(1.25,12,.31),(1.75,7,.2),(2,0,.48),(2.75,0,.3),(3.25,7,.22),(3.5,12,.34)]:
        add(start+at, synth(root+offset, dur*BEAT, 'bass'), .29)
    arp = [notes[i]+12 for i in [0,2,1,3,2,0,3,1,0,2,1,3,2,1,3,2]]
    for i, note in enumerate(arp):
        if bridge and i%2:
            continue
        add(start+i*.25, synth(note, BEAT*.40, 'glass'), .041 if refrain else .033, -.38 if i%2 else .38)
    if not bridge:
        phrase = hook[bar%8] if refrain else verse[(bar-4)%8]
        for at, note, dur in phrase:
            lead = synth(note, dur*BEAT+.055)
            add(start+at, lead, .19 if refrain else .17)
            if refrain:
                add(start+at, synth(note-12, dur*BEAT+.055), .055)
    elif bridge:
        for at, note, dur in verse[(bar-36)%8][::2]:
            add(start+at, synth(note, dur*BEAT+.055, 'glass'), .17)
    for at in ([0,1,2,3] if bridge else [0,1,2,3,3.5] if bar%2 else [0,1,2,3]):
        add(start+at, drum('kick'), .48)
    for at in [1,3]:
        add(start+at, drum('snare'), .43)
    for i in range(16):
        if bridge and i%2:
            continue
        add(start+i*.25, drum('open' if i in [6,14] else 'hat'), .78 if i%2==0 else .34, .22 if i%2 else -.18)
    if bar in [0,4,12,20,28,36,44,52,60]:
        add(start, drum('crash'), .9, -.12)
    if bar in [3,11,19,27,35,43,51,59,63]:
        for i in range(4):
            add(start+3+i*.25, drum('snare'), .11+i*.035, (i-1.5)*.13)

# A quiet dotted-eighth echo, wrapped around the exact musical loop boundary.
delay = round(BEAT*.75*SR)
mix += .13*np.roll(mix[:, ::-1], delay, axis=0)
mix = np.tanh(mix*1.3)
mix *= .16/max(.001, float(np.sqrt(np.mean(mix**2))))
mix = np.clip(mix, -.86, .86)
OUT.mkdir(exist_ok=True)
wav = OUT/'zero-home-opening-v2.wav'
with wave.open(str(wav), 'wb') as f:
    f.setnchannels(2); f.setsampwidth(2); f.setframerate(SR)
    f.writeframes(np.asarray(mix*32767, '<i2').tobytes())
dest = OUT/'zero-home-opening-v2.mp3'
subprocess.run(['ffmpeg','-y','-v','error','-i',str(wav),'-codec:a','libmp3lame','-b:a','128k',str(dest)], check=True)
wav.unlink()  # Reproducible intermediate; only the small encoded score ships.

# Short launch signature: tight bass impulse into a warm, rising glass chord.
length = .44
t = np.arange(round(SR*length))/SR
se = .23*np.sin(2*np.pi*np.cumsum(85+90*np.exp(-t*22))/SR)*np.exp(-t*15)
for note, at, gain in [(64,0,.16),(71,.035,.13),(76,.075,.12),(83,.11,.08)]:
    p = 2*np.pi*hz(note)*np.maximum(0,t-at)
    e = (t>=at)*np.minimum(1,np.maximum(0,t-at)/.003)*np.exp(-np.maximum(0,t-at)*11)
    se += gain*np.sin(p+.55*np.exp(-np.maximum(0,t-at)*20)*np.sin(p*2))*e
se *= env(len(se),.001,.06)
se_file = OUT/'zero-home-start-v1.wav'
with wave.open(str(se_file),'wb') as f:
    f.setnchannels(1); f.setsampwidth(2); f.setframerate(SR)
    f.writeframes(np.asarray(np.clip(se,-.9,.9)*32767,'<i2').tobytes())
metadata = {'name':'ZERO // OPENING DRIVE','bpm':BPM,'bars':BARS,'duration':N/SR,'loop':'circular release and delay','rms':float(np.sqrt(np.mean(mix**2))),'peak':float(np.max(np.abs(mix))),'bytes':dest.stat().st_size}
(OUT/'zero-home-opening-v2.json').write_text(json.dumps(metadata,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(metadata,ensure_ascii=False))
