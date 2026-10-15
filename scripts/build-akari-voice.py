"""Build Akari's neural voice atlas; no synthesis runtime is shipped to players.

Requires the official voicevox_core Python wheel and numpy on the build host.
Use VOICEVOX VVM 0.vvm (0.16.4), style 8 (春日部つむぎ), and Open JTalk 1.11.
Pass --onnxruntime, --model and --dictionary paths to the downloaded resources.
"""
import argparse
import io
import json
import pathlib
import subprocess
import wave

import numpy as np
from voicevox_core.blocking import Onnxruntime, OpenJtalk, Synthesizer, VoiceModelFile

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--onnxruntime', required=True, type=pathlib.Path)
parser.add_argument('--model', required=True, type=pathlib.Path)
parser.add_argument('--dictionary', required=True, type=pathlib.Path)
args = parser.parse_args()

root = pathlib.Path(__file__).resolve().parents[1]
cards = json.loads(subprocess.check_output([
    'node', '-e', "const fs=require('fs'),vm=require('vm');process.stdout.write(vm.runInNewContext(fs.readFileSync('dist/files.js','utf8')+';JSON.stringify(Object.values(files).flat())'))"
], cwd=root, text=True))
out = root / 'dist/assets/akari'
out.mkdir(parents=True, exist_ok=True)
rate, style = 24000, 8
synth = Synthesizer(Onnxruntime.load_once(filename=str(args.onnxruntime)),
                    OpenJtalk(args.dictionary), acceleration_mode='CPU', cpu_num_threads=4)
with VoiceModelFile.open(args.model) as model:
    synth.load_voice_model(model)

chunks, cues, position = [], {}, 0
for card in cards:
    spoken_name = {'gravity-1': 'いかれるサボテン'}.get(card['id'], card['name'])
    query = synth.create_audio_query(spoken_name + '！', style)
    query.speed_scale = 1.08
    query.intonation_scale = 1.12
    query.pre_phoneme_length = .04
    query.post_phoneme_length = .08
    query.output_sampling_rate = rate
    with wave.open(io.BytesIO(synth.synthesis(query, style)), 'rb') as wav:
        assert wav.getframerate() == rate and wav.getnchannels() == 1
        samples = np.frombuffer(wav.readframes(wav.getnframes()), dtype='<i2').astype(np.float64) / 32768
    audible = np.flatnonzero(np.abs(samples) > .002)
    assert len(audible), card['name']
    samples = samples[max(0, audible[0] - int(.035 * rate)):min(len(samples), audible[-1] + int(.08 * rate))]
    samples *= min(.88 / np.max(np.abs(samples)), .17 / max(.001, np.sqrt(np.mean(samples**2))))
    fade = min(120, len(samples) // 4)
    samples[:fade] *= np.linspace(0, 1, fade)
    samples[-fade:] *= np.linspace(1, 0, fade)
    cues[card['id']] = {'name': card['name'], 'offset': round(position / rate, 6),
                       'duration': round(len(samples) / rate, 6), 'reading': query.kana}
    gap = np.zeros(int(.13 * rate))
    chunks.extend([samples, gap])
    position += len(samples) + len(gap)
    print(card['id'], card['name'], query.kana, cues[card['id']]['duration'], flush=True)

with wave.open(str(out / 'techniques-v3.wav'), 'wb') as wav:
    wav.setnchannels(1)
    wav.setsampwidth(2)
    wav.setframerate(rate)
    wav.writeframes(np.asarray(np.clip(np.concatenate(chunks), -1, 1) * 32767, dtype='<i2').tobytes())
(out / 'cues-v3.json').write_text(json.dumps(cues, ensure_ascii=False, indent=2) + '\n')
(root / 'dist/akari-cues.js').write_text("'use strict';\nconst akariCues=" + json.dumps(cues, ensure_ascii=False, separators=(',', ':')) + ';\n')
print('atlas bytes:', (out / 'techniques-v3.wav').stat().st_size)
