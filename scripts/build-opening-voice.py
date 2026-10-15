"""Render the title-screen launch call using the existing Akari voice model.

Only the resulting small WAV is shipped with the game.
"""
import argparse
import io
import json
import pathlib
import re
import wave

import numpy as np
from voicevox_core.blocking import Onnxruntime, OpenJtalk, Synthesizer, VoiceModelFile

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--onnxruntime', required=True, type=pathlib.Path)
parser.add_argument('--model', required=True, type=pathlib.Path)
parser.add_argument('--dictionary', required=True, type=pathlib.Path)
args = parser.parse_args()
root = pathlib.Path(__file__).resolve().parents[1]
out = root / 'dist/assets/akari'
style, rate = 8, 24000
synth = Synthesizer(Onnxruntime.load_once(filename=str(args.onnxruntime)),
                    OpenJtalk(args.dictionary), acceleration_mode='CPU', cpu_num_threads=4)
with VoiceModelFile.open(args.model) as model:
    synth.load_voice_model(model)
query = synth.create_audio_query('エンコードゼロ！', style)
# A single connected call, not two phrases separated by a comma/pause mora.
for phrase in query.accent_phrases:
    phrase.pause_mora = None
query.speed_scale = 1.08
query.pitch_scale = .025
query.intonation_scale = 1.28
query.pre_phoneme_length = .025
query.post_phoneme_length = .10
query.output_sampling_rate = rate
with wave.open(io.BytesIO(synth.synthesis(query, style)), 'rb') as wav:
    assert wav.getframerate() == rate and wav.getnchannels() == 1
    samples = np.frombuffer(wav.readframes(wav.getnframes()), dtype='<i2').astype(np.float64) / 32768
audible = np.flatnonzero(np.abs(samples) > .002)
assert len(audible)
samples = samples[max(0, audible[0]-int(.025*rate)):min(len(samples), audible[-1]+int(.08*rate))]
samples *= min(.88/np.max(np.abs(samples)), .17/max(.001, np.sqrt(np.mean(samples**2))))
fade = min(120, len(samples)//4)
samples[:fade] *= np.linspace(0, 1, fade)
samples[-fade:] *= np.linspace(1, 0, fade)
destination = out / 'encode-zero-v2.wav'
with wave.open(str(destination), 'wb') as wav:
    wav.setnchannels(1)
    wav.setsampwidth(2)
    wav.setframerate(rate)
    wav.writeframes(np.asarray(np.clip(samples, -1, 1)*32767, dtype='<i2').tobytes())
cue = {'name': 'エンコードゼロ！', 'duration': round(len(samples)/rate, 6), 'reading': query.kana}
(out / 'encode-zero-v2.json').write_text(json.dumps(cue, ensure_ascii=False, indent=2)+'\n')
cue_file = root / 'dist/akari-cues.js'
previous = re.sub(r'\nconst akariOpeningCue=.*?;\n', '\n', cue_file.read_text())
cue_file.write_text(previous.rstrip()+'\nconst akariOpeningCue='+json.dumps(cue, ensure_ascii=False, separators=(',', ':'))+';\n')
print(json.dumps({**cue, 'bytes': destination.stat().st_size}, ensure_ascii=False))
